# Complete Character Sequences V2

Generated with the built-in image generation tool. Every cell contains a complete character; playback never separates limbs or deforms the torso. Magenta is removed once when each atlas loads. Source atlas files retain their generated pixels.

| Action | Asset | Grid | Playback |
| --- | --- | --- | --- |
| Wings | `public/assets/sequences/wings-frames-v2.png` | 4 x 4 | 16 frames, 6 fps |
| Alternating reaches | `public/assets/sequences/updown-frames-v2.png` | 4 x 2 | 8 frames, 4 fps |
| Torso twist | `public/assets/sequences/twist-frames-v2.png` | 4 x 4 | 16 timed frames, 6 fps |

## Prompt Set

Shared constraints: preserve the green plush mascot's face, pompom, fur, paws, and feet; draw complete figures on a regular grid with a solid #FF00FF background; keep each figure inside its cell; keep the torso silhouette intact; arms attach only at the shoulders, with clear background space below raised arms; no webbing, duplicate hands, ghost limbs, labels, or grid lines.

Wings: use `wings-hd-01.png` for identity and six sampled frames from `9月8日.mov` for motion. Generate 16 complete poses in a 4 x 4 grid: both arms sweep outward and overhead, then return down in front. Feet and torso remain stationary.

Alternating reaches: use `wings-hd-01.png` for identity. Generate eight complete poses in a 4 x 2 grid: left paw overhead/right down; left upper diagonal/right lower diagonal; both horizontal; left lower diagonal/right upper diagonal; right overhead/left down; right upper diagonal/left lower diagonal; both horizontal; right lower diagonal/left upper diagonal. This follows the alternating raises inspected in `上下齐发.mov`.

Twist: use `wings-hd-01.png` for identity and six sampled frames from `扭转乾坤.mov` for motion. Generate 16 complete poses in a 4 x 4 grid: both arms at shoulder height, torso and face turn through front and three-quarter/profile views in both directions, near arm foreshortens and far arm is occluded. Keep feet planted. Playback orders the selected poses into a continuous outward-and-return turn on each side.

## Verification

Run `node scripts/sequence-frame-check.mjs` against the preview on port 4173. It visits the actual exercise page for all three actions at desktop/mobile sizes, checks full cycle playback, distinct nonblank frames, keyed transparency, and page errors. Screenshots and results are written to `artifacts/sequence-v2/`.
