import Viewer from '../src/Viewer';

describe('Highlighter', () => {

  let cgv;

  beforeEach(() => {
    document.body.innerHTML = '<div id="map"></div>';
    cgv = new Viewer('#map');
  });

  test('keeps visible legends above feature hover highlights', () => {
    cgv.legend.addItems({name: 'Feature'});
    cgv.legend.refresh();
    cgv.highlighter.feature.popovers = false;
    const feature = {highlight: jest.fn()};
    const ctx = cgv.canvas.context('ui');
    const clearRect = jest.spyOn(ctx, 'clearRect');

    cgv.highlighter.mouseOver({
      elementType: 'feature',
      element: feature,
      slot: undefined,
    });

    const box = cgv.legend.box;
    expect(feature.highlight).toHaveBeenCalledTimes(1);
    expect(clearRect).toHaveBeenCalledWith(box.x, box.y, box.width, box.height);
  });

  test('uses the feature type when an extracted feature has no name', () => {
    const feature = cgv.addFeatures({
      type: 'ORF',
      start: 10,
      stop: 30,
    })[0];

    const html = cgv.highlighter.featurePopoverContentsDefault({element: feature});

    expect(html).toContain('<div>ORF<div>');
    expect(html).not.toContain('undefined');
  });

  test('uses common qualifiers as names before falling back to the type', () => {
    const feature = cgv.addFeatures({
      type: 'CDS',
      start: 10,
      stop: 30,
      qualifiers: {locus_tag: ['ABC_001']},
    })[0];

    expect(cgv.highlighter.featurePopoverContentsDefault({element: feature}))
      .toContain('<div>CDS: ABC_001<div>');
  });

});
