## Summary

I have been prototyping an optional feature-label layout that draws names inside feature bodies when they fit and uses the existing external annotation layout only as a fallback for names that do not fit.

Before reconstructing this as upstream patches, I would like feedback on the public `Annotation` API, fitting policy, and PR boundaries. This proposal is independent of six-frame translation, the detailed ruler, direction indicators, and track sizing.

## Motivation

External labels are necessary for short and crowded features, but at moderate and close zoom a long feature often has ample unused space for its own name. An inline option can reduce leader-line clutter while retaining external labels where they remain useful.

The important behavior is **fit before fallback**: a name is not duplicated, forced into an unreadable size, or silently lost merely because inline labels are enabled.

### Circular prototype

The fitting names follow their feature arcs. The intentionally long, short-feature name at the upper left does not fit and remains external.

![Circular inline labels with external fallback](https://raw.githubusercontent.com/paulstothard/cgview-js/planning/upstream-contributions/design-evidence/inline-labels/circular.png)

### Linear prototype

The same model draws straight, centered inline labels in linear format and leaves non-fitting labels to the external layout.

![Linear inline labels with external fallback](https://raw.githubusercontent.com/paulstothard/cgview-js/planning/upstream-contributions/design-evidence/inline-labels/linear.png)

The [evidence-page source](https://github.com/paulstothard/cgview-js/tree/planning/upstream-contributions/design-evidence/inline-labels) uses a small synthetic map so the fitting decisions can be inspected consistently.

## Proposed behavior

1. Determine the feature segments that are actually visible in the current slot and viewport.
2. Reserve configured padding and, where applicable, the part occupied by a fitting arrowhead.
3. Measure the name using the feature's established label font.
4. Optionally reduce the font only to a configured readable floor.
5. Optionally truncate with an ellipsis only when that policy is explicitly enabled.
6. Resolve overlapping inline candidates deterministically (favorites first, then longer features, then coordinate order).
7. In combined mode, send only the rejected/non-fitting names to the existing external annotation layout.

Circular labels are painted glyph by glyph along the feature's center arc. Linear labels are drawn as a normal centered text run. Placements are draw-local so zooming, panning, feature edits, and format changes cannot reuse stale geometry.

## Proposed JSON/API

The current prototype keeps the public options on `annotation`, where the existing external label configuration lives:

```json
{
  "annotation": {
    "visible": true,
    "font": "sans-serif,bold,13",
    "labelPosition": "both",
    "inlineLabelAllowShrinking": true,
    "inlineLabelAllowTruncation": false,
    "inlineLabelMinZoomFactor": 1,
    "inlineLabelMinFontSize": 8,
    "inlineLabelPadding": 2,
    "inlineLabelColor": "rgba(255,255,255,1)"
  }
}
```

Proposed `labelPosition` values:

- `external` — established behavior and the default.
- `inline` — draw only labels accepted by the inline fitter.
- `both` — inline where accepted, external fallback otherwise.
- `none` — suppress feature labels while retaining the annotation object.

`inlineLabelColor` is optional. When omitted, an explicit general annotation color can be respected; otherwise the renderer can select black or white against the feature color as it is composited over the map/background.

The flat option names match the current `Annotation` model, but a nested object such as `annotation.inlineLabels` may be cleaner if the number of settings is a concern. I would prefer maintainer guidance before treating the prototype shape as stable.

## Backward compatibility

- `labelPosition` defaults to `external`, so existing objects and CGView JSON retain established output.
- All fitting, shrinking, and truncation settings are inert in external-only mode.
- Existing `annotation.visible`, `onlyDrawFavorites`, feature names/fonts, and external placement modes continue to apply.
- The new properties are optional in JSON and are emitted only as normal annotation configuration; no feature or track schema changes are required.

## Geometry and edge cases

- Wrapped circular features are split into visible segments and the best fitting visible segment is selected.
- Multi-location features are evaluated by their actual rendered locations rather than the span between their first and last bases.
- A feature arrowhead is reserved only when it is visible and geometrically fits.
- Inline labels are not placed over base-pair sequence glyphs when a feature track is directly on the backbone and sequence detail is readable.
- Features without a usable name remain hoverable but do not create an empty label candidate.
- The same collision result must be obtained regardless of feature draw order.

## Performance model

The prototype uses one private renderer owned by `Annotation`:

- Only visible features in visible slots are considered.
- Placements are cached for the duration of one draw and cleared before the next draw.
- Per-feature glyph measurements are cached by label/font and invalidated when either changes.
- Automatic contrast colors use a small bounded cache.
- External fallback asks the same placement set whether an inline label was accepted; it does not run a second independent fitter.

This should make work proportional to visible feature/label candidates rather than all map features. Large-map fast-draw and final-draw timings still need explicit benchmarks before an implementation PR.

## Suggested PR decomposition

1. **Renderer foundation and placement modes** — private inline renderer, `external`/`inline`/`both` behavior, stable fallback, JSON compatibility, and straight linear labels.
2. **Circular arc text and geometry edge cases** — curved glyph placement, wrapped/multi-location features, arrowhead reservation, Canvas/SVG parity.
3. **Optional adaptation policies** — bounded shrinking, opt-in truncation, automatic contrast, and their tests.

If the public API can be settled without all adaptation options, the first PR can remain substantially smaller than the development prototype.

## Test plan

- Existing JSON and default external-only rendering.
- Long and short named features; unnamed features.
- `external`, `inline`, `both`, and `none` modes.
- Full-size, minimum-size, rejected, and explicitly truncated labels.
- Minimum readable font enforcement.
- Circular curved text and linear straight text.
- Forward/reverse arrowheads and arc decorations.
- Wrapped-origin and multi-location features.
- Overlapping candidates, favorites, and deterministic draw order.
- Tracks outside, inside, around, and directly along the backbone.
- `onlyDrawFavorites`, hidden features, tracks, and slots.
- Explicit label colors and automatic contrast over translucent features.
- Panning, zooming, format switching, and feature renaming without stale placements.
- Canvas and SVG visual parity.
- Large maps with many visible features, including fast-draw timing.

## Proksee integration considerations

This proposal changes optional CGView JSON rendering metadata, not feature annotations or biological data. Proksee would need to preserve the new annotation properties during import/edit/export. It could expose a single user-facing placement choice (`External`, `Inside features`, `Inside with external fallback`) without exposing every low-level fitting option initially.

Proksee integration should not be claimed until its JSON round trip is verified. A Proksee deployment using an older CGView.js should safely ignore the optional fields and retain external labels.

## Questions

1. Is `annotation.labelPosition` with `external` / `inline` / `both` / `none` appropriate, or would another naming/ownership model fit CGView.js better?
2. Should the inline-specific options remain flat on `Annotation`, or be grouped under a nested object?
3. Is `external` the right compatibility default while downstream applications may choose `both`?
4. Should shrinking and truncation be part of the first implementation, or held for a follow-up after the core placement model is reviewed?
5. Does the three-PR decomposition above match how you would prefer to review the work?

If the direction is acceptable, I will reconstruct the implementation from current upstream `main` rather than present the accumulated development history as a patch.
