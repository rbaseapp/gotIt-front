import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";

export type LegalPageKind = "terms" | "privacy" | "refund";

const EFFECTIVE_DATE = "September 22, 2026";
const SUPPORT_EMAIL = "ori@rbaseapp.com";

const titles: Record<LegalPageKind, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  refund: "Refund Policy",
};

function ContactLink() {
  return <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
}

function Terms() {
  return (
    <>
      <section>
        <h2>1. About these terms</h2>
        <p>
          These Terms of Service (the “Terms”) govern your access to and use of
          GotIt, a language-learning service operated by Ori Arbes under the
          GotIt brand (“GotIt,” “we,” “us,” or “our”). By creating an account or
          using GotIt, you agree to these Terms. If you do not agree, do not use
          the service.
        </p>
      </section>

      <section>
        <h2>2. The service</h2>
        <p>
          GotIt helps users save words and context, generate or select
          translations and learning material, and practice vocabulary, reading,
          listening, and pronunciation. Features may change as the product
          develops. Some output is generated automatically or with third-party
          services and may be incomplete or inaccurate; you should verify
          important information independently.
        </p>
      </section>

      <section>
        <h2>3. Accounts and eligibility</h2>
        <p>
          You must provide accurate account information, keep your credentials
          secure, and promptly tell us about suspected unauthorized use. You are
          responsible for activity under your account. You must be able to enter
          a binding agreement in your country; if you are under the applicable
          age of digital consent, a parent or legal guardian must authorize your
          use.
        </p>
      </section>

      <section>
        <h2>4. Your content</h2>
        <p>
          You retain ownership of words, examples, notes, recordings, and other
          content you submit. You grant us a limited, worldwide license to host,
          process, reproduce, and transmit that content only as needed to
          operate, secure, and improve the service. You confirm that you have the
          rights needed to submit your content and that it does not violate law
          or another person’s rights.
        </p>
      </section>

      <section>
        <h2>5. Subscriptions, payment, and renewal</h2>
        <p>
          Paid plans, prices, billing intervals, included features, and any
          applicable taxes are shown before checkout. Subscriptions renew
          automatically for the same billing interval until canceled. You may
          cancel through the customer portal linked from your GotIt billing page
          or purchase email; cancellation normally takes effect at the end of
          the current paid period.
        </p>
        <p>
          Our order process is conducted by our online reseller Paddle.com.
          Paddle.com is the Merchant of Record for all our orders. Paddle
          provides all customer service inquiries and handles returns. Your
          purchase is also governed by Paddle’s applicable buyer terms and
          privacy notice. GotIt does not receive or store your full payment-card
          details.
        </p>
        <p>
          Refunds and withdrawal rights are described in our <Link to="/refund-policy">Refund Policy</Link>.
        </p>
      </section>

      <section>
        <h2>6. Acceptable use</h2>
        <p>You may not:</p>
        <ul>
          <li>use the service unlawfully or infringe another person’s rights;</li>
          <li>upload malicious code or try to bypass security or usage limits;</li>
          <li>access another user’s account or data without authorization;</li>
          <li>scrape, resell, or reverse engineer the service except where law permits; or</li>
          <li>interfere with the service or use it to create a competing dataset or service.</li>
        </ul>
      </section>

      <section>
        <h2>7. Our intellectual property</h2>
        <p>
          The GotIt service, design, software, branding, and content supplied by
          us are owned by us or our licensors and are protected by applicable
          intellectual-property laws. Subject to these Terms, we grant you a
          limited, personal, non-exclusive, non-transferable, revocable right to
          use the service for its intended purpose.
        </p>
      </section>

      <section>
        <h2>8. Availability and changes</h2>
        <p>
          We aim to provide a reliable service, but we do not guarantee that it
          will always be available, error-free, or meet every learning goal. We
          may add, change, suspend, or discontinue features. If a material change
          negatively affects a paid subscription, we will provide notice when
          reasonably possible and honor any rights required by law.
        </p>
      </section>

      <section>
        <h2>9. Suspension and termination</h2>
        <p>
          You may stop using GotIt at any time. We may suspend or terminate
          access if you materially breach these Terms, create security or legal
          risk, or fail to pay applicable charges. Where reasonable, we will give
          notice and an opportunity to remedy the issue. Provisions that by their
          nature should survive termination will remain effective.
        </p>
      </section>

      <section>
        <h2>10. Disclaimers and liability</h2>
        <p>
          To the fullest extent permitted by law, GotIt is provided “as is” and
          “as available,” without implied warranties of merchantability, fitness
          for a particular purpose, or non-infringement. GotIt is an educational
          aid and does not guarantee fluency, grades, test results, or other
          outcomes.
        </p>
        <p>
          To the fullest extent permitted by law, we will not be liable for
          indirect, incidental, special, consequential, or punitive damages, or
          loss of profits, data, goodwill, or business opportunity. Our total
          liability arising from the service will not exceed the amount you paid
          for GotIt during the 12 months before the event giving rise to the
          claim. These limitations do not apply where liability cannot legally
          be limited, including mandatory consumer rights.
        </p>
      </section>

      <section>
        <h2>11. Governing law</h2>
        <p>
          These Terms are governed by the laws of the State of Israel, without
          regard to conflict-of-law rules. Mandatory consumer protections and
          rights available in your country remain unaffected.
        </p>
      </section>

      <section>
        <h2>12. Changes and contact</h2>
        <p>
          We may update these Terms. We will change the effective date above and,
          for material changes, provide reasonable notice. Continued use after a
          change takes effect means you accept the updated Terms.
        </p>
        <p>
          Questions about these Terms or the service may be sent to <ContactLink />.
        </p>
      </section>
    </>
  );
}

