
# Hex Forge

Hex Forge is a playful hex-grid toy built for fun . It lets you sculpt block worlds, upload images and turn them into hex mosaics, trigger type-driven wave patterns, and make the board dance to music.

## What it does

- Sculpt layered hex blocks with rotating board placement and reflective materials.
- Import a local image and rebuild it as a deep hex relief with crop selection for larger images.
- Play with hover-driven animated hexes, flowers, and stick figures.
- Generate colorful type waves on random hexes.
- Drive the board with local audio analysis and animated beat pulses.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.
## Future Plans
- Increase the depth for image rendering 
- Integrate some model(Automate a random colored canvas art)
 
## Build

```bash
npm run build
npx tsc --noEmit
```

## Notes

- This project is made for fun and experimentation.
- Audio and image files are handled locally in the browser.
- The codebase is intentionally focused on one canvas engine instead of a large framework stack.
