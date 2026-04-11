"use client";

// ============================================================
// Client-Filter-Komponente fuer die Conversations-List-View.
//
// Drei Tabs (Alle / WhatsApp / Web-Widget) die den Channel-
// Filter als URL-Query-Parameter setzen. Deeplink-faehig: jeder
// Zustand ist per URL teilbar und der Browser-Back-Button
// funktioniert natuerlich.
//
// Die eigentliche Daten-Abfrage erfolgt im Server-Component-
// Parent (page.tsx), der searchParams liest und Prisma direkt
// aufruft. Dieser Filter triggert nur einen Router-Push, Next.js
// rendert den Server-Component neu.
// ============================================================

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { MessageSquare, Phone, Globe, Loader2 } from "lucide-react";

type ChannelFilter = "WHATSAPP" | "WEB" | undefined;

interface Props {
  currentChannel: ChannelFilter;
}

export default function ConversationsFilter({ currentChannel }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setChannel(channel: ChannelFilter) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (channel) {
      params.set("channel", channel);
    } else {
      params.delete("channel");
    }
    // Bei Filter-Aenderung Paginierung zuruecksetzen
    params.delete("page");

    const query = params.toString();
    const target = query ? `${pathname}?${query}` : pathname;

    startTransition(() => {
      router.push(target);
    });
  }

  const tabs: Array<{ id: ChannelFilter; label: string; Icon: typeof MessageSquare }> = [
    { id: undefined, label: "Alle", Icon: MessageSquare },
    { id: "WHATSAPP", label: "WhatsApp", Icon: Phone },
    { id: "WEB", label: "Web-Widget", Icon: Globe },
  ];

  return (
    <div className="mb-6 flex items-center gap-1 border-b border-white/[0.06]">
      {tabs.map((tab) => {
        const active = currentChannel === tab.id;
        const { Icon } = tab;
        return (
          <button
            key={tab.label}
            onClick={() => setChannel(tab.id)}
            disabled={isPending}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors disabled:opacity-60 ${
              active
                ? "border-[#c9a84c] text-[#c9a84c]"
                : "border-transparent text-slate-500 hover:text-[#ede8df]/80"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
            {active && isPending && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
          </button>
        );
      })}
    </div>
  );
}
