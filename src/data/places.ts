// Place names, addresses and trail names are never translated.
export type TagKey =
  | 'lake' | 'outdoors' | 'rainyDay' | 'dinner' | 'takeOut' | 'cafe' | 'foodTruck' | 'summer'
  | 'bakery' | 'breakfast' | 'lunch' | 'taproom' | 'hike' | 'crossCountry' | 'enduro' | 'skiing';

/** Tag colour variant (see design-system/components/Tag). */
export const tagVariant: Record<TagKey, 'hike' | 'bike' | 'lake' | 'plain'> = {
  lake: 'lake', outdoors: 'hike', rainyDay: 'plain', dinner: 'bike', takeOut: 'plain', cafe: 'bike',
  foodTruck: 'bike', summer: 'plain', bakery: 'bike', breakfast: 'bike', lunch: 'bike', taproom: 'bike',
  hike: 'hike', crossCountry: 'bike', enduro: 'bike', skiing: 'lake',
};

export interface Place {
  id: string;
  name: string;
  address?: string;
  tags: TagKey[];
  /** The place's own website (or the page for it on a venue's site). */
  website?: string;
  /** A menu page, when the place has one. Shown as "Menu" instead of "Website". */
  menu?: string;
  /** What to search for in Google Maps when it differs from "name, address". */
  map?: string;
}

/** A plain Google Maps search link: no API key, no embed. */
export const directionsUrl = (p: Place) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.map ?? [p.name, p.address].filter(Boolean).join(', '))}`;

export const highlights: Place[] = [
  {
    id: 'sauna', name: 'The Secret Sauna', address: 'The Camp, Lake Hawea', tags: ['lake'],
    website: 'https://www.thesecretsauna.nz/hawea', map: 'The Secret Sauna, 1208 Makarora-Lake Hawea Road, Lake Hawea',
  },
  {
    id: 'lavender', name: 'Wānaka Lavender Farm', address: '36 Morris Road, Wanaka', tags: ['outdoors'],
    website: 'https://www.wanakalavenderfarm.com/',
  },
  {
    id: 'museum', name: 'National Transport and Toy Museum', address: '891 Wanaka-Luggate Highway, Wanaka', tags: ['rainyDay'],
    website: 'https://www.nttmuseumwanaka.co.nz/',
  },
  {
    id: 'puzzling', name: 'Puzzling World', address: '188 Wanaka-Luggate Highway, Wanaka', tags: ['rainyDay'],
    website: 'https://www.puzzlingworld.co.nz/',
  },
  {
    id: 'cinema', name: 'Cinema Paradiso', address: '72 Brownston Street, Wanaka', tags: ['rainyDay'],
    website: 'https://www.paradiso.nz/',
  },
];

export const eateriesHawea: Place[] = [
  {
    id: 'hotel', name: 'The Hāwea Hotel, Eatery and Bar', tags: ['dinner', 'takeOut'],
    menu: 'https://haweahotel.nz/eat/', map: 'Hawea Hotel, 1 Capell Avenue, Lake Hawea',
  },
  {
    id: 'store', name: 'The Hāwea Store and Kitchen', tags: ['cafe', 'takeOut'],
    website: 'https://www.haweastoreandkitchen.nz/', map: 'Hawea Store and Kitchen, 33 Capell Avenue, Lake Hawea',
  },
  {
    id: 'wingin', name: 'Wingin It', address: '81 Longview Drive, Hawea', tags: ['foodTruck'],
    menu: 'https://www.winginit.co.nz/',
  },
  {
    id: 'camp', name: 'The Camp food truck and bar', tags: ['foodTruck', 'summer'],
    menu: 'https://thecamp.co.nz/things-to-do/eat/', map: 'The Camp, 1208 Makarora-Lake Hawea Road, Lake Hawea',
  },
];

export const eateriesWanaka: Place[] = [
  {
    id: 'patisserie', name: 'The Pembroke Patisserie', address: '20 Alison Avenue, Albert Town', tags: ['bakery'],
    website: 'https://www.pembrokepatisserie.co.nz/',
  },
  { id: 'scroggin', name: 'Scroggin', address: '71 Ardmore Street, Wanaka', tags: ['breakfast'], menu: 'https://www.scrogginwanaka.co.nz/' },
  { id: 'relishes', name: 'Relishes', address: '1/99 Ardmore Street, Wanaka', tags: ['breakfast', 'lunch'], menu: 'https://relishescafe.co.nz/menu/' },
  { id: 'kika', name: 'Kika', address: '2 Dunmore Street, Wanaka', tags: ['dinner'], website: 'https://kika.nz/' },
  { id: 'bsocial', name: 'b.social', address: '60 Anderson Road, Wanaka', tags: ['taproom'], website: 'https://bsocial.nz/' },
];

export const skiFields: Place[] = [
  { id: 'cardrona', name: 'Cardrona', tags: ['skiing'], website: 'https://cardrona-treblecone.com/cardrona', map: 'Cardrona Alpine Resort' },
  { id: 'treblecone', name: 'Treble Cone', tags: ['skiing'], website: 'https://cardrona-treblecone.com/treblecone', map: 'Treble Cone Ski Area, Wanaka' },
  { id: 'snowfarm', name: 'Snow Farm', tags: ['skiing'], website: 'https://snowfarm.nz/', map: 'Snow Farm, Cardrona Valley Road, Wanaka' },
];

/** A walking track. `doc` is the Department of Conservation page, where one exists. */
export interface Trail {
  name: string;
  doc?: string;
}

const DOC = 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/otago/places/';

export const hikesHawea: Trail[] = [
  { name: 'Lake Hāwea Track / Gladstone Track' },
  { name: 'Hāwea River Track', doc: DOC + 'wanaka-area/things-to-do/hawea-river-track/' },
  { name: 'Timaru Creek Track', doc: DOC + 'hawea-conservation-park/things-to-do/timaru-river-tracks' },
  { name: 'Breast Hill Track', doc: DOC + 'hawea-conservation-park/things-to-do/breast-hill-track/' },
  { name: 'Grandview Mountain', doc: DOC + 'lake-hawea-township-area/things-to-do/grandview-mountain-track/' },
  { name: 'Mount Isthmus', doc: DOC + 'wanaka-area/things-to-do/isthmus-peak-track/' },
];
export const hikesWanaka: Trail[] = [
  { name: 'Millennium Track' },
  { name: 'Roy’s Peak', doc: DOC + 'wanaka-area/things-to-do/roys-peak-track/' },
];
export const bikeCrossCountry = [
  'Gladstone Track', 'Hāwea River Track', 'Dean’s Bank', 'Hikuwai Loop', 'Upper Clutha River Track',
  'Newcastle Track', 'Millennium Track',
];
export const bikeEnduro = ['Sticky Forest', 'Kirimoko Trails', 'Bike Glendhu', 'Cardrona Bike Park'];
