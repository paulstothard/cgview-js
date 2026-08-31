# Inline feature-label verification

The evidence page loads the 360 bp deterministic zoom-detail fixture, disables
unrelated translation/direction/track-name presentation, and configures
`annotation.labelPosition` as combined inline placement with external fallback.
The circular and linear screenshots were inspected in the in-app Chromium
browser on 2026-08-30.

## Visual checks

- Circular inline labels follow their feature arcs rather than rotating one
  straight text run.
- Linear inline labels remain straight and centered.
- Names that fit are drawn once inside their feature.
- The deliberately long name on a short feature is rejected by the inline
  fitter and remains available to the external annotation layout.
- Forward and reverse features use the same fitting policy without losing
  arrowhead clearance.
- Text remains readable against blue, green, and orange feature colors.

## Focused automated tests

The shared zoom-detail suite and JSON suite were run as part of:

```sh
npx jest --runInBand \
  test/SequenceTranslation.test.js \
  test/SequenceDetail.test.js \
  test/ZoomDetailOptions.test.js \
  test/IO.test.js
```

Result on 2026-08-30: **4 suites passed, 70 tests passed**. The shared
`ZoomDetailOptions` suite contains 39 tests; its inline/external-label coverage
includes:

- overview placement when a feature already has room;
- bounded shrinking and the configured minimum font size;
- independent, opt-in ellipsis truncation;
- combined-mode external fallback without label duplication;
- circular glyph-by-glyph curved text and straight linear text;
- deterministic collision rejection and `onlyDrawFavorites`;
- explicit colors, general annotation colors, automatic composited contrast,
  and palette inversion;
- no inline placement over readable backbone nucleotide rows;
- Canvas/SVG external-label halo structure and leader-line clipping;
- final Canvas pixel alignment without quantizing SVG coordinates; and
- canonical JSON serialization and old-map external-only defaults.

## Remaining upstream work

The development tests exercise the integrated implementation. A clean upstream
series still needs to separate the core placement/fallback API from circular
arc text and from optional shrinking/truncation/contrast policies. Large-map
label-candidate timing and memory measurements are required. Proksee must be
tested separately to confirm that the optional Annotation properties survive
import, editing, and export.
