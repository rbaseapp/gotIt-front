/**
 * Moochi's layered canvas avatar. The body, arms, eyes, brows and mouths are separate frames
 * (src/assets/moochi/canvas) composed on one canvas every animation frame, so the hands, head,
 * eyes and mouth each move on their own. The voice comes in as a 0..1 level (setLevel); this
 * file never touches audio.
 */
export type MoochiEmotion =
  "neutral" | "encouraging" | "empathetic" | "happy" | "thinking" | "surprised";

/** Arm sets in the frames: 0 rest, 1 wave, 2 explain, 3 and 4 gestures, 5 hand on the chin. */
export const GESTURE_REST = 0;
export const GESTURE_WAVE = 1;
export const GESTURE_THINK = 5;

/** Below this level the tutor is silent and the mouth is closed. */
export const SPEECH_FLOOR = 0.04;

const SIZE = 1024;
const ANCHORS = {
  headSplit: 747,
  headOverlap: 765,
  shoulders: [
    [285, 660],
    [820, 660],
  ],
} as const;
/** Open-mouth shapes a syllable can take, and how far each opens at its widest. */
const SYLLABLE_SHAPES = ["AH", "EH", "OO", "EE", "AH", "EH"] as const;
type Shape = (typeof SYLLABLE_SHAPES)[number];
const SHAPE_REACH: Record<Shape, number> = {
  AH: 1,
  EH: 0.85,
  OO: 0.9,
  EE: 0.8,
};
/** Open palms: the default while explaining. A raised finger marks a stressed word. */
const GESTURE_EXPLAIN = 2;
const GESTURE_POINT = 3;
/** The thumbs-up (arm set 4) is kept for praise; nothing in the speech cycle uses it. */
export const GESTURE_THUMBS = 4;

export class MoochiCanvasEngine {
  private ctx: CanvasRenderingContext2D;
  private images: Record<string, HTMLImageElement> = {};
  private ready = false;
  private destroyed = false;
  private running = false;
  private frame = 0;
  private observer?: ResizeObserver;

  private emotion: MoochiEmotion = "neutral";
  private reducedMotion: boolean;
  private level = 0;
  private mouthAmount = 0;
  private shape: Shape = "AH";
  private syllablePhase = 0;
  private syllableRate = 4.5;
  private activity = 0;
  private speaking = false;

