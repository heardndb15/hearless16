/**
 * Builds the recognized sentence from a stream of confirmed gestures.
 * Relies on the caller (GestureRecognizer's `changed` flag) to only invoke
 * onConfirmedChange on an actual transition, so holding one sign steadily
 * doesn't spam the sentence with repeats — no separate cooldown timer needed.
 */
export class TextComposer {
  private words: string[] = [];

  onConfirmedChange(confirmed: string | null): void {
    if (confirmed === null) return;
    this.words.push(confirmed);
  }

  get sentence(): string {
    if (this.words.length === 0) return "";
    const joined = this.words.join(" ");
    return joined.charAt(0).toUpperCase() + joined.slice(1);
  }

  clear(): void {
    this.words = [];
  }
}
