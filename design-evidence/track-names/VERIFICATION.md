# Zoomed feature-track name evidence verification

The evidence page renders two named feature tracks over the same 360 bp
sequence in circular and linear formats, then serializes each result through
`cgv.io.getSVG()`.

Verified in the in-app Chromium browser on 2026-08-30:

| Layout | SVG size | Track-name placements | Halo/fill structure |
|---|---:|---:|---|
| Circular | 103,104 characters | 3 | 40 glyph strokes followed by 40 glyph fills |
| Linear | 56,200 characters | 3 | 3 whole-label strokes followed by 3 whole-label fills |

`Curated genes` appears once on each visible side of an `around` track.
`Predicted ORFs` appears once on its separate outside track. The text is taken
from each track's `name` property; the feature names, types, sources, and legend
items are deliberately different in the harness.

All verified halos are white, 3.5 px, with rounded joins. The corresponding
black text uses 0.78 opacity. Circular output paints one halo and one fill per
glyph so the text follows the local arc; linear output paints one complete
halo and fill per label at the same transform.

The screenshots confirm that the identifiers remain at the leading visible
edge, circular labels follow their lane arcs, and linear labels remain straight.

This is structural evidence for a controlled map. An implementation pull
request still needs automated tests for visibility gates, grouping, fitting,
SVG paint order, and collision behavior, plus a dense-track performance check.
