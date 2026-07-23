import React, { useState, useEffect } from 'react';
import { useSecurity } from '../../context/SecurityContext';
import { useDateFilter } from '../../context/DateFilterContext';

function useActiveTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'light');
  
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      setTheme(currentTheme);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  
  return theme;
}

export default function GrafanaPanel({
  dashboardUid,
  panelId,
  height = '220px',
  vars = {},
  children
}) {
  const theme = useActiveTheme();
  const { isCommandMode } = useSecurity();
  const { dateRange: ctxDateRange } = useDateFilter();
  
  const baseUrl = process.env.REACT_APP_GRAFANA_BASE_URL;
  const apiKey = process.env.REACT_APP_GRAFANA_API_KEY;

  // Fallback 1: If Grafana URL is not configured in the environment variables,
  // gracefully render the original children (the Recharts visualization)
  if (!baseUrl) {
    return children || (
      <div 
        className="grafana-panel-unconfigured"
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-panel-alt, #eef3f9)',
          border: '1px dashed var(--border-color, #d6dfeb)',
          color: 'var(--text-muted, #52677d)',
          fontSize: '12px',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          boxSizing: 'border-box'
        }}
      >
        <span>Grafana panel not configured</span>
      </div>
    );
  }

  // Fallback 2: Security check. If restricted mode is active (non-command access),
  // hide the panel content and render the redact warning notice card
  if (!isCommandMode) {
    return (
      <div 
        className="grafana-restricted-placeholder" 
        style={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: 'var(--bg-panel-alt, #eef3f9)', 
          border: '1px dashed var(--border-color, #d6dfeb)', 
          color: 'var(--accent-danger, #C80000)', 
          fontSize: '13px', 
          fontWeight: '600', 
          padding: '20px', 
          textAlign: 'center',
          fontFamily: 'monospace',
          boxSizing: 'border-box'
        }}
      >
        <span>Restricted — detailed analytics unavailable in current mode</span>
      </div>
    );
  }

  // Build final template variables including context date filter ranges
  const finalVars = { ...vars };
  if (!finalVars.from && ctxDateRange && ctxDateRange.start) {
    finalVars.from = ctxDateRange.start.toISOString().split('T')[0];
  }
  if (!finalVars.to && ctxDateRange && ctxDateRange.end) {
    finalVars.to = ctxDateRange.end.toISOString().split('T')[0];
  }

  // Build the embed URL based on Grafana d-solo embed spec
  let embedUrl = `${baseUrl.replace(/\/$/, '')}/d-solo/${dashboardUid}/dashboard?orgId=1&panelId=${panelId}&theme=${theme}`;

  if (apiKey) {
    embedUrl += `&key=${encodeURIComponent(apiKey)}`;
  }

  // Inject variables as dashboard parameters
  if (finalVars) {
    Object.entries(finalVars).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== 'all') {
        embedUrl += `&var-${key.toLowerCase()}=${encodeURIComponent(String(val))}`;
      }
    });
  }

  return (
    <div className="grafana-panel-wrapper" style={{ width: '100%', height, position: 'relative', overflow: 'hidden' }}>
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ display: 'block', border: 'none', background: 'transparent' }}
        title={`Grafana Panel ${panelId}`}
      />
    </div>
  );
}
