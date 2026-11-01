# Highest graphics and yacht stations

Highest (profile level 7) enables Three.js r128 SSRPass on compatible devices, in the lake/ocean/ice world, cabin/aquariums, underwater view and intertidal scene. This is depth-buffer screen-space ray marching, **not hardware ray tracing or path-traced global illumination**. Reflections cannot recover off-screen objects. Water retains its separate planar reflection and underwater transmission passes; PBR environment lighting and shadow maps remain active independently.

The pass uses native-resolution beauty/depth, a half-resolution effect capped at 768 pixels on the long edge, and 64 viewport-clipped ray samples. Auxiliary normals preserve normal/bump maps, skinning, displacement and instancing. Alpha-cut foliage and custom water shaders are excluded from auxiliary geometry. Renderer and material state are restored even after failure. Unsupported devices or a pass failure use the regular PBR renderer; adaptive quality below level 7 bypasses SSR. `window.__rayTracingState` exposes the actual support/active state. It must not be labeled RTX.

Existing authentic scene normal maps remain in use (wood, ice, sand, rocks and aquarium assets). Yacht gelcoat, enamel, steel, leather and fabric now also use tangent-space micro-normal maps; teak retains its photographed normal/roughness maps. This does not replace low-detail geometry with invented high-resolution scans.

The 26 m leisure-yacht model is measured in its own normalized frame, bow -Z and starboard +X. Fishing stands on the actual aft starboard teak deck at (2.12, 15), facing outward +X. The elevated helm at (.6, 10) faces forward -Z. Downward rays accept horizontal teak faces rather than grabbing the highest roof, railing or fixture. Both eyes are 1.62 m above their supporting deck. Boat origin, angler position and fishing heading are separate: casting, retrieval, fish distance, nearby residents and landing-net reach use the angler. Vessel movement/collision remains relative to its centre. The boat follows waves while the camera keeps a level horizon.

Players explicitly switch between the helm and fishing station; the helm stows tackle, and the fishing station stops the motor. The current asset is a leisure cruiser rather than a purpose-built sportfisher, so its side deck is used rather than inventing a fishing cockpit through the cabin.

Real-vessel references:
- Viking 48 Convertible cockpit arrangement: https://www.vikingyachts.com/images/articleImages/48C%20WEB.pdf
- Grady-White Fisherman 257 centre-console deck arrangement: https://www.gradywhite.com/models/fisherman-257/
- SSR technique: https://threejs.org/docs/pages/SSRPass.html

Validation:
- `node --test tests/*.test.js`
- `python tests/check-radiance-gpu.py` (production shaders compile on ES2/ES3; rendered rays hit a colored occluder and unselected pixels stay transparent)
- `python tests/check-submerged-gpu.py` (existing waterline/ice/physical shaders and immersion masks)
- Native Draco yacht geometry checks verify the standing decks, outward clear sightline and net reach. These automated checks do not replace visual/performance testing on the player's phone.

Vendored SSR/Pass/CopyShader sources are from Three.js r128, MIT licensed in `vendor/three-addons.LICENSE.txt`. SSRShader has local bounded-ray, viewport clipping and transparent-output initialization changes.
