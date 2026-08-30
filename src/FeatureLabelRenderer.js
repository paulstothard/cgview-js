//////////////////////////////////////////////////////////////////////////////
// FeatureLabelRenderer
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

import Color from './Color';

const ELLIPSIS = '…';
const MIN_TRUNCATED_CHARACTERS = 3;
const OPAQUE_WHITE = new Color('white');
const MAX_COLOR_CACHE_SIZE = 128;

/**
 * Fits and draws feature names inside their rendered feature arcs. This class
 * owns geometry only; public configuration remains on Annotation.
 * @private
 */
class FeatureLabelRenderer {

  constructor(annotation) {
    this.annotation = annotation;
    this._glyphWidthCache = new WeakMap();
    this._automaticColorCache = new Map();
  }

  get viewer() {
    return this.annotation.viewer;
  }

  get canvas() {
    return this.annotation.canvas;
  }

  _splitRange(start, stop) {
    if (start <= stop) {
      return [[start, stop]];
    }
    return [[start, this.viewer.sequence.length], [1, stop]];
  }

  _featureRanges(feature) {
    if (!feature.hasLocations) {
      return this._splitRange(feature.mapStart, feature.mapStop);
    }
    const ranges = [];
    for (const location of feature.locations) {
      const start = location[0] + feature.contig.lengthOffset;
      const stop = location[1] + feature.contig.lengthOffset;
      ranges.push(...this._splitRange(start, stop));
    }
    return ranges;
  }

  _visibleSegments(feature, visibleRange) {
    const segments = [];
    const visibleSegments = this._splitRange(visibleRange.start, visibleRange.stop);
    for (const [featureStart, featureStop] of this._featureRanges(feature)) {
      for (const [visibleStart, visibleStop] of visibleSegments) {
        const start = Math.max(featureStart, visibleStart);
        const stop = Math.min(featureStop, visibleStop);
        if (start <= stop) {
          segments.push({start, stop, length: stop - start + 1});
        }
      }
    }
    if (!feature.hasLocations && feature.mapStart > feature.mapStop) {
      const firstSegment = segments.find(segment => segment.start === 1);
      const lastSegment = segments.find(segment => segment.stop === this.viewer.sequence.length);
      if (firstSegment && lastSegment && firstSegment !== lastSegment) {
        const mergedSegment = {
          start: lastSegment.start,
          stop: firstSegment.stop,
          length: lastSegment.length + firstSegment.length,
          wrapped: true,
        };
        return segments.filter(segment => segment !== firstSegment && segment !== lastSegment).concat(mergedSegment);
      }
    }
    return segments;
  }

  _segmentContains(segment, bp) {
    return segment.wrapped ? (bp >= segment.start || bp <= segment.stop) : (bp >= segment.start && bp <= segment.stop);
  }

  _labelColor(feature) {
    if (this.annotation.inlineLabelColor) {
      return this.annotation.inlineLabelColor;
    }
    if (this.annotation.color) {
      return this.annotation.color;
    }

    // Feature colors can be translucent, so choose text against the color that
    // is actually visible after the feature is composited over the map.
    const featureColor = feature.color;
    const backgroundColor = this.viewer.settings.backgroundColor;
    const cacheKey = `${featureColor.rgbaString}\n${backgroundColor.rgbaString}`;
    let color = this._automaticColorCache.get(cacheKey);
    if (!color) {
      const renderedColor = featureColor.compositeOver(backgroundColor).compositeOver(OPAQUE_WHITE);
      color = renderedColor.contrastColor();
      if (this._automaticColorCache.size >= MAX_COLOR_CACHE_SIZE) {
        this._automaticColorCache.clear();
      }
      this._automaticColorCache.set(cacheKey, color);
    }
    return color;
  }

  _measurementFor(feature) {
    const ctx = this.canvas.context('map');
    const label = feature.label;
    const font = feature.label.font;
    const cacheKey = `${font.css}\n${feature.name}`;
    let cached = this._glyphWidthCache.get(label);
    if (!cached || cached.key !== cacheKey) {
      ctx.font = font.css;
      const characters = Array.from(feature.name);
      const widths = characters.map(character => Math.max(1, ctx.measureText(character).width));
      const prefixWidths = [0];
      for (const width of widths) {
        prefixWidths.push(prefixWidths[prefixWidths.length - 1] + width);
      }
      cached = {
        key: cacheKey,
        characters,
        widths,
        prefixWidths,
        curvedWidth: prefixWidths[prefixWidths.length - 1],
        linearWidth: label.width || ctx.measureText(feature.name).width,
        ellipsisWidth: Math.max(1, ctx.measureText(ELLIPSIS).width),
      };
      this._glyphWidthCache.set(label, cached);
    }
    return cached;
  }

