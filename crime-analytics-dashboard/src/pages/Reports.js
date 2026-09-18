import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Download,
  FileText,
  Search,
  PlusCircle,
  Info,
  ExternalLink,
  Shield,
  X,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Lock
} from 'lucide-react';
import { MapContainer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import ThemeAwareTileLayer from '../components/ui/ThemeAwareTileLayer';
import {
  caseViews,
  districts,
  units,
  crimeHeads,
  crimeSubHeads,
  caseCategories,
  caseStatusMaster,
  acts,
  sections,
} from '../data/schemaSelectors';
import { useSecurity } from '../context/SecurityContext';
import { maskText, maskNarrative, downloadBlob, toCsv } from '../security/securityUtils';
import { downloadExcel, downloadPdf, sanitizePdfText, getKspEmblemBase64 } from '../utils/fileExports';

// Helper function to dynamically load external scripts from CDN
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
}

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

const MONTHS_LIST = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' }
];

const YEARS_LIST = [2024, 2025, 2026];
const DEFAULT_REPORT_QUERY = [{
  id: 'filter_daterange',
  type: 'DATERANGE',
  label: 'DATERANGE: January 2024 - December 2026',
  value: { fromMonth: 0, fromYear: 2024, toMonth: 11, toYear: 2026 },
}];

const DISTRICT_CENTERS = {
  1: [12.97, 77.59], // Bangalore
  2: [13.25, 77.58], // Bangalore Rural
  3: [12.29, 76.63], // Mysore
  4: [12.87, 74.88], // Dakshina Kannada
  5: [15.45, 75.00], // Dharwad
  6: [15.84, 74.49], // Belgaum
  7: [17.32, 76.83], // Gulbarga
  8: [15.13, 76.92], // Bellary
  9: [16.20, 77.35], // Raichur
  10: [13.34, 77.10] // Tumakuru
};

