"use client";

import { Line, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { COUNTRY_CODES } from "@/lib/geo/countries";
import { countryCentroid, type LatLng } from "@/lib/geo/centroids";
import { arcPoints, latLngToVector3 } from "@/lib/geo/sphere";

export type GlobeRoute = { from: LatLng; to: LatLng };

const R = 1;

const atmosphereShader = {
  vertexShader: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec3 vNormal; void main() { float i = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0); gl_FragColor = vec4(0.35, 0.6, 1.0, 1.0) * i; }`,
};

function Graticule() {
  const lines = useMemo(() => {
    const out: [number, number, number][][] = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      out.push(Array.from({ length: 73 }, (_, i) => latLngToVector3(lat, i * 5 - 180, R * 1.001)));
    }
    for (let lng = -180; lng < 180; lng += 30) {
      out.push(Array.from({ length: 37 }, (_, i) => latLngToVector3(i * 5 - 90, lng, R * 1.001)));
    }
    return out;
  }, []);
  return (
    <>
      {lines.map((pts, i) => (
        <Line key={i} points={pts} color="#5f86d6" lineWidth={0.6} transparent opacity={0.25} />
      ))}
    </>
  );
}

function CountryDots() {
  const geometry = useMemo(() => {
    const positions = COUNTRY_CODES.flatMap((c) => {
      const p = countryCentroid(c);
      return p ? latLngToVector3(p.lat, p.lng, R * 1.004) : [];
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return g;
  }, []);
  return (
    <points geometry={geometry}>
      <pointsMaterial color="#9cc2ff" size={0.018} sizeAttenuation />
    </points>
  );
}

function RouteArc({ route }: { route: GlobeRoute }) {
  const points = useMemo(() => arcPoints(route.from, route.to, R, 64), [route]);
  const ref = useRef<{ material: { dashOffset: number } }>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.material.dashOffset -= dt * 0.4;
  });
  return (
    <>
      <Line points={points} color="#ffc14d" lineWidth={1} transparent opacity={0.35} />
      <Line
        ref={ref as never}
        points={points}
        color="#ffd166"
        lineWidth={2.2}
        dashed
        dashSize={0.06}
        gapSize={0.04}
      />
    </>
  );
}

function Marker({ at }: { at: LatLng }) {
  const pos = useMemo(() => latLngToVector3(at.lat, at.lng, R * 1.01), [at]);
  const ring = useRef<THREE.Mesh>(null);
  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...pos).normalize()),
    [pos],
  );
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const t = (clock.elapsedTime % 1.6) / 1.6;
    ring.current.scale.setScalar(1 + t * 2.5);
    (ring.current.material as THREE.MeshBasicMaterial).opacity = 1 - t;
  });
  return (
    <group position={pos} quaternion={quaternion}>
      <mesh>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh ref={ring}>
        <ringGeometry args={[0.03, 0.04, 32]} />
        <meshBasicMaterial color="#ffd166" transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default function Globe({
  routes,
  marker,
  autoRotate = true,
  active,
}: {
  routes: GlobeRoute[];
  marker?: LatLng;
  autoRotate?: boolean;
  active: boolean;
}) {
  // Start the camera looking at the first route's midpoint (or the marker).
  const cameraPos = useMemo(() => {
    const focus = routes[0]
      ? { lat: (routes[0].from.lat + routes[0].to.lat) / 2, lng: (routes[0].from.lng + routes[0].to.lng) / 2 }
      : (marker ?? { lat: 20, lng: 0 });
    return latLngToVector3(focus.lat + 10, focus.lng, 3.1);
  }, [routes, marker]);

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      camera={{ position: cameraPos, fov: 40 }}
      aria-label="Globe showing the shipment route"
      role="img"
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]} intensity={1.4} />
      <mesh>
        <sphereGeometry args={[R, 64, 64]} />
        <meshStandardMaterial color="#13234a" roughness={0.8} metalness={0.1} />
      </mesh>
      <mesh scale={1.18}>
        <sphereGeometry args={[R, 64, 64]} />
        <shaderMaterial
          {...atmosphereShader}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
      <Graticule />
      <CountryDots />
      {routes.map((r, i) => (
        <RouteArc key={i} route={r} />
      ))}
      {marker && <Marker at={marker} />}
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={autoRotate} autoRotateSpeed={0.4} />
    </Canvas>
  );
}
