"use client";

import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// Scene layout (metres-ish): runway along x at z=0, terminal behind (z<0), cargo apron in front (z>0).
const RUNWAY_HALF = 42;
const CONTAINER_COLORS = ["#d64545", "#3b6fd8", "#e8a33a", "#2fa36b", "#6a4fc7"];

function Runway() {
  const edgeLights = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let x = -RUNWAY_HALF; x <= RUNWAY_HALF; x += 4) pts.push([x, 0.08, 3.4], [x, 0.08, -3.4]);
    return pts;
  }, []);
  const lightMat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (lightMat.current) lightMat.current.emissiveIntensity = 2.2 + Math.sin(clock.elapsedTime * 3) * 0.8;
  });

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[RUNWAY_HALF * 2 + 6, 6.4]} />
        <meshStandardMaterial color="#343d58" roughness={0.9} />
      </mesh>
      {Array.from({ length: 21 }, (_, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[-RUNWAY_HALF + 2 + i * 4, 0.02, 0]}>
          <planeGeometry args={[2, 0.22]} />
          <meshBasicMaterial color="#e9eef8" />
        </mesh>
      ))}
      {[3, -3].map((z) => (
        <mesh key={z} rotation-x={-Math.PI / 2} position={[0, 0.02, z]}>
          <planeGeometry args={[RUNWAY_HALF * 2 + 6, 0.12]} />
          <meshBasicMaterial color="#e9eef8" />
        </mesh>
      ))}
      {edgeLights.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.13, 8, 8]} />
          <meshStandardMaterial ref={i === 0 ? lightMat : undefined} color="#ffd166" emissive="#ffc14d" emissiveIntensity={2.4} />
        </mesh>
      ))}
    </group>
  );
}

function Terminal() {
  return (
    <group position={[-14, 0, -16]}>
      <mesh position={[0, 2.2, 0]} castShadow>
        <boxGeometry args={[30, 4.4, 7]} />
        <meshStandardMaterial color="#26324f" />
      </mesh>
      {/* glass facade facing the runway */}
      <mesh position={[0, 2.2, 3.52]}>
        <planeGeometry args={[29, 3.6]} />
        <meshStandardMaterial color="#6fb1ff" emissive="#3d7fe0" emissiveIntensity={0.9} transparent opacity={0.85} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[-13 + i * 2, 2.2, 3.56]}>
          <boxGeometry args={[0.12, 3.6, 0.05]} />
          <meshStandardMaterial color="#1a2440" />
        </mesh>
      ))}
      {/* curved roof */}
      <mesh position={[0, 4.4, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[3.8, 3.8, 31, 32, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#d6dff0" side={THREE.DoubleSide} metalness={0.3} roughness={0.4} />
      </mesh>
      {/* jet bridge */}
      <mesh position={[8, 2.4, 6]}>
        <boxGeometry args={[1.2, 1.2, 5]} />
        <meshStandardMaterial color="#9aa9c2" />
      </mesh>
    </group>
  );
}

function ControlTower() {
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (beacon.current) beacon.current.emissiveIntensity = Math.sin(clock.elapsedTime * 4) > 0 ? 4 : 0.2;
  });
  return (
    <group position={[16, 0, -14]}>
      <mesh position={[0, 6, 0]} castShadow>
        <cylinderGeometry args={[0.8, 1.1, 12, 16]} />
        <meshStandardMaterial color="#2a3656" />
      </mesh>
      <mesh position={[0, 12.8, 0]}>
        <cylinderGeometry args={[2.2, 1.6, 1.8, 16]} />
        <meshStandardMaterial color="#7fc0ff" emissive="#3d7fe0" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0, 13.9, 0]}>
        <cylinderGeometry args={[2.4, 2.4, 0.3, 16]} />
        <meshStandardMaterial color="#2a3656" />
      </mesh>
      <mesh position={[0, 14.6, 0]}>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshStandardMaterial ref={beacon} color="#ff5a5a" emissive="#ff3030" emissiveIntensity={3} />
      </mesh>
    </group>
  );
}

