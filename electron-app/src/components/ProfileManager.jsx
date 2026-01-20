import React, { useState } from 'react';
import { Save, FolderOpen, Trash2, Plus, Check, X, Settings } from 'lucide-react';

/**
 * Profile Manager Component for saving/loading generation settings
 */
export function ProfileManager({
  profiles = [],
  onSave,
  onLoad,
  onDelete,
  currentSettings,
  theme,
  module = 'crs'
}) {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);

  const handleSave = () => {
    if (!newProfileName.trim()) return;
    
    onSave?.({
      name: newProfileName.trim(),
      module,
      settings: currentSettings
    });
    
    setNewProfileName('');
    setShowSaveModal(false);
  };

  const moduleProfiles = profiles.filter(p => p.module === module);

  return (
    <div className={`p-4 rounded-lg border ${theme.card} ${theme.border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Settings className={`w-4 h-4 ${theme.icon}`} />
          <span className={`text-sm font-medium ${theme.text}`}>Saved Profiles</span>
          {moduleProfiles.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${theme.badge}`}>
              {moduleProfiles.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSaveModal(true)}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${theme.buttonPrimary}`}
        >
          <Plus className="w-3 h-3" />
          Save Current
        </button>
      </div>

      {moduleProfiles.length === 0 ? (
        <p className={`text-sm ${theme.textMuted}`}>No saved profiles for this module</p>
      ) : (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {moduleProfiles.map((profile) => (
            <div
              key={profile.id}
              className={`group flex items-center gap-2 p-2 rounded-md ${theme.cardHover} cursor-pointer transition-colors ${
                selectedProfile === profile.id ? theme.accentLight : ''
              }`}
              onClick={() => setSelectedProfile(profile.id === selectedProfile ? null : profile.id)}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${theme.text}`}>{profile.name}</p>
                <p className={`text-xs ${theme.textMuted}`}>
                  {new Date(profile.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoad?.(profile);
                  }}
                  className={`p-1.5 rounded ${theme.buttonSuccess}`}
                  title="Load profile"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(profile.id);
                  }}
                  className={`p-1.5 rounded ${theme.buttonDanger}`}
                  title="Delete profile"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save Profile Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-lg shadow-xl w-96 ${theme.card} border ${theme.border}`}>
            <h3 className={`text-lg font-semibold mb-4 ${theme.text}`}>Save Profile</h3>
            <input
              type="text"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              placeholder="Profile name..."
              className={`w-full px-3 py-2 rounded-lg border ${theme.input} mb-4`}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setNewProfileName('');
                }}
                className={`px-4 py-2 rounded-lg ${theme.buttonSecondary}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!newProfileName.trim()}
                className={`px-4 py-2 rounded-lg ${theme.buttonPrimary} disabled:opacity-50`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileManager;
