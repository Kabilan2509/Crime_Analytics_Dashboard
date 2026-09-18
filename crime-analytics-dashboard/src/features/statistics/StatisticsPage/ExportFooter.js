import React, { useState, useEffect } from 'react';
import { Download, Printer, AlertTriangle, X, RotateCcw, Lightbulb } from 'lucide-react';
import { useSecurity } from '../../../context/SecurityContext';
import { downloadCsv, downloadExcel, downloadPdf } from '../../../utils/fileExports';
import { getSecureCaseViews } from '../../../security/securityUtils';

function ExportFooter({
  filteredCases,
  filterSummary = 'All Records',
  summaryData = {},
  calculatedKPIs = {},
  onExportPDF,
  onResetFilters
}) {
  const { session } = useSecurity();
  const refreshTime = new Date().toLocaleTimeString();
  const [showNoDataModal, setShowNoDataModal] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showNoDataModal) {
        setShowNoDataModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNoDataModal]);

  const hasNoData = !filteredCases || filteredCases.length === 0;

  // 1. CSV -> Complete Case Intelligence Report
  const getReportData = () => {
    if (hasNoData) {
      setShowNoDataModal(true);
      return null;
    }

    const headers = [
      'Case ID',
      'Crime No',
      'FIR Registration Date',
      'District',
      'Police Station',
      'Crime Category',
      'Offence Classification',
      'Case Status',
      'Severity',
      'Investigating Officer'
    ];

    const exportCases = getSecureCaseViews(filteredCases, session?.accessLevel);
    const rows = exportCases.map(c => [
      c.CaseMasterID,
      c.displayCrimeNo,
      c.CrimeRegisteredDate,
      c.districtName,
      c.policeStationName,
      c.majorHeadName,
      c.minorHeadName,
      c.statusName,
      c.isHeinous ? 'Heinous' : 'Non-Heinous',
      c.displayOfficerName
    ]);

    return { headers, rows };
  };

  const exportToCSV = () => {
    const data = getReportData();
    if (data) {
      downloadCsv(`ksp-crime-report-${new Date().toISOString().slice(0, 10)}.csv`, data.headers, data.rows);
    }
  };

  // Helper for generating visual ASCII data bars for Excel
  const generateDataBar = (pct) => {
    const num = Math.min(100, Math.max(0, Math.round(Number(pct) || 0)));
    const filled = Math.round((num / 100) * 16);
    const empty = 16 - filled;
    return `${'█'.repeat(filled)}${'░'.repeat(empty)}  ${num}%`;
  };

  // 2. Excel -> Statistics and Visual Data Bars in Excel
  const getStatisticsAndBarsData = () => {
    if (hasNoData) {
      setShowNoDataModal(true);
      return null;
    }

    const total = filteredCases.length || 1;
    const heinousCount = filteredCases.filter(c => c.isHeinous).length;
    const heinousPct = Math.round((heinousCount / total) * 100);

    const solvedStatuses = new Set(['Charge Sheeted', 'Closed', 'Convicted']);
    const solvedCount = filteredCases.filter(c => solvedStatuses.has(c.statusName)).length;
    const clearanceRate = Math.round((solvedCount / total) * 100);

    const csCount = filteredCases.filter(c => c.statusName === 'Charge Sheeted').length;
    const csRate = Math.round((csCount / total) * 100);

    const arrestCount = filteredCases.filter(c => c.arrests && c.arrests.length > 0).length;
    const arrestRate = Math.round((arrestCount / total) * 100);

    // Category aggregation
    const catMap = {};
    filteredCases.forEach(c => {
      const name = c.majorHeadName || 'General Offences';
      catMap[name] = (catMap[name] || 0) + 1;
    });
    const categories = Object.entries(catMap)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);

    // District aggregation
    const distMap = {};
    filteredCases.forEach(c => {
      const name = c.districtName || 'Jurisdiction';
      distMap[name] = (distMap[name] || 0) + 1;
    });
    const districtsList = Object.entries(distMap)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);

    // Status aggregation
    const statusMap = {};
    filteredCases.forEach(c => {
      const name = c.statusName || 'Under Investigation';
      statusMap[name] = (statusMap[name] || 0) + 1;
    });
    const statusList = Object.entries(statusMap)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);

    const headers = ['Classification / Section', 'Parameter / Entity', 'Recorded Volume', 'Percentage Share (%)', 'Visual Data Bar'];
    const rows = [
      ['KEY PERFORMANCE INDICATORS', 'Total FIRs Registered', total, '100%', generateDataBar(100)],
      ['KEY PERFORMANCE INDICATORS', 'Heinous Offences', heinousCount, `${heinousPct}%`, generateDataBar(heinousPct)],
      ['KEY PERFORMANCE INDICATORS', 'Case Clearance Rate', `${clearanceRate}%`, `${clearanceRate}%`, generateDataBar(clearanceRate)],
      ['KEY PERFORMANCE INDICATORS', 'Chargesheets Filed', csCount, `${csRate}%`, generateDataBar(csRate)],
      ['KEY PERFORMANCE INDICATORS', 'Arrest Efficiency', arrestCount, `${arrestRate}%`, generateDataBar(arrestRate)],
      ['', '', '', '', ''],
      ['--- CRIME CATEGORIES ---', '---', '---', '---', '---'],
      ...categories.map(cat => ['CRIME CATEGORY', cat.name, cat.count, `${cat.pct}%`, generateDataBar(cat.pct)]),
      ['', '', '', '', ''],
      ['--- DISTRICT JURISDICTION ---', '---', '---', '---', '---'],
      ...districtsList.slice(0, 15).map(d => ['DISTRICT VOLUME', d.name, d.count, `${d.pct}%`, generateDataBar(d.pct)]),
      ['', '', '', '', ''],
      ['--- DISPOSAL STATUS ---', '---', '---', '---', '---'],
      ...statusList.map(s => ['CASE STATUS', s.name, s.count, `${s.pct}%`, generateDataBar(s.pct)])
    ];

    return { headers, rows };
  };

  const exportToExcel = () => {
    const data = getStatisticsAndBarsData();
    if (data) {
      downloadExcel(`ksp-crime-statistics-and-bars-${new Date().toISOString().slice(0, 10)}.xls`, 'Statistics & Bars', data.headers, data.rows);
    }
  };

  // 3. PDF -> Crime Statistics Briefing Dossier
  const handlePrintPDF = () => {
    if (hasNoData) {
      setShowNoDataModal(true);
      return;
    }
    if (onExportPDF) {
      onExportPDF();
      return;
    }

    const total = filteredCases.length || 1;
    const heinousCount = filteredCases.filter(c => c.isHeinous).length;
    const heinousPct = Math.round((heinousCount / total) * 100);
    const solvedStatuses = new Set(['Charge Sheeted', 'Closed', 'Convicted']);
    const solvedCount = filteredCases.filter(c => solvedStatuses.has(c.statusName)).length;
    const clearanceRate = Math.round((solvedCount / total) * 100);
    const csCount = filteredCases.filter(c => c.statusName === 'Charge Sheeted').length;
    const csRate = Math.round((csCount / total) * 100);
    const arrestCount = filteredCases.filter(c => c.arrests && c.arrests.length > 0).length;
    const arrestRate = Math.round((arrestCount / total) * 100);

    const catMap = {};
    filteredCases.forEach(c => {
      const name = c.majorHeadName || 'General';
      catMap[name] = (catMap[name] || 0) + 1;
    });
    const categories = Object.entries(catMap)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);

    const distMap = {};
    filteredCases.forEach(c => {
      const name = c.districtName || 'Unknown';
      distMap[name] = (distMap[name] || 0) + 1;
    });
    const topDistricts = Object.entries(distMap)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    downloadPdf(
      `ksp-crime-statistics-${new Date().toISOString().slice(0, 10)}.pdf`,
      'KSP Official Crime Statistics Dossier',
      {
        orientation: 'portrait',
        metadata: [
          { label: 'Applied Scope', value: filterSummary },
          { label: 'Total Matching Cases', value: String(filteredCases.length) },
          { label: 'Export Authorized By', value: session?.officerName || 'Command Officer' },
          { label: 'Generation Date', value: new Date().toLocaleString('en-IN') }
        ],
        sections: [
          {
            heading: 'Key Crime & Performance Indicators',
            table: {
              headers: ['Performance Metric', 'Recorded Value', 'Benchmark / Target', 'Departmental Assessment'],
              rows: [
                ['Total Cases Registered', String(total), 'Baseline Caseload', 'Active Data'],
                ['Heinous Crime Volume', `${heinousCount} (${heinousPct}%)`, '< 20% Caseload', heinousPct > 20 ? 'Action Required' : 'Controlled'],
                ['Case Clearance Rate', `${clearanceRate}%`, '45% Statutory Target', clearanceRate >= 45 ? 'Optimal' : 'Needs Disposal'],
                ['Chargesheet Filing Rate', `${csRate}%`, '50% Filing Target', csRate >= 50 ? 'Compliant' : 'Accelerate CS'],
                ['Apprehension (Arrest) Efficiency', `${arrestRate}%`, '35% Efficiency Target', arrestRate >= 35 ? 'High Efficiency' : 'Standard']
              ]
            }
          },
          {
            heading: 'Crime Categories Statistics Breakdown',
            table: {
              headers: ['Crime Category', 'Incidents Count', 'Caseload Share (%)', 'Severity Tier'],
              rows: categories.slice(0, 8).map(c => [
                c.name,
                String(c.count),
                `${c.pct}%`,
                c.pct >= 25 ? 'High Concentration' : 'Standard'
              ])
            }
          },
          {
            heading: 'Jurisdiction District Caseload Statistics',
            table: {
              headers: ['District Jurisdiction', 'Incident Volume', 'Regional Caseload Share (%)'],
              rows: topDistricts.map(d => [d.name, String(d.count), `${d.pct}%`])
            }
          }
        ]
      }
    );
  };

  const userName = session && session.officerName ? session.officerName : 'DGP Kishore, IPS';
  const userRole = session && session.role ? session.role : 'State DGP Command';

  return (
    <>
      <div className="stats-footer-container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: '0 0 20px',
        padding: '14px 18px',
        background: 'var(--bg-panel)',
        border: hasNoData ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid var(--border-color)',
        borderLeft: hasNoData ? '4px solid #ef4444' : '4px solid var(--accent-primary)',
        flexWrap: 'wrap',
        gap: '16px',
        transition: 'all 0.25s ease'
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Crime Intelligence & Statistics Export</span>
            {hasNoData && (
              <span style={{
                background: 'rgba(239, 68, 68, 0.14)',
                color: '#ef4444',
                fontSize: '10px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                letterSpacing: '0.4px'
              }}>
                NO DATA FOUND
              </span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: hasNoData ? '#ef4444' : 'var(--text-muted)' }}>
            {hasNoData
              ? `0 matching records · ${filterSummary} (Adjust filters to enable file export)`
              : `${filteredCases.length.toLocaleString()} matching records · ${filterSummary}`}
          </div>
        </div>

        {/* On-screen notification banner in RED when no records match */}
        {hasNoData && (
          <div 
            onClick={() => setShowNoDataModal(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1.5px dashed rgba(239, 68, 68, 0.5)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '11px',
              cursor: 'pointer'
            }}
            title="Click to view details and recommendations"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} strokeWidth={1.5} style={{ color: 'var(--accent-danger)', flexShrink: 0 }} />
              <span style={{ color: '#ef4444', fontWeight: 600 }}>
                <strong>No records found:</strong> No case records match your current filter parameters. Broaden your search or reset filters to generate an export.
              </span>
            </div>
            <span style={{ color: '#ef4444', fontWeight: 800, textDecoration: 'underline', whiteSpace: 'nowrap', fontSize: '11px' }}>
              View Details →
            </span>
          </div>
        )}

        {/* Export Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* CSV -> Report */}
          <button
            type="button"
            onClick={exportToCSV}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: 'var(--bg-panel-alt)',
              border: hasNoData ? '1px dashed rgba(239, 68, 68, 0.5)' : '1px solid var(--border-color)',
              color: hasNoData ? 'var(--text-secondary)' : 'var(--text-primary)',
              opacity: hasNoData ? 0.75 : 1,
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
            className="stats-btn"
            title={hasNoData ? "Click to view reason why export is unavailable" : "Download complete case records intelligence report as CSV"}
          >
            <Download size={16} strokeWidth={1.5} />
            <span>Download Report (CSV)</span>
          </button>

          {/* Excel -> Statistics & Bars */}
          <button
            type="button"
            onClick={exportToExcel}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: 'var(--bg-panel-alt)',
              border: hasNoData ? '1px dashed rgba(239, 68, 68, 0.5)' : '1px solid var(--border-color)',
              color: hasNoData ? 'var(--text-secondary)' : 'var(--text-primary)',
              opacity: hasNoData ? 0.75 : 1,
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
            className="stats-btn"
            title={hasNoData ? "Click to view reason why export is unavailable" : "Download crime statistics summary with visual data bars as Excel"}
          >
            <Download size={16} strokeWidth={1.5} />
            <span>Download Statistics & Bars (Excel)</span>
          </button>

          {/* PDF -> Statistics */}
          <button
            type="button"
            onClick={handlePrintPDF}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: 'var(--bg-panel-alt)',
              border: hasNoData ? '1px dashed rgba(239, 68, 68, 0.5)' : '1px solid var(--border-color)',
              color: hasNoData ? 'var(--text-secondary)' : 'var(--text-primary)',
              opacity: hasNoData ? 0.75 : 1,
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
            className="stats-btn"
            title={hasNoData ? "Click to view reason why export is unavailable" : "Download official executive crime statistics briefing dossier as PDF"}
          >
            <Printer size={16} strokeWidth={1.5} />
            <span>Export Statistics (PDF)</span>
          </button>
        </div>

        {/* Metadata / Logged in Credentials */}
        <div style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          textAlign: 'right'
        }}>
          Data updated as of {refreshTime} · Generated by <strong>{userName}</strong> ({userRole})
        </div>

        <style>{`
          .stats-btn:hover {
            border-color: var(--accent-primary) !important;
            color: var(--accent-primary) !important;
          }
        `}</style>
      </div>

      {/* Pop-up Dialog Box when no data is available to export (Styled in RED) */}
      {showNoDataModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="no-data-export-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setShowNoDataModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '500px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderTop: '4px solid #ef4444',
              borderRadius: '10px',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.45)',
              padding: '24px',
              color: 'var(--text-primary)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle size={18} strokeWidth={1.5} style={{ color: 'var(--accent-danger)', flexShrink: 0 }} />
                <div>
                  <h3 id="no-data-export-title" style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#ef4444' }}>
                    No Data Available to Export
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Karnataka State Police · Statistics Console</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNoDataModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex'
                }}
                aria-label="Close modal"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              background: 'var(--bg-panel-alt)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '16px',
              fontSize: '12px',
              lineHeight: '1.5'
            }}>
              <div style={{ fontWeight: 700, marginBottom: '6px', color: '#ef4444' }}>
                0 Matching FIR Case Records Found
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                The active filter parameters currently match zero case records:
                <div style={{
                  margin: '8px 0',
                  padding: '8px 10px',
                  background: 'var(--bg-panel)',
                  borderRadius: '5px',
                  fontWeight: 600,
                  fontSize: '11px',
                  color: '#ef4444',
                  border: '1px dashed rgba(239, 68, 68, 0.4)'
                }}>
                  {filterSummary}
                </div>
                Because there are no records in the active dataset, CSV case reports, Excel workbooks with data bars, and PDF statistics dossiers cannot be generated.
              </div>
            </div>

            {/* Recommendations */}
            <div style={{
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
              marginBottom: '22px',
              lineHeight: '1.5',
              padding: '0 2px'
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Lightbulb size={16} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
                <strong>How to resolve:</strong>
              </span>
              <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                <li>Expand or change your date range (e.g., select <em>This Year</em> or <em>All Records</em>).</li>
                <li>Switch the jurisdiction filter back to <em>All Districts</em>.</li>
                <li>Clear specific crime sub-heads or severity toggles in the filter bar above.</li>
              </ul>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {onResetFilters && (
                <button
                  type="button"
                  onClick={() => {
                    onResetFilters();
                    setShowNoDataModal(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RotateCcw size={16} strokeWidth={1.5} />
                  <span>Reset All Filters</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowNoDataModal(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  background: 'var(--bg-panel-alt)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ExportFooter;
