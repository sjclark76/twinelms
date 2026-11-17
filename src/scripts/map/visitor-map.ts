// The Leaflet world map: The Nest's pin, one pin per guest town, the stat line and the town list.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { counter, esc, pinSize, sortTowns, statLine, townLabel, type MapConfig, type Town } from './text';

export interface VisitorMap {
  /** Add or update a town's pin and return it. */
  upsert(town: Town): L.Marker;
  /** Refresh the stat line and the town list from the pins. */
  render(): void;
  /** Move to a pin (instantly when the guest prefers less motion) and open its popup. */
  show(marker: L.Marker): void;
}

export function createVisitorMap(el: HTMLElement, config: MapConfig): VisitorMap {
  const s = config.strings;
  const count = counter(config.locale);
  const statEl = document.querySelector<HTMLElement>('[data-stat]')!;
  const listWrap = document.querySelector<HTMLDetailsElement>('[data-town-list]')!;
  const listEl = document.querySelector<HTMLUListElement>('[data-towns]')!;

  // One copy of the world, never repeated: it can't be panned past its edges or zoomed out beyond filling the width.
  const WORLD = L.latLngBounds([-85, -180], [85, 180]);
  // Guests who ask for less motion get instant jumps instead of animated zooms.
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const map = L.map(el, {
    zoomAnimation: !calm,
    fadeAnimation: !calm,
    markerZoomAnimation: !calm,
    scrollWheelZoom: false,
    maxZoom: 10,
    zoomControl: false,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    maxBounds: WORLD,
    maxBoundsViscosity: 1,
  });
  // Zoom buttons on the right, clear of the stat pill.
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 10,
    noWrap: true,
    bounds: WORLD,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  map.attributionControl.setPrefix(false);

  /** The furthest zoom-out at which one world (256 px wide at zoom 0) still fills the map's width. */
  const worldZoom = () => Math.log2(map.getSize().x / 256);
  const updateMinZoom = () => map.setMinZoom(worldZoom());
  map.on('resize', updateMinZoom);

  const icon = (home: boolean, visits = 1) => {
    const size = home ? 22 : pinSize(visits);
    // Towns with 2 or more visits show the count on the pin (the pin is rotated, so the number is turned back upright).
    const label = !home && visits > 1 ? `<b>${visits > 99 ? '99+' : visits}</b>` : '';
    return L.divIcon({
      className: 'pin-icon',
      html: `<span class="nest-pin${home ? ' nest-pin-home' : ''}${label ? ' nest-pin-count' : ''}" style="width:${size}px;height:${size}px">${label}</span>`,
      iconSize: [size, size],
      // The pin's point sits about 1.2 sizes below its top-left corner once rotated.
      iconAnchor: [size / 2, Math.round(size * 1.21)],
      popupAnchor: [0, -Math.round(size * 1.2)],
    });
  };

  const homeLatLng = L.latLng(config.home.lat, config.home.lng);
  L.marker(homeLatLng, { icon: icon(true), title: config.home.label, alt: config.home.label, zIndexOffset: 1000 })
    .bindPopup(`<b>The Nest at Twin Elms</b>${esc(config.home.place)}`)
    .addTo(map);

  const towns = new Map<string, { town: Town; marker: L.Marker }>();
  const keyOf = (t: Town) => `${t.lat},${t.lng}`;

  function upsert(town: Town) {
    const existing = towns.get(keyOf(town));
    const text = `<b>${esc(townLabel(town))}</b>${esc(count(s.visits, town.visits))}`;
    const title = `${townLabel(town)}: ${count(s.visits, town.visits)}`;
    if (existing) {
      existing.town = town;
      existing.marker.setIcon(icon(false, town.visits));
      existing.marker.setZIndexOffset(-town.visits);
      existing.marker.setPopupContent(text);
      existing.marker.getElement()?.setAttribute('title', title);
      return existing.marker;
    }
    // Busier (bigger) pins sit underneath, so small pins nearby stay visible and tappable.
    const marker = L.marker([town.lat, town.lng], { icon: icon(false, town.visits), title, alt: title, zIndexOffset: -town.visits })
      .bindPopup(text)
      .addTo(map);
    towns.set(keyOf(town), { town, marker });
    return marker;
  }

  function render() {
    const all = [...towns.values()].map((v) => v.town);
    statEl.textContent = statLine(all, s, count);
    listWrap.hidden = all.length === 0;
    listEl.replaceChildren(
      ...sortTowns(all).map((t) => {
        const li = document.createElement('li');
        li.append(`${townLabel(t)} `);
        const span = document.createElement('span');
        span.textContent = `(${count(s.visits, t.visits)})`;
        li.append(span);
        return li;
      }),
    );
  }

  function fit() {
    updateMinZoom();
    const points = [homeLatLng, ...[...towns.values()].map((v) => L.latLng(v.town.lat, v.town.lng))];
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 4 });
    else map.setView([10, 60], worldZoom());
  }

  function show(marker: L.Marker) {
    const zoom = Math.max(map.getZoom(), 4);
    if (calm) map.setView(marker.getLatLng(), zoom, { animate: false });
    else map.flyTo(marker.getLatLng(), zoom, { duration: 0.8 });
    marker.openPopup();
  }

  // Load the towns guests have added so far.
  (async () => {
    try {
      const res = await fetch('/api/towns');
      if (!res.ok) throw new Error(String(res.status));
      const data: { towns: Town[] } = await res.json();
      data.towns.forEach(upsert);
    } catch {
      document.querySelector<HTMLElement>('[data-load-error]')!.hidden = false;
    }
    render();
    fit();
  })();

  return { upsert, render, show };
}
