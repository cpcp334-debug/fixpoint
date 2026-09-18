/**
 * Approved navigation tree — 18 parents + 436 children.
 * Category-only hubs have no parent Service row; children link directly.
 * Child `slug` is always the Latin master slug; build locale hrefs with serviceHref().
 */
import {
  APPROVED_CATEGORIES,
  APPROVED_CHILDREN,
  ACTIVE_CATEGORY_ANCHORS,
  DRAFT_CATEGORY_ANCHORS,
  REVIEW_REQUIRED,
  childSlug,
  type ApprovedCategorySeed,
} from "../../../prisma/data/catalog-a1";
import { toMasterServiceSlug, toPublicServiceSlug } from "@/lib/slug/service-slug-map";
import { serviceHref } from "@/lib/slug/locale-slug";

const CATEGORY_ONLY_HUBS = new Set([
  "refrigerator",
  "microwave",
  "washing-machine",
  "water-heater",
  "dishwasher",
  "oven",
  "burner-cooker",
]);

/** MSA display names when catalog nameAr is REVIEW_REQUIRED (never use English). */
const CATEGORY_AR_MSA: Record<string, string> = {
  "swimming-pool": "تنظيف وصيانة المسابح",
  sauna: "تنظيف وصيانة غرف الساونا",
  "water-tank": "تنظيف وصيانة خزانات المياه",
  refrigerator: "صيانة وإصلاح الثلاجات",
  microwave: "صيانة وإصلاح الميكروويف",
  "washing-machine": "صيانة وإصلاح الغسالات",
  "water-heater": "صيانة وإصلاح سخانات المياه",
  dishwasher: "صيانة وإصلاح غسالات الصحون",
  gym: "تنظيف وصيانة الصالات الرياضية",
  oven: "صيانة وإصلاح الأفران",
  "burner-cooker": "صيانة وإصلاح المواقد والطباخات",
};

export type NavChild = {
  slug: string;
  nameEn: string;
  categorySlug: string;
  sortOrder: number;
  href: string;
};

export type NavCategory = {
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  childCount: number;
  children: NavChild[];
  href: string;
  isCategoryOnlyHub: boolean;
  /** Optional existing service-page anchor (e.g. cleaning-services). */
  anchorSlug: string | null;
};

const DESCRIPTION_AR: Record<string, string> = {
  cleaning: "خدمات تنظيف المباني والوحدات السكنية والتجارية داخل الإمارات.",
  "general-maintenance": "صيانة عامة وإصلاحات للمباني السكنية والتجارية.",
  plumbing: "معالجة التسريبات والصرف والتجهيزات الصحية.",
  electrical: "فحص وتشخيص وإصلاح للمقابس والإنارة والتمديدات ولوحات التوزيع والتأريض وأعطال كهرباء المباني. ذكر الخدمة لا يعني التغطية. أعمال الكهرباء الحية ليست دليلاً منزلياً.",
  ac: "صيانة وتشخيص وخدمة أجهزة التكييف.",
  painting: "خدمات الدهان الداخلي وما يرتبط بها.",
  walls: "إصلاح الجبس والتشققات وأسطح الجدران.",
  "swimming-pool": "تنظيف المسابح والعناية بالمياه والمعدات.",
  sauna: "تنظيف وصيانة غرف الساونا والمعدات.",
  "water-tank": "فحص وتنظيف وإصلاح خزانات المياه.",
  refrigerator: "تشخيص وإصلاح الثلاجات عبر الخدمات الفرعية المعتمدة.",
  microwave: "تشخيص وإصلاح الميكروويف عبر الخدمات الفرعية المعتمدة.",
  "washing-machine": "تشخيص وإصلاح الغسالات عبر الخدمات الفرعية المعتمدة.",
  "water-heater": "تشخيص وإصلاح سخانات المياه عبر الخدمات الفرعية المعتمدة.",
  dishwasher: "تشخيص وإصلاح غسالات الصحون عبر الخدمات الفرعية المعتمدة.",
  gym: "تنظيف الصالات الرياضية وصيانة معدات اللياقة.",
  oven: "تشخيص وإصلاح الأفران عبر الخدمات الفرعية المعتمدة.",
  "burner-cooker": "صيانة مواقد الغاز والكهرباء عبر الخدمات الفرعية المعتمدة.",
};

