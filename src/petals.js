const TAU = Math.PI * 2;

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function pickColor(palette) {
  return palette[Math.floor(Math.random() * palette.length)];
}

const DEFAULT_PALETTE = [
  { hue: 340, sat: 80, light: 90 },
  { hue: 345, sat: 75, light: 87 },
  { hue: 335, sat: 70, light: 92 },
  { hue: 350, sat: 80, light: 85 },
  { hue: 5, sat: 65, light: 90 },
];

function makePetal(width, height, settled, opts) {
  const size = rand(opts.minSize, opts.maxSize);
  const color = pickColor(opts.palette);
  return {
    x: rand(-size, width + size),
    y: settled ? rand(-height * 0.2, height) : rand(-height * 0.4, -size * 2),
    size,
    rot: rand(0, TAU),
    vrot: rand(-0.025, 0.025),
    vy: rand(0.35, 0.95) * opts.speed,
    vx: rand(-0.25, 0.25) * opts.speed,
    sway: rand(0.6, 1.4),
    swayPhase: rand(0, TAU),
    swaySpeed: rand(0.0008, 0.0018),
    color,
    alpha: rand(0.65, 0.95),
    spin: rand(0.4, 1),
  };
}

function drawPetal(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(p.spin, 1);
  ctx.globalAlpha = p.alpha;

  const { hue, sat, light } = p.color;
  const grad = ctx.createRadialGradient(0, -p.size * 0.4, 0, 0, 0, p.size * 1.1);
  grad.addColorStop(0, `hsl(${hue}, ${sat}%, ${Math.min(98, light + 6)}%)`);
  grad.addColorStop(0.55, `hsl(${hue}, ${sat}%, ${light}%)`);
  grad.addColorStop(1, `hsl(${hue}, ${sat - 10}%, ${Math.max(60, light - 18)}%)`);
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(0, -p.size);
  ctx.bezierCurveTo(p.size * 0.7, -p.size * 0.55, p.size * 0.7, p.size * 0.55, 0, p.size);
  ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.55, -p.size * 0.7, -p.size * 0.55, 0, -p.size);
  ctx.fill();

  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.ellipse(0, -p.size * 0.95, p.size * 0.22, p.size * 0.32, 0, 0, TAU);
  ctx.fill();

  ctx.restore();
}

export function startPetals(canvas, options = {}) {
  const opts = {
    count: options.count ?? 32,
    speed: options.speed ?? 1,
    minSize: options.minSize ?? 7,
    maxSize: options.maxSize ?? 18,
    palette: options.palette ?? DEFAULT_PALETTE,
  };

  const ctx = canvas.getContext('2d', { alpha: true });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targetCount = reduced ? Math.min(8, opts.count) : opts.count;

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  const petals = [];
  let rafId = 0;
  let last = performance.now();
  let visible = true;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function step(now) {
    const dt = Math.min(48, now - last);
    last = now;

    while (petals.length < targetCount) {
      petals.push(makePetal(width, height, petals.length < targetCount * 0.6, opts));
    }

    ctx.clearRect(0, 0, width, height);

    const speedScale = dt * 0.06;
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.swayPhase += p.swaySpeed * dt;
      const swayX = Math.sin(p.swayPhase) * p.sway;
      p.x += (p.vx + swayX * 0.4) * speedScale;
      p.y += p.vy * speedScale;
      p.rot += p.vrot * speedScale;

      drawPetal(ctx, p);

      if (
        p.y - p.size > height ||
        p.x < -p.size * 6 ||
        p.x > width + p.size * 6
      ) {
        petals[i] = makePetal(width, height, false, opts);
      }
    }

    rafId = requestAnimationFrame(step);
  }

  function start() {
    if (rafId) return;
    last = performance.now();
    rafId = requestAnimationFrame(step);
  }

  function stop() {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function onVisibility() {
    if (document.hidden) {
      visible = false;
      stop();
    } else if (!visible) {
      visible = true;
      start();
    }
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  start();

  return () => {
    stop();
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
