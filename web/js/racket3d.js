/**
 * PP PINGIS — 3D Racket Engine (Three.js)
 * Fotorealistisk, interaktiv 3D-bordtennisracket för både Hero och Racketverkstaden.
 */

window.PPRacket3D = (function () {
  "use strict";

  // Inget ljud: hela ljudmotorn är borttagen (ägarbeslut 2026-09-14). Ingen
  // AudioContext skapas någonstans i appen.

  // Hjälpfunktion för att rita träådring på canvas
  function createWoodTexture(opts = {}) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    const baseColor = opts.baseColor || "#d9b382";
    const grainColor = opts.grainColor || "#9e6f38";
    const printText = opts.text || "";

    // Bas med subtil gradient för djup
    const bgGrad = ctx.createRadialGradient(512, 480, 100, 512, 512, 650);
    bgGrad.addColorStop(0, baseColor);
    bgGrad.addColorStop(1, darkenHex(baseColor, 18));
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Primär ådring (finare, mer naturlig variation)
    ctx.strokeStyle = grainColor;
    ctx.globalAlpha = 0.1;
    for (let i = -200; i < 1200; i += 3 + Math.random() * 4) {
      ctx.beginPath();
      ctx.lineWidth = 0.6 + Math.random() * 1.2;
      let y = i;
      ctx.moveTo(0, y);
      const freq = 0.008 + Math.random() * 0.012;
      const amp = 1.5 + Math.random() * 2.5;
      for (let x = 0; x <= 1024; x += 16) {
        y += Math.sin((x + i) * freq) * amp + (Math.random() - 0.5) * 1.2;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Sekundär tjockare ådring (sparsam)
    ctx.globalAlpha = 0.06;
    ctx.lineWidth = 2.5;
    for (let i = 50; i < 1000; i += 40 + Math.random() * 60) {
      ctx.beginPath();
      let y = i;
      ctx.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 24) {
        y += Math.sin((x + i * 0.7) * 0.006) * 4 + (Math.random() - 0.5) * 2;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Årsringar / virvlar (mer naturliga, variabel storlek)
    ctx.globalAlpha = 0.05;
    ctx.lineWidth = 1.5;
    for (let j = 0; j < 12; j++) {
      const cx = 100 + j * 80 + Math.random() * 40;
      const cy = 350 + (j % 4) * 80 + Math.random() * 60;
      const r = 50 + j * 15 + Math.random() * 30;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * (0.6 + Math.random() * 0.4), Math.random() * 0.3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Subtil kantvinjett (mörknare kanter för djup)
    ctx.globalAlpha = 1;
    const vignette = ctx.createRadialGradient(512, 480, 280, 512, 512, 580);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.12)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 1024, 1024);

    // Tryckt logotyp på träbladet
    if (printText) {
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = "#1a0f05";
      ctx.textAlign = "center";

      // Huvudtext — stor och elegant
      ctx.font = "bold 44px Archivo, system-ui, sans-serif";
      ctx.fillText(printText.toUpperCase(), 512, 400);

      ctx.globalAlpha = 0.06;
      ctx.font = "18px 'Space Mono', ui-monospace, monospace";
      ctx.fillStyle = "#3d2814";
      ctx.fillText("5-PLY NATURAL WOOD + CARBON", 512, 440);
      ctx.fillText("OFFENSIVE CLASS · MADE IN GERMANY", 512, 466);

      // Subtil skuggeffekt genom att rita texten igen med offset
      ctx.globalAlpha = 0.03;
      ctx.fillStyle = "#000000";
      ctx.font = "bold 44px Archivo, system-ui, sans-serif";
      ctx.fillText(printText.toUpperCase(), 513, 402);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return colorTexture(tex);
  }

  // Hjälpfunktion för att mörkna en hex-färg
  function darkenHex(hex, amount) {
    hex = hex.replace("#", "");
    let r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
    let g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
    let b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
    return "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("");
  }

  // r128: färger på canvas-texturer måste märkas sRGB, annars blir lacken grå.
  function colorTexture(tex) {
    if (tex.encoding !== undefined && THREE.sRGBEncoding !== undefined) {
      tex.encoding = THREE.sRGBEncoding;
    }
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }

  // Studiomiljö från en 2D-gradient (ingen extra fil). PMREM ger riktiga
  // speglingar i clearcoat, vilket är det som får gummi och trälack att läsas
  // som material i stället för plast.
  function makeStudioEnv(renderer) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d");
    const sky = ctx.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, "#d9d3c8");
    sky.addColorStop(0.38, "#8c8680");
    sky.addColorStop(0.5, "#3a3633");
    sky.addColorStop(1, "#141312");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 512, 256);

    const windowGlow = ctx.createRadialGradient(150, 64, 8, 150, 64, 110);
    windowGlow.addColorStop(0, "rgba(255, 214, 170, 0.9)");
    windowGlow.addColorStop(1, "rgba(255, 214, 170, 0)");
    ctx.fillStyle = windowGlow;
    ctx.fillRect(0, 0, 512, 140);

    const fill = ctx.createRadialGradient(400, 200, 10, 400, 200, 90);
    fill.addColorStop(0, "rgba(180, 200, 220, 0.28)");
    fill.addColorStop(1, "rgba(180, 200, 220, 0)");
    ctx.fillStyle = fill;
    ctx.fillRect(256, 128, 256, 128);

    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    colorTexture(tex);

    if (!THREE.PMREMGenerator) return tex;
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      if (pmrem.compileEquirectangularShader) pmrem.compileEquirectangularShader();
      const env = pmrem.fromEquirectangular(tex).texture;
      tex.dispose();
      pmrem.dispose();
      return env;
    } catch (err) {
      return tex;
    }
  }

  function createContactShadow() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(128, 128, 18, 128, 128, 118);
    g.addColorStop(0, "rgba(0,0,0,0.42)");
    g.addColorStop(0.45, "rgba(0,0,0,0.18)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.2), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, -1.42, 0.04);
    mesh.renderOrder = -1;
    return mesh;
  }

  // Skapa kanttextur som simulerar plywood-fanerlager (5 lager trä/karbon)
  function createPlywoodEdgeTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    const layers = [
      "#d9b382", // Limba ytter
      "#383533", // Karbon
      "#e5c699", // Ayous mitt
      "#383533", // Karbon
      "#d9b382", // Limba ytter
    ];

    const h = 256 / layers.length;
    layers.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, i * h, 64, h);
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 1);
    return colorTexture(tex);
  }

  // Skapa gummimaterial med ITTF-stämpel i nederkant
  function createRubberTexture(name, isRed = true, colorHex = null) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    let base = isRed ? "#d41c1c" : "#17181c";
    if (colorHex) base = colorHex;

    // Bas med subtil radiell gradient för djup
    const grad = ctx.createRadialGradient(512, 460, 120, 512, 512, 600);
    grad.addColorStop(0, lightenHex(base, 12));
    grad.addColorStop(1, base);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Ytstruktur / mikrogrepp (tätare mönster för realism)
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.018;
    for (let y = 0; y < 1024; y += 3) {
      for (let x = 0; x < 1024; x += 3) {
        if ((x + y) % 5 < 2) ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // Sekundärt stipple-mönster (diagonal) för taktil textur
    ctx.globalAlpha = 0.012;
    for (let y = 0; y < 1024; y += 6) {
      for (let x = 0; x < 1024; x += 6) {
        if (((x * 3 + y * 7) % 17) < 3) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Subtil vinjett på gummiytan
    ctx.globalAlpha = 1;
    const vign = ctx.createRadialGradient(512, 500, 200, 512, 512, 560);
    vign.addColorStop(0, "rgba(0,0,0,0)");
    vign.addColorStop(1, "rgba(0,0,0,0.08)");
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, 1024, 1024);

    // ITTF-stämpel och logotyp — professionell certifieringsstil
    const stampY = 960;
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = isRed ? "#ff9999" : "#555555";
    ctx.lineWidth = 1;
    ctx.strokeRect(300, stampY - 30, 424, 50);

    ctx.fillStyle = isRed ? "#ffaaaa" : "#666666";
    ctx.font = "bold 16px 'Space Mono', ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("ITTF 24-009 · " + (name || "DONIC BLUESTAR").toUpperCase(), 512, stampY - 4);

    ctx.globalAlpha = 0.4;
    ctx.font = "12px 'Space Mono', ui-monospace, monospace";
    ctx.fillText("MADE IN GERMANY · TENSOR BIOS TECHNOLOGY", 512, stampY + 14);

    const tex = new THREE.CanvasTexture(canvas);
    return colorTexture(tex);
  }

  // Skapa en högkvalitativ bump map för ytgummits nabbstruktur
  function createRubberBumpMap() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#7a7a7a";
    ctx.fillRect(0, 0, 1024, 1024);

    const spacing = 11;
    for (let y = 0; y < 1024; y += spacing) {
      const row = Math.floor(y / spacing);
      const offsetX = row % 2 === 0 ? 0 : spacing / 2;
      for (let x = 0; x < 1024; x += spacing) {
        const cx = x + offsetX;
        const bump = ctx.createRadialGradient(cx, y, 0.4, cx, y, 4.2);
        bump.addColorStop(0, "#b4b4b4");
        bump.addColorStop(0.55, "#8e8e8e");
        bump.addColorStop(1, "#747474");
        ctx.fillStyle = bump;
        ctx.beginPath();
        ctx.arc(cx, y, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
  }

  // Hjälpfunktion för att ljusna en hex-färg
  function lightenHex(hex, amount) {
    hex = hex.replace("#", "");
    let r = Math.min(255, parseInt(hex.substr(0, 2), 16) + amount);
    let g = Math.min(255, parseInt(hex.substr(2, 2), 16) + amount);
    let b = Math.min(255, parseInt(hex.substr(4, 2), 16) + amount);
    return "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("");
  }

  // Skapa kantbandstextur
  function createEdgeTapeTexture(brandName = "PP PINGIS") {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    // Svart bas med subtil gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, "#151720");
    grad.addColorStop(0.5, "#111215");
    grad.addColorStop(1, "#151720");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 128);

    // Kantlinjer (accent)
    ctx.fillStyle = "#ff4a1c";
    ctx.fillRect(0, 0, 1024, 4);
    ctx.fillRect(0, 124, 1024, 4);

    // Subtila dekorlinjer innanför
    ctx.fillStyle = "rgba(255, 74, 28, 0.25)";
    ctx.fillRect(0, 6, 1024, 1);
    ctx.fillRect(0, 121, 1024, 1);

    // Mikro karbonfibermönster
    ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
    for (let y = 10; y < 118; y += 4) {
      for (let x = 0; x < 1024; x += 4) {
        if ((x + y) % 8 < 2) ctx.fillRect(x, y, 2, 2);
      }
    }

    // Text upprepad — centrerad och elegant
    ctx.fillStyle = "#f4f1ea";
    ctx.globalAlpha = 0.85;
    ctx.font = "bold 28px Archivo, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(brandName.toUpperCase() + "  ·  " + brandName.toUpperCase(), 512, 74);

    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#ff4a1c";
    ctx.fillText(brandName.toUpperCase() + "  ·  " + brandName.toUpperCase(), 512, 75);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(3, 1);
    return colorTexture(tex);
  }

  // ITTF-lik pärform: rundare huvud, tydlig midja mot halsen.
  function createBladeShape() {
    const shape = new THREE.Shape();
    shape.moveTo(-0.40, 0.0);
    shape.bezierCurveTo(-0.78, 0.22, -1.02, 0.68, -1.00, 1.16);
    shape.bezierCurveTo(-0.98, 1.58, -0.58, 2.00, 0.0, 2.06);
    shape.bezierCurveTo(0.58, 2.00, 0.98, 1.58, 1.00, 1.16);
    shape.bezierCurveTo(1.02, 0.68, 0.78, 0.22, 0.40, 0.0);
    shape.lineTo(0.36, -0.16);
    shape.bezierCurveTo(0.32, -0.28, 0.24, -0.34, 0.18, -0.36);
    shape.lineTo(-0.18, -0.36);
    shape.bezierCurveTo(-0.24, -0.34, -0.32, -0.28, -0.36, -0.16);
    shape.lineTo(-0.40, 0.0);
    return shape;
  }

  function createRubberShape() {
    const shape = new THREE.Shape();
    shape.moveTo(-0.42, 0.06);
    shape.bezierCurveTo(-0.80, 0.26, -1.03, 0.70, -1.01, 1.17);
    shape.bezierCurveTo(-0.99, 1.59, -0.58, 2.01, 0.0, 2.07);
    shape.bezierCurveTo(0.58, 2.01, 0.99, 1.59, 1.01, 1.17);
    shape.bezierCurveTo(1.03, 0.70, 0.80, 0.26, 0.42, 0.06);
    shape.bezierCurveTo(0.18, 0.10, -0.18, 0.10, -0.42, 0.06);
    return shape;
  }

  // Flared FL-handtag som lathe (ovala tvärsnittet via scale), inte en platt
  // extrusion. Rundare grepp är det som gör racketen läsbar som 3D-produkt.
  function createHandle() {
    const group = new THREE.Group();

    const profile = [
      new THREE.Vector2(0.175, 0.02),
      new THREE.Vector2(0.168, -0.16),
      new THREE.Vector2(0.162, -0.48),
      new THREE.Vector2(0.170, -0.82),
      new THREE.Vector2(0.215, -1.08),
      new THREE.Vector2(0.255, -1.24),
      new THREE.Vector2(0.160, -1.30),
      new THREE.Vector2(0.04, -1.315),
    ];
    const geom = new THREE.LatheGeometry(profile, 64);
    geom.scale(0.72, 1, 1);

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    const baseGrad = ctx.createLinearGradient(0, 0, 512, 0);
    baseGrad.addColorStop(0, "#6b4a28");
    baseGrad.addColorStop(0.18, "#c4a06a");
    baseGrad.addColorStop(0.5, "#e2c08a");
    baseGrad.addColorStop(0.82, "#c4a06a");
    baseGrad.addColorStop(1, "#6b4a28");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 512, 1024);

    ctx.strokeStyle = "#8a6236";
    ctx.lineWidth = 1.1;
    ctx.globalAlpha = 0.22;
    for (let i = -40; i < 1100; i += 5) {
      ctx.beginPath();
      let y = i;
      ctx.moveTo(0, y);
      for (let x = 0; x <= 512; x += 18) {
        y += Math.sin((x + i) * 0.02) * 1.4;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#1a1c22";
    ctx.fillRect(232, 0, 18, 1024);
    ctx.fillStyle = "#ff4a1c";
    ctx.fillRect(250, 0, 6, 1024);
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(256, 0, 8, 1024);

    const handleTex = colorTexture(new THREE.CanvasTexture(canvas));
    handleTex.wrapS = THREE.RepeatWrapping;
    handleTex.wrapT = THREE.ClampToEdgeWrapping;
    const handleMat = new THREE.MeshPhysicalMaterial({
      map: handleTex,
      roughness: 0.38,
      metalness: 0.04,
      clearcoat: 0.32,
      clearcoatRoughness: 0.35,
      envMapIntensity: 0.85,
    });

    const mesh = new THREE.Mesh(geom, handleMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const lensGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.024, 32);
    lensGeom.rotateX(Math.PI / 2);

    const lensCanvas = document.createElement("canvas");
    lensCanvas.width = 256;
    lensCanvas.height = 256;
    const lctx = lensCanvas.getContext("2d");
    const lensGrad = lctx.createRadialGradient(128, 128, 16, 128, 128, 120);
    lensGrad.addColorStop(0, "#2a1c14");
    lensGrad.addColorStop(1, "#0c0d10");
    lctx.fillStyle = lensGrad;
    lctx.fillRect(0, 0, 256, 256);
    lctx.strokeStyle = "#ff4a1c";
    lctx.lineWidth = 3;
    lctx.beginPath();
    lctx.arc(128, 128, 100, 0, Math.PI * 2);
    lctx.stroke();
    lctx.font = "bold 34px Archivo, system-ui, sans-serif";
    lctx.textAlign = "center";
    lctx.fillStyle = "#ffffff";
    lctx.fillText("PP", 128, 122);
    lctx.font = "15px 'Space Mono', ui-monospace, monospace";
    lctx.fillStyle = "#ff4a1c";
    lctx.fillText("PINGIS", 128, 148);

    const lensTex = colorTexture(new THREE.CanvasTexture(lensCanvas));
    const lensMat = new THREE.MeshStandardMaterial({
      map: lensTex,
      roughness: 0.18,
      metalness: 0.55,
    });

    const z = 0.198;
    [-1, 1].forEach((side) => {
      const lensMesh = new THREE.Mesh(lensGeom, lensMat);
      lensMesh.position.set(0, -0.94, side * z);
      group.add(lensMesh);
    });

    return group;
  }

  // Huvudklass för 3D-racketen
  class RacketViewer {
    constructor(options = {}) {
      this.container = options.container;
      if (!this.container) throw new Error("container is required");

      this.mode = options.mode || "hero"; // "hero" eller "studio"
      this.bladeData = options.bladeData || { name: "Donic Waldner OFF" };
      this.fhData = options.fhData || { name: "BlueStar A1", color: "red", colorHex: "#d41c1c", spongeColor: "#1e6fff" };
      this.bhData = options.bhData || { name: "BlueStar A2", color: "black", colorHex: "#18191c", spongeColor: "#1e6fff" };
      this.edgeTapeData = options.edgeTapeData || { name: "PP-Pingis" };

      this.isExploded = false;
      this.isFlipped = false;
      this.disposed = false;

      this.initScene();
      this.buildRacket();
      this.initLighting();
      this.initInteractions();

      this.animate = this.animate.bind(this);
      this.rafId = requestAnimationFrame(this.animate);

      this.observeVisibility();
    }

    initScene() {
      const w = this.container.clientWidth || 400;
      const h = this.container.clientHeight || 400;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
      this.camera.position.set(0, 0.5, 4.4);

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (this.renderer.physicallyCorrectLights !== undefined) {
        this.renderer.physicallyCorrectLights = true;
      }

      // HDR-kvalitet: tone mapping & korrekt färgrymd
      if (THREE.ACESFilmicToneMapping !== undefined) {
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;
      }
      if (THREE.SRGBColorSpace !== undefined) {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      }

      this.container.appendChild(this.renderer.domElement);
      this.renderer.domElement.style.width = "100%";
      this.renderer.domElement.style.height = "100%";
      this.renderer.domElement.style.display = "block";

      this.clock = new THREE.Clock();

      // Intro-animation state
      this.introProgress = 0;
      this.introComplete = false;

      // Huvudgrupp för racket (för rotation och flyt)
      this.racketRoot = new THREE.Group();
      // Hero-läget behåller sin godkända inramning; studio räknar fram sin
      // egen med frameRacket() så att racketen ligger centrerad med luft runt
      // sig (touch-ytan ska vara racketen, inte hela rutan).
      this.baseScale = 0.88;
      this.basePositionY = -0.35;
      this.racketRoot.position.set(0, this.basePositionY, 0);
      this.racketRoot.scale.setScalar(this.baseScale);
      this.scene.add(this.racketRoot);

      // Grupper för de separerbara skikten (för sprängskiss)
      this.layerGroups = {
        fhTopsheet: new THREE.Group(),
        fhSponge: new THREE.Group(),
        blade: new THREE.Group(),
        bhSponge: new THREE.Group(),
        bhTopsheet: new THREE.Group(),
        edgeTape: new THREE.Group(),
      };

      Object.values(this.layerGroups).forEach((g) => this.racketRoot.add(g));

      // Resize observer
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.container);
    }

    onResize() {
      if (!this.container || this.disposed) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (w === 0 || h === 0) return;

      this.camera.aspect = w / h;
      const baseDistance = this.mode === "hero" ? 4.4 : 4.65;
      if (this.camera.aspect < 1.0) {
        this.camera.position.z = baseDistance / Math.max(0.68, Math.min(1.0, this.camera.aspect));
        this.camera.position.y = 0.42;
      } else {
        this.camera.position.z = baseDistance;
        this.camera.position.y = 0.48;
      }
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.frameRacket();
    }

    // Ramar in racketen i studio-vyn: centrerar den på kamerans blickpunkt och
    // skalar den så att den fyller en del av höjden (padding) i stället för
    // hela. Då finns det synlig tom yta runt racketen, vilket både gör att
    // inget klipps av panelkanten och att det blir uppenbart att det är
    // racketen man tar tag i — inte panelen.
    frameRacket(padding = 0.74) {
      if (this.disposed || this.mode !== "studio" || !this.racketRoot) return;

      const rotX = this.racketRoot.rotation.x;
      const rotY = this.racketRoot.rotation.y;
      const rotZ = this.racketRoot.rotation.z;
      this.racketRoot.rotation.set(0, 0, 0);
      this.racketRoot.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(this.racketRoot);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      this.racketRoot.rotation.set(rotX, rotY, rotZ);

      if (!size.y) return;

      const dist = this.camera.position.z;
      const fovRad = (this.camera.fov * Math.PI) / 180;
      const visibleHeight = 2 * dist * Math.tan(fovRad / 2);
      const scaleFactor = (visibleHeight * padding) / size.y;

      const newScale = this.racketRoot.scale.y * scaleFactor;
      const localCenterY = (center.y - this.racketRoot.position.y) / this.racketRoot.scale.y;

      this.baseScale = newScale;
      this.basePositionY = this.camera.position.y - localCenterY * newScale;
      this.racketRoot.scale.setScalar(newScale);
      this.racketRoot.position.y = this.basePositionY;
    }

    initLighting() {
      this.envMap = makeStudioEnv(this.renderer);
      this.scene.environment = this.envMap;

      const hemiLight = new THREE.HemisphereLight(0xf0ece4, 0x1a1820, 0.55);
      hemiLight.position.set(0, 8, 0);
      this.scene.add(hemiLight);

      const ambientFill = new THREE.AmbientLight(0xe8e4dc, 0.16);
      this.scene.add(ambientFill);

      this.keyLight = new THREE.DirectionalLight(0xfff8ef, 1.35);
      this.keyLight.position.set(2.5, 4.5, 4);
      this.keyLight.castShadow = true;
      const shadowRes = window.matchMedia("(pointer: coarse)").matches ? 1024 : 2048;
      this.keyLight.shadow.mapSize.width = shadowRes;
      this.keyLight.shadow.mapSize.height = shadowRes;
      this.keyLight.shadow.camera.near = 0.5;
      this.keyLight.shadow.camera.far = 12;
      this.keyLight.shadow.bias = -0.0004;
      this.keyLight.shadow.normalBias = 0.02;
      this.scene.add(this.keyLight);

      const rimLight = new THREE.DirectionalLight(0xff4a1c, 0.85);
      rimLight.position.set(-3.5, 2, -3.5);
      this.scene.add(rimLight);

      const coolRim = new THREE.DirectionalLight(0x6a88b0, 0.45);
      coolRim.position.set(3, -1, -2);
      this.scene.add(coolRim);

      const backFill = new THREE.DirectionalLight(0x8098b0, 0.35);
      backFill.position.set(0, -2.5, -3.5);
      this.scene.add(backFill);

      this.pointerLight = new THREE.PointLight(0xff7744, 0.45, 6);
      this.pointerLight.position.set(0, 0.5, 2.5);
      this.scene.add(this.pointerLight);
    }

    buildRacket() {
      // 1. Träblad (Stomme)
      const bladeShape = createBladeShape();
      const bladeGeom = new THREE.ExtrudeGeometry(bladeShape, {
        depth: 0.062,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.012,
        bevelSegments: 6,
        curveSegments: 64,
      });
      // Centrera bladet runt z = 0
      bladeGeom.translate(0, 0, -0.031);

      const woodFaceTex = createWoodTexture({
        baseColor: "#e3bc89",
        grainColor: "#9c6d3b",
        text: this.bladeData.name || "DONIC WALDNER OFF",
      });
      const woodEdgeTex = createPlywoodEdgeTexture();

      const woodFaceMat = new THREE.MeshPhysicalMaterial({
        map: woodFaceTex,
        roughness: 0.28,
        metalness: 0.03,
        clearcoat: 0.45,
        clearcoatRoughness: 0.28,
        envMapIntensity: 1.05,
      });
      const woodEdgeMat = new THREE.MeshPhysicalMaterial({
        map: woodEdgeTex,
        roughness: 0.48,
        metalness: 0.04,
        clearcoat: 0.18,
        clearcoatRoughness: 0.5,
        envMapIntensity: 0.7,
      });

      // Material för yta och kant
      this.bladeMesh = new THREE.Mesh(bladeGeom, [woodFaceMat, woodEdgeMat]);
      this.bladeMesh.castShadow = true;
      this.bladeMesh.receiveShadow = true;
      this.layerGroups.blade.add(this.bladeMesh);

      // Handtagshalvor (fram och bak)
      this.handle = createHandle();
      this.layerGroups.blade.add(this.handle);

      // 2. Forehand & Backhand Svamplager (Sponge)
      const rubberShape = createRubberShape();

      // Procedurell bump-map för porös svampstruktur
      const spongeBumpCanvas = document.createElement("canvas");
      spongeBumpCanvas.width = 256;
      spongeBumpCanvas.height = 256;
      const sbCtx = spongeBumpCanvas.getContext("2d");
      sbCtx.fillStyle = "#808080";
      sbCtx.fillRect(0, 0, 256, 256);
      for (let y = 0; y < 256; y += 2) {
        for (let x = 0; x < 256; x += 2) {
          const v = 110 + Math.random() * 36;
          sbCtx.fillStyle = `rgb(${v},${v},${v})`;
          sbCtx.fillRect(x, y, 2, 2);
        }
      }
      const spongeBumpTex = new THREE.CanvasTexture(spongeBumpCanvas);

      const spongeGeom = new THREE.ExtrudeGeometry(rubberShape, {
        depth: 0.024,
        bevelEnabled: false,
        curveSegments: 64,
      });

      // FH Sponge (ofta blå hos Donic BlueStar/Acuda, eller orange/kräm)
      const fhSpongeColor = this.fhData.spongeColor || (this.fhData.color === "blue" ? "#ff7020" : "#1b74f0");
      this.fhSpongeMat = new THREE.MeshStandardMaterial({
        color: fhSpongeColor,
        roughness: 0.85,
        bumpMap: spongeBumpTex,
        bumpScale: 0.008,
      });
      this.fhSpongeMesh = new THREE.Mesh(spongeGeom, this.fhSpongeMat);
      this.fhSpongeMesh.position.set(0, 0, 0.033);
      this.layerGroups.fhSponge.add(this.fhSpongeMesh);

      // BH Sponge
      const bhSpongeColor = this.bhData.spongeColor || "#1b74f0";
      this.bhSpongeMat = new THREE.MeshStandardMaterial({
        color: bhSpongeColor,
        roughness: 0.85,
        bumpMap: spongeBumpTex,
        bumpScale: 0.008,
      });
      this.bhSpongeMesh = new THREE.Mesh(spongeGeom.clone(), this.bhSpongeMat);
      this.bhSpongeMesh.position.set(0, 0, -0.057);
      this.layerGroups.bhSponge.add(this.bhSpongeMesh);

      // 3. Forehand & Backhand Ytgummi (Topsheet)
      const topsheetGeom = new THREE.ExtrudeGeometry(rubberShape, {
        depth: 0.014,
        bevelEnabled: true,
        bevelThickness: 0.005,
        bevelSize: 0.005,
        bevelSegments: 4,
        curveSegments: 64,
      });

      // Skapa en delad bumpMap för ytgummits nabbstruktur
      const rubberBumpMap = createRubberBumpMap();

      // FH Ytgummi (Högkvalitativt MeshPhysicalMaterial med clearcoat och nabb-bump)
      const fhTex = createRubberTexture(this.fhData.name, this.fhData.color !== "black", this.fhData.colorHex);
      this.fhRubberMat = new THREE.MeshPhysicalMaterial({
        map: fhTex,
        bumpMap: rubberBumpMap,
        bumpScale: 0.007,
        roughness: 0.32,
        metalness: 0.02,
        clearcoat: 0.92,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.15,
      });
      this.fhRubberMesh = new THREE.Mesh(topsheetGeom, this.fhRubberMat);
      this.fhRubberMesh.position.set(0, 0, 0.057);
      this.fhRubberMesh.castShadow = true;
      this.layerGroups.fhTopsheet.add(this.fhRubberMesh);

      // BH Ytgummi (svart) (Högkvalitativt MeshPhysicalMaterial med clearcoat och nabb-bump)
      const bhTex = createRubberTexture(this.bhData.name, false, this.bhData.colorHex || "#17181c");
      this.bhRubberMat = new THREE.MeshPhysicalMaterial({
        map: bhTex,
        bumpMap: rubberBumpMap,
        bumpScale: 0.007,
        roughness: 0.32,
        metalness: 0.02,
        clearcoat: 0.92,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.15,
      });
      this.bhRubberMesh = new THREE.Mesh(topsheetGeom.clone(), this.bhRubberMat);
      // Vänd mot baksidan
      this.bhRubberMesh.position.set(0, 0, -0.078);
      this.bhRubberMesh.castShadow = true;
      this.layerGroups.bhTopsheet.add(this.bhRubberMesh);

      // 4. Kantband (skyddsband runt kanten)
      this.buildEdgeTape();
      this.racketRoot.add(createContactShadow());
    }

    buildEdgeTape() {
      // Tunt band som sveper runt bladets ovandel
      const tapeShape = createBladeShape();
      const points = tapeShape.getPoints(100);
      // Filtrera bort punkterna nere vid handtaget
      const rimPoints = points.filter((p) => p.y >= 0.02);

      const curve = new THREE.CatmullRomCurve3(
        rimPoints.map((p) => new THREE.Vector3(p.x, p.y, 0))
      );

      // Rektangulärt tvärsnitt för kantbandet (fler segment + tjockare radie)
      const tapeGeom = new THREE.TubeGeometry(curve, 160, 0.016, 10, false);
      const tapeTex = createEdgeTapeTexture(this.edgeTapeData.name);
      const tapeMat = new THREE.MeshPhysicalMaterial({
        map: tapeTex,
        roughness: 0.34,
        metalness: 0.08,
        clearcoat: 0.4,
        clearcoatRoughness: 0.35,
        envMapIntensity: 0.8,
      });

      this.edgeTapeMesh = new THREE.Mesh(tapeGeom, tapeMat);
      this.edgeTapeMesh.castShadow = true;
      this.layerGroups.edgeTape.clear();
      this.layerGroups.edgeTape.add(this.edgeTapeMesh);
    }

    // Interaktioner: mus/touch-drag för 360° rotation.
    //
    // Touch-regeln: en gest som börjar PÅ racketen roterar (och då avbryter vi
    // webbläsarens scroll med preventDefault), medan en gest som börjar utanför
    // racketen lämnas orörd så att sidan scrollar normalt. Utan den här
    // avgränsningen låg hela canvasen som en scrollfälla på mobilen eftersom
    // CSS hade touch-action: none på hela ytan.
    initInteractions() {
      let isDragging = false;
      let prevX = 0;
      let prevY = 0;
      let velocityX = 0;
      let velocityY = 0;

      this.targetRotation = { x: 0.15, y: -0.35 };
      this.currentRotation = { x: 0.15, y: -0.35 };
      this.floatPhase = 0;
      this.isTouchArmed = false;

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();

      // Träffar pekaren någon synlig del av racketen? Förfädernas visibility
      // räknas med, annars hade dolda lager (t.ex. oapplicerat gummi) fångat
      // gester i tomma luften.
      const isVisible = (obj) => {
        let node = obj;
        while (node) {
          if (node.visible === false) return false;
          node = node.parent;
        }
        return true;
      };

      const hitsRacket = (clientX, clientY) => {
        const rect = this.container.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
        raycaster.setFromCamera(pointer, this.camera);

        const targets = [];
        this.racketRoot.traverse((obj) => {
          if (obj.isMesh && isVisible(obj)) targets.push(obj);
        });
        if (!targets.length) return false;
        return raycaster.intersectObjects(targets, false).length > 0;
      };

      const setArmed = (armed) => {
        if (this.isTouchArmed === armed) return;
        this.isTouchArmed = armed;
        el.classList.toggle("is-touch-armed", armed);
        this.container.classList.toggle("is-interactive", armed);
        if (typeof this.onInteractionStateChange === "function") {
          this.onInteractionStateChange(armed);
        }
      };

      const onDown = (clientX, clientY) => {
        isDragging = true;
        prevX = clientX;
        prevY = clientY;
        velocityX = 0;
        velocityY = 0;
      };

      const onMove = (clientX, clientY) => {
        if (!isDragging) {
          // Subtil mus-parallax när man inte drar
          const rect = this.container.getBoundingClientRect();
          const normX = (clientX - rect.left) / rect.width - 0.5;
          const normY = (clientY - rect.top) / rect.height - 0.5;

          if (this.pointerLight) {
            this.pointerLight.position.x = normX * 3.5;
            this.pointerLight.position.y = -normY * 3.5 + 0.5;
          }

          if (this.mode === "hero" && !this.isFlipped) {
            this.targetRotation.y = -0.35 + normX * 0.55;
            this.targetRotation.x = 0.15 + normY * 0.35;
          }
          return;
        }

        const dx = clientX - prevX;
        const dy = clientY - prevY;
        prevX = clientX;
        prevY = clientY;

        velocityX = dx * 0.007;
        velocityY = dy * 0.007;

        this.targetRotation.y += velocityX;
        this.targetRotation.x += velocityY;

        // Begränsa vertikal vinkel
        this.targetRotation.x = Math.max(-1.2, Math.min(1.2, this.targetRotation.x));
      };

      const onUp = () => {
        isDragging = false;
        setArmed(false);
      };

      const el = this.renderer.domElement;

      el.addEventListener("mousedown", (e) => onDown(e.clientX, e.clientY));
      window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
      window.addEventListener("mouseup", onUp);

      // Muspekaren visar bara "grab" när den är över racketen (samma träff-test
      // som styr touchen), så det syns var man kan ta tag.
      let hoverRaf = 0;
      el.addEventListener("mousemove", (e) => {
        if (hoverRaf) return;
        const { clientX, clientY } = e;
        hoverRaf = requestAnimationFrame(() => {
          hoverRaf = 0;
          const over = hitsRacket(clientX, clientY);
          if (over !== this.isPointerOverRacket) {
            this.isPointerOverRacket = over;
            el.classList.toggle("is-over-racket", over);
          }
        });
      });
      el.addEventListener("mouseleave", () => {
        this.isPointerOverRacket = false;
        el.classList.remove("is-over-racket");
      });

      // Icke-passiv: vi måste kunna avbryta scrollen för den gest som börjar
      // på racketen. Missar pekaren racketen gör vi ingenting alls.
      el.addEventListener(
        "touchstart",
        (e) => {
          if (e.touches.length !== 1) return;
          const touch = e.touches[0];
          if (!hitsRacket(touch.clientX, touch.clientY)) return;
          e.preventDefault();
          setArmed(true);
          onDown(touch.clientX, touch.clientY);
        },
        { passive: false }
      );

      window.addEventListener(
        "touchmove",
        (e) => {
          if (!this.isTouchArmed || e.touches.length !== 1) return;
          onMove(e.touches[0].clientX, e.touches[0].clientY);
        },
        { passive: true }
      );

      window.addEventListener("touchend", onUp);
      window.addEventListener("touchcancel", onUp);
    }

    flipRacket() {
      this.isFlipped = !this.isFlipped;
      this.targetRotation.y += Math.PI;
    }

    toggleExplodedView() {
      this.isExploded = !this.isExploded;
      return this.isExploded;
    }

    // Lägger på ett gummilager med mjuk påläggning: den nya ytan tonar in och
    // växer från handtaget och uppåt i stället för att poppa in, och svampens
    // färg glider över i den nya. Den gamla ytan ligger kvar under tills den
    // nya täcker den, så det uppstår aldrig ett hål eller en blixt i bytet.
    animateRubberChange(side, { texture = null, spongeColor = null, duration = 340 } = {}) {
      const isFh = side === "fh";
      const mesh = isFh ? this.fhRubberMesh : this.bhRubberMesh;
      const mat = isFh ? this.fhRubberMat : this.bhRubberMat;
      const spongeMat = isFh ? this.fhSpongeMat : this.bhSpongeMat;
      const group = isFh ? this.layerGroups.fhTopsheet : this.layerGroups.bhTopsheet;
      if (!mesh || !mat || !group) return;

      // Snabba färgbyten: släng en pågående påläggning i stället för att stapla
      if (mesh.userData.ghost) {
        group.remove(mesh.userData.ghost);
        mesh.userData.ghost.material.dispose();
        mesh.userData.ghost = null;
      }

      const ghostMat = mat.clone();
      if (texture) {
        ghostMat.map = texture;
        ghostMat.needsUpdate = true;
      }
      ghostMat.transparent = true;
      ghostMat.opacity = 0;
      ghostMat.depthWrite = false;

      const ghost = new THREE.Mesh(mesh.geometry, ghostMat);
      ghost.position.copy(mesh.position);
      ghost.rotation.copy(mesh.rotation);
      ghost.renderOrder = mesh.renderOrder + 1;
      group.add(ghost);
      mesh.userData.ghost = ghost;

      const spongeFrom = spongeMat && spongeColor ? spongeMat.color.clone() : null;
      const spongeTo = spongeColor ? new THREE.Color(spongeColor) : null;
      const started = performance.now();
      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

      const step = () => {
        if (this.disposed || mesh.userData.ghost !== ghost) return;
        const t = Math.min(1, (performance.now() - started) / duration);
        const e = easeOutCubic(t);

        ghostMat.opacity = e;
        // Geometrins origo ligger vid halsen: skalan växer därifrån och uppåt
        ghost.scale.set(1, 0.06 + 0.94 * e, 1);
        ghost.position.z = mesh.position.z + (1 - e) * 0.01;

        if (spongeFrom && spongeTo) spongeMat.color.copy(spongeFrom).lerp(spongeTo, e);

        if (t < 1) {
          requestAnimationFrame(step);
          return;
        }

        // Klart: skriv över den permanenta ytan och ta bort mellanskiktet
        if (texture) {
          mat.map = texture;
          mat.needsUpdate = true;
        }
        group.remove(ghost);
        ghostMat.dispose();
        mesh.userData.ghost = null;
      };
      requestAnimationFrame(step);
    }

    // Publik ingång från "Rulla på gummi": spela upp påläggningen igen med det
    // gummi som redan sitter på.
    applyRubberAnimation(side = "fh") {
      const isFh = side === "fh";
      const mat = isFh ? this.fhRubberMat : this.bhRubberMat;
      const spongeColor = isFh ? this.fhData.spongeColor : this.bhData.spongeColor;
      this.animateRubberChange(side, { texture: mat ? mat.map : null, spongeColor });
    }

    updateBlade(bladeData) {
      this.bladeData = bladeData;
      const newTex = createWoodTexture({
        baseColor: bladeData.woodColor || "#e3bc89",
        grainColor: bladeData.grainColor || "#9c6d3b",
        text: bladeData.name,
      });
      if (this.bladeMesh && this.bladeMesh.material[0]) {
        this.bladeMesh.material[0].map = newTex;
        this.bladeMesh.material[0].needsUpdate = true;
      }
    }

    updateForehand(rubberData) {
      this.fhData = rubberData;
      const isRed = rubberData.color !== "black";
      const newTex = createRubberTexture(rubberData.name, isRed, rubberData.colorHex);
      this.animateRubberChange("fh", { texture: newTex, spongeColor: rubberData.spongeColor });
    }

    updateBackhand(rubberData) {
      this.bhData = rubberData;
      const newTex = createRubberTexture(rubberData.name, false, rubberData.colorHex || "#17181c");
      this.animateRubberChange("bh", { texture: newTex, spongeColor: rubberData.spongeColor });
    }

    updateEdgeTape(tapeData) {
      this.edgeTapeData = tapeData;
      this.buildEdgeTape();
    }

    animate() {
      if (this.disposed) return;
      this.rafId = requestAnimationFrame(this.animate);

      if (!this.isVisible) return;

      const delta = this.clock.getDelta();
      const time = this.clock.getElapsedTime();

      // Intro-animation: fade-in + scale-up (0 → 1 over ~0.8s)
      if (!this.introComplete) {
        this.introProgress = Math.min(1, this.introProgress + delta * 1.3);
        // Smooth easeOutCubic
        const t = 1 - Math.pow(1 - this.introProgress, 3);
        const scale = this.baseScale * (0.94 + 0.06 * t);
        this.racketRoot.scale.set(scale, scale, scale);
        // Fade via material opacity would be complex; use renderer opacity instead
        this.renderer.domElement.style.opacity = t;
        if (this.introProgress >= 1) {
          this.introComplete = true;
          this.renderer.domElement.style.opacity = 1;
        }
      }

      // Mjuk interpolation (lerp) mot målvinklar — silkigare rörelse
      this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.06;
      this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.06;

      // Svängande svävning (floaty) i Hero-läge
      if (this.mode === "hero") {
        const floatY = Math.sin(time * 1.5) * 0.08;
        const floatRotZ = Math.sin(time * 0.9) * 0.05;
        const breathe = 1.0 + Math.sin(time * 1.2) * 0.005;
        this.racketRoot.position.y = this.basePositionY + floatY;
        this.racketRoot.rotation.x = this.currentRotation.x;
        this.racketRoot.rotation.y = this.currentRotation.y;
        this.racketRoot.rotation.z = floatRotZ;
        if (this.introComplete) {
          this.racketRoot.scale.setScalar(this.baseScale * breathe);
        }
      } else {
        this.racketRoot.rotation.x = this.currentRotation.x;
        this.racketRoot.rotation.y = this.currentRotation.y;
      }

      // Sprängskiss-animation (flyttar skikten längs Z-axeln)
      const explodeDist = this.isExploded ? 0.38 : 0;
      const lerpSpeed = 0.08;

      this.layerGroups.fhTopsheet.position.z += (explodeDist * 1.8 - this.layerGroups.fhTopsheet.position.z) * lerpSpeed;
      this.layerGroups.fhSponge.position.z += (explodeDist * 0.9 - this.layerGroups.fhSponge.position.z) * lerpSpeed;
      this.layerGroups.bhSponge.position.z += (-explodeDist * 0.9 - this.layerGroups.bhSponge.position.z) * lerpSpeed;
      this.layerGroups.bhTopsheet.position.z += (-explodeDist * 1.8 - this.layerGroups.bhTopsheet.position.z) * lerpSpeed;

      this.renderer.render(this.scene, this.camera);
    }

    observeVisibility() {
      this.isVisible = true;
      if (!("IntersectionObserver" in window)) return;

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          this.isVisible = entry.isIntersecting;
        });
      });
      this.observer.observe(this.container);
    }

    dispose() {
      this.disposed = true;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      if (this.observer) this.observer.disconnect();
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }

  return {
    RacketViewer,
  };
})();
