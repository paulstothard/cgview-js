//////////////////////////////////////////////////////////////////////////////
// SequenceTranslation
//////////////////////////////////////////////////////////////////////////////

/**
 * CGView.js – Interactive Circular Genome Viewer
 * Copyright © 2016–2026 Jason R. Grant
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import CGObject from './CGObject';
import Color from './Color';
import Font from './Font';
import utils from './Utils';

/**
 * SequenceTranslation draws all six reading frames around the sequence when
 * enough base-pair detail is visible. Direct frames are drawn outside the
 * backbone and reverse frames are drawn inside it. Reading frames restart at
 * each contig boundary.
 *
 * SequenceTranslation is configured through {@link Sequence#translation}.
 *
 * <a name="attributes"></a>
 * ### Attributes
 *
 * Attribute                         | Type    | Description
 * ----------------------------------|---------|------------
 * [font](#font)                     | String  | Amino-acid font [Default: 'monospace, plain, 11']
 * [color](#color)                   | String  | Amino-acid text color [Default: 'black']
 * [backgroundColor](#backgroundColor) | String | Normal codon background color
 * [startColor](#startColor)         | String  | Start-codon background color
 * [startBorderColor](#startBorderColor) | String | Start-codon border color
 * [startTextColor](#startTextColor) | String  | Start-codon amino-acid color
 * [stopColor](#stopColor)           | String  | Stop-codon background color
 * [stopBorderColor](#stopBorderColor) | String | Stop-codon border color
 * [stopTextColor](#stopTextColor)   | String  | Stop-codon amino-acid color
 * [highlightStartCodons](#highlightStartCodons) | Boolean | Highlight starts defined by the active genetic code [Default: true]
 * [highlightStopCodons](#highlightStopCodons) | Boolean | Highlight stops defined by the active genetic code [Default: true]
 * [visible](CGObject.html#visible)  | Boolean | Show six-frame translations at sufficient zoom [Default: false]
 *
 * @extends CGObject
 */
class SequenceTranslation extends CGObject {

  constructor(sequence, options = {}, meta = {}) {
    options = options || {};
    super(sequence.viewer, {...options, visible: utils.defaultFor(options.visible, false)}, meta);
    this._sequence = sequence;
    this._configured = Object.keys(options).length > 0;
    this.font = utils.defaultFor(options.font, 'monospace, plain, 11');
    this.color = utils.defaultFor(options.color, 'black');
    this.backgroundColor = utils.defaultFor(options.backgroundColor, 'rgba(120,120,120,0.14)');
    this.startColor = utils.defaultFor(options.startColor, '#dcfce7');
    this.startBorderColor = utils.defaultFor(options.startBorderColor, '#16a34a');
    this.startTextColor = utils.defaultFor(options.startTextColor, '#166534');
    this.stopColor = utils.defaultFor(options.stopColor, '#fee2e2');
    this.stopBorderColor = utils.defaultFor(options.stopBorderColor, '#b91c1c');
    this.stopTextColor = utils.defaultFor(options.stopTextColor, '#b91c1c');
    this.highlightStartCodons = utils.defaultFor(options.highlightStartCodons, true);
    this.highlightStopCodons = utils.defaultFor(options.highlightStopCodons, true);
    this.laneSpacing = utils.defaultFor(options.laneSpacing, 2);
    this.minimumScale = utils.defaultFor(options.minimumScale, 0.5);

    this.viewer.trigger('sequence-translation-update', { attributes: this.toJSON({includeDefaults: true}) });
  }

  toString() {
    return 'SequenceTranslation';
  }

  get sequence() {
    return this._sequence;
  }

  get visible() {
    return this._visible;
  }

  set visible(value) {
    this._visible = Boolean(value);
    if (this._sequence && this.viewer.backbone && !this.viewer.loading) {
      this.viewer.layout._adjustProportions();
    }
  }

  get font() {
    return this._font;
  }

  set font(value) {
    this._font = value.toString() === 'Font' ? value : new Font(value);
  }

  get color() {
    return this._color;
  }

  set color(value) {
    this._color = value.toString() === 'Color' ? value : new Color(value);
  }

  get backgroundColor() {
    return this._backgroundColor;
  }

  set backgroundColor(value) {
    this._backgroundColor = value.toString() === 'Color' ? value : new Color(value);
  }

  get startColor() {
    return this._startColor;
  }

  set startColor(value) {
    this._startColor = value.toString() === 'Color' ? value : new Color(value);
  }

  get startBorderColor() {
    return this._startBorderColor;
  }

  set startBorderColor(value) {
    this._startBorderColor = value.toString() === 'Color' ? value : new Color(value);
  }

