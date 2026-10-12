import type { Metadata } from "next";
import { LegalPage } from "@/components/app/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${site.name} collects, uses and protects your information.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        {site.name} is a tool for issuing, printing and verifying event tickets. This policy explains what information
        we collect when you use it, why, and the choices you have.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Your Google account details.</strong> When you sign in with Google we receive your name, email address
          and profile picture. We do not receive your Google password or access to anything else in your Google account.
        </li>
        <li>
          <strong>Your role and assignments.</strong> Whether you are an admin, organizer or ticket scanner, which events
          you can manage, and which entrance you scan at.
        </li>
        <li>
          <strong>Event data you enter.</strong> Event names, venues, dates, entrances and their directions, ticket batch
          labels and prices.
        </li>
        <li>
          <strong>Scan records.</strong> Each time a ticket is scanned we record the ticket code, the result, the time,
          the entrance and the name of the scanner who checked it.
        </li>
      </ul>
      <p>
        <strong>Ticket holders.</strong> Tickets are anonymous. A ticket carries only event details and a random code,
        so we do not collect personal information about guests.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To sign you in and show you only the events and screens your role allows.</li>
        <li>To let organizers add you to an event by searching for your name or email.</li>
        <li>To generate tickets, verify them at the door and stop a ticket from being used twice.</li>
        <li>To show organizers attendance figures and the scan activity for their events.</li>
      </ul>
      <p>We do not sell your information, use it for advertising, or share it with anyone except the providers below.</p>

      <h2>Who can see your information</h2>
      <ul>
        <li>Admins can see everyone who has signed up, with their name, email and role.</li>
        <li>
          Organizers can find signed-up people by name or email when adding scanners or organizers, and can see who
          scanned each ticket at their events.
        </li>
        <li>Scanners see only the tickets and scans for the events they are assigned to.</li>
      </ul>

      <h2>Service providers</h2>
      <p>We rely on these providers to run {site.name}. Each processes data only to provide its service to us:</p>
      <ul>
        <li><strong>Google</strong>: sign-in.</li>
        <li><strong>Neon</strong>: database hosting and account management.</li>
        <li><strong>PowerSync</strong>: syncing event data to your device so scanning works offline.</li>
        <li><strong>Vercel</strong>: hosting the website.</li>
      </ul>

      <h2>Cookies and data on your device</h2>
      <ul>
        <li>We use cookies only to keep you signed in. We use no advertising or analytics cookies.</li>
        <li>
          To scan offline, your browser keeps a local copy of the events, tickets and scans you have access to. It also
          remembers your last scanning station and your light or dark theme.
        </li>
        <li>Signing out ends your session. Clearing your browser&apos;s site data removes the local copy.</li>
      </ul>

      <h2>Retention</h2>
      <p>
        We keep your account and the event data you are part of for as long as your account is active. When an event is
        deleted, its entrances, tickets and scan records are deleted with it.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us for a copy of your information, ask us to correct it, or ask us to delete your account by
        emailing <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>. You can also remove {site.name}&apos;s
        access from your Google account settings at any time.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit, and every action is checked against your role on our servers. No system is
        perfectly secure, but we work to protect your information.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy we will update the date at the top of this page. Significant changes will be
        announced in the app.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>
    </LegalPage>
  );
}
