export type GalleryCategory = 'house' | 'lake' | 'animals' | 'out';

export interface GalleryPhoto {
  /** Also the photo's filename in src/assets/gallery (e.g. lake-dawn.jpg). */
  id: string;
  category: GalleryCategory;
  /** Placeholder colour until the real photo is added. */
  tone: 'lake-mist' | 'fern' | 'oat' | 'tussock' | 'lake-tint' | 'river' | 'schist';
  /** Spans two columns (use for a hero photo). */
  wide?: boolean;
}

export const photos: GalleryPhoto[] = [
  { id: 'lake-dawn', category: 'lake', tone: 'lake-mist', wide: true },
  { id: 'house-garden', category: 'house', tone: 'fern' },
  { id: 'living-room', category: 'house', tone: 'oat' },
  { id: 'dexter', category: 'animals', tone: 'tussock' },
  { id: 'main-bedroom', category: 'house', tone: 'lake-tint' },
  { id: 'deck', category: 'house', tone: 'schist' },
  { id: 'chickens', category: 'animals', tone: 'tussock' },
  { id: 'ducks', category: 'animals', tone: 'river' },
  { id: 'kitchen', category: 'house', tone: 'oat' },
  { id: 'lake-winter', category: 'lake', tone: 'lake-tint' },
  { id: 'garden', category: 'house', tone: 'fern' },
  { id: 'breast-hill', category: 'out', tone: 'lake-mist' },
];
