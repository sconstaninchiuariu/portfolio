const roles = [
    'IT Support Specialist',
    'Web Developer',
    'Infrastructure Engineer',
    'Systems Technician'
];

const typedEl = document.getElementById('typed');
const header = document.getElementById('header');
const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');

let roleIndex = 0;
let charIndex = 0;
let deleting = false;

function typeLoop() {
    const current = roles[roleIndex];

    if (deleting) {
        charIndex--;
        typedEl.textContent = current.slice(0, charIndex);
        if (charIndex === 0) {
            deleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
            setTimeout(typeLoop, 400);
            return;
        }
        setTimeout(typeLoop, 35);
    } else {
        charIndex++;
        typedEl.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) {
            deleting = true;
            setTimeout(typeLoop, 2200);
            return;
        }
        setTimeout(typeLoop, 75);
    }
}

typeLoop();

window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
});

menuToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuToggle.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
});

nav.addEventListener('click', e => {
    if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        menuToggle.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
    }
});

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.card, .section h2, .hero .eyebrow, .subtitle, .meta, .actions, .contact-note').forEach(el => {
    el.classList.add('reveal');
    observer.observe(el);
});

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Molten Metal background (WebGL2) ---------- */

const moltenCfg = {
    color1: '#5227FF',
    color2: '#FF9FFC',
    color3: '#FFFFFF',
    speed: 0.35,
    scale: 4,
    detail: 3,
    glow: 1.1,
    coreSize: 0.1,
    swirl: 1,
    fold: -0.2,
    blackPoint: 0.05,
    brightness: 0.95,
    colorMode: 'molten',
    grain: true,
    grainIntensity: 0.05,
    mouseInteraction: true,
    mouseStrength: 0.3,
    opacity: 1.0
};

