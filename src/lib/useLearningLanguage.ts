import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { product } from "./product";
import { useCachedResource } from "./useCachedResource";
import { resourceKey } from "./resourceCache";
import { languageListSchema } from "./learningLanguages";

const storageKey = "gotit.learningLanguage";
const selectionEvent = "gotit:learning-language-changed";

export function useLearningLanguage() {
  const { profile, user } = useApp();
  const [chosen, setChosen] = useState(() => {
    try {
      return window.localStorage.getItem(storageKey) || "";
    } catch {
      return "";
    }
  });
  useEffect(() => {
    const changed = (event: Event) =>
      setChosen((event as CustomEvent<string>).detail);
    window.addEventListener(selectionEvent, changed);
    return () => window.removeEventListener(selectionEvent, changed);
  }, []);
  const setCode = useCallback((code: string) => {
    setChosen(code);
    window.dispatchEvent(new CustomEvent(selectionEvent, { detail: code }));
  }, []);
  const resource = useCachedResource(
    useCallback(() => product(languageListSchema, "dashboard/languages"), []),
    resourceKey(user, "dashboard/languages"),
  );
  const reloadLanguages = resource.reload;
  useEffect(() => {
    const changed = () => void reloadLanguages();
    window.addEventListener("gotit:library-changed", changed);
    return () => window.removeEventListener("gotit:library-changed", changed);
  }, [reloadLanguages]);
  const languages = useMemo(
    () => resource.data?.languages || [],
    [resource.data],
  );
  const code = useMemo(() => {
    if (!resource.data) return chosen || profile.defaultSourceLanguage || "";
    if (languages.some((entry) => entry.code === chosen)) return chosen;
    if (languages.some((entry) => entry.code === profile.defaultSourceLanguage))
      return profile.defaultSourceLanguage || "";
    return languages[0]?.code || profile.defaultSourceLanguage || "";
  }, [chosen, languages, profile.defaultSourceLanguage, resource.data]);
  useEffect(() => {
    if (!code || !resource.data || resource.loading || resource.error) return;
    try {
      window.localStorage.setItem(storageKey, code);
    } catch {
      /* storage unavailable */
    }
  }, [code, resource.data, resource.loading, resource.error]);
  return {
    code,
    languages,
    setCode,
    loading: resource.loading,
    error: resource.error,
    reload: reloadLanguages,
  };
}
