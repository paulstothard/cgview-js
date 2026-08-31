# Remaining development-commit dispositions

This note closes the audit of the 56 commits on
`feature/zoomed-translations-ruler-labels`. It records the changes that should
not be submitted upstream yet, even though they remain preserved on the public
development branch.

The complete ledger in `UPSTREAM_CONTRIBUTION_PLAN.md` contains exactly the 56
commits between upstream baseline `75afe9a` and development tip `b24b768`; the
hashes are unique and no commit is missing.

## Superseded or unverified browser workarounds

### `cb63063` — delayed Safari redraw

This attempted to restore sharpness by scheduling an additional full redraw
after zoom. Direct Safari testing still showed the blur. It is superseded and
must not be submitted.

### `0e6f3f8` — adaptive large-radius circular paths

This replaces Safari's problematic native large-radius arcs with
sagitta-bounded polyline tessellation. Focused geometry tests pass, but the
workaround has not yet been verified reliably on the affected Safari rendering
path across circular/linear views, Retina scaling, Canvas/SVG export, panning,
and several zoom levels. Keep it on the fork until that native-browser test is
complete. If it is eventually proposed upstream, it needs an isolated WebKit
reproduction, before/after Safari captures, tessellation bounds, and runtime
measurements; it must not include the superseded delayed-redraw code.

## Cross-cutting changes needing their own evidence

### Viewer portion of `5cd823d` — deferred full-quality drawing

The plot-renderer portion belongs to the pixel-aware plot package. The Viewer
portion changes interaction scheduling so fast draws are followed by a delayed
full-quality draw. It may improve large-map interaction, but it also changes
redraw timing and cancellation behavior throughout the viewer. Treat it as a
separate performance proposal only after repeatable large-map measurements,
rapid pan/zoom cancellation tests, format switching, and Canvas/SVG state tests.

### `d48e8b3` — overview-scale feature arrowheads

This adapts feature arrowhead length to visible pixels. It may improve dense
overview maps, but changes established feature geometry independently of the
new optional direction chevrons. Keep it out of the chevron proposal until it
has its own circular/linear overview fixtures, wrapped-feature checks, SVG
parity, and confirmation that existing maps do not depend on the old apparent
arrow length.

### `4664da0` — background-aware feature hover shading

This derives hover shading from the feature color and surrounding background.
It addresses inconsistent dark/light highlights, but changes the shared Color
and Feature rendering path. Before upstream submission it needs independent
captures for light and dark backgrounds, all legend colors, circular/linear
maps, overlaps, legends/captions, and SVG/Canvas behavior. It must remain
separate from the already-submitted overlay paint-order fix.

## Fork defaults and test-page support

The following commits support development and demonstration but should not be
presented as CGView.js library defaults:

- `25c3785` — map-aware feature-track controls in the test page.
- `707b6ed` — development test-page defaults for zoom-detail features.
- `e7600b7` — hidden center guide and demo toggle.
- `41c25f7` — toolbar active-state appearance.
- `12ef2c6` — map-loading status and direct-file diagnostics.
- `4800bcd` — redesigned SVG testing workflow.
- `ab83cd6` — test-page layout pairing labels and controls.

The naming-only commits `6f3ace9` and `8411c1d`, and the default-enabling commit
`93dc499`, are retained as supporting pieces inside their design packages; they
are not independent upstream changes.

## Cross-package dependency

`1883177` refines direction chevrons around inline labels. It should be applied
only after both the inline-label and direction-cue APIs are accepted. It must
not be used to force either proposal to depend on the other.

## Audited package counts

| Package or disposition | Unique commits |
|---|---:|
| Submitted bug-fix PR sources | 4 |
| Sequence detail and translation | 14 |
| Inline labels | 9 |
| Inline-label/direction bridge | 1 |
| Detailed sequence ruler | 7 |
| Direction cues and overview-arrow follow-up | 4 |
| Feature-track names | 1 |
| Stable track sizing | 3 |
| Plot rendering and split Viewer performance work | 3 |
| Safari experiments/workaround | 2 |
| Hover appearance follow-up | 1 |
| Fork/test-page presentation | 7 |
| **Total** | **56** |

Some implementation commits will be reconstructed rather than cherry-picked
because they mix demo changes, intermediate experiments, or more than one
proposed API. The preserved integration branch remains the recovery source;
clean contribution branches must start from current upstream `main`.
