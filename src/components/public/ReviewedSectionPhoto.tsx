import Image from "next/image";
import { pagePhoto } from "@/lib/catalog/page-photos";
import { editorialImageAlt, safeLocalImage } from "@/lib/catalog/editorial-images";

/** A reviewed overview cover adds no heading, copy or placeholder when unassigned. */
export function ReviewedSectionPhoto({ section, locale, title }: { section: "blog" | "diy" | "services" | "locations"; locale: string; title: string }) {
  const image = safeLocalImage(pagePhoto("section", section));
  if (!image) return null;
  return (
    <figure className="mx-auto my-6 w-full max-w-6xl overflow-hidden rounded-2xl border border-line" data-section-cover={section}>
      <Image src={image} alt={editorialImageAlt(image, locale, title)} width={1440} height={960} sizes="(max-width: 1200px) 100vw, 1152px" className="aspect-[16/7] w-full object-cover" />
      <figcaption data-image-kind="illustration" className="bg-white px-4 py-2 text-xs text-muted">{locale === "ar" ? "صورة توضيحية" : "Illustrative image"}</figcaption>
    </figure>
  );
}
