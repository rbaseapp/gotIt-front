/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { seedItems, seedProfile } from "../data/seed";
import { api, ApiError, clearTokens } from "../lib/api";
import {
  demoAward,
  demoReducer,
  isDemoState,
  type DemoState,
} from "../lib/demo";
import { readStorage, writeStorage } from "../lib/storage";
import { validateProfile } from "../lib/contracts";
import type {
  AppStats,
  Attempt,
  AuthUser,
  GameType,
  LearningItem,
  PracticeSession,
  UserProfile,
} from "../types";
import i18n from "../i18n";

const defaultProfile: UserProfile = {
  name: "",
  email: "",
  defaultSourceLanguage: null,
  defaultTranslationLanguage: null,
  timezone: "UTC",
  dailyGoal: { type: "items", value: 20 },
  defaultNewItemsPerDay: 10,
  translationMethodPreference: "auto",
  learningPreferences: {
    enabledSkills: [
      "recognition",
      "recall",
      "listening",
      "spelling",
      "pronunciation",
    ],
  },
  languages: [],
  interests: [],
};
const freshDemo = (): DemoState => ({
  items: structuredClone(seedItems),
  profile: {
    ...structuredClone(seedProfile),
    dailyGoal: { type: "items", value: 20 },
  },
  attempts: [],
  sessions: [],
});
function initialDemo(): DemoState {
  const value = readStorage<unknown>("gotit.demo.v2", null);
  return isDemoState(value) && !validateProfile(value.profile)
    ? value
    : freshDemo();
}
export type AuthMode = "loading" | "signed-out" | "demo" | "live";
interface AppContextValue {
  mode: AuthMode;
  profileError: string;
  notice: string;
  profile: UserProfile;
  items: LearningItem[];
  stats: AppStats;
  attempts: Attempt[];
  sessions: PracticeSession[];
  authenticate: (
    mode: "login" | "register",
    email: string,
    password: string,
  ) => Promise<void>;
  authenticateGoogle: (idToken: string) => Promise<void>;
  authenticateFacebook: (accessToken: string) => Promise<void>;
  startDemo: () => void;
  logout: () => Promise<void>;
  retryProfile: () => Promise<void>;
  addItem: (
    input: Pick<
      LearningItem,
      | "source"
      | "translation"
      | "context"
      | "sourceLanguage"
      | "translationLanguage"
      | "tags"
    >,
    mergeId?: string,
  ) => void;
  updateItem: (id: string, patch: Partial<LearningItem>) => void;
  deleteItem: (id: string) => void;
  recordAttempt: (
    itemId: string,
    game: GameType,
    score: number,
    details?: Partial<Attempt>,
  ) => number;
  saveSession: (session: PracticeSession) => void;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  resetDemo: () => void;
}
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [demo, dispatch] = useReducer(demoReducer, undefined, initialDemo);
  const demoRef = useRef(demo);
  demoRef.current = demo;
  const [mode, setMode] = useState<AuthMode>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [liveProfile, setLiveProfile] = useState(defaultProfile);
  const [profileError, setProfileError] = useState("");
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    if (import.meta.env.VITE_DEMO_MODE === "true")
      setStorageError(!writeStorage("gotit.demo.v2", demo));
  }, [demo]);
  useEffect(() => {
    const expired = () => {
      setUser(null);
      setLiveProfile(defaultProfile);
      setMode("signed-out");
      setNotice(i18n.t("session.expired"));
    };
    window.addEventListener("gotit:session-expired", expired);
    return () => window.removeEventListener("gotit:session-expired", expired);
  }, []);
  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        if (
          import.meta.env.VITE_DEMO_MODE === "true" &&
          readStorage<string>("gotit.mode", "") === "demo"
        ) {
          setMode("demo");
          return;
        }
        if (!sessionStorage.getItem("gotit.refresh")) {
          setMode("signed-out");
          return;
        }
        const identity = await api.me();
        if (cancelled) return;
        setUser(identity);
        setProfileError(i18n.t("session.loadingProfile"));
        setLiveProfile({
          ...defaultProfile,
          email: identity.email,
          name: identity.email.split("@")[0],
        });
        setMode("live");
        try {
          const profile = await api.getProfile();
          if (!cancelled) {
            setLiveProfile((current) => ({ ...current, ...profile }));
            setProfileError("");
          }
        } catch (error) {
          if (!cancelled)
            setProfileError(
              error instanceof Error ? error.message : i18n.t("session.profileFailed"),
            );
        }
      } catch (error) {
        if (!cancelled) {
          clearTokens();
          setMode("signed-out");
          setNotice(error instanceof Error ? error.message : i18n.t("session.signInAgain"));
        }
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const profile = mode === "demo" ? demo.profile : liveProfile;
  const dateOf = (value: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: profile.timezone }).format(
      new Date(value),
    );
  const today = dateOf(new Date().toISOString());
  const todayAttempts = demo.attempts.filter(
    (attempt) => dateOf(attempt.createdAt) === today,
  );
  const recentSessions = demo.sessions.filter(
    (session) => +new Date(session.startedAt) >= Date.now() - 7 * 86400000,
  );
  const activityDates = new Set(
    demo.attempts
      .filter((attempt) => attempt.result !== "skipped")
      .map((attempt) => dateOf(attempt.createdAt)),
  );
  let streak = 0;
  const cursor = new Date();
  if (!activityDates.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (activityDates.has(dateOf(cursor.toISOString()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const stats: AppStats =
    mode === "demo"
      ? {
          xp: demo.attempts.reduce(
            (sum, attempt) => sum + (attempt.xp || 0),
            0,
          ),
          streak,
          learnedToday:
            profile.dailyGoal.type === "attempts"
              ? todayAttempts.length
              : profile.dailyGoal.type === "minutes"
                ? Math.floor(
                    demo.sessions
                      .filter((session) => dateOf(session.startedAt) === today)
                      .reduce(
                        (sum, session) => sum + session.durationSeconds,
                        0,
                      ) / 60,
                  )
                : new Set(
                    todayAttempts
                      .filter((attempt) => attempt.result !== "skipped")
                      .map((attempt) => attempt.itemId),
                  ).size,
          minutesThisWeek: Math.floor(
            recentSessions.reduce(
              (sum, session) => sum + session.durationSeconds,
              0,
            ) / 60,
          ),
          lastPracticeDate: demo.attempts.at(-1)?.createdAt || null,
        }
      : {
          xp: 0,
          streak: 0,
          learnedToday: 0,
          minutesThisWeek: 0,
          lastPracticeDate: null,
        };

  const value: AppContextValue = {
    mode,
    profile,
    stats,
    profileError,
    notice: storageError
      ? i18n.t("session.storageUnavailable")
      : notice,
    items: mode === "demo" ? demo.items : [],
    attempts: mode === "demo" ? demo.attempts : [],
    sessions: mode === "demo" ? demo.sessions : [],
    async authenticateGoogle(idToken) {
      const identity = await api.google(idToken);
      setUser(identity);
      setProfileError(i18n.t("session.loadingProfile"));
      setNotice("");
      writeStorage("gotit.mode", "live");
      setLiveProfile({
        ...defaultProfile,
        email: identity.email,
        name: identity.email.split("@")[0],
      });
      setMode("live");
      try {
        const result = await api.getProfile();
        setLiveProfile((current) => ({ ...current, ...result }));
        setProfileError("");
      } catch (error) {
        setProfileError(
          error instanceof Error ? error.message : i18n.t("session.profileFailed"),
        );
      }
    },
    async authenticateFacebook(accessToken) {
      const identity = await api.facebook(accessToken);
      setUser(identity);
      setProfileError(i18n.t("session.loadingProfile"));
      setNotice("");
      writeStorage("gotit.mode", "live");
      setLiveProfile({
        ...defaultProfile,
        email: identity.email,
        name: identity.email.split("@")[0],
      });
      setMode("live");
      try {
        const result = await api.getProfile();
        setLiveProfile((current) => ({ ...current, ...result }));
        setProfileError("");
      } catch (error) {
        setProfileError(
          error instanceof Error ? error.message : i18n.t("session.profileFailed"),
        );
      }
    },
    async authenticate(authMode, email, password) {
      const identity = await api.signIn(authMode, email, password);
      setUser(identity);
      setProfileError(i18n.t("session.loadingProfile"));
      setNotice("");
      writeStorage("gotit.mode", "live");
      setLiveProfile({
        ...defaultProfile,
        email: identity.email,
        name: identity.email.split("@")[0],
      });
      setMode("live");
      try {
        const result = await api.getProfile();
        setLiveProfile((current) => ({ ...current, ...result }));
        setProfileError("");
      } catch (error) {
        setProfileError(
          error instanceof Error ? error.message : i18n.t("session.profileFailed"),
        );
      }
    },
    startDemo() {
      if (import.meta.env.VITE_DEMO_MODE !== "true") return;
      if (mode === "live")
        void value.logout().then(() => {
          writeStorage("gotit.mode", "demo");
          setMode("demo");
          setProfileError("");
        });
      else {
        clearTokens();
        writeStorage("gotit.mode", "demo");
        setMode("demo");
        setNotice("");
        setProfileError("");
      }
    },
    async logout() {
      try {
        if (mode === "live") await api.logout();
      } catch {
        setNotice(
          i18n.t("session.logoutServerFailed"),
        );
      } finally {
        clearTokens();
        writeStorage("gotit.mode", "signed-out");
        setUser(null);
        setLiveProfile(defaultProfile);
        setMode("signed-out");
      }
    },
    async retryProfile() {
      try {
        const result = await api.getProfile();
        setLiveProfile((current) => ({ ...current, ...result }));
        setProfileError("");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearTokens();
          setMode("signed-out");
        }
        setProfileError(
          error instanceof Error ? error.message : i18n.t("session.profileFailed"),
        );
      }
    },
    addItem(input, mergeId) {
      if (mode !== "demo") return;
      const now = new Date().toISOString();
      if (mergeId) {
        const existing = demo.items.find((item) => item.id === mergeId);
        if (existing)
          dispatch({
            type: "patch",
            id: mergeId,
            patch: {
              occurrences: [
                ...(existing.occurrences || []),
                { context: input.context, createdAt: now },
              ],
            },
          });
        return;
      }
      dispatch({
        type: "item",
        item: {
          ...input,
          id: crypto.randomUUID(),
          partOfSpeech: "other",
          status: "NEW",
          userStatus: "ACTIVE",
          priority: "NORMAL",
          hard: false,
          mastery: 0,
          skills: {
            recognition: 0,
            recall: 0,
            listening: 0,
            spelling: 0,
            pronunciation: 0,
          },
          dueAt: now,
          createdAt: now,
          attempts: 0,
          deletedAt: null,
          translations: [],
          examples: [],
          occurrences: [{ context: input.context, createdAt: now }],
        },
      });
    },
    updateItem(id, patch) {
      if (mode === "demo") dispatch({ type: "patch", id, patch });
    },
    deleteItem(id) {
      if (mode === "demo")
        dispatch({
          type: "patch",
          id,
          patch: { deletedAt: new Date().toISOString() },
        });
    },
    recordAttempt(itemId, game, score, details = {}) {
      if (mode !== "demo") return 0;
      const attempt: Attempt = {
        id: details.id || crypto.randomUUID(),
        itemId,
        game,
        correct: score >= 60,
        score,
        createdAt: new Date().toISOString(),
        ...details,
      };
      const award = demoAward(demoRef.current.attempts, attempt);
      demoRef.current = demoReducer(demoRef.current, {
        type: "attempt",
        attempt,
      });
      dispatch({ type: "attempt", attempt });
      return award;
    },
    saveSession(session) {
      if (mode === "demo") dispatch({ type: "session", session });
    },
    async updateProfile(patch) {
      const next = { ...profile, ...patch };
      const error = validateProfile(next);
      if (error) throw new Error(error);
      if (mode === "demo") {
        dispatch({ type: "profile", profile: next });
        return;
      }
      if (mode !== "live" || profileError)
        throw new Error(i18n.t("session.loadBeforeSave"));
      try {
        const result = await api.saveProfile(next);
        const name = next.name.trim() || user?.email.split("@")[0] || "";
        setLiveProfile({ ...next, ...result, name });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearTokens();
          setMode("signed-out");
        }
        throw error;
      }
    },
    resetDemo() {
      if (mode === "demo") {
        dispatch({ type: "replace", state: freshDemo() });
        writeStorage("gotit.readings.v1", []);
      }
    },
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp requires AppProvider");
  return value;
}