function Privacy() {
  return (
    <>
      <section>
        <h2>1. Who we are and scope</h2>
        <p>
          GotIt is a language-learning service operated by Ori Arbes under the
          GotIt brand. This Privacy Policy explains how GotIt collects, uses,
          shares, and protects personal data when you use our website and
          service. It does not replace the separate privacy notices of Paddle,
          Google, or other third parties you choose to use.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <ul>
          <li>
            <strong>Account data:</strong> email address, display name, account
            identifier, authentication method, and account status. If you use
            Google sign-in, we receive identity information Google makes
            available; we do not receive your Google password.
          </li>
          <li>
            <strong>Learning data:</strong> saved words, translations, examples,
            context, source-page details you submit, language preferences,
            reading material, answers, practice history, scores, and progress.
            When the memorization image feature is used, the word may be sent to
            the configured stock-image provider to find a relevant image. If no
            suitable result is available, the word, translation, language codes,
            and a bounded current context sentence may be sent to the configured
            AI image provider. The selected or generated image and its attribution
            are cached with the current learning revision.
          </li>
          <li>
            <strong>Voice data:</strong> when you actively use pronunciation
            assessment, your browser records the requested audio and sends it to
            us and the configured speech provider for assessment. GotIt does not
            keep the raw recording in its product database after processing, but
            keeps the resulting score, feedback, and a non-reversible request
            fingerprint needed for reliable submission handling.
          </li>
          <li>
            <strong>Billing data:</strong> plan, subscription status, transaction
            and customer identifiers, and related entitlement information from
            Paddle. Paddle processes payment-card details and billing information
            under its own privacy notice; GotIt does not store full card details.
          </li>
          <li>
            <strong>Technical data:</strong> IP address, browser and device data,
            request and security metadata, error details, and basic usage events
            generated when you interact with the service.
          </li>
          <li>
            <strong>Support data:</strong> messages and information you send when
            asking for help or exercising a privacy right.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How we use information</h2>
        <p>We use personal data to:</p>
        <ul>
          <li>create and secure accounts and provide the learning service;</li>
          <li>personalize exercises, track progress, and generate learning content;</li>
          <li>manage subscriptions, entitlements, billing support, and refunds;</li>
          <li>respond to support requests and service communications;</li>
          <li>detect abuse, protect users, troubleshoot, and improve reliability; and</li>
          <li>comply with legal, tax, accounting, and regulatory obligations.</li>
        </ul>
        <p>
          Depending on your location, our legal bases include performing our
          contract with you, our legitimate interests in operating and securing
          GotIt, your consent where required, and compliance with legal duties.
        </p>
      </section>

      <section>
        <h2>4. Service providers and sharing</h2>
        <p>We may share only the data needed with:</p>
        <ul>
          <li>rbase Core, which provides GotIt account authentication;</li>
          <li>Google, when you choose Google sign-in or a Google-backed language or speech feature;</li>
          <li>Pixabay, when GotIt searches for a memorization image;</li>
          <li>Paddle, our reseller and Merchant of Record, for checkout, tax, subscription management, fraud prevention, and buyer support;</li>
          <li>hosting, database, security, translation, AI, reading, and speech providers used to deliver requested features; and</li>
          <li>authorities or advisers when required by law or reasonably necessary to protect rights, safety, and the service.</li>
        </ul>
        <p>
          We do not sell personal data and do not use it for third-party targeted
          advertising. If the business is reorganized or transferred, data may
          be transferred subject to appropriate confidentiality and legal protections.
        </p>
      </section>

      <section>
        <h2>5. Browser storage</h2>
        <p>
          GotIt uses browser storage to keep a session active, remember product
          state, and, if enabled, store demo-mode learning data locally. Google
          and Paddle may use cookies or similar technologies when their sign-in
          or checkout services are opened. We do not use advertising cookies.
          Clearing browser storage may sign you out or remove local demo data.
        </p>
      </section>

      <section>
        <h2>6. International transfers</h2>
        <p>
          Our providers may process data outside your country. Where required,
          we rely on recognized transfer mechanisms and contractual or technical
          safeguards. Provider locations and safeguards may change as our
          infrastructure changes.
        </p>
      </section>

      <section>
        <h2>7. Retention</h2>
        <p>
          We retain account and learning data while your account is active and as
          reasonably needed to provide the service. We may retain limited
          security, transaction, support, and legal records for longer where
          necessary to prevent abuse, resolve disputes, or meet legal, tax, and
          accounting duties. Local demo data remains in your browser until you
          clear it. When data is no longer needed, we delete or anonymize it.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          We use reasonable technical and organizational safeguards, including
          encrypted transport, access controls, scoped authentication, and
          service monitoring. No system is completely secure, so we cannot
          guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>9. Your choices and rights</h2>
        <p>
          Depending on your location, you may have rights to access, correct,
          delete, restrict, or export personal data; object to certain processing;
          or withdraw consent. You may also cancel a subscription without
          deleting your account. To make a request, email <ContactLink /> from
          the address associated with your account. We may verify your identity
          before acting and may retain information where the law permits or requires it.
        </p>
        <p>
          You may also complain to the data-protection authority in your country.
          For data processed independently by Paddle or Google, contact that
          provider directly.
        </p>
      </section>

      <section>
        <h2>10. Children</h2>
        <p>
          GotIt is not directed to children who cannot legally consent to online
          data processing in their country. We do not knowingly collect their
          personal data without authorization from a parent or legal guardian.
          Contact us if you believe a child provided data without proper authorization.
        </p>
      </section>

      <section>
        <h2>11. Changes and contact</h2>
        <p>
          We may update this Policy as the service or law changes. We will post
          the revised version here, update the effective date, and provide
          additional notice when required.
        </p>
        <p>
          For privacy questions or requests, contact Ori Arbes, GotIt’s operator,
          at <ContactLink />.
        </p>
      </section>
    </>
  );
}

