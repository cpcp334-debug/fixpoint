"use client";

import { useState } from "react";
import { ServiceCard } from "@/components/home/Cards";

const INITIAL_VISIBLE = 4;

type Item = {
  slug: string;
  name: string;
  description: string;
  benefit?: string;
  diyLabel?: string;
  amcLabel?: string;
  emergencyLabel?: string;
};

export function HelpServices({
  items,
  cta,
  moreLabel,
  lessLabel,
}: {
  items: Item[];
  cta: string;
  moreLabel: string;
  lessLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const visible = open ? items : items.slice(0, INITIAL_VISIBLE);
  const hidden = Math.max(0, items.length - INITIAL_VISIBLE);

  return (
    <>
      <ul className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {visible.map((service) => (
          <li key={service.slug}>
            <ServiceCard
              slug={service.slug}
              name={service.name}
              description={service.description}
              benefit={service.benefit}
              cta={cta}
              diyLabel={service.diyLabel}
              amcLabel={service.amcLabel}
              emergencyLabel={service.emergencyLabel}
              compact
            />
          </li>
        ))}
      </ul>
      {hidden ? (
        <button
          type="button"
          className="mt-3 text-sm font-medium text-accent hover:underline"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? lessLabel : moreLabel}
        </button>
      ) : null}
    </>
  );
}
