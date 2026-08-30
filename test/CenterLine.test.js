import Viewer from '../src/Viewer';

describe('CenterLine', () => {

  beforeEach(() => {
    document.body.innerHTML = '<div id="map"></div>';
  });

  test('is hidden by default', () => {
    const cgv = new Viewer('#map');

    expect(cgv.centerLine.visible).toBe(false);
    expect(cgv.centerLine.toJSON().visible).toBe(false);
  });

  test('can be enabled when the viewer is created', () => {
    const cgv = new Viewer('#map', {centerLine: {visible: true}});

    expect(cgv.centerLine.visible).toBe(true);
  });

  test('only draws when visible', () => {
    const cgv = new Viewer('#map');
    const drawCenterLine = jest.spyOn(cgv.layout, 'drawCenterLine');

    cgv.centerLine.draw();
    expect(drawCenterLine).not.toHaveBeenCalled();

    cgv.centerLine.update({visible: true});
    cgv.centerLine.draw();
    expect(drawCenterLine).toHaveBeenCalledTimes(1);
  });

});
