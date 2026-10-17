# Matching words remain visible — 2026-10-17

The final matching board used to enable `audioBoard` automatically when it was
not the first board and any study card had audio. That replaced source words
with a speaker and row number, making the reported failure depend on board
position and audio availability. The exercise API already contained the words.

Matching now always displays `exercise.prompt.text` and the source language.
The audio-only switch is removed; the existing per-word playback buttons remain.
This applies to standalone and mixed practice, including checkpoint restoration.
Server-issued choices, grading, hints and XP are unchanged. No migration or
Backend/Core/Chrome change is required.

Regression coverage in `test/focus-games.test.tsx` advances through a five-card
session to its final three-word board in English and Hebrew, checks actual word
labels, plays audio without submitting an answer, restores the checkpoint, and
submits a correct match. Both cases reproduced the missing-word failure before
the source change and passed afterwards.

Release baseline: actual DEV Web source `71dba25`, isolated worktree
`gotIt-front-matching-words-dev`, branch `fix/matching-words-dev-20261017`.
DEV rollout and final verification evidence are recorded in the canonical
`gotit-project-spec/docs/37_FOCUS_GAMES_DEV.md`.
