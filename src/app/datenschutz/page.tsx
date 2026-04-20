import { readFileSync } from "fs";
import { join } from "path";
import { remark } from "remark";
import html from "remark-html";
import Navigation from "@/components/Navigation";
import Link from "next/link";

export const metadata = {
  title: "Datenschutzerklärung | AI Conversion",
  description:
    "Datenschutzerklärung von AI Conversion — Informationen zur Verarbeitung personenbezogener Daten.",
};

export default async function DatenschutzPage() {
  const mainContent = readFileSync(
    join(process.cwd(), "content/legal/datenschutz.md"),
    "utf-8",
  );
  const ergaenzung = readFileSync(
    join(process.cwd(), "content/legal/datenschutz-ergaenzung.md"),
    "utf-8",
  );

  const mainHtml = (await remark().use(html).process(mainContent)).toString();
  const ergaenzungHtml = (
    await remark().use(html).process(ergaenzung)
  ).toString();

  return (
    <div className="min-h-screen bg-[#07070d]">
      <Navigation />
      <article className="prose prose-invert prose-slate mx-auto max-w-4xl px-6 pt-36 pb-20 sm:pt-40">
        <div dangerouslySetInnerHTML={{ __html: mainHtml }} />
        <hr className="my-12 border-slate-700" />
        <div dangerouslySetInnerHTML={{ __html: ergaenzungHtml }} />
      </article>
      <footer className="border-t border-white/[0.04] py-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-6 px-6 text-xs text-slate-600">
          <Link href="/impressum" className="hover:text-slate-400 transition-colors">Impressum</Link>
          <Link href="/agb" className="hover:text-slate-400 transition-colors">AGB</Link>
          <Link href="/widerrufsbelehrung" className="hover:text-slate-400 transition-colors">Widerruf</Link>
          <Link href="/" className="hover:text-slate-400 transition-colors">Startseite</Link>
        </div>
      </footer>
    </div>
  );
}
