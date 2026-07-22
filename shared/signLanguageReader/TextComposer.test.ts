import { describe, it, expect } from "vitest";
import { TextComposer } from "./TextComposer";

describe("TextComposer", () => {
  it("appends confirmed words in order, space-separated", () => {
    const c = new TextComposer();
    c.onConfirmedChange("Да");
    c.onConfirmedChange("Нет");
    c.onConfirmedChange("Спасибо");
    expect(c.sentence).toBe("Да Нет Спасибо");
  });

  it("ignores null (no confirmed gesture)", () => {
    const c = new TextComposer();
    c.onConfirmedChange("Да");
    c.onConfirmedChange(null);
    c.onConfirmedChange("Нет");
    expect(c.sentence).toBe("Да Нет");
  });

  it("has an empty sentence when nothing was confirmed", () => {
    const c = new TextComposer();
    expect(c.sentence).toBe("");
  });

  it("clear() resets the sentence and the composer keeps working after", () => {
    const c = new TextComposer();
    c.onConfirmedChange("Да");
    c.clear();
    expect(c.sentence).toBe("");
    c.onConfirmedChange("Нет");
    expect(c.sentence).toBe("Нет");
  });
});
