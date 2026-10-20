import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "../src/lib/api";
import { EnglishLearningEntryPage } from "../src/pages/EnglishLearningEntryPage";

const catalog = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/structuredEnglish", () => ({ curriculumApi: { catalog } }));
vi.mock("../src/pages/EnglishLearningPathPage", () => ({
  EnglishLearningPathPage: () => <p>Legacy content source</p>,
}));
vi.mock("../src/pages/StructuredEnglishPage", () => ({
  StructuredEnglishPage: () => <p>Published C1 content source</p>,
}));
beforeEach(() => vi.resetAllMocks());
it("uses the published curriculum on the existing program route", async () => {
  catalog.mockResolvedValue({ programs: [{ id: "english-zero-c1" }] });
  render(<EnglishLearningEntryPage />);
  expect(await screen.findByText("Published C1 content source")).toBeVisible();
  expect(screen.queryByText("Legacy content source")).toBeNull();
});
it("preserves legacy program behavior when no replacement is published", async () => {
  catalog.mockResolvedValue({ programs: [] });
  render(<EnglishLearningEntryPage />);
  expect(await screen.findByText("Legacy content source")).toBeVisible();
});
it("supports an older server that has no curriculum endpoint", async () => {
  catalog.mockRejectedValue(new ApiError(404, "NOT_FOUND", "Missing endpoint"));
  render(<EnglishLearningEntryPage />);
  expect(await screen.findByText("Legacy content source")).toBeVisible();
});
it("does not silently switch content when the curriculum server fails", async () => {
  catalog.mockRejectedValue(
    new ApiError(503, "PROVIDER_UNAVAILABLE", "Temporarily unavailable"),
  );
  render(<EnglishLearningEntryPage />);
  expect(await screen.findByRole("alert")).toBeVisible();
  expect(screen.queryByText("Legacy content source")).toBeNull();
});
