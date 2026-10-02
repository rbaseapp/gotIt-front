# Tutor avatar motion assets

The male and female tutors each have six transparent portrait frames: listening,
thinking, blink, soft speech, rounded speech and wide speech. The original portrait
remains the identity anchor. CSS reveals only the mouth in speech frames and only
the eyelids in blink frames, including during speech. The added rounded PNGs were
generated with the built-in imagegen tool on 2026-10-01 and copied into
`src/assets/private-lesson/`; their alpha channel is preserved.

## Generation prompts

Male (`tutor-speaking-rounded.png`), edit target `tutor-listening.png`:

> Edit target: the attached male tutor portrait. Create one animation frame with lips gently rounded in an O / oo speech shape, moderately open, relaxed jaw, natural anatomy. Change ONLY the mouth and immediately surrounding lips. Preserve exactly the same face identity, eyes, eyebrows, head position, scale, hair, neck, clothing, lighting, illustrated style, image framing and transparent background as the 640x640 source. Mouth remains centered at the same location. This is for seamlessly layered lip animation, not a redesign. No text.

Female (`tutor-female-speaking-rounded.png`), edit target `tutor-female-listening.png`:

> Edit target: attached female tutor portrait. Create one lip animation frame: lips gently rounded in an O / oo speech shape, moderately open, relaxed jaw, natural anatomy. Change ONLY the mouth and immediately surrounding lips. Preserve exactly the same face identity, eyes, eyebrows, head position, scale, hair, neck, clothing, lighting, illustrated style, image framing and transparent background as the 640x640 source. Mouth stays centered at the same position. Intended for seamlessly layered speech animation, not a redesign. No text.

## Animation and verification

`avatarMotion.ts` owns amplitude thresholds and frame-rate independent audio
smoothing, with a gentle onset/release to damp rapid syllable changes and a
110ms mouth crossfade. The connection adapter publishes at approximately 30 Hz. Adjacent
pose contributions are converted into source-over opacity rather than applying
independent alpha weights that leak the closed mouth through open poses. The
animation follows the playback envelope; it does not recognize spoken phonemes.

Decorative movement remains one continuous, subdued breathing cycle across
listening/speaking transitions. Reduced-motion preference hides mouth movement,
blinking and decorative animation. Silence and inactive/invalid audio close all
speech frames. No audio is stored or sent to a new provider.

Regression coverage: `test/avatar-motion.test.ts`, `test/teacher-avatar.test.tsx`,
`test/private-lesson-connection.test.ts`, `test/private-lesson.test.tsx` and
`test/e2e/teacher-avatar.spec.ts`. The browser pose grid verifies decoded images
for both tutors at rest/soft/rounded/wide and 320px containment; its screenshot is
written to `test-results/avatar-poses.png` for visual inspection.
