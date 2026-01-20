import React, { useState, useEffect } from 'react';
import { 
  FileText, Upload, ArrowLeftRight, Plus, Minus, 
  RefreshCw, Download, Copy, CheckCircle2, X 
} from 'lucide-react';

/**
 * XML Diff/Comparison Component
 */
export function XMLDiff({ theme, onSelectFile }) {
  const [leftFile, setLeftFile] = useState(null);
  const [rightFile, setRightFile] = useState(null);
  const [leftContent, setLeftContent] = useState('');
  const [rightContent, setRightContent] = useState('');
  const [differences, setDifferences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side' or 'unified'

  const handleSelectFile = async (side) => {
    const file = await onSelectFile?.();
    if (file) {
      if (side === 'left') {
        setLeftFile(file);
        setLeftContent(file.content || '');
      } else {
        setRightFile(file);
        setRightContent(file.content || '');
      }
    }
  };

  const compareFiles = () => {
    if (!leftContent || !rightContent) return;
    
    setLoading(true);
    
    // Simple line-by-line diff
    const leftLines = leftContent.split('\n');
    const rightLines = rightContent.split('\n');
    const diffs = [];
    
    const maxLines = Math.max(leftLines.length, rightLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const leftLine = leftLines[i] || '';
      const rightLine = rightLines[i] || '';
      
      if (leftLine !== rightLine) {
        if (!leftLine && rightLine) {
          diffs.push({ type: 'added', line: i + 1, content: rightLine });
        } else if (leftLine && !rightLine) {
          diffs.push({ type: 'removed', line: i + 1, content: leftLine });
        } else {
          diffs.push({ type: 'changed', line: i + 1, left: leftLine, right: rightLine });
        }
      }
    }
    
    setDifferences(diffs);
    setLoading(false);
  };

  useEffect(() => {
    if (leftContent && rightContent) {
      compareFiles();
    }
  }, [leftContent, rightContent]);

  const getDiffIcon = (type) => {
    switch (type) {
      case 'added': return <Plus className="w-4 h-4 text-green-500" />;
      case 'removed': return <Minus className="w-4 h-4 text-red-500" />;
      case 'changed': return <RefreshCw className="w-4 h-4 text-amber-500" />;
      default: return null;
    }
  };

  const getDiffColor = (type) => {
    switch (type) {
      case 'added': return 'bg-green-500/10 border-l-4 border-green-500';
      case 'removed': return 'bg-red-500/10 border-l-4 border-red-500';
      case 'changed': return 'bg-amber-500/10 border-l-4 border-amber-500';
      default: return '';
    }
  };

  return (
    <div className={`rounded-lg border ${theme.card} ${theme.border}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${theme.border}`}>
        <div className="flex items-center gap-2">
          <ArrowLeftRight className={`w-5 h-5 ${theme.accentText}`} />
          <h3 className={`font-medium ${theme.text}`}>XML Comparison</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className={`px-3 py-1.5 text-sm rounded-lg ${theme.input}`}
          >
            <option value="side-by-side">Side by Side</option>
            <option value="unified">Unified</option>
          </select>
        </div>
      </div>

      {/* File Selectors */}
      <div className="grid grid-cols-2 gap-4 p-4">
        <div className={`p-4 rounded-lg border-2 border-dashed ${theme.border} text-center`}>
          {leftFile ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className={`w-5 h-5 ${theme.accentText}`} />
                <span className={`text-sm ${theme.text}`}>{leftFile.name}</span>
              </div>
              <button
                onClick={() => { setLeftFile(null); setLeftContent(''); }}
                className={`p-1 rounded ${theme.textMuted} hover:text-red-500`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleSelectFile('left')}
              className={`flex flex-col items-center gap-2 w-full py-4 ${theme.textMuted} hover:${theme.accentText}`}
            >
              <Upload className="w-8 h-8" />
              <span className="text-sm">Select Original File</span>
            </button>
          )}
        </div>
        
        <div className={`p-4 rounded-lg border-2 border-dashed ${theme.border} text-center`}>
          {rightFile ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className={`w-5 h-5 ${theme.accentText}`} />
                <span className={`text-sm ${theme.text}`}>{rightFile.name}</span>
              </div>
              <button
                onClick={() => { setRightFile(null); setRightContent(''); }}
                className={`p-1 rounded ${theme.textMuted} hover:text-red-500`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleSelectFile('right')}
              className={`flex flex-col items-center gap-2 w-full py-4 ${theme.textMuted} hover:${theme.accentText}`}
            >
              <Upload className="w-8 h-8" />
              <span className="text-sm">Select Modified File</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      {leftFile && rightFile && (
        <div className={`flex items-center gap-4 px-4 py-3 border-t ${theme.border} ${theme.bg}`}>
          <span className={`text-sm ${theme.text}`}>
            <strong>{differences.length}</strong> differences found
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-sm text-green-500">
              <Plus className="w-4 h-4" />
              {differences.filter(d => d.type === 'added').length} added
            </span>
            <span className="flex items-center gap-1 text-sm text-red-500">
              <Minus className="w-4 h-4" />
              {differences.filter(d => d.type === 'removed').length} removed
            </span>
            <span className="flex items-center gap-1 text-sm text-amber-500">
              <RefreshCw className="w-4 h-4" />
              {differences.filter(d => d.type === 'changed').length} changed
            </span>
          </div>
        </div>
      )}

      {/* Diff View */}
      {differences.length > 0 && (
        <div className={`p-4 border-t ${theme.border} max-h-96 overflow-y-auto`}>
          <div className="space-y-2 font-mono text-xs">
            {differences.map((diff, index) => (
              <div
                key={index}
                className={`p-2 rounded ${getDiffColor(diff.type)}`}
              >
                <div className="flex items-start gap-2">
                  {getDiffIcon(diff.type)}
                  <span className={`${theme.textMuted}`}>Line {diff.line}:</span>
                  {diff.type === 'changed' ? (
                    <div className="flex-1">
                      <div className="text-red-400 line-through">{diff.left}</div>
                      <div className="text-green-400">{diff.right}</div>
                    </div>
                  ) : (
                    <span className={theme.text}>{diff.content}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No differences */}
      {leftFile && rightFile && differences.length === 0 && !loading && (
        <div className={`p-8 text-center ${theme.textMuted}`}>
          <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
          <p>Files are identical</p>
        </div>
      )}
    </div>
  );
}

export default XMLDiff;
