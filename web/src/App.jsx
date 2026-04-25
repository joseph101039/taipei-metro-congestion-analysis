import { useState, useEffect, useRef, useCallback } from 'react';
import MetroMap from './components/MetroMap';
import Sidebar from './components/Sidebar';
import PassengerFlow from './components/PassengerFlow';
import { CongestionOverlay, RouteChartPanel } from './components/Congestion';
import { fetchRoute, fetchRouteTime, fetchVillageDensity, fetchAllLineRoutes } from './data/api';
import './App.css';

const ROUTE_VIEWS = new Set(['route', 'route-time']);

export default function App() {
  const [activeView, setActiveView] = useState('route-map');
  const [basemap, setBasemap] = useState('carto-light');
  const [routeFrom, setRouteFrom]       = useState(null);
  const [routeTo, setRouteTo]           = useState(null);
  const [routeResult, setRouteResult]   = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError]     = useState(null);
  const [mapInstance, setMapInstance]         = useState(null);
  const [stations, setStations]               = useState(null);
  const [lines, setLines]                     = useState(null);
  const [selectedFlowStationId, setSelectedFlowStationId] = useState(null);
  const [showDensity, setShowDensity] = useState(false);
  const [densityData, setDensityData] = useState(null);
  const [lineRoutes, setLineRoutes] = useState(null);
  const [congestionMode, setCongestionMode] = useState('flow');
  const [capacitySettings, setCapacitySettings] = useState(null);
  const [viewStartDate, setViewStartDate] = useState(null);

  useEffect(() => {
    if (showDensity && !densityData) {
      fetchVillageDensity().then(setDensityData).catch(console.error);
    }
  }, [showDensity, densityData]);

  useEffect(() => {
    if (activeView === 'congestion' && !lineRoutes) {
      fetchAllLineRoutes().then(setLineRoutes).catch(console.error);
    }
  }, [activeView, lineRoutes]);

  const handleMapReady = useCallback((m) => setMapInstance(m), []);
  const handleStationsLoaded = useCallback((s) => setStations(s), []);
  const handleLinesLoaded = useCallback((l) => setLines(l), []);

  useEffect(() => {
    if (activeView !== 'passenger') setSelectedFlowStationId(null);
  }, [activeView]);

  function handleFlowStationClick(station) {
    setSelectedFlowStationId((prev) => (prev === station.id ? null : station.id));
  }

  const prevView = useRef(activeView);
  useEffect(() => {
    const prev = prevView.current;
    prevView.current = activeView;
    // Clear result when switching between distance and time modes
    if (ROUTE_VIEWS.has(activeView) && ROUTE_VIEWS.has(prev) && activeView !== prev) {
      setRouteResult(null);
      setRouteError(null);
    }
  }, [activeView]);

  async function handleRouteSearch(fromId, toId) {
    setRouteLoading(true);
    setRouteError(null);
    setRouteResult(null);
    try {
      const fetcher = activeView === 'route-time' ? fetchRouteTime : fetchRoute;
      setRouteResult(await fetcher(fromId, toId));
    } catch (err) {
      setRouteError(err.message);
    } finally {
      setRouteLoading(false);
    }
  }

  function handleStationClick(station) {
    if (!routeFrom) {
      setRouteFrom(station);
    } else if (!routeTo) {
      setRouteTo(station);
      handleRouteSearch(routeFrom.id, station.id);
    } else {
      setRouteFrom(station);
      setRouteTo(null);
      setRouteResult(null);
      setRouteError(null);
    }
  }

  const isRouteView = ROUTE_VIEWS.has(activeView);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100svh' }}>
      <MetroMap
        activeView={activeView}
        basemap={basemap}
        routeResult={routeResult}
        onStationClick={activeView === 'passenger' ? handleFlowStationClick : (isRouteView ? handleStationClick : null)}
        selectedStationId={activeView === 'passenger' ? selectedFlowStationId : null}
        showDensity={showDensity}
        densityData={densityData}
        onMapReady={handleMapReady}
        onStationsLoaded={handleStationsLoaded}
        onLinesLoaded={handleLinesLoaded}
      />
      {activeView === 'passenger' && mapInstance && (
        <PassengerFlow mapInstance={mapInstance} stations={stations} lines={lines} selectedStationId={selectedFlowStationId} />
      )}
      {activeView === 'congestion' && (
        <>
          <CongestionOverlay mapInstance={mapInstance} stations={stations} mode={congestionMode} onModeChange={setCongestionMode} lineRoutes={lineRoutes} capacitySettings={capacitySettings} onStartDateChange={setViewStartDate} />
          <RouteChartPanel lineRoutes={lineRoutes} lines={lines} onSettingsChange={setCapacitySettings} referenceDate={viewStartDate} hidden={congestionMode !== 'congestion-rate'} />
        </>
      )}
      <Sidebar
        active={activeView}
        onChange={setActiveView}
        basemap={basemap}
        onBasemapChange={setBasemap}
        onRouteSearch={handleRouteSearch}
        routeFrom={routeFrom}
        routeTo={routeTo}
        onClearFrom={() => { setRouteFrom(null); setRouteResult(null); setRouteError(null); }}
        onClearTo={() => { setRouteTo(null); setRouteResult(null); setRouteError(null); }}
        routeResult={routeResult}
        routeLoading={routeLoading}
        routeError={routeError}
        showDensity={showDensity}
        onToggleDensity={() => setShowDensity((v) => !v)}
      />
    </div>
  );
}
