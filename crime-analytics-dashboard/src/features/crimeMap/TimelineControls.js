import React, { useMemo } from 'react';
import { MdPlayArrow, MdPause, MdSkipNext, MdSkipPrevious } from 'react-icons/md';

/**
 * TimelineControls — Compressed dual-range playback controller with volume sparkline
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
      const size = endIndex - startIndex;
      setStartIndex(startIndex - 1);
      setEndIndex(endIndex - 1);
    }
  };

  const handleNext = () => {
    if (endIndex < 30) {
      setStartIndex(startIndex + 1);
      setEndIndex(endIndex + 1);
    }
  };

  // Theme-sensitive styling parameters
  const isDark = theme === 'dark';
  const overlayBg = isDark ? 'rgba(20, 33, 50, 0.9)' : 'rgba(255, 255, 255, 0.95)';
  const overlayBorder = isDark ? '1px solid rgba(173, 193, 214, 0.16)' : '1px solid rgba(15, 23, 42, 0.12)';
  const btnBg = isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.9)';

  return (
    <div 
      className="map-timeline"
      style={{
        position: 'absolute',
        bottom: '15px',
        left: '15px',
        right: '15px',
        zIndex: 1010,
        background: overlayBg,
        backdropFilter: 'blur(6px)',
        border: overlayBorder,
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        borderRadius: '8px',
        padding: '8px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        boxSizing: 'border-box',
        height: '74px' // Compressed footprint
      }}
    >
      {/* Row 1: Sparkline Histogram (10px height) */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'flex-end', 
          height: '12px', 
          gap: '1px', 
          padding: '0 8px', 
          boxSizing: 'border-box',
          width: '100%'
        }}
      >
        {histogram.map((count, i) => {
          const heightPct = (count / maxCount) * 100;
          const inRange = i >= startIndex && i <= endIndex;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${heightPct}%`,
                background: inRange ? 'var(--accent-primary, #3b82f6)' : 'rgba(148, 163, 184, 0.25)',
                transition: 'background 120ms',
                borderRadius: '1px'
              }}
            />
          );
        })}
      </div>

      {/* Row 2: Playback + Track + Label centered horizontally */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flex: 1 }}>
        {/* Playback Controls (Left) */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handlePrev}
            disabled={startIndex === 0}
            style={{ 
              background: btnBg, 
              border: '1px solid var(--border-color)', 
              borderRadius: '4px',
              color: 'var(--text-primary)',
              padding: '4px',
              cursor: 'pointer',
              opacity: startIndex === 0 ? 0.4 : 1,
              minHeight: '26px',
              minWidth: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
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
              padding: '4px 6px',
              cursor: 'pointer',
              minHeight: '26px',
              minWidth: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isPlaying ? <MdPause size={16} /> : <MdPlayArrow size={16} />}
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
              padding: '4px',
              cursor: 'pointer',
              opacity: endIndex === 30 ? 0.4 : 1,
              minHeight: '26px',
              minWidth: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Step Forward"
          >
            <MdSkipNext size={14} />
          </button>
        </div>

        {/* Dual Slider Track (Center) */}
        <div style={{ flex: 1, position: 'relative', height: '24px', margin: '0 6px' }}>
          {/* Underlay Range Track Bar */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: '9px', height: '4px', backgroundColor: 'rgba(148, 163, 184, 0.2)', borderRadius: '2px' }}>
            <div 
              style={{ 
                position: 'absolute', 
                left: `${startPct}%`, 
                width: `${endPct - startPct}%`, 
                height: '100%', 
                backgroundColor: 'var(--accent-primary, #3b82f6)', 
                borderRadius: '2px' 
              }} 
            />
          </div>

          {/* Segmented Ticks */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: '8px', display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
            {new Array(31).fill(0).map((_, i) => (
              <div 
                key={i} 
                style={{ 
                  width: '1px', 
                  height: '6px', 
                  backgroundColor: i >= startIndex && i <= endIndex ? 'var(--accent-primary, #3b82f6)' : 'rgba(148, 163, 184, 0.3)' 
                }} 
              />
            ))}
          </div>

          {/* Double Range Sliders Overlay */}
          <input 
            type="range" 
            min="0" 
            max="30" 
            value={startIndex} 
            onChange={e => {
              const val = Math.min(Number(e.target.value), endIndex - 1);
              setStartIndex(val);
            }}
            style={{
              position: 'absolute',
              width: '100%',
              pointerEvents: 'none',
              background: 'none',
              appearance: 'none',
              zIndex: startIndex > 15 ? 5 : 4,
              outline: 'none',
              margin: 0,
              top: '1px'
            }}
          />
          <input 
            type="range" 
            min="0" 
            max="30" 
            value={endIndex} 
            onChange={e => {
              const val = Math.max(Number(e.target.value), startIndex + 1);
              setEndIndex(val);
            }}
            style={{
              position: 'absolute',
              width: '100%',
              pointerEvents: 'none',
              background: 'none',
              appearance: 'none',
              zIndex: startIndex > 15 ? 4 : 5,
              outline: 'none',
              margin: 0,
              top: '1px'
            }}
          />

          {/* Inline Ticks/Year Labels positioned directly below the ticks */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: '-10px', display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'var(--text-muted)' }}>
            <span>2024</span>
            <span style={{ marginLeft: `${(12/30)*100}%`, transform: 'translateX(-50%)' }}>2025</span>
            <span style={{ marginLeft: `${(24/30)*100}%`, transform: 'translateX(-50%)' }}>2026</span>
          </div>

          <style>{`
            input[type="range"]::-webkit-slider-thumb {
              pointer-events: auto;
              appearance: none;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: #ffffff;
              border: 2px solid var(--accent-primary, #3b82f6);
              cursor: pointer;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }
            input[type="range"]::-moz-range-thumb {
              pointer-events: auto;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: #ffffff;
              border: 2px solid var(--accent-primary, #3b82f6);
              cursor: pointer;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }
          `}</style>
        </div>

        {/* Window Range Pill (Right) */}
        <div 
          style={{ 
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '10px',
            padding: '3px 8px',
            fontSize: '9px',
            fontFamily: 'monospace',
            color: 'var(--accent-primary)',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}
        >
          WINDOW: {startLabel} - {endLabel}
        </div>
      </div>
    </div>
  );
}

export default TimelineControls;
