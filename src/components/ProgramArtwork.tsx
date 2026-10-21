import { useEffect, useState } from "react";
import { ImageOff, LoaderCircle, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import {
  artworkKey,
  cachedArtwork,
  loadArtwork,
  type Artwork,
} from "../lib/programArtwork";
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
  const key = artworkKey(user, input, revision);
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
  const visible =
    state?.key === key ? state : { src: cachedArtwork(key), failed: false };
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
