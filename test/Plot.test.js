import Viewer from '../src/Viewer';
import utils from '../src/Utils';

describe('Plot rendering', () => {

  beforeEach(() => {
    document.body.innerHTML = '<div id="map"></div>';
  });

  function createPlot(options = {}, sequenceLength = 32) {
    const cgv = new Viewer('#map', {
      width: 800,
      height: 600,
      sequence: {length: sequenceLength},
    });
    const plot = cgv.addPlots({
      positions: [1, 5, 9, 13],
      scores: [0, 1, 0.5, -1],
      baseline: 0,
      axisMin: -1,
      axisMax: 1,
      ...options,
    })[0];
    return {cgv, plot};
  }

  test('uses genome-anchored power-of-two bins no wider than one screen pixel', () => {
    const {cgv, plot} = createPlot();
    const renderer = plot._renderer;
    const pixelsPerBp = jest.spyOn(cgv.canvas, 'pixelsPerBp');

    pixelsPerBp.mockReturnValue(0.2);
    expect(renderer._plotBinSize(cgv.canvas, 100)).toBe(4);
    expect(renderer._plotBinSize(cgv.canvas, 100, true)).toBe(8);

    pixelsPerBp.mockReturnValue(0.5);
    expect(renderer._plotBinSize(cgv.canvas, 100)).toBe(2);
    expect(renderer._plotBinSize(cgv.canvas, 100, true)).toBe(4);

    pixelsPerBp.mockReturnValue(4);
    expect(renderer._plotBinSize(cgv.canvas, 100)).toBe(1);
    expect(renderer._plotBinSize(cgv.canvas, 100, true)).toBe(1);
  });

  test('aggregates plot intervals using genomic overlap rather than sample count', () => {
    const {plot} = createPlot();
    const samples = plot._renderer._samplesForSegment(1, 17, 8);

    expect(samples.map(sample => sample.bp)).toEqual([1, 5, 13, 17]);
    expect(samples[1]).toEqual({bp: 5, mean: 0.5, min: 0, max: 1});
    expect(samples[2]).toEqual({bp: 13, mean: -0.25, min: -1, max: 0.5});
  });

  test('streams across visible scores instead of searching once per bin', () => {
    const {plot} = createPlot();
    const indexLookup = jest.spyOn(utils, 'indexOfValue');

    plot._renderer._samplesForSegment(1, 32, 1);

    expect(indexLookup).toHaveBeenCalledTimes(3);
    indexLookup.mockRestore();
  });

  test('keeps internal bin positions stable when the visible range is panned', () => {
    const {plot} = createPlot();
    const firstView = plot._renderer._samplesForSegment(1, 17, 8);
    const pannedView = plot._renderer._samplesForSegment(3, 17, 8);

    expect(firstView.find(sample => sample.bp === 13)).toEqual(
      pannedView.find(sample => sample.bp === 13)
    );
    expect(pannedView.map(sample => sample.bp)).toEqual([3, 6, 13, 17]);
  });

  test('preserves contour order through a wrapped circular range', () => {
    const {plot} = createPlot({}, 16);

    const samples = plot._renderer._samplesForRange({start: 14, stop: 3}, 8);

    expect(samples.map(sample => sample.bp)).toEqual([14, 15, 16, 1, 2, 3]);
  });

  test('interpolates baseline crossings, including across the map origin', () => {
    const {plot} = createPlot({}, 16);

    expect(plot._renderer._baselineCrossing({bp: 5, mean: 1}, {bp: 13, mean: -1}))
      .toEqual({bp: 9, mean: 0});
    expect(plot._renderer._baselineCrossing({bp: 15, mean: 1}, {bp: 1, mean: -1}))
      .toEqual({bp: 16, mean: 0});
  });

  test('closes disjoint positive and negative regions independently', () => {
    const {plot} = createPlot();
    const samples = [
      {bp: 1, mean: 1},
      {bp: 5, mean: -1},
      {bp: 9, mean: 1},
    ];

    expect(plot._renderer._activeSegments(samples, 'positive')).toEqual([
      [{bp: 1, mean: 1}, {bp: 3, mean: 0}],
      [{bp: 7, mean: 0}, {bp: 9, mean: 1}],
    ]);
    expect(plot._renderer._activeSegments(samples, 'negative')).toEqual([
      [{bp: 3, mean: 0}, {bp: 5, mean: -1}, {bp: 7, mean: 0}],
    ]);
  });

  test.each(['circular', 'linear'])('draws a bounded direct contour in %s format', format => {
    const {cgv, plot} = createPlot();
    cgv.format = format;
    jest.spyOn(cgv.canvas, 'pixelsPerBp').mockReturnValue(0.2);
    const context = cgv.canvas.context('map');
    context.lineTo.mockClear();
    context.stroke.mockClear();

    plot.draw(cgv.canvas, 100, 40, false, {start: 1, stop: 17});

    expect(context.stroke).toHaveBeenCalledTimes(1);
    expect(context.lineTo.mock.calls.length).toBeGreaterThan(3);
    expect(context.lineTo.mock.calls.length).toBeLessThan(30);
  });

  test('uses only the coarser mean fill during a fast draw', () => {
    const {cgv, plot} = createPlot();
    jest.spyOn(cgv.canvas, 'pixelsPerBp').mockReturnValue(0.2);
    const context = cgv.canvas.context('map');
    context.fill.mockClear();
    context.stroke.mockClear();

    plot.draw(cgv.canvas, 100, 40, true, {start: 1, stop: 17});

    expect(context.fill).toHaveBeenCalledTimes(1);
    expect(context.stroke).not.toHaveBeenCalled();
  });

  test('retains stepped geometry when a plot explicitly uses bar type', () => {
    const {cgv, plot} = createPlot({type: 'bar'});
    const path = jest.spyOn(cgv.canvas, 'path');
    const context = cgv.canvas.context('map');
    context.stroke.mockClear();

    plot.draw(cgv.canvas, 100, 40, false, {start: 1, stop: 17});

    expect(path.mock.calls.length).toBeGreaterThan(1);
    expect(context.stroke).not.toHaveBeenCalled();
  });

});
