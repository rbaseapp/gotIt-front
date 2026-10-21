import { z } from "zod";
import { product } from "./product";
import { resourceSessionVersion } from "./resourceCache";
export type Artwork =
  | { kind: "course"; courseId: string }
  | { kind: "mascot"; languageCode: string }
  | { kind: "path" };
const response = z.object({
  image: z
    .object({
      dataUrl: z
        .string()
        .max(4_100_000)
        .regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/u),
      fingerprint: z.string(),
    })
    .nullable(),
});
// Resolve cached images concurrently, serialize only paid misses, and coalesce hero/card
// requests. Account scope prevents a shared browser session from reusing private art.
let generationQueue: Promise<unknown> = Promise.resolve();
const pending = new Map<string, Promise<string | undefined>>();
const images = new Map<string, string>();
export function loadArtwork(
  key: string,
  input: Artwork,
  generate = true,
): Promise<string | undefined> {
  const session = resourceSessionVersion();
  const cached = images.get(key);
  if (cached) return Promise.resolve(cached);
  const current = pending.get(key);
  if (current)
    return current.then(
      (src) => src || (generate ? loadArtwork(key, input) : undefined),
    );
  const load = product(response, "courses/artwork/lookup", "POST", input)
    .then((result) => {
      if (session !== resourceSessionVersion())
        throw new Error("Session changed");
      if (result.image) return result.image;
      if (!generate) return undefined;
      const generation = generationQueue
        .catch(() => undefined)
        .then(() =>
          session === resourceSessionVersion()
            ? product(response, "courses/artwork/generate", "POST", input)
            : Promise.reject(new Error("Session changed")),
        )
        .then((result) => {
          if (!result.image) throw new Error("Unavailable");
          return result.image;
        });
      generationQueue = generation;
      return generation;
    })
    .then((image) => {
      if (!image || session !== resourceSessionVersion()) return undefined;
      if (images.size >= 100) images.delete(images.keys().next().value!);
      images.set(key, image.dataUrl);
      return image.dataUrl;
    })
    .finally(() => pending.delete(key));
  pending.set(key, load);
  return load;
}
export function artworkKey(
  user: { applicationId: string; id: string } | null | undefined,
  input: Artwork,
  revision: string,
) {
  return `${user?.applicationId}:${user?.id}:${JSON.stringify(input)}:${revision}:${resourceSessionVersion()}`;
}
/** Download existing illustrations ahead of navigation; paid generation stays on the screen. */
export function warmProgramArtwork(
  user: { applicationId: string; id: string },
  input: Artwork,
  revision = "",
) {
  return loadArtwork(artworkKey(user, input, revision), input, false).catch(
    () => undefined,
  );
}

export const cachedArtwork = (key: string) => images.get(key);
