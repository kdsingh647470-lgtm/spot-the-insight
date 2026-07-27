import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { FileText, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Spot the Difference AI" },
      { name: "description", content: "Terms and conditions for playing Spot the Difference AI, a Nesake game." },
      { property: "og:title", content: "Terms & Conditions — Spot the Difference AI" },
      { property: "og:description", content: "Terms and conditions for playing Spot the Difference AI." },
      { property: "og:url", content: "https://spot-the-insight.lovable.app/terms" },
    ],
    links: [{ rel: "canonical", href: "https://spot-the-insight.lovable.app/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
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
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-black">Terms & Conditions</h1>
          </div>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <div className="mt-6 space-y-5 text-sm leading-relaxed text-foreground">
            <section>
              <h2 className="font-bold">1. Acceptance of Terms</h2>
              <p className="mt-1 text-muted-foreground">
                By accessing or playing Spot the Difference AI, you agree to be bound by these Terms & Conditions.
                If you do not agree, please do not use the game.
              </p>
            </section>

            <section>
              <h2 className="font-bold">2. Description of Service</h2>
              <p className="mt-1 text-muted-foreground">
                Spot the Difference AI is a free-to-play puzzle game operated by Nesake. The game offers
                AI-generated levels, daily challenges, leaderboards, achievements, and optional account features.
              </p>
            </section>

            <section>
              <h2 className="font-bold">3. Accounts</h2>
              <p className="mt-1 text-muted-foreground">
                You may play without an account. Creating an account allows you to save progress, earn coins and XP,
                unlock achievements, and appear on leaderboards. You are responsible for keeping your account
                credentials secure.
              </p>
            </section>

            <section>
              <h2 className="font-bold">4. In-Game Currency</h2>
              <p className="mt-1 text-muted-foreground">
                Coins, XP, stars, and other virtual items have no real-world monetary value and cannot be exchanged
                for cash. They are used solely within the game for progression, hints, and cosmetics.
              </p>
            </section>

            <section>
              <h2 className="font-bold">5. User Conduct</h2>
              <p className="mt-1 text-muted-foreground">
                Do not exploit bugs, use cheats, harass other players, or attempt to manipulate leaderboards.
                We reserve the right to suspend accounts that violate these rules.
              </p>
            </section>

            <section>
              <h2 className="font-bold">6. Intellectual Property</h2>
              <p className="mt-1 text-muted-foreground">
                All game content, including images, code, and design, is owned by Nesake or its licensors. You may not
                copy, modify, distribute, or reverse-engineer any part of the game without permission.
              </p>
            </section>

            <section>
              <h2 className="font-bold">7. Limitation of Liability</h2>
              <p className="mt-1 text-muted-foreground">
                Nesake provides the game "as is" without warranties of any kind. We are not liable for any damages
                arising from your use of the game.
              </p>
            </section>

            <section>
              <h2 className="font-bold">8. Changes to Terms</h2>
              <p className="mt-1 text-muted-foreground">
                We may update these terms at any time. Continued use of the game after changes constitutes acceptance
                of the revised terms.
              </p>
            </section>

            <section>
              <h2 className="font-bold">9. Contact</h2>
              <p className="mt-1 text-muted-foreground">
                For questions about these terms, please contact us through the{" "}
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
