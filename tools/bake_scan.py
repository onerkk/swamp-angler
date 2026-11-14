"""Rebake a photogrammetry scan: simplify geometry, fresh UV unwrap, project colours from the
original high-poly textured surface into a clean atlas. Usage: bake.py in.glb out.glb [tris] [texsize]"""
import sys, numpy as np, trimesh, xatlas, fast_simplification
from scipy.spatial import cKDTree
from PIL import Image

inp, out = sys.argv[1], sys.argv[2]
TRIS = int(sys.argv[3]) if len(sys.argv) > 3 else 40000
TS = int(sys.argv[4]) if len(sys.argv) > 4 else 2048

scene = trimesh.load(inp, force='scene')
V, F, cols_pts, cols = [], [], [], []
off = 0
rng = np.random.default_rng(1)
geoms = []
for name, g in scene.geometry.items():
    if not isinstance(g, trimesh.Trimesh) or len(g.faces) <= 60:   # colour-checker cube / markers
        continue
    for node in scene.graph.geometry_nodes.get(name, []):
        T, _ = scene.graph[node]
        geoms.append((g, T))
area_tot = sum(g.area for g, _ in geoms)
NS = 7_000_000
for g, T in geoms:
    v = trimesh.transformations.transform_points(g.vertices, T)
    V.append(v); F.append(g.faces + off); off += len(v)
    vis = g.visual
    uv = getattr(vis, 'uv', None)
    img = None
    try:
        img = vis.material.baseColorTexture if hasattr(vis.material, 'baseColorTexture') else vis.material.image
    except Exception:
        img = None
    if uv is None or img is None:
        continue
    im = np.asarray(img.convert('RGB'), dtype=np.float32)
    H, W = im.shape[:2]
    n = int(NS * g.area / area_tot) + 1
    # area-weighted random barycentric samples
    fa = g.area_faces / g.area_faces.sum()
    fi = rng.choice(len(g.faces), n, p=fa)
    r1, r2 = rng.random(n), rng.random(n)
    s = np.sqrt(r1); b0, b1, b2 = 1 - s, s * (1 - r2), s * r2
    tri = g.faces[fi]
    p = v[tri[:, 0]] * b0[:, None] + v[tri[:, 1]] * b1[:, None] + v[tri[:, 2]] * b2[:, None]
    t = uv[tri[:, 0]] * b0[:, None] + uv[tri[:, 1]] * b1[:, None] + uv[tri[:, 2]] * b2[:, None]
    x = np.clip(t[:, 0] % 1.0 * (W - 1), 0, W - 1); y = np.clip((1 - t[:, 1] % 1.0) * (H - 1), 0, H - 1)
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int); x1, y1 = np.minimum(x0 + 1, W - 1), np.minimum(y0 + 1, H - 1)
    fx, fy = (x - x0)[:, None], (y - y0)[:, None]
    c = im[y0, x0] * (1 - fx) * (1 - fy) + im[y0, x1] * fx * (1 - fy) + im[y1, x0] * (1 - fx) * fy + im[y1, x1] * fx * fy
    cols_pts.append(p); cols.append(c)
V = np.vstack(V); F = np.vstack(F)
P = np.vstack(cols_pts); C = np.vstack(cols)
print('orig tris', len(F), 'samples', len(P))

# simplify geometry only (no UV seams to respect any more)
hi = trimesh.Trimesh(V, F, process=True)
ratio = max(0.0, 1 - TRIS / len(hi.faces))
v2, f2 = fast_simplification.simplify(hi.vertices.astype(np.float32), hi.faces.astype(np.int32), ratio)
lo = trimesh.Trimesh(v2, f2, process=True)
print('simplified tris', len(lo.faces))

# fresh UV atlas
atlas = xatlas.Atlas(); atlas.add_mesh(lo.vertices, lo.faces)
po = xatlas.PackOptions(); po.resolution = TS; po.padding = 4; po.bilinear = True
atlas.generate(pack_options=po)
vmap, idx, uvs = atlas[0]
mv = lo.vertices[vmap]
print('atlas', atlas.width, atlas.height, 'verts', len(mv))

# rasterise every triangle into the atlas, get the 3D position of each texel
img = np.zeros((TS, TS, 3), np.float32); mask = np.zeros((TS, TS), bool)
tree = cKDTree(P)
px = uvs * np.array([TS - 1, TS - 1])
pos_list, pix_list = [], []
for tri in idx:
    a, b, c = px[tri]
    xmin, xmax = int(np.floor(min(a[0], b[0], c[0]))), int(np.ceil(max(a[0], b[0], c[0])))
    ymin, ymax = int(np.floor(min(a[1], b[1], c[1]))), int(np.ceil(max(a[1], b[1], c[1])))
    if xmax < xmin or ymax < ymin: continue
    gx, gy = np.meshgrid(np.arange(xmin, xmax + 1), np.arange(ymin, ymax + 1))
    q = np.stack([gx.ravel() + .5, gy.ravel() + .5], 1)
    d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    if abs(d) < 1e-12: continue
    l0 = ((b[1] - c[1]) * (q[:, 0] - c[0]) + (c[0] - b[0]) * (q[:, 1] - c[1])) / d
    l1 = ((c[1] - a[1]) * (q[:, 0] - c[0]) + (a[0] - c[0]) * (q[:, 1] - c[1])) / d
    l2 = 1 - l0 - l1
    ok = (l0 >= -.02) & (l1 >= -.02) & (l2 >= -.02)
    if not ok.any(): continue
    w = np.stack([l0[ok], l1[ok], l2[ok]], 1)
    pos_list.append(w @ mv[tri]); pix_list.append(q[ok].astype(int))
POS = np.vstack(pos_list); PIX = np.vstack(pix_list)
PIX = np.clip(PIX, 0, TS - 1)
_, nn = tree.query(POS, k=4, workers=-1)
col = C[nn].mean(1)
img[PIX[:, 1], PIX[:, 0]] = col; mask[PIX[:, 1], PIX[:, 0]] = True
# dilate into empty texels so mipmaps never pull in black
for _ in range(16):
    if mask.all(): break
    acc = np.zeros_like(img); cnt = np.zeros(mask.shape, np.float32)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        m2 = np.roll(mask, (dy, dx), (0, 1)); i2 = np.roll(img, (dy, dx), (0, 1))
        acc += i2 * m2[..., None]; cnt += m2
    fill = (~mask) & (cnt > 0)
    img[fill] = acc[fill] / cnt[fill][:, None]; mask |= fill
img[~mask] = C.mean(0)
tex = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))   # row 0 = v 0 (rasterised in uv space)
tex = tex.transpose(Image.FLIP_TOP_BOTTOM)                      # glTF: v grows downward in the image
mat = trimesh.visual.material.PBRMaterial(baseColorTexture=tex, metallicFactor=0.0, roughnessFactor=0.7, doubleSided=True)
uvs_gl = uvs.copy()
mesh = trimesh.Trimesh(mv, idx, visual=trimesh.visual.TextureVisuals(uv=uvs_gl, material=mat), process=False)
mesh.export(out)
print('wrote', out)
