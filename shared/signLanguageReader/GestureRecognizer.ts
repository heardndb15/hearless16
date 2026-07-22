export interface RawSample {
  gesture: string | null;
  confidence: number;
  error?: "no_hand_detected" | "invalid_image" | "processing_error" | "rate_limited";
}

export interface RecognitionState {
  confirmed: string | null;
  changed: boolean;
}

const CONFIDENCE_THRESHOLD = 60;
const WINDOW_SIZE = 3;
const MIN_VOTES = 2;

/**
 * Smooths raw per-frame recognition samples into a stable "confirmed" gesture,
 * filtering single-frame misreads and low-confidence noise. A gesture only
 * counts as confirmed once it wins a majority of the last WINDOW_SIZE samples.
 */
export class GestureRecognizer {
  private window: (string | null)[] = [];
  private lastConfirmed: string | null = null;

  pushSample(sample: RawSample): RecognitionState {
    if (sample.error === "no_hand_detected") {
      this.window = [];
    } else {
      const candidate = sample.confidence >= CONFIDENCE_THRESHOLD ? sample.gesture : null;
      this.window.push(candidate);
      if (this.window.length > WINDOW_SIZE) this.window.shift();
    }

    const counts = new Map<string, number>();
    for (const c of this.window) {
      if (c === null) continue;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }

    let majority: string | null = null;
    for (const [word, count] of Array.from(counts.entries())) {
      if (count >= MIN_VOTES) {
        majority = word;
        break;
      }
    }

    const changed = majority !== this.lastConfirmed;
    this.lastConfirmed = majority;

    return { confirmed: majority, changed };
  }

  reset(): void {
    this.window = [];
    this.lastConfirmed = null;
  }
}
