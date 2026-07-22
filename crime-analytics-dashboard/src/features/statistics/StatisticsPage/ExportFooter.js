import React from 'react';
import { MdFileDownload, MdPrint } from 'react-icons/md';
import { useSecurity } from '../../../context/SecurityContext';
import { downloadCsv, downloadExcel, downloadPdf } from '../../../utils/fileExports';

function ExportFooter({ filteredCases, filterSummary = 'All Records', onExportPDF }) {
  const { session } = useSecurity();
  const refreshTime = new Date().toLocaleTimeString();

  const getExportData = () => {
    if (!filteredCases || filteredCases.length === 0) {
      alert('No data available to export.');
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

    const rows = filteredCases.map(c => [
      c.CaseMasterID,
      c.CrimeNo,
      c.CrimeRegisteredDate,
      c.districtName,
      c.policeStationName,
      c.majorHeadName,
      c.minorHeadName,
      c.statusName,
      c.isHeinous ? 'Heinous' : 'Non-Heinous',
      c.officerName
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
    if (onExportPDF) {
      onExportPDF();
    } else {
      const data = getExportData();
      if (data) downloadPdf(`ksp-filtered-cases-${new Date().toISOString().slice(0, 10)}.pdf`, 'KSP Filtered Crime Case Export', [
        `Applied filters: ${filterSummary}`,
        `Matching cases: ${data.rows.length}`,
        '',
        data.headers.join(' | '),
        ...data.rows.map(row => row.join(' | '))
      ]);
    }
  };

  const userName = session && session.officerName ? session.officerName : 'DGP Kishore, IPS';
  const userRole = session && session.role ? session.role : 'State DGP Command';

  return (
    <div className="stats-footer-container" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      margin: '0 0 20px',
      padding: '14px 18px',
      background: 'var(--bg-panel)',
      border: '1px solid var(--border-color)',
      borderLeft: '4px solid var(--accent-primary)',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '3px' }}>
          Filtered Case Export
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {filteredCases?.length || 0} matching cases · {filterSummary}
        </div>
      </div>

      {/* Export Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={exportToCSV}
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            background: 'var(--bg-panel-alt)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
          className="stats-btn"
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
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
          className="stats-btn"
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
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
          className="stats-btn"
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
  );
}

export default ExportFooter;