  get startTextColor() {
    return this._startTextColor;
  }

  set startTextColor(value) {
    this._startTextColor = value.toString() === 'Color' ? value : new Color(value);
  }

  get stopColor() {
    return this._stopColor;
  }

  set stopColor(value) {
    this._stopColor = value.toString() === 'Color' ? value : new Color(value);
  }

  get stopBorderColor() {
    return this._stopBorderColor;
  }

  set stopBorderColor(value) {
    this._stopBorderColor = value.toString() === 'Color' ? value : new Color(value);
  }

  get stopTextColor() {
    return this._stopTextColor;
  }

  set stopTextColor(value) {
    this._stopTextColor = value.toString() === 'Color' ? value : new Color(value);
  }

  get highlightStartCodons() {
    return this._highlightStartCodons;
  }

  set highlightStartCodons(value) {
    this._highlightStartCodons = Boolean(value);
  }

  get highlightStopCodons() {
    return this._highlightStopCodons;
  }

  set highlightStopCodons(value) {
    this._highlightStopCodons = Boolean(value);
  }

  get laneHeight() {
    return this.font.height + 4;
  }

  /**
   * Extra backbone thickness required for three lanes on each strand.
   * @private
   */
  get thickness() {
    if (!this.visible || !this.sequence.hasSeq) { return 0; }
    return 6 * (this.laneHeight + this.laneSpacing);
  }

  /**
   * Genetic code used to translate codons. Alias for Viewer.geneticCode.
   */
  get geneticCode() {
    return this.viewer.geneticCode;
  }

  set geneticCode(value) {
    this.viewer.geneticCode = value;
  }

  /**
   * Name of the active genetic code.
   */
  get geneticCodeName() {
    return this.viewer.codonTables.byID(this.geneticCode)?.name;
  }

  scaleFactor(pixelsPerBp) {
    if (!this.visible || !this.sequence.hasSeq) { return 0; }
    const scaleFactor = this.sequence.detailScaleFactor(pixelsPerBp);
    return scaleFactor >= this.minimumScale ? scaleFactor : 0;
  }

  scaledThickness(pixelsPerBp) {
    return this.thickness * this.scaleFactor(pixelsPerBp);
  }

  _splitRange(range) {
    if (range.start <= range.stop) {
      return [[range.start, range.stop]];
    }
    return [[range.start, this.sequence.length], [1, range.stop]];
  }

  _visibleContigSegments(contig, visibleRange) {
    const segments = [];
    const contigStart = contig.mapStart;
    const contigStop = contig.mapStop;
    for (const [visibleStart, visibleStop] of this._splitRange(visibleRange)) {
      const start = Math.max(contigStart, visibleStart);
      const stop = Math.min(contigStop, visibleStop);
      if (start <= stop) {
        segments.push([start - contig.lengthOffset, stop - contig.lengthOffset]);
      }
    }
    return segments;
  }

  /**
   * Return translated codons for one frame overlapping the visible range.
   * Exposed primarily to make the frame anchoring independently testable.
   * @private
   */
  codonsForRange(contig, visibleRange, strand, frame, codonTable) {
    const codons = [];
    const contigLength = contig.length;
    const mapSequence = this.sequence.seq;
    const segments = this._visibleContigSegments(contig, visibleRange);
    const highestStart = strand === 1 ? contigLength - 2 : contigLength - frame - 1;
    const firstFrameStart = strand === 1 ? frame : ((((highestStart - 1) % 3) + 3) % 3) + 1;

    for (const [visibleStart, visibleStop] of segments) {
      const firstStart = firstFrameStart + Math.max(0, Math.ceil((visibleStart - 2 - firstFrameStart) / 3)) * 3;
      for (let localStart = firstStart; localStart <= Math.min(visibleStop, highestStart); localStart += 3) {
        if (localStart < 1 || localStart + 2 > contigLength) { continue; }
        const mapStart = contig.lengthOffset + localStart;
        let codon = mapSequence.substring(mapStart - 1, mapStart + 2).toUpperCase();
        if (strand === -1) {
          codon = this.sequence.constructor.reverseComplement(codon);
        }
        codons.push({
          start: mapStart,
          stop: mapStart + 2,
          middle: mapStart + 1,
          strand,
          frame,
          codon,
          aminoAcid: codonTable.table[codon] || 'X',
          isStart: codonTable.starts.includes(codon),
          isStop: codonTable.stops.includes(codon),
        });
      }
    }
    return codons;
  }

