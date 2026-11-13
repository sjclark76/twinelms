export const wifi = {
  ssid: 'The Quack House Guest',
  password: 'Quackers',
};

/** Standard Wi-Fi join string that phone cameras understand. */
export const wifiQrText = `WIFI:T:WPA;S:${wifi.ssid};P:${wifi.password};;`;

/** English-only copy for the printed A6 card (/wifi-card/); the website's own Wi-Fi card is translated in src/i18n. */
export const printedCard = {
  heading: 'Join the Wi-Fi',
  network: 'Network',
  password: 'Password',
  hint: 'Point your phone camera at the code.',
  qrLabel: `QR code to join the ${wifi.ssid} Wi-Fi`,
  print: 'Print this card',
  printHelp: 'Prints at A6 (105 × 148 mm). On an A4 sheet, set the scale to 100% and cut around the card.',
};
