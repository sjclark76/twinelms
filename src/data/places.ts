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
}

export const highlights: Place[] = [
  { id: 'sauna', name: 'The Secret Sauna', address: 'The Camp, Lake Hawea', tags: ['lake'] },
  { id: 'lavender', name: 'Wanaka Lavender Farm', address: '36 Morris Road, Wanaka', tags: ['outdoors'] },
  { id: 'museum', name: 'National Transport and Toy Museum', address: '891 Wanaka-Luggate Highway, Wanaka', tags: ['rainyDay'] },
  { id: 'cinema', name: 'Cinema Paradiso', address: '72 Brownston Street, Wanaka', tags: ['rainyDay'] },
];

export const eateriesHawea: Place[] = [
  { id: 'hotel', name: 'The Hawea Hotel, Eatery and Bar', tags: ['dinner', 'takeOut'] },
  { id: 'store', name: 'The Hawea Store and Kitchen', tags: ['cafe', 'takeOut'] },
  { id: 'wingin', name: 'Wingin It', address: '81 Longview Drive, Hawea', tags: ['foodTruck'] },
  { id: 'camp', name: 'The Camp food truck and bar', tags: ['foodTruck', 'summer'] },
];

export const eateriesWanaka: Place[] = [
  { id: 'patisserie', name: 'The Albert Town Patisserie', address: 'Albert Town shops', tags: ['bakery'] },
  { id: 'scroggin', name: 'Scroggin', address: '71 Ardmore Street, Wanaka', tags: ['breakfast'] },
  { id: 'relishes', name: 'Relishes', address: '1/99 Ardmore Street, Wanaka', tags: ['breakfast', 'lunch'] },
  { id: 'kika', name: 'Kika', address: '2 Dunmore Street, Wanaka', tags: ['dinner'] },
  { id: 'bsocial', name: 'b.social', address: '60 Anderson Road, Wanaka', tags: ['taproom'] },
];

export const hikesHawea = [
  'Lake Hawea Track / Gladstone Track', 'Hawea River Track', 'Timaru Creek Track', 'Breast Hill Track',
  'Grandview Mountain', 'Mount Isthmus',
];
export const hikesWanaka = ['Millennium Track', 'Roy’s Peak'];
export const bikeCrossCountry = [
  'Gladstone Track', 'Hawea River Track', 'Dean’s Bank', 'Hikuwai Loop', 'Upper Clutha River Track',
  'Newcastle Track', 'Millennium Track',
];
export const bikeEnduro = ['Sticky Forest', 'Kirimoko Trails', 'Bike Glenhu', 'Cardrona Bike Park'];
export const skiFields = ['Cardrona', 'Treble Cone', 'Snow Farm'];
