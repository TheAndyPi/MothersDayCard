let ctx = null;
let muted = false;
let unlocked = false;

let bgEl = null;
let bgVolume = 0.4;
let bgWantsToPlay = false;
let bgFadeRaf = 0;

function ensureCtx() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

export function setMuted(value) {
  muted = !!value;
  try {
    localStorage.setItem('mdc-muted', muted ? '1' : '0');
  } catch (_) {}
  applyBgMuteState();
}

export function isMuted() {
  return muted;
}

export function loadMutedPref() {
  try {
    muted = localStorage.getItem('mdc-muted') === '1';
  } catch (_) {}
  return muted;
}

export function unlockAudio() {
  const c = ensureCtx();
  if (c) {
    if (c.state === 'suspended') c.resume().catch(() => {});
    if (!unlocked) {
      const buf = c.createBuffer(1, 1, 22050);
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(c.destination);
      try {
        src.start(0);
      } catch (_) {}
      unlocked = true;
    }
  }
  if (bgEl && bgWantsToPlay && !muted) {
    tryStartBg();
  }
}

function tryStartBg() {
  if (!bgEl) return;
  const playPromise = bgEl.play();
  if (playPromise && typeof playPromise.then === 'function') {
    playPromise.catch(() => {
      /* will retry on next gesture */
    });
  }
}

function applyBgMuteState() {
  if (!bgEl) return;
  if (muted) {
    fadeBgTo(0, 250, () => {
      try {
        bgEl.pause();
      } catch (_) {}
    });
  } else if (bgWantsToPlay) {
    tryStartBg();
    fadeBgTo(bgVolume, 600);
  }
}

function fadeBgTo(target, duration, done) {
  if (!bgEl) return;
  cancelAnimationFrame(bgFadeRaf);
  const start = performance.now();
  const startVol = bgEl.volume;
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    bgEl.volume = startVol + (target - startVol) * t;
    if (t < 1) {
      bgFadeRaf = requestAnimationFrame(step);
    } else if (done) {
      done();
    }
  };
  bgFadeRaf = requestAnimationFrame(step);
}

export function setupBackgroundAudio({ src, volume = 0.4, autoplay = true, loop = true } = {}) {
  if (!src) return;
  bgVolume = Math.max(0, Math.min(1, volume));
  bgWantsToPlay = !!autoplay;

  if (!bgEl) {
    bgEl = document.createElement('audio');
    bgEl.preload = 'auto';
    bgEl.crossOrigin = 'anonymous';
    bgEl.style.display = 'none';
    document.body.appendChild(bgEl);
  }
  bgEl.loop = loop;
  bgEl.volume = muted ? 0 : bgVolume;
  bgEl.src = src;

  if (bgWantsToPlay && !muted) {
    tryStartBg();
  }
}

export function isBackgroundLoaded() {
  return !!bgEl;
}

export function playFlipSound() {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});

  const now = c.currentTime;
  const dur = 0.42;

  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * (1 - t) ** 1.6;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2600, now);
  filter.frequency.exponentialRampToValueAtTime(700, now + dur);
  filter.Q.value = 1.4;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  noise.start(now);
  noise.stop(now + dur);
}

export function playChime() {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});

  const now = c.currentTime;
  const notes = [880, 1318.5, 1760];
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.06);
    gain.gain.setValueAtTime(0.0001, now + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.08, now + i * 0.06 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.9);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now + i * 0.06);
    osc.stop(now + i * 0.06 + 1);
  });
}
