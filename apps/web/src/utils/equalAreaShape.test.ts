import fs from 'node:fs';
import path from 'node:path';
import type { Topology } from 'topojson-specification';
import { describe, expect, it } from 'vitest';
import {
  areaRatioToLinearScale,
  buildNormalizedCountryShape,
  computeStageCameraZoom,
  NORMALIZED_BASE_PIXEL_AREA,
  parseCountryFeaturesFromTopo,
  ratioToSliderPosition,
  sliderPositionToRatio,
} from './equalAreaShape';

describe('equalAreaShape & logarithmic slider math', () => {
  it('maps slider [-1, 0, +1] cleanly to [0.1x, 1.0x, 10.0x]', () => {
    expect(sliderPositionToRatio(-1)).toBe(0.1);
    expect(sliderPositionToRatio(0)).toBe(1);
    expect(sliderPositionToRatio(1)).toBe(10);
    expect(ratioToSliderPosition(2)).toBeCloseTo(0.30103, 4);
    expect(sliderPositionToRatio(ratioToSliderPosition(0.44))).toBeCloseTo(0.44, 3);
  });

  it('scales linear SVG dimension by sqrt(areaRatio) so 4x area = 2x width/height', () => {
    expect(areaRatioToLinearScale(4)).toBe(2);
    expect(areaRatioToLinearScale(0.25)).toBe(0.5);
  });

  it('projects Greece and Philippines to identical normalized starting pixel area', () => {
    const topoPath = path.resolve(
      __dirname,
      '..',
      '..',
      'public',
      'data',
      'countries-50m.topo.json',
    );
    const topo = JSON.parse(fs.readFileSync(topoPath, 'utf8')) as Topology;
    const features = parseCountryFeaturesFromTopo(topo);

    const greece = buildNormalizedCountryShape(features.get('GR')!, 'GR', 39.0, 22.0);
    const philippines = buildNormalizedCountryShape(features.get('PH')!, 'PH', 12.8, 121.7);

    expect(greece.pathD.length).toBeGreaterThan(50);
    expect(philippines.pathD.length).toBeGreaterThan(50);
    expect(greece.pixelArea).toBeCloseTo(NORMALIZED_BASE_PIXEL_AREA, 0);
    expect(philippines.pixelArea).toBeCloseTo(NORMALIZED_BASE_PIXEL_AREA, 0);

    // Camera zoom keeps massive ratios inside bounds while preserving exact area ratio
    const zoom = computeStageCameraZoom(philippines, greece, 8.5, 130);
    expect(zoom).toBeLessThanOrEqual(1);
    expect(greece.maxHalfSpan * areaRatioToLinearScale(8.5) * zoom).toBeLessThanOrEqual(130.01);
  });
});
