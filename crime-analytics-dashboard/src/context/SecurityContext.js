import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

const STORAGE_KEY = 'ksp-secure-session';
const IDLE_LOGOUT_MS = 2.5 * 60 * 1000;

const defaultSession = {
  officerName: '',
  badgeId: '',
  unitName: '',
  role: 'Redacted Analyst',
  accessLevel: 'redacted',
  unlockedAt: null
};

const SecurityContext = createContext({
  session: defaultSession,
  isCommandMode: false,
  startSecureSession: () => {},
  verifyOfficer: () => {},
  lockSession: () => {},
  logout: () => {},
});

function logAuditEvent(officerName, badgeId, station, action) {
  try {
    const stored = localStorage.getItem('ksp-secure-audit-logs');
    const logs = stored ? JSON.parse(stored) : [];
    const newLog = {
      event_id: `evt_${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toISOString(),
      officer_id: badgeId || 'Unknown Badge',
      event_type: 'break_glass',
      object_type: 'PII',
      object_id: 'pii_access_control',
      details: `Officer ${officerName} (${badgeId}) from station ${station} successfully ${action} PII data access.`,
      signature: `ECDSA-SHA256:0x${Math.random().toString(16).substr(2, 8).toUpperCase()}`
    };
    logs.unshift(newLog);
    localStorage.setItem('ksp-secure-audit-logs', JSON.stringify(logs));
  } catch (e) {
    console.error('Error logging audit event:', e);
  }
}

export function SecurityProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultSession, ...JSON.parse(saved) } : defaultSession;
    } catch (error) {
      return defaultSession;
    }
  });

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  const verifyOfficer = useCallback((officerName, badgeId, station) => {
    const badgePattern = /^KG\d{4,}$/i;
    if (!badgePattern.test(badgeId)) {
      throw new Error('Badge Number must start with "KG" followed by at least 4 digits (e.g. KG12345)');
    }

    setSession({
      officerName: officerName.trim(),
      badgeId: badgeId.trim().toUpperCase(),
      unitName: station.trim(),
      role: 'Command Level',
      accessLevel: 'command',
      unlockedAt: new Date().getTime()
    });

    logAuditEvent(officerName.trim(), badgeId.trim().toUpperCase(), station.trim(), 'unlocked');
  }, []);

  const lockSession = useCallback(() => {
    setSession(prev => {
      if (prev.accessLevel === 'command') {
        logAuditEvent(prev.officerName, prev.badgeId, prev.unitName, 'locked');
      }
      return {
        ...prev,
        accessLevel: 'redacted',
        role: 'Redacted Analyst'
      };
    });
  }, []);

  const logout = useCallback(() => {
    setSession(prev => {
      if (prev.accessLevel === 'command') {
        logAuditEvent(prev.officerName, prev.badgeId, prev.unitName, 'ended session (logged out)');
      }
      return defaultSession;
    });
  }, []);

  const startSecureSession = useCallback(({ officerName, badgeId, unitName, role }) => {
    setSession({
      officerName: officerName?.trim() || 'Duty Officer',
      badgeId: badgeId?.trim() || 'UNASSIGNED',
      unitName: unitName?.trim() || 'State Control Room',
      role: role || 'Field Officer',
      accessLevel: 'command',
      unlockedAt: new Date().getTime()
    });
  }, []);

  // Idle session monitor
  useEffect(() => {
    if (session.accessLevel !== 'command') return;

    let idleTimer;

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);

      idleTimer = setTimeout(() => {
        setSession(prev => {
          if (prev.accessLevel === 'command') {
            logAuditEvent(prev.officerName, prev.badgeId, prev.unitName, 'ended session automatically after 2 minutes 30 seconds of inactivity');
            return defaultSession;
          }
          return prev;
        });
      }, IDLE_LOGOUT_MS);
    };

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'scroll', 'click'];
    activityEvents.forEach(evt => {
      window.addEventListener(evt, resetIdleTimer);
    });

    resetIdleTimer();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, resetIdleTimer);
      });
    };
  }, [session.accessLevel]);

  const value = useMemo(() => ({
    session,
    isCommandMode: session.accessLevel === 'command',
    startSecureSession,
    verifyOfficer,
    lockSession,
    logout
  }), [session, startSecureSession, verifyOfficer, lockSession, logout]);

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity() {
  return useContext(SecurityContext);
}
