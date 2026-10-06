import { z } from "zod";
const filterKeys = [
  "search",
  "userStatus",
  "sort",
  "learningStatus",
  "tagId",
  "translationLanguageCode",
  "packIds",
  "difficult",
  "highPriority",
  "due",
] as const;
const ids = z.array(z.uuid()).max(100);
export function readLibraryContext(params: URLSearchParams) {
  const filters: Record<string, string> = {
    userStatus: "all",
    sort: "alphabetical",
  };
  for (const key of filterKeys) {
    const value = params.get(`library.${key}`);
    if (value && value.length <= 4000) filters[key] = value;
  }
  const rawPage = Number(params.get("library.page"));
  const selected = ids.safeParse(
    (params.get("library.selected") || "").split(",").filter(Boolean),
  );
  return {
    filters,
    page:
      Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 100000
        ? rawPage
        : 1,
    selected: selected.success ? selected.data : [],
    language: params.get("library.language") || "",
  };
}
export function libraryReturn(
  filters: Record<string, string>,
  page: number,
  selected: string[],
  language: string,
) {
  const params = new URLSearchParams();
  for (const key of filterKeys)
    if (filters[key]) params.set(`library.${key}`, filters[key]);
  params.set("library.page", String(page));
  if (selected.length) params.set("library.selected", selected.join(","));
  if (language) params.set("library.language", language);
  return `/vocabulary?${params}`;
}
