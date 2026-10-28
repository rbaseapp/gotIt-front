# Program map visual review

Start Vite from this checkout and open `/design-preview/` (currently port 5187).
This is an isolated review entry using the actual shared map component and explicit
in-memory sample data. It is not an application route and Vite's production build
only includes the normal application entry. No API or provider requests are made
by this review harness. The visible local-demo label is intentional.

Core actions: continue/review display the selected sample activity; another-step
entry requires confirmation; stage/unit skip and restoration update local state.
The remaining navigation links are presentation context, not simulated live pages.
Live callers retain their existing authoritative callbacks, routes and API commands.

Source: owner-selected Claude board `UnitStartHere.dc.html`, public artifact
`https://claude.ai/artifact/QxCJLacpzBzSSFVDuaotRV#play-491bf3f68d1b`.
The original product fonts, illustration, colors and components are retained.
Names intentionally follow the updated introduction curriculum.

The dialog preserves the approved navigation contract: opening another step does
not automatically skip or complete previous work. Explicit skips remain reversible
through the existing menu. Locked postlesson practice has an explanation and no
entry action. No enrollment, learning evidence, rewards or completion rules change.
