import React, { useState } from 'react';
import { 
  Plus, Trash2, Play, Pause, CheckCircle2, XCircle, 
  Clock, Loader2, FolderOpen, FileText, AlertCircle 
} from 'lucide-react';

/**
 * Batch Processing Component for multiple file operations
 */
export function BatchProcessor({
  onAddFiles,
  onProcess,
  onRemoveFile,
  onClearAll,
  theme,
  module = 'crs'
}) {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const handleAddFiles = async () => {
    const newFiles = await onAddFiles?.();
    if (newFiles && newFiles.length > 0) {
      setFiles(prev => [
        ...prev,
        ...newFiles.map(f => ({
          ...f,
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'pending',
          result: null
        }))
      ]);
    }
  };

  const handleRemove = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    onRemoveFile?.(id);
  };

  const handleClearAll = () => {
    setFiles([]);
    onClearAll?.();
  };

  const handleProcess = async () => {
    if (processing || files.length === 0) return;
    
    setProcessing(true);
    
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;
      
      setCurrentIndex(i);
      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'processing' } : f
      ));

      try {
        const result = await onProcess?.(files[i]);
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'completed', result } : f
        ));
      } catch (error) {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'failed', error: error.message } : f
        ));
      }
    }
    
    setProcessing(false);
    setCurrentIndex(-1);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className={`w-4 h-4 ${theme.textMuted}`} />;
    }
  };

  const completedCount = files.filter(f => f.status === 'completed').length;
  const failedCount = files.filter(f => f.status === 'failed').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <div className={`p-4 rounded-lg border ${theme.card} ${theme.border}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className={`w-5 h-5 ${theme.accentText}`} />
          <h3 className={`font-medium ${theme.text}`}>Batch Processing</h3>
          {files.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${theme.badge}`}>
              {files.length} files
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddFiles}
            disabled={processing}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg ${theme.buttonSecondary} disabled:opacity-50`}
          >
            <Plus className="w-4 h-4" />
            Add Files
          </button>
          {files.length > 0 && (
            <>
              <button
                onClick={handleClearAll}
                disabled={processing}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg ${theme.buttonDanger} disabled:opacity-50`}
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
              <button
                onClick={handleProcess}
                disabled={processing || pendingCount === 0}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg ${theme.buttonPrimary} disabled:opacity-50`}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Process All
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress Summary */}
      {files.length > 0 && (
        <div className={`flex items-center gap-4 mb-4 p-3 rounded-lg ${theme.bg}`}>
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${theme.textMuted}`} />
            <span className={`text-sm ${theme.textMuted}`}>Pending: {pendingCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className={`text-sm ${theme.textMuted}`}>Completed: {completedCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className={`text-sm ${theme.textMuted}`}>Failed: {failedCount}</span>
          </div>
          {processing && (
            <div className="flex-1">
              <div className={`h-2 rounded-full ${theme.bg} overflow-hidden`}>
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${((completedCount + failedCount) / files.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* File List */}
      {files.length === 0 ? (
        <div className={`text-center py-8 ${theme.textMuted}`}>
          <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No files added yet</p>
          <p className="text-sm">Click "Add Files" to select CSV or XML files for batch processing</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {files.map((file, index) => (
            <div
              key={file.id}
              className={`flex items-center gap-3 p-3 rounded-lg ${theme.bg} ${
                index === currentIndex ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {getStatusIcon(file.status)}
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${theme.text}`}>
                  {file.name || file.path?.split(/[/\\]/).pop()}
                </p>
                {file.error && (
                  <p className="text-xs text-red-500 truncate">{file.error}</p>
                )}
                {file.result && (
                  <p className="text-xs text-green-500 truncate">
                    {file.result.message || 'Processed successfully'}
                  </p>
                )}
              </div>
              {!processing && (
                <button
                  onClick={() => handleRemove(file.id)}
                  className={`p-1 rounded ${theme.textMuted} hover:text-red-500`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BatchProcessor;
