import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CHROME_EXTENSION_URL } from "../config";
import { testimonials } from "../data/testimonials";
import { supportEmailHref } from "../lib/supportContact";
import { UiLanguageSelect } from "../components/UiLanguageSelect";
import designCss from "./design.css?inline";
import bodyHtml from "./body.html?raw";
import { initLanding } from "./init";
import "./fonts.css";

const START_PATH = "/start";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Real learner quotes only; the section is omitted while there are none. */
function testimonialsHtml() {
  if (!testimonials.length) return "";
  const monograms = ["", "yellow-avatar", "pink-avatar"];
  const cards = testimonials
    .slice(0, 3)
    .map(
      (item, i) =>
        `<figure class="review reveal"><span class="quote-mark">“</span><blockquote${item.lang ? ` lang="${item.lang}"` : ""}>${escapeHtml(item.quote)}</blockquote><figcaption><span class="review-monogram ${monograms[i % 3]}">★</span><span><strong>לומד/ת GotIt</strong></span></figcaption></figure>`,
    )
    .join("");
  return `<section class="testimonials section-shell section-space"><div class="reviews-heading reveal"><div><span class="eyebrow">לכל אחד יש את ה־GOT IT שלו</span><h2>רגעים קטנים.<br><em>תחושה גדולה.</em></h2></div></div><div class="review-grid">${cards}</div></section>`;
}

/**
 * The public landing page in the supplied Hebrew design. It lives in a shadow
 * root so its global-looking styles (h1, button, .button, .footer...) cannot
 * touch the app and the app's styles cannot touch it.
 */
export default function LandingDesign() {
  const hostRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    const body = bodyHtml.replace("<!--TESTIMONIALS-->", testimonialsHtml());
    shadow.innerHTML = `<style>${designCss}</style><div class="gl-root js-motion">${body}</div>`;
    return initLanding(shadow, {
      navigate,
      destinations: {
        signup: START_PATH,
        login: "/login",
        extension: CHROME_EXTENSION_URL,
        contact: supportEmailHref("GotIt"),
        privacy: "/privacy",
        terms: "/terms",
      },
    });
  }, [navigate]);
  return (
    <>
      <div ref={hostRef} data-testid="landing-design" />
      <div className="gl-language">
        <UiLanguageSelect compact />
      </div>
    </>
  );
}