  _fullBaseWidth(measurement) {
    return this.viewer.format === 'circular' ? measurement.curvedWidth : measurement.linearWidth;
  }

  _minimumBaseWidth(measurement) {
    const fullWidth = this._fullBaseWidth(measurement);
    if (!this.annotation.inlineLabelAllowTruncation || measurement.characters.length <= MIN_TRUNCATED_CHARACTERS) {
      return fullWidth;
    }
    const truncatedWidth = measurement.prefixWidths[MIN_TRUNCATED_CHARACTERS] + measurement.ellipsisWidth;
    return Math.min(fullWidth, truncatedWidth);
  }

  _textPlan(feature, availableWidth, availableHeight, measurement) {
    const annotation = this.annotation;
    const font = feature.label.font;
    const allowShrinking = annotation.inlineLabelAllowShrinking;
    const naturalSize = font.size;
    const maximumSize = allowShrinking ? Math.floor(Math.min(naturalSize, availableHeight)) : naturalSize;
    const minimumSize = allowShrinking ? Math.min(naturalSize, annotation.inlineLabelMinFontSize) : naturalSize;
    if (maximumSize < minimumSize || (!allowShrinking && availableHeight < naturalSize)) { return; }

    const fullBaseWidth = this._fullBaseWidth(measurement);
    const maximumScale = maximumSize / naturalSize;
    if ((fullBaseWidth * maximumScale) <= availableWidth) {
      return {
        text: feature.name,
        fontSize: maximumSize,
        characters: measurement.characters,
        widths: measurement.widths,
      };
    }

    if (allowShrinking) {
      const fittedSize = Math.min(maximumSize, Math.floor(naturalSize * availableWidth / fullBaseWidth));
      if (fittedSize >= minimumSize) {
        return {
          text: feature.name,
          fontSize: fittedSize,
          characters: measurement.characters,
          widths: measurement.widths,
        };
      }
    }

    if (!annotation.inlineLabelAllowTruncation || measurement.characters.length <= MIN_TRUNCATED_CHARACTERS) { return; }
    const fontSize = allowShrinking ? minimumSize : naturalSize;
    const maximumBaseWidth = availableWidth * naturalSize / fontSize;
    let characterCount = measurement.characters.length - 1;
    while (characterCount >= MIN_TRUNCATED_CHARACTERS &&
      (measurement.prefixWidths[characterCount] + measurement.ellipsisWidth) > maximumBaseWidth) {
      characterCount -= 1;
    }
    if (characterCount < MIN_TRUNCATED_CHARACTERS) { return; }
    return {
      text: `${measurement.characters.slice(0, characterCount).join('')}${ELLIPSIS}`,
      fontSize,
      characters: measurement.characters.slice(0, characterCount).concat(ELLIPSIS),
      widths: measurement.widths.slice(0, characterCount).concat(measurement.ellipsisWidth),
      truncated: true,
    };
  }

  metricsFor(feature, centerOffset, slotThickness, visibleRange) {
    const annotation = this.annotation;
    if (!feature.name || !feature.visible || !visibleRange) { return; }
    if (this.viewer.zoomFactor < annotation.inlineLabelMinZoomFactor) { return; }
    if (annotation.onlyDrawFavorites && !feature.favorite) { return; }

    const adjustedCenterOffset = feature.adjustedCenterOffset(centerOffset, slotThickness);
    const adjustedWidth = feature.adjustedWidth(slotThickness);
    const padding = annotation.inlineLabelPadding;
    const availableHeight = adjustedWidth - (padding * 2);
    const font = feature.label.font;
    const minimumFontSize = annotation.inlineLabelAllowShrinking ? Math.min(font.size, annotation.inlineLabelMinFontSize) : font.size;
    if (availableHeight < minimumFontSize) { return; }

    const pixelsPerBp = this.canvas.pixelsPerBp(adjustedCenterOffset);
    let measurement;
    let minimumBaseWidth = feature.label.width;
    if (annotation.inlineLabelAllowTruncation) {
      measurement = this._measurementFor(feature);
      minimumBaseWidth = this._minimumBaseWidth(measurement);
    }
    const minimumTextWidth = minimumBaseWidth * minimumFontSize / font.size;
    const maximumFeatureWidth = (feature.length * pixelsPerBp) - (padding * 2);
    if (maximumFeatureWidth < minimumTextWidth) { return; }

    measurement ||= this._measurementFor(feature);
    const segments = this._visibleSegments(feature, visibleRange).sort((a, b) => b.length - a.length);
    for (const segment of segments) {
      let availableWidth = (segment.length * pixelsPerBp) - (padding * 2);
      const arrowTip = feature.isDirect() ? feature.mapStop : feature.mapStart;
      if (feature.decoration === 'arrow' && this._segmentContains(segment, arrowTip)) {
        availableWidth -= adjustedWidth * this.viewer.settings.arrowHeadLength;
      }
      if (availableWidth <= 0) { continue; }
      const textPlan = this._textPlan(feature, availableWidth, availableHeight, measurement);
      if (textPlan) {
        let bp = segment.start - 0.5 + (segment.length / 2);
        if (bp > this.viewer.sequence.length) {
          bp -= this.viewer.sequence.length;
        }
        return {
          bp,
          centerOffset: adjustedCenterOffset,
          ...textPlan,
          availableWidth,
          pixelsPerBp,
          color: this._labelColor(feature),
        };
      }
    }
  }

