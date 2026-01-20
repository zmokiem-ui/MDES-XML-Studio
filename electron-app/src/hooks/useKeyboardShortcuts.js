import { useEffect, useCallback } from 'react';

/**
 * Keyboard shortcut definitions
 */
export const SHORTCUTS = {
  // Navigation
  GO_HOME: { key: 'h', ctrl: true, description: 'Go to home/module selection' },
  GO_SETTINGS: { key: ',', ctrl: true, description: 'Open settings' },
  
  // Actions
  GENERATE: { key: 'g', ctrl: true, description: 'Generate XML' },
  VALIDATE: { key: 'v', ctrl: true, shift: true, description: 'Validate file' },
  SAVE: { key: 's', ctrl: true, description: 'Save/Export' },
  OPEN_FILE: { key: 'o', ctrl: true, description: 'Open file' },
  NEW: { key: 'n', ctrl: true, description: 'New generation' },
  
  // Modules
  SELECT_CRS: { key: '1', ctrl: true, description: 'Select CRS module' },
  SELECT_FATCA: { key: '2', ctrl: true, description: 'Select FATCA module' },
  SELECT_CBC: { key: '3', ctrl: true, description: 'Select CBC module' },
  
  // UI
  TOGGLE_THEME: { key: 't', ctrl: true, description: 'Toggle theme' },
  ESCAPE: { key: 'Escape', description: 'Close modal/Go back' },
  HELP: { key: '?', shift: true, description: 'Show keyboard shortcuts' }
};

/**
 * Check if a keyboard event matches a shortcut definition
 */
function matchesShortcut(event, shortcut) {
  const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
  const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
  const altMatch = shortcut.alt ? event.altKey : !event.altKey;
  const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
  
  return ctrlMatch && shiftMatch && altMatch && keyMatch;
}

/**
 * Hook for handling keyboard shortcuts
 * @param {Object} handlers - Map of shortcut names to handler functions
 * @param {boolean} enabled - Whether shortcuts are enabled
 */
export function useKeyboardShortcuts(handlers = {}, enabled = true) {
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;
    
    // Don't trigger shortcuts when typing in inputs
    const target = event.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Only allow Escape in inputs
      if (event.key !== 'Escape') return;
    }

    for (const [name, shortcut] of Object.entries(SHORTCUTS)) {
      if (matchesShortcut(event, shortcut) && handlers[name]) {
        event.preventDefault();
        handlers[name](event);
        return;
      }
    }
  }, [handlers, enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut) {
  const parts = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  parts.push(shortcut.key.toUpperCase());
  return parts.join(' + ');
}

/**
 * Get all shortcuts formatted for help display
 */
export function getShortcutsList() {
  return Object.entries(SHORTCUTS).map(([name, shortcut]) => ({
    name,
    keys: formatShortcut(shortcut),
    description: shortcut.description
  }));
}

export default useKeyboardShortcuts;
