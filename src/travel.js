// The Travel card: a small world map with the countries I've been to filled in.
// To add a country, put its name in VISITED, spelled as in world-atlas
// (e.g. 'United States of America', 'Czechia'). Countries too small for this
// map scale go in TINY instead, with their [longitude, latitude]: they're
// drawn as dots. (Been counts England and Scotland separately; here they're
// both the United Kingdom, which is why the card says 33.)

import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';

const VISITED = new Set([
  'United States of America',
  'Iceland', 'United Kingdom', 'Norway', 'Sweden', 'Finland', 'Denmark',
  'Lithuania', 'Poland', 'Germany', 'Netherlands', 'Belgium', 'France',
  'Spain', 'Portugal', 'Switzerland', 'Austria', 'Czechia', 'Italy',
  'Croatia', 'Greece', 'Turkey', 'Luxembourg',
  'United Arab Emirates',
  'Vietnam', 'Malaysia', 'Indonesia', 'Japan',
]);

const TINY = [
  ['Liechtenstein', [9.55, 47.16]],
  ['Maldives', [73.5, 3.2]],
  ['Mauritius', [57.55, -20.3]],
  ['Singapore', [103.82, 1.35]],
];

const W = 600;
const H = 300;

export async function initTravel() {
  const box = document.querySelector('[data-travel-map]');
  if (!box) return;

  // The map data is loaded separately, so it doesn't slow down the first paint.
  const { default: world } = await import('world-atlas/countries-110m.json');
  const countries = feature(world, world.objects.countries).features
    .filter((c) => c.properties.name !== 'Antarctica');

  const projection = geoNaturalEarth1().fitSize([W, H], { type: 'FeatureCollection', features: countries });
  const path = geoPath(projection);

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('aria-hidden', 'true');

  // Visited countries go last so their edges sit on top.
  const sorted = [...countries].sort((a, b) => VISITED.has(a.properties.name) - VISITED.has(b.properties.name));
  for (const country of sorted) {
    const d = path(country);
    if (!d) continue;
    const el = document.createElementNS(ns, 'path');
    el.setAttribute('d', d);
    el.setAttribute('class', VISITED.has(country.properties.name) ? 'land is-visited' : 'land');
    svg.append(el);
  }
  for (const [, lonLat] of TINY) {
    const [x, y] = projection(lonLat);
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', x.toFixed(1));
    dot.setAttribute('cy', y.toFixed(1));
    dot.setAttribute('r', 4);
    dot.setAttribute('class', 'land is-visited is-dot');
    svg.append(dot);
  }
  box.append(svg);
}
