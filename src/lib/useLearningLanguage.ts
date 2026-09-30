import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useApp } from "../context/AppContext";
import { product } from "./product";
import { useResource } from "./useResource";

const languageList = z.object({
  languages: z.array(z.object({ code: z.string(), count: z.number() })),
});
const storageKey = "gotit.learningLanguage";

export function useLearningLanguage() {
  const { profile } = useApp();
  const [chosen, setChosen] = useState(() => {
    try {
      return window.localStorage.getItem(storageKey) || "";
    } catch {
      return "";
    }
  });
  const resource = useResource(
    useCallback(() => product(languageList, "dashboard/languages"), []),
  );
  const languages = useMemo(
    () => resource.data?.languages || [],
    [resource.data],
  );
  const code = useMemo(() => {
    if (languages.some((entry) => entry.code === chosen)) return chosen;
    if (languages.some((entry) => entry.code === profile.defaultSourceLanguage))
      return profile.defaultSourceLanguage || "";
    return languages[0]?.code || profile.defaultSourceLanguage || "";
  }, [chosen, languages, profile.defaultSourceLanguage]);
  useEffect(() => {
    if (!code) return;
    try {
      window.localStorage.setItem(storageKey, code);
    } catch {
      /* storage unavailable */
    }
  }, [code]);
  return {
    code,
    languages,
    setCode: setChosen,
    loading: resource.loading,
    error: resource.error,
    reload: resource.reload,
  };
}
