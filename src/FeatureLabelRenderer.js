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

  _fontSizeThatFits(feature, availableWidth, availableHeight, ctx) {
    const font = feature.label.font;
    const maximumSize = Math.floor(Math.min(font.size, availableHeight));
    const minimumSize = this.annotation.inlineLabelMinFontSize;
    for (let size = maximumSize; size >= minimumSize; size--) {
      ctx.font = font.cssScaled(size / font.size);
      if (ctx.measureText(feature.name).width <= availableWidth) {
        return size;
      }
    }
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
    const segments = this._visibleSegments(feature, visibleRange).sort((a, b) => b.length - a.length);
    const ctx = this.canvas.context('map');
    for (const segment of segments) {
      let availableWidth = (segment.length * pixelsPerBp) - (padding * 2);
      const arrowTip = feature.isDirect() ? feature.mapStop : feature.mapStart;
      if (feature.decoration === 'arrow' && this._segmentContains(segment, arrowTip)) {
        availableWidth -= adjustedWidth * this.viewer.settings.arrowHeadLength;
      }
      if (availableWidth <= 0) { continue; }
      const fontSize = this._fontSizeThatFits(feature, availableWidth, availableHeight, ctx);
      if (fontSize) {
        let bp = segment.start - 0.5 + (segment.length / 2);
        if (bp > this.viewer.sequence.length) {
          bp -= this.viewer.sequence.length;
        }
        return {
          bp,
          centerOffset: adjustedCenterOffset,
          fontSize,
          color: this._labelColor(feature),
        };
      }
    }
  }

  _tangentAngle(bp) {
    if (this.viewer.format !== 'circular') { return 0; }
    let angle = this.viewer.scale.bp(bp) + (Math.PI / 2);
    while (angle > Math.PI) { angle -= Math.PI * 2; }
    while (angle <= -Math.PI) { angle += Math.PI * 2; }
    if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
      angle += Math.PI;
    }
    return angle;
  }

  draw(features, centerOffset, slotThickness, visibleRange) {
    if (!this.annotation.drawInlineLabels) { return; }
    const ctx = this.canvas.context('map');
    ctx.save();
    for (const feature of features) {
      const metrics = this.metricsFor(feature, centerOffset, slotThickness, visibleRange);
      if (!metrics) { continue; }
      const point = this.canvas.pointForBp(metrics.bp, metrics.centerOffset);
      const font = feature.label.font;
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(this._tangentAngle(metrics.bp));
      ctx.font = font.cssScaled(metrics.fontSize / font.size);
      ctx.fillStyle = metrics.color.rgbaString;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(feature.name, 0, metrics.fontSize * 0.35);
      ctx.restore();
    }
    ctx.restore();
  }
}

export default FeatureLabelRenderer;
