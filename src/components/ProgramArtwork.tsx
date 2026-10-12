import { useEffect, useState } from "react";
import { ImageOff, LoaderCircle, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { product } from "../lib/product";
import { useApp } from "../context/AppContext";

type Artwork =
  | { kind: "course"; courseId: string }
  | { kind: "mascot"; languageCode: string }
  | { kind: "path" };
const response = z.object({
  image: z
    .object({
      dataUrl: z
        .string()
        .max(4_100_000)
        .regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/u),
      fingerprint: z.string(),
    })
    .nullable(),
});
// Resolve cached images concurrently, serialize only paid misses, and coalesce hero/card
// requests. Account scope prevents a shared browser session from reusing private art.
let generationQueue: Promise<unknown> = Promise.resolve();
const pending = new Map<string, Promise<string>>();
const images = new Map<string, string>();
function loadArtwork(key: string, input: Artwork) {
  const cached = images.get(key);
  if (cached) return Promise.resolve(cached);
  const current = pending.get(key);
  if (current) return current;
  const load = product(response, "courses/artwork/lookup", "POST", input)
    .then((result) => {
      if (result.image) return result.image;
      const generation = generationQueue
        .catch(() => undefined)
        .then(() =>
          product(response, "courses/artwork/generate", "POST", input),
        )
        .then((result) => {
          if (!result.image) throw new Error("Unavailable");
          return result.image;
        });
      generationQueue = generation;
      return generation;
    })
    .then((image) => {
      if (images.size >= 100) images.delete(images.keys().next().value!);
      images.set(key, image.dataUrl);
      return image.dataUrl;
    })
    .finally(() => pending.delete(key));
  pending.set(key, load);
  return load;
}
export function ProgramArtwork({
  input,
  revision = "",
  alt,
  className = "",
}: {
  input: Artwork;
  revision?: string;
  alt: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const { user } = useApp();
  const serialized = JSON.stringify(input);
  const key = `${user?.applicationId}:${user?.id}:${serialized}:${revision}`;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: string;
    src?: string;
    failed?: boolean;
  }>();
  useEffect(() => {
    let current = true;
    void loadArtwork(key, JSON.parse(serialized) as Artwork).then(
      (src) => {
        if (current) setState({ key, src });
      },
      () => {
        if (current) setState({ key, failed: true });
      },
    );
    return () => {
      current = false;
    };
  }, [key, serialized, attempt]);
  const visible = state?.key === key ? state : undefined;
  return (
    <div className={`pg-art ${className}`}>
      {visible?.src ? (
        <img src={visible.src} alt={alt} decoding="async" />
      ) : visible?.failed ? (
        <div className="pg-art-message">
          <ImageOff size={22} aria-hidden="true" />
          <span>{t("programsDesign.artUnavailable")}</span>
          <button
            type="button"
            onClick={() => {
              setState(undefined);
              setAttempt((value) => value + 1);
            }}
          >
            <RotateCw size={14} />
            {t("courses.tryAgain")}
          </button>
        </div>
      ) : (
        <div className="pg-art-message" role="status">
          <LoaderCircle className="pg-spinner" size={24} aria-hidden="true" />
          <span>{t("programsDesign.artLoading")}</span>
        </div>
      )}
    </div>
  );
}
