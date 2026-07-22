import React, { useMemo, useState } from 'react';
import { MdPlayArrow, MdPause, MdSkipNext, MdSkipPrevious } from 'react-icons/md';

/**
 * TimelineControls — Dual-handle timeline range slider with centered circle knobs,
 * 1:1 precision drag, keyboard navigation, live drag date badges, and separated playback.
 */
function TimelineControls({
  startIndex,
  setStartIndex,
  endIndex,
  setEndIndex,
  isPlaying,
  setIsPlaying,
  histogram = [],
  theme
}) {
  const [activePreset, setActivePreset] = useState('custom');
  const [hoverInfo, setHoverInfo] = useState(null);
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);

  const getMonthLabel = (index) => {
    const start = new Date('2024-01-01');
    start.setMonth(start.getMonth() + index);
    return start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const startLabel = useMemo(() => getMonthLabel(startIndex), [startIndex]);
  const endLabel = useMemo(() => getMonthLabel(endIndex), [endIndex]);

  const maxCount = useMemo(() => {
    return histogram.length ? Math.max(...histogram, 1) : 1;
  }, [histogram]);

  const startPct = (startIndex / 30) * 100;
  const endPct = (endIndex / 30) * 100;

  const handlePrev = () => {
    if (startIndex > 0) {
      setStartIndex(startIndex - 1);
      setEndIndex(endIndex - 1);
      setActivePreset('custom');
    }
  };

  const handleNext = () => {
    if (endIndex < 30) {
      setStartIndex(startIndex + 1);
      setEndIndex(endIndex + 1);
      setActivePreset('custom');
    }
  };

  const applyPreset = (presetKey) => {
    setActivePreset(presetKey);
    switch (presetKey) {
      case 'today':
        setStartIndex(30);
        setEndIndex(30);
        break;
      case 'last7':
        setStartIndex(29);
        setEndIndex(30);
        break;
      case 'last30':
        setStartIndex(28);
        setEndIndex(30);
        break;
      case 'quarter':
        setStartIndex(27);
        setEndIndex(30);
        break;
      case 'custom':
      default:
        setStartIndex(0);
        setEndIndex(30);
        break;
    }
  };

  const handleTrackMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const idx = Math.min(30, Math.max(0, Math.round((x / rect.width) * 30)));
    setHoverInfo({ xPct: pct, label: getMonthLabel(idx) });
  };

  const handleStartKeyDown = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const step = e.shiftKey ? 3 : 1;
      setStartIndex(prev => Math.max(0, prev - step));
      setActivePreset('custom');
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.shiftKey ? 3 : 1;
      setStartIndex(prev => Math.min(endIndex, prev + step));
      setActivePreset('custom');
    }
  };

  const handleEndKeyDown = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const step = e.shiftKey ? 3 : 1;
      setEndIndex(prev => Math.max(startIndex, prev - step));
      setActivePreset('custom');
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.shiftKey ? 3 : 1;
      setEndIndex(prev => Math.min(30, prev + step));
      setActivePreset('custom');
    }
  };

  // Theme-sensitive styling parameters
  const isDark = theme === 'dark';
  const overlayBg = isDark ? 'rgba(20, 33, 50, 0.95)' : 'rgba(255, 255, 255, 0.97)';
  const overlayBorder = isDark ? '1px solid rgba(173, 193, 214, 0.18)' : '1px solid rgba(15, 23, 42, 0.14)';
  const btnBg = isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(241, 245, 249, 0.95)';

  const presets = [
    { key: 'today', label: 'Today' },
    { key: 'last7', label: 'Last 7 Days' },
    { key: 'last30', label: 'Last 30 Days' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'custom', label: 'Custom Range' },
  ];

  return (
    <div 
      className="map-timeline"
      style={{
        position: 'absolute',
        bottom: '12px',
        left: '15px',
        right: '15px',
        zIndex: 1010,
        background: overlayBg,
        backdropFilter: 'blur(8px)',
        border: overlayBorder,
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        borderRadius: '8px',
        padding: '8px 14px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        boxSizing: 'border-box',
        color: 'var(--text-primary)',
        fontFamily: 'monospace'
      }}
    >
      {/* Header Row: Presets & Highly Visible Filter Window Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        {/* Preset Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '2px' }}>
            Presets:
          </span>
          {presets.map(p => {
            const isSelected = activePreset === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key)}
                style={{
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  border: isSelected ? '1px solid var(--accent-primary, #3b82f6)' : '1px solid var(--border-color)',
                  background: isSelected ? 'var(--accent-primary, #3b82f6)' : btnBg,
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 120ms'
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Highly Visible & Boxy Selected Window Summary Badge */}
        <div 
          style={{ 
            background: isDark ? 'rgba(15, 23, 42, 0.94)' : '#ffffff',
            border: isDark ? '1.5px solid var(--accent-primary, #3b82f6)' : '1.5px solid var(--accent-primary, #2563eb)',
            borderRadius: '4px',
            padding: '5px 14px',
            fontSize: '13px',
            fontWeight: '800',
            color: isDark ? '#ffffff' : '#0f172a',
            letterSpacing: '0.6px',
            whiteSpace: 'nowrap',
            boxShadow: isDark ? '0 3px 10px rgba(0,0,0,0.4)' : '0 3px 10px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ color: isDark ? 'var(--accent-primary, #3b82f6)' : '#2563eb', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 'bold' }}>
            FILTER WINDOW:
          </span>
          <span style={{ color: isDark ? '#ffffff' : '#0f172a', fontSize: '13px', fontWeight: '800' }}>
            {startLabel} – {endLabel}
          </span>
        </div>
      </div>

      {/* Histogram Sparkline with Month Tooltips */}
      <div 
        onMouseMove={handleTrackMouseMove}
        onMouseLeave={() => setHoverInfo(null)}
        style={{ 
          display: 'flex', 
          alignItems: 'flex-end', 
          height: '12px', 
          gap: '1px', 
          padding: '0 8px', 
          boxSizing: 'border-box',
          width: '100%',
          marginTop: '2px',
          cursor: 'pointer',
          position: 'relative'
        }}
      >
        {histogram.map((count, i) => {
          const heightPct = (count / maxCount) * 100;
          const inRange = i >= startIndex && i <= endIndex;
          const label = getMonthLabel(i);
          return (
            <div
              key={i}
              title={`${label}: ${count} incidents`}
              style={{
                flex: 1,
                height: `${heightPct}%`,
                background: inRange ? 'var(--accent-primary, #3b82f6)' : 'rgba(148, 163, 184, 0.22)',
                transition: 'background 120ms',
                borderRadius: '1px'
              }}
            />
          );
        })}
      </div>

      {/* Main Track & Playback Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative' }}>
        {/* Visually Separated Playback Controls Box (Left) */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            background: 'rgba(15, 23, 42, 0.3)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '3px 5px',
            flexShrink: 0
          }}
        >
          <button
            type="button"
            onClick={handlePrev}
            disabled={startIndex === 0}
            style={{ 
              background: btnBg, 
              border: '1px solid var(--border-color)', 
              borderRadius: '4px',
              color: 'var(--text-primary)',
              padding: '3px',
              cursor: 'pointer',
              opacity: startIndex === 0 ? 0.4 : 1,
              minHeight: '24px',
              minWidth: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none'
            }}
            title="Step Backward"
          >
            <MdSkipPrevious size={14} />
          </button>
          
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ 
              background: 'var(--accent-primary, #3b82f6)', 
              border: 'none', 
              borderRadius: '4px',
              color: '#ffffff',
              padding: '3px 8px',
              cursor: 'pointer',
              minHeight: '24px',
              minWidth: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none'
            }}
            title={isPlaying ? "Pause Playback" : "Play Timeline Animation"}
          >
            {isPlaying ? <MdPause size={14} /> : <MdPlayArrow size={14} />}
          </button>
          
          <button
            type="button"
            onClick={handleNext}
            disabled={endIndex === 30}
            style={{ 
              background: btnBg, 
              border: '1px solid var(--border-color)', 
              borderRadius: '4px',
              color: 'var(--text-primary)',
              padding: '3px',
              cursor: 'pointer',
              opacity: endIndex === 30 ? 0.4 : 1,
              minHeight: '24px',
              minWidth: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none'
            }}
            title="Step Forward"
          >
            <MdSkipNext size={14} />
          </button>
        </div>

        {/* Dual-Handle Slider Track Container (Center/Right) */}
        <div 
          onMouseMove={handleTrackMouseMove}
          onMouseLeave={() => setHoverInfo(null)}
          style={{ flex: 1, position: 'relative', height: '32px', marginTop: '2px' }}
        >
          {/* Precise Live Hover Cursor Tooltip directly tracking mouse position */}
          {hoverInfo && (
            <div 
              style={{ 
                position: 'absolute', 
                left: `${hoverInfo.xPct}%`, 
                top: '-24px', 
                transform: 'translateX(-50%)',
                background: '#0f1729',
                border: '1px solid var(--accent-primary, #3b82f6)',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: '4px',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                zIndex: 30
              }}
            >
              📅 {hoverInfo.label}
            </div>
          )}

          {/* Real-time Live Date Labels Directly Above Handles (Highlights on drag) */}
          <div 
            style={{ 
              position: 'absolute', 
              left: `${startPct}%`, 
              top: '-12px', 
              transform: 'translateX(-50%)',
              background: isDraggingStart ? '#00e676' : 'var(--accent-primary, #3b82f6)',
              color: '#ffffff',
              fontSize: '9px',
              fontWeight: 'bold',
              padding: '1px 5px',
              borderRadius: '4px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
              zIndex: 10,
              transition: 'background 120ms'
            }}
          >
            {startLabel}
          </div>

          <div 
            style={{ 
              position: 'absolute', 
              left: `${endPct}%`, 
              top: '-12px', 
              transform: 'translateX(-50%)',
              background: isDraggingEnd ? '#00e676' : 'var(--accent-primary, #3b82f6)',
              color: '#ffffff',
              fontSize: '9px',
              fontWeight: 'bold',
              padding: '1px 5px',
              borderRadius: '4px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
              zIndex: 10,
              transition: 'background 120ms'
            }}
          >
            {endLabel}
          </div>

          {/* Underlay Track Bar Line */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: '12px', height: '5px', backgroundColor: 'rgba(148, 163, 184, 0.25)', borderRadius: '3px' }}>
            <div 
              style={{ 
                position: 'absolute', 
                left: `${startPct}%`, 
                width: `${endPct - startPct}%`, 
                height: '100%', 
                backgroundColor: 'var(--accent-primary, #3b82f6)', 
                borderRadius: '3px' 
              }} 
            />
          </div>

          {/* Double Range Sliders Overlay with Circular Thumbs Centered Directly ON Track Line */}
          <input 
            type="range" 
            min="0" 
            max="30" 
            step="1"
            value={startIndex} 
            onMouseDown={() => setIsDraggingStart(true)}
            onMouseUp={() => setIsDraggingStart(false)}
            onTouchStart={() => setIsDraggingStart(true)}
            onTouchEnd={() => setIsDraggingStart(false)}
            onKeyDown={handleStartKeyDown}
            aria-label="Select timeline start date (Use left/right arrows to nudge)"
            onChange={e => {
              const val = Math.min(Number(e.target.value), endIndex);
              setStartIndex(val);
              setActivePreset('custom');
            }}
            style={{
              position: 'absolute',
              width: '100%',
              pointerEvents: 'none',
              background: 'none',
              appearance: 'none',
              zIndex: startIndex > 15 ? 8 : 7,
              outline: 'none',
              margin: 0,
              top: '5px'
            }}
          />
          <input 
            type="range" 
            min="0" 
            max="30" 
            step="1"
            value={endIndex} 
            onMouseDown={() => setIsDraggingEnd(true)}
            onMouseUp={() => setIsDraggingEnd(false)}
            onTouchStart={() => setIsDraggingEnd(true)}
            onTouchEnd={() => setIsDraggingEnd(false)}
            onKeyDown={handleEndKeyDown}
            aria-label="Select timeline end date (Use left/right arrows to nudge)"
            onChange={e => {
              const val = Math.max(Number(e.target.value), startIndex);
              setEndIndex(val);
              setActivePreset('custom');
            }}
            style={{
              position: 'absolute',
              width: '100%',
              pointerEvents: 'none',
              background: 'none',
              appearance: 'none',
              zIndex: startIndex > 15 ? 7 : 8,
              outline: 'none',
              margin: 0,
              top: '5px'
            }}
          />

          {/* Year Markers directly under track line */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: '0px', display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'var(--text-muted)' }}>
            <span>2024</span>
            <span style={{ marginLeft: `${(12/30)*100}%`, transform: 'translateX(-50%)' }}>2025</span>
            <span style={{ marginLeft: `${(24/30)*100}%`, transform: 'translateX(-50%)' }}>2026</span>
          </div>

          {/* Circular Knobs Styling Centered Directly ON Track Line with Generous Touch Target */}
          <style>{`
            input[type="range"]::-webkit-slider-thumb {
              pointer-events: auto;
              appearance: none;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #ffffff;
              border: 3px solid var(--accent-primary, #3b82f6);
              cursor: grab;
              box-shadow: 0 2px 6px rgba(0,0,0,0.45);
              transition: transform 100ms, border-color 120ms;
            }
            input[type="range"]::-webkit-slider-thumb:active {
              cursor: grabbing;
              transform: scale(1.25);
              border-color: #00e676;
            }
            input[type="range"]::-webkit-slider-thumb:focus {
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4);
            }
            input[type="range"]::-moz-range-thumb {
              pointer-events: auto;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #ffffff;
              border: 3px solid var(--accent-primary, #3b82f6);
              cursor: grab;
              box-shadow: 0 2px 6px rgba(0,0,0,0.45);
              transition: transform 100ms, border-color 120ms;
            }
            input[type="range"]::-moz-range-thumb:active {
              cursor: grabbing;
              transform: scale(1.25);
              border-color: #00e676;
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}

export default TimelineControls;
