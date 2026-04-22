import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three-stdlib";
import { RenderPass } from "three-stdlib";
import { UnrealBloomPass } from "three-stdlib";

export function JarvisCore3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // --- Scene / camera / renderer ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000814, 0.05);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 11);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    // --- Bloom post-processing for cinematic glow ---
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(width, height);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.6, // strength
      0.85, // radius
      0.05 // threshold
    );
    composer.addPass(bloom);

    // --- Color palette ---
    const cyan = new THREE.Color(0x00e5ff);
    const blue = new THREE.Color(0x2a7bff);
    const deepBlue = new THREE.Color(0x0a2a55);
    const orange = new THREE.Color(0xff7a1a);
    const white = new THREE.Color(0xffffff);

    // --- Lights ---
    scene.add(new THREE.AmbientLight(0x102030, 0.4));

    const keyLight = new THREE.PointLight(cyan, 8, 25);
    keyLight.position.set(2.5, 2.5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(blue, 6, 22);
    rimLight.position.set(-3.5, -2.5, 3);
    scene.add(rimLight);

    const accent = new THREE.PointLight(orange, 2.5, 12);
    accent.position.set(0, 0, -2.5);
    scene.add(accent);

    const coreLight = new THREE.PointLight(white, 3, 8);
    scene.add(coreLight);

    // --- HUD group ---
    const hud = new THREE.Group();
    scene.add(hud);

    // ============= INNER CORE =============
    // Bright white-hot center
    const heartGeo = new THREE.SphereGeometry(0.32, 64, 64);
    const heartMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
    });
    const heart = new THREE.Mesh(heartGeo, heartMat);
    hud.add(heart);

    // Cyan plasma sphere
    const plasmaGeo = new THREE.SphereGeometry(0.55, 64, 64);
    const plasmaMat = new THREE.MeshBasicMaterial({
      color: cyan,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const plasma = new THREE.Mesh(plasmaGeo, plasmaMat);
    hud.add(plasma);

    // Outer atmosphere glow
    const atmoGeo = new THREE.SphereGeometry(0.95, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uColor: { value: cyan },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 uColor;
        uniform float uTime;
        void main() {
          float intensity = pow(0.75 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          float pulse = 0.85 + sin(uTime * 2.0) * 0.15;
          gl_FragColor = vec4(uColor, intensity * pulse);
        }
      `,
    });
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    hud.add(atmo);

    // Wireframe icosahedron shell
    const shellGeo = new THREE.IcosahedronGeometry(1.15, 1);
    const shellMat = new THREE.MeshBasicMaterial({
      color: cyan,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    hud.add(shell);

    // ============= ARC REACTOR PLATES =============
    // Triangular plates rotating around the core (like the Mark suits)
    const platesGroup = new THREE.Group();
    const plateCount = 12;
    for (let i = 0; i < plateCount; i++) {
      const plateGeo = new THREE.PlaneGeometry(0.45, 0.18);
      const plateMat = new THREE.MeshBasicMaterial({
        color: cyan,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const plate = new THREE.Mesh(plateGeo, plateMat);
      const angle = (i / plateCount) * Math.PI * 2;
      plate.position.set(Math.cos(angle) * 1.45, Math.sin(angle) * 1.45, 0);
      plate.lookAt(0, 0, 0);
      platesGroup.add(plate);

      // Border line for each plate
      const edges = new THREE.EdgesGeometry(plateGeo);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.9 })
      );
      line.position.copy(plate.position);
      line.lookAt(0, 0, 0);
      platesGroup.add(line);
    }
    hud.add(platesGroup);

    // ============= CONCENTRIC RINGS =============
    type RingDef = { mesh: THREE.Mesh; speed: THREE.Vector3 };
    const rings: RingDef[] = [];
    const ringConfigs = [
      { r: 1.85, t: 0.025, segments: 8, color: cyan, opacity: 1.0, tilt: [0.15, 0, 0] },
      { r: 2.15, t: 0.012, segments: 200, color: blue, opacity: 0.7, tilt: [-0.4, 0.5, 0.1] },
      { r: 2.5, t: 0.008, segments: 200, color: cyan, opacity: 0.6, tilt: [0.6, -0.3, 0.2] },
      { r: 2.9, t: 0.018, segments: 200, color: blue, opacity: 0.5, tilt: [-0.2, 0.7, -0.3] },
      { r: 3.4, t: 0.006, segments: 200, color: cyan, opacity: 0.4, tilt: [0.5, 0.4, 0.1] },
      { r: 4.0, t: 0.004, segments: 200, color: deepBlue, opacity: 0.6, tilt: [0.1, 0.2, 0.4] },
    ];
    ringConfigs.forEach((cfg, i) => {
      const geo = new THREE.TorusGeometry(cfg.r, cfg.t, 16, cfg.segments);
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
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (i % 2 === 0 ? 1 : -1) * (0.1 + Math.random() * 0.3)
        ),
      });
    });

    // ============= SEGMENTED ARCS =============
    const arcGroup = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const arcCurve = new THREE.EllipseCurve(
        0, 0, 2.3, 2.3,
        (i / 6) * Math.PI * 2,
        (i / 6) * Math.PI * 2 + 0.45,
        false, 0
      );
      const points = arcCurve.getPoints(48).map((p) => new THREE.Vector3(p.x, p.y, 0));
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: i % 2 ? cyan : blue,
        transparent: true,
        opacity: 1.0,
      });
      arcGroup.add(new THREE.Line(geo, mat));
    }
    hud.add(arcGroup);

    // Counter-rotating arc set
    const arcGroup2 = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const arcCurve = new THREE.EllipseCurve(
        0, 0, 2.7, 2.7,
        (i / 4) * Math.PI * 2,
        (i / 4) * Math.PI * 2 + 0.6,
        false, 0
      );
      const points = arcCurve.getPoints(60).map((p) => new THREE.Vector3(p.x, p.y, 0));
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: cyan,
        transparent: true,
        opacity: 0.8,
      });
      arcGroup2.add(new THREE.Line(geo, mat));
    }
    arcGroup2.rotation.x = 0.4;
    hud.add(arcGroup2);

    // ============= TICK MARKS RING =============
    const tickGroup = new THREE.Group();
    const tickCount = 60;
    for (let i = 0; i < tickCount; i++) {
      const angle = (i / tickCount) * Math.PI * 2;
      const isMajor = i % 5 === 0;
      const len = isMajor ? 0.18 : 0.08;
      const r1 = 3.6;
      const r2 = r1 + len;
      const points = [
        new THREE.Vector3(Math.cos(angle) * r1, Math.sin(angle) * r1, 0),
        new THREE.Vector3(Math.cos(angle) * r2, Math.sin(angle) * r2, 0),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: cyan,
        transparent: true,
        opacity: isMajor ? 1.0 : 0.5,
      });
      tickGroup.add(new THREE.Line(geo, mat));
    }
    hud.add(tickGroup);

    // ============= PARTICLE FIELD =============
    const particleCount = 1200;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const radius = 1.6 + Math.random() * 3.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * 0.8;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.sin(phi) * radius * 0.7;
      positions[i * 3 + 2] = Math.sin(theta) * radius;
      const c = Math.random() > 0.85 ? white : Math.random() > 0.5 ? cyan : blue;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      speeds[i] = 0.15 + Math.random() * 0.7;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const pMat = new THREE.PointsMaterial({
      size: 0.035,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(pGeo, pMat);
    hud.add(particles);

    // ============= LIGHT BEAMS (vertical streaks) =============
    const beamGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const beamGeo = new THREE.PlaneGeometry(0.04, 5);
      const beamMat = new THREE.MeshBasicMaterial({
        color: cyan,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(Math.cos(angle) * 2.2, 0, Math.sin(angle) * 2.2);
      beam.lookAt(0, 0, 0);
      beamGroup.add(beam);
    }
    hud.add(beamGroup);

    // --- Mouse parallax ---
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
      composer.setSize(w, h);
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
      const dt = Math.min(clock.getDelta(), 0.05);

      // Smooth mouse follow
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      hud.rotation.y = mouse.x * 0.4;
      hud.rotation.x = mouse.y * 0.3;

      // Rings spin
      rings.forEach(({ mesh, speed }) => {
        mesh.rotation.x += speed.x * dt;
        mesh.rotation.y += speed.y * dt;
        mesh.rotation.z += speed.z * dt;
      });

      // Arcs counter-rotate
      arcGroup.rotation.z -= 0.5 * dt;
      arcGroup2.rotation.z += 0.7 * dt;
      arcGroup2.rotation.y += 0.2 * dt;
      tickGroup.rotation.z += 0.08 * dt;

      // Plates orbit and shimmer
      platesGroup.rotation.z += 0.4 * dt;
      platesGroup.children.forEach((child, i) => {
        const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial | THREE.LineBasicMaterial;
        if ("opacity" in m) {
          m.opacity = 0.4 + Math.sin(t * 2 + i * 0.5) * 0.3;
        }
      });

      // Core breathing
      const pulse1 = 1 + Math.sin(t * 2.4) * 0.08;
      const pulse2 = 1 + Math.sin(t * 1.8) * 0.12;
      const pulse3 = 1 + Math.sin(t * 4.5) * 0.2;
      shell.scale.setScalar(pulse1);
      shell.rotation.x += 0.15 * dt;
      shell.rotation.y += 0.1 * dt;
      plasma.scale.setScalar(pulse2);
      atmo.scale.setScalar(1 + Math.sin(t * 1.4) * 0.05);
      heart.scale.setScalar(pulse3);
      heartMat.opacity = 0.85 + Math.sin(t * 4.5) * 0.15;
      atmoMat.uniforms.uTime.value = t;

      // Beams pulse
      beamGroup.rotation.y += 0.3 * dt;
      beamGroup.children.forEach((child, i) => {
        const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        m.opacity = 0.1 + Math.sin(t * 2 + i) * 0.15;
      });

      // Particles drift
      const pos = pGeo.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const ix = i * 3;
        const x = arr[ix];
        const z = arr[ix + 2];
        const angle = speeds[i] * dt;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        arr[ix] = x * cos - z * sin;
        arr[ix + 2] = x * sin + z * cos;
        arr[ix + 1] += Math.sin(t + i) * 0.0008;
      }
      pos.needsUpdate = true;

      // Lights track mouse + pulse
      keyLight.position.x = 2.5 + mouse.x * 3;
      keyLight.position.y = 2.5 + mouse.y * 3;
      keyLight.intensity = 7 + Math.sin(t * 2) * 2;
      rimLight.position.x = -3.5 - mouse.x * 2;
      rimLight.position.y = -2.5 - mouse.y * 2;
      coreLight.intensity = 2.5 + Math.sin(t * 4.5) * 1.5;

      // Bloom pulse for cinematic feel
      bloom.strength = 1.5 + Math.sin(t * 1.6) * 0.25;

      composer.render();
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouseMove);
      ro.disconnect();
      renderer.dispose();
      composer.dispose();
      heartGeo.dispose();
      heartMat.dispose();
      plasmaGeo.dispose();
      plasmaMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      shellGeo.dispose();
      shellMat.dispose();
      pGeo.dispose();
      pMat.dispose();
      rings.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      [arcGroup, arcGroup2, tickGroup, platesGroup, beamGroup].forEach((g) => {
        g.children.forEach((c) => {
          const m = c as THREE.Mesh | THREE.Line | THREE.LineSegments;
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        });
      });
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="absolute inset-0" />
      {/* Soft vignette overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, oklch(0.05 0.02 250 / 0.6) 100%)",
        }}
      />
      {/* JARVIS label */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center mix-blend-screen">
          <div className="font-display text-3xl font-bold tracking-[0.5em] text-white"
            style={{ textShadow: "0 0 20px var(--hud-cyan), 0 0 40px var(--hud-cyan)" }}>
            JARVIS
          </div>
          <div className="mt-2 font-mono text-[10px] tracking-[0.6em] text-hud-cyan/90 animate-flicker">
            ◣ CORE · ACTIVE ◢
          </div>
        </div>
      </div>
    </div>
  );
}
