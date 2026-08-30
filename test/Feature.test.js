import Viewer from '../src/Viewer';
import CGRange from '../src/CGRange';

describe('Feature', () => {

  beforeAll(() => {
    // Set up document body to have a div for the map
    document.body.innerHTML = '<div id="map"></div>';
  });

  beforeEach(() => {
    cgv = new Viewer('#map', {
      sequence: {
        contigs: [
          { name: 'contig_1', length: 100 },
          { name: 'contig_2', length: 100 },
        ],
      },
    });
  });

  describe('contrained positions', () => {

    test('for stop', () => {
      const feature = cgv.addFeatures([
        {name: 'f1', contig: 'contig_1', start: 10, stop: 120},
      ])[0];
      expect(feature.start).toEqual(10);
      expect(feature.stop).toEqual(100);
    });

    test('for start and stop', () => {
      const feature = cgv.addFeatures([
        {name: 'f2', contig: 'contig_1', start: 130, stop: 150},
      ])[0];
      expect(feature.start).toEqual(100);
      expect(feature.stop).toEqual(100);
    });

  });

  describe('feature on contigs', () => {

    beforeEach(() => {
      cgv.addFeatures([
        {name: 'f1', contig: 'contig_1', start: 10, stop: 20},
        {name: 'f2', contig: 'contig_2', start: 30, stop: 50},
      ]);
    });

    test('can be added', () => {
      expect(cgv.features().length).toEqual(2);
      expect(cgv.features(2).start).toEqual(30);
      expect(cgv.features(2).stop).toEqual(50);
    });

    test('have different mapContig positions', () => {
      expect(cgv.features(2).mapStart).toEqual(130);
      expect(cgv.features(2).mapStop).toEqual(150);
    });

    test('will belong to the contig it was added with', () => {
      expect(cgv.features(1).contig).toEqual(cgv.contigs(1));
      expect(cgv.features(2).contig).toEqual(cgv.contigs(2));
    });

    test('will move with the contigs', () => {
      cgv.contigs(2).move(0);
      expect(cgv.features(2).start).toEqual(30);
      expect(cgv.features(2).stop).toEqual(50);
      expect(cgv.features(2).mapStart).toEqual(30);
      expect(cgv.features(2).mapStop).toEqual(50);
    });

    test('can be moved to mapContig', () => {
      const feature = cgv.features(2);
      feature.moveToMapContig();
      expect(feature.contig.cgvID).toEqual(cgv.sequence.mapContig.cgvID);
      expect(feature.start).toEqual(130);
      expect(feature.stop).toEqual(150);
      expect(feature.mapStart).toEqual(130);
      expect(feature.mapStop).toEqual(150);
    });

  });

  describe('feature without contig', () => {

    beforeEach(() => {
      cgv.addFeatures([
        {name: 'f1', start: 10, stop: 20},
        {name: 'f2', start: 130, stop: 150},
      ]);
    });

    test('can be added', () => {
      expect(cgv.features().length).toEqual(2);
      expect(cgv.features(2).start).toEqual(130);
      expect(cgv.features(2).stop).toEqual(150);
    });

    test('have the same mapContig positions', () => {
      expect(cgv.features(2).mapStart).toEqual(130);
      expect(cgv.features(2).mapStop).toEqual(150);
    });

    test('will belong to the mapContig', () => {
      expect(cgv.features(1).contig).toEqual(cgv.sequence.mapContig);
      expect(cgv.features(2).contig).toEqual(cgv.sequence.mapContig);
    });

    test('will NOT move with the contigs', () => {
      cgv.contigs(2).move(0);
      expect(cgv.features(2).start).toEqual(130);
      expect(cgv.features(2).stop).toEqual(150);
      expect(cgv.features(2).mapStart).toEqual(130);
      expect(cgv.features(2).mapStop).toEqual(150);
      expect(cgv.features(2).contig).toEqual(cgv.sequence.mapContig);
    });

    test('can be moved to a contig', () => {
      const feature = cgv.features(2);
      feature.moveToContig();
      expect(feature.contig.cgvID).toEqual(cgv.contigs(2).cgvID);
      expect(feature.start).toEqual(30);
      expect(feature.stop).toEqual(50);
      expect(feature.mapStart).toEqual(130);
      expect(feature.mapStop).toEqual(150);
    });

  });

  describe('visible-range clipping', () => {

    let viewer;

    beforeEach(() => {
      viewer = new Viewer('#map', {
        sequence: {length: 360},
        legend: {items: [
          {name: 'Replication', swatchColor: 'blue', decoration: 'arrow'},
          {name: 'Regulation', swatchColor: 'orange', decoration: 'arrow'},
        ]},
      });
    });

    test('never extends a feature beyond its real coordinates for a wrapped viewport', () => {
      const feature = viewer.addFeatures([
        {name: 'DNA polymerase', start: 12, stop: 104, strand: 1, legend: 'Replication'},
      ])[0];
      const visibleRange = new CGRange(viewer.sequence.mapContig, 350, 60);
      const drawElement = jest.spyOn(viewer.canvas, 'drawElement').mockImplementation(() => {});

      feature.drawRange(feature.mapRange, 'map', 100, 20, visibleRange);

      expect(drawElement).toHaveBeenCalledTimes(1);
      expect(drawElement).toHaveBeenCalledWith(expect.objectContaining({
        start: 12,
        stop: 104,
        color: feature.color.rgbaString,
        decoration: 'clockwise-arrow',
      }));
    });

    test('uses a compact arc until a feature has room for an arrowhead and body', () => {
      const feature = viewer.addFeatures([
        {name: 'DNA polymerase', start: 12, stop: 104, strand: 1, legend: 'Replication'},
      ])[0];
      const visibleRange = new CGRange(viewer.sequence.mapContig, 1, 360);
      const pixelsPerBp = jest.spyOn(viewer.canvas, 'pixelsPerBp').mockReturnValue(0.1);
      const drawElement = jest.spyOn(viewer.canvas, 'drawElement').mockImplementation(() => {});

      feature.drawRange(feature.mapRange, 'map', 100, 20, visibleRange, {showShading: true});
      expect(drawElement).toHaveBeenLastCalledWith(expect.objectContaining({
        decoration: 'arc',
        showShading: false,
      }));

      pixelsPerBp.mockReturnValue(1);
      feature.drawRange(feature.mapRange, 'map', 100, 20, visibleRange, {showShading: true});
      expect(drawElement).toHaveBeenLastCalledWith(expect.objectContaining({
        decoration: 'clockwise-arrow',
        showShading: true,
      }));
    });

    test('splits wrapped visibility into bounded linear feature segments', () => {
      const feature = viewer.addFeatures([
        {name: 'long regulator', start: 10, stop: 350, strand: 1, legend: 'Regulation'},
      ])[0];
      const visibleRange = new CGRange(viewer.sequence.mapContig, 350, 60);

      expect(feature._drawSegmentsForRange(feature.mapRange, visibleRange)).toEqual([
        [10, 160],
        [250, 350],
      ]);
    });

    test('uses arcs at clipping boundaries and keeps the arrow at the true endpoint', () => {
      const feature = viewer.addFeatures([
        {name: 'long regulator', start: 10, stop: 350, strand: 1, legend: 'Regulation'},
      ])[0];
      const visibleRange = new CGRange(viewer.sequence.mapContig, 350, 60);
      const drawElement = jest.spyOn(viewer.canvas, 'drawElement').mockImplementation(() => {});

      feature.drawRange(feature.mapRange, 'map', 100, 20, visibleRange);

      expect(drawElement.mock.calls.map(call => ({
        start: call[0].start,
        stop: call[0].stop,
        decoration: call[0].decoration,
      }))).toEqual([
        {start: 10, stop: 160, decoration: 'arc'},
        {start: 250, stop: 350, decoration: 'clockwise-arrow'},
      ]);
    });

    test('keeps a reverse arrow only on the segment containing the true start', () => {
      const feature = viewer.addFeatures([
        {name: 'reverse regulator', start: 10, stop: 350, strand: -1, legend: 'Regulation'},
      ])[0];
      const visibleRange = new CGRange(viewer.sequence.mapContig, 350, 60);
      const drawElement = jest.spyOn(viewer.canvas, 'drawElement').mockImplementation(() => {});

      feature.drawRange(feature.mapRange, 'map', 100, 20, visibleRange);

      expect(drawElement.mock.calls.map(call => call[0].decoration)).toEqual([
        'counterclockwise-arrow',
        'arc',
      ]);
    });

  });

  describe('base-detail direction indicators', () => {

    let viewer;
    let visibleRange;

    beforeEach(() => {
      viewer = new Viewer('#map', {
        sequence: {seq: 'ATG'.repeat(120)},
        settings: {showFeatureDirectionIndicators: true},
        legend: {items: [{name: 'Feature', swatchColor: 'blue', decoration: 'arrow'}]},
      });
      visibleRange = new CGRange(viewer.sequence.mapContig, 20, 120);
      jest.spyOn(viewer.sequence, 'isDetailReadable').mockReturnValue(true);
    });

    test('draws visible direct and reverse indicators with feature-derived colors', () => {
      const directFeature = viewer.addFeatures([
        {name: 'direct', start: 10, stop: 150, strand: 1, legend: 'Feature'},
      ])[0];
      const reverseFeature = viewer.addFeatures([
        {name: 'reverse', start: 160, stop: 300, strand: -1, legend: 'Feature'},
      ])[0];
      const drawIndicators = jest.spyOn(viewer.canvas, 'drawFeatureDirectionIndicators')
        .mockImplementation(() => {});

      directFeature.drawRange(directFeature.mapRange, 'map', 100, 20, visibleRange);
      reverseFeature.drawRange(reverseFeature.mapRange, 'map', 100, 20,
        new CGRange(viewer.sequence.mapContig, 180, 260));

      expect(drawIndicators).toHaveBeenNthCalledWith(1, expect.objectContaining({
        start: 20,
        stop: 120,
        color: directFeature.color.rgbaString,
        direction: 1,
      }));
      expect(drawIndicators).toHaveBeenNthCalledWith(2, expect.objectContaining({
        start: 180,
        stop: 260,
        color: reverseFeature.color.rgbaString,
        direction: -1,
      }));
    });

    test('skips indicators for fast draws, overlays, and unreadable detail', () => {
      const feature = viewer.addFeatures([
        {name: 'direct', start: 10, stop: 150, strand: 1, legend: 'Feature'},
      ])[0];
      const drawIndicators = jest.spyOn(viewer.canvas, 'drawFeatureDirectionIndicators')
        .mockImplementation(() => {});

      feature.drawRange(feature.mapRange, 'map', 100, 20, visibleRange, {showDirectionIndicators: false});
      feature.drawRange(feature.mapRange, 'ui', 100, 20, visibleRange);
      viewer.sequence.isDetailReadable.mockReturnValue(false);
      feature.drawRange(feature.mapRange, 'map', 100, 20, visibleRange);

      expect(drawIndicators).not.toHaveBeenCalled();
    });

    test('draws chevron tips in the requested map direction and inside the feature width', () => {
      const canvas = viewer.canvas;
      const context = canvas.context('map');
      jest.spyOn(canvas, 'pixelsPerBp').mockReturnValue(10);
      jest.spyOn(canvas, 'pointForBp').mockImplementation((bp, centerOffset) => ({
        x: bp * 10,
        y: centerOffset,
      }));

      context.moveTo.mockClear();
      context.lineTo.mockClear();
      canvas.drawFeatureDirectionIndicators({
        start: 10,
        stop: 40,
        centerOffset: 100,
        color: 'rgba(32,116,174,0.86)',
        width: 20,
        direction: 1,
      });
      const directTail = context.moveTo.mock.calls[0];
      const directTip = context.lineTo.mock.calls[0];
      expect(directTip[0]).toBeGreaterThan(directTail[0]);
      expect(Math.abs(directTail[1] - 100)).toBeLessThan(10);

      context.moveTo.mockClear();
      context.lineTo.mockClear();
      canvas.drawFeatureDirectionIndicators({
        start: 10,
        stop: 40,
        centerOffset: 100,
        color: 'rgba(68,150,93,0.9)',
        width: 20,
        direction: -1,
      });
      const reverseTail = context.moveTo.mock.calls[0];
      const reverseTip = context.lineTo.mock.calls[0];
      expect(reverseTip[0]).toBeLessThan(reverseTail[0]);
      expect(Math.abs(reverseTail[1] - 100)).toBeLessThan(10);
    });

    test('matches chevron arm slope to the feature arrowhead', () => {
      const canvas = viewer.canvas;
      const context = canvas.context('map');
      viewer.settings.arrowHeadLength = 0.5;
      jest.spyOn(canvas, 'pixelsPerBp').mockReturnValue(10);
      jest.spyOn(canvas, 'pointForBp').mockImplementation((bp, centerOffset) => ({
        x: bp * 10,
        y: centerOffset,
      }));

      context.moveTo.mockClear();
      context.lineTo.mockClear();
      canvas.drawFeatureDirectionIndicators({
        start: 10,
        stop: 40,
        centerOffset: 100,
        color: 'rgba(32,116,174,0.86)',
        width: 40,
        direction: 1,
      });

      const tail = context.moveTo.mock.calls[0];
      const tip = context.lineTo.mock.calls[0];
      const tangentRun = tip[0] - tail[0];
      const radialRun = tail[1] - tip[1];
      expect(tangentRun / radialRun).toBeCloseTo(2 * viewer.settings.arrowHeadLength);
    });

    test('places chevrons symmetrically outward from the rendered label edges', () => {
      const centers = viewer.canvas._featureDirectionIndicatorCenters({
        minimumCenter: 10,
        maximumCenter: 90,
        spacingBp: 10,
        markerHalfLengthBp: 1,
        pixelsPerBp: 10,
        labelMetrics: {bp: 50, textWidth: 40},
      });
      const leftCenter = Math.max(...centers.filter(center => center < 50));
      const rightCenter = Math.min(...centers.filter(center => center > 50));

      expect(leftCenter).toBe(46);
      expect(rightCenter).toBe(54);
      expect(50 - leftCenter).toBe(rightCenter - 50);
      expect(centers.filter(center => center < 50).reverse().slice(0, 3)).toEqual([46, 36, 26]);
      expect(centers.filter(center => center > 50).slice(0, 3)).toEqual([54, 64, 74]);
    });

    test('uses the accepted inline-label placement to reserve marker space', () => {
      const feature = viewer.addFeatures([
        {name: 'center label', source: 'test', start: 20, stop: 220, strand: 1, legend: 'Feature'},
      ])[0];
      viewer.addTracks([{
        name: 'Features', dataType: 'feature', dataMethod: 'source', dataKeys: 'test',
        position: 'outside', separateFeaturesBy: 'none',
      }]);
      const slot = viewer.tracks(1).slots(1);
      const labelMetrics = {bp: 80, textWidth: 60, pixelsPerBp: 10};
      const placementForFeature = jest.spyOn(viewer.annotation._featureLabelRenderer, 'placementForFeature')
        .mockReturnValue(labelMetrics);
      const drawIndicators = jest.spyOn(viewer.canvas, 'drawFeatureDirectionIndicators')
        .mockImplementation(() => {});

      feature.draw('map', slot.centerOffset, slot.thickness, visibleRange, {
        slot,
        showDirectionIndicators: true,
      });

      expect(placementForFeature).toHaveBeenCalledWith(feature, slot, visibleRange);
      expect(drawIndicators).toHaveBeenCalledWith(expect.objectContaining({labelMetrics}));
    });

  });

});
