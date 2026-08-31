# CGView.js upstream contribution plan

This document is an internal planning aid for Paul Stothard's development fork.
It is not intended to be included wholesale in a pull request. Its purpose is
to preserve the complete development history while preparing small, reviewable
contributions for Jason Grant's upstream CGView.js repository.

## Current state and safety boundaries

- Upstream repository: <https://github.com/sciguy/cgview-js>
- Fork: <https://github.com/paulstothard/cgview-js>
- Audited upstream baseline: `75afe9a`
- Preserved integration branch: `feature/zoomed-translations-ruler-labels`
- Public development branch: `development`
- Planning branch: `planning/upstream-contributions`
- Integration commits under review: 56
- Verified offline recovery bundle:
  `/Users/paulstothard/paulstothard/cgview-js-before-github-2026-08-30.bundle`

The following rules apply throughout the upstreaming process:

1. Never open a pull request from the integration or development branch.
2. Never rewrite or force-push the preserved integration branch.
3. Build every proposed contribution from the current `upstream/main`.
4. Reconstruct the smallest necessary patch instead of assuming an existing
   development commit can be cherry-picked safely.
5. Submit only independently verified, focused packages. Paul authorized the
   upstreaming program on 2026-08-30; this does not authorize mixing unrelated
   enhancements or bypassing design discussion for new APIs.
6. Keep fork-specific descriptions and demo defaults out of upstream patches.
7. Treat backward compatibility, performance, circular and linear layouts, SVG,
   and potential Proksee integration as explicit review areas.

## Upstream contribution requirements

CGView.js's contribution guidance asks contributors to report bugs with clear
reproduction steps, discuss larger changes in an issue first, keep pull requests
small and focused, update documentation and tests when behavior changes, follow
the existing design, and ensure the complete test suite passes.

Every proposed pull request will therefore include:

- A concise statement of the problem and why it matters.
- Reproduction steps against unmodified upstream `main`.
- The root cause, without blaming the existing implementation or its author.
- The exact scope and explicit non-goals.
- Backward-compatibility and CGView JSON impact.
- Potential Proksee integration implications.
- Automated regression tests and full-suite results.
- Exact manual steps using `docs/test/index.html` when visual behavior changes.
- Before and after screenshots, normally for both circular and linear layouts.
- Canvas and SVG verification when the changed code affects both renderers.
- Performance and memory evidence for rendering or interaction changes.
- Known limitations, risks, and follow-up work.

## Verified independent upstream bug candidates

These problems have already been reproduced on the pristine `75afe9a` upstream
baseline using tests taken from the development history.

### 1. Clear transient hover state when the pointer leaves the viewer

- Development source: `af85e55`
- Upstream reproduction: confirmed
- Before fix: `test/EventMonitor.test.js` failed 2 of 2 tests.
- After applying only the source fix: 2 of 2 tests passed.
- Likely upstream scope: `src/EventMonitor.js`, `src/Events.js`,
  `src/Highlighter.js`, one focused test file, and concise event documentation.
- Risk: low.
- Proposed branch: `fix/clear-hover-on-leave`
- Proposed PR title: `Clear transient hover state when the pointer leaves the viewer`
- Manual test: hover a feature until its popover is visible, move the pointer
  rapidly out through each edge of the canvas, and verify that the popover,
  highlight, cursor, and legend swatch state all clear.
- Required views: circular and linear, Canvas. SVG is not interactive and is
  therefore an explicit non-applicable case.
- Proksee impact: no JSON or data-model change; Proksee should inherit the
  interaction fix automatically when it updates CGView.js.
