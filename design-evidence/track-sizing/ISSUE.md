## Summary

I have been prototyping a stable way for applications to make one feature or
plot track visibly thicker without squeezing neighboring tracks, losing the
choice on zoom, or exposing several interacting layout parameters to users.

The development prototype proves the behavior using existing track ratios plus
serialized map-wide bounds and one batched layout recalculation. I would like
feedback on which part belongs in CGView.js: only the missing low-level sizing
primitive, or also one semantic helper for “resize this track while preserving
the others.”

### Circular comparison

![Circular stable track sizing](https://raw.githubusercontent.com/paulstothard/cgview-js/planning/upstream-contributions/design-evidence/track-sizing/circular.png)

### Linear comparison

![Linear stable track sizing](https://raw.githubusercontent.com/paulstothard/cgview-js/planning/upstream-contributions/design-evidence/track-sizing/linear.png)

The [evidence harness and verification](https://github.com/paulstothard/cgview-js/tree/planning/upstream-contributions/design-evidence/track-sizing) record actual lane widths and serialized JSON for both layouts.

## Motivation

CGView already exposes `track.thicknessRatio`. Updating that value alone
redistributes a fixed amount of map space, so increasing one track makes other
tracks thinner. At close zoom, the internal per-slot ceiling can then prevent
the requested track from continuing to grow. An application trying to present
one intuitive `Track thickness` slider therefore has to understand and
coordinate several layout concepts:

- the selected track's relative ratio;
- total map thickness at overview;
- maximum total map thickness while zooming; and
- the per-slot pixel ceiling.

The user-facing intent is much simpler: “make this selected track about twice
as thick, keep the other tracks visually stable, and preserve the result.”

## Proven invariant

In the controlled evidence map, both tracks begin at 32.5 px. Applying a 2×
scale to the selected plot produces:

- selected plot: 32.5 px → 65.0 px;
- neighboring feature lane: 32.5 px → 32.5 px;
- the same result in circular and linear formats; and
- a serialized plot `thicknessRatio` of 2 plus the adjusted map-wide bounds.

The comparison intentionally uses a plot as the selected track and a feature
as the unaffected neighbor. The same core sizing model applies when the
selection is a feature track.

## Current development model

The prototype adds or hardens four low-level pieces:

1. `track.thicknessRatio` rejects non-positive/non-finite values and updates
   layout without queuing a recentering animation for every slider event.
2. `settings.maxSlotThickness` exposes and serializes the existing internal
   50 px lane ceiling; an omitted setting retains that legacy value.
3. Existing `initialMapThicknessProportion` and
   `maxMapThicknessProportion` setters validate updates and recalculate without
   a transition during direct manipulation.
4. `layout.batchProportionUpdates(callback, options)` coalesces coordinated
   ratio and bound changes into one proportion calculation.

The demonstration slider computes one absolute scale relative to the map as
loaded. When the selected track ratio changes, it increases total available
space by the corresponding ratio-sum change and raises the slot ceiling to the
largest requested track scale. The application displays one slider; users do
not see those implementation parameters.

## API question: primitives or semantic operation?

The smallest upstream contribution would expose/validate
`maxSlotThickness`, add batched proportion updates, and leave the application
to compose them with `thicknessRatio`.

That is flexible, but it repeats subtle ratio-sum math in every application.
An alternative is a public semantic operation, conceptually:

```js
viewer.setTrackThickness(track, scale, {
  preserveOtherTracks: true,
  duration: 0
});
```

The exact name and ownership need design review. It could live on `Viewer`,
`Layout`, or `Track`; it could accept a multiplicative scale, target pixel
width, or normalized thickness. A public helper also needs a precise baseline
and idempotence rule so dragging a slider does not accumulate floating-point
drift.

I do not propose upstreaming the development test page's HTML/CSS as the API.
It is evidence that a one-control UI is possible once the layout invariants are
available.

## Backward compatibility

- Existing JSON without `maxSlotThickness` retains the current 50 px cap.
- Existing `thicknessRatio`, `initialMapThicknessProportion`, and
  `maxMapThicknessProportion` behavior remains unchanged unless an application
  updates them.
- Feature/plot data, coordinates, legends, and rendering geometry are not
  changed by default.
- Invalid new values should be ignored rather than poisoning layout with
  `NaN`, infinity, zero, or a negative thickness.
- Serialization adds the explicit lane cap when defaults are included; the
  rendering of old maps remains the same.

## Zoom behavior

At zoom factor 1, `initialMapThicknessProportion` determines the map's working
space. During zoom, the map grows toward `maxMapThicknessProportion`, while
`maxSlotThickness` prevents a single lane from becoming unreasonably wide.

Independent selected-track scaling must preserve the effective ratio throughout
that interpolation. The cap must remain a safety bound rather than silently
flattening every non-default scale at close zoom. Circular and linear layouts
must use the same model even though their available dimensions differ.

## Interaction and performance

A range input may dispatch many events per second. The implementation should:

- coalesce coordinated settings into one proportion calculation;
- apply at most one scale update and draw per animation frame;
- avoid transition queues during direct manipulation;
- keep the selected track stable if track/slot update events rebuild controls;
- cancel pending frames when a new map loads; and
- perform a final full-quality draw after input settles.

The core library should not depend on a DOM slider. Automated tests can verify
batching directly, while a benchmark should measure repeated scaling on maps
with many tracks and slots in circular and linear formats.

## Suggested PR decomposition

1. **Low-level sizing primitives** — expose/serialize the legacy lane cap,
   validate ratios and proportions, add one documented batch mechanism, and
   include focused circular/linear tests.
2. **Semantic single-track resize helper** — only if the maintainer agrees that
   CGView.js should own neighbor preservation and baseline/idempotence rules.
3. **Test-page demonstration** — optional follow-up or fork-only evidence; do
   not mix its visual styling into the library PR.

## Test plan

- Legacy JSON with no new setting retains the 50 px cap and old rendering.
- Load, update, serialize, and reload every sizing value.
- Reject zero, negative, non-numeric, `NaN`, and infinite values.
- Relative ratios distribute space correctly across unequal lane counts.
- A 2× selected-track operation preserves unrelated lane pixel widths.
- Circular and linear formats at overview, intermediate, and maximum zoom.
- Feature and plot tracks; inside, outside, and around positions.
- Multiple slots per track and hidden tracks/slots.
- Canvas resize and format switching after custom sizing.
- Nested batching, exceptions in the batch callback, and exactly one final
  proportion calculation.
- Repeated slider-equivalent updates without cumulative drift or animation
  queues.
- JSON round trip reproduces the same overview and close-zoom widths.
- Dense-map interaction timing and final-draw timing.

## Proksee integration considerations

Proksee can present one track selector and one `Thickness` control. It should
not expose `initialMapThicknessProportion`, `maxMapThicknessProportion`, or the
lane cap as three independent user concepts. Those values should be preserved
in JSON so reopening or exporting a map retains its appearance.

If only the low-level primitives are accepted, Proksee must implement the
neighbor-preserving ratio-sum calculation and keep an explicit baseline for
each loaded map. If CGView.js accepts a semantic helper, Proksee can call that
operation and remain insulated from layout math. Either approach needs a clear
reset-to-loaded-sizing action.

## Questions

1. Should CGView.js expose only the low-level lane cap and batching primitive,
   or own a semantic single-track resize operation?
2. If a semantic operation is appropriate, should its input be an absolute
   scale, target pixel width, or normalized thickness?
3. Where should baseline/reset state live so repeated slider input is
   idempotent and serializable?
4. Is a global `maxSlotThickness` sufficient, or is a per-track ceiling needed
   for real Proksee maps?
5. Should the demo control remain fork-only unless requested separately?

If the direction is acceptable, I will reconstruct the smallest agreed library
patch from current upstream `main`, without copying the demonstration UI or the
accumulated development commits.
