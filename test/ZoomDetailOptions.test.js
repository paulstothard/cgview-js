import Viewer from '../src/Viewer';
import CGRange from '../src/CGRange';
import fs from 'fs';
import path from 'path';

describe('Zoom detail options', () => {

  beforeEach(() => {
    document.body.innerHTML = '<div id="map"></div>';
  });

  test('serializes and updates the SMS3-style ruler configuration', () => {
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
        drawInlineLabels: true,
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
        drawInlineLabels: true,
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
      annotation: {font: 'sans-serif, plain, 14', drawInlineLabels: true},
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
    expect(ctx.measureText).toHaveBeenCalledTimes(Array.from(feature.name).length);
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
      annotation: {font: 'sans-serif, plain, 14', drawInlineLabels: true},
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
      annotation: {drawInlineLabels: true, inlineLabelMinZoomFactor: 5, inlineLabelMinFontSize: 8},
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

  test('rejects obviously short overview features before segment layout work', () => {
    const cgv = new Viewer('#map', {
      sequence: {length: 1000000},
      annotation: {drawInlineLabels: true, inlineLabelMinFontSize: 8},
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
      annotation: {font: 'sans-serif, plain, 14', drawInlineLabels: true, inlineLabelMinZoomFactor: 2},
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

  test('serializes independent external and inline label switches', () => {
    const cgv = new Viewer('#map', {
      annotation: {drawExternalLabels: false, drawInlineLabels: true, inlineLabelPadding: 3},
    });
    const json = cgv.annotation.toJSON();
    expect(json.drawExternalLabels).toBe(false);
    expect(json.drawInlineLabels).toBe(true);
    expect(json.inlineLabelPadding).toBe(3);
  });
});
