import React from 'react';
import { FileText, Clock, X, FolderOpen, Trash2 } from 'lucide-react';

/**
 * Recent Files Panel Component
 */
export function RecentFiles({ 
  files = [], 
  onOpen, 
  onRemove, 
  onClear,
  theme,
  t = (key) => key 
}) {
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'xml': return '📄';
      case 'csv': return '📊';
      default: return '📁';
    }
  };

  if (files.length === 0) {
    return (
      <div className={`p-4 rounded-lg border ${theme.card} ${theme.border}`}>
        <div className="flex items-center gap-2 mb-3">
          <Clock className={`w-4 h-4 ${theme.icon}`} />
          <span className={`text-sm font-medium ${theme.text}`}>Recent Files</span>
        </div>
        <p className={`text-sm ${theme.textMuted}`}>No recent files</p>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${theme.card} ${theme.border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${theme.icon}`} />
          <span className={`text-sm font-medium ${theme.text}`}>Recent Files</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${theme.badge}`}>
            {files.length}
          </span>
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className={`text-xs ${theme.textMuted} hover:${theme.accentText} transition-colors`}
            title="Clear all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {files.map((file, index) => (
          <div
            key={file.path || index}
            className={`group flex items-center gap-2 p-2 rounded-md ${theme.cardHover} cursor-pointer transition-colors`}
            onClick={() => onOpen?.(file)}
          >
            <span className="text-base">{getFileIcon(file.type)}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${theme.text}`}>
                {file.name || file.path?.split(/[/\\]/).pop()}
              </p>
              <p className={`text-xs truncate ${theme.textMuted}`}>
                {file.module?.toUpperCase()} • {formatDate(file.timestamp)}
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen?.(file);
                }}
                className={`p-1 rounded ${theme.buttonSecondary}`}
                title="Open"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
              {onRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(file.path);
                  }}
                  className={`p-1 rounded hover:bg-red-500/20 ${theme.textMuted}`}
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentFiles;