function categoryNameAr(cat: ApprovedCategorySeed): string {
  if (cat.nameAr && cat.nameAr !== REVIEW_REQUIRED) return cat.nameAr;
  const mapped = CATEGORY_AR_MSA[cat.slug];
  if (mapped) return mapped;
  return "خدمة معتمدة"; // never English fallback
}

function anchorForCategory(categorySlug: string): string | null {
  const active = ACTIVE_CATEGORY_ANCHORS.find((a) => a.categorySlug === categorySlug);
  if (active) return active.slug;
  const draft = DRAFT_CATEGORY_ANCHORS.find((a) => a.categorySlug === categorySlug);
  return draft?.slug ?? null;
}

export function buildApprovedNavTree(): NavCategory[] {
  return APPROVED_CATEGORIES.map((cat) => {
    const kids = APPROVED_CHILDREN.filter((c) => c.categorySlug === cat.slug)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => {
        const slug = childSlug(c);
        return {
          slug,
          nameEn: c.nameEn,
          categorySlug: c.categorySlug,
          sortOrder: c.sortOrder,
          /** Default href uses Latin; callers should prefer serviceHref(locale, slug). */
          href: `/${slug}`,
        } satisfies NavChild;
      });
    return {
      slug: cat.slug,
      nameEn: cat.nameEn,
      nameAr: categoryNameAr(cat),
      descriptionEn: cat.descriptionEn,
      descriptionAr: DESCRIPTION_AR[cat.slug] || cat.descriptionEn,
      childCount: kids.length,
      children: kids,
      href: `/services/${cat.slug}`,
      isCategoryOnlyHub: CATEGORY_ONLY_HUBS.has(cat.slug),
      anchorSlug: anchorForCategory(cat.slug),
    } satisfies NavCategory;
  });
}

/** Visitor grids: Electrical first, Cleaning last. Catalog sortOrder is unchanged. */
export function buildVisitorNavTree(): NavCategory[] {
  return buildApprovedNavTree().slice().sort((a, b) => visitorRank(a.slug) - visitorRank(b.slug));
}

function visitorRank(slug: string) {
  if (slug === "electrical") return 0;
  if (slug === "cleaning") return 1000;
  return 10;
}

export function getNavCategory(slug: string): NavCategory | undefined {
  return buildApprovedNavTree().find((c) => c.slug === slug);
}

export function getNavCategoryLocalized(cat: NavCategory, locale: string) {
  const isAr = locale === "ar";
  return {
    name: isAr ? cat.nameAr : cat.nameEn,
    description: isAr ? cat.descriptionAr : cat.descriptionEn,
    exploreLabel: isAr ? `استكشف ${cat.nameAr}` : `Explore ${cat.nameEn}`,
    childCountLabel: isAr ? `${cat.childCount} خدمات` : `${cat.childCount} services`,
  };
}

/** All approved child + anchor slugs that may resolve as public service pages (draft allowed, noindex). */
export function approvedPublicServiceSlugs(): Set<string> {
  const set = new Set<string>();
  for (const c of APPROVED_CHILDREN) {
    const master = childSlug(c);
    set.add(master);
    set.add(toPublicServiceSlug(master));
  }
  for (const a of ACTIVE_CATEGORY_ANCHORS) {
    set.add(a.slug);
    set.add(toPublicServiceSlug(a.slug));
  }
  for (const a of DRAFT_CATEGORY_ANCHORS) {
    set.add(a.slug);
    set.add(toPublicServiceSlug(a.slug));
  }
  return set;
}

export function isApprovedPublicServiceSlug(slug: string): boolean {
  if (approvedPublicServiceSlugs().has(slug)) return true;
  return approvedPublicServiceSlugs().has(toMasterServiceSlug(slug));
}

/** Locale-aware child link for approved nav. */
export function navChildHref(locale: string, childSlugValue: string) {
  return serviceHref(locale, childSlugValue);
}

export function assertNavTreeIntegrity(): {
  parents: number;
  children: number;
  offerings: number;
  hubs: number;
  brokenParentLinks: string[];
} {
  const tree = buildApprovedNavTree();
  const parents = tree.length;
  const children = tree.reduce((n, c) => n + c.childCount, 0);
  const brokenParentLinks: string[] = [];
  for (const child of APPROVED_CHILDREN) {
    if (!APPROVED_CATEGORIES.some((p) => p.slug === child.categorySlug)) {
      brokenParentLinks.push(childSlug(child));
    }
  }
  return {
    parents,
    children,
    offerings: parents + children,
    hubs: [...CATEGORY_ONLY_HUBS].length,
    brokenParentLinks,
  };
}
