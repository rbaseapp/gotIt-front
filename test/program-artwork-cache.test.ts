import { afterEach, expect, it, vi } from "vitest";
import { api, clearTokens, setTokens } from "../src/lib/api";
import {
  artworkKey,
  cachedArtwork,
  loadArtwork,
  warmProgramArtwork,
} from "../src/lib/programArtwork";
const owner = { applicationId: "gotit", id: "learner" };
const image = {
  dataUrl: "data:image/webp;base64,UklGRg==",
  fingerprint: "server",
};
afterEach(clearTokens);
function session() {
  setTokens({ accessToken: "test", refreshToken: "test", expiresIn: 3600 });
}
it("preloads existing artwork with lookup only and shares it with the screen", async () => {
  session();
  const request = vi.spyOn(api, "product").mockResolvedValue({ image });
  await warmProgramArtwork(owner, { kind: "path" });
  const key = artworkKey(owner, { kind: "path" }, "");
  expect(cachedArtwork(key)).toBe(image.dataUrl);
  expect(await loadArtwork(key, { kind: "path" })).toBe(image.dataUrl);
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toBe("courses/artwork/lookup");
});
it("background misses never generate; concurrent screen consumers generate once", async () => {
  session();
  const request = vi
    .spyOn(api, "product")
    .mockImplementation(async (path) => ({
      image: path.endsWith("generate") ? image : null,
    }));
  const input = { kind: "mascot" as const, languageCode: "es" };
  const warm = warmProgramArtwork(owner, input);
  const key = artworkKey(owner, input, "");
  const visible = loadArtwork(key, input);
  const card = loadArtwork(key, input);
  await warm;
  expect(await visible).toBe(image.dataUrl);
  expect(await card).toBe(image.dataUrl);
  expect(
    request.mock.calls.filter(([path]) => path.endsWith("generate")),
  ).toHaveLength(1);
  clearTokens();
  request.mockClear();
  await warmProgramArtwork(owner, { kind: "path" });
  expect(request.mock.calls.every(([path]) => path.endsWith("lookup"))).toBe(
    true,
  );
});
it("a session reset cannot restore an old artwork result", async () => {
  session();
  let resolve!: (value: unknown) => void;
  vi.spyOn(api, "product").mockImplementation(
    () =>
      new Promise((yes) => {
        resolve = yes;
      }),
  );
  const input = { kind: "path" as const };
  const oldKey = artworkKey(owner, input, "");
  const warm = warmProgramArtwork(owner, input);
  clearTokens();
  resolve({ image });
  await warm;
  expect(cachedArtwork(oldKey)).toBeUndefined();
  expect(artworkKey(owner, input, "")).not.toBe(oldKey);
});
