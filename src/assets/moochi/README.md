# Moochi's frames

`canvas/*.png` are the 1024x1024 layers of the avatar (cut from a layered canvas prototype).
`MoochiCanvasEngine` (`src/lib/moochiCanvasEngine.ts`) composes them
on a canvas every frame:

- `body`: the body and head, cut at the neck so the upper body can nod and tilt.
- `arms-N-back` / `arms-N-front`: arm sets, N = 0 rest, 1 wave, 2 explain, 3 and 4 gestures,
  5 hand on the chin. Drawn behind and in front of the body.
- `eyes-N`: 0 open, 1 thinking, 2 closed (the eyelid), 3 happy, 4 surprised. Blinks close an
  aperture of the open patch over the closed one.
- `brows-N`: 0 neutral, 1 raised, 2 empathetic, 3 thinking.
- `mouth-*`: REST, MBP, EH, AH (blended by voice level), OO, EE.

Every layer must keep the head in the same place; to redo a set, change only that part.
