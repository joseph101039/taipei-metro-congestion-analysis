# Plan: Taipei Metro Station Distance Visualization

## Context

The web frontend is a bare Vite + React 19 boilerplate. The server seeds 108 stations and ~130 inter-station distances but has no working API routes yet. The goal is to render a full-screen Leaflet map (OSM tiles) showing all metro lines as colored polylines with distance labels on each segment, and a popup per station showing adjacent distances.

No API is involved — all data is embedded as static JS files in the frontend.

---

## Files to Create

| Path | Purpose |
|---|---|
| `web/src/data/stations.js` | 108 stations with OSM lat/lng coordinates + `stationsByCode` Map |
| `web/src/data/lines.js` | 5 line definitions with color + ordered segment pairs |
| `web/src/data/distances.js` | ~130 distance records + bidirectional `distanceMap` |
| `web/src/components/MetroMap.jsx` | Root map component (MapContainer, TileLayer, sub-components) |
| `web/src/components/LineLayer.jsx` | Renders polylines + permanent distance Tooltip per segment |
| `web/src/components/StationMarker.jsx` | CircleMarker + Popup with adjacent distances |

## Files to Modify

| Path | Change |
|---|---|
| `web/package.json` | Add `leaflet`, `react-leaflet` |
| `web/src/App.jsx` | Replace boilerplate with `<MetroMap />` |
| `web/src/index.css` | Override `#root` to full-screen (remove 1126px width constraint) |
| `web/src/App.css` | Replace with `.metro-map` full-screen + `.distance-label` styles |
| `web/index.html` | Update `<title>` + `lang="zh-Hant"` |

---

## Data Shapes

### stations.js
```js
export const stations = [
  { id, code, primaryCode, name, lat, lng },
  // primaryCode = first token of code (e.g. 'R10' from 'R10,BL12')
  // 108 entries total
];

// Pre-built Map: every code token -> station (handles multi-code stations)
export const stationsByCode = new Map(
  stations.flatMap(s => s.code.split(',').map(c => [c.trim(), s]))
);
```

### lines.js
```js
export const LINE_COLORS = {
  red: '#e3001b', blue: '#0070bd', green: '#008659',
  orange: '#f5a623', brown: '#c48c31',
};

export const lines = [
  { id: 'red', name: '淡水信義線', color: '#e3001b', segments: [['R28','R27'], ...] },
  // Includes branch segments: R22→R22A (新北投), G03→G03A (小碧潭), O12→LK01...LK05 (蘆洲)
];
```

### distances.js
```js
export const distances = [{ from: 'R28', to: 'R27', distance_km: 2.09 }, ...];

// Bidirectional lookup: 'R28|R27' and 'R27|R28' both map to same distance
export const distanceMap = new Map(
  distances.flatMap(({ from, to, distance_km }) => [
    [`${from}|${to}`, distance_km],
    [`${to}|${from}`, distance_km],
  ])
);
```

---

## Component Architecture

```
App
└── MetroMap
    └── MapContainer (center: 台北車站 [25.0478, 121.5170], zoom: 12)
        ├── TileLayer (OSM)
        ├── LineLayer × 5 lines
        │   └── Polyline + permanent Tooltip (distance label) per segment
        └── StationMarker × 108
            └── CircleMarker + Popup (name, code, adjacent distances list)
```

**Distance display**: Permanent `Tooltip` at polyline midpoints — always visible, spatially contextualized.

**StationMarker**: `CircleMarker` (avoids Leaflet icon PNG path issue with Vite). Interchange stations (multi-code) get radius 8 vs 6.

**Line colors by primaryCode prefix**: R→red, BL→blue, G→green, O/LK→orange, BR→brown.

---

## CSS

```css
/* index.css — override existing #root */
#root { width: 100%; max-width: 100%; margin: 0; height: 100svh; display: block; }
html, body { height: 100%; margin: 0; padding: 0; }

/* App.css */
.metro-map { width: 100%; height: 100svh; }
.distance-label {
  background: transparent; border: none; box-shadow: none;
  font-size: 10px; font-weight: 600; color: #333; pointer-events: none;
}
```

`leaflet/dist/leaflet.css` imported once inside `MetroMap.jsx`.

---

## Verification

1. `stations.length === 108` in console
2. Orange line shows Y-fork at 大橋頭 (O12): branches to 蘆洲 (LK) and continues to O13
3. Red line branch at 北投 (R22) → 新北投 (R22A)
4. Green line branch at 七張 (G03) → 小碧潭 (G03A)
5. 台北車站 marker at correct position near Taipei Main Station on OSM
6. Clicking a station popup shows ≥1 adjacent distance
7. Map fills full viewport (no width constraint)