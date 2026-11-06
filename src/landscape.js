/* ==========================================================================
   DATA LANDSCAPE
   ==========================================================================

   A field of fine lines, row behind row, shaped into hills by a noise
   function. Unlike the first version, every height is now computed on the
   graphics chip (in the "vertex shader" below), so we can afford ten times
   the detail and still run at full frame rate.

   Four things happen on top of the hills:
   - the highest peaks are drawn bolder than the valleys
   - a band of light sweeps slowly through the field
   - the surface swells and ripples under your cursor
   - scrolling flies the camera forward and down into it
   ========================================================================== */

import * as THREE from 'three';

// ---- Tunable knobs. Change a number, save, and the page updates. ----
const SETTINGS = {
  rows: 96,          // lines front to back
  cols: 260,         // points along each line (smoothness)
  width: 52,         // how wide the field is
  depth: 44,         // how far back it goes
  hillHeight: 1.25,  // how tall the hills are
  drift: 0.05,       // how fast the hills reshape
  scanSpeed: 5.5,    // how fast the light band travels (units per second)
  mouseLift: 1.7,    // how much the surface swells under the cursor
  mouseRadius: 3.4,  // how wide that swell is
  lineOpacity: 0.7,  // base strength of the lines
  dotEvery: 5,       // a glowing dot every N points on every second line
};

/* Simplex noise by Ashima Arts and Stefan Gustavson (MIT licence).
   Smooth random hills: nearby points get similar values, far ones don't. */
const NOISE = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g  = step(x0.yzx, x0.xyz);
    vec3 l  = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j  = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x  = x_ * ns.x + ns.yyyy;
    vec4 y  = y_ * ns.x + ns.yyyy;
    vec4 h  = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
`;

/* The shape of the land, shared by the lines and the dots.
   Runs once per point, every frame, on the graphics chip. */
const TERRAIN = /* glsl */ `
  uniform float uTime;
  uniform float uHill;
  uniform float uDrift;
  uniform vec2  uMouse;
  uniform float uMouseAmt;
  uniform float uMouseLift;
  uniform float uMouseRadius;
  uniform float uScanZ;
  uniform float uHalfWidth;

  varying float vHeight;
  varying float vDepth;
  varying float vScan;
  varying float vEdge;

  float terrain(vec2 p) {
    float t = uTime * uDrift;
    float h = snoise(vec3(p * 0.075, t)) * 1.0;
    h += snoise(vec3(p * 0.19 + 3.7, t * 1.5)) * 0.38;
    h += snoise(vec3(p * 0.52 - 7.1, t * 2.2)) * 0.1;
    h += pow(max(h, 0.0), 2.0) * 0.55;          // sharpen the peaks
    return h * uHill;
  }

  float cursorLift(vec2 p) {
    float d = distance(p, uMouse);
    float swell = exp(-(d * d) / (uMouseRadius * uMouseRadius)) * uMouseLift;
    float ripple = sin(d * 2.3 - uTime * 3.2) * exp(-d * 0.42) * 0.22;
    return (swell + ripple) * uMouseAmt;
  }

  vec4 placePoint(vec3 position) {
    vec3 p = position;
    p.y = terrain(p.xz) + cursorLift(p.xz);

    vHeight = p.y;
    vScan   = exp(-pow(p.z - uScanZ, 2.0) * 0.3);
    vEdge   = 1.0 - smoothstep(0.55, 1.0, abs(p.x) / uHalfWidth);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth  = -mv.z;
    return projectionMatrix * mv;
  }
`;

/* Colour and fade, shared by both layers.
   Lines are white where the sky behind them is blue, and turn sky blue lower
   down where the page fades to white, so they read on both. */
const SHADE = /* glsl */ `
  uniform vec3  uHigh;
  uniform vec3  uLow;
  uniform vec2  uResolution;
  uniform float uFogNear;
  uniform float uFogFar;

  varying float vHeight;
  varying float vDepth;
  varying float vScan;
  varying float vEdge;

  float peak()       { return smoothstep(0.55, 1.7, vHeight); }
  float visibility() {
    float far  = 1.0 - smoothstep(uFogNear, uFogFar, vDepth);   // fade into the distance
    float near = smoothstep(1.5, 4.5, vDepth);                   // and don't block the camera
    return far * near * vEdge;
  }
  vec3 tint() {
    float y = gl_FragCoord.y / uResolution.y;          // 0 at the bottom, 1 at the top
    return mix(uLow, uHigh, smoothstep(0.3, 0.62, y));
  }
