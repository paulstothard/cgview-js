import Viewer from '../src/Viewer';

describe('Feature track labels', () => {

  beforeEach(() => {
    document.body.innerHTML = '<div id="map"></div>';
  });

  function viewerWithTrack(options = {}) {
    const {format = 'circular', settings = {}, track = {}, ...viewerOptions} = options;
    const cgv = new Viewer('#map', {
      width: 800,
      height: 600,
      settings,
      sequence: {length: 1000},
      features: [{name: 'example', source: 'genes', start: 100, stop: 300}],
      ...viewerOptions,
    });
    cgv.addTracks({
      name: 'Genes',
      dataType: 'feature',
      dataMethod: 'source',
      dataKeys: 'genes',
      position: 'outside',
      separateFeaturesBy: 'none',
      ...track,
    });
    cgv.format = format;
    return cgv;
  }

  function zoomForLabels(cgv, zoomFactor = 8) {
    cgv.layout.zoom(zoomFactor, 500);
    cgv.layout.updateLayout(true);
  }

  test('is enabled by default and round-trips through Settings JSON', () => {
    const cgv = viewerWithTrack();

    expect(cgv.settings.showFeatureTrackLabels).toBe(true);
    expect(cgv.io.toJSON().cgview.settings.showFeatureTrackLabels).toBe(true);

    cgv.settings.update({showFeatureTrackLabels: false});
    expect(cgv.settings.showFeatureTrackLabels).toBe(false);
    expect(cgv.io.toJSON().cgview.settings.showFeatureTrackLabels).toBe(false);
  });

  test('does not redraw or plan track names at overview scale', () => {
    const cgv = viewerWithTrack();
    const drawFull = jest.spyOn(cgv, 'drawFull');

    expect(cgv.layout._trackLabelRenderer.plans()).toEqual([]);
    cgv.settings.update({showFeatureTrackLabels: false});

    expect(drawFull).not.toHaveBeenCalled();
  });

  test('draws a curved, halo-protected name in a zoomed circular map', () => {
    const cgv = viewerWithTrack();
    zoomForLabels(cgv);
    const ctx = cgv.canvas.context('foreground');
    ctx.fillText.mockClear();
    ctx.strokeText.mockClear();

    cgv.layout._trackLabelRenderer.draw();

    expect(ctx.strokeText.mock.calls.map(call => call[0])).toEqual(Array.from('Genes'));
    expect(ctx.fillText.mock.calls.map(call => call[0])).toEqual(Array.from('Genes'));
  });

  test('draws one straight name just inside the leading edge of a linear map', () => {
    const cgv = viewerWithTrack({format: 'linear'});
    zoomForLabels(cgv);
    const ctx = cgv.canvas.context('foreground');
    const [plan] = cgv.layout._trackLabelRenderer.plans(ctx);
    const point = cgv.canvas.pointForBp(plan.bp, plan.centerOffset);
    ctx.fillText.mockClear();
    ctx.strokeText.mockClear();

    cgv.layout._trackLabelRenderer.draw();

    expect(ctx.strokeText).toHaveBeenCalledWith('Genes', 0, 0);
    expect(ctx.fillText).toHaveBeenCalledWith('Genes', 0, 0);
    expect(point.x - (plan.totalWidth / 2)).toBeCloseTo(12, 1);
  });

  test('labels each visible side of an around track but excludes plot tracks', () => {
    const cgv = viewerWithTrack({track: {position: 'around', separateFeaturesBy: 'strand'}});
    cgv.addTracks({
      name: 'Coverage',
      dataType: 'plot',
      dataMethod: 'source',
      dataKeys: 'missing-plot',
      position: 'inside',
    });
    zoomForLabels(cgv);

    const plans = cgv.layout._trackLabelRenderer.plans();

    expect(plans.map(plan => plan.track.name)).toEqual(['Genes', 'Genes']);
    expect(plans.map(plan => plan.position).sort()).toEqual(['inside', 'outside']);
  });

  test('honors the option at label zoom and refreshes the visible result', () => {
    const cgv = viewerWithTrack();
    zoomForLabels(cgv);
    const drawFull = jest.spyOn(cgv, 'drawFull');

    cgv.settings.update({showFeatureTrackLabels: false});

    expect(cgv.layout._trackLabelRenderer.plans()).toEqual([]);
    expect(drawFull).toHaveBeenCalledTimes(1);
  });
});
