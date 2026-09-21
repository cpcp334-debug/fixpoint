"use client";

import dynamic from "next/dynamic";

const HeaderMobile = dynamic(
  () => import("@/components/layout/HeaderMobile").then((m) => ({ default: m.HeaderMobile })),
  {
    ssr: false,
    loading: () => <div className="ms-auto h-11 w-28 shrink-0 lg:hidden" aria-hidden />,
  },
);

type Props = {
  locale: string;
  links: Array<{ href: string; label: string }>;
  aiHref: string;
  aiLabel: string;
  quoteLabel: string;
  showAi: boolean;
  showQuote: boolean;
  menuLabel: string;
  closeLabel: string;
  whatsappLabel: string;
  callLabel: string;
};

/** Client wrapper so Server Header can keep mobile menu off SSR (Next 16). */
export function DeferredHeaderMobile(props: Props) {
  return <HeaderMobile {...props} />;
}
