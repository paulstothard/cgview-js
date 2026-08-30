import Viewer from '../src/Viewer';
import CGRange from '../src/CGRange';
import fs from 'fs';
import path from 'path';

describe('Zoom detail options', () => {

  beforeEach(() => {
    document.body.innerHTML = '<div id="map"></div>';
  });

  test('serializes and updates the outer tangential ruler configuration', () => {
    const cgv = new Viewer('#map', {
      ruler: {labelPosition: 'outer', labelStyle: 'tangential'},
    });

    expect(cgv.ruler.labelPosition).toBe('outer');
    expect(cgv.ruler.labelStyle).toBe('tangential');

    cgv.ruler.update({labelPosition: 'both', tickLength: 7});
    const json = cgv.ruler.toJSON();
    expect(json.labelPosition).toBe('both');
    expect(json.labelStyle).toBe('tangential');
    expect(json.tickLength).toBe(7);
  });

  test('keeps the legacy ruler label behavior by default', () => {
    const cgv = new Viewer('#map');
    expect(cgv.ruler.labelPosition).toBe('inner');
    expect(cgv.ruler.labelStyle).toBe('default');
  });

  test('fits inline labels by shrinking to the configured floor', () => {
    const cgv = new Viewer('#map', {
      sequence: {length: 1000},
      annotation: {
        font: 'sans-serif, plain, 16',
        labelPosition: 'inline',
        inlineLabelMinZoomFactor: 2,
        inlineLabelMinFontSize: 8,
      },
      features: [{name: 'moderately long label', source: 'test', start: 100, stop: 300, legend: 'Feature'}],
    });
    const feature = cgv.features(1);
    const visibleRange = new CGRange(cgv.sequence.mapContig, 1, 400);
    cgv._zoomFactor = 10;
    jest.spyOn(cgv.canvas, 'pixelsPerBp').mockReturnValue(0.8);

    const metrics = cgv.annotation._featureLabelRenderer.metricsFor(feature, cgv.backbone.adjustedCenterOffset, 20, visibleRange);
    expect(metrics).toBeDefined();
    expect(metrics.fontSize).toBeGreaterThanOrEqual(8);
    expect(metrics.fontSize).toBeLessThanOrEqual(16);
  });

  test('shows inline labels at overview zoom when the feature has enough space', () => {
    const cgv = new Viewer('#map', {
      sequence: {length: 1000},
      annotation: {
        font: 'sans-serif, plain, 14',
        labelPosition: 'inline',
        inlineLabelMinFontSize: 8,
      },
      features: [{name: 'overview label', source: 'test', start: 100, stop: 500, legend: 'Feature'}],
    });
    const feature = cgv.features(1);
    const visibleRange = new CGRange(cgv.sequence.mapContig, 1, 1000);
    cgv._zoomFactor = 1;
    jest.spyOn(cgv.canvas, 'pixelsPerBp').mockReturnValue(0.5);

    const metrics = cgv.annotation._featureLabelRenderer.metricsFor(feature, cgv.backbone.adjustedCenterOffset, 20, visibleRange);
    expect(cgv.annotation.inlineLabelMinZoomFactor).toBe(1);
    expect(metrics).toBeDefined();
    expect(metrics.fontSize).toBeGreaterThanOrEqual(8);
  });

  test('draws fitting inline labels on the zoom-detail map at overview', () => {
    const mapPath = path.join(process.cwd(), 'docs/test/maps/test_zoom_details.json');
    const json = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    const cgv = new Viewer('#map', {width: 800, height: 600});
    cgv.io.loadJSON(json);
    cgv.resize(800, 600);
    const curvedLabel = jest.spyOn(cgv.annotation._featureLabelRenderer, '_drawCurvedLabel');

    cgv.draw();

    expect(cgv.zoomFactor).toBeCloseTo(1);
    expect(curvedLabel.mock.calls.some(call => call[1].name === 'DNA polymerase')).toBe(true);
  });

  test('curves circular inline labels one glyph at a time', () => {
    const cgv = new Viewer('#map', {
      width: 800,
      height: 600,
      sequence: {length: 1000},
      annotation: {font: 'sans-serif, plain, 14', labelPosition: 'inline'},
      features: [{name: 'curved label', source: 'test', start: 400, stop: 600, legend: 'Feature'}],
    });
    const feature = cgv.features(1);
    const visibleRange = new CGRange(cgv.sequence.mapContig, 1, 1000);
    const ctx = cgv.canvas.context('map');
    ctx.fillText.mockClear();
    ctx.measureText.mockClear();
    ctx.rotate.mockClear();
    ctx.translate.mockClear();

    cgv.annotation._featureLabelRenderer.draw([feature], 150, 24, visibleRange);

    expect(ctx.fillText.mock.calls.map(call => call[0])).toEqual(Array.from(feature.name));
    expect(ctx.measureText).toHaveBeenCalledTimes(Array.from(feature.name).length + 1);
    expect(ctx.rotate).toHaveBeenCalledTimes(Array.from(feature.name).length);
    expect(new Set(ctx.rotate.mock.calls.map(call => call[0])).size).toBeGreaterThan(1);

    ctx.measureText.mockClear();
    cgv.annotation._featureLabelRenderer.draw([feature], 150, 24, visibleRange);
    expect(ctx.measureText).not.toHaveBeenCalled();
  });

  test('keeps linear inline labels straight', () => {
    const cgv = new Viewer('#map', {
      width: 800,
      height: 600,
      sequence: {length: 1000},
      annotation: {font: 'sans-serif, plain, 14', labelPosition: 'inline'},
      features: [{name: 'straight label', source: 'test', start: 300, stop: 700, legend: 'Feature'}],
    });
    cgv.format = 'linear';
    const feature = cgv.features(1);
    const visibleRange = new CGRange(cgv.sequence.mapContig, 1, 1000);
    const ctx = cgv.canvas.context('map');
    ctx.fillText.mockClear();
    ctx.rotate.mockClear();

    cgv.annotation._featureLabelRenderer.draw([feature], 0, 24, visibleRange);

    expect(ctx.fillText).toHaveBeenCalledTimes(1);
    expect(ctx.fillText).toHaveBeenCalledWith(feature.name, 0, expect.any(Number));
    expect(ctx.rotate).not.toHaveBeenCalled();
  });

  test('omits inline labels when the feature or zoom level cannot accommodate them', () => {
    const cgv = new Viewer('#map', {
      sequence: {length: 1000},
      annotation: {labelPosition: 'inline', inlineLabelMinZoomFactor: 5, inlineLabelMinFontSize: 8},
      features: [{name: 'label that cannot fit', source: 'test', start: 100, stop: 102, legend: 'Feature'}],
    });
    const feature = cgv.features(1);
    const visibleRange = new CGRange(cgv.sequence.mapContig, 1, 400);
    jest.spyOn(cgv.canvas, 'pixelsPerBp').mockReturnValue(1);

    cgv._zoomFactor = 2;
    expect(cgv.annotation._featureLabelRenderer.metricsFor(feature, cgv.backbone.adjustedCenterOffset, 20, visibleRange)).toBeUndefined();

    cgv._zoomFactor = 10;
    expect(cgv.annotation._featureLabelRenderer.metricsFor(feature, cgv.backbone.adjustedCenterOffset, 20, visibleRange)).toBeUndefined();
  });

  test('does not shrink inline labels when shrinking is disabled', () => {
    const cgv = new Viewer('#map', {
      sequence: {length: 1000},
      annotation: {
        font: 'sans-serif, plain, 16',
        labelPosition: 'inline',
        inlineLabelAllowShrinking: false,
        inlineLabelAllowTruncation: false,
        inlineLabelMinFontSize: 8,
      },
      legend: {items: [{name: 'Feature', decoration: 'arc'}]},
      features: [{name: 'label requiring shrink', source: 'test', start: 100, stop: 300, legend: 'Feature'}],
    });
    const feature = cgv.features(1);
    const visibleRange = new CGRange(cgv.sequence.mapContig, 1, 400);
    const targetWidth = feature.label.width * 0.75;
    jest.spyOn(cgv.canvas, 'pixelsPerBp').mockReturnValue((targetWidth + 4) / feature.length);

    const renderer = cgv.annotation._featureLabelRenderer;
    expect(renderer.metricsFor(feature, 100, 20, visibleRange)).toBeUndefined();

    cgv.annotation.update({inlineLabelAllowShrinking: true});
    const metrics = renderer.metricsFor(feature, 100, 20, visibleRange);
    expect(metrics).toBeDefined();
    expect(metrics.fontSize).toBeLessThan(feature.label.font.size);
  });

  test('truncates inline labels with an ellipsis only when enabled', () => {
    const cgv = new Viewer('#map', {
      sequence: {length: 1000},
      annotation: {
        font: 'sans-serif, plain, 14',
        labelPosition: 'inline',
        inlineLabelAllowShrinking: false,
        inlineLabelAllowTruncation: true,
      },
      legend: {items: [{name: 'Feature', decoration: 'arc'}]},
      features: [{name: 'long descriptive feature label', source: 'test', start: 100, stop: 300, legend: 'Feature'}],
    });
    const feature = cgv.features(1);
    const renderer = cgv.annotation._featureLabelRenderer;
    const measurement = renderer._measurementFor(feature);
    const targetWidth = measurement.prefixWidths[8] + measurement.ellipsisWidth;
    const visibleRange = new CGRange(cgv.sequence.mapContig, 1, 400);
    jest.spyOn(cgv.canvas, 'pixelsPerBp').mockReturnValue((targetWidth + 4) / feature.length);

    const metrics = renderer.metricsFor(feature, 100, 20, visibleRange);
    expect(metrics).toBeDefined();
    expect(metrics.text.endsWith('…')).toBe(true);
    expect(metrics.text).not.toBe(feature.name);
    expect(metrics.fontSize).toBe(feature.label.font.size);

    cgv.annotation.update({inlineLabelAllowTruncation: false});
    expect(renderer.metricsFor(feature, 100, 20, visibleRange)).toBeUndefined();
  });

  test('uses external labels only as fallbacks when inline and external labels are enabled', () => {
    const cgv = new Viewer('#map', {
      width: 800,
      height: 600,
      sequence: {length: 1000},
      annotation: {labelPosition: 'both'},
      features: [
        {name: 'fits inline', source: 'test', start: 100, stop: 300, legend: 'Feature'},
        {name: 'needs fallback', source: 'test', start: 500, stop: 600, legend: 'Feature'},
      ],
    });
    cgv.addTracks([{dataType: 'feature', dataMethod: 'source', dataKeys: 'test', position: 'outside'}]);
    const renderer = cgv.annotation._featureLabelRenderer;
    jest.spyOn(renderer, 'willDrawFeature').mockImplementation(feature => feature.name === 'fits inline');
    jest.spyOn(cgv.canvas, 'visibleRangeForCenterOffset').mockReturnValue(new CGRange(cgv.sequence.mapContig, 1, 1000));

    cgv.annotation.draw(100, 150, false);

    expect(cgv.annotation._visibleLabels.map(label => label.feature.name)).toContain('needs fallback');
    expect(cgv.annotation._visibleLabels.map(label => label.feature.name)).not.toContain('fits inline');
  });

  test('applies onlyDrawFavorites to inline labels', () => {
    const cgv = new Viewer('#map', {
      width: 800,
      height: 600,
      sequence: {length: 1000},
      annotation: {labelPosition: 'inline', onlyDrawFavorites: true},
      features: [
        {name: 'favorite label', source: 'test', start: 100, stop: 300, favorite: true, legend: 'Feature'},
        {name: 'ordinary label', source: 'test', start: 500, stop: 700, legend: 'Feature'},
      ],
    });
    const renderer = cgv.annotation._featureLabelRenderer;
    const drawStraightLabel = jest.spyOn(renderer, '_drawStraightLabel').mockImplementation(() => {});
    const visibleRange = new CGRange(cgv.sequence.mapContig, 1, 1000);
    cgv.format = 'linear';
    jest.spyOn(renderer, 'metricsFor').mockImplementation(feature => ({feature}));

    renderer.draw(cgv.features(), 0, 20, visibleRange);

    expect(drawStraightLabel).toHaveBeenCalledTimes(1);
    expect(drawStraightLabel.mock.calls[0][1].name).toBe('favorite label');
    expect(renderer.willDrawFeature(cgv.features(2))).toBe(false);
  });

  test('rejects obviously short overview features before segment layout work', () => {
    const cgv = new Viewer('#map', {
      sequence: {length: 1000000},
      annotation: {labelPosition: 'inline', inlineLabelMinFontSize: 8},
      features: [{name: 'label that is much too long', source: 'test', start: 100, stop: 110, legend: 'Feature'}],
    });
    const feature = cgv.features(1);
    const visibleRange = new CGRange(cgv.sequence.mapContig, 1, cgv.sequence.length);
    const renderer = cgv.annotation._featureLabelRenderer;
    const visibleSegments = jest.spyOn(renderer, '_visibleSegments');
    jest.spyOn(cgv.canvas, 'pixelsPerBp').mockReturnValue(0.001);

    expect(renderer.metricsFor(feature, cgv.backbone.adjustedCenterOffset, 20, visibleRange)).toBeUndefined();
    expect(visibleSegments).not.toHaveBeenCalled();
  });

  test('uses continuous label space for a feature wrapping the circular origin', () => {
    const cgv = new Viewer('#map', {
      sequence: {length: 1000},
      annotation: {font: 'sans-serif, plain, 14', labelPosition: 'inline', inlineLabelMinZoomFactor: 2},
      features: [{name: 'origin feature', source: 'test', start: 900, stop: 100, legend: 'Feature'}],
    });
    const feature = cgv.features(1);
    const visibleRange = new CGRange(cgv.sequence.mapContig, 850, 150);
    cgv._zoomFactor = 10;
    jest.spyOn(cgv.canvas, 'pixelsPerBp').mockReturnValue(1);

    const metrics = cgv.annotation._featureLabelRenderer.metricsFor(feature, cgv.backbone.adjustedCenterOffset, 20, visibleRange);
    expect(metrics).toBeDefined();
    expect(metrics.bp).toBeCloseTo(1000);
  });

  test('serializes canonical placement and independent inline fitting switches', () => {
    const cgv = new Viewer('#map', {
      annotation: {
        labelPosition: 'inline',
        inlineLabelAllowShrinking: false,
        inlineLabelAllowTruncation: true,
        inlineLabelPadding: 3,
      },
    });
    const json = cgv.annotation.toJSON();
    expect(json.labelPosition).toBe('inline');
    expect(json.drawExternalLabels).toBeUndefined();
    expect(json.drawInlineLabels).toBeUndefined();
    expect(json.inlineLabelAllowShrinking).toBe(false);
    expect(json.inlineLabelAllowTruncation).toBe(true);
    expect(json.inlineLabelPadding).toBe(3);
  });

  test('normalizes temporary placement booleans when loading annotation options', () => {
    const cgv = new Viewer('#map', {
      annotation: {drawExternalLabels: true, drawInlineLabels: true},
    });

    expect(cgv.annotation.labelPosition).toBe('both');
    expect(cgv.annotation.toJSON().labelPosition).toBe('both');
    expect(cgv.annotation.toJSON().drawExternalLabels).toBeUndefined();
    expect(cgv.annotation.toJSON().drawInlineLabels).toBeUndefined();
  });

  test('uses canonical labelPosition when temporary placement booleans are also present', () => {
    const cgv = new Viewer('#map', {
      annotation: {
        labelPosition: 'none',
        drawExternalLabels: true,
        drawInlineLabels: true,
      },
    });

    expect(cgv.annotation.labelPosition).toBe('none');
  });
});
