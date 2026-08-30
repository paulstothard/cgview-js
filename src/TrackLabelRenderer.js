//////////////////////////////////////////////////////////////////////////////
// TrackLabelRenderer
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

import Font from './Font';

const ELLIPSIS = '…';
const MIN_ZOOM_FACTOR = 4;
const EDGE_GUTTER = 12;
const MAX_LABEL_WIDTH = 150;
const MIN_TRUNCATED_CHARACTERS = 4;

/**
 * Draw compact feature-track identifiers once the map is zoomed far enough
 * for individual lanes to be read. Public configuration remains on Settings;
 * this class owns only measurement, placement, and painting.
 *
 * Labels are anchored just inside the leading edge of the visible map range.
 * This keeps multiple track identifiers visually aligned and avoids making
 * them look like feature annotations. Tracks split across the backbone receive
 * one identifier on each side; multiple lanes on the same side share one.
 *
 * @private
 */
class TrackLabelRenderer {

  constructor(layout) {
    this.layout = layout;
    this.font = new Font('sans-serif, bold, 10');
    this._measurementCache = new Map();
  }

  get viewer() {
    return this.layout.viewer;
  }

  get canvas() {
    return this.layout.canvas;
  }

  isAtLabelZoom() {
    return this.viewer.zoomFactor >= MIN_ZOOM_FACTOR;
  }

  isVisibleAtCurrentZoom() {
    return this.viewer.settings?.showFeatureTrackLabels && this.isAtLabelZoom();
  }

  _measurementFor(text, ctx) {
    const key = `${this.font.css}\n${text}`;
    let measurement = this._measurementCache.get(key);
    if (!measurement) {
      ctx.font = this.font.css;
      const characters = Array.from(text);
      const widths = characters.map(character => Math.max(1, ctx.measureText(character).width));
      measurement = {
        characters,
        widths,
        totalWidth: widths.reduce((sum, width) => sum + width, 0),
      };
      this._measurementCache.set(key, measurement);
    }
    return measurement;
  }

  _fittedMeasurement(text, ctx) {
    const measurement = this._measurementFor(text, ctx);
    const maximumWidth = Math.min(MAX_LABEL_WIDTH, this.canvas.width * 0.22);
    if (measurement.totalWidth <= maximumWidth) { return measurement; }

    const ellipsisWidth = this._measurementFor(ELLIPSIS, ctx).totalWidth;
    const characters = [];
    const widths = [];
    let totalWidth = ellipsisWidth;
    for (let index = 0; index < measurement.characters.length; index += 1) {
      const width = measurement.widths[index];
      if (totalWidth + width > maximumWidth) { break; }
      characters.push(measurement.characters[index]);
      widths.push(width);
      totalWidth += width;
    }
    if (characters.length < MIN_TRUNCATED_CHARACTERS) { return; }
    characters.push(ELLIPSIS);
    widths.push(ellipsisWidth);
    return {characters, widths, totalWidth};
  }

  _groupsForTrack(track) {
    const groups = new Map();
    for (const slot of track.slots()) {
      if (!slot.visible || !Number.isFinite(slot.thickness) || slot.thickness <= 0) { continue; }
      const key = slot.position;
      let group = groups.get(key);
      if (!group) {
        group = {position: key, slots: [], innerOffset: Infinity, outerOffset: -Infinity};
        groups.set(key, group);
      }
      group.slots.push(slot);
      group.innerOffset = Math.min(group.innerOffset, slot.centerOffset - (slot.thickness / 2));
      group.outerOffset = Math.max(group.outerOffset, slot.centerOffset + (slot.thickness / 2));
    }
    return [...groups.values()].map(group => ({
      ...group,
      centerOffset: (group.innerOffset + group.outerOffset) / 2,
      thickness: group.outerOffset - group.innerOffset,
    }));
  }

  _planForGroup(track, group, ctx) {
    if (group.thickness < this.font.height + 4) { return; }
    if (group.position === 'along' && this.viewer.sequence.isDetailReadable()) { return; }

    const range = this.canvas.visibleRangeForCenterOffset(group.centerOffset, {float: true});
    if (!range || range.isMapLength()) { return; }
    const measurement = this._fittedMeasurement(track.name.trim(), ctx);
    if (!measurement) { return; }

    const pixelsPerBp = this.canvas.pixelsPerBp(group.centerOffset);
    if (!Number.isFinite(pixelsPerBp) || pixelsPerBp <= 0) { return; }
    const requiredWidth = measurement.totalWidth + (EDGE_GUTTER * 2);
    if ((range.length * pixelsPerBp) < requiredWidth) { return; }

    const leadingOffsetBp = (EDGE_GUTTER + (measurement.totalWidth / 2)) / pixelsPerBp;
    const bp = this.viewer.format === 'circular' ?
      this.viewer.sequence.addBp(range.start, leadingOffsetBp) :
      Math.min(range.stop, range.start + leadingOffsetBp);

    return {
      track,
      position: group.position,
      bp,
      centerOffset: group.centerOffset,
      ...measurement,
    };
  }

  plans(ctx = this.canvas.context('foreground')) {
    if (!this.isVisibleAtCurrentZoom()) { return []; }
    const plans = [];
    for (const track of this.viewer.tracks()) {
      const name = typeof track.name === 'string' ? track.name.trim() : '';
      if (!track.visible || track.type !== 'feature' || !name || name === 'Unknown') { continue; }
      for (const group of this._groupsForTrack(track)) {
        const plan = this._planForGroup(track, group, ctx);
        if (plan) { plans.push(plan); }
      }
    }
    return plans;
  }

  _drawLinear(ctx, plan, textColor, haloColor) {
    const point = this.canvas.pointForBp(plan.bp, plan.centerOffset);
    const text = plan.characters.join('');
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.font = this.font.css;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = haloColor;
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = textColor;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  draw() {
    if (!this.isVisibleAtCurrentZoom()) { return; }
    const ctx = this.canvas.context('foreground');
    const plans = this.plans(ctx);
    if (plans.length === 0) { return; }

    const backgroundColor = this.viewer.settings.backgroundColor;
    const textColor = backgroundColor.contrastColor();
    textColor.opacity = 0.78;
    const haloColor = backgroundColor.copy();
    haloColor.opacity = Math.max(0.9, haloColor.opacity);

    for (const plan of plans) {
      if (this.viewer.format === 'circular') {
        this.canvas.drawTextAlongArc({
          layer: 'foreground',
          bp: plan.bp,
          centerOffset: plan.centerOffset,
          characters: plan.characters,
          widths: plan.widths,
          totalWidth: plan.totalWidth,
          font: this.font.css,
          color: textColor.rgbaString,
          haloColor: haloColor.rgbaString,
          haloWidth: 3.5,
        });
      } else {
        this._drawLinear(ctx, plan, textColor.rgbaString, haloColor.rgbaString);
      }
    }
  }
}

export default TrackLabelRenderer;