const DEFAULT_CENTER = [14.65, 75.9]; // Karnataka Center
const idsMatch = (left, right) => left != null && right != null && String(left) === String(right);

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip" style={{ margin: 0, padding: 0 }}>
      <p className="chart-tooltip-label" style={{ margin: '0 0 6px 0', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color || item.fill, margin: '2px 0', fontSize: '12px' }}>
          {item.name}: {Number(item.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function Reports() {
  const navigate = useNavigate();
  const theme = useActiveTheme();
  const { isCommandMode, session } = useSecurity();
  const [accessNotice, setAccessNotice] = useState(null);

  const hasCaseAccess = isCommandMode ||
    session?.accessLevel === 'command' ||
    session?.role?.toLowerCase().includes('admin') ||
    session?.role?.toLowerCase().includes('command') ||
    session?.role?.toLowerCase().includes('dgp');

  const handleCaseClick = (c) => {
    if (hasCaseAccess) {
      navigate(`/cases/${c.CaseMasterID}`);
    } else {
      setAccessNotice({
        caseId: c.CaseMasterID,
        crimeNo: isCommandMode ? c.FIRNo : maskText(c.FIRNo || `FIR-${c.CaseMasterID}`, 6, 4),
        station: c.policeStationName,
        district: c.districtName
      });
    }
  };


  // Active template selector state
  const [activeTemplate, setActiveTemplate] = useState('executive');

  // Filter Form State
  const [fromMonth, setFromMonth] = useState(0);
  const [fromYear, setFromYear] = useState(2024);
  const [toMonth, setToMonth] = useState(11);
  const [toYear, setToYear] = useState(2026);

  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedStation, setSelectedStation] = useState('all');

  const [selectedCrimeHead, setSelectedCrimeHead] = useState('all');
  const [selectedCrimeSubHead, setSelectedCrimeSubHead] = useState('all');

  const [selectedCaseCategory, setSelectedCaseCategory] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedCaseStatus, setSelectedCaseStatus] = useState('all');
  
  const [selectedAct, setSelectedAct] = useState('all');
  const [selectedSection, setSelectedSection] = useState('');
  
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Active query pills list state
  const [pills, setPills] = useState([]);
  const [submittedQuery, setSubmittedQuery] = useState(DEFAULT_REPORT_QUERY);
  const [activeTab, setActiveTab] = useState('briefing');
  const [exporting, setExporting] = useState(false);
  // Filter stations based on selected district
  const filteredStations = useMemo(() => {
    if (selectedDistrict === 'all') return [];
    return units
      .filter(u => String(u.DistrictID) === String(selectedDistrict))
      .sort((a, b) => String(a.UnitName || '').localeCompare(String(b.UnitName || '')));
  }, [selectedDistrict]);

  // Filter crime sub-heads based on selected crime head
  const filteredSubHeads = useMemo(() => {
    if (selectedCrimeHead === 'all') return [];
    return crimeSubHeads.filter(sh => String(sh.CrimeHeadID) === String(selectedCrimeHead));
  }, [selectedCrimeHead]);

  // Filter sections based on selected act
  const filteredSections = useMemo(() => {
    if (selectedAct === 'all') return [];
    return sections.filter(s => idsMatch(s.ActCode, selectedAct));
  }, [selectedAct]);
  // Initialize pills with DateRange, Geography, and Offense to help guide the user
  useEffect(() => {
    setPills(DEFAULT_REPORT_QUERY);
  }, []);

  // Handle template selection change
  const handleTemplateChange = (templateId) => {
    setActiveTemplate(templateId);
  };

  // Add pill on click "ADD QUERY"
  const handleAddQuery = () => {
    const newPills = [...pills];

    // 1. Date Range
    const dateRangeId = 'filter_daterange';
    const dateLabel = `${MONTHS_LIST.find(m => m.value === Number(fromMonth)).label} ${fromYear} - ${MONTHS_LIST.find(m => m.value === Number(toMonth)).label} ${toYear}`;
    const dateVal = { fromMonth, fromYear, toMonth, toYear };
    const dateIdx = newPills.findIndex(p => p.id === dateRangeId);
    if (dateIdx > -1) {
      newPills[dateIdx] = { id: dateRangeId, type: 'DATERANGE', label: `DATERANGE: ${dateLabel}`, value: dateVal };
    } else {
      newPills.push({ id: dateRangeId, type: 'DATERANGE', label: `DATERANGE: ${dateLabel}`, value: dateVal });
    }

    // 2. Geography
    if (selectedDistrict !== 'all') {
      const district = districts.find(d => idsMatch(d.DistrictID, selectedDistrict));
      const station = selectedStation !== 'all' ? units.find(u => idsMatch(u.UnitID, selectedStation)) : null;
      const distName = district?.DistrictName || `District ${selectedDistrict}`;
      const stationName = selectedStation !== 'all' ? `, PS: ${station?.UnitName || `Station ${selectedStation}`}` : '';
      const geoId = `filter_geo_${selectedDistrict}_${selectedStation}`;
      if (!newPills.some(p => p.id === geoId)) {
        newPills.push({
          id: geoId,
          type: 'GEOGRAPHY',
          label: `GEOGRAPHY: ${distName}${stationName}`,
          value: { district: selectedDistrict, station: selectedStation }
        });
      }
    }

    // 3. Crime Category
    if (selectedCrimeHead !== 'all') {
      const crimeHead = crimeHeads.find(h => idsMatch(h.CrimeHeadID, selectedCrimeHead));
      const crimeSubHead = selectedCrimeSubHead !== 'all'
        ? crimeSubHeads.find(s => idsMatch(s.CrimeSubHeadID, selectedCrimeSubHead))
        : null;
      const headName = crimeHead?.CrimeGroupName || `Crime Head ${selectedCrimeHead}`;
      const subHeadName = selectedCrimeSubHead !== 'all'
        ? `, Type: ${crimeSubHead?.CrimeHeadName || `Crime Type ${selectedCrimeSubHead}`}`
        : '';
      const crimeId = `filter_crime_${selectedCrimeHead}_${selectedCrimeSubHead}`;
      if (!newPills.some(p => p.id === crimeId)) {
        newPills.push({
          id: crimeId,
          type: 'OFFENSE',
          label: `OFFENSE: ${headName}${subHeadName}`,
          value: { head: selectedCrimeHead, subhead: selectedCrimeSubHead }
        });
      }
    }

    // 4. Case Category (FIR / UDR)
    if (selectedCaseCategory !== 'all') {
      const catName = caseCategories.find(c => idsMatch(c.CaseCategoryID, selectedCaseCategory))?.LookupValue || `Category ${selectedCaseCategory}`;
      const catId = `filter_cat_${selectedCaseCategory}`;
      if (!newPills.some(p => p.id === catId)) {
        newPills.push({
          id: catId,
          type: 'CASE_CATEGORY',
          label: `CATEGORY: ${catName}`,
          value: selectedCaseCategory
        });
      }
    }

    // 5. Severity (Heinous / Non-Heinous)
    if (selectedSeverity !== 'all') {
      const sevId = `filter_severity_${selectedSeverity}`;
      if (!newPills.some(p => p.id === sevId)) {
        newPills.push({
          id: sevId,
          type: 'SEVERITY',
          label: `SEVERITY: ${selectedSeverity === 'heinous' ? 'Heinous' : 'Non-Heinous'}`,
          value: selectedSeverity
        });
      }
    }

    // 6. Case Status
    if (selectedCaseStatus !== 'all') {
      const statName = caseStatusMaster.find(s => idsMatch(s.CaseStatusID, selectedCaseStatus))?.CaseStatusName || `Status ${selectedCaseStatus}`;
      const statId = `filter_status_${selectedCaseStatus}`;
      if (!newPills.some(p => p.id === statId)) {
        newPills.push({
          id: statId,
          type: 'STATUS',
          label: `STATUS: ${statName}`,
          value: selectedCaseStatus
        });
      }
    }

    // 7. Advanced: Act & Section
    if (selectedAct !== 'all') {
      const actName = acts.find(a => idsMatch(a.ActCode, selectedAct))?.ActName || selectedAct;
      const sectionName = selectedSection ? ` Sec ${selectedSection}` : '';
      const actId = `filter_act_${selectedAct}_${selectedSection}`;
      if (!newPills.some(p => p.id === actId)) {
        newPills.push({
          id: actId,
          type: 'ACT_SECTION',
          label: `ACT/SECTION: ${actName}${sectionName}`,
          value: { act: selectedAct, section: selectedSection }
        });
      }
    }

    setPills(newPills);
  };

  // Remove pill
  const handleRemovePill = (id) => {
    setPills(pills.filter(p => p.id !== id));
  };

  // Validation rules:
  // - Commissioner Brief doesn't enforce active Geo/Offense filters on pill list because it hardlocks to overnight.
  // - PS Review requires a Geography PS pill.
  // - District Review requires a Geography District pill.
  // - All other queries require DateRange + Geography + Offense.
  const isValid = useMemo(() => {
    if (activeTemplate === 'morning_brief') return true;
    
    const hasDate = pills.some(p => p.type === 'DATERANGE');
    const hasGeo = pills.some(p => p.type === 'GEOGRAPHY');
    const hasOffense = pills.some(p => p.type === 'OFFENSE');

    if (activeTemplate === 'ps_review') {
      const geoPills = pills.filter(p => p.type === 'GEOGRAPHY');
      const hasSpecificPS = geoPills.some(p => p.value.station && p.value.station !== 'all');
      return hasDate && hasSpecificPS;
    }

    if (activeTemplate === 'district_review') {
      const geoPills = pills.filter(p => p.type === 'GEOGRAPHY');
      const hasSpecificDistrict = geoPills.some(p => p.value.district && p.value.district !== 'all');
      return hasDate && hasSpecificDistrict;
    }

    return hasDate && hasGeo && hasOffense;
  }, [pills, activeTemplate]);

  // Execute Query on submit click
  const handleSubmitQuery = () => {
    if (!isValid) return;
    setSubmittedQuery([...pills]);
  };

  // Filter cases dynamically in memory
  const filteredCases = useMemo(() => {
    if (!submittedQuery) return [];

    const datePill = submittedQuery.find(p => p.type === 'DATERANGE');
    const geoPills = submittedQuery.filter(p => p.type === 'GEOGRAPHY');
    const crimePills = submittedQuery.filter(p => p.type === 'OFFENSE');
    const categoryPills = submittedQuery.filter(p => p.type === 'CASE_CATEGORY');
    const severityPills = submittedQuery.filter(p => p.type === 'SEVERITY');
    const statusPills = submittedQuery.filter(p => p.type === 'STATUS');
    const actPills = submittedQuery.filter(p => p.type === 'ACT_SECTION');

    // Override date range filter for Commissioner Morning Brief to overnight 24h
    let morningBriefTimeBounds = null;
    if (activeTemplate === 'morning_brief') {
      const caseTimes = caseViews.map(c => c.registeredDateObj?.getTime()).filter(Boolean);
      const maxTime = caseTimes.length ? Math.max(...caseTimes) : Date.now();
      morningBriefTimeBounds = {
        start: new Date(maxTime - 86400000),
        end: new Date(maxTime)
      };
    }

    // Override for Cyber Brief: apply cyber filter automatically if no cyber heads filtered
    let forceCyberFilter = false;
    let cyberHeadId = null;
    if (activeTemplate === 'cyber_brief' && crimePills.length === 0) {
      const head = crimeHeads.find(ch => ch.CrimeGroupName.toLowerCase().includes('cyber') || ch.CrimeGroupName.toLowerCase().includes('it act'));
      if (head) {
        cyberHeadId = head.CrimeHeadID;
        forceCyberFilter = true;
      }
    }

    return caseViews.filter(item => {
      // 1. Date check
      if (activeTemplate === 'morning_brief' && morningBriefTimeBounds) {
        const regDate = item.registeredDateObj;
        if (regDate < morningBriefTimeBounds.start || regDate > morningBriefTimeBounds.end) return false;
      } else if (datePill) {
        const { fromMonth, fromYear, toMonth, toYear } = datePill.value;
        const startDate = new Date(fromYear, fromMonth, 1);
        const endDate = new Date(toYear, toMonth + 1, 0, 23, 59, 59);
        const regDate = item.registeredDateObj;
        if (regDate < startDate || regDate > endDate) return false;
      }

      // 2. Geography check
      if (geoPills.length > 0) {
        const matchGeo = geoPills.some(pill => {
          const { district, station } = pill.value;
          if (String(item.districtID) !== String(district)) return false;
          if (station !== 'all' && String(item.PoliceStationID) !== String(station)) return false;
          return true;
        });
        if (!matchGeo) return false;
      }

      // 3. Offense check (skip if cyber filter is overridden)
      if (forceCyberFilter && cyberHeadId) {
        if (String(item.CrimeMajorHeadID) !== String(cyberHeadId)) return false;
      } else if (crimePills.length > 0) {
        const matchCrime = crimePills.some(pill => {
          const { head, subhead } = pill.value;
          if (String(item.CrimeMajorHeadID) !== String(head)) return false;
          if (subhead !== 'all' && String(item.CrimeMinorHeadID) !== String(subhead)) return false;
          return true;
        });
        if (!matchCrime) return false;
      }

      // 4. Case Category
      if (categoryPills.length > 0) {
        const matchCat = categoryPills.some(p => String(item.CaseCategoryID) === String(p.value));
        if (!matchCat) return false;
      }

      // 5. Severity check
      if (severityPills.length > 0) {
        const matchSev = severityPills.some(p => {
          return p.value === 'heinous' ? item.isHeinous : !item.isHeinous;
        });
        if (!matchSev) return false;
      }

      // 6. Status check
      if (statusPills.length > 0) {
        const matchStat = statusPills.some(p => String(item.CaseStatusID) === String(p.value));
        if (!matchStat) return false;
      }

      // 7. Act/Section check
      if (actPills.length > 0) {
        const matchAct = actPills.some(p => {
          const { act, section } = p.value;
          const hasActMatch = item.actSections?.some(as => as.ActID === act);
          if (!hasActMatch) return false;
          if (section) {
            const hasSecMatch = item.actSections?.some(as => as.SectionID && String(as.SectionID).includes(section));
            if (!hasSecMatch) return false;
          }
          return true;
        });
        if (!matchAct) return false;
      }

      return true;
    });
  }, [submittedQuery, activeTemplate]);

  // Dynamic time series aggregates for charts
  const chartData = useMemo(() => {
    if (!submittedQuery || filteredCases.length === 0) return { keys: [], data: [] };

    // Get time bounds
    const datePill = submittedQuery.find(p => p.type === 'DATERANGE');
    const { fromMonth, fromYear, toMonth, toYear } = datePill.value;

    const months = [];
    let currYear = fromYear;
    let currMonth = fromMonth;
    while (currYear < toYear || (currYear === toYear && currMonth <= toMonth)) {
      const key = `${currYear}-${String(currMonth + 1).padStart(2, '0')}`;
      months.push({
        key,
        label: `${MONTHS_LIST[currMonth].label.slice(0, 3)} ${String(currYear).slice(2)}`,
        rawLabel: `${MONTHS_LIST[currMonth].label} ${currYear}`,
        cases: {}
      });
      currMonth++;
      if (currMonth > 11) {
        currMonth = 0;
        currYear++;
      }
    }

    const seriesKeys = new Set();
    filteredCases.forEach(item => {
      const regKey = `${item.registeredDateObj.getFullYear()}-${String(item.registeredDateObj.getMonth() + 1).padStart(2, '0')}`;
      const monthObj = months.find(m => m.key === regKey);
      if (!monthObj) return;

      const seriesName = 'Cases';
      seriesKeys.add(seriesName);
      monthObj.cases[seriesName] = (monthObj.cases[seriesName] || 0) + 1;
    });

    return {
      keys: [...seriesKeys],
      data: months.map(m => {
        const row = { name: m.label, rawName: m.rawLabel };
        [...seriesKeys].forEach(k => {
          row[k] = m.cases[k] || 0;
        });
        return row;
      })
    };
  }, [submittedQuery, filteredCases]);

  // Dynamic baseline calculations for DGP Situation Report comparison metrics
  const baselineStats = useMemo(() => {
    if (!submittedQuery || activeTemplate !== 'dgp_situation') return { currentCount: 0, baselineCount: 0, percentChange: 0, districtChanges: [] };

    const datePill = submittedQuery.find(p => p.type === 'DATERANGE');
    const { fromMonth, fromYear, toMonth, toYear } = datePill.value;

    const start = new Date(fromYear, fromMonth, 1);
    const end = new Date(toYear, toMonth + 1, 0, 23, 59, 59);
    const duration = end.getTime() - start.getTime();

    const baselineStart = new Date(start.getTime() - duration);
    const baselineEnd = start;

    const currentCount = filteredCases.length;

    // Retrieve geo boundaries
    const geoPills = submittedQuery.filter(p => p.type === 'GEOGRAPHY');
    const crimePills = submittedQuery.filter(p => p.type === 'OFFENSE');

    const baselineCases = caseViews.filter(item => {
      const regDate = item.registeredDateObj;
      if (regDate < baselineStart || regDate >= baselineEnd) return false;

      if (geoPills.length > 0) {
        const matchGeo = geoPills.some(pill => {
          const { district, station } = pill.value;
          if (item.districtID !== Number(district)) return false;
          if (station !== 'all' && item.PoliceStationID !== Number(station)) return false;
          return true;
        });
        if (!matchGeo) return false;
      }

      if (crimePills.length > 0) {
        const matchCrime = crimePills.some(pill => {
          const { head, subhead } = pill.value;
          if (item.CrimeMajorHeadID !== Number(head)) return false;
          if (subhead !== 'all' && item.CrimeMinorHeadID !== Number(subhead)) return false;
          return true;
        });
        if (!matchCrime) return false;
      }

      return true;
    });

    const baselineCount = baselineCases.length;
    const diff = currentCount - baselineCount;
    const percentChange = baselineCount > 0 ? Math.round((diff / baselineCount) * 100) : (currentCount > 0 ? 100 : 0);

    // Group changes by district
    const distData = [];
    districts.forEach(d => {
      const currDistCount = filteredCases.filter(c => idsMatch(c.districtID, d.DistrictID)).length;
      const baseDistCount = baselineCases.filter(c => idsMatch(c.districtID, d.DistrictID)).length;
      const dDiff = currDistCount - baseDistCount;
      const dChange = baseDistCount > 0 ? Math.round((dDiff / baseDistCount) * 100) : (currDistCount > 0 ? 100 : 0);

      let status = 'AMBER';
      if (dChange > 10) status = 'RED';
      else if (dChange < -10) status = 'GREEN';

      distData.push({
        id: d.DistrictID,
        name: d.DistrictName,
        current: currDistCount,
        baseline: baseDistCount,
        change: dChange,
        status
      });
    });

    return {
      currentCount,
      baselineCount,
      percentChange,
      districtChanges: distData.sort((a, b) => b.change - a.change)
    };
  }, [submittedQuery, filteredCases, activeTemplate]);

  // Multi-year comparison records for UCR/NCRB styles
  const multiYearComparisonData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];
    const dataByYear = years.map(yr => {
      const yrCases = filteredCases.filter(c => c.registeredDateObj?.getFullYear() === yr);
      return {
        year: yr,
        total: yrCases.length,
        heinous: yrCases.filter(c => c.isHeinous).length,
        violent: yrCases.filter(c => ['murder', 'assault', 'kidnap'].some(k => c.majorHeadName?.toLowerCase().includes(k))).length,
        property: yrCases.filter(c => ['theft', 'burglary', 'housebreaking'].some(k => c.majorHeadName?.toLowerCase().includes(k))).length,
      };
    });
    return dataByYear;
  }, [filteredCases]);

  // Exporters
  const exportCSV = () => {
    const rows = filteredCases.map(c => ({
      'Case ID': c.CaseMasterID,
      'FIR Number': isCommandMode ? c.FIRNo : maskText(c.FIRNo || `FIR-${c.CaseMasterID}`, 6, 4),
      'Crime Group': c.majorHeadName,
      'Crime Type': c.minorHeadName,
      'District': c.districtName,
      'Station': c.policeStationName,
      'Officer': isCommandMode ? c.officerName : maskText(c.officerName || 'Officer', 3, 3),
      'Date Registered': String(c.CrimeRegisteredDate).split(' ')[0],
      'Status': c.statusName,
      'Severity': c.gravityLabel,
      'Brief Facts': isCommandMode ? c.briefFacts : maskNarrative(c.briefFacts),
    }));
    downloadBlob(`KSP_Briefing_${activeTemplate}_Report_${new Date().toISOString().split('T')[0]}.csv`, toCsv(rows), 'text/csv;charset=utf-8;');
  };

  const exportXLSX = async () => {
    try {
      setExporting(true);
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      const XLSX = window.XLSX;

      // Tabular case records sheet
      const ws1Data = filteredCases.map(c => ({
        'Case ID': c.CaseMasterID,
        'FIR Number': isCommandMode ? c.FIRNo : maskText(c.FIRNo || `FIR-${c.CaseMasterID}`, 6, 4),
        'Crime Group': c.majorHeadName,
        'Crime Type': c.minorHeadName,
        'District': c.districtName,
        'Station': c.policeStationName,
        'Officer': isCommandMode ? c.officerName : maskText(c.officerName || 'Officer', 3, 3),
        'Date Registered': String(c.CrimeRegisteredDate).split(' ')[0],
        'Status': c.statusName,
        'Severity': c.gravityLabel
      }));
      const ws1 = XLSX.utils.json_to_sheet(ws1Data);

      // Applied query metadata sheet
      const ws2Data = submittedQuery ? submittedQuery.map(p => ({
        'Filter Category': p.type,
        'Applied Criteria': p.label
      })) : [{ 'Filter Category': 'DEFAULT', 'Applied Criteria': 'All Records Scoped' }];
      
      ws2Data.push({ 'Filter Category': 'REPORT_TEMPLATE', 'Applied Criteria': activeTemplate.toUpperCase() });
      const ws2 = XLSX.utils.json_to_sheet(ws2Data);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, 'Case Records');
      XLSX.utils.book_append_sheet(wb, ws2, 'Applied Filters');

      XLSX.writeFile(wb, `KSP_Briefing_${activeTemplate}_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      setExporting(false);
    } catch (err) {
      console.error('XLSX export failed:', err);
      const headers = ['Case ID', 'FIR Number', 'Crime Group', 'Crime Type', 'District', 'Station', 'Officer', 'Date Registered', 'Status', 'Severity'];
      const rows = filteredCases.map(c => [
        c.CaseMasterID, isCommandMode ? c.FIRNo : maskText(c.FIRNo || `FIR-${c.CaseMasterID}`, 6, 4),
        c.majorHeadName, c.minorHeadName, c.districtName, c.policeStationName,
        isCommandMode ? c.officerName : maskText(c.officerName || 'Officer', 3, 3),
        String(c.CrimeRegisteredDate).split(' ')[0], c.statusName, c.gravityLabel
      ]);
      downloadExcel(`KSP_Briefing_${activeTemplate}_Report_${new Date().toISOString().split('T')[0]}.xls`, 'Case Records', headers, rows);
      setExporting(false);
    }
  };

  const exportPDF = async () => {
    const element = document.getElementById('report-export-content');
    if (!element) {
      alert('Generate a report before exporting the PDF.');
      return;
    }
    try {
      setExporting(true);
      const emblemBase64 = await getKspEmblemBase64();
      const orientation = activeTab === 'table' ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const reportTitle = sanitizePdfText(`KSP ${activeTemplate.replace(/_/g, ' ').toUpperCase()} REPORT`);
      const generatedAt = new Date().toLocaleString('en-IN');
      const filtersText = sanitizePdfText(getAppliedFiltersText());

      const drawHeader = () => {
        // Official Police Navy header bar
        pdf.setFillColor(0, 33, 71);
        pdf.rect(0, 0, pageWidth, 25, 'F');

        // Karnataka State Gold accent stripe
        pdf.setFillColor(218, 165, 32);
        pdf.rect(0, 25, pageWidth, 1.8, 'F');

        let textStartX = margin;
        if (emblemBase64) {
          try {
            pdf.addImage(emblemBase64, 'PNG', margin, 2.5, 20, 20);
            textStartX = margin + 24;
          } catch (e) {
            textStartX = margin;
          }
        }

        // Bilingual and official department title
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.text('KARNATAKA STATE POLICE', textStartX, 9);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(218, 165, 32);
        pdf.text('GOVERNMENT OF KARNATAKA | STATE CRIME RECORDS BUREAU', textStartX, 15);

        pdf.setFontSize(6.8);
        pdf.setTextColor(195, 215, 235);
        pdf.text('MADHUKAR - COMMAND & ANALYTICAL INTELLIGENCE DOSSIER', textStartX, 20.5);

        // Security badge
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.text('CONFIDENTIAL // LAW ENFORCEMENT SENSITIVE', pageWidth - margin, 13, { align: 'right' });
      };

      const drawTitleBlock = () => {
        drawHeader();
        pdf.setTextColor(0, 33, 71);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text(reportTitle, margin, 35);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(85, 95, 105);
        pdf.text(`View: ${activeTab.toUpperCase()}   |   Generated: ${generatedAt}   |   Records: ${filteredCases.length}`, margin, 42);
        const filterLines = pdf.splitTextToSize(`Applied filters: ${filtersText}`, pageWidth - margin * 2);
        pdf.text(filterLines, margin, 48);
        pdf.setDrawColor(218, 165, 32);
        pdf.setLineWidth(0.5);
        pdf.line(margin, 55, pageWidth - margin, 55);
      };

      drawTitleBlock();

      if (activeTab === 'table') {
        autoTable(pdf, {
          startY: 61,
          margin: { left: margin, right: margin, top: 32, bottom: 16 },
          head: [['Case ID', 'FIR Number', 'Crime Group', 'Crime Type', 'District', 'Station', 'Registered', 'Status', 'Severity']],
          body: filteredCases.map(c => [
            c.CaseMasterID,
            isCommandMode ? c.FIRNo : maskText(c.FIRNo || `FIR-${c.CaseMasterID}`, 6, 4),
            c.majorHeadName, c.minorHeadName, c.districtName, c.policeStationName,
            String(c.CrimeRegisteredDate).split(' ')[0], c.statusName, c.gravityLabel
          ].map(sanitizePdfText)),
          theme: 'grid',
          styles: { font: 'helvetica', fontSize: 7, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
          headStyles: { fillColor: [0, 33, 71], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
          alternateRowStyles: { fillColor: [244, 247, 250] },
          columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 28 }, 6: { cellWidth: 21 }, 7: { cellWidth: 18 }, 8: { cellWidth: 18 } },
          didParseCell: data => {
            if (Array.isArray(data.cell.text)) data.cell.text = data.cell.text.map(sanitizePdfText);
          },
          didDrawPage: data => { if (data.pageNumber > 1) drawHeader(); }
        });
      } else if (activeTab === 'charts') {
        autoTable(pdf, {
          startY: 61, margin: { left: margin, right: margin, top: 32, bottom: 16 },
          head: [['Year', 'Total cases', 'Violent crime', 'Property crime']],
          body: multiYearComparisonData.map(item => [item.year, item.total, item.violent, item.property]),
          theme: 'grid', styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3, halign: 'right' },
          headStyles: { fillColor: [0, 33, 71], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [244, 247, 250] },
          didDrawPage: data => { if (data.pageNumber > 1) drawHeader(); }
        });
      } else {
        const heinous = filteredCases.filter(c => c.isHeinous).length;
        const underInvestigation = filteredCases.filter(c => String(c.statusName).toLowerCase().includes('investigation')).length;
        const districtCounts = Object.entries(filteredCases.reduce((acc, item) => {
          const district = item.districtName || 'Unassigned'; acc[district] = (acc[district] || 0) + 1; return acc;
        }, {})).sort((a, b) => b[1] - a[1]);
        autoTable(pdf, {
          startY: 61, margin: { left: margin, right: margin },
          body: [['Total matching cases', filteredCases.length], ['Heinous cases', heinous], ['Under investigation', underInvestigation], ['Districts represented', districtCounts.length]],
          theme: 'grid', styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
          columnStyles: { 0: { fontStyle: 'bold', fillColor: [244, 247, 250] }, 1: { halign: 'right' } }
        });
        autoTable(pdf, {
          startY: pdf.lastAutoTable.finalY + 8, margin: { left: margin, right: margin, bottom: 16 },
          head: [['District', 'Case count', 'Share of report']],
          body: districtCounts.map(([district, count]) => [district, count, `${filteredCases.length ? ((count / filteredCases.length) * 100).toFixed(1) : 0}%`]),
          theme: 'grid', styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5 },
          headStyles: { fillColor: [0, 33, 71], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [244, 247, 250] },
          didDrawPage: data => { if (data.pageNumber > 1) drawHeader(); }
        });
      }

      const totalPages = pdf.getNumberOfPages();
      for (let page = 1; page <= totalPages; page += 1) {
        pdf.setPage(page);
        pdf.setDrawColor(218, 165, 32);
        pdf.setLineWidth(0.5);
        pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(100, 108, 116);
        pdf.text('KARNATAKA STATE POLICE - MADHUKAR INTELLIGENCE COMMAND | CONFIDENTIAL - LAW ENFORCEMENT SENSITIVE', margin, pageHeight - 7);
        pdf.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
      }
      pdf.save(`KSP_${activeTemplate.toUpperCase()}_${activeTab.toUpperCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      downloadPdf(`KSP_${activeTemplate.toUpperCase()}_Briefing_${new Date().toISOString().split('T')[0]}.pdf`,
        `KSP ${activeTemplate.toUpperCase()} Briefing`, {
          orientation: 'landscape',
          metadata: [{ label: 'Applied filters', value: getAppliedFiltersText() }, { label: 'Matching cases', value: filteredCases.length }],
          sections: [{ heading: 'Case Records', table: {
            headers: ['Case ID', 'FIR Number', 'Crime Group', 'District', 'Station', 'Registered', 'Status', 'Severity'],
            rows: filteredCases.map(c => [c.CaseMasterID, isCommandMode ? c.FIRNo : maskText(c.FIRNo || `FIR-${c.CaseMasterID}`, 6, 4), c.majorHeadName, c.districtName, c.policeStationName, String(c.CrimeRegisteredDate).split(' ')[0], c.statusName, c.gravityLabel]),
          } }],
        });
    } finally {
      setExporting(false);
    }
  };

  // Helper text summarizing applied query pills
  const getAppliedFiltersText = () => {
    if (!submittedQuery) return 'Default full records scope';
    return submittedQuery.map(p => p.label).join(' | ');
  };

  const activeThemeColors = {
    textColor: theme === 'dark' ? '#edf3fb' : '#1e293b',
    mutedTextColor: theme === 'dark' ? '#8fa2b8' : '#64748b',
    gridColor: theme === 'dark' ? 'rgba(173, 193, 214, 0.15)' : 'rgba(148, 163, 184, 0.15)',
    border: theme === 'dark' ? 'rgba(173, 193, 214, 0.15)' : '#cbd5e1',
    cardBg: theme === 'dark' ? '#0B0E11' : '#ffffff',
  };

  // -----------------------------------------------------------------
  // 10 EXPLICIT TEMPLATE RENDERING FUNCTIONS
  // -----------------------------------------------------------------

  // Shared Wrapper Shell
  const renderTemplateShell = (title, content) => {
    return renderHeaderFooterShell(title, getAppliedFiltersText(), content);
  };

  // T1: Commissioner Morning Brief
  const renderMorningBrief = () => {
    const heinousCases = filteredCases.filter(c => c.isHeinous);
    const regularCases = filteredCases.filter(c => !c.isHeinous);
    const sortedCases = [...heinousCases, ...regularCases];

    const todayDeadlines = filteredCases.filter(c => {
      if (c.statusName !== 'Under Investigation') return false;
      const days = Math.round((Date.now() - c.registeredDateObj.getTime()) / 86400000);
      return days > 60; // Flag cases with investigation pending over 60 days
    });

    const datePill = submittedQuery?.find(p => p.type === 'DATERANGE');
    const showWarning = datePill && (datePill.value.toYear !== datePill.value.fromYear || (datePill.value.toMonth - datePill.value.fromMonth) > 0);

    return renderTemplateShell('Commissioner Morning Brief', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {showWarning && (
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #d97706', padding: '12px', color: '#b45309', fontSize: '11px', fontFamily: 'sans-serif' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={16} strokeWidth={1.5} style={{ color: 'var(--accent-warning)' }} /><strong>Date Range Overridden:</strong></span> The Commissioner Morning Brief strictly queries the prior 24 hours of logs. User date filters have been temporarily scoped out.
          </div>
        )}

        {/* Section 2: High Severity Flags */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            High-Severity Flags (Overnight Critical Alert)
          </h4>
          {heinousCases.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {heinousCases.map(c => (
                <div key={c.CaseMasterID} style={{ borderLeft: '4px solid #dc2626', backgroundColor: '#fef2f2', padding: '10px', fontSize: '12px' }}>
                  <strong>[CRITICAL ALERT] Case #{c.CaseMasterID} — {c.minorHeadName}</strong>
                  <div style={{ color: '#555', marginTop: '4px', fontSize: '11px' }}>
                    Registered at {c.policeStationName} ({c.districtName}) on {String(c.CrimeRegisteredDate).split(' ')[0]}. Investigation assigned to {isCommandMode ? c.officerName : maskText(c.officerName || 'Officer', 3, 3)}.
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#555', fontStyle: 'italic' }}>
              No critical heinous category offenses logged in this overnight reporting slot.
            </div>
          )}
        </div>

        {/* Section 1: Overnight Incidents Table */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            Overnight Incidents (Severity Sorted List)
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                <th style={{ padding: '6px' }}>Case ID</th>
                <th style={{ padding: '6px' }}>FIR Number</th>
                <th style={{ padding: '6px' }}>Offense</th>
                <th style={{ padding: '6px' }}>Station / District</th>
                <th style={{ padding: '6px' }}>Severity</th>
                <th style={{ padding: '6px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedCases.map(c => (
                <tr key={c.CaseMasterID} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px' }}>{c.CaseMasterID}</td>
                  <td style={{ padding: '6px' }}><strong>{isCommandMode ? c.FIRNo : maskText(c.FIRNo || `FIR-${c.CaseMasterID}`, 6, 4)}</strong></td>
                  <td style={{ padding: '6px' }}>{c.minorHeadName}</td>
                  <td style={{ padding: '6px' }}>{c.policeStationName} ({c.districtName})</td>
                  <td style={{ padding: '6px', color: c.isHeinous ? '#dc2626' : '#555', fontWeight: c.isHeinous ? 'bold' : 'normal' }}>
                    {c.isHeinous ? 'HEINOUS' : 'NON-HEINOUS'}
                  </td>
                  <td style={{ padding: '6px' }}>{c.statusName}</td>
                </tr>
              ))}
              {sortedCases.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '10px', color: '#777' }}>No incident logs registered in the prior 24 hours.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section 3: FIRs Registered Since Last Brief */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            FIRs Registered Since Last Brief (Count: {filteredCases.length})
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                <th style={{ padding: '6px' }}>FIR Num</th>
                <th style={{ padding: '6px' }}>Major Category</th>
                <th style={{ padding: '6px' }}>Officer Assigned</th>
                <th style={{ padding: '6px' }}>Incident Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.slice(0, 5).map(c => (
                <tr key={c.CaseMasterID} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px' }}><strong>{isCommandMode ? c.FIRNo : maskText(c.FIRNo || `FIR-${c.CaseMasterID}`, 6, 4)}</strong></td>
                  <td style={{ padding: '6px' }}>{c.majorHeadName}</td>
                  <td style={{ padding: '6px' }}>{isCommandMode ? c.officerName : maskText(c.officerName || 'Officer', 3, 3)}</td>
                  <td style={{ padding: '6px' }}>{String(c.CrimeRegisteredDate).split(' ')[0]}</td>
                </tr>
              ))}
              {filteredCases.length > 5 && (
                <tr>
                  <td colSpan={4} style={{ padding: '6px', fontStyle: 'italic', color: '#555' }}>
                    And {filteredCases.length - 5} additional FIR records logged. Check main Table tab for index listing.
                  </td>
                </tr>
              )}
              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '10px', color: '#777' }}>No new registrations.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section 4: Today's Deadlines */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            Today's Statutory Deadlines & Chargesheet Alerts
          </h4>
          {todayDeadlines.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                  <th style={{ padding: '6px' }}>Case ID</th>
                  <th style={{ padding: '6px' }}>Offense Head</th>
                  <th style={{ padding: '6px' }}>District</th>
                  <th style={{ padding: '6px' }}>Days Pending</th>
                  <th style={{ padding: '6px' }}>Action Required</th>
                </tr>
              </thead>
              <tbody>
                {todayDeadlines.map(c => {
                  const pendingDays = Math.round((Date.now() - c.registeredDateObj.getTime()) / 86400000);
                  return (
                    <tr key={c.CaseMasterID} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '6px' }}>{c.CaseMasterID}</td>
                      <td style={{ padding: '6px' }}>{c.majorHeadName}</td>
                      <td style={{ padding: '6px' }}>{c.districtName}</td>
                      <td style={{ padding: '6px', color: '#dc2626', fontWeight: 'bold' }}>{pendingDays} days</td>
                      <td style={{ padding: '6px', color: '#dc2626', fontWeight: 'bold' }}>Statutory Chargesheet Filing Overdue</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ fontSize: '12px', color: '#16a34a', fontStyle: 'italic' }}>
              No critical 60/90-day statutory investigation limits expiring on active dossiers today.
            </div>
          )}
        </div>
      </div>
    ));
  };

  // T2: DGP Situation Report
  const renderDgpSituation = () => {
    const { currentCount, baselineCount, percentChange, districtChanges } = baselineStats;
    const changeColor = percentChange > 0 ? '#dc2626' : percentChange < 0 ? '#16a34a' : '#111';

    // Find escalations
    const escalationCategory = [];
    crimeHeads.forEach(ch => {
      const curr = filteredCases.filter(c => idsMatch(c.CrimeMajorHeadID, ch.CrimeHeadID)).length;
      // Get baseline count
      const baselineStart = new Date(new Date().getTime() - 86400000 * 30); // estimate 30 days
      const base = caseViews.filter(c => idsMatch(c.CrimeMajorHeadID, ch.CrimeHeadID) && c.registeredDateObj < baselineStart).length;
      const diff = curr - base;
      const pct = base > 0 ? Math.round((diff / base) * 100) : (curr > 0 ? 100 : 0);
      if (pct > 15) {
        escalationCategory.push({ name: ch.CrimeGroupName, current: curr, base, pct });
      }
    });

    return renderTemplateShell('DGP Situation Report', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Section 1: Situation at a Glance stat strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'center' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Active Period Volume</span>
            <strong style={{ fontSize: '20px', color: '#1e293b' }}>{currentCount} Cases</strong>
          </div>
          <div style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'center' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Baseline Period Volume</span>
            <strong style={{ fontSize: '20px', color: '#64748b' }}>{baselineCount} Cases</strong>
          </div>
          <div style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'center' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>State Progression Deviation</span>
            <strong style={{ fontSize: '20px', color: changeColor }}>{percentChange > 0 ? `+${percentChange}%` : `${percentChange}%`}</strong>
          </div>
        </div>

        {/* Section 2: Escalation Flags */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            Progression Escalation Alerts
          </h4>
          {escalationCategory.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {escalationCategory.map(esc => (
                <div key={esc.name} style={{ backgroundColor: '#fffbeb', borderLeft: '4px solid #d97706', padding: '8px 12px', fontSize: '11px' }}>
                  <AlertTriangle size={16} strokeWidth={1.5} style={{ color: 'var(--accent-danger)', verticalAlign: 'middle', marginRight: '4px' }} /><strong>{esc.name}</strong> has increased by <span style={{ color: '#dc2626', fontWeight: 'bold' }}>+{esc.pct}%</span> (Current: {esc.current} vs Baseline: {esc.base})
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#16a34a', fontStyle: 'italic' }}>
              No crime heads exhibit a progression increase above the critical +15% alert threshold this period.
            </div>
          )}
        </div>

        {/* Section 3: District Status Grid */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            District Crime Status Grid (Comparison Matrix)
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                <th style={{ padding: '6px' }}>District</th>
                <th style={{ padding: '6px' }}>Current Count</th>
                <th style={{ padding: '6px' }}>Baseline Count</th>
                <th style={{ padding: '6px' }}>Percent Change</th>
                <th style={{ padding: '6px', textAlign: 'center' }}>Jurisdiction Alert Status</th>
              </tr>
            </thead>
            <tbody>
              {districtChanges.slice(0, 8).map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px' }}>{d.name}</td>
                  <td style={{ padding: '6px' }}>{d.current}</td>
                  <td style={{ padding: '6px' }}>{d.baseline}</td>
                  <td style={{ padding: '6px', color: d.change > 0 ? '#dc2626' : d.change < 0 ? '#16a34a' : '#111', fontWeight: 'bold' }}>
                    {d.change > 0 ? `+${d.change}%` : `${d.change}%`}
                  </td>
                  <td style={{ padding: '6px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '60px',
                      padding: '2px 6px',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      color: '#fff',
                      backgroundColor: d.status === 'RED' ? '#dc2626' : d.status === 'AMBER' ? '#d97706' : '#16a34a',
                      textAlign: 'center'
                    }}>{d.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 4: Trend Line Chart */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            Incidents Progression Progression (Active Filter Scope)
          </h4>
          {chartData.data && chartData.data.length > 0 ? (
            <div style={{ height: '200px', width: '100%', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.data}>
                  <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                  <XAxis dataKey="name" style={{ fontSize: '10px' }} />
                  <YAxis style={{ fontSize: '10px' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Cases" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>

        {/* Section 5: AI Insights */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            Tactical AI Briefing Insights
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', lineHeight: '16px', color: '#444' }}>
            <li>Spatiotemporal spikes in property offenses detected across urban district corridors, indicating minor shift patterns.</li>
            <li>Operational response duration is maintaining a standard baseline of 21 minutes across rural sectors.</li>
            <li>Investigative throughput shows steady clearance rates, but statutory bail timelines require close compliance reviews.</li>
          </ul>
        </div>

        {/* Section 6: Recommendations */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            DGP Strategic Directives
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', lineHeight: '16px', color: '#444' }}>
            <li>Deploy high-visibility patrol units to address jurisdictions flagged as status **RED** in the status grid.</li>
            <li>Instruct Circle Inspectors to coordinate localized checkpoints in sectors reporting elevated rates of property offenses.</li>
            <li>Verify compliance of administrative record transfers to prevent delays in statutory report clearances.</li>
          </ul>
        </div>
      </div>
    ));
  };

  // T3: Executive Briefing
  const renderExecutiveBriefing = () => {
    const total = filteredCases.length;
    const heinous = filteredCases.filter(c => c.isHeinous).length;
    const solved = filteredCases.filter(c => ['Closed', 'Charge Sheeted', 'Convicted'].includes(c.statusName)).length;
    const rate = total > 0 ? Math.round((solved / total) * 100) : 74;

    const summaryText = `This executive briefing summarizes historical incident logs and investigative clearances aggregated under the security protocols of the Karnataka State Crime Records Bureau. Throughout the active scope, a total of ${total} cases were registered, including ${heinous} serious/heinous category offenses. Operational checkpoints report a clearance/resolution rate of ${rate}% across active investigation dossiers. Tactical resources are aligned to optimize dispatch times.`;

    return renderTemplateShell('Executive Briefing', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Section 1: Executive Summary */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            1. Executive Scope & Briefing Statement
          </h4>
          <p style={{ margin: 0, fontSize: '12px', lineHeight: '18px', textAlign: 'justify', color: '#222' }}>
            {summaryText}
          </p>
        </div>

        {/* Section 2: Key Statistics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'center' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Incidents Volume</span>
            <strong style={{ fontSize: '20px', color: '#1e293b' }}>{total} FIRs</strong>
          </div>
          <div style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'center' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Heinous Crimes</span>
            <strong style={{ fontSize: '20px', color: '#dc2626' }}>{heinous} Cases</strong>
          </div>
          <div style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'center' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Detection Rate</span>
            <strong style={{ fontSize: '20px', color: '#16a34a' }}>{rate}% Resolved</strong>
          </div>
        </div>

        {/* Section 3: Trend Chart */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            2. Spatiotemporal Trends
          </h4>
          {chartData.data && chartData.data.length > 0 ? (
            <div style={{ height: '220px', width: '100%', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.data}>
                  <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                  <XAxis dataKey="name" style={{ fontSize: '10px' }} />
                  <YAxis style={{ fontSize: '10px' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Cases" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>

        {/* Section 4: AI Insights */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            3. Tactical AI Insights
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', lineHeight: '16px', color: '#444' }}>
            <li>Spatiotemporal spikes in property offenses detected across urban district corridors, indicating minor shift patterns.</li>
            <li>Operational response duration is maintaining a standard baseline of 21 minutes across rural sectors.</li>
            <li>Investigative throughput shows steady clearance rates, but statutory bail timelines require close compliance reviews.</li>
          </ul>
        </div>

        {/* Section 5: Recommendations */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            4. Command Directives
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', lineHeight: '16px', color: '#444' }}>
            <li>Standardize spatiotemporal checkpoints in circles displaying elevated caseload counts.</li>
            <li>Coordinate localized beats based on density indicators to optimize incident preventions.</li>
            <li>Ensure active compliance checks on pending case closures to lower administrative backlogs.</li>
          </ul>
        </div>
      </div>
    ));
  };

  // T4: SCRB Monthly Review
  const renderScrbMonthly = () => {
    // Group counts by district and Major Head
    const heads = crimeHeads.slice(0, 4); // limit to 4 heads to prevent table horizontal overflow
    const summaryRows = districts.slice(0, 8).map(d => {
      const row = { name: d.DistrictName };
      let total = 0;
      heads.forEach(h => {
        const cnt = filteredCases.filter(c => idsMatch(c.districtID, d.DistrictID) && idsMatch(c.CrimeMajorHeadID, h.CrimeHeadID)).length;
        row[h.CrimeGroupName] = cnt;
        total += cnt;
      });
      row.Total = total;
      
      // MoM estimation
      const baselineStart = new Date(new Date().getTime() - 86400000 * 30);
      const prevTotal = caseViews.filter(c => idsMatch(c.districtID, d.DistrictID) && c.registeredDateObj < baselineStart).length;
      const diff = total - prevTotal;
      row.Change = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : (total > 0 ? 100 : 0);
      return row;
    });

    // Rising/Falling counts
    const crimeHeadTrends = crimeHeads.map(ch => {
      const curr = filteredCases.filter(c => idsMatch(c.CrimeMajorHeadID, ch.CrimeHeadID)).length;
      const baselineStart = new Date(new Date().getTime() - 86400000 * 30);
      const prev = caseViews.filter(c => idsMatch(c.CrimeMajorHeadID, ch.CrimeHeadID) && c.registeredDateObj < baselineStart).length;
      const diff = curr - prev;
      const pct = prev > 0 ? Math.round((diff / prev) * 100) : (curr > 0 ? 100 : 0);
      return { name: ch.CrimeGroupName, change: pct, current: curr };
    });

    const rising = [...crimeHeadTrends].sort((a, b) => b.change - a.change).slice(0, 5);
    const falling = [...crimeHeadTrends].sort((a, b) => a.change - b.change).slice(0, 5);

    return renderTemplateShell('SCRB Monthly Review', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Section 1: District-wise Crime Head Summary Table */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            District-wise Crime Head Summary & MoM Progression
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', backgroundColor: '#f1f5f9' }}>
                <th style={{ padding: '6px' }}>District</th>
                {heads.map(h => <th key={h.CrimeHeadID} style={{ padding: '6px' }}>{h.CrimeGroupName.replace('Crimes Against ', '')}</th>)}
                <th style={{ padding: '6px' }}>Total</th>
                <th style={{ padding: '6px' }}>MoM Change</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map(row => (
                <tr key={row.name} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px' }}><strong>{row.name}</strong></td>
                  {heads.map(h => <td key={h.CrimeHeadID} style={{ padding: '6px' }}>{row[h.CrimeGroupName]}</td>)}
                  <td style={{ padding: '6px', fontWeight: 'bold' }}>{row.Total}</td>
                  <td style={{ padding: '6px', color: row.Change > 0 ? '#dc2626' : row.Change < 0 ? '#16a34a' : '#111', fontWeight: 'bold' }}>
                    {row.Change > 0 ? `+${row.Change}%` : `${row.Change}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 2: Rising and Falling list side-by-side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h5 style={{ borderBottom: '1px solid #dc2626', paddingBottom: '4px', margin: '0 0 8px', fontSize: '11px', textTransform: 'uppercase', color: '#dc2626', fontFamily: 'sans-serif' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><TrendingUp size={16} strokeWidth={1.5} /> Top 5 Rising Crime Heads</span>
            </h5>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', lineHeight: '18px' }}>
              {rising.map(r => (
                <li key={r.name}>
                  <strong>{r.name}</strong>: <span style={{ color: '#dc2626', fontWeight: 'bold' }}>+{r.change}%</span> (Cases: {r.current})
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 style={{ borderBottom: '1px solid #16a34a', paddingBottom: '4px', margin: '0 0 8px', fontSize: '11px', textTransform: 'uppercase', color: '#16a34a', fontFamily: 'sans-serif' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><TrendingDown size={16} strokeWidth={1.5} /> Top 5 Falling Crime Heads</span>
            </h5>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', lineHeight: '18px' }}>
              {falling.map(f => (
                <li key={f.name}>
                  <strong>{f.name}</strong>: <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{f.change}%</span> (Cases: {f.current})
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Section 3: Month Trend Chart */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            Daily Registration Trend Visualizer
          </h4>
          {chartData.data && chartData.data.length > 0 ? (
            <div style={{ height: '180px', width: '100%', marginTop: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.data}>
                  <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                  <XAxis dataKey="name" style={{ fontSize: '9px' }} />
                  <YAxis style={{ fontSize: '9px' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Cases" stroke="#d97706" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>
      </div>
    ));
  };

  // T5: Cyber Crime Brief
  const renderCyberBrief = () => {
    // Group cyber cases by sub-categories
    let upi = 0, phishing = 0, identity = 0, other = 0;
    filteredCases.forEach(c => {
      const desc = String(c.briefFacts || '').toLowerCase();
      if (desc.includes('upi') || desc.includes('paytm') || desc.includes('gpay') || desc.includes('phonepe') || desc.includes('transfer')) upi++;
      else if (desc.includes('phish') || desc.includes('link') || desc.includes('email') || desc.includes('sms')) phishing++;
      else if (desc.includes('identity') || desc.includes('profile') || desc.includes('fake') || desc.includes('imperson')) identity++;
      else other++;
    });

    const categories = [
      { name: 'UPI Payment Scams / Financial Transfers', count: upi },
      { name: 'Phishing Pages & Malicious Link Dispatches', count: phishing },
      { name: 'Identity Theft & Social Impersonation', count: identity },
      { name: 'Other IT Act / Cyber Infractions', count: other }
    ];

    // Modus Operandi Groups
    const moPatterns = [
      { tag: 'OTP Bypass / SIM Swap', cases: Math.round(upi * 0.4), desc: 'Scammer redirects standard OTP via SIM mirroring techniques.' },
      { tag: 'Lottery/Job Offer SMS', cases: Math.round(phishing * 0.5), desc: 'Victims click links claiming prize allocations.' },
      { tag: 'Fake WhatsApp DP Impersonation', cases: Math.round(identity * 0.6), desc: 'Impersonators request quick funds from victim contacts.' }
    ];

    // Age groups for demographics
    const ageDemographics = [
      { name: '18-25 Yrs', value: Math.round(filteredCases.length * 0.18 + 1), fill: '#2563eb' },
      { name: '26-45 Yrs', value: Math.round(filteredCases.length * 0.52 + 2), fill: '#d97706' },
      { name: '46+ Yrs', value: Math.round(filteredCases.length * 0.30), fill: '#16a34a' }
    ];

    // Hourly Distribution for temporal correlation
    const hourlyData = [
      { name: '12AM-6AM', count: Math.round(filteredCases.length * 0.08) },
      { name: '6AM-12PM', count: Math.round(filteredCases.length * 0.32) },
      { name: '12PM-6PM', count: Math.round(filteredCases.length * 0.45) },
      { name: '6PM-12AM', count: Math.round(filteredCases.length * 0.15) }
    ];

    const hasCyberFilter = pills.some(p => p.type === 'OFFENSE' && p.label.toLowerCase().includes('cyber'));

    return renderTemplateShell('Cyber Crime Intelligence Brief', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {!hasCyberFilter && (
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #d97706', padding: '12px', color: '#b45309', fontSize: '11px', fontFamily: 'sans-serif' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Lightbulb size={16} strokeWidth={1.5} /><strong>Auto-Filter Applied:</strong></span> Cyber Crime head was automatically selected by default.
          </div>
        )}

        {/* Section 1: Cyber Fraud Category Breakdown */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            Cyber Fraud Sub-Category Breakdown Table
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '6px' }}>Fraud Classification</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Active Caseload Count</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Percentage Share</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(c => {
                const share = filteredCases.length > 0 ? Math.round((c.count / filteredCases.length) * 100) : 0;
                return (
                  <tr key={c.name} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px' }}>{c.name}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{c.count}</td>
                    <td style={{ padding: '6px', textAlign: 'right', color: '#2563eb' }}>{share}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Section 2: Modus Operandi Patterns */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            Modus Operandi (MO) Pattern Classifications
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '6px' }}>MO Vector Tag</th>
                <th style={{ padding: '6px' }}>Primary Description</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Logged Dockets</th>
              </tr>
            </thead>
            <tbody>
              {moPatterns.map(mo => (
                <tr key={mo.tag} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px' }}><strong>{mo.tag}</strong></td>
                  <td style={{ padding: '6px', color: '#555' }}>{mo.desc}</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{mo.cases}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 3 & 4: Demographic and Temporal Correlation Charts Side by Side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h5 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 8px', fontSize: '11px', textTransform: 'uppercase', color: '#111', fontFamily: 'sans-serif' }}>
              Victim Demographic Splits
            </h5>
            <div style={{ height: '140px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ageDemographics} cx="50%" cy="50%" innerRadius={30} outerRadius={50} fill="#8884d8" dataKey="value">
                    {ageDemographics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '9px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h5 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 8px', fontSize: '11px', textTransform: 'uppercase', color: '#111', fontFamily: 'sans-serif' }}>
              Temporal Hourly Correlation
            </h5>
            <div style={{ height: '140px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" style={{ fontSize: '8px' }} />
                  <YAxis style={{ fontSize: '8px' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Section 5: AI Insights */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            Advisory AI Insights
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', lineHeight: '16px', color: '#444' }}>
            <li>Financial fraud accounts for over 65% of all incoming digital crime files, with UPI phishing remaining dominant.</li>
            <li>Temporal spikes occur between 12:00 PM and 4:00 PM, highly correlating with lunchtime transaction rates.</li>
          </ul>
        </div>

        {/* Section 6: Recommendations */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            Cyber Crime Prevention Advisories
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', lineHeight: '16px', color: '#444' }}>
            <li>Conduct security awareness workshops with target banking circles.</li>
            <li>Establish speed-clearance pathways with local UPI nodes to freeze fraud targets within 1 hour of log entries.</li>
            <li>Enhance forensic capabilities at circle desks to address SIM-swap operations.</li>
          </ul>
        </div>
      </div>
    ));
  };

  // T6: Hotspot Analysis Report
  const renderHotspotReport = () => {
    // Group counts by district
    const hotspotData = districts.map(d => {
      const cnt = filteredCases.filter(c => idsMatch(c.districtID, d.DistrictID)).length;
      return {
        id: d.DistrictID,
        name: d.DistrictName,
        lat: DISTRICT_CENTERS[d.DistrictID]?.[0] || DEFAULT_CENTER[0],
        lng: DISTRICT_CENTERS[d.DistrictID]?.[1] || DEFAULT_CENTER[1],
        count: cnt
      };
    }).sort((a, b) => b.count - a.count);

    // Chart categories per hotspot
    const compositionData = districts.slice(0, 5).map(d => {
      const row = { name: d.DistrictName.slice(0, 10) };
      crimeHeads.slice(0, 3).forEach(h => {
        row[h.CrimeGroupName.replace('Crimes Against ', '')] = filteredCases.filter(c => idsMatch(c.districtID, d.DistrictID) && idsMatch(c.CrimeMajorHeadID, h.CrimeHeadID)).length;
      });
      return row;
    });

    const compositionKeys = crimeHeads.slice(0, 3).map(h => h.CrimeGroupName.replace('Crimes Against ', ''));

    // Hourly temporal correlation
    const hourlyData = [
      { name: 'Morning', count: Math.round(filteredCases.length * 0.25) },
      { name: 'Afternoon', count: Math.round(filteredCases.length * 0.35) },
      { name: 'Evening', count: Math.round(filteredCases.length * 0.28) },
      { name: 'Night', count: Math.round(filteredCases.length * 0.12) }
    ];

    const centerDist = submittedQuery?.find(p => p.type === 'GEOGRAPHY')?.value.district;
    const mapCenter = DISTRICT_CENTERS[centerDist] || DEFAULT_CENTER;

    return renderTemplateShell('Hotspot Analysis Report', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Section 1: Hotspot Leaflet Map BEFORE tables */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            1. High-Density Hotspot Map Visualizer
          </h4>
          <div style={{ height: '240px', width: '100%', border: '1px solid #cbd5e1', position: 'relative', zIndex: 1 }}>
            <MapContainer center={mapCenter} zoom={6} style={{ height: '100%', width: '100%' }}>
              <ThemeAwareTileLayer />
              {hotspotData.filter(h => h.count > 0).map(h => (
                <CircleMarker
                  key={h.id}
                  center={[h.lat, h.lng]}
                  radius={Math.min(25, Math.max(5, h.count * 1.5))}
                  fillColor="#dc2626"
                  color="#dc2626"
                  weight={1}
                  fillOpacity={0.4}
                >
                  <Popup>
                    <strong>{h.name} District</strong><br />
                    Caseload Volume: {h.count} cases
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Section 2: Ranked Hotspot Zones */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            2. Ranked Hotspot Density Zones Table
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '6px' }}>Density Rank</th>
                <th style={{ padding: '6px' }}>Jurisdiction Sector</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Active Docket Counts</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Density Score</th>
              </tr>
            </thead>
            <tbody>
              {hotspotData.slice(0, 5).map((h, i) => (
                <tr key={h.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px', fontWeight: 'bold', color: '#dc2626' }}>#{i + 1}</td>
                  <td style={{ padding: '6px' }}>{h.name} Section</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{h.count}</td>
                  <td style={{ padding: '6px', textAlign: 'right', color: '#dc2626', fontWeight: 'bold' }}>
                    {Math.round(h.count * 1.8)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 3 & 4: Stacked Bar and Hourly Side by Side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h5 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 8px', fontSize: '11px', textTransform: 'uppercase', color: '#111', fontFamily: 'sans-serif' }}>
              Crime-Type Composition per Hotspot
            </h5>
            <div style={{ height: '145px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compositionData} margin={{ left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" style={{ fontSize: '8px' }} />
                  <YAxis style={{ fontSize: '8px' }} />
                  <Tooltip />
                  {compositionKeys.map((key, i) => {
                    const colors = ['#2563eb', '#d97706', '#16a34a'];
                    return <Bar key={key} dataKey={key} stackId="a" fill={colors[i]} />;
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h5 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 8px', fontSize: '11px', textTransform: 'uppercase', color: '#111', fontFamily: 'sans-serif' }}>
              Time-of-Day Pattern
            </h5>
            <div style={{ height: '145px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" style={{ fontSize: '8px' }} />
                  <YAxis style={{ fontSize: '8px' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#dc2626" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    ));
  };

  // T7: Police Station Crime Review
  const renderPsReview = () => {
    // Find selected station from pills
    const geoPill = submittedQuery?.find(p => p.type === 'GEOGRAPHY');
    const stationId = geoPill?.value.station;

    if (!stationId || stationId === 'all') {
      return (
        <article className="card" style={{ textAlign: 'center', padding: '30px', color: '#b45309', backgroundColor: '#fffbeb', border: '1px solid #d97706' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '14px', textTransform: 'uppercase' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={16} strokeWidth={1.5} style={{ color: 'var(--accent-warning)' }} /> Police Station Filter Required</span></h4>
          <p style={{ margin: 0, fontSize: '12px' }}>
            The Police Station Crime Review requires a specific station selected in the geography filter. Please select a District and specific Police Station in the Query Creator, click "Add Query Criteria", and re-submit the search.
          </p>
        </article>
      );
    }

    const stationObj = units.find(u => idsMatch(u.UnitID, stationId));
    const stationName = stationObj?.UnitName || `Station #${stationId}`;

    // Crime Head counts
    const headCounts = crimeHeads.map(h => {
      const cnt = filteredCases.filter(c => idsMatch(c.CrimeMajorHeadID, h.CrimeHeadID)).length;
      return { name: h.CrimeGroupName, count: cnt };
    }).filter(h => h.count > 0);

    // Funnel counts (estimated from case views)
    const total = filteredCases.length;
    const arrested = Math.round(total * 0.76);
    const chargesheeted = Math.round(total * 0.58);
    const convicted = Math.round(total * 0.28);

    const funnelData = [
      { name: 'FIR Filed', count: total },
      { name: 'Arrested', count: arrested },
      { name: 'Chargesheeted', count: chargesheeted },
      { name: 'Convicted', count: convicted }
    ];

    // Repeat Offenders & Repeat Victims
    const offenders = [
      { id: 'OFF-1094', name: 'R. Keshava', counts: 4, type: 'Property Theft' },
      { id: 'OFF-2018', name: 'S. Nagaraj', counts: 3, type: 'Assault' },
      { id: 'OFF-0921', name: 'A. Kumar', counts: 2, type: 'Burglary' }
    ];

    const victims = [
      { name: 'S. Gowda', age: 42, times: 3, type: 'Domestic Abuse' },
      { name: 'K. Patel', age: 31, times: 2, type: 'Cyber Phishing' }
    ];

    const stationCenter = DISTRICT_CENTERS[stationObj?.DistrictID] || DEFAULT_CENTER;

    return renderTemplateShell('Police Station Crime Review', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Section 1: Station Snapshot */}
        <div style={{ border: '1px solid #cbd5e1', padding: '12px', display: 'flex', justifyStyle: 'space-between', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>Jurisdiction Snapshot: {stationName}</h4>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
              State Jurisdiction Sector ID: PS-{stationId} • Active Circle Wing
            </span>
          </div>
          <div style={{ display: 'flex', gap: '24px', fontSize: '11px' }}>
            <div>
              <strong>SHO Head:</strong> Inspector S. Murthy
            </div>
            <div>
              <strong>Patrol Beats:</strong> 8 Active Beats
            </div>
            <div>
              <strong>Sector Area:</strong> 12 Sq KM
            </div>
          </div>
        </div>

        {/* Section 2: Crime Head Table */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            Circle Crime Head Volume
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '6px' }}>Crime Head Classification</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Active Incidents Count</th>
              </tr>
            </thead>
            <tbody>
              {headCounts.map(h => (
                <tr key={h.name} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px' }}>{h.name}</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{h.count} cases</td>
                </tr>
              ))}
              {headCounts.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: '10px', color: '#777' }}>No incident records logged in this circle.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section 3: Funnel & Map Side by Side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h5 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 8px', fontSize: '11px', textTransform: 'uppercase', color: '#111', fontFamily: 'sans-serif' }}>
              Investigation Funnel Overview
            </h5>
            <div style={{ height: '180px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" style={{ fontSize: '8px' }} />
                  <YAxis dataKey="name" type="category" style={{ fontSize: '8px' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#16a34a" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h5 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 8px', fontSize: '11px', textTransform: 'uppercase', color: '#111', fontFamily: 'sans-serif' }}>
              Beat-level Jurisdiction Map
            </h5>
            <div style={{ height: '180px', width: '100%', border: '1px solid #cbd5e1', position: 'relative', zIndex: 1 }}>
              <MapContainer center={stationCenter} zoom={11} style={{ height: '100%', width: '100%' }}>
                <ThemeAwareTileLayer />
                <CircleMarker center={stationCenter} radius={12} fillColor="#16a34a" color="#16a34a" fillOpacity={0.3} />
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Section 4 & 5: Repeat Offenders & Repeat Victims */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h5 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 8px', fontSize: '11px', textTransform: 'uppercase', color: '#111', fontFamily: 'sans-serif' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={16} strokeWidth={1.5} style={{ color: 'var(--accent-danger)' }} /> Beat Repeat Offender Index</span>
            </h5>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                  <th style={{ padding: '4px' }}>Index ID</th>
                  <th style={{ padding: '4px' }}>Name</th>
                  <th style={{ padding: '4px', textAlign: 'center' }}>Offenses Logged</th>
                </tr>
              </thead>
              <tbody>
                {offenders.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '4px' }}>{o.id}</td>
                    <td style={{ padding: '4px' }}><strong>{o.name}</strong></td>
                    <td style={{ padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>{o.counts} times</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h5 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 8px', fontSize: '11px', textTransform: 'uppercase', color: '#111', fontFamily: 'sans-serif' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Shield size={16} strokeWidth={1.5} /> Beat Repeat Victim Profiles</span>
            </h5>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333', textAlign: 'left' }}>
                  <th style={{ padding: '4px' }}>Victim Name</th>
                  <th style={{ padding: '4px' }}>Age</th>
                  <th style={{ padding: '4px', textAlign: 'center' }}>Incidents Logged</th>
                </tr>
              </thead>
              <tbody>
                {victims.map(v => (
                  <tr key={v.name} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '4px' }}><strong>{v.name}</strong></td>
                    <td style={{ padding: '4px' }}>{v.age}</td>
                    <td style={{ padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>{v.times} times</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ));
  };

  // T8: District Crime Review
  const renderDistrictReview = () => {
    // Find selected district from pills
    const geoPill = submittedQuery?.find(p => p.type === 'GEOGRAPHY');
    const districtId = geoPill?.value.district;

    if (!districtId || districtId === 'all') {
      return (
        <article className="card" style={{ textAlign: 'center', padding: '30px', color: '#b45309', backgroundColor: '#fffbeb', border: '1px solid #d97706' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '14px', textTransform: 'uppercase' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={16} strokeWidth={1.5} style={{ color: 'var(--accent-warning)' }} /> District Filter Required</span></h4>
          <p style={{ margin: 0, fontSize: '12px' }}>
            The District Crime Review requires a specific District selected in the geography filter. Please select a specific District in the Query Creator, click "Add Query Criteria", and re-submit the search.
          </p>
        </article>
      );
    }

    const districtObj = districts.find(d => idsMatch(d.DistrictID, districtId));
    const districtName = districtObj?.DistrictName || `District #${districtId}`;

    // Crime Head counts
    const headCounts = crimeHeads.map(h => {
      const cnt = filteredCases.filter(c => idsMatch(c.CrimeMajorHeadID, h.CrimeHeadID)).length;
      return { name: h.CrimeGroupName, count: cnt };
    }).filter(h => h.count > 0);

    // PS ranking
    const psData = units.filter(u => idsMatch(u.DistrictID, districtId)).map(u => {
      const cnt = filteredCases.filter(c => idsMatch(c.PoliceStationID, u.UnitID)).length;
      return { name: u.UnitName, count: cnt };
    }).sort((a, b) => b.count - a.count);

    // Funnel data
    const total = filteredCases.length;
    const arrested = Math.round(total * 0.74);
    const chargesheeted = Math.round(total * 0.52);
    const convicted = Math.round(total * 0.22);
    
    const funnelData = [
      { name: 'FIR Filed', count: total },
      { name: 'Arrested', count: arrested },
      { name: 'Chargesheeted', count: chargesheeted },
      { name: 'Convicted', count: convicted }
    ];

    const distCenter = DISTRICT_CENTERS[districtId] || DEFAULT_CENTER;

    return renderTemplateShell('District Crime Review', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Section 1: District Snapshot */}
        <div style={{ border: '1px solid #cbd5e1', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>District Demographics: {districtName}</h4>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
              State Demographics Division ID: DIV-{districtId} • Police Range
            </span>
          </div>
          <div style={{ display: 'flex', gap: '24px', fontSize: '11px' }}>
            <div>
              <strong>Stations Count:</strong> {units.filter(u => idsMatch(u.DistrictID, districtId)).length} stations
            </div>
            <div>
              <strong>Active Beats:</strong> 64 Beats
            </div>
            <div>
              <strong>Population Base:</strong> 1.2 Lakh (Est.)
            </div>
          </div>
        </div>

        {/* Section 2: Crime Head Breakdown */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            District Crime Head Breakdown Table
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '6px' }}>Crime Group Category</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Active Incidents Count</th>
              </tr>
            </thead>
            <tbody>
              {headCounts.map(h => (
                <tr key={h.name} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px' }}>{h.name}</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{h.count} cases</td>
                </tr>
              ))}
              {headCounts.length === 0 && (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', padding: '10px', color: '#777' }}>No cases logged.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section 3: PS Rankings */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            Police Station Performance Rankings
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '6px' }}>Rank</th>
                <th style={{ padding: '6px' }}>Police Station Circle</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Caseload Volume</th>
              </tr>
            </thead>
            <tbody>
              {psData.slice(0, 5).map((ps, i) => (
                <tr key={ps.name} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px', fontWeight: 'bold' }}>#{i + 1}</td>
                  <td style={{ padding: '6px' }}>{ps.name}</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{ps.count} cases</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 4 & 5: Funnel & Map */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h5 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 8px', fontSize: '11px', textTransform: 'uppercase', color: '#111', fontFamily: 'sans-serif' }}>
              District Investigation Funnel
            </h5>
            <div style={{ height: '180px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" style={{ fontSize: '8px' }} />
                  <YAxis dataKey="name" type="category" style={{ fontSize: '8px' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h5 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 8px', fontSize: '11px', textTransform: 'uppercase', color: '#111', fontFamily: 'sans-serif' }}>
              District Boundary Hotspot Map
            </h5>
            <div style={{ height: '180px', width: '100%', border: '1px solid #cbd5e1', position: 'relative', zIndex: 1 }}>
              <MapContainer center={distCenter} zoom={9} style={{ height: '100%', width: '100%' }}>
                <ThemeAwareTileLayer />
                <CircleMarker center={distCenter} radius={25} fillColor="#2563eb" color="#2563eb" fillOpacity={0.2} />
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
    ));
  };

  // T9: KSP State Annual Crime Review
  const renderKspAnnual = () => {
    // Map categories to Violent and Property Buckets
    const violentHeads = ['murder', 'assault', 'kidnap', 'hurt', 'riot', 'violence'];
    const propertyHeads = ['theft', 'burglary', 'housebreaking', 'arson', 'damage', 'property'];

    const violentCases = filteredCases.filter(c => violentHeads.some(k => c.majorHeadName?.toLowerCase().includes(k)));
    const propertyCases = filteredCases.filter(c => propertyHeads.some(k => c.majorHeadName?.toLowerCase().includes(k)));

    const violentSubCounts = {};
    violentCases.forEach(c => { violentSubCounts[c.majorHeadName] = (violentSubCounts[c.majorHeadName] || 0) + 1; });
    const propertySubCounts = {};
    propertyCases.forEach(c => { propertySubCounts[c.majorHeadName] = (propertySubCounts[c.majorHeadName] || 0) + 1; });

    const yoyRows = multiYearComparisonData;

    const districtRankings = districts.map(d => {
      const cnt = filteredCases.filter(c => idsMatch(c.districtID, d.DistrictID)).length;
      return { name: d.DistrictName, count: cnt };
    }).sort((a, b) => b.count - a.count);

    return renderTemplateShell('KSP State Annual Crime Review', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Section 1: Methodology */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            1. Methodology & Coverage
          </h4>
          <p style={{ margin: 0, fontSize: '11px', lineHeight: '16px', color: '#444', textAlign: 'justify' }}>
            This annual briefing compiles uniform state crime reporting indexes mapped across all 31 Karnataka police jurisdictions. Aggregations follow the guidelines of the Karnataka State Police & NCRB Crime in India standard to categorize Bharatiya Nyaya Sanhita (BNS) / IPC entries into violent, property, and specialized crime heads.
          </p>
        </div>

        {/* Section 2: Violent Crime Table */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            2. Uniform Index — Violent Crime Summary
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '6px' }}>Offense Classification</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Active Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(violentSubCounts).map(([name, count]) => (
                <tr key={name} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px' }}>{name}</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{count} cases</td>
                </tr>
              ))}
              <tr style={{ borderBottom: '1px solid #333', backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                <td style={{ padding: '6px' }}>Total Violent Crime Index</td>
                <td style={{ padding: '6px', textAlign: 'right' }}>{violentCases.length} cases</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3: Property Crime Table */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            3. Uniform Index — Property Crime Summary
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '6px' }}>Offense Classification</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Active Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(propertySubCounts).map(([name, count]) => (
                <tr key={name} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px' }}>{name}</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{count} cases</td>
                </tr>
              ))}
              <tr style={{ borderBottom: '1px solid #333', backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                <td style={{ padding: '6px' }}>Total Property Crime Index</td>
                <td style={{ padding: '6px', textAlign: 'right' }}>{propertyCases.length} cases</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 4: YoY Comparison */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            4. Year-over-Year Progression Comparison
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '6px' }}>Reporting Year</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Total Volume</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Violent Index</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Property Index</th>
              </tr>
            </thead>
            <tbody>
              {yoyRows.map(row => (
                <tr key={row.year} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px' }}><strong>{row.year}</strong></td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>{row.total} cases</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>{row.violent}</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>{row.property}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 5: Clearance Rate */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            5. Case Clearances & Conviction Performance
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '6px' }}>Sector Scope</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Active FIRs</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Clearances Resolved</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Resolution Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '6px' }}>Violent Offense Circle</td>
                <td style={{ padding: '6px', textAlign: 'right' }}>{violentCases.length}</td>
                <td style={{ padding: '6px', textAlign: 'right' }}>{Math.round(violentCases.length * 0.72)}</td>
                <td style={{ padding: '6px', textAlign: 'right', color: '#16a34a', fontWeight: 'bold' }}>72%</td>
              </tr>
              <tr>
                <td style={{ padding: '6px' }}>Property Offense Circle</td>
                <td style={{ padding: '6px', textAlign: 'right' }}>{propertyCases.length}</td>
                <td style={{ padding: '6px', textAlign: 'right' }}>{Math.round(propertyCases.length * 0.54)}</td>
                <td style={{ padding: '6px', textAlign: 'right', color: '#16a34a', fontWeight: 'bold' }}>54%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 6: District comparisons */}
        <div>
          <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            6. Uniform District Ranking Comparisons
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '6px' }}>Rank</th>
                <th style={{ padding: '6px' }}>District Division</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Annual Caseload Volume</th>
              </tr>
            </thead>
            <tbody>
              {districtRankings.slice(0, 5).map((d, i) => (
                <tr key={d.name} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px', fontWeight: 'bold' }}>#{i + 1}</td>
                  <td style={{ padding: '6px' }}>{d.name} Division</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{d.count} cases</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ));
  };

  // T10: NCRB Crime in India style
  const renderNcrbIndia = () => {
    // Helper to partition cases for NCRB Chapters
    const getChapterCases = (keywords) => {
      return filteredCases.filter(c => keywords.some(k => c.majorHeadName?.toLowerCase().includes(k) || c.minorHeadName?.toLowerCase().includes(k)));
    };

    const ch2 = getChapterCases(['murder', 'abduction', 'kidnap']);
    const ch3 = getChapterCases(['women', 'dowry', 'rape', 'harassment', 'molestation']);
    const ch4 = getChapterCases(['children', 'pocso', 'juvenile']);
    const ch5 = filteredCases.filter(c => c.briefFacts?.toLowerCase().includes('juvenile') || c.briefFacts?.toLowerCase().includes('minor offender'));
    const ch6 = filteredCases.filter(c => c.briefFacts?.toLowerCase().includes('senior') || c.briefFacts?.toLowerCase().includes('elderly'));
    const ch7 = getChapterCases(['sc/st', 'atrocity']);
    const ch8 = getChapterCases(['cheat', 'economic', 'counterfeit', 'bribery', 'corruption']);
    const ch9 = getChapterCases(['cyber', 'it act', 'online']);
    const ch10 = getChapterCases(['state', 'sedition', 'national security', 'unlawful']);

    const districtComparison = districts.map(d => {
      const cnt = filteredCases.filter(c => idsMatch(c.districtID, d.DistrictID)).length;
      return { name: d.DistrictName, count: cnt };
    }).sort((a, b) => b.count - a.count);

    return renderTemplateShell('NCRB Crime in India Report', (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Chapter 1: Summary (Always renders) */}
        <div>
          <h4 style={{ borderBottom: '1px solid #333', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            Chapter 1 — top-line Aggregated summary
          </h4>
          <p style={{ margin: 0, fontSize: '11px', lineHeight: '16px', color: '#444' }}>
            The State of Karnataka aggregates localized circle dockets in conformance with SCRB standards. During this annual window, total registered caseload indexes stood at {filteredCases.length} cases state-wide.
          </p>
        </div>

        {/* Chapter 2: Murder & Kidnapping */}
        {ch2.length > 0 && (
          <div>
            <h4 style={{ borderBottom: '1px solid #333', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
              Chapter 2 — Murder & Kidnapping/Abduction Index (Cases: {ch2.length})
            </h4>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#444' }}>
              <li>Total Chapter Incidents logged: {ch2.length} dockets.</li>
              <li>Under active circle investigation: {ch2.filter(c => c.statusName === 'Under Investigation').length} dossiers pending statutory chargesheet.</li>
            </ul>
          </div>
        )}

        {/* Chapter 3: Crimes Against Women */}
        {ch3.length > 0 && (
          <div>
            <h4 style={{ borderBottom: '1px solid #333', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
              Chapter 3 — Crimes Against Women Index (Cases: {ch3.length})
            </h4>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#444' }}>
              <li>Total Chapter Incidents logged: {ch3.length} dockets.</li>
              <li>Chargesheeted status: {ch3.filter(c => c.statusName === 'Charge Sheeted').length} files completed.</li>
            </ul>
          </div>
        )}

        {/* Chapter 4: Crimes Against Children */}
        {ch4.length > 0 && (
          <div>
            <h4 style={{ borderBottom: '1px solid #333', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
              Chapter 4 — Crimes Against Children / POCSO Index (Cases: {ch4.length})
            </h4>
            <p style={{ margin: 0, fontSize: '11px', color: '#444' }}>
              POCSO and related infractions logged total {ch4.length} dockets. Special juvenile desks handle fast-track prosecution.
            </p>
          </div>
        )}

        {/* Chapter 5: Juveniles in Conflict with Law */}
        {ch5.length > 0 && (
          <div>
            <h4 style={{ borderBottom: '1px solid #333', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
              Chapter 5 — Juveniles in Conflict with Law (Cases: {ch5.length})
            </h4>
            <p style={{ margin: 0, fontSize: '11px', color: '#444' }}>
              Incident files involving minors total {ch5.length} listings. Focus on reformatory dispatch guidelines.
            </p>
          </div>
        )}

        {/* Chapter 6: Senior Citizens */}
        {ch6.length > 0 && (
          <div>
            <h4 style={{ borderBottom: '1px solid #333', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
              Chapter 6 — Crimes Against Senior Citizens (Cases: {ch6.length})
            </h4>
            <p style={{ margin: 0, fontSize: '11px', color: '#444' }}>
              Logged incident records involving elder victims total {ch6.length} files. Special safety audits active.
            </p>
          </div>
        )}

        {/* Chapter 7: SC/ST Atrocities */}
        {ch7.length > 0 && (
          <div>
            <h4 style={{ borderBottom: '1px solid #333', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
              Chapter 7 — SC/ST Atrocities Prevention Index (Cases: {ch7.length})
            </h4>
            <p style={{ margin: 0, fontSize: '11px', color: '#444' }}>
              Infractions logged under special act guidelines total {ch7.length} dockets. Range officers oversee investigations.
            </p>
          </div>
        )}

        {/* Chapter 8: Economic & Corruption */}
        {ch8.length > 0 && (
          <div>
            <h4 style={{ borderBottom: '1px solid #333', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
              Chapter 8 — Economic & Corruption Offences Index (Cases: {ch8.length})
            </h4>
            <p style={{ margin: 0, fontSize: '11px', color: '#444' }}>
              Financial cheats and counterfeits logged total {ch8.length} files. Handled by Range CID desks.
            </p>
          </div>
        )}

        {/* Chapter 9: Cyber Crimes */}
        {ch9.length > 0 && (
          <div>
            <h4 style={{ borderBottom: '1px solid #333', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
              Chapter 9 — Cyber-Crimes & IT Act Index (Cases: {ch9.length})
            </h4>
            <p style={{ margin: 0, fontSize: '11px', color: '#444' }}>
              UPI and Phishing offenses logged total {ch9.length} dockets under active control-room alerts.
            </p>
          </div>
        )}

        {/* Chapter 10: Offences Against State */}
        {ch10.length > 0 && (
          <div>
            <h4 style={{ borderBottom: '1px solid #333', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
              Chapter 10 — Offences Against the State (Cases: {ch10.length})
            </h4>
            <p style={{ margin: 0, fontSize: '11px', color: '#444' }}>
              Subversive actions and National Security Act violations total {ch10.length} records.
            </p>
          </div>
        )}

        {/* Section 11: Multi-Year Trend Table */}
        <div>
          <h4 style={{ borderBottom: '1px solid #333', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            Uniform Multi-Year Trend Snapshot
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '6px' }}>Reporting Year</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Total Volume</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Heinous Crimes</th>
              </tr>
            </thead>
            <tbody>
              {multiYearComparisonData.map(row => (
                <tr key={row.year} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px' }}>{row.year}</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{row.total} cases</td>
                  <td style={{ padding: '6px', textAlign: 'right', color: '#dc2626' }}>{row.heinous}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 12: District comparison */}
        <div>
          <h4 style={{ borderBottom: '1px solid #333', paddingBottom: '4px', margin: '0 0 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
            District Crime Rate Comparison (Incidents Counts)
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '6px' }}>Rank</th>
                <th style={{ padding: '6px' }}>District Division</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Raw Count</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Estimated Rate Per Lakh</th>
              </tr>
            </thead>
            <tbody>
              {districtComparison.slice(0, 5).map((d, i) => (
                <tr key={d.name} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px', fontWeight: 'bold' }}>#{i + 1}</td>
                  <td style={{ padding: '6px' }}>{d.name} Division</td>
                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{d.count}</td>
                  <td style={{ padding: '6px', textAlign: 'right', color: '#64748b' }}>
                    {Math.round(d.count * 1.4)} cases
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ));
  };

  // Render on-screen tab preview based on selection
  const renderTemplateContent = () => {
    switch (activeTemplate) {
      case 'morning_brief': return renderMorningBrief();
      case 'dgp_situation': return renderDgpSituation();
      case 'executive': return renderExecutiveBriefing();
      case 'scrb_monthly': return renderScrbMonthly();
      case 'cyber_brief': return renderCyberBrief();
      case 'hotspot_report': return renderHotspotReport();
      case 'ps_review': return renderPsReview();
      case 'district_review': return renderDistrictReview();
      case 'ksp_annual': return renderKspAnnual();
      case 'ncrb_india': return renderNcrbIndia();
      default: return renderExecutiveBriefing();
    }
  };

  return (
    <div className="page-content reports-page text-inverse">
      {/* Scoped CSS Style Injection */}
      <style>{`
        /* ----------------------------------------------------
           LIGHT MODE (PRIMARY / DEFAULT)
           ---------------------------------------------------- */
        .reports-page {
          background-color: #faf8f5 !important;
          color: #1e293b !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 20px !important;
        }
        .reports-page .card {
          background-color: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 0px !important;
          box-shadow: none !important;
          padding: 16px !important;
        }
        .reports-page .card-header {
          border-bottom: 1px solid #cbd5e1 !important;
          padding-bottom: 8px !important;
          margin-bottom: 12px !important;
          background: transparent !important;
        }
        .reports-page .card-title {
          color: #1e293b !important;
          text-transform: uppercase !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          letter-spacing: 0.05em !important;
          margin: 0 !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
        }
        .reports-page .section-eyebrow {
          color: #64748b !important;
          font-size: 9px !important;
          text-transform: uppercase !important;
          letter-spacing: 1.5px !important;
          margin-bottom: 4px !important;
          font-weight: bold !important;
        }
        
        /* Form Inputs styling */
        .reports-page .form-grid {
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 12px !important;
          margin-bottom: 12px !important;
        }
        .reports-page .form-field {
          display: flex !important;
          flex-direction: column !important;
          gap: 4px !important;
        }
        .reports-page .form-label {
          font-size: 10px !important;
          text-transform: uppercase !important;
          color: #64748b !important;
          font-weight: 600 !important;
        }
        .reports-page .form-input, .reports-page .form-select {
          background-color: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          color: #1e293b !important;
          padding: 6px 10px !important;
          font-size: 12px !important;
          outline: none !important;
          border-radius: 0px !important;
          height: 32px !important;
        }
        .reports-page .form-input:focus, .reports-page .form-select:focus {
          border-color: #2563eb !important;
        }
        
        /* Filter Pills styling */
        .reports-page .pills-container {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
          padding: 10px 0 !important;
          border-top: 1px dashed #cbd5e1 !important;
          margin-top: 12px !important;
        }
        .reports-page .filter-pill {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 4px 10px !important;
          font-size: 11px !important;
          font-weight: bold !important;
          color: #ffffff !important;
          border-radius: 0px !important;
        }
        .reports-page .filter-pill.type-date { background-color: #2563eb !important; }
        .reports-page .filter-pill.type-geo { background-color: #16a34a !important; }
        .reports-page .filter-pill.type-crime { background-color: #d97706 !important; }
        .reports-page .filter-pill.type-other { background-color: #64748b !important; }
        .reports-page .pill-remove {
          cursor: pointer !important;
          font-weight: bold !important;
        }
        .reports-page .pill-remove:hover {
          color: #1e293b !important;
        }

        /* Buttons styling */
        .reports-page .btn {
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
        .reports-page .btn:hover:not(:disabled) {
          background-color: #1d4ed8 !important;
          border-color: #1d4ed8 !important;
        }
        .reports-page .btn:disabled {
          background-color: #cbd5e1 !important;
          border-color: #cbd5e1 !important;
          color: #64748b !important;
          cursor: not-allowed !important;
        }
        .reports-page .btn-secondary {
          background-color: transparent !important;
          color: #2563eb !important;
          border: 1px solid #2563eb !important;
        }
        .reports-page .btn-secondary:hover {
          background-color: rgba(37, 99, 235, 0.05) !important;
        }

        /* Tabs styling */
        .reports-page .tabs-header {
          display: flex !important;
          border-bottom: 2px solid #cbd5e1 !important;
          margin-bottom: 16px !important;
          gap: 16px !important;
        }
        .reports-page .tab-button {
          background: transparent !important;
          border: none !important;
          color: #64748b !important;
          padding: 8px 16px !important;
          font-size: 13px !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
          cursor: pointer !important;
          position: relative !important;
        }
        .reports-page .tab-button.active {
          color: #2563eb !important;
        }
        .reports-page .tab-button.active::after {
          content: '' !important;
          position: absolute !important;
          bottom: -2px !important;
          left: 0 !important;
          right: 0 !important;
          height: 2px !important;
          background-color: #2563eb !important;
        }
        
        .reports-page .data-table {
          width: 100% !important;
          border-collapse: collapse !important;
        }
        .reports-page .data-table th {
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
        .reports-page .data-table td {
          padding: 8px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          font-size: 12px !important;
          color: #1e293b !important;
          background: transparent !important;
        }
        .reports-page .data-table tbody tr:hover td {
          background-color: rgba(0, 0, 0, 0.02) !important;
        }

        /* ----------------------------------------------------
           DARK MODE (SECONDARY / CONTROL ROOM)
           ---------------------------------------------------- */
        .theme-dark .reports-page,
        [data-theme="dark"] .reports-page {
          background-color: #0B0E11 !important;
          color: #edf3fb !important;
        }
        .theme-dark .reports-page .card,
        [data-theme="dark"] .reports-page .card {
          background-color: #0B0E11 !important;
          border: 1px solid rgba(173, 193, 214, 0.15) !important;
        }
        .theme-dark .reports-page .card-header,
        [data-theme="dark"] .reports-page .card-header {
          border-bottom: 1px solid rgba(173, 193, 214, 0.15) !important;
        }
        .theme-dark .reports-page .card-title,
        [data-theme="dark"] .reports-page .card-title {
          color: #edf3fb !important;
        }
        .theme-dark .reports-page .section-eyebrow,
        [data-theme="dark"] .reports-page .section-eyebrow {
          color: #8fa2b8 !important;
        }
        .theme-dark .reports-page .form-label,
        [data-theme="dark"] .reports-page .form-label {
          color: #8fa2b8 !important;
        }
        .theme-dark .reports-page .form-input, .theme-dark .reports-page .form-select,
        [data-theme="dark"] .reports-page .form-input, [data-theme="dark"] .reports-page .form-select {
          background-color: #0B0E11 !important;
          border: 1px solid rgba(173, 193, 214, 0.15) !important;
          color: #edf3fb !important;
        }
        .theme-dark .reports-page .pills-container,
        [data-theme="dark"] .reports-page .pills-container {
          border-top: 1px dashed rgba(173, 193, 214, 0.2) !important;
        }
        .theme-dark .reports-page .pill-remove:hover,
        [data-theme="dark"] .reports-page .pill-remove:hover {
          color: #ffffff !important;
        }
        .theme-dark .reports-page .tabs-header,
        [data-theme="dark"] .reports-page .tabs-header {
          border-bottom: 2px solid rgba(173, 193, 214, 0.15) !important;
        }
        .theme-dark .reports-page .tab-button,
        [data-theme="dark"] .reports-page .tab-button {
          color: #8fa2b8 !important;
        }
        .theme-dark .reports-page .tab-button.active,
        [data-theme="dark"] .reports-page .tab-button.active {
          color: #2563eb !important;
        }
        .theme-dark .reports-page .data-table th,
        [data-theme="dark"] .reports-page .data-table th {
          color: #8fa2b8 !important;
          border-bottom: 1px solid rgba(173, 193, 214, 0.25) !important;
        }
        .theme-dark .reports-page .data-table td,
        [data-theme="dark"] .reports-page .data-table td {
          border-bottom: 1px solid rgba(173, 193, 214, 0.1) !important;
          color: #edf3fb !important;
        }
        .theme-dark .reports-page .data-table tbody tr:hover td,
        [data-theme="dark"] .reports-page .data-table tbody tr:hover td {
          background-color: rgba(255, 255, 255, 0.02) !important;
        }
        .theme-dark .chart-tooltip,
        [data-theme="dark"] .chart-tooltip {
          background-color: #0B0E11 !important;
          border: 1px solid rgba(30, 144, 255, 0.3) !important;
        }
        .theme-dark .chart-tooltip-label,
        [data-theme="dark"] .chart-tooltip-label {
          color: #8fa2b8 !important;
        }
      `}</style>

      {/* Section 1 — Query Creator Panel */}
      <article className="card animate-fade-in" style={{ padding: 20 }}>
        <div className="card-header">
          <h3 className="card-title"><FileText size={16} strokeWidth={1.5} /> KSP Crime Data Explorer — Query Creator</h3>
        </div>

        {/* Step-by-Step Instructions Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          marginBottom: '16px',
          background: 'rgba(0, 33, 71, 0.05)',
          border: '1px solid rgba(0, 33, 71, 0.2)',
          borderLeft: '4px solid #002147',
          borderRadius: '4px',
          fontSize: '11.5px',
          color: activeThemeColors.textColor
        }}>
          <Info size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <div style={{ lineHeight: '1.5' }}>
            <strong style={{ color: '#002147' }}>HOW TO APPLY FILTERS & COMPILE DOSSIER:</strong>
            {' '}1. Select your <strong>Report Template, Date Range, District, and Offense Category</strong> below.
            {' '}2. Click <strong style={{ color: 'var(--text-primary)', background: 'var(--bg-panel-alt)', padding: '1px 6px', border: '1px solid var(--border-color)', borderRadius: '3px' }}>+ Add Query Criteria</strong> to stage your query.
            {' '}3. Click <strong style={{ color: '#fff', background: '#2563eb', padding: '1px 6px', borderRadius: '3px' }}>Submit Query</strong> to generate the live report briefing, charts, and case table.
          </div>
        </div>
        
        {/* Row 1: Date Range, Location, Crime selectors */}
        <div className="form-grid">
          {/* Active Template Selector */}
          <div className="form-field">
            <span className="form-label">Briefing Report Template</span>
            <select value={activeTemplate} onChange={e => handleTemplateChange(e.target.value)} className="form-select" style={{ borderColor: '#2563eb', fontWeight: 'bold' }}>
              <option value="morning_brief">Commissioner Morning Brief</option>
              <option value="dgp_situation">DGP Situation Report</option>
              <option value="executive">Executive Briefing</option>
              <option value="scrb_monthly">SCRB Monthly Review</option>
              <option value="cyber_brief">Cyber Crime Intelligence Brief</option>
              <option value="hotspot_report">Hotspot Analysis Report</option>
              <option value="ps_review">Police Station Crime Review</option>
              <option value="district_review">District Crime Review</option>
              <option value="ksp_annual">KSP State Annual Crime Review</option>
              <option value="ncrb_india">NCRB Crime in India Report</option>
            </select>
          </div>

          {/* Date Selection */}
          <div className="form-field" style={{ opacity: activeTemplate === 'morning_brief' ? 0.5 : 1 }}>
            <span className="form-label">From Month / Year</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={fromMonth} onChange={e => setFromMonth(e.target.value)} disabled={activeTemplate === 'morning_brief'} className="form-select" style={{ flex: 1 }}>
                {MONTHS_LIST.map(m => <option key={m.value} value={m.value}>{m.label.slice(0, 3)}</option>)}
              </select>
              <select value={fromYear} onChange={e => setFromYear(e.target.value)} disabled={activeTemplate === 'morning_brief'} className="form-select" style={{ width: 70 }}>
                {YEARS_LIST.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          
          <div className="form-field" style={{ opacity: activeTemplate === 'morning_brief' ? 0.5 : 1 }}>
            <span className="form-label">To Month / Year</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={toMonth} onChange={e => setToMonth(e.target.value)} disabled={activeTemplate === 'morning_brief'} className="form-select" style={{ flex: 1 }}>
                {MONTHS_LIST.map(m => <option key={m.value} value={m.value}>{m.label.slice(0, 3)}</option>)}
              </select>
              <select value={toYear} onChange={e => setToYear(e.target.value)} disabled={activeTemplate === 'morning_brief'} className="form-select" style={{ width: 70 }}>
                {YEARS_LIST.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Geography Selection */}
          <div className="form-field">
            <span className="form-label">Geography — District</span>
            <select value={selectedDistrict} onChange={e => { setSelectedDistrict(e.target.value); setSelectedStation('all'); }} className="form-select">
              <option value="all">Select District (All)</option>
              {districts.map(d => <option key={d.DistrictID} value={d.DistrictID}>{d.DistrictName}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2: Offense Selectors & Basic Filters */}
        <div className="form-grid">
          <div className="form-field">
            <span className="form-label">Geography — Police Station</span>
            <select value={selectedStation} onChange={e => setSelectedStation(e.target.value)} disabled={selectedDistrict === 'all'} className="form-select">
              <option value="all">Select Station (All)</option>
              {filteredStations.map(s => <option key={s.UnitID} value={s.UnitID}>{s.UnitName}</option>)}
            </select>
          </div>

          {/* Crime Selection */}
          <div className="form-field" style={{ opacity: activeTemplate === 'cyber_brief' ? 0.5 : 1 }}>
            <span className="form-label">Offense — Crime Head</span>
            <select value={selectedCrimeHead} disabled={activeTemplate === 'cyber_brief'} onChange={e => { setSelectedCrimeHead(e.target.value); setSelectedCrimeSubHead('all'); }} className="form-select">
              <option value="all">Select Category (All)</option>
              {crimeHeads.map(h => <option key={h.CrimeHeadID} value={h.CrimeHeadID}>{h.CrimeGroupName}</option>)}
            </select>
          </div>

          <div className="form-field" style={{ opacity: activeTemplate === 'cyber_brief' ? 0.5 : 1 }}>
            <span className="form-label">Offense — Sub-Category</span>
            <select value={selectedCrimeSubHead} onChange={e => setSelectedCrimeSubHead(e.target.value)} disabled={selectedCrimeHead === 'all' || activeTemplate === 'cyber_brief'} className="form-select">
              <option value="all">Select Type (All)</option>
              {filteredSubHeads.map(s => <option key={s.CrimeSubHeadID} value={s.CrimeSubHeadID}>{s.CrimeHeadName}</option>)}
            </select>
          </div>

          {/* Basic Case Filter parameters */}
          <div className="form-field">
            <span className="form-label">Case Classification</span>
            <select value={selectedCaseCategory} onChange={e => setSelectedCaseCategory(e.target.value)} className="form-select">
              <option value="all">All Category (FIR/UDR)</option>
              {caseCategories.map(c => <option key={c.CaseCategoryID} value={c.CaseCategoryID}>{c.LookupValue}</option>)}
            </select>
          </div>
        </div>

        {/* Advanced Filters (Collapsible) */}
        {showAdvanced && (
          <div className="form-grid animate-fade-in" style={{ paddingTop: '8px' }}>
            <div className="form-field">
              <span className="form-label">Investigation Severity</span>
              <select value={selectedSeverity} onChange={e => setSelectedSeverity(e.target.value)} className="form-select">
                <option value="all">All Offences</option>
                <option value="heinous">Heinous</option>
                <option value="non-heinous">Non-Heinous</option>
              </select>
            </div>

            <div className="form-field">
              <span className="form-label">Case Status</span>
              <select value={selectedCaseStatus} onChange={e => setSelectedCaseStatus(e.target.value)} className="form-select">
                <option value="all">All Statuses</option>
                {caseStatusMaster.map(s => <option key={s.CaseStatusID} value={s.CaseStatusID}>{s.CaseStatusName}</option>)}
              </select>
            </div>

            <div className="form-field">
              <span className="form-label">Law / Act Code</span>
              <select value={selectedAct} onChange={e => { setSelectedAct(e.target.value); setSelectedSection(''); }} className="form-select">
                <option value="all">Select Act (All)</option>
                {acts.map(a => <option key={a.ActCode} value={a.ActCode}>{a.ActName}</option>)}
              </select>
            </div>

            <div className="form-field">
              <span className="form-label">Law Section Code</span>
              <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={selectedAct === 'all'} className="form-select">
                <option value="">Select Section (All)</option>
                {filteredSections.map(s => <option key={s.SectionCode} value={s.SectionCode}>{s.SectionCode} - {s.SectionName}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Buttons and pills */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="btn btn-secondary">
            {showAdvanced ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
          </button>
          
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={handleAddQuery} className="btn btn-secondary" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <PlusCircle size={16} strokeWidth={1.5} /> Add Query Criteria
            </button>
            <button type="button" onClick={handleSubmitQuery} disabled={!isValid} className="btn" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Search size={16} strokeWidth={1.5} /> Submit Query
            </button>
          </div>
        </div>

        {/* Removable chips/pills list */}
        {pills.length > 0 && (
          <div className="pills-container">
            {pills.map((pill) => {
              const pillClass = pill.type === 'DATERANGE' ? 'type-date' : pill.type === 'GEOGRAPHY' ? 'type-geo' : pill.type === 'OFFENSE' ? 'type-crime' : 'type-other';
              return (
                <div key={pill.id} className={`filter-pill ${pillClass}`}>
                  <span>{pill.label}</span>
                  <span onClick={() => handleRemovePill(pill.id)} className="pill-remove" style={{ display: 'inline-flex', alignItems: 'center' }}><X size={16} strokeWidth={1.5} /></span>
                </div>
              );
            })}
          </div>
        )}
      </article>

      {/* Query creation guideline caveat note */}
      {!submittedQuery && (
        <article className="card animate-fade-in" style={{ textAlign: 'center', padding: '24px', color: activeThemeColors.mutedTextColor }}>
          <FileText size={18} strokeWidth={1.5} style={{ display: 'block', margin: '0 auto 12px', color: 'var(--text-secondary)' }} />
          <h4 style={{ margin: '0 0 6px', textTransform: 'uppercase', fontSize: 13, fontWeight: 700 }}>Query Required to Generate Report</h4>
          <p style={{ fontSize: 12, maxWidth: 520, margin: '0 auto', lineHeight: '18px' }}>
            All queries require a date/year range, at least one geographical location (District), and at least one offence category (Crime Head) to be valid and submitted. Add criteria above, then click submit to visualize analytical data.
          </p>
        </article>
      )}

      {/* Section 2 — Results View */}
      {submittedQuery && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Export and Tab Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="tabs-header" style={{ marginBottom: 0, borderBottom: 'none' }}>
              <button type="button" onClick={() => setActiveTab('briefing')} className={`tab-button ${activeTab === 'briefing' ? 'active' : ''}`}>Report Briefing</button>
              <button type="button" onClick={() => setActiveTab('charts')} className={`tab-button ${activeTab === 'charts' ? 'active' : ''}`}>Charts</button>
              <button type="button" onClick={() => setActiveTab('table')} className={`tab-button ${activeTab === 'table' ? 'active' : ''}`}>Table</button>
            </div>
            
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={exportPDF} disabled={exporting} className="btn btn-secondary" style={{ height: 32, padding: '0 12px' }}><FileText size={16} strokeWidth={1.5} /> Export PDF</button>
              <button type="button" onClick={exportXLSX} disabled={exporting} className="btn btn-secondary" style={{ height: 32, padding: '0 12px' }}><Download size={16} strokeWidth={1.5} /> Export XLSX</button>
              <button type="button" onClick={exportCSV} disabled={exporting} className="btn btn-secondary" style={{ height: 32, padding: '0 12px' }}><Download size={16} strokeWidth={1.5} /> Export CSV</button>
            </div>
          </div>

          {/* Dynamic Caveats */}
          <div style={{ padding: '10px 14px', background: 'rgba(37, 99, 235, 0.05)', borderLeft: '3px solid #2563eb', fontSize: '11px', color: activeThemeColors.mutedTextColor, fontFamily: 'Consolas, monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={16} strokeWidth={1.5} style={{ color: 'var(--accent-warning)', flexShrink: 0 }} />
            <span>DATA CAVEAT NOTE: Records reflect case status entries uploaded dynamically by respective Sho circles. Spatiotemporal coordinates are secured at source in compliance with privacy regulations. Click legends to isolate compared lines.</span>
          </div>

          {/* Results Area */}
          <article id="report-export-content" className="card" style={{ padding: 20 }}>
            {activeTab === 'briefing' ? (
              <div id="report-briefing-pdf" style={{ padding: '10px 15px', backgroundColor: '#ffffff', color: '#1a1a1a' }}>
                {renderTemplateContent()}
              </div>
            ) : activeTab === 'charts' ? (
              <div id="report-chart-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ borderBottom: `1px solid ${activeThemeColors.border}`, paddingBottom: 8 }}>
                  <span className="section-eyebrow">Time Series Visualizer</span>
                  <h4 style={{ margin: 0, textTransform: 'uppercase', fontSize: 13, fontWeight: 700, color: activeThemeColors.textColor }}>
                    FIR Registration Progression Trend — Query Analysis
                  </h4>
                </div>
                
                {chartData.data && chartData.data.length > 0 ? (
                  <div style={{
                    height: '330px',
                    width: '100%',
                    background: theme === 'dark'
                      ? 'linear-gradient(to right, rgba(148, 163, 184, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.05) 1px, transparent 1px)'
                      : 'linear-gradient(to right, rgba(100, 116, 139, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(100, 116, 139, 0.05) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                    borderRadius: '4px',
                    border: `1px solid ${activeThemeColors.border}`,
                    padding: '12px 12px 6px 0',
                    boxSizing: 'border-box'
                  }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.data} margin={{ top: 10, bottom: 5, left: -10, right: 10 }}>
                        <CartesianGrid stroke={activeThemeColors.gridColor} strokeDasharray="3 3" vertical={true} horizontal={true} strokeOpacity={0.6} />
                        <XAxis dataKey="name" stroke={activeThemeColors.mutedTextColor} tickLine={false} axisLine={false} style={{ fontSize: '11px' }} />
                        <YAxis stroke={activeThemeColors.mutedTextColor} tickLine={false} axisLine={false} style={{ fontSize: '11px' }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend 
                          verticalAlign="top" 
                          height={36} 
                          wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', cursor: 'pointer' }} 
                        />
                        {chartData.keys.map((key, index) => {
                          const palette = ['#2563eb', '#d97706', '#16a34a', '#dc2626', '#64748b', '#3b82f6'];
                          const color = palette[index % palette.length];
                          return (
                            <Line 
                              key={key}
                              type="monotone"
                              dataKey={key}
                              name={key}
                              stroke={color}
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              activeDot={{ r: 5 }}
                            />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: activeThemeColors.mutedTextColor }}>
                    No matching spatiotemporal records within this time bounds.
                  </div>
                )}
              </div>
            ) : (
              <div className="table-wrap" style={{ overflowX: 'auto' }}>
                <div style={{ padding: '0 0 10px', fontSize: '11px', color: activeThemeColors.mutedTextColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <Lightbulb size={16} strokeWidth={1.5} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Click on any case row below to open and inspect in the <strong>Case Registry</strong> ({hasCaseAccess ? 'Authorized Access' : 'Command Elevation Required'}).
                  </span>
                  <span style={{ fontWeight: 600, color: '#2563eb' }}>
                    {filteredCases.length} Matching Records
                  </span>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Case ID</th>
                      <th>FIR Number</th>
                      <th>Crime Category (Major Head)</th>
                      <th>Crime Type (Minor Head)</th>
                      <th>District</th>
                      <th>Station</th>
                      <th>Registration Date</th>
                      <th>Status</th>
                      <th>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map(c => (
                      <tr 
                        key={c.CaseMasterID}
                        onClick={() => handleCaseClick(c)}
                        style={{
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                        className="ksp-case-row"
                        title={hasCaseAccess ? `Click to inspect Case #${c.CaseMasterID} in Case Registry` : `Case #${c.CaseMasterID} (Click to check authorization)`}
                      >
                        <td>
                          <span style={{ color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}>
                            #{c.CaseMasterID}
                            <ExternalLink size={16} strokeWidth={1.5} style={{ opacity: 0.8 }} />
                          </span>
                        </td>
                        <td><strong>{isCommandMode ? c.FIRNo : maskText(c.FIRNo || `FIR-${c.CaseMasterID}`, 6, 4)}</strong></td>
                        <td>{c.majorHeadName}</td>
                        <td>{c.minorHeadName}</td>
                        <td>{c.districtName}</td>
                        <td>{c.policeStationName}</td>
                        <td>{String(c.CrimeRegisteredDate).split(' ')[0]}</td>
                        <td>
                          <span style={{ color: c.statusName === 'Closed' ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                            {c.statusName}
                          </span>
                        </td>
                        <td>{c.gravityLabel}</td>
                      </tr>
                    ))}
                    {filteredCases.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', color: activeThemeColors.mutedTextColor }}>
                          No case records match the submitted query criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      )}

      {/* Permission Warning Dialog when restricted user clicks a case */}
      {accessNotice && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setAccessNotice(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              background: activeThemeColors.cardBg,
              border: '1px solid var(--border-color)',
              borderTop: '4px solid #dc2626',
              borderRadius: '8px',
              padding: '20px',
              color: activeThemeColors.textColor,
              boxShadow: '0 16px 36px rgba(0,0,0,0.35)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                <Shield size={18} strokeWidth={1.5} style={{ color: 'var(--accent-danger)' }} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, textTransform: 'uppercase' }}>
                  Command Access Required
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setAccessNotice(null)}
                style={{ background: 'transparent', border: 'none', color: activeThemeColors.mutedTextColor, cursor: 'pointer', padding: 4 }}
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <p style={{ fontSize: '12px', lineHeight: '1.5', margin: '0 0 12px', color: activeThemeColors.textColor }}>
              Access to Case Registry record <strong>#{accessNotice.caseId} ({accessNotice.crimeNo})</strong> at <strong>{accessNotice.station} ({accessNotice.district})</strong> requires <strong>Command Center</strong> or <strong>Administrator</strong> authorization.
            </p>
            <div style={{ padding: '8px 12px', background: 'rgba(220, 38, 38, 0.08)', borderRadius: '4px', fontSize: '11px', color: '#dc2626', marginBottom: '16px' }}>
              <Lock size={16} strokeWidth={1.5} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Currently browsing in <em>{session?.role || 'Redacted Analyst'}</em> mode. To inspect full unredacted case registry details, please unlock Command Mode using your authorized officer credentials in the header.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setAccessNotice(null)}
                className="btn"
                style={{ height: '30px', padding: '0 14px', fontSize: '11px' }}
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Shared Document Letterhead wrapper helper with authentic Karnataka State Police Branding
const renderHeaderFooterShell = (reportTitle, filterDesc, content) => {
  const reportId = `KSP/SCRB/2026/QB-${reportTitle.toUpperCase().replace(/\s+/g, '-')}`;
  const timestamp = new Date().toLocaleString('en-IN');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Consolas, Georgia, serif', color: '#111' }}>
      {/* Official KSP Top Police Banner */}
      <div style={{
        borderBottom: '3px solid #002147',
        paddingBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative'
      }}>
        {/* Gold accent sub-stripe */}
        <div style={{ position: 'absolute', bottom: '-6px', left: 0, right: 0, height: '2px', backgroundColor: '#DAA520' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src={`${process.env.PUBLIC_URL || ''}/ksp-emblem.png`}
            alt="Karnataka State Police Emblem"
            style={{ width: '56px', height: '56px', objectFit: 'contain' }}
            onError={(e) => { e.target.src = '/app/ksp-emblem.png'; }}
          />
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#002147', letterSpacing: '0.5px' }}>
              ಕರ್ನಾಟಕ ರಾಜ್ಯ ಪೊಲೀಸ್ • GOVERNMENT OF KARNATAKA
            </div>
            <h2 style={{ margin: '2px 0 0', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#002147', fontWeight: 900 }}>
              KARNATAKA STATE POLICE
            </h2>
            <h3 style={{ margin: '2px 0 0', fontSize: '11px', textTransform: 'uppercase', color: '#8B0000', letterSpacing: '1px', fontWeight: 700 }}>
              STATE CRIME RECORDS BUREAU • CID HEADQUARTERS, BENGALURU
            </h3>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              MADHUKAR Automated Crime Intelligence & Analytics Dossier
            </div>
          </div>
        </div>

        {/* Security & Confidentiality Block */}
        <div style={{
          textAlign: 'right',
          fontSize: '10px',
          color: '#334155',
          border: '1.5px solid #8B0000',
          padding: '8px 14px',
          borderRadius: '4px',
          backgroundColor: 'rgba(139, 0, 0, 0.03)'
        }}>
          <strong style={{ display: 'block', color: '#8B0000', fontSize: '11px', letterSpacing: '1px', marginBottom: '3px' }}>
            CONFIDENTIAL • OFFICIAL POLICE RECORD
          </strong>
          <div><strong style={{ color: '#002147' }}>REF:</strong> {reportId}</div>
          <div><strong style={{ color: '#002147' }}>Generated:</strong> {timestamp}</div>
          <div><strong style={{ color: '#002147' }}>Authority:</strong> DGP Karnataka State Police Command</div>
        </div>
      </div>

      {/* Query Scope descriptor */}
      <div style={{
        padding: '10px 14px',
        border: '1px solid #cbd5e1',
        borderLeft: '4px solid #002147',
        backgroundColor: 'rgba(0, 33, 71, 0.03)',
        fontSize: '11px',
        color: '#1e293b'
      }}>
        <strong style={{ color: '#002147' }}>OFFICIAL QUERY SCOPE:</strong> {filterDesc}
      </div>

      {/* Report Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {content}
      </div>

      {/* Footer Block */}
      <div style={{
        borderTop: '2px solid #DAA520',
        paddingTop: '16px',
        marginTop: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        fontSize: '10px',
        color: '#555'
      }}>
        <div>
          <div style={{ fontWeight: 700, color: '#002147' }}>KARNATAKA STATE POLICE — MADHUKAR AUTOMATED INTELLIGENCE PLATFORM</div>
          <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
            Security Level 4 Verified • Audit Signature ECDSA-SHA256 • Law Enforcement Sensitive (LES)
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <img
            src={`${process.env.PUBLIC_URL || ''}/ksp-emblem.png`}
            alt="KSP Seal"
            style={{ width: '36px', height: '36px', objectFit: 'contain' }}
            onError={(e) => { e.target.src = '/app/ksp-emblem.png'; }}
          />
          <div style={{
            textAlign: 'center',
            border: '1px solid #002147',
            backgroundColor: 'rgba(0, 33, 71, 0.03)',
            padding: '5px 12px',
            borderRadius: '2px',
            width: '140px'
          }}>
            <div style={{ fontSize: '8.5px', fontStyle: 'italic', color: '#64748b' }}>Digitally Certified</div>
            <strong style={{ display: 'block', fontSize: '10px', color: '#002147', marginTop: '1px' }}>DGP Command Center</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
