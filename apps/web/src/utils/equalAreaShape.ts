import { geoAzimuthalEqualArea, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import * as topoClient from 'topojson-client';
import type { Topology } from 'topojson-specification';

export const NORMALIZED_BASE_PIXEL_AREA = 11_000;

export interface NormalizedCountryShape {
  iso2: string;
  pathD: string;
  halfWidth: number;
  halfHeight: number;
  maxHalfSpan: number;
  pixelArea: number;
}

type CountryFeatureProps = {
  iso2: string | null;
  name: string;
  isPlayable: boolean;
};

let cachedFeaturesPromise: Promise<Map<string, Feature<Polygon | MultiPolygon, CountryFeatureProps>>> | null =
  null;

export function parseCountryFeaturesFromTopo(
  topo: Topology,
): Map<string, Feature<Polygon | MultiPolygon, CountryFeatureProps>> {
  const fc = topoClient.feature(
    topo,
    topo.objects.countries,
  ) as unknown as FeatureCollection<Polygon | MultiPolygon, CountryFeatureProps>;

  const byIso2 = new Map<string, Feature<Polygon | MultiPolygon, CountryFeatureProps>>();
  for (const feat of fc.features) {
    if (feat.properties?.iso2 && feat.properties.isPlayable) {
      byIso2.set(feat.properties.iso2, feat);
    }
  }
  return byIso2;
}

export function loadPlayableCountryFeatures(): Promise<
  Map<string, Feature<Polygon | MultiPolygon, CountryFeatureProps>>
> {
  if (!cachedFeaturesPromise) {
    cachedFeaturesPromise = fetch('/data/countries-50m.topo.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load countries TopoJSON (${res.status})`);
        }
        return res.json() as Promise<Topology>;
      })
      .then((topo) => parseCountryFeaturesFromTopo(topo));
  }
  return cachedFeaturesPromise;
}

/**
 * Projects a country feature with an Azimuthal Equal-Area projection rotated to its
 * interior point so there is zero Mercator distortion and no ±180° antimeridian tear,
 * normalized so its rendered pixel area equals `targetPixelArea` at 1.0x scale.
 */
export function buildNormalizedCountryShape(
  feature: Feature<Polygon | MultiPolygon>,
  iso2: string,
  labelLat: number,
  labelLng: number,
  targetPixelArea: number = NORMALIZED_BASE_PIXEL_AREA,
): NormalizedCountryShape {
  const probeProj = geoAzimuthalEqualArea()
    .rotate([-labelLng, -labelLat])
    .translate([0, 0])
    .scale(100);

  const probePath = geoPath(probeProj);
  const rawArea = Math.max(1e-6, probePath.area(feature));

  // Planar projected area scales quadratically with linear projection scale!
  const normalizedScale = 100 * Math.sqrt(targetPixelArea / rawArea);

  const centeredProbe = geoAzimuthalEqualArea()
    .rotate([-labelLng, -labelLat])
    .translate([0, 0])
    .scale(normalizedScale);

  const [[x0, y0], [x1, y1]] = geoPath(centeredProbe).bounds(feature);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;

  const finalProj = geoAzimuthalEqualArea()
    .rotate([-labelLng, -labelLat])
    .translate([-cx, -cy])
    .scale(normalizedScale);

  const finalPathGen = geoPath(finalProj);
  const pathD = finalPathGen(feature) ?? '';
  const halfWidth = Math.max(12, (x1 - x0) / 2);
  const halfHeight = Math.max(12, (y1 - y0) / 2);

  return {
    iso2,
    pathD,
    halfWidth,
    halfHeight,
    maxHalfSpan: Math.max(halfWidth, halfHeight),
    pixelArea: finalPathGen.area(feature),
  };
}

/**
 * Maps logarithmic slider position [-1, +1] -> area ratio [0.10, 10.0]
 * where 0.0 (dead center) = 1.00x equal area.
 */
export function sliderPositionToRatio(position: number): number {
  const clamped = Math.max(-1, Math.min(1, position));
  return Number(Math.pow(10, clamped).toFixed(4));
}

export function ratioToSliderPosition(ratio: number): number {
  const safe = Math.max(0.1, Math.min(10, ratio));
  return Math.log10(safe);
}

/**
 * Because 2D SVG area grows with linearScale², scaling a normalized shape to represent
 * area ratio R requires linear SVG transform `scale(sqrt(R))`.
 */
export function areaRatioToLinearScale(areaRatio: number): number {
  return Math.sqrt(Math.max(0.01, areaRatio));
}

/**
 * Computes a shared camera zoom factor so neither Country A (at cameraZoom)
 * nor Country B (at cameraZoom * sqrt(ratio)) overflows its half-stage viewport,
 * while strictly preserving RenderedArea(B) / RenderedArea(A) === areaRatio!
 */
export function computeStageCameraZoom(
  baseShape: NormalizedCountryShape,
  targetShape: NormalizedCountryShape,
  activeAreaRatio: number,
  maxAllowedHalfSpan: number,
): number {
  const targetLinear = areaRatioToLinearScale(activeAreaRatio);
  const requiredSpan = Math.max(
    baseShape.maxHalfSpan,
    targetShape.maxHalfSpan * targetLinear,
  );
  if (requiredSpan <= maxAllowedHalfSpan) {
    return 1;
  }
  return maxAllowedHalfSpan / requiredSpan;
}

export function formatRelativeComparison(
  ratio: number,
  baseName: string,
  targetName: string,
): string {
  if (ratio >= 0.97 && ratio <= 1.03) {
    return `${targetName} and ${baseName} are nearly identical in size (1.00×)`;
  }
  if (ratio > 1) {
    return `${targetName} is ${ratio.toFixed(2)}× larger than ${baseName}`;
  }
  const inverse = 1 / ratio;
  return `${targetName} is ${ratio.toFixed(2)}× ${baseName} (${baseName} is ${inverse.toFixed(2)}× larger)`;
}
