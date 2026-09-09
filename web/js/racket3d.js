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
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    const baseColor = opts.baseColor || "#d9b382";
    const grainColor = opts.grainColor || "#9e6f38";
    const printText = opts.text || "";

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Rita subtil ådring
    ctx.strokeStyle = grainColor;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.14;
    for (let i = -100; i < 600; i += 5) {
      ctx.beginPath();
      let y = i;
      ctx.moveTo(0, y);
      for (let x = 0; x <= 512; x += 30) {
        y += Math.sin((x + i) * 0.02) * 2.5 + (Math.random() - 0.5) * 1.5;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Rita årsringar / virvlar
    ctx.globalAlpha = 0.08;
    for (let j = 0; j < 8; j++) {
      const cx = 150 + j * 45;
      const cy = 200 + (j % 3) * 60;
      ctx.beginPath();
      ctx.arc(cx, cy, 70 + j * 12, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Tryckt logotyp på träbladet
    if (printText) {
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = "#2d1e12";
      ctx.textAlign = "center";
      ctx.font = "bold 22px Archivo, sans-serif";
      ctx.fillText(printText.toUpperCase(), 256, 210);

      ctx.font = "12px 'Space Mono', monospace";
      ctx.fillStyle = "#5c3e24";
      ctx.fillText("5-PLY NATURAL WOOD + CARBON", 256, 235);
      ctx.fillText("OFFENSIVE CLASS · MADE IN GERMANY", 256, 255);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
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
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    let base = isRed ? "#d41c1c" : "#17181c";
    if (colorHex) base = colorHex;

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);

    // Ytstruktur / mikrogrepp
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.025;
    for (let y = 0; y < 512; y += 4) {
      for (let x = 0; x < 512; x += 4) {
        if ((x + y) % 3 === 0) ctx.fillRect(x, y, 2, 2);
      }
    }

    // ITTF-stämpel och logotyp längs nedre kanten
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = isRed ? "#ff9999" : "#666666";
    ctx.font = "bold 13px 'Space Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("ITTF 24-009 · " + (name || "DONIC BLUESTAR").toUpperCase(), 256, 490);
    ctx.fillText("MADE IN GERMANY · TENSOR BIOS", 256, 504);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  // Skapa kantbandstextur
  function createEdgeTapeTexture(brandName = "PP PINGIS") {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#111215";
    ctx.fillRect(0, 0, 512, 64);

    // Kantlinjer
    ctx.fillStyle = "#ff4a1c";
    ctx.fillRect(0, 0, 512, 3);
    ctx.fillRect(0, 61, 512, 3);

    // Text upprepad
    ctx.fillStyle = "#f4f1ea";
    ctx.font = "bold 18px Archivo, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(brandName.toUpperCase() + "  ✦  " + brandName.toUpperCase(), 256, 38);

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
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: 4,
    };

    const geom = new THREE.ExtrudeGeometry(handleShape, extrudeSettings);
    // Centrera handtagshalvan i z
    geom.translate(0, 0, isFront ? 0.045 : -0.19);

    // Skapa handtagsmaterial med snygg tvåtonsrand
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1e2229"; // mörkgrå/svart träbas
    ctx.fillRect(0, 0, 256, 512);

    // Två vertikala ränder (accent & ljust trä)
    ctx.fillStyle = "#ff4a1c"; // orange accentrand
    ctx.fillRect(96, 0, 16, 512);
    ctx.fillStyle = "#f4f1ea"; // vit/ljus träinlägg
    ctx.fillRect(116, 0, 10, 512);
    ctx.fillStyle = "#d9b382"; // träaccent
    ctx.fillRect(130, 0, 28, 512);

    const handleTex = new THREE.CanvasTexture(canvas);
    const handleMat = new THREE.MeshStandardMaterial({
      map: handleTex,
      roughness: 0.45,
      metalness: 0.05,
    });

    const mesh = new THREE.Mesh(geom, handleMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Infälld kristallins (badge) med logotyp nära basen
    const lensGeom = new THREE.CylinderGeometry(0.085, 0.085, 0.025, 24);
    lensGeom.rotateX(Math.PI / 2);

    const lensCanvas = document.createElement("canvas");
    lensCanvas.width = 128;
    lensCanvas.height = 128;
    const lctx = lensCanvas.getContext("2d");
    lctx.fillStyle = "#0c0d10";
    lctx.fillRect(0, 0, 128, 128);
    lctx.fillStyle = "#ff4a1c";
    lctx.beginPath();
    lctx.arc(64, 64, 56, 0, Math.PI * 2);
    lctx.stroke();
    lctx.font = "bold 18px Archivo, sans-serif";
    lctx.textAlign = "center";
    lctx.fillStyle = "#ffffff";
    lctx.fillText("DONIC", 64, 58);
    lctx.font = "10px 'Space Mono', monospace";
    lctx.fillStyle = "#ff4a1c";
    lctx.fillText("OFF 89", 64, 76);

    const lensTex = new THREE.CanvasTexture(lensCanvas);
    const lensMat = new THREE.MeshStandardMaterial({
      map: lensTex,
      roughness: 0.15,
      metalness: 0.7,
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

      this.container.appendChild(this.renderer.domElement);
      this.renderer.domElement.style.width = "100%";
      this.renderer.domElement.style.height = "100%";
      this.renderer.domElement.style.display = "block";

      this.clock = new THREE.Clock();

      // Huvudgrupp för racket (för rotation och flyt)
      this.racketRoot = new THREE.Group();
      // Centrera sweetspot något runt mittpunkten
      this.racketRoot.position.set(0, -0.35, 0);
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
      // Mjuk ambientbelysning
      const ambientLight = new THREE.AmbientLight(0xf8f8fa, 0.65);
      this.scene.add(ambientLight);

      // Huvudljus framifrån/ovan (varm vit)
      this.keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
      this.keyLight.position.set(2.5, 4, 3.5);
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.width = 1024;
      this.keyLight.shadow.mapSize.height = 1024;
      this.keyLight.shadow.camera.near = 0.5;
      this.keyLight.shadow.camera.far = 10;
      this.scene.add(this.keyLight);

      // Motljus / Rim-ljus med PP Pingis orange signaturton
      const rimLight = new THREE.DirectionalLight(0xff4a1c, 1.8);
      rimLight.position.set(-3.5, 2, -3);
      this.scene.add(rimLight);

      // Mjukt fyllnadsljus bakifrån
      const backFill = new THREE.DirectionalLight(0x7090b0, 0.7);
      backFill.position.set(0, -2, -3.5);
      this.scene.add(backFill);

      // Punktljus som följer musen i hero
      this.pointerLight = new THREE.PointLight(0xff7744, 0.8, 6);
      this.pointerLight.position.set(0, 0.5, 2.5);
      this.scene.add(this.pointerLight);
    }

    buildRacket() {
      // 1. Träblad (Stomme)
      const bladeShape = createBladeShape();
      const bladeGeom = new THREE.ExtrudeGeometry(bladeShape, {
        depth: 0.065,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
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
        roughness: 0.38,
        metalness: 0.04,
      });
      const woodEdgeMat = new THREE.MeshStandardMaterial({
        map: woodEdgeTex,
        roughness: 0.65,
        metalness: 0.02,
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
      const spongeGeom = new THREE.ExtrudeGeometry(rubberShape, {
        depth: 0.024,
        bevelEnabled: false,
      });

      // FH Sponge (ofta blå hos Donic BlueStar/Acuda, eller orange/kräm)
      const fhSpongeColor = this.fhData.spongeColor || (this.fhData.color === "blue" ? "#ff7020" : "#1b74f0");
      this.fhSpongeMat = new THREE.MeshStandardMaterial({
        color: fhSpongeColor,
        roughness: 0.9,
      });
      this.fhSpongeMesh = new THREE.Mesh(spongeGeom, this.fhSpongeMat);
      this.fhSpongeMesh.position.set(0, 0, 0.033);
      this.layerGroups.fhSponge.add(this.fhSpongeMesh);

      // BH Sponge
      const bhSpongeColor = this.bhData.spongeColor || "#1b74f0";
      this.bhSpongeMat = new THREE.MeshStandardMaterial({
        color: bhSpongeColor,
        roughness: 0.9,
      });
      this.bhSpongeMesh = new THREE.Mesh(spongeGeom.clone(), this.bhSpongeMat);
      this.bhSpongeMesh.position.set(0, 0, -0.057);
      this.layerGroups.bhSponge.add(this.bhSpongeMesh);

      // 3. Forehand & Backhand Ytgummi (Topsheet)
      const topsheetGeom = new THREE.ExtrudeGeometry(rubberShape, {
        depth: 0.016,
        bevelEnabled: true,
        bevelThickness: 0.005,
        bevelSize: 0.005,
        bevelSegments: 2,
      });

      // FH Ytgummi
      const fhTex = createRubberTexture(this.fhData.name, this.fhData.color !== "black", this.fhData.colorHex);
      this.fhRubberMat = new THREE.MeshStandardMaterial({
        map: fhTex,
        roughness: 0.28,
        metalness: 0.04,
      });
      this.fhRubberMesh = new THREE.Mesh(topsheetGeom, this.fhRubberMat);
      this.fhRubberMesh.position.set(0, 0, 0.057);
      this.layerGroups.fhTopsheet.add(this.fhRubberMesh);

      // BH Ytgummi (svart)
      const bhTex = createRubberTexture(this.bhData.name, false, this.bhData.colorHex || "#17181c");
      this.bhRubberMat = new THREE.MeshStandardMaterial({
        map: bhTex,
        roughness: 0.28,
        metalness: 0.04,
      });
      this.bhRubberMesh = new THREE.Mesh(topsheetGeom.clone(), this.bhRubberMat);
      // Vänd mot baksidan
      this.bhRubberMesh.position.set(0, 0, -0.078);
      this.layerGroups.bhTopsheet.add(this.bhRubberMesh);

      // 4. Kantband (skyddsband runt kanten)
      this.buildEdgeTape();
    }

    buildEdgeTape() {
      // Tunt band som sveper runt bladets ovandel
      const tapeShape = createBladeShape();
      const points = tapeShape.getPoints(80);
      // Filtrera bort punkterna nere vid handtaget
      const rimPoints = points.filter((p) => p.y >= 0.02);

      const curve = new THREE.CatmullRomCurve3(
        rimPoints.map((p) => new THREE.Vector3(p.x, p.y, 0))
      );

      // Rektangulärt tvärsnitt för kantbandet
      const tapeGeom = new THREE.TubeGeometry(curve, 90, 0.012, 6, false);
      const tapeTex = createEdgeTapeTexture(this.edgeTapeData.name);
      const tapeMat = new THREE.MeshStandardMaterial({
        map: tapeTex,
        roughness: 0.5,
        metalness: 0.1,
      });

      this.edgeTapeMesh = new THREE.Mesh(tapeGeom, tapeMat);
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

      // Mjuk interpolation (lerp) mot målvinklar
      this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.08;
      this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.08;

      // Svängande svävning (floaty) i Hero-läge
      if (this.mode === "hero") {
        const floatY = Math.sin(time * 1.5) * 0.08;
        const floatRotZ = Math.sin(time * 0.9) * 0.05;
        this.racketRoot.position.y = -0.35 + floatY;
        this.racketRoot.rotation.x = this.currentRotation.x;
        this.racketRoot.rotation.y = this.currentRotation.y;
        this.racketRoot.rotation.z = floatRotZ;
      } else {
        this.racketRoot.rotation.x = this.currentRotation.x;
        this.racketRoot.rotation.y = this.currentRotation.y;
      }

      // Sprängskiss-animation (flyttar skikten längs Z-axeln)
      const explodeDist = this.isExploded ? 0.38 : 0;
      const lerpSpeed = 0.1;

      this.layerGroups.fhTopsheet.position.z += (explodeDist * 1.8 - this.layerGroups.fhTopsheet.position.z) * lerpSpeed;
      this.layerGroups.fhSponge.position.z += (explodeDist * 0.9 - this.layerGroups.fhSponge.position.z) * lerpSpeed;
      this.layerGroups.bhSponge.position.z += (-explodeDist * 0.9 - this.layerGroups.bhSponge.position.z) * lerpSpeed;
      this.layerGroups.bhTopsheet.position.z += (-explodeDist * 1.8 - this.layerGroups.bhTopsheet.position.z) * lerpSpeed;

      // Bollfysik (när studsen är aktiverad)
      if (this.ballMesh && this.ballPhysics.active) {
        this.ballPhysics.vy -= 0.007; // gravitation
        this.ballPhysics.y += this.ballPhysics.vy;

        // Träffpunkt på racketens yta (runt y = 0.5)
        const hitY = 0.55;
        if (this.ballPhysics.y <= hitY && this.ballPhysics.vy < 0) {
          this.ballPhysics.y = hitY;
          this.ballPhysics.vy = -this.ballPhysics.vy * 0.82; // studs med dämpning
          playHitSound("rubber");

          if (Math.abs(this.ballPhysics.vy) < 0.02) {
            this.ballPhysics.active = false;
            this.ballPhysics.y = 2.5;
          }
        }
        this.ballMesh.position.y = this.ballPhysics.y;
        this.ballMesh.position.x = 0.2 + Math.sin(time * 3) * 0.05;
        this.ballMesh.rotation.x += 0.04;
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
