import Viewer from '../src/Viewer';

describe('Sequence zoom detail', () => {

  beforeEach(() => {
    document.body.innerHTML = '<div id="map"></div>';
  });

  test('draws circular bases on the readable local tangent', () => {
    const cgv = new Viewer('#map', {sequence: {seq: 'ATGC'}});
    const ctx = cgv.canvas.context('map');
    const pointForBp = jest.spyOn(cgv.canvas, 'pointForBp').mockReturnValue({x: 12, y: 34});
    const orientation = jest.spyOn(cgv.canvas, 'tangentialTextOrientationForBp')
      .mockReturnValue({angle: 0.4, flipped: false});

    cgv.sequence._drawBase(ctx, 'A', 2, 100, 5);

    expect(pointForBp).toHaveBeenCalledWith(2, 100);
    expect(orientation).toHaveBeenCalledWith(2);
    expect(ctx.translate).toHaveBeenLastCalledWith(12, 34);
    expect(ctx.rotate).toHaveBeenLastCalledWith(0.4);
    expect(ctx.fillText).toHaveBeenLastCalledWith('A', 0, 5);
  });

  test('keeps linear bases horizontal', () => {
    const cgv = new Viewer('#map', {sequence: {seq: 'ATGC'}});
    cgv.format = 'linear';
    const ctx = cgv.canvas.context('map');
    jest.spyOn(cgv.canvas, 'pointForBp').mockReturnValue({x: 12, y: 34});
    const orientation = jest.spyOn(cgv.canvas, 'tangentialTextOrientationForBp');
    ctx.rotate.mockClear();
    ctx.fillText.mockClear();

    cgv.sequence._drawBase(ctx, 'A', 2, 100, 5);

    expect(orientation).not.toHaveBeenCalled();
    expect(ctx.rotate).not.toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenLastCalledWith('A', 12, 39);
  });

  test('reuses one calculated angle for paired sequence bases', () => {
    const cgv = new Viewer('#map', {sequence: {seq: 'ATGC'}});
    const ctx = cgv.canvas.context('map');
    jest.spyOn(cgv.canvas, 'pointForBp').mockReturnValue({x: 12, y: 34});
    const orientation = jest.spyOn(cgv.canvas, 'tangentialTextOrientationForBp');

    cgv.sequence._drawBase(ctx, 'A', 2, 105, 5, 0.4);
    cgv.sequence._drawBase(ctx, 'T', 2, 95, 5, 0.4);

    expect(orientation).not.toHaveBeenCalled();
    expect(ctx.rotate).toHaveBeenLastCalledWith(0.4);
  });

  test('colors detailed bases by default with a palette suited to the backbone', () => {
    const cgv = new Viewer('#map', {sequence: {seq: 'ATGCN'}});

    expect(cgv.sequence.colorBases).toBe(true);
    // The default grey backbone uses the brighter dark-background palette.
    expect(cgv.sequence._colorForBase('A', 1)).toBe('#4ade80');
    expect(cgv.sequence._colorForBase('T', 2)).toBe('#f87171');
    expect(cgv.sequence._colorForBase('G', 3)).toBe('#60a5fa');
    expect(cgv.sequence._colorForBase('C', 4)).toBe('#fbbf24');
    expect(cgv.sequence._colorForBase('N', 5)).toBe('#cbd5e1');

    cgv.backbone.color = 'white';
    expect(cgv.sequence._colorForBase('A', 1)).toBe('#15803d');
    expect(cgv.sequence._colorForBase('U', 2)).toBe('#b91c1c');
    expect(cgv.sequence._colorForBase('G', 3)).toBe('#1d4ed8');
    expect(cgv.sequence._colorForBase('C', 4)).toBe('#a16207');
    expect(cgv.sequence._colorForBase('N', 5)).toBe('#475569');
  });

  test('can disable detailed base coloring and round trip the option', () => {
    const cgv = new Viewer('#map', {
      sequence: {seq: 'ATGC', color: 'navy', colorBases: false},
    });

    expect(cgv.sequence.colorBases).toBe(false);
    expect(cgv.sequence._colorForBase('A', 1)).toBe('rgba(0,0,128,1)');
    expect(cgv.io.toJSON().cgview.sequence.colorBases).toBe(false);

    const secondViewer = new Viewer('#map');
    secondViewer.io.loadJSON(cgv.io.toJSON());
    expect(secondViewer.sequence.colorBases).toBe(false);
  });

  test('never returns an upside-down tangential angle', () => {
    const cgv = new Viewer('#map', {sequence: {length: 360}});

    for (let bp = 1; bp <= 360; bp += 5) {
      const {angle} = cgv.canvas.tangentialTextOrientationForBp(bp);
      expect(angle).toBeGreaterThanOrEqual(-Math.PI / 2);
      expect(angle).toBeLessThanOrEqual(Math.PI / 2);
    }
  });

});
