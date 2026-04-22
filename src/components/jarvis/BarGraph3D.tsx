import { useEffect, useRef } from "react";
import * as THREE from "three";

export type BarData = {
  label: string;
  value: number; // 0..100
  color?: number;
};

export function BarGraph3D({
  data,
  height = 220,
}: {
  data: BarData[];
  height?: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    camera.position.set(3.5, 4.5, 7.5);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // --- Lights ---
    scene.add(new THREE.AmbientLight(0x445577, 0.6));
    const key = new THREE.PointLight(0x00e5ff, 5, 20);
    key.position.set(3, 6, 4);
    scene.add(key);
    const rim = new THREE.PointLight(0x2a7bff, 3, 18);
    rim.position.set(-4, 3, -2);
    scene.add(rim);

    // --- Floor grid ---
    const grid = new THREE.GridHelper(8, 16, 0x00d4ff, 0x0a3a66);
    (grid.material as THREE.LineBasicMaterial).transparent = true;
    (grid.material as THREE.LineBasicMaterial).opacity = 0.35;
    scene.add(grid);

    // --- Floor plate ---
    const floorGeo = new THREE.RingGeometry(0.2, 4, 64);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.001;
    scene.add(floor);

    // --- Build bars ---
    const group = new THREE.Group();
    scene.add(group);

    const barCount = data.length;
    const spacing = 1.0;
    const startX = -((barCount - 1) * spacing) / 2;

    type BarMesh = {
      mesh: THREE.Mesh;
      glow: THREE.Mesh;
      cap: THREE.Mesh;
      targetHeight: number;
      currentHeight: number;
      color: THREE.Color;
    };
    const bars: BarMesh[] = [];

    data.forEach((d, i) => {
      const color = new THREE.Color(d.color ?? 0x00e5ff);

      // Main bar
      const geo = new THREE.BoxGeometry(0.55, 1, 0.55);
      const mat = new THREE.MeshPhongMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.85,
        shininess: 100,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.x = startX + i * spacing;
      mesh.position.y = 0;
      mesh.scale.y = 0.01;
      group.add(mesh);

      // Wireframe glow shell
      const glowGeo = new THREE.BoxGeometry(0.6, 1, 0.6);
      const glowMat = new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.x = mesh.position.x;
      glow.scale.y = 0.01;
      group.add(glow);

      // Top cap (bright)
      const capGeo = new THREE.BoxGeometry(0.6, 0.04, 0.6);
      const capMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.x = mesh.position.x;
      cap.position.y = 0;
      group.add(cap);

      bars.push({
        mesh,
        glow,
        cap,
        targetHeight: Math.max(0.05, d.value / 25),
        currentHeight: 0.01,
        color,
      });
    });

    // --- Resize ---
    const ro = new ResizeObserver(() => {
      const ww = mount.clientWidth;
      const hh = mount.clientHeight;
      renderer.setSize(ww, hh);
      camera.aspect = ww / hh;
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    // --- Animate ---
    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => {
      const t = clock.getElapsedTime();
      const dt = Math.min(clock.getDelta(), 0.05);

      // Update target heights from latest data
      const latest = dataRef.current;
      bars.forEach((b, i) => {
        const v = latest[i]?.value ?? 0;
        b.targetHeight = Math.max(0.05, v / 25);
      });

      // Smooth height animation
      bars.forEach((b) => {
        b.currentHeight += (b.targetHeight - b.currentHeight) * Math.min(1, dt * 4);
        const sy = b.currentHeight;
        b.mesh.scale.y = sy;
        b.mesh.position.y = sy / 2;
        b.glow.scale.y = sy;
        b.glow.position.y = sy / 2;
        b.cap.position.y = sy + 0.02;

        // Pulse emissive
        const pulse = 0.5 + Math.sin(t * 3 + b.mesh.position.x) * 0.25;
        (b.mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = pulse;
      });

      // Slow rotation
      group.rotation.y = Math.sin(t * 0.3) * 0.25;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      (grid.geometry as THREE.BufferGeometry).dispose();
      (grid.material as THREE.Material).dispose();
      bars.forEach((b) => {
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        b.glow.geometry.dispose();
        (b.glow.material as THREE.Material).dispose();
        b.cap.geometry.dispose();
        (b.cap.material as THREE.Material).dispose();
      });
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.length]);

  return (
    <div className="w-full" style={{ height }}>
      <div ref={mountRef} className="relative h-full w-full" />
      {/* Labels under graph */}
      <div
        className="grid gap-1 px-2 pt-1"
        style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
      >
        {data.map((d) => (
          <div key={d.label} className="text-center">
            <div className="font-display text-[9px] tracking-[0.25em] text-hud-cyan truncate">
              {d.label}
            </div>
            <div className="font-mono text-[10px] text-foreground hud-text-glow tabular-nums">
              {Math.round(d.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
