# Moochi's frames

Cut from two generated sheets (magenta background keyed out), aligned on his pupils, 512x512
WebP with transparency. `MoochiLayers` stacks them and cross-fades:

- `pose-*.webp`: the body with the calm face. rest, wave, explain, idea, thumbs, think.
- `mouth-*.webp`: arms down, a mouth for the voice (soft, mid, wide, round, ee). Shown over any pose
  through a mouth mask (`src/moochi-avatar.css`).
- `look-*.webp`: arms down, a look for the eyes and brows (blink, happy, thinking, surprised,
  encouraging, empathetic), shown through an eyes-and-face mask.

The overlays only work if the head sits in the same place in every file. To redo a set, keep the
head, body and position identical and change only the face (overlays) or only the arms (poses).
Motion rules (which mouth, when to gesture) are in `src/lib/moochiMotion.ts`.
