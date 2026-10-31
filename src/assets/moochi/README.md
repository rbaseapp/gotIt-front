# Moochi frames for the lesson avatar

`TeacherAvatar` (variant `moochi`) stacks six same-size frames and cross-fades them with the
audio level. They are square 640x640 transparent PNGs of the SAME image (`moochi-base.png`),
differing only in the face. Today all six are copies of the base; replace them one by one.

| File | What changes |
| --- | --- |
| `moochi-listening.png` | calm, closed smile, eyes open (the resting frame) |
| `moochi-speaking.png` | mouth slightly open |
| `moochi-speaking-rounded.png` | mouth round, like "oo" / "oh" |
| `moochi-speaking-wide.png` | mouth wide open, like "ah" |
| `moochi-blink.png` | eyes closed, mouth as in `moochi-listening.png` |
| `moochi-thinking.png` | eyes up and to the side, eyebrow raised, small closed mouth |

The CSS blends only these regions (percent of the 640x640 canvas): the mouth around
x 58%, y 59% (about 70x50 px) and the eyes around y 48-53%, x 43-70%. Keep the body, card,
marker, outline and position identical in every frame, and keep the face inside those regions.
