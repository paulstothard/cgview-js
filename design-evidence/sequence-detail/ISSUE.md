## Summary

I have been prototyping an **opt-in base-pair sequence detail mode** for CGView.js. The main addition is six-frame translation that appears only when the map is zoomed far enough for individual bases and codons to be readable.

Before turning this into implementation PRs, I would like to confirm that the data ownership, JSON shape, and proposed decomposition fit CGView.js and downstream Proksee usage.

This proposal deliberately excludes inline feature labels, feature-direction indicators, track sizing, and other visual experiments. Those can be discussed independently.

## What the prototype does

- Draws direct frames **+1 to +3** and reverse frames **-1 to -3** around the nucleotide rows.
- Anchors frames to sequence/contig coordinates so frame identity remains stable while panning.
- Computes codons only for the visible range during drawing; it does not retain whole-genome protein translations or thousands of codon objects.
- Uses a configurable NCBI genetic code (the prototype defaults to table 11).
- Optionally highlights start and stop codons with separate fill, border, and text colors.
- Uses the same model and renderer in circular and linear layouts.
- Adds translation thickness only when the current zoom can display the content legibly.

### Circular prototype

![Circular base-pair sequence detail](https://raw.githubusercontent.com/paulstothard/cgview-js/planning/upstream-contributions/design-evidence/sequence-detail/circular.png)

### Linear prototype

![Linear base-pair sequence detail](https://raw.githubusercontent.com/paulstothard/cgview-js/planning/upstream-contributions/design-evidence/sequence-detail/linear.png)

The small standalone evidence page is available [here](https://github.com/paulstothard/cgview-js/tree/planning/upstream-contributions/design-evidence/sequence-detail). It uses a 360 bp synthetic map so frame placement and start/stop styling can be inspected deterministically.

## Proposed JSON ownership

The prototype keeps the selected genetic code with map settings and keeps rendering options with the sequence:

```json
{
  "settings": {
    "geneticCode": 11
  },
  "sequence": {
    "translation": {
      "visible": true,
      "font": "monospace,bold,10",
      "highlightStartCodons": true,
      "highlightStopCodons": true,
      "startColor": "rgba(224, 250, 235, 1)",
      "startBorderColor": "rgba(20, 184, 83, 1)",
      "startTextColor": "rgba(16, 104, 51, 1)",
      "stopColor": "rgba(255, 235, 235, 1)",
      "stopBorderColor": "rgba(220, 38, 38, 1)",
      "stopTextColor": "rgba(180, 24, 24, 1)",
      "edgePadding": 6,
      "minimumScale": 0.5
    }
  }
}
```

The library default would remain `visible: false`. Existing CGView JSON without either property would render exactly as it does now. Serialization would omit the translation block unless it is configured/visible or defaults are explicitly requested.

I am not attached to these exact property names or ownership boundaries. In particular, I would appreciate guidance on whether `geneticCode` belongs under `settings`, `sequence`, or another model object.

## Performance and memory model

The important constraint is that a large genome must not produce six stored translations.

The prototype uses a streaming visible-range iterator:

1. Determine the visible base range and required frame-aligned codon boundary.
2. Read each visible codon directly from sequence data (reverse complementing on demand for reverse frames).
3. Translate and draw it immediately.
4. Discard the temporary codon/amino-acid values.

Memory use is therefore proportional to the visible range, not genome length. At overview zoom the translation renderer exits before codon work and does not alter layout. Any future amino-acid mouseover should likewise derive one codon from pointer position on demand rather than creating retained hit objects.

## Multi-contig and coordinate behavior

- Reading frames are anchored per contig rather than to the current viewport.
- Translation must not cross a contig boundary.
- Circular-origin wrapping is allowed only for a circular sequence/contig.
- Reverse-frame codon coordinates remain reported in map coordinate order while translation uses the reverse complement.

These rules need dedicated tests because they are easy to get subtly wrong while panning or crossing the origin.

## Suggested PR decomposition

If the direction is acceptable, I suggest small, independently reviewable PRs:

1. **Model and genetic-code foundation** — settings/sequence model, code tables, JSON compatibility and serialization tests; no visible UI change.
2. **Visible-range six-frame renderer** — frame anchoring, circular/linear layout, zoom threshold, and performance tests.
3. **Start/stop presentation** — optional start/stop classification and styling.

Colored DNA bases and amino-acid mouseovers would be separate follow-ups rather than expanding these PRs.

## Test plan

- All six frames on known short sequences.
- Reverse-complement translation and coordinate reporting.
- Frame stability while panning by one or two bases.
- Circular-origin and linear-edge clipping.
- Multi-contig boundaries and contig-relative anchoring.
- At least standard genetic code 1 and bacterial code 11, including alternate starts.
- Toggling translation without stale layout space.
- Existing JSON fixtures with no new properties.
- JSON round trip with translation configured.
- Circular and linear Canvas rendering.
- SVG export parity.
- Large-genome overview and zoom benchmarks demonstrating no whole-genome translation allocation.

## Proksee integration considerations

This CGView.js change alone would not constitute Proksee integration. Proksee would need to decide whether and where to expose controls, and its import/edit/export path would need to preserve the new optional properties. Older CGView JSON must remain valid, and a Proksee deployment using an older CGView.js build should be able to ignore the optional block safely.

I would document the JSON fields and defaults explicitly so downstream validation can be updated deliberately. I am not proposing server-side sequence translation or changes to Proksee's annotation pipeline.

## Known limitations in the prototype

- Translation requires actual sequence data; maps containing only feature coordinates cannot display it.
- The current prototype is a development implementation, not a polished upstream patch series.
- SVG export and very dense visible ranges need explicit performance measurement.
- The initial implementation should not add a Proksee-specific UI dependency to CGView.js.

## Questions

1. Is `sequence.translation` a suitable home for the optional renderer configuration?
2. Where would you prefer the map's genetic-code selection to live?
3. Does keeping the library default off while allowing downstream applications to enable it by default sound right?
4. Would the three-PR split above make review and integration easier, or would you prefer a different boundary?

If the direction fits the project, I will reconstruct the work as clean commits from current `main` rather than asking you to review the development branch's accumulated history.
