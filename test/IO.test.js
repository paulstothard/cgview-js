import Viewer from '../src/Viewer';
import IO from '../src/IO';

describe('IO', () => {

  beforeAll(() => {
    // Set up document body to have a div for the map
    document.body.innerHTML = '<div id="map"></div>';
  });

  beforeEach(() => {
    cgv = new Viewer('#map');
  });

  describe('loadJSON', () => {

    test('load JSON object literal', () => {
      const json = { cgview: { version: '1.7.0', sequence: { length: 1234 } } };
      expect(cgv.sequence.length).toBe(1000); // The default
      cgv.io.loadJSON(json);
      expect(cgv.sequence.length).toBe(1234);
    });

    test('load JSON string', () => {
      const json = "{\"cgview\":{\"version\":\"1.7.0\",\"sequence\":{\"length\":1234}}}";
      expect(cgv.sequence.length).toBe(1000); // The default
      cgv.io.loadJSON(json);
      expect(cgv.sequence.length).toBe(1234);
    });

    test('throws an error if no "cgview" property present', () => {
      const json = { sequence: { length: 1234 } };
      expect( () => cgv.io.loadJSON(json) ).toThrow("No 'cgview' property found in JSON.");;
    });

    test('loads legacy JSON without zoom-detail settings using legacy defaults', () => {
      const json = {
        cgview: {
          version: '1.7.0',
          settings: {geneticCode: 11},
          sequence: {seq: 'ATGAAATAACCC'},
          ruler: {color: 'black'},
          annotation: {font: 'sans-serif,plain,12'},
        },
      };

      expect(() => cgv.io.loadJSON(json)).not.toThrow();
      expect(cgv.sequence.colorBases).toBe(true);
      expect(cgv.sequence.translation.visible).toBe(false);
      expect(cgv.ruler.labelPosition).toBe('inner');
      expect(cgv.ruler.labelStyle).toBe('default');
      expect(cgv.annotation.labelPosition).toBe('external');
      expect(cgv.annotation.inlineLabelAllowShrinking).toBe(true);
      expect(cgv.annotation.inlineLabelAllowTruncation).toBe(false);
      expect(cgv.annotation.inlineLabelMinZoomFactor).toBe(1);
      expect(cgv.io.toJSON().cgview.sequence.translation).toBeUndefined();
      expect(() => cgv.draw()).not.toThrow();
    });

    test('loads translation JSON created before highlight controls were added', () => {
      const json = {
        cgview: {
          version: '1.9.0',
          sequence: {
            seq: 'ATGTAACCC',
            translation: {
              visible: true,
              startColor: 'green',
              stopColor: 'red',
            },
          },
        },
      };

      expect(() => cgv.io.loadJSON(json)).not.toThrow();
      expect(cgv.sequence.translation.highlightStartCodons).toBe(true);
      expect(cgv.sequence.translation.highlightStopCodons).toBe(true);
      expect(cgv.sequence.translation.edgePadding).toBe(6);
      expect(cgv.sequence.translation.startColor.rgbaString).toBe('rgba(0,128,0,1)');
      expect(cgv.sequence.translation.stopColor.rgbaString).toBe('rgba(255,0,0,1)');
      expect(() => cgv.draw()).not.toThrow();
    });

    test('round trips all zoom-detail settings through CGView JSON', () => {
      const json = {
        cgview: {
          version: '1.9.0',
          settings: {geneticCode: 2},
          sequence: {
            seq: 'ATGAAATAACCC',
            translation: {
              visible: false,
              font: 'monospace,bold,10',
              color: 'navy',
              backgroundColor: 'rgba(120,120,120,0.2)',
              startColor: 'rgba(0,180,80,0.4)',
              startBorderColor: 'rgba(0,120,50,1)',
              startTextColor: 'rgba(0,90,35,1)',
              stopColor: 'rgba(220,40,40,0.4)',
              stopBorderColor: 'rgba(180,20,20,1)',
              stopTextColor: 'rgba(140,10,10,1)',
              highlightStartCodons: false,
              highlightStopCodons: true,
              laneSpacing: 3,
              edgePadding: 7,
              minimumScale: 0.6,
            },
          },
          ruler: {
            labelPosition: 'outer',
            labelStyle: 'tangential',
            tickCount: 12,
            tickWidth: 2,
            tickLength: 6,
            rulerPadding: 11,
            spacing: 4,
          },
          annotation: {
            labelPosition: 'inline',
            inlineLabelAllowShrinking: false,
            inlineLabelAllowTruncation: true,
            inlineLabelMinZoomFactor: 3,
            inlineLabelMinFontSize: 7,
            inlineLabelPadding: 4,
            inlineLabelColor: 'white',
          },
        },
      };

      cgv.io.loadJSON(json);
      const exported = cgv.io.toJSON();
      const secondViewer = new Viewer('#map');
      secondViewer.io.loadJSON(exported);

      expect(secondViewer.geneticCode).toBe(2);
      expect(secondViewer.sequence.translation.toJSON()).toEqual(cgv.sequence.translation.toJSON());
      expect(secondViewer.ruler.toJSON()).toEqual(cgv.ruler.toJSON());
      expect(secondViewer.annotation.toJSON()).toEqual(cgv.annotation.toJSON());
      expect(secondViewer.sequence.translation.visible).toBe(false);
      expect(secondViewer.sequence.translation.highlightStartCodons).toBe(false);
      expect(secondViewer.sequence.translation.highlightStopCodons).toBe(true);
      expect(secondViewer.sequence.translation.edgePadding).toBe(7);
      expect(secondViewer.ruler.labelPosition).toBe('outer');
      expect(secondViewer.ruler.labelStyle).toBe('tangential');
      expect(secondViewer.annotation.labelPosition).toBe('inline');
      expect(secondViewer.annotation.inlineLabelAllowShrinking).toBe(false);
      expect(secondViewer.annotation.inlineLabelAllowTruncation).toBe(true);
    });

  });

  describe('getSVG', () => {

    test('resumes an in-progress canvas draw after the temporary SVG render', () => {
      const SVGContext = function() {
        const context = document.createElement('canvas').getContext('2d');
        context.getSerializedSvg = () => '<svg></svg>';
        return context;
      };
      const viewer = new Viewer('#map', {SVGContext});
      const originalLayers = viewer.canvas._layers;
      if (viewer.layout._slotTimeoutID !== undefined) {
        clearTimeout(viewer.layout._slotTimeoutID);
      }
      const pendingSlotDraw = setTimeout(() => {}, 1000);
      viewer.layout._slotTimeoutID = pendingSlotDraw;
      const drawFull = jest.spyOn(viewer, 'drawFull').mockImplementation(() => {});

      try {
        expect(viewer.io.getSVG()).toBe('<svg></svg>');
        expect(viewer.canvas._layers).toBe(originalLayers);
        expect(drawFull).toHaveBeenCalledTimes(1);
      } finally {
        clearTimeout(pendingSlotDraw);
        viewer.layout._slotTimeoutID = undefined;
      }
    });

  });

});
