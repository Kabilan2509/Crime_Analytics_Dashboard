import React, { useMemo, useState, useEffect } from 'react';
import {
  Calendar, Pause, Play, RotateCcw,
  SkipForward, SkipBack, Activity, ChevronUp, ChevronDown,
} from 'lucide-react';

const MAX_INDEX = 30;

function TimelineControls({
  startIndex, setStartIndex, endIndex, setEndIndex,
  isPlaying, setIsPlaying, histogram = [], theme,
  minDate, maxDate, visibleCount = 0,
}) {
  const [activePreset, setActivePreset] = useState('all');
  const [hoverInfo, setHoverInfo] = useState(null);
  const [collapsed, setCollapsed] = useState(true);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (isPlaying) {
      setCollapsed(true);
    }
  }, [isPlaying]);

  const minTime = minDate ? new Date(minDate).getTime() : new Date('2024-01-01').getTime();
  const maxTime = maxDate ? new Date(maxDate).getTime() : new Date('2026-07-01').getTime();
  const span = Math.max(1, maxTime - minTime);
  const dateAt = index => new Date(minTime + span * (index / MAX_INDEX));
  const formatDate = (index, long = false) => dateAt(index).toLocaleDateString('en-IN', long
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : { month: 'short', year: '2-digit' });

  const startLabel = formatDate(startIndex, true);
  const endLabel = formatDate(endIndex, true);
  const maxCount = Math.max(1, ...histogram);
  const selectedCount = useMemo(
    () => histogram.reduce((sum, count, index) => index >= startIndex && index <= endIndex ? sum + count : sum, 0),
    [histogram, startIndex, endIndex],
  );
  const startPct = (startIndex / MAX_INDEX) * 100;
  const endPct = (endIndex / MAX_INDEX) * 100;

  const setRange = (start, end, preset = 'custom') => {
    setStartIndex(Math.max(0, Math.min(start, MAX_INDEX)));
    setEndIndex(Math.max(0, Math.min(end, MAX_INDEX)));
    setActivePreset(preset);
    setIsPlaying(false);
  };

  const presets = [
    { key: 'latest', label: 'Latest month', start: 30, end: 30 },
    { key: '3m', label: 'Last 3 months', start: 28, end: 30 },
    { key: '6m', label: 'Last 6 months', start: 25, end: 30 },
    { key: '12m', label: 'Last 12 months', start: 19, end: 30 },
    { key: 'all', label: 'All records', start: 0, end: 30 },
  ];

  const shiftWindow = direction => {
    const width = endIndex - startIndex;
    if (direction < 0 && startIndex > 0) setRange(startIndex - 1, endIndex - 1);
    if (direction > 0 && endIndex < MAX_INDEX) setRange(startIndex + 1, startIndex + 1 + width);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (endIndex === MAX_INDEX) {
      const width = startIndex === 0 ? 3 : endIndex - startIndex;
      setStartIndex(0);
      setEndIndex(Math.min(MAX_INDEX, width));
      setActivePreset('custom');
    }
    setIsPlaying(true);
    setCollapsed(true);
  };

  const handleHover = event => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const index = Math.round(pct * MAX_INDEX);
    setHoverInfo({ left: pct * 100, index, count: histogram[index] || 0 });
  };

  const handleKey = (target, event) => {
    if (!['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const delta = ['ArrowLeft', 'ArrowDown'].includes(event.key) ? -1 : 1;
    const step = event.shiftKey ? 3 : 1;
    if (target === 'start') setStartIndex(value => Math.max(0, Math.min(endIndex, value + delta * step)));
    else setEndIndex(value => Math.max(startIndex, Math.min(MAX_INDEX, value + delta * step)));
    setActivePreset('custom');
    setIsPlaying(false);
  };

  const panelBg = isDark ? 'rgba(10, 20, 34, 0.96)' : 'rgba(255, 255, 255, 0.97)';
  const subtleBg = isDark ? 'rgba(255,255,255,0.055)' : 'rgba(15,23,42,0.045)';
  const border = isDark ? 'rgba(148, 177, 207, 0.23)' : 'rgba(15, 23, 42, 0.16)';

  if (collapsed) {
    return (
      <section aria-label="Collapsed GIS timeline" style={{
        position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)', zIndex: 1010,
        display: 'flex', alignItems: 'center', gap: 8, maxWidth: 'calc(100% - 32px)',
        padding: '8px 12px', borderRadius: 10, background: panelBg, border: `1px solid ${border}`,
        boxShadow: '0 8px 28px rgba(0,0,0,.32)', backdropFilter: 'blur(12px)',
        color: 'var(--text-primary)', fontFamily: 'Consolas, monospace',
      }}>
        <Activity size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
        <button type="button" className="compact-timeline-btn" onClick={() => shiftWindow(-1)} disabled={startIndex === 0} title="Previous time window"><SkipBack size={16} strokeWidth={1.5} /></button>
        <button type="button" className="compact-timeline-btn compact-primary" onClick={togglePlayback} title={isPlaying ? 'Pause timeline' : 'Play timeline'}>
          {isPlaying ? <Pause size={16} strokeWidth={1.5} /> : <Play size={16} strokeWidth={1.5} />}<span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>
        <button type="button" className="compact-timeline-btn" onClick={() => shiftWindow(1)} disabled={endIndex === MAX_INDEX} title="Next time window"><SkipForward size={16} strokeWidth={1.5} /></button>
        <button type="button" className="compact-timeline-btn" onClick={() => setRange(0, 30, 'all')} title="Reset timeline"><RotateCcw size={16} strokeWidth={1.5} /></button>
        <div style={{ minWidth: 170, padding: '0 10px', borderLeft: `1px solid ${border}`, borderRight: `1px solid ${border}` }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap' }}>{formatDate(startIndex)} - {formatDate(endIndex)}</div>
          <div style={{ marginTop: 2, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{visibleCount.toLocaleString()} visible cases</div>
        </div>
        <button type="button" className="compact-timeline-btn compact-expand" onClick={() => setCollapsed(false)} title="Expand timeline">
          <ChevronUp size={16} strokeWidth={1.5} /><span>Timeline</span>
        </button>
        <style>{`
          .compact-timeline-btn{display:flex;align-items:center;justify-content:center;gap:4px;height:30px;min-width:30px;padding:0 8px;border:1px solid ${border};border-radius:6px;background:${subtleBg};color:var(--text-primary);cursor:pointer;transition:all .15s ease}.compact-timeline-btn:hover{filter:brightness(1.1)}.compact-timeline-btn:disabled{opacity:.3;cursor:not-allowed}.compact-timeline-btn span{font:700 11px Consolas,monospace}.compact-primary{padding:0 12px;background:#2563eb;border-color:#3b82f6;color:#fff}.compact-expand{color:#93c5fd}
          @media(max-width:620px){.compact-timeline-btn span,.compact-timeline-btn.compact-expand span{display:none}.compact-timeline-btn{padding:0 6px}.compact-timeline-btn+div{min-width:115px!important}.compact-timeline-btn+div div{max-width:115px;overflow:hidden;text-overflow:ellipsis}}
        `}</style>
      </section>
    );
  }

  return (
    <section className="gis-timeline" aria-label="GIS intelligence timeline" style={{
      position: 'absolute', left: 16, right: 16, bottom: 14, zIndex: 1010,
      color: 'var(--text-primary)', background: panelBg, border: `1px solid ${border}`,
      borderRadius: 12, boxShadow: '0 12px 36px rgba(0,0,0,0.32)', backdropFilter: 'blur(12px)',
      padding: '12px 16px 14px', fontFamily: 'Consolas, monospace', boxSizing: 'border-box',
    }}>
      <div className="gis-timeline-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Activity size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>Temporal Intelligence</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>Drag either handle to refine the GIS incident window</div>
          </div>
        </div>
        <div className="gis-timeline-summary">
          <div>
            <span>Selected window</span>
            <strong style={{ fontSize: 14 }}>{startLabel} - {endLabel}</strong>
          </div>
          <div>
            <span>Visible cases</span>
            <strong style={{ fontSize: 16, color: '#38bdf8' }}>{visibleCount.toLocaleString()}</strong>
          </div>
          <div>
            <span>Window incidents</span>
            <strong style={{ fontSize: 16, color: '#f59e0b' }}>{selectedCount.toLocaleString()}</strong>
          </div>
          <span className={`gis-play-state ${isPlaying ? 'active' : ''}`}>{isPlaying ? 'Playing' : 'Paused'}</span>
          <button type="button" onClick={() => setCollapsed(true)} title="Collapse timeline" style={{
            display: 'flex', alignItems: 'center', gap: 4, height: 30, padding: '0 10px',
            border: `1px solid ${border}`, borderRadius: 6, background: subtleBg,
            color: 'var(--text-primary)', font: '700 11px Consolas, monospace', cursor: 'pointer',
          }}><ChevronDown size={16} strokeWidth={1.5} /> Collapse</button>
        </div>
      </div>

      <div className="gis-presets" aria-label="Timeline presets">
        <Calendar size={16} strokeWidth={1.5} />
        {presets.map(preset => (
          <button key={preset.key} type="button" className={activePreset === preset.key ? 'active' : ''}
            onClick={() => setRange(preset.start, preset.end, preset.key)}>{preset.label}</button>
        ))}
      </div>

      <div className="gis-timeline-main">
        <div className="gis-playback" style={{ background: subtleBg, borderColor: border }}>
          <button type="button" onClick={() => shiftWindow(-1)} disabled={startIndex === 0} title="Move window backward"><SkipBack size={16} strokeWidth={1.5} /></button>
          <button type="button" className="primary" onClick={togglePlayback} title={isPlaying ? 'Pause timeline' : 'Play timeline'}>
            {isPlaying ? <Pause size={16} strokeWidth={1.5} /> : <Play size={16} strokeWidth={1.5} />}<span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button type="button" onClick={() => shiftWindow(1)} disabled={endIndex === MAX_INDEX} title="Move window forward"><SkipForward size={16} strokeWidth={1.5} /></button>
          <button type="button" onClick={() => setRange(0, 30, 'all')} title="Reset timeline"><RotateCcw size={16} strokeWidth={1.5} /></button>
        </div>

        <div className="gis-track-area" onMouseMove={handleHover} onMouseLeave={() => setHoverInfo(null)}>
          {hoverInfo && (
            <div className="gis-hover" style={{ left: `${hoverInfo.left}%` }}>
              <strong>{formatDate(hoverInfo.index)}</strong><span>{hoverInfo.count} cases</span>
            </div>
          )}
          <div className="gis-histogram" aria-hidden="true">
            {histogram.map((count, index) => {
              const selected = index >= startIndex && index <= endIndex;
              return <div key={index} className={selected ? 'selected' : ''} style={{ height: `${Math.max(6, (count / maxCount) * 100)}%` }} />;
            })}
          </div>
          <div className="gis-track">
            <div className="gis-track-selection" style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }} />
          </div>
          <div className="gis-handle-label" style={{ left: `${startPct}%` }}>{formatDate(startIndex)}</div>
          <div className="gis-handle-label" style={{ left: `${endPct}%` }}>{formatDate(endIndex)}</div>
          <input className="gis-range" type="range" min="0" max="30" value={startIndex}
            aria-label="Timeline start month" onKeyDown={event => handleKey('start', event)}
            onChange={event => { setStartIndex(Math.min(Number(event.target.value), endIndex)); setActivePreset('custom'); setIsPlaying(false); }} />
          <input className="gis-range" type="range" min="0" max="30" value={endIndex}
            aria-label="Timeline end month" onKeyDown={event => handleKey('end', event)}
            onChange={event => { setEndIndex(Math.max(Number(event.target.value), startIndex)); setActivePreset('custom'); setIsPlaying(false); }} />
          <div className="gis-axis"><span>{formatDate(0)}</span><span>{formatDate(10)}</span><span>{formatDate(20)}</span><span>{formatDate(30)}</span></div>
        </div>
      </div>

      <style>{`
        .gis-timeline-head,.gis-timeline-summary,.gis-presets,.gis-timeline-main,.gis-playback{display:flex;align-items:center}
        .gis-timeline-head{justify-content:space-between;gap:18px;margin-bottom:12px;flex-wrap:wrap}.gis-timeline-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:8px;background:rgba(59,130,246,.14);color:#60a5fa}
        .gis-timeline-summary{gap:20px;flex-wrap:wrap;align-items:center}.gis-timeline-summary>div{display:flex;flex-direction:column;gap:3px;min-width:90px}.gis-timeline-summary span{font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.06em;font-weight:700}.gis-timeline-summary strong{font-size:15px;font-weight:800;white-space:nowrap;color:var(--text-primary)}.gis-play-state{padding:5px 12px;border-radius:99px;font-size:11px;font-weight:700;background:rgba(148,163,184,.14)}.gis-play-state.active{color:#86efac;background:rgba(34,197,94,.16)}
        .gis-presets{gap:6px;margin-bottom:8px;color:var(--text-muted)}.gis-presets button{border:1px solid ${border};background:${subtleBg};color:var(--text-secondary);padding:4px 9px;border-radius:99px;font:600 9px Consolas,monospace;cursor:pointer}.gis-presets button:hover,.gis-presets button.active{border-color:#3b82f6;color:#fff;background:#2563eb}
        .gis-timeline-main{gap:14px}.gis-playback{gap:5px;border:1px solid;padding:5px;border-radius:8px;flex-shrink:0}.gis-playback button{display:flex;align-items:center;justify-content:center;gap:3px;min-width:28px;height:28px;border:1px solid ${border};border-radius:6px;background:${subtleBg};color:var(--text-primary);cursor:pointer}.gis-playback button:disabled{opacity:.3;cursor:not-allowed}.gis-playback button.primary{padding:0 10px;background:#2563eb;border-color:#3b82f6;color:#fff}.gis-playback button span{font:700 9px Consolas,monospace}
        .gis-track-area{position:relative;flex:1;height:67px;min-width:180px}.gis-histogram{position:absolute;left:0;right:0;top:0;height:34px;display:flex;align-items:flex-end;gap:2px}.gis-histogram div{flex:1;background:rgba(148,163,184,.2);border-radius:2px 2px 0 0;transition:height .2s,background .15s}.gis-histogram div.selected{background:linear-gradient(#60a5fa,#2563eb)}
        .gis-track{position:absolute;left:0;right:0;top:38px;height:6px;border-radius:4px;background:rgba(148,163,184,.25)}.gis-track-selection{position:absolute;height:100%;border-radius:4px;background:#3b82f6;box-shadow:0 0 12px rgba(59,130,246,.45)}.gis-handle-label{position:absolute;top:22px;transform:translateX(-50%);z-index:4;padding:2px 5px;border-radius:4px;background:#1d4ed8;color:#fff;font-size:8px;white-space:nowrap;pointer-events:none}
        .gis-range{position:absolute;left:0;right:0;top:29px;width:100%;height:24px;margin:0;appearance:none;background:transparent;pointer-events:none;z-index:5}.gis-range::-webkit-slider-thumb{appearance:none;pointer-events:auto;width:18px;height:18px;border-radius:50%;background:#fff;border:3px solid #2563eb;box-shadow:0 2px 8px rgba(0,0,0,.45);cursor:grab}.gis-range::-moz-range-thumb{pointer-events:auto;width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid #2563eb;box-shadow:0 2px 8px rgba(0,0,0,.45);cursor:grab}.gis-range:focus-visible::-webkit-slider-thumb{outline:3px solid rgba(96,165,250,.45)}
        .gis-axis{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;color:var(--text-muted);font-size:8px}.gis-hover{position:absolute;top:-31px;transform:translateX(-50%);z-index:20;display:flex;flex-direction:column;padding:4px 7px;border:1px solid #3b82f6;border-radius:5px;background:#0f172a;color:#fff;pointer-events:none;white-space:nowrap}.gis-hover strong{font-size:9px}.gis-hover span{font-size:8px;color:#bfdbfe}
        @media(max-width:900px){.gis-timeline-head{align-items:flex-start}.gis-timeline-main{align-items:flex-start;flex-direction:column}.gis-playback{align-self:stretch;justify-content:center}.gis-track-area{width:100%}.gis-presets{overflow-x:auto;padding-bottom:2px}.gis-presets button{white-space:nowrap}}
        @media(max-width:600px){.gis-timeline{left:8px!important;right:8px!important;bottom:8px!important;padding:10px!important}.gis-timeline-summary>div:first-child{display:none}.gis-timeline-head>div:first-child>div>div:last-child{display:none}}
      `}</style>
    </section>
  );
}

export default TimelineControls;
