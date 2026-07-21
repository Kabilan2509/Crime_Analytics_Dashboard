import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'ksp-secure-session';

const defaultSession = {
  officerName: '',
  badgeId: '',
  unitName: '',
  role: 'Redacted Analyst',
  accessLevel: 'redacted',
};

const SecurityContext = createContext({
  session: defaultSession,
  isCommandMode: false,
  startSecureSession: () => {},
  lockSession: () => {},
});

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

  const value = useMemo(() => ({
    session,
    isCommandMode: session.accessLevel === 'command',
    startSecureSession: ({ officerName, badgeId, unitName, role }) => {
      setSession({
        officerName: officerName?.trim() || 'Duty Officer',
        badgeId: badgeId?.trim() || 'UNASSIGNED',
        unitName: unitName?.trim() || 'State Control Room',
        role: role || 'Field Officer',
        accessLevel: 'command',
      });
    },
    lockSession: () => setSession(defaultSession),
  }), [session]);

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity() {
  return useContext(SecurityContext);
}
