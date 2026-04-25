# 台北捷運壅塞分析系統

視覺化分析台北捷運壅塞狀況與分析洞見，提出改善方向的系統。

A web-based system for visualizing and analyzing Taipei Metro (MRT) congestion patterns, providing data-driven insights and improvement recommendations.

## Features

- **路線地圖 (Route Map)** — Interactive Leaflet map of the Taipei MRT network with all lines and stations. Toggle village population density heatmap overlay.
- **路徑規劃 (Route Planning)** — Shortest-path routing between any two stations, with both distance-based and time-based modes.
- **人流模擬 (Passenger Flow)** — Animated canvas visualization of passenger flow across stations over time, with per-station flow charts and timeline scrubbing.
- **壅塞模擬 (Congestion Simulation)** — Per-segment congestion overlays in two modes:
  - **在車人數 (Onboard Load)** — Color-coded station load based on onboard passenger counts fetched across multi-day ranges.
  - **壅塞率 (Congestion Rate)** — Configurable capacity settings per line with route-level congestion rate charts and headway editor.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Map | Leaflet 1.9 + react-leaflet 5 |
| Heatmap | leaflet.heat |
| Build | Vite (ESM, port 3000) |
| Lint | ESLint 9 |

## Getting Started

```bash
npm install
npm run dev      # dev server at http://localhost:3000
npm run build    # production build → dist/
npm run preview  # preview production build
```

## Project Structure

```
src/
  App.jsx                        # Root component, view state management
  components/
    MetroMap.jsx                 # Base Leaflet map, line/station layers
    Sidebar.jsx                  # Navigation & route search panel
    PassengerFlow/               # Animated passenger flow visualization
      index.jsx
      FlowCanvas.jsx
      TimelineBar.jsx
    Congestion/                  # Congestion simulation overlays
      CongestionOverlay.jsx      # Mode switcher + station load layer
      StationLoadLayer.jsx       # Onboard load map layer
      StationLoadLegend.jsx      # Color scale legend
      StationLoadChart.jsx       # Per-station load bar chart
      RouteChartPanel.jsx        # Per-line congestion rate panel
      HeadwayEditor.jsx          # Train headway configuration
      CongestionRouteChart.jsx   # Route-level congestion chart
      loadColorUtils.js          # Load → color mapping utilities
    VillageDensityLayer.jsx      # Village density choropleth
    VillageDensityHeatLayer.jsx  # Village density heatmap
  data/
    api.js                       # Data fetching (routes, flow, density)
```