import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  FolderOpen, File, ChevronRight, ChevronDown, Save, X, Plus,
  Trash2, Edit3, RefreshCw, Search, CheckCircle2, XCircle,
  FileText, FolderPlus, FilePlus, Code, Eye, Maximize2, Minimize2,
  AlertTriangle, Copy, Scissors, ClipboardPaste, Download,
  ArrowUp, FileCode, Braces, AlignLeft, Zap, Clock, Home,
  HardDrive, History, BarChart3, ChevronLeft, ExternalLink,
  Columns, Info, Hash, FileSearch, Folder
} from 'lucide-react';

export function FileManager({ theme, language, module = 'crs', fileHistory = [], globalStats = {} }) {
  // State
  const [rootPath, setRootPath] = useState('');
  const [tree, setTree] = useState([]);
  const [expandedDirs, setExpandedDirs] = useState(new Set());
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(-1);
  const [modifiedFiles, setModifiedFiles] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [renameItem, setRenameItem] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [newItemType, setNewItemType] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemParent, setNewItemParent] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [xmlPreview, setXmlPreview] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarPanel, setSidebarPanel] = useState('files'); // 'files' | 'history' | 'quickAccess'
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [showFileInfo, setShowFileInfo] = useState(false);
  const [contentSearch, setContentSearch] = useState('');
  const [showContentSearch, setShowContentSearch] = useState(false);
  const [recentPaths, setRecentPaths] = useState(() => {
    try { return JSON.parse(localStorage.getItem('editor-recent-paths') || '[]'); } catch { return []; }
  });
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const activeFile = activeFileIndex >= 0 ? openFiles[activeFileIndex] : null;

  // Build breadcrumbs when rootPath changes
  useEffect(() => {
    if (!rootPath) { setBreadcrumbs([]); return; }
    const parts = rootPath.split(/[\\/]/);
    const crumbs = parts.map((part, i) => ({
      name: part || (i === 0 ? rootPath.charAt(0) : ''),
      path: parts.slice(0, i + 1).join('\\')
    }));
    setBreadcrumbs(crumbs);
  }, [rootPath]);

  // Save recent paths
  const addRecentPath = useCallback((p) => {
    setRecentPaths(prev => {
      const next = [p, ...prev.filter(x => x !== p)].slice(0, 10);
      localStorage.setItem('editor-recent-paths', JSON.stringify(next));
      return next;
    });
  }, []);

  // Show status message briefly
  const showStatus = useCallback((msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3000);
  }, []);

  // Load directory
  const loadDirectory = useCallback(async (dirPath) => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.listDirectory(dirPath);
    if (result.success) {
      return result.items;
    }
    return [];
  }, []);

  // Load root directory
  const loadRoot = useCallback(async (dirPath) => {
    const items = await loadDirectory(dirPath);
    setTree(items);
    setRootPath(dirPath);
    setExpandedDirs(new Set());
    addRecentPath(dirPath);
  }, [loadDirectory, addRecentPath]);

  // Browse for folder
  const handleBrowseFolder = async () => {
    if (!window.electronAPI) return;
    const folder = await window.electronAPI.selectFolder();
    if (folder) {
      await loadRoot(folder);
      showStatus(`Opened: ${folder}`);
    }
  };

  // Toggle directory expand/collapse
  const toggleDir = useCallback(async (dirPath) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(dirPath)) {
      newExpanded.delete(dirPath);
    } else {
      newExpanded.add(dirPath);
      // Load children if not already loaded
      const items = await loadDirectory(dirPath);
      setTree(prev => {
        const addChildren = (nodes) => nodes.map(node => {
          if (node.path === dirPath) {
            return { ...node, children: items };
          }
          if (node.children) {
            return { ...node, children: addChildren(node.children) };
          }
          return node;
        });
        return addChildren(prev);
      });
    }
    setExpandedDirs(newExpanded);
  }, [expandedDirs, loadDirectory]);

  // Open file in editor
  const openFile = useCallback(async (filePath) => {
    // Check if already open
    const existingIndex = openFiles.findIndex(f => f.filePath === filePath);
    if (existingIndex >= 0) {
      setActiveFileIndex(existingIndex);
      return;
    }

    if (!window.electronAPI) return;
    const result = await window.electronAPI.readFileContent(filePath);
    if (result.success) {
      const newFile = {
        filePath: result.filePath,
        fileName: result.fileName,
        content: result.content,
        originalContent: result.content,
        language: result.language,
        extension: result.extension,
        size: result.size,
        modified: result.modified
      };
      setOpenFiles(prev => [...prev, newFile]);
      setActiveFileIndex(openFiles.length);
      showStatus(`Opened: ${result.fileName}`);
    } else {
      showStatus(`Error: ${result.error}`);
    }
  }, [openFiles, showStatus]);

  // Close file tab
  const closeFile = useCallback((index) => {
    const file = openFiles[index];
    if (modifiedFiles.has(file.filePath)) {
      if (!confirm(`Save changes to ${file.fileName}?`)) {
        // Discard changes
      }
    }
    setOpenFiles(prev => prev.filter((_, i) => i !== index));
    setModifiedFiles(prev => {
      const next = new Set(prev);
      next.delete(file.filePath);
      return next;
    });
    if (activeFileIndex >= index) {
      setActiveFileIndex(Math.max(0, activeFileIndex - 1));
    }
    if (openFiles.length <= 1) setActiveFileIndex(-1);
  }, [openFiles, activeFileIndex, modifiedFiles]);

  // Save file
  const saveFile = useCallback(async (index) => {
    const file = openFiles[index];
    if (!file || !window.electronAPI) return;
    const result = await window.electronAPI.writeFileContent(file.filePath, file.content);
    if (result.success) {
      setOpenFiles(prev => prev.map((f, i) => i === index ? { ...f, originalContent: f.content, size: result.size, modified: result.modified } : f));
      setModifiedFiles(prev => {
        const next = new Set(prev);
        next.delete(file.filePath);
        return next;
      });
      showStatus(`Saved: ${file.fileName} (${formatSize(result.size)})`);
    } else {
      showStatus(`Error saving: ${result.error}`);
    }
  }, [openFiles, showStatus]);

  // Handle editor content change
  const handleEditorChange = useCallback((value) => {
    if (activeFileIndex < 0) return;
    setOpenFiles(prev => prev.map((f, i) => i === activeFileIndex ? { ...f, content: value } : f));
    const file = openFiles[activeFileIndex];
    if (file) {
      const isModified = value !== file.originalContent;
      setModifiedFiles(prev => {
        const next = new Set(prev);
        if (isModified) next.add(file.filePath);
        else next.delete(file.filePath);
        return next;
      });
    }
  }, [activeFileIndex, openFiles]);

  // Editor mount
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (activeFileIndex >= 0) saveFile(activeFileIndex);
    });
  };

  // Validate XML
  const validateXml = useCallback(async () => {
    if (!activeFile || !window.electronAPI) return;
    if (activeFile.extension !== '.xml') {
      showStatus('Validation only available for XML files');
      return;
    }
    setIsValidating(true);
    setShowValidation(true);
    try {
      const detectedModule = detectModule(activeFile.content);
      const result = await window.electronAPI.validateXmlContent(activeFile.content, detectedModule);
      setValidationResult(result);
    } catch (err) {
      setValidationResult({ success: false, error: err.message });
    }
    setIsValidating(false);
  }, [activeFile, showStatus]);

  // Format XML
  const formatXml = useCallback(async () => {
    if (!activeFile || !window.electronAPI) return;
    if (activeFile.extension !== '.xml') return;
    const result = await window.electronAPI.formatXml(activeFile.content);
    if (result.success) {
      handleEditorChange(result.content);
      if (editorRef.current) {
        editorRef.current.setValue(result.content);
      }
      showStatus('XML formatted');
    }
  }, [activeFile, handleEditorChange, showStatus]);

  // Detect module from XML content
  const detectModule = (content) => {
    if (content.includes('FATCA_OECD') || content.includes('fatca')) return 'fatca';
    if (content.includes('CBC_OECD') || content.includes('CbcBody')) return 'cbc';
    return 'crs';
  };

  // Delete item
  const handleDelete = async (item) => {
    if (!window.electronAPI) return;
    const type = item.isDirectory ? 'folder' : 'file';
    if (!confirm(`Delete ${type} "${item.name}"?`)) return;
    const result = await window.electronAPI.deleteFile(item.path);
    if (result.success) {
      // Close if open
      const openIndex = openFiles.findIndex(f => f.filePath === item.path);
      if (openIndex >= 0) closeFile(openIndex);
      // Refresh parent
      if (rootPath) loadRoot(rootPath);
      showStatus(`Deleted: ${item.name}`);
    }
  };

  // Rename item
  const handleRename = async () => {
    if (!renameItem || !renameValue || !window.electronAPI) return;
    const dir = renameItem.path.substring(0, renameItem.path.lastIndexOf(renameItem.path.includes('/') ? '/' : '\\'));
    const sep = renameItem.path.includes('/') ? '/' : '\\';
    const newPath = dir + sep + renameValue;
    const result = await window.electronAPI.renameFile(renameItem.path, newPath);
    if (result.success) {
      // Update open files
      setOpenFiles(prev => prev.map(f => f.filePath === renameItem.path ? { ...f, filePath: newPath, fileName: renameValue } : f));
      if (rootPath) loadRoot(rootPath);
      showStatus(`Renamed to: ${renameValue}`);
    }
    setRenameItem(null);
  };

  // Create new file/folder
  const handleCreateItem = async () => {
    if (!newItemName || !window.electronAPI) return;
    const sep = newItemParent.includes('/') ? '/' : '\\';
    const fullPath = newItemParent + sep + newItemName;
    let result;
    if (newItemType === 'folder') {
      result = await window.electronAPI.createFolder(fullPath);
    } else {
      const ext = newItemName.endsWith('.xml') ? '.xml' : '';
      const template = ext === '.xml' ? '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n</root>' : '';
      result = await window.electronAPI.createFile(fullPath, template);
    }
    if (result.success) {
      if (rootPath) loadRoot(rootPath);
      if (newItemType === 'file') openFile(fullPath);
      showStatus(`Created: ${newItemName}`);
    }
    setNewItemType(null);
    setNewItemName('');
  };

  // Sidebar resize
  const handleMouseDown = () => setIsResizing(true);
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      setSidebarWidth(Math.max(180, Math.min(500, e.clientX)));
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Context menu
  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };
  useEffect(() => {
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // Format helpers
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString();
  };

  const getFileIcon = (item) => {
    if (item.isDirectory) return <FolderOpen className="w-4 h-4 text-yellow-500" />;
    const ext = item.name.split('.').pop()?.toLowerCase();
    if (ext === 'xml') return <FileCode className="w-4 h-4 text-orange-500" />;
    if (ext === 'json') return <Braces className="w-4 h-4 text-green-500" />;
    if (ext === 'csv') return <FileText className="w-4 h-4 text-blue-500" />;
    if (ext === 'py') return <Code className="w-4 h-4 text-yellow-400" />;
    if (ext === 'js' || ext === 'jsx') return <Code className="w-4 h-4 text-yellow-300" />;
    return <File className="w-4 h-4 text-gray-400" />;
  };

  // Determine editor theme
  const isDark = theme?.bg?.includes('gray-9') || theme?.bg?.includes('slate-9') || theme?.bg?.includes('zinc-9') || theme?.name?.toLowerCase().includes('dark') || theme?.name?.toLowerCase().includes('forest') || theme?.name?.toLowerCase().includes('ocean') || theme?.name?.toLowerCase().includes('midnight');

  // Render file tree item
  const renderTreeItem = (item, depth = 0) => {
    const isExpanded = expandedDirs.has(item.path);
    const isActive = activeFile?.filePath === item.path;
    const isRenaming = renameItem?.path === item.path;
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch && !item.isDirectory) return null;

    return (
      <div key={item.path}>
        <div
          className={`flex items-center gap-1 px-2 py-1 cursor-pointer text-sm transition-colors group ${
            isActive ? (isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-800') : (isDark ? 'hover:bg-gray-700/50 text-gray-300' : 'hover:bg-gray-100 text-gray-700')
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => item.isDirectory ? toggleDir(item.path) : openFile(item.path)}
          onContextMenu={(e) => handleContextMenu(e, item)}
        >
          {item.isDirectory && (
            isExpanded ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0" />
          )}
          {!item.isDirectory && <span className="w-3" />}
          {getFileIcon(item)}
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenameItem(null); }}
              onBlur={handleRename}
              className="flex-1 px-1 py-0 text-sm bg-transparent border border-blue-500 rounded outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate flex-1">{item.name}</span>
          )}
          {!item.isDirectory && (
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} opacity-0 group-hover:opacity-100`}>
              {formatSize(item.size)}
            </span>
          )}
        </div>
        {item.isDirectory && isExpanded && item.children && (
          <div>
            {item.children.map(child => renderTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-130px)] rounded-xl border overflow-hidden ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
      {/* Toolbar */}
      <div className={`flex items-center gap-1 px-3 py-2 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <button onClick={handleBrowseFolder} className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`} title="Open Folder">
          <FolderOpen className="w-4 h-4" />
        </button>
        {rootPath && (
          <button onClick={() => loadRoot(rootPath)} className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
        <div className={`w-px h-5 mx-1 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
        {activeFile && (
          <>
            <button onClick={() => saveFile(activeFileIndex)} disabled={!modifiedFiles.has(activeFile?.filePath)} className={`p-1.5 rounded transition-colors ${modifiedFiles.has(activeFile?.filePath) ? (isDark ? 'hover:bg-gray-700 text-blue-400' : 'hover:bg-gray-200 text-blue-600') : (isDark ? 'text-gray-600' : 'text-gray-300')} disabled:cursor-not-allowed`} title="Save (Ctrl+S)">
              <Save className="w-4 h-4" />
            </button>
            {activeFile.extension === '.xml' && (
              <>
                <button onClick={formatXml} className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`} title="Format XML">
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button onClick={validateXml} disabled={isValidating} className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-green-400' : 'hover:bg-gray-200 text-green-600'}`} title="Validate XML">
                  {isValidating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                </button>
                <button onClick={() => setXmlPreview(!xmlPreview)} className={`p-1.5 rounded transition-colors ${xmlPreview ? (isDark ? 'bg-gray-700 text-blue-400' : 'bg-blue-100 text-blue-600') : (isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600')}`} title="Toggle Preview">
                  <Eye className="w-4 h-4" />
                </button>
              </>
            )}
          </>
        )}
        {activeFile && (
          <>
            <div className={`w-px h-5 mx-1 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
            <button onClick={() => setShowFileInfo(!showFileInfo)} className={`p-1.5 rounded transition-colors ${showFileInfo ? (isDark ? 'bg-gray-700 text-blue-400' : 'bg-blue-100 text-blue-600') : (isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600')}`} title="File Info">
              <Info className="w-4 h-4" />
            </button>
            {window.electronAPI?.openFileLocation && (
              <button onClick={() => window.electronAPI.openFileLocation(activeFile.filePath)} className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`} title="Open in Explorer">
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </>
        )}
        <div className="flex-1" />
        <button onClick={() => setShowSearch(!showSearch)} className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`} title="Search Files">
          <Search className="w-4 h-4" />
        </button>
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-600'}`} title="Toggle Sidebar">
          {sidebarCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {!sidebarCollapsed && (
          <>
            <div className="flex flex-col overflow-hidden" style={{ width: sidebarWidth, minWidth: sidebarWidth }}>
              {/* Sidebar panel tabs */}
              <div className={`flex border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                {[
                  { id: 'files', icon: Folder, label: 'Files' },
                  { id: 'history', icon: History, label: 'History' },
                  { id: 'quickAccess', icon: Zap, label: 'Quick' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSidebarPanel(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium transition-colors ${
                      sidebarPanel === tab.id
                        ? (isDark ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800/50' : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50')
                        : (isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')
                    }`}
                    title={tab.label}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* ===== FILES PANEL ===== */}
              {sidebarPanel === 'files' && (
                <>
                  {/* Breadcrumb navigation */}
                  {rootPath && breadcrumbs.length > 0 && (
                    <div className={`flex items-center gap-0.5 px-2 py-1 border-b overflow-x-auto ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <button onClick={() => { const parent = rootPath.split(/[\\/]/).slice(0, -1).join('\\'); if (parent) loadRoot(parent); }} className={`p-0.5 rounded ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`} title="Go Up">
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      {breadcrumbs.slice(-3).map((crumb, i) => (
                        <React.Fragment key={crumb.path}>
                          {i > 0 && <ChevronRight className={`w-2.5 h-2.5 flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />}
                          <button onClick={() => loadRoot(crumb.path)} className={`text-[10px] truncate max-w-[70px] px-1 py-0.5 rounded ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`} title={crumb.path}>
                            {crumb.name}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {/* Search bar */}
                  {showSearch && (
                    <div className={`px-2 py-1.5 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="relative">
                        <Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <input
                          autoFocus
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Filter files..."
                          className={`w-full pl-7 pr-2 py-1 text-xs rounded border ${isDark ? 'bg-gray-800 border-gray-600 text-gray-200 placeholder:text-gray-500' : 'bg-white border-gray-300 text-gray-700 placeholder:text-gray-400'} outline-none focus:border-blue-500`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Quick actions bar */}
                  {rootPath && (
                    <div className={`flex items-center gap-0.5 px-2 py-1 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <button onClick={() => { setNewItemType('file'); setNewItemParent(rootPath); }} className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`} title="New File">
                        <FilePlus className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setNewItemType('folder'); setNewItemParent(rootPath); }} className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`} title="New Folder">
                        <FolderPlus className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => loadRoot(rootPath)} className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`} title="Refresh">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <span className={`flex-1 text-[10px] truncate px-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} title={rootPath}>
                        {rootPath.split(/[\\/]/).pop()}
                      </span>
                    </div>
                  )}

                  {/* New item input */}
                  {newItemType && (
                    <div className={`px-2 py-1.5 border-b ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center gap-1">
                        {newItemType === 'folder' ? <FolderPlus className="w-3.5 h-3.5 text-yellow-500" /> : <FilePlus className="w-3.5 h-3.5 text-blue-500" />}
                        <input
                          autoFocus
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleCreateItem(); if (e.key === 'Escape') { setNewItemType(null); setNewItemName(''); } }}
                          placeholder={newItemType === 'folder' ? 'folder name' : 'filename.xml'}
                          className={`flex-1 px-1.5 py-0.5 text-xs rounded border ${isDark ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700'} outline-none focus:border-blue-500`}
                        />
                      </div>
                    </div>
                  )}

                  {/* File tree */}
                  <div className={`flex-1 overflow-y-auto overflow-x-hidden ${isDark ? 'scrollbar-dark' : ''}`}>
                    {!rootPath ? (
                      <div className={`flex flex-col items-center justify-center h-full px-4 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        <FolderOpen className="w-10 h-10 mb-3 opacity-50" />
                        <p className="text-sm font-medium mb-1">No folder open</p>
                        <p className="text-xs mb-3">Open a folder to browse files</p>
                        <button onClick={handleBrowseFolder} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${isDark ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>
                          Open Folder
                        </button>
                      </div>
                    ) : tree.length === 0 ? (
                      <div className={`p-4 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Empty directory
                      </div>
                    ) : (
                      tree.map(item => renderTreeItem(item))
                    )}
                  </div>
                </>
              )}

              {/* ===== HISTORY PANEL ===== */}
              {sidebarPanel === 'history' && (
                <div className={`flex-1 overflow-y-auto ${isDark ? 'scrollbar-dark' : ''}`}>
                  {/* Stats summary */}
                  <div className={`px-3 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`text-center p-1.5 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <div className={`text-lg font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{globalStats.totalXmlGenerated || 0}</div>
                        <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>XML Generated</div>
                      </div>
                      <div className={`text-center p-1.5 rounded ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <div className={`text-lg font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>{globalStats.totalCorrectionsGenerated || 0}</div>
                        <div className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Corrections</div>
                      </div>
                    </div>
                  </div>

                  {/* File history list */}
                  {fileHistory.length === 0 ? (
                    <div className={`p-4 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">No files generated yet</p>
                      <p className="text-[10px] mt-1">Files will appear here after generation</p>
                    </div>
                  ) : (
                    <div className="py-1">
                      {fileHistory.map((entry, i) => (
                        <div
                          key={entry.id || i}
                          className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${isDark ? 'hover:bg-gray-700/50 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                          onClick={() => entry.filePath && openFile(entry.filePath)}
                          title={entry.filePath || entry.fileName}
                        >
                          <FileCode className={`w-3.5 h-3.5 flex-shrink-0 ${
                            entry.type === 'correction' ? 'text-orange-400' :
                            entry.type === 'fatca-xml' ? 'text-purple-400' :
                            entry.type === 'cbc-xml' ? 'text-blue-400' :
                            entry.type === 'csv' ? 'text-green-400' : 'text-orange-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs truncate">{entry.fileName || 'Unknown'}</div>
                            <div className={`text-[10px] flex items-center gap-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              <span>{entry.type?.toUpperCase()}</span>
                              {entry.fileSize && <span>{entry.fileSize} MB</span>}
                              {entry.timestamp && <span>{new Date(entry.timestamp).toLocaleDateString()}</span>}
                            </div>
                          </div>
                          {entry.filePath && (
                            <button
                              onClick={(e) => { e.stopPropagation(); const dir = entry.filePath.substring(0, entry.filePath.lastIndexOf('\\')); if (dir) loadRoot(dir); setSidebarPanel('files'); }}
                              className={`p-0.5 rounded opacity-0 group-hover:opacity-100 ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                              title="Open containing folder"
                            >
                              <FolderOpen className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ===== QUICK ACCESS PANEL ===== */}
              {sidebarPanel === 'quickAccess' && (
                <div className={`flex-1 overflow-y-auto ${isDark ? 'scrollbar-dark' : ''}`}>
                  {/* Common project folders */}
                  <div className={`px-3 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Project Folders</div>
                    {[
                      { label: 'Output (out/)', icon: Download, pathSuffix: 'out' },
                      { label: 'Test Output', icon: FileSearch, pathSuffix: 'out\\e2e_full_regression' },
                      { label: 'Project Root', icon: Home, pathSuffix: '' },
                      { label: 'Electron App', icon: Code, pathSuffix: 'electron-app' },
                      { label: 'Python Source', icon: FileCode, pathSuffix: 'crs_generator' },
                    ].map(item => {
                      // Guess project root from current rootPath or from history entries
                      const guessRoot = () => {
                        if (rootPath) {
                          const idx = rootPath.toLowerCase().indexOf('crs-testdata-generator');
                          if (idx >= 0) return rootPath.substring(0, idx + 'crs-testdata-generator'.length);
                        }
                        if (fileHistory.length > 0 && fileHistory[0].filePath) {
                          const idx = fileHistory[0].filePath.toLowerCase().indexOf('crs-testdata-generator');
                          if (idx >= 0) return fileHistory[0].filePath.substring(0, idx + 'crs-testdata-generator'.length);
                        }
                        return null;
                      };
                      const projectRoot = guessRoot();
                      const fullPath = projectRoot ? (item.pathSuffix ? projectRoot + '\\' + item.pathSuffix : projectRoot) : null;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          onClick={() => { if (fullPath) { loadRoot(fullPath); setSidebarPanel('files'); } else { handleBrowseFolder(); } }}
                          disabled={!fullPath}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors mb-0.5 ${
                            fullPath ? (isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100') : (isDark ? 'text-gray-600' : 'text-gray-300')
                          }`}
                          title={fullPath || 'Path not detected'}
                        >
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* History-based output folders */}
                  {fileHistory.length > 0 && (
                    <div className={`px-3 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Generated File Locations</div>
                      {(() => {
                        const dirs = new Set();
                        fileHistory.forEach(e => {
                          if (e.filePath) {
                            const dir = e.filePath.substring(0, e.filePath.lastIndexOf('\\'));
                            if (dir) dirs.add(dir);
                          }
                        });
                        return [...dirs].slice(0, 5).map(dir => (
                          <button
                            key={dir}
                            onClick={() => { loadRoot(dir); setSidebarPanel('files'); }}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors mb-0.5 ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                            title={dir}
                          >
                            <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-yellow-500" />
                            <span className="truncate">{dir.split('\\').pop()}</span>
                          </button>
                        ));
                      })()}
                    </div>
                  )}

                  {/* Recent folders */}
                  <div className={`px-3 py-2 ${isDark ? '' : ''}`}>
                    <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Recent Folders</div>
                    {recentPaths.length === 0 ? (
                      <p className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>No recent folders</p>
                    ) : (
                      recentPaths.map(p => (
                        <button
                          key={p}
                          onClick={() => { loadRoot(p); setSidebarPanel('files'); }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors mb-0.5 ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                          title={p}
                        >
                          <Clock className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                          <span className="truncate">{p.split('\\').pop()}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Resize handle */}
            <div
              className={`w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors ${isResizing ? 'bg-blue-500' : ''}`}
              onMouseDown={handleMouseDown}
            />
          </>
        )}

        {/* Editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* File tabs */}
          {openFiles.length > 0 && (
            <div className={`flex items-center border-b overflow-x-auto ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              {openFiles.map((file, index) => (
                <div
                  key={file.filePath}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer border-r group whitespace-nowrap ${
                    index === activeFileIndex
                      ? (isDark ? 'bg-gray-900 text-gray-200 border-gray-700' : 'bg-white text-gray-800 border-gray-200')
                      : (isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-750 border-gray-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-50 border-gray-200')
                  }`}
                  onClick={() => setActiveFileIndex(index)}
                >
                  {getFileIcon({ name: file.fileName, isDirectory: false })}
                  <span className="truncate max-w-[120px]">{file.fileName}</span>
                  {modifiedFiles.has(file.filePath) && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" title="Unsaved changes" />
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); closeFile(index); }}
                    className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Editor / Welcome screen */}
          <div className="flex-1 overflow-hidden">
            {activeFile ? (
              <div className="flex h-full">
                {/* Monaco Editor */}
                <div className={`${xmlPreview ? 'w-1/2' : 'w-full'} min-w-0`}>
                  <Editor
                    height="100%"
                    language={activeFile.language}
                    value={activeFile.content}
                    onChange={handleEditorChange}
                    onMount={handleEditorMount}
                    theme={isDark ? 'vs-dark' : 'light'}
                    options={{
                      fontSize: 13,
                      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
                      fontLigatures: true,
                      minimap: { enabled: true, maxColumn: 80 },
                      wordWrap: 'on',
                      lineNumbers: 'on',
                      renderLineHighlight: 'all',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      formatOnPaste: true,
                      bracketPairColorization: { enabled: true },
                      guides: { bracketPairs: true, indentation: true },
                      folding: true,
                      foldingStrategy: 'indentation',
                      smoothScrolling: true,
                      cursorBlinking: 'smooth',
                      cursorSmoothCaretAnimation: 'on',
                      padding: { top: 8 }
                    }}
                  />
                </div>

                {/* XML Preview panel */}
                {xmlPreview && activeFile.extension === '.xml' && (
                  <div className={`w-1/2 min-w-0 border-l overflow-hidden ${isDark ? 'border-gray-700 bg-gray-850' : 'border-gray-200 bg-gray-50'}`}>
                    <XmlPreview content={activeFile.content} isDark={isDark} />
                  </div>
                )}
              </div>
            ) : (
              <div className={`flex flex-col items-center justify-center h-full ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <FileCode className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">No file open</p>
                <p className="text-sm">Select a file from the sidebar to edit</p>
                <div className={`mt-6 flex flex-col gap-2 text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                  <div className="flex items-center gap-2"><kbd className={`px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100 border border-gray-300'}`}>Ctrl+S</kbd> Save</div>
                  <div className="flex items-center gap-2"><kbd className={`px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100 border border-gray-300'}`}>Ctrl+F</kbd> Find</div>
                  <div className="flex items-center gap-2"><kbd className={`px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100 border border-gray-300'}`}>Ctrl+Z</kbd> Undo</div>
                </div>
              </div>
            )}
          </div>

          {/* Validation panel */}
          {showValidation && validationResult && (
            <div className={`border-t max-h-64 overflow-y-auto ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              {/* Header row */}
              <div className={`flex items-center justify-between px-3 py-1.5 sticky top-0 ${isDark ? 'bg-gray-800 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  {validationResult.is_valid ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm font-semibold ${validationResult.is_valid ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
                    {validationResult.is_valid ? 'Valid XML' : `Validation Failed${validationResult.errors?.length ? ` (${validationResult.errors.length} error${validationResult.errors.length > 1 ? 's' : ''})` : ''}`}
                  </span>
                  {validationResult.warnings?.length > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
                      {validationResult.warnings.length} warning{validationResult.warnings.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <button onClick={() => setShowValidation(false)} className={`p-1 rounded ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Validation metadata - show countries, accounts, version etc */}
              {(validationResult.transmitting_country || validationResult.total_accounts !== undefined || validationResult.version) && (
                <div className={`px-3 py-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  {validationResult.transmitting_country && (
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                      Route: <strong className={isDark ? 'text-gray-200' : 'text-gray-700'}>{validationResult.transmitting_country} → {validationResult.receiving_country || '?'}</strong>
                    </span>
                  )}
                  {validationResult.total_accounts !== undefined && (
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                      Accounts: <strong className={isDark ? 'text-gray-200' : 'text-gray-700'}>{validationResult.total_accounts}</strong>
                      {validationResult.individual_accounts !== undefined && (
                        <span> ({validationResult.individual_accounts} ind, {validationResult.organisation_accounts} org)</span>
                      )}
                    </span>
                  )}
                  {validationResult.reporting_fi_count !== undefined && (
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                      FIs: <strong className={isDark ? 'text-gray-200' : 'text-gray-700'}>{validationResult.reporting_fi_count}</strong>
                    </span>
                  )}
                  {validationResult.reporting_period && (
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                      Period: <strong className={isDark ? 'text-gray-200' : 'text-gray-700'}>{validationResult.reporting_period}</strong>
                    </span>
                  )}
                  {validationResult.version && (
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                      Version: <strong className={isDark ? 'text-gray-200' : 'text-gray-700'}>{validationResult.version}</strong>
                    </span>
                  )}
                  {validationResult.message_ref_id && (
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                      MsgRefId: <strong className={`font-mono text-[11px] ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{validationResult.message_ref_id}</strong>
                    </span>
                  )}
                  {validationResult.message_type_indic && (
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                      Type: <strong className={isDark ? 'text-gray-200' : 'text-gray-700'}>{validationResult.message_type_indic}</strong>
                      {validationResult.is_correction_file && <span className="ml-1 text-orange-400">(correction)</span>}
                    </span>
                  )}
                </div>
              )}

              {/* Errors list */}
              {validationResult.errors && validationResult.errors.length > 0 && (
                <div className="px-3 py-2 space-y-1.5">
                  <div className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-red-400' : 'text-red-600'}`}>Errors</div>
                  {validationResult.errors.map((err, i) => (
                    <div key={i} className={`flex items-start gap-2 text-xs p-1.5 rounded ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                      <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className={isDark ? 'text-red-300' : 'text-red-700'}>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings list */}
              {validationResult.warnings && validationResult.warnings.length > 0 && (
                <div className="px-3 py-2 space-y-1.5">
                  <div className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>Warnings</div>
                  {validationResult.warnings.map((warn, i) => (
                    <div key={i} className={`flex items-start gap-2 text-xs p-1.5 rounded ${isDark ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <span className={isDark ? 'text-yellow-300' : 'text-yellow-700'}>{warn}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Success message if valid with no errors */}
              {validationResult.is_valid && (!validationResult.errors || validationResult.errors.length === 0) && (
                <div className={`px-3 py-2 text-xs ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                  All validation checks passed. The XML file is structurally valid.
                  {validationResult.can_generate_correction && (
                    <span className="block mt-1 text-blue-400">This file can be used to generate a correction file.</span>
                  )}
                </div>
              )}

              {/* Fallback: if no errors array but error string */}
              {validationResult.error && !validationResult.errors?.length && (
                <div className="px-3 py-2">
                  <div className={`flex items-start gap-2 text-xs p-1.5 rounded ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                    <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className={isDark ? 'text-red-300' : 'text-red-700'}>{validationResult.error}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* File info panel */}
      {showFileInfo && activeFile && (
        <div className={`border-t px-4 py-2 ${isDark ? 'border-gray-700 bg-gray-800/80' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>File Information</span>
            <button onClick={() => setShowFileInfo(false)} className={`p-0.5 rounded ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}><X className="w-3 h-3" /></button>
          </div>
          <div className="grid grid-cols-4 gap-x-6 gap-y-1 text-xs">
            <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Name: </span><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{activeFile.fileName}</span></div>
            <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Size: </span><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{formatSize(activeFile.size)}</span></div>
            <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Type: </span><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{activeFile.extension.replace('.', '').toUpperCase() || 'Unknown'}</span></div>
            <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Modified: </span><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{formatDate(activeFile.modified)}</span></div>
            <div className="col-span-4"><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Path: </span><span className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-mono text-[11px]`}>{activeFile.filePath}</span></div>
            {activeFile.extension === '.xml' && activeFile.content && (
              <>
                <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Lines: </span><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{activeFile.content.split('\n').length}</span></div>
                <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Elements: </span><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{(activeFile.content.match(/<[^/!?][^>]*>/g) || []).length}</span></div>
                <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Encoding: </span><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{(activeFile.content.match(/encoding="([^"]+)"/) || [null, 'UTF-8'])[1]}</span></div>
                <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>DocRefIds: </span><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{(activeFile.content.match(/DocRefId>/g) || []).length / 2}</span></div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className={`flex items-center justify-between px-3 py-1 text-xs border-t ${isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
        <div className="flex items-center gap-3">
          {statusMessage && <span className="text-blue-500">{statusMessage}</span>}
          {!statusMessage && activeFile && (
            <>
              <span>{activeFile.extension.replace('.', '').toUpperCase()}</span>
              <span>{formatSize(activeFile.size)}</span>
              <span>{formatDate(activeFile.modified)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeFile && modifiedFiles.has(activeFile.filePath) && <span className="text-blue-400">Modified</span>}
          {openFiles.length > 0 && <span>{openFiles.length} file{openFiles.length > 1 ? 's' : ''} open</span>}
          {rootPath && <span className="truncate max-w-[200px]" title={rootPath}>{rootPath}</span>}
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className={`fixed z-50 rounded-lg shadow-xl border py-1 min-w-[160px] ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.item.isFile && (
            <ContextMenuItem icon={FileText} label="Open" isDark={isDark} onClick={() => openFile(contextMenu.item.path)} />
          )}
          {contextMenu.item.isDirectory && (
            <>
              <ContextMenuItem icon={FilePlus} label="New File" isDark={isDark} onClick={() => { setNewItemType('file'); setNewItemParent(contextMenu.item.path); setExpandedDirs(prev => new Set([...prev, contextMenu.item.path])); }} />
              <ContextMenuItem icon={FolderPlus} label="New Folder" isDark={isDark} onClick={() => { setNewItemType('folder'); setNewItemParent(contextMenu.item.path); }} />
              <div className={`my-1 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`} />
            </>
          )}
          <ContextMenuItem icon={Edit3} label="Rename" isDark={isDark} onClick={() => { setRenameItem(contextMenu.item); setRenameValue(contextMenu.item.name); }} />
          <ContextMenuItem icon={Copy} label="Copy Path" isDark={isDark} onClick={() => { navigator.clipboard.writeText(contextMenu.item.path); showStatus('Path copied'); }} />
          <div className={`my-1 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`} />
          <ContextMenuItem icon={Trash2} label="Delete" isDark={isDark} danger onClick={() => handleDelete(contextMenu.item)} />
        </div>
      )}
    </div>
  );
}

// Context menu item component
function ContextMenuItem({ icon: Icon, label, onClick, isDark, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
        danger
          ? (isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50')
          : (isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// XML Preview component - virtualized for large files
function XmlPreview({ content, isDark }) {
  const containerRef = React.useRef(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const LINE_HEIGHT = 22;
  const MAX_PARSE_LINES = 5000;

  const lines = React.useMemo(() => {
    if (!content) return [];
    const result = [];
    let depth = 0;
    const parts = content.replace(/>\s*</g, '>\n<').split('\n');
    const limit = Math.min(parts.length, MAX_PARSE_LINES);
    for (let idx = 0; idx < limit; idx++) {
      const trimmed = parts[idx].trim();
      if (!trimmed) continue;
      const isClosing = trimmed.startsWith('</');
      const isSelfClosing = trimmed.endsWith('/>');
      const isDeclaration = trimmed.startsWith('<?');
      if (isClosing) depth = Math.max(0, depth - 1);
      const tagMatch = trimmed.match(/<\/?([^\s>]+)/);
      const tagName = tagMatch ? tagMatch[1] : '';
      const contentMatch = trimmed.match(/>([^<]+)</);
      const textContent = contentMatch ? contentMatch[1] : '';
      const attrMatch = trimmed.match(/\s([^>]+?)(?:\s*\/?>)/);
      const attrs = attrMatch ? attrMatch[1] : '';
      result.push({ raw: trimmed, depth, tagName, textContent, attrs, isClosing, isSelfClosing, isDeclaration });
      if (!isClosing && !isSelfClosing && !isDeclaration && !textContent) depth++;
    }
    if (parts.length > MAX_PARSE_LINES) {
      result.push({ raw: `... (${parts.length - MAX_PARSE_LINES} more lines truncated)`, depth: 0, tagName: '', textContent: '', attrs: '', isClosing: false, isSelfClosing: false, isDeclaration: true });
    }
    return result;
  }, [content]);

  const handleScroll = React.useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const totalHeight = lines.length * LINE_HEIGHT;
  const viewportHeight = containerRef.current?.clientHeight || 600;
  const startIdx = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - 5);
  const endIdx = Math.min(lines.length, Math.ceil((scrollTop + viewportHeight) / LINE_HEIGHT) + 5);
  const visibleLines = lines.slice(startIdx, endIdx);

  return (
    <div ref={containerRef} onScroll={handleScroll} className="h-full overflow-auto font-mono text-xs leading-relaxed">
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleLines.map((line, i) => {
          const idx = startIdx + i;
          return (
            <div key={idx} style={{ position: 'absolute', top: idx * LINE_HEIGHT, left: 0, right: 0, paddingLeft: `${line.depth * 16 + 8}px`, height: LINE_HEIGHT, lineHeight: `${LINE_HEIGHT}px` }}>
              {line.isDeclaration ? (
                <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{line.raw}</span>
              ) : line.isClosing ? (
                <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{line.raw}</span>
              ) : (
                <>
                  <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>{'<'}{line.tagName}</span>
                  {line.attrs && <span className={isDark ? 'text-green-400' : 'text-green-600'}> {line.attrs}</span>}
                  <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>{'>'}</span>
                  {line.textContent && <span className={isDark ? 'text-orange-300' : 'text-orange-600'}>{line.textContent}</span>}
                  {line.textContent && <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>{'</'}{line.tagName}{'>'}</span>}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FileManager;
