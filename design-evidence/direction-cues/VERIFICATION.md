# Feature-direction cue evidence verification

The evidence page renders the same base-pair window in circular and linear
formats, then serializes each through `cgv.io.getSVG()`.

Verified in the in-app Chromium browser on 2026-08-30:

| Layout | SVG size | Feature-derived cue paths | Chevron subpaths per feature path |
|---|---:|---:|---:|
| Circular | 74,698 characters | 2 | 12 |
| Linear | 50,759 characters | 2 | 12 |

The two paths correspond to the visible forward and reverse feature segments.
Both use `stroke="rgb(21,75,113)"`, the color derived by the prototype from the
blue feature fill. Each complete repeated pattern is batched into one path per
segment rather than one retained object/path per chevron.

The screenshots confirm that the forward tips and reverse tips oppose one
another in both layouts and that the marker gutters remain clear around the
accepted inline label.

This is structural evidence for this controlled map. An implementation PR must
still add automated Canvas/SVG assertions for color, direction, clipping, and
geometry and benchmark a dense large-genome view.