  /**
   * Resolve the normal, start, or stop appearance for a translated codon.
   * Stop styling takes precedence for any unusual table that classifies a
   * codon as both a start and a stop.
   * @private
   */
  _styleForCodon(codon) {
    if (codon.isStop && this.highlightStopCodons) {
      return {backgroundColor: this.stopColor, borderColor: this.stopBorderColor, textColor: this.stopTextColor};
    }
    if (codon.isStart && this.highlightStartCodons) {
      return {backgroundColor: this.startColor, borderColor: this.startBorderColor, textColor: this.startTextColor};
    }
    return {backgroundColor: this.backgroundColor, textColor: this.color};
  }

  _drawCodon(codon, centerOffset, width, scaleFactor) {
    const style = this._styleForCodon(codon);
    this.canvas.drawElement({
      layer: 'map',
      start: codon.start,
      stop: codon.stop,
      centerOffset,
      color: style.backgroundColor.rgbaString,
      width,
      decoration: 'arc',
      showShading: false,
      showBorder: Boolean(style.borderColor),
      borderColor: style.borderColor?.rgbaString,
      minArcLength: 0,
    });

    const ctx = this.canvas.context('map');
    const origin = this.canvas.pointForBp(codon.middle, centerOffset);
    ctx.fillStyle = style.textColor.rgbaString;
    ctx.font = this.font.cssScaled(scaleFactor);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(codon.aminoAcid, origin.x, origin.y + (this.font.height * scaleFactor * 0.35));
  }

  draw(visibleRange, backboneCenterOffset, pixelsPerBp) {
    const scaleFactor = this.scaleFactor(pixelsPerBp);
    if (!scaleFactor || !visibleRange) { return; }

    const codonTable = this.viewer.codonTables.byID(this.geneticCode) || this.viewer.codonTables.byID(11);
    const laneHeight = this.laneHeight * scaleFactor;
    const laneStep = (this.laneHeight + this.laneSpacing) * scaleFactor;
    const sequenceHalfThickness = this.sequence.baseThickness / 2 * scaleFactor;
    const contigs = this.sequence.contigsForMapRange(visibleRange);
    const ctx = this.canvas.context('map');

    ctx.save();
    for (const strand of [1, -1]) {
      const direction = strand;
      for (let frame = 1; frame <= 3; frame++) {
        const centerOffset = backboneCenterOffset + direction * (sequenceHalfThickness + (laneHeight / 2) + this.laneSpacing * scaleFactor + ((frame - 1) * laneStep));
        for (const contig of contigs) {
          const codons = this.codonsForRange(contig, visibleRange, strand, frame, codonTable);
          for (const codon of codons) {
            this._drawCodon(codon, centerOffset, laneHeight, scaleFactor);
          }
        }
      }
    }
    ctx.restore();
  }

  update(attributes) {
    this._configured = true;
    this.viewer.updateRecords(this, attributes, {
      recordClass: 'SequenceTranslation',
      validKeys: [
        'font', 'color', 'backgroundColor',
        'startColor', 'startBorderColor', 'startTextColor',
        'stopColor', 'stopBorderColor', 'stopTextColor',
        'highlightStartCodons', 'highlightStopCodons',
        'laneSpacing', 'minimumScale', 'visible'
      ]
    });
    this.viewer.layout._adjustProportions();
    this.viewer.trigger('sequence-translation-update', { attributes });
  }

  invertColors() {
    this.update({
      color: this.color.invert().rgbaString,
      backgroundColor: this.backgroundColor.invert().rgbaString,
      startColor: this.startColor.invert().rgbaString,
      startBorderColor: this.startBorderColor.invert().rgbaString,
      startTextColor: this.startTextColor.invert().rgbaString,
      stopColor: this.stopColor.invert().rgbaString,
      stopBorderColor: this.stopBorderColor.invert().rgbaString,
      stopTextColor: this.stopTextColor.invert().rgbaString,
    });
  }

  toJSON() {
    return {
      font: this.font.string,
      color: this.color.rgbaString,
      backgroundColor: this.backgroundColor.rgbaString,
      startColor: this.startColor.rgbaString,
      startBorderColor: this.startBorderColor.rgbaString,
      startTextColor: this.startTextColor.rgbaString,
      stopColor: this.stopColor.rgbaString,
      stopBorderColor: this.stopBorderColor.rgbaString,
      stopTextColor: this.stopTextColor.rgbaString,
      highlightStartCodons: this.highlightStartCodons,
      highlightStopCodons: this.highlightStopCodons,
      laneSpacing: this.laneSpacing,
      minimumScale: this.minimumScale,
      visible: this.visible,
    };
  }
}

export default SequenceTranslation;
