import React from 'react';

/**
 * ChartTooltip — Shared Recharts tooltip component
 * 
 * Use as: <Tooltip content={<ChartTooltip />} />
 * Replaces the tooltip duplicated in Statistics, Predictions, Reports, Dashboard.
 */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((entry, i) => (
        <p
          key={i}
          style={{ color: entry.color || entry.fill, margin: '2px 0 0', fontSize: 12, fontWeight: 600 }}
        >
          {entry.name}: {Number(entry.value).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
}

export default ChartTooltip;
