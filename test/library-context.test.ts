import { describe, expect, it } from "vitest";
import { libraryReturn, readLibraryContext } from "../src/lib/libraryContext";
describe("library return context", () => {
  it("restores search, filters, page, language and explicit selection after practice", () => {
    const filters = {
      search: "words & phrases",
      userStatus: "active",
      sort: "most_practiced",
      difficult: "true",
      due: "true",
      packIds: "11111111-1111-4111-8111-111111111111",
    };
    const selected = ["22222222-2222-4222-8222-222222222222"];
    const url = new URL(
      libraryReturn(filters, 3, selected, "ar"),
      "https://local.test",
    );
    expect(readLibraryContext(url.searchParams)).toEqual({
      filters,
      page: 3,
      selected,
      language: "ar",
    });
  });
  it("ignores invalid selections, pages and unknown filter keys", () => {
    expect(
      readLibraryContext(
        new URLSearchParams(
          "library.selected=invalid&library.page=-1&library.owner=other",
        ),
      ),
    ).toMatchObject({
      filters: { userStatus: "all", sort: "alphabetical" },
      selected: [],
      page: 1,
    });
  });
});
