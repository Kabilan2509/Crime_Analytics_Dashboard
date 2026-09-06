import React, { useState, useEffect } from 'react';
import { MdFileDownload, MdPrint, MdWarningAmber, MdClose, MdRestartAlt } from 'react-icons/md';
import { useSecurity } from '../../../context/SecurityContext';
import { downloadCsv, downloadExcel, downloadPdf } from '../../../utils/fileExports';
import { getSecureCaseViews } from '../../../security/securityUtils';

function ExportFooter({ filteredCases, filterSummary = 'All Records', onExportPDF, onResetFilters }) {
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

  const getExportData = () => {
    if (hasNoData) {
      setShowNoDataModal(true);
      return null;
    }

    const headers = [
      'CaseMasterID',
      'CrimeNo',
      'RegisteredDate',
      'DistrictName',
      'PoliceStationName',
      'MajorHeadName',
      'MinorHeadName',
      'CaseStatus',
      'Severity',
      'InvestigatingOfficer'
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
    const data = getExportData();
    if (data) downloadCsv(`ksp-filtered-cases-${new Date().toISOString().slice(0, 10)}.csv`, data.headers, data.rows);
  };

  const exportToExcel = () => {
    const data = getExportData();
    if (data) downloadExcel(`ksp-filtered-cases-${new Date().toISOString().slice(0, 10)}.xls`, 'Filtered Cases', data.headers, data.rows);
  };

  const handlePrintPDF = () => {
    if (hasNoData) {
      setShowNoDataModal(true);
      return;
    }
    if (onExportPDF) {
      onExportPDF();
    } else {
      const data = getExportData();
      if (data) downloadPdf(`ksp-filtered-cases-${new Date().toISOString().slice(0, 10)}.pdf`, 'KSP Filtered Crime Case Export', {
        orientation: 'landscape',
        metadata: [
          { label: 'Applied filters', value: filterSummary },
          { label: 'Matching cases', value: data.rows.length },
          { label: 'Exported by', value: session?.officerName || 'Authorized dashboard user' },
        ],
        sections: [{ heading: 'Filtered Case Records', table: { headers: data.headers, rows: data.rows } }],
      });
    }
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
        border: hasNoData ? '1px solid rgba(234, 88, 12, 0.4)' : '1px solid var(--border-color)',
        borderLeft: hasNoData ? '4px solid #ea580c' : '4px solid var(--accent-primary)',
        flexWrap: 'wrap',
        gap: '16px',
        transition: 'all 0.25s ease'
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Filtered Case Export</span>
            {hasNoData && (
              <span style={{
                background: 'rgba(234, 88, 12, 0.14)',
                color: '#ea580c',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(234, 88, 12, 0.3)'
              }}>
                NO EXPORT DATA
              </span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: hasNoData ? '#ea580c' : 'var(--text-muted)' }}>
            {hasNoData
              ? `0 matching cases · ${filterSummary} (Adjust filters to enable file export)`
              : `${filteredCases.length.toLocaleString()} matching cases · ${filterSummary}`}
          </div>
        </div>

        {/* On-screen notification banner when no records match */}
        {hasNoData && (
          <div 
            onClick={() => setShowNoDataModal(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '8px 12px',
              background: 'rgba(234, 88, 12, 0.08)',
              border: '1px dashed rgba(234, 88, 12, 0.35)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '11px',
              cursor: 'pointer'
            }}
            title="Click to view details and recommendations"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MdWarningAmber size={18} style={{ color: '#ea580c', flexShrink: 0 }} />
              <span>
                <strong>Export notice:</strong> No case records match your current filter parameters. Broaden your search or reset filters to generate an export.
              </span>
            </div>
            <span style={{ color: '#ea580c', fontWeight: 700, textDecoration: 'underline', whiteSpace: 'nowrap', fontSize: '10.5px' }}>
              View Details →
            </span>
          </div>
        )}

        {/* Export Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={exportToCSV}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: 'var(--bg-panel-alt)',
              border: hasNoData ? '1px dashed rgba(234, 88, 12, 0.45)' : '1px solid var(--border-color)',
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
            title={hasNoData ? "Click to view reason why export is unavailable" : "Download filtered records as CSV"}
          >
            <MdFileDownload size={16} />
            <span>Download CSV</span>
          </button>

          <button
            type="button"
            onClick={exportToExcel}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: 'var(--bg-panel-alt)',
              border: hasNoData ? '1px dashed rgba(234, 88, 12, 0.45)' : '1px solid var(--border-color)',
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
            title={hasNoData ? "Click to view reason why export is unavailable" : "Download filtered records as Excel"}
          >
            <MdFileDownload size={16} />
            <span>Download Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrintPDF}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: 'var(--bg-panel-alt)',
              border: hasNoData ? '1px dashed rgba(234, 88, 12, 0.45)' : '1px solid var(--border-color)',
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
            title={hasNoData ? "Click to view reason why export is unavailable" : "Export filtered report as PDF"}
          >
            <MdPrint size={16} />
            <span>Export PDF</span>
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

      {/* Pop-up Dialog Box when no data is available to export */}
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
              borderTop: '4px solid #ea580c',
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
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: 'rgba(234, 88, 12, 0.12)',
                  color: '#ea580c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <MdWarningAmber size={24} />
                </div>
                <div>
                  <h3 id="no-data-export-title" style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
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
                <MdClose size={20} />
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
              <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                0 Matching FIR Case Records Found
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                The active filter parameters currently match zero case records:
                <div style={{
                  margin: '8px 0',
                  padding: '8px 10px',
                  background: 'var(--bg-panel)',
                  borderRadius: '5px',
                  fontFamily: 'Consolas, monospace',
                  fontWeight: 600,
                  fontSize: '11px',
                  color: 'var(--accent-primary)',
                  border: '1px dashed var(--border-color)'
                }}>
                  {filterSummary}
                </div>
                Because there are no records in the active dataset, CSV spreadsheets, Excel workbooks, and PDF dossiers cannot be generated.
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
              💡 <strong>How to resolve:</strong>
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
                    background: 'var(--accent-primary)',
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
                  <MdRestartAlt size={16} />
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
