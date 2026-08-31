## Summary

I have been prototyping a **detailed sequence ruler** option that makes coordinate labels follow a circular ruler while retaining ordinary straight labels in linear maps. The detailed styles receive automatic glyph-shaped background protection so coordinates remain legible without rectangular label boxes.

I would like feedback on the `Ruler` API and implementation boundary before reconstructing the work from current upstream `main`. This proposal is independent of six-frame translation and inline feature labels.

### Circular prototype

![Circular detailed sequence ruler](https://raw.githubusercontent.com/paulstothard/cgview-js/planning/upstream-contributions/design-evidence/detailed-ruler/circular.png)

### Linear prototype

![Linear detailed sequence ruler](https://raw.githubusercontent.com/paulstothard/cgview-js/planning/upstream-contributions/design-evidence/detailed-ruler/linear.png)

The [evidence page and SVG verification notes](https://github.com/paulstothard/cgview-js/tree/planning/upstream-contributions/design-evidence/detailed-ruler) use the same synthetic map in both layouts.

## Motivation

The established radial labels work well as a general default. At high-detail zoom and in publication-oriented circular maps, however, coordinate strings read more naturally when their glyphs follow the ruler circumference. A simple rotation of the complete text run is only tangential; it does not follow the arc and becomes visibly inaccurate for longer labels or smaller radii.

The proposal therefore treats this as a ruler presentation option, not a new ruler type and not a global default change.

## Proposed API

```json
{
  "ruler": {
    "labelPosition": "outer",
    "labelStyle": "curved",
    "labelHaloWidth": 5,
    "labelHaloColor": "auto"
  }
}
```

Proposed `labelStyle` values:

- `default` — established radial/attachment-based orientation and the compatibility default.
- `tangential` — rotate the complete straight text run tangent to the circle.
- `curved` — position and rotate individual glyphs along the exact circular ruler radius.

`curved` and `tangential` apply only to circular layout. A linear map always uses its established straight coordinate-label geometry.

`labelHaloColor` is optional. When omitted or set to `auto`, it resolves to the map's current background color at draw time, so changing or inverting the map palette does not leave a stale white outline. `labelHaloWidth` controls the total rounded text-stroke width. The protection is automatic for non-default detailed styles rather than a separate user-facing on/off concept.

The terms above describe the prototype API, not a fixed upstream decision. In particular, `labelStyle` may already carry enough meaning without exposing halo configuration in an initial PR.

## Circular geometry

For each coordinate label:

1. Measure individual Unicode code points and cache the small set of formatted tick strings by font and label.
2. Convert the accumulated glyph width to angular distance at the actual label radius.
3. Center that angular span on the tick's base-pair coordinate.
4. Position every glyph on the exact circumference and rotate it to the local tangent.
5. On the lower semicircle, reverse the path and rotate the glyphs so the text remains upright and reads naturally.

This uses the ruler's actual center offset; it does not approximate the text using the backbone radius or a fixed angle.

## Text protection and drawing order

The halo is a rounded background-colored `strokeText` pass followed by the normal fill. It traces the glyphs and avoids the visual weight and wasted space of a rectangle.

Ruler labels need to be on the foreground layer after feature/plot slots and sequence detail. Otherwise later map drawing can overpaint the halo and make it appear that the text color changed rather than being protected.

For circular text, all glyph halo strokes for one label are painted before that label's glyph fills. Straight tangential and linear labels use the same stroke-before-fill rule for the complete text run.

## SVG export verification

The evidence harness generated full SVG output through `cgv.io.getSVG()` and inspected the actual serialized nodes:

- Circular: 41 protected glyph strokes and 41 matching fills across seven ruler labels.
- Linear: seven protected whole-label strokes and seven matching fills.
- Every halo stroke preceded its matching fill and used the same transform.
- The automatic halo resolved to the map background (`rgb(238,242,246)`), with rounded caps/joins and width 5.

The exact verification record is included with the evidence. Canvas/SVG parity still needs automated regression coverage and inspection in multiple SVG consumers before a PR.

## Backward compatibility

- Existing JSON with no `labelStyle` retains `default` behavior.
- Established `labelPosition`, tick spacing, formatter, font, color, and ruler visibility remain unchanged.
- The optional halo has no effect on the default label style.
- Unknown/invalid styles fall back to `default` rather than failing map loading.
- Linear output remains straight even when a shared map configuration selects `curved`, allowing one JSON document to switch formats safely.

## Performance model

- The major-tick set is already bounded by ruler tick calculation.
- Curved glyph widths are cached by label and font in a small bounded cache.
- No paths, DOM text nodes, or retained per-frame objects are created for Canvas drawing.
- Work is proportional to the characters in the visible major labels, not genome length.

The implementation PR should still compare Canvas draw time and SVG size for overview and deep-zoom views, especially on maps with large coordinate values.

## Suggested PR decomposition

1. **Ruler style and geometry** — `labelStyle`, circular per-glyph placement, linear fallback, JSON and geometry tests. Keep established default output unchanged.
2. **Automatic text protection and export parity** — background-aware halo, foreground ordering, Canvas/SVG tests, and documentation.

If the halo and foreground order are considered inseparable from a usable curved style, both pieces could be one focused PR; the development-history commits should not be submitted individually.

## Test plan

- Existing/default ruler snapshots and JSON behavior.
- `default`, `tangential`, and `curved` circular labels.
- Straight linear fallback for all shared style values.
- Inner, outer, both, and no-label positions.
- Top and bottom semicircles, including upright reading direction.
- Long coordinate strings, unit suffixes, different fonts, and small/large radii.
- Map background changes and explicit halo color.
- Color inversion with automatic and explicit halo colors.
- Stroke-before-fill order and foreground-after-slots order.
- Canvas and serialized SVG transforms for matching glyph pairs.
- Zoom, pan, resize, format switch, and SVG export.
- Cache invalidation after font changes and bounded cache size.

## Proksee integration considerations

These are optional CGView JSON presentation fields. Proksee would need to preserve them on import/edit/export before claiming support. Its UI could expose one meaningful choice such as `Standard` / `Detailed`, while leaving halo color automatic and hiding lower-level geometry terms.

An older CGView.js should ignore the optional fields and continue with standard ruler labels. This proposal does not require server-side coordinate calculation or changes to biological annotations.

## Questions

1. Does `ruler.labelStyle` with `default`, `tangential`, and `curved` fit the existing `Ruler` model?
2. Should `curved` automatically imply glyph-shaped protection, or should halo settings remain independently configurable at the API level?
3. Is keeping `default` as the library default and presenting this as a downstream `Detailed` choice the right separation?
4. Would you prefer the geometry and text-protection changes as one PR or two?

If the direction is acceptable, I will reconstruct the settled implementation and tests from current upstream `main` rather than submit the intermediate development commits.
