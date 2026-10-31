# Moochi frames for the lesson avatar

`TeacherAvatar` (variant `moochi`) stacks six same-size frames and cross-fades them with the
audio level. They were cut from one generated sheet (3 columns x 2 rows, magenta background keyed out)
and are square 640x640 transparent PNGs that differ only in the face. `moochi-base.png` is the calm frame.

| File | What changes |
| --- | --- |
| `moochi-listening.png` | calm, closed smile, eyes open (the resting frame) |
| `moochi-speaking.png` | mouth slightly open |
| `moochi-speaking-rounded.png` | mouth round, like "oo" / "oh" |
| `moochi-speaking-wide.png` | mouth wide open, like "ah" |
| `moochi-blink.png` | eyes closed, mouth as in `moochi-listening.png` |
| `moochi-thinking.png` | eyes up and to the side, eyebrow raised, small closed mouth |

The CSS blends only the face, with one mask per frame kind in `src/production.css`
(`.teacher-avatar.moochi ...`): the mouth around x 55%, y 53%, the eyes around x 56%, y 41%, and the
eyebrows and eyes for the thinking frame. To redo the set, keep the body, card and position identical
in every frame and the face inside those regions.
