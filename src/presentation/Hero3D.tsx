/** 3D produktový záběr (three.js, načítá se líně). Textury se kreslí ze
 *  stejných SVG jako hra: deska, zvířata, karty. */
import { useEffect, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as THREE from "three";
import { ANIMAL_DEFS, ANIMAL_IDS } from "@data/animals";
import type { AnimalId } from "@data/types";
import { Board } from "@art/board/Board";
import { AnimalSvg } from "@art/karel/AnimalSvg";

function svgImage(markup: string, w: number, h: number): Promise<HTMLCanvasElement> {
  return new Promise((res) => {
    const svg = markup.includes("xmlns=") ? markup : markup.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      res(c);
    };
    img.onerror = () => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      res(c);
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

function sideTexture(title: boolean) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#2d5a3d";
  g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = "rgba(240,232,146,.55)";
  g.lineWidth = 6;
  g.strokeRect(18, 18, 988, 220);
  if (title) {
    g.fillStyle = "#f7f2e7";
    g.font = "700 96px Fraunces, Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("Než přijde zima", 512, 118);
    g.fillStyle = "#f0e892";
    g.font = "700 30px 'Plus Jakarta Sans', sans-serif";
    g.fillText("KOOPERATIVNÍ HRA Z LOUKY · 1–4 HRÁČI · 8+", 512, 196);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function cardTexture(color: string, kicker: string, title: string) {
  const c = document.createElement("canvas");
  c.width = 315;
  c.height = 440;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fbf3dc";
  g.fillRect(0, 0, 315, 440);
  g.fillStyle = color;
  g.fillRect(0, 0, 315, 92);
  g.strokeStyle = "rgba(61,51,38,.5)";
  g.lineWidth = 3;
  g.strokeRect(9, 9, 297, 422);
  g.fillStyle = "#fffaf0";
  g.font = "700 15px 'Plus Jakarta Sans', sans-serif";
  g.fillText(kicker.toUpperCase(), 20, 36);
  g.font = "700 30px Fraunces, Georgia, serif";
  g.fillText(title, 20, 74);
  g.fillStyle = "#f1ead2";
  g.fillRect(20, 120, 275, 90);
  g.fillStyle = "rgba(42,36,24,.35)";
  for (let i = 0; i < 5; i++) g.fillRect(20, 236 + i * 26, 160 + ((i * 47) % 100), 10);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function Hero3D({ onReady }: { onReady?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let raf = 0;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    camera.position.set(0, 26, 46);
    camera.lookAt(0, 0, -1);
    scene.add(new THREE.HemisphereLight(0xfff6e0, 0x5a6a40, 1.25));
    const sun = new THREE.DirectionalLight(0xfff1d6, 2.3);
    sun.position.set(-18, 34, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.radius = 6;
    scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.18 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const rig = new THREE.Group();
    scene.add(rig);

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w < 700 ? 50 : 34;
      rig.position.x = w < 700 ? 0 : 3.5;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const target = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove);

    (async () => {
      await document.fonts?.ready;
      const boardCanvas = await svgImage(renderToStaticMarkup(<Board />), 1600, 1600);
      if (disposed) return;
      const boardTex = new THREE.CanvasTexture(boardCanvas);
      boardTex.colorSpace = THREE.SRGBColorSpace;
      boardTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

      // rozložená deska
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(24, 0.35, 24),
        [
          new THREE.MeshStandardMaterial({ color: 0x2d5a3d }),
          new THREE.MeshStandardMaterial({ color: 0x2d5a3d }),
          new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.85 }),
          new THREE.MeshStandardMaterial({ color: 0x1f3d2a }),
          new THREE.MeshStandardMaterial({ color: 0x2d5a3d }),
          new THREE.MeshStandardMaterial({ color: 0x2d5a3d }),
        ],
      );
      board.position.set(2, 0.18, 0);
      board.rotation.y = -0.18;
      board.receiveShadow = true;
      board.castShadow = true;
      rig.add(board);

      // krabice v pozadí
      const side = sideTexture(true);
      const plain = sideTexture(false);
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(17, 5.2, 17),
        [
          new THREE.MeshStandardMaterial({ map: plain }),
          new THREE.MeshStandardMaterial({ map: plain }),
          new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.6 }),
          new THREE.MeshStandardMaterial({ color: 0x1f3d2a }),
          new THREE.MeshStandardMaterial({ map: side }),
          new THREE.MeshStandardMaterial({ map: plain }),
        ],
      );
      box.position.set(13, 2.6, -13);
      box.rotation.set(0, -0.45, 0);
      box.castShadow = true;
      box.receiveShadow = true;
      rig.add(box);

      // vějíř karet
      const cards: [string, string, string][] = [
        ["#d9a32a", "Počasí · léto", "Senoseč"],
        ["#b85c3c", "Potřeba · Princezna", "Slintavá potopa"],
        ["#2d5a3d", "Pomocník · Tomáš", "Strůjce všeho"],
        ["#1f3d2a", "Projekt Louky", "Hmyzí hotel"],
        ["#3f6a78", "Pomocník · Tony", "Čerpadlo"],
      ];
      cards.forEach(([color, kicker, title], i) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.05, 8.8), [
          new THREE.MeshStandardMaterial({ color: 0xfbf3dc }),
          new THREE.MeshStandardMaterial({ color: 0xfbf3dc }),
          new THREE.MeshStandardMaterial({ map: cardTexture(color, kicker, title) }),
          new THREE.MeshStandardMaterial({ color: 0x2d5a3d }),
          new THREE.MeshStandardMaterial({ color: 0xfbf3dc }),
          new THREE.MeshStandardMaterial({ color: 0xfbf3dc }),
        ]);
        m.position.set(9 + i * 0.75, 0.45 + i * 0.07, 14.5 - i * 0.2);
        m.rotation.set(0, 0.7 - i * 0.2, 0);
        m.castShadow = true;
        rig.add(m);
      });

      // figurky: silueta zvířete na kulatém podstavci s barvou hráče
      const placements: [AnimalId, number, number][] = [
        ["karel", -4, 7.5],
        ["pogo", 0, 9],
        ["avala", 4.5, 7.8],
        ["kveta", 8.5, 5],
        ["flicek", -7.5, 4.2],
        ["yakul", 7, 10.5],
      ];
      for (const [id, x, z] of placements) {
        const cv = await svgImage(renderToStaticMarkup(<AnimalSvg id={id} shadow={false} />), 512, 440);
        if (disposed) return;
        const tex = new THREE.CanvasTexture(cv);
        tex.colorSpace = THREE.SRGBColorSpace;
        const fig = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.1), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
        fig.position.set(x, 1.95, z);
        fig.castShadow = true;
        fig.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.4 });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.35, 0.3, 40), new THREE.MeshStandardMaterial({ color: new THREE.Color(ANIMAL_DEFS[id].marker.ring), roughness: 0.5 }));
        base.position.set(x, 0.5, z);
        base.castShadow = true;
        const g = new THREE.Group();
        g.add(fig, base);
        g.userData = { fig, phase: x * 0.7 };
        rig.add(g);
      }
      void ANIMAL_IDS;
      onReady?.();
    })();

    const clock = new THREE.Clock();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      const t = clock.getElapsedTime();
      if (!reduced) {
        rig.rotation.y += ((target.x * 0.25 + Math.sin(t * 0.25) * 0.08) - rig.rotation.y) * 0.04;
        rig.rotation.x += (target.y * 0.05 - rig.rotation.x) * 0.04;
      }
      for (const g of rig.children) {
        const d = g.userData as { fig?: THREE.Mesh; phase?: number };
        if (d.fig) {
          d.fig.lookAt(camera.position.x, d.fig.position.y + 2, camera.position.z);
          if (!reduced) d.fig.position.y = 1.95 + Math.max(0, Math.sin(t * 2 + (d.phase ?? 0))) * 0.25;
        }
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      if (e.isIntersecting) tick();
    });
    io.observe(el);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [onReady]);
  return <div ref={host} className="absolute inset-0" aria-hidden />;
}

export default Hero3D;