const MOLTEN_VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const MOLTEN_FRAG = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uScale;
uniform float uDetail;
uniform float uGlow;
uniform float uCoreSize;
uniform float uSwirl;
uniform float uFold;
uniform float uBlackPoint;
uniform float uBrightness;
uniform float uColorMode;
uniform float uGrain;
uniform float uGrainIntensity;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform bool uEnableMouse;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  float time = iTime * uSpeed;
  vec2 p = uScale * ((gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y) - 0.5;

  vec2 drift = vec2(0.0);
  if (uEnableMouse) {
    drift = (uMouse - 0.5) * uMouseStrength * 2.0;
  }
  p += drift;

  vec2 i = p;
  float c = 0.0;
  float r = length(p + vec2(sin(time), sin(time * 0.3 + 5.0)) * 0.5);
  float d = length(p);
  float rot = d + time + p.x * uSwirl;

  float cosRot = cos(rot);
  mat2 warp = mat2(cos(rot - sin(time / 5.0)), sin(rot), -sin(cosRot - time), cosRot) * uFold;
  float glowCore = uGlow * uCoreSize;

  for (float n = 0.0; n < 8.0; n++) {
    if (n >= uDetail) break;
    p *= warp;
    float t = r - time / (n + 3.0);
    i -= p + vec2(cos(t - i.x - r) + sin(t + i.y), sin(t - i.y) + cos(t + i.x) + r);
    c += glowCore / length(vec2(sin(i.x + t), cos(i.y + t)));
  }

  c /= 6.0;

  float intensity = max(c - uBlackPoint, 0.0) * uBrightness;

  float g = clamp(intensity, 0.0, 1.0);

  float mid = 0.5;
  if (uColorMode > 1.5) {
    mid = 0.65;
  } else if (uColorMode > 0.5) {
    mid = 0.35;
  }

  vec3 col = mix(uColor1, uColor2, smoothstep(0.0, mid, g));
  col = mix(col, uColor3, smoothstep(mid, 1.0, g));

  float a = g;
  if (uGrain > 0.5) {
    float gr = hash(gl_FragCoord.xy + iTime);
    a += (gr - 0.5) * uGrainIntensity;
  }
  a = clamp(a, 0.0, 1.0) * uOpacity;
  fragColor = vec4(col * a, a);
}
`;

function compileShader(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh));
        return null;
    }
    return sh;
}

function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function initMolten(canvas, cfg) {
    const gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false
    });
    if (!gl) return;

    const vs = compileShader(gl, gl.VERTEX_SHADER, MOLTEN_VERT);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, MOLTEN_FRAG);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const names = ['iResolution', 'iTime', 'uSpeed', 'uScale', 'uDetail', 'uGlow', 'uCoreSize',
        'uSwirl', 'uFold', 'uBlackPoint', 'uBrightness', 'uColorMode', 'uGrain',
        'uGrainIntensity', 'uOpacity', 'uMouse', 'uMouseStrength', 'uEnableMouse',
        'uColor1', 'uColor2', 'uColor3'];
    const u = {};
    names.forEach(n => u[n] = gl.getUniformLocation(prog, n));

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.clearColor(0, 0, 0, 0);

    const c1 = hexToRgb(cfg.color1);
    const c2 = hexToRgb(cfg.color2);
    const c3 = hexToRgb(cfg.color3);
    const modeFloat = cfg.colorMode === 'ember' ? 1 : cfg.colorMode === 'frost' ? 2 : 0;

    const mouse = new Float32Array([0.5, 0.5]);
    const target = [0.5, 0.5];

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, canvas.clientWidth);
        const h = Math.max(1, canvas.clientHeight);
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(u.iResolution, canvas.width, canvas.height);
    }

    gl.uniform1f(u.iTime, 0);
    gl.uniform1f(u.uSpeed, cfg.speed);
    gl.uniform1f(u.uScale, cfg.scale);
    gl.uniform1f(u.uDetail, cfg.detail);
    gl.uniform1f(u.uGlow, cfg.glow);
    gl.uniform1f(u.uCoreSize, Math.max(cfg.coreSize, 0.001));
    gl.uniform1f(u.uSwirl, cfg.swirl);
    gl.uniform1f(u.uFold, cfg.fold);
    gl.uniform1f(u.uBlackPoint, cfg.blackPoint);
    gl.uniform1f(u.uBrightness, cfg.brightness);
    gl.uniform1f(u.uColorMode, modeFloat);
    gl.uniform1i(u.uGrain, cfg.grain ? 1 : 0);
    gl.uniform1f(u.uGrainIntensity, cfg.grainIntensity);
    gl.uniform1f(u.uOpacity, cfg.opacity);
    gl.uniform2f(u.uMouse, 0.5, 0.5);
    gl.uniform1f(u.uMouseStrength, cfg.mouseStrength);
    gl.uniform1i(u.uEnableMouse, cfg.mouseInteraction ? 1 : 0);
    gl.uniform3f(u.uColor1, c1[0], c1[1], c1[2]);
    gl.uniform3f(u.uColor2, c2[0], c2[1], c2[2]);
    gl.uniform3f(u.uColor3, c3[0], c3[1], c3[2]);

    resize();
    window.addEventListener('resize', resize);

    if (cfg.mouseInteraction) {
        window.addEventListener('pointermove', e => {
            target[0] = e.clientX / window.innerWidth;
            target[1] = 1 - e.clientY / window.innerHeight;
        });
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function render(t) {
        gl.uniform1f(u.iTime, t);
        mouse[0] += 0.05 * (target[0] - mouse[0]);
        mouse[1] += 0.05 * (target[1] - mouse[1]);
        gl.uniform2f(u.uMouse, mouse[0], mouse[1]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    if (reduced) {
        render(0);
        return;
    }

    let raf = 0;
    let isVisible = true;
    let isPageVisible = !document.hidden;

    const loop = now => {
        t += Math.min(0.05, (now - last) / 1000);
        last = now;
        render(t);
        raf = requestAnimationFrame(loop);
    };

    const tryStart = () => {
        if (isVisible && isPageVisible && raf === 0) raf = requestAnimationFrame(loop);
    };
    const tryStop = () => {
        if (raf !== 0) {
            cancelAnimationFrame(raf);
            raf = 0;
        }
    };

    const io = new IntersectionObserver(
        ([entry]) => {
            isVisible = entry.isIntersecting;
            isVisible ? tryStart() : tryStop();
        },
        { threshold: 0 }
    );
    io.observe(canvas);

    const onVisibility = () => {
        isPageVisible = !document.hidden;
        isPageVisible ? tryStart() : tryStop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    let last = performance.now();
    let t = 0;
    tryStart();
}

const moltenCanvas = document.getElementById('topoCanvas');
if (moltenCanvas) initMolten(moltenCanvas, moltenCfg);

/* ---------- Premium interactions ---------- */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const progressBar = document.getElementById('scrollProgress');
const backTop = document.getElementById('backTop');

function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    progressBar.style.width = (p * 100) + '%';
    backTop.classList.toggle('show', window.scrollY > 600);
}

window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));

const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('nav a');

const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + entry.target.id));
    });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => spy.observe(s));

document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
    card.addEventListener('pointerleave', () => {
        card.style.setProperty('--mx', '50%');
        card.style.setProperty('--my', '50%');
    });
});

if (window.matchMedia('(pointer: fine)').matches && !reducedMotion) {
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('pointermove', e => {
            const r = btn.getBoundingClientRect();
            const dx = e.clientX - (r.left + r.width / 2);
            const dy = e.clientY - (r.top + r.height / 2);
            btn.style.transform = 'translate(' + dx * 0.22 + 'px, ' + dy * 0.22 + 'px)';
        });
        btn.addEventListener('pointerleave', () => {
            btn.style.transform = '';
        });
    });
}

