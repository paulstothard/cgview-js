import Color from '../src/Color';

describe('Color contrast', () => {

  test('calculates WCAG relative luminance and contrast ratios', () => {
    const black = new Color('black');
    const white = new Color('white');

    expect(black.relativeLuminance).toBe(0);
    expect(white.relativeLuminance).toBe(1);
    expect(black.contrastRatio(white)).toBeCloseTo(21);
  });

  test('alpha-composites colors without changing either input', () => {
    const foreground = new Color('rgba(0,0,0,0.25)');
    const background = new Color('white');
    const composite = foreground.compositeOver(background);

    expect(composite.rgba).toEqual({r: 191, g: 191, b: 191, a: 1});
    expect(foreground.rgbaString).toBe('rgba(0,0,0,0.25)');
    expect(background.rgbaString).toBe('rgba(255,255,255,1)');
  });

  test('chooses the candidate with the greater contrast ratio', () => {
    expect(new Color('#f0b040').contrastColor().rgbaString).toBe('rgba(0,0,0,1)');
    expect(new Color('#205080').contrastColor().rgbaString).toBe('rgba(255,255,255,1)');
  });

  test('creates background-aware hover colors without changing opacity', () => {
    const darkGreen = new Color('rgba(0,128,0,1)');
    const darkPurple = new Color('rgba(106,24,237,1)');
    const translucentBlue = new Color('rgba(0,0,153,0.5)');

    darkGreen.highlightForBackground('white');
    darkPurple.highlightForBackground('white');
    translucentBlue.highlightForBackground('white');

    expect(darkGreen.relativeLuminance).toBeGreaterThan(new Color('rgb(0,128,0)').relativeLuminance);
    expect(darkPurple.relativeLuminance).toBeGreaterThan(new Color('rgb(106,24,237)').relativeLuminance);
    expect(translucentBlue.relativeLuminance).toBeLessThan(new Color('rgb(0,0,153)').relativeLuminance);
    expect(darkGreen.rgbaString).toBe('rgba(41,148,41,1)');
    expect(darkPurple.rgbaString).toBe('rgba(130,61,240,1)');
    expect(translucentBlue.rgbaString).toBe('rgba(0,0,129,0.5)');
    expect(translucentBlue.opacity).toBe(0.5);
  });
});
