## Summary

I have been prototyping optional, compact feature-track names that appear after
the viewer is zoomed far enough for individual lanes to be read. The goal is to
retain lane identity when the overview map structure and legend are no longer
near the visible region.

I would like feedback on whether this belongs as a global `Settings` option or
as track-level presentation metadata, how the visibility threshold should be
chosen, and how it should coordinate with inline feature labels.

### Circular prototype

![Circular feature-track names](https://raw.githubusercontent.com/paulstothard/cgview-js/planning/upstream-contributions/design-evidence/track-names/circular.png)

### Linear prototype

![Linear feature-track names](https://raw.githubusercontent.com/paulstothard/cgview-js/planning/upstream-contributions/design-evidence/track-names/linear.png)

The [evidence harness and SVG verification](https://github.com/paulstothard/cgview-js/tree/planning/upstream-contributions/design-evidence/track-names) render the same two tracks in both layouts.

## Motivation

At overview, lane identity is usually apparent from the complete track layout,
legend, and surrounding features. At close zoom, only a short strip or arc of
the map may remain in view. Several feature lanes can then look structurally
similar, particularly when their current visible features share colors.

A small name at the leading visible edge answers “which track is this?” without
requiring a persistent side panel or repeating the label across the viewport.
This is track identity, not feature annotation: the text must come from
`track.name`, never a legend item, feature type, source, or inferred data method.

## Proposed behavior

- Consider only visible feature tracks with a meaningful, non-empty `name`.
- Draw only after the map is zoomed far enough for individual lanes to be
  useful and only when the rendered lane group has enough height and length.
- Place one identifier near the leading visible edge of each track side.
- For an `around` track, draw one identifier for the visible inside group and
  one for the visible outside group.
- If a track has multiple lanes on the same side, group them under one name
  rather than repeating it in every lane.
- Follow the local arc glyph by glyph in circular layout and use straight text
  in linear layout.
- Derive text and halo colors from the map background so names work across
  palettes without introducing a new semantic color.
- Fit or conservatively truncate long names only when enough readable text can
  remain; otherwise omit the identifier.
- Draw above map data but below captions and legends.

## Proposed API and default

The development prototype uses:

```json
{
  "settings": {
    "showFeatureTrackLabels": true
  }
}
```

For a first upstream contribution, I suggest defaulting the option to `false`
unless the maintainer prefers otherwise. That guarantees unchanged output for
existing CGView JSON while allowing Proksee or another application to opt in.
The development demo enabling the option by default is a demo choice, not a
reason to change the library default.

An alternative is a track-level value such as `track.showNameAtDetail`, which
would permit selective naming but add repeated JSON. A global default with an
optional future track override may be the smallest extensible model.

## Placement and fitting

The prototype groups visible slots by their rendered side and computes the
group's inner edge, outer edge, centerline, and total thickness. For each group:

1. Obtain the floating visible base-pair range at the group centerline.
2. Measure the actual `track.name` using a small bold font.
3. Require the group height to contain the font plus a vertical gutter.
4. Require the visible genomic length at that centerline to contain the label
   plus equal horizontal edge gutters.
5. Convert the screen-space leading gutter and half text width into base pairs.
6. Place the label at that base pair and group centerline.

This keeps placement tied to actual rendered geometry in circular and linear
views. It also avoids using a fixed genomic offset that would vary visually by
radius or zoom.

The prototype uses a minimum zoom factor as an early gate. Before an upstream
PR, I would revisit whether lane readability should be derived entirely from
screen geometry, use a shared detail threshold, or expose a configurable
threshold rather than adding another magic zoom constant.

## Interaction with feature labels

Track names are visually distinct from feature labels because they are small,
bold, edge-aligned, and repeated at most once per visible side. However, an
inline feature label could occupy the same leading region.

The first implementation should use one deterministic policy rather than rely
on draw order:

- reserve the accepted track-name bounds from inline-label placement; or
- move/omit the track name when a higher-priority feature label already owns
  that space.

This coordination can use a small placement/exclusion interface and does not
require the track-name feature to depend on the entire inline-label proposal.

## Performance

The renderer should return immediately unless the option and close-zoom gate
are active. At detail zoom it visits visible tracks and slots once, groups slot
geometry, and caches text measurements by font and name. It must not create a
retained object for every frame or feature.

Changing the option at overview should not trigger a full redraw because the
result cannot be visible there. The implementation PR should benchmark final
foreground drawing on a map with many tracks and slots and verify that fast
interaction draws do not add avoidable work.

## Backward compatibility

- With the setting absent/false, established output remains unchanged.
- Existing CGView JSON remains valid.
- There is no change to feature coordinates, track data selection, legends,
  hit testing, or popovers.
- Plot tracks are excluded from the initial scope; a later proposal could
  generalize the concept if plot names prove useful.
- Tracks without a meaningful name remain unlabeled.

## Suggested PR decomposition

1. **Feature-track name renderer** — setting, grouping, geometry, background-
   derived styling, circular/linear Canvas and SVG tests; default off.
2. **Placement coordination** — only the small exclusion hook needed to avoid
   inline-feature-label overlap, depending on the label API accepted upstream.
3. **Optional track-level override** — only if real Proksee maps demonstrate a
   need for selective naming.

## Test plan

- Circular and linear formats at overview and close zoom.
- Outside, inside, and around tracks.
- One name per visible side; multiple same-side slots are grouped.
- Actual `track.name` is used when feature type, source, and legend differ.
- Plot tracks, hidden tracks, hidden slots, empty names, and `Unknown` names.
- Thin lanes and visible ranges too short to fit text.
- Long Unicode names, deterministic truncation, and minimum retained length.
- Light, dark, opaque, and translucent backgrounds.
- Halo before fill in Canvas and SVG; circular glyph curvature and linear text.
- Captions and legends retain foreground priority.
- Interaction with inline feature labels and external annotations.
- Stable leading-edge placement while panning in both directions and across the
  circular origin.
- Multi-contig maps and tracks with no currently visible features.
- Final-draw timing on a dense map with many tracks and slots.

## Proksee integration considerations

Proksee should preserve the option during CGView JSON round trips. Its UI could
expose one `Feature track names at close zoom` checkbox without exposing font,
gutter, or truncation internals. If Proksee already has authoritative display
names distinct from CGView track names, the integration should populate
`track.name` explicitly rather than ask the renderer to infer one.

If a future track-level override is accepted, Proksee would also need a clear
inherit/on/off model. A global-only first contribution avoids that additional
UI and schema complexity.

## Questions

1. Does a global `settings.showFeatureTrackLabels` option fit the project, or
   should the control live on each track?
2. Is default-off appropriate for the initial upstream contribution?
3. Should the close-zoom gate share an existing detail/readability threshold,
   be purely geometry-derived, or be configurable?
4. Should plot-track names be explicitly out of scope for the first PR?
5. Which element should win when a track name and inline feature label compete
   for the same leading-edge space?

If the direction is acceptable, I will reconstruct the smallest agreed patch
from current upstream `main`, not submit the accumulated development commits.
