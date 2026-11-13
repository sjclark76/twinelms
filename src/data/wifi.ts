export const wifi = {
  ssid: 'The Quack House Guest',
  password: 'Quackers',
};

/** Standard Wi-Fi join string that phone cameras understand. */
export const wifiQrText = `WIFI:T:WPA;S:${wifi.ssid};P:${wifi.password};;`;
