import type { Metadata } from "next";
import LandingPage from "./page-v2";

export const metadata: Metadata = {
  title: "AI Conversion | Das Revenue Operating System für DACH-Unternehmen",
  description:
    "Von der ersten WhatsApp-Nachricht bis zum gewonnenen Kunden – vollautomatisch. Sales Agent, CRM Pipeline, Marketing Suite und Client Portal in einer Plattform.",
  alternates: {
    canonical: "https://ai-conversion.ai",
  },
};

export default function Page() {
  return <LandingPage />;
}