`;

export function createLandscape(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (error) {
    canvas.remove(); // no WebGL: the page still works, just without the landscape
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;
  const isSmall = window.innerWidth < 760;

  const rows = isSmall ? 64 : SETTINGS.rows;
  const cols = isSmall ? 150 : SETTINGS.cols;
  const zFront = 6;

  // ---- Scene and camera ----
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  const cameraHome = new THREE.Vector3(0, 2.8, 11);
  const lookHome = new THREE.Vector3(0, 0.4, -10);
  const look = lookHome.clone();

  // ---- Colours come from the CSS tokens ----
  const styles = getComputedStyle(document.documentElement);
  const color = (name, fallback) => new THREE.Color(styles.getPropertyValue(name).trim() || fallback);

  const uniforms = {
    uTime:        { value: 0 },
    uHill:        { value: SETTINGS.hillHeight },
    uDrift:       { value: SETTINGS.drift },
    uMouse:       { value: new THREE.Vector2(0, -4) },
    uMouseAmt:    { value: 0 },
    uMouseLift:   { value: SETTINGS.mouseLift },
    uMouseRadius: { value: SETTINGS.mouseRadius },
    uScanZ:       { value: -100 },
    uHalfWidth:   { value: SETTINGS.width / 2 },
    uHigh:        { value: new THREE.Color('#ffffff') },
    uLow:         { value: color('--sky', '#0099ff') },
    uResolution:  { value: new THREE.Vector2(1, 1) },
    uFogNear:     { value: 9 },
    uFogFar:      { value: 40 },
    uOpacity:     { value: SETTINGS.lineOpacity },
    uPixelRatio:  { value: 1 },
  };

  // ---- Layer 1: the lines ----
  const linePositions = [];
  for (let r = 0; r < rows; r++) {
    const z = zFront - (r / (rows - 1)) * SETTINGS.depth;
    for (let c = 0; c < cols - 1; c++) {
      const x0 = -SETTINGS.width / 2 + (c / (cols - 1)) * SETTINGS.width;
      const x1 = -SETTINGS.width / 2 + ((c + 1) / (cols - 1)) * SETTINGS.width;
      linePositions.push(x0, 0, z, x1, 0, z);
    }
  }
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

  const lineMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    premultipliedAlpha: true,
    vertexShader: NOISE + TERRAIN + /* glsl */ `
      void main() { gl_Position = placePoint(position); }
    `,
    fragmentShader: SHADE + /* glsl */ `
      uniform float uOpacity;
      void main() {
        float a = min(uOpacity * (0.55 + peak() * 0.9 + vScan * 0.8) * visibility(), 1.0);
        gl_FragColor = vec4(tint() * a, a); // colour pre-multiplied by its opacity
      }
    `,
  });
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  lines.frustumCulled = false;
  scene.add(lines);

  // ---- Layer 2: glowing dots on the grid ----
  const dotPositions = [];
  for (let r = 0; r < rows; r += 2) {
    const z = zFront - (r / (rows - 1)) * SETTINGS.depth;
    for (let c = 0; c < cols; c += SETTINGS.dotEvery) {
      dotPositions.push(-SETTINGS.width / 2 + (c / (cols - 1)) * SETTINGS.width, 0, z);
    }
  }
  const dotGeometry = new THREE.BufferGeometry();
  dotGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dotPositions, 3));

  const dotMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    premultipliedAlpha: true,
    vertexShader: NOISE + TERRAIN + /* glsl */ `
      uniform float uPixelRatio;
      void main() {
        gl_Position = placePoint(position);
        float grow = 1.0 + smoothstep(0.55, 1.7, vHeight) * 2.2 + vScan * 1.5;
        gl_PointSize = 34.0 * uPixelRatio * grow / max(vDepth, 1.0);
      }
    `,
    fragmentShader: SHADE + /* glsl */ `
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float disc = smoothstep(0.5, 0.0, d);
        float a = min(disc * (0.25 + peak() * 0.9 + vScan * 0.7) * visibility(), 1.0);
        gl_FragColor = vec4(tint() * a, a);
      }
    `,
  });
  const dots = new THREE.Points(dotGeometry, dotMaterial);
  dots.frustumCulled = false;
  scene.add(dots);

  // ---- The cursor: where is it on the ground? ----
  const raycaster = new THREE.Raycaster();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const pointer = new THREE.Vector2();
  const hit = new THREE.Vector3();
  const mouseTarget = new THREE.Vector2(0, -4);
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  let mouseAmtTarget = 0;

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    tilt.tx = pointer.x;
    tilt.ty = pointer.y;

    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(ground, hit)) {
      mouseTarget.set(hit.x, hit.z);
      mouseAmtTarget = 1;
    }
  }

  if (!isTouch) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { mouseAmtTarget = 0; });
  }

  // ---- Size ----
  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    uniforms.uPixelRatio.value = dpr;
    renderer.getDrawingBufferSize(uniforms.uResolution.value);
    camera.aspect = width / height;
    // Narrow screens: pull back a little so the field still fills the frame.
    camera.fov = camera.aspect < 0.8 ? 58 : 42;
    camera.updateProjectionMatrix();
    if (reducedMotion) render();
  }

  // ---- One frame ----
  const startedAt = performance.now();
  const fieldBack = zFront - SETTINGS.depth;

  function render() {
    renderer.render(scene, camera);
  }

  function frame() {
    const t = (performance.now() - startedAt) / 1000; // seconds since the page opened
    uniforms.uTime.value = t;

    // The light band travels from the back of the field to the front, then starts over.
    uniforms.uScanZ.value = fieldBack + ((t * SETTINGS.scanSpeed) % (SETTINGS.depth + 8));

    // Touch screens have no cursor, so the swell drifts around on its own.
    if (isTouch) {
      mouseTarget.set(Math.sin(t * 0.35) * 6, -2 + Math.cos(t * 0.27) * 4);
      mouseAmtTarget = 0.7;
    }

    // Ease everything towards its target: smooth, weighty movement.
    uniforms.uMouse.value.lerp(mouseTarget, 0.08);
    uniforms.uMouseAmt.value += (mouseAmtTarget - uniforms.uMouseAmt.value) * 0.05;
    tilt.x += (tilt.tx - tilt.x) * 0.04;
    tilt.y += (tilt.ty - tilt.y) * 0.04;

    // Scrolling through the hero flies the camera forward and down.
    const hero = canvas.parentElement;
    const scroll = Math.min(Math.max(window.scrollY / (hero.offsetHeight || 1), 0), 1);

    camera.position.set(
      cameraHome.x + tilt.x * 0.9,
      cameraHome.y + tilt.y * 0.35 - scroll * 1.6,
      cameraHome.z - scroll * 6,
    );
    look.set(lookHome.x + tilt.x * 0.6, lookHome.y - scroll * 0.8, lookHome.z - scroll * 4);
    camera.lookAt(look);

    render();
  }

  // ---- Start ----
  camera.position.copy(cameraHome);
  camera.lookAt(look);
  new ResizeObserver(resize).observe(canvas);
  resize();

  if (reducedMotion) {
    // One still frame, picked for a nice composition.
    uniforms.uTime.value = 14;
    uniforms.uScanZ.value = -10;
    render();
    return;
  }

  // Only draw while the hero is on screen. Scrolled past: zero work.
  new IntersectionObserver(([entry]) => {
    renderer.setAnimationLoop(entry.isIntersecting ? frame : null);
  }).observe(canvas);
}
