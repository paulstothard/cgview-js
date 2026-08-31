# Detailed ruler evidence verification

The evidence page loads the development build with `svgcanvas.iife.js`, renders
the same 360 bp synthetic map in circular and linear formats, and places the
complete `cgv.io.getSVG()` result in the hidden `#svg-output` field.

Verified in the in-app Chromium browser on 2026-08-30:

| Layout | Protected ruler text strokes | Matching fills | Ordering |
|---|---:|---:|---|
| Circular | 41 glyphs across 7 labels | 41 | Every halo stroke precedes its matching glyph fill |
| Linear | 7 complete labels | 7 | Every halo stroke precedes its matching label fill |

The circular SVG was 333,235 characters. Its ruler halo nodes used:

- `stroke="rgb(238,242,246)"`, matching the map background;
- `stroke-width="5"`;
- rounded line caps and joins;
- the same per-glyph transform as the corresponding fill node.

The linear export used one stroke/fill pair per coordinate label, while the
circular export used one pair per glyph so the text followed the arc.

This check is intentionally structural rather than a claim that all SVG viewers
render fonts identically. The downloaded SVG should still be inspected in at
least a browser and a vector editor before an implementation PR is proposed.
