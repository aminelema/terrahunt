declare module 'topojson-server' {
  import type { GeoJSON } from 'geojson';
  import type { Topology } from 'topojson-specification';
  export function topology(
    objects: Record<string, GeoJSON>,
    quantization?: number,
  ): Topology;
}
