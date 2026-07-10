import { GestureRecognizer } from "./GestureRecognizer";

function assertEqual<T>(actual: T, expected: T, label: string) {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  if (!same) {
    throw new Error(`FAIL ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  console.log(`PASS ${label}`);
}

// Two consecutive high-confidence samples confirm the gesture
{
  const r = new GestureRecognizer();
  r.pushSample({ gesture: "Да", confidence: 90 });
  const state = r.pushSample({ gesture: "Да", confidence: 90 });
  assertEqual(state.confirmed, "Да", "confirms after 2 matching samples");
  assertEqual(state.changed, true, "changed flag true on first confirmation");
}

// A single misread frame among steady samples doesn't break confirmation
{
  const r = new GestureRecognizer();
  r.pushSample({ gesture: "Да", confidence: 90 });
  r.pushSample({ gesture: "Нет", confidence: 90 });
  const state = r.pushSample({ gesture: "Да", confidence: 90 });
  assertEqual(state.confirmed, "Да", "majority vote survives one misread");
}

// Low-confidence samples never confirm a gesture
{
  const r = new GestureRecognizer();
  r.pushSample({ gesture: "Да", confidence: 40 });
  r.pushSample({ gesture: "Да", confidence: 40 });
  const state = r.pushSample({ gesture: "Да", confidence: 40 });
  assertEqual(state.confirmed, null, "low confidence never confirms");
}

// no_hand_detected resets the rolling window
{
  const r = new GestureRecognizer();
  r.pushSample({ gesture: "Да", confidence: 90 });
  r.pushSample({ gesture: "Да", confidence: 90 });
  const reset = r.pushSample({ gesture: null, confidence: 0, error: "no_hand_detected" });
  assertEqual(reset.confirmed, null, "no_hand_detected clears confirmation");
  assertEqual(reset.changed, true, "changed flag fires on the reset");

  r.pushSample({ gesture: "Нет", confidence: 90 });
  const reconfirmed = r.pushSample({ gesture: "Нет", confidence: 90 });
  assertEqual(reconfirmed.confirmed, "Нет", "a new gesture confirms after the reset");
  assertEqual(reconfirmed.changed, true, "changed flag fires for the new confirmation");
}

// Holding the same gesture steadily doesn't keep re-firing "changed"
{
  const r = new GestureRecognizer();
  r.pushSample({ gesture: "Да", confidence: 90 });
  r.pushSample({ gesture: "Да", confidence: 90 });
  const held = r.pushSample({ gesture: "Да", confidence: 90 });
  assertEqual(held.changed, false, "changed flag stays false while gesture is held");
}

console.log("All GestureRecognizer tests passed");
