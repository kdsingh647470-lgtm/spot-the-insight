import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Mail, ArrowLeft, MessageCircle, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Spot the Difference AI" },
      { name: "description", content: "Get in touch with the Spot the Difference AI team." },
      { property: "og:title", content: "Contact — Spot the Difference AI" },
      { property: "og:description", content: "Contact the team behind Spot the Difference AI." },
      { property: "og:url", content: "https://spot-the-insight.lovable.app/contact" },
    ],
    links: [{ rel: "canonical", href: "https://spot-the-insight.lovable.app/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
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
            <Mail className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-black">Contact</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Have a question, bug report, or feature idea? We'd love to hear from you.
          </p>

          <div className="mt-6 space-y-4">
            <a
              href="mailto:support@nesake.com"
              className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4 transition hover:bg-muted"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                <MessageCircle className="h-6 w-6" />
              </span>
              <span>
                <span className="block font-bold">Email us</span>
                <span className="block text-sm text-muted-foreground">support@nesake.com</span>
              </span>
            </a>

            <a
              href="https://nesake.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4 transition hover:bg-muted"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
                <HelpCircle className="h-6 w-6" />
              </span>
              <span>
                <span className="block font-bold">Visit Nesake</span>
                <span className="block text-sm text-muted-foreground">nesake.com</span>
              </span>
            </a>
          </div>

          <div className="mt-6 rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
            <p>
              For press, partnerships, or business inquiries, please reach out through{" "}
              <a href="https://nesake.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                nesake.com
              </a>
              .
            </p>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
