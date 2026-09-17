import { publishedServingLocationSlugs } from "@/lib/catalog";
import { getEmirateDirectory, getHomeLocationGroups, type DirectoryPlace } from "@/lib/locations/emirate-directory";

export async function publishedHomeLocationGroups(locale: string) {
  const publicSlugs = await publishedServingLocationSlugs();
  return getHomeLocationGroups(locale)
    .map((group) => {
      const places = group.places.filter((place) => publicSlugs.has(place.slug));
      return { ...group, places, count: places.length };
    })
    .filter((group) => publicSlugs.has(group.slug) || group.places.length > 0);
}

export async function publishedEmirateDirectory(emirateSlug: string, locale: string) {
  const publicSlugs = await publishedServingLocationSlugs();
  const directory = getEmirateDirectory(emirateSlug, locale);
  const cities = directory.cities.filter((place) => publicSlugs.has(place.slug));
  const areas = directory.areas.filter((place) => publicSlugs.has(place.slug));
  return { cities, areas, total: cities.length + areas.length };
}

export type { DirectoryPlace };
