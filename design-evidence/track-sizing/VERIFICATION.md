# Stable track-sizing evidence verification

The evidence page renders the same feature and plot tracks before and after a
2× scale request for the plot track. It performs the coordinated layout update
used by the development prototype, serializes both maps through
`cgv.io.getSVG()`, and records the resulting CGView JSON.

Verified in the in-app Chromium browser on 2026-08-30:

| Layout | Feature before | Feature after | Plot before | Plot after | SVG before | SVG after |
|---|---:|---:|---:|---:|---:|---:|
| Circular | 32.5 px | 32.5 px | 32.5 px | 65.0 px | 131,505 chars | 131,451 chars |
| Linear | 32.5 px | 32.5 px | 32.5 px | 65.0 px | 82,342 chars | 81,358 chars |

The selected plot's serialized `thicknessRatio` changes from 1 to 2. The
coordinated map settings serialize as:

```json
{
  "initialMapThicknessProportion": 0.195,
  "maxMapThicknessProportion": 0.825,
  "maxSlotThickness": 108
}
```

Those values are the result of scaling the controlled map's initial settings;
they are not proposed universal defaults. The screenshots and measurements
demonstrate the invariant that motivated the UI: increasing the selected lane
does not steal width from an unrelated neighboring lane.

Focused automated verification on the development branch also passed all 10
tests in `test/TrackSizing.test.js`. The suite covers legacy defaults, JSON
round trips, invalid values, relative distribution, map-wide space, batched
updates, neighbor preservation, zoom-time caps, and circular/linear parity.

An upstream implementation still needs benchmarks for repeated interactive
updates on many-track maps and agreement on whether the semantic “resize one
track without squeezing others” operation belongs in CGView.js or remains an
application-level composition of lower-level settings.
