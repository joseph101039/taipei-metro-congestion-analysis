import './PassengerFlow.css';

const DEFAULT_SPEED_OPTIONS = [0.5, 1, 2, 5];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function pad(n) { return String(n).padStart(2, '0'); }

export default function TimelineBar({
  startDate, startHour, endDate, endHour,
  currentSlot, totalSlots, currentDate, currentHour,
  isPlaying, speed, totalPassengers, loading, error,
  maxDate, netFlow, onToggleNetFlow,
  onStartDateChange, onStartHourChange,
  onEndDateChange, onEndHourChange,
  onSlotChange, onPlayPause, onSpeedChange,
  currentTimeStr,
  speedOptions = DEFAULT_SPEED_OPTIONS,
  showNetFlow = true,
  endDateMax,
}) {
  return (
    <div className="timeline-bar">
      {/* Date/hour range row */}
      <div className="timeline-bar__range-group">
        <div className="timeline-bar__row timeline-bar__range">
          <label className="timeline-bar__label">日期</label>
          <input type="date" value={startDate} max={maxDate}
            onChange={(e) => onStartDateChange(e.target.value)} />
          <span className="timeline-bar__separator">～</span>
          <input type="date" value={endDate} min={startDate} max={endDateMax ?? maxDate}
            onChange={(e) => onEndDateChange(e.target.value)} />
        </div>
        <div className="timeline-bar__row timeline-bar__range">
          <label className="timeline-bar__label">時</label>
          <select value={startHour} onChange={(e) => onStartHourChange(Number(e.target.value))}>
            {HOURS.map((h) => <option key={h} value={h}>{pad(h)}:00</option>)}
          </select>
          <span className="timeline-bar__separator">～</span>
          <select value={endHour} onChange={(e) => onEndHourChange(Number(e.target.value))}>
            {HOURS.map((h) => <option key={h} value={h}>{pad(h)}:00</option>)}
          </select>
        </div>
      </div>

      {/* Playback row */}
      <div className="timeline-bar__row">
        <button className="timeline-bar__play" onClick={onPlayPause} title={isPlaying ? '暫停' : '播放'}>
          {isPlaying ? '⏸' : '▶'}
        </button>

        <input
          type="range" min={0} max={Math.max(0, totalSlots - 1)} step={1} value={currentSlot}
          onChange={(e) => onSlotChange(Number(e.target.value))}
          className="timeline-bar__slider"
        />
        <span className="timeline-bar__hour">
          {currentDate} {currentTimeStr ?? `${pad(currentHour)}:00`}
        </span>
      </div>

      {/* Meta row */}
      <div className="timeline-bar__row timeline-bar__row--meta">
        <div className="timeline-bar__speeds">
          {speedOptions.map((s) => (
            <button
              key={s}
              className={`timeline-bar__speed${speed === s ? ' timeline-bar__speed--active' : ''}`}
              onClick={() => onSpeedChange(s)}
            >{s}s</button>
          ))}
        </div>
        {showNetFlow && (
          <label className="timeline-bar__net-label">
            <input type="checkbox" checked={netFlow} onChange={onToggleNetFlow} />
            淨人流量
            <span className="timeline-bar__net-info" data-tooltip="同一站對雙向流量互相抵銷，只顯示淨差值方向（A→B 300、B→A 100 → 顯示 A→B 200）">ⓘ</span>
          </label>
        )}
        <span className="timeline-bar__total">
          {loading ? '載入中…' : error ? '資料錯誤' : `${totalPassengers.toLocaleString()} 人次`}
        </span>
      </div>
    </div>
  );
}
