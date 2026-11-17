// Names, addresses and phone numbers are never translated.
/** The postal address, in parts (also used for search engines' structured data). */
export const postalAddress = { street: '180 Capell Avenue', locality: 'Lake Hawea', postcode: '9382', country: 'NZ' };

/** The address as it's shown on the page, on two lines. */
export const address = [postalAddress.street, `${postalAddress.locality} ${postalAddress.postcode}`];

export const hosts = [
  { name: 'Jo', display: '+64 (0)22 031 8726', tel: '+64220318726' },
  { name: 'Stuart', display: '+64 (0)21 509 357', tel: '+6421509357' },
];

export const medicalCentre = {
  name: 'Aspiring Medical Centre',
  display: '+64 443 0725',
  tel: '+64344430725',
};

/** The Nest's Airbnb listing (no tracking parameters). */
export const airbnbUrl = 'https://www.airbnb.co.nz/rooms/1478609490229044899';
