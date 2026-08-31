## Summary

I have been prototyping a pixel-aware renderer for dense line plots. The current
renderer emits nearly every score transition as constant-radius segments plus
abrupt radial changes. At overview scale this can produce visually noisy edges,
large SVG paths, and expensive export even though many samples occupy less than
one display pixel.

The settled prototype aggregates only subpixel intervals into stable genomic
bins, draws their weighted means as direct contours, and keeps the established
stepped renderer for plots explicitly using bar geometry. I would like feedback
on the compatibility model and the smallest acceptable renderer abstraction
before reconstructing a pull request from current upstream `main`.

### Circular comparison

![Circular plot-rendering comparison](https://raw.githubusercontent.com/paulstothard/cgview-js/planning/upstream-contributions/design-evidence/plot-rendering/circular.png)

### Linear comparison

![Linear plot-rendering comparison](https://raw.githubusercontent.com/paulstothard/cgview-js/planning/upstream-contributions/design-evidence/plot-rendering/linear.png)

The [reproduction harness, SVG observations, and focused test summary](https://github.com/paulstothard/cgview-js/tree/planning/upstream-contributions/design-evidence/plot-rendering) use the same 69,034 bp sequence-derived plots for pristine upstream and the development prototype.

## Motivation

CGView plot positions describe genomic intervals where scores change. Drawing
every interval is appropriate when individual transitions are visible, but at
overview scale thousands of intervals may map into one pixel. The current path
still serializes those transitions, producing three related problems:

1. **Visual noise** — many short horizontal arcs and radial jumps form a hairy
   or staircase-like boundary instead of a readable large-scale contour.
2. **Pan shimmer** — viewport-dependent stepping can make fine edges appear to
   vibrate as the map moves.
3. **Output cost** — Canvas and especially SVG process geometry that cannot be
   distinguished at the target resolution.

This proposal is display-level aggregation. It must not alter the stored plot
positions/scores, imply smoothed biological measurements, or destroy detail
when the user zooms far enough to resolve individual intervals.

## Settled rendering model

### 1. Screen-aware, genome-anchored bins

At the plot radius, convert pixels per base pair into bases per pixel. If more
than one base pair maps into a pixel, choose a power-of-two genomic bin size no
wider than one screen pixel. Fast interaction draws may use the next coarser
power of two.

Bins are anchored to absolute genome coordinates, not the visible range start.
Internal samples therefore remain stable while panning and do not rephase at
every viewport edge.

### 2. Genomic-overlap weighted means

Plot samples represent intervals of unequal genomic duration. Each bin mean is
weighted by interval overlap rather than by the number of array entries. A
single streaming cursor advances through visible scores, avoiding a binary
search for every bin.

### 3. Direct filled contours

Map each bin mean directly to its radial/linear coordinate. Positive and
negative regions are split at interpolated baseline crossings, filled back to
the baseline, and optionally outlined with one subtle color-derived 0.65 px
stroke using rounded joins and caps.

The renderer uses CGView's existing Canvas path abstraction so the same
geometry reaches circular Canvas, linear Canvas, and SVG output.

### 4. Preserve explicit bar plots

Plots explicitly requesting bar/step semantics retain the established renderer.
Pixel-aware mean contours are intended for continuous line/signal plots, not
for categorical bars where every interval boundary is meaningful.

## Superseded extrema envelope

An intermediate prototype attempted to preserve every per-bin minimum and
maximum as a faint envelope behind the mean. Real SVG inspection showed that it
created long translucent spikes and misleading triangular artifacts, especially
around isolated extremes and baseline changes.

That envelope was removed completely. It must not be included in an upstream
patch. The source plot data remains available for exact inspection, and zooming
reduces the bin size until individual intervals are drawn.

## Controlled SVG observations

On the evidence map, a single SVG serialization in the in-app Chromium browser
produced:

| Layout | Current upstream | Settled prototype |
|---|---:|---:|
| Circular size | 16.2 MB / 414,357 line commands | 304 KB / 6,808 line commands |
| Circular time | about 98.2 s | about 61 ms |
| Linear size | 14.8 MB / 414,354 line commands | 123 KB / 2,453 line commands |
| Linear time | about 87.2 s | about 33 ms |

These are controlled observations rather than a formal benchmark suite. A PR
should add repeatable measurements on several sequence lengths, resolutions,
zoom factors, and devices and should record peak memory as well as elapsed time.

## Compatibility and proposed API

The development prototype adds a plot rendering `type` with `line` using the
new contour renderer and `bar` retaining the established stepped geometry.
Making `line` the default changes the appearance of existing JSON that omits a
type, even though its data and axis values remain unchanged.

Two compatibility approaches seem reasonable:

1. **Opt-in first:** add a value such as `renderStyle: "screen-contour"` while
   leaving omitted/legacy plots on the current stepped renderer. Applications
   such as Proksee can opt in and a future major version can revisit the default.
2. **Semantic type default:** define omitted/`line` plots as continuous signals
   and render them with pixel-aware contours; require `bar`/`step` for exact
   interval steps. This is simpler but intentionally changes existing output.

I lean toward opt-in for the first upstream contribution unless the maintainer
considers the current output an implementation detail rather than a stable
visual contract. The final property name should fit the existing Plot API and
avoid conflating data interpolation with presentation.

## Numeric and geometric invariants

- Bin boundaries are stable in genome coordinates while panning.
- No aggregation occurs when one or more pixels represent each base pair.
- Means use genomic overlap, not sample count.
- Positive and negative fills meet exactly at an interpolated baseline crossing.
- Circular-origin wrapping preserves contour order and does not duplicate a
  boundary sample.
- Invalid/non-finite scores fall back to the baseline rather than producing
  invalid geometry.
- Axis mapping uses `axisMin`, `axisMax`, and `baseline` consistently.
- Fast output uses coarser mean fill and omits the contour stroke.
- Full output has one mean fill plus at most one contour stroke per color region.
- No extrema-envelope path is emitted.

## Performance and memory

The target cost is proportional to visible screen width (plus the visible score
scan), not to the number of subpixel path transitions. The implementation should
allocate only visible-bin summaries and active contour segments; it should not
materialize a translated or smoothed copy of the full plot.

The score scan should be linear over the visible interval with a small number of
index lookups. Fast draws should use bins twice as coarse and omit the boundary
stroke. Final draws restore the full one-pixel resolution.

## Suggested PR decomposition

1. **Renderer foundation** — private `PlotRenderer`, stable binning, weighted
   streaming summaries, direct fill geometry, baseline crossings, wrapped-range
   tests, and no change to default output.
2. **Public opt-in and bar compatibility** — agreed Plot JSON property,
   serialization/docs, explicit legacy/bar dispatch, circular/linear and SVG
   fixtures.
3. **Interaction scheduling** — only if benchmarks show the separate deferred
   full-quality Viewer changes are necessary; do not mix them into the renderer
   PR by default.

## Test plan

- Power-of-two bin selection across pixels-per-bp values and device-pixel ratios.
- Genomic-overlap means for unequal sample intervals.
- Stable internal bins under one-pixel and subpixel panning.
- Circular-origin wrapping, first/last positions, and sparse leading data.
- Baseline crossings for positive-to-negative and negative-to-positive segments.
- Non-zero baselines and asymmetric axis ranges.
- One-color and separate positive/negative colors.
- Empty, singleton, sparse, dense, invalid, and partially visible plots.
- Circular and linear Canvas path structure.
- SVG structure, size, paint order, and absence of envelope artifacts.
- Explicit bar/step plots retain established geometry.
- At base-pair zoom, bin size becomes 1 and individual intervals remain visible.
- Fast versus full rendering and cancellation during repeated interaction.
- Large-map runtime, peak memory, and exported SVG size over several resolutions.
- Visual regression fixtures using real GC Content and GC Skew plots.

## Proksee integration considerations

Proksee must preserve the agreed rendering property during JSON round trips and
should not modify the underlying plot positions or scores. If the first release
is opt-in, Proksee could enable `Pixel-aware line contours` for continuous GC or
coverage signals while retaining step/bar mode for interval-valued plots.

The editor should describe this as a rendering choice, not data smoothing.
Exports must reproduce the selected mode, and Proksee should provide a simple
migration/default policy for maps created before the property exists.

## Questions

1. Should the first contribution be opt-in, or may continuous/line plots adopt
   the pixel-aware renderer by default?
2. Does `type`, `renderStyle`, or another existing Plot concept best distinguish
   continuous contours from bars/steps?
3. Is one subtle contour stroke desirable, or should fill-only remain the
   default with stroke as a separate style option?
4. Should interaction scheduling remain a separate performance PR?
5. Are there upstream plot fixtures or Proksee map types whose exact stepped
   appearance must be preserved?

If the direction is acceptable, I will reconstruct the smallest agreed patch
from current upstream `main`, excluding both the superseded extrema envelope
and unrelated Viewer/test-page changes.
