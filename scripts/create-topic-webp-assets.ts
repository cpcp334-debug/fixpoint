/**
 * Create curated topic/category WebP heroes under public/media (Option A).
 * Deterministic SVG → WebP via sharp. EN + AR label variants.
 * No fake local job photos.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

type Topic = { slug: string; labelEn: string; labelAr: string; hue: number; motif: string };

const TOPICS: Topic[] = [
  { slug: "plumbing", labelEn: "Plumbing maintenance", labelAr: "صيانة السباكة", hue: 205, motif: "faucet" },
  { slug: "ac", labelEn: "Air conditioning service", labelAr: "خدمة التكييف", hue: 195, motif: "ac" },
  { slug: "cleaning", labelEn: "Professional cleaning", labelAr: "تنظيف احترافي", hue: 160, motif: "clean" },
  { slug: "painting", labelEn: "Interior painting", labelAr: "دهان داخلي", hue: 25, motif: "paint" },
  { slug: "walls", labelEn: "Wall maintenance", labelAr: "صيانة الجدران", hue: 35, motif: "wall" },
  { slug: "electrical", labelEn: "Electrical maintenance", labelAr: "صيانة الكهرباء", hue: 45, motif: "socket" },
  { slug: "pool", labelEn: "Pool cleaning", labelAr: "تنظيف المسابح", hue: 190, motif: "pool" },
  { slug: "sauna", labelEn: "Sauna room care", labelAr: "العناية بغرف الساونا", hue: 15, motif: "sauna" },
  { slug: "appliance", labelEn: "Appliance care", labelAr: "العناية بالأجهزة", hue: 220, motif: "appliance" },
  { slug: "general", labelEn: "Building maintenance", labelAr: "صيانة المباني", hue: 210, motif: "building" },
];

function svgFor(topic: Topic, locale: "en" | "ar") {
  const bg = `hsl(${topic.hue} 32% 22%)`;
  const accent = `hsl(${topic.hue} 55% 48%)`;
  const light = `hsl(${topic.hue} 40% 88%)`;
  const label = locale === "ar" ? topic.labelAr : topic.labelEn;
  const brand =
    locale === "ar" ? "النجاح الدائم · صيانة المباني" : "Al Najah Al Daem · Building maintenance";
  const note =
    locale === "ar" ? "صورة تعليمية · ليست صورة عمل مسرّحة" : "Educational visual · Not a staged job photo";
  const dir = locale === "ar" ? "rtl" : "ltr";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900" direction="${dir}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="hsl(${topic.hue} 28% 14%)"/>
    </linearGradient>
  </defs>
  <rect width="1400" height="900" fill="url(#g)"/>
  <circle cx="1100" cy="220" r="180" fill="${accent}" opacity="0.25"/>
  <circle cx="280" cy="700" r="220" fill="${light}" opacity="0.08"/>
  <rect x="120" y="160" width="720" height="520" rx="28" fill="rgba(255,255,255,0.06)" stroke="${light}" stroke-opacity="0.25"/>
  <text x="160" y="260" fill="${light}" font-family="Segoe UI, Tahoma, sans-serif" font-size="54" font-weight="600">${label}</text>
  <text x="160" y="330" fill="${light}" opacity="0.75" font-family="Segoe UI, Tahoma, sans-serif" font-size="28">${brand}</text>
  <text x="160" y="420" fill="${accent}" font-family="Segoe UI, Tahoma, sans-serif" font-size="22">${note}</text>
  <g transform="translate(980 420)" fill="none" stroke="${light}" stroke-width="10" stroke-linecap="round">
    ${
      topic.motif === "faucet"
        ? `<path d="M40 20h80v40H40z"/><path d="M80 60v90"/><path d="M55 150h50"/><circle cx="80" cy="20" r="18"/>`
        : topic.motif === "ac"
          ? `<rect x="10" y="30" width="160" height="90" rx="12"/><path d="M30 75h120"/><path d="M40 55h20M70 55h20"/>`
          : topic.motif === "paint"
            ? `<path d="M40 120l40-90h40l40 90z"/><rect x="55" y="120" width="70" height="30" rx="6"/>`
            : topic.motif === "socket"
              ? `<rect x="40" y="20" width="100" height="140" rx="14"/><circle cx="70" cy="70" r="10"/><circle cx="110" cy="70" r="10"/><rect x="75" y="110" width="30" height="20" rx="4"/>`
              : `<rect x="30" y="40" width="140" height="100" rx="16"/><path d="M50 90h100"/>`
    }
  </g>
</svg>`;
}

async function main() {
  const root = join(process.cwd(), "public", "media");
  const topicsDir = join(root, "topics");
  const categoriesDir = join(root, "categories");
  mkdirSync(topicsDir, { recursive: true });
  mkdirSync(categoriesDir, { recursive: true });

  const created: string[] = [];
  for (const topic of TOPICS) {
    for (const locale of ["en", "ar"] as const) {
      const svg = Buffer.from(svgFor(topic, locale));
      const fileName = locale === "ar" ? `${topic.slug}-ar.webp` : `${topic.slug}.webp`;
      const webpTopic = join(topicsDir, fileName);
      await sharp(svg).resize(1400, 900, { fit: "cover" }).webp({ quality: 82 }).toFile(webpTopic);
      created.push(`/media/topics/${fileName}`);
    }

    const catMap: Record<string, string> = {
      plumbing: "plumbing",
      ac: "ac",
      cleaning: "cleaning",
      painting: "painting",
      walls: "walls",
    };
    if (catMap[topic.slug]) {
      const svg = Buffer.from(svgFor(topic, "en"));
      const webpCat = join(categoriesDir, `${topic.slug}.webp`);
      await sharp(svg).resize(1400, 900, { fit: "cover" }).webp({ quality: 82 }).toFile(webpCat);
      created.push(`/media/categories/${topic.slug}.webp`);
    }
  }

  writeFileSync(
    join(process.cwd(), "docs/media-topic-assets.json"),
    JSON.stringify({ createdAt: new Date().toISOString(), created }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, count: created.length, created }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
