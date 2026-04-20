import { readFileSync } from "fs";
import { join } from "path";
import { remark } from "remark";
import html from "remark-html";
import Navigation from "@/components/Navigation";
import Link from "next/link";

export const metadata = {
  title: "AGB | AI Conversion",
  description:
    "Allgemeine Geschäftsbedingungen von AI Conversion für die Nutzung der KI-Vertriebsplattform.",
};

export default async function AgbPage() {
  const content = readFileSync(
    join(process.cwd(), "content/legal/agb.md"),
    "utf-8",
  );

  const htmlContent = (await remark().use(html).process(content)).toString();

  return (
    <div className="min-h-screen bg-[#07070d]">
      <Navigation />
      <article
        className="prose prose-invert prose-slate mx-auto max-w-4xl px-6 pt-36 pb-20 sm:pt-40"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      <footer className="border-t border-white/[0.04] py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-6 px-6 text-xs text-slate-600">
          <Link href="/impressum" className="hover:text-slate-400 transition-colors">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-slate-400 transition-colors">Datenschutz</Link>
          <Link href="/widerrufsbelehrung" className="hover:text-slate-400 transition-colors">Widerruf</Link>
          <Link href="/" className="hover:text-slate-400 transition-colors">Startseite</Link>
        </div>
      </footer>
    </div>
  );
}
