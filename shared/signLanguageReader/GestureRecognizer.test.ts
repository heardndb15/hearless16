import { describe, it, expect } from "vitest";
import { GestureRecognizer } from "./GestureRecognizer";

describe("GestureRecognizer", () => {
  it("confirms after 2 matching samples", () => {
    const r = new GestureRecognizer();
    r.pushSample({ gesture: "Да", confidence: 90 });
    const state = r.pushSample({ gesture: "Да", confidence: 90 });
    expect(state.confirmed).toBe("Да");
    expect(state.changed).toBe(true);
  });

  it("majority vote survives one misread", () => {
    const r = new GestureRecognizer();
    r.pushSample({ gesture: "Да", confidence: 90 });
    r.pushSample({ gesture: "Нет", confidence: 90 });
    const state = r.pushSample({ gesture: "Да", confidence: 90 });
    expect(state.confirmed).toBe("Да");
  });

  it("low confidence never confirms", () => {
    const r = new GestureRecognizer();
    r.pushSample({ gesture: "Да", confidence: 40 });
    r.pushSample({ gesture: "Да", confidence: 40 });
    const state = r.pushSample({ gesture: "Да", confidence: 40 });
    expect(state.confirmed).toBeNull();
  });

  it("no_hand_detected resets the rolling window", () => {
    const r = new GestureRecognizer();
    r.pushSample({ gesture: "Да", confidence: 90 });
    r.pushSample({ gesture: "Да", confidence: 90 });
    const reset = r.pushSample({ gesture: null, confidence: 0, error: "no_hand_detected" });
    expect(reset.confirmed).toBeNull();
    expect(reset.changed).toBe(true);

    r.pushSample({ gesture: "Нет", confidence: 90 });
    const reconfirmed = r.pushSample({ gesture: "Нет", confidence: 90 });
    expect(reconfirmed.confirmed).toBe("Нет");
    expect(reconfirmed.changed).toBe(true);
  });

  it("holding the same gesture steadily doesn't keep re-firing 'changed'", () => {
    const r = new GestureRecognizer();
    r.pushSample({ gesture: "Да", confidence: 90 });
    r.pushSample({ gesture: "Да", confidence: 90 });
    const held = r.pushSample({ gesture: "Да", confidence: 90 });
    expect(held.changed).toBe(false);
  });

  it("a rate_limited sample does not reset the window like no_hand_detected does", () => {
    // Regression test for the mobile client throttling fix: a 429 from the
    // backend is a transient server hiccup, not evidence the hand left the
    // frame, so it must not wipe an already-building confirmation.
    const r = new GestureRecognizer();
    r.pushSample({ gesture: "Да", confidence: 90 });
    r.pushSample({ gesture: "Да", confidence: 90 });
    const throttled = r.pushSample({ gesture: null, confidence: 0, error: "rate_limited" });
    expect(throttled.confirmed).toBe("Да");
  });
});
