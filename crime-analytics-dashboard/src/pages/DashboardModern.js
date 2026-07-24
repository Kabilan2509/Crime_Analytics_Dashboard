import React, { useEffect, useMemo, useState } from 'react';
import {
  MdArrowForward, MdCheckCircle, MdGavel, MdOutlineShield,
  MdPendingActions, MdTrendingUp, MdWarningAmber,
} from 'react-icons/md';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { useSecurity } from '../context/SecurityContext';
import KarnatakaMap from '../features/dashboard/KarnatakaMap';
import { getCaseViews } from '../services/dataService';
import { buildDashboardViewModel, filterDashboardCases } from '../features/dashboard/dashboardUtils';
import './DashboardModern.css';

const STAT_ICONS = [MdOutlineShield, MdGavel, MdCheckCircle, MdPendingActions];
const STAT_TONES = ['blue', 'red', 'green', 'amber'];

function DashboardTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="md-tooltip">
      <strong>{label}</strong>
      {payload.map(item => (
        <span key={item.dataKey} style={{ color: item.color }}>{item.name}: {Number(item.value).toLocaleString()}</span>
      ))}
    </div>
  );
}

function Panel({ eyebrow, title, action, children, className = '' }) {
  return (
    <section className={`md-panel ${className}`}>
      <header className="md-panel-head">
        <div>
          {eyebrow && <span>{eyebrow}</span>}
          <h3>{title}</h3>
        </div>
        {action}
      </header>
      <div className="md-panel-body">{children}</div>
    </section>
  );
}

function DashboardModern({
  selectedDistrict = 'all', setSelectedDistrict,
  selectedCrimeType = 'all', searchQuery = '', dateRange = 'all',
}) {
  const { session } = useSecurity();
  const [cases, setCases] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;
    getCaseViews()
      .then(rows => mounted && setCases(rows))
      .catch(error => mounted && setLoadError(error.message || 'Unable to load operational data'));
    return () => { mounted = false; };
  }, []);

  const filteredCases = useMemo(() => filterDashboardCases({
    cases, selectedDistrict, selectedCrimeType, searchQuery, dateRange,
  }), [cases, selectedDistrict, selectedCrimeType, searchQuery, dateRange]);

  const data = useMemo(
    () => buildDashboardViewModel(filteredCases, session.accessLevel),
    [filteredCases, session.accessLevel],
  );

  return (
    <div className="md-dashboard">
      <div className="md-page-heading">
        <div>
          <span className="md-page-kicker">State Operations Centre</span>
          <h2>Crime Intelligence Overview</h2>
          <p>Live operational picture across Karnataka police districts</p>
        </div>
        <div className="md-system-state"><i /> All systems operational</div>
      </div>

      {loadError && <div className="md-error" role="alert">{loadError}</div>}

      <section className="md-stats" aria-label="Operational statistics">
        {data.opsStats.condensedStats.map((stat, index) => {
          const Icon = STAT_ICONS[index] || MdOutlineShield;
          const tone = STAT_TONES[index] || 'blue';
          return (
            <article className={`md-stat md-stat-${tone}`} key={stat.label}>
              <div className="md-stat-icon"><Icon /></div>
              <div className="md-stat-copy">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.caption}</small>
              </div>
              <MdTrendingUp className="md-stat-trend" />
            </article>
          );
        })}
      </section>

      <div className="md-top-grid">
        <Panel eyebrow="Geospatial intelligence" title="Karnataka crime density" className="md-map-panel"
          action={<span className="md-live"><i /> Live</span>}>
          <KarnatakaMap cases={filteredCases} selectedDistrict={selectedDistrict} setSelectedDistrict={setSelectedDistrict} />
        </Panel>

        <Panel eyebrow="January–December 2024" title="Monthly crime and resolution trend" className="md-trend-panel">
          <div className="md-chart-legend">
            <span><i className="blue" /> FIRs</span><span><i className="green" /> Chargesheets</span><span><i className="amber" /> Arrests</span>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthlyTrend} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="mdFirs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3777c8" stopOpacity=".2" /><stop offset="1" stopColor="#3777c8" stopOpacity=".01" /></linearGradient>
              </defs>
              <CartesianGrid stroke="#e8edf4" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8592a5', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8592a5', fontSize: 11 }} />
              <Tooltip content={<DashboardTooltip />} />
              <Area type="monotone" dataKey="firs" name="FIRs" stroke="#3777c8" strokeWidth={2} fill="url(#mdFirs)" />
              <Area type="monotone" dataKey="chargesheets" name="Chargesheets" stroke="#16a36f" strokeWidth={1.6} fill="transparent" />
              <Area type="monotone" dataKey="arrests" name="Arrests" stroke="#e19a25" strokeWidth={1.4} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="md-bottom-grid">
        <Panel eyebrow="Case classification" title="Crime by category" className="md-category-panel">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.crimeDistribution.slice(0, 7)} layout="vertical" margin={{ top: 3, right: 12, left: 2, bottom: 0 }}>
              <CartesianGrid stroke="#edf1f6" horizontal={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8a97a9', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={126} axisLine={false} tickLine={false} tick={{ fill: '#526278', fontSize: 10 }} />
              <Tooltip content={<DashboardTooltip />} />
              <Bar dataKey="value" name="Cases" radius={[0, 3, 3, 0]} barSize={8}>
                {data.crimeDistribution.slice(0, 7).map((item, index) => <Cell key={item.name} fill={index === 0 ? '#173f78' : index < 4 ? '#3777c8' : '#e19a25'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel eyebrow="Live case registry" title="Recent serious cases" className="md-cases-panel"
          action={<Link to="/cases" className="md-text-link">View all <MdArrowForward /></Link>}>
          <div className="md-table-wrap">
            <table className="md-table">
              <thead><tr><th>Crime no.</th><th>District / station</th><th>Offence</th><th>Status</th></tr></thead>
              <tbody>
                {data.recentSeriousFIRs.slice(0, 6).map(item => (
                  <tr key={item.id}>
                    <td><Link to={item.actionUrl}>{item.crimeNoDisplay}</Link></td>
                    <td>{item.station}</td><td>{item.category}</td>
                    <td><span className={`md-status ${item.status === 'Closed' ? 'closed' : 'active'}`}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel eyebrow="Realtime intelligence" title="Active alerts" className="md-alerts-panel"
          action={<span className="md-new-count">{data.alerts.length} new</span>}>
          <div className="md-alert-list">
            {data.alerts.slice(0, 5).map(alert => (
              <article className={`md-alert md-alert-${alert.severity}`} key={alert.id}>
                <MdWarningAmber />
                <div><p>{alert.text}</p><time>{alert.age}</time></div>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default DashboardModern;
