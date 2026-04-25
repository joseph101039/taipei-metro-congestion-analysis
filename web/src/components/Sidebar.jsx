import { useState } from 'react';
import './Sidebar.css';

function StationTag({ station, onClear, label }) {
  return (
    <div className="route-station-row">
      <span className="route-station-label">{label}</span>
      {station
        ? <span className="route-station-tag">{station.name}<button className="route-station-clear" onClick={onClear} title="清除">×</button></span>
        : <span className="route-station-placeholder">點擊地圖選擇</span>
      }
    </div>
  );
}

function RouteForm({ onSearch, routeResult, routeLoading, routeError, routeFrom, routeTo, onClearFrom, onClearTo }) {
  const isTime = routeResult?.total_travel_time_min != null;

  return (
    <>
      <div className="route-form">
        <StationTag station={routeFrom} onClear={onClearFrom} label="起" />
        <StationTag station={routeTo}   onClear={onClearTo}   label="終" />
        <button
          onClick={() => routeFrom && routeTo && onSearch(routeFrom.id, routeTo.id)}
          disabled={routeLoading || !routeFrom || !routeTo}
        >
          {routeLoading ? '查詢中…' : '重新查詢'}
        </button>
      </div>

      {routeError && <p className="route-error">{routeError}</p>}

      {routeResult && (
        <div className="route-result">
          <div className="route-result__summary">
            {routeResult.from.name} → {routeResult.to.name}
          </div>
          <div className="route-result__meta">
            {isTime
              ? `${routeResult.total_travel_time_min} 分鐘・${routeResult.transfers} 次換乘`
              : `${routeResult.total_distance_km} km・${routeResult.transfers} 次換乘`
            }
          </div>
          {routeResult.segments.map((seg, i) => (
            <div key={i} className="route-result__segment" style={{ borderLeftColor: seg.line.color }}>
              <div className="route-result__seg-line">{seg.line.name}</div>
              <div className="route-result__seg-stations">{seg.from.name} → {seg.to.name}</div>
              <div className="route-result__seg-dist">
                {isTime ? `${seg.travel_time_min} 分鐘` : `${seg.distance_km} km`}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

const MENU = [
  {
    id: 'map-data',
    label: '地圖圖資',
    children: [
      { id: 'route-map', label: '路線圖' },
      { id: 'stations',  label: '站點標記' },
      {
        id: 'station-info',
        label: '站間資訊',
        children: [
          { id: 'distances',   label: '距離標籤' },
          { id: 'time-labels', label: '時間標籤' },
        ],
      },
    ],
  },
  {
    id: 'simulation',
    label: '模擬',
    children: [
      {
        id: 'route-group',
        label: '搭乘路徑',
        children: [
          { id: 'route-time', label: '依時間規劃' },
          { id: 'route',      label: '依距離規劃' },
        ],
      },
      { id: 'passenger',  label: '旅客流量' },
      { id: 'congestion', label: '壅塞模擬' },
    ],
  },
];

const BASEMAP_OPTIONS = [
  { id: 'osm',          label: '街道圖' },
  { id: 'carto-light',  label: '淡色底圖' },
  { id: 'nlsc-village', label: '里界線圖' },
  { id: 'nlsc-town',    label: '鄉鎮區界圖' },
];

function MenuItem({ item, active, onChange, expanded, onToggle }) {
  if (item.children) {
    return (
      <li>
        <button className="sidebar__group-header" onClick={() => onToggle(item.id)}>
          <span className={`sidebar__chevron${expanded[item.id] ? ' sidebar__chevron--open' : ''}`}>›</span>
          {item.label}
        </button>
        {expanded[item.id] && (
          <ul className="sidebar__sublist">
            {item.children.map(child => (
              <li key={child.id}>
                <button
                  className={`sidebar__subitem${active === child.id ? ' sidebar__item--active' : ''}`}
                  onClick={() => onChange(child.id)}
                >
                  {child.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }
  return (
    <li>
      <button
        className={`sidebar__item${active === item.id ? ' sidebar__item--active' : ''}`}
        onClick={() => onChange(item.id)}
      >
        {item.label}
      </button>
    </li>
  );
}

const ROUTE_VIEWS = new Set(['route', 'route-time']);

export default function Sidebar({ active, onChange, basemap, onBasemapChange, onRouteSearch, routeFrom, routeTo, onClearFrom, onClearTo, routeResult, routeLoading, routeError, showDensity, onToggleDensity }) {
  const [expanded, setExpanded] = useState({ 'map-data': true, 'basemap': true, 'simulation': true, 'route-group': true, 'station-info': true });
  const [collapsed, setCollapsed] = useState(false);

  function toggleSection(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <nav className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <button
        className="sidebar__toggle"
        onClick={() => setCollapsed(v => !v)}
        title={collapsed ? '展開選單' : '收合選單'}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {!collapsed && (
        <div className="sidebar__section">
          <button className="sidebar__section-header" onClick={() => toggleSection('basemap')}>
            <span className={`sidebar__chevron${expanded['basemap'] ? ' sidebar__chevron--open' : ''}`}>›</span>
            背景地圖
          </button>
          {expanded['basemap'] && (
            <ul className="sidebar__list">
              {BASEMAP_OPTIONS.map(opt => (
                <li key={opt.id}>
                  <button
                    className={`sidebar__item${basemap === opt.id ? ' sidebar__item--active' : ''}`}
                    onClick={() => onBasemapChange(opt.id)}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
              <li>
                <button
                  className={`sidebar__item sidebar__item--overlay${showDensity ? ' sidebar__item--active' : ''}`}
                  onClick={onToggleDensity}
                >
                  戶籍人口密度
                </button>
              </li>
            </ul>
          )}
        </div>
      )}

      {!collapsed && MENU.map(section => (
        <div key={section.id} className="sidebar__section">
          <button className="sidebar__section-header" onClick={() => toggleSection(section.id)}>
            <span className={`sidebar__chevron${expanded[section.id] ? ' sidebar__chevron--open' : ''}`}>›</span>
            {section.label}
          </button>
          {expanded[section.id] && (
            <ul className="sidebar__list">
              {section.children.map(item => (
                <MenuItem
                  key={item.id}
                  item={item}
                  active={active}
                  onChange={onChange}
                  expanded={expanded}
                  onToggle={toggleSection}
                />
              ))}
            </ul>
          )}
        </div>
      ))}

      {!collapsed && ROUTE_VIEWS.has(active) && (
        <RouteForm
          onSearch={onRouteSearch}
          routeFrom={routeFrom}
          routeTo={routeTo}
          onClearFrom={onClearFrom}
          onClearTo={onClearTo}
          routeResult={routeResult}
          routeLoading={routeLoading}
          routeError={routeError}
        />
      )}
    </nav>
  );
}
