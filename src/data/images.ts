/**
 * How photos are encoded. AVIF is about 40% smaller than WebP at the same look (AVIF quality 50 looks like WebP 70–80);
 * browsers without AVIF (older Safari) get WebP. `<Picture>` uses one quality for both formats.
 */
export const PHOTO_FORMATS = ['avif', 'webp'] as const;
export const PHOTO_QUALITY = 50;
