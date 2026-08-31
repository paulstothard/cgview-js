# Base-pair sequence-detail verification

The evidence page uses the 360 bp deterministic zoom-detail fixture and the
public development build. The circular and linear screenshots were inspected
in the in-app Chromium browser on 2026-08-30.

## Visual checks

- All six translation lanes are present: direct frames +1 through +3 outside
  the sequence rows and reverse frames -1 through -3 inside them.
- The nucleotide rows remain centered and readable in both layouts.
- Start and stop cells stay inside their lane geometry and retain clear glyph
  padding.
- The circular renderer follows the map arc; the linear renderer uses the same
  biological frame ordering without circular transforms.
- Forward and reverse feature tracks remain outside the translation band and
  do not overlap its glyphs.

## Focused automated tests

The following command passes from the development branch:

```sh
npx jest --runInBand \
  test/SequenceTranslation.test.js \
  test/SequenceDetail.test.js \
  test/ZoomDetailOptions.test.js \
  test/IO.test.js
```

Result on 2026-08-30: **4 suites passed, 70 tests passed**.

The focused coverage includes:

- opt-in/default-off behavior and JSON omission for legacy maps;
- genetic-code selection and table-aware start/stop classification;
- all direct and reverse frames, contig anchoring, and circular-origin ranges;
- streaming codon iteration rather than retained whole-genome translations;
- exact lane, highlight, edge-padding, and backbone-thickness geometry;
- minimum readable scale and zero overview-layout contribution;
- circular and linear placement;
- style-only versus layout-affecting updates;
- DNA semantic-color opt-in and serialization; and
- round trips of optional translation settings through CGView JSON.

## Remaining upstream work

These results verify the integrated prototype, not a clean upstream patch.
Before an implementation PR, the model/genetic-code foundation must be
reconstructed from current upstream `main`, with the renderer and start/stop
presentation split as described in `ISSUE.md`. Large-map CPU/allocation
measurements and native Safari verification remain required. Proksee JSON
round-trip behavior has not been tested and must not be claimed yet.