- Submitted upstream: [sciguy/cgview-js#23](https://github.com/sciguy/cgview-js/pull/23).
- Focused fork commit: `9d82a8c`.

The existing development commit also contains local changelog and test-page
cache-busting edits. Those will not be copied into the upstream patch.

### 2. Clip feature drawing to true coordinates across wrapped viewports

- Development source: `043d026`
- Upstream reproduction: confirmed.
- Before fix: the four new clipping tests failed; the 12 existing feature tests
  passed.
- After applying only the source fix: all 16 feature tests passed.
- Likely upstream scope: `src/Feature.js`, focused additions to
  `test/Feature.test.js`, and documentation of the clipping behavior.
- Risk: medium because this changes feature drawing boundaries and decoration
  placement around the circular origin.
- Proposed branch: `fix/wrapped-feature-clipping`
- Proposed PR title: `Keep clipped features within their true map coordinates`
- Manual test: use a circular map whose visible range wraps the origin, pan it
  off-center, and verify that a nearby feature never paints past its true start
  or stop or overpaints an adjacent feature.
- Required views: circular and linear; forward and reverse strands; clipped and
  unclipped arrowheads; Canvas and SVG; origin-wrapping and ordinary ranges.
- Performance check: compare full and fast draw timing on the large test map,
  because the correction runs in the feature drawing path.
- Proksee impact: no JSON or API change; corrected rendering only.
- Submitted upstream: [sciguy/cgview-js#24](https://github.com/sciguy/cgview-js/pull/24).
- Focused fork commit: `9cbd3d7`.

Although the source patch applies cleanly to the current upstream baseline, it
will still be reconstructed on a fresh branch and reviewed for simpler naming,
allocation cost, and pre-existing edge cases before a pull request is proposed.

## Additional upstream candidates requiring investigation

### Safari large-radius circular paths

- Relevant development sources: `cb63063`, `0e6f3f8`.
- `cb63063` was an attempted delayed-redraw workaround. Visual testing showed
  that it did not solve the failure, and most of it was explicitly reverted.
  It must not be proposed upstream.
- `0e6f3f8` contains the replacement: Safari-only adaptive polyline tessellation
  derived from the circle sagitta and physical-pixel tolerance.
- Status: issue and design discussion before code. The final solution must be
  reconstructed from the surviving `Utils.isSafari` helper and circular layout
  geometry, without the failed redraw experiment.
- Required evidence: Safari version and hardware, reproducible map and zoom
  range, sharpness screenshots, tessellation-error tests, Canvas/SVG comparison,
  and benchmarks on small and very large genomes.
- Risk: medium to high because it changes a core path primitive in one browser.
- Proksee impact: potentially important because the defect is visible in
  embedded Safari viewers, but there is no JSON or server-side integration
  change.

### SVG export during progressive canvas drawing

- Relevant development source: `b24b768`.
- Upstream reproduction: confirmed with a deterministic 6,400-feature,
  four-slot harness. Unmodified upstream stops at 0/4 full-quality live slots;
  the focused fix completes 4/4 while producing the same complete SVG.
- Status: reconstructed independently from upstream and submitted as
  [sciguy/cgview-js#25](https://github.com/sciguy/cgview-js/pull/25).
- Focused fork commit: `3c5fe7d`.
- Required evidence: a large map that is still drawing, an immediate SVG export,
  proof of incomplete live Canvas rendering before the fix, proof of complete
  Canvas and SVG output afterward, and no extra draw loop.
- Risk: medium because it changes temporary canvas-layer ownership and slot
  scheduling.

### Hover highlight appearance and overlay ordering

- Relevant development sources: `4df74c3`, `4664da0`.
- `4df74c3` mixes two concerns: keeping transient graphics away from legends and
  captions, and improving titles for unnamed features. They were reconstructed
  as separate focused fixes:
  - Overlay ordering: submitted as
    [sciguy/cgview-js#26](https://github.com/sciguy/cgview-js/pull/26), focused
    fork commit `e274e62`.
  - Unnamed feature popovers: submitted as
    [sciguy/cgview-js#27](https://github.com/sciguy/cgview-js/pull/27), focused
    fork commit `2e630a2`.
- `4664da0` adds background-aware highlight color selection and disables a
  second shading pass. It depends on later color and feature work.
- Status: the two independent bugs are submitted. Background-aware highlight
  color and shading remain a separate reproduction/design task and must not be
  appended to either PR.
- Risk: medium because UI-layer clearing can interact with multiple overlays.

### Deferred full-quality rendering after interaction

- Relevant development source: the Viewer portion of `5cd823d`.
- Status: benchmark before deciding whether it is an independent performance
  contribution or only support for the new plot renderer.
- Required evidence: interaction frame timing, time to final-quality rendering,
  cancellation behavior during repeated gestures, and tests for programmatic as
  well as pointer-driven zooms.
- Risk: medium because applications may observe draw timing.

### Test-page loading and SVG workflow

- Relevant development sources: `12ef2c6`, `41c25f7`, `4800bcd`.
- These changes primarily improve the development test page rather than the
  CGView.js library.
- Status: retain in the development fork unless a library contribution needs a
  small, focused test-page control or upstream explicitly wants the workflow.
- Do not mix these UI changes into unrelated rendering pull requests.

## Enhancement packages requiring discussion before a PR

The following packages are useful but represent product and API design choices.
They should be introduced through one concise design issue, with screenshots
and proposed boundaries, before implementation branches are prepared.

### A. Base-pair sequence detail and six-frame translation

Upstream design discussion:
[sciguy/cgview-js#28](https://github.com/sciguy/cgview-js/issues/28).

Development commits:

- `b14d907` — initial zoomed sequence detail renderers.
- `d11df24` — JSON compatibility coverage.
- `50854f4` — configurable start and stop highlights.
- `eee8c0e` — visible-window translation streaming.
- `ace7ca1` — exact translation-lane geometry.
- `243f01d` — layout-safe translation toggles.
- `64fa7c3` — corrected inner-frame placement.
- `5eba011` — avoid hidden translation redraws.
- `22bfce3` — highlight sizing constrained to frame lanes.
- `91c4ac7` — DNA glyphs aligned to the circular tangent.
- `3d0fb42` — thin backbone edge shading at sequence detail.
- `d00290c` — on-demand amino-acid popovers.
- `50ce1fd` — translation cell spacing.
- `4a4bb32` — optional semantic DNA base colors.

Proposed discussion boundaries:

1. Sequence-detail foundation and genetic-code model.
2. Visible-window six-frame translation renderer.
3. Start/stop styling and amino-acid interaction.
4. Optional nucleotide colors.

Important review points:

- Translation must remain on-demand and bounded to the visible region.
- Reading frames must remain anchored to biological coordinates across panning,
  zooming, contigs, and the circular origin.
- Existing CGView JSON without the new settings must render exactly as before.
- New defaults proposed for the demonstration page must not silently become
  library defaults without upstream agreement.
- Both circular and linear geometry require explicit tests and screenshots.
- Proksee must preserve the genetic-code and rendering settings when it imports,
  edits, and exports CGView JSON.

### B. Inline feature labels and placement

Prepared discussion package:
[design evidence and draft](https://github.com/paulstothard/cgview-js/tree/planning/upstream-contributions/design-evidence/inline-labels).
Keep this queued on the fork until the maintainer has had a reasonable chance
to respond to sequence-detail issue #28; submitting every enhancement topic at
once would make review harder and risks obscuring the focused bug-fix PRs.

Development commits:

- `1e15210` — show labels at overview when they fit.
- `a909c11` — labels following circular feature arcs.
- `99f218f` — inline, external, and fallback placement modes.
- `2abea86` — normalized JSON options.
- `235f873` — contrast-aware inline text colors.
- `f84cd7d` — inline labels on backbone-positioned feature tracks.
- `6c18a23` — external-label stability while panning.
- `31d0b40` — external-label halos instead of rectangles.
- `49aec28` — SVG-safe external label protection.

Proposed discussion boundaries:

1. Label renderer abstraction and fit calculation.
2. Placement modes and backward-compatible JSON.
3. Circular curved text and external-label protection.
4. Optional bounded shrinking and truncation.

The upstream proposal must clearly explain minimum readable font size, fitting
precision, label collision behavior, text-color calculation, Canvas/SVG parity,
and behavior when no label text exists.

### C. Detailed sequence ruler and protected coordinate labels

Prepared discussion package:
[design evidence, SVG verification, and draft](https://github.com/paulstothard/cgview-js/tree/planning/upstream-contributions/design-evidence/detailed-ruler).
Keep it queued behind the current upstream review and the inline-label package.

Development commits:

- `6f3ace9` — descriptive demo naming.
- `9de7c52` — glyph-by-glyph curved circular coordinate labels.
- `4c5bd75` — background-aware ruler label halos.
- `1bae37f` — correct halo paint order.
- `a69d6de` — automatic halo behavior.
- `8411c1d` — demo control renamed to “Detailed sequence ruler”.
- `d6df421` — compositing correction for ruler halos.

The user-facing capability is a detailed sequence ruler, not merely “curved
labels.” The halo is an implementation detail that should normally be automatic.
The design discussion must cover overview versus detail behavior, circular
curvature, linear placement, background compositing, and exported SVG strokes.

### D. Feature direction cues and adaptive arrows

Prepared discussion package:
[design evidence, SVG verification, and draft](https://github.com/paulstothard/cgview-js/tree/planning/upstream-contributions/design-evidence/direction-cues).
Keep it queued behind the current upstream review. The base-detail cue renderer
and the overview arrowhead cleanup are related visually, but should remain
separate implementation contributions unless the maintainer requests otherwise.

Development commits:

- `1b2327d` — direction chevrons in feature bodies.
- `1883177` — chevron placement around inline labels.
- `3dd6baa` — chevron angle matched to feature arrowheads.
- `93dc499` — default enabled in the development fork.
- `d48e8b3` — arrow geometry adapted to overview scale.

The upstream version should be optional initially unless Jason prefers a new
default. The proposal must show forward and reverse strands, short and long
features, features with and without labels, circular arc geometry, linear
geometry, and behavior when the feature is too narrow for a cue.

The evidence package confirms one combined Canvas/SVG path per visible feature
segment, stable map-coordinate placement, label-aware gutters, and opposing
forward/reverse cues in circular and linear layouts. A clean implementation PR
still requires automated geometry and clipping tests plus a dense-map benchmark.

### E. Zoomed feature-track names

Prepared discussion package:
[design evidence, SVG verification, and draft](https://github.com/paulstothard/cgview-js/tree/planning/upstream-contributions/design-evidence/track-names).
Keep it queued behind the current upstream review and the preceding visual
enhancement packages.

Development commits:

- `d4a7ef9` — renderer, settings, JSON, and tests.
- `ab83cd6` — test-page control layout.

The upstream proposal must distinguish a track's actual name from its data type
or legend item. Labels should appear only when space and zoom allow, avoid
feature labels, work on both sides of the backbone, and remain optional.

The evidence package uses deliberately different track names, feature names,
types, sources, and legend items. It verifies one name per visible track side,
circular glyph-by-glyph curvature, straight linear placement, and matching halo
and fill paint in SVG. The upstream default should remain off initially even
though the development demonstration enables the option.

### F. Stable track sizing

Prepared discussion package:
[design evidence, numeric verification, tests, and draft](https://github.com/paulstothard/cgview-js/tree/planning/upstream-contributions/design-evidence/track-sizing).
Keep this queued as an API/layout discussion; the test-page slider is evidence
of a simple application experience, not the proposed upstream public surface.

Development commits:

- `17cfc89` — serialized, zoom-aware sizing model.
- `ad48c2c` — simplified test-page thickness control.
- `534c45a` — control and layout hardening.

The library design is more important than the demo slider. The proposal must
explain how requested thickness maps to overview proportions, zoom growth, lane
limits, multiple slots, plots, serialization, and existing maps. Proksee review
must determine whether its editor preserves these settings and how a single
user-facing control should map to the underlying model.

### G. Pixel-aware plot rendering

Prepared discussion package:
[upstream comparison, SVG observations, tests, and draft](https://github.com/paulstothard/cgview-js/tree/planning/upstream-contributions/design-evidence/plot-rendering).
Keep this queued as a rendering/API discussion. The package compares pristine
upstream `75afe9a` with the settled implementation and explicitly excludes the
superseded extrema envelope.

Development commits:

- `ec4279a` — screen-aware mean contours and bar-plot preservation.
- Plot-specific portion of `5cd823d` — streaming aggregation and cheaper fast
  draws.
- `8883175` — removal of the extrema envelope that produced SVG artifacts.

This is a rendering redesign, not a bug-fix PR. The final proposed patch should
represent the settled implementation rather than the intermediate extrema
envelope. It needs before/after images, numeric invariants, baseline-crossing
tests, bar-plot compatibility, circular/linear Canvas/SVG parity, and large-map
benchmarks. The description must explain that aggregation reduces display noise
without inventing interpolated biological values.

On the controlled 69,034 bp evidence map, the settled renderer reduced SVG line
commands from roughly 414,000 to 6,808 (circular) and 2,453 (linear), while all
11 focused plot tests passed. The upstream default remains an explicit design
question because changing omitted/legacy plots from steps to contours is a
visible compatibility decision.

### H. Viewer presentation defaults and demo-only polish

Development commits:

- `25c3785` — map-aware feature-track controls.
- `707b6ed` — zoom-detail defaults in the test page.
- `e7600b7` — center guide hidden by default and made toggleable.
- `41c25f7` — toolbar active-state appearance.
- `12ef2c6` — map loading and direct-file diagnostics.
- `4800bcd` — SVG testing workflow.

These should remain fork-specific unless they directly support an accepted
feature or Jason requests them. Test-page defaults are not evidence that the
library should change its defaults.

## Complete 56-commit ledger

| Commit | Category | Preliminary disposition |
|---|---|---|
| `b14d907` | Sequence detail | Large design discussion |
| `d11df24` | Sequence detail tests | Include with accepted foundation |
| `50854f4` | Translation styling | Optional enhancement package |
| `eee8c0e` | Translation performance | Include with translation renderer |
| `1e15210` | Feature labels | Label design discussion |
| `a909c11` | Feature labels | Label design discussion |
| `6f3ace9` | Test-page naming | Supporting/demo only |
| `ace7ca1` | Translation geometry | Include with translation renderer |
| `99f218f` | Feature labels | Label design discussion |
| `2abea86` | Label JSON | Include with accepted label API |
| `235f873` | Text contrast | Supporting label enhancement |
| `f84cd7d` | Backbone labels | Supporting label enhancement |
| `243f01d` | Translation layout | Include with translation renderer |
| `64fa7c3` | Translation geometry | Include with translation renderer |
| `043d026` | Upstream bug | Verified; prepare focused PR |
| `af85e55` | Upstream bug | Verified; recommended first PR |
| `25c3785` | Test-page UI | Fork/supporting demo only |
| `5eba011` | Translation performance | Include with translation renderer |
| `4df74c3` | Mixed hover fixes | Split into submitted PRs #26 and #27 |
| `1b2327d` | Direction cues | Design discussion |
| `1883177` | Labels and direction | Include only after both APIs settle |
| `9de7c52` | Detailed ruler | Design discussion |
| `4c5bd75` | Ruler protection | Include with detailed ruler |
| `22bfce3` | Translation styling | Include with translation renderer |
| `e7600b7` | Viewer default/UI | Fork-specific unless requested |
| `91c4ac7` | Sequence geometry | Include with sequence detail |
| `3d0fb42` | Sequence styling | Include with sequence detail |
| `d00290c` | Translation interaction | Optional follow-up enhancement |
| `707b6ed` | Test-page defaults | Fork-specific demo only |
| `17cfc89` | Track sizing model | Separate design discussion |
| `ad48c2c` | Track sizing UI | Supporting demo only |
| `534c45a` | Track sizing hardening | Include with accepted sizing model |
| `1bae37f` | Ruler correction | Fold into final ruler implementation |
| `a69d6de` | Ruler behavior | Fold into final ruler implementation |
| `8411c1d` | Test-page naming | Supporting/demo only |
| `d4a7ef9` | Track names | Separate optional enhancement |
| `50ce1fd` | Translation styling | Fold into final renderer |
| `6c18a23` | External labels | Include with label renderer |
| `d6df421` | Ruler correction | Fold into final ruler implementation |
| `31d0b40` | External labels | Include with label renderer |
| `4a4bb32` | DNA colors | Small optional sequence-detail PR |
| `cb63063` | Safari experiment | Superseded; do not submit |
| `0e6f3f8` | Safari geometry | Issue and benchmark first |
| `12ef2c6` | Test-page loading | Fork-specific unless requested |
| `3dd6baa` | Direction styling | Fold into final chevron implementation |
| `41c25f7` | Toolbar styling | Fork-specific demo only |
| `ec4279a` | Plot rendering | Separate design discussion |
| `93dc499` | Development default | Do not impose upstream by default |
| `ab83cd6` | Test-page layout | Supporting/demo only |
| `5cd823d` | Performance | Split plot and viewer concerns |
| `d48e8b3` | Feature arrows | Investigate as separate rendering improvement |
| `8883175` | Plot correction | Fold into final plot implementation |
| `49aec28` | External-label SVG | Include with label renderer |
| `4800bcd` | SVG test-page UI | Fork-specific unless requested |
| `4664da0` | Hover appearance | Reproduce and split from label/color dependencies |
| `b24b768` | SVG/progressive drawing | Reproduced; submitted as PR #25 |

## Proposed contribution order

1. Monitor the five submitted, independently verified bug-fix PRs and respond
   to maintainer review without mixing their scopes.
2. Finish Safari-native verification before proposing the large-radius path
   workaround; do not submit the earlier failed delayed-redraw experiment.
3. Continue the sequence-detail architecture discussion in
   [issue #28](https://github.com/sciguy/cgview-js/issues/28). Only reconstruct
   implementation branches after the ownership and PR boundaries are agreed;
   do not attach the complete development diff.
4. Treat track sizing and plot rendering as separate design topics rather than
   appendices to sequence translation.
5. Keep the complete development branch public for demonstration and recovery,
   but never present it as a ready-to-merge upstream change.

## Proksee integration checklist

For any accepted setting or data-model change, verify all of the following:

- Existing CGView JSON without the setting retains established behavior.
- New values round-trip through `toJSON()` and `loadJSON()`.
- Unknown or absent values fail safely and have documented defaults.
- Proksee does not strip the setting when a map is imported, edited, saved, or
  exported.
- The Proksee user interface does not need to expose every low-level setting;
  when it offers a simpler control, the mapping is documented.
- Server-generated and uploaded maps behave consistently.
- Feature, track, legend, sequence, and contig identifiers are not confused.
- Proksee's own defaults are distinguished from CGView.js library defaults.
- Performance is checked with realistic bacterial, mitochondrial, and large
  multi-megabase maps.
- Screenshots and test instructions state whether they show standalone
  CGView.js or a Proksee-integrated viewer.

No PR should claim Proksee compatibility merely because its CGView.js tests
pass. Integration status and any uncertainty will be stated explicitly.

## Visual and manual test matrix

| Area | Required coverage |
|---|---|
| Layout | Circular and linear |
| Zoom | Overview, intermediate, base-pair detail |
| Strand | Forward and reverse |
| Rendering | Canvas and SVG where applicable |
| Browser | Chromium and Safari for general visual work; Safari specifically for WebKit fixes |
| Genome size | Focused small map and large multi-megabase map |
| Navigation | Static, pan, wheel zoom, programmatic move/zoom, format switch |
| Labels | With and without text; fitting, fallback, minimum size, background contrast |
| JSON | Old fixture, new round-trip, omitted settings, invalid values |
| Performance | Fast-draw responsiveness, final-draw completion, CPU time, allocation risk |

## Pull-request description template

```markdown
## Summary

What changes, in one or two sentences.

## Why

The observable problem, reproduction steps, and why it matters.

## Scope

Included behavior and explicit non-goals.

## Implementation

The minimal technical approach and why it fits CGView.js's existing design.

## Compatibility and Proksee considerations

CGView JSON, defaults, API, Canvas/SVG, circular/linear, and any known Proksee
integration implications.

## How to test

1. Run `yarn install`, `yarn build`, and `yarn test`.
2. Open `docs/test/index.html` through the local test server.
3. Select the named test map and follow exact control and navigation steps.
4. Verify the stated circular, linear, Canvas, and SVG results.

## Evidence

Before/after screenshots and performance measurements where applicable.

## Risks and limitations

Known edge cases, assumptions, and areas where maintainer feedback is requested.
```
