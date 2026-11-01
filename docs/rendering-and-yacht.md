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

## Material lighting correction (2026-11-01)

The photo-sky branch in `setTime` returned before environment regeneration. The legacy photo loader also reassigned scene.environment each frame, including null while HDR was pending, so simply removing the early return was insufficient. This could leave PBR metals using an absent or stale environment even though their metalness was set. The photo hook now continues through bounded IBL regeneration, including first use and weather changes; switching the photo sky marks the probe dirty. The loader now retains RGBE HDR inputs and feeds the shared probe instead of overriding scene.environment. The probe blends these HDR panoramas with the same yaw, time blend and weather attenuation as the visible sky; loading HDR invalidates the probe. It falls back to the visible sky until both HDR inputs are ready. This correction applies at every graphics level and does not depend on SSR.

The cabin gets a local 128-pixel cube probe of its actual room, prefiltered with PMREM, refreshed at most once per ten seconds at levels 3–7. Lower profiles use the shared outdoor IBL. The old local probe is disposed after replacement, and render target/scissor/shadow state is restored. This is an approximation to room reflections, not full dynamic GI.

Tackle carbon, brushed gold/steel and grips now have actual linear tangent-space normal textures, shared by equipped gear and shop previews. Original normal maps on imported models remain intact. This is not a claim that every imported material has a normal texture: smooth materials may use geometry normals, some assets use bump maps, and UI/effects deliberately use unlit/custom shaders.

`window.__materialLightingAudit` distinguishes the active scene's visible meshes, unique lit materials, normal-mapped, bump-mapped and smooth materials, custom shaders/unlit surfaces, and metals missing an environment. The graphics status displays actual mapped-material counts. These are runtime scene counts, not a fabricated all-assets percentage.

Additional validation: `python tests/check-metal-gpu.py` renders the actual Three r128 metallic BRDF against black/bright CubeUV environments. Gold must darken without illumination, reflect the bright environment, and preserve gold spectral coloration. Regression tests exercise the actual photo-sky `setTime` function and local room probe lifecycle.
