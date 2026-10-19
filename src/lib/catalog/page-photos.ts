/** Individually generated and reviewed photo-style covers. Each entry belongs to one logical page. */
export const PAGE_PHOTOS: Record<string,string> = {
 'service:commercial-electrical-inspection':'/media/editorial/photos-20261019/service-commercial.webp',
 'service:office-electrical-maintenance':'/media/editorial/photos-20261019/service-office.webp',
 'service:shop-electrical-maintenance':'/media/editorial/photos-20261019/service-shop.webp',
 'service:distribution-board-inspection':'/media/editorial/photos-20261019/service-board.webp',
 'service:frequent-breaker-tripping-diagnosis':'/media/editorial/photos-20261019/service-breaker.webp',
 'service:electrical-load-inspection':'/media/editorial/photos-20261019/service-load.webp',
 'location:business-bay-dubai':'/media/editorial/photos-20261019/location-business-bay.webp',
 'location:al-quoz':'/media/editorial/photos-20261019/location-al-quoz.webp',
 'location:dubai':'/media/editorial/photos-20261019/location-dubai.webp',
};
export function pagePhoto(kind:'service'|'location',slug:string):string|null{return PAGE_PHOTOS[`${kind}:${slug}`]||null;}
