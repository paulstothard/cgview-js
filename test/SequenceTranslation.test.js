import Viewer from '../src/Viewer';
import CGRange from '../src/CGRange';

describe('SequenceTranslation', () => {

  beforeEach(() => {
    document.body.innerHTML = '<div id="map"></div>';
  });

  test('is opt-in and contributes backbone thickness only when visible', () => {
    const cgv = new Viewer('#map', {sequence: {seq: 'ATGAAATAACCC'}});
    const baseThickness = cgv.sequence.baseThickness;

    expect(cgv.sequence.translation.visible).toBe(false);
    expect(cgv.sequence.thickness).toBe(baseThickness);

    cgv.sequence.translation.visible = true;
    expect(cgv.sequence.thickness).toBeGreaterThan(baseThickness);
  });

  test('translates all direct frames from the map origin', () => {
    const cgv = new Viewer('#map', {
      sequence: {seq: 'ATGAAATAACCC', translation: {visible: true}},
      settings: {geneticCode: 11},
    });
    const translation = cgv.sequence.translation;
    const contig = cgv.contigs(1);
    const range = new CGRange(cgv.sequence.mapContig, 1, cgv.sequence.length);
    const table = cgv.codonTables.byID(11);

    expect(translation.codonsForRange(contig, range, 1, 1, table).map(c => c.aminoAcid)).toEqual(['M', 'K', '*', 'P']);
    expect(translation.codonsForRange(contig, range, 1, 2, table).map(c => c.start)).toEqual([2, 5, 8]);
    expect(translation.codonsForRange(contig, range, 1, 3, table).map(c => c.start)).toEqual([3, 6, 9]);
  });

  test('anchors reverse frames at the end of each contig', () => {
    const cgv = new Viewer('#map', {
      sequence: {seq: 'ATGAAATAACCC', translation: {visible: true}},
    });
    const translation = cgv.sequence.translation;
    const contig = cgv.contigs(1);
    const range = new CGRange(cgv.sequence.mapContig, 1, cgv.sequence.length);
    const table = cgv.codonTables.byID(11);

    expect(translation.codonsForRange(contig, range, -1, 1, table).map(c => c.start)).toEqual([1, 4, 7, 10]);
    expect(translation.codonsForRange(contig, range, -1, 2, table).map(c => c.start)).toEqual([3, 6, 9]);
    expect(translation.codonsForRange(contig, range, -1, 3, table).map(c => c.start)).toEqual([2, 5, 8]);
    expect(translation.codonsForRange(contig, range, -1, 1, table).map(c => c.aminoAcid)).toEqual(['H', 'F', 'L', 'G']);
  });

  test('does not translate across contig boundaries', () => {
    const cgv = new Viewer('#map', {
      sequence: {
        contigs: [{name: 'one', seq: 'ATGAA'}, {name: 'two', seq: 'TAACC'}],
        translation: {visible: true},
      },
    });
    const translation = cgv.sequence.translation;
    const range = new CGRange(cgv.sequence.mapContig, 1, cgv.sequence.length);
    const table = cgv.codonTables.byID(11);
    const codons = cgv.contigs().flatMap(contig => translation.codonsForRange(contig, range, 1, 1, table));

    expect(codons.map(c => c.start)).toEqual([1, 6]);
    expect(codons.map(c => c.codon)).toEqual(['ATG', 'TAA']);
  });

  test('draws complete codons at both sides of a wrapped visible range', () => {
    const cgv = new Viewer('#map', {
      sequence: {seq: 'ATGAAATAACCC', translation: {visible: true}},
    });
    const range = new CGRange(cgv.sequence.mapContig, 11, 6);
    const table = cgv.codonTables.byID(11);
    const codons = cgv.sequence.translation.codonsForRange(cgv.contigs(1), range, 1, 1, table);

    expect(codons.map(c => c.start)).toEqual([10, 1, 4]);
  });

  test('uses and reports the viewer genetic code and survives JSON export', () => {
    const cgv = new Viewer('#map', {
      sequence: {seq: 'ATGTGA', translation: {visible: true}},
      settings: {geneticCode: 2},
    });
    const translation = cgv.sequence.translation;
    const range = new CGRange(cgv.sequence.mapContig, 1, cgv.sequence.length);
    const table = cgv.codonTables.byID(cgv.geneticCode);

    expect(translation.geneticCode).toBe(2);
    expect(translation.geneticCodeName).toBe('Vertebrate Mitochondrial');
    expect(translation.codonsForRange(cgv.contigs(1), range, 1, 1, table).map(c => c.aminoAcid)).toEqual(['M', 'W']);
    expect(cgv.io.toJSON().cgview.sequence.translation.visible).toBe(true);
    expect(cgv.io.toJSON().cgview.settings.geneticCode).toBe(2);
  });

  test('styles start and stop codons independently and allows either highlight to be disabled', () => {
    const cgv = new Viewer('#map', {
      sequence: {
        seq: 'ATGTAACCC',
        translation: {
          visible: true,
          startColor: '#d1fae5',
          startBorderColor: '#059669',
          startTextColor: '#065f46',
          stopColor: '#fee2e2',
          stopBorderColor: '#dc2626',
          stopTextColor: '#991b1b',
        },
      },
    });
    const translation = cgv.sequence.translation;
    const range = new CGRange(cgv.sequence.mapContig, 1, cgv.sequence.length);
    const codons = translation.codonsForRange(cgv.contigs(1), range, 1, 1, cgv.codonTables.byID(11));
    const startStyle = translation._styleForCodon(codons[0]);
    const stopStyle = translation._styleForCodon(codons[1]);

    expect(startStyle.backgroundColor.rgbaString).toBe('rgba(209,250,229,1)');
    expect(startStyle.borderColor.rgbaString).toBe('rgba(5,150,105,1)');
    expect(startStyle.textColor.rgbaString).toBe('rgba(6,95,70,1)');
    expect(stopStyle.backgroundColor.rgbaString).toBe('rgba(254,226,226,1)');
    expect(stopStyle.borderColor.rgbaString).toBe('rgba(220,38,38,1)');
    expect(stopStyle.textColor.rgbaString).toBe('rgba(153,27,27,1)');

    const drawElement = jest.spyOn(cgv.canvas, 'drawElement').mockImplementation(() => {});
    translation._drawCodon(codons[0], 100, 15, 1);
    expect(drawElement).toHaveBeenCalledWith(expect.objectContaining({
      color: 'rgba(209,250,229,1)',
      showBorder: true,
      borderColor: 'rgba(5,150,105,1)',
    }));

    translation.update({highlightStartCodons: false, highlightStopCodons: false});
    expect(translation._styleForCodon(codons[0]).backgroundColor).toBe(translation.backgroundColor);
    expect(translation._styleForCodon(codons[1]).backgroundColor).toBe(translation.backgroundColor);
  });
});
