# Mother's Day Card

An interactive single-page Mother's Day card. The card floats in front of a customizable flower background with cherry-blossom petals drifting across the screen. Tap to flip and reveal a handwritten-style message; drag to tilt; a soft paper-flip sound plays on each turn. Designed mobile-first and tested at iPhone 16 Pro Max dimensions.

## Quick start

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

For a deployable static build:

```bash
npm run build
npm run preview   # optional local preview of the built site
```

The build is written to `dist/` and can be hosted on GitHub Pages, Netlify, or any static host.

## Customizing your card

Everything lives in [`public/config.json`](public/config.json):

```json
{
  "frontImage": "./card-front.png",
  "frontImageAlt": "Mother's Day card front",
  "backgroundImage": "./background-flowers.png",
  "scriptFont": "Great Vibes",
  "message": "Happy Mother's Day\n\nYour message here.",
  "signature": "With all my love",
  "petalCount": 32,
  "petalSpeed": 1,
  "soundEnabled": true,
  "backgroundAudio": "./your-song.mp3",
  "backgroundAudioVolume": 0.4,
  "backgroundAudioAutoplay": true,
  "cardAspect": null
}
```

| Field | What it controls |
|-------|------------------|
| `frontImage` | The picture used as the entire card front. Drop your PNG/JPG/SVG into [`public/`](public/) and reference it as `"./your-file.png"`. |
| `frontImageAlt` | Accessibility description of the front image. |
| `backgroundImage` | Full-page background image. Same rule: put it in `public/` and point here. |
| `scriptFont` | Google Font used for the inside message. The defaults `Great Vibes` and `Dancing Script` are already loaded; for any other family edit the `<link>` in [`index.html`](index.html). |
| `message` | The handwritten message. Use `\n\n` between paragraphs. |
| `signature` | Smaller signature line beneath the message. |
| `petalCount` | How many cherry-blossom petals drift on screen. `0` disables. |
| `petalSpeed` | Multiplier for petal speed (default `1`). |
| `soundEnabled` | Whether the flip sound is on by default (the user can mute via the on-screen button). |
| `backgroundAudio` | Path to an MP3/OGG/WAV file in [`public/`](public/) (e.g. `"./song.mp3"`) that loops in the background. Set to `null` to disable. |
| `backgroundAudioVolume` | Background music volume from `0` to `1` (default `0.4`). |
| `backgroundAudioAutoplay` | If `true`, music starts on the first tap/click/key press (browsers block autoplay before any user gesture). |
| `cardAspect` | Optional CSS aspect ratio (e.g. `"4 / 5"`). When `null`, the card auto-matches the natural dimensions of `frontImage` so the PNG fills it edge-to-edge. |
| `cardWidth` | Optional CSS width override (e.g. `"min(86vw, 480px)"`). |

### Background music

1. Drop your MP3 (or OGG/WAV) into [`public/`](public/), e.g. `public/lullaby.mp3`.
2. Set `"backgroundAudio": "./lullaby.mp3"` in [`public/config.json`](public/config.json).
3. Reload. Because every browser blocks audio autoplay before a user interaction, the song starts the moment you tap, click, or press a key — and loops forever. The on-screen sound button (top right) fades the music out and back in, and the preference is remembered across visits.

Paths in `config.json` are resolved relative to the deployed site root, so always start them with `./`.

### Adding your own front image

1. Save your PNG (or JPG/SVG) to [`public/`](public/), e.g. `public/my-card.png`.
2. Update `frontImage` in `config.json` to `"./my-card.png"`.
3. Reload. The card will automatically size itself to your image's aspect ratio so the PNG covers the entire face with no letterboxing or cropping.

If your image is portrait (taller than wide) it will look most natural on phones; landscape works too.

## Interactions

- **Tap or click** the card to flip it (plays a soft page-turn sound).
- **Drag** the card to tilt it in 3D; release to gently snap back.
- **Keyboard:** focus the card and press `Enter` or `Space` to flip.
- **Sound toggle** (top right) mutes/unmutes; the preference is remembered.
- Animations and petal density respect the system `prefers-reduced-motion` setting.

## Mobile / iPhone 16 Pro Max

- Layout is mobile-first; sized via `vmin` so it never overflows portrait or landscape viewports.
- Uses `100dvh`, `viewport-fit=cover`, and `env(safe-area-inset-*)` so the card and the bottom hint clear the Dynamic Island, status bar, and home indicator.
- `touch-action: none` on the card prevents scroll/zoom hijacking while you drag; the rest of the page uses `touch-action: manipulation` to disable double-tap zoom.

## Project layout

```
index.html              Page shell, font links, sound toggle, petal canvas
src/main.js             Loads config.json, wires flip + drag + sound
src/petals.js           Canvas-based cherry-blossom petal animation
src/audio.js            Procedural flip sound + mute persistence
src/style.css           Layout, 3D scene, typography, motion, mobile sizing
public/config.json      Editable content + asset paths
public/card-front.svg   Default front art (replace with your own PNG)
public/background-*.svg Default background (replace with your own)
```
