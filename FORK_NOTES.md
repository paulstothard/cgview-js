# Enhanced CGView.js development fork

This public fork is maintained by Paul Stothard and remains based on Jason
Grant's [CGView.js repository](https://github.com/sciguy/cgview-js). It keeps the
upstream history and Apache 2.0 licensing intact so suitable changes can be
proposed back to the original project through normal pull requests.

The work described here is under active development and is not yet an official
upstream CGView.js release.

## Main improvements

### Base-pair sequence detail

- On-demand six-frame translation in circular and linear views, calculated only
  for the visible region rather than stored for the whole genome.
- Genetic-code selection, contig-aware frame alignment, start/stop highlighting,
  and amino-acid popovers containing codon, position, frame, and code details.
- Optional semantic nucleotide colors and a detailed sequence ruler with curved,
  background-protected coordinate labels.

### Feature labels and direction

- Curved inline labels that follow circular features and straight labels in
  linear maps.
- Inline-only, external-only, and inline-with-external-fallback placement modes.
- Bounded label shrinking and optional truncation, with automatic text contrast
  derived from the rendered feature and background colors.
- Subtle direction chevrons, zoomed feature-track names, and improved label and
  leader-line stability during navigation.

### Map styling and sizing

- A simple per-track thickness control backed by zoom-aware, serialized sizing
  settings for feature and plot tracks.
- Pixel-aware plot contours that reduce dense, staircase-like edges without
  inventing smoothed biological values.
- Refined feature shading, borders, translation-cell spacing, hover highlights,
  and overlay ordering.

### Correctness and performance

- Visible-window translation and deferred high-quality rendering for responsive
  navigation on large genomes.
- Adaptive circular-path tessellation for Safari's large-radius canvas blur.
- Correct wrapped-range clipping, inner translation geometry, hover cleanup, and
  layout-safe translation toggles.
- SVG export coordination that no longer interrupts progressive canvas drawing.

### Compatibility and development support

- New settings round-trip through CGView JSON while older JSON documents retain
  their established rendering defaults.
- An expanded test page exposes the new options and provides focused maps for
  base-pair, SVG, label, sizing, and performance testing.
- The automated test suite covers circular and linear geometry, translation,
  labels, plots, sizing, interaction, JSON compatibility, and export behavior.

## Branch structure

- `main` mirrors the original project's main development line.
- `feature/zoomed-translations-ruler-labels` contains the upstream-compatible
  implementation and is the branch intended for future pull requests.
- `enhanced` contains that implementation plus this fork-specific documentation
  and is the public-facing branch for this fork.

Keeping the fork description on `enhanced` prevents fork-specific wording from
being included accidentally in an upstream pull request.

## Local verification

```bash
npm install
npm run gh-test -- --runInBand
npm run gh-pages
python3 -m http.server 8765 --directory docs
```

Then open <http://localhost:8765/test/index.html>.
