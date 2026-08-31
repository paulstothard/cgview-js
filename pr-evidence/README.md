# Upstream pull-request evidence

This directory contains browser-verification screenshots for focused pull requests from this fork to `sciguy/cgview-js`. It lives only on the planning branch so evidence does not add binary files to the code-change branches.

## PR 23: clear hover state on viewer exit

- `circular-hover-visible.png` and `circular-after-leave.png`
- `linear-hover-visible.png` and `linear-after-leave.png`

Each pair shows an active feature hover followed by the pointer outside the viewer, with the transient popover cleared.

## PR 24: wrapped feature clipping

- `circular-panned-upstream.png` reproduces the wrapped/off-center rendering problem.
- `circular-panned-fixed.png` shows the same pan after correcting clipping.
- `canvas-circular-linear-fixed.png` verifies both layouts using Canvas.
- `svg-circular-linear-fixed.png` verifies both layouts through CGView's SVG export path.

