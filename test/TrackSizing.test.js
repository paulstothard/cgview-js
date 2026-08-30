import Viewer from '../src/Viewer';

describe('Track sizing', () => {

  beforeEach(() => {
    document.body.innerHTML = '<div id="map"></div>';
  });

  function viewerWithTracks(options = {}) {
    const {format = 'circular', ...viewerOptions} = options;
    const cgv = new Viewer('#map', {
      width: 800,
      height: 600,
      sequence: {length: 1000},
      features: [
        {name: 'outer feature', source: 'outer', start: 100, stop: 300},
        {name: 'inner feature', source: 'inner', start: 500, stop: 700},
      ],
      ...viewerOptions,
    });
    cgv.addTracks([
      {name: 'Outer', dataType: 'feature', dataMethod: 'source', dataKeys: 'outer', position: 'outside', separateFeaturesBy: 'none'},
      {name: 'Inner', dataType: 'feature', dataMethod: 'source', dataKeys: 'inner', position: 'inside', separateFeaturesBy: 'none'},
    ]);
    cgv.format = format;
    return cgv;
  }

  test('keeps the legacy 50 px lane cap when the setting is absent', () => {
    const cgv = new Viewer('#map');

    expect(cgv.settings.maxSlotThickness).toBe(50);
    expect(cgv.io.toJSON().cgview.settings.maxSlotThickness).toBe(50);
  });

  test('loads, updates, and serializes the lane cap', () => {
    const cgv = new Viewer('#map', {settings: {maxSlotThickness: 90}});

    expect(cgv.layout.maxSlotThickness).toBe(90);
    cgv.settings.update({maxSlotThickness: 120});
    expect(cgv.settings.maxSlotThickness).toBe(120);
    expect(cgv.io.toJSON().cgview.settings.maxSlotThickness).toBe(120);
  });

  test('rejects non-positive or non-finite sizing values', () => {
    const cgv = viewerWithTracks();
    const track = cgv.tracks(1);

    track.thicknessRatio = 0;
    track.thicknessRatio = Infinity;
    cgv.settings.maxSlotThickness = -1;
    cgv.settings.initialMapThicknessProportion = NaN;

    expect(track.thicknessRatio).toBe(1);
    expect(cgv.settings.maxSlotThickness).toBe(50);
    expect(cgv.settings.initialMapThicknessProportion).toBe(0.1);
  });

  test('redistributes visible lane space using the selected track ratio', () => {
    const cgv = viewerWithTracks();
    const outerTrack = cgv.tracks(1);
    const innerTrack = cgv.tracks(2);

    expect(outerTrack.slots(1).proportionOfMap).toBeCloseTo(0.5);
    expect(innerTrack.slots(1).proportionOfMap).toBeCloseTo(0.5);

    outerTrack.update({thicknessRatio: 3});

    expect(outerTrack.slots(1).proportionOfMap).toBeCloseTo(0.75);
    expect(innerTrack.slots(1).proportionOfMap).toBeCloseTo(0.25);
  });

  test('changes total overview space independently of relative lane ratios', () => {
    const cgv = viewerWithTracks();
    const initialWorkingSpace = cgv.layout.initialWorkingSpace();

    cgv.settings.update({initialMapThicknessProportion: 0.2});

    expect(cgv.layout.initialWorkingSpace()).toBeCloseTo(initialWorkingSpace * 2);
    expect(cgv.tracks(1).slots(1).proportionOfMap).toBeCloseTo(0.5);
  });

  test('batches coordinated slider settings into one proportion calculation', () => {
    const cgv = viewerWithTracks();
    const calculateMaxMapThickness = jest.spyOn(cgv.layout, '_calculateMaxMapThickness');

    cgv.layout.batchProportionUpdates(() => {
      cgv.settings.update({
        initialMapThicknessProportion: 0.15,
        maxMapThicknessProportion: 0.75,
        maxSlotThickness: 75,
      });
      cgv.tracks(1).update({thicknessRatio: 2});
    }, {duration: 0});

    expect(calculateMaxMapThickness).toHaveBeenCalledTimes(1);
    expect(cgv.settings.initialMapThicknessProportion).toBe(0.15);
    expect(cgv.settings.maxMapThicknessProportion).toBe(0.75);
    expect(cgv.settings.maxSlotThickness).toBe(75);
    expect(cgv.tracks(1).thicknessRatio).toBe(2);
  });

  test.each(['circular', 'linear'])('widens one track without squeezing its neighbour in %s maps', format => {
    const cgv = viewerWithTracks({format});
    const selectedTrack = cgv.tracks(1);
    const otherTrack = cgv.tracks(2);
    const selectedBefore = selectedTrack.slots(1).thickness;
    const otherBefore = otherTrack.slots(1).thickness;
    const currentRatioSum = cgv.layout.visibleSlots().reduce((sum, slot) => sum + slot.thicknessRatio, 0);
    const nextRatioSum = currentRatioSum + 1;

    cgv.layout.batchProportionUpdates(() => {
      cgv.settings.update({
        initialMapThicknessProportion: cgv.settings.initialMapThicknessProportion * nextRatioSum / currentRatioSum,
        maxMapThicknessProportion: cgv.settings.maxMapThicknessProportion * nextRatioSum / currentRatioSum,
        maxSlotThickness: 100,
      });
      selectedTrack.update({thicknessRatio: 2});
    }, {duration: 0});

    expect(selectedTrack.slots(1).thickness).toBeCloseTo(selectedBefore * 2);
    expect(otherTrack.slots(1).thickness).toBeCloseTo(otherBefore);

    cgv._zoomFactor = cgv.maxZoomFactor;
    cgv.layout.updateLayout(true);
    expect(selectedTrack.slots(1).thickness).toBeCloseTo(otherTrack.slots(1).thickness * 2);
    expect(selectedTrack.slots(1).thickness).toBeLessThanOrEqual(100);
  });

  test.each(['circular', 'linear'])('uses the lane cap while zooming in %s maps', format => {
    const cgv = viewerWithTracks({format, settings: {maxSlotThickness: 30, maxMapThicknessProportion: 0.8}});
    const slot = cgv.tracks(1).slots(1);

    cgv._zoomFactor = cgv.maxZoomFactor;
    cgv.layout.updateLayout(true);
    expect(slot.thickness).toBeLessThanOrEqual(30);

    cgv.settings.update({maxSlotThickness: 80});
    cgv.layout.updateLayout(true);
    expect(slot.thickness).toBeGreaterThan(30);
    expect(slot.thickness).toBeLessThanOrEqual(80);
  });
});
