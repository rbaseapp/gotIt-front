import settingsI18n from "../../i18n";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Facebook,
  Clock3,
  Mail,
  Pencil,
  UserRound,
  Check,
  LoaderCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../context/AppContext";
import { Modal } from "../Modal";
import { profileTimezones } from "../../lib/settingsDesign";
import googleIcon from "../../assets/settings/google.png";
import {
  signInMethods,
  linkMethod,
  prepareAvatar,
  type SignInMethod,
} from "../../lib/accountSettings";
import { GoogleSignIn } from "../GoogleSignIn";
import { FacebookSignIn } from "../FacebookSignIn";
import { EmailAuthForm } from "../EmailAuthForm";

export function SettingsProfile() {
  const { t } = useTranslation();
  const {
    profile,
    user,
    mode,
    updateProfile,
    profileError,
    retryProfile,
    authenticate,
  } = useApp();
  const [name, setName] = useState(profile.name);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [editingTimezone, setEditingTimezone] = useState(false);
  const [notice, setNotice] = useState<
    "email" | "password" | "avatar" | "google" | "facebook" | null
  >(null);
  const [methods, setMethods] = useState<SignInMethod[]>([]);
  const [methodsError, setMethodsError] = useState("");
  const [methodsAttempt, setMethodsAttempt] = useState(0);
  const [avatar, setAvatar] = useState(profile.avatarData ?? null);
  useEffect(() => setAvatar(profile.avatarData ?? null), [profile.avatarData]);
  useEffect(() => {
    let active = true;
    if (mode !== "live") return;
    setMethodsError("");
    void signInMethods()
      .then((v) => {
        if (active) setMethods(v);
      })
      .catch(() => {
        if (active) setMethodsError(settingsI18n.t("settings.saveFailed"));
      });
    return () => {
      active = false;
    };
  }, [mode, methodsAttempt]);
  async function connect(provider: "google" | "facebook", token: string) {
    setBusy(true);
    setError("");
    try {
      setMethods(await linkMethod(provider, token));
      setNotice(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : t("settings.saveFailed"),
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    setError("");
    try {
      setAvatar(await prepareAvatar(file));
      setSaved(false);
    } catch {
      setError(t("settingsLive.avatarInvalid"));
    }
  }
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const zoneRef = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    setName(profile.name);
    setTimezone(profile.timezone);
  }, [profile.name, profile.timezone]);
  useEffect(() => {
    if (editingTimezone) zoneRef.current?.focus();
  }, [editingTimezone]);
  const dirty =
    name !== profile.name ||
    timezone !== profile.timezone ||
    avatar !== (profile.avatarData ?? null);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || profileError || !dirty) return;
    setBusy(true);
    setSaved(false);
    setError("");
    try {
      await updateProfile({
        name: name.trim(),
        displayName: name.trim(),
        timezone,
        avatarData: avatar,
      });
      setName(name.trim());
      setSaved(true);
      setEditingTimezone(false);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : t("settings.saveFailed"),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {profileError && (
        <div className="form-error" role="alert">
          {profileError}
          <button
            type="button"
            className="button secondary"
            onClick={() => void retryProfile()}
          >
            {t("common.tryAgain")}
          </button>
        </div>
      )}
      <form onSubmit={(event) => void save(event)}>
        <fieldset
          className="sd-card sd-profile-fields"
          disabled={busy || !!profileError}
        >
          <div className="sd-profile-field">
            <span className="sd-field-icon">
              <UserRound aria-hidden="true" />
            </span>
            <label htmlFor="sd-name">
              {t("settings.displayName")}{" "}
              <small
                id="sd-name-help"
                aria-hidden="true"
                title={t("settingsDesign.nameHelp")}
              >
                {mode === "demo" ? t("settings.demo") : ""}
              </small>
            </label>
            <input
              id="sd-name"
              autoComplete="nickname"
              required
              maxLength={80}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              aria-describedby="sd-name-help"
            />
          </div>
          <div className="sd-profile-field">
            <span className="sd-field-icon">
              <Mail aria-hidden="true" />
            </span>
            <label htmlFor="sd-email">{t("settings.email")}</label>
            <div className="sd-editable">
              <input
                id="sd-email"
                value={user?.email || profile.email}
                readOnly
                dir="auto"
                aria-describedby="sd-email-help"
              />
              <button
                type="button"
                aria-label={t("settingsDesign.editEmail")}
                onClick={() => setNotice("email")}
              >
                <Pencil size={18} />
              </button>
            </div>
            <small id="sd-email-help">{t("settingsDesign.emailHelp")}</small>
          </div>
          <div className="sd-profile-field">
            <span className="sd-field-icon">
              <Clock3 aria-hidden="true" />
            </span>
            <label htmlFor="sd-timezone">
              {t("settingsDesign.timezoneLabel")}
            </label>
            <div className="sd-editable">
              <select
                ref={zoneRef}
                id="sd-timezone"
                aria-describedby="sd-timezone-help"
                value={timezone}
                disabled={!editingTimezone}
                onChange={(e) => {
                  setTimezone(e.target.value);
                  setSaved(false);
                }}
              >
                {profileTimezones(timezone).map((zone) => (
                  <option key={zone} value={zone}>
                    {zone === "UTC" ? "UTC (GMT+0)" : zone.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label={t("settingsDesign.editTimezone")}
                onClick={() => setEditingTimezone(true)}
              >
                <Pencil size={18} />
              </button>
            </div>
            <small id="sd-timezone-help">
              {t("settingsDesign.timezoneHelp")}
            </small>
          </div>
        </fieldset>
        {(dirty || busy || saved || error) && (
          <div className="sd-save-row">
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {saved && (
              <p role="status">
                <Check size={18} />
                {t("settings.changesSaved")}
              </p>
            )}
            {dirty && (
              <button
                className="button primary"
                disabled={busy || !!profileError}
              >
                {busy ? (
                  <LoaderCircle size={18} className="spin" />
                ) : (
                  <Check size={18} />
                )}
                {t(busy ? "settings.saving" : "settings.saveChanges")}
              </button>
            )}
          </div>
        )}
      </form>
      <section
        className="sd-card sd-avatar-card"
        aria-labelledby="sd-avatar-title"
      >
        <span className="sd-avatar" aria-hidden="true">
          {avatar ? (
            <img src={avatar} alt="" />
          ) : (
            (name || user?.email || "?").trim().slice(0, 1).toLocaleUpperCase()
          )}
        </span>
        <div>
          <h2 id="sd-avatar-title">{t("settingsDesign.avatar")}</h2>
          <p>{t("settingsDesign.avatarHelp")}</p>
        </div>
        <button
          className="sd-outline"
          type="button"
          onClick={() => setNotice("avatar")}
        >
          {t("settingsDesign.change")}
        </button>
      </section>
      <section
        className="sd-card sd-connections"
        aria-labelledby="sd-connections-title"
      >
        <h2 id="sd-connections-title">{t("settingsDesign.connections")}</h2>
        {methodsError && (
          <p role="alert">
            {methodsError}
            <button
              type="button"
              className="sd-outline"
              onClick={() => setMethodsAttempt((v) => v + 1)}
            >
              {t("common.tryAgain")}
            </button>
          </p>
        )}
        {(["google", "facebook", "email"] as const).map((provider) => {
          const method = methods.find((m) => m.provider === provider);
          return (
            <div className="sd-provider" key={provider}>
              {provider === "google" ? (
                <img src={googleIcon} alt="" />
              ) : provider === "facebook" ? (
                <Facebook size={22} aria-hidden="true" />
              ) : (
                <Mail size={22} aria-hidden="true" />
              )}
              <strong>
                {provider === "email"
                  ? t("settingsLive.emailLogin")
                  : provider === "google"
                    ? "Google"
                    : "Facebook"}
              </strong>
              <span>
                {t(
                  mode === "demo"
                    ? "settings.demo"
                    : !method
                      ? "common.loading"
                      : method.connected
                        ? "settingsLive.connected"
                        : "settingsLive.notConnected",
                )}
              </span>
              {method && !method.connected && method.available && (
                <button
                  className="sd-outline"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    setNotice(provider === "email" ? "password" : provider);
                  }}
                >
                  {t("settingsLive.connect")}
                </button>
              )}
            </div>
          );
        })}
        <p>{t("settingsDesign.connectionsHelp")}</p>
      </section>
      <Modal
        open={notice !== null}
        onClose={() => setNotice(null)}
        title={t(
          notice === "password"
            ? "settingsLive.passwordAction"
            : notice === "email"
              ? "settingsDesign.editEmail"
              : notice === "google" || notice === "facebook"
                ? "settingsLive.connect"
                : "settingsDesign.avatar",
        )}
      >
        <div className="modal-body">
          {notice === "avatar" ? (
            <div className="sd-avatar-editor">
              <span className="sd-avatar sd-avatar-preview">
                {avatar ? (
                  <img src={avatar} alt={t("settingsDesign.avatar")} />
                ) : (
                  name.slice(0, 1)
                )}
              </span>
              <label className="sd-outline">
                {t("settingsLive.upload")}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) void upload(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <p>{t("settingsLive.avatarHint")}</p>
              {avatar && (
                <button
                  type="button"
                  className="sd-outline"
                  onClick={() => setAvatar(null)}
                >
                  {t("settingsLive.removePhoto")}
                </button>
              )}
            </div>
          ) : notice === "google" ? (
            <GoogleSignIn
              disabled={busy}
              onCredential={(token) => void connect("google", token)}
            />
          ) : notice === "facebook" ? (
            <FacebookSignIn
              disabled={busy}
              onCredential={(token) => void connect("facebook", token)}
            />
          ) : notice === "email" ? (
            <p>{t("settingsDesign.emailUnavailable")}</p>
          ) : (
            <EmailAuthForm
              startingMode="forgot"
              initialEmail={user?.email}
              authenticate={authenticate}
              onBusy={setBusy}
            />
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button
            type="button"
            className="button secondary"
            onClick={() => setNotice(null)}
          >
            {t("common.close")}
          </button>
        </div>
      </Modal>
    </>
  );
}
