// ============================================================
// /test/[slug] – Oeffentliche Web-Demo des KI-Bots
// Server-Component: Tenant per Slug laden, Client rendern
// ============================================================

import { notFound } from "next/navigation";
import { db } from "@/shared/db";
import WebTestClient from "./WebTestClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TestPage({ params }: PageProps) {
  const { slug } = await params;

  const tenant = await db.tenant.findUnique({
    where: { slug, isActive: true },
    select: { id: true, brandName: true, name: true },
  });

  if (!tenant) {
    notFound();
  }

  return (
    <WebTestClient
      tenantId={tenant.id}
      tenantName={tenant.brandName || tenant.name}
    />
  );
}
