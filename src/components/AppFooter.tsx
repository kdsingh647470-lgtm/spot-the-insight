import { Link } from "@tanstack/react-router";
import { Gamepad2, ArrowLeft, Mail, FileText, Shield } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="border-t border-border bg-card px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:justify-between">
          {/* Branding */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <a
              href="https://nesake.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-bold text-lg text-foreground"
            >
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
                <Gamepad2 className="h-5 w-5" />
              </span>
              <span>A Nesake Game</span>
            </a>
            <p className="mt-2 max-w-xs text-xs text-muted-foreground">
              Crafted with care by Nesake. Play more games and explore our world of relaxing puzzles.
            </p>
          </div>

          {/* Links */}
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium text-muted-foreground"
          >
            <a
              href="https://nesake.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition hover:text-foreground"
            >
              <Shield className="h-4 w-4" /> Privacy Policy
            </a>
            <Link
              to="/terms"
              className="inline-flex items-center gap-1.5 transition hover:text-foreground"
            >
              <FileText className="h-4 w-4" /> Terms & Conditions
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-1.5 transition hover:text-foreground"
            >
              <Mail className="h-4 w-4" /> Contact
            </Link>
          </nav>
        </div>

        {/* Back to Nesake */}
        <div className="mt-8 flex justify-center border-t border-border pt-6 md:justify-start">
          <a
            href="https://nesake.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Nesake
          </a>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground md:text-left">
          © {new Date().getFullYear()} Nesake. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
