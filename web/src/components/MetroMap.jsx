import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import LineLayer from './LineLayer';
import StationMarker from './StationMarker';
import RouteLayer from './RouteLayer';
import MapUnitHint from './MapUnitHint';
import VillageDensityLayer from './VillageDensityLayer';
import VillageDensityHeatLayer from './VillageDensityHeatLayer';
import DensityLegend from './DensityLegend';
import { fetchLines, fetchStations, fetchDistances, fetchSegmentTimes, fetchTransferOverheads } from '../data/api';

const DISTANCE_VIEWS = new Set(['distances', 'time-labels']);

const TAIPEI_CENTER = [25.0478, 121.5171];

function MapCapture({ onReady }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, [map, onReady]);
  return null;
}

const BASEMAPS = {
  'osm': {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  'carto-light': {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  },
  'nlsc-village': {
    url: 'https://wmts.nlsc.gov.tw/wmts/Village/default/GoogleMapsCompatible/{z}/{y}/{x}',
    attr: '&copy; <a href="https://maps.nlsc.gov.tw/">內政部國土測繪中心</a>',
  },
  'nlsc-town': {
    url: 'https://wmts.nlsc.gov.tw/wmts/TOWN/default/GoogleMapsCompatible/{z}/{y}/{x}',
    attr: '&copy; <a href="https://maps.nlsc.gov.tw/">內政部國土測繪中心</a>',
  },
};

export default function MeMetroMap({ activeView, basemap = 'carto-light', routeResult = null, onStationClick = null, selectedStationId = null, showDensity = false, densityData = null, onMapReady = null, onStationsLoaded = null, onLinesLoaded = null }) {
  const [lines, setLines] = useState([]);
  const [stationsByCode, setStationsByCode] = useState(new Map());
  const [distanceMap, setDistanceMap] = useState(new Map());
  const [segmentTimeMap, setSegmentTimeMap] = useState(new Map());
  const [transferMap, setTransferMap] = useState(new Map());
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([fetchLines(), fetchStations()])
      .then(([linesData, stationsData]) => {
        setLines(linesData);
        if (onLinesLoaded) onLinesLoaded(linesData);
        setStationsByCode(new Map(stationsData.map(s => [s.code, s])));
      })
      .catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    if (!DISTANCE_VIEWS.has(activeView) || distanceMap.size > 0) return;
    fetchDistances()
      .then(distancesData => setDistanceMap(new Map(
        distancesData.flatMap(({ from_station, to_station, distance_km }) => [
          [`${from_station.code}|${to_station.code}`, Number(distance_km)],
          [`${to_station.code}|${from_station.code}`, Number(distance_km)],
        ])
      )))
      .catch(err => setError(err.message));
  }, [activeView, distanceMap.size]);

  useEffect(() => {
    if (activeView !== 'time-labels' || segmentTimeMap.size > 0) return;
    fetchSegmentTimes()
      .then(segTimes => setSegmentTimeMap(new Map(
        segTimes.flatMap(({ from_station_code, to_station_code, travel_time_min }) => [
          [`${from_station_code}|${to_station_code}`, Number(travel_time_min)],
          [`${to_station_code}|${from_station_code}`, Number(travel_time_min)],
        ])
      )))
      .catch(err => setError(err.message));
  }, [activeView, segmentTimeMap.size]);

  useEffect(() => {
    if (activeView !== 'time-labels' || transferMap.size > 0) return;
    fetchTransferOverheads()
      .then(transfers => {
        const tMap = new Map();
        transfers.forEach(({ station_codes, avg_transfer_time_min }) => {
          station_codes.split('/').forEach(c => tMap.set(c.trim(), avg_transfer_time_min));
        });
        setTransferMap(tMap);
      })
      .catch(err => setError(err.message));
  }, [activeView, transferMap.size]);

  // Pass loaded stations up to parent for passenger flow
  useEffect(() => {
    if (onStationsLoaded && stationsByCode.size > 0) {
      onStationsLoaded([...stationsByCode.values()]);
    }
  }, [stationsByCode, onStationsLoaded]);

  if (error) return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;

  const isRouteView  = activeView === 'route' || activeView === 'route-time';
  const isPassenger  = activeView === 'passenger';
  const isCongestion = activeView === 'congestion';
  const showLines    = activeView === 'route-map' || isRouteView || isPassenger || isCongestion;
  const showStations = activeView === 'stations' || activeView === 'route-map' || isRouteView || isPassenger || isCongestion || activeView === 'time-labels';
  const showDist     = activeView === 'distances';
  const showTime     = activeView === 'time-labels';
  const showRoute    = isRouteView && routeResult !== null;
  const dimLines     = isRouteView || isPassenger || isCongestion;

  return (
    <MapContainer center={TAIPEI_CENTER} zoom={12} zoomSnap={0.25} zoomDelta={0.5} wheelPxPerZoomLevel={120} className="metro-map">
      {onMapReady && <MapCapture onReady={onMapReady} />}
      <TileLayer
        attribution={BASEMAPS[basemap]?.attr ?? BASEMAPS['carto-light'].attr}
        url={BASEMAPS[basemap]?.url ?? BASEMAPS['carto-light'].url}
      />
      {showDensity && <VillageDensityHeatLayer geojson={densityData} />}
      {/*{showDensity && <VillageDensityLayer geojson={densityData} />}*/}
      {showDensity && densityData && <DensityLegend geojson={densityData} />}
      {showLines && lines.map(line => (
        <LineLayer
          key={line.id}
          line={line}
          stationsByCode={stationsByCode}
          distanceMap={new Map()}
          opacity={dimLines ? 0.25 : 0.85}
          weight={dimLines ? 3 : 5}
        />
      )) || null}
      {showDist && lines.map(line => (
        <LineLayer key={`dist-${line.id}`} line={line} stationsByCode={stationsByCode} distanceMap={distanceMap} />
      )) || null}
      {showDist && <MapUnitHint unit="km" />}
      {showTime && lines.map(line => (
        <LineLayer key={`time-${line.id}`} line={line} stationsByCode={stationsByCode} timeMap={segmentTimeMap} />
      )) || null}
      {showTime && <MapUnitHint unit="分鐘" />}
      {showStations && [...stationsByCode.values()].map(station => (
        <StationMarker key={station.id} station={station} lines={lines} distanceMap={distanceMap} transferMap={showTime ? transferMap : null} onClick={onStationClick} dim={isPassenger || isCongestion} selected={selectedStationId === station.id} />
      )) || null}
      {showRoute && (
        <RouteLayer routeResult={routeResult} stationsByCode={stationsByCode} lines={lines} />
      )}
    </MapContainer>
  );
}
