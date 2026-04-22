import { useEffect, useRef } from "react";
import * as THREE from "three";

export function JarvisCore3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const cyan = new THREE.Color(0x00d4ff);
    const blue = new THREE.Color(0x4a8cff);
    const orange = new THREE.Color(0xff6a00);

    // --- Lights (responsive to mouse) ---
    const ambient = new THREE.AmbientLight(0x224466, 0.6);
    scene.add(ambient);

    const keyLight = new THREE.PointLight(cyan, 6, 20);
    keyLight.position.set(2, 2, 4);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(blue, 4, 18);
    rimLight.position.set(-3, -2, 3);
    scene.add(rimLight);

    const accent = new THREE.PointLight(orange, 1.2, 10);
    accent.position.set(0, 0, -2);
    scene.add(accent);

    // --- Group for the whole HUD ---
    const hud = new THREE.Group();
    scene.add(hud);

    // --- Inner core sphere (icosahedron wireframe + glow) ---
    const coreGeo = new THREE.IcosahedronGeometry(0.95, 1);
    const coreMat = new THREE.MeshPhongMaterial({
      color: cyan,
      emissive: cyan,
      emissiveIntensity: 0.6,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    hud.add(core);

    // Inner glow sphere
    const glowGeo = new THREE.SphereGeometry(0.78, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: cyan,
      transparent: true,
      opacity: 0.18,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    hud.add(glow);

    // Bright core point
    const heartGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const heartMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
    const heart = new THREE.Mesh(heartGeo, heartMat);
    hud.add(heart);

    // --- Concentric rings (torus, varied tilts) ---
    const rings: { mesh: THREE.Mesh; speed: THREE.Vector3 }[] = [];
    const ringConfigs = [
      { r: 1.6, t: 0.02, color: cyan, opacity: 0.9, tilt: [0.2, 0.1, 0] },
      { r: 1.9, t: 0.015, color: blue, opacity: 0.8, tilt: [-0.3, 0.4, 0.1] },
      { r: 2.3, t: 0.01, color: cyan, opacity: 0.7, tilt: [0.5, -0.2, 0.2] },
      { r: 2.7, t: 0.008, color: blue, opacity: 0.5, tilt: [-0.1, 0.6, -0.3] },
      { r: 3.2, t: 0.012, color: cyan, opacity: 0.4, tilt: [0.4, 0.3, 0.1] },
    ];
    ringConfigs.forEach((cfg, i) => {
      const geo = new THREE.TorusGeometry(cfg.r, cfg.t, 16, 200);
      const mat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.set(cfg.tilt[0], cfg.tilt[1], cfg.tilt[2]);
      hud.add(ring);
      rings.push({
        mesh: ring,
        speed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
          (i % 2 === 0 ? 1 : -1) * (0.15 + Math.random() * 0.25)
        ),
      });
    });

    // --- Segmented arcs around the core ---
    const arcGroup = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const arcCurve = new THREE.EllipseCurve(
        0, 0, 2.05, 2.05,
        (i / 8) * Math.PI * 2,
        (i / 8) * Math.PI * 2 + 0.35,
        false, 0
      );
      const points = arcCurve.getPoints(32).map((p) => new THREE.Vector3(p.x, p.y, 0));
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: i % 2 ? cyan : blue,
        transparent: true,
        opacity: 0.9,
      });
      const arc = new THREE.Line(geo, mat);
      arcGroup.add(arc);
    }
    hud.add(arcGroup);

    // --- Outer dashed disk ---
    const diskGeo = new THREE.RingGeometry(3.6, 3.65, 128);
    const diskMat = new THREE.MeshBasicMaterial({
      color: cyan,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const disk = new THREE.Mesh(diskGeo, diskMat);
    disk.rotation.x = Math.PI / 2.2;
    hud.add(disk);

    // --- Particle field orbiting the core ---
    const particleCount = 600;
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const radius = 1.4 + Math.random() * 2.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * 0.5;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.sin(phi) * radius * 0.6;
      positions[i * 3 + 2] = Math.sin(theta) * radius;
      speeds[i] = 0.2 + Math.random() * 0.6;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: cyan,
      size: 0.04,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(pGeo, pMat);
    hud.add(particles);

    // --- Mouse responsive lighting & rotation ---
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.ty = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    window.addEventListener("mousemove", onMouseMove);

    // --- Resize ---
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // --- Animate ---
    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => {
      const t = clock.getElapsedTime();
      const dt = clock.getDelta();

      // Smooth mouse follow
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;

      // HUD parallax tilt
      hud.rotation.y = mouse.x * 0.35;
      hud.rotation.x = mouse.y * 0.25;

      // Rings spin
      rings.forEach(({ mesh, speed }) => {
        mesh.rotation.x += speed.x * dt;
        mesh.rotation.y += speed.y * dt;
        mesh.rotation.z += speed.z * dt;
      });

      // Arc and disk
      arcGroup.rotation.z -= 0.6 * dt;
      disk.rotation.z += 0.2 * dt;

      // Core breathing
      const pulse = 1 + Math.sin(t * 2.2) * 0.05;
      core.scale.setScalar(pulse);
      glow.scale.setScalar(1 + Math.sin(t * 1.6) * 0.08);
      heart.scale.setScalar(1 + Math.sin(t * 4) * 0.15);
      (heartMat as THREE.MeshBasicMaterial).opacity = 0.7 + Math.sin(t * 4) * 0.25;

      // Particles drift
      const pos = pGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        const ix = i * 3;
        const x = pos.array[ix] as number;
        const z = pos.array[ix + 2] as number;
        const angle = speeds[i] * dt;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        (pos.array as Float32Array)[ix] = x * cos - z * sin;
        (pos.array as Float32Array)[ix + 2] = x * sin + z * cos;
      }
      pos.needsUpdate = true;

      // Lights follow mouse
      keyLight.position.x = 2 + mouse.x * 3;
      keyLight.position.y = 2 + mouse.y * 3;
      keyLight.intensity = 5 + Math.sin(t * 2) * 1.5;
      rimLight.position.x = -3 - mouse.x * 2;
      rimLight.position.y = -2 - mouse.y * 2;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouseMove);
      ro.disconnect();
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      heartGeo.dispose();
      heartMat.dispose();
      diskGeo.dispose();
      diskMat.dispose();
      pGeo.dispose();
      pMat.dispose();
      rings.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative h-[520px] w-full max-w-[560px]">
      <div ref={mountRef} className="absolute inset-0" />
      {/* JARVIS label overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="font-display text-2xl font-bold tracking-[0.4em] text-foreground hud-text-glow">
            JARVIS
          </div>
          <div className="mt-1 font-mono text-[9px] tracking-[0.5em] text-hud-cyan/80 animate-flicker">
            CORE · ACTIVE
          </div>
        </div>
      </div>
    </div>
  );
}
