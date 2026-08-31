## Summary

I have been prototyping optional, repeated direction cues inside features at base-pair detail. They preserve strand orientation when zooming or panning leaves the feature's terminal arrowhead outside the viewport.

I would like feedback on whether this belongs as a global `Settings` option, how conservative its default should be, and whether a related projected-arrowhead cleanup belongs in the same contribution or a separate one.

### Circular prototype

![Circular feature direction cues](https://raw.githubusercontent.com/paulstothard/cgview-js/planning/upstream-contributions/design-evidence/direction-cues/circular.png)

### Linear prototype

![Linear feature direction cues](https://raw.githubusercontent.com/paulstothard/cgview-js/planning/upstream-contributions/design-evidence/direction-cues/linear.png)

The [evidence harness and SVG verification](https://github.com/paulstothard/cgview-js/tree/planning/upstream-contributions/design-evidence/direction-cues) use the same forward and reverse features in both layouts.

## Motivation

At overview, a directional feature's terminal arrowhead usually communicates strand orientation. At base-pair detail the viewport can show only a middle portion of a long feature, so neither endpoint is visible. The body then looks like an undirected rectangle, which makes it easy to lose orientation relative to the nucleotide rows and reading frames.

Repeated cues solve that specific detail-view problem. They are not intended to texture every feature at every zoom level.

## Proposed behavior

- Draw sparse open chevrons only inside the currently visible portion of a directional feature.
- Point them in map-coordinate direction for the feature strand.
- Derive a translucent stroke from the actual feature color so the cue works across palettes without introducing a new categorical color.
- Match the chevron arm slope to the configured terminal arrowhead geometry.
- Use screen-pixel sizing and spacing, converted back to map coordinates for placement.
- Anchor unlabelled patterns to stable map coordinates so they do not slide or vibrate while panning.
- When an inline label is accepted, create equal gutters on both sides and repeat markers outward from the text rather than painting through it.
- Draw one combined Canvas/SVG path per visible feature segment.

## Proposed API and default

The development prototype uses:

```json
{
  "settings": {
    "showFeatureDirectionIndicators": true
  }
}
```

For upstream, I suggest initially defaulting this to `false` unless the maintainer prefers otherwise. That preserves established output exactly while allowing Proksee or another application to opt in. The development fork enabling it by default should not be treated as evidence that the library default must change.

Alternative ownership could be per track if mixed map styles need independent control. A feature-level value appears unnecessarily verbose for a repeated presentation cue, but could be useful as an override later.

## Geometry

Let the feature's rendered width be `w`, arrowhead length ratio be `a`, and local base-pair scale be `p` pixels/bp.

- Marker half-height is bounded in screen pixels and constrained inside the feature body.
- Tangential marker length is derived from `2 * halfHeight * a`, with small readability bounds.
- Converting that length by `p` gives the map-coordinate half-length used for curved and linear placement.
- The two tail points use the local inner and outer offsets; the tip uses the feature centerline. In circular layout, all three therefore follow the actual local arc geometry rather than a rectangular approximation.

This makes the marker slope visually consistent with the feature's terminal head even when the feature is curved.

## Visibility and performance gates

The prototype does no marker work unless all of the following are true:

- the normal map layer is being drawn (not a hover/selection overlay);
- the caller requested full-quality feature detail rather than a fast interaction draw;
- the setting is enabled;
- actual sequence data is present;
- the sequence/base-pair detail is readable at the current zoom;
- the rendered feature width is at least 10 px.

Patterns are capped defensively, and all chevrons for a segment share one path/stroke. The evidence SVG contains two cue paths—not 24 separate path objects—for 12 direct and 12 reverse markers.

## Interaction with inline labels

The cue renderer can operate without inline labels. If both features are accepted, it consumes the exact draw-local label placement rather than independently guessing the text bounds. Markers begin at equal visual gutters from the rendered text and continue outward at constant screen-space intervals.

This dependency should remain optional: accepting direction cues must not require accepting the public inline-label API in the same PR. A small neutral exclusion-range hook could keep the contributions separable if that is easier to review.

## Related overview arrowhead behavior

The development branch also avoids forcing a full arrowhead into a feature whose projected screen length cannot contain both a head and a meaningful body. In that case it draws a compact arc segment; for subpixel geometry it omits the separate highlight/shadow pass that produces a visually heavy half-arrow.

This is related visual language but a different zoom regime. I recommend treating it as a second PR or even a separate issue unless the maintainer sees both as one direction-encoding policy.

## Backward compatibility

- With the setting absent/false, established feature rendering remains unchanged.
- There is no feature, track, legend, or biological-data schema change.
- Old CGView JSON remains valid.
- The cues do not change hit testing, popovers, feature coordinates, or decorations.
- Fast interaction output remains free of the extra detail.

## Suggested PR decomposition

1. **Base-detail direction cues** — setting, geometry, stable placement, performance gates, Canvas/SVG tests; upstream default off.
2. **Optional label exclusion integration** — only after the inline-label placement API is accepted, or via a small private hook agreed during review.
3. **Projected arrowhead cleanup** — separate overview-focused patch with before/after dense-map evidence and benchmarks.

## Test plan

- Forward and reverse strands in circular and linear formats.
- Tips remain inside feature width and point in the correct map direction.
- Chevron slope tracks `arrowHeadLength` changes.
- Stable map-coordinate phase while panning.
- Visible-range clipping, including circular-origin wrapping.
- Features with and without visible endpoints.
- With and without inline labels; symmetric exclusion gutters.
- Thin tracks, short features, missing sequence, and unreadable zoom gate out safely.
- Fast draws and UI overlays never draw cues.
- Translucent and opaque feature colors on light/dark backgrounds.
- One Canvas/SVG path per visible segment and bounded marker count.
- Multi-location features and connectors.
- Large-map interaction timing and final-draw timing.

## Proksee integration considerations

This is an optional CGView rendering setting. Proksee would need to preserve it during JSON round trips and could expose one `Feature direction cues` checkbox without exposing marker geometry. Proksee might choose a different default from the CGView.js library after testing its normal map styles.

No server-side sequence translation, feature annotation, or strand inference is involved; cues use the feature strand already present in CGView data.

## Questions

1. Does a global `settings.showFeatureDirectionIndicators` option fit the project, or should control be per track?
2. Is default-off appropriate for an initial upstream contribution?
3. Should label-aware spacing wait for the inline-label proposal, use a private exclusion hook, or be omitted initially?
4. Should projected short-feature arrowhead cleanup be discussed and reviewed separately?

If the direction is acceptable, I will reconstruct the smallest agreed patch from current upstream `main`, not submit the accumulated development commits.
