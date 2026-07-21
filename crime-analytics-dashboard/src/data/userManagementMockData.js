// ============================================================================
// KSP Crime Analytics Dashboard - User Management Module Mock Data
// Matches KSP administrative structures and administrative hierarchies
// ============================================================================

// 1. Clearance Levels
export const clearanceLevels = [
  { level_id: 'L1', name: 'General', hierarchy_index: 1 },
  { level_id: 'L2', name: 'Restricted', hierarchy_index: 2 },
  { level_id: 'L3', name: 'Confidential', hierarchy_index: 3 },
  { level_id: 'L4', name: 'Secret', hierarchy_index: 4 },
  { level_id: 'L5', name: 'Top Secret', hierarchy_index: 5 }
];

// 2. KSP Organizational Structure (Hierarchy)
// State -> Range -> District -> Station -> Unit
export const hierarchyTree = {
  id: 'ksp_state',
  name: 'Karnataka State Police (KSP)',
  type: 'state',
  children: [
    {
      id: 'range_bengaluru',
      name: 'Bengaluru Range',
      type: 'range',
      children: [
        {
          id: 'dist_bengaluru_city',
          name: 'Bengaluru City',
          type: 'district',
          children: [
            {
              id: 'stat_koramangala',
              name: 'Koramangala Station',
              type: 'station',
              children: [
                { id: 'unit_koramangala_crime', name: 'Koramangala Crime Branch Unit', type: 'unit' },
                { id: 'unit_koramangala_lo', name: 'Koramangala Law & Order Unit', type: 'unit' }
              ]
            },
            {
              id: 'stat_jayanagar',
              name: 'Jayanagar Station',
              type: 'station',
              children: [
                { id: 'unit_jayanagar_traffic', name: 'Jayanagar Traffic Unit', type: 'unit' },
                { id: 'unit_jayanagar_investigation', name: 'Jayanagar Special Investigation Unit', type: 'unit' }
              ]
            }
          ]
        },
        {
          id: 'dist_bengaluru_rural',
          name: 'Bengaluru Rural',
          type: 'district',
          children: [
            {
              id: 'stat_hoskote',
              name: 'Hoskote Station',
              type: 'station',
              children: [
                { id: 'unit_hoskote_general', name: 'Hoskote General Patrol Unit', type: 'unit' }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'range_mysuru',
      name: 'Mysuru Range',
      type: 'range',
      children: [
        {
          id: 'dist_mysuru_city',
          name: 'Mysuru District',
          type: 'district',
          children: [
            {
              id: 'stat_devaraja',
              name: 'Devaraja Station',
              type: 'station',
              children: [
                { id: 'unit_devaraja_patrol', name: 'Devaraja Cheetah Patrol Unit', type: 'unit' }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'range_western',
      name: 'Western Range (Mangaluru)',
      type: 'range',
      children: [
        {
          id: 'dist_dakshina_kannada',
          name: 'Dakshina Kannada District',
          type: 'district',
          children: [
            {
              id: 'stat_hampankatta',
              name: 'Hampankatta Station',
              type: 'station',
              children: [
                { id: 'unit_hampankatta_coastal', name: 'Hampankatta Coastal Security Unit', type: 'unit' }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// Flattened mapping helpers for easier lookup
export const ranges = [
  { range_id: 'range_bengaluru', name: 'Bengaluru Range' },
  { range_id: 'range_mysuru', name: 'Mysuru Range' },
  { range_id: 'range_western', name: 'Western Range' }
];

export const districts = [
  { district_id: 'dist_bengaluru_city', name: 'Bengaluru City', range_id: 'range_bengaluru' },
  { district_id: 'dist_bengaluru_rural', name: 'Bengaluru Rural', range_id: 'range_bengaluru' },
  { district_id: 'dist_mysuru_city', name: 'Mysuru District', range_id: 'range_mysuru' },
  { district_id: 'dist_dakshina_kannada', name: 'Dakshina Kannada District', range_id: 'range_western' }
];

export const stations = [
  { station_id: 'stat_koramangala', name: 'Koramangala Station', district_id: 'dist_bengaluru_city' },
  { station_id: 'stat_jayanagar', name: 'Jayanagar Station', district_id: 'dist_bengaluru_city' },
  { station_id: 'stat_hoskote', name: 'Hoskote Station', district_id: 'dist_bengaluru_rural' },
  { station_id: 'stat_devaraja', name: 'Devaraja Station', district_id: 'dist_mysuru_city' },
  { station_id: 'stat_hampankatta', name: 'Hampankatta Station', district_id: 'dist_dakshina_kannada' }
];

export const departments = [
  { dept_id: 'dept_crime', name: 'Crime Branch' },
  { dept_id: 'dept_lo', name: 'Law & Order' },
  { dept_id: 'dept_traffic', name: 'Traffic' },
  { dept_id: 'dept_sb', name: 'Special Branch' },
  { dept_id: 'dept_cyber', name: 'Cyber Crime Cell' }
];

// 3. Permissions List
export const permissions = [
  // Module: Cases
  { perm_id: 'read_cases', name: 'Read Case Records', module: 'Cases', description: 'Allows viewing FIRs, general statements, and basic incident logs.' },
  { perm_id: 'write_cases', name: 'Modify Case Records', module: 'Cases', description: 'Allows updating case statuses, details, and writing incident files.' },
  { perm_id: 'delete_cases', name: 'Delete Case Records', module: 'Cases', description: 'Allows permanent removal of case records (High Clearance Only).' },
  { perm_id: 'view_restricted_cases', name: 'Access Restricted Cases', module: 'Cases', description: 'Access highly sensitive cases restricted by unit code.' },

  // Module: Reports
  { perm_id: 'generate_reports', name: 'Generate Reports', module: 'Reports', description: 'Create and query data insights, generating visual data.' },
  { perm_id: 'export_reports', name: 'Export Report Data', module: 'Reports', description: 'Allows exporting reports to CSV, XLSX, and PDF.' },
  { perm_id: 'edit_report_templates', name: 'Modify PDF Templates', module: 'Reports', description: 'Configure layout parameters and letterheads.' },

  // Module: Officer Directory
  { perm_id: 'view_directory', name: 'View Officer Directory', module: 'Officer Directory', description: 'Search and browse officers and their clearance levels.' },
  { perm_id: 'modify_officers', name: 'Edit Officer Profiles', module: 'Officer Directory', description: 'Allows adding officers and editing basic information.' },
  { perm_id: 'suspend_officers', name: 'Manage Status / Suspend', module: 'Officer Directory', description: 'Suspend or disable accounts, lock active sessions.' },

  // Module: Evidence
  { perm_id: 'view_evidence', name: 'View Evidence Locker', module: 'Evidence', description: 'Access records, media files, and physical exhibits in the workspace.' },
  { perm_id: 'catalog_evidence', name: 'Log & Tag Evidence', module: 'Evidence', description: 'Allows logging new evidence files and uploading reports.' },
  { perm_id: 'analyze_correlations', name: 'Run AI Correlations', module: 'Evidence', description: 'Execute AI matching algorithm between incidents.' },

  // Module: Analytics
  { perm_id: 'view_dashboard', name: 'Access Dashboard', module: 'Analytics', description: 'Access the main Command Center analytics page.' },
  { perm_id: 'view_gis_map', name: 'Access GIS Map', module: 'Analytics', description: 'Browse incident geo-heatmaps and cluster locations.' },
  { perm_id: 'view_predictions', name: 'Access Risk Forecasts', module: 'Analytics', description: 'Access future incident predictions and hotspots.' },

  // Module: Admin
  { perm_id: 'manage_roles', name: 'Roles & Security Policies', module: 'Admin', description: 'Allows modifying role definitions and assignments.' },
  { perm_id: 'manage_sessions', name: 'Monitor & Terminate Sessions', module: 'Admin', description: 'Force logouts, inspect active IP sessions.' },
  { perm_id: 'audit_trail_view', name: 'Inspect Security Audit Logs', module: 'Admin', description: 'Access the chronological security event trail.' },
  { perm_id: 'approve_requests', name: 'Access Approval Queue', module: 'Admin', description: 'Grant clearance upgrades, transfers, or break-glass access.' }
];

// 4. Roles (with inheritance links)
export const roles = [
  { role_id: 'role_constable', name: 'Constable', description: 'Basic field access, read permissions for cases & dashboard.', clearance_required: 'L1', inherits_from: null },
  { role_id: 'role_hc', name: 'Head Constable', description: 'Patrol command, read cases and basic logging.', clearance_required: 'L1', inherits_from: 'role_constable' },
  { role_id: 'role_asi', name: 'ASI', description: 'Assistant Sub-Inspector, can catalog evidence and basic write cases.', clearance_required: 'L2', inherits_from: 'role_hc' },
  { role_id: 'role_si', name: 'Sub-Inspector', description: 'Station Sub-Inspector, full read/write cases in district, edit reports.', clearance_required: 'L2', inherits_from: 'role_asi' },
  { role_id: 'role_inspector', name: 'Inspector', description: 'Circle/Station Inspector, manages investigations, generates reports.', clearance_required: 'L3', inherits_from: 'role_si' },
  { role_id: 'role_dysp', name: 'Deputy SP', description: 'Sub-divisional supervisor, approves general items, views predicted logs.', clearance_required: 'L3', inherits_from: 'role_inspector' },
  { role_id: 'role_sp', name: 'Superintendent (SP)', description: 'District Commander, manages officers directory and GIS insights.', clearance_required: 'L4', inherits_from: 'role_dysp' },
  { role_id: 'role_igp', name: 'Inspector General (IGP)', description: 'Range Inspector General, full analytics control, approval center rights.', clearance_required: 'L4', inherits_from: 'role_sp' },
  { role_id: 'role_adgp', name: 'Additional DGP', description: 'State-level security director, handles high policy audits.', clearance_required: 'L5', inherits_from: 'role_igp' },
  { role_id: 'role_dgp', name: 'State DGP (IPS)', description: 'Director General of Police, full command rights, break-glass auditor.', clearance_required: 'L5', inherits_from: 'role_adgp' }
];

// 5. Role-Permission Matrix explicitly granted (not inherited)
export const rolePermissions = [
  // Constable
  { role_id: 'role_constable', perm_id: 'read_cases', allowed: true },
  { role_id: 'role_constable', perm_id: 'view_dashboard', allowed: true },
  { role_id: 'role_constable', perm_id: 'view_gis_map', allowed: true },

  // Head Constable
  { role_id: 'role_hc', perm_id: 'view_evidence', allowed: true },

  // ASI
  { role_id: 'role_asi', perm_id: 'catalog_evidence', allowed: true },

  // SI
  { role_id: 'role_si', perm_id: 'write_cases', allowed: true },
  { role_id: 'role_si', perm_id: 'generate_reports', allowed: true },

  // Inspector
  { role_id: 'role_inspector', perm_id: 'view_directory', allowed: true },
  { role_id: 'role_inspector', perm_id: 'analyze_correlations', allowed: true },

  // DySP
  { role_id: 'role_dysp', perm_id: 'view_predictions', allowed: true },

  // SP
  { role_id: 'role_sp', perm_id: 'modify_officers', allowed: true },
  { role_id: 'role_sp', perm_id: 'view_restricted_cases', allowed: true },

  // IGP
  { role_id: 'role_igp', perm_id: 'export_reports', allowed: true },
  { role_id: 'role_igp', perm_id: 'approve_requests', allowed: true },

  // ADGP
  { role_id: 'role_adgp', perm_id: 'audit_trail_view', allowed: true },
  { role_id: 'role_adgp', perm_id: 'suspend_officers', allowed: true },
  { role_id: 'role_adgp', perm_id: 'manage_sessions', allowed: true },

  // DGP
  { role_id: 'role_dgp', perm_id: 'manage_roles', allowed: true },
  { role_id: 'role_dgp', perm_id: 'delete_cases', allowed: true },
  { role_id: 'role_dgp', perm_id: 'edit_report_templates', allowed: true }
];

// Helper to resolve effective permissions for a role, factoring in inheritance chain
export function getEffectivePermissions(roleId) {
  const effective = {};
  
  // Recursively fetch parent roles
  let currentRoleId = roleId;
  const roleChain = [];
  
  while (currentRoleId) {
    roleChain.unshift(currentRoleId); // Prepend so parents are processed first, children override
    const rObj = roles.find(r => r.role_id === currentRoleId);
    currentRoleId = rObj ? rObj.inherits_from : null;
  }

  // Apply grants in order from top parent to selected child
  roleChain.forEach(rId => {
    rolePermissions
      .filter(rp => rp.role_id === rId)
      .forEach(rp => {
        effective[rp.perm_id] = {
          allowed: rp.allowed,
          source: rId === roleId ? 'direct' : 'inherited',
          inheritedFrom: rId !== roleId ? roles.find(r => r.role_id === rId)?.name : null
        };
      });
  });

  return effective;
}

// 6. Officers Directory (Mock Database)
export const initialOfficers = [
  {
    officer_id: 'ksp_off_101',
    badge_no: 'KSP-88219',
    name: 'DGP Kishore IPS',
    rank: 'DGP',
    district_id: 'dist_bengaluru_city',
    station_id: 'stat_koramangala',
    dept_id: 'dept_sb',
    hire_date: '2010-06-12',
    status: 'Active',
    clearance_level: 'L5', // Top Secret
    email: 'kishore.dgp@ksp.gov.in',
    phone: '+91 94498 66201',
    roles: ['role_dgp', 'role_igp']
  },
  {
    officer_id: 'ksp_off_102',
    badge_no: 'KSP-44320',
    name: 'PSI Ramesh Kumar',
    rank: 'Sub-Inspector',
    district_id: 'dist_bengaluru_city',
    station_id: 'stat_koramangala',
    dept_id: 'dept_crime',
    hire_date: '2018-02-15',
    status: 'Active',
    clearance_level: 'L2', // Restricted
    email: 'ramesh.k@ksp.gov.in',
    phone: '+91 98860 11024',
    roles: ['role_si']
  },
  {
    officer_id: 'ksp_off_103',
    badge_no: 'KSP-12059',
    name: 'Analyst Ananya Hegde',
    rank: 'Inspector',
    district_id: 'dist_bengaluru_city',
    station_id: 'stat_jayanagar',
    dept_id: 'dept_cyber',
    hire_date: '2021-09-01',
    status: 'Active',
    clearance_level: 'L3', // Confidential
    email: 'ananya.hegde@ksp.gov.in',
    phone: '+91 80562 23145',
    roles: ['role_inspector']
  },
  {
    officer_id: 'ksp_off_104',
    badge_no: 'KSP-99120',
    name: 'PSI Suresh Gowda',
    rank: 'Sub-Inspector',
    district_id: 'dist_bengaluru_city',
    station_id: 'stat_jayanagar',
    dept_id: 'dept_lo',
    hire_date: '2016-11-20',
    status: 'On Leave',
    clearance_level: 'L2', // Restricted
    email: 'suresh.g@ksp.gov.in',
    phone: '+91 94491 55621',
    roles: ['role_si']
  },
  {
    officer_id: 'ksp_off_105',
    badge_no: 'KSP-11409',
    name: 'IGP Sharanappa IPS',
    rank: 'IGP',
    district_id: 'dist_mysuru_city',
    station_id: 'stat_devaraja',
    dept_id: 'dept_lo',
    hire_date: '2012-04-10',
    status: 'Active',
    clearance_level: 'L4', // Secret
    email: 'sharanappa.igp@ksp.gov.in',
    phone: '+91 98450 78210',
    roles: ['role_igp']
  },
  {
    officer_id: 'ksp_off_106',
    badge_no: 'KSP-33214',
    name: 'SP Divya Murthy IPS',
    rank: 'SP',
    district_id: 'dist_bengaluru_rural',
    station_id: 'stat_hoskote',
    dept_id: 'dept_crime',
    hire_date: '2015-08-24',
    status: 'Active',
    clearance_level: 'L4', // Secret
    email: 'divyam.sp@ksp.gov.in',
    phone: '+91 94481 00293',
    roles: ['role_sp']
  },
  {
    officer_id: 'ksp_off_107',
    badge_no: 'KSP-77142',
    name: 'ASI Mahesh Gowda',
    rank: 'ASI',
    district_id: 'dist_mysuru_city',
    station_id: 'stat_devaraja',
    dept_id: 'dept_traffic',
    hire_date: '2014-05-18',
    status: 'Disabled',
    clearance_level: 'L2', // Restricted
    email: 'mahesh.g@ksp.gov.in',
    phone: '+91 94488 44321',
    roles: ['role_asi']
  },
  {
    officer_id: 'ksp_off_108',
    badge_no: 'KSP-88339',
    name: 'Constable Prakash Patil',
    rank: 'Constable',
    district_id: 'dist_dakshina_kannada',
    station_id: 'stat_hampankatta',
    dept_id: 'dept_lo',
    hire_date: '2022-01-10',
    status: 'Active',
    clearance_level: 'L1', // General
    email: 'prakash.p@ksp.gov.in',
    phone: '+91 88612 99014',
    roles: ['role_constable']
  },
  {
    officer_id: 'ksp_off_109',
    badge_no: 'KSP-66124',
    name: 'Inspector Sandeep Rao',
    rank: 'Inspector',
    district_id: 'dist_dakshina_kannada',
    station_id: 'stat_hampankatta',
    dept_id: 'dept_cyber',
    hire_date: '2017-07-30',
    status: 'Suspended',
    clearance_level: 'L3', // Confidential
    email: 'sandeep.rao@ksp.gov.in',
    phone: '+91 98866 55432',
    roles: ['role_inspector']
  },
  {
    officer_id: 'ksp_off_110',
    badge_no: 'KSP-22105',
    name: 'DySP Ravi Shankar',
    rank: 'Addl. SP/Dy. SP',
    district_id: 'dist_bengaluru_city',
    station_id: 'stat_koramangala',
    dept_id: 'dept_crime',
    hire_date: '2013-09-05',
    status: 'Active',
    clearance_level: 'L3', // Confidential
    email: 'r.shankar.dysp@ksp.gov.in',
    phone: '+91 94490 88710',
    roles: ['role_dysp']
  }
];

// 7. Active Sessions Database (with Risk / Co-location Alerts)
export const initialSessions = [
  {
    session_id: 'sess_9901',
    officer_id: 'ksp_off_101', // DGP Kishore
    start_time: '2026-07-20T17:05:00Z',
    last_activity: '2026-07-20T18:02:00Z',
    device: 'State Command Console (macOS)',
    ip: '10.12.1.42',
    location: 'Bengaluru HQ Command Center',
    risk_score: 4,
    active: true
  },
  {
    session_id: 'sess_9902',
    officer_id: 'ksp_off_102', // Ramesh Kumar session 1 (Active)
    start_time: '2026-07-20T17:28:00Z',
    last_activity: '2026-07-20T18:04:00Z',
    device: 'Mobile Dispatch Tablet (Android)',
    ip: '10.198.42.110',
    location: 'Koramangala Precinct',
    risk_score: 85, // HIGH RISK due to co-location
    active: true
  },
  {
    session_id: 'sess_9902_alt',
    officer_id: 'ksp_off_102', // Ramesh Kumar session 2 (Active - SIMULTANEOUS co-location!)
    start_time: '2026-07-20T17:40:00Z',
    last_activity: '2026-07-20T18:03:00Z',
    device: 'Web Client Chrome (Windows)',
    ip: '192.168.12.55',
    location: 'Mangaluru Circle',
    risk_score: 85, // HIGH RISK
    active: true
  },
  {
    session_id: 'sess_9903',
    officer_id: 'ksp_off_103', // Ananya Hegde
    start_time: '2026-07-20T17:15:00Z',
    last_activity: '2026-07-20T17:51:00Z',
    device: 'Linux Workstation',
    ip: '10.22.4.99',
    location: 'Cyber Cell Precinct',
    risk_score: 12,
    active: true
  },
  {
    session_id: 'sess_9905',
    officer_id: 'ksp_off_105', // IGP Sharanappa
    start_time: '2026-07-20T16:45:00Z',
    last_activity: '2026-07-20T18:01:00Z',
    device: 'Command Portal (iPad OS)',
    ip: '10.35.12.18',
    location: 'Mysuru Range HQ',
    risk_score: 5,
    active: true
  }
];

// 8. Security Audit Logs Database
export const initialAuditLogs = [
  {
    event_id: 'evt_700201',
    timestamp: '2026-07-20T18:04:15Z',
    officer_id: 'ksp_off_102',
    event_type: 'data_export',
    object_type: 'Report',
    object_id: 'rep_district_caseload_2026',
    details: 'FIR case data compilation sheet exported to PDF format. Size: 2.4MB.',
    signature: 'ECDSA-SHA256:0x8F9aC3D...'
  },
  {
    event_id: 'evt_700202',
    timestamp: '2026-07-20T18:01:42Z',
    officer_id: 'ksp_off_101',
    event_type: 'approval_granted',
    object_type: 'ApprovalRequest',
    object_id: 'req_3004',
    details: 'DGP Kishore signed and authorized emergency data audit bypass for FIR-9923.',
    signature: 'ECDSA-SHA256:0x5eB21aD...'
  },
  {
    event_id: 'evt_700203',
    timestamp: '2026-07-20T17:55:10Z',
    officer_id: 'ksp_off_103',
    event_type: 'case_access',
    object_type: 'Case',
    object_id: 'case_2026_988',
    details: 'Decrypted PII suspect metadata lookup under case-id 988 (Homicide investigation).',
    signature: 'ECDSA-SHA256:0x41eFd99...'
  },
  {
    event_id: 'evt_700204',
    timestamp: '2026-07-20T17:40:00Z',
    officer_id: 'ksp_off_102',
    event_type: 'login',
    object_type: 'Session',
    object_id: 'sess_9902_alt',
    details: 'Concurrent active login request received from external IP. Co-location flag raised.',
    signature: 'ECDSA-SHA256:0x22DaBC3...'
  },
  {
    event_id: 'evt_700205',
    timestamp: '2026-07-20T17:35:12Z',
    officer_id: 'ksp_off_109',
    event_type: 'account_disabled',
    object_type: 'Officer',
    object_id: 'ksp_off_109',
    details: 'Account status updated to SUSPENDED pending review of spatial telemetry misuse.',
    signature: 'ECDSA-SHA256:0x99aF7bC...'
  },
  {
    event_id: 'evt_700206',
    timestamp: '2026-07-20T17:10:05Z',
    officer_id: 'ksp_off_106',
    event_type: 'clearance_change',
    object_type: 'Officer',
    object_id: 'ksp_off_108',
    details: 'Promoted Clearance level from General (L1) to Restricted (L2) for SP patrol sync.',
    signature: 'ECDSA-SHA256:0x3344aBc...'
  },
  {
    event_id: 'evt_700207',
    timestamp: '2026-07-20T16:50:30Z',
    officer_id: 'ksp_off_102',
    event_type: 'break_glass',
    object_type: 'Session',
    object_id: 'sess_9902',
    details: 'Emergency break-glass bypass activated for live CCTV video stream (Koramangala Junction).',
    signature: 'ECDSA-SHA256:0xEEC339A...'
  }
];

// 9. Administrative Approval Center Requests (Tabbed Queues)
export const initialApprovalRequests = [
  {
    req_id: 'req_3001',
    type: 'Clearance Upgrade',
    officer_id: 'ksp_off_102', // Ramesh Kumar
    request_date: '2026-07-20T14:10:00Z',
    status: 'Pending',
    notes: 'Requires Secret (L4) clearance to compile cross-district drug cartel GIS correlations.',
    justification: 'Requested assignment to State Cartel task force requires access to non-district cases.',
    dual_control_required: true,
    approvers: ['ksp_off_105'] // Approved by IGP Sharanappa, requires a 2nd IPS Officer (DGP Kishore) to resolve!
  },
  {
    req_id: 'req_3002',
    type: 'Access Request',
    officer_id: 'ksp_off_103', // Ananya Hegde
    request_date: '2026-07-20T15:30:00Z',
    status: 'Pending',
    notes: 'Access authorization request for forensic databases of cyber extortion records (FIR-884).',
    justification: 'Case analysis requires decryption of IP node correlation logs from national CCTNS.',
    dual_control_required: false,
    approvers: []
  },
  {
    req_id: 'req_3003',
    type: 'Transfer',
    officer_id: 'ksp_off_108', // Prakash Patil
    request_date: '2026-07-20T16:02:00Z',
    status: 'Pending',
    notes: 'Transfer from Hampankatta Station (Mangaluru) to Jayanagar Station (Bengaluru City).',
    justification: 'Reassigned under state special patrol drive for traffic analytics optimization.',
    dual_control_required: false,
    approvers: []
  },
  {
    req_id: 'req_3004',
    type: 'Emergency Break-Glass',
    officer_id: 'ksp_off_104', // Suresh Gowda
    request_date: '2026-07-20T17:45:00Z',
    status: 'Approved',
    notes: 'Emergency access to high-clearance encrypted files of VIP escort telemetry route.',
    justification: 'Critical safety escort active; required telemetry overlay coordinates bypass immediately.',
    dual_control_required: true,
    approvers: ['ksp_off_101', 'ksp_off_105']
  },
  {
    req_id: 'req_3005',
    type: 'Clearance Upgrade',
    officer_id: 'ksp_off_108', // Prakash Patil
    request_date: '2026-07-20T11:20:00Z',
    status: 'Rejected',
    notes: 'Promote L1 (General) to L3 (Confidential).',
    justification: 'Constable required to audit historical logs of district accounts.',
    dual_control_required: false,
    approvers: ['ksp_off_106'],
    rejection_comment: 'Insufficient training rank for confidential database audits.'
  }
];
