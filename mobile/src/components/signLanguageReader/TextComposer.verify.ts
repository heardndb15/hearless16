import { TextComposer } from "./TextComposer";

function assertEqual(actual: string, expected: string, label: string) {
  if (actual !== expected) {
    throw new Error(`FAIL ${label}: expected "${expected}", got "${actual}"`);
  }
  console.log(`PASS ${label}`);
}

// Confirmed words append in order, space-separated
{
  const c = new TextComposer();
  c.onConfirmedChange("Да");
  c.onConfirmedChange("Нет");
  c.onConfirmedChange("Спасибо");
  assertEqual(c.sentence, "Да Нет Спасибо", "words append in order");
}

// null (no confirmed gesture) is a no-op
{
  const c = new TextComposer();
  c.onConfirmedChange("Да");
  c.onConfirmedChange(null);
  c.onConfirmedChange("Нет");
  assertEqual(c.sentence, "Да Нет", "null confirmations are ignored");
}

// Empty composer produces an empty sentence
{
  const c = new TextComposer();
  assertEqual(c.sentence, "", "empty composer has empty sentence");
}

// clear() resets the sentence
{
  const c = new TextComposer();
  c.onConfirmedChange("Да");
  c.clear();
  assertEqual(c.sentence, "", "clear resets the sentence");
  c.onConfirmedChange("Нет");
  assertEqual(c.sentence, "Нет", "composer works again after clear");
}

console.log("All TextComposer tests passed");
