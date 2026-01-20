import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { getShortcutsList } from '../hooks/useKeyboardShortcuts';

/**
 * Keyboard Shortcuts Help Modal
 */
export function KeyboardShortcutsModal({ isOpen, onClose, theme }) {
  if (!isOpen) return null;

  const shortcuts = getShortcutsList();

  const categories = {
    navigation: ['GO_HOME', 'GO_SETTINGS', 'ESCAPE'],
    actions: ['GENERATE', 'VALIDATE', 'SAVE', 'OPEN_FILE', 'NEW'],
    modules: ['SELECT_CRS', 'SELECT_FATCA', 'SELECT_CBC'],
    ui: ['TOGGLE_THEME', 'HELP']
  };

  const categoryNames = {
    navigation: 'Navigation',
    actions: 'Actions',
    modules: 'Modules',
    ui: 'UI Controls'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`p-6 rounded-xl shadow-2xl w-[500px] max-h-[80vh] overflow-hidden flex flex-col ${theme.card} border ${theme.border}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className={`w-5 h-5 ${theme.accentText}`} />
            <h2 className={`text-lg font-semibold ${theme.text}`}>Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${theme.buttonSecondary}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-4">
          {Object.entries(categories).map(([category, shortcutNames]) => (
            <div key={category}>
              <h3 className={`text-sm font-medium mb-2 ${theme.textMuted}`}>
                {categoryNames[category]}
              </h3>
              <div className="space-y-1">
                {shortcuts
                  .filter(s => shortcutNames.includes(s.name))
                  .map((shortcut) => (
                    <div
                      key={shortcut.name}
                      className={`flex items-center justify-between p-2 rounded-lg ${theme.bg}`}
                    >
                      <span className={`text-sm ${theme.text}`}>{shortcut.description}</span>
                      <kbd className={`px-2 py-1 text-xs font-mono rounded ${theme.badge}`}>
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className={`mt-4 pt-4 border-t ${theme.border}`}>
          <p className={`text-xs ${theme.textMuted}`}>
            Press <kbd className={`px-1.5 py-0.5 text-xs font-mono rounded ${theme.badge}`}>Shift + ?</kbd> to show this dialog anytime
          </p>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsModal;
