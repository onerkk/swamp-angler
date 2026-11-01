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

## Frame pacing (2026-11-01)

Sky and room environment captures now draw one cube face per frame, with PMREM filtering on a separate seventh frame. Repeated sky invalidations are coalesced. Room probes reuse their completed map for at least 30 seconds and defer refresh on slow frames; an incomplete capture never replaces the completed reflection. Renderer, XR and shadow-update state are restored after each job.

Water reflection and underwater transmission targets have independent long-edge caps (1536 at highest, smaller at other levels), rather than inheriting the entire high-DPR framebuffer. This reduces offscreen pixel workload; it is not a measured phone-FPS gain. Main framebuffer resolution and source textures are still governed by the normal graphics profiles. Main-world shadows update at 20 Hz (30 Hz at highest), cabin shadows at 20 Hz; auxiliary passes reuse those maps without consuming the main camera's refresh request. Underwater light-layer discovery is throttled to once per second.

SSR reflector discovery is cached for 500 ms; diagnostic material scans run only with the graphics settings present, at most once per five seconds. Normal and mask passes retain their required per-frame work. There is no reuse of a stale full-screen screenshot during camera motion.

Adaptive graphics remembers levels per scene for the current session. Sustained <22 FPS is handled during warmup after at least eight slow frames and 0.8 seconds; a few isolated stalls do not trigger that path. The aquarium's resolution floor relaxes at low levels so that severe lag can actually reduce its pixel load. Stable frame rates can still recover to the highest tier, and manual modes remain fixed.

## Diagnostic-driven shader correction (2026-11-01)

A shared PBR material could pass through two independent water-optics instances. Their `onBeforeCompile` chain injected the same varying and local declarations twice (`vOptWorld`, `vOptNormal`, `optP`, `optN`). Optics injection is now idempotent, and materials shared across different water volumes are cloned and cached per volume. Animation/immersion hooks and texture references remain intact; objects in one volume still share the same scoped material so plant batching is preserved. GPU fixtures now exercise nested optics hooks on standard, physical, skinned and instanced shader variants.

Legacy fixed-high settings migrate to auto once on coarse-pointer devices with DPR >= 2.5. An explicit graphics selection in the new UI marks that preference and prevents further migration. This modifies graphics preference only, not gameplay progress, coins or account entitlements.

Diagnostics now identify the app version, session start, actual framebuffer dimensions and active graphics level. Current-run errors are separated from the preserved prior-run history. Ten-second average FPS uses frame count divided by total elapsed frame duration rather than averaging instantaneous reciprocal durations. It is not valid to assume that all historical log entries occurred in the current build.

## 120 FPS update ceiling (2026-11-01)

The main game loop uses a phase-preserving 120 FPS limiter. A 120 Hz RAF source is not halved by small timestamp jitter; faster 144/240 Hz callbacks skip surplus updates, while 30/60 Hz callbacks remain at their actual available rate. Simulation and adaptive graphics use elapsed time between rendered game updates. Long pauses do not trigger catch-up rendering bursts. This cap does not force the browser/display to refresh at 120 Hz or guarantee that a heavy scene can sustain 120 FPS.

Diagnostics now sample the actual main game update loop rather than running a separate uncapped RAF sampler. The report/settings show the 120 FPS ceiling separately from measured FPS. `tests/frame-timing.test.js` exercises high-refresh rates, jitter, slower callbacks and long pauses.

## Return-home reliability (2026-11-01)

Returning home is transactional: game progress is saved before transition, critical cabin initialization must succeed before home becomes active, and failure rolls back the camera/UI state to fishing. A render failure while home is active also exits the failed scene instead of logging the same exception every frame. Optional welcome/story errors are logged separately.

Pending aquarium residents now retry individually. Previously one missing native model caused every successful fish to be removed/recreated on each one-second sync, while old owned geometry/material/skeleton resources were retained. Successful residents remain stable while a missing model loads. Full record/native-model changes release only aquarium-owned resources, keeping shared model geometry and source textures intact. Optical material registration is reference-counted so removing one resident does not stop lighting updates on another sharing its scoped material. Tank tier signatures commit only after construction succeeds.

Home model loads are serialized, deduplicated in flight and cached after parse. The bulk preloader for all unused furniture upgrade tiers is removed. Outdoor-only shadow, planar reflection, underwater transmission and SSR buffers are released/shrunk before cabin initialization, then recreated on demand when fishing resumes. Multi-material furniture tinting supports material arrays.

These fixes address reproduced JS lifecycle defects and avoidable resource growth; the supplied social-media screenshot contains no device error trace, so it does not establish a specific browser/OS crash cause or prove that all device-specific exits are resolved.

## Cabin resource lifetime and GPU recovery (2026-11-01)

Cabin construction is now lazy and the same instance is reused on subsequent visits. While home is active, the main simulation updates time/environment and home controls, without running lake physics, outdoor actors, fishing effects or ending/resident updates. Entering home stops boat input and releases outdoor geometry/texture GPU residency while retaining CPU assets for re-entry. Leaving home releases cabin GPU residency, local reflection cache, shadow target and shared SSR targets. Geometry/texture disposal deduplicates shared references, preserves source arrays/images, and leaves environment/shader render targets under their owning systems.

Tank construction registers a staged instance immediately and destroys it on failure, so retries cannot retain half-built groups. Tank destruction cancels its lifetime before removal, preventing asynchronous decoration/model completions from attaching to obsolete tanks. Fish-owned resources, plant batches, optics registration, obstacles and caustic/shaft entries are removed together. Furniture replacement releases cloned materials and removes lamp-material references without disposing shared source geometry/textures. Failed furniture downloads clear the loading flag so a later sync can retry; a failed tank-model subscriber cannot prevent remaining subscribers from receiving the model.

WebGL context loss prevents default destruction, saves progress, releases pointer input and pauses simulation/rendering. Successful restoration resets render targets, reflection capture state and frame timing before resuming. A failed restoration stays paused with an explicit manual reload option rather than creating an automatic reload loop. Sky capture failures are recoverable after reset; partial cube faces are discarded. Diagnostics include GPU resource counts and the previous scene/phase journal, explicitly labelled as not proof of a crash.

Validation: 153 Node tests pass, including 100 lazy scene visits, 100 cancelled tank lifetimes, 50 failed partial tank builds, GPU loss/restoration/failure handling, retained CPU assets, furniture cleanup, outdoor simulation suspension and reflection re-capture. Native WebGL1/2 shader compilation and underwater visibility fixtures pass. The lifecycle stress tests use controlled fixtures; they are not a full 100-visit render test on the affected Android device. No device-specific no-crash guarantee is inferred.
