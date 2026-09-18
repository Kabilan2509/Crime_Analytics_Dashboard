import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users, ShieldCheck, Lock, History, RotateCcw,
  Search, X, Shield, LayoutDashboard, GitBranch,
  CheckSquare, LogOut, Ban, ArrowLeft, Filter,
  ChevronRight, Plus, Trash2, Key, Info,
  AlertTriangle, Check, Layers, Download,
  ChevronDown
} from 'lucide-react';
import { downloadCsv } from '../utils/fileExports';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { playAlertSound } from '../utils/audioAlert';
import { useSecurity } from '../context/SecurityContext';
import {
  clearanceLevels,
  hierarchyTree,
  ranges,
  districts,
  stations,
  departments,
  permissions,
  roles as initialRoles,
  rolePermissions as initialRolePermissions,
  getEffectivePermissions,
  initialOfficers,
  initialSessions,
  initialAuditLogs,
  initialApprovalRequests
} from '../data/userManagementMockData';

function UserManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');

  const { session } = useSecurity();
  const currentUserBadge = session.badgeId || 'KSP-88219';
  const currentUserName = session.officerName || 'DGP Kishore IPS';

  // State managers
  const [officers, setOfficers] = useState(initialOfficers);
  const [sessions, setSessions] = useState(initialSessions);
  const [auditLogs, setAuditLogs] = useState(() => {
    // If settings audit logs exist in localStorage (created by Settings saves), load them as well
    try {
      const stored = localStorage.getItem('ksp-secure-audit-logs');
      if (stored) {
        const parsed = JSON.parse(stored);
        return [...parsed, ...initialAuditLogs];
      }
    } catch(e) {}
    return initialAuditLogs;
  });
  const [approvalRequests, setApprovalRequests] = useState(initialApprovalRequests);
  const [rolesList, setRolesList] = useState(initialRoles);
  const [rolePermissionsList, setRolePermissionsList] = useState(initialRolePermissions);

  // Active module navigation
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  // Filters for directory
  const [dirSearch, setDirSearch] = useState('');
  const [dirDistrict, setDirDistrict] = useState('all');
  const [dirDept, setDirDept] = useState('all');
  const [dirStatus, setDirStatus] = useState('all');
  const [dirClearance, setDirClearance] = useState('all');
  const [selectedHierarchyFilter, setSelectedHierarchyFilter] = useState(null);
  const [visibleSeries, setVisibleSeries] = useState({ Logins: true, Lockouts: true });
  const [timeRangePreset, setTimeRangePreset] = useState('30');

  // Bulk selection state
  const [selectedOfficerIds, setSelectedOfficerIds] = useState([]);

  // Right-side drawer profile state
  const [drawerOfficerId, setDrawerOfficerId] = useState(null);

  // Clearance promotion modal state
  const [clearanceModalData, setClearanceModalData] = useState(null);

  // Roles page selection
  const [selectedRoleId, setSelectedRoleId] = useState('role_inspector');
  const [previewEffectiveAccess, setPreviewEffectiveAccess] = useState(false);
  const [newRoleFormOpen, setNewRoleFormOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleClearance, setNewRoleClearance] = useState('L2');
  const [newRoleInherits, setNewRoleInherits] = useState('role_constable');

  // Clearance selected level
  const [selectedClearanceLevel, setSelectedClearanceLevel] = useState('L3');

  // Session monitor terminated sessions state
  const [coLocationFilter, setCoLocationFilter] = useState(false);

  // Audit filter state
  const [auditSearch, setAuditSearch] = useState('');
  const [auditEventType, setAuditEventType] = useState('all');

  // Approval center sub-tab state
  const [approvalSubTab, setApprovalSubTab] = useState('Clearance Upgrade');
  const [approvalComment, setApprovalComment] = useState('');

  // UI Toast notification state
  const [toastMessage, setToastMessage] = useState(null);

  // Read settings variables from Shared LocalStorage Source of Truth
  const [idleTimeoutSetting, setIdleTimeoutSetting] = useState(15);
  const [maxLifetimeSetting, setMaxLifetimeSetting] = useState(8);
  const [dualApprovalExportSetting, setDualApprovalExportSetting] = useState(false);

  useEffect(() => {
    const idle = parseInt(localStorage.getItem('ksp-settings-idle-timeout') || '15', 10);
    const maxLife = parseInt(localStorage.getItem('ksp-settings-max-lifetime') || '8', 10);
    const dual = localStorage.getItem('ksp-settings-dual-approval-exports') === 'true';
    
    setIdleTimeoutSetting(idle);
    setMaxLifetimeSetting(maxLife);
    setDualApprovalExportSetting(dual);
  }, [activeTab]); // Refresh when navigating back/around

  // Close profile drawer and modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (drawerOfficerId) setDrawerOfficerId(null);
        if (clearanceModalData) setClearanceModalData(null);
        if (newRoleFormOpen) setNewRoleFormOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOfficerId, clearanceModalData, newRoleFormOpen]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper: Log new audit event dynamically
  const logEvent = (type, objType, objId, details) => {
    const newEvent = {
      event_id: `evt_${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toISOString(),
      officer_id: 'ksp_off_101', 
      event_type: type,
      object_type: objType,
      object_id: objId,
      details,
      signature: `ECDSA-SHA256:0x${Math.random().toString(16).substring(2, 10).toUpperCase()}...`
    };
    setAuditLogs(prev => [newEvent, ...prev]);
  };

  // Helper: check co-locations in session list
  const coLocationAnomalies = useMemo(() => {
    const activeSessions = sessions.filter(s => s.active);
    const officerCount = {};
    activeSessions.forEach(s => {
      officerCount[s.officer_id] = (officerCount[s.officer_id] || 0) + 1;
    });
    return Object.keys(officerCount).filter(id => officerCount[id] > 1);
  }, [sessions]);

  // Dynamic calculations for dashboard cards
  const totalOfficersCount = officers.length;
  const activeSessionsCount = sessions.filter(s => s.active).length;
  const pendingApprovalsCount = approvalRequests.filter(r => r.status === 'Pending').length;
  const failedLoginsCount = 12; 
  const highClearanceCount = officers.filter(o => o.clearance_level === 'L4' || o.clearance_level === 'L5').length;
  const dormantAccountsCount = officers.filter(o => o.status === 'Disabled' || o.status === 'Suspended').length;

  // Chart data: Logins vs Lockouts trend for last 30 days
  const loginsTrendData = useMemo(() => {
    return Array.from({ length: 30 }, (_, idx) => {
      const day = idx + 1;
      const logins = Math.floor(Math.sin(day / 2.5) * 15 + 115 + (day % 3) * 4);
      const lockouts = Math.floor(Math.cos(day / 4) * 2 + 3 + (day % 5 === 0 ? 4 : 0));
      return {
        date: `Jul ${day.toString().padStart(2, '0')}`,
        Logins: logins,
        Lockouts: lockouts
      };
    });
  }, []);

  // Directory filter logic
  const filteredOfficers = useMemo(() => {
    return officers.filter(o => {
      if (selectedHierarchyFilter) {
        const { type, id } = selectedHierarchyFilter;
        if (type === 'range') {
          const matchingDistricts = districts.filter(d => d.range_id === id).map(d => d.district_id);
          if (!matchingDistricts.includes(o.district_id)) return false;
        } else if (type === 'district' && o.district_id !== id) {
          return false;
        } else if (type === 'station' && o.station_id !== id) {
          return false;
        } else if (type === 'unit') {
          if (id.includes('crime') && o.dept_id !== 'dept_crime') return false;
          if (id.includes('traffic') && o.dept_id !== 'dept_traffic') return false;
          if (id.includes('lo') && o.dept_id !== 'dept_lo') return false;
          if (id.includes('cyber') && o.dept_id !== 'dept_cyber') return false;
        }
      }

      if (dirDistrict !== 'all' && o.district_id !== dirDistrict) return false;
      if (dirDept !== 'all' && o.dept_id !== dirDept) return false;
      if (dirStatus !== 'all' && o.status !== dirStatus) return false;
      if (dirClearance !== 'all' && o.clearance_level !== dirClearance) return false;

      if (dirSearch.trim()) {
        const query = dirSearch.toLowerCase();
        const matchesName = o.name.toLowerCase().includes(query);
        const matchesBadge = o.badge_no.toLowerCase().includes(query);
        const matchesEmail = o.email.toLowerCase().includes(query);
        const matchesId = o.officer_id.toLowerCase().includes(query);
        return matchesName || matchesBadge || matchesEmail || matchesId;
      }

      return true;
    });
  }, [officers, selectedHierarchyFilter, dirDistrict, dirDept, dirStatus, dirClearance, dirSearch]);

  const activeOfficerDetail = useMemo(() => {
    return officers.find(o => o.officer_id === drawerOfficerId);
  }, [officers, drawerOfficerId]);

  // Hierarchy expand state
  const [expandedNodes, setExpandedNodes] = useState({
    ksp_state: true,
    range_bengaluru: true,
    dist_bengaluru_city: true
  });

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Directory Action Toggles
  const handleToggleOfficerStatus = (offId) => {
    const off = officers.find(o => o.officer_id === offId);
    if (!off) return;

    const nextStatus = off.status === 'Active' ? 'Disabled' : 'Active';
    playAlertSound(nextStatus === 'Disabled' ? 300 : 600, 0.1);

    setOfficers(prev => prev.map(o => {
      if (o.officer_id === offId) {
        return { ...o, status: nextStatus };
      }
      return o;
    }));

    if (nextStatus === 'Disabled') {
      setSessions(prev => prev.map(s => {
        if (s.officer_id === offId && s.active) {
          return { ...s, active: false };
        }
        return s;
      }));
    }

    logEvent(
      nextStatus === 'Disabled' ? 'account_disable' : 'account_enable',
      'Officer',
      offId,
      `Officer account status for ${off.name} (${off.badge_no}) modified to ${nextStatus.toUpperCase()}.`
    );

    triggerToast(`Officer account updated to ${nextStatus}`);
  };

  const handleResetCredentials = (offId) => {
    const off = officers.find(o => o.officer_id === offId);
    if (!off) return;

    playAlertSound(700, 0.05);
    logEvent(
      'credential_reset',
      'Officer',
      offId,
      `Requested temporary credential generation for ${off.name}. Cryptographic token issued via KSP intranet.`
    );
    triggerToast(`Temporary authentication token generated for ${off.badge_no}`);
  };

  const handleUpdateOfficerRoles = (offId, roleId, checked) => {
    setOfficers(prev => prev.map(o => {
      if (o.officer_id === offId) {
        const currentRoles = o.roles || [];
        const nextRoles = checked 
          ? [...currentRoles, roleId]
          : currentRoles.filter(r => r !== roleId);
        return { ...o, roles: nextRoles };
      }
      return o;
    }));

    const roleName = rolesList.find(r => r.role_id === roleId)?.name || roleId;
    logEvent(
      'role_change',
      'Officer',
      offId,
      `Role policy configuration modified. Role '${roleName}' ${checked ? 'GRANTED' : 'REVOKED'}.`
    );
  };

  // Bulk Actions
  const handleBulkDisable = () => {
    if (selectedOfficerIds.length === 0) return;
    playAlertSound(300, 0.15);

    setOfficers(prev => prev.map(o => {
      if (selectedOfficerIds.includes(o.officer_id)) {
        return { ...o, status: 'Disabled' };
      }
      return o;
    }));

    setSessions(prev => prev.map(s => {
      if (selectedOfficerIds.includes(s.officer_id) && s.active) {
        return { ...s, active: false };
      }
      return s;
    }));

    selectedOfficerIds.forEach(id => {
      const off = officers.find(o => o.officer_id === id);
      logEvent('account_disable', 'Officer', id, `Bulk operation: Account for ${off?.name || id} set to DISABLED.`);
    });

    triggerToast(`Bulk operation: ${selectedOfficerIds.length} accounts disabled`);
    setSelectedOfficerIds([]);
  };

  const exportOfficerCsv = (officerIds) => {
    const selectedOfficers = officerIds.map(id => officers.find(officer => officer.officer_id === id)).filter(Boolean);
    downloadCsv(
      `ksp_officers_export_${new Date().toISOString().substring(0, 10)}.csv`,
      ['Badge No', 'Name', 'Rank', 'Email', 'Status', 'Clearance'],
      selectedOfficers.map(officer => [
        officer.badge_no, officer.name, officer.rank, officer.email, officer.status, officer.clearance_level
      ])
    );
    logEvent('data_export', 'Directory', 'multiple', `Exported security directory profile data for ${selectedOfficers.length} accounts.`);
    triggerToast(`Successfully exported CSV data for ${selectedOfficers.length} officers`);
  };

  const handleBulkExport = () => {
    if (selectedOfficerIds.length === 0) return;
    playAlertSound(600, 0.05);

    // Dynamic Policy Integration with Settings Source of Truth
    if (dualApprovalExportSetting) {
      const newRequest = {
        req_id: `req_${Math.floor(1000 + Math.random() * 9000)}`,
        type: 'Access Request', 
        officer_id: 'ksp_off_101', 
        request_date: new Date().toISOString(),
        status: 'Pending',
        notes: `Dual sign-off requested to export directory details for ${selectedOfficerIds.length} officers.`,
        justification: `Triggered bulk export operation. Targeted records badge IDs: ${selectedOfficerIds.map(id => officers.find(o => o.officer_id === id)?.badge_no).join(', ')}.`,
        exportOfficerIds: [...selectedOfficerIds],
        dual_control_required: true, 
        approvers: [] 
      };

      setApprovalRequests(prev => [newRequest, ...prev]);
      logEvent(
        'clearance_request',
        'Directory',
        'multiple',
        `Bulk export request for ${selectedOfficerIds.length} officers queued in Approval Center under dual control policy.`
      );
      triggerToast('Dual Control: Export request submitted to Approval Queue.');
      setSelectedOfficerIds([]);
      return;
    }

    exportOfficerCsv(selectedOfficerIds);
    setSelectedOfficerIds([]);
  };

  // Toggle selection
  const handleSelectOfficer = (offId, checked) => {
    if (checked) {
      setSelectedOfficerIds(prev => [...prev, offId]);
    } else {
      setSelectedOfficerIds(prev => prev.filter(id => id !== offId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedOfficerIds(filteredOfficers.map(o => o.officer_id));
    } else {
      setSelectedOfficerIds([]);
    }
  };

  // Roles pane data
  const resolvedPermissionsForSelectedRole = useMemo(() => {
    return getEffectivePermissions(selectedRoleId);
  }, [selectedRoleId, rolePermissionsList]);

  const handleToggleDirectPermission = (roleId, permId, checked) => {
    playAlertSound(600, 0.05);
    if (checked) {
      setRolePermissionsList(prev => [...prev, { role_id: roleId, perm_id: permId, allowed: true }]);
    } else {
      setRolePermissionsList(prev => prev.filter(rp => !(rp.role_id === roleId && rp.perm_id === permId)));
    }

    const roleName = rolesList.find(r => r.role_id === roleId)?.name || roleId;
    logEvent('role_permission_change', 'Role', roleId, `Direct grant modified: Role '${roleName}' ${checked ? 'ADDED' : 'REMOVED'} permission '${permId}'.`);
  };

  const handleCreateRole = (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const newId = `role_${newRoleName.toLowerCase().replace(/\s+/g, '_')}`;
    const newRole = {
      role_id: newId,
      name: newRoleName,
      description: newRoleDesc || `Custom administrative policy role.`,
      clearance_required: newRoleClearance,
      inherits_from: newRoleInherits
    };

    setRolesList(prev => [...prev, newRole]);
    logEvent('role_create', 'Role', newId, `Custom authorization role '${newRoleName}' created. Inherits from: ${newRoleInherits}.`);
    
    setSelectedRoleId(newId);
    setNewRoleName('');
    setNewRoleDesc('');
    setNewRoleFormOpen(false);
    triggerToast(`New role '${newRoleName}' created successfully.`);
  };

  const handleSubmitClearanceRequest = (e) => {
    e.preventDefault();
    if (!clearanceModalData || !clearanceModalData.justification.trim()) return;

    const { officer, targetLevel, justification, approverId } = clearanceModalData;

    const newRequest = {
      req_id: `req_${Math.floor(1000 + Math.random() * 9000)}`,
      type: 'Clearance Upgrade',
      officer_id: officer.officer_id,
      request_date: new Date().toISOString(),
      status: 'Pending',
      notes: `Promote clearance to ${targetLevel}.`,
      justification,
      dual_control_required: targetLevel === 'L4' || targetLevel === 'L5', 
      approvers: approverId ? [approverId] : [] 
    };

    setApprovalRequests(prev => [newRequest, ...prev]);
    logEvent(
      'clearance_request',
      'Officer',
      officer.officer_id,
      `Submitted Clearance request for ${officer.name} to target ${targetLevel}. Justification: ${justification}.`
    );

    playAlertSound(600, 0.05);
    setClearanceModalData(null);
    triggerToast(`Access Upgrade Request submitted to the Approval Center Queue.`);
  };

  const handleTerminateSession = (sessId) => {
    playAlertSound(300, 0.15);

    const targetSession = sessions.find(s => s.session_id === sessId);
    if (!targetSession) return;

    const officer = officers.find(o => o.officer_id === targetSession.officer_id);

    setSessions(prev => prev.map(s => {
      if (s.session_id === sessId) {
        return { ...s, active: false };
      }
      return s;
    }));

    logEvent(
      'session_terminated',
      'Session',
      sessId,
      `Forcefully revoked authentication credential tunnel for ${officer?.name || 'Officer'} on IP ${targetSession.ip}.`
    );

    triggerToast(`Terminated active session on IP: ${targetSession.ip}`);
  };

  const handleResolveRequest = (reqId, approved, comment) => {
    const req = approvalRequests.find(r => r.req_id === reqId);
    if (!req) return;

    const reqOfficer = officers.find(o => o.officer_id === req.officer_id);

    if (!approved) {
      playAlertSound(300, 0.15);
      setApprovalRequests(prev => prev.map(r => {
        if (r.req_id === reqId) {
          return { ...r, status: 'Rejected', rejection_comment: comment || 'Denied by administrator.' };
        }
        return r;
      }));

      logEvent(
        'approval_denied',
        'ApprovalRequest',
        reqId,
        `Authorization request ${reqId} rejected. Review Comment: ${comment || 'None'}.`
      );

      triggerToast(`Request ${reqId} has been rejected.`);
    } else {
      playAlertSound(600, 0.05);

      const currentApprovers = req.approvers || [];
      const alreadyApproved = currentApprovers.includes(currentUserBadge);

      if (req.dual_control_required && currentApprovers.length < 2 && !alreadyApproved) {
        const nextApprovers = [...currentApprovers, currentUserBadge];
        setApprovalRequests(prev => prev.map(r => {
          if (r.req_id === reqId) {
            return { ...r, approvers: nextApprovers };
          }
          return r;
        }));

        logEvent(
          'approval_partial',
          'ApprovalRequest',
          reqId,
          `Request authorized by 1st administrator (${currentUserName}). Pending 2nd IPS Officer signature.`
        );

        triggerToast(`Partial authorization saved. Awaiting 2nd IPS review.`);
      } else {
        const nextApprovers = alreadyApproved ? currentApprovers : [...currentApprovers, currentUserBadge];

        setApprovalRequests(prev => prev.map(r => {
          if (r.req_id === reqId) {
            return { ...r, status: 'Approved', approvers: nextApprovers };
          }
          return r;
        }));

        if (req.type === 'Clearance Upgrade') {
          const targetLvl = req.notes.split(' ').pop(); 
          setOfficers(prev => prev.map(o => {
            if (o.officer_id === req.officer_id) {
              return { ...o, clearance_level: targetLvl };
            }
            return o;
          }));
        } else if (req.type === 'Transfer') {
          setOfficers(prev => prev.map(o => {
            if (o.officer_id === req.officer_id) {
              return { ...o, station_id: 'stat_jayanagar', district_id: 'dist_bengaluru_city' };
            }
            return o;
          }));
        } else if (req.type === 'Access Request') {
          // Dynamic execution: if the Access Request was a bulk export, we allow the export action now
          if (req.exportOfficerIds?.length) {
            triggerToast('Data export request authorized. Proceeding with export download.');
            exportOfficerCsv(req.exportOfficerIds);
          }
        }

        logEvent(
          'approval_granted',
          'ApprovalRequest',
          reqId,
          `Request authorized and executed. Admin: ${currentUserName}. Action applied to user: ${reqOfficer?.name || req.officer_id}.`
        );

        triggerToast(`Request ${reqId} approved and executed successfully.`);
      }
    }
    setApprovalComment('');
  };

  const getDistrictName = (distId) => districts.find(d => d.district_id === distId)?.name || distId;
  const getStationName = (statId) => stations.find(s => s.station_id === statId)?.name || statId;
  const getDeptName = (deptId) => departments.find(d => d.dept_id === deptId)?.name || deptId;
  const getClearanceName = (lvlId) => clearanceLevels.find(c => c.level_id === lvlId)?.name || lvlId;

  // Recursive Tree Node Renderer
  const renderTreeNode = (node, depth = 0) => {
    const isExpandable = node.children && node.children.length > 0;
    const isExpanded = !!expandedNodes[node.id];
    const isSelected = selectedHierarchyFilter?.id === node.id;

    return (
      <div key={node.id} style={{ marginLeft: `${depth * 14}px`, marginY: '4px' }}>
        <div 
          className={`tree-node ${isSelected ? 'selected' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedHierarchyFilter(node);
            setDirSearch('');
            setActiveTab('directory');
            playAlertSound(600, 0.02);
            triggerToast(`Filtering directory by node: ${node.name}`);
          }}
        >
          {isExpandable ? (
            <button 
              type="button"
              className="tree-toggle"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
            >
              <ChevronDown size={16} strokeWidth={1.5} 
                size={16} 
                style={{ 
                  transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', 
                  transition: 'transform 0.2s' 
                }} 
              />
            </button>
          ) : (
            <span style={{ width: '16px', display: 'inline-block' }} />
          )}
          
          <span className="tree-icon">
            {node.type === 'state' && <Shield size={16} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />}
            {node.type === 'range' && <Layers size={16} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />}
            {node.type === 'district' && <GitBranch size={16} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />}
            {node.type === 'station' && <Users size={16} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />}
            {node.type === 'unit' && <Layers size={16} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />}
          </span>

          <span className="tree-label">{node.name}</span>
          <span className="tree-tag">{node.type.toUpperCase()}</span>
        </div>

        {isExpandable && isExpanded && (
          <div className="tree-children">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (session.accessLevel !== 'command') {
    return (
      <div className="page-content animate-fade-in text-inverse">
        <article className="card" role="alert" style={{ padding: '32px', textAlign: 'center', maxWidth: '720px', margin: '40px auto' }}>
          <h2 style={{ marginTop: 0 }}>PII-protected administration area</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Officer directory, contact details, active-session addresses, audit identities, and clearance records are hidden in Restricted Mode.
          </p>
          <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>
            Unlock PII access from the header to open the User Management &amp; Security Console.
          </p>
        </article>
      </div>
    );
  }

  return (
    <div className="page-content user-management-page text-inverse">
      
      {/* SCOPED CUSTOM STYLES */}
      <style>{`
        .user-management-page {
          animation: fadeIn 0.3s ease-in-out;
          font-family: 'Public Sans', sans-serif !important;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .layout-grid {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 24px;
          margin-top: 20px;
        }

        /* Persistent Navigation Tab-Bar */
        .admin-sub-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: var(--bg-panel);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm, 4px);
          padding: 12px;
          height: fit-content;
          box-shadow: var(--shadow-card);
        }

        .admin-sub-nav-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          border-radius: var(--radius-sm, 4px);
          font-size: 13px;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: all 0.18s ease;
          width: 100%;
          min-height: 40px !important;
        }

        .admin-sub-nav-item:hover {
          background: var(--bg-panel-alt);
          color: var(--text-primary);
        }

        .admin-sub-nav-item.active {
          background: var(--bg-panel-strong);
          color: var(--text-inverse);
          font-weight: 600;
        }

        .sub-nav-icon-label {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nav-badge {
          background: var(--accent-danger);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
        }

        .nav-badge-warn {
          background: var(--accent-warning);
          color: #000;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
        }

        /* Content Container */
        .admin-main-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Metric Cards */
        .metric-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }

        .metric-card {
          background: var(--bg-panel);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm, 4px);
          padding: 16px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 110px;
          box-shadow: var(--shadow-card);
        }

        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-soft);
          border-color: var(--accent-primary);
        }
        .metric-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .metric-card-value {
          font-size: 28px;
          font-weight: 800;
          color: var(--text-primary);
          margin-top: 8px;
        }

        .metric-card-footer {
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* Slide-in Drawer Pattern (Ensures profile dossier displays cleanly ABOVE navbar) */
        .drawer-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(8, 19, 34, 0.55);
          backdrop-filter: blur(4px);
          z-index: 2400;
          animation: fadeIn 0.2s ease-out;
        }

        .profile-drawer {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 460px;
          max-width: 90vw;
          background: var(--bg-panel);
          border-left: 1px solid var(--border-color);
          box-shadow: -10px 0 40px rgba(0, 0, 0, 0.35);
          z-index: 2500;
          display: flex;
          flex-direction: column;
          transform: translate3d(0, 0, 0);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          animation: slideInDrawer 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideInDrawer {
          from { transform: translate3d(100%, 0, 0); }
          to { transform: translate3d(0, 0, 0); }
        }

        .drawer-header {
          padding: 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-panel-alt);
        }

        .drawer-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .drawer-footer {
          padding: 16px 20px;
          border-top: 1px solid var(--border-color);
          background: var(--bg-panel-alt);
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        /* Tree Hierarchy Styling */
        .tree-container {
          background: var(--bg-panel);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm, 4px);
          padding: 16px;
          min-height: 480px;
          box-shadow: var(--shadow-card);
        }

        .tree-node {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          color: var(--text-primary);
          transition: background 0.15s;
          user-select: none;
        }

        .tree-node:hover {
          background: var(--bg-panel-alt);
        }

        .tree-node.selected {
          background: rgba(30, 144, 255, 0.12);
          border-left: 2px solid var(--accent-primary);
          font-weight: 600;
        }

        .tree-toggle {
          background: transparent;
          border: none;
          padding: 0;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 18px !important;
          min-height: 18px !important;
        }

        .tree-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
        }

        .tree-label {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tree-tag {
          font-size: 8px;
          font-weight: 700;
          padding: 1px 4px;
          background: var(--bg-panel-alt);
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          border-radius: 2px;
        }

        .tree-children {
          border-left: 1px dashed var(--border-strong);
          margin-left: 8px;
          padding-left: 4px;
        }

        /* Shared flat-table styles */
        .flat-table {
          width: 100%;
          border-collapse: collapse;
        }
        .flat-table th {
          text-transform: uppercase;
          font-size: 11px;
          color: var(--text-muted);
          border-bottom: 2px solid var(--border-color);
          padding: 10px 8px;
          text-align: left;
          letter-spacing: 0.05em;
        }
        .flat-table td {
          padding: 12px 8px;
          border-bottom: 1px solid var(--border-color);
          font-size: 13px;
          color: var(--text-secondary);
        }
        .flat-table tr:hover td {
          background-color: var(--bg-panel-alt) !important;
        }
        .flat-table tr.selected td {
          background-color: rgba(77, 163, 214, 0.08) !important;
          color: var(--text-primary);
        }

        /* Status badges (aligned with Case Overview status pills) */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 99px !important;
          text-transform: uppercase;
        }
        .status-badge.active { background: rgba(57, 230, 57, 0.15); color: var(--accent-success); }
        .status-badge.on-leave { background: rgba(143, 162, 184, 0.15); color: var(--text-muted); }
        .status-badge.suspended { background: rgba(255, 167, 38, 0.15); color: var(--accent-warning); }
        .status-badge.disabled { background: rgba(255, 77, 77, 0.15); color: var(--accent-danger); }

        /* Clearance level chips */
        .clearance-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 3px;
          border: 1px solid transparent;
        }
        .clearance-badge.lvl-1 { background: var(--bg-panel-alt); color: var(--text-secondary); border-color: var(--border-color); }
        .clearance-badge.lvl-2 { background: rgba(30, 144, 255, 0.08); color: var(--accent-primary); border-color: rgba(30, 144, 255, 0.2); }
        .clearance-badge.lvl-3 { background: rgba(224, 181, 97, 0.08); color: var(--accent-gold); border-color: rgba(224, 181, 97, 0.2); }
        .clearance-badge.lvl-4 { background: rgba(255, 167, 38, 0.08); color: var(--accent-warning); border-color: rgba(255, 167, 38, 0.2); }
        .clearance-badge.lvl-5 { background: rgba(255, 77, 77, 0.08); color: var(--accent-danger); border-color: rgba(255, 77, 77, 0.2); font-weight: 800; border-width: 1.5px; }

        /* Stepper-style chronological lollipop list (Timeline layout matching Suspect Timeline) */
        .lollipop-list {
          position: relative;
          padding-left: 20px;
          margin-top: 14px;
        }
        .lollipop-axis {
          position: absolute;
          left: 5px;
          top: 8px;
          bottom: 8px;
          width: 2px;
          background: var(--border-color);
        }
        .lollipop-item {
          position: relative;
          margin-bottom: 24px;
          transition: transform var(--transition);
        }
        .lollipop-item:hover {
          transform: translateX(4px);
        }
        .lollipop-dot {
          position: absolute;
          left: -20px;
          top: 3px;
          width: 12px;
          height: 12px;
          border-radius: 50% !important; 
          border: 2px solid var(--border-color);
          background: var(--bg-panel-alt);
          z-index: 10;
        }

        /* Controls / Toolbars */
        .filter-select {
          padding: 6px 12px;
          background: var(--bg-panel-alt);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          border-radius: 4px;
          font-size: 13px;
          outline: none;
          min-height: 40px !important;
          min-width: 120px !important;
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-panel-alt);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          padding: 0 12px;
          flex: 1;
        }

        .search-input-field {
          background: transparent;
          border: none;
          color: var(--text-primary);
          padding: 8px 0;
          font-size: 13px;
          outline: none;
          width: 100%;
          min-height: 38px !important;
        }

        /* Matrix matrix checkboxes */
        .matrix-table {
          width: 100%;
          border-collapse: collapse;
        }
        .matrix-table th {
          border-bottom: 2px solid var(--border-color);
          color: var(--text-muted);
          padding: 10px;
          font-size: 11px;
          text-transform: uppercase;
        }
        .matrix-table td {
          border-bottom: 1px solid var(--border-color);
          padding: 8px 10px;
          font-size: 12px;
        }
        .matrix-group-row {
          background: var(--bg-panel-alt);
          font-weight: 700;
          color: var(--text-primary);
        }

        /* Modals */
        .admin-modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(2px);
          z-index: 2600;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease-out;
        }

        .admin-modal {
          background: var(--bg-panel);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm, 4px);
          width: 480px;
          max-width: 90%;
          box-shadow: var(--shadow-soft);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .admin-modal-header {
          padding: 16px 20px;
          background: var(--bg-panel-alt);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .admin-modal-content {
          padding: 20px;
        }

        .admin-modal-footer {
          padding: 14px 20px;
          background: var(--bg-panel-alt);
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .admin-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          padding: 8px 16px;
          border: 1px solid transparent;
          min-height: 38px !important;
          min-width: 80px !important;
        }

        .admin-btn-primary {
          background: var(--accent-primary);
          color: var(--text-inverse);
        }
        .admin-btn-primary:hover {
          background: var(--accent-secondary);
        }

        .admin-btn-secondary {
          background: var(--bg-panel-alt);
          border-color: var(--border-color);
          color: var(--text-primary);
        }
        .admin-btn-secondary:hover {
          background: var(--border-color);
        }

        .admin-btn-danger {
          background: var(--accent-danger);
          color: var(--text-inverse);
        }
        .admin-btn-danger:hover {
          background: color-mix(in srgb, var(--accent-danger) 85%, #000 15%);
        }

        .toast-notify {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #142132;
          color: #edf3fb;
          border-left: 4px solid var(--accent-primary);
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          border: 1px solid rgba(173,193,214,0.15);
          padding: 14px 20px;
          border-radius: 4px;
          z-index: 1000;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .coloc-anomaly {
          border: 1px solid var(--accent-danger) !important;
          background: rgba(255, 77, 77, 0.06) !important;
        }
      `}</style>

      {/* TOAST SYSTEM */}
      {toastMessage && (
        <div className="toast-notify">
          <Shield size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
          <div>
            <div className="header-breadcrumb">DEPLOYMENT & OPERATIONS</div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>User Management & Security Console</h2>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Configure officer credentials, systems access matrixes, and live session telemetry.</span>
          </div>
        </div>

        <button 
          onClick={() => {
            playAlertSound(600, 0.05);
            triggerToast('Security directory telemetry synchronized with State server.');
          }}
          className="admin-btn admin-btn-secondary"
          style={{ height: '36px' }}
        >
          <RotateCcw size={16} strokeWidth={1.5} /> Sync Telemetry
        </button>
      </div>

      {/* LAYOUT CONTAINER */}
      <div className="layout-grid">
        
        {/* LEFT VERTICAL SUB-NAV */}
        <nav className="admin-sub-nav">
          <button 
            type="button" 
            onClick={() => { setActiveTab('dashboard'); playAlertSound(600, 0.02); }}
            className={`admin-sub-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <span className="sub-nav-icon-label">
              <LayoutDashboard size={16} strokeWidth={1.5} />
              <span>Security Overview</span>
            </span>
          </button>
          
          <button 
            type="button" 
            onClick={() => { setActiveTab('directory'); playAlertSound(600, 0.02); }}
            className={`admin-sub-nav-item ${activeTab === 'directory' ? 'active' : ''}`}
          >
            <span className="sub-nav-icon-label">
              <Users size={16} strokeWidth={1.5} />
              <span>Officer Directory</span>
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>{filteredOfficers.length}</span>
          </button>
          
          <button 
            type="button" 
            onClick={() => { setActiveTab('hierarchy'); playAlertSound(600, 0.02); }}
            className={`admin-sub-nav-item ${activeTab === 'hierarchy' ? 'active' : ''}`}
          >
            <span className="sub-nav-icon-label">
              <Layers size={16} strokeWidth={1.5} />
              <span>Hierarchy Explorer</span>
            </span>
          </button>
          
          <button 
            type="button" 
            onClick={() => { setActiveTab('roles'); playAlertSound(600, 0.02); }}
            className={`admin-sub-nav-item ${activeTab === 'roles' ? 'active' : ''}`}
          >
            <span className="sub-nav-icon-label">
              <CheckSquare size={16} strokeWidth={1.5} />
              <span>Roles & Permissions</span>
            </span>
          </button>
          
          <button 
            type="button" 
            onClick={() => { setActiveTab('clearance'); playAlertSound(600, 0.02); }}
            className={`admin-sub-nav-item ${activeTab === 'clearance' ? 'active' : ''}`}
          >
            <span className="sub-nav-icon-label">
              <ShieldCheck size={16} strokeWidth={1.5} />
              <span>Clearance Management</span>
            </span>
          </button>
          
          <button 
            type="button" 
            onClick={() => { setActiveTab('sessions'); playAlertSound(600, 0.02); }}
            className={`admin-sub-nav-item ${activeTab === 'sessions' ? 'active' : ''}`}
          >
            <span className="sub-nav-icon-label">
              <LogOut size={16} strokeWidth={1.5} />
              <span>Session Monitor</span>
            </span>
            {coLocationAnomalies.length > 0 && (
              <span className="nav-badge">! {coLocationAnomalies.length} Alert</span>
            )}
          </button>
          
          <button 
            type="button" 
            onClick={() => { setActiveTab('audit'); playAlertSound(600, 0.02); }}
            className={`admin-sub-nav-item ${activeTab === 'audit' ? 'active' : ''}`}
          >
            <span className="sub-nav-icon-label">
              <History size={16} strokeWidth={1.5} />
              <span>Audit Trail</span>
            </span>
          </button>
          
          <button 
            type="button" 
            onClick={() => { setActiveTab('approvals'); playAlertSound(600, 0.02); }}
            className={`admin-sub-nav-item ${activeTab === 'approvals' ? 'active' : ''}`}
          >
            <span className="sub-nav-icon-label">
              <ShieldCheck size={16} strokeWidth={1.5} />
              <span>Approval Center</span>
            </span>
            {pendingApprovalsCount > 0 && (
              <span className="nav-badge-warn">{pendingApprovalsCount}</span>
            )}
          </button>
        </nav>

        {/* RIGHT DYNAMIC VIEW AREA */}
        <main className="admin-main-view">
          
          {/* TAB 1: DASHBOARD / SECURITY OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <section className="metric-cards-grid">
                {/* 1. Total Officers */}
                <article className="metric-card" onClick={() => setActiveTab('directory')} style={{ borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Officers</span>
                    <Users size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '10px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>{totalOfficersCount}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    active database listings
                  </div>
                </article>

                {/* 2. Active Sessions */}
                <article className="metric-card" onClick={() => setActiveTab('sessions')} style={{ borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Sessions</span>
                    <LogOut size={18} strokeWidth={1.5} style={{ color: coLocationAnomalies.length > 0 ? 'var(--accent-danger)' : 'var(--text-secondary)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '10px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 700, color: coLocationAnomalies.length > 0 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>{activeSessionsCount}</span>
                    {coLocationAnomalies.length > 0 && (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: 'var(--accent-danger)',
                        background: 'rgba(255, 77, 77, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        marginLeft: '6px'
                      }}>
                        Conflict Flagged
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {coLocationAnomalies.length > 0 ? "co-location conflicts flagged" : "authenticated live terminals"}
                  </div>
                </article>

                {/* 3. Pending Approvals */}
                <article className="metric-card" onClick={() => setActiveTab('approvals')} style={{ borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending Approvals</span>
                    <CheckSquare size={18} strokeWidth={1.5} style={{ color: pendingApprovalsCount > 0 ? 'var(--accent-warning)' : 'var(--text-secondary)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '10px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 700, color: pendingApprovalsCount > 0 ? 'var(--accent-warning)' : 'var(--text-primary)' }}>{pendingApprovalsCount}</span>
                    {pendingApprovalsCount > 0 && (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: 'var(--accent-warning)',
                        background: 'rgba(255, 170, 0, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        marginLeft: '6px'
                      }}>
                        Needs Action
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    awaiting authorization
                  </div>
                </article>

                {/* 4. Failed Logins */}
                <article className="metric-card" onClick={() => setActiveTab('audit')} style={{ borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Failed Logins (24h)</span>
                    <Ban size={18} strokeWidth={1.5} style={{ color: 'var(--accent-danger)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '10px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-danger)' }}>{failedLoginsCount}</span>
                    {failedLoginsCount > 5 && (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: 'var(--accent-danger)',
                        background: 'rgba(255, 77, 77, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        marginLeft: '6px'
                      }}>
                        Alert Threshold
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    unauthorized entry attempts
                  </div>
                </article>

                {/* 5. High Clearance */}
                <article className="metric-card" onClick={() => setActiveTab('clearance')} style={{ borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>High Clearance</span>
                    <Shield size={18} strokeWidth={1.5} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '10px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>{highClearanceCount}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    secret & top secret tier
                  </div>
                </article>

                {/* 6. Dormant Accounts */}
                <article className="metric-card" onClick={() => { setActiveTab('directory'); setDirStatus('Disabled'); }} style={{ borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dormant Accounts</span>
                    <Lock size={18} strokeWidth={1.5} style={{ color: dormantAccountsCount > 0 ? 'var(--accent-warning)' : 'var(--text-secondary)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '10px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 700, color: dormantAccountsCount > 0 ? 'var(--accent-warning)' : 'var(--text-primary)' }}>{dormantAccountsCount}</span>
                    {dormantAccountsCount > 0 && (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        color: 'var(--accent-warning)',
                        background: 'rgba(255, 170, 0, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        marginLeft: '6px'
                      }}>
                        Inactive
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    suspended or disabled
                  </div>
                </article>
              </section>

              {/* Chart Block */}
              <article className="card" style={{ padding: '20px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>Telemetry Trend: Logins vs. Lockouts</h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Sampling window: <span style={{ textTransform: 'uppercase', fontWeight: 700, color: 'var(--accent-primary)' }}>DAILY</span>
                    </span>
                  </div>
                  <div>
                    <select
                      value={timeRangePreset}
                      onChange={e => { playAlertSound(600, 0.05); setTimeRangePreset(e.target.value); }}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        background: 'var(--bg-panel-alt)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="30">Last 30 Days</option>
                      <option value="60">30d vs 60d</option>
                    </select>
                  </div>
                </div>

                {/* Legend checkboxes above */}
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={visibleSeries.Logins}
                      onChange={() => setVisibleSeries(prev => ({ ...prev, Logins: !prev.Logins }))}
                      style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px', margin: 0 }}
                    />
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
                    <span>Logins</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={visibleSeries.Lockouts}
                      onChange={() => setVisibleSeries(prev => ({ ...prev, Lockouts: !prev.Lockouts }))}
                      style={{ accentColor: 'var(--accent-danger)', width: '16px', height: '16px', margin: 0 }}
                    />
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent-danger)' }} />
                    <span>Lockouts</span>
                  </label>
                </div>

                <div className="chart-container" style={{ width: '100%', height: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={loginsTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" vertical={false} opacity={0.6} />
                      <XAxis 
                        dataKey="date" 
                        stroke="var(--text-muted)" 
                        fontSize={11} 
                        tickLine={false} 
                      />
                      <YAxis 
                        domain={[0, 'auto']} 
                        stroke="var(--text-muted)" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px' }} 
                      />
                      
                      {visibleSeries.Logins && (
                        <Line type="monotone" dataKey="Logins" name="Logins" stroke="var(--accent-primary)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      )}
                      {visibleSeries.Lockouts && (
                        <Line type="monotone" dataKey="Lockouts" name="Lockouts" stroke="var(--accent-danger)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </div>
          )}

          {/* TAB 2: OFFICER DIRECTORY */}
          {activeTab === 'directory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Filter Toolbar */}
              <div className="card" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <div className="search-input-wrapper">
                  <Search size={16} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Search by Name, Badge No, Email..."
                    value={dirSearch}
                    onChange={(e) => setDirSearch(e.target.value)}
                    className="search-input-field"
                  />
                  {dirSearch && (
                    <button type="button" onClick={() => setDirSearch('')} className="tree-toggle">
                      <X size={16} strokeWidth={1.5} />
                    </button>
                  )}
                </div>

                <select value={dirDistrict} onChange={(e) => setDirDistrict(e.target.value)} className="filter-select">
                  <option value="all">All Districts</option>
                  {districts.map(d => <option key={d.district_id} value={d.district_id}>{d.name}</option>)}
                </select>

                <select value={dirDept} onChange={(e) => setDirDept(e.target.value)} className="filter-select">
                  <option value="all">All Depts</option>
                  {departments.map(d => <option key={d.dept_id} value={d.dept_id}>{d.name}</option>)}
                </select>

                <select value={dirStatus} onChange={(e) => setDirStatus(e.target.value)} className="filter-select">
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Disabled">Disabled</option>
                </select>

                <select value={dirClearance} onChange={(e) => setDirClearance(e.target.value)} className="filter-select">
                  <option value="all">All Clearance</option>
                  {clearanceLevels.map(c => <option key={c.level_id} value={c.level_id}>{c.name} ({c.level_id})</option>)}
                </select>

                {selectedHierarchyFilter && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(30,144,255,0.12)', border: '1px solid var(--accent-primary)', padding: '6px 12px', borderRadius: '4px', fontSize: '12px' }}>
                    <span>Node: <strong>{selectedHierarchyFilter.name}</strong></span>
                    <button 
                      type="button" 
                      onClick={() => setSelectedHierarchyFilter(null)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: 'var(--accent-primary)' }}
                    >
                      <X size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </div>

              {/* Bulk Actions Bar */}
              {selectedOfficerIds.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: 'rgba(255,167,38,0.08)', border: '1px solid var(--accent-warning)', borderRadius: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{selectedOfficerIds.length} officers selected:</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={handleBulkDisable} className="admin-btn admin-btn-danger" style={{ minHeight: '32px !important' }}>
                      <Ban size={16} strokeWidth={1.5} /> Disable Accounts
                    </button>
                    <button type="button" onClick={handleBulkExport} className="admin-btn admin-btn-secondary" style={{ minHeight: '32px !important' }}>
                      <Download size={16} strokeWidth={1.5} /> Export CSV
                    </button>
                    <button type="button" onClick={() => setSelectedOfficerIds([])} className="admin-btn admin-btn-secondary" style={{ minHeight: '32px !important', border: 'none', background: 'transparent' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Officer grid table */}
              <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
                <table className="flat-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={filteredOfficers.length > 0 && selectedOfficerIds.length === filteredOfficers.length}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th>Badge No.</th>
                      <th>Name</th>
                      <th>Rank</th>
                      <th>District</th>
                      <th>Station</th>
                      <th>Department</th>
                      <th>Clearance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOfficers.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          No officers found matching selected criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredOfficers.map(o => (
                        <tr 
                          key={o.officer_id} 
                          onClick={() => { setDrawerOfficerId(o.officer_id); playAlertSound(600, 0.05); }}
                          style={{ cursor: 'pointer' }}
                        >
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={selectedOfficerIds.includes(o.officer_id)}
                              onChange={(e) => handleSelectOfficer(o.officer_id, e.target.checked)}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ fontWeight: 700 }}>{o.badge_no}</td>
                          <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{o.name}</td>
                          <td>{o.rank}</td>
                          <td>{getDistrictName(o.district_id)}</td>
                          <td>{getStationName(o.station_id)}</td>
                          <td>{getDeptName(o.dept_id)}</td>
                          <td>
                            <span className={`clearance-badge lvl-${o.clearance_level.substring(1)}`}>
                              {getClearanceName(o.clearance_level)}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${o.status.toLowerCase().replace(/\s+/g, '-')}`}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: HIERARCHY EXPLORER */}
          {activeTab === 'hierarchy' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
              
              {/* Tree Pane */}
              <div className="tree-container">
                <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>KSP Administrative Nodes</h4>
                {renderTreeNode(hierarchyTree)}
              </div>

              {/* Info Pane */}
              <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Org structure & rank definitions</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  The administrative architecture mirrors the Karnataka State Police (KSP) Command structure. DGP IPS holds overall command clearance.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                  <div style={{ padding: '8px 12px', background: 'var(--bg-panel-alt)', borderLeft: '3px solid var(--accent-gold)', borderRadius: '0 4px 4px 0' }}>
                    <strong>DGP → ADGP → IGP → DIG</strong>
                    <span style={{ display: 'block', color: 'var(--text-muted)', marginTop: '2px' }}>State/Range level commanders (Requires clearance L4 or L5)</span>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'var(--bg-panel-alt)', borderLeft: '3px solid var(--accent-primary)', borderRadius: '0 4px 4px 0' }}>
                    <strong>SSP → SP → Addl. SP/Dy. SP</strong>
                    <span style={{ display: 'block', color: 'var(--text-muted)', marginTop: '2px' }}>District level commanders (Requires clearance L3 or L4)</span>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'var(--bg-panel-alt)', borderLeft: '3px solid var(--accent-success)', borderRadius: '0 4px 4px 0' }}>
                    <strong>Inspector → Sub-Inspector → ASI</strong>
                    <span style={{ display: 'block', color: 'var(--text-muted)', marginTop: '2px' }}>Station circle commanders (Requires clearance L2 or L3)</span>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'var(--bg-panel-alt)', borderLeft: '3px solid var(--text-muted)', borderRadius: '0 4px 4px 0' }}>
                    <strong>Head Constable → Constable</strong>
                    <span style={{ display: 'block', color: 'var(--text-muted)', marginTop: '2px' }}>Field response operators (Clearance L1)</span>
                  </div>
                </div>

                <div style={{ border: '1px dashed var(--border-color)', padding: '12px', borderRadius: '4px', fontSize: '12px', background: 'rgba(30,144,255,0.04)' }}>
                  <h5 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}><Info size={16} strokeWidth={1.5} /> Interactive Filtering</h5>
                  <span style={{ color: 'var(--text-secondary)' }}>Clicking any tree node will automatically apply filters to the officer list and route you directly to the Directory sub-tab.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ROLES & PERMISSIONS */}
          {activeTab === 'roles' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
              
              {/* Roles Left List */}
              <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '15px' }}>Access Roles</h4>
                  <button 
                    onClick={() => { setNewRoleFormOpen(true); playAlertSound(600, 0.05); }} 
                    className="admin-btn admin-btn-primary" 
                    style={{ minHeight: '28px !important', padding: '4px 8px', fontSize: '10px' }}
                  >
                    <Plus size={16} strokeWidth={1.5} /> Create Role
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {rolesList.map(r => (
                    <button
                      key={r.role_id}
                      onClick={() => { setSelectedRoleId(r.role_id); playAlertSound(600, 0.02); }}
                      style={{
                        padding: '10px 12px',
                        background: selectedRoleId === r.role_id ? 'rgba(30, 144, 255, 0.12)' : 'transparent',
                        border: selectedRoleId === r.role_id ? '1px solid var(--accent-primary)' : '1px solid transparent',
                        color: selectedRoleId === r.role_id ? 'var(--accent-primary)' : 'var(--text-primary)',
                        textAlign: 'left',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: selectedRoleId === r.role_id ? 700 : 500,
                        fontSize: '13px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                    >
                      <span style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>{r.name}</span>
                        <span className="clearance-badge lvl-2" style={{ fontSize: '8px', padding: '1px 3px' }}>{r.clearance_required}</span>
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                        {r.description.substring(0, 48)}...
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions Right Matrix */}
              <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                      Permissions Config Matrix
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Selected Role: <strong>{rolesList.find(r => r.role_id === selectedRoleId)?.name || selectedRoleId}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Preview Effective Access</span>
                    <label className="switch-label" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                      <input
                        type="checkbox"
                        checked={previewEffectiveAccess}
                        onChange={(e) => setPreviewEffectiveAccess(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span className={`slider-switch ${previewEffectiveAccess ? 'active' : ''}`} style={{
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: previewEffectiveAccess ? 'var(--accent-primary)' : 'var(--border-strong)',
                        borderRadius: '34px', transition: '0.2s'
                      }}>
                        <span style={{
                          position: 'absolute', content: '""', height: '14px', width: '14px', left: previewEffectiveAccess ? '22px' : '4px', bottom: '3px',
                          backgroundColor: 'white', borderRadius: '50%', transition: '0.2s'
                        }} />
                      </span>
                    </label>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="matrix-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Permission Policy Description</th>
                        <th style={{ width: '120px', textAlign: 'center' }}>Module</th>
                        <th style={{ width: '160px', textAlign: 'center' }}>State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['Cases', 'Reports', 'Officer Directory', 'Evidence', 'Analytics', 'Admin'].map(mod => {
                        const modPerms = permissions.filter(p => p.module === mod);
                        return (
                          <React.Fragment key={mod}>
                            <tr className="matrix-group-row">
                              <td colSpan={3} style={{ padding: '6px 10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{mod} Module</td>
                            </tr>
                            {modPerms.map(p => {
                              const effInfo = resolvedPermissionsForSelectedRole[p.perm_id];
                              const isInherited = effInfo && effInfo.source === 'inherited';
                              const isAllowed = effInfo?.allowed || false;
                              const isDirectAllowed = rolePermissionsList.some(rp => rp.role_id === selectedRoleId && rp.perm_id === p.perm_id && rp.allowed);

                              return (
                                <tr key={p.perm_id}>
                                  <td>
                                    <strong style={{ display: 'block', fontSize: '13px' }}>{p.name}</strong>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.description}</span>
                                  </td>
                                  <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{p.module}</td>
                                  <td style={{ textAlign: 'center' }}>
                                    {previewEffectiveAccess ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                        {isAllowed ? (
                                          <span style={{ color: 'var(--accent-success)', fontWeight: 700, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Check size={16} strokeWidth={1.5} /> ALLOWED
                                          </span>
                                        ) : (
                                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>DENIED</span>
                                        )}
                                        {isInherited && isAllowed && (
                                          <span style={{ fontSize: '9px', background: 'var(--bg-panel-alt)', padding: '1px 4px', borderRadius: '2px', color: 'var(--accent-gold)' }}>
                                            via {effInfo.inheritedFrom}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <input 
                                        type="checkbox"
                                        checked={isDirectAllowed}
                                        disabled={isInherited} 
                                        onChange={(e) => handleToggleDirectPermission(selectedRoleId, p.perm_id, e.target.checked)}
                                        style={{ cursor: isInherited ? 'not-allowed' : 'pointer', width: '16px', height: '16px' }}
                                      />
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ background: 'var(--bg-panel-alt)', padding: '12px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <strong>Policy Rules:</strong> Standard SP role inherits Inspector rules. DGP inherits IGP and ADGP policy. Greyed-out checkboxes indicate a permission inherited automatically from an ancestor role. Disable "Preview Effective Access" to customize direct role allocations.
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CLEARANCE MANAGEMENT */}
          {activeTab === 'clearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                {clearanceLevels.map(lvl => {
                  const matchingOfficersCount = officers.filter(o => o.clearance_level === lvl.level_id).length;
                  const isSelected = selectedClearanceLevel === lvl.level_id;

                  return (
                    <article 
                      key={lvl.level_id}
                      onClick={() => { setSelectedClearanceLevel(lvl.level_id); playAlertSound(600, 0.02); }}
                      className={`card ${isSelected ? 'coloc-anomaly' : ''}`}
                      style={{ 
                        padding: '16px', 
                        cursor: 'pointer',
                        border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        textAlign: 'center'
                      }}
                    >
                      <span className={`clearance-badge lvl-${lvl.level_id.substring(1)}`} style={{ fontSize: '12px' }}>
                        {lvl.level_id}
                      </span>
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{lvl.name}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{matchingOfficersCount} Officers</span>
                    </article>
                  );
                })}
              </div>

              {/* Clearance Table Section */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                    Clearance Tier User Listing: {getClearanceName(selectedClearanceLevel)} ({selectedClearanceLevel})
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Administrative promotions must route through dual authentication requests.</span>
                </div>

                <table className="flat-table">
                  <thead>
                    <tr>
                      <th>Badge No.</th>
                      <th>Name</th>
                      <th>Rank</th>
                      <th>District</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officers.filter(o => o.clearance_level === selectedClearanceLevel).length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          No officers currently allocated this clearance level.
                        </td>
                      </tr>
                    ) : (
                      officers.filter(o => o.clearance_level === selectedClearanceLevel).map(o => (
                        <tr key={o.officer_id}>
                          <td style={{ fontWeight: 700 }}>{o.badge_no}</td>
                          <td style={{ fontWeight: 600 }}>{o.name}</td>
                          <td>{o.rank}</td>
                          <td>{getDistrictName(o.district_id)}</td>
                          <td>{o.email}</td>
                          <td>
                            <span className={`status-badge ${o.status.toLowerCase().replace(/\s+/g, '-')}`}>
                              {o.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => {
                                playAlertSound(600, 0.05);
                                setClearanceModalData({
                                  officer: o,
                                  targetLevel: o.clearance_level === 'L5' ? 'L4' : 'L5',
                                  justification: '',
                                  approverId: 'ksp_off_101'
                                });
                              }}
                              className="admin-btn admin-btn-primary"
                              style={{ minHeight: '30px !important', minWidth: '100px !important', padding: '4px 10px', fontSize: '11px' }}
                            >
                              Promote / Demote
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: SESSION MONITOR */}
          {activeTab === 'sessions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Active Dispatcher Terminals</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Real-time session security auditing. Timeout standard: {idleTimeoutSetting} mins.</span>
                </div>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={coLocationFilter}
                    onChange={(e) => setCoLocationFilter(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ color: 'var(--accent-danger)', fontWeight: 700 }}>Filter Co-location Conflicts Only</span>
                </label>
              </div>

              {coLocationAnomalies.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', background: 'rgba(255,77,77,0.08)', border: '1px solid var(--accent-danger)', borderRadius: '4px' }}>
                  <AlertTriangle size={18} strokeWidth={1.5} style={{ color: 'var(--accent-danger)' }} />
                  <div style={{ fontSize: '13px' }}>
                    <strong style={{ color: 'var(--accent-danger)' }}>CRITICAL TELEMETRY ALERT:</strong> Simultaneous active sessions detected from multiple geographical coordinates.
                  </div>
                </div>
              )}

              <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
                <table className="flat-table">
                  <thead>
                    <tr>
                      <th>Officer</th>
                      <th>Device / Client</th>
                      <th>IP Address</th>
                      <th>Location coordinates</th>
                      <th>Login Time</th>
                      <th style={{ textAlign: 'center' }}>Status Alert</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions
                      .filter(s => s.active)
                      .filter(s => !coLocationFilter || coLocationAnomalies.includes(s.officer_id))
                      .map(s => {
                        const o = officers.find(off => off.officer_id === s.officer_id);
                        const isAnomaly = coLocationAnomalies.includes(s.officer_id);

                        // Dynamic session timeout calculation based on Settings Source of Truth
                        const start = new Date(s.start_time).getTime();
                        const hoursElapsed = (new Date().getTime() - start) / (1000 * 60 * 60);
                        const limitExceeded = hoursElapsed > maxLifetimeSetting;

                        return (
                          <tr key={s.session_id} className={isAnomaly ? 'coloc-anomaly' : ''}>
                            <td>
                              <strong style={{ display: 'block', fontSize: '13px' }}>{o?.name || 'Unknown Officer'}</strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Badge: {o?.badge_no || s.officer_id}</span>
                            </td>
                            <td>{s.device}</td>
                            <td style={{ fontFamily: 'monospace' }}>{s.ip}</td>
                            <td>{s.location}</td>
                            <td>{new Date(s.start_time).toLocaleTimeString()}</td>
                            <td style={{ textAlign: 'center' }}>
                              {isAnomaly ? (
                                <span className="clearance-badge lvl-5" style={{ fontSize: '9px' }}>CO-LOCATION</span>
                              ) : limitExceeded ? (
                                <span className="clearance-badge lvl-4" style={{ fontSize: '9px' }}>TIMEOUT EXCEEDED</span>
                              ) : (
                                <span className="clearance-badge lvl-2" style={{ fontSize: '9px' }}>ACTIVE ({s.risk_score}% Risk)</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => handleTerminateSession(s.session_id)}
                                className="admin-btn admin-btn-danger"
                                style={{ minHeight: '30px !important', padding: '4px 12px', fontSize: '11px' }}
                              >
                                Terminate
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT TRAIL — REBUILT LOLLIPOP TIMELINE (TIMELINE ALIGNMENT PASS) */}
          {activeTab === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Filters */}
              <div className="card" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <div className="search-input-wrapper">
                  <Search size={16} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Search by Officer Name / ID..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="search-input-field"
                  />
                  {auditSearch && (
                    <button type="button" onClick={() => setAuditSearch('')} className="tree-toggle">
                      <X size={16} strokeWidth={1.5} />
                    </button>
                  )}
                </div>

                <select value={auditEventType} onChange={(e) => setAuditEventType(e.target.value)} className="filter-select">
                  <option value="all">All Events</option>
                  <option value="login">Logins</option>
                  <option value="account_disabled">Account Updates</option>
                  <option value="clearance_change">Clearance Updates</option>
                  <option value="role_change">Role Assignments</option>
                  <option value="data_export">Data Exports</option>
                  <option value="case_access">Case Access Logs</option>
                  <option value="break_glass">Break-Glass Bypasses</option>
                  <option value="settings_update">Settings Updates</option>
                </select>
              </div>

              {/* Timeline Lollipop Stream */}
              <div className="card" style={{ padding: '24px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Security Audit Timeline Stream</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Secure Cryptographic Signatures Enabled (SHA-256)</span>
                </div>

                <div className="lollipop-list" style={{ position: 'relative', paddingLeft: '24px' }}>
                  <div className="lollipop-axis" style={{ position: 'absolute', left: '7px', top: '8px', bottom: '8px', width: '2px', background: 'var(--border-color)' }} />
                  
                  {auditLogs
                    .filter(log => {
                      if (auditSearch.trim()) {
                        const o = officers.find(off => off.officer_id === log.officer_id);
                        const query = auditSearch.toLowerCase();
                        const matchesName = o?.name.toLowerCase().includes(query) || false;
                        const matchesId = log.officer_id.toLowerCase().includes(query);
                        if (!matchesName && !matchesId) return false;
                      }

                      if (auditEventType !== 'all') {
                        if (auditEventType === 'login' && log.event_type !== 'login') return false;
                        if (auditEventType === 'account_disabled' && !['account_disabled', 'account_enable', 'account_disable'].includes(log.event_type)) return false;
                        if (auditEventType === 'clearance_change' && !['clearance_change', 'clearance_request'].includes(log.event_type)) return false;
                        if (auditEventType === 'role_change' && !['role_change', 'role_permission_change'].includes(log.event_type)) return false;
                        if (auditEventType === 'data_export' && log.event_type !== 'data_export') return false;
                        if (auditEventType === 'case_access' && log.event_type !== 'case_access') return false;
                        if (auditEventType === 'break_glass' && log.event_type !== 'break_glass') return false;
                        if (auditEventType === 'settings_update' && log.event_type !== 'settings_update') return false;
                      }

                      return true;
                    }).length === 0 ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No audit logs registered matching active filters.
                      </div>
                    ) : (
                      auditLogs
                        .filter(log => {
                          if (auditSearch.trim()) {
                            const o = officers.find(off => off.officer_id === log.officer_id);
                            const query = auditSearch.toLowerCase();
                            const matchesName = o?.name.toLowerCase().includes(query) || false;
                            const matchesId = log.officer_id.toLowerCase().includes(query);
                            if (!matchesName && !matchesId) return false;
                          }

                          if (auditEventType !== 'all') {
                            if (auditEventType === 'login' && log.event_type !== 'login') return false;
                            if (auditEventType === 'account_disabled' && !['account_disabled', 'account_enable', 'account_disable'].includes(log.event_type)) return false;
                            if (auditEventType === 'clearance_change' && !['clearance_change', 'clearance_request'].includes(log.event_type)) return false;
                            if (auditEventType === 'role_change' && !['role_change', 'role_permission_change'].includes(log.event_type)) return false;
                            if (auditEventType === 'data_export' && log.event_type !== 'data_export') return false;
                            if (auditEventType === 'case_access' && log.event_type !== 'case_access') return false;
                            if (auditEventType === 'break_glass' && log.event_type !== 'break_glass') return false;
                            if (auditEventType === 'settings_update' && log.event_type !== 'settings_update') return false;
                          }

                          return true;
                        })
                        .map(log => {
                          const o = officers.find(off => off.officer_id === log.officer_id);
                          
                          // Event color mapping matching lollipop timelines
                          let dotColor = 'var(--accent-primary)';
                          if (log.event_type.includes('disabled') || log.event_type.includes('terminated') || log.event_type.includes('revoke') || log.event_type.includes('disable')) dotColor = 'var(--accent-danger)';
                          if (log.event_type.includes('grant') || log.event_type.includes('enable') || log.event_type.includes('approve') || log.event_type.includes('success')) dotColor = 'var(--accent-success)';
                          if (log.event_type.includes('glass') || log.event_type.includes('anomaly') || log.event_type.includes('warning') || log.event_type.includes('login_fail') || log.event_type.includes('update')) dotColor = 'var(--accent-warning)';

                          return (
                            <div key={log.event_id} className="lollipop-item" style={{ position: 'relative', marginBottom: '24px' }}>
                              <div className="lollipop-dot" style={{ position: 'absolute', left: '-22px', top: '4px', width: '12px', height: '12px', borderRadius: '50%', border: `2px solid ${dotColor}`, background: 'var(--bg-panel)' }} />
                              <div style={{ paddingLeft: '12px' }}>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                  <strong style={{ color: 'var(--text-primary)' }}>{new Date(log.timestamp).toLocaleString()}</strong>
                                  <span className="badge" style={{
                                    background: 'var(--bg-panel-alt)',
                                    border: `1px solid ${dotColor}`,
                                    color: dotColor,
                                    fontSize: '9px',
                                    padding: '1px 6px',
                                    borderRadius: '99px',
                                    textTransform: 'uppercase',
                                    fontWeight: '700'
                                  }}>
                                    {log.event_type.replace('_', ' ')}
                                  </span>
                                  <span>• Operator: <strong>{o?.name || 'System Admin'}</strong> ({log.officer_id})</span>
                                </div>
                                <div className="card" style={{ padding: '12px', background: 'var(--bg-panel-alt)', border: '1px solid var(--border-color)', borderRadius: '4px', marginTop: '6px' }}>
                                  <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                                    {log.event_type.toUpperCase().replace('_', ' ')}: {log.object_type} ({log.object_id})
                                  </strong>
                                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'block', lineHeight: 1.4 }}>
                                    {log.details}
                                  </span>
                                  <span style={{ fontSize: '10px', color: 'var(--accent-success)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontFamily: 'monospace' }}>
                                    <Lock size={16} strokeWidth={1.5} />
                                    <span>Cryptographic Signature: {log.signature}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: APPROVAL CENTER */}
          {activeTab === 'approvals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px 16px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {['Clearance Upgrade', 'Access Request', 'Transfer', 'Emergency Break-Glass'].map(tab => {
                    const count = approvalRequests.filter(r => r.type === tab && r.status === 'Pending').length;
                    return (
                      <button
                        key={tab}
                        onClick={() => { setApprovalSubTab(tab); playAlertSound(600, 0.02); }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: approvalSubTab === tab ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          fontWeight: approvalSubTab === tab ? 700 : 500,
                          fontSize: '13px',
                          cursor: 'pointer',
                          paddingBottom: '4px',
                          borderBottom: approvalSubTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>{tab}s</span>
                        {count > 0 && (
                          <span className="nav-badge-warn" style={{ fontSize: '9px', padding: '1px 4px' }}>{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Request lists */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {approvalRequests.filter(r => r.type === approvalSubTab).length === 0 ? (
                  <article className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No pending approval requests in this category.
                  </article>
                ) : (
                  approvalRequests.filter(r => r.type === approvalSubTab).map(req => {
                    const requester = officers.find(o => o.officer_id === req.officer_id);
                    const isPending = req.status === 'Pending';
                    const hasApproved = req.approvers?.includes(currentUserBadge);

                    return (
                      <article 
                        key={req.req_id} 
                        className={`card ${req.dual_control_required && isPending ? 'coloc-anomaly' : ''}`}
                        style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>ID: {req.req_id} • SUBMITTED: {new Date(req.request_date).toLocaleDateString()}</span>
                            <h4 style={{ margin: '4px 0 0 0', fontSize: '15px' }}>
                              {req.type} for <strong>{requester?.name || req.officer_id}</strong>
                            </h4>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              Badge: {requester?.badge_no} • Current Clearance: {requester?.clearance_level} • Rank: {requester?.rank}
                            </span>
                          </div>
                          
                          <span 
                            className="clearance-badge"
                            style={{ 
                              background: req.status === 'Approved' ? 'rgba(57,230,57,0.12)' : req.status === 'Pending' ? 'rgba(255,167,38,0.12)' : 'rgba(255,77,77,0.12)',
                              color: req.status === 'Approved' ? 'var(--accent-success)' : req.status === 'Pending' ? 'var(--accent-warning)' : 'var(--accent-danger)',
                              fontWeight: 700
                            }}
                          >
                            {req.status.toUpperCase()}
                          </span>
                        </div>

                        <div style={{ background: 'var(--bg-panel-alt)', padding: '12px', borderRadius: '4px', fontSize: '12.5px' }}>
                          <div style={{ marginBottom: '6px' }}><strong>Request Notes:</strong> {req.notes}</div>
                          <div><strong>Justification Details:</strong> {req.justification}</div>
                        </div>

                        {/* Dual Control Authorization Indicators */}
                        {req.dual_control_required && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--accent-gold)' }}>
                            <Shield size={16} strokeWidth={1.5} />
                            <span>
                              <strong>Dual Sign-off Required:</strong> 2 IPS Level Officers must approve. Signatures collected: <strong>{req.approvers?.length || 0} / 2</strong>
                            </span>
                          </div>
                        )}

                        {isPending && (
                          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <input 
                              type="text" 
                              placeholder="Add review comment or justification details..."
                              value={approvalComment}
                              onChange={(e) => setApprovalComment(e.target.value)}
                              style={{ 
                                padding: '8px 12px', 
                                background: 'var(--bg-panel-alt)', 
                                border: '1px solid var(--border-color)', 
                                color: 'var(--text-primary)', 
                                borderRadius: '4px',
                                fontSize: '12px',
                                outline: 'none',
                                width: '100%',
                                minHeight: '36px !important'
                              }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                              <button 
                                type="button" 
                                disabled={hasApproved}
                                onClick={() => handleResolveRequest(req.req_id, false, approvalComment)} 
                                className="admin-btn admin-btn-danger" 
                                style={{ minHeight: '30px !important', padding: '4px 12px' }}
                              >
                                Reject
                              </button>
                              <button 
                                type="button" 
                                disabled={hasApproved}
                                onClick={() => handleResolveRequest(req.req_id, true, approvalComment)} 
                                className="admin-btn admin-btn-primary" 
                                style={{ minHeight: '30px !important', padding: '4px 12px' }}
                              >
                                {hasApproved ? 'Approved by you' : req.dual_control_required ? 'Sign & Authorize' : 'Approve'}
                              </button>
                            </div>
                          </div>
                        )}

                        {!isPending && req.status === 'Rejected' && (
                          <div style={{ color: 'var(--accent-danger)', fontSize: '12px', fontStyle: 'italic' }}>
                            <strong>Rejection Reason:</strong> {req.rejection_comment}
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* FLOAT RIGHT DRAWER: OFFICER PROFILE VIEW (Standardized Drawer Layout Pass) */}
      {drawerOfficerId && activeOfficerDetail && (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawerOfficerId(null)} />
          <aside className="profile-drawer">
            <header className="drawer-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Officer Profile Dossier</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {activeOfficerDetail.officer_id}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setDrawerOfficerId(null)} 
                className="tree-toggle"
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Close Profile (Esc)"
              >
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>ESC</span>
                <X size={16} strokeWidth={1.5} />
              </button>
            </header>

            <div className="drawer-content">
              {/* Profile summary card */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: 700 }}>
                  {activeOfficerDetail.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{activeOfficerDetail.name}</h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Rank: {activeOfficerDetail.rank} • Badge: {activeOfficerDetail.badge_no}
                  </span>
                  <div style={{ marginTop: '4px' }}>
                    <span className={`clearance-badge lvl-${activeOfficerDetail.clearance_level.substring(1)}`} style={{ marginRight: '6px' }}>
                      {getClearanceName(activeOfficerDetail.clearance_level)}
                    </span>
                    <span className={`status-badge ${activeOfficerDetail.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {activeOfficerDetail.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile metadata */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Service Details</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>District Range:</span>
                    <strong>{getDistrictName(activeOfficerDetail.district_id)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Police Station:</span>
                    <strong>{getStationName(activeOfficerDetail.station_id)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Department:</span>
                    <strong>{getDeptName(activeOfficerDetail.dept_id)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Official Email:</span>
                    <strong>{activeOfficerDetail.email}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Secure Phone:</span>
                    <strong>{activeOfficerDetail.phone}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Enlistment Date:</span>
                    <strong>{new Date(activeOfficerDetail.hire_date).toLocaleDateString()}</strong>
                  </div>
                </div>
              </div>

              {/* Roles matrix list toggle */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Assigned Security Roles</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {rolesList.map(r => {
                    const isAssigned = (activeOfficerDetail.roles || []).includes(r.role_id);
                    return (
                      <label 
                        key={r.role_id}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px', 
                          padding: '8px 12px', 
                          background: 'var(--bg-panel-alt)', 
                          borderRadius: '4px', 
                          fontSize: '12px',
                          cursor: 'pointer' 
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={isAssigned}
                          onChange={(e) => handleUpdateOfficerRoles(activeOfficerDetail.officer_id, r.role_id, e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        <div>
                          <strong>{r.name}</strong>
                          <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>{r.description.substring(0, 50)}...</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Active Sessions listing */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Active Session Logs</h4>
                {sessions.filter(s => s.officer_id === activeOfficerDetail.officer_id && s.active).length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No active terminals.</span>
                ) : (
                  sessions
                    .filter(s => s.officer_id === activeOfficerDetail.officer_id && s.active)
                    .map(s => (
                      <div key={s.session_id} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(30,144,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '11px', marginY: '4px' }}>
                        <div>
                          <strong>{s.device}</strong>
                          <span style={{ display: 'block', color: 'var(--text-secondary)' }}>IP: {s.ip} • Loc: {s.location}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleTerminateSession(s.session_id)}
                          className="admin-btn admin-btn-danger"
                          style={{ minHeight: '22px !important', minWidth: '40px !important', padding: '2px 6px', fontSize: '9px' }}
                        >
                          Kill
                        </button>
                      </div>
                    ))
                )}
              </div>

              {/* Recent actions trail */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Recent Audit Events</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {auditLogs.filter(log => log.officer_id === activeOfficerDetail.officer_id).slice(0, 3).length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No audit events logged.</span>
                  ) : (
                    auditLogs
                      .filter(log => log.officer_id === activeOfficerDetail.officer_id)
                      .slice(0, 3)
                      .map(log => (
                        <div key={log.event_id} style={{ fontSize: '11.5px', padding: '8px', borderLeft: '2px solid var(--accent-primary)', background: 'var(--bg-panel-alt)' }}>
                          <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '10px' }}>{new Date(log.timestamp).toLocaleTimeString()} • {log.event_type.replace('_', ' ').toUpperCase()}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{log.details}</span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            <footer className="drawer-footer">
              <button 
                type="button" 
                onClick={() => {
                  setAuditSearch(activeOfficerDetail.name);
                  setDrawerOfficerId(null);
                  setActiveTab('audit');
                  triggerToast(`Filtering audit trail by ${activeOfficerDetail.name}`);
                }}
                className="admin-btn admin-btn-secondary"
                title="View Full Audit History"
              >
                <History size={16} strokeWidth={1.5} /> Audit Trail
              </button>

              <button 
                type="button" 
                onClick={() => handleResetCredentials(activeOfficerDetail.officer_id)}
                className="admin-btn admin-btn-secondary"
              >
                <Key size={16} strokeWidth={1.5} /> Reset Pass
              </button>

              <button 
                type="button" 
                onClick={() => handleToggleOfficerStatus(activeOfficerDetail.officer_id)}
                className={`admin-btn ${activeOfficerDetail.status === 'Active' ? 'admin-btn-danger' : 'admin-btn-primary'}`}
              >
                <Ban size={16} strokeWidth={1.5} /> {activeOfficerDetail.status === 'Active' ? 'Disable Account' : 'Enable Account'}
              </button>
            </footer>
          </aside>
        </>
      )}

      {/* DIALOG 1: CLEARANCE PROMOTION DIALOG */}
      {clearanceModalData && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <header className="admin-modal-header">
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Request Clearance Level Change</h3>
              <button type="button" onClick={() => setClearanceModalData(null)} className="tree-toggle">
                <X size={16} strokeWidth={1.5} />
              </button>
            </header>

            <form onSubmit={handleSubmitClearanceRequest}>
              <div className="admin-modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '13px' }}>
                  Officer Name: <strong>{clearanceModalData.officer.name}</strong><br />
                  Current Clearance Level: <strong>{clearanceModalData.officer.clearance_level} ({getClearanceName(clearanceModalData.officer.clearance_level)})</strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Target Clearance Level</label>
                  <select 
                    value={clearanceModalData.targetLevel}
                    onChange={(e) => setClearanceModalData(prev => ({ ...prev, targetLevel: e.target.value }))}
                    className="filter-select"
                    style={{ width: '100%' }}
                  >
                    {clearanceLevels.map(c => (
                      <option key={c.level_id} value={c.level_id}>
                        {c.level_id} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>IPS Officer Reviewer (Approver)</label>
                  <select 
                    value={clearanceModalData.approverId}
                    onChange={(e) => setClearanceModalData(prev => ({ ...prev, approverId: e.target.value }))}
                    className="filter-select"
                    style={{ width: '100%' }}
                  >
                    {officers.filter(o => o.rank === 'DGP' || o.rank === 'IGP' || o.rank === 'SP').map(o => (
                      <option key={o.officer_id} value={o.officer_id}>
                        {o.name} ({o.rank})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Security Justification Notes</label>
                  <textarea 
                    rows={4}
                    placeholder="Enter security justification details for review board..."
                    required
                    value={clearanceModalData.justification}
                    onChange={(e) => setClearanceModalData(prev => ({ ...prev, justification: e.target.value }))}
                    style={{ 
                      padding: '8px 12px', 
                      background: 'var(--bg-panel-alt)', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--text-primary)', 
                      borderRadius: '4px',
                      fontSize: '12.5px',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ background: 'rgba(255,167,38,0.06)', border: '1px solid rgba(255,167,38,0.2)', padding: '10px', borderRadius: '4px', fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} strokeWidth={1.5} style={{ color: 'var(--accent-warning)', flexShrink: 0 }} />
                  <span>Changes to Secret (L4) or Top Secret (L5) clearance require dual IPS signature authorization before they will take effect.</span>
                </div>
              </div>

              <footer className="admin-modal-footer">
                <button type="button" onClick={() => setClearanceModalData(null)} className="admin-btn admin-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Submit Request
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG 2: CREATE ROLE DIALOG */}
      {newRoleFormOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <header className="admin-modal-header">
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Create Custom Policy Role</h3>
              <button type="button" onClick={() => setNewRoleFormOpen(false)} className="tree-toggle">
                <X size={16} strokeWidth={1.5} />
              </button>
            </header>

            <form onSubmit={handleCreateRole}>
              <div className="admin-modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Role Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Cyber cell lead"
                    required
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    style={{ 
                      padding: '8px 12px', 
                      background: 'var(--bg-panel-alt)', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--text-primary)', 
                      borderRadius: '4px',
                      fontSize: '13px',
                      outline: 'none',
                      minHeight: '36px !important'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Description</label>
                  <input 
                    type="text" 
                    placeholder="Brief description of responsibilities..."
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    style={{ 
                      padding: '8px 12px', 
                      background: 'var(--bg-panel-alt)', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--text-primary)', 
                      borderRadius: '4px',
                      fontSize: '13px',
                      outline: 'none',
                      minHeight: '36px !important'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Clearance Req.</label>
                    <select 
                      value={newRoleClearance}
                      onChange={(e) => setNewRoleClearance(e.target.value)}
                      className="filter-select"
                      style={{ width: '100%' }}
                    >
                      {clearanceLevels.map(c => <option key={c.level_id} value={c.level_id}>{c.level_id} — {c.name}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Inherits From</label>
                    <select 
                      value={newRoleInherits}
                      onChange={(e) => setNewRoleInherits(e.target.value)}
                      className="filter-select"
                      style={{ width: '100%' }}
                    >
                      <option value="">None (Base Role)</option>
                      {rolesList.map(r => <option key={r.role_id} value={r.role_id}>{r.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <footer className="admin-modal-footer">
                <button type="button" onClick={() => setNewRoleFormOpen(false)} className="admin-btn admin-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary">
                  Create Role
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default UserManagement;
