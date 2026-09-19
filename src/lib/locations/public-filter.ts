import { publishedServingLocationSlugs } from "@/lib/catalog";
import {
  getEmirateDirectory,
  getHomeLocationGroups,
  getPlacesUnderCity,
  type DirectoryPlace,
} from "@/lib/locations/emirate-directory";
import { toMasterLocationSlug } from "@/lib/slug/location-slug-map";

/** Directory/home cards use locale path slugs; DB publish set is always Latin master slugs. */
function isPublishedPlaceSlug(publicSlugs: Set<string>, pathOrMasterSlug: string) {
  if (publicSlugs.has(pathOrMasterSlug)) return true;
  const latin = toMasterLocationSlug(pathOrMasterSlug);
  return latin !== pathOrMasterSlug && publicSlugs.has(latin);
}

export async function publishedHomeLocationGroups(locale: string) {
  const publicSlugs = await publishedServingLocationSlugs();
  return getHomeLocationGroups(locale)
    .map((group) => {
      const places = group.places.filter((place) => isPublishedPlaceSlug(publicSlugs, place.slug));
      return { ...group, places, count: places.length };
    })
    .filter((group) => isPublishedPlaceSlug(publicSlugs, group.slug) || group.places.length > 0);
}

export async function publishedEmirateDirectory(emirateSlug: string, locale: string) {
  const publicSlugs = await publishedServingLocationSlugs();
  const directory = getEmirateDirectory(emirateSlug, locale);
  const cities = directory.cities.filter((place) => isPublishedPlaceSlug(publicSlugs, place.slug));
  const areas = directory.areas.filter((place) => isPublishedPlaceSlug(publicSlugs, place.slug));
  return { cities, areas, total: cities.length + areas.length };
}

export async function publishedPlacesUnderCity(citySlug: string, locale: string) {
  const publicSlugs = await publishedServingLocationSlugs();
  return getPlacesUnderCity(citySlug, locale).filter((place) => isPublishedPlaceSlug(publicSlugs, place.slug));
}

export type { DirectoryPlace };