function CargoHangar({ x }: { x: number }) {
  return (
    <group position={[x, 0, -13]}>
      <mesh rotation-x={-Math.PI / 2} castShadow>
        <cylinderGeometry args={[4, 4, 10, 24, 1, false, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#8a9bbd" side={THREE.DoubleSide} metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.6, 5.01]}>
        <planeGeometry args={[5, 3.2]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ffb84d" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function Containers() {
  const stacks = useMemo(() => {
    const out: { pos: [number, number, number]; color: string }[] = [];
    let c = 0;
    for (let col = 0; col < 4; col++)
      for (let row = 0; row < 2; row++)
        for (let level = 0; level < 3 - ((col + row) % 2); level++)
          out.push({ pos: [24 + col * 2.6, 0.65 + level * 1.3, -14 + row * 6.2], color: CONTAINER_COLORS[c++ % CONTAINER_COLORS.length] });
    return out;
  }, []);
  return (
    <group>
      {stacks.map((s, i) => (
        <mesh key={i} position={s.pos} castShadow>
          <boxGeometry args={[2.4, 1.25, 6]} />
          <meshStandardMaterial color={s.color} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function ParcelConveyor() {
  const parcels = useRef<THREE.Group>(null);
  const BELT = 14;
  useFrame((_, dt) => {
    parcels.current?.children.forEach((p) => {
      p.position.x += dt * 2;
      if (p.position.x > BELT / 2) p.position.x -= BELT;
    });
  });
  return (
    <group position={[-6, 0, 9]}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[BELT, 0.2, 1.6]} />
        <meshStandardMaterial color="#2b3346" />
      </mesh>
      {[-6, -2, 2, 6].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]}>
          <boxGeometry args={[0.2, 0.4, 1.4]} />
          <meshStandardMaterial color="#59647f" />
        </mesh>
      ))}
      <group ref={parcels}>
        {Array.from({ length: 7 }, (_, i) => {
          const s = 0.6 + (i % 3) * 0.2;
          return (
            <mesh key={i} position={[-BELT / 2 + i * 2, 0.6 + s / 2, 0]} castShadow>
              <boxGeometry args={[s, s, s]} />
              <meshStandardMaterial color={i % 4 === 3 ? "#3b6fd8" : "#c8925a"} roughness={0.85} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function DeliveryVan() {
  const van = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!van.current) return;
    const t = (clock.elapsedTime * 0.08) % 1;
    van.current.position.x = -40 + t * 80;
  });
  return (
    <group ref={van} position={[-40, 0, 14]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[3, 1.6, 1.5]} />
        <meshStandardMaterial color="#f6f8fc" />
      </mesh>
      <mesh position={[1.9, 0.7, 0]}>
        <boxGeometry args={[0.9, 1.2, 1.5]} />
        <meshStandardMaterial color="#3b6fd8" />
      </mesh>
      {[-0.9, 0.9, 1.9].map((x) =>
        [0.75, -0.75].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.3, z]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.3, 0.3, 0.2, 12]} />
            <meshStandardMaterial color="#1c2233" />
          </mesh>
        )),
      )}
    </group>
  );
}

function CargoPlane() {
  const plane = useRef<THREE.Group>(null);
  const CYCLE = 16;

  useFrame(({ clock }) => {
    const p = plane.current;
    if (!p) return;
    const t = clock.elapsedTime % CYCLE;
    p.visible = t < 13;
    if (t < 2) {
      // holding at the threshold
      p.position.set(-RUNWAY_HALF + 4, 1.2, 0);
      p.rotation.z = 0;
    } else if (t < 8) {
      // take-off roll, accelerating
      const k = (t - 2) / 6;
      p.position.set(-RUNWAY_HALF + 4 + k * k * 46, 1.2, 0);
      p.rotation.z = k > 0.85 ? (k - 0.85) * 0.8 : 0;
    } else {
      // rotate and climb out
      const k = (t - 8) / 5;
      p.position.set(8 + k * 60, 1.2 + k * k * 28, 0);
      p.rotation.z = 0.2;
    }
  });

  const white = <meshStandardMaterial color="#eef3fb" metalness={0.2} roughness={0.4} />;
  return (
    <group ref={plane} scale={1.35}>
      {/* fuselage along +x */}
      <mesh rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.85, 0.85, 9, 20]} />
        {white}
      </mesh>
      <mesh position={[4.5, 0, 0]} scale={[1.6, 1, 1]}>
        <sphereGeometry args={[0.85, 20, 16]} />
        {white}
      </mesh>
      <mesh position={[-4.9, 0.15, 0]} rotation-z={Math.PI / 2} scale={[1, 1, 0.8]}>
        <coneGeometry args={[0.85, 1.8, 20]} />
        {white}
      </mesh>
      <mesh position={[4.9, 0.35, 0]}>
        <boxGeometry args={[0.9, 0.3, 1.2]} />
        <meshStandardMaterial color="#1b2540" />
      </mesh>
      {/* wings */}
      <mesh position={[0.2, -0.25, 0]}>
        <boxGeometry args={[2, 0.15, 11]} />
        <meshStandardMaterial color="#d9e2f0" />
      </mesh>
      {[-2.6, 2.6].map((z) => (
        <mesh key={z} position={[0.8, -0.75, z]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.38, 0.38, 1.6, 14]} />
          <meshStandardMaterial color="#9aa9c2" />
        </mesh>
      ))}
      {/* tail */}
      <mesh position={[-4.9, 1.6, 0]}>
        <boxGeometry args={[1.6, 2.6, 0.15]} />
        <meshStandardMaterial color="#3b6fd8" />
      </mesh>
      <mesh position={[-5, 0.4, 0]}>
        <boxGeometry args={[1.2, 0.1, 4]} />
        <meshStandardMaterial color="#d9e2f0" />
      </mesh>
      {/* livery stripe */}
      <mesh position={[0, 0.1, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.87, 0.87, 8, 20, 1, true, Math.PI * 0.45, Math.PI * 0.1]} />
        <meshStandardMaterial color="#3b6fd8" side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[5.5, -0.2, 0]} color="#fff2c4" intensity={6} distance={14} />
    </group>
  );
}

export default function AirportScene({ active }: { active: boolean }) {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [4, 17, 44], fov: 38 }}
      gl={{ antialias: true }}
      aria-label="3D airport with a cargo plane taking off"
      role="img"
    >
      <color attach="background" args={["#101c3a"]} />
      <fog attach="fog" args={["#101c3a", 55, 120]} />
      <Stars radius={90} depth={40} count={1200} factor={3} fade speed={0.5} />
      <hemisphereLight args={["#9fb4ff", "#2a3658", 1.1]} />
      <directionalLight position={[-30, 18, 10]} color="#ffb37a" intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <ambientLight intensity={0.45} />

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[220, 220]} />
        <meshStandardMaterial color="#25314f" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 10]} receiveShadow>
        <planeGeometry args={[70, 10]} />
        <meshStandardMaterial color="#3a4766" roughness={0.95} />
      </mesh>
      <Runway />
      <Terminal />
      <ControlTower />
      <CargoHangar x={-4} />
      <CargoHangar x={8} />
      <Containers />
      <ParcelConveyor />
      <DeliveryVan />
      <CargoPlane />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.35}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.4}
        target={[2, 0, -5]}
      />
    </Canvas>
  );
}
