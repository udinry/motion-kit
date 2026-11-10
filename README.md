# motion-kit

Shared motion library for the studios. The rules it implements live in `ig-owner/accounts/MOTION.md`, including each channel's look and signature moves; read that first.

| folder | what |
|---|---|
| `remotion/` | TSX for Remotion 4.0.462 / React 18: easing (`expoOut`, `critSpring`, `overshoot`, `anticipation`, `squashStretch`, `stagger`), `DriftCamera`, `PunchIn`, `Parallax`, `MaskRise` + `readTime`, `DigitRoll`, `CountUp`, `AxisRescaleShock`, `LiveLineChart`, `BeforeAfterSlider`, `Telestrator*`, `HitStop`/`useHitStop`, `Grain`, `Vignette`, `PaperGround`, `Confetti`, `CameraFlash`, `SpotlightSweep`, `MaskedWipe`, `JCutAudio`/`jCut`, `MotionBlur` |
| `remotion/three/` | separate entry (`MoneyBars3D`, `projectPoint`, `cameraAt`); needs three 0.160, @react-three/fiber 8.17, drei 9.109, @react-three/postprocessing 2.16, @remotion/three. Render with `--gl=angle` |
| `html/` | plain ES modules, pure functions of `t` seconds, for the HyperFrames/GSAP rigs (no GSAP dependency): `drift punchIn parallax maskRise digitRoll countUp drawStroke hitStop flash spotlight confetti squashStretch anticipate boil` plus canvas `drawGrain drawVignette ...`. `demo.html?t=2.4` shows them |
| `py/` | `beat.py` (`uv run --with librosa python py/beat.py music.wav --fps 30 --out beat.json`), `sfx_peak.py`, `contact.py` (`uv run --with pillow python py/contact.py ...`) |
| `demo/` | Remotion project, composition `Showcase` (1080x1920, 24 s). `npm i`, `npm run render` writes `demo/out/showcase.mp4` |
| `sync.py` | vendor into a studio |

## Sync

    python sync.py C:/path/to/studio --kind remotion          # -> src/motion-kit/ (+ VERSION)
    python sync.py C:/path/to/studio --kind remotion --no-three
    python sync.py C:/path/to/studio --kind html              # -> engine/lib/motion-kit/ or --dest

Import with `import {MaskRise, expoOut} from './motion-kit'` and `from './motion-kit/three'`. Remotion deps needed by the non-3D part: `remotion`, `@remotion/motion-blur`.

## Notes

- Everything is a function of the frame number; no timers or carried state. Seeds are explicit.
- Sound: `py/sfx_peak.py hit.wav --events 8.2` gives the start offset that puts the sample peak on the event; `JCutAudio` starts a scene's sound 4-8 frames early.
- Do not edit vendored copies in a studio; change the kit and re-sync.
