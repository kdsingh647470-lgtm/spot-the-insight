import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Shield, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Spot the Difference AI" },
      { name: "description", content: "How Spot the Difference AI collects, uses, and protects your data, including accounts, gameplay stats, cookies, and advertising." },
      { property: "og:title", content: "Privacy Policy — Spot the Difference AI" },
      { property: "og:description", content: "How Spot the Difference AI handles your data, cookies, and advertising." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://spot-the-insight.lovable.app/privacy" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://spot-the-insight.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to game
        </Link>

        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-black">Privacy Policy</h1>
          </div>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="mt-6 space-y-5 text-sm leading-relaxed text-foreground">
            <section>
              <h2 className="font-bold">1. Who we are</h2>
              <p className="mt-1 text-muted-foreground">
                Spot the Difference AI is a free-to-play puzzle game operated by Nesake. This policy explains what
                information the game collects and how it is used.
              </p>
            </section>

            <section>
              <h2 className="font-bold">2. Information we collect</h2>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                <li><strong>Account data:</strong> your email address and display name if you create an account.</li>
                <li><strong>Gameplay data:</strong> levels completed, times, stars, coins, XP, streaks, and achievements.</li>
                <li><strong>Device data:</strong> local settings such as theme, sound, and touch calibration, stored on your device.</li>
                <li><strong>Technical data:</strong> basic log and error information used to keep the game working.</li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                You can play as a guest without an account; guest progress is stored only in your browser.
              </p>
            </section>

            <section>
              <h2 className="font-bold">3. How we use your information</h2>
              <p className="mt-1 text-muted-foreground">
                To save your progress, run leaderboards and achievements, deliver daily challenges and rewards,
                secure the service against abuse, and improve the game.
              </p>
            </section>

            <section>
              <h2 className="font-bold">4. Cookies and local storage</h2>
              <p className="mt-1 text-muted-foreground">
                We use cookies and browser storage to keep you signed in and to remember your preferences and offline
                progress. Blocking them may prevent progress from being saved.
              </p>
            </section>

            <section>
              <h2 className="font-bold">5. Advertising</h2>
              <p className="mt-1 text-muted-foreground">
                The game may display ads served by Google AdSense. Google and its partners may use cookies or device
                identifiers to serve ads based on your prior visits to this or other websites. You can manage
                personalised advertising in your{" "}
                <a
                  href="https://myadcenter.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  Google Ad Settings
                </a>{" "}
                or opt out at{" "}
                <a
                  href="https://www.aboutads.info/choices/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  aboutads.info
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="font-bold">6. Sharing</h2>
              <p className="mt-1 text-muted-foreground">
                We do not sell your personal data. Information is shared only with service providers that host the
                game, store data, authenticate accounts, and serve ads, and where required by law. Public leaderboards
                show your display name, avatar, level, and score.
              </p>
            </section>

            <section>
              <h2 className="font-bold">7. Data retention and your rights</h2>
              <p className="mt-1 text-muted-foreground">
                We keep account and progress data while your account is active. You may request access, correction, or
                deletion of your data at any time via the{" "}
                <Link to="/contact" className="font-semibold text-primary hover:underline">
                  Contact page
                </Link>
                . Deleting your account removes your profile, progress, and leaderboard entries.
              </p>
            </section>

            <section>
              <h2 className="font-bold">8. Children</h2>
              <p className="mt-1 text-muted-foreground">
                The game is suitable for general audiences but is not directed at children under 13, and we do not
                knowingly collect personal information from them.
              </p>
            </section>

            <section>
              <h2 className="font-bold">9. Changes</h2>
              <p className="mt-1 text-muted-foreground">
                We may update this policy from time to time. Material changes will be reflected by the date at the top
                of this page.
              </p>
            </section>

            <section>
              <h2 className="font-bold">10. Contact</h2>
              <p className="mt-1 text-muted-foreground">
                Questions about privacy? Reach us through the{" "}
                <Link to="/contact" className="font-semibold text-primary hover:underline">
                  Contact page
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
