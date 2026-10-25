import { z } from "zod";
import { courseApi } from "./courses";
import { languageListSchema } from "./learningLanguages";
import { wordCardSchema } from "./myWords";
import {
  dashboardSchema,
  page,
  product,
  query,
  tagSchema,
  wordPacksSchema,
} from "./product";
import {
  cachedResource,
  loadResource,
  resourceKey,
  resourceSessionVersion,
} from "./resourceCache";
import { courseArtworkRevision } from "./programs";

export const wordCardsSchema = page(wordCardSchema).extend({
  summary: z.object({
    total: z.number(),
    new: z.number(),
    mastered: z.number(),
    due: z.number(),
    tags: z.record(z.string(), z.number()),
    topics: z.record(z.string(), z.number()),
  }),
});
export const libraryTagsSchema = z.object({
  tags: z.array(tagSchema),
  nextCursor: z.string().nullable().optional(),
});
export const wordCardsPath = (
  code: string,
  filters: Record<string, string>,
  pageNumber: number,
) =>
  `learning-items${query({ ...filters, sourceLanguageCode: code || undefined, view: "cards", limit: "9", page: String(pageNumber) })}`;

/** Warm only read-only navigation data; never generate artwork or learning sessions. */
export async function warmNavigationResources(
  user: { applicationId: string; id: string },
  code: string,
  support: string,
) {
  const session = resourceSessionVersion();
  const warm = <T>(path: string, load: () => Promise<T>) =>
    loadResource(cachedResource<T>(resourceKey(user, path)), load);
  const libraryPath = wordCardsPath(
    code,
    { userStatus: "all", sort: "recent" },
    1,
  );
  const dashboardPath = `dashboard${query({ sourceLanguageCode: code || undefined })}`;
  const packsPath = `word-packs${query({ sourceLanguageCode: code || undefined, translationLanguageCode: support || undefined })}`;
  await Promise.all([
    warm("courses", courseApi.list),
    warm("word-packs", () => product(wordPacksSchema, "word-packs")),
    warm("dashboard/languages", () =>
      product(languageListSchema, "dashboard/languages"),
    ),
    warm(libraryPath, async () => ({
      ...(await product(wordCardsSchema, libraryPath)),
      key: libraryPath,
    })),
    warm(dashboardPath, async () => ({
      ...(await product(dashboardSchema, dashboardPath)),
      language: code,
    })),
    warm(packsPath, () => product(wordPacksSchema, packsPath)),
    warm("tags?limit=100", () => product(libraryTagsSchema, "tags?limit=100")),
  ]);
  if (session !== resourceSessionVersion()) return;
  const { warmProgramArtwork } = await import("./programArtwork");
  if (session !== resourceSessionVersion()) return;
  const courses =
    cachedResource<Awaited<ReturnType<typeof courseApi.list>>>(
      resourceKey(user, "courses"),
    ).state.data?.courses || [];
  await Promise.all([
    warmProgramArtwork(user, { kind: "path" }),
    ...(code
      ? [warmProgramArtwork(user, { kind: "mascot", languageCode: code })]
      : []),
    ...courses.map((course) =>
      warmProgramArtwork(
        user,
        { kind: "course", courseId: course.id },
        courseArtworkRevision(course),
      ),
    ),
  ]);
}
