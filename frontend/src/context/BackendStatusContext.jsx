import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { settingsApi } from '../api/settings';

const BackendStatusContext = createContext({
  isOnline: false,
  healthData: null,
  isChecking: false,
  checkHealth: async () => {},
});

export function BackendStatusProvider({ children }) {
  const [isOnline, setIsOnline] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      const data = await settingsApi.health();
      setHealthData(data);
      setIsOnline(data.status === 'ok' || data.status === 'degraded');
    } catch (err) {
      setIsOnline(false);
      setHealthData(null);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Re-check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return (
    <BackendStatusContext.Provider value={{ isOnline, healthData, isChecking, checkHealth }}>
      {children}
    </BackendStatusContext.Provider>
  );
}

export const useBackendStatus = () => useContext(BackendStatusContext);

