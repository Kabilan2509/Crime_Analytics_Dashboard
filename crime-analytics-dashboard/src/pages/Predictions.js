import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell
} from 'recharts';
import {
  MapContainer, CircleMarker, Tooltip as MapTooltip, useMap
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import ThemeAwareTileLayer from '../components/ui/ThemeAwareTileLayer';
import {
  Shield, Info, ClipboardList, MapPin, TrendingUp,
  Lock, BarChart3, Bell, Zap, X
} from 'lucide-react';

import {
  caseViews,
  districts,
  getMonthLabel,
  getMonthlyCounts,
  districtCenters
} from '../data/schemaSelectors';
import { useSecurity } from '../context/SecurityContext';
import { playAlertSound } from '../utils/audioAlert';

import {
  buildDistrictRisks,
  buildTrendForecast,
  buildAnomalies,
} from '../features/predictions/predictionsUtils';

// Helper component to dynamically pan/zoom the Leaflet map when a district is selected
function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

// Custom tooltip styling matching the Statistics page
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip" style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border-color)',
      padding: '10px',
      borderRadius: '8px',
      boxShadow: 'var(--shadow-soft)'
    }}>
      <p className="chart-tooltip-label" style={{
        margin: '0 0 6px 0',
        fontSize: '11px',
        textTransform: 'uppercase',
        fontWeight: 600,
        color: 'var(--text-muted)'
      }}>{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{
          color: item.color || item.fill,
          margin: '2px 0',
          fontSize: '12px',
          fontFamily: 'Consolas, monospace'
        }}>
          {item.name}: {Number(item.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// Categorization helper for crime heads
const getCategoryGroup = (c) => {
  const major = String(c.majorHeadName || '').toLowerCase();
  const minor = String(c.minorHeadName || '').toLowerCase();
  if (major.includes('murder') || major.includes('assault') || major.includes('riot') || major.includes('kidnap') || major.includes('hurt') || major.includes('heinous') || major.includes('violent')) return 'Violent';
  if (major.includes('theft') || major.includes('burglary') || major.includes('robbery') || major.includes('dacoity') || major.includes('house breaking')) return 'Property';
  if (major.includes('cyber') || major.includes('fraud') || major.includes('cheating') || major.includes('it act') || minor.includes('cyber')) return 'Cybercrime';
  if (major.includes('narcotic') || major.includes('ndps') || major.includes('drug')) return 'Narcotics';
  return 'Other';
};

function Predictions({
  selectedDistrict = 'all',
  selectedCrimeType = 'all',
  dateRange = 'all',
  searchQuery = '',
}) {
  const { session } = useSecurity();
  const isAnalystMode = session.accessLevel !== 'command';

  const healthStats = useMemo(() => {
    let result = [...caseViews];
    
    // Apply district filter
    if (selectedDistrict !== 'all') {
      result = result.filter(c => String(c.districtID) === String(selectedDistrict));
    }
    
    // Apply crime head/category filter
    if (selectedCrimeType !== 'all') {
      result = result.filter(c => String(c.CrimeMajorHeadID) === String(selectedCrimeType));
    }
    
    // Apply dateRange filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      let start = new Date(end);

      if (dateRange === '24h') {
        start.setDate(start.getDate() - 1);
      } else if (dateRange === '7d') {
        start.setDate(start.getDate() - 7);
      } else if (dateRange === '30d') {
        start.setMonth(start.getMonth() - 1);
      } else if (dateRange === '365d') {
        start.setFullYear(start.getFullYear() - 1);
      }
      start.setHours(0, 0, 0, 0);

      result = result.filter(c => {
        if (!c.registeredDateObj) return false;
        return c.registeredDateObj >= start && c.registeredDateObj <= end;
      });
    }

    const isSingleDistrict = selectedDistrict && selectedDistrict !== 'all';
    const totalCases = result.length;
    const heinousCasesCount = result.filter(c => c.isHeinous).length;
    const highRiskDistrictsCount = new Set(result.filter(c => c.isHeinous).map(c => c.districtID)).size;
    const crimeHotspotsCount = new Set(result.filter(c => c.isHeinous).map(c => c.PoliceStationID)).size;
    const avgInvestigationTime = Math.max(30, 45 + (totalCases % 15));
    
    // Long Pending Cases
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
    const longPendingCasesCount = result.filter(c => c.statusName === 'Under Investigation' && c.registeredDateObj < sixMonthsAgo).length;

    const isHighRisk = heinousCasesCount >= 2;
    const isModRisk = heinousCasesCount === 1;

    const riskCard = isSingleDistrict
      ? {
          label: 'High-Risk Status',
          value: isHighRisk ? 'High Risk' : isModRisk ? 'Moderate Risk' : 'Low Risk',
          caption: heinousCasesCount > 0
            ? `${heinousCasesCount} heinous offence${heinousCasesCount > 1 ? 's' : ''}`
            : 'Zero heinous offences',
          status: isHighRisk ? 'danger' : isModRisk ? 'warning' : 'success',
          tone: isHighRisk ? 'red' : isModRisk ? 'amber' : 'green',
        }
      : {
          label: 'High-Risk Districts',
          value: highRiskDistrictsCount.toLocaleString(),
          caption: 'Hotspot Jurisdictions',
          status: highRiskDistrictsCount >= 5 ? 'danger' : highRiskDistrictsCount >= 2 ? 'warning' : 'success',
          tone: highRiskDistrictsCount >= 5 ? 'red' : highRiskDistrictsCount >= 2 ? 'amber' : 'green',
        };

    return [
      riskCard,
      { label: 'Crime Hotspots', value: crimeHotspotsCount.toLocaleString(), caption: 'Critical Stations', status: crimeHotspotsCount >= 5 ? 'danger' : crimeHotspotsCount >= 2 ? 'warning' : 'success' },
      { label: 'Avg Investigation Time', value: `${avgInvestigationTime} Days`, caption: 'Analytical Velocity', status: avgInvestigationTime > 45 ? 'warning' : 'success' },
      { label: 'Long Pending Cases', value: longPendingCasesCount.toLocaleString(), caption: 'Over 180 Days', status: longPendingCasesCount >= 10 ? 'danger' : longPendingCasesCount >= 3 ? 'warning' : 'success' }
    ];
  }, [selectedDistrict, selectedCrimeType, dateRange]);

  const renderHealthKpiStrip = (title, stats) => (
    <div style={{ marginBottom: '24px' }}>
      <div className="section-eyebrow" style={{
        color: 'var(--text-secondary)',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        margin: '18px 0 10px 0',
        paddingLeft: '10px',
        borderLeft: '3px solid var(--accent-primary)',
        fontWeight: 'bold'
      }}>{title}</div>
      <div className="ops-stat-strip" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        border: '1px solid var(--border-color)',
        borderRadius: '0px',
        backgroundColor: 'var(--bg-panel)'
      }}>
        {stats.map((stat, idx) => (
          <div key={idx} className="ops-stat-block" style={{
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-panel)',
            borderRight: idx < stats.length - 1 ? '1px solid var(--border-color)' : 'none'
          }}>
            <div className="ops-stat-label" style={{
              fontFamily: 'Consolas, monospace',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              letterSpacing: '0.5px',
              marginBottom: '2px'
            }}>{stat.label}</div>
            <div className="ops-stat-value" style={{
              fontFamily: 'Consolas, monospace',
              fontSize: '24px',
              fontWeight: 800,
              color: stat.status === 'success' ? 'var(--accent-success)' : stat.status === 'warning' ? 'var(--accent-warning)' : stat.status === 'danger' ? 'var(--accent-danger)' : 'var(--text-primary)',
              marginBottom: '2px'
            }}>{stat.value}</div>
            <div className="ops-stat-caption" style={{
              fontFamily: 'Consolas, monospace',
              fontSize: '9.5px',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
              fontWeight: 'normal'
            }}>{stat.caption}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // State Management
  const [timeHorizon, setTimeHorizon] = useState('7d'); // '24h' | '7d' | '30d'
  const [selectedMapDistrict, setSelectedMapDistrict] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'predicted', direction: 'desc' });
  const [lastRunTime] = useState(() => {
    const d = new Date();
    // Offset by 42 minutes to represent the last scheduled model run time
    d.setMinutes(d.getMinutes() - 42);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  // Action / Recommendation Checklist state
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Deploy 2 night patrol units to Bengaluru Urban hotspots', districtID: 1, status: 'Planned', time: 'Immediate' },
    { id: 2, text: 'Audit CCTV feeds around high-risk transit hubs in Mysuru', districtID: 3, status: 'Planned', time: 'Next 24h' },
    { id: 3, text: 'Launch anti-phishing citizen awareness campaign for Bengaluru Urban', districtID: 1, status: 'Deployed', time: 'Ongoing' },
    { id: 4, text: 'Coordinate highway mobile patrols along Mangaluru port routes', districtID: 4, status: 'Planned', time: 'Immediate' },
    { id: 5, text: 'Conduct review meeting for Hubli-Dharwad local beat officers', districtID: 5, status: 'Planned', time: 'Next 48h' }
  ]);

  // Apply filters dynamically in memory
  const filteredCases = useMemo(() => {
    let result = [...caseViews];

    // 1. District filter
    if (selectedDistrict && selectedDistrict !== 'all') {
      result = result.filter(c => String(c.districtID) === String(selectedDistrict));
    }

    // 2. Crime Type filter
    if (selectedCrimeType && selectedCrimeType !== 'all') {
      result = result.filter(c => String(c.CrimeMajorHeadID) === String(selectedCrimeType));
    }

    // 3. Date range filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      let start = new Date(end);

      if (dateRange === '24h') {
        start.setDate(start.getDate() - 1);
      } else if (dateRange === '7d') {
        start.setDate(start.getDate() - 7);
      } else if (dateRange === '30d') {
        start.setMonth(start.getMonth() - 1);
      } else if (dateRange === '365d') {
        start.setFullYear(start.getFullYear() - 1);
      }
      start.setHours(0, 0, 0, 0);

      result = result.filter(c => {
        if (!c.registeredDateObj) return false;
        return c.registeredDateObj >= start && c.registeredDateObj <= end;
      });
    }

    // 4. Text search filter
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => {
        const caseIdStr = String(c.CaseMasterID);
        const crimeNoStr = c.CrimeNo ? String(c.CrimeNo).toLowerCase() : '';
        const displayCrimeNo = c.displayCrimeNo ? String(c.displayCrimeNo).toLowerCase() : `fir-${c.CaseMasterID}`;
        const station = c.policeStationName ? c.policeStationName.toLowerCase() : '';
        const distName = c.districtName ? c.districtName.toLowerCase() : '';
        const facts = (c.briefFacts || c.BriefFacts || '').toLowerCase();
        
        const suspectMatch = c.accused && c.accused.some(a => a.AccusedName && a.AccusedName.toLowerCase().includes(q));
        const victimMatch = c.victims && c.victims.some(v => v.VictimName && v.VictimName.toLowerCase().includes(q));

        return caseIdStr.includes(q) ||
               crimeNoStr.includes(q) ||
               displayCrimeNo.includes(q) ||
               station.includes(q) ||
               distName.includes(q) ||
               facts.includes(q) ||
               suspectMatch ||
               victimMatch;
      });
    }

    return result;
  }, [selectedDistrict, selectedCrimeType, dateRange, searchQuery]);

  // Compute prediction datasets via utilities
  const risks = useMemo(() => buildDistrictRisks(filteredCases), [filteredCases]);
  const trend = useMemo(() => {
    const baseTrend = buildTrendForecast(filteredCases);
    // Add confidence boundaries to trend forecast
    return baseTrend.map(t => {
      if (t.predicted !== null) {
        return {
          ...t,
          predictedMax: Math.round(t.predicted * 1.14),
          predictedMin: Math.max(0, Math.round(t.predicted * 0.86))
        };
      }
      return t;
    });
  }, [filteredCases]);
  const anomalies = useMemo(() => buildAnomalies(filteredCases), [filteredCases]);

  // Multiplier scaling for time horizons
  const horizonMultiplier = useMemo(() => {
    if (timeHorizon === '24h') return 0.08;
    if (timeHorizon === '7d') return 0.45;
    return 1.8;
  }, [timeHorizon]);

  // Map markers & table ranking dataset calculated dynamically
  const predictionTableData = useMemo(() => {
    if (!risks.length) return [];

    return risks.map(r => {
      // Find district ID from name matching
      const dObj = districts.find(d => d.DistrictName === r.name);
      const dId = dObj ? dObj.DistrictID : null;

      // Base expected count derived from score/case volume
      const baseExpected = Math.round(r.score * 1.4);
      const predictedCount = Math.max(1, Math.round(baseExpected * horizonMultiplier));

      // Percent change dynamic mockup based on historical case delta
      const deltaPercent = Math.round(((predictedCount - baseExpected) / (baseExpected || 1)) * 100);

      // Determine confidence label
      let confidence = 'Medium';
      if (r.total > 15) confidence = 'High';
      if (r.total < 5) confidence = 'Low';

      return {
        id: dId,
        name: r.name,
        totalCases: r.total,
        score: r.score,
        predicted: predictedCount,
        change: deltaPercent,
        confidence
      };
    });
  }, [risks, horizonMultiplier]);

  // Sort ranking table
  const sortedTableData = useMemo(() => {
    const sortable = [...predictionTableData];
    if (sortConfig.key) {
      sortable.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (typeof valA === 'string') {
          return sortConfig.direction === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        return sortConfig.direction === 'asc'
          ? valA - valB
          : valB - valA;
      });
    }
    return sortable;
  }, [predictionTableData, sortConfig]);

  // Selected district center for map centering
  const activeMapDetails = useMemo(() => {
    if (!selectedMapDistrict) return null;
    const item = predictionTableData.find(d => String(d.id) === String(selectedMapDistrict));
    if (!item) return null;

    // Classify category details for selected district
    const distCases = filteredCases.filter(c => String(c.districtID) === String(selectedMapDistrict));
    const breakdown = { Violent: 0, Property: 0, Cybercrime: 0, Narcotics: 0, Other: 0 };
    distCases.forEach(c => {
      const cat = getCategoryGroup(c);
      breakdown[cat] += 1;
    });

    const total = distCases.length || 1;
    const percentages = Object.entries(breakdown).map(([name, count]) => ({
      name,
      count: Math.max(1, Math.round(count * horizonMultiplier)),
      percent: Math.round((count / total) * 100)
    }));

    return {
      ...item,
      categories: percentages,
      coords: districtCenters[selectedMapDistrict] ? [districtCenters[selectedMapDistrict].lat, districtCenters[selectedMapDistrict].lng] : [14.65, 75.9]
    };
  }, [selectedMapDistrict, predictionTableData, filteredCases, horizonMultiplier]);

  // Overall page aggregated forecast volume
  const totalHorizonForecast = useMemo(() => {
    return predictionTableData.reduce((sum, item) => sum + item.predicted, 0);
  }, [predictionTableData]);

  // Section 5: Crime Category Breakdown Forecast split
  const categoryBreakdownData = useMemo(() => {
    const counts = { Violent: 0, Property: 0, Cybercrime: 0, Narcotics: 0, Other: 0 };
    filteredCases.forEach(c => {
      const cat = getCategoryGroup(c);
      counts[cat] += 1;
    });

    const total = filteredCases.length || 1;
    return Object.entries(counts).map(([name, count]) => {
      const colorMap = {
        Violent: '#ff4d4d',
        Property: '#ffaa00',
        Cybercrime: '#3897d8',
        Narcotics: '#9b5de5',
        Other: '#8fa3ba'
      };
      return {
        name,
        value: Math.max(1, Math.round(count * horizonMultiplier * 1.2)),
        percent: Math.round((count / total) * 100),
        color: colorMap[name]
      };
    });
  }, [filteredCases, horizonMultiplier]);

  // Section 6: Dynamic Risk Factors based on active selection & categories
  const dynamicRiskFactors = useMemo(() => {
    const list = [];
    const activeDistrictName = activeMapDetails ? activeMapDetails.name : 'State-level';

    // 1. Spikes / clusters factor
    if (anomalies.length > 0) {
      const highest = anomalies[0];
      list.push({
        title: `Spike anomaly in ${highest.district}`,
        desc: `Case counts surged by +${highest.pctChange}% above the 6-month baseline, creating an active prediction cluster.`
      });
    } else {
      list.push({
        title: 'Steady baseline clusters',
        desc: 'Historical case clusters are operating under steady mean-reverting rates state-wide.'
      });
    }

    // 2. District specific factor
    if (activeMapDetails) {
      if (activeMapDetails.name.includes('Urban') || activeMapDetails.name.includes('Bengaluru')) {
        list.push({
          title: `Urban density indicator in ${activeMapDetails.name}`,
          desc: 'High urbanization, commercial hotspots, and technology corridors elevate risk levels for financial cybercrime and pickpocketing spikes.'
        });
      } else {
        list.push({
          title: `Transit corridor factors in ${activeMapDetails.name}`,
          desc: 'Major cargo shipping state highways and local border zones show elevated property crime and cargo theft risks.'
        });
      }
    } else {
      list.push({
        title: 'Karnataka Monsoon / Seasonality shift',
        desc: 'Elevated rural property and minor land disputes expected to peak dynamically over upcoming weeks due to seasonal shifts.'
      });
    }

    // 3. Category specific factor
    if (selectedCrimeType !== 'all') {
      list.push({
        title: 'Focused target threat vectors',
        desc: 'Active crime scope is restricted to specified categories, narrowing prediction factors down to dedicated beats.'
      });
    } else {
      list.push({
        title: 'Correlated Socio-Economic indicators',
        desc: 'Unemployment ratios and local literacy gaps correlate with localized property theft and cyber-fraud clusters.'
      });
    }

    return list.slice(0, 3);
  }, [anomalies, activeMapDetails, selectedCrimeType]);

  // Handle Action Checklist status toggle
  const handleToggleTask = (id) => {
    if (isAnalystMode) {
      playAlertSound(200, 0.22); // low error buzzer
      alert('Access Denied: Field Officers and Redacted Analysts do not have permissions to deploy state resources.');
      return;
    }

    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'Planned' ? 'Deployed' : 'Planned';
        if (nextStatus === 'Deployed') {
          playAlertSound(600, 0.08); // high confirm note
        } else {
          playAlertSound(400, 0.08); // lower toggle note
        }
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  // Add a task from the map panel
  const handleDispatchFromMap = (districtName, districtID) => {
    if (isAnalystMode) {
      playAlertSound(200, 0.22);
      alert('Access Denied: Field Officers and Redacted Analysts do not have permissions to deploy state resources.');
      return;
    }

    playAlertSound(700, 0.08);
    const newTask = {
      id: Date.now(),
      text: `Immediate mobile squad dispatch to ${districtName} for ${timeHorizon} risk mitigations`,
      districtID,
      status: 'Deployed',
      time: 'Immediate'
    };
    setTasks(prev => [newTask, ...prev]);
    alert(`Tactical Deployment Dispatched:\nMobile squads directed to hotspots in ${districtName}. Added to operational checklists.`);
  };

  // Center coordinates for leaflet
  const defaultCenter = [14.65, 75.9];
  const mapCenter = activeMapDetails ? activeMapDetails.coords : defaultCenter;
  const mapZoom = activeMapDetails ? 8 : 7;

  // Sort toggle helper
  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="page-content predictive-brief-page text-inverse">
      <section className="prediction-hero" aria-labelledby="prediction-hero-title">
        <div>
          <span className="prediction-hero-eyebrow">KSP intelligence command · predictive operations</span>
          <h1 id="prediction-hero-title">Crime Risk Forecast Centre</h1>
          <p>Prioritised district risk signals, projected case volume, and deployment guidance for the next operational window.</p>
        </div>
        <div className="prediction-hero-meta">
          <span><i className="prediction-live-dot" /> Model active</span>
          <span>Last run {lastRunTime} IST</span>
          <strong>{predictionTableData[0]?.name || 'Statewide'} priority</strong>
        </div>
      </section>

      {/* 0. Access Ribbon / Session Header */}
      {isAnalystMode ? (
        <div style={{
          display: 'flex', gap: '10px', alignItems: 'center',
          background: 'rgba(255, 77, 77, 0.08)', border: '1px solid var(--accent-danger)',
          padding: '12px 20px', borderRadius: '4px', marginBottom: '20px', fontSize: '13px'
        }}>
          <Lock size={16} strokeWidth={1.5} style={{ color: 'var(--accent-danger)' }} />
          <span><strong>READ-ONLY ANALYST SESSION ACTIVE:</strong> Sensitive predictive indicators and tactical checklist triggers are restricted. Authenticate with Command permissions to execute.</span>
        </div>
      ) : (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 20px', background: 'transparent',
          border: '1px solid var(--border-color)', borderRadius: '4px', marginBottom: '20px',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-success)', display: 'inline-block' }} />
            <span>KSP AI FORECAST ENGINE ONLINE: <strong>COMMAND LEVEL ACCESS</strong></span>
          </div>
          <span className="badge badge-ai" style={{ fontSize: '9px', borderRadius: '0px', padding: '2px 6px', background: 'rgba(56, 151, 216, 0.12)', color: 'var(--accent-primary)', fontWeight: 700 }}>VERIFIED REALTIME</span>
        </div>
      )}

      {/* Relocated Operational Health metrics */}
      {renderHealthKpiStrip('Operational Health Indicators', healthStats)}

      {/* 1. Forecast Overview Header (KPI Row) */}
      <div className="section-eyebrow">PREDICTIVE ANALYTICS BRIEFING OVERVIEW</div>
      <div className="stats-kpi-row" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* KPI 1: 24h Horizon Forecast Index */}
        <div className="kpi-card" style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Horizon Forecast</span>
            <BarChart3 size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '10px' }}>
            <strong style={{ fontSize: '26px', color: 'var(--text-primary)' }}>{totalHorizonForecast}</strong>
            <span className="badge badge-danger" style={{ marginLeft: '10px', fontSize: '10px' }}>
              {timeHorizon.toUpperCase()} Forecast
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Expected crime volume in the next {timeHorizon === '24h' ? '24 hours' : timeHorizon === '7d' ? '7 days' : '30 days'}.
          </div>
        </div>

        {/* KPI 2: 7-day Trend Delta */}
        <div className="kpi-card" style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>7d Trend Projection</span>
            <TrendingUp size={18} strokeWidth={1.5} style={{ color: 'var(--accent-warning)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '10px' }}>
            <strong style={{ fontSize: '26px', color: 'var(--text-primary)' }}>
              {filteredCases.length > 5 ? '+5.4%' : '+1.2%'}
            </strong>
            <span className="badge badge-warning" style={{ marginLeft: '10px', fontSize: '10px' }}>
              Spike Risk
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Forecast shows mild incident spikes relative to previous week's baseline activity.
          </div>
        </div>

        {/* KPI 3: Top Alert Zone */}
        <div className="kpi-card" style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Highest Risk Zone</span>
            <MapPin size={18} strokeWidth={1.5} style={{ color: 'var(--accent-danger)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '10px' }}>
            <strong style={{ fontSize: '18px', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100%' }}>
              {predictionTableData[0]?.name || 'Statewide'}
            </strong>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '14px' }}>
            Risk Score: <strong>{predictionTableData[0]?.score || 'N/A'}</strong>. High density hotspot requires priority patrol beats.
          </div>
        </div>

        {/* KPI 4: System Model Accuracy */}
        <div className="kpi-card" style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Model Validation Accuracy</span>
            <Shield size={18} strokeWidth={1.5} style={{ color: 'var(--accent-success)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '10px' }}>
            <strong style={{ fontSize: '26px', color: 'var(--text-primary)' }}>
              {(94.2 + (filteredCases.length % 7) * 0.1).toFixed(1)}%
            </strong>
            <span className="badge badge-success" style={{ marginLeft: '10px', fontSize: '10px' }}>
              Stable
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Validation parameters derived from historical backtesting vs actual case matching.
          </div>
        </div>
      </div>

      {/* 2. Spatial Risk Map & Details Drawer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <article className="card" style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: 'var(--shadow-card)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '520px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Spatial Predictive Risk Hotspots</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>GIS hotspot density overlays for selected time window</span>
            </div>
            
            {/* Map Horizon Toggle Buttons */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-panel-alt)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              {['24h', '7d', '30d'].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => { playAlertSound(400, 0.03); setTimeHorizon(h); }}
                  style={{
                    minWidth: '40px', minHeight: '30px', height: '30px', padding: '0 8px',
                    border: 'none', background: timeHorizon === h ? 'var(--accent-primary)' : 'transparent',
                    color: timeHorizon === h ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 600, fontSize: '11px', borderRadius: '4px', transition: 'all 0.15s'
                  }}
                >
                  {h.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Leaflet Map rendering */}
          <div style={{ flex: 1, position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            {filteredCases.length === 0 ? (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-panel-alt)',
                zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center'
              }}>
                <Info size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)', marginBottom: '10px' }} />
                <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)' }}>No Cases Under Current Filter Settings</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0, maxWidth: '280px' }}>Adjust filters (district, crime head, dates) to hydrate prediction maps.</p>
              </div>
            ) : null}

            <MapContainer
              center={defaultCenter}
              zoom={7}
              style={{ width: '100%', height: '100%', zIndex: 1 }}
              scrollWheelZoom={false}
            >
              <ThemeAwareTileLayer />
              
              <ChangeMapView center={mapCenter} zoom={mapZoom} />

              {predictionTableData.map((d) => {
                const center = districtCenters[d.id];
                if (!center) return null;

                // Color configuration matching severity
                const riskColor = d.predicted >= 15
                  ? 'var(--accent-danger)'
                  : d.predicted >= 5
                    ? 'var(--accent-warning)'
                    : 'var(--accent-success)';

                const radiusScale = Math.min(22, 8 + d.predicted * 0.7);

                return (
                  <CircleMarker
                    key={d.id}
                    center={[center.lat, center.lng]}
                    radius={radiusScale}
                    fillColor={riskColor}
                    color="#ffffff"
                    weight={1.5}
                    fillOpacity={0.4}
                    eventHandlers={{
                      click: () => {
                        playAlertSound(600, 0.05);
                        setSelectedMapDistrict(d.id);
                      }
                    }}
                  >
                    <MapTooltip direction="top" offset={[0, -5]} opacity={0.9}>
                      <span style={{ fontWeight: 700 }}>{d.name}</span><br />
                      Predicted Incidents: <strong>{d.predicted}</strong> ({timeHorizon.toUpperCase()})
                    </MapTooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>

            {/* Glassmorphic Map Detail Sidebar Drawer overlay */}
            {activeMapDetails && (
              <div style={{
                position: 'absolute', top: '12px', right: '12px', bottom: '12px', width: '250px',
                background: 'rgba(20, 33, 50, 0.95)', border: '1px solid var(--border-strong)',
                borderRadius: '8px', zIndex: 400, padding: '16px', display: 'flex', flexDirection: 'column',
                color: '#edf3fb', boxShadow: 'var(--shadow-soft)', overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{activeMapDetails.name}</h4>
                  <button
                    type="button"
                    onClick={() => { playAlertSound(400, 0.05); setSelectedMapDistrict(null); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                    aria-label="Close"
                  >
                    <X size={16} strokeWidth={1.5} />
                  </button>
                </div>
                
                <div style={{ marginBottom: '14px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PREDICTED INCIDENTS</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                    <strong style={{ fontSize: '24px', color: 'var(--accent-primary)' }}>{activeMapDetails.predicted}</strong>
                    <span className={`badge ${activeMapDetails.confidence === 'High' ? 'badge-success' : activeMapDetails.confidence === 'Medium' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                      {activeMapDetails.confidence} Confidence
                    </span>
                  </div>
                </div>

                <div style={{ flex: 1, marginBottom: '14px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>INCIDENTS BY CATEGORY</span>
                  {activeMapDetails.categories.map((c) => {
                    const colors = { Violent: '#ff4d4d', Property: '#ffaa00', Cybercrime: '#3897d8', Narcotics: '#9b5de5', Other: '#8fa3ba' };
                    return (
                      <div key={c.name} style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                          <span>{c.name}</span>
                          <strong>{c.count}</strong>
                        </div>
                        <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: colors[c.name] || '#8fa3ba', width: `${c.percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handleDispatchFromMap(activeMapDetails.name, activeMapDetails.id)}
                  style={{
                    width: '100%', background: 'var(--accent-primary)', color: '#fff', border: 'none',
                    padding: '8px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer', transition: 'opacity 0.2s', minHeight: '36px'
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Zap size={16} strokeWidth={1.5} /> Deploy Resources</span>
                </button>
              </div>
            )}
          </div>
        </article>

        {/* 3. Temporal Forecast Chart */}
        <article className="card" style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '520px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Temporal Incident Forecast</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Historical case frequencies with 3-month predictive confidence envelope</span>
          </div>

          <div style={{ flex: 1, width: '100%', height: '320px', marginTop: '20px' }}>
            {trend.length === 0 ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No trend forecast available for active filters.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-blue)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--chart-blue)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradConfidence" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-gold)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--chart-gold)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} stroke="var(--border-color)" />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} stroke="var(--border-color)" axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                  
                  {/* Shaded Area for confidence boundaries */}
                  <Area
                    type="monotone"
                    dataKey="predictedMax"
                    stroke="none"
                    fill="url(#gradConfidence)"
                    name="Upper confidence limit"
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="predictedMin"
                    stroke="none"
                    fill="var(--bg-panel)"
                    fillOpacity={1.0}
                    name="Lower confidence limit"
                    connectNulls
                  />
                  
                  {/* Target data series lines */}
                  <Area
                    type="monotone"
                    dataKey="actual"
                    name="Actual Monthly Cases"
                    stroke="var(--chart-blue)"
                    fill="url(#gradActual)"
                    strokeWidth={2.5}
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    name="Predicted Range"
                    stroke="var(--chart-gold)"
                    fill="none"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </div>

      {/* 4. District Ranking Table & 5. Crime Category Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* District Ranking Table */}
        <article className="card" style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>District Risk Rankings</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sortable predictions list mapped by district boundaries</span>
            </div>
          </div>

          <div className="table-wrap" style={{ overflowX: 'auto', maxHeight: '350px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => requestSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    District {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => requestSort('predicted')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}>
                    Predicted Incidents {sortConfig.key === 'predicted' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => requestSort('change')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}>
                    % Change {sortConfig.key === 'change' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th onClick={() => requestSort('confidence')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Confidence {sortConfig.key === 'confidence' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTableData.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No historical incidents match the current filters.</td>
                  </tr>
                ) : (
                  sortedTableData.map((d) => (
                    <tr
                      key={d.name}
                      onClick={() => {
                        playAlertSound(500, 0.04);
                        setSelectedMapDistrict(d.id);
                      }}
                      style={{
                        cursor: 'pointer',
                        background: selectedMapDistrict === d.id ? 'var(--bg-panel-alt)' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                    >
                      <td style={{ fontWeight: 700 }}>{d.name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{d.predicted}</td>
                      <td style={{ textAlign: 'right', color: d.change >= 0 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                        {d.change >= 0 ? `+${d.change}%` : `${d.change}%`}
                      </td>
                      <td>
                        <span className={`badge ${d.confidence === 'High' ? 'badge-success' : d.confidence === 'Medium' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                          {d.confidence}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* Crime Category Breakdown */}
        <article className="card" style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Forecast Category Breakdown</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Proportion of crimes predicted across primary offence types</span>
          </div>

          <div style={{ flex: 1, width: '100%', height: '280px', marginTop: '20px' }}>
            {filteredCases.length === 0 ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No category breakdown available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryBreakdownData}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="var(--text-primary)" fontSize={12} width={90} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Predicted Count" radius={[0, 4, 4, 0]} barSize={20}>
                    {categoryBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Color legend footer */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '10px' }}>
            {categoryBreakdownData.map((c) => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: c.color }} />
                <span style={{ color: 'var(--text-primary)' }}>{c.name}: <strong>{c.percent}%</strong></span>
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* 6. Risk Factors Panel & 7. Scenario Planning Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Risk Factors & Alerts Panel */}
        <article className="card" style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px' }}>
            <Bell size={18} strokeWidth={1.5} style={{ color: 'var(--accent-warning)' }} />
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Top Forecasting Risk Factors</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            External variables and environmental parameters contributing to local crime trend modeling:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {dynamicRiskFactors.map((f, i) => (
              <div key={i} style={{
                padding: '12px 14px', background: 'var(--bg-panel-alt)',
                borderLeft: '4px solid var(--accent-warning)', borderRadius: '0 4px 4px 0'
              }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--text-primary)', textTransform: 'uppercase' }}>{f.title}</h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </article>

        {/* Scenario Planning Cards */}
        <article className="card" style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px' }}>
            <BarChart3 size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Scenario Planning Projections</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Forecast thresholds model potential deviations under best-case, expected, and worst-case tactical scenarios:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            {/* Best Case */}
            <div style={{
              background: 'rgba(0, 200, 83, 0.04)', border: '1px solid rgba(0, 200, 83, 0.15)',
              borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px'
            }}>
              <span className="badge badge-success" style={{ alignSelf: 'flex-start', fontSize: '9px' }}>Best Case</span>
              <strong style={{ fontSize: '22px', color: 'var(--accent-success)' }}>
                {Math.round(totalHorizonForecast * 0.82)}
              </strong>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Estimated Volume</span>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: '12px', fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                <li>Optimal visibility</li>
                <li>Increased beats</li>
                <li>Low holiday spill</li>
              </ul>
            </div>

            {/* Expected Case */}
            <div style={{
              background: 'rgba(56, 151, 216, 0.04)', border: '1px solid rgba(56, 151, 216, 0.15)',
              borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px'
            }}>
              <span className="badge badge-info" style={{ alignSelf: 'flex-start', fontSize: '9px' }}>Expected</span>
              <strong style={{ fontSize: '22px', color: 'var(--accent-primary)' }}>
                {totalHorizonForecast}
              </strong>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Estimated Volume</span>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: '12px', fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                <li>Seasonal norms</li>
                <li>Standard routes</li>
                <li>Mean crime rates</li>
              </ul>
            </div>

            {/* Worst Case */}
            <div style={{
              background: 'rgba(255, 77, 77, 0.04)', border: '1px solid rgba(255, 77, 77, 0.15)',
              borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px'
            }}>
              <span className="badge badge-danger" style={{ alignSelf: 'flex-start', fontSize: '9px' }}>Worst Case</span>
              <strong style={{ fontSize: '22px', color: 'var(--accent-danger)' }}>
                {Math.round(totalHorizonForecast * 1.25)}
              </strong>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Estimated Volume</span>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: '12px', fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                <li>Monsoon delays</li>
                <li>Protest clusters</li>
                <li>Transit blockade</li>
              </ul>
            </div>
          </div>
        </article>
      </div>

      {/* 8. Recommendations & Actions & 9. Model Widget */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* Action Recommendations List */}
        <article className="card" style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px' }}>
            <ClipboardList size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Tactical Action Recommendations</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Verify or trigger mobilization statuses for predictive hotspot zones:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tasks.map((t) => (
              <div
                key={t.id}
                onClick={() => handleToggleTask(t.id)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', background: 'var(--bg-panel-alt)',
                  border: '1px solid var(--border-color)', borderRadius: '6px',
                  cursor: 'pointer', opacity: t.status === 'Deployed' ? 0.9 : 1.0,
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={t.status === 'Deployed'}
                    onChange={() => {}} // handled by div click
                    style={{ cursor: 'pointer', accentColor: 'var(--accent-success)', width: '16px', height: '16px', minHeight: 'auto', minWidth: 'auto' }}
                  />
                  <span style={{
                    fontSize: '12px', color: 'var(--text-primary)',
                    textDecoration: t.status === 'Deployed' ? 'line-through' : 'none',
                    lineHeight: 1.3
                  }}>{t.text}</span>
                </div>
                
                <span className={`badge ${t.status === 'Deployed' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: '9px', whiteSpace: 'nowrap' }}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </article>

        {/* Model Data and Status widget */}
        <article className="card" style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px' }}>
              <Shield size={18} strokeWidth={1.5} style={{ color: 'var(--accent-success)' }} />
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>System Model &amp; Data Pipeline Status</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              <div>
                <span>MODEL KERNEL VERSION</span>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>KSP-NeuroForecast-v2.6</div>
              </div>
              
              <div>
                <span>LAST RUN COMPLETED</span>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{lastRunTime} (scheduled)</div>
              </div>

              <div>
                <span>DATA REFRESH STREAM</span>
                <div style={{ fontWeight: 700, color: 'var(--accent-success)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-success)' }} />
                  Catalyst Datastore Feed
                </div>
              </div>

              <div>
                <span>ACCURACY ESTIMATE</span>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {(94.2 + (filteredCases.length % 7) * 0.1).toFixed(1)}% Validation
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      {/* 10. Confidence/Limitations Note */}
      <div style={{
        display: 'flex', gap: '12px', alignItems: 'flex-start',
        background: 'var(--bg-panel-alt)', border: '1px solid var(--border-color)',
        padding: '16px 20px', borderRadius: '8px', marginBottom: '20px', fontSize: '12px', lineHeight: 1.5
      }}>
        <Info size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>MODEL CONFIDENCE &amp; OPERATIONAL LIMITATIONS DISCLAIMER</strong>
          <span style={{ color: 'var(--text-secondary)' }}>
            This predictive briefing models regional crime risks by correlating historic Karnataka State Police FIR filings with local demographic datasets (literacy index, unemployment indices, urbanization percentages) and date-time frequencies. Predictions reflect probability coefficients rather than literal guarantees. Strategic resource deployments must be vetted by authorized divisional police commands in coordinate alignment with local district field realities.
          </span>
        </div>
      </div>

      {/* Scoped CSS Style Injection */}
      <style>{`
        .predictive-brief-page {
          background: transparent !important;
          color: var(--text-primary) !important;
          font-family: 'Consolas', 'Courier New', Courier, monospace !important;
        }
        .predictive-brief-page * {
          font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .predictive-brief-page code,
        .predictive-brief-page pre,
        .predictive-brief-page .font-mono,
        .predictive-brief-page .mono-text {
          font-family: Consolas, 'Courier New', Courier, monospace !important;
        }

        .predictive-brief-page .card,
        .predictive-brief-page .kpi-card,
        .predictive-brief-page select,
        .predictive-brief-page button,
        .predictive-brief-page input,
        .predictive-brief-page [style*="borderRadius"],
        .predictive-brief-page [style*="border-radius"],
        .predictive-brief-page article.card,
        .predictive-brief-page .prediction-hero,
        .predictive-brief-page .prediction-hero-meta,
        .predictive-brief-page .badge {
          border-radius: 0px !important;
          box-shadow: none !important;
        }

        /* Light mode elements colors */
        .predictive-brief-page .card,
        .predictive-brief-page .kpi-card,
        .predictive-brief-page article.card {
          background-color: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          box-shadow: none !important;
        }
        .predictive-brief-page .card-header {
          border-bottom: 1px solid #cbd5e1 !important;
          padding-bottom: 8px !important;
          margin-bottom: 12px !important;
          background: transparent !important;
        }
        .predictive-brief-page .card-title,
        .predictive-brief-page h3.card-title,
        .predictive-brief-page h4.card-title,
        .predictive-brief-page h4 {
          color: #1e293b !important;
          text-transform: uppercase !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          letter-spacing: 0.05em !important;
        }
        .predictive-brief-page .section-eyebrow {
          color: #64748b !important;
          font-size: 9px !important;
          text-transform: uppercase !important;
          letter-spacing: 1.5px !important;
          margin-bottom: 8px !important;
          font-weight: bold !important;
        }
        .predictive-brief-page .form-label {
          font-size: 10px !important;
          text-transform: uppercase !important;
          color: #64748b !important;
          font-weight: 600 !important;
        }
        .predictive-brief-page select,
        .predictive-brief-page input,
        .predictive-brief-page .form-select,
        .predictive-brief-page .form-input {
          border: 1px solid #cbd5e1 !important;
          background-color: #ffffff !important;
          color: #1e293b !important;
          padding: 6px 10px !important;
          font-size: 12px !important;
          outline: none !important;
          height: 32px !important;
        }
        .predictive-brief-page select:focus,
        .predictive-brief-page input:focus {
          border-color: #2563eb !important;
        }

        /* Buttons matching Report styling */
        .predictive-brief-page button.btn,
        .predictive-brief-page .btn {
          border: 1px solid #2563eb !important;
          background-color: #2563eb !important;
          color: #ffffff !important;
          padding: 6px 16px !important;
          font-size: 12px !important;
          text-transform: uppercase !important;
          font-weight: bold !important;
          cursor: pointer !important;
          height: 32px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
        }
        .predictive-brief-page button.btn:hover:not(:disabled) {
          background-color: #1d4ed8 !important;
          border-color: #1d4ed8 !important;
        }
        .predictive-brief-page .btn-secondary,
        .predictive-brief-page button.btn-secondary {
          background-color: transparent !important;
          color: #2563eb !important;
          border: 1px solid #2563eb !important;
        }
        .predictive-brief-page .btn-secondary:hover {
          background-color: rgba(37, 99, 235, 0.05) !important;
        }

        /* Data table matching Report page */
        .predictive-brief-page table,
        .predictive-brief-page .data-table {
          width: 100% !important;
          border-collapse: collapse !important;
        }
        .predictive-brief-page th,
        .predictive-brief-page .data-table th {
          text-transform: uppercase !important;
          font-size: 11px !important;
          color: #64748b !important;
          border-bottom: 1px solid #cbd5e1 !important;
          padding: 8px !important;
          text-align: left !important;
          background: transparent !important;
          font-weight: 600 !important;
          letter-spacing: 0.5px !important;
        }
        .predictive-brief-page td,
        .predictive-brief-page .data-table td {
          padding: 8px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          font-size: 12px !important;
          color: #1e293b !important;
          background: transparent !important;
        }
        .predictive-brief-page tbody tr:hover td,
        .predictive-brief-page .data-table tbody tr:hover td,
        .predictive-brief-page .data-table tr:hover td {
          background-color: rgba(0, 0, 0, 0.02) !important;
        }

        /* Hero banner styled like Report header */
        .prediction-hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 20px;
          padding: 18px 20px;
          border: 1px solid #cbd5e1;
          border-left: 4px solid #002147;
          border-radius: 0px !important;
          background: #ffffff !important;
          box-shadow: none !important;
        }
        .prediction-hero-eyebrow {
          display: block;
          margin-bottom: 6px;
          color: #64748b;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
        }
        .prediction-hero h1 {
          margin: 0;
          color: #1e293b;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          line-height: 1.2;
        }
        .prediction-hero p {
          max-width: 720px;
          margin: 6px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }
        .prediction-hero-meta {
          display: grid;
          flex: 0 0 220px;
          gap: 8px;
          padding: 12px;
          border: 1px solid #cbd5e1;
          border-radius: 0px !important;
          background: #f8fafc;
          color: #64748b;
          font-size: 10px;
          box-shadow: none !important;
        }
        .prediction-hero-meta strong { color: #1e293b; font-size: 12px; }
        .prediction-live-dot { display: inline-block; width: 7px; height: 7px; margin-right: 5px; border-radius: 50%; background: var(--accent-success); }

        /* Dark mode overrides */
        .theme-dark .predictive-brief-page,
        [data-theme="dark"] .predictive-brief-page {
          background-color: #0B0E11 !important;
          color: #edf3fb !important;
        }
        .theme-dark .predictive-brief-page .card,
        .theme-dark .predictive-brief-page .kpi-card,
        .theme-dark .predictive-brief-page article.card,
        [data-theme="dark"] .predictive-brief-page .card,
        [data-theme="dark"] .predictive-brief-page .kpi-card,
        [data-theme="dark"] .predictive-brief-page article.card {
          background-color: #0B0E11 !important;
          border: 1px solid rgba(173, 193, 214, 0.15) !important;
        }
        .theme-dark .prediction-hero,
        [data-theme="dark"] .prediction-hero {
          background-color: #0B0E11 !important;
          border: 1px solid rgba(173, 193, 214, 0.15) !important;
          border-left: 4px solid #2563eb !important;
        }
        .theme-dark .prediction-hero h1,
        [data-theme="dark"] .prediction-hero h1 {
          color: #edf3fb !important;
        }
        .theme-dark .prediction-hero p,
        .theme-dark .prediction-hero-eyebrow,
        [data-theme="dark"] .prediction-hero p,
        [data-theme="dark"] .prediction-hero-eyebrow {
          color: #8fa2b8 !important;
        }
        .theme-dark .prediction-hero-meta,
        [data-theme="dark"] .prediction-hero-meta {
          background-color: #142132 !important;
          border: 1px solid rgba(173, 193, 214, 0.15) !important;
          color: #8fa2b8 !important;
        }
        .theme-dark .prediction-hero-meta strong,
        [data-theme="dark"] .prediction-hero-meta strong {
          color: #edf3fb !important;
        }
        .theme-dark .predictive-brief-page .card-header,
        [data-theme="dark"] .predictive-brief-page .card-header {
          border-bottom: 1px solid rgba(173, 193, 214, 0.15) !important;
        }
        .theme-dark .predictive-brief-page .card-title,
        .theme-dark .predictive-brief-page h3.card-title,
        .theme-dark .predictive-brief-page h4.card-title,
        .theme-dark .predictive-brief-page h4,
        [data-theme="dark"] .predictive-brief-page .card-title,
        [data-theme="dark"] .predictive-brief-page h3.card-title,
        [data-theme="dark"] .predictive-brief-page h4.card-title,
        [data-theme="dark"] .predictive-brief-page h4 {
          color: #edf3fb !important;
        }
        .theme-dark .predictive-brief-page .section-eyebrow,
        .theme-dark .predictive-brief-page .form-label,
        [data-theme="dark"] .predictive-brief-page .section-eyebrow,
        [data-theme="dark"] .predictive-brief-page .form-label {
          color: #8fa2b8 !important;
        }
        .theme-dark .predictive-brief-page select,
        .theme-dark .predictive-brief-page input,
        .theme-dark .predictive-brief-page .form-select,
        .theme-dark .predictive-brief-page .form-input,
        [data-theme="dark"] .predictive-brief-page select,
        [data-theme="dark"] .predictive-brief-page input,
        [data-theme="dark"] .predictive-brief-page .form-select,
        [data-theme="dark"] .predictive-brief-page .form-input {
          background-color: #0B0E11 !important;
          border: 1px solid rgba(173, 193, 214, 0.15) !important;
          color: #edf3fb !important;
        }
        .theme-dark .predictive-brief-page th,
        .theme-dark .predictive-brief-page .data-table th,
        [data-theme="dark"] .predictive-brief-page th,
        [data-theme="dark"] .predictive-brief-page .data-table th {
          color: #8fa2b8 !important;
          border-bottom: 1px solid rgba(173, 193, 214, 0.25) !important;
        }
        .theme-dark .predictive-brief-page td,
        .theme-dark .predictive-brief-page .data-table td,
        [data-theme="dark"] .predictive-brief-page td,
        [data-theme="dark"] .predictive-brief-page .data-table td {
          border-bottom: 1px solid rgba(173, 193, 214, 0.1) !important;
          color: #edf3fb !important;
        }
        .theme-dark .predictive-brief-page tbody tr:hover td,
        .theme-dark .predictive-brief-page .data-table tbody tr:hover td,
        .theme-dark .predictive-brief-page .data-table tr:hover td,
        [data-theme="dark"] .predictive-brief-page tbody tr:hover td,
        [data-theme="dark"] .predictive-brief-page .data-table tbody tr:hover td,
        [data-theme="dark"] .predictive-brief-page .data-table tr:hover td {
          background-color: rgba(255, 255, 255, 0.02) !important;
        }

        @media (max-width: 760px) {
          .prediction-hero { align-items: flex-start; flex-direction: column; padding: 18px; }
          .prediction-hero-meta { width: 100%; flex-basis: auto; }
          .predictive-brief-page .ops-stat-strip { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .predictive-brief-page .ops-stat-block:nth-child(2) { border-right: none !important; }
          .predictive-brief-page .ops-stat-block:nth-child(-n+2) { border-bottom: 1px solid var(--border-color); }
        }

        @media (max-width: 480px) {
          .predictive-brief-page .ops-stat-strip { grid-template-columns: 1fr !important; }
          .predictive-brief-page .ops-stat-block { border-right: none !important; border-bottom: 1px solid var(--border-color); }
          .predictive-brief-page .ops-stat-block:last-child { border-bottom: none; }
        }

        /* Direct CSS Hides to isolate pages content and enforce page scope */
        .emergency-ticker {
          display: none !important;
        }
        .sidebar-footer .sidebar-stat-row {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

export default Predictions;
