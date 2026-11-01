import { expect, it } from "vitest";
import {
  structuredProgram,
  type Curriculum,
} from "../src/lib/structuredEnglish";

const unit = (index: number) => ({
  id: `u${index}`,
  title: `Unit ${index}`,
  band: index > 30 ? "B1" : "A2",
  waived: false,
});
const curriculum = (currentUnit: string, completed = {}) =>
  ({
    program: { id: "english-zero-c1", title: "English" },
    units: Array.from({ length: 84 }, (_, index) => unit(index + 1)),
    currentUnit,
    completed,
    graduation: { complete: false },
    settings: { minutes: 10 },
  }) as unknown as Curriculum;

it("counts the units before the placement unit as already passed", () => {
  const program = structuredProgram(curriculum("u30"));
  expect(program.completed).toBe(29);
  expect(program.total).toBe(84);
  expect(program.next).toBe("Unit 30");
  expect(program.checkpoints[0]?.title).toBe("Unit 29");
});

it("keeps real gate completions when they exceed the placement position", () => {
  const completed = Object.fromEntries(
    Array.from({ length: 40 }, (_, index) => [`gate:u${index + 1}`, true]),
  );
  expect(structuredProgram(curriculum("u3", completed)).completed).toBe(40);
});