function Refund() {
  return (
    <>
      <section>
        <h2>1. Paddle handles payments and refunds</h2>
        <p>
          Paddle.com is the authorized reseller and Merchant of Record for GotIt
          purchases. Paddle processes payments, taxes, subscription billing,
          returns, and refunds. This Policy supplements Paddle’s buyer terms and
          refund policy; if there is a conflict for a transaction, Paddle’s terms
          and any mandatory consumer law govern.
        </p>
      </section>

      <section>
        <h2>2. Canceling a subscription</h2>
        <p>
          You may cancel at any time through the Paddle customer portal linked
          from your GotIt billing page or purchase email. Cancellation stops the
          next renewal. Unless a refund is approved or law requires otherwise,
          you keep access through the end of the period already paid for and no
          prorated refund is issued for unused time.
        </p>
      </section>

      <section>
        <h2>3. Refund eligibility</h2>
        <p>
          Except where required by law, transactions are generally non-refundable.
          Paddle may approve a refund in its discretion, including where the
          service was materially defective, unavailable for an unreasonable
          period, duplicated, or purchased without authorization. Evidence of
          fraud, refund abuse, or other manipulative behavior may result in refusal.
        </p>
        <p>
          Consumers may have non-waivable withdrawal or refund rights under local
          law. For example, eligible consumers in the EU, EEA, Switzerland, or
          United Kingdom may have a 14-day withdrawal right, subject to the rules
          for digital services and loss of that right after access or performance
          begins with the consumer’s consent. This Policy does not limit rights
          for a product that is faulty, not as described, or not fit for purpose.
        </p>
      </section>

      <section>
        <h2>4. How to request a refund</h2>
        <p>
          Submit the request through <a href="https://paddle.net" target="_blank" rel="noreferrer">Paddle Buyer Support</a>
          {" "}using the email address and transaction details from your receipt.
          You may also email <ContactLink /> for product support, but GotIt cannot
          send money directly or bypass Paddle’s refund process.
        </p>
      </section>

      <section>
        <h2>5. After a refund</h2>
        <p>
          Approved refunds are returned by Paddle to the original payment method
          where possible. Timing depends on the payment provider. Access to the
          refunded paid plan may end when the refund is issued. Canceling or
          refunding a subscription does not automatically delete your GotIt account.
        </p>
      </section>

      <section>
        <h2>6. Changes and contact</h2>
        <p>
          The policy in effect when you purchased normally applies to that
          transaction, subject to mandatory law. We may update this page for
          future purchases and will revise the effective date above.
        </p>
        <p>Questions about GotIt may be sent to <ContactLink />.</p>
      </section>
    </>
  );
}

const content: Record<LegalPageKind, () => ReactNode> = {
  terms: Terms,
  privacy: Privacy,
  refund: Refund,
};

export function LegalPage({ kind }: { kind: LegalPageKind }) {
  const title = titles[kind];
  const Content = content[kind];

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | GotIt`;
    window.scrollTo(0, 0);
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <div className="legal-page" dir="ltr" lang="en">
      <header className="legal-header">
        <Link to="/" aria-label="GotIt home">
          <Logo />
        </Link>
        <nav aria-label="Legal policies">
          <Link className={kind === "terms" ? "active" : ""} to="/terms-of-service">Terms</Link>
          <Link className={kind === "privacy" ? "active" : ""} to="/privacy-policy">Privacy</Link>
          <Link className={kind === "refund" ? "active" : ""} to="/refund-policy">Refunds</Link>
        </nav>
      </header>
      <main className="legal-document">
        <p className="eyebrow">GotIt legal</p>
        <h1>{title}</h1>
        <p className="legal-effective">Effective date: {EFFECTIVE_DATE}</p>
        <Content />
      </main>
      <footer className="legal-footer">
        <span>© 2026 GotIt · Operated by Ori Arbes</span>
        <ContactLink />
      </footer>
    </div>
  );
}
