import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/app/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `The terms that apply when you use ${site.name}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service">
      <p>
        These terms apply when you use {site.name} to issue, print or verify event tickets. By signing in, you agree to
        them. If you do not agree, do not use the service.
      </p>

      <h2>Accounts and access</h2>
      <ul>
        <li>You sign in with a Google account. You are responsible for activity on your account.</li>
        <li>
          New accounts have no access until an admin grants a role. Admins and event organizers decide what you can see
          and do, and can change or remove your access at any time.
        </li>
        <li>Do not share your account or try to reach events, screens or data your role does not allow.</li>
      </ul>

      <h2>Organizers</h2>
      <ul>
        <li>You are responsible for your events: the details you enter, the tickets you issue and how you sell them.</li>
        <li>
          {site.name} does not sell tickets or take payments. Prices printed on tickets are for your records, and any
          sale is between you and your guests.
        </li>
        <li>You are responsible for refunds, cancellations and any obligations to your guests.</li>
        <li>Keep ticket codes and printed sheets secure. Anyone holding a valid code can be admitted once.</li>
      </ul>

      <h2>Scanners</h2>
      <ul>
        <li>Use the scanner only at events you are assigned to.</li>
        <li>
          Scanning works offline. If two devices admit the same ticket before syncing, the first scan to reach our
          servers counts and the other is recorded as already used.
        </li>
      </ul>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use {site.name} for unlawful events or to issue counterfeit or misleading tickets;</li>
        <li>attempt to guess ticket codes, bypass access controls or disrupt the service;</li>
        <li>copy other people&apos;s information out of the service for unrelated purposes.</li>
      </ul>

      <h2>Your data</h2>
      <p>
        You keep ownership of the event data you enter. You allow us to store and process it to run the service, as
        described in our <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>Availability</h2>
      <p>
        We aim to keep {site.name} running but do not guarantee it will be uninterrupted or error-free. Keep a backup
        plan for the door, such as a printed list or a spare device, in case a device fails.
      </p>

      <h2>Disclaimer and liability</h2>
      <p>
        {site.name} is provided &ldquo;as is&rdquo;, without warranties of any kind. To the extent the law allows, we are
        not liable for lost revenue, denied or wrongful admissions, or other indirect losses arising from your use of
        the service.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop using {site.name} at any time and ask us to delete your account. We may suspend or remove accounts
        that break these terms.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. We will change the date at the top of this page, and continued use after an update
        means you accept it.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>
    </LegalPage>
  );
}
