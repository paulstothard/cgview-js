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

/**
 * Fits and draws feature names inside their rendered feature arcs. This class
 * owns geometry only; public configuration remains on Annotation.
 * @private
 */
class FeatureLabelRenderer {

  constructor(annotation) {
    this.annotation = annotation;
    this._glyphWidthCache = new WeakMap();
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
    const rgb = feature.color.rgb;
    if (!rgb) { return new Color('black'); }
    const luminance = (0.299 * rgb.r) + (0.587 * rgb.g) + (0.114 * rgb.b);
    return new Color(luminance > 150 ? 'rgba(0,0,0,0.86)' : 'rgba(255,255,255,0.96)');
  }

  _fontSizeThatFits(feature, availableWidth, availableHeight) {
    const font = feature.label.font;
    const maximumSize = Math.floor(Math.min(font.size, availableHeight));
    const minimumSize = this.annotation.inlineLabelMinFontSize;
    if (maximumSize < minimumSize || !feature.label.width) { return; }
    const widthLimitedSize = Math.floor(font.size * availableWidth / feature.label.width);
    const size = Math.min(maximumSize, widthLimitedSize);
    return size >= minimumSize ? size : undefined;
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
    if (availableHeight < annotation.inlineLabelMinFontSize) { return; }

    const pixelsPerBp = this.canvas.pixelsPerBp(adjustedCenterOffset);
    const minimumTextWidth = feature.label.width * annotation.inlineLabelMinFontSize / feature.label.font.size;
    const maximumFeatureWidth = (feature.length * pixelsPerBp) - (padding * 2);
    if (maximumFeatureWidth < minimumTextWidth) { return; }

    const segments = this._visibleSegments(feature, visibleRange).sort((a, b) => b.length - a.length);
    for (const segment of segments) {
      let availableWidth = (segment.length * pixelsPerBp) - (padding * 2);
      const arrowTip = feature.isDirect() ? feature.mapStop : feature.mapStart;
      if (feature.decoration === 'arrow' && this._segmentContains(segment, arrowTip)) {
        availableWidth -= adjustedWidth * this.viewer.settings.arrowHeadLength;
      }
      if (availableWidth <= 0) { continue; }
      const fontSize = this._fontSizeThatFits(feature, availableWidth, availableHeight);
      if (fontSize) {
        let bp = segment.start - 0.5 + (segment.length / 2);
        if (bp > this.viewer.sequence.length) {
          bp -= this.viewer.sequence.length;
        }
        return {
          bp,
          centerOffset: adjustedCenterOffset,
          fontSize,
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
    const label = feature.label;
    const font = feature.label.font;
    const cacheKey = `${font.css}\n${feature.name}`;
    let cached = this._glyphWidthCache.get(label);
    if (!cached || cached.key !== cacheKey) {
      ctx.font = font.css;
      const characters = Array.from(feature.name);
      const widths = characters.map(character => Math.max(1, ctx.measureText(character).width));
      cached = {
        key: cacheKey,
        characters,
        widths,
        totalWidth: widths.reduce((sum, width) => sum + width, 0),
      };
      this._glyphWidthCache.set(label, cached);
    }

    let fontSize = metrics.fontSize;
    let scale = fontSize / font.size;
    let totalWidth = cached.totalWidth * scale;
    if (totalWidth > metrics.availableWidth) {
      fontSize = Math.floor(fontSize * metrics.availableWidth / totalWidth);
      if (fontSize < this.annotation.inlineLabelMinFontSize) { return; }
      scale = fontSize / font.size;
      totalWidth = cached.totalWidth * scale;
    }
    if (totalWidth > metrics.availableWidth) { return; }
    ctx.font = font.cssScaled(scale);
    return {characters: cached.characters, widths: cached.widths, totalWidth, scale};
  }

  _drawStraightLabel(ctx, feature, metrics) {
    const point = this.canvas.pointForBp(metrics.bp, metrics.centerOffset);
    const font = feature.label.font;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.font = font.cssScaled(metrics.fontSize / font.size);
    ctx.fillStyle = metrics.color.rgbaString;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(feature.name, 0, metrics.fontSize * 0.35);
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
    if (!this.annotation.drawInlineLabels) { return; }
    const ctx = this.canvas.context('map');
    ctx.save();
    for (const feature of features) {
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
}

export default FeatureLabelRenderer;
