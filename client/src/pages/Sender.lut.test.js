import { parseCubeLut, buildLutAtlas } from './Sender';

const SIMPLE_2X2X2_CUBE = `
TITLE "Test LUT"
LUT_3D_SIZE 2
0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
1.0 1.0 0.0
0.0 0.0 1.0
1.0 0.0 1.0
0.0 1.0 1.0
1.0 1.0 1.0
`;

describe('parseCubeLut', () => {
  test('parses a valid .cube file into size + RGB triplets', () => {
    const result = parseCubeLut(SIMPLE_2X2X2_CUBE);
    expect(result).not.toBeNull();
    expect(result.size).toBe(2);
    expect(result.data).toHaveLength(8); // size^3
    expect(result.data[0]).toEqual([0, 0, 0]);
    expect(result.data[7]).toEqual([1, 1, 1]);
  });

  test('ignores comments and blank lines', () => {
    const withComments = `# a comment\n\n${SIMPLE_2X2X2_CUBE}\n# trailing comment`;
    const result = parseCubeLut(withComments);
    expect(result).not.toBeNull();
    expect(result.size).toBe(2);
  });

  test('rejects a file with the wrong number of data rows', () => {
    const truncated = SIMPLE_2X2X2_CUBE.split('\n').slice(0, -3).join('\n');
    expect(parseCubeLut(truncated)).toBeNull();
  });

  test('rejects a file missing LUT_3D_SIZE', () => {
    const noSize = SIMPLE_2X2X2_CUBE.replace('LUT_3D_SIZE 2', '');
    expect(parseCubeLut(noSize)).toBeNull();
  });

  test('rejects a 1D LUT file', () => {
    expect(parseCubeLut('LUT_1D_SIZE 2\n0 0 0\n1 1 1')).toBeNull();
  });

  test('rejects garbage input', () => {
    expect(parseCubeLut('not a lut file at all')).toBeNull();
  });
});

describe('buildLutAtlas', () => {
  test('packs an N^3 LUT into an N*N x N pixel atlas', () => {
    const parsed = parseCubeLut(SIMPLE_2X2X2_CUBE);
    const atlas = buildLutAtlas(parsed);
    expect(atlas.width).toBe(4);  // size * size
    expect(atlas.height).toBe(2); // size
    expect(atlas.pixels).toHaveLength(4 * 2 * 4); // width * height * RGBA
  });

  test('maps r=0,g=0,b=0 (black) to the atlas origin pixel', () => {
    const parsed = parseCubeLut(SIMPLE_2X2X2_CUBE);
    const atlas = buildLutAtlas(parsed);
    // column = b*size + r = 0, row = g = 0 -> pixel index 0
    expect(atlas.pixels[0]).toBe(0);   // R
    expect(atlas.pixels[1]).toBe(0);   // G
    expect(atlas.pixels[2]).toBe(0);   // B
    expect(atlas.pixels[3]).toBe(255); // A
  });

  test('maps r=1,g=1,b=1 (white) to full 255 channels', () => {
    const parsed = parseCubeLut(SIMPLE_2X2X2_CUBE);
    const atlas = buildLutAtlas(parsed);
    // column = b*size + r = 1*2+1 = 3, row = g = 1 -> pixel index (1*4 + 3) * 4
    const idx = (1 * atlas.width + 3) * 4;
    expect(atlas.pixels[idx]).toBe(255);
    expect(atlas.pixels[idx + 1]).toBe(255);
    expect(atlas.pixels[idx + 2]).toBe(255);
  });
});
