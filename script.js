/* ========== RUPESH BOBDE — ULTIMATE 3D CHAOS PORTFOLIO ========== */
/* Scroll fly-through • Bloom + Chromatic • Interactive 3D models • 5 Games */

(() => {
  'use strict';

  // ========== CURSOR ==========
  const cursor = document.getElementById('cursor');
  const follower = document.getElementById('cursorFollower');
  let mouseX = 0, mouseY = 0, followerX = 0, followerY = 0;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
  });
  (function animFollow() {
    followerX += (mouseX - followerX) * 0.14;
    followerY += (mouseY - followerY) * 0.14;
    follower.style.left = followerX + 'px';
    follower.style.top = followerY + 'px';
    requestAnimationFrame(animFollow);
  })();
  document.querySelectorAll('a, button, .project-card, .memory-card, .skill-node, .depth-card, .react-arena').forEach(el => {
    el.addEventListener('mouseenter', () => { cursor.classList.add('hover'); follower.classList.add('hover'); });
    el.addEventListener('mouseleave', () => { cursor.classList.remove('hover'); follower.classList.remove('hover'); });
  });

  // ========== THREE.JS MAIN SCENE + POST + SCROLL ==========
  const threeCanvas = document.getElementById('threeCanvas');
  let scene, camera, renderer, geometryGroup, composer;
  let mouse3d = { x: 0, y: 0 };
  const meshes = [];
  let scrollProgress = 0;
  let bloomStrength = 0.85;
  let chromaOffset = 0.003;

  // Simple bloom + chromatic via custom post (no external passes needed)
  function createPostMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        bloomStrength: { value: bloomStrength },
        chroma: { value: chromaOffset },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float bloomStrength;
        uniform float chroma;
        uniform float time;
        varying vec2 vUv;

        void main() {
          vec2 uv = vUv;
          // Chromatic aberration
          float r = texture2D(tDiffuse, uv + vec2(chroma, 0.0)).r;
          float g = texture2D(tDiffuse, uv).g;
          float b = texture2D(tDiffuse, uv - vec2(chroma, 0.0)).b;
          vec3 color = vec3(r, g, b);

          // Soft bloom approximation (bright pass + blur-ish)
          float brightness = max(max(color.r, color.g), color.b);
          vec3 bloom = color * smoothstep(0.55, 1.0, brightness) * bloomStrength;
          color += bloom * 0.65;

          // Subtle vignette already in CSS, slight pulse
          float pulse = 0.02 * sin(time * 1.5);
          color += pulse * vec3(0.0, 0.15, 0.12);

          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
  }

  function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0, 32);

    renderer = new THREE.WebGLRenderer({
      canvas: threeCanvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    scene.add(new THREE.AmbientLight(0x0a0a18, 0.5));
    const l1 = new THREE.PointLight(0x00f5d4, 2.2, 90); l1.position.set(18, 14, 22); scene.add(l1);
    const l2 = new THREE.PointLight(0xff006e, 1.6, 75); l2.position.set(-20, -12, 16); scene.add(l2);
    const l3 = new THREE.PointLight(0x7b2cbf, 1.4, 65); l3.position.set(0, 22, -12); scene.add(l3);

    geometryGroup = new THREE.Group();
    scene.add(geometryGroup);

    const shapes = [
      { geo: new THREE.IcosahedronGeometry(1.5, 0), color: 0x00f5d4, count: 9 },
      { geo: new THREE.OctahedronGeometry(1.3, 0), color: 0xff006e, count: 7 },
      { geo: new THREE.TetrahedronGeometry(1.6, 0), color: 0x7b2cbf, count: 8 },
      { geo: new THREE.TorusGeometry(1.2, 0.38, 14, 28), color: 0xffbe0b, count: 5 },
      { geo: new THREE.BoxGeometry(1.7, 1.7, 1.7), color: 0x00f5d4, count: 5 }
    ];

    shapes.forEach(({ geo, color, count }) => {
      for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshPhongMaterial({
          color, transparent: true,
          opacity: 0.5 + Math.random() * 0.35,
          shininess: 100, specular: 0x333333,
          wireframe: Math.random() > 0.6
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
          (Math.random() - 0.5) * 55,
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 50 - 8
        );
        mesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0);
        mesh.userData = {
          rotSpeed: { x: (Math.random() - 0.5) * 0.018, y: (Math.random() - 0.5) * 0.018, z: (Math.random() - 0.5) * 0.012 },
          floatSpeed: 0.25 + Math.random() * 0.55,
          floatAmp: 0.5 + Math.random() * 1.0,
          baseY: mesh.position.y,
          baseZ: mesh.position.z
        };
        geometryGroup.add(mesh);
        meshes.push(mesh);
      }
    });

    // Star field
    const pc = 800;
    const pos = new Float32Array(pc * 3);
    const cols = new Float32Array(pc * 3);
    const palette = [new THREE.Color(0x00f5d4), new THREE.Color(0xff006e), new THREE.Color(0x7b2cbf), new THREE.Color(0xffbe0b)];
    for (let i = 0; i < pc; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
      const c = palette[Math.floor(Math.random() * 4)];
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, opacity: 0.8, sizeAttenuation: true }));
    scene.add(points);
    meshes.push(points);

    // Post-processing: render to target then shader
    const rt = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat
    });
    const postScene = new THREE.Scene();
    const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postMat = createPostMaterial();
    postMat.uniforms.tDiffuse.value = rt.texture;
    const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
    postScene.add(postQuad);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      rt.setSize(window.innerWidth, window.innerHeight);
    });

    document.addEventListener('mousemove', e => {
      mouse3d.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse3d.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Scroll-driven fly-through
    window.addEventListener('scroll', () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    }, { passive: true });

    let time = 0;
    function animate() {
      requestAnimationFrame(animate);
      time += 0.012;

      // Scroll camera fly-through path
      const t = scrollProgress;
      camera.position.x = Math.sin(t * Math.PI * 2) * 8 + mouse3d.x * 3;
      camera.position.y = Math.cos(t * Math.PI * 1.5) * 5 + mouse3d.y * 2.5 + t * -6;
      camera.position.z = 32 - t * 22;
      camera.lookAt(
        Math.sin(t * 3) * 4,
        t * -3,
        -10 - t * 15
      );

      // Intensify effects with scroll
      postMat.uniforms.bloomStrength.value = 0.7 + t * 0.6;
      postMat.uniforms.chroma.value = 0.002 + t * 0.006;
      postMat.uniforms.time.value = time;

      meshes.forEach((mesh, idx) => {
        if (mesh.isPoints) {
          mesh.rotation.y = time * 0.04 + t * 0.5;
          mesh.rotation.x = time * 0.015;
          return;
        }
        const d = mesh.userData;
        if (d && d.rotSpeed) {
          mesh.rotation.x += d.rotSpeed.x * (1 + t);
          mesh.rotation.y += d.rotSpeed.y * (1 + t);
          mesh.rotation.z += d.rotSpeed.z;
          mesh.position.y = d.baseY + Math.sin(time * d.floatSpeed + idx) * d.floatAmp;
          mesh.position.z = d.baseZ + Math.sin(time * 0.3 + idx) * 2 * t;
        }
      });
      geometryGroup.rotation.y = time * 0.06 + t * 1.2;

      // Render scene to target, then post
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCam);
    }
    animate();
  }

  if (typeof THREE !== 'undefined') {
    try { initThree(); }
    catch (err) { console.warn('Main 3D scene unavailable (WebGL):', err && err.message ? err.message : err); }
  } else {
    console.warn('Three.js missing');
  }

  // ========== PROJECT 3D MODELS (interactive) ==========
  function createProjectModel(canvasId, type) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof THREE === 'undefined') return;

    try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 50);
    camera.position.z = 5.5;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(canvas.width, canvas.height);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pl = new THREE.PointLight(0x00f5d4, 1.5, 20); pl.position.set(3, 3, 5); scene.add(pl);
    const pl2 = new THREE.PointLight(0xff006e, 0.9, 15); pl2.position.set(-3, -2, 3); scene.add(pl2);

    let mesh;
    if (type === 'vein') {
      // DNA / helix-ish + core
      const group = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.9, 1),
        new THREE.MeshPhongMaterial({ color: 0xff006e, emissive: 0x330011, shininess: 80, transparent: true, opacity: 0.9 })
      );
      group.add(core);
      for (let i = 0; i < 12; i++) {
        const bead = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 12, 12),
          new THREE.MeshPhongMaterial({ color: 0x00f5d4, emissive: 0x003322 })
        );
        const a = (i / 12) * Math.PI * 2;
        bead.position.set(Math.cos(a) * 1.6, Math.sin(a * 2) * 0.6, Math.sin(a) * 1.6);
        group.add(bead);
      }
      mesh = group;
    } else if (type === 'deep') {
      // Eye / lens
      const group = new THREE.Group();
      group.add(new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0x111122, shininess: 120, transparent: true, opacity: 0.85 })
      ));
      group.add(new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 24, 24),
        new THREE.MeshPhongMaterial({ color: 0x00f5d4, emissive: 0x004433, shininess: 100 })
      ));
      group.add(new THREE.Mesh(
        new THREE.TorusGeometry(1.25, 0.08, 12, 48),
        new THREE.MeshPhongMaterial({ color: 0x7b2cbf, emissive: 0x220044 })
      ));
      mesh = group;
    } else {
      // Shield / Aegis
      const group = new THREE.Group();
      group.add(new THREE.Mesh(
        new THREE.OctahedronGeometry(1.3, 0),
        new THREE.MeshPhongMaterial({ color: 0x7b2cbf, emissive: 0x1a0033, shininess: 90, transparent: true, opacity: 0.88 })
      ));
      group.add(new THREE.Mesh(
        new THREE.OctahedronGeometry(0.7, 0),
        new THREE.MeshPhongMaterial({ color: 0x00f5d4, emissive: 0x003322, wireframe: true })
      ));
      mesh = group;
    }
    scene.add(mesh);

    let isDragging = false, prevX = 0, prevY = 0;
    let rotY = 0, rotX = 0.3;
    let targetRotY = 0, targetRotX = 0.3;

    canvas.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      targetRotY += (e.clientX - prevX) * 0.01;
      targetRotX += (e.clientY - prevY) * 0.01;
      prevX = e.clientX; prevY = e.clientY;
    });
    // Touch
    canvas.addEventListener('touchstart', e => { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }, { passive: true });
    canvas.addEventListener('touchend', () => { isDragging = false; });
    canvas.addEventListener('touchmove', e => {
      if (!isDragging) return;
      targetRotY += (e.touches[0].clientX - prevX) * 0.01;
      targetRotX += (e.touches[0].clientY - prevY) * 0.01;
      prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
    }, { passive: true });

    function anim() {
      requestAnimationFrame(anim);
      if (!isDragging) targetRotY += 0.008;
      rotY += (targetRotY - rotY) * 0.1;
      rotX += (targetRotX - rotX) * 0.1;
      mesh.rotation.y = rotY;
      mesh.rotation.x = rotX;
      renderer.render(scene, camera);
    }
    anim();
    } catch (err) {
      console.warn('Project model ' + canvasId + ' unavailable (WebGL):', err && err.message ? err.message : err);
    }
  }

  createProjectModel('modelVein', 'vein');
  createProjectModel('modelDeep', 'deep');
  createProjectModel('modelAegis', 'aegis');

  // ========== 2D PARTICLE LAYER ==========
  const bgCanvas = document.getElementById('bgCanvas');
  const bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;
  let particles = [], w, h;
  function resizeBg() {
    if (!bgCanvas || !bgCtx) return;
    w = bgCanvas.width = innerWidth; h = bgCanvas.height = innerHeight;
  }
  resizeBg(); addEventListener('resize', resizeBg);

  class Particle {
    constructor() { this.reset(true); }
    reset(init) {
      this.x = Math.random() * w; this.y = init ? Math.random() * h : h + 10;
      this.size = Math.random() * 1.6 + 0.3;
      this.speedY = Math.random() * 0.4 + 0.08;
      this.speedX = (Math.random() - 0.5) * 0.25;
      this.opacity = Math.random() * 0.35 + 0.06;
      this.color = Math.random() > 0.6 ? '#00f5d4' : Math.random() > 0.5 ? '#7b2cbf' : '#ff006e';
    }
    update() { this.y -= this.speedY; this.x += this.speedX; if (this.y < -10 || this.x < -10 || this.x > w + 10) this.reset(); }
    draw() {
      bgCtx.beginPath(); bgCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      bgCtx.fillStyle = this.color; bgCtx.globalAlpha = this.opacity; bgCtx.fill(); bgCtx.globalAlpha = 1;
    }
  }
  for (let i = 0; i < 55; i++) particles.push(new Particle());
  const trail = [];
  document.addEventListener('mousemove', e => {
    if (Math.random() > 0.6) trail.push({ x: e.clientX, y: e.clientY, size: Math.random() * 2.2 + 0.6, life: 1, color: Math.random() > 0.5 ? '#00f5d4' : '#ff006e' });
  });
  (function animBg() {
    if (!bgCtx) { requestAnimationFrame(animBg); return; }
    bgCtx.clearRect(0, 0, w, h);
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          bgCtx.beginPath();
          bgCtx.strokeStyle = `rgba(0,245,212,${0.05 * (1 - dist / 100)})`;
          bgCtx.lineWidth = 0.4;
          bgCtx.moveTo(particles[i].x, particles[i].y);
          bgCtx.lineTo(particles[j].x, particles[j].y);
          bgCtx.stroke();
        }
      }
    }
    particles.forEach(p => { p.update(); p.draw(); });
    for (let i = trail.length - 1; i >= 0; i--) {
      const t = trail[i]; t.life -= 0.03; t.size *= 0.95;
      if (t.life <= 0) { trail.splice(i, 1); continue; }
      bgCtx.beginPath(); bgCtx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
      bgCtx.fillStyle = t.color; bgCtx.globalAlpha = t.life * 0.5; bgCtx.fill(); bgCtx.globalAlpha = 1;
    }
    requestAnimationFrame(animBg);
  })();

  // ========== HERO + DEPTH TILT ==========
  const heroLayer = document.getElementById('heroLayer');
  document.addEventListener('mousemove', e => {
    if (!heroLayer) return;
    const x = (e.clientX / innerWidth - 0.5) * 16;
    const y = (e.clientY / innerHeight - 0.5) * 10;
    heroLayer.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
  });
  document.querySelectorAll('.depth-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const rx = ((y - rect.height / 2) / (rect.height / 2)) * -12;
      const ry = ((x - rect.width / 2) / (rect.width / 2)) * 12;
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(10px) scale(1.015)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

  // ========== NAV + STATS + GLITCH ==========
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.querySelector('.nav-links');
  navToggle?.addEventListener('click', () => navLinks.classList.toggle('open'));
  document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

  const sections = document.querySelectorAll('.section');
  const navAs = document.querySelectorAll('.nav-links a');
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navAs.forEach(a => a.classList.remove('active'));
        const active = document.querySelector(`.nav-links a[data-section="${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { threshold: 0.28 });
  sections.forEach(s => navObserver.observe(s));

  let statsAnimated = false;
  function animateStats() {
    if (statsAnimated) return;
    statsAnimated = true;
    document.querySelectorAll('.stat-num').forEach(stat => {
      const target = +stat.dataset.target; let cur = 0; const step = Math.max(target / 50, 0.5);
      const t = setInterval(() => {
        cur += step;
        if (cur >= target) { stat.textContent = target; clearInterval(t); }
        else stat.textContent = Math.floor(cur);
      }, 30);
    });
  }
  const statsObs = new IntersectionObserver(entries => {
    if (entries[0]?.isIntersecting) animateStats();
  }, { threshold: 0.3 });
  const hs = document.querySelector('.hero-stats');
  if (hs) {
    statsObs.observe(hs);
    // If already in view on load (common on desktop)
    const rect = hs.getBoundingClientRect();
    if (rect.top < innerHeight && rect.bottom > 0) setTimeout(animateStats, 400);
  }

  const glitchOverlay = document.getElementById('glitchOverlay');
  setInterval(() => {
    if (Math.random() > 0.88) {
      glitchOverlay.classList.add('active');
      setTimeout(() => glitchOverlay.classList.remove('active'), 50 + Math.random() * 130);
    }
  }, 1600);

  // =========================================================
  //                         GAMES
  // =========================================================

  // --- 1. NEON SNAKE ---
  const snakeCanvas = document.getElementById('snakeCanvas');
  const sCtx = snakeCanvas ? snakeCanvas.getContext('2d') : null;
  const snakeScoreEl = document.getElementById('snakeScore');
  const GRID = 20;
  const COLS = snakeCanvas ? snakeCanvas.width / GRID : 20;
  const ROWS = snakeCanvas ? snakeCanvas.height / GRID : 20;
  let snake, direction, food, snakeScore, snakeRunning, snakeLoop;

  function initSnake() {
    if (!sCtx || !snakeCanvas) return;
    snake = [{ x: 10, y: 10 }]; direction = { x: 1, y: 0 }; food = spawnFood();
    snakeScore = 0; snakeScoreEl.textContent = 'Score: 0'; snakeRunning = false; clearInterval(snakeLoop); drawSnake();
  }
  function spawnFood() {
    let p; do { p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; } while (snake.some(s => s.x === p.x && s.y === p.y));
    return p;
  }
  function drawSnake() {
    if (!sCtx) return;
    sCtx.fillStyle = '#080812'; sCtx.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);
    sCtx.strokeStyle = 'rgba(0,245,212,0.04)'; sCtx.lineWidth = 0.5;
    for (let i = 0; i <= COLS; i++) { sCtx.beginPath(); sCtx.moveTo(i * GRID, 0); sCtx.lineTo(i * GRID, snakeCanvas.height); sCtx.stroke(); }
    for (let i = 0; i <= ROWS; i++) { sCtx.beginPath(); sCtx.moveTo(0, i * GRID); sCtx.lineTo(snakeCanvas.width, i * GRID); sCtx.stroke(); }
    sCtx.shadowBlur = 14; sCtx.shadowColor = '#ff006e'; sCtx.fillStyle = '#ff006e';
    sCtx.beginPath(); sCtx.arc(food.x * GRID + GRID / 2, food.y * GRID + GRID / 2, GRID / 2.3, 0, Math.PI * 2); sCtx.fill(); sCtx.shadowBlur = 0;
    snake.forEach((seg, i) => {
      const a = 1 - (i / snake.length) * 0.45;
      sCtx.shadowBlur = i === 0 ? 16 : 0; sCtx.shadowColor = '#00f5d4';
      sCtx.fillStyle = `rgba(0,245,212,${a})`; sCtx.fillRect(seg.x * GRID + 1, seg.y * GRID + 1, GRID - 2, GRID - 2);
    }); sCtx.shadowBlur = 0;
  }
  function tickSnake() {
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    if (head.x < 0) head.x = COLS - 1; if (head.x >= COLS) head.x = 0;
    if (head.y < 0) head.y = ROWS - 1; if (head.y >= ROWS) head.y = 0;
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      snakeRunning = false; clearInterval(snakeLoop);
      sCtx.fillStyle = 'rgba(255,0,110,0.3)'; sCtx.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height); return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) { snakeScore += 10; snakeScoreEl.textContent = `Score: ${snakeScore}`; food = spawnFood(); }
    else snake.pop();
    drawSnake();
  }
  document.getElementById('snakeStart').addEventListener('click', () => { initSnake(); snakeRunning = true; snakeLoop = setInterval(tickSnake, 100); });
  document.addEventListener('keydown', e => {
    if (!snakeRunning) return;
    if (e.key === 'ArrowUp' && direction.y === 0) direction = { x: 0, y: -1 };
    else if (e.key === 'ArrowDown' && direction.y === 0) direction = { x: 0, y: 1 };
    else if (e.key === 'ArrowLeft' && direction.x === 0) direction = { x: -1, y: 0 };
    else if (e.key === 'ArrowRight' && direction.x === 0) direction = { x: 1, y: 0 };
  });
  let tsX = 0, tsY = 0;
  snakeCanvas.addEventListener('touchstart', e => { tsX = e.touches[0].clientX; tsY = e.touches[0].clientY; }, { passive: true });
  snakeCanvas.addEventListener('touchend', e => {
    if (!snakeRunning) return;
    const dx = e.changedTouches[0].clientX - tsX, dy = e.changedTouches[0].clientY - tsY;
    if (Math.abs(dx) > Math.abs(dy)) { if (dx > 20 && direction.x === 0) direction = { x: 1, y: 0 }; else if (dx < -20 && direction.x === 0) direction = { x: -1, y: 0 }; }
    else { if (dy > 20 && direction.y === 0) direction = { x: 0, y: 1 }; else if (dy < -20 && direction.y === 0) direction = { x: 0, y: -1 }; }
  }, { passive: true });
  initSnake();

  // --- 2. MEMORY ---
  const memoryBoard = document.getElementById('memoryBoard');
  const memoryScoreEl = document.getElementById('memoryScore');
  const ICONS = ['⚛️', '☕', '🔥', '🛡️', '⚡', '🧠', '🔗', '📦'];
  let flipped = [], moves = 0, lockBoard = false;
  function initMemory() {
    memoryBoard.innerHTML = ''; moves = 0; memoryScoreEl.textContent = 'Moves: 0'; flipped = []; lockBoard = false;
    [...ICONS, ...ICONS].sort(() => Math.random() - 0.5).forEach(icon => {
      const card = document.createElement('div');
      card.className = 'memory-card'; card.dataset.icon = icon;
      card.innerHTML = `<span class="front">${icon}</span><span class="back">?</span>`;
      card.addEventListener('click', () => flipCard(card));
      memoryBoard.appendChild(card);
    });
  }
  function flipCard(card) {
    if (lockBoard || card.classList.contains('flipped') || card.classList.contains('matched')) return;
    card.classList.add('flipped'); flipped.push(card);
    if (flipped.length === 2) {
      moves++; memoryScoreEl.textContent = `Moves: ${moves}`; lockBoard = true;
      const [a, b] = flipped;
      if (a.dataset.icon === b.dataset.icon) {
        a.classList.add('matched'); b.classList.add('matched'); flipped = []; lockBoard = false;
        if (document.querySelectorAll('.memory-card.matched').length === 16)
          setTimeout(() => memoryScoreEl.textContent = `Won in ${moves} moves! 🎉`, 300);
      } else setTimeout(() => { a.classList.remove('flipped'); b.classList.remove('flipped'); flipped = []; lockBoard = false; }, 650);
    }
  }
  document.getElementById('memoryStart').addEventListener('click', initMemory);
  initMemory();

  // --- 3. PARTICLE ANNIHILATOR ---
  const pCanvas = document.getElementById('particleCanvas');
  const pCtx = pCanvas ? pCanvas.getContext('2d') : null;
  const particleScoreEl = document.getElementById('particleScore');
  let pParticles = [], pScore = 0, pRunning = false, pAnimId = null, pW, pH;
  function resizeParticle() {
    const rect = pCanvas.getBoundingClientRect();
    pW = pCanvas.width = Math.min(800, rect.width || 800); pH = pCanvas.height = 320;
  }
  resizeParticle();
  class ChaosParticle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * pW; this.y = Math.random() * pH;
      this.vx = (Math.random() - 0.5) * 4.2; this.vy = (Math.random() - 0.5) * 4.2;
      this.r = Math.random() * 8 + 4;
      this.color = ['#00f5d4', '#7b2cbf', '#ff006e', '#ffbe0b'][Math.floor(Math.random() * 4)];
    }
    update() { this.x += this.vx; this.y += this.vy; if (this.x < 0 || this.x > pW) this.vx *= -1; if (this.y < 0 || this.y > pH) this.vy *= -1; }
    draw() {
      pCtx.beginPath(); pCtx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      pCtx.fillStyle = this.color; pCtx.shadowBlur = 14; pCtx.shadowColor = this.color;
      pCtx.globalAlpha = 0.85; pCtx.fill(); pCtx.globalAlpha = 1; pCtx.shadowBlur = 0;
    }
    hit(mx, my) { return Math.hypot(this.x - mx, this.y - my) < this.r + 12; }
  }
  function spawnChaos() {
    pParticles = []; for (let i = 0; i < 36; i++) pParticles.push(new ChaosParticle());
    pScore = 0; particleScoreEl.textContent = 'Destroyed: 0';
  }
  function animateParticles() {
    if (!pRunning) return;
    pCtx.fillStyle = 'rgba(8,8,18,0.2)'; pCtx.fillRect(0, 0, pW, pH);
    pParticles.forEach(p => { p.update(); p.draw(); });
    if (pParticles.length < 20 && Math.random() > 0.96) pParticles.push(new ChaosParticle());
    pAnimId = requestAnimationFrame(animateParticles);
  }
  function destroyAt(x, y) {
    if (!pRunning) return;
    for (let i = pParticles.length - 1; i >= 0; i--) {
      if (pParticles[i].hit(x, y)) {
        pParticles.splice(i, 1); pScore++; particleScoreEl.textContent = `Destroyed: ${pScore}`;
      }
    }
  }
  pCanvas.addEventListener('click', e => {
    const r = pCanvas.getBoundingClientRect();
    destroyAt((e.clientX - r.left) * (pCanvas.width / r.width), (e.clientY - r.top) * (pCanvas.height / r.height));
  });
  pCanvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const r = pCanvas.getBoundingClientRect(); const t = e.touches[0];
    destroyAt((t.clientX - r.left) * (pCanvas.width / r.width), (t.clientY - r.top) * (pCanvas.height / r.height));
  }, { passive: false });
  document.getElementById('particleStart').addEventListener('click', () => {
    if (pAnimId) cancelAnimationFrame(pAnimId); resizeParticle(); spawnChaos(); pRunning = true; animateParticles();
  });
  pCtx.fillStyle = '#080812'; pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
  pCtx.fillStyle = 'rgba(0,245,212,0.4)'; pCtx.font = '14px Orbitron,sans-serif'; pCtx.textAlign = 'center';
  pCtx.fillText('Click "Unleash Chaos"', pCanvas.width / 2, pCanvas.height / 2);

  // --- 4. REACTION CORE ---
  const reactArena = document.getElementById('reactArena');
  const reactMsg = document.getElementById('reactMsg');
  const reactScoreEl = document.getElementById('reactScore');
  let reactState = 'idle', reactTimer = null, reactStart = 0, bestReact = Infinity;

  document.getElementById('reactStart').addEventListener('click', () => {
    if (reactState === 'waiting' || reactState === 'go') return;
    reactState = 'waiting';
    reactArena.className = 'react-arena wait';
    reactMsg.textContent = 'Wait for GREEN…';
    const delay = 1500 + Math.random() * 3000;
    reactTimer = setTimeout(() => {
      reactState = 'go';
      reactArena.className = 'react-arena go';
      reactMsg.textContent = 'CLICK NOW!';
      reactStart = performance.now();
    }, delay);
  });
  reactArena.addEventListener('click', () => {
    if (reactState === 'waiting') {
      clearTimeout(reactTimer);
      reactState = 'tooearly';
      reactArena.className = 'react-arena tooearly';
      reactMsg.textContent = 'Too early! Try again.';
      setTimeout(() => { reactState = 'idle'; reactArena.className = 'react-arena'; reactMsg.textContent = 'Click START then wait for green…'; }, 1200);
    } else if (reactState === 'go') {
      const ms = Math.round(performance.now() - reactStart);
      reactState = 'idle';
      reactArena.className = 'react-arena';
      reactMsg.textContent = `${ms} ms`;
      if (ms < bestReact) { bestReact = ms; reactScoreEl.textContent = `Best: ${bestReact} ms`; }
      setTimeout(() => { reactMsg.textContent = 'Click START then wait for green…'; }, 1500);
    }
  });

  // --- 5. NEON BREAKOUT ---
  const breakCanvas = document.getElementById('breakCanvas');
  const bCtx = breakCanvas ? breakCanvas.getContext('2d') : null;
  const breakScoreEl = document.getElementById('breakScore');
  let breakRunning = false, breakAnim = null;
  let paddle, ball, bricks, breakScore, lives;

  function initBreakout() {
    paddle = { x: breakCanvas.width / 2 - 40, y: breakCanvas.height - 24, w: 80, h: 10 };
    ball = { x: breakCanvas.width / 2, y: breakCanvas.height - 40, vx: 3.2, vy: -3.5, r: 6 };
    bricks = [];
    const rows = 5, cols = 8, bw = 44, bh = 14, pad = 4, offsetX = 18, offsetY = 30;
    const colors = ['#00f5d4', '#7b2cbf', '#ff006e', '#ffbe0b', '#00f5d4'];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({ x: offsetX + c * (bw + pad), y: offsetY + r * (bh + pad), w: bw, h: bh, alive: true, color: colors[r] });
      }
    }
    breakScore = 0; lives = 3; breakScoreEl.textContent = 'Score: 0';
    breakRunning = false; if (breakAnim) cancelAnimationFrame(breakAnim);
    drawBreak();
  }
  function drawBreak() {
    bCtx.fillStyle = '#080812'; bCtx.fillRect(0, 0, breakCanvas.width, breakCanvas.height);
    // paddle
    bCtx.fillStyle = '#00f5d4'; bCtx.shadowBlur = 12; bCtx.shadowColor = '#00f5d4';
    bCtx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h); bCtx.shadowBlur = 0;
    // ball
    bCtx.beginPath(); bCtx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    bCtx.fillStyle = '#ff006e'; bCtx.shadowBlur = 14; bCtx.shadowColor = '#ff006e'; bCtx.fill(); bCtx.shadowBlur = 0;
    // bricks
    bricks.forEach(br => {
      if (!br.alive) return;
      bCtx.fillStyle = br.color; bCtx.shadowBlur = 6; bCtx.shadowColor = br.color;
      bCtx.fillRect(br.x, br.y, br.w, br.h); bCtx.shadowBlur = 0;
    });
    // lives
    bCtx.fillStyle = 'rgba(255,255,255,0.5)'; bCtx.font = '11px Orbitron,sans-serif';
    bCtx.fillText(`Lives: ${lives}`, 10, 16);
  }
  function tickBreak() {
    if (!breakRunning) return;
    ball.x += ball.vx; ball.y += ball.vy;
    if (ball.x - ball.r < 0 || ball.x + ball.r > breakCanvas.width) ball.vx *= -1;
    if (ball.y - ball.r < 0) ball.vy *= -1;
    // paddle
    if (ball.y + ball.r > paddle.y && ball.x > paddle.x && ball.x < paddle.x + paddle.w && ball.vy > 0) {
      ball.vy *= -1;
      const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      ball.vx = hit * 4;
    }
    // bricks
    bricks.forEach(br => {
      if (!br.alive) return;
      if (ball.x > br.x && ball.x < br.x + br.w && ball.y - ball.r < br.y + br.h && ball.y + ball.r > br.y) {
        br.alive = false; ball.vy *= -1; breakScore += 10; breakScoreEl.textContent = `Score: ${breakScore}`;
      }
    });
    if (ball.y > breakCanvas.height) {
      lives--;
      if (lives <= 0) { breakRunning = false; drawBreak(); return; }
      ball.x = breakCanvas.width / 2; ball.y = breakCanvas.height - 40; ball.vx = 3.2; ball.vy = -3.5;
    }
    if (bricks.every(b => !b.alive)) { breakRunning = false; breakScoreEl.textContent = `Score: ${breakScore} — YOU WIN!`; }
    drawBreak();
    breakAnim = requestAnimationFrame(tickBreak);
  }
  document.getElementById('breakStart').addEventListener('click', () => {
    initBreakout(); breakRunning = true; tickBreak();
  });
  breakCanvas.addEventListener('mousemove', e => {
    const r = breakCanvas.getBoundingClientRect();
    paddle.x = (e.clientX - r.left) * (breakCanvas.width / r.width) - paddle.w / 2;
    paddle.x = Math.max(0, Math.min(breakCanvas.width - paddle.w, paddle.x));
  });
  breakCanvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const r = breakCanvas.getBoundingClientRect();
    paddle.x = (e.touches[0].clientX - r.left) * (breakCanvas.width / r.width) - paddle.w / 2;
    paddle.x = Math.max(0, Math.min(breakCanvas.width - paddle.w, paddle.x));
  }, { passive: false });
  initBreakout();

  // ========== KONAMI ==========
  const konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let ki = 0;
  document.addEventListener('keydown', e => {
    if (e.key === konami[ki]) {
      ki++;
      if (ki === konami.length) {
        ki = 0;
        glitchOverlay.classList.add('active');
        setTimeout(() => glitchOverlay.classList.remove('active'), 2800);
        for (let i = 0; i < 40; i++) particles.push(new Particle());
        meshes.forEach(m => { if (m.userData?.rotSpeed) { m.userData.rotSpeed.x *= 2.5; m.userData.rotSpeed.y *= 2.5; } });
        alert('🔥 ULTIMATE CHAOS MODE 🔥\\nAll dimensions unlocked.');
      }
    } else ki = 0;
  });

  console.log('%c RUPESH BOBDE — ULTIMATE 3D CHAOS ', 'background:#00f5d4;color:#030308;font-size:14px;font-weight:bold;padding:8px 12px;');
  console.log('%c Scroll fly-through • Bloom • Chroma • 3D models • 5 games', 'color:#ff006e;');
})();
