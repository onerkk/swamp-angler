# Rendering and fishing-boat stations

## Current build

- **Low** stops the planar reflection and dynamic shadow passes, skips the environment probe and rain overlay, and updates the reduced-resolution underwater pass at 8 Hz. The moving water and underwater fish remain visible.
- **Auto** adjusts framebuffer size, water geometry, shadow maps and pass frequency. Mobile auto keeps the medium material tier. The lowest automatic level can stop the expensive passes when frame time stays high.
- **High** restores PBR normal and bump maps where the material supplies them, HDR environment lighting, dynamic shadows and planar water reflections. Highest quality uses a 120 FPS ceiling. The browser and device determine the frame rate it can reach.
- Screen-space reflections (SSR) are disabled in the game renderer. The standalone shader fixture checks the vendored SSR code. Water reflections use the separate planar pass. There is no hardware ray tracing.

The current boat is the 17-foot Scout center-console model. The helm and stern fishing positions use the measured deck height. Casting and landing distance are measured from the angler. The player's hands, rod and reel render in a separate first-person pass. The line, bobber and fish retain world depth.

Run `node --test tests/*.test.js` for timing, collision, landing and graphics regressions. The standalone Mesa fixtures in `tests/check-*-gpu.py` test selected shaders and rendered pixels. Phone FPS and thermal performance need device measurements.

## Historical notes

The dated notes below describe earlier iterations and their validation.

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

## Unwanted startup-screen returns, capture and diagnostic v3 (2026-11-01)

A separate, reproducible navigation defect was found in the PWA updater: `safe()` included `idle`, `home` and `tide`, and a pending version called `location.replace()` automatically every four seconds. Returning from a photo/share also checked versions on visibility change. A controlled execution of the old updater triggered one navigation on home and one on photo return; the new updater triggers zero in those same cases. Version detection now displays a dismissible notice only. Only an explicit update click saves, journals the intentional navigation and changes the URL. This explains a concrete path back to the startup screen without a JS exception; it does not establish that all iOS process terminations had that cause.

Capture no longer loads html2canvas or clones the document. It copies the just-rendered framebuffer once and draws a bounded subset of visible UI boxes, borders, images and text into the same 2D bitmap. The bitmap never exceeds the source framebuffer, 1,280 pixels on its long edge or approximately 1.2 megapixels. JPEG encoding and the preview pause 3D rendering/simulation; the backing canvas is reduced to 1x1 after encoding. The preview has explicit save/share and return controls. Export occurs only from a fresh user gesture, preferring native file sharing and otherwise requesting a separate-target download. No asynchronous capture completion clicks a navigation link. Cancellation, repeated taps, failed copying and encoding timeouts restore the camera control. This lightweight UI compositor supports the game's common HUD presentation, not every CSS effect such as backdrop blur or complex gradients.

Mobile auto mode starts at a conservative profile without first allocating an intermediate high-resolution framebuffer. Decoded image sources are capped at 1,024 pixels for ordinary textures and 4,096 for very wide panorama strips; explicit high/desktop allows 2,048 and 8,192 respectively. Normal and roughness maps remain present. RGBE/data textures are left byte-for-byte intact. Repeated cabin wood UV variants share one decoded source per file, and identical transforms share a texture. Mobile MSAA is disabled, anisotropy is bounded, Draco uses one worker, and each pixel-ratio change performs one renderer resize. Viewport resizes with unchanged dimensions are skipped. If the new journal records a recent unclean foreground termination, the next session uses a stricter source/graphics budget with a visible protection-mode notice. This is a conservative response to an incomplete exit, not an assertion that iOS killed the process.

Diagnostics persist session IDs, actual builds, operation stages, visibility/pagehide/pageshow, periodic scene/FPS/resource counts and intentional navigations. No JS handler can catch every OS process kill, so the prior journal survives independently of the error list. Draws/triangles cover the main frame's passes by resetting renderer counters once per frame. CPU simulation/actor/render timings and optional Long Task observations help separate bottlenecks. XHR events preserve URL/status and errors retain stack traces. Source-resource estimates and largest texture dimensions are labelled as estimates, not measured VRAM. Default copy is a <=950-character summary for messaging; a separate text download contains the full structured report. Historical failures remain separate from this run.

Validation: 171 Node tests pass, including the real updater's four game states and visibility return, explicit-only update navigation, screenshot preview/export/cancellation, single bounded bitmap allocation, retained operation state across simulated process restarts, XHR formatting, CPU/draw snapshots, texture source deduplication and image budgets. Native WebGL1/2 compilation and immersion-mask fixtures pass. The affected iPhone's Safari was not available for device performance or termination testing; no guaranteed FPS or complete elimination of OS kills is claimed.

## Rain cost controls and bounded empty retrieve (2026-11-01)

Low quality now changes actual effect work, not only pixel ratio. Levels 0/1 detach normal, bump, roughness, metalness, AO, environment and coating textures from lit materials, disable physical clearcoat/transmission layers and omit the physical-material shader define. Original texture references, finish values and defines are retained for restoration, including native material clones created while low is active. A conservative diffuse approximation avoids black metallic surfaces after IBL is disabled. Static mesh frustum culling is enabled at low quality; skinned/morph/instanced meshes keep their original culling policy. Material discovery is throttled per scene and also runs for asynchronous models.

Low quality stops rain-line CPU updates/uploads/draws, the screen-drop canvas and window-drop canvas, rain rings, lens flares, procedural rain normals and caustic work. Weather state, rain audio and gameplay weather rules remain active. The moving displaced water surface and fish visibility remain. Planar/SSR reflection targets and shadows are released/disabled, environment probes stop updating, detailed procedural lake/reef bed shading is omitted, and the underwater transmission target refreshes at 15 Hz. Medium rain has 180 lines, finer modes 500 and highest modes up to 1,400. The lowest water grid is 24x48 rather than 64x128 and the lowest pixel ratio is capped at 0.65. Scene radiance applies these material/IBL rules to outdoor, cabin and other scene render calls.

Auto quality responds to sustained sub-30 FPS during warmup, dropping more aggressively below 22. A failed upward probe is held off before retrying. Expensive effects restore progressively with recovered performance. The 30 FPS value is a load-reduction target; it is not a guarantee of a minimum hardware/browser frame rate.

Empty retrieve uses the length of the remaining obstacle-safe route and actual elapsed active-frame time to complete in approximately 2.8 seconds, independent of cast distance or reel tier. The original swept collision checks remain: a newly obstructed route still stops/snags rather than teleporting through a solid object. Fishing fights are unchanged.

Validation: 183 Node tests pass. New fixtures verify actual disabled texture slots/physical layers and restoration over 30 switches, cloning at low quality, rain work skipped, bounded rain geometry, screen-drop compositor skipped, static-only culling, 15 Hz transmission plus released-target recreation, sustained 28 FPS response, and actual retrieve updates at 3/50/200 metres and 15/30/60/120 Hz. Water GPU rendering verifies moving lake/ocean waves during heavy rain at both detail settings, and underwater fish affect the pixels at both settings. Standard/physical low shaders and optics/immersion variants compile in WebGL1/2. No affected-device FPS measurement is inferred from these controlled tests.
