import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import original from "../assets/ux/learning-hero.png";
import textless from "../assets/ux/learning-hero-textless.png";
import "./LearningHero.css";

const captions = [
  {
    lang: "en",
    hello: "Hello",
    mug: ["Good", "ideas", "start", "here"],
    note: ["Small", "Steps", "Big", "Progress"],
    font: "latin",
    size: 24,
  },
  {
    lang: "ar",
    hello: "مرحبًا",
    mug: ["الأفكار", "الجيدة", "تبدأ", "هنا"],
    note: ["خطوات", "صغيرة", "تقدم", "كبير"],
    font: "arabic",
    size: 18,
  },
  {
    lang: "fr",
    hello: "Bonjour",
    mug: ["Les bonnes", "idées", "commencent", "ici"],
    note: ["Petits", "pas", "Grands", "progrès"],
    font: "latin",
    size: 18,
  },
  {
    lang: "es",
    hello: "Hola",
    mug: ["Las buenas", "ideas", "empiezan", "aquí"],
    note: ["Pequeños", "pasos", "Grandes", "avances"],
    font: "latin",
    size: 19,
  },
  {
    lang: "zh",
    hello: "你好",
    mug: ["好点子", "从这里", "开始"],
    note: ["小小步伐", "大大进步"],
    font: "cjk",
    size: 17,
  },
  {
    lang: "ja",
    hello: "こんにちは",
    mug: ["いい", "アイデアは", "ここから"],
    note: ["小さな", "一歩", "大きな", "進歩"],
    font: "cjk",
    size: 14,
  },
  {
    lang: "pt",
    hello: "Olá",
    mug: ["Boas ideias", "começam", "aqui"],
    note: ["Pequenos", "passos", "Grande", "progresso"],
    font: "latin",
    size: 19,
  },
  {
    lang: "ru",
    hello: "Привет",
    mug: ["Хорошие", "идеи", "начинаются", "здесь"],
    note: ["Маленькие", "шаги", "Большой", "прогресс"],
    font: "latin",
    size: 18,
  },
  {
    lang: "he",
    hello: "שלום",
    mug: ["רעיונות", "טובים", "מתחילים", "כאן"],
    note: ["צעדים", "קטנים", "התקדמות", "גדולה"],
    font: "hebrew",
    size: 15,
  },
  {
    lang: "de",
    hello: "Hallo",
    mug: ["Gute Ideen", "beginnen", "hier"],
    note: ["Kleine", "Schritte", "Große", "Fortschritte"],
    font: "latin",
    size: 20,
  },
];

/** One original scene; only the three lettering areas are covered and redrawn. */
export function LearningHero() {
  const { i18n } = useTranslation();
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const id = useId();
  const locale = i18n.resolvedLanguage?.split("-")[0] ?? "en";

  useEffect(() => {
    const image = new Image();
    image.onload = () => setReady(true);
    image.src = textless;
    return () => {
      image.onload = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(timer);
      if (motion?.matches) {
        setIndex(
          Math.max(
            0,
            captions.findIndex((item) => item.lang === locale),
          ),
        );
      } else if (!document.hidden) {
        timer = setInterval(
          () => setIndex((value) => (value + 1) % captions.length),
          4000,
        );
      }
    };
    sync();
    motion?.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(timer);
      motion?.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [locale, ready]);

  const caption = captions[index];
  const rtl = caption.lang === "ar" || caption.lang === "he";
  // Keep the exact original English frame. All other frames share fixed patches.
  const translated = ready && caption.lang !== "en";
  return (
    <>
      <img src={original} alt="" width={553} height={467} />
      <svg
        className="learning-hero-overlay"
        viewBox="0 0 553 467"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter id={`${id}-dark-ink`}>
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -1 -1 -1 0 1.9"
            />
            <feComponentTransfer>
              <feFuncA type="discrete" tableValues="0 1" />
            </feComponentTransfer>
            <feMorphology operator="dilate" radius="1" />
            <feGaussianBlur stdDeviation="0.4" />
          </filter>
          <filter id={`${id}-light-ink`}>
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 1 1 0 -1.4"
            />
            <feComponentTransfer>
              <feFuncA type="discrete" tableValues="0 1" />
            </feComponentTransfer>
            <feMorphology operator="dilate" radius="1" />
            <feGaussianBlur stdDeviation="0.4" />
          </filter>
          <clipPath id={`${id}-dark-areas`}>
            <path d="M229 237 L281 229 L283 325 L229 325 Z" />
          </clipPath>
          <filter id={`${id}-note-edge`}>
            <feGaussianBlur stdDeviation="0.8" />
          </filter>
          <clipPath id={`${id}-book-area`}>
            <path d="M126 340 L211 351 L210 386 L124 376 Z" />
          </clipPath>
          <mask
            id={`${id}-lettering`}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="553"
            height="467"
          >
            <g clipPath={`url(#${id}-dark-areas)`}>
              <image
                href={original}
                width="553"
                height="467"
                filter={`url(#${id}-dark-ink)`}
              />
            </g>
            <path
              d="M416 164 L483 148 L505 248 L429 255 Z"
              fill="white"
              filter={`url(#${id}-note-edge)`}
            />
            <g clipPath={`url(#${id}-book-area)`}>
              <image
                href={original}
                width="553"
                height="467"
                filter={`url(#${id}-light-ink)`}
              />
            </g>
          </mask>
        </defs>
        <image
          href={textless}
          width="553"
          height="467"
          preserveAspectRatio="none"
          mask={`url(#${id}-lettering)`}
          opacity={translated ? 1 : 0}
        />
        {translated && (
          <g
            key={caption.lang}
            className={`learning-hero-text hero-font-${caption.font}`}
            lang={caption.lang}
            direction={rtl ? "rtl" : "ltr"}
            textAnchor="middle"
            fill="#505766"
          >
            <text transform="rotate(-7 256 278)" fontSize={caption.size}>
              {caption.mug.map((line, lineIndex) => (
                <tspan
                  key={lineIndex}
                  x="255"
                  y={253 + lineIndex * 21 + (4 - caption.mug.length) * 10}
                >
                  {line}
                </tspan>
              ))}
            </text>
            <text
              transform="rotate(-13 461 210)"
              fontSize={
                caption.font === "latin" ? 22 : caption.font === "cjk" ? 16 : 17
              }
            >
              {caption.note.map((line, lineIndex) => (
                <tspan
                  key={lineIndex}
                  x="460"
                  y={182 + lineIndex * 21 + (4 - caption.note.length) * 10}
                >
                  {line}
                </tspan>
              ))}
            </text>
            <text
              x="169"
              y="374"
              transform="rotate(7 169 365)"
              fontSize={caption.font === "latin" ? 33 : 24}
              fill="#f1f3e9"
            >
              {caption.hello}
            </text>
          </g>
        )}
      </svg>
    </>
  );
}
