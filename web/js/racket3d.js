/**
 * PP PINGIS — 3D Racket Engine (Three.js)
 * Fotorealistisk, interaktiv 3D-bordtennisracket för både Hero och Racketverkstaden.
 */

window.PPRacket3D = (function () {
  "use strict";

  // Ljudeffekter via Web Audio API (noll externa ljudfiler)
  let audioCtx = null;
  function playHitSound(type = "rubber") {
    try {
      if (!audioCtx) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        audioCtx = new AudioCtor();
      }
      if (audioCtx.state === "suspended") audioCtx.resume();

      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      if (type === "wood") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(820, t);
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.05);
        filter.type = "bandpass";
        filter.frequency.value = 900;
        filter.Q.value = 4;
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      } else {
        // "pock" från gummisvamp
        osc.type = "sine";
        osc.frequency.setValueAtTime(560, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.09);
        filter.type = "lowpass";
        filter.frequency.value = 750;
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      }

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.15);
    } catch (e) {
      // Ignorera ljudfel om användaren inte interagerat med sidan
    }
  }

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
    return tex;
  }

  // Hjälpfunktion för att mörkna en hex-färg
  function darkenHex(hex, amount) {
    hex = hex.replace("#", "");
    let r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
    let g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
    let b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
    return "#" + [r, g, b].map(c => c.toString(16).padStart(2, "0")).join("");
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
    return tex;
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
    ctx.fillText(brandName.toUpperCase() + "  ✦  " + brandName.toUpperCase(), 512, 74);

    // Subtil textskugga
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#ff4a1c";
    ctx.fillText(brandName.toUpperCase() + "  ✦  " + brandName.toUpperCase(), 512, 75);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(3, 1);
    return tex;
  }

  // Skapar bordtennisracketens huvudform (Shape)
  function createBladeShape() {
    const shape = new THREE.Shape();
    // Startar vid halsen vänster
    shape.moveTo(-0.45, 0.0);
    // Vänster midja upp mot bredaste punkten
    shape.bezierCurveTo(-0.7, 0.35, -0.92, 0.85, -0.88, 1.35);
    // Toppen vänster till mitt
    shape.bezierCurveTo(-0.84, 1.82, -0.5, 2.15, 0.0, 2.18);
    // Toppen mitt till höger
    shape.bezierCurveTo(0.5, 2.15, 0.84, 1.82, 0.88, 1.35);
    // Höger midja ner till halsen
    shape.bezierCurveTo(0.92, 0.85, 0.7, 0.35, 0.45, 0.0);
    // Hals
    shape.lineTo(0.42, -0.2);
    shape.bezierCurveTo(0.38, -0.3, 0.3, -0.35, 0.25, -0.36);
    shape.lineTo(-0.25, -0.36);
    shape.bezierCurveTo(-0.3, -0.35, -0.38, -0.3, -0.42, -0.2);
    shape.lineTo(-0.45, 0.0);

    return shape;
  }

  // Skapar gummiform (samma som huvudform fast avskuren rakt ovanför handtaget)
  function createRubberShape() {
    const shape = new THREE.Shape();
    shape.moveTo(-0.46, 0.05);
    shape.bezierCurveTo(-0.71, 0.36, -0.93, 0.86, -0.89, 1.36);
    shape.bezierCurveTo(-0.85, 1.83, -0.5, 2.16, 0.0, 2.19);
    shape.bezierCurveTo(0.5, 2.16, 0.85, 1.83, 0.89, 1.36);
    shape.bezierCurveTo(0.93, 0.86, 0.71, 0.36, 0.46, 0.05);
    // Rak kant vid basen av gummit
    shape.lineTo(0.44, 0.05);
    shape.bezierCurveTo(0.2, 0.08, -0.2, 0.08, -0.44, 0.05);
    shape.lineTo(-0.46, 0.05);
    return shape;
  }

  // Skapar konkavt handtag (flared)
  function createHandleHalf(isFront = true) {
    const group = new THREE.Group();

    // Handtagets profil
    const handleShape = new THREE.Shape();
    handleShape.moveTo(-0.24, 0.02);
    handleShape.bezierCurveTo(-0.22, -0.35, -0.21, -0.7, -0.28, -1.25);
    handleShape.lineTo(0.28, -1.25);
    handleShape.bezierCurveTo(0.21, -0.7, 0.22, -0.35, 0.24, 0.02);
    handleShape.lineTo(-0.24, 0.02);

    const extrudeSettings = {
      steps: 1,
      depth: 0.11,
      bevelEnabled: true,
      bevelThickness: 0.038,
      bevelSize: 0.038,
      bevelSegments: 6,
    };

    const geom = new THREE.ExtrudeGeometry(handleShape, extrudeSettings);
    // Centrera handtagshalvan i z
    geom.translate(0, 0, isFront ? 0.045 : -0.19);

    // Handtagstextur med trä-ådring + accentränder
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    // Bas: mörkt trä
    const baseGrad = ctx.createLinearGradient(0, 0, 256, 0);
    baseGrad.addColorStop(0, "#1e2229");
    baseGrad.addColorStop(0.5, "#252830");
    baseGrad.addColorStop(1, "#1e2229");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 512, 1024);

    // Subtil ådring i mörkt trä
    ctx.strokeStyle = "#3a3d48";
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.2;
    for (let i = -50; i < 1100; i += 4 + Math.random() * 3) {
      ctx.beginPath();
      let y = i;
      ctx.moveTo(0, y);
      for (let x = 0; x <= 512; x += 20) {
        y += Math.sin((x + i) * 0.015) * 1.5 + (Math.random() - 0.5) * 0.8;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Orange accentrand
    ctx.fillStyle = "#ff4a1c";
    ctx.fillRect(192, 0, 20, 1024);
    // Ljus träinlägg
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(218, 0, 12, 1024);
    // Varm trä-accent med ådring
    const woodAccentGrad = ctx.createLinearGradient(234, 0, 268, 0);
    woodAccentGrad.addColorStop(0, "#c8a06a");
    woodAccentGrad.addColorStop(0.5, "#d9b382");
    woodAccentGrad.addColorStop(1, "#c8a06a");
    ctx.fillStyle = woodAccentGrad;
    ctx.fillRect(234, 0, 34, 1024);

    // Subtil ådring i träaccenten
    ctx.strokeStyle = "#9e7d4d";
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 1024; i += 6) {
      ctx.beginPath();
      ctx.moveTo(234, i);
      ctx.lineTo(268, i + Math.sin(i * 0.05) * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const handleTex = new THREE.CanvasTexture(canvas);
    const handleMat = new THREE.MeshStandardMaterial({
      map: handleTex,
      roughness: 0.4,
      metalness: 0.06,
    });

    const mesh = new THREE.Mesh(geom, handleMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Infälld kristallins (badge) med logotyp nära basen
    const lensGeom = new THREE.CylinderGeometry(0.09, 0.09, 0.028, 32);
    lensGeom.rotateX(Math.PI / 2);

    const lensCanvas = document.createElement("canvas");
    lensCanvas.width = 256;
    lensCanvas.height = 256;
    const lctx = lensCanvas.getContext("2d");

    // Polerad mörk bakgrund med radiell gradient
    const lensGrad = lctx.createRadialGradient(128, 128, 20, 128, 128, 120);
    lensGrad.addColorStop(0, "#1a1c22");
    lensGrad.addColorStop(1, "#0c0d10");
    lctx.fillStyle = lensGrad;
    lctx.fillRect(0, 0, 256, 256);

    // Yttre ring
    lctx.strokeStyle = "#ff4a1c";
    lctx.lineWidth = 3;
    lctx.beginPath();
    lctx.arc(128, 128, 100, 0, Math.PI * 2);
    lctx.stroke();

    // Inre dekorring
    lctx.strokeStyle = "rgba(255, 74, 28, 0.3)";
    lctx.lineWidth = 1;
    lctx.beginPath();
    lctx.arc(128, 128, 88, 0, Math.PI * 2);
    lctx.stroke();

    // Brand text
    lctx.font = "bold 32px Archivo, system-ui, sans-serif";
    lctx.textAlign = "center";
    lctx.fillStyle = "#ffffff";
    lctx.fillText("DONIC", 128, 120);
    lctx.font = "16px 'Space Mono', ui-monospace, monospace";
    lctx.fillStyle = "#ff4a1c";
    lctx.fillText("OFF 89", 128, 148);

    const lensTex = new THREE.CanvasTexture(lensCanvas);
    const lensMat = new THREE.MeshStandardMaterial({
      map: lensTex,
      roughness: 0.12,
      metalness: 0.75,
    });

    const lensMesh = new THREE.Mesh(lensGeom, lensMat);
    lensMesh.position.set(0, -0.92, isFront ? 0.185 : -0.185);
    group.add(lensMesh);

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

      if (this.mode === "hero") {
        this.initHeroEffects();
      }

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
      // Centrera sweetspot något runt mittpunkten
      this.racketRoot.position.set(0, -0.35, 0);
      this.racketRoot.scale.set(0.88, 0.88, 0.88);
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
    }

    initLighting() {
      // Naturlig himmel/mark-belysning (ersätter platt ambient)
      const hemiLight = new THREE.HemisphereLight(0xf0ece4, 0x1a1820, 0.7);
      hemiLight.position.set(0, 8, 0);
      this.scene.add(hemiLight);

      // Mjuk fyllnads-ambient för skuggsidan
      const ambientFill = new THREE.AmbientLight(0xe8e4dc, 0.25);
      this.scene.add(ambientFill);

      // Huvudljus framifrån/ovan (varm vit, studio key light)
      this.keyLight = new THREE.DirectionalLight(0xfff8ef, 1.6);
      this.keyLight.position.set(2.5, 4.5, 4);
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.width = 2048;
      this.keyLight.shadow.mapSize.height = 2048;
      this.keyLight.shadow.camera.near = 0.5;
      this.keyLight.shadow.camera.far = 12;
      this.keyLight.shadow.bias = -0.0004;
      this.keyLight.shadow.normalBias = 0.02;
      this.scene.add(this.keyLight);

      // Motljus / Rim-ljus med PP Pingis orange signaturton
      const rimLight = new THREE.DirectionalLight(0xff4a1c, 1.5);
      rimLight.position.set(-3.5, 2, -3.5);
      this.scene.add(rimLight);

      // Sekundärt rimljus, kylig ton för kontrast
      const coolRim = new THREE.DirectionalLight(0x5080c0, 0.5);
      coolRim.position.set(3, -1, -2);
      this.scene.add(coolRim);

      // Mjukt fyllnadsljus underifrån (eliminerar hårda skuggor under bladet)
      const backFill = new THREE.DirectionalLight(0x8098b0, 0.55);
      backFill.position.set(0, -2.5, -3.5);
      this.scene.add(backFill);

      // Punktljus som följer musen i hero
      this.pointerLight = new THREE.PointLight(0xff7744, 0.7, 6);
      this.pointerLight.position.set(0, 0.5, 2.5);
      this.scene.add(this.pointerLight);
    }

    buildRacket() {
      // 1. Träblad (Stomme)
      const bladeShape = createBladeShape();
      const bladeGeom = new THREE.ExtrudeGeometry(bladeShape, {
        depth: 0.065,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.01,
        bevelSegments: 4,
      });
      // Centrera bladet runt z = 0
      bladeGeom.translate(0, 0, -0.0325);

      const woodFaceTex = createWoodTexture({
        baseColor: "#e3bc89",
        grainColor: "#9c6d3b",
        text: this.bladeData.name || "DONIC WALDNER OFF",
      });
      const woodEdgeTex = createPlywoodEdgeTexture();

      const woodFaceMat = new THREE.MeshStandardMaterial({
        map: woodFaceTex,
        roughness: 0.32,
        metalness: 0.05,
      });
      const woodEdgeMat = new THREE.MeshStandardMaterial({
        map: woodEdgeTex,
        roughness: 0.55,
        metalness: 0.03,
      });

      // Material för yta och kant
      this.bladeMesh = new THREE.Mesh(bladeGeom, [woodFaceMat, woodEdgeMat]);
      this.bladeMesh.castShadow = true;
      this.bladeMesh.receiveShadow = true;
      this.layerGroups.blade.add(this.bladeMesh);

      // Handtagshalvor (fram och bak)
      this.handleFront = createHandleHalf(true);
      this.handleBack = createHandleHalf(false);
      this.layerGroups.blade.add(this.handleFront);
      this.layerGroups.blade.add(this.handleBack);

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
        depth: 0.016,
        bevelEnabled: true,
        bevelThickness: 0.006,
        bevelSize: 0.006,
        bevelSegments: 3,
      });

      // FH Ytgummi
      const fhTex = createRubberTexture(this.fhData.name, this.fhData.color !== "black", this.fhData.colorHex);
      this.fhRubberMat = new THREE.MeshStandardMaterial({
        map: fhTex,
        roughness: 0.22,
        metalness: 0.05,
      });
      this.fhRubberMesh = new THREE.Mesh(topsheetGeom, this.fhRubberMat);
      this.fhRubberMesh.position.set(0, 0, 0.057);
      this.fhRubberMesh.castShadow = true;
      this.layerGroups.fhTopsheet.add(this.fhRubberMesh);

      // BH Ytgummi (svart)
      const bhTex = createRubberTexture(this.bhData.name, false, this.bhData.colorHex || "#17181c");
      this.bhRubberMat = new THREE.MeshStandardMaterial({
        map: bhTex,
        roughness: 0.22,
        metalness: 0.05,
      });
      this.bhRubberMesh = new THREE.Mesh(topsheetGeom.clone(), this.bhRubberMat);
      // Vänd mot baksidan
      this.bhRubberMesh.position.set(0, 0, -0.078);
      this.bhRubberMesh.castShadow = true;
      this.layerGroups.bhTopsheet.add(this.bhRubberMesh);

      // 4. Kantband (skyddsband runt kanten)
      this.buildEdgeTape();
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
      const tapeGeom = new THREE.TubeGeometry(curve, 120, 0.014, 8, false);
      const tapeTex = createEdgeTapeTexture(this.edgeTapeData.name);
      const tapeMat = new THREE.MeshStandardMaterial({
        map: tapeTex,
        roughness: 0.4,
        metalness: 0.12,
      });

      this.edgeTapeMesh = new THREE.Mesh(tapeGeom, tapeMat);
      this.edgeTapeMesh.castShadow = true;
      this.layerGroups.edgeTape.clear();
      this.layerGroups.edgeTape.add(this.edgeTapeMesh);
    }

    // Interaktioner: mus/touch drag för 360° rotation
    initInteractions() {
      let isDragging = false;
      let prevX = 0;
      let prevY = 0;
      let velocityX = 0;
      let velocityY = 0;

      this.targetRotation = { x: 0.15, y: -0.35 };
      this.currentRotation = { x: 0.15, y: -0.35 };
      this.floatPhase = 0;

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
      };

      const el = this.renderer.domElement;

      el.addEventListener("mousedown", (e) => onDown(e.clientX, e.clientY));
      window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
      window.addEventListener("mouseup", onUp);

      el.addEventListener(
        "touchstart",
        (e) => {
          if (e.touches.length === 1) {
            onDown(e.touches[0].clientX, e.touches[0].clientY);
          }
        },
        { passive: true }
      );

      window.addEventListener(
        "touchmove",
        (e) => {
          if (e.touches.length === 1) {
            onMove(e.touches[0].clientX, e.touches[0].clientY);
          }
        },
        { passive: true }
      );

      window.addEventListener("touchend", onUp);

      // Klick i hero = rolig studs/flick
      if (this.mode === "hero") {
        el.addEventListener("click", () => {
          this.bounceBall();
        });
      }
    }

    initHeroEffects() {
      // Skapa en 3D-bordtennisboll som kan studsa
      const ballGeom = new THREE.SphereGeometry(0.18, 32, 32);
      const ballCanvas = document.createElement("canvas");
      ballCanvas.width = 256;
      ballCanvas.height = 256;
      const bctx = ballCanvas.getContext("2d");
      bctx.fillStyle = "#faf7f2"; // celluloidfri matt vit
      bctx.fillRect(0, 0, 256, 256);
      bctx.fillStyle = "#ff4a1c";
      bctx.font = "bold 20px Archivo, sans-serif";
      bctx.textAlign = "center";
      bctx.fillText("DONIC", 128, 110);
      bctx.fillText("★★★ 40+", 128, 140);

      const ballTex = new THREE.CanvasTexture(ballCanvas);
      const ballMat = new THREE.MeshStandardMaterial({
        map: ballTex,
        roughness: 0.35,
        metalness: 0.05,
      });

      this.ballMesh = new THREE.Mesh(ballGeom, ballMat);
      this.ballMesh.castShadow = true;
      this.ballMesh.position.set(0.4, 2.5, 0.3);
      this.scene.add(this.ballMesh);

      this.ballPhysics = {
        active: false,
        vy: 0,
        y: 2.5,
        targetY: 2.5,
      };
    }

    bounceBall() {
      if (!this.ballMesh) return;
      this.ballPhysics.active = true;
      this.ballPhysics.vy = 0.12; // kickoff
      this.ballPhysics.y = 0.9;
      playHitSound(this.isFlipped ? "rubber" : "rubber");

      // Gör en liten gungning på racketen vid träff
      this.targetRotation.x += 0.08;
    }

    flipRacket() {
      this.isFlipped = !this.isFlipped;
      this.targetRotation.y += Math.PI;
      playHitSound("wood");
    }

    toggleExplodedView() {
      this.isExploded = !this.isExploded;
      playHitSound("wood");
      return this.isExploded;
    }

    // Applicera gummi med roll-on animation
    applyRubberAnimation(side = "fh") {
      const targetGroup = side === "fh" ? this.layerGroups.fhTopsheet : this.layerGroups.bhTopsheet;
      const spongeGroup = side === "fh" ? this.layerGroups.fhSponge : this.layerGroups.bhSponge;

      targetGroup.scale.set(1.4, 0.05, 1);
      spongeGroup.scale.set(1.4, 0.05, 1);

      playHitSound("rubber");

      let progress = 0;
      const animateApply = () => {
        progress += 0.06;
        if (progress >= 1) {
          targetGroup.scale.set(1, 1, 1);
          spongeGroup.scale.set(1, 1, 1);
          playHitSound("wood");
        } else {
          const s = 1.4 - 0.4 * progress;
          const sy = 0.05 + 0.95 * progress;
          targetGroup.scale.set(s, sy, 1);
          spongeGroup.scale.set(s, sy, 1);
          requestAnimationFrame(animateApply);
        }
      };
      animateApply();
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
      playHitSound("wood");
    }

    updateForehand(rubberData) {
      this.fhData = rubberData;
      const isRed = rubberData.color !== "black";
      const newTex = createRubberTexture(rubberData.name, isRed, rubberData.colorHex);
      if (this.fhRubberMat) {
        this.fhRubberMat.map = newTex;
        this.fhRubberMat.needsUpdate = true;
      }
      if (this.fhSpongeMat && rubberData.spongeColor) {
        this.fhSpongeMat.color.set(rubberData.spongeColor);
      }
      this.applyRubberAnimation("fh");
    }

    updateBackhand(rubberData) {
      this.bhData = rubberData;
      const newTex = createRubberTexture(rubberData.name, false, rubberData.colorHex || "#17181c");
      if (this.bhRubberMat) {
        this.bhRubberMat.map = newTex;
        this.bhRubberMat.needsUpdate = true;
      }
      if (this.bhSpongeMat && rubberData.spongeColor) {
        this.bhSpongeMat.color.set(rubberData.spongeColor);
      }
      this.applyRubberAnimation("bh");
    }

    updateEdgeTape(tapeData) {
      this.edgeTapeData = tapeData;
      this.buildEdgeTape();
      playHitSound("wood");
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
        const scale = 0.88 + 0.12 * t;
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

        // Subtil "breathe" scale-puls (±0.5%)
        const breathe = 1.0 + Math.sin(time * 1.2) * 0.005;
        this.racketRoot.position.y = -0.35 + floatY;
        this.racketRoot.rotation.x = this.currentRotation.x;
        this.racketRoot.rotation.y = this.currentRotation.y;
        this.racketRoot.rotation.z = floatRotZ;
        if (this.introComplete) {
          this.racketRoot.scale.set(breathe, breathe, breathe);
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

      // Bollfysik (när studsen är aktiverad)
      if (this.ballMesh && this.ballPhysics.active) {
        this.ballPhysics.vy -= 0.006; // mjukare gravitation
        this.ballPhysics.y += this.ballPhysics.vy;

        // Lätt lateral drift
        if (!this.ballPhysics.vx) this.ballPhysics.vx = (Math.random() - 0.5) * 0.01;
        this.ballPhysics.vx *= 0.998; // luftmotstånd

        // Träffpunkt på racketens yta (runt y = 0.5)
        const hitY = 0.55;
        if (this.ballPhysics.y <= hitY && this.ballPhysics.vy < 0) {
          this.ballPhysics.y = hitY;
          this.ballPhysics.vy = -this.ballPhysics.vy * 0.78;
          this.ballPhysics.vx += (Math.random() - 0.5) * 0.008;
          playHitSound("rubber");

          // Gungning på racketen vid träff
          this.targetRotation.x += 0.04;

          if (Math.abs(this.ballPhysics.vy) < 0.015) {
            this.ballPhysics.active = false;
            this.ballPhysics.y = 2.5;
            this.ballPhysics.vx = 0;
          }
        }
        this.ballMesh.position.y = this.ballPhysics.y;
        this.ballMesh.position.x = 0.2 + (this.ballPhysics.vx || 0) * time * 20 + Math.sin(time * 3) * 0.03;
        this.ballMesh.rotation.x += 0.06;
        this.ballMesh.rotation.z += 0.02;
      } else if (this.ballMesh) {
        // Lugn svävning ovanför
        this.ballMesh.position.y = 1.9 + Math.sin(time * 2) * 0.1;
        this.ballMesh.position.x = 0.35 + Math.cos(time * 1.5) * 0.06;
        this.ballMesh.rotation.y = time * 0.5;
      }

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
    playHitSound,
  };
})();