  private start = performance.now();
  private previous = this.start;
  private nextBlink = 2.8;
  private blinkStart = -10;
  private holdGesture: number | null = null;
  private displayGesture = 0;
  private gestureTarget = 0;
  private gestureChange = -10;
  private browLift = 0;
  private silentFor = 1;
  private pointUntil = -10;
  private lastPoint = -10;
  private levelAverage = 0;
  private lastEmphasis = -10;
  private beat = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    { reducedMotion = false }: { reducedMotion?: boolean } = {},
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.reducedMotion = reducedMotion;
  }

  async load(assets: Record<string, string>) {
    await Promise.all(
      Object.entries(assets).map(
        ([key, src]) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.decoding = "async";
            // A frame that fails is skipped (drawLayer ignores a missing one): Moochi is drawn
            // without it instead of not at all.
            img.onload = () => {
              this.images[key] = img;
              resolve();
            };
            img.onerror = () => resolve();
            img.src = src;
          }),
      ),
    );
    if (this.destroyed) return;
    this.ready = true;
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.canvas);
    this.render(0, 0);
    if (this.running) this.loop();
  }

  private resize() {
    const box = this.canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(box.width * ratio));
    if (width !== this.canvas.width || width !== this.canvas.height) {
      this.canvas.width = this.canvas.height = width;
      if (this.ready) this.render((performance.now() - this.start) / 1000, 0);
    }
  }

  setEmotion(value: MoochiEmotion) {
    this.emotion = value;
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
  }

  /** The voice level, 0..1. Silence closes the mouth; speech also drives the gestures. */
  setLevel(level: number, speaking: boolean) {
    this.level = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;
    this.speaking = speaking;
  }

  /** Keep one arm set (the greeting wave, the thinking hand); null returns to the gesture cycle. */
  holdArms(gesture: number | null) {
    this.holdGesture = gesture;
  }

  /** The loop only runs while Moochi is on stage; a stopped avatar keeps its last frame. */
  setRunning(value: boolean) {
    if (this.running === value) return;
    this.running = value;
    if (value) {
      this.previous = performance.now();
      if (this.ready) this.loop();
    } else {
      cancelAnimationFrame(this.frame);
      // Settle on a calm frame: no open mouth or raised hand frozen on the last tick.
      this.mouthAmount = 0;
      this.speaking = false;
      this.activity = 0;
      this.beat = 0;
      this.gestureTarget = this.displayGesture =
        this.holdGesture ?? GESTURE_REST;
      if (this.ready) this.render((performance.now() - this.start) / 1000, 0);
    }
  }

  destroy() {
    this.destroyed = true;
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
  }

  private loop() {
    this.frame = requestAnimationFrame((now) => this.tick(now));
  }

  private tick(now: number) {
    if (this.destroyed || !this.running) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - this.previous) / 1000));
    this.previous = now;
    const seconds = (now - this.start) / 1000;

    // The voice level is already smoothed, so it cannot show syllables. While Moochi speaks the
    // mouth opens and closes once per syllable (about 4 to 6 times a second) and changes shape
    // from one syllable to the next; the voice level only sets how wide it opens.
    let target = 0;
    if (this.speaking) {
      this.syllablePhase += dt * this.syllableRate;
      if (this.syllablePhase >= 1) {
        this.syllablePhase -= Math.floor(this.syllablePhase);
        this.syllableRate = 3.8 + Math.random() * 2.4;
        let next: Shape;
        do
          next =
            SYLLABLE_SHAPES[
              Math.floor(Math.random() * SYLLABLE_SHAPES.length)
            ]!;
        while (next === this.shape);
        this.shape = next;
      }
      const loudness = 0.5 + 0.5 * Math.min(1, this.level / 0.35);
      target = Math.pow(Math.sin(Math.PI * this.syllablePhase), 1.2) * loudness;
    } else this.syllablePhase = 0;
    const tau = target > this.mouthAmount ? 0.018 : 0.028;
    this.mouthAmount += (target - this.mouthAmount) * (1 - Math.exp(-dt / tau));
    this.activity +=
      ((this.speaking ? 0.55 + this.mouthAmount * 0.45 : 0) - this.activity) *
      (1 - Math.exp(-dt / 0.45));

    // The hands follow the speech: open palms while explaining, a short beat and a raised finger when
    // the voice stresses a word, and the arms come back to rest in the pauses.
    if (this.speaking) {
      if (this.silentFor > 0.35) this.levelAverage = this.level;
      this.silentFor = 0;
      this.levelAverage +=
        (this.level - this.levelAverage) * (1 - Math.exp(-dt / 0.9));
      if (
        this.level > this.levelAverage * 1.3 + 0.03 &&
        seconds - this.lastEmphasis > 1.2
      ) {
        this.lastEmphasis = seconds;
        this.beat = 1;
        if (seconds - this.lastPoint > 6) {
          this.lastPoint = seconds;
          this.pointUntil = seconds + 1.6;
        }
      }
    } else this.silentFor += dt;
    this.beat *= Math.exp(-dt / 0.22);
    let desired = GESTURE_REST;
    if (this.holdGesture !== null) desired = this.holdGesture;
    else if (this.silentFor < 0.7)
      desired = seconds < this.pointUntil ? GESTURE_POINT : GESTURE_EXPLAIN;
    if (desired !== this.gestureTarget && seconds - this.gestureChange > 0.85) {
      this.gestureTarget = desired;
      this.gestureChange = seconds;
    }
    if (seconds - this.gestureChange > 0.34)
      this.displayGesture = this.gestureTarget;

    const smoothing = 1 - Math.exp(-dt / 0.16);
    this.browLift +=
      (this.activity * (3 + 5 * (0.5 + 0.5 * Math.sin(seconds * 1.8))) -
        this.browLift) *
      smoothing;

    if (!this.reducedMotion && seconds > this.nextBlink) {
      this.blinkStart = seconds;
      this.nextBlink = seconds + 3.2 + Math.random() * 3;
    }
    const bp = (seconds - this.blinkStart) / 0.18;
    const blink =
      !this.reducedMotion && bp >= 0 && bp <= 1 ? Math.sin(bp * Math.PI) : 0;
    this.render(seconds, blink);
    this.loop();
  }

  private drawLayer(name: string) {
    const image = this.images[name];
    if (image) this.ctx.drawImage(image, 0, 0, SIZE, SIZE);
  }

  private drawArms(front: boolean, seconds: number) {
    const gesture = this.reducedMotion
      ? this.gestureTarget
      : this.displayGesture;
    const name = `arms-${gesture}-${front ? "front" : "back"}`;
    const c = this.ctx;
    if (this.reducedMotion) {
      this.drawLayer(name);
      return;
    }
    const progress = Math.max(
      0,
      Math.min(1, (seconds - this.gestureChange) / 0.68),
    );
    // Retract under the body, change the hand pose out of view, then extend again, so two
    // hands never dissolve into each other and nothing snaps at the shoulder.
    const folded =
      progress < 0.5
        ? Math.cos(progress * Math.PI)
        : Math.sin((progress - 0.5) * Math.PI);
    const extension = 0.04 + 0.96 * Math.max(0, folded);
    for (let side = 0; side < 2; side++) {
      const left = side === 0;
      const sign = left ? 1 : -1;
      const [rootX, rootY] = ANCHORS.shoulders[side]!;
      let angle = 0.025 * Math.sin(seconds * 1.5 + side * 1.6);
      if (gesture === 1 && left) angle += 0.19 * Math.sin(seconds * 6.5);
      else if (gesture === 2)
        angle +=
          sign *
            (0.045 + 0.11 * Math.sin(seconds * 2.3 + side * 1.8)) *
            (0.45 + this.activity) +
          sign * 0.12 * this.beat;
      else if ((gesture === 3 || gesture === 4) && left)
        angle +=
          0.085 * Math.sin(seconds * 2.7) * (0.5 + this.activity) +
          0.14 * this.beat;
      else if (gesture === 0)
        angle += 0.045 * Math.sin(seconds * 1.8 + side * 1.5);
      else if (gesture === 5) angle += 0.022 * Math.sin(seconds * 1.7);
      c.save();
      c.beginPath();
      c.rect(left ? 0 : 512, 0, 512, SIZE);
      c.clip();
      c.translate(rootX, rootY);
      c.rotate(angle);
      c.scale(extension, extension);
      c.translate(-rootX, -rootY);
      this.drawLayer(name);
      c.restore();
    }
  }

  private drawFace(seconds: number, blink: number) {
    const c = this.ctx;
    const lively = !this.reducedMotion;
    const happy = this.emotion === "happy";
    const thinking =
      this.emotion === "thinking" ||
      (lively && !this.speaking && seconds % 14 > 10.5 && seconds % 14 < 12.2);
    const eye = happy ? 3 : thinking ? 1 : this.emotion === "surprised" ? 4 : 0;
    // The closed-eye drawing is the eyelid; an aperture of the open-eye patch closes over it,
    // so the artist's shapes are never stretched.
    this.drawLayer("eyes-2");
    if (blink < 0.98) {
      const h = 190 * (1 - blink);
      c.save();
      c.beginPath();
      c.rect(300, 477 - h / 2, 520, h);
      c.clip();
      this.drawLayer(`eyes-${eye}`);
      c.restore();
    }
    const brow =
      this.emotion === "empathetic"
        ? 2
        : thinking
          ? 3
          : this.emotion === "neutral"
            ? 0
            : 1;
    this.drawLayer(`brows-${brow}`);
    if (lively && brow === 0) {
      c.save();
      c.globalAlpha = Math.min(0.8, this.browLift / 10);
      this.drawLayer("brows-1");
      c.restore();
    }
    const amount = Math.max(0, Math.min(1, this.mouthAmount));
    this.drawLayer("mouth-REST");
    if (amount < 0.03) return;
    c.save();
    c.globalAlpha = Math.min(1, (amount * 1.3) / SHAPE_REACH[this.shape]);
    this.drawLayer(`mouth-${this.shape}`);
    c.restore();
  }

  private render(seconds: number, blink: number) {
    const c = this.ctx;
    const scale = this.canvas.width / SIZE;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(scale, 0, 0, scale, 0, 0);
    // The legs stay planted; only the upper body nods and tilts with the head and shoulders.
    const { headSplit: split, headOverlap: overlap } = ANCHORS;
    c.save();
    c.beginPath();
    c.rect(0, split, SIZE, SIZE - split);
    c.clip();
    this.drawLayer("body");
    c.restore();
    c.save();
    if (!this.reducedMotion) {
      const breath = Math.sin((seconds / 4.2) * Math.PI * 2);
      const nod =
        this.activity *
        (2.4 * Math.sin(seconds * 3.4) + 1.2 * Math.sin(seconds * 6.7));
      const tilt =
        0.016 * Math.sin(seconds * 0.82) +
        this.activity * 0.012 * Math.sin(seconds * 1.7);
      c.translate(550, split + breath * 2 + nod);
      c.rotate(tilt);
      c.scale(1, 1 + 0.003 * breath);
      c.translate(-550, -split);
    }
    this.drawArms(false, seconds);
    c.save();
    c.beginPath();
    c.rect(0, 0, SIZE, overlap);
    c.clip();
    this.drawLayer("body");
    c.restore();
    this.drawArms(true, seconds);
    this.drawFace(seconds, blink);
    c.restore();
  }
}