  _arcIsUpsideDown(bp) {
    const tau = Math.PI * 2;
    let angle = this.viewer.scale.bp(bp) % tau;
    if (angle < 0) { angle += tau; }
    return angle > 0 && angle < Math.PI;
  }

  _glyphPlan(ctx, feature, metrics) {
    const font = feature.label.font;
    const scale = metrics.fontSize / font.size;
    const totalWidth = metrics.widths.reduce((sum, width) => sum + width, 0) * scale;
    if (totalWidth > (metrics.availableWidth + 0.01)) { return; }
    ctx.font = font.cssScaled(scale);
    return {characters: metrics.characters, widths: metrics.widths, totalWidth, scale};
  }

  _drawStraightLabel(ctx, feature, metrics) {
    const point = this.canvas.pointForBp(metrics.bp, metrics.centerOffset);
    const font = feature.label.font;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.font = font.cssScaled(metrics.fontSize / font.size);
    ctx.fillStyle = metrics.color.rgbaString;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(metrics.text, 0, 0);
    ctx.restore();
  }

  _drawCurvedLabel(ctx, feature, metrics) {
    const plan = this._glyphPlan(ctx, feature, metrics);
    if (!plan) { return; }
    const flipped = this._arcIsUpsideDown(metrics.bp);
    const direction = flipped ? -1 : 1;
    let cursor = -plan.totalWidth / 2;

    ctx.fillStyle = metrics.color.rgbaString;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let index = 0; index < plan.characters.length; index += 1) {
      const width = plan.widths[index] * plan.scale;
      const pixelOffset = cursor + (width / 2);
      const glyphBp = metrics.bp + (direction * pixelOffset / metrics.pixelsPerBp);
      const point = this.canvas.pointForBp(glyphBp, metrics.centerOffset);
      const angle = this.viewer.scale.bp(glyphBp) + (Math.PI / 2) + (flipped ? Math.PI : 0);
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(angle);
      ctx.fillText(plan.characters[index], 0, 0);
      ctx.restore();
      cursor += width;
    }
  }

  draw(features, centerOffset, slotThickness, visibleRange) {
    if (!['inline', 'both'].includes(this.annotation.labelPosition)) { return; }
    const ctx = this.canvas.context('map');
    ctx.save();
    for (const feature of features) {
      if (this.annotation.onlyDrawFavorites && !feature.favorite) { continue; }
      const metrics = this.metricsFor(feature, centerOffset, slotThickness, visibleRange);
      if (!metrics) { continue; }
      if (this.viewer.format === 'circular') {
        this._drawCurvedLabel(ctx, feature, metrics);
      } else {
        this._drawStraightLabel(ctx, feature, metrics);
      }
    }
    ctx.restore();
  }

  /**
   * Return true when a feature will receive an inline label in any visible
   * slot. Used to make external labels fallbacks instead of duplicates.
   * @private
   */
  willDrawFeature(feature) {
    if (!['inline', 'both'].includes(this.annotation.labelPosition)) { return false; }
    if (this.annotation.onlyDrawFavorites && !feature.favorite) { return false; }
    for (const slot of feature.slots()) {
      if (!slot.visible || !slot.track.visible || slot.thickness <= 0) { continue; }
      const visibleRange = this.canvas.visibleRangeForCenterOffset(slot.centerOffset, {margin: slot.thickness});
      if (this.metricsFor(feature, slot.centerOffset, slot.thickness, visibleRange)) {
        return true;
      }
    }
    return false;
  }
}

export default FeatureLabelRenderer;
