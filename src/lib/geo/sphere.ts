import type { LatLng } from "./centroids";

export type Vec3 = [number, number, number];

const RAD = Math.PI / 180;

/** Globe convention: (0°,0°) → +x, north pole → +y, 90°E → -z. */
export function latLngToVector3(lat: number, lng: number, radius: number): Vec3 {
  const phi = lat * RAD;
  const lambda = lng * RAD;
  return [radius * Math.cos(phi) * Math.cos(lambda), radius * Math.sin(phi), -radius * Math.cos(phi) * Math.sin(lambda)];
}

/** Great-circle arc lifted off the surface; higher for longer routes. */
export function arcPoints(from: LatLng, to: LatLng, radius: number, segments: number): Vec3[] {
  const a = latLngToVector3(from.lat, from.lng, 1);
  const b = latLngToVector3(to.lat, to.lng, 1);
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const angle = Math.acos(dot);
  const sinAngle = Math.sin(angle);
  const lift = 0.08 + 0.35 * (angle / Math.PI);

  const points: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // slerp; falls back to lerp when the endpoints (nearly) coincide
    const wa = sinAngle < 1e-6 ? 1 - t : Math.sin((1 - t) * angle) / sinAngle;
    const wb = sinAngle < 1e-6 ? t : Math.sin(t * angle) / sinAngle;
    const r = radius * (1 + lift * Math.sin(Math.PI * t));
    const v: Vec3 = [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
    const n = Math.hypot(...v) || 1;
    points.push([(v[0] / n) * r, (v[1] / n) * r, (v[2] / n) * r]);
  }
  return points;
}
