import raw from "@/data/photos.json";

/** Freely licensed Wikimedia Commons photos (resized/cropped for the web), with credits. */
export type Photo = { title: string; artist: string; licence: string; licence_url: string; page: string };
export const PHOTOS = raw as Record<string, Photo>;
export const photoSrc = (slug: string) => (PHOTOS[slug] ? `/photos/${slug}.jpg` : null);
