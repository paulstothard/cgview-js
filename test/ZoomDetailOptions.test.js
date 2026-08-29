import Viewer from '../src/Viewer';
import CGRange from '../src/CGRange';

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
