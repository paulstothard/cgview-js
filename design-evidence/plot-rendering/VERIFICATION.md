# Pixel-aware plot-rendering evidence verification

The evidence harness loads the same 69,034 bp mitochondrial sequence and uses
CGView's sequence-derived GC Content and GC Skew tracks. It renders each map at
535 × 500 px from pristine upstream `75afe9a` and the settled development
prototype, in circular and linear formats.

## Visual verification

The circular and linear comparison screenshots were inspected in the in-app
Chromium browser on 2026-08-30. The settled renderer retains the larger signal
shape and baseline crossings while suppressing high-frequency transitions that
cannot be resolved at the displayed scale. No min/max extrema envelope is
drawn; that intermediate experiment is explicitly superseded.

## SVG observations

Each implementation was serialized through `cgv.io.getSVG()` in the same
browser and viewport. These are single controlled observations, not formal
multi-run benchmarks:

| Layout | Implementation | SVG size | Line commands | Serialization time |
|---|---|---:|---:|---:|
| Circular | Upstream `75afe9a` | 16,198,610 chars | 414,357 | 98,223 ms |
| Circular | Settled prototype | 303,643 chars | 6,808 | 61 ms |
| Linear | Upstream `75afe9a` | 14,768,687 chars | 414,354 | 87,193 ms |
| Linear | Settled prototype | 123,025 chars | 2,453 | 33 ms |

The path-element counts remain similar because both renderers use a small
number of logical plot regions; the large difference is the geometry stored
inside those paths. The settled renderer reduces line commands by about 61× in
circular output and 169× in linear output for this map.

The development branch's focused `test/Plot.test.js` suite passes all 11 tests.
It verifies genome-anchored power-of-two bins, genomic-overlap weighting,
streaming lookup, pan stability, circular-origin ordering, interpolated baseline
crossings, positive/negative region closure, bounded circular/linear contours,
cheaper fast draws, and explicit bar-plot compatibility.

An implementation pull request still needs repeatable command-line/browser
benchmarks over several map sizes, peak-memory measurements, pixel-difference
or structural SVG fixtures, and review of the compatibility default for plots
that do not currently declare a rendering type.
