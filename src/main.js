import { startPetals } from './petals.js';
import {
  isMuted,
  loadMutedPref,
  playFlipSound,
  setMuted,
  setupBackgroundAudio,
  unlockAudio,
} from './audio.js';

const DEFAULT_CONFIG = {
  frontImage: './card-front.svg',
  frontImageAlt: "Mother's Day card front",
  backgroundImage: './background-flowers.svg',
  message:
    'Dear Mom,\n\nThank you for always being there for me.\nAt every moment, and through every stage of my life.\n\nAs I continue to grow up, and go into the big world,\nI miss being able to see you every day.\n\nBut no matter how far apart we are in miles,\nJust know I will still always be your tiny little baby.\n\nThank you for being the best mom in the world.',
  signature: 'With much love,\nAnderson Chan',
  scriptFont: 'Great Vibes',
  petalCount: 32,
  petalSpeed: 1,
  soundEnabled: true,
  backgroundAudio: null,
  backgroundAudioVolume: 0.4,
  backgroundAudioAutoplay: true,
  cardAspect: null,
};

const MAX_TILT = 22;
const DRAG_THRESHOLD = 6;

async function loadConfig() {
  try {
    const res = await fetch('./config.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`config ${res.status}`);
    const data = await res.json();
    return { ...DEFAULT_CONFIG, ...data };
  } catch (err) {
    console.warn('Using default config:', err);
    return { ...DEFAULT_CONFIG };
  }
}

function applyConfig(config) {
  const root = document.documentElement;

  if (config.backgroundImage) {
    const bgAbs = new URL(config.backgroundImage, document.baseURI).href;
    root.style.setProperty('--bg-url', `url("${bgAbs}")`);
  }
  if (config.scriptFont) {
    root.style.setProperty('--script-font', `'${config.scriptFont}', 'Dancing Script', cursive`);
  }
  if (config.cardWidth) {
    root.style.setProperty('--card-width', config.cardWidth);
  }
  if (config.cardAspect) {
    root.style.setProperty('--card-aspect', config.cardAspect);
  }

  const front = document.getElementById('cardFront');
  if (front && config.frontImage) {
    front.alt = config.frontImageAlt || '';
    front.addEventListener(
      'load',
      () => {
        if (!config.cardAspect && front.naturalWidth && front.naturalHeight) {
          root.style.setProperty(
            '--card-aspect',
            `${front.naturalWidth} / ${front.naturalHeight}`,
          );
        }
      },
      { once: true },
    );
    front.src = config.frontImage;
  }

  const message = document.getElementById('cardMessage');
  if (message) message.textContent = config.message ?? '';

  const signature = document.getElementById('cardSignature');
  if (signature) signature.textContent = config.signature ?? '';
}

function setupSoundToggle(config) {
  const btn = document.getElementById('soundToggle');
  if (!btn) return;
  loadMutedPref();
  if (!config.soundEnabled) setMuted(true);
  btn.setAttribute('aria-pressed', String(isMuted()));
  btn.setAttribute(
    'aria-label',
    isMuted() ? 'Turn sound on' : 'Turn sound off',
  );

  btn.addEventListener('click', () => {
    const next = !isMuted();
    setMuted(next);
    btn.setAttribute('aria-pressed', String(next));
    btn.setAttribute('aria-label', next ? 'Turn sound on' : 'Turn sound off');
    if (!next) {
      unlockAudio();
    }
  });
}

function setupInteractions() {
  const card = document.getElementById('card');
  if (!card) return;

  let flipped = false;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let dragging = false;
  let moved = false;
  /** Tap/scroll on letter area when card is flipped (no pointer capture — allows scroll) */
  let backInnerPointer = null;

  let flipUnpauseTimer = 0;
  const flip = () => {
    flipped = !flipped;
    card.style.setProperty('--flip', flipped ? '180deg' : '0deg');
    card.setAttribute('aria-pressed', String(flipped));
    card.classList.toggle('card--showing-back', flipped);
    /* Pause the bob during the rotation so the card doesn't shift mid-flip */
    card.classList.add('is-flipping');
    clearTimeout(flipUnpauseTimer);
    flipUnpauseTimer = setTimeout(() => card.classList.remove('is-flipping'), 950);
    playFlipSound();
  };

  const setTilt = (x, y) => {
    card.style.setProperty('--tilt-x', `${x.toFixed(2)}deg`);
    card.style.setProperty('--tilt-y', `${y.toFixed(2)}deg`);
  };

  const resetTilt = () => {
    card.classList.remove('is-dragging');
    setTilt(0, 0);
  };

  card.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;

    if (flipped && event.target.closest('.card-back-inner')) {
      unlockAudio();
      backInnerPointer = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      return;
    }

    unlockAudio();
    pointerId = event.pointerId;
    startX = lastX = event.clientX;
    startY = lastY = event.clientY;
    dragging = true;
    moved = false;
    try {
      card.setPointerCapture(pointerId);
    } catch (_) {}
    card.classList.add('is-dragging');
  });

  card.addEventListener('pointermove', (event) => {
    if (backInnerPointer && event.pointerId === backInnerPointer.id) {
      const dx = event.clientX - backInnerPointer.startX;
      const dy = event.clientY - backInnerPointer.startY;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) backInnerPointer.moved = true;
      return;
    }
    if (!dragging || event.pointerId !== pointerId) return;
    lastX = event.clientX;
    lastY = event.clientY;

    const dx = lastX - startX;
    const dy = lastY - startY;
    if (!moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) moved = true;

    const rect = card.getBoundingClientRect();
    const ny = (dx / rect.width) * 2;
    const nx = -(dy / rect.height) * 2;

    const ty = Math.max(-MAX_TILT, Math.min(MAX_TILT, ny * MAX_TILT));
    const tx = Math.max(-MAX_TILT, Math.min(MAX_TILT, nx * MAX_TILT));

    const flipOffset = flipped ? 180 : 0;
    card.style.setProperty('--flip', `${flipOffset + ty * 0.15}deg`);
    setTilt(tx, ty);
  });

  const endDrag = (event) => {
    if (backInnerPointer && event && event.pointerId === backInnerPointer.id) {
      if (!backInnerPointer.moved) flip();
      backInnerPointer = null;
      return;
    }

    if (!dragging || (event && event.pointerId !== pointerId)) return;
    dragging = false;
    if (pointerId !== null) {
      try {
        card.releasePointerCapture(pointerId);
      } catch (_) {}
    }
    pointerId = null;
    resetTilt();
    card.style.setProperty('--flip', flipped ? '180deg' : '0deg');

    if (!moved) flip();
  };

  card.addEventListener('pointerup', endDrag);
  card.addEventListener('pointercancel', (event) => {
    if (backInnerPointer && event.pointerId === backInnerPointer.id) {
      backInnerPointer = null;
      return;
    }
    endDrag(event);
  });
  card.addEventListener('lostpointercapture', endDrag);

  card.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      unlockAudio();
      flip();
    }
  });

  card.addEventListener('dragstart', (event) => event.preventDefault());
}

function setupPetals(config) {
  const canvas = document.getElementById('petals');
  if (!canvas) return;
  startPetals(canvas, {
    count: config.petalCount,
    speed: config.petalSpeed,
  });
}

function setupBackgroundMusic(config) {
  if (!config.backgroundAudio) return;
  const src = new URL(config.backgroundAudio, document.baseURI).href;
  setupBackgroundAudio({
    src,
    volume: config.backgroundAudioVolume,
    autoplay: config.backgroundAudioAutoplay !== false,
    loop: true,
  });

  const tryUnlock = () => {
    unlockAudio();
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach((evt) => {
    window.addEventListener(evt, tryUnlock, { once: false, passive: true });
  });
}

(async function init() {
  const config = await loadConfig();
  applyConfig(config);
  setupSoundToggle(config);
  setupBackgroundMusic(config);
  setupPetals(config);
  setupInteractions();
})();
