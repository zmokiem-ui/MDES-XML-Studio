import { useState, useEffect } from 'react';

/**
 * Custom hook for persisting state to localStorage
 * @param {string} key - Storage key
 * @param {any} initialValue - Default value
 * @returns {[any, function]} - State and setter
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

/**
 * Hook for managing recent files list
 * @param {number} maxItems - Maximum number of recent files to store
 */
export function useRecentFiles(maxItems = 10) {
  const [recentFiles, setRecentFiles] = useLocalStorage('recentFiles', []);

  const addRecentFile = (file) => {
    setRecentFiles(prev => {
      // Remove existing entry if present
      const filtered = prev.filter(f => f.path !== file.path);
      // Add to beginning
      const updated = [{ ...file, timestamp: Date.now() }, ...filtered];
      // Limit to maxItems
      return updated.slice(0, maxItems);
    });
  };

  const removeRecentFile = (path) => {
    setRecentFiles(prev => prev.filter(f => f.path !== path));
  };

  const clearRecentFiles = () => {
    setRecentFiles([]);
  };

  return { recentFiles, addRecentFile, removeRecentFile, clearRecentFiles };
}

/**
 * Hook for managing generation profiles/templates
 */
export function useProfiles() {
  const [profiles, setProfiles] = useLocalStorage('generationProfiles', []);

  const saveProfile = (profile) => {
    const newProfile = {
      ...profile,
      id: profile.id || `profile_${Date.now()}`,
      createdAt: profile.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    
    setProfiles(prev => {
      const existing = prev.findIndex(p => p.id === newProfile.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newProfile;
        return updated;
      }
      return [...prev, newProfile];
    });
    
    return newProfile.id;
  };

  const deleteProfile = (id) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
  };

  const getProfile = (id) => {
    return profiles.find(p => p.id === id);
  };

  return { profiles, saveProfile, deleteProfile, getProfile };
}

/**
 * Hook for managing app settings with per-module theme memory
 */
export function useAppSettings() {
  const [settings, setSettings] = useLocalStorage('appSettings', {
    globalTheme: 'dark',
    moduleThemes: {},
    language: 'en',
    autoSave: true,
    showTips: true,
    recentFilesEnabled: true
  });

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const setModuleTheme = (module, theme) => {
    setSettings(prev => ({
      ...prev,
      moduleThemes: { ...prev.moduleThemes, [module]: theme }
    }));
  };

  const getModuleTheme = (module) => {
    return settings.moduleThemes[module] || settings.globalTheme;
  };

  return { settings, updateSetting, setModuleTheme, getModuleTheme };
}

/**
 * Hook for managing generation history/statistics
 */
export function useGenerationHistory() {
  const [history, setHistory] = useLocalStorage('generationHistory', []);
  const [stats, setStats] = useLocalStorage('generationStats', {
    totalGenerated: 0,
    totalAccounts: 0,
    byModule: { crs: 0, fatca: 0, cbc: 0 },
    lastGeneration: null
  });

  const addToHistory = (entry) => {
    const newEntry = {
      ...entry,
      id: `gen_${Date.now()}`,
      timestamp: Date.now()
    };

    setHistory(prev => [newEntry, ...prev].slice(0, 100)); // Keep last 100

    setStats(prev => ({
      totalGenerated: prev.totalGenerated + 1,
      totalAccounts: prev.totalAccounts + (entry.accountCount || 0),
      byModule: {
        ...prev.byModule,
        [entry.module]: (prev.byModule[entry.module] || 0) + 1
      },
      lastGeneration: Date.now()
    }));

    return newEntry.id;
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return { history, stats, addToHistory, clearHistory };
}

export default useLocalStorage;
