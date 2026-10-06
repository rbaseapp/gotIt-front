import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useApp } from "../context/AppContext";
import { useSubscription } from "../context/SubscriptionContext";
import { product, uuid } from "./product";
type GuideItem = {
  id: string;
  sourceText: string;
  translationLanguageCode: string;
  phoneticText?: string | null;
  phoneticScheme?: string | null;
  userStatus?: string;
  updatedAt: string;
};
const guideSchema = z.object({
  id: uuid,
  phoneticText: z.string(),
  phoneticScheme: z.string(),
});
type Guide = z.infer<typeof guideSchema>;
export function useReadingGuides(items: GuideItem[]) {
  const { profile } = useApp();
  const { hasEntitlement } = useSubscription();
  const canWrite = hasEntitlement("vocabulary.write");
  const native = profile.defaultTranslationLanguage;
  const key = JSON.stringify(
    items.map((item) => [
      item.id,
      item.updatedAt,
      item.sourceText,
      item.translationLanguageCode,
      item.phoneticText,
      item.phoneticScheme,
      item.userStatus,
    ]),
  );
  const currentItems = useMemo(
    () =>
      JSON.parse(key).map(
        ([
          id,
          updatedAt,
          sourceText,
          translationLanguageCode,
          phoneticText,
          phoneticScheme,
          userStatus,
        ]: string[]) => ({
          id,
          updatedAt,
          sourceText,
          translationLanguageCode,
          phoneticText,
          phoneticScheme,
          userStatus,
        }),
      ) as GuideItem[],
    [key],
  );
  const [resolved, setResolved] = useState<{
    key: string;
    native: string | null;
    guides: Guide[];
  }>();
  useEffect(() => {
    const missing = currentItems.filter(
      (item) =>
        item.userStatus !== "deleted" &&
        (!item.phoneticText ||
          item.phoneticScheme !==
            `transliteration:${native || item.translationLanguageCode}`),
    );
    if (!canWrite || !missing.length) return;
    let active = true;
    // Deferring allows StrictMode cleanup to cancel the duplicate mount request.
    const timer = window.setTimeout(() => {
      void product(
        z.object({ guides: z.array(guideSchema) }),
        "learning-items/reading-guides",
        "POST",
        { ids: missing.slice(0, 30).map((item) => item.id) },
      )
        .then((result) => {
          if (active) setResolved({ key, native, guides: result.guides });
        })
        .catch(() => {}); // Missing provider data must never be replaced with a translation.
    }, 100);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [key, native, canWrite, currentItems]);
  return (item: GuideItem) => {
    const scheme = `transliteration:${native || item.translationLanguageCode}`;
    if (item.phoneticText && item.phoneticScheme === scheme)
      return { text: item.phoneticText, language: scheme.slice(16) };
    const guide =
      resolved?.key === key && resolved.native === native
        ? resolved.guides.find(
            (guide) => guide.id === item.id && guide.phoneticScheme === scheme,
          )
        : undefined;
    return guide
      ? { text: guide.phoneticText, language: scheme.slice(16) }
      : undefined;
  };
}
