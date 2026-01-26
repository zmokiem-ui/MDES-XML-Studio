import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { 
  Globe, FileText, Database, Map, Save, Rocket, 
  ChevronDown, ChevronUp, Building2, Users, User, 
  CheckCircle2, AlertCircle, Loader2, FolderOpen,
  Info, Sparkles, Upload, Download, Table, Eye, X,
  BarChart3, History, Trash2, Calendar, Settings,
  Moon, Sun, Home, XCircle, RefreshCw, FileEdit,
  AlertTriangle, Minus, Plus, Search, Flag, ArrowLeft,
  DollarSign, Landmark, FileCheck, Keyboard, ArrowLeftRight,
  Languages, Layers, Maximize2, Minimize2, Copy, RotateCcw,
  Zap, Star, Library
} from 'lucide-react'
import { DiffEditor } from '@monaco-editor/react'
import * as Diff from 'diff'
import { COUNTRIES, DEFAULT_PARTNER_JURISDICTIONS, getCountryName, searchCountries } from './countryData'

// Hooks
import { useLocalStorage, useRecentFiles, useProfiles, useAppSettings, useGenerationHistory } from './hooks/useLocalStorage'
import { useKeyboardShortcuts, SHORTCUTS } from './hooks/useKeyboardShortcuts'
import { useDebounce, useDebouncedCallback } from './hooks/useDebounce'
import { useThemeTransition, ThemeToggleButton } from './hooks/useThemeTransition.jsx'

// Components
import { 
  RecentFiles, ProfileManager, KeyboardShortcutsModal, BatchProcessor, XMLDiff, Dashboard,
  // New UI Components
  ToastProvider, useToast,
  FadeIn, SlideIn, PageTransition,
  LinearProgress, GenerationProgress,
  DragDropUpload,
  ErrorBoundary,
  TemplateLibraryModal, QuickTemplateButton, TEMPLATES,
  QuickGenerateButton, useLastSettings,
  CopyButton, CopyXMLButton
} from './components'

// i18n
import { translations, t, LANGUAGES } from './i18n/translations'

// Batch Processor Modal Component
function BatchProcessorModal({ theme, onClose, onGenerate }) {
  const [jobs, setJobs] = useState([])
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState([])
  const [outputFolder, setOutputFolder] = useState('')

  const addJob = (module) => {
    const newJob = {
      id: Date.now(),
      module,
      name: `${module.toUpperCase()} File ${jobs.filter(j => j.module === module).length + 1}`,
      config: {
        numReportingFIs: 1,
        individualAccounts: module === 'cbc' ? 0 : 3,
        organisationAccounts: module === 'cbc' ? 0 : 2,
        numCbcReports: module === 'cbc' ? 3 : 0,
        testMode: false
      },
      status: 'pending'
    }
    setJobs(prev => [...prev, newJob])
  }

  const removeJob = (id) => {
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  const updateJobConfig = (id, field, value) => {
    setJobs(prev => prev.map(j => 
      j.id === id ? { ...j, config: { ...j.config, [field]: value } } : j
    ))
  }

  const selectOutputFolder = async () => {
    const folder = await window.electronAPI?.selectOutputFile?.('batch')
    if (folder) setOutputFolder(folder.replace(/[^/\\]+$/, ''))
  }

  const runBatch = async () => {
    if (jobs.length === 0 || !outputFolder) return
    setProcessing(true)
    setResults([])
    
    const newResults = []
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i]
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'processing' } : j))
      
      try {
        const timestamp = Date.now()
        const outputPath = `${outputFolder}${job.module}_batch_${timestamp}_${i + 1}.xml`
        
        const generateData = {
          ...job.config,
          outputPath,
          transmittingCountry: 'NL',
          receivingCountry: job.module === 'fatca' ? 'US' : 'DE',
          reportingPeriod: new Date().getFullYear().toString(),
          sendingCompanyIN: job.module === 'fatca' ? '000000.00000.TA.531' : 'NL123456789'
        }
        
        if (job.module === 'crs') {
          await window.electronAPI.generateCRS(generateData)
        } else if (job.module === 'fatca') {
          await window.electronAPI.generateFATCA(generateData)
        } else if (job.module === 'cbc') {
          await window.electronAPI.generateCBC({
            ...generateData,
            numCbcReports: job.config.numCbcReports || 3,
            constEntitiesPerReport: 2
          })
        }
        
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'success' } : j))
        newResults.push({ ...job, success: true, outputPath })
      } catch (error) {
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'error', error: error.message } : j))
        newResults.push({ ...job, success: false, error: error.message })
      }
    }
    
    setResults(newResults)
    setProcessing(false)
  }

  const successCount = results.filter(r => r.success).length
  const errorCount = results.filter(r => !r.success).length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4 p-6 rounded-xl shadow-2xl ${theme.card} border ${theme.border}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Layers className={`w-6 h-6 ${theme.accentText}`} />
            <h2 className={`text-xl font-semibold ${theme.text}`}>Batch Processing</h2>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg ${theme.buttonSecondary}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add Jobs */}
        <div className={`p-4 rounded-lg border ${theme.border} mb-4`}>
          <p className={`text-sm ${theme.textMuted} mb-3`}>Add files to generate in batch:</p>
          <div className="flex gap-2">
            <button onClick={() => addJob('crs')} className={`px-4 py-2 rounded-lg ${theme.buttonPrimary} text-sm font-medium flex items-center gap-2`}>
              <Plus className="w-4 h-4" /> CRS File
            </button>
            <button onClick={() => addJob('fatca')} className={`px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium flex items-center gap-2`}>
              <Plus className="w-4 h-4" /> FATCA File
            </button>
            <button onClick={() => addJob('cbc')} className={`px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium flex items-center gap-2`}>
              <Plus className="w-4 h-4" /> CBC File
            </button>
          </div>
        </div>

        {/* Job List */}
        {jobs.length > 0 && (
          <div className={`p-4 rounded-lg border ${theme.border} mb-4`}>
            <div className="flex items-center justify-between mb-3">
              <p className={`font-medium ${theme.text}`}>{jobs.length} file(s) queued</p>
              <button onClick={() => setJobs([])} className={`text-xs ${theme.textMuted} hover:underline`}>Clear All</button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {jobs.map((job, idx) => (
                <div key={job.id} className={`flex items-center gap-3 p-3 rounded-lg ${theme.bg}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                    job.module === 'crs' ? 'bg-blue-500' : job.module === 'fatca' ? 'bg-green-500' : 'bg-purple-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${theme.text}`}>{job.name}</p>
                    <div className="flex gap-4 mt-1">
                      {job.module !== 'cbc' ? (
                        <>
                          <label className="flex items-center gap-1">
                            <span className={`text-xs ${theme.textMuted}`}>Ind:</span>
                            <input 
                              type="number" 
                              min="0" 
                              max="100"
                              value={job.config.individualAccounts}
                              onChange={(e) => updateJobConfig(job.id, 'individualAccounts', parseInt(e.target.value) || 0)}
                              className={`w-12 px-1 py-0.5 text-xs rounded ${theme.input}`}
                              disabled={processing}
                            />
                          </label>
                          <label className="flex items-center gap-1">
                            <span className={`text-xs ${theme.textMuted}`}>Org:</span>
                            <input 
                              type="number" 
                              min="0" 
                              max="100"
                              value={job.config.organisationAccounts}
                              onChange={(e) => updateJobConfig(job.id, 'organisationAccounts', parseInt(e.target.value) || 0)}
                              className={`w-12 px-1 py-0.5 text-xs rounded ${theme.input}`}
                              disabled={processing}
                            />
                          </label>
                        </>
                      ) : (
                        <label className="flex items-center gap-1">
                          <span className={`text-xs ${theme.textMuted}`}>Reports:</span>
                          <input 
                            type="number" 
                            min="1" 
                            max="20"
                            value={job.config.numCbcReports}
                            onChange={(e) => updateJobConfig(job.id, 'numCbcReports', parseInt(e.target.value) || 1)}
                            className={`w-12 px-1 py-0.5 text-xs rounded ${theme.input}`}
                            disabled={processing}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                    {job.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {job.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                    {!processing && (
                      <button onClick={() => removeJob(job.id)} className={`p-1 rounded ${theme.buttonSecondary}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Output Folder */}
        <div className={`p-4 rounded-lg border ${theme.border} mb-4`}>
          <p className={`text-sm font-medium ${theme.text} mb-2`}>Output Location</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={outputFolder} 
              readOnly 
              placeholder="Select output folder..."
              className={`flex-1 px-3 py-2 rounded-lg ${theme.input}`}
            />
            <button onClick={selectOutputFolder} className={`px-4 py-2 rounded-lg ${theme.buttonSecondary}`}>
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className={`p-4 rounded-lg border ${theme.border} mb-4 ${successCount === results.length ? 'border-green-500/50 bg-green-500/5' : 'border-amber-500/50 bg-amber-500/5'}`}>
            <p className={`font-medium ${theme.text} mb-2`}>
              Batch Complete: {successCount} succeeded, {errorCount} failed
            </p>
            {errorCount > 0 && (
              <div className="text-sm text-red-500">
                {results.filter(r => !r.success).map((r, i) => (
                  <p key={i}>{r.name}: {r.error}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button 
            onClick={runBatch}
            disabled={jobs.length === 0 || !outputFolder || processing}
            className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
              jobs.length === 0 || !outputFolder || processing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : theme.buttonPrimary
            }`}
          >
            {processing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
            ) : (
              <><Rocket className="w-5 h-5" /> Generate {jobs.length} File(s)</>
            )}
          </button>
          <button onClick={onClose} className={`px-6 py-3 rounded-lg font-semibold ${theme.buttonSecondary}`}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// XML Diff Modal Component - Powered by Monaco Editor (VS Code's editor)
function XMLDiffModal({ theme, onClose }) {
  const [leftFile, setLeftFile] = useState(null)
  const [rightFile, setRightFile] = useState(null)
  const [leftContent, setLeftContent] = useState('')
  const [rightContent, setRightContent] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewMode, setViewMode] = useState('side') // 'side' or 'inline'
  const [loading, setLoading] = useState(false)
  const [editorLoading, setEditorLoading] = useState(true)
  const [editorError, setEditorError] = useState(null)
  const [diffStats, setDiffStats] = useState({ added: 0, removed: 0, modified: 0 })
  const diffEditorRef = useRef(null)

  const selectFile = async (side) => {
    setLoading(true)
    try {
      const filePath = await window.electronAPI?.selectXmlFile?.()
      console.log('Selected file path:', filePath)
      
      if (filePath) {
        const result = await window.electronAPI?.readXmlFile?.(filePath)
        console.log('Read file result:', typeof result, result ? 'has content' : 'no content')
        
        // Handle both object response {path, content} and string response
        let content = ''
        let fileName = filePath
        
        if (typeof result === 'string') {
          content = result
        } else if (result && typeof result === 'object') {
          content = result.content || ''
          fileName = result.path || filePath
        }
        
        console.log('Parsed content length:', content.length, 'for side:', side)
        
        if (content && content.length > 0) {
          if (side === 'left') {
            setLeftFile(fileName)
            setLeftContent(content)
            console.log('Set left content, length:', content.length)
          } else {
            setRightFile(fileName)
            setRightContent(content)
            console.log('Set right content, length:', content.length)
          }
        } else if (result?.error) {
          console.error('Error reading file:', result.error)
          alert('Error reading file: ' + result.error)
        } else {
          console.error('No content in result')
          alert('Could not read file content')
        }
      }
    } catch (error) {
      console.error('Error reading file:', error)
      alert('Error: ' + error.message)
    }
    setLoading(false)
  }

  const handleEditorDidMount = (editor) => {
    diffEditorRef.current = editor
    setEditorLoading(false)
    setEditorError(null)
    updateDiffStats()
  }

  const updateDiffStats = () => {
    if (!leftContent || !rightContent) {
      setDiffStats({ added: 0, removed: 0, modified: 0 })
      return
    }
    
    // Use proper diff algorithm
    const diffResult = Diff.diffLines(leftContent, rightContent)
    const added = diffResult.filter(p => p.added).reduce((sum, p) => sum + (p.count || 0), 0)
    const removed = diffResult.filter(p => p.removed).reduce((sum, p) => sum + (p.count || 0), 0)
    const unchanged = diffResult.filter(p => !p.added && !p.removed).reduce((sum, p) => sum + (p.count || 0), 0)
    
    setDiffStats({ added, removed, modified: 0, unchanged })
  }

  useEffect(() => {
    updateDiffStats()
  }, [leftContent, rightContent])

  const getFileName = (path) => path?.split(/[/\\]/).pop() || 'No file selected'
  
  const swapFiles = () => {
    const tempFile = leftFile
    const tempContent = leftContent
    setLeftFile(rightFile)
    setLeftContent(rightContent)
    setRightFile(tempFile)
    setRightContent(tempContent)
  }

  const clearAll = () => {
    setLeftFile(null)
    setRightFile(null)
    setLeftContent('')
    setRightContent('')
    setDiffStats({ added: 0, removed: 0, modified: 0 })
  }

  const copyDiffSummary = () => {
    const summary = `XML Comparison Summary
━━━━━━━━━━━━━━━━━━━━━━
Original: ${getFileName(leftFile)}
Modified: ${getFileName(rightFile)}

Changes:
• ${diffStats.added} lines added
• ${diffStats.removed} lines removed  
• ${diffStats.modified} lines modified
• Total: ${diffStats.added + diffStats.removed + diffStats.modified} differences

Generated by CRS Test Data Generator`
    navigator.clipboard.writeText(summary)
  }

  // Detect if theme is dark based on various theme properties
  const isDark = theme.isDark || 
    theme.bg?.includes('gray-9') || 
    theme.bg?.includes('slate-9') || 
    theme.bg?.includes('zinc-9') || 
    theme.bg?.includes('gray-800') ||
    theme.bg?.includes('gray-900') ||
    theme.name?.toLowerCase().includes('dark') ||
    theme.name?.toLowerCase().includes('space') ||
    theme.name?.toLowerCase().includes('cyber')

  const modalClass = isFullscreen 
    ? 'fixed inset-0 z-50' 
    : 'fixed inset-0 bg-black/50 flex items-center justify-center z-50'

  const contentClass = isFullscreen
    ? `w-full h-full ${theme.card} flex flex-col`
    : `w-full max-w-[95vw] h-[90vh] mx-4 p-6 rounded-xl shadow-2xl ${theme.card} border ${theme.border} flex flex-col`

  return (
    <div className={modalClass} onClick={isFullscreen ? undefined : onClose}>
      <div className={contentClass} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`flex items-center justify-between ${isFullscreen ? 'p-4 border-b ' + theme.border : 'mb-4'}`}>
          <div className="flex items-center gap-3">
            <ArrowLeftRight className={`w-6 h-6 ${theme.accentText}`} />
            <div>
              <h2 className={`text-xl font-semibold ${theme.text}`}>XML Comparison</h2>
              <p className={`text-xs ${theme.textMuted}`}>Powered by Monaco Editor (VS Code)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className={`flex rounded-lg overflow-hidden border ${theme.border}`}>
              <button 
                onClick={() => setViewMode('side')}
                className={`px-3 py-1.5 text-xs font-medium ${viewMode === 'side' ? theme.buttonPrimary : theme.buttonSecondary}`}
              >
                Side by Side
              </button>
              <button 
                onClick={() => setViewMode('inline')}
                className={`px-3 py-1.5 text-xs font-medium ${viewMode === 'inline' ? theme.buttonPrimary : theme.buttonSecondary}`}
              >
                Inline
              </button>
            </div>
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              className={`p-2 rounded-lg ${theme.buttonSecondary}`}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className={`p-2 rounded-lg ${theme.buttonSecondary}`}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* File Selection Bar */}
        <div className={`grid grid-cols-2 gap-4 ${isFullscreen ? 'px-4 py-3' : 'mb-3'}`}>
          <div className={`flex items-center gap-2 p-2 rounded-lg border ${theme.border} ${leftFile ? 'border-blue-500/50' : ''}`}>
            <FileText className={`w-4 h-4 ${leftFile ? 'text-blue-500' : theme.textMuted}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs ${theme.textMuted}`}>Original</p>
              <p className={`text-sm font-medium ${theme.text} truncate`}>{getFileName(leftFile)}</p>
            </div>
            <button 
              onClick={() => selectFile('left')} 
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${theme.buttonPrimary} flex items-center gap-1`}
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              Load
            </button>
          </div>
          
          <div className={`flex items-center gap-2 p-2 rounded-lg border ${theme.border} ${rightFile ? 'border-green-500/50' : ''}`}>
            <FileText className={`w-4 h-4 ${rightFile ? 'text-green-500' : theme.textMuted}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs ${theme.textMuted}`}>Modified</p>
              <p className={`text-sm font-medium ${theme.text} truncate`}>{getFileName(rightFile)}</p>
            </div>
            <button 
              onClick={() => selectFile('right')} 
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 hover:bg-green-700 text-white flex items-center gap-1`}
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              Load
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        {(leftContent || rightContent) && (
          <div className={`flex items-center justify-between ${isFullscreen ? 'px-4 py-2 border-b ' + theme.border : 'mb-3 p-2 rounded-lg border ' + theme.border}`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className={`text-sm ${theme.text}`}><strong>{diffStats.added}</strong> added</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className={`text-sm ${theme.text}`}><strong>{diffStats.removed}</strong> removed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className={`text-sm ${theme.text}`}><strong>{diffStats.modified}</strong> modified</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={swapFiles}
                disabled={!leftContent && !rightContent}
                className={`p-1.5 rounded ${theme.buttonSecondary}`}
                title="Swap files"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button 
                onClick={copyDiffSummary}
                disabled={!leftContent || !rightContent}
                className={`p-1.5 rounded ${theme.buttonSecondary}`}
                title="Copy summary"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button 
                onClick={clearAll}
                className={`p-1.5 rounded ${theme.buttonSecondary}`}
                title="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Monaco Diff Editor */}
        <div className={`flex-1 rounded-lg overflow-hidden border ${theme.border} relative min-h-[400px]`} style={{ backgroundColor: isDark ? '#1e1e1e' : '#ffffff' }}>
          {(!leftContent || !rightContent) ? (
            <div className={`h-full flex flex-col items-center justify-center p-8`} style={{ backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5' }}>
              <ArrowLeftRight className={`w-16 h-16 mb-6 ${theme.textMuted} opacity-30`} />
              <h3 className={`text-xl font-semibold ${theme.text} mb-2`}>Professional XML Comparison</h3>
              <p className={`text-sm mb-6 text-center max-w-md ${theme.textMuted}`}>
                Load two XML files to compare them side-by-side with full syntax highlighting,
                inline diff view, and VS Code-quality editing experience.
              </p>
              
              {/* File Status */}
              <div className="flex gap-6 mb-6">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${leftContent ? 'bg-blue-500/20 border border-blue-500/50' : theme.bg + ' border ' + theme.border}`}>
                  {leftContent ? (
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  ) : (
                    <XCircle className={`w-5 h-5 ${theme.textMuted}`} />
                  )}
                  <span className={`text-sm ${leftContent ? 'text-blue-500 font-medium' : theme.textMuted}`}>
                    {leftContent ? `Original: ${getFileName(leftFile)}` : 'Original file not loaded'}
                  </span>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${rightContent ? 'bg-green-500/20 border border-green-500/50' : theme.bg + ' border ' + theme.border}`}>
                  {rightContent ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className={`w-5 h-5 ${theme.textMuted}`} />
                  )}
                  <span className={`text-sm ${rightContent ? 'text-green-500 font-medium' : theme.textMuted}`}>
                    {rightContent ? `Modified: ${getFileName(rightFile)}` : 'Modified file not loaded'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                {!leftContent && (
                  <button 
                    onClick={() => selectFile('left')}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg ${theme.buttonPrimary} flex items-center gap-2`}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} 
                    Load Original
                  </button>
                )}
                {!rightContent && (
                  <button 
                    onClick={() => selectFile('right')}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} 
                    Load Modified
                  </button>
                )}
              </div>
              
              <div className={`mt-8 p-4 rounded-lg max-w-lg`} style={{ backgroundColor: isDark ? '#2d2d2d' : '#e8e8e8' }}>
                <p className={`text-xs ${theme.textMuted} text-center`}>
                  <strong>Use cases:</strong> Compare original XML with correction files, 
                  verify generated test data, review changes before submission, 
                  or debug XML generation issues.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Professional Diff Viewer using diff library */}
              {(() => {
                // Use proper diff algorithm
                const diffResult = Diff.diffLines(leftContent, rightContent)
                const addedCount = diffResult.filter(p => p.added).reduce((sum, p) => sum + p.count, 0)
                const removedCount = diffResult.filter(p => p.removed).reduce((sum, p) => sum + p.count, 0)
                const unchangedCount = diffResult.filter(p => !p.added && !p.removed).reduce((sum, p) => sum + p.count, 0)
                
                // Build unified view
                const buildUnifiedView = () => {
                  const rows = []
                  let leftLineNum = 1
                  let rightLineNum = 1
                  
                  diffResult.forEach((part, partIdx) => {
                    const lines = part.value.split('\n').filter((_, i, arr) => i < arr.length - 1 || part.value.slice(-1) !== '\n' || i === 0)
                    // Handle trailing newline
                    const actualLines = part.value.endsWith('\n') ? part.value.slice(0, -1).split('\n') : part.value.split('\n')
                    
                    actualLines.forEach((line, lineIdx) => {
                      if (part.added) {
                        rows.push(
                          <div key={`${partIdx}-${lineIdx}`} className="flex bg-green-900/40">
                            <span className="w-14 px-2 py-0.5 text-right text-gray-600 bg-gray-800/50 select-none border-r border-gray-700"></span>
                            <span className="w-14 px-2 py-0.5 text-right text-green-400 bg-green-900/20 select-none border-r border-gray-700">{rightLineNum++}</span>
                            <span className="w-8 px-2 py-0.5 text-center text-green-400 bg-green-900/30 select-none font-bold">+</span>
                            <pre className="flex-1 px-3 py-0.5 text-green-300 whitespace-pre overflow-x-auto">{line || ' '}</pre>
                          </div>
                        )
                      } else if (part.removed) {
                        rows.push(
                          <div key={`${partIdx}-${lineIdx}`} className="flex bg-red-900/40">
                            <span className="w-14 px-2 py-0.5 text-right text-red-400 bg-red-900/20 select-none border-r border-gray-700">{leftLineNum++}</span>
                            <span className="w-14 px-2 py-0.5 text-right text-gray-600 bg-gray-800/50 select-none border-r border-gray-700"></span>
                            <span className="w-8 px-2 py-0.5 text-center text-red-400 bg-red-900/30 select-none font-bold">−</span>
                            <pre className="flex-1 px-3 py-0.5 text-red-300 whitespace-pre overflow-x-auto">{line || ' '}</pre>
                          </div>
                        )
                      } else {
                        rows.push(
                          <div key={`${partIdx}-${lineIdx}`} className="flex hover:bg-gray-800/30">
                            <span className="w-14 px-2 py-0.5 text-right text-gray-500 bg-gray-800/50 select-none border-r border-gray-700">{leftLineNum++}</span>
                            <span className="w-14 px-2 py-0.5 text-right text-gray-500 bg-gray-800/50 select-none border-r border-gray-700">{rightLineNum++}</span>
                            <span className="w-8 px-2 py-0.5 text-center text-gray-600 bg-gray-800/30 select-none"> </span>
                            <pre className="flex-1 px-3 py-0.5 text-gray-300 whitespace-pre overflow-x-auto">{line || ' '}</pre>
                          </div>
                        )
                      }
                    })
                  })
                  return rows
                }

                // Build side-by-side view
                const buildSideBySideView = () => {
                  const leftRows = []
                  const rightRows = []
                  let leftLineNum = 1
                  let rightLineNum = 1
                  
                  diffResult.forEach((part, partIdx) => {
                    const actualLines = part.value.endsWith('\n') ? part.value.slice(0, -1).split('\n') : part.value.split('\n')
                    
                    actualLines.forEach((line, lineIdx) => {
                      if (part.added) {
                        // Add empty placeholder on left, content on right
                        leftRows.push(
                          <div key={`l-${partIdx}-${lineIdx}`} className="flex bg-gray-800/20 min-h-[24px]">
                            <span className="w-12 px-2 py-0.5 text-right text-gray-600 bg-gray-800/50 select-none border-r border-gray-700"></span>
                            <pre className="flex-1 px-3 py-0.5 text-gray-600 whitespace-pre overflow-x-auto"></pre>
                          </div>
                        )
                        rightRows.push(
                          <div key={`r-${partIdx}-${lineIdx}`} className="flex bg-green-900/40 min-h-[24px]">
                            <span className="w-12 px-2 py-0.5 text-right text-green-400 bg-green-900/20 select-none border-r border-gray-700">{rightLineNum++}</span>
                            <pre className="flex-1 px-3 py-0.5 text-green-300 whitespace-pre overflow-x-auto">{line || ' '}</pre>
                          </div>
                        )
                      } else if (part.removed) {
                        // Add content on left, empty placeholder on right
                        leftRows.push(
                          <div key={`l-${partIdx}-${lineIdx}`} className="flex bg-red-900/40 min-h-[24px]">
                            <span className="w-12 px-2 py-0.5 text-right text-red-400 bg-red-900/20 select-none border-r border-gray-700">{leftLineNum++}</span>
                            <pre className="flex-1 px-3 py-0.5 text-red-300 whitespace-pre overflow-x-auto">{line || ' '}</pre>
                          </div>
                        )
                        rightRows.push(
                          <div key={`r-${partIdx}-${lineIdx}`} className="flex bg-gray-800/20 min-h-[24px]">
                            <span className="w-12 px-2 py-0.5 text-right text-gray-600 bg-gray-800/50 select-none border-r border-gray-700"></span>
                            <pre className="flex-1 px-3 py-0.5 text-gray-600 whitespace-pre overflow-x-auto"></pre>
                          </div>
                        )
                      } else {
                        // Same content on both sides
                        leftRows.push(
                          <div key={`l-${partIdx}-${lineIdx}`} className="flex hover:bg-gray-800/30 min-h-[24px]">
                            <span className="w-12 px-2 py-0.5 text-right text-gray-500 bg-gray-800/50 select-none border-r border-gray-700">{leftLineNum++}</span>
                            <pre className="flex-1 px-3 py-0.5 text-gray-300 whitespace-pre overflow-x-auto">{line || ' '}</pre>
                          </div>
                        )
                        rightRows.push(
                          <div key={`r-${partIdx}-${lineIdx}`} className="flex hover:bg-gray-800/30 min-h-[24px]">
                            <span className="w-12 px-2 py-0.5 text-right text-gray-500 bg-gray-800/50 select-none border-r border-gray-700">{rightLineNum++}</span>
                            <pre className="flex-1 px-3 py-0.5 text-gray-300 whitespace-pre overflow-x-auto">{line || ' '}</pre>
                          </div>
                        )
                      }
                    })
                  })
                  return { leftRows, rightRows }
                }

                const { leftRows, rightRows } = buildSideBySideView()
                
                return (
                  <>
                    {/* Summary Bar */}
                    <div className="px-4 py-2 bg-gray-800 border-b border-gray-600 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-green-500"></span>
                          <span className="text-green-400 font-medium">{addedCount}</span>
                          <span className="text-gray-400">added</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500"></span>
                          <span className="text-red-400 font-medium">{removedCount}</span>
                          <span className="text-gray-400">removed</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-gray-500"></span>
                          <span className="text-gray-300 font-medium">{unchangedCount}</span>
                          <span className="text-gray-400">unchanged</span>
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {addedCount === 0 && removedCount === 0 ? (
                          <span className="text-green-400 font-medium">✓ Files are identical</span>
                        ) : (
                          <span>{Math.round((unchangedCount / (addedCount + removedCount + unchangedCount)) * 100)}% similarity</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Diff Content */}
                    <div className={`flex-1 overflow-hidden ${viewMode === 'side' ? 'grid grid-cols-2' : ''}`}>
                      {viewMode === 'side' ? (
                        <>
                          {/* Left Panel */}
                          <div className="flex flex-col border-r border-gray-600 overflow-hidden">
                            <div className="px-3 py-1.5 bg-red-900/20 border-b border-gray-600 flex items-center gap-2">
                              <Minus className="w-4 h-4 text-red-400" />
                              <span className="text-sm font-medium text-red-300">Original</span>
                              <span className="text-xs text-gray-400 ml-auto">{getFileName(leftFile)}</span>
                            </div>
                            <div className="flex-1 overflow-auto font-mono text-xs" style={{ backgroundColor: '#1e1e1e' }}>
                              {leftRows}
                            </div>
                          </div>
                          
                          {/* Right Panel */}
                          <div className="flex flex-col overflow-hidden">
                            <div className="px-3 py-1.5 bg-green-900/20 border-b border-gray-600 flex items-center gap-2">
                              <Plus className="w-4 h-4 text-green-400" />
                              <span className="text-sm font-medium text-green-300">Modified</span>
                              <span className="text-xs text-gray-400 ml-auto">{getFileName(rightFile)}</span>
                            </div>
                            <div className="flex-1 overflow-auto font-mono text-xs" style={{ backgroundColor: '#1e1e1e' }}>
                              {rightRows}
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Unified View */
                        <div className="flex flex-col overflow-hidden">
                          <div className="px-3 py-1.5 bg-gray-800 border-b border-gray-600 flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-300">Unified Diff</span>
                            <span className="text-xs text-gray-500">Left: {getFileName(leftFile)} → Right: {getFileName(rightFile)}</span>
                          </div>
                          <div className="flex-1 overflow-auto font-mono text-xs" style={{ backgroundColor: '#1e1e1e' }}>
                            {buildUnifiedView()}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between ${isFullscreen ? 'p-3 border-t ' + theme.border : 'mt-3'}`}>
          <p className={`text-xs ${theme.textMuted}`}>
            {leftContent && rightContent ? (
              <>
                Comparing {leftContent.split('\n').length} lines (original) vs {rightContent.split('\n').length} lines (modified)
              </>
            ) : (
              'Load files to start comparing'
            )}
          </p>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${theme.textMuted}`}>
              Tip: Use scroll wheel to navigate, Ctrl+F to search
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  // Module selection (CRS, FATCA, future: CBC, NTJ)
  const [activeModule, setActiveModule] = useState(null) // null = module selection screen
  
  // Navigation within module
  const [currentPage, setCurrentPage] = useState('generator')
  
  // Theme system with distinct, vibrant color schemes
  const THEMES = {
    light: {
      name: 'Light',
      emoji: '☀️',
      isDark: false,
      // Backgrounds
      bg: 'bg-gray-50',
      card: 'bg-white border-gray-200',
      cardHover: 'hover:bg-gray-50 hover:border-gray-300',
      header: 'bg-white border-gray-200',
      // Text
      text: 'text-gray-900',
      textMuted: 'text-gray-500',
      // Inputs
      input: 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500',
      inputFocus: 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
      // Primary buttons
      buttonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
      buttonSecondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300',
      buttonDanger: 'bg-red-600 hover:bg-red-700 text-white',
      buttonSuccess: 'bg-green-600 hover:bg-green-700 text-white',
      // Accents
      accent: 'bg-blue-600',
      accentHover: 'hover:bg-blue-700',
      accentText: 'text-blue-600',
      accentLight: 'bg-blue-50 border-blue-200 text-blue-700',
      // Icons
      icon: 'text-gray-500',
      iconHover: 'hover:text-blue-600',
      iconActive: 'text-blue-600',
      // Badges & Tags
      badge: 'bg-blue-100 text-blue-700',
      badgeSuccess: 'bg-green-100 text-green-700',
      badgeWarning: 'bg-amber-100 text-amber-700',
      badgeError: 'bg-red-100 text-red-700',
      // Borders
      border: 'border-gray-200',
      borderHover: 'hover:border-gray-300',
      borderFocus: 'focus:border-blue-500',
      // Toggle
      toggleOn: 'bg-blue-600',
      toggleOff: 'bg-gray-300',
      // Preview gradient
      preview: 'from-blue-500 to-indigo-600'
    },
    dark: {
      name: 'Dark',
      emoji: '🌙',
      isDark: true,
      bg: 'bg-gray-950',
      card: 'bg-gray-900 border-gray-800',
      cardHover: 'hover:bg-gray-800 hover:border-gray-700',
      header: 'bg-gray-900 border-gray-800',
      text: 'text-gray-100',
      textMuted: 'text-gray-400',
      input: 'bg-gray-800 border-gray-700 text-gray-100 focus:border-blue-500 focus:ring-blue-500',
      inputFocus: 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
      buttonPrimary: 'bg-blue-600 hover:bg-blue-500 text-white',
      buttonSecondary: 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700',
      buttonDanger: 'bg-red-600 hover:bg-red-500 text-white',
      buttonSuccess: 'bg-green-600 hover:bg-green-500 text-white',
      accent: 'bg-blue-600',
      accentHover: 'hover:bg-blue-500',
      accentText: 'text-blue-400',
      accentLight: 'bg-blue-950 border-blue-800 text-blue-300',
      icon: 'text-gray-400',
      iconHover: 'hover:text-blue-400',
      iconActive: 'text-blue-400',
      badge: 'bg-blue-900/60 text-blue-300',
      badgeSuccess: 'bg-green-900/60 text-green-300',
      badgeWarning: 'bg-amber-900/60 text-amber-300',
      badgeError: 'bg-red-900/60 text-red-300',
      border: 'border-gray-800',
      borderHover: 'hover:border-gray-700',
      borderFocus: 'focus:border-blue-500',
      toggleOn: 'bg-blue-600',
      toggleOff: 'bg-gray-700',
      preview: 'from-blue-600 to-indigo-800'
    },
    midnight: {
      name: 'Midnight',
      emoji: '🌌',
      isDark: true,
      bg: 'bg-[#0f0f23]',
      card: 'bg-[#1a1a2e] border-[#2d2d44]',
      cardHover: 'hover:bg-[#252542] hover:border-[#3d3d5c]',
      header: 'bg-[#1a1a2e] border-[#2d2d44]',
      text: 'text-[#e0e0ff]',
      textMuted: 'text-[#8888aa]',
      input: 'bg-[#252542] border-[#3d3d5c] text-[#e0e0ff] focus:border-violet-500 focus:ring-violet-500',
      inputFocus: 'focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20',
      buttonPrimary: 'bg-violet-600 hover:bg-violet-500 text-white',
      buttonSecondary: 'bg-[#252542] hover:bg-[#2d2d55] text-[#c0c0dd] border border-[#3d3d5c]',
      buttonDanger: 'bg-rose-600 hover:bg-rose-500 text-white',
      buttonSuccess: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      accent: 'bg-violet-600',
      accentHover: 'hover:bg-violet-500',
      accentText: 'text-violet-400',
      accentLight: 'bg-violet-950/50 border-violet-800 text-violet-300',
      icon: 'text-[#8888aa]',
      iconHover: 'hover:text-violet-400',
      iconActive: 'text-violet-400',
      badge: 'bg-violet-900/60 text-violet-300',
      badgeSuccess: 'bg-emerald-900/60 text-emerald-300',
      badgeWarning: 'bg-amber-900/60 text-amber-300',
      badgeError: 'bg-rose-900/60 text-rose-300',
      border: 'border-[#2d2d44]',
      borderHover: 'hover:border-[#3d3d5c]',
      borderFocus: 'focus:border-violet-500',
      toggleOn: 'bg-violet-600',
      toggleOff: 'bg-[#3d3d5c]',
      preview: 'from-violet-600 to-purple-900'
    },
    ocean: {
      name: 'Ocean',
      emoji: '🌊',
      isDark: true,
      bg: 'bg-[#0a192f]',
      card: 'bg-[#112240] border-[#1d3a5f]',
      cardHover: 'hover:bg-[#1a3050] hover:border-[#2a4a70]',
      header: 'bg-[#112240] border-[#1d3a5f]',
      text: 'text-[#ccd6f6]',
      textMuted: 'text-[#8892b0]',
      input: 'bg-[#1a3050] border-[#2a4a70] text-[#ccd6f6] focus:border-cyan-400 focus:ring-cyan-400',
      inputFocus: 'focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20',
      buttonPrimary: 'bg-cyan-600 hover:bg-cyan-500 text-white',
      buttonSecondary: 'bg-[#1a3050] hover:bg-[#234060] text-[#a8b2d1] border border-[#2a4a70]',
      buttonDanger: 'bg-red-500 hover:bg-red-400 text-white',
      buttonSuccess: 'bg-teal-500 hover:bg-teal-400 text-white',
      accent: 'bg-cyan-500',
      accentHover: 'hover:bg-cyan-400',
      accentText: 'text-cyan-400',
      accentLight: 'bg-cyan-950/50 border-cyan-800 text-cyan-300',
      icon: 'text-[#8892b0]',
      iconHover: 'hover:text-cyan-400',
      iconActive: 'text-cyan-400',
      badge: 'bg-cyan-900/60 text-cyan-300',
      badgeSuccess: 'bg-teal-900/60 text-teal-300',
      badgeWarning: 'bg-amber-900/60 text-amber-300',
      badgeError: 'bg-red-900/60 text-red-300',
      border: 'border-[#1d3a5f]',
      borderHover: 'hover:border-[#2a4a70]',
      borderFocus: 'focus:border-cyan-400',
      toggleOn: 'bg-cyan-500',
      toggleOff: 'bg-[#2a4a70]',
      preview: 'from-cyan-500 to-blue-700'
    },
    sunset: {
      name: 'Sunset',
      emoji: '🌅',
      isDark: false,
      bg: 'bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50',
      card: 'bg-white/95 border-orange-200',
      cardHover: 'hover:bg-orange-50/50 hover:border-orange-300',
      header: 'bg-white/95 border-orange-200',
      text: 'text-gray-900',
      textMuted: 'text-orange-700',
      input: 'bg-white border-orange-300 text-gray-900 focus:border-orange-500 focus:ring-orange-500',
      inputFocus: 'focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20',
      buttonPrimary: 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white',
      buttonSecondary: 'bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-300',
      buttonDanger: 'bg-red-600 hover:bg-red-700 text-white',
      buttonSuccess: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      accent: 'bg-orange-500',
      accentHover: 'hover:bg-orange-600',
      accentText: 'text-orange-600',
      accentLight: 'bg-orange-100 border-orange-300 text-orange-800',
      icon: 'text-orange-500',
      iconHover: 'hover:text-rose-500',
      iconActive: 'text-rose-500',
      badge: 'bg-orange-100 text-orange-700',
      badgeSuccess: 'bg-emerald-100 text-emerald-700',
      badgeWarning: 'bg-amber-100 text-amber-700',
      badgeError: 'bg-red-100 text-red-700',
      border: 'border-orange-200',
      borderHover: 'hover:border-orange-300',
      borderFocus: 'focus:border-orange-500',
      toggleOn: 'bg-gradient-to-r from-orange-500 to-rose-500',
      toggleOff: 'bg-orange-200',
      preview: 'from-orange-400 to-rose-500'
    },
    forest: {
      name: 'Forest',
      emoji: '🌲',
      isDark: true,
      bg: 'bg-[#1a2f1a]',
      card: 'bg-[#243524] border-[#2f4a2f]',
      cardHover: 'hover:bg-[#2a4029] hover:border-[#3a5a3a]',
      header: 'bg-[#243524] border-[#2f4a2f]',
      text: 'text-[#d4e6d4]',
      textMuted: 'text-[#8faa8f]',
      input: 'bg-[#2a4029] border-[#3a5a3a] text-[#d4e6d4] focus:border-emerald-400 focus:ring-emerald-400',
      inputFocus: 'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20',
      buttonPrimary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      buttonSecondary: 'bg-[#2a4029] hover:bg-[#345034] text-[#b4d4b4] border border-[#3a5a3a]',
      buttonDanger: 'bg-red-600 hover:bg-red-500 text-white',
      buttonSuccess: 'bg-green-500 hover:bg-green-400 text-white',
      accent: 'bg-emerald-600',
      accentHover: 'hover:bg-emerald-500',
      accentText: 'text-emerald-400',
      accentLight: 'bg-emerald-950/50 border-emerald-800 text-emerald-300',
      icon: 'text-[#8faa8f]',
      iconHover: 'hover:text-emerald-400',
      iconActive: 'text-emerald-400',
      badge: 'bg-emerald-900/60 text-emerald-300',
      badgeSuccess: 'bg-green-900/60 text-green-300',
      badgeWarning: 'bg-amber-900/60 text-amber-300',
      badgeError: 'bg-red-900/60 text-red-300',
      border: 'border-[#2f4a2f]',
      borderHover: 'hover:border-[#3a5a3a]',
      borderFocus: 'focus:border-emerald-400',
      toggleOn: 'bg-emerald-600',
      toggleOff: 'bg-[#3a5a3a]',
      preview: 'from-emerald-500 to-green-700'
    },
    lavender: {
      name: 'Lavender',
      emoji: '💜',
      isDark: false,
      bg: 'bg-gradient-to-br from-purple-50 via-fuchsia-50 to-pink-50',
      card: 'bg-white/95 border-purple-200',
      cardHover: 'hover:bg-purple-50/50 hover:border-purple-300',
      header: 'bg-white/95 border-purple-200',
      text: 'text-gray-900',
      textMuted: 'text-purple-600',
      input: 'bg-white border-purple-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500',
      inputFocus: 'focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20',
      buttonPrimary: 'bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white',
      buttonSecondary: 'bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300',
      buttonDanger: 'bg-red-600 hover:bg-red-700 text-white',
      buttonSuccess: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      accent: 'bg-purple-500',
      accentHover: 'hover:bg-purple-600',
      accentText: 'text-purple-600',
      accentLight: 'bg-purple-100 border-purple-300 text-purple-800',
      icon: 'text-purple-500',
      iconHover: 'hover:text-fuchsia-500',
      iconActive: 'text-fuchsia-500',
      badge: 'bg-purple-100 text-purple-700',
      badgeSuccess: 'bg-emerald-100 text-emerald-700',
      badgeWarning: 'bg-amber-100 text-amber-700',
      badgeError: 'bg-red-100 text-red-700',
      border: 'border-purple-200',
      borderHover: 'hover:border-purple-300',
      borderFocus: 'focus:border-purple-500',
      toggleOn: 'bg-gradient-to-r from-purple-500 to-fuchsia-500',
      toggleOff: 'bg-purple-200',
      preview: 'from-purple-500 to-fuchsia-500'
    },
    spaceGalaxy: {
      name: 'Space Galaxy',
      emoji: '🚀',
      isDark: true,
      isSpaceTheme: true,
      // Deep space backgrounds
      bg: 'bg-[#0a0e27]',
      card: 'bg-[#1a1f3a]/80 border-[#00d9ff]/20 backdrop-blur-xl',
      cardHover: 'hover:bg-[#1a1f3a]/90 hover:border-[#00d9ff]/40 hover:shadow-[0_0_30px_rgba(0,217,255,0.15)]',
      header: 'bg-[#0a0e27]/95 border-[#00d9ff]/20 backdrop-blur-xl',
      // Crisp text for readability
      text: 'text-[#f0f6ff]',
      textMuted: 'text-[#8892b0]',
      // Glowing inputs
      input: 'bg-[#0a0e27]/80 border-[#00d9ff]/30 text-[#f0f6ff] focus:border-[#00d9ff] focus:ring-[#00d9ff] focus:shadow-[0_0_20px_rgba(0,217,255,0.2)]',
      inputFocus: 'focus:border-[#00d9ff] focus:ring-2 focus:ring-[#00d9ff]/20',
      // Cosmic buttons with glow effects
      buttonPrimary: 'bg-gradient-to-r from-[#00d9ff] to-[#4d7cff] hover:from-[#00e5ff] hover:to-[#5d8cff] text-[#0a0e27] font-semibold shadow-[0_0_20px_rgba(0,217,255,0.4)] hover:shadow-[0_0_30px_rgba(0,217,255,0.6)]',
      buttonSecondary: 'bg-[#1a1f3a]/60 hover:bg-[#00d9ff]/10 text-[#f0f6ff] border border-[#00d9ff]/30 hover:border-[#00d9ff]/60 backdrop-blur-sm',
      buttonDanger: 'bg-gradient-to-r from-[#ff3366] to-[#cc2952] hover:from-[#ff4477] hover:to-[#dd3a63] text-white shadow-[0_0_20px_rgba(255,51,102,0.4)]',
      buttonSuccess: 'bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00ff99] hover:to-[#00dd7b] text-[#0a0e27] font-semibold shadow-[0_0_20px_rgba(0,255,136,0.4)]',
      // Cosmic accents
      accent: 'bg-[#00d9ff]',
      accentHover: 'hover:bg-[#00e5ff]',
      accentText: 'text-[#00d9ff]',
      accentLight: 'bg-[#00d9ff]/10 border-[#00d9ff]/30 text-[#00d9ff]',
      // Glowing icons
      icon: 'text-[#8892b0]',
      iconHover: 'hover:text-[#00d9ff] hover:drop-shadow-[0_0_8px_rgba(0,217,255,0.6)]',
      iconActive: 'text-[#00d9ff] drop-shadow-[0_0_8px_rgba(0,217,255,0.6)]',
      // Cosmic badges
      badge: 'bg-[#4d7cff]/20 text-[#4d7cff] border border-[#4d7cff]/30',
      badgeSuccess: 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30 shadow-[0_0_10px_rgba(0,255,136,0.1)]',
      badgeWarning: 'bg-[#ffaa00]/15 text-[#ffaa00] border border-[#ffaa00]/30',
      badgeError: 'bg-[#ff3366]/15 text-[#ff3366] border border-[#ff3366]/30',
      // Glowing borders
      border: 'border-[#00d9ff]/20',
      borderHover: 'hover:border-[#00d9ff]/40',
      borderFocus: 'focus:border-[#00d9ff]',
      // Cosmic toggles
      toggleOn: 'bg-gradient-to-r from-[#00d9ff] to-[#4d7cff] shadow-[0_0_15px_rgba(0,217,255,0.4)]',
      toggleOff: 'bg-[#1a1f3a] border border-[#00d9ff]/30',
      // Preview gradient
      preview: 'from-[#00d9ff] via-[#ff006e] to-[#4d7cff]'
    },
    cyberpunkNeon: {
      name: 'Cyberpunk',
      emoji: '⚡',
      isDark: true,
      isCyberpunkTheme: true,
      bg: 'bg-[#0a0a0a]',
      card: 'bg-[#0a0a0a]/95 border-[#ff006e]/40 backdrop-blur-sm',
      cardHover: 'hover:bg-[#1a0033]/80 hover:border-[#00f0ff]/60 hover:shadow-[0_0_30px_rgba(255,0,110,0.3)]',
      header: 'bg-[#0a0a0a]/98 border-[#ff006e]/30 backdrop-blur-sm',
      text: 'text-white',
      textMuted: 'text-[#00f0ff]',
      input: 'bg-[#0a0a0a]/90 border-b-2 border-[#00f0ff] text-[#00f0ff] focus:border-[#ff006e] focus:shadow-[0_2px_0_#ff006e,0_0_20px_rgba(255,0,110,0.3)]',
      inputFocus: 'focus:border-[#ff006e] focus:ring-0',
      buttonPrimary: 'bg-gradient-to-r from-[#ff006e] to-[#b400ff] hover:from-[#ff1a7a] hover:to-[#c41aff] text-white font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(255,0,110,0.5)] hover:shadow-[0_0_30px_rgba(255,0,110,0.7)]',
      buttonSecondary: 'bg-transparent hover:bg-[#ff006e]/20 text-white border-2 border-[#ff006e] hover:border-[#00f0ff] uppercase tracking-wider',
      buttonDanger: 'bg-gradient-to-r from-[#ff0266] to-[#ff006e] hover:from-[#ff1a7a] hover:to-[#ff1a8a] text-white shadow-[0_0_20px_rgba(255,2,102,0.5)]',
      buttonSuccess: 'bg-gradient-to-r from-[#39ff14] to-[#00ff41] hover:from-[#4dff28] hover:to-[#1aff55] text-[#0a0a0a] font-bold shadow-[0_0_20px_rgba(57,255,20,0.5)]',
      accent: 'bg-[#ff006e]',
      accentHover: 'hover:bg-[#ff1a7a]',
      accentText: 'text-[#ff006e]',
      accentLight: 'bg-[#ff006e]/10 border-[#ff006e]/30 text-[#ff006e]',
      icon: 'text-[#00f0ff]',
      iconHover: 'hover:text-[#ff006e] hover:drop-shadow-[0_0_8px_rgba(255,0,110,0.8)]',
      iconActive: 'text-[#ff006e] drop-shadow-[0_0_8px_rgba(255,0,110,0.8)]',
      badge: 'bg-[#b400ff]/20 text-[#b400ff] border border-[#b400ff]/40',
      badgeSuccess: 'bg-[#39ff14]/15 text-[#39ff14] border border-[#39ff14]/40 shadow-[0_0_10px_rgba(57,255,20,0.2)]',
      badgeWarning: 'bg-[#ffed00]/15 text-[#ffed00] border border-[#ffed00]/40',
      badgeError: 'bg-[#ff0266]/15 text-[#ff0266] border border-[#ff0266]/40',
      border: 'border-[#ff006e]/30',
      borderHover: 'hover:border-[#00f0ff]/60',
      borderFocus: 'focus:border-[#ff006e]',
      toggleOn: 'bg-gradient-to-r from-[#ff006e] to-[#00f0ff] shadow-[0_0_15px_rgba(255,0,110,0.5)]',
      toggleOff: 'bg-[#1a0033] border border-[#00f0ff]/40',
      preview: 'from-[#ff006e] via-[#b400ff] to-[#00f0ff]'
    },
    organicForest: {
      name: 'Organic Forest',
      emoji: '🌿',
      isDark: false,
      isForestTheme: true,
      bg: 'bg-[#faf8f3]',
      card: 'bg-gradient-to-br from-[#faf8f3] to-[#f5f0e8] border-[#4a7c39]/20',
      cardHover: 'hover:shadow-lg hover:shadow-[#4a7c39]/10 hover:border-[#4a7c39]/40',
      header: 'bg-[#faf8f3]/98 border-[#4a7c39]/20',
      text: 'text-[#2e2e2e]',
      textMuted: 'text-[#6b8e65]',
      input: 'bg-[#faf8f3] border-2 border-[#4a7c39]/30 text-[#2e2e2e] focus:border-[#4a7c39] focus:ring-[#4a7c39]/20',
      inputFocus: 'focus:border-[#4a7c39] focus:ring-2 focus:ring-[#4a7c39]/20',
      buttonPrimary: 'bg-gradient-to-r from-[#4a7c39] to-[#2d5016] hover:from-[#5a8c49] hover:to-[#3d6026] text-white shadow-md hover:shadow-lg',
      buttonSecondary: 'bg-[#faf8f3] hover:bg-[#4a7c39]/10 text-[#2d5016] border-2 border-[#4a7c39]/30 hover:border-[#4a7c39]/60',
      buttonDanger: 'bg-gradient-to-r from-[#e57373] to-[#d32f2f] hover:from-[#ef8a8a] hover:to-[#e33f3f] text-white',
      buttonSuccess: 'bg-gradient-to-r from-[#66bb6a] to-[#7cb342] hover:from-[#76cb7a] hover:to-[#8cc352] text-white',
      accent: 'bg-[#4a7c39]',
      accentHover: 'hover:bg-[#5a8c49]',
      accentText: 'text-[#2d5016]',
      accentLight: 'bg-[#4a7c39]/10 border-[#4a7c39]/30 text-[#2d5016]',
      icon: 'text-[#6b8e65]',
      iconHover: 'hover:text-[#4a7c39]',
      iconActive: 'text-[#2d5016]',
      badge: 'bg-[#4a7c39]/15 text-[#2d5016] border border-[#4a7c39]/30',
      badgeSuccess: 'bg-[#66bb6a]/15 text-[#2d5016] border border-[#66bb6a]/40',
      badgeWarning: 'bg-[#ffb74d]/20 text-[#8b6914] border border-[#ffb74d]/40',
      badgeError: 'bg-[#e57373]/15 text-[#c62828] border border-[#e57373]/40',
      border: 'border-[#4a7c39]/20',
      borderHover: 'hover:border-[#4a7c39]/40',
      borderFocus: 'focus:border-[#4a7c39]',
      toggleOn: 'bg-gradient-to-r from-[#4a7c39] to-[#7cb342]',
      toggleOff: 'bg-[#d7ccc8]',
      preview: 'from-[#2d5016] via-[#7cb342] to-[#fdd835]'
    },
    oceanUnderwater: {
      name: 'Ocean Depths',
      emoji: '🐠',
      isDark: true,
      isOceanTheme: true,
      bg: 'bg-gradient-to-b from-[#39cccc] via-[#0074d9] to-[#001f3f]',
      card: 'bg-white/10 border-white/20 backdrop-blur-xl',
      cardHover: 'hover:bg-white/15 hover:border-[#00fff7]/40 hover:shadow-[0_0_30px_rgba(0,255,247,0.15)]',
      header: 'bg-[#001f3f]/80 border-white/20 backdrop-blur-xl',
      text: 'text-white',
      textMuted: 'text-[#b2ebf2]',
      input: 'bg-white/10 border border-white/20 text-white backdrop-blur-sm focus:border-[#00fff7] focus:ring-[#00fff7]/20',
      inputFocus: 'focus:border-[#00fff7] focus:ring-2 focus:ring-[#00fff7]/20',
      buttonPrimary: 'bg-gradient-to-r from-[#0074d9] to-[#39cccc] hover:from-[#0084e9] hover:to-[#49dcdc] text-white shadow-lg hover:shadow-xl',
      buttonSecondary: 'bg-white/15 hover:bg-[#00fff7]/20 text-white border border-white/30 hover:border-[#00fff7]/60 backdrop-blur-sm',
      buttonDanger: 'bg-gradient-to-r from-[#ff6b6b] to-[#ee5a52] hover:from-[#ff7b7b] hover:to-[#fe6a62] text-white',
      buttonSuccess: 'bg-gradient-to-r from-[#00ffcc] to-[#7fdbff] hover:from-[#1affdd] hover:to-[#8febff] text-[#001f3f] font-semibold',
      accent: 'bg-[#00fff7]',
      accentHover: 'hover:bg-[#1affff]',
      accentText: 'text-[#00fff7]',
      accentLight: 'bg-[#00fff7]/10 border-[#00fff7]/30 text-[#00fff7]',
      icon: 'text-[#7fdbff]',
      iconHover: 'hover:text-[#00fff7] hover:drop-shadow-[0_0_8px_rgba(0,255,247,0.6)]',
      iconActive: 'text-[#00fff7] drop-shadow-[0_0_8px_rgba(0,255,247,0.6)]',
      badge: 'bg-[#0074d9]/30 text-[#7fdbff] border border-[#7fdbff]/30',
      badgeSuccess: 'bg-[#00ffcc]/15 text-[#00ffcc] border border-[#00ffcc]/30',
      badgeWarning: 'bg-[#ffdc00]/15 text-[#ffdc00] border border-[#ffdc00]/30',
      badgeError: 'bg-[#ff6b6b]/15 text-[#ff6b6b] border border-[#ff6b6b]/30',
      border: 'border-white/20',
      borderHover: 'hover:border-[#00fff7]/40',
      borderFocus: 'focus:border-[#00fff7]',
      toggleOn: 'bg-gradient-to-r from-[#39cccc] to-[#00fff7] shadow-[0_0_15px_rgba(0,255,247,0.4)]',
      toggleOff: 'bg-[#001f3f]/60 border border-white/30',
      preview: 'from-[#00fff7] via-[#0074d9] to-[#001f3f]'
    },
    steampunkVictorian: {
      name: 'Steampunk',
      emoji: '⚙️',
      isDark: true,
      isSteampunkTheme: true,
      bg: 'bg-gradient-to-br from-[#3e2723] via-[#2c2c2c] to-[#4a0e0e]',
      card: 'bg-gradient-to-br from-[#f4e7d7] to-[#faf0e6] border-[#b87333]/60',
      cardHover: 'hover:shadow-xl hover:shadow-[#b87333]/20 hover:border-[#d4af37]',
      header: 'bg-[#3e2723]/95 border-[#b87333]/40',
      text: 'text-[#1a1a1a]',
      textMuted: 'text-[#5d4037]',
      headerText: 'text-[#f4e7d7]',
      headerTextMuted: 'text-[#d4af37]',
      input: 'bg-[#f4e7d7] border-2 border-[#b87333]/50 text-[#1a1a1a] focus:border-[#d4af37] focus:ring-[#d4af37]/20',
      inputFocus: 'focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20',
      buttonPrimary: 'bg-gradient-to-r from-[#b87333] via-[#c87533] to-[#cd7f32] hover:from-[#d4af37] hover:via-[#b87333] hover:to-[#c87533] text-[#1a1a1a] font-semibold uppercase tracking-wider shadow-lg',
      buttonSecondary: 'bg-[#f4e7d7] hover:bg-[#d4af37]/20 text-[#3e2723] border-2 border-[#b87333]/50 hover:border-[#d4af37]',
      buttonDanger: 'bg-gradient-to-r from-[#b7410e] to-[#8b0000] hover:from-[#c7511e] hover:to-[#9b1010] text-white',
      buttonSuccess: 'bg-gradient-to-r from-[#6e8b3d] to-[#2c5f2d] hover:from-[#7e9b4d] hover:to-[#3c6f3d] text-white',
      accent: 'bg-[#d4af37]',
      accentHover: 'hover:bg-[#e4bf47]',
      accentText: 'text-[#b87333]',
      accentLight: 'bg-[#d4af37]/15 border-[#b87333]/40 text-[#8b4513]',
      icon: 'text-[#b87333]',
      iconHover: 'hover:text-[#d4af37]',
      iconActive: 'text-[#d4af37]',
      badge: 'bg-[#b87333]/20 text-[#8b4513] border border-[#b87333]/40',
      badgeSuccess: 'bg-[#6e8b3d]/20 text-[#2c5f2d] border border-[#6e8b3d]/40',
      badgeWarning: 'bg-[#ffbf00]/20 text-[#8b6914] border border-[#ffbf00]/40',
      badgeError: 'bg-[#b7410e]/20 text-[#8b0000] border border-[#b7410e]/40',
      border: 'border-[#b87333]/40',
      borderHover: 'hover:border-[#d4af37]',
      borderFocus: 'focus:border-[#d4af37]',
      toggleOn: 'bg-gradient-to-r from-[#b87333] to-[#d4af37]',
      toggleOff: 'bg-[#5a5a5a] border border-[#b87333]/40',
      preview: 'from-[#d4af37] via-[#b87333] to-[#3e2723]'
    }
  }

  const [selectedTheme, setSelectedTheme] = useState(() => {
    const saved = localStorage.getItem('crs-theme')
    return saved && THEMES[saved] ? saved : 'light'
  })

  // Live theme animations toggle
  const [liveAnimations, setLiveAnimations] = useState(() => {
    const saved = localStorage.getItem('crs-live-animations')
    return saved !== null ? saved === 'true' : true
  })

  // Save live animations preference
  useEffect(() => {
    localStorage.setItem('crs-live-animations', liveAnimations.toString())
  }, [liveAnimations])

  // Backward compatibility helper
  const darkMode = THEMES[selectedTheme]?.isDark ?? false

  // New feature hooks
  const { recentFiles, addRecentFile, removeRecentFile, clearRecentFiles } = useRecentFiles(10)
  const { profiles, saveProfile, deleteProfile, getProfile } = useProfiles()
  const { history: generationHistory, stats: generationStats, addToHistory: addToGenHistory, clearHistory: clearGenHistory } = useGenerationHistory()
  const [language, setLanguage] = useLocalStorage('app-language', 'en')
  
  // New UI state
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [showBatchProcessor, setShowBatchProcessor] = useState(false)
  const [showXMLDiff, setShowXMLDiff] = useState(false)

  // Settings - merge saved with defaults to ensure new fields get default values
  const [settings, setSettings] = useState(() => {
    const defaults = {
      autoValidateCsv: true,
      showPreviewOnGenerate: false,
      defaultTaxYear: new Date().getFullYear().toString(),
      rememberLastOutput: true,
      animationsEnabled: true,
      partnerJurisdictions: DEFAULT_PARTNER_JURISDICTIONS
    }
    const saved = localStorage.getItem('crs-settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      // Force reset partnerJurisdictions if it has more than 20 countries (old default)
      // This ensures users get the new 7-country default
      const shouldResetJurisdictions = !parsed.partnerJurisdictions || 
        parsed.partnerJurisdictions.length === 0 || 
        parsed.partnerJurisdictions.length > 20
      const jurisdictions = shouldResetJurisdictions 
        ? defaults.partnerJurisdictions 
        : parsed.partnerJurisdictions
      return { ...defaults, ...parsed, partnerJurisdictions: jurisdictions }
    }
    return defaults
  })
  
  // Partner jurisdictions search state
  const [jurisdictionSearch, setJurisdictionSearch] = useState('')
  const [showJurisdictionDropdown, setShowJurisdictionDropdown] = useState(false)

  // Form state (CRS)
  const [formData, setFormData] = useState({
    sendingCompanyIN: '',
    transmittingCountry: '',
    receivingCountry: '',
    reportingPeriod: new Date().getFullYear().toString(),
    numReportingFIs: '',
    reportingFITINs: [],
    individualAccounts: '',
    organisationAccounts: '',
    controllingPersons: '',
    accountHolderMode: 'random',
    accountHolderCountries: '',
    outputPath: ''
  })

  // FATCA Form state
  const [fatcaFormData, setFatcaFormData] = useState({
    sendingCompanyIN: '',  // GIIN format
    transmittingCountry: '',
    receivingCountry: 'US',  // Default to US for FATCA
    reportingPeriod: new Date().getFullYear().toString(),
    numReportingFIs: '1',
    reportingFITINs: [],
    filerCategory: 'FATCA601',
    individualAccounts: '',
    organisationAccounts: '',
    substantialOwners: '1',
    accountHolderMode: 'random',
    accountHolderCountries: '',
    outputPath: '',
    testMode: true
  })

  // FATCA Filer Categories
  const fatcaFilerCategories = [
    { value: 'FATCA601', label: 'FATCA601 - PFFI' },
    { value: 'FATCA602', label: 'FATCA602 - RDC FFI' },
    { value: 'FATCA603', label: 'FATCA603 - Limited Branch/FFI' },
    { value: 'FATCA604', label: 'FATCA604 - Reporting Model 2 FFI' },
    { value: 'FATCA605', label: 'FATCA605 - QI, WP, or WT' },
    { value: 'FATCA606', label: 'FATCA606 - Direct Reporting NFFE' },
    { value: 'FATCA607', label: 'FATCA607 - Sponsoring Entity (Sponsored FFI)' },
    { value: 'FATCA608', label: 'FATCA608 - Sponsoring Entity (Direct Reporting NFFE)' },
    { value: 'FATCA609', label: 'FATCA609 - Trustee-Documented Trust' },
    { value: 'FATCA610', label: 'FATCA610 - Withholding Agent' },
    { value: 'FATCA611', label: 'FATCA611 - Territory FI' }
  ]

  // CBC Form state
  const [cbcFormData, setCbcFormData] = useState({
    sendingEntityIN: '',
    transmittingCountry: '',
    receivingCountry: '',
    reportingPeriod: new Date().getFullYear().toString(),
    mneGroupName: '',
    reportingEntityName: '',
    reportingRole: 'CBC701',
    numCbcReports: '3',
    constEntitiesPerReport: '2',
    jurisdictionCountries: '',
    outputPath: '',
    testMode: true,
    mode: 'random',
    csvPath: ''
  })
  
  const [cbcDataMode, setCbcDataMode] = useState('random') // 'random' or 'csv'
  const [cbcCsvPath, setCbcCsvPath] = useState('')
  const [cbcFileType, setCbcFileType] = useState('domestic') // 'domestic' or 'foreign'

  // CBC Reporting Roles
  const cbcReportingRoles = [
    { value: 'CBC701', label: 'CBC701 - Ultimate Parent Entity' },
    { value: 'CBC702', label: 'CBC702 - Surrogate Parent Entity' },
    { value: 'CBC703', label: 'CBC703 - Constituent Entity Filing' }
  ]

  const [expandedSections, setExpandedSections] = useState({
    messageHeader: true,
    fileSize: true,
    accountHolder: false,
    output: true
  })

  const [errors, setErrors] = useState({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('success')
  const [modalMessage, setModalMessage] = useState('')
  
  // CSV mode state
  const [dataMode, setDataMode] = useState('random')
  const [csvFilePath, setCsvFilePath] = useState('')
  const [csvPreviewData, setCsvPreviewData] = useState(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [csvStatistics, setCsvStatistics] = useState(null)
  const [isValidatingCsv, setIsValidatingCsv] = useState(false)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState([])
  
  // Correction mode state
  const [correctionXmlPath, setCorrectionXmlPath] = useState('')
  const [correctionOutputPath, setCorrectionOutputPath] = useState('')
  const [xmlValidation, setXmlValidation] = useState(null)
  const [isValidatingXml, setIsValidatingXml] = useState(false)
  const [isGeneratingCorrection, setIsGeneratingCorrection] = useState(false)
  const [correctionOptions, setCorrectionOptions] = useState({
    correctFI: false,
    correctIndividual: 0,
    correctOrganisation: 0,
    deleteIndividual: 0,
    deleteOrganisation: 0,
    modifyBalance: true,
    modifyAddress: true,
    modifyName: false,
    testMode: true  // Use OECD11/12/13 for test data, OECD1/2/3 for production
  })
  const [showXmlErrorsModal, setShowXmlErrorsModal] = useState(false)
  
  // CBC Correction state
  const [cbcCorrectionType, setCbcCorrectionType] = useState('correction') // 'correction' or 'deletion'
  
  // CRS Tools - Country Code Replacer state
  const [countryReplacerXmlPath, setCountryReplacerXmlPath] = useState('')
  const [countryReplacerOutputPath, setCountryReplacerOutputPath] = useState('')
  const [countryReplacerResult, setCountryReplacerResult] = useState(null)
  const [isReplacingCountries, setIsReplacingCountries] = useState(false)
  const [convertToTestMode, setConvertToTestMode] = useState(true) // Convert production to test by default
  
  // Correction CSV mode state
  const [correctionDataMode, setCorrectionDataMode] = useState('xml') // 'xml' or 'csv'
  const [correctionCsvPath, setCorrectionCsvPath] = useState('')
  const [correctionCsvPreview, setCorrectionCsvPreview] = useState(null)
  const [showCorrectionCsvPreview, setShowCorrectionCsvPreview] = useState(false)
  
  // CRS701 CSV template preview modal state
  const [showCrs701CsvPreview, setShowCrs701CsvPreview] = useState(false)
  
  // Global statistics and history
  const [globalStats, setGlobalStats] = useState(() => {
    const saved = localStorage.getItem('crs-global-stats')
    return saved ? JSON.parse(saved) : {
      totalXmlGenerated: 0,
      totalCsvUploaded: 0,
      totalCsvDownloaded: 0,
      totalPreviewsGenerated: 0,
      totalIndividualAccounts: 0,
      totalOrganisationAccounts: 0,
      totalReportingFIs: 0,
      totalValidationErrors: 0,
      totalCorrectionsGenerated: 0,
      lastGenerated: null
    }
  })
  
  const [fileHistory, setFileHistory] = useState(() => {
    const saved = localStorage.getItem('crs-file-history')
    return saved ? JSON.parse(saved) : []
  })

  // Apply theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('crs-theme', selectedTheme)
  }, [selectedTheme, darkMode])

  // Save settings
  useEffect(() => {
    localStorage.setItem('crs-settings', JSON.stringify(settings))
  }, [settings])

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const updateStats = (updates) => {
    setGlobalStats(prev => {
      const newStats = { ...prev, ...updates }
      localStorage.setItem('crs-global-stats', JSON.stringify(newStats))
      return newStats
    })
  }

  const addToHistory = (entry) => {
    setFileHistory(prev => {
      const newHistory = [entry, ...prev].slice(0, 100)
      localStorage.setItem('crs-file-history', JSON.stringify(newHistory))
      return newHistory
    })
  }

  const deleteHistoryEntry = (id) => {
    setFileHistory(prev => {
      const newHistory = prev.filter(entry => entry.id !== id)
      localStorage.setItem('crs-file-history', JSON.stringify(newHistory))
      return newHistory
    })
  }

  const clearAllHistory = () => {
    setFileHistory([])
    localStorage.removeItem('crs-file-history')
  }

  const resetAllStats = () => {
    const resetStats = {
      totalXmlGenerated: 0,
      totalCsvUploaded: 0,
      totalCsvDownloaded: 0,
      totalPreviewsGenerated: 0,
      totalIndividualAccounts: 0,
      totalOrganisationAccounts: 0,
      totalReportingFIs: 0,
      totalValidationErrors: 0,
      lastGenerated: null
    }
    setGlobalStats(resetStats)
    localStorage.setItem('crs-global-stats', JSON.stringify(resetStats))
  }

  // Keyboard shortcuts
  const keyboardHandlers = useCallback(() => ({
    GO_HOME: () => setActiveModule(null),
    GO_SETTINGS: () => setCurrentPage('settings'),
    TOGGLE_THEME: () => {
      const themeKeys = Object.keys(THEMES)
      const currentIndex = themeKeys.indexOf(selectedTheme)
      const nextIndex = (currentIndex + 1) % themeKeys.length
      setSelectedTheme(themeKeys[nextIndex])
    },
    ESCAPE: () => {
      setShowKeyboardShortcuts(false)
      setShowDashboard(false)
      setShowBatchProcessor(false)
      setShowXMLDiff(false)
    },
    HELP: () => setShowKeyboardShortcuts(true),
    SELECT_CRS: () => setActiveModule('crs'),
    SELECT_FATCA: () => setActiveModule('fatca'),
    SELECT_CBC: () => setActiveModule('cbc')
  }), [selectedTheme, THEMES])

  useKeyboardShortcuts(keyboardHandlers(), true)

  const handleNumFIsChange = (value) => {
    const num = parseInt(value) || 0
    if (num < 1 && value !== '') return
    handleInputChange('numReportingFIs', value)
    if (num >= 1) {
      const tins = Array(num).fill('')
      setFormData(prev => ({ ...prev, reportingFITINs: tins }))
    } else {
      setFormData(prev => ({ ...prev, reportingFITINs: [] }))
    }
  }

  const handleTINChange = (index, value) => {
    const newTINs = [...formData.reportingFITINs]
    newTINs[index] = value
    setFormData(prev => ({ ...prev, reportingFITINs: newTINs }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.sendingCompanyIN) newErrors.sendingCompanyIN = 'Required'
    if (!formData.transmittingCountry) {
      newErrors.transmittingCountry = 'Required'
    } else if (!/^[A-Z]{2}$/.test(formData.transmittingCountry.toUpperCase())) {
      newErrors.transmittingCountry = 'Must be 2-letter ISO code'
    }
    if (!formData.receivingCountry) {
      newErrors.receivingCountry = 'Required'
    } else if (!/^[A-Z]{2}$/.test(formData.receivingCountry.toUpperCase())) {
      newErrors.receivingCountry = 'Must be 2-letter ISO code'
    }
    if (!formData.numReportingFIs || parseInt(formData.numReportingFIs) < 1) {
      newErrors.numReportingFIs = 'Must be at least 1'
    }
    if (parseInt(formData.numReportingFIs) >= 1) {
      formData.reportingFITINs.forEach((tin, index) => {
        if (!tin) newErrors[`tin_${index}`] = 'Required'
      })
    }
    if (!formData.outputPath) newErrors.outputPath = 'Required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSelectOutputFile = async () => {
    const filePath = await window.electronAPI.selectOutputFile(activeModule)
    if (filePath) handleInputChange('outputPath', filePath)
  }

  const handleSelectCsvFile = async () => {
    const filePath = await window.electronAPI.selectCsvFile()
    if (filePath) {
      setCsvFilePath(filePath)
      setErrors(prev => ({ ...prev, csvFilePath: null }))
      
      if (settings.autoValidateCsv) {
        setIsValidatingCsv(true)
        setCsvStatistics(null)
        
        try {
          const result = await window.electronAPI.validateCsv(filePath)
          
          if (result.valid) {
            setCsvStatistics(result.statistics)
            setModalType('success')
            setModalMessage(`CSV validated! ${result.statistics.total_accounts} accounts found.`)
            setShowModal(true)
          } else {
            setValidationErrors(result.errors)
            updateStats({ totalValidationErrors: globalStats.totalValidationErrors + result.errors.length })
            setShowValidationModal(true)
            setCsvFilePath('')
          }
        } catch (error) {
          setModalType('error')
          setModalMessage(`Validation failed: ${error.message}`)
          setShowModal(true)
          setCsvFilePath('')
        } finally {
          setIsValidatingCsv(false)
        }
      }
    }
  }

  const handleClearCsvFile = () => {
    setCsvFilePath('')
    setCsvStatistics(null)
  }

  const handleDownloadTemplate = async () => {
    try {
      const filePath = await window.electronAPI.downloadCsvTemplate(activeModule)
      if (filePath) {
        setModalType('success')
        setModalMessage(`Template saved to: ${filePath}`)
        setShowModal(true)
      }
    } catch (error) {
      setModalType('error')
      setModalMessage(`Failed to download template: ${error.message}`)
      setShowModal(true)
    }
  }

  const handleGeneratePreview = async () => {
    if (!formData.sendingCompanyIN || !formData.transmittingCountry || !formData.receivingCountry || !formData.numReportingFIs) {
      setModalType('error')
      setModalMessage('Please fill in required fields first.')
      setShowModal(true)
      return
    }
    setIsLoadingPreview(true)
    try {
      const result = await window.electronAPI.generateCsvPreview({
        transmittingCountry: formData.transmittingCountry.toUpperCase(),
        receivingCountry: formData.receivingCountry.toUpperCase(),
        reportingPeriod: formData.reportingPeriod,
        sendingCompanyIN: formData.sendingCompanyIN,
        numReportingFIs: formData.numReportingFIs,
        individualAccounts: formData.individualAccounts || '0',
        organisationAccounts: formData.organisationAccounts || '0',
        controllingPersons: formData.controllingPersons || '1'
      })
      setCsvPreviewData(result)
      setShowPreviewModal(true)
      updateStats({ totalPreviewsGenerated: globalStats.totalPreviewsGenerated + 1 })
    } catch (error) {
      setModalType('error')
      setModalMessage(`Preview failed: ${error.message}`)
      setShowModal(true)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleDownloadCsv = async () => {
    if (!formData.sendingCompanyIN || !formData.transmittingCountry || !formData.receivingCountry || !formData.numReportingFIs) {
      setModalType('error')
      setModalMessage('Please fill in required fields first.')
      setShowModal(true)
      return
    }
    try {
      const result = await window.electronAPI.saveCsvPreview({
        transmittingCountry: formData.transmittingCountry.toUpperCase(),
        receivingCountry: formData.receivingCountry.toUpperCase(),
        reportingPeriod: formData.reportingPeriod,
        sendingCompanyIN: formData.sendingCompanyIN,
        numReportingFIs: formData.numReportingFIs,
        individualAccounts: formData.individualAccounts || '0',
        organisationAccounts: formData.organisationAccounts || '0',
        controllingPersons: formData.controllingPersons || '1'
      })
      if (result) {
        updateStats({ totalCsvDownloaded: globalStats.totalCsvDownloaded + 1 })
        const individualCount = (parseInt(formData.individualAccounts) || 0) * parseInt(formData.numReportingFIs)
        const organisationCount = (parseInt(formData.organisationAccounts) || 0) * parseInt(formData.numReportingFIs)
        addToHistory({
          id: Date.now().toString(),
          type: 'csv',
          mode: 'preview',
          fileName: result.filePath.split(/[\\/]/).pop(),
          filePath: result.filePath,
          fileSize: 0,
          timestamp: new Date().toISOString(),
          accounts: individualCount + organisationCount,
          individualAccounts: individualCount,
          organisationAccounts: organisationCount,
          reportingFIs: parseInt(formData.numReportingFIs)
        })
        setModalType('success')
        setModalMessage(`CSV saved to: ${result.filePath}`)
        setShowModal(true)
      }
    } catch (error) {
      setModalType('error')
      setModalMessage(`Failed: ${error.message}`)
      setShowModal(true)
    }
  }

  const validateCsvForm = () => {
    const newErrors = {}
    if (!csvFilePath) newErrors.csvFilePath = 'Please select a CSV file'
    if (!formData.outputPath) newErrors.outputPath = 'Required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Correction mode handlers
  const handleSelectXmlFile = async () => {
    const filePath = await window.electronAPI.selectXmlFile()
    if (filePath) {
      setCorrectionXmlPath(filePath)
      setXmlValidation(null)
      setIsValidatingXml(true)
      
      try {
        // Use module-specific validation
        let result
        if (activeModule === 'cbc') {
          result = await window.electronAPI.validateCbcXml(filePath)
        } else if (activeModule === 'fatca') {
          result = await window.electronAPI.validateFatcaXml(filePath)
        } else {
          result = await window.electronAPI.validateXml(filePath)
        }
        setXmlValidation(result)
        
        if (!result.is_valid) {
          updateStats({ totalValidationErrors: globalStats.totalValidationErrors + (result.errors?.length || 0) })
        }
        
        // Check if already a correction file (for CRS only)
        if (activeModule === 'crs' && result.is_correction_file) {
          setModalType('error')
          setModalMessage('This is already a correction file (CRS702). Please select a new file (CRS701).')
          setShowModal(true)
          setCorrectionXmlPath('')
          setXmlValidation(null)
        }
      } catch (error) {
        setModalType('error')
        setModalMessage(`Validation failed: ${error.message}`)
        setShowModal(true)
        setCorrectionXmlPath('')
      } finally {
        setIsValidatingXml(false)
      }
    }
  }

  const handleClearXmlFile = () => {
    setCorrectionXmlPath('')
    setXmlValidation(null)
    setCorrectionOptions({
      correctFI: false,
      correctIndividual: 0,
      correctOrganisation: 0,
      deleteIndividual: 0,
      deleteOrganisation: 0,
      modifyBalance: true,
      modifyAddress: true,
      modifyName: false,
      testMode: true
    })
  }

  const handleSelectCorrectionOutput = async () => {
    const filePath = await window.electronAPI.selectCorrectionOutput(activeModule)
    if (filePath) {
      setCorrectionOutputPath(filePath)
    }
  }

  const handleGenerateCorrection = async () => {
    if (!correctionXmlPath || !xmlValidation?.can_generate_correction) {
      setModalType('error')
      setModalMessage(`Please select and validate a valid ${activeModule.toUpperCase()} XML file first.`)
      setShowModal(true)
      return
    }
    
    if (!correctionOutputPath) {
      setModalType('error')
      setModalMessage('Please select an output location.')
      setShowModal(true)
      return
    }
    
    // CBC uses simpler correction options (just type)
    if (activeModule === 'cbc') {
      if (!cbcCorrectionType) {
        setModalType('error')
        setModalMessage('Please select correction or deletion type.')
        setShowModal(true)
        return
      }
    } else {
      const totalCorrections = correctionOptions.correctIndividual + correctionOptions.correctOrganisation
      const totalDeletions = correctionOptions.deleteIndividual + correctionOptions.deleteOrganisation
      
      if (totalCorrections === 0 && totalDeletions === 0 && !correctionOptions.correctFI) {
        setModalType('error')
        setModalMessage('Please select at least one correction or deletion option.')
        setShowModal(true)
        return
      }
    }
    
    setIsGeneratingCorrection(true)
    
    try {
      let result
      if (activeModule === 'cbc') {
        result = await window.electronAPI.generateCbcCorrection({
          sourceXmlPath: correctionXmlPath,
          outputPath: correctionOutputPath,
          correctionType: cbcCorrectionType,
          testMode: true
        })
      } else {
        result = await window.electronAPI.generateCorrection({
          xmlPath: correctionXmlPath,
          outputPath: correctionOutputPath,
          ...correctionOptions
        })
      }
      
      updateStats({
        totalCorrectionsGenerated: globalStats.totalCorrectionsGenerated + 1,
        lastGenerated: new Date().toISOString()
      })
      
      addToHistory({
        id: Date.now().toString(),
        type: 'correction',
        mode: 'correction',
        fileName: correctionOutputPath.split(/[\\/]/).pop(),
        filePath: correctionOutputPath,
        fileSize: 0,
        timestamp: new Date().toISOString(),
        accounts: result.corrections_made + result.deletions_made,
        individualAccounts: correctionOptions.correctIndividual + correctionOptions.deleteIndividual,
        organisationAccounts: correctionOptions.correctOrganisation + correctionOptions.deleteOrganisation,
        reportingFIs: correctionOptions.correctFI ? 1 : 0,
        corrections: result.corrections_made,
        deletions: result.deletions_made
      })
      
      setModalType('success')
      setModalMessage(`Correction file generated!\n\nCorrections: ${result.corrections_made}\nDeletions: ${result.deletions_made}${result.fi_corrected ? '\nFI Corrected: Yes' : ''}`)
      setShowModal(true)
      
      // Reset form
      handleClearXmlFile()
      setCorrectionOutputPath('')
    } catch (error) {
      setModalType('error')
      setModalMessage(`Failed to generate correction: ${error.message}`)
      setShowModal(true)
    } finally {
      setIsGeneratingCorrection(false)
    }
  }

  // CRS Country Code Replacer handler
  const handleReplaceCountryCodes = async () => {
    if (!countryReplacerXmlPath) {
      setModalType('error')
      setModalMessage('Please select a CRS XML file first.')
      setShowModal(true)
      return
    }
    
    if (!countryReplacerOutputPath) {
      setModalType('error')
      setModalMessage('Please select an output location.')
      setShowModal(true)
      return
    }
    
    if (!settings.partnerJurisdictions || settings.partnerJurisdictions.length === 0) {
      setModalType('error')
      setModalMessage('No partner jurisdictions configured. Go to Settings to add countries.')
      setShowModal(true)
      return
    }
    
    setIsReplacingCountries(true)
    setCountryReplacerResult(null)
    
    try {
      const result = await window.electronAPI.replaceCrsCountryCodes({
        xmlPath: countryReplacerXmlPath,
        outputPath: countryReplacerOutputPath,
        allowedCountries: settings.partnerJurisdictions,
        convertToTestMode: convertToTestMode
      })
      
      setCountryReplacerResult(result)
      setModalType('success')
      const testModeMsg = result.docTypeIndicConverted ? `\nDocTypeIndic converted to test mode` : ''
      setModalMessage(`File processed successfully!\n\nOriginal countries: ${result.originalCountries.length}\nReplaced: ${result.replacedCountries.length}${testModeMsg}`)
      setShowModal(true)
    } catch (error) {
      setModalType('error')
      setModalMessage(`Failed to replace country codes: ${error.message}`)
      setShowModal(true)
    } finally {
      setIsReplacingCountries(false)
    }
  }

  // FATCA Generate handler
  const handleGenerateFATCA = async () => {
    // Basic validation
    if (!fatcaFormData.transmittingCountry || !fatcaFormData.outputPath) {
      setModalType('error')
      setModalMessage('Please fill in required fields (Transmitting Country and Output Path)')
      setShowModal(true)
      return
    }

    setIsGenerating(true)
    setGenerationProgress('Initializing FATCA generation...')

    try {
      window.electronAPI.onGenerationProgress((data) => setGenerationProgress(data))

      const generateData = {
        ...fatcaFormData,
        transmittingCountry: fatcaFormData.transmittingCountry.toUpperCase(),
        receivingCountry: fatcaFormData.receivingCountry.toUpperCase(),
        numReportingFIs: parseInt(fatcaFormData.numReportingFIs) || 1,
        individualAccounts: parseInt(fatcaFormData.individualAccounts) || 0,
        organisationAccounts: parseInt(fatcaFormData.organisationAccounts) || 0,
        substantialOwners: parseInt(fatcaFormData.substantialOwners) || 1
      }

      const result = await window.electronAPI.generateFATCA(generateData)
      setGenerationProgress('')
      
      const individualCount = parseInt(fatcaFormData.individualAccounts) || 0
      const organisationCount = parseInt(fatcaFormData.organisationAccounts) || 0
      const fiCount = parseInt(fatcaFormData.numReportingFIs) || 1
      
      updateStats({
        totalXmlGenerated: globalStats.totalXmlGenerated + 1,
        totalIndividualAccounts: globalStats.totalIndividualAccounts + individualCount,
        totalOrganisationAccounts: globalStats.totalOrganisationAccounts + organisationCount,
        totalReportingFIs: globalStats.totalReportingFIs + fiCount,
        lastGenerated: new Date().toISOString()
      })
      
      addToHistory({
        id: Date.now().toString(),
        type: 'fatca-xml',
        mode: 'random',
        fileName: result.filePath.split(/[\\/]/).pop(),
        filePath: result.filePath,
        fileSize: result.fileSize,
        timestamp: new Date().toISOString(),
        accounts: individualCount + organisationCount,
        individualAccounts: individualCount,
        organisationAccounts: organisationCount,
        reportingFIs: fiCount
      })
      
      setModalType('success')
      setModalMessage(`FATCA XML generated successfully!\nSize: ${result.fileSize} MB`)
      setShowModal(true)
    } catch (error) {
      setGenerationProgress('')
      setModalType('error')
      setModalMessage(error.message || 'An error occurred')
      setShowModal(true)
    } finally {
      setIsGenerating(false)
    }
  }

  // CBC Generate handler
  const handleGenerateCBC = async () => {
    // Basic validation
    if (cbcDataMode === 'csv') {
      if (!cbcCsvPath || !cbcFormData.outputPath) {
        setModalType('error')
        setModalMessage('Please select a CSV file and output path')
        setShowModal(true)
        return
      }
    } else {
      if (!cbcFormData.transmittingCountry || !cbcFormData.outputPath) {
        setModalType('error')
        setModalMessage('Please fill in required fields (Transmitting Country and Output Path)')
        setShowModal(true)
        return
      }
      // For foreign file type, receiving country is required
      if (cbcFileType === 'foreign' && !cbcFormData.receivingCountry) {
        setModalType('error')
        setModalMessage('For foreign exchange files, please specify the Receiving Country')
        setShowModal(true)
        return
      }
    }

    setIsGenerating(true)
    setGenerationProgress('Initializing CBC generation...')

    try {
      window.electronAPI.onGenerationProgress((data) => setGenerationProgress(data))

      // For domestic filing, receiving country = transmitting country
      const effectiveReceivingCountry = cbcFileType === 'domestic' 
        ? cbcFormData.transmittingCountry.toUpperCase()
        : cbcFormData.receivingCountry.toUpperCase()

      const generateData = {
        ...cbcFormData,
        mode: cbcDataMode,
        csvPath: cbcCsvPath,
        fileType: cbcFileType,
        transmittingCountry: cbcFormData.transmittingCountry.toUpperCase(),
        receivingCountry: effectiveReceivingCountry,
        numCbcReports: parseInt(cbcFormData.numCbcReports) || 3,
        constEntitiesPerReport: parseInt(cbcFormData.constEntitiesPerReport) || 2
      }

      const result = await window.electronAPI.generateCBC(generateData)
      setGenerationProgress('')
      
      const reportCount = cbcDataMode === 'csv' ? 'N/A' : parseInt(cbcFormData.numCbcReports) || 3
      const entitiesPerReport = cbcDataMode === 'csv' ? 'N/A' : parseInt(cbcFormData.constEntitiesPerReport) || 2
      
      updateStats({
        totalXmlGenerated: globalStats.totalXmlGenerated + 1,
        lastGenerated: new Date().toISOString()
      })
      
      addToHistory({
        id: Date.now().toString(),
        type: 'cbc-xml',
        mode: cbcDataMode,
        fileName: result.filePath.split(/[\\/]/).pop(),
        filePath: result.filePath,
        fileSize: result.fileSize,
        timestamp: new Date().toISOString(),
        cbcReports: reportCount,
        constEntities: cbcDataMode === 'csv' ? 'N/A' : reportCount * entitiesPerReport
      })
      
      setModalType('success')
      const modeMsg = cbcDataMode === 'csv' ? 'from CSV data' : `${reportCount} jurisdiction reports with ${reportCount * entitiesPerReport} constituent entities`
      setModalMessage(`CBC XML generated successfully!\n${modeMsg}\nSize: ${result.fileSize} MB`)
      setShowModal(true)
    } catch (error) {
      setGenerationProgress('')
      setModalType('error')
      setModalMessage(error.message || 'An error occurred')
      setShowModal(true)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate = async () => {
    if (dataMode === 'csv') {
      if (!validateCsvForm()) return
    } else {
      if (!validateForm()) return
    }

    setIsGenerating(true)
    setGenerationProgress('Initializing...')

    try {
      window.electronAPI.onGenerationProgress((data) => setGenerationProgress(data))

      let generateData
      if (dataMode === 'csv') {
        generateData = { mode: 'csv', csvPath: csvFilePath, outputPath: formData.outputPath }
      } else {
        generateData = {
          mode: 'random',
          ...formData,
          transmittingCountry: formData.transmittingCountry.toUpperCase(),
          receivingCountry: formData.receivingCountry.toUpperCase(),
          numReportingFIs: parseInt(formData.numReportingFIs),
          individualAccounts: parseInt(formData.individualAccounts) || 0,
          organisationAccounts: parseInt(formData.organisationAccounts) || 0,
          controllingPersons: parseInt(formData.controllingPersons) || 0
        }
      }

      const result = await window.electronAPI.generateCRS(generateData)
      setGenerationProgress('')
      
      const individualCount = dataMode === 'csv' ? (csvStatistics?.individual_accounts || 0) : (parseInt(formData.individualAccounts) || 0) * parseInt(formData.numReportingFIs)
      const organisationCount = dataMode === 'csv' ? (csvStatistics?.organisation_accounts || 0) : (parseInt(formData.organisationAccounts) || 0) * parseInt(formData.numReportingFIs)
      const fiCount = dataMode === 'csv' ? (csvStatistics?.reporting_fis || 0) : parseInt(formData.numReportingFIs)
      
      updateStats({
        totalXmlGenerated: globalStats.totalXmlGenerated + 1,
        totalCsvUploaded: dataMode === 'csv' ? globalStats.totalCsvUploaded + 1 : globalStats.totalCsvUploaded,
        totalIndividualAccounts: globalStats.totalIndividualAccounts + individualCount,
        totalOrganisationAccounts: globalStats.totalOrganisationAccounts + organisationCount,
        totalReportingFIs: globalStats.totalReportingFIs + fiCount,
        lastGenerated: new Date().toISOString()
      })
      
      addToHistory({
        id: Date.now().toString(),
        type: 'xml',
        mode: dataMode,
        fileName: result.filePath.split(/[\\/]/).pop(),
        filePath: result.filePath,
        fileSize: result.fileSize,
        timestamp: new Date().toISOString(),
        accounts: individualCount + organisationCount,
        individualAccounts: individualCount,
        organisationAccounts: organisationCount,
        reportingFIs: fiCount
      })
      
      setModalType('success')
      setModalMessage(`Generated successfully!\nSize: ${result.fileSize} MB`)
      setShowModal(true)
    } catch (error) {
      setGenerationProgress('')
      setModalType('error')
      setModalMessage(error.message || 'An error occurred')
      setShowModal(true)
    } finally {
      setIsGenerating(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 12 }, (_, i) => currentYear - 10 + i)

  // Theme classes - use selected theme
  const theme = THEMES[selectedTheme] || THEMES.light

  // Module configuration
  const modules = {
    crs: {
      name: t(language, 'modules.crs'),
      fullName: t(language, 'moduleDescriptions.crs'),
      description: `${t(language, 'actions.generate')} ${t(language, 'modules.crs')} XML test data for automatic exchange of financial account information`,
      icon: Globe,
      color: 'from-blue-600 to-blue-500',
      bgColor: 'bg-blue-600',
      features: ['Individual & Organisation Accounts', 'Controlling Persons', 'Corrections & Deletions', 'CSV Import/Export']
    },
    fatca: {
      name: t(language, 'modules.fatca'),
      fullName: t(language, 'moduleDescriptions.fatca'),
      description: `${t(language, 'actions.generate')} ${t(language, 'modules.fatca')} XML test data for US tax compliance reporting`,
      icon: Landmark,
      color: 'from-green-600 to-green-500',
      bgColor: 'bg-green-600',
      features: ['Individual & Organisation Accounts', 'Substantial Owners', 'Corrections & Deletions', 'Filer Categories']
    },
    cbc: {
      name: t(language, 'modules.cbc'),
      fullName: t(language, 'moduleDescriptions.cbc'),
      description: `${t(language, 'actions.generate')} ${t(language, 'modules.cbc')} XML test data for multinational enterprise tax reporting`,
      icon: BarChart3,
      color: 'from-purple-600 to-purple-500',
      bgColor: 'bg-purple-600',
      features: ['Multiple Jurisdictions', 'Constituent Entities', 'Financial Summaries', 'Corrections & Deletions']
    }
  }

  // Theme Background Component - handles all immersive theme backgrounds
  const ThemeBackground = () => {
    const [particles, setParticles] = useState([])
    
    useEffect(() => {
      if (!settings.animationsEnabled) return
      
      // Space Galaxy - shooting stars
      if (theme.isSpaceTheme) {
        const spawnStar = () => {
          const id = Date.now()
          setParticles(prev => [...prev, { id, type: 'star', top: Math.random() * 50 + '%', left: Math.random() * 50 + '%' }])
          setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 1500)
        }
        const interval = setInterval(spawnStar, 4000 + Math.random() * 4000)
        return () => clearInterval(interval)
      }
      
      // Ocean - bubbles
      if (theme.isOceanTheme) {
        const spawnBubble = () => {
          const id = Date.now()
          setParticles(prev => [...prev, { id, type: 'bubble', left: Math.random() * 100 + '%', size: 10 + Math.random() * 20, delay: Math.random() * 2 }])
          setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 8000)
        }
        const interval = setInterval(spawnBubble, 1500)
        return () => clearInterval(interval)
      }
      
      // Forest - falling leaves
      if (theme.isForestTheme) {
        const leaves = ['🍃', '🌿', '🍂', '🌱']
        const spawnLeaf = () => {
          const id = Date.now()
          setParticles(prev => [...prev, { id, type: 'leaf', left: Math.random() * 100 + '%', emoji: leaves[Math.floor(Math.random() * leaves.length)], delay: Math.random() * 5 }])
          setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 20000)
        }
        const interval = setInterval(spawnLeaf, 3000)
        return () => clearInterval(interval)
      }
    }, [theme.isSpaceTheme, theme.isOceanTheme, theme.isForestTheme, settings.animationsEnabled])
    
    // Space Galaxy Theme
    if (theme.isSpaceTheme) {
      return (
        <>
          <div className="space-galaxy-bg" />
          <div className="space-galaxy-stars" />
          <div className="space-galaxy-nebula" />
          {particles.filter(p => p.type === 'star').map(star => (
            <div key={star.id} className="space-galaxy-shooting-star active" style={{ top: star.top, left: star.left }} />
          ))}
        </>
      )
    }
    
    // Cyberpunk Theme
    if (theme.isCyberpunkTheme) {
      return (
        <>
          <div className="cyberpunk-bg" />
          <div className="cyberpunk-grid" />
          <div className="cyberpunk-scanlines" />
        </>
      )
    }
    
    // Forest Theme
    if (theme.isForestTheme) {
      return (
        <>
          <div className="forest-bg" />
          <div className="forest-sunlight" />
          <div className="forest-leaves">
            {particles.filter(p => p.type === 'leaf').map(leaf => (
              <div key={leaf.id} className="forest-leaf" style={{ left: leaf.left, animationDelay: `${leaf.delay}s` }}>{leaf.emoji}</div>
            ))}
          </div>
        </>
      )
    }
    
    // Ocean Theme
    if (theme.isOceanTheme) {
      return (
        <>
          <div className="ocean-bg" />
          <div className="ocean-caustics" />
          <div className="ocean-bubbles">
            {particles.filter(p => p.type === 'bubble').map(bubble => (
              <div key={bubble.id} className="ocean-bubble" style={{ left: bubble.left, width: bubble.size, height: bubble.size, animationDelay: `${bubble.delay}s` }} />
            ))}
          </div>
        </>
      )
    }
    
    // Steampunk Theme
    if (theme.isSteampunkTheme) {
      return (
        <>
          <div className="steampunk-bg" />
          <div className="steampunk-panels" />
          <div className="steampunk-gears">
            <div className="steampunk-gear" style={{ width: 120, height: 120, top: '10%', right: '5%' }} />
            <div className="steampunk-gear reverse" style={{ width: 80, height: 80, top: '15%', right: '12%' }} />
            <div className="steampunk-gear" style={{ width: 100, height: 100, bottom: '20%', left: '8%' }} />
          </div>
        </>
      )
    }
    
    return null
  }

  // Get theme class for body
  const getThemeClass = () => {
    if (theme.isSpaceTheme) return 'space-galaxy'
    if (theme.isCyberpunkTheme) return 'cyberpunk-neon'
    if (theme.isForestTheme) return 'organic-forest'
    if (theme.isOceanTheme) return 'ocean-underwater'
    if (theme.isSteampunkTheme) return 'steampunk-victorian'
    return ''
  }

  // Home page (module selection) or Settings
  if (!activeModule) {
    // Settings page - separate return to avoid issues
    if (currentPage === 'settings') {
      return (
        <div className={`min-h-screen ${theme.bg} transition-colors duration-300`}>
          <header className={`${theme.header} border-b shadow-sm sticky top-0 z-40`}>
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentPage('generator')}
                  className={`p-2 rounded-lg transition-colors ${theme.buttonSecondary}`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Settings className={`w-6 h-6 ${theme.accentText}`} />
                <h1 className={`text-xl font-bold ${theme.text}`}>{t(language, 'settings.title')}</h1>
              </div>
            </div>
          </header>
          <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
            <div className={`${theme.card} rounded-xl border p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${theme.text}`}>{t(language, 'settings.theme')}</h3>
                <button
                  onClick={() => setLiveAnimations(!liveAnimations)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    liveAnimations 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                  title={liveAnimations ? 'Click to disable live animations' : 'Click to enable live animations'}
                >
                  <span className="text-lg">{liveAnimations ? '✨' : '🎬'}</span>
                  <span className="text-sm">{liveAnimations ? 'Live Animations ON' : 'Live Animations OFF'}</span>
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(THEMES).map(([key, themeObj]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTheme(key)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      selectedTheme === key 
                        ? `${themeObj.buttonPrimary} shadow-lg` 
                        : `${theme.border} ${theme.cardHover}`
                    }`}
                  >
                    <span className="text-2xl">{themeObj.emoji}</span>
                    <p className={`text-xs mt-1 ${theme.text}`}>{themeObj.name}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className={`${theme.card} rounded-xl border p-6`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>Tools & Features</h3>
              <p className={`text-sm ${theme.textMuted} mb-4`}>Access advanced tools and utilities</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowDashboard(true)}
                  className={`p-4 rounded-lg border-2 ${theme.border} ${theme.cardHover} transition-all hover:scale-105 hover:shadow-md`}
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className={`w-6 h-6 ${theme.accentText}`} />
                    <div className="text-left">
                      <p className={`font-semibold ${theme.text}`}>{t(language, 'dashboard.title')}</p>
                      <p className={`text-xs ${theme.textMuted}`}>{t(language, 'dashboard.statistics')} & {t(language, 'dashboard.recentActivity')}</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setShowBatchProcessor(true)}
                  className={`p-4 rounded-lg border-2 ${theme.border} ${theme.cardHover} transition-all hover:scale-105 hover:shadow-md`}
                >
                  <div className="flex items-center gap-3">
                    <Layers className={`w-6 h-6 ${theme.accentText}`} />
                    <div className="text-left">
                      <p className={`font-semibold ${theme.text}`}>{t(language, 'batch.title')}</p>
                      <p className={`text-xs ${theme.textMuted}`}>{t(language, 'batch.processAll')}</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setShowXMLDiff(true)}
                  className={`p-4 rounded-lg border-2 ${theme.border} ${theme.cardHover} transition-all hover:scale-105 hover:shadow-md`}
                >
                  <div className="flex items-center gap-3">
                    <ArrowLeftRight className={`w-6 h-6 ${theme.accentText}`} />
                    <div className="text-left">
                      <p className={`font-semibold ${theme.text}`}>{t(language, 'diff.title')}</p>
                      <p className={`text-xs ${theme.textMuted}`}>{t(language, 'diff.title')}</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setShowKeyboardShortcuts(true)}
                  className={`p-4 rounded-lg border-2 ${theme.border} ${theme.cardHover} transition-all hover:scale-105 hover:shadow-md`}
                >
                  <div className="flex items-center gap-3">
                    <Keyboard className={`w-6 h-6 ${theme.accentText}`} />
                    <div className="text-left">
                      <p className={`font-semibold ${theme.text}`}>{t(language, 'settings.keyboardShortcuts')}</p>
                      <p className={`text-xs ${theme.textMuted}`}>{t(language, 'help.shortcuts')}</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
            {/* Language Settings */}
            <div className={`${theme.card} rounded-xl border p-6`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>{t(language, 'settings.language')}</h3>
              <p className={`text-sm ${theme.textMuted} mb-4`}>{t(language, 'common.select')} {t(language, 'settings.language').toLowerCase()}</p>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(LANGUAGES).map(([code, lang]) => (
                  <button
                    key={code}
                    onClick={() => setLanguage(code)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                      language === code
                        ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                        : `${theme.border} hover:border-gray-400`
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <div className="text-left">
                      <p className={`font-medium ${theme.text}`}>{lang.nativeName}</p>
                      <p className={`text-xs ${theme.textMuted}`}>{lang.name}</p>
                    </div>
                    {language === code && (
                      <CheckCircle2 className="w-5 h-5 text-blue-500 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className={`${theme.card} rounded-xl border p-6`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-4`}>{t(language, 'settings.general')}</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className={theme.text}>{t(language, 'common.show')} {t(language, 'settings.appearance').toLowerCase()}</span>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, animationsEnabled: !prev.animationsEnabled }))}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.animationsEnabled ? 'bg-blue-600' : 'bg-gray-400'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings.animationsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </label>
              </div>
            </div>
            <div className={`${theme.card} rounded-xl border p-6`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>CSV {t(language, 'validation.title')}</h3>
              <p className={`text-sm ${theme.textMuted} mb-4`}>Control CSV validation for CRS, FATCA, and CBC uploads</p>
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <div>
                    <span className={theme.text}>{t(language, 'actions.validate')} CSV {t(language, 'actions.upload')}</span>
                    <p className={`text-xs ${theme.textMuted} mt-1`}>
                      {settings.autoValidateCsv 
                        ? 'CSV files will be validated before generating XML' 
                        : 'Validation disabled - faulty CSVs can be used to generate test XMLs with errors'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, autoValidateCsv: !prev.autoValidateCsv }))}
                    className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ml-4 ${settings.autoValidateCsv ? 'bg-blue-600' : 'bg-gray-400'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${settings.autoValidateCsv ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </label>
              </div>
              {!settings.autoValidateCsv && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className={`text-sm text-amber-600 dark:text-amber-400`}>
                    <strong>Warning:</strong> With validation disabled, faulty CSV data will be passed through to generate XMLs with intentional errors. Useful for testing error handling.
                  </p>
                </div>
              )}
            </div>
          </main>

          {/* Modals for Settings page - must be inside this return */}
          {showDashboard && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDashboard(false)}>
              <div className={`w-full max-w-5xl max-h-[90vh] overflow-y-auto mx-4 p-6 rounded-xl shadow-2xl ${theme.card} border ${theme.border}`} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <BarChart3 className={`w-6 h-6 ${theme.accentText}`} />
                    <h2 className={`text-xl font-semibold ${theme.text}`}>Dashboard</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { if(window.confirm('Reset all statistics?')) resetStats() }}
                      className={`px-3 py-1.5 text-sm rounded-lg ${theme.buttonSecondary}`}
                    >
                      Reset Stats
                    </button>
                    <button onClick={() => setShowDashboard(false)} className={`p-2 rounded-lg ${theme.buttonSecondary}`}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className={`p-4 rounded-xl border ${theme.border} bg-gradient-to-br from-blue-500/10 to-blue-600/5`}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <p className={`text-sm ${theme.textMuted}`}>XML Files</p>
                    </div>
                    <p className={`text-3xl font-bold ${theme.text}`}>{globalStats?.totalXmlGenerated || 0}</p>
                    <p className={`text-xs ${theme.textMuted} mt-1`}>Total generated</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${theme.border} bg-gradient-to-br from-green-500/10 to-green-600/5`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-green-500" />
                      <p className={`text-sm ${theme.textMuted}`}>Accounts</p>
                    </div>
                    <p className={`text-3xl font-bold ${theme.text}`}>{(globalStats?.totalIndividualAccounts || 0) + (globalStats?.totalOrganisationAccounts || 0)}</p>
                    <p className={`text-xs ${theme.textMuted} mt-1`}>{globalStats?.totalIndividualAccounts || 0} individual, {globalStats?.totalOrganisationAccounts || 0} org</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${theme.border} bg-gradient-to-br from-purple-500/10 to-purple-600/5`}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileEdit className="w-5 h-5 text-purple-500" />
                      <p className={`text-sm ${theme.textMuted}`}>Corrections</p>
                    </div>
                    <p className={`text-3xl font-bold ${theme.text}`}>{globalStats?.totalCorrectionsGenerated || 0}</p>
                    <p className={`text-xs ${theme.textMuted} mt-1`}>Files corrected</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${theme.border} bg-gradient-to-br from-amber-500/10 to-amber-600/5`}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      <p className={`text-sm ${theme.textMuted}`}>Errors</p>
                    </div>
                    <p className={`text-3xl font-bold ${theme.text}`}>{globalStats?.totalValidationErrors || 0}</p>
                    <p className={`text-xs ${theme.textMuted} mt-1`}>Validation issues</p>
                  </div>
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className={`p-4 rounded-lg border ${theme.border}`}>
                    <p className={`text-sm ${theme.textMuted} mb-1`}>CSV Uploads</p>
                    <p className={`text-2xl font-bold ${theme.text}`}>{globalStats?.totalCsvUploaded || 0}</p>
                  </div>
                  <div className={`p-4 rounded-lg border ${theme.border}`}>
                    <p className={`text-sm ${theme.textMuted} mb-1`}>Templates Downloaded</p>
                    <p className={`text-2xl font-bold ${theme.text}`}>{globalStats?.totalCsvDownloaded || 0}</p>
                  </div>
                  <div className={`p-4 rounded-lg border ${theme.border}`}>
                    <p className={`text-sm ${theme.textMuted} mb-1`}>Reporting FIs</p>
                    <p className={`text-2xl font-bold ${theme.text}`}>{globalStats?.totalReportingFIs || 0}</p>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className={`p-4 rounded-xl border ${theme.border}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-semibold ${theme.text}`}>Recent File History</h3>
                    {fileHistory.length > 0 && (
                      <button 
                        onClick={() => { setFileHistory([]); localStorage.removeItem('crs-file-history') }}
                        className={`text-xs ${theme.textMuted} hover:underline`}
                      >
                        Clear History
                      </button>
                    )}
                  </div>
                  {fileHistory.length === 0 ? (
                    <p className={`text-sm ${theme.textMuted} text-center py-4`}>No recent files. Generate some XML files to see them here!</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {fileHistory.slice(0, 10).map((file, idx) => (
                        <div key={idx} className={`flex items-center justify-between p-3 rounded-lg ${theme.bg}`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${file.module === 'crs' ? 'bg-blue-500/10' : file.module === 'fatca' ? 'bg-green-500/10' : 'bg-purple-500/10'}`}>
                              <FileText className={`w-4 h-4 ${file.module === 'crs' ? 'text-blue-500' : file.module === 'fatca' ? 'text-green-500' : 'text-purple-500'}`} />
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${theme.text}`}>{file.module?.toUpperCase()} - {file.type || 'Generation'}</p>
                              <p className={`text-xs ${theme.textMuted}`}>{file.accounts ? `${file.accounts} accounts • ` : ''}{new Date(file.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                          {file.path && (
                            <button 
                              onClick={() => window.electronAPI?.openFileLocation(file.path)}
                              className={`text-xs px-2 py-1 rounded ${theme.buttonSecondary}`}
                            >
                              Open
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Last Generated */}
                {globalStats?.lastGenerated && (
                  <p className={`text-xs ${theme.textMuted} mt-4 text-center`}>
                    Last activity: {new Date(globalStats.lastGenerated).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {showBatchProcessor && (
            <BatchProcessorModal 
              theme={theme}
              onClose={() => setShowBatchProcessor(false)}
              onGenerate={async (configs) => {
                const results = []
                for (const config of configs) {
                  try {
                    if (config.module === 'crs') {
                      await window.electronAPI.generateCRS(config.data)
                    } else if (config.module === 'fatca') {
                      await window.electronAPI.generateFATCA(config.data)
                    } else if (config.module === 'cbc') {
                      await window.electronAPI.generateCBC(config.data)
                    }
                    results.push({ ...config, success: true })
                    updateStats({ totalXmlGenerated: globalStats.totalXmlGenerated + 1 })
                  } catch (error) {
                    results.push({ ...config, success: false, error: error.message })
                  }
                }
                return results
              }}
            />
          )}

          {showXMLDiff && (
            <XMLDiffModal 
              theme={theme}
              onClose={() => setShowXMLDiff(false)}
            />
          )}

          {showKeyboardShortcuts && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowKeyboardShortcuts(false)}>
              <div className={`w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4 p-6 rounded-xl shadow-2xl ${theme.card} border ${theme.border}`} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Keyboard className={`w-6 h-6 ${theme.accentText}`} />
                    <h2 className={`text-xl font-semibold ${theme.text}`}>Keyboard Shortcuts</h2>
                  </div>
                  <button onClick={() => setShowKeyboardShortcuts(false)} className={`p-2 rounded-lg ${theme.buttonSecondary}`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className={`text-sm font-semibold ${theme.textMuted} mb-3 flex items-center gap-2`}>
                      <Home className="w-4 h-4" /> Navigation
                    </h3>
                    <div className="space-y-2">
                      <div className={`flex justify-between items-center p-3 rounded-lg ${theme.bg}`}>
                        <span className={`text-sm ${theme.text}`}>Go to Home / Module Selection</span>
                        <kbd className={`px-3 py-1 text-xs font-mono rounded ${theme.buttonSecondary}`}>Ctrl + H</kbd>
                      </div>
                      <div className={`flex justify-between items-center p-3 rounded-lg ${theme.bg}`}>
                        <span className={`text-sm ${theme.text}`}>Open Settings</span>
                        <kbd className={`px-3 py-1 text-xs font-mono rounded ${theme.buttonSecondary}`}>Ctrl + ,</kbd>
                      </div>
                      <div className={`flex justify-between items-center p-3 rounded-lg ${theme.bg}`}>
                        <span className={`text-sm ${theme.text}`}>Close Modal / Go Back</span>
                        <kbd className={`px-3 py-1 text-xs font-mono rounded ${theme.buttonSecondary}`}>Escape</kbd>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className={`text-sm font-semibold ${theme.textMuted} mb-3 flex items-center gap-2`}>
                      <Globe className="w-4 h-4" /> Quick Module Access
                    </h3>
                    <div className="space-y-2">
                      <div className={`flex justify-between items-center p-3 rounded-lg ${theme.bg}`}>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-500">C</span>
                          <span className={`text-sm ${theme.text}`}>Open CRS Module</span>
                        </div>
                        <kbd className={`px-3 py-1 text-xs font-mono rounded ${theme.buttonSecondary}`}>Ctrl + 1</kbd>
                      </div>
                      <div className={`flex justify-between items-center p-3 rounded-lg ${theme.bg}`}>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-500">F</span>
                          <span className={`text-sm ${theme.text}`}>Open FATCA Module</span>
                        </div>
                        <kbd className={`px-3 py-1 text-xs font-mono rounded ${theme.buttonSecondary}`}>Ctrl + 2</kbd>
                      </div>
                      <div className={`flex justify-between items-center p-3 rounded-lg ${theme.bg}`}>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-500">B</span>
                          <span className={`text-sm ${theme.text}`}>Open CBC Module</span>
                        </div>
                        <kbd className={`px-3 py-1 text-xs font-mono rounded ${theme.buttonSecondary}`}>Ctrl + 3</kbd>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className={`text-sm font-semibold ${theme.textMuted} mb-3 flex items-center gap-2`}>
                      <Settings className="w-4 h-4" /> Other
                    </h3>
                    <div className="space-y-2">
                      <div className={`flex justify-between items-center p-3 rounded-lg ${theme.bg}`}>
                        <span className={`text-sm ${theme.text}`}>Cycle Through Themes</span>
                        <kbd className={`px-3 py-1 text-xs font-mono rounded ${theme.buttonSecondary}`}>Ctrl + T</kbd>
                      </div>
                      <div className={`flex justify-between items-center p-3 rounded-lg ${theme.bg}`}>
                        <span className={`text-sm ${theme.text}`}>Show This Help</span>
                        <kbd className={`px-3 py-1 text-xs font-mono rounded ${theme.buttonSecondary}`}>Shift + ?</kbd>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className={`mt-6 pt-4 border-t ${theme.border}`}>
                  <p className={`text-xs ${theme.textMuted} text-center`}>
                    Pro tip: Press <kbd className={`px-1.5 py-0.5 text-xs font-mono rounded ${theme.buttonSecondary}`}>Shift + ?</kbd> anywhere in the app to show this dialog
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }

    // Home page
    return (
      <div className={`min-h-screen ${theme.bg} transition-colors duration-300 ${getThemeClass()}`}>
        {/* Theme Background */}
        <ThemeBackground />
        {/* Simple header for module selection */}
        <header className={`${theme.header} border-b shadow-sm`}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${theme.gradient || theme.buttonPrimary} flex items-center justify-center shadow-lg`}>
                  <FileCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${theme.headerText || theme.text}`}>{t(language, 'appTitle')}</h1>
                  <p className={`text-sm ${theme.headerTextMuted || theme.textMuted}`}>{t(language, 'actions.generate')} compliant XML test data</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage('settings')}
                  className={`p-2 rounded-lg transition-all ${theme.buttonSecondary}`}
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    const themeKeys = Object.keys(THEMES)
                    const currentIndex = themeKeys.indexOf(selectedTheme)
                    const nextIndex = (currentIndex + 1) % themeKeys.length
                    setSelectedTheme(themeKeys[nextIndex])
                  }}
                  className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${theme.buttonSecondary}`}
                  title="Click to change theme"
                >
                  <span>{theme.emoji}</span>
                  <span className="text-sm font-medium hidden sm:inline">{theme.name}</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Theme-Specific Animated Backgrounds */}
        {liveAnimations && selectedTheme === 'ocean' && (
          <>
            {/* Ocean Depth Gradient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/20 via-blue-900/30 to-blue-950/40" />
            </div>
            
            {/* Caustic Light Effect (sunlight through water) */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-20">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full blur-3xl"
                  style={{
                    width: `${150 + i * 50}px`,
                    height: `${100 + i * 30}px`,
                    left: `${i * 20}%`,
                    top: `${i * 10}%`,
                    background: 'radial-gradient(ellipse, rgba(0, 255, 255, 0.4), transparent)',
                    animation: `caustic-light ${4 + i}s ease-in-out infinite`,
                    animationDelay: `${i * 0.5}s`
                  }}
                />
              ))}
            </div>
            
            {/* Swimming Fish */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-3xl opacity-60"
                  style={{
                    top: `${20 + Math.random() * 60}%`,
                    left: '-100px',
                    animation: `fish-swim ${15 + Math.random() * 10}s linear infinite`,
                    animationDelay: `${i * 3}s`,
                    transform: i % 2 === 0 ? 'scaleX(1)' : 'scaleX(-1)'
                  }}
                >
                  🐠
                </div>
              ))}
              {[...Array(6)].map((_, i) => (
                <div
                  key={`fish2-${i}`}
                  className="absolute text-2xl opacity-50"
                  style={{
                    top: `${30 + Math.random() * 50}%`,
                    left: '-80px',
                    animation: `fish-swim ${20 + Math.random() * 8}s linear infinite`,
                    animationDelay: `${i * 4}s`
                  }}
                >
                  🐟
                </div>
              ))}
            </div>
            
            {/* Ocean Bubbles */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-white opacity-30"
                  style={{
                    width: `${5 + Math.random() * 15}px`,
                    height: `${5 + Math.random() * 15}px`,
                    left: `${Math.random() * 100}%`,
                    bottom: '-50px',
                    animation: `bubble-rise ${6 + Math.random() * 4}s ease-in-out infinite`,
                    animationDelay: `${i * 0.4}s`
                  }}
                />
              ))}
            </div>
            
            {/* Wave Layers at Bottom */}
            <div className="fixed bottom-0 left-0 w-full pointer-events-none z-0">
              <div className="absolute bottom-0 w-full h-40 bg-gradient-to-t from-cyan-600/20 to-transparent animate-wave" 
                style={{ animationDuration: '4s' }} />
              <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-blue-500/15 to-transparent animate-wave" 
                style={{ animationDuration: '5s', animationDelay: '0.5s' }} />
              <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-cyan-400/10 to-transparent animate-wave" 
                style={{ animationDuration: '6s', animationDelay: '1s' }} />
            </div>
            
            {/* Floating Seaweed/Kelp */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="absolute bottom-0 text-4xl opacity-40"
                  style={{
                    left: `${10 + i * 25}%`,
                    animation: `wave-motion ${3 + i * 0.5}s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`
                  }}
                >
                  🌊
                </div>
              ))}
            </div>
          </>
        )}
        
        {liveAnimations && selectedTheme === 'forest' && (
          <>
            {/* Trees */}
            <div className="fixed bottom-0 left-0 w-full pointer-events-none z-0">
              {/* Left Side Trees */}
              {[...Array(3)].map((_, i) => (
                <div
                  key={`tree-left-${i}`}
                  className="absolute bottom-0 text-8xl opacity-80"
                  style={{
                    left: `${i * 8}%`,
                    animation: `wave-motion ${3 + i * 0.5}s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`
                  }}
                >
                  🌳
                </div>
              ))}
              {/* Right Side Trees */}
              {[...Array(3)].map((_, i) => (
                <div
                  key={`tree-right-${i}`}
                  className="absolute bottom-0 text-8xl opacity-80"
                  style={{
                    right: `${i * 8}%`,
                    animation: `wave-motion ${3 + i * 0.5}s ease-in-out infinite`,
                    animationDelay: `${i * 0.4}s`
                  }}
                >
                  🌲
                </div>
              ))}
            </div>
            
            {/* Grass Ground */}
            <div className="fixed bottom-0 left-0 w-full h-32 pointer-events-none z-0">
              <div className="absolute inset-0 bg-gradient-to-t from-green-600/40 via-green-500/30 to-transparent" />
              {/* Grass Blades */}
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute bottom-0 text-4xl opacity-70"
                  style={{
                    left: `${i * 5}%`,
                    animation: `wave-motion ${2 + (i % 3) * 0.3}s ease-in-out infinite`,
                    animationDelay: `${i * 0.1}s`
                  }}
                >
                  🌿
                </div>
              ))}
            </div>
            
            {/* Flying Birds */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-3xl opacity-60"
                  style={{
                    left: '-100px',
                    top: `${10 + i * 12}%`,
                    animation: `fish-swim ${20 + Math.random() * 10}s linear infinite`,
                    animationDelay: `${i * 4}s`
                  }}
                >
                  🦅
                </div>
              ))}
              {[...Array(4)].map((_, i) => (
                <div
                  key={`bird2-${i}`}
                  className="absolute text-2xl opacity-50"
                  style={{
                    left: '-80px',
                    top: `${20 + i * 15}%`,
                    animation: `fish-swim ${25 + Math.random() * 8}s linear infinite`,
                    animationDelay: `${i * 5}s`
                  }}
                >
                  🕊️
                </div>
              ))}
            </div>
            
            {/* Falling Leaves */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-2xl opacity-60"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: '-50px',
                    animation: `leaf-fall ${15 + Math.random() * 10}s linear infinite`,
                    animationDelay: `${i * 2}s`
                  }}
                >
                  {i % 3 === 0 ? '🍃' : i % 3 === 1 ? '🍂' : '🌿'}
                </div>
              ))}
            </div>
            
            {/* Sunlight Rays */}
            <div className="fixed inset-0 pointer-events-none z-0">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 w-32 h-full bg-gradient-to-b from-yellow-200/15 to-transparent blur-xl"
                  style={{
                    left: `${15 + i * 25}%`,
                    animation: `sunlight-filter ${8 + i * 2}s ease-in-out infinite`,
                    animationDelay: `${i * 1}s`
                  }}
                />
              ))}
            </div>
            
            {/* Butterflies */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-xl opacity-70"
                  style={{
                    left: `${20 + i * 15}%`,
                    top: `${30 + i * 10}%`,
                    animation: `particle-float ${4 + Math.random() * 2}s ease-in-out infinite`,
                    animationDelay: `${i * 0.5}s`
                  }}
                >
                  🦋
                </div>
              ))}
            </div>
          </>
        )}
        
        {liveAnimations && selectedTheme === 'sunset' && (
          <>
            {/* Rainbow in Left Corner */}
            <div className="fixed top-32 -left-32 pointer-events-none z-0">
              <div className="relative w-96 h-96">
                {/* Rainbow Arcs */}
                {[
                  { color: 'rgba(239, 68, 68, 0.3)', size: 380 },    // Red
                  { color: 'rgba(249, 115, 22, 0.3)', size: 360 },   // Orange
                  { color: 'rgba(251, 191, 36, 0.3)', size: 340 },   // Yellow
                  { color: 'rgba(34, 197, 94, 0.3)', size: 320 },    // Green
                  { color: 'rgba(59, 130, 246, 0.3)', size: 300 },   // Blue
                  { color: 'rgba(99, 102, 241, 0.3)', size: 280 },   // Indigo
                  { color: 'rgba(168, 85, 247, 0.3)', size: 260 }    // Violet
                ].map((arc, i) => (
                  <div
                    key={i}
                    className="absolute top-0 left-0 rounded-full"
                    style={{
                      width: `${arc.size}px`,
                      height: `${arc.size}px`,
                      border: `12px solid ${arc.color}`,
                      borderBottom: 'none',
                      borderLeft: 'none',
                      transform: 'rotate(45deg)',
                      animation: `gentle-float ${6 + i * 0.3}s ease-in-out infinite`,
                      animationDelay: `${i * 0.2}s`
                    }}
                  />
                ))}
              </div>
            </div>
            
            {/* Golden Hour Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-200/15 via-orange-200/10 to-rose-200/15" />
              <div className="absolute inset-0 bg-gradient-to-t from-orange-300/20 via-yellow-200/8 to-transparent" />
            </div>
            
            {/* Floating Light Particles */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: `${3 + Math.random() * 5}px`,
                    height: `${3 + Math.random() * 5}px`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    background: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#f97316' : '#fb923c',
                    opacity: 0.4,
                    animation: `particle-float ${5 + Math.random() * 4}s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                    boxShadow: '0 0 8px rgba(251, 191, 36, 0.4)'
                  }}
                />
              ))}
            </div>
            
            {/* Warm Shimmer Effect */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-20">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-transparent to-orange-400/20 animate-pulse" 
                style={{ animationDuration: '5s' }} />
            </div>
          </>
        )}
        
        {liveAnimations && selectedTheme === 'lavender' && (
          <>
            {/* Sparkles */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(25)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-xl"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animation: `twinkle ${2 + Math.random() * 2}s ease-in-out infinite`,
                    animationDelay: `${i * 0.15}s`,
                    filter: 'drop-shadow(0 0 4px rgba(168, 85, 247, 0.6))'
                  }}
                >
                  ✨
                </div>
              ))}
            </div>
            
            {/* Floating Butterflies */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(8)].map((_, i) => (
                <div
                  key={`butterfly-${i}`}
                  className="absolute text-3xl opacity-70"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animation: `particle-float ${5 + Math.random() * 3}s ease-in-out infinite`,
                    animationDelay: `${i * 0.5}s`,
                    filter: 'drop-shadow(0 0 6px rgba(192, 132, 252, 0.5))'
                  }}
                >
                  🦋
                </div>
              ))}
            </div>
            
            {/* Lavender Flowers */}
            <div className="fixed bottom-0 left-0 w-full pointer-events-none z-0">
              {[...Array(12)].map((_, i) => (
                <div
                  key={`flower-${i}`}
                  className="absolute text-4xl opacity-60"
                  style={{
                    left: `${i * 8.5}%`,
                    bottom: '0px',
                    animation: `wave-motion ${2.5 + (i % 3) * 0.4}s ease-in-out infinite`,
                    animationDelay: `${i * 0.15}s`
                  }}
                >
                  🌸
                </div>
              ))}
            </div>
            
            {/* Fairy Lights */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(20)].map((_, i) => (
                <div
                  key={`light-${i}`}
                  className="absolute rounded-full"
                  style={{
                    width: '8px',
                    height: '8px',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    background: i % 2 === 0 ? '#a78bfa' : '#c084fc',
                    opacity: 0,
                    animation: `bioluminescence ${3 + Math.random() * 2}s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`,
                    boxShadow: '0 0 10px currentColor'
                  }}
                />
              ))}
            </div>
            
            {/* Floating Hearts */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(6)].map((_, i) => (
                <div
                  key={`heart-${i}`}
                  className="absolute text-2xl opacity-40"
                  style={{
                    left: `${15 + i * 15}%`,
                    top: `${20 + i * 12}%`,
                    animation: `gentle-float ${10 + i * 2}s ease-in-out infinite`,
                    animationDelay: `${i * 1.2}s`,
                    filter: 'drop-shadow(0 0 4px rgba(192, 132, 252, 0.4))'
                  }}
                >
                  💜
                </div>
              ))}
            </div>
            
            {/* Magic Dust Particles */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(30)].map((_, i) => (
                <div
                  key={`dust-${i}`}
                  className="absolute rounded-full"
                  style={{
                    width: `${2 + Math.random() * 4}px`,
                    height: `${2 + Math.random() * 4}px`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    background: i % 3 === 0 ? '#a78bfa' : i % 3 === 1 ? '#c084fc' : '#e9d5ff',
                    opacity: 0.5,
                    animation: `particle-float ${6 + Math.random() * 4}s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                    filter: 'blur(1px)'
                  }}
                />
              ))}
            </div>
            
            {/* Soft Glow Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full blur-3xl opacity-20"
                  style={{
                    width: `${200 + i * 50}px`,
                    height: `${200 + i * 50}px`,
                    left: `${i * 22}%`,
                    top: `${i * 18}%`,
                    background: 'linear-gradient(135deg, #a78bfa, #c084fc)',
                    animation: `gentle-float ${12 + i * 2}s ease-in-out infinite`,
                    animationDelay: `${i * 1}s`
                  }}
                />
              ))}
            </div>
            
            {/* Dreamy Shimmer */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-15">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-300/20 via-transparent to-pink-300/20 animate-pulse" 
                style={{ animationDuration: '6s' }} />
            </div>
          </>
        )}
        
        {liveAnimations && selectedTheme === 'midnight' && (
          <>
            {/* Crescent Moon */}
            <div className="fixed top-32 left-12 pointer-events-none z-0">
              <div className="relative">
                {/* Moon Glow - Reduced */}
                <div className="absolute -inset-4 w-28 h-28 rounded-full bg-violet-300/5 blur-3xl animate-pulse" 
                  style={{ animationDuration: '4s' }} />
                {/* Moon Body - Crescent Shape */}
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 shadow-2xl overflow-hidden">
                  {/* Dark Side Creating Crescent */}
                  <div className="absolute -right-3 top-0 w-20 h-20 rounded-full bg-[#0f0f23]" />
                  {/* Moon Craters on Visible Side */}
                  <div className="absolute top-4 left-3 w-3 h-3 rounded-full bg-gray-400/40" />
                  <div className="absolute top-10 left-5 w-4 h-4 rounded-full bg-gray-400/30" />
                  <div className="absolute bottom-4 left-2 w-2 h-2 rounded-full bg-gray-400/35" />
                  {/* Moon Shine */}
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-white/40 blur-sm" />
                </div>
              </div>
            </div>
            
            {/* Moonlight Beam - Reduced */}
            <div className="fixed top-32 left-16 w-48 h-full pointer-events-none z-0 opacity-5">
              <div className="w-full h-full bg-gradient-to-b from-violet-200 via-violet-300/30 to-transparent blur-2xl" />
            </div>
            
            {/* Twinkling Stars */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(50)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-white"
                  style={{
                    width: `${1 + Math.random() * 2}px`,
                    height: `${1 + Math.random() * 2}px`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    opacity: 0.3,
                    animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
            
            {/* Violet Nebula Clouds */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full blur-3xl opacity-20"
                  style={{
                    width: `${300 + i * 100}px`,
                    height: `${300 + i * 100}px`,
                    left: `${i * 30}%`,
                    top: `${i * 25}%`,
                    background: 'radial-gradient(circle, #8b5cf6, transparent)',
                    animation: `nebula-drift ${40 + i * 10}s ease-in-out infinite`,
                    animationDelay: `${i * 2}s`
                  }}
                />
              ))}
            </div>
          </>
        )}
        
        {liveAnimations && selectedTheme === 'spaceGalaxy' && (
          <>
            {/* Stars */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(100)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: `${1 + Math.random() * 3}px`,
                    height: `${1 + Math.random() * 3}px`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    background: i % 3 === 0 ? '#00d9ff' : i % 3 === 1 ? '#ff006e' : '#f0f6ff',
                    opacity: 0.6,
                    animation: `twinkle ${1 + Math.random() * 2}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
            
            {/* Space Rockets */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(5)].map((_, i) => (
                <div
                  key={`rocket-${i}`}
                  className="absolute text-4xl"
                  style={{
                    left: '-100px',
                    top: `${15 + i * 18}%`,
                    animation: `fish-swim ${18 + Math.random() * 8}s linear infinite`,
                    animationDelay: `${i * 5}s`,
                    transform: 'rotate(-45deg)',
                    filter: 'drop-shadow(0 0 8px rgba(0, 217, 255, 0.6))'
                  }}
                >
                  🚀
                </div>
              ))}
            </div>
            
            {/* Rocket Trails */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(5)].map((_, i) => (
                <div
                  key={`trail-${i}`}
                  className="absolute h-1 bg-gradient-to-r from-cyan-400/40 via-pink-400/30 to-transparent blur-sm"
                  style={{
                    width: '150px',
                    left: '-150px',
                    top: `${15 + i * 18}%`,
                    animation: `fish-swim ${18 + Math.random() * 8}s linear infinite`,
                    animationDelay: `${i * 5}s`
                  }}
                />
              ))}
            </div>
            
            {/* Shooting Stars */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="absolute h-0.5 w-20 bg-gradient-to-r from-cyan-400 to-transparent rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 50}%`,
                    animation: `shooting-star ${3 + Math.random() * 2}s linear infinite`,
                    animationDelay: `${i * 4}s`,
                    opacity: 0
                  }}
                />
              ))}
            </div>
            
            {/* Planets */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(3)].map((_, i) => (
                <div
                  key={`planet-${i}`}
                  className="absolute text-5xl opacity-70"
                  style={{
                    left: `${20 + i * 35}%`,
                    top: `${10 + i * 25}%`,
                    animation: `gentle-float ${15 + i * 3}s ease-in-out infinite`,
                    animationDelay: `${i * 2}s`,
                    filter: 'drop-shadow(0 0 10px rgba(0, 217, 255, 0.4))'
                  }}
                >
                  {i === 0 ? '🪐' : i === 1 ? '🌍' : '🌙'}
                </div>
              ))}
            </div>
            
            {/* Cosmic Nebula */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full blur-3xl"
                  style={{
                    width: `${250 + i * 80}px`,
                    height: `${250 + i * 80}px`,
                    left: `${i * 25}%`,
                    top: `${i * 20}%`,
                    background: i % 2 === 0 
                      ? 'radial-gradient(circle, rgba(0, 217, 255, 0.15), transparent)'
                      : 'radial-gradient(circle, rgba(255, 0, 110, 0.15), transparent)',
                    animation: `nebula-drift ${50 + i * 10}s ease-in-out infinite`,
                    animationDelay: `${i * 3}s`
                  }}
                />
              ))}
            </div>
          </>
        )}
        
        {liveAnimations && selectedTheme === 'cyberpunkNeon' && (
          <>
            {/* Scanlines */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-10">
              <div className="w-full h-full" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.3) 2px, rgba(0,240,255,0.3) 4px)'
              }} />
            </div>
            {/* Glitch Effect Bars */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-full h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-30"
                  style={{
                    top: `${i * 20}%`,
                    animation: `glitch ${2 + Math.random()}s ease-in-out infinite`,
                    animationDelay: `${i * 0.5}s`
                  }}
                />
              ))}
            </div>
            {/* Neon Grid */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-5">
              <div className="w-full h-full" style={{
                backgroundImage: 'linear-gradient(rgba(255,0,110,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.5) 1px, transparent 1px)',
                backgroundSize: '50px 50px'
              }} />
            </div>
            {/* Floating Data Particles */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-xs font-mono opacity-20"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    color: i % 2 === 0 ? '#ff006e' : '#00f0ff',
                    animation: `data-stream ${5 + Math.random() * 3}s linear infinite`,
                    animationDelay: `${i * 0.3}s`
                  }}
                >
                  {['01', '10', '11', '00'][Math.floor(Math.random() * 4)]}
                </div>
              ))}
            </div>
          </>
        )}
        
        {liveAnimations && selectedTheme === 'organicForest' && (
          <>
            {/* Creek/Stream at Bottom */}
            <div className="fixed bottom-0 left-0 w-full h-40 pointer-events-none z-0">
              <div className="absolute inset-0 bg-gradient-to-t from-blue-400/30 via-cyan-300/20 to-transparent" />
              {/* Water Ripples */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute bottom-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-300/30 to-transparent"
                  style={{
                    bottom: `${i * 5}px`,
                    animation: `animate-wave ${3 + i * 0.3}s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
            
            {/* Swans in Creek */}
            <div className="fixed bottom-0 left-0 w-full pointer-events-none z-0">
              {[...Array(3)].map((_, i) => (
                <div
                  key={`swan-${i}`}
                  className="absolute text-5xl opacity-80"
                  style={{
                    left: `${20 + i * 30}%`,
                    bottom: '40px',
                    animation: `float-bob ${4 + i * 0.5}s ease-in-out infinite`,
                    animationDelay: `${i * 0.8}s`
                  }}
                >
                  🦢
                </div>
              ))}
            </div>
            
            {/* Peacocks on Grass */}
            <div className="fixed bottom-0 left-0 w-full pointer-events-none z-0">
              {[...Array(2)].map((_, i) => (
                <div
                  key={`peacock-${i}`}
                  className="absolute text-6xl opacity-85"
                  style={{
                    left: i === 0 ? '5%' : '85%',
                    bottom: '80px',
                    animation: `gentle-float ${5 + i}s ease-in-out infinite`,
                    animationDelay: `${i * 1.5}s`
                  }}
                >
                  🦚
                </div>
              ))}
            </div>
            
            {/* Grass Along Creek */}
            <div className="fixed bottom-0 left-0 w-full pointer-events-none z-0">
              {[...Array(15)].map((_, i) => (
                <div
                  key={`grass-${i}`}
                  className="absolute text-3xl opacity-70"
                  style={{
                    left: `${i * 7}%`,
                    bottom: '60px',
                    animation: `wave-motion ${2 + (i % 3) * 0.4}s ease-in-out infinite`,
                    animationDelay: `${i * 0.1}s`
                  }}
                >
                  🌾
                </div>
              ))}
            </div>
            
            {/* Trees in Background */}
            <div className="fixed bottom-0 left-0 w-full pointer-events-none z-0">
              {[...Array(4)].map((_, i) => (
                <div
                  key={`tree-${i}`}
                  className="absolute text-7xl opacity-60"
                  style={{
                    left: `${10 + i * 25}%`,
                    bottom: '100px',
                    animation: `wave-motion ${4 + i * 0.5}s ease-in-out infinite`,
                    animationDelay: `${i * 0.4}s`
                  }}
                >
                  🌳
                </div>
              ))}
            </div>
            
            {/* Floating Leaves */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-xl opacity-40"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: '-50px',
                    animation: `leaf-fall ${20 + Math.random() * 10}s linear infinite`,
                    animationDelay: `${i * 2.5}s`
                  }}
                >
                  {['🍂', '🍃', '🌿'][Math.floor(Math.random() * 3)]}
                </div>
              ))}
            </div>
            
            {/* Butterflies */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(4)].map((_, i) => (
                <div
                  key={`butterfly-${i}`}
                  className="absolute text-2xl opacity-60"
                  style={{
                    left: `${25 + i * 20}%`,
                    top: `${30 + i * 15}%`,
                    animation: `particle-float ${4 + Math.random() * 2}s ease-in-out infinite`,
                    animationDelay: `${i * 0.6}s`
                  }}
                >
                  🦋
                </div>
              ))}
            </div>
            
            {/* Sunlight Beams */}
            <div className="fixed inset-0 pointer-events-none z-0">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 w-24 h-full bg-gradient-to-b from-yellow-100/20 to-transparent blur-2xl"
                  style={{
                    left: `${15 + i * 25}%`,
                    animation: `sunlight-filter ${10 + i * 2}s ease-in-out infinite`,
                    animationDelay: `${i * 1.5}s`
                  }}
                />
              ))}
            </div>
            
            {/* Soft Green Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
              <div className="absolute inset-0 bg-gradient-to-br from-green-100/10 via-transparent to-emerald-100/10" />
            </div>
          </>
        )}
        
        {liveAnimations && selectedTheme === 'oceanUnderwater' && (
          <>
            {/* Ocean Depth Gradient Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/30 via-blue-900/40 to-indigo-950/50" />
            </div>
            
            {/* Caustic Light Effect (sunlight through water) */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-25">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full blur-3xl"
                  style={{
                    width: `${180 + i * 60}px`,
                    height: `${120 + i * 40}px`,
                    left: `${i * 18}%`,
                    top: `${i * 12}%`,
                    background: 'radial-gradient(ellipse, rgba(57, 204, 204, 0.5), transparent)',
                    animation: `caustic-light ${3 + i * 0.8}s ease-in-out infinite`,
                    animationDelay: `${i * 0.4}s`
                  }}
                />
              ))}
            </div>
            
            {/* Swimming Fish - Multiple Species */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {/* Tropical Fish */}
              {[...Array(10)].map((_, i) => (
                <div
                  key={`tropical-${i}`}
                  className="absolute text-3xl opacity-70"
                  style={{
                    top: `${15 + Math.random() * 70}%`,
                    left: '-100px',
                    animation: `fish-swim ${12 + Math.random() * 8}s linear infinite`,
                    animationDelay: `${i * 2.5}s`,
                    transform: i % 2 === 0 ? 'scaleX(1)' : 'scaleX(-1)'
                  }}
                >
                  🐠
                </div>
              ))}
              {/* Regular Fish */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={`regular-${i}`}
                  className="absolute text-2xl opacity-60"
                  style={{
                    top: `${25 + Math.random() * 60}%`,
                    left: '-80px',
                    animation: `fish-swim ${18 + Math.random() * 10}s linear infinite`,
                    animationDelay: `${i * 3.5}s`
                  }}
                >
                  🐟
                </div>
              ))}
              {/* Jellyfish */}
              {[...Array(4)].map((_, i) => (
                <div
                  key={`jellyfish-${i}`}
                  className="absolute text-2xl opacity-50"
                  style={{
                    left: `${20 + i * 25}%`,
                    top: `${10 + i * 15}%`,
                    animation: `float-bob ${4 + i * 0.5}s ease-in-out infinite`,
                    animationDelay: `${i * 0.8}s`
                  }}
                >
                  🪼
                </div>
              ))}
              {/* Dolphins */}
              {[...Array(2)].map((_, i) => (
                <div
                  key={`dolphin-${i}`}
                  className="absolute text-4xl opacity-65"
                  style={{
                    top: `${30 + i * 20}%`,
                    left: '-120px',
                    animation: `fish-swim ${25 + Math.random() * 5}s linear infinite`,
                    animationDelay: `${i * 15}s`
                  }}
                >
                  🐬
                </div>
              ))}
            </div>
            
            {/* Ocean Bubbles */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-cyan-200 opacity-40"
                  style={{
                    width: `${4 + Math.random() * 12}px`,
                    height: `${4 + Math.random() * 12}px`,
                    left: `${Math.random() * 100}%`,
                    bottom: '-50px',
                    animation: `bubble-rise ${5 + Math.random() * 4}s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`
                  }}
                />
              ))}
            </div>
            
            {/* Wave Layers at Bottom */}
            <div className="fixed bottom-0 left-0 w-full pointer-events-none z-0">
              <div className="absolute bottom-0 w-full h-48 bg-gradient-to-t from-cyan-700/25 to-transparent animate-wave" 
                style={{ animationDuration: '3.5s' }} />
              <div className="absolute bottom-0 w-full h-40 bg-gradient-to-t from-blue-600/20 to-transparent animate-wave" 
                style={{ animationDuration: '4.5s', animationDelay: '0.5s' }} />
              <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-cyan-500/15 to-transparent animate-wave" 
                style={{ animationDuration: '5.5s', animationDelay: '1s' }} />
            </div>
            
            {/* Coral and Seaweed at Bottom */}
            <div className="fixed bottom-0 left-0 w-full overflow-hidden pointer-events-none z-0">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute bottom-0 text-4xl opacity-50"
                  style={{
                    left: `${5 + i * 18}%`,
                    animation: `wave-motion ${2.5 + i * 0.4}s ease-in-out infinite`,
                    animationDelay: `${i * 0.25}s`
                  }}
                >
                  {i % 3 === 0 ? '🪸' : i % 3 === 1 ? '🌊' : '🌿'}
                </div>
              ))}
            </div>
            
            {/* Bioluminescent Particles */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-cyan-400 blur-sm"
                  style={{
                    width: '3px',
                    height: '3px',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    opacity: 0,
                    animation: `bioluminescence ${3 + Math.random() * 2}s ease-in-out infinite`,
                    animationDelay: `${i * 0.4}s`
                  }}
                />
              ))}
            </div>
          </>
        )}
        
        {liveAnimations && selectedTheme === 'steampunkVictorian' && (
          <>
            {/* Floating Gears */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(8)].map((_, i) => (
                <div
                  key={`gear-${i}`}
                  className="absolute text-6xl opacity-20"
                  style={{
                    left: `${10 + i * 12}%`,
                    top: `${5 + i * 11}%`,
                    animation: `gear-rotate ${10 + i * 2}s linear infinite`,
                    color: i % 2 === 0 ? '#b87333' : '#d4af37'
                  }}
                >
                  ⚙️
                </div>
              ))}
            </div>
            
            {/* Steam Pipes */}
            <div className="fixed bottom-0 left-0 w-full pointer-events-none z-0">
              {[...Array(4)].map((_, i) => (
                <div
                  key={`pipe-${i}`}
                  className="absolute bottom-0 w-12 bg-gradient-to-t from-amber-900/40 to-transparent"
                  style={{
                    height: '200px',
                    left: `${15 + i * 25}%`,
                    borderLeft: '3px solid rgba(139, 69, 19, 0.3)',
                    borderRight: '3px solid rgba(139, 69, 19, 0.3)'
                  }}
                />
              ))}
            </div>
            
            {/* Rising Steam */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(12)].map((_, i) => (
                <div
                  key={`steam-${i}`}
                  className="absolute text-3xl opacity-30"
                  style={{
                    left: `${15 + (i % 4) * 25}%`,
                    bottom: '-50px',
                    animation: `steam-rise ${4 + Math.random() * 2}s ease-out infinite`,
                    animationDelay: `${i * 0.5}s`
                  }}
                >
                  💨
                </div>
              ))}
            </div>
            
            {/* Clockwork Elements */}
            <div className="fixed top-20 right-10 pointer-events-none z-0 opacity-25">
              <div className="relative w-32 h-32">
                {/* Clock Face */}
                <div className="absolute inset-0 rounded-full border-4 border-amber-700/50 bg-amber-100/10" />
                {/* Clock Hands */}
                <div 
                  className="absolute top-1/2 left-1/2 w-1 h-12 bg-amber-800 origin-bottom"
                  style={{
                    transform: 'translate(-50%, -100%)',
                    animation: 'gear-rotate 60s linear infinite'
                  }}
                />
                <div 
                  className="absolute top-1/2 left-1/2 w-1 h-8 bg-amber-600 origin-bottom"
                  style={{
                    transform: 'translate(-50%, -100%)',
                    animation: 'gear-rotate 5s linear infinite'
                  }}
                />
              </div>
            </div>
            
            {/* Brass Machinery Parts */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(6)].map((_, i) => (
                <div
                  key={`machine-${i}`}
                  className="absolute text-5xl opacity-15"
                  style={{
                    left: `${5 + i * 18}%`,
                    top: `${60 + (i % 3) * 10}%`,
                    animation: `gentle-float ${8 + i}s ease-in-out infinite`,
                    animationDelay: `${i * 0.7}s`,
                    color: '#b87333'
                  }}
                >
                  {i % 3 === 0 ? '🔧' : i % 3 === 1 ? '🔩' : '⚙️'}
                </div>
              ))}
            </div>
            
            {/* Victorian Lamp Posts */}
            <div className="fixed bottom-0 left-0 w-full pointer-events-none z-0">
              {[...Array(2)].map((_, i) => (
                <div
                  key={`lamp-${i}`}
                  className="absolute text-6xl opacity-40"
                  style={{
                    left: i === 0 ? '8%' : '88%',
                    bottom: '20px',
                    animation: `lamp-flicker ${3 + i}s ease-in-out infinite`,
                    filter: 'drop-shadow(0 0 10px rgba(255, 170, 0, 0.5))'
                  }}
                >
                  🕯️
                </div>
              ))}
            </div>
            
            {/* Brass Glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-transparent to-orange-900/10" />
            </div>
          </>
        )}
        
        {liveAnimations && (selectedTheme === 'light' || selectedTheme === 'dark') && (
          <>
            {/* Subtle Gradient Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full blur-3xl"
                  style={{
                    width: `${250 + i * 50}px`,
                    height: `${250 + i * 50}px`,
                    left: `${i * 20}%`,
                    top: `${i * 15}%`,
                    background: selectedTheme === 'light' 
                      ? 'radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent)'
                      : 'radial-gradient(circle, rgba(96, 165, 250, 0.1), transparent)',
                    animation: `gentle-float ${15 + i * 2}s ease-in-out infinite`,
                    animationDelay: `${i * 0.8}s`
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Module Selection */}
        <main className="max-w-5xl mx-auto px-6 py-12 relative z-10">
          <div className="text-center mb-12">
            <h2 className={`text-3xl font-bold ${theme.headerText || theme.text} mb-3`}>{t(language, 'selectModule')}</h2>
            <p className={`text-lg ${theme.headerTextMuted || theme.textMuted}`}>{t(language, 'common.select')} the reporting standard you want to work with</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(modules).map(([key, module]) => {
              const Icon = module.icon
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveModule(key)
                    setCurrentPage('generator')
                  }}
                  className={`${theme.card} rounded-2xl border p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-left group hover:scale-[1.02] ${
                    settings.animationsEnabled ? 'animate-fade-in' : ''
                  }`}
                >
                  <div className={`w-14 h-14 rounded-xl ${theme.card} flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform border-2 ${theme.border}`}>
                    <Icon className={`w-7 h-7 ${theme.accentText}`} />
                  </div>
                  <h3 className={`text-xl font-bold ${theme.text} mb-1`}>{module.name}</h3>
                  <p className={`text-xs ${theme.textMuted} mb-3`}>{module.fullName}</p>
                  <p className={`text-sm ${theme.textMuted} mb-4`}>{module.description}</p>
                  <div className="space-y-1.5">
                    {module.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${theme.accentText}`} />
                        <span className={`text-xs ${theme.text}`}>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <div className={`mt-4 py-2.5 px-3 rounded-lg ${theme.buttonPrimary} font-semibold text-center text-sm group-hover:opacity-90 transition-opacity border-2 ${theme.border}`}>
                    Open {module.name}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Coming Soon */}
          <div className="mt-10 text-center">
            <p className={`${theme.textMuted} text-sm mb-3`}>More modules coming soon</p>
            <div className="flex justify-center gap-4">
              <div className={`${theme.card} rounded-lg border px-4 py-2 opacity-50`}>
                <span className={`font-medium ${theme.text}`}>NTJ</span>
                <span className={`text-xs ${theme.textMuted} ml-2`}>Non-Tax Jurisdiction</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-16 text-center">
            <p 
              className="text-lg font-bold bg-clip-text text-transparent animate-pulse" 
              style={{ 
                animationDuration: '3s',
                backgroundImage: selectedTheme === 'ocean' ? 'linear-gradient(to right, #06b6d4, #0284c7, #0369a1)' :
                                 selectedTheme === 'forest' ? 'linear-gradient(to right, #10b981, #059669, #047857)' :
                                 selectedTheme === 'sunset' ? 'linear-gradient(to right, #fb923c, #f97316, #ea580c)' :
                                 selectedTheme === 'lavender' ? 'linear-gradient(to right, #a78bfa, #c084fc, #e879f9)' :
                                 selectedTheme === 'midnight' ? 'linear-gradient(to right, #8b5cf6, #7c3aed, #6d28d9)' :
                                 selectedTheme === 'spaceGalaxy' ? 'linear-gradient(to right, #00d9ff, #7b2cbf, #ff006e)' :
                                 selectedTheme === 'cyberpunkNeon' ? 'linear-gradient(to right, #ff006e, #00f0ff, #b400ff)' :
                                 selectedTheme === 'organicForest' ? 'linear-gradient(to right, #4a7c39, #2d5016, #65a30d)' :
                                 selectedTheme === 'oceanUnderwater' ? 'linear-gradient(to right, #06b6d4, #0891b2, #0e7490)' :
                                 selectedTheme === 'steampunkVictorian' ? 'linear-gradient(to right, #d4af37, #b87333, #8b4513)' :
                                 selectedTheme === 'dark' ? 'linear-gradient(to right, #3b82f6, #8b5cf6, #ec4899)' :
                                 'linear-gradient(to right, #2563eb, #7c3aed, #db2777)',
                filter: 'drop-shadow(0 0 10px rgba(147, 51, 234, 0.5))'
              }}
            >
              Created by Team MDES - All Rights Reserved
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Get current module config
  const currentModule = modules[activeModule]
  const ModuleIcon = currentModule?.icon || Globe

  return (
    <div className={`min-h-screen ${theme.bg} transition-colors duration-300 ${getThemeClass()}`}>
      {/* Theme Background */}
      <ThemeBackground />
      {/* Header */}
      <header className={`${theme.header} border-b shadow-sm sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back to module selection */}
              <button
                onClick={() => setActiveModule(null)}
                className={`p-2 rounded-lg transition-colors ${theme.buttonSecondary}`}
                title="Back to module selection"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className={`w-10 h-10 rounded-xl ${theme.buttonPrimary} flex items-center justify-center shadow-lg`}>
                <ModuleIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${theme.text}`}>{currentModule.name} Generator</h1>
                <p className={`text-xs ${theme.textMuted}`}>{currentModule.fullName}</p>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {[
                { id: 'generator', icon: Rocket, label: 'Generator' },
                { id: 'corrections', icon: FileEdit, label: 'Corrections' },
                ...(activeModule === 'crs' ? [{ id: 'tools', icon: RefreshCw, label: 'Tools' }] : [])
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setCurrentPage(id)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                    currentPage === id
                      ? `${theme.buttonPrimary} shadow-md`
                      : `${theme.icon} ${theme.iconHover} ${theme.cardHover}`
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>

            {/* Theme toggle */}
            <button
              onClick={() => {
                const themeKeys = Object.keys(THEMES)
                const currentIndex = themeKeys.indexOf(selectedTheme)
                const nextIndex = (currentIndex + 1) % themeKeys.length
                setSelectedTheme(themeKeys[nextIndex])
              }}
              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${theme.buttonSecondary}`}
              title="Click to change theme"
            >
              <span>{theme.emoji}</span>
              <span className="text-sm font-medium hidden sm:inline">{theme.name}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* FATCA Generator Page */}
        {currentPage === 'generator' && activeModule === 'fatca' && (
          <div className={`space-y-6 ${settings.animationsEnabled ? 'animate-fade-in' : ''}`}>
            {/* FATCA Message Header */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 ${theme.accent ? 'border-l-current' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <Landmark className={`w-6 h-6 ${theme.accentText}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>FATCA Message Header</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Sending Company GIIN *</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    placeholder="000000.00000.TA.531"
                    value={fatcaFormData.sendingCompanyIN}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, sendingCompanyIN: e.target.value})}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Transmitting Country *</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    placeholder="NL"
                    maxLength={2}
                    value={fatcaFormData.transmittingCountry}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, transmittingCountry: e.target.value.toUpperCase()})}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>{t(language, 'form.receivingCountry')}</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input} opacity-60`}
                    value={fatcaFormData.receivingCountry}
                    readOnly
                  />
                  <p className={`text-xs ${theme.textMuted} mt-1`}>Always US for FATCA</p>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Reporting Period (Year)</label>
                  <select
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    value={fatcaFormData.reportingPeriod}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, reportingPeriod: e.target.value})}
                  >
                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* FATCA Reporting FI */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 ${theme.accent ? 'border-l-current' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <Building2 className={`w-6 h-6 ${theme.accentText}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>{t(language, 'form.reportingFI')}</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>{t(language, 'form.numFIs')}</label>
                  <input
                    type="number"
                    min="1"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    value={fatcaFormData.numReportingFIs}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, numReportingFIs: e.target.value})}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Filer Category *</label>
                  <select
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    value={fatcaFormData.filerCategory}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, filerCategory: e.target.value})}
                  >
                    {fatcaFilerCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* FATCA Account Configuration */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 ${theme.accent ? 'border-l-current' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <Users className={`w-6 h-6 ${theme.accentText}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>Account Configuration</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Individual Accounts</label>
                  <input
                    type="number"
                    min="0"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    placeholder="0"
                    value={fatcaFormData.individualAccounts}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, individualAccounts: e.target.value})}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Organisation Accounts</label>
                  <input
                    type="number"
                    min="0"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    placeholder="0"
                    value={fatcaFormData.organisationAccounts}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, organisationAccounts: e.target.value})}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Substantial Owners per Org</label>
                  <input
                    type="number"
                    min="0"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    value={fatcaFormData.substantialOwners}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, substantialOwners: e.target.value})}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fatcaFormData.testMode}
                    onChange={(e) => setFatcaFormData({...fatcaFormData, testMode: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className={`text-sm ${theme.text}`}>Test Mode (FATCA11-14 indicators)</span>
                </label>
              </div>
            </div>

            {/* FATCA Output */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 ${theme.accent ? 'border-l-current' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <Save className={`w-6 h-6 ${theme.accentText}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>Output</h2>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`flex-1 px-4 py-2 rounded-lg border ${theme.input}`}
                  placeholder="Select output file location..."
                  value={fatcaFormData.outputPath}
                  readOnly
                />
                <button
                  onClick={async () => {
                    const result = await window.electronAPI.selectOutputFile('fatca')
                    if (result) setFatcaFormData({...fatcaFormData, outputPath: result})
                  }}
                  className={`px-4 py-2 ${theme.buttonPrimary} font-medium rounded-lg transition-colors flex items-center gap-2`}
                >
                  <FolderOpen className="w-4 h-4" />
                  Browse
                </button>
              </div>
            </div>

            {/* FATCA Generate Button */}
            <button
              onClick={handleGenerateFATCA}
              disabled={isGenerating}
              className={`w-full py-4 ${theme.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-3`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Generating FATCA XML...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-6 h-6" />
                  <span>Generate FATCA XML</span>
                </>
              )}
            </button>

            {generationProgress && (
              <div className={`${theme.card} rounded-lg border p-4`}>
                <p className={`text-sm ${theme.textMuted}`}>{generationProgress}</p>
              </div>
            )}
          </div>
        )}

        {/* CBC Generator Page */}
        {currentPage === 'generator' && activeModule === 'cbc' && (
          <div className={`space-y-6 ${settings.animationsEnabled ? 'animate-fade-in' : ''}`}>
            {/* Data Source Toggle */}
            <div className={`${theme.card} rounded-xl border p-4 shadow-sm`}>
              <div className="flex items-center gap-4">
                <span className={`text-sm font-medium ${theme.text}`}>Data Source:</span>
                <div className="flex gap-2">
                  {[
                    { id: 'random', icon: Sparkles, label: 'Random Data' },
                    { id: 'csv', icon: Upload, label: 'Upload CSV' }
                  ].map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      onClick={() => setCbcDataMode(id)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                        cbcDataMode === id
                          ? `${theme.buttonPrimary} shadow-md`
                          : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CSV Upload Section */}
            {cbcDataMode === 'csv' && (
              <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 ${theme.accent ? 'border-l-current' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <Upload className={`w-6 h-6 ${theme.accentText}`} />
                  <h2 className={`text-lg font-semibold ${theme.text}`}>Upload CBC CSV File</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        className={`w-full px-4 py-3 rounded-lg border ${theme.input}`}
                        placeholder="Select CBC CSV file..."
                        value={cbcCsvPath}
                        readOnly
                      />
                      {cbcCsvPath && (
                        <button
                          onClick={() => setCbcCsvPath('')}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 ${theme.textMuted} hover:text-red-500`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        const filePath = await window.electronAPI.selectCsvFile()
                        if (filePath) {
                          setCbcCsvPath(filePath)
                          if (settings.autoValidateCsv) {
                            try {
                              const result = await window.electronAPI.validateCbcCsv(filePath)
                              if (result.valid) {
                                setModalType('success')
                                setModalMessage(`CBC CSV validated! ${result.statistics?.total_reports || 'Multiple'} reports found.`)
                                setShowModal(true)
                              } else {
                                setValidationErrors(result.errors || [])
                                setShowValidationModal(true)
                                setCbcCsvPath('')
                              }
                            } catch (error) {
                              setModalType('error')
                              setModalMessage(`CBC CSV validation failed: ${error.message}`)
                              setShowModal(true)
                              setCbcCsvPath('')
                            }
                          }
                        }
                      }}
                      className={`px-6 py-3 ${theme.buttonPrimary} font-medium rounded-lg transition-colors flex items-center gap-2`}
                    >
                      <Upload className="w-4 h-4" />
                      Browse
                    </button>
                  </div>
                  
                  <div className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className={`text-sm ${theme.text} font-medium mb-1`}>Need a template?</p>
                      <p className={`text-xs ${theme.textMuted} mb-2`}>Download the CBC CSV template with example data</p>
                      <button
                        onClick={handleDownloadTemplate}
                        className={`text-sm px-3 py-1.5 ${theme.buttonPrimary} rounded-lg flex items-center gap-1`}
                      >
                        <Download className="w-4 h-4" />
                        Download Template
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CBC File Type Selection */}
            {cbcDataMode === 'random' && (
              <>
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
              <div className="flex items-center gap-3 mb-4">
                <FileCheck className={`w-6 h-6 ${theme.accentText}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>CBC File Type</h2>
              </div>
              <div className="flex gap-4 mb-4">
                {[
                  { id: 'domestic', icon: Home, label: 'Domestic Filing' },
                  { id: 'foreign', icon: Globe, label: 'Foreign Exchange' }
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setCbcFileType(id)
                      if (id === 'domestic') {
                        setCbcFormData({...cbcFormData, receivingCountry: ''})
                      }
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                      cbcFileType === id
                        ? `${theme.buttonPrimary} shadow-md`
                        : `${theme.buttonSecondary}`
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                ))}
              </div>
              <div className={`${theme.accentLight} border rounded-lg p-3`}>
                <p className={`text-sm ${theme.text}`}>
                  {cbcFileType === 'domestic' ? (
                    <>
                      <strong>Domestic Filing:</strong> File submitted to your local tax authority. 
                      Receiving country will be the same as the transmitting country.
                    </>
                  ) : (
                    <>
                      <strong>Foreign Exchange:</strong> File for automatic exchange with foreign tax authorities. 
                      You must specify the receiving country (partner jurisdiction).
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* CBC Message Header */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 ${theme.accent ? 'border-l-current' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className={`w-6 h-6 ${theme.accentText}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>CBC Message Header</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Sending Entity TIN *</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    placeholder="123456789"
                    value={cbcFormData.sendingEntityIN}
                    onChange={(e) => setCbcFormData({...cbcFormData, sendingEntityIN: e.target.value})}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Transmitting Country *</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    placeholder="NL"
                    maxLength={2}
                    value={cbcFormData.transmittingCountry}
                    onChange={(e) => setCbcFormData({...cbcFormData, transmittingCountry: e.target.value.toUpperCase()})}
                  />
                </div>
                {cbcFileType === 'foreign' && (
                  <div>
                    <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>{t(language, 'form.receivingCountry')}</label>
                    <input
                      type="text"
                      className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                      placeholder="US, DE, GB..."
                      maxLength={2}
                      value={cbcFormData.receivingCountry}
                      onChange={(e) => setCbcFormData({...cbcFormData, receivingCountry: e.target.value.toUpperCase()})}
                    />
                    <p className={`text-xs ${theme.textMuted} mt-1`}>Partner jurisdiction to exchange with</p>
                  </div>
                )}
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Reporting Period (Year)</label>
                  <select
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    value={cbcFormData.reportingPeriod}
                    onChange={(e) => setCbcFormData({...cbcFormData, reportingPeriod: e.target.value})}
                  >
                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* CBC Reporting Entity */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 ${theme.accent ? 'border-l-current' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <Building2 className={`w-6 h-6 ${theme.accentText}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>Reporting Entity (MNE)</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>MNE Group Name</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    placeholder="Auto-generated if empty"
                    value={cbcFormData.mneGroupName}
                    onChange={(e) => setCbcFormData({...cbcFormData, mneGroupName: e.target.value})}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Reporting Entity Name</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    placeholder="Auto-generated if empty"
                    value={cbcFormData.reportingEntityName}
                    onChange={(e) => setCbcFormData({...cbcFormData, reportingEntityName: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Reporting Role *</label>
                  <select
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    value={cbcFormData.reportingRole}
                    onChange={(e) => setCbcFormData({...cbcFormData, reportingRole: e.target.value})}
                  >
                    {cbcReportingRoles.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* CBC Report Configuration */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 ${theme.accent ? 'border-l-current' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <Globe className={`w-6 h-6 ${theme.accentText}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>CBC Report Configuration</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Number of Jurisdiction Reports</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    value={cbcFormData.numCbcReports}
                    onChange={(e) => setCbcFormData({...cbcFormData, numCbcReports: e.target.value})}
                  />
                  <p className={`text-xs ${theme.textMuted} mt-1`}>One report per tax jurisdiction</p>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Constituent Entities per Report</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                    value={cbcFormData.constEntitiesPerReport}
                    onChange={(e) => setCbcFormData({...cbcFormData, constEntitiesPerReport: e.target.value})}
                  />
                  <p className={`text-xs ${theme.textMuted} mt-1`}>Companies in each jurisdiction</p>
                </div>
              </div>
              <div className="mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cbcFormData.testMode}
                    onChange={(e) => setCbcFormData({...cbcFormData, testMode: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className={`text-sm ${theme.text}`}>Test Mode (OECD11-13 indicators)</span>
                </label>
              </div>
            </div>
              </>
            )}

            {/* CBC Output */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 ${theme.accent ? 'border-l-current' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <Save className={`w-6 h-6 ${theme.accentText}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>Output</h2>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`flex-1 px-4 py-2 rounded-lg border ${theme.input}`}
                  placeholder="Select output file location..."
                  value={cbcFormData.outputPath}
                  readOnly
                />
                <button
                  onClick={async () => {
                    const result = await window.electronAPI.selectOutputFile('cbc')
                    if (result) setCbcFormData({...cbcFormData, outputPath: result})
                  }}
                  className={`px-4 py-2 ${theme.buttonPrimary} font-medium rounded-lg transition-colors flex items-center gap-2`}
                >
                  <FolderOpen className="w-4 h-4" />
                  Browse
                </button>
              </div>
            </div>

            {/* CBC Generate Button */}
            <button
              onClick={handleGenerateCBC}
              disabled={isGenerating}
              className={`w-full py-4 ${theme.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-3`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Generating CBC XML...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-6 h-6" />
                  <span>Generate CBC XML</span>
                </>
              )}
            </button>

            {generationProgress && (
              <div className={`${theme.card} rounded-lg border p-4`}>
                <p className={`text-sm ${theme.textMuted}`}>{generationProgress}</p>
              </div>
            )}
          </div>
        )}

        {/* CRS Generator Page */}
        {currentPage === 'generator' && activeModule === 'crs' && (
          <div className={`space-y-6 ${settings.animationsEnabled ? 'animate-fade-in' : ''}`}>
            {/* Data Source Toggle */}
            <div className={`${theme.card} rounded-xl border p-4 shadow-sm`}>
              <div className="flex items-center gap-4">
                <span className={`text-sm font-medium ${theme.text}`}>Data Source:</span>
                <div className="flex gap-2">
                  {[
                    { id: 'random', icon: Sparkles, label: 'Random Data' },
                    { id: 'csv', icon: Upload, label: 'Upload CSV' }
                  ].map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      onClick={() => setDataMode(id)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                        dataMode === id
                          ? `${theme.buttonPrimary} shadow-md`
                          : theme.buttonSecondary
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CSV Upload Section */}
            {dataMode === 'csv' && (
              <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 ${theme.accent ? 'border-l-current' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <Upload className={`w-6 h-6 ${theme.accentText}`} />
                  <h2 className={`text-lg font-semibold ${theme.text}`}>Upload CSV File</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        className={`w-full px-4 py-3 rounded-lg border ${theme.input} ${
                          errors.csvFilePath ? 'border-red-500' : csvFilePath && csvStatistics ? 'border-green-500' : ''
                        }`}
                        placeholder="Select CSV file..."
                        value={csvFilePath}
                        readOnly
                      />
                      {csvFilePath && (
                        <button
                          onClick={handleClearCsvFile}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 ${theme.icon} hover:text-red-500 transition-colors`}
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={handleSelectCsvFile}
                      disabled={isValidatingCsv}
                      className={`px-6 py-3 ${theme.buttonSuccess} disabled:opacity-50 font-medium rounded-lg transition-colors flex items-center gap-2`}
                    >
                      {isValidatingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
                      {isValidatingCsv ? 'Validating...' : 'Browse'}
                    </button>
                  </div>
                  
                  {errors.csvFilePath && <p className="text-sm text-red-500">{errors.csvFilePath}</p>}
                  
                  {csvFilePath && csvStatistics && (
                    <div className={`${theme.badgeSuccess} border rounded-lg p-4`}>
                      <div className={`flex items-center gap-2 font-medium mb-2 ${theme.accentText}`}>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>CSV Validated</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div><span className={theme.textMuted}>Accounts:</span> <strong className={theme.text}>{csvStatistics.total_accounts}</strong></div>
                        <div><span className={theme.textMuted}>Individual:</span> <strong className={theme.text}>{csvStatistics.individual_accounts}</strong></div>
                        <div><span className={theme.textMuted}>Organisation:</span> <strong className={theme.text}>{csvStatistics.organisation_accounts}</strong></div>
                        <div><span className={theme.textMuted}>FIs:</span> <strong className={theme.text}>{csvStatistics.reporting_fis}</strong></div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCrs701CsvPreview(true)}
                      className={`text-sm px-3 py-1.5 ${theme.buttonSuccess} rounded-lg flex items-center gap-1`}
                    >
                      <Eye className="w-4 h-4" />
                      Preview & Download Template
                    </button>
                  </div>
                  <p className={`text-xs ${theme.textMuted}`}>
                    View the required CSV format and download a template file for CRS 701 data.
                  </p>
                </div>
              </div>
            )}

            {/* Random Data Form */}
            {dataMode === 'random' && (
              <>
                {/* Message Header */}
                <div className={`${theme.card} rounded-xl border shadow-sm overflow-hidden`}>
                  <button
                    onClick={() => toggleSection('messageHeader')}
                    className={`w-full px-6 py-4 flex items-center justify-between ${theme.cardHover} transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-primary-600" />
                      <span className={`font-semibold ${theme.text}`}>Message Header</span>
                    </div>
                    {expandedSections.messageHeader ? <ChevronUp className={theme.textMuted} /> : <ChevronDown className={theme.textMuted} />}
                  </button>
                  
                  {expandedSections.messageHeader && (
                    <div className="px-6 pb-6 grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Sending Company IN *</label>
                        <input
                          type="text"
                          className={`w-full px-4 py-2 rounded-lg border ${theme.input} ${errors.sendingCompanyIN ? 'border-red-500' : ''}`}
                          value={formData.sendingCompanyIN}
                          onChange={(e) => handleInputChange('sendingCompanyIN', e.target.value)}
                          placeholder="e.g., 12345678"
                        />
                        {errors.sendingCompanyIN && <p className="text-xs text-red-500 mt-1">{errors.sendingCompanyIN}</p>}
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>{t(language, 'form.taxYear')} *</label>
                        <select
                          className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                          value={formData.reportingPeriod}
                          onChange={(e) => handleInputChange('reportingPeriod', e.target.value)}
                        >
                          {years.map(year => <option key={year} value={year}>{year}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Transmitting Country *</label>
                        <input
                          type="text"
                          className={`w-full px-4 py-2 rounded-lg border ${theme.input} ${errors.transmittingCountry ? 'border-red-500' : ''}`}
                          value={formData.transmittingCountry}
                          onChange={(e) => handleInputChange('transmittingCountry', e.target.value.toUpperCase())}
                          placeholder="e.g., NL"
                          maxLength={2}
                        />
                        {errors.transmittingCountry && <p className="text-xs text-red-500 mt-1">{errors.transmittingCountry}</p>}
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>{t(language, 'form.receivingCountry')} *</label>
                        <input
                          type="text"
                          className={`w-full px-4 py-2 rounded-lg border ${theme.input} ${errors.receivingCountry ? 'border-red-500' : ''}`}
                          value={formData.receivingCountry}
                          onChange={(e) => handleInputChange('receivingCountry', e.target.value.toUpperCase())}
                          placeholder="e.g., DE"
                          maxLength={2}
                        />
                        {errors.receivingCountry && <p className="text-xs text-red-500 mt-1">{errors.receivingCountry}</p>}
                      </div>
                    </div>
                  )}
                </div>

                {/* File Size */}
                <div className={`${theme.card} rounded-xl border shadow-sm overflow-hidden`}>
                  <button
                    onClick={() => toggleSection('fileSize')}
                    className={`w-full px-6 py-4 flex items-center justify-between ${theme.cardHover} transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-primary-600" />
                      <span className={`font-semibold ${theme.text}`}>File Size Configuration</span>
                    </div>
                    {expandedSections.fileSize ? <ChevronUp className={theme.textMuted} /> : <ChevronDown className={theme.textMuted} />}
                  </button>
                  
                  {expandedSections.fileSize && (
                    <div className="px-6 pb-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>{t(language, 'form.numFIs')} *</label>
                          <input
                            type="number"
                            min="1"
                            className={`w-full px-4 py-2 rounded-lg border ${theme.input} ${errors.numReportingFIs ? 'border-red-500' : ''}`}
                            value={formData.numReportingFIs}
                            onChange={(e) => handleNumFIsChange(e.target.value)}
                            placeholder="e.g., 1"
                          />
                          {errors.numReportingFIs && <p className="text-xs text-red-500 mt-1">{errors.numReportingFIs}</p>}
                        </div>
                      </div>
                      
                      {formData.reportingFITINs.length > 0 && (
                        <div className="grid grid-cols-2 gap-4">
                          {formData.reportingFITINs.map((tin, index) => (
                            <div key={index}>
                              <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>FI {index + 1} TIN *</label>
                              <input
                                type="text"
                                className={`w-full px-4 py-2 rounded-lg border ${theme.input} ${errors[`tin_${index}`] ? 'border-red-500' : ''}`}
                                value={tin}
                                onChange={(e) => handleTINChange(index, e.target.value)}
                                placeholder={`TIN for FI ${index + 1}`}
                              />
                              {errors[`tin_${index}`] && <p className="text-xs text-red-500 mt-1">{errors[`tin_${index}`]}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Individual Accounts</label>
                          <input
                            type="number"
                            min="0"
                            className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                            value={formData.individualAccounts}
                            onChange={(e) => handleInputChange('individualAccounts', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Organisation Accounts</label>
                          <input
                            type="number"
                            min="0"
                            className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                            value={formData.organisationAccounts}
                            onChange={(e) => handleInputChange('organisationAccounts', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium ${theme.textMuted} mb-1`}>Controlling Persons per Organisation</label>
                          <input
                            type="number"
                            min="0"
                            className={`w-full px-4 py-2 rounded-lg border ${theme.input}`}
                            value={formData.controllingPersons}
                            onChange={(e) => handleInputChange('controllingPersons', e.target.value)}
                            placeholder="1"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview Actions */}
                <div className={`${theme.card} rounded-xl border p-4 shadow-sm`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Table className="w-5 h-5 text-green-600" />
                      <span className={`font-medium ${theme.text}`}>CSV Preview</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleGeneratePreview}
                        disabled={isLoadingPreview}
                        className={`px-4 py-2 ${theme.buttonSuccess} font-medium rounded-lg transition-colors flex items-center gap-2 text-sm`}
                      >
                        {isLoadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                        Preview
                      </button>
                      <button
                        onClick={handleDownloadCsv}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${theme.buttonSecondary}`}
                      >
                        <Download className="w-4 h-4" />
                        Download CSV
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Output Section */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 border-l-primary-500`}>
              <div className="flex items-center gap-3 mb-4">
                <Save className={`w-6 h-6 ${darkMode ? 'text-primary-400' : 'text-primary-600'}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>Output</h2>
              </div>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  className={`flex-1 px-4 py-3 rounded-lg border ${theme.input} ${errors.outputPath ? 'border-red-500' : ''}`}
                  placeholder="Select output location..."
                  value={formData.outputPath}
                  readOnly
                />
                <button
                  onClick={handleSelectOutputFile}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FolderOpen className="w-4 h-4" />
                  Browse
                </button>
              </div>
              {errors.outputPath && <p className="text-sm text-red-500 mb-4">{errors.outputPath}</p>}

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`w-full px-6 py-4 ${theme.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating... {generationProgress}</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    <span>Generate CRS XML File</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Corrections Page */}
        {currentPage === 'corrections' && (
          <div className={`space-y-6 ${settings.animationsEnabled ? 'animate-fade-in' : ''}`}>
            {/* Info Banner */}
            <div className={`${darkMode ? 'bg-orange-900/30 border-orange-700' : 'bg-orange-50 border-orange-200'} border rounded-xl p-4`}>
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`font-medium ${darkMode ? 'text-orange-300' : 'text-orange-800'}`}>
                    {activeModule === 'cbc' ? 'Generate CBC Correction Files' : 
                     activeModule === 'fatca' ? 'Generate FATCA Correction Files' : 'Generate CRS702 Correction Files'}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-orange-400' : 'text-orange-700'} mt-1`}>
                    {activeModule === 'cbc'
                      ? 'Upload a valid CBC XML file to generate corrections (OECD2) or deletions (OECD3).'
                      : activeModule === 'fatca'
                        ? 'Upload a valid FATCA XML file to generate corrections (FATCA2) or voids (FATCA3).'
                        : correctionDataMode === 'xml' 
                          ? 'Upload a valid CRS701 (new) XML file to generate corrections (OECD2) or deletions (OECD3).'
                          : 'Upload a CSV file with DocRefId column to specify exactly which accounts to correct or delete.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Data Mode Toggle */}
            <div className={`${theme.card} rounded-xl border p-4 shadow-sm`}>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setCorrectionDataMode('xml')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    correctionDataMode === 'xml'
                      ? `${theme.buttonPrimary} shadow-lg`
                      : `${theme.text} ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  From XML File
                </button>
                <button
                  onClick={() => setCorrectionDataMode('csv')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    correctionDataMode === 'csv'
                      ? `${theme.buttonPrimary} shadow-lg`
                      : `${theme.text} ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`
                  }`}
                >
                  <Table className="w-5 h-5" />
                  From CSV File
                </button>
              </div>
            </div>

            {/* Upload XML Section - Only show in XML mode */}
            {correctionDataMode === 'xml' && (
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 ${theme.accent ? 'border-l-current' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <Upload className={`w-6 h-6 ${theme.accentText}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>Source XML File</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-lg border ${theme.input} ${
                        xmlValidation?.is_valid === false ? 'border-red-500' : 
                        xmlValidation?.can_generate_correction ? 'border-green-500' : ''
                      }`}
                      placeholder={activeModule === 'cbc' ? 'Select CBC XML file...' : activeModule === 'fatca' ? 'Select FATCA XML file...' : 'Select CRS XML file (CRS701)...'}
                      value={correctionXmlPath}
                      readOnly
                    />
                    {correctionXmlPath && (
                      <button
                        onClick={handleClearXmlFile}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleSelectXmlFile}
                    disabled={isValidatingXml}
                    className={`px-6 py-3 ${theme.buttonPrimary} disabled:bg-gray-400 font-medium rounded-lg transition-colors flex items-center gap-2`}
                  >
                    {isValidatingXml ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
                    {isValidatingXml ? 'Validating...' : 'Browse'}
                  </button>
                </div>

                {/* Validation Result */}
                {xmlValidation && (
                  <div className={`rounded-lg p-4 ${
                    xmlValidation.is_valid && xmlValidation.can_generate_correction
                      ? theme.badgeSuccess
                      : theme.badgeError
                  } border`}>
                    <div className="flex items-center gap-2 mb-3">
                      {xmlValidation.can_generate_correction ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className={`font-medium ${
                        xmlValidation.can_generate_correction 
                          ? darkMode ? 'text-green-400' : 'text-green-700'
                          : darkMode ? 'text-red-400' : 'text-red-700'
                      }`}>
                        {xmlValidation.can_generate_correction ? 'Valid CRS701 File' : 'Validation Failed'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${theme.textMuted}`}>
                        v{xmlValidation.version}
                      </span>
                    </div>
                    
                    {xmlValidation.can_generate_correction && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className={theme.textMuted}>Accounts:</span>
                          <strong className={`ml-1 ${theme.text}`}>{xmlValidation.total_accounts}</strong>
                        </div>
                        <div>
                          <span className={theme.textMuted}>Individual:</span>
                          <strong className={`ml-1 ${theme.text}`}>{xmlValidation.individual_accounts}</strong>
                        </div>
                        <div>
                          <span className={theme.textMuted}>Organisation:</span>
                          <strong className={`ml-1 ${theme.text}`}>{xmlValidation.organisation_accounts}</strong>
                        </div>
                        <div>
                          <span className={theme.textMuted}>FIs:</span>
                          <strong className={`ml-1 ${theme.text}`}>{xmlValidation.reporting_fi_count}</strong>
                        </div>
                      </div>
                    )}
                    
                    {xmlValidation.errors?.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => setShowXmlErrorsModal(true)}
                          className="text-sm text-red-500 hover:text-red-600 underline"
                        >
                          View {xmlValidation.errors.length} error{xmlValidation.errors.length > 1 ? 's' : ''}
                        </button>
                      </div>
                    )}
                    
                    {xmlValidation.warnings?.length > 0 && (
                      <div className="mt-2 text-xs text-yellow-600">
                        {xmlValidation.warnings.length} warning{xmlValidation.warnings.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* CSV Correction Section - Only show in CSV mode */}
            {correctionDataMode === 'csv' && (
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 ${theme.accent ? 'border-l-current' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <Table className={`w-6 h-6 ${theme.accentText}`} />
                <h2 className={`text-lg font-semibold ${theme.text}`}>Correction CSV File</h2>
              </div>
              
              <div className="space-y-4">
                {/* CSV Format Info */}
                <div className={`${theme.accentLight} border rounded-lg p-4`}>
                  <p className={`font-medium ${theme.accentText} mb-2`}>Required CSV Format</p>
                  <p className={`text-sm ${theme.textMuted} mb-3`}>
                    Your CSV must include a <strong>DocRefId</strong> column with valid document reference IDs from your original CRS701 file.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCorrectionCsvPreview(true)}
                      className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View CSV Template
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await window.electronAPI.downloadCorrectionCsvTemplate()
                        } catch (err) {
                          console.error('Download error:', err)
                        }
                      }}
                      className={`text-sm px-3 py-1.5 ${theme.buttonSuccess} rounded-lg flex items-center gap-1`}
                    >
                      <Download className="w-4 h-4" />
                      Download Template
                    </button>
                  </div>
                </div>

                {/* CSV File Upload */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-lg border ${theme.input}`}
                      placeholder="Select correction CSV file..."
                      value={correctionCsvPath}
                      readOnly
                    />
                    {correctionCsvPath && (
                      <button
                        onClick={() => {
                          setCorrectionCsvPath('')
                          setCorrectionCsvPreview(null)
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const result = await window.electronAPI.selectCorrectionCsv()
                        if (result.path) {
                          setCorrectionCsvPath(result.path)
                          setCorrectionCsvPreview(result.preview)
                        }
                      } catch (err) {
                        console.error('CSV select error:', err)
                      }
                    }}
                    className={`px-6 py-3 ${theme.buttonPrimary} font-medium rounded-lg transition-colors flex items-center gap-2`}
                  >
                    <FolderOpen className="w-4 h-4" />
                    Browse
                  </button>
                </div>

                {/* CSV Preview */}
                {correctionCsvPreview && (
                  <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-4 overflow-x-auto`}>
                    <p className={`text-sm font-medium ${theme.text} mb-2`}>Preview ({correctionCsvPreview.rowCount} rows)</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          {correctionCsvPreview.headers?.map((h, i) => (
                            <th key={i} className={`px-3 py-2 text-left font-medium ${theme.text}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {correctionCsvPreview.rows?.slice(0, 5).map((row, i) => (
                          <tr key={i} className={`${darkMode ? 'border-gray-700' : 'border-gray-200'} border-t`}>
                            {row.map((cell, j) => (
                              <td key={j} className={`px-3 py-2 ${theme.textMuted}`}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {correctionCsvPreview.rowCount > 5 && (
                      <p className={`text-xs ${theme.textMuted} mt-2`}>... and {correctionCsvPreview.rowCount - 5} more rows</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* CBC Correction Options */}
            {activeModule === 'cbc' && xmlValidation?.can_generate_correction && (
              <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 ${theme.accent ? 'border-l-current' : ''}`}>
                <div className="flex items-center gap-3 mb-4">
                  <RefreshCw className={`w-6 h-6 ${theme.accentText}`} />
                  <h2 className={`text-lg font-semibold ${theme.text}`}>CBC Correction Options</h2>
                </div>
                
                <div className="space-y-4">
                  <p className={`text-sm ${theme.textMuted}`}>
                    Found {xmlValidation.doc_count} DocRefIds in the CBC file. Select the type of correction to generate.
                  </p>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={() => setCbcCorrectionType('correction')}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        cbcCorrectionType === 'correction'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                          : `${theme.border} hover:border-purple-300`
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FileEdit className={`w-6 h-6 ${cbcCorrectionType === 'correction' ? 'text-purple-600' : theme.textMuted}`} />
                        <div className="text-left">
                          <p className={`font-semibold ${theme.text}`}>Correction (OECD2)</p>
                          <p className={`text-sm ${theme.textMuted}`}>Modify existing CBC report data</p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => setCbcCorrectionType('deletion')}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        cbcCorrectionType === 'deletion'
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                          : `${theme.border} hover:border-red-300`
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Trash2 className={`w-6 h-6 ${cbcCorrectionType === 'deletion' ? 'text-red-600' : theme.textMuted}`} />
                        <div className="text-left">
                          <p className={`font-semibold ${theme.text}`}>Deletion (OECD3)</p>
                          <p className={`text-sm ${theme.textMuted}`}>Remove/void CBC report data</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CRS/FATCA Correction Options - Show for both modes when valid */}
            {activeModule !== 'cbc' && ((correctionDataMode === 'xml' && xmlValidation?.can_generate_correction) || (correctionDataMode === 'csv' && correctionCsvPreview)) && (
              <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
                <div className="flex items-center gap-3 mb-4">
                  <RefreshCw className={`w-6 h-6 ${theme.accentText}`} />
                  <h2 className={`text-lg font-semibold ${theme.text}`}>Correction Options</h2>
                </div>
                
                <div className="space-y-6">
                  {/* Correct FI */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium ${theme.text}`}>Correct Reporting FI</p>
                      <p className={`text-sm ${theme.textMuted}`}>Modify the Financial Institution data</p>
                    </div>
                    <button
                      onClick={() => setCorrectionOptions(prev => ({ ...prev, correctFI: !prev.correctFI }))}
                      className={`w-12 h-6 rounded-full transition-colors relative ${correctionOptions.correctFI ? 'bg-blue-600' : darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${correctionOptions.correctFI ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {/* Account Corrections */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Correct Individual */}
                    <div>
                      <label className={`block text-sm font-medium ${theme.textMuted} mb-2`}>
                        Correct Individual Accounts (max: {xmlValidation.individual_accounts})
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCorrectionOptions(prev => ({ ...prev, correctIndividual: Math.max(0, prev.correctIndividual - 1) }))}
                          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={xmlValidation.individual_accounts}
                          className={`w-20 px-3 py-2 rounded-lg border text-center ${theme.input}`}
                          value={correctionOptions.correctIndividual}
                          onChange={(e) => setCorrectionOptions(prev => ({ 
                            ...prev, 
                            correctIndividual: Math.min(xmlValidation.individual_accounts - prev.deleteIndividual, Math.max(0, parseInt(e.target.value) || 0))
                          }))}
                        />
                        <button
                          onClick={() => setCorrectionOptions(prev => ({ 
                            ...prev, 
                            correctIndividual: Math.min(xmlValidation.individual_accounts - prev.deleteIndividual, prev.correctIndividual + 1)
                          }))}
                          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Correct Organisation */}
                    <div>
                      <label className={`block text-sm font-medium ${theme.textMuted} mb-2`}>
                        Correct Organisation Accounts (max: {xmlValidation.organisation_accounts})
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCorrectionOptions(prev => ({ ...prev, correctOrganisation: Math.max(0, prev.correctOrganisation - 1) }))}
                          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={xmlValidation.organisation_accounts}
                          className={`w-20 px-3 py-2 rounded-lg border text-center ${theme.input}`}
                          value={correctionOptions.correctOrganisation}
                          onChange={(e) => setCorrectionOptions(prev => ({ 
                            ...prev, 
                            correctOrganisation: Math.min(xmlValidation.organisation_accounts - prev.deleteOrganisation, Math.max(0, parseInt(e.target.value) || 0))
                          }))}
                        />
                        <button
                          onClick={() => setCorrectionOptions(prev => ({ 
                            ...prev, 
                            correctOrganisation: Math.min(xmlValidation.organisation_accounts - prev.deleteOrganisation, prev.correctOrganisation + 1)
                          }))}
                          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Delete Individual */}
                    <div>
                      <label className={`block text-sm font-medium ${theme.textMuted} mb-2`}>
                        Delete Individual Accounts
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCorrectionOptions(prev => ({ ...prev, deleteIndividual: Math.max(0, prev.deleteIndividual - 1) }))}
                          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={xmlValidation.individual_accounts}
                          className={`w-20 px-3 py-2 rounded-lg border text-center ${theme.input}`}
                          value={correctionOptions.deleteIndividual}
                          onChange={(e) => setCorrectionOptions(prev => ({ 
                            ...prev, 
                            deleteIndividual: Math.min(xmlValidation.individual_accounts - prev.correctIndividual, Math.max(0, parseInt(e.target.value) || 0))
                          }))}
                        />
                        <button
                          onClick={() => setCorrectionOptions(prev => ({ 
                            ...prev, 
                            deleteIndividual: Math.min(xmlValidation.individual_accounts - prev.correctIndividual, prev.deleteIndividual + 1)
                          }))}
                          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Delete Organisation */}
                    <div>
                      <label className={`block text-sm font-medium ${theme.textMuted} mb-2`}>
                        Delete Organisation Accounts
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCorrectionOptions(prev => ({ ...prev, deleteOrganisation: Math.max(0, prev.deleteOrganisation - 1) }))}
                          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={xmlValidation.organisation_accounts}
                          className={`w-20 px-3 py-2 rounded-lg border text-center ${theme.input}`}
                          value={correctionOptions.deleteOrganisation}
                          onChange={(e) => setCorrectionOptions(prev => ({ 
                            ...prev, 
                            deleteOrganisation: Math.min(xmlValidation.organisation_accounts - prev.correctOrganisation, Math.max(0, parseInt(e.target.value) || 0))
                          }))}
                        />
                        <button
                          onClick={() => setCorrectionOptions(prev => ({ 
                            ...prev, 
                            deleteOrganisation: Math.min(xmlValidation.organisation_accounts - prev.correctOrganisation, prev.deleteOrganisation + 1)
                          }))}
                          className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Modification Options */}
                  <div className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-lg p-4`}>
                    <p className={`text-sm font-medium ${theme.text} mb-3`}>What to modify in corrections:</p>
                    <div className="flex flex-wrap gap-4">
                      {[
                        { key: 'modifyBalance', label: 'Account Balance' },
                        { key: 'modifyAddress', label: 'Address' },
                        { key: 'modifyName', label: 'Name' }
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={correctionOptions[key]}
                            onChange={(e) => setCorrectionOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`text-sm ${theme.text}`}>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Test Mode Toggle */}
                  <div className={`${darkMode ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'} rounded-lg p-4 border`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${theme.text}`}>Test Mode</p>
                        <p className={`text-sm ${theme.textMuted}`}>
                          {correctionOptions.testMode 
                            ? 'Using OECD11/12/13 (test data indicators)' 
                            : 'Using OECD1/2/3 (production data indicators)'}
                        </p>
                      </div>
                      <button
                        onClick={() => setCorrectionOptions(prev => ({ ...prev, testMode: !prev.testMode }))}
                        className={`w-12 h-6 rounded-full transition-colors relative ${correctionOptions.testMode ? 'bg-amber-500' : darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${correctionOptions.testMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Output Section */}
            {xmlValidation?.can_generate_correction && (
              <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 border-l-primary-500`}>
                <div className="flex items-center gap-3 mb-4">
                  <Save className={`w-6 h-6 ${darkMode ? 'text-primary-400' : 'text-primary-600'}`} />
                  <h2 className={`text-lg font-semibold ${theme.text}`}>Output</h2>
                </div>
                
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    className={`flex-1 px-4 py-3 rounded-lg border ${theme.input}`}
                    placeholder="Select output location..."
                    value={correctionOutputPath}
                    readOnly
                  />
                  <button
                    onClick={handleSelectCorrectionOutput}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <FolderOpen className="w-4 h-4" />
                    Browse
                  </button>
                </div>

                <button
                  onClick={handleGenerateCorrection}
                  disabled={isGeneratingCorrection || !correctionOutputPath}
                  className={`w-full px-6 py-4 bg-gradient-to-r ${
                    activeModule === 'cbc' 
                      ? 'from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600' 
                      : 'from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600'
                  } disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl`}
                >
                  {isGeneratingCorrection ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating {activeModule === 'cbc' ? 'CBC' : activeModule === 'fatca' ? 'FATCA' : 'CRS702'} Correction...</span>
                    </>
                  ) : (
                    <>
                      <FileEdit className="w-5 h-5" />
                      <span>Generate {activeModule === 'cbc' ? 'CBC' : activeModule === 'fatca' ? 'FATCA' : 'CRS702'} Correction File</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tools Page (CRS only) */}
        {currentPage === 'tools' && activeModule === 'crs' && (
          <div className={`space-y-6 ${settings.animationsEnabled ? 'animate-fade-in' : ''}`}>
            {/* Country Code Replacer */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm border-l-4 ${theme.accent ? 'border-l-current' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <RefreshCw className={`w-6 h-6 ${theme.accentText}`} />
                <div>
                  <h2 className={`text-lg font-semibold ${theme.text}`}>Country Code Replacer</h2>
                  <p className={`text-sm ${theme.textMuted}`}>Replace account holder country codes with your allowed partner jurisdictions</p>
                </div>
              </div>
              
              {/* Info Banner */}
              <div className={`${darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 mb-6`}>
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                      This tool will replace all <strong>ResCountryCode</strong> values in account holder records with countries from your Partner Jurisdictions settings.
                      Countries not in your allowed list will be mapped to allowed ones.
                    </p>
                    <p className={`text-xs ${theme.accentText} mt-2`}>
                      Current allowed countries: <strong>{settings.partnerJurisdictions?.join(', ') || 'None configured'}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Source XML File */}
                <div>
                  <label className={`block text-sm font-medium ${theme.text} mb-2`}>Source CRS XML File</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className={`flex-1 px-4 py-3 rounded-lg border ${theme.input}`}
                      placeholder="Select CRS XML file..."
                      value={countryReplacerXmlPath}
                      readOnly
                    />
                    <button
                      onClick={async () => {
                        const filePath = await window.electronAPI.selectXmlFile()
                        if (filePath) setCountryReplacerXmlPath(filePath)
                      }}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <FolderOpen className="w-4 h-4" />
                      Browse
                    </button>
                  </div>
                </div>

                {/* Output Path */}
                <div>
                  <label className={`block text-sm font-medium ${theme.text} mb-2`}>Output File</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className={`flex-1 px-4 py-3 rounded-lg border ${theme.input}`}
                      placeholder="Select output location..."
                      value={countryReplacerOutputPath}
                      readOnly
                    />
                    <button
                      onClick={async () => {
                        const filePath = await window.electronAPI.selectCorrectionOutput('crs')
                        if (filePath) setCountryReplacerOutputPath(filePath)
                      }}
                      className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                        darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <FolderOpen className="w-4 h-4" />
                      Browse
                    </button>
                  </div>
                </div>

                {/* Test Mode Toggle */}
                <div className={`${darkMode ? 'bg-purple-900/30 border-purple-700' : 'bg-purple-50 border-purple-200'} border rounded-lg p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className={`w-5 h-5 ${theme.accentText}`} />
                      <div>
                        <p className={`font-medium ${theme.text}`}>Convert to Test Mode</p>
                        <p className={`text-xs ${theme.textMuted}`}>
                          Changes DocTypeIndic: OECD1→OECD11, OECD2→OECD12, OECD3→OECD13
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setConvertToTestMode(!convertToTestMode)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${convertToTestMode ? theme.toggleOn : darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${convertToTestMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>

                {/* Replace Button */}
                <button
                  onClick={handleReplaceCountryCodes}
                  disabled={isReplacingCountries || !countryReplacerXmlPath || !countryReplacerOutputPath}
                  className={`w-full px-6 py-4 ${theme.buttonPrimary} disabled:opacity-50 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl`}
                >
                  {isReplacingCountries ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing File...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      <span>Process CRS File</span>
                    </>
                  )}
                </button>

                {/* Result */}
                {countryReplacerResult && (
                  <div className={`${darkMode ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'} border rounded-lg p-4 mt-4`}>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className={`font-medium ${darkMode ? 'text-green-300' : 'text-green-800'}`}>Replacement Complete</span>
                    </div>
                    
                    {/* DocTypeIndic Conversion Notice */}
                    {countryReplacerResult.docTypeIndicConverted && (
                      <div className={`${darkMode ? 'bg-purple-900/30 border-purple-700' : 'bg-purple-50 border-purple-200'} border rounded-lg p-3 mb-3`}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-500" />
                          <span className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                            <strong>DocTypeIndic</strong> converted to test mode: {countryReplacerResult.originalDocTypeIndicValues.map((v, i) => `${v}→${countryReplacerResult.newDocTypeIndicValues[i]}`).join(', ')}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* ReportingFI Fix Notice */}
                    {countryReplacerResult.reportingFIFixed && (
                      <div className={`${darkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-3 mb-3`}>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          <span className={`text-sm ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                            <strong>ReportingFI.ResCountryCode</strong> fixed: {countryReplacerResult.originalReportingFICountry} → {countryReplacerResult.messageSendingCountry} (must match SendingCountry)
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className={`${theme.textMuted}`}>Original Countries Found:</p>
                        <p className={`font-mono ${theme.text}`}>{countryReplacerResult.originalCountries.join(', ')}</p>
                      </div>
                      <div>
                        <p className={`${theme.textMuted}`}>Countries Replaced:</p>
                        <p className={`font-mono ${theme.text}`}>{countryReplacerResult.replacedCountries.length > 0 ? countryReplacerResult.replacedCountries.join(', ') : 'None (all already allowed)'}</p>
                      </div>
                    </div>
                    {Object.keys(countryReplacerResult.replacements).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-green-300 dark:border-green-700">
                        <p className={`text-sm ${theme.textMuted} mb-2`}>Account Holder Replacement Map:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(countryReplacerResult.replacements).map(([from, to]) => (
                            <span key={from} className={`px-2 py-1 rounded text-xs font-mono ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                              {from} → {to}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History Page */}
        {currentPage === 'history' && (
          <div className={`space-y-6 ${settings.animationsEnabled ? 'animate-fade-in' : ''}`}>
            {/* Stats Overview */}
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: 'XML Generated', value: globalStats.totalXmlGenerated, icon: FileText, color: 'primary' },
                { label: 'Corrections', value: globalStats.totalCorrectionsGenerated || 0, icon: FileEdit, color: 'orange' },
                { label: 'CSV Uploaded', value: globalStats.totalCsvUploaded, icon: Upload, color: 'green' },
                { label: 'CSV Downloaded', value: globalStats.totalCsvDownloaded, icon: Download, color: 'blue' },
                { label: 'Validation Errors', value: globalStats.totalValidationErrors, icon: AlertCircle, color: 'red' }
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className={`${theme.card} rounded-xl border p-4 shadow-sm`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs ${theme.textMuted}`}>{label}</p>
                      <p className={`text-2xl font-bold ${theme.text}`}>{value}</p>
                    </div>
                    <Icon className={`w-8 h-8 text-${color}-500 opacity-50`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed Stats */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-4`}>Account Statistics</h3>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <p className={`text-3xl font-bold ${theme.text}`}>{(globalStats.totalIndividualAccounts + globalStats.totalOrganisationAccounts).toLocaleString()}</p>
                  <p className={`text-sm ${theme.textMuted}`}>Total Accounts</p>
                </div>
                <div className="text-center">
                  <p className={`text-3xl font-bold text-blue-500`}>{globalStats.totalIndividualAccounts.toLocaleString()}</p>
                  <p className={`text-sm ${theme.textMuted}`}>Individual</p>
                </div>
                <div className="text-center">
                  <p className={`text-3xl font-bold text-purple-500`}>{globalStats.totalOrganisationAccounts.toLocaleString()}</p>
                  <p className={`text-sm ${theme.textMuted}`}>Organisation</p>
                </div>
              </div>
              {globalStats.lastGenerated && (
                <p className={`text-xs ${theme.textMuted} mt-4 text-center`}>
                  Last generated: {new Date(globalStats.lastGenerated).toLocaleString()}
                </p>
              )}
            </div>

            {/* File History */}
            <div className={`${theme.card} rounded-xl border shadow-sm overflow-hidden`}>
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${theme.text}`}>File History</h3>
                <div className="flex gap-2">
                  {fileHistory.length > 0 && (
                    <button
                      onClick={() => { if (confirm('Clear all history?')) clearAllHistory() }}
                      className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => { if (confirm('Reset all statistics?')) resetAllStats() }}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${
                      darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Reset Stats
                  </button>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {fileHistory.length > 0 ? (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {fileHistory.map((entry) => (
                      <div key={entry.id} className={`px-6 py-4 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {entry.type === 'xml' ? (
                              <FileText className="w-5 h-5 text-primary-500" />
                            ) : (
                              <Table className="w-5 h-5 text-green-500" />
                            )}
                            <div>
                              <p className={`font-medium ${theme.text}`}>{entry.fileName}</p>
                              <p className={`text-xs ${theme.textMuted}`}>
                                {entry.accounts} accounts • {new Date(entry.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              entry.mode === 'csv' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 
                              entry.mode === 'preview' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 
                              'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                            }`}>
                              {entry.mode === 'csv' ? 'CSV' : entry.mode === 'preview' ? 'Preview' : 'Random'}
                            </span>
                            <button
                              onClick={() => window.electronAPI.openFileLocation(entry.filePath)}
                              className={`p-2 ${theme.accentText} ${theme.cardHover} rounded-lg transition-colors`}
                            >
                              <FolderOpen className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteHistoryEntry(entry.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <History className={`w-12 h-12 mx-auto mb-3 ${theme.textMuted} opacity-50`} />
                    <p className={theme.textMuted}>No files generated yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings Page */}
        {currentPage === 'settings' && (
          <div className={`space-y-6 ${settings.animationsEnabled ? 'animate-fade-in' : ''}`}>
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`text-lg font-semibold ${theme.text}`}>Theme</h3>
                <button
                  onClick={() => setLiveAnimations(!liveAnimations)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    liveAnimations 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                  title={liveAnimations ? 'Click to disable live animations' : 'Click to enable live animations'}
                >
                  <span className="text-lg">{liveAnimations ? '✨' : '🎬'}</span>
                  <span className="text-sm">{liveAnimations ? 'Live Animations ON' : 'Live Animations OFF'}</span>
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-6">Choose your preferred color scheme</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { key: 'light', name: 'Light', icon: '☀️', dark: false },
                  { key: 'dark', name: 'Dark', icon: '🌙', dark: true },
                  { key: 'midnight', name: 'Midnight', icon: '🌌', dark: true },
                  { key: 'ocean', name: 'Ocean', icon: '🌊', dark: true },
                  { key: 'sunset', name: 'Sunset', icon: '🌅', dark: false },
                  { key: 'forest', name: 'Forest', icon: '🌲', dark: true },
                  { key: 'lavender', name: 'Lavender', icon: '💜', dark: false },
                  { key: 'spaceGalaxy', name: 'Space Galaxy', icon: '🚀', dark: true },
                  { key: 'cyberpunkNeon', name: 'Cyberpunk', icon: '⚡', dark: true },
                  { key: 'organicForest', name: 'Organic Forest', icon: '🌿', dark: false },
                  { key: 'oceanUnderwater', name: 'Ocean Depths', icon: '🐠', dark: true },
                  { key: 'steampunkVictorian', name: 'Steampunk', icon: '⚙️', dark: false },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setSelectedTheme(item.key)}
                    className={`relative rounded-xl overflow-hidden transition-all duration-200 ${
                      selectedTheme === item.key 
                        ? 'ring-2 ring-offset-2 ring-blue-500 border-2 border-blue-500' 
                        : 'border-2 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {/* Animated Preview */}
                    <div className={`h-32 relative overflow-hidden ${item.dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
                      {/* Ocean */}
                      {item.key === 'ocean' && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-b from-cyan-700/40 to-blue-800/50" />
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="absolute text-2xl" style={{ left: `${15 + i * 30}%`, top: `${40 + i * 5}%`, animation: `float-bob ${3 + i}s ease-in-out infinite` }}>🐠</div>
                          ))}
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xl opacity-70">🌊</div>
                        </>
                      )}
                      {/* Forest */}
                      {item.key === 'forest' && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-b from-green-800/30 to-green-900/40" />
                          <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-green-600/50 to-transparent" />
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="absolute text-3xl opacity-80" style={{ left: `${i * 35}%`, bottom: '5px', animation: `wave-motion ${2 + i}s ease-in-out infinite` }}>🌳</div>
                          ))}
                          <div className="absolute top-2 right-2 text-lg">🦅</div>
                        </>
                      )}
                      {/* Sunset */}
                      {item.key === 'sunset' && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-amber-300/40 to-rose-300/40" />
                          <div className="absolute top-3 left-3 w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 shadow-lg" />
                          <div className="absolute top-2 right-2 text-3xl opacity-80">🌈</div>
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="absolute w-0.5 h-16 bg-gradient-to-b from-yellow-300/40 to-transparent" style={{ left: `${30 + i * 15}%`, top: '15px', transform: `rotate(${-30 + i * 30}deg)` }} />
                          ))}
                        </>
                      )}
                      {/* Lavender */}
                      {item.key === 'lavender' && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-300/40 to-pink-300/40" />
                          {[...Array(6)].map((_, i) => (
                            <div key={i} className="absolute text-lg" style={{ left: `${10 + i * 15}%`, top: `${10 + i * 12}%`, animation: `twinkle ${2 + i * 0.3}s ease-in-out infinite` }}>✨</div>
                          ))}
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-2xl">🌸</div>
                          <div className="absolute top-1/2 right-2 text-xl opacity-70">🦋</div>
                        </>
                      )}
                      {/* Midnight */}
                      {item.key === 'midnight' && (
                        <>
                          <div className="absolute inset-0 bg-[#0f0f23]" />
                          {[...Array(15)].map((_, i) => (
                            <div key={i} className="absolute w-1 h-1 bg-white rounded-full" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: 0.8, animation: `twinkle ${2 + Math.random()}s ease-in-out infinite` }} />
                          ))}
                          <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 overflow-hidden shadow-lg">
                            <div className="absolute -right-1.5 top-0 w-8 h-8 rounded-full bg-[#0f0f23]" />
                          </div>
                        </>
                      )}
                      {/* Space Galaxy */}
                      {item.key === 'spaceGalaxy' && (
                        <>
                          <div className="absolute inset-0 bg-[#0a0e27]" />
                          {[...Array(20)].map((_, i) => (
                            <div key={i} className="absolute w-1 h-1 rounded-full" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, background: i % 3 === 0 ? '#00d9ff' : i % 3 === 1 ? '#ff006e' : '#fff', opacity: 0.9, animation: `twinkle ${1 + Math.random()}s ease-in-out infinite` }} />
                          ))}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl transform -rotate-45 drop-shadow-[0_0_8px_rgba(0,217,255,0.8)]">🚀</div>
                          <div className="absolute bottom-2 right-2 text-xl opacity-70">🪐</div>
                        </>
                      )}
                      {/* Cyberpunk */}
                      {item.key === 'cyberpunkNeon' && (
                        <>
                          <div className="absolute inset-0 bg-[#0a0a0a]" />
                          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,0,110,0.4) 1px, transparent 1px)', backgroundSize: '15px 15px', opacity: 0.3 }} />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl" style={{ textShadow: '0 0 15px #ff006e, 0 0 30px #ff006e' }}>⚡</div>
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-40" style={{ top: `${30 + i * 20}%` }} />
                          ))}
                        </>
                      )}
                      {/* Organic Forest */}
                      {item.key === 'organicForest' && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-green-200/30 to-emerald-200/30" />
                          <div className="absolute bottom-0 left-0 w-full h-10 bg-gradient-to-t from-blue-400/40 to-transparent" />
                          <div className="absolute bottom-3 left-1/4 text-2xl" style={{ animation: 'float-bob 3s ease-in-out infinite' }}>🦢</div>
                          <div className="absolute bottom-3 right-1/4 text-2xl">🦚</div>
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="absolute text-lg opacity-60" style={{ left: `${20 + i * 30}%`, bottom: '10px' }}>🌾</div>
                          ))}
                        </>
                      )}
                      {/* Ocean Depths */}
                      {item.key === 'oceanUnderwater' && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-b from-cyan-800/50 to-indigo-950/60" />
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="absolute text-xl" style={{ left: `${20 + i * 30}%`, top: `${30 + i * 15}%`, animation: `float-bob ${3 + i}s ease-in-out infinite` }}>🐠</div>
                          ))}
                          <div className="absolute bottom-1 left-1/3 text-xl">🪸</div>
                          <div className="absolute top-1/4 right-1/4 text-lg opacity-60" style={{ animation: 'float-bob 4s ease-in-out infinite' }}>🪼</div>
                        </>
                      )}
                      {/* Steampunk */}
                      {item.key === 'steampunkVictorian' && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-amber-800/40 to-orange-900/40" />
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="absolute text-2xl opacity-50" style={{ left: `${15 + i * 30}%`, top: `${15 + i * 20}%`, animation: `gear-rotate ${5 + i * 2}s linear infinite`, color: '#b87333' }}>⚙️</div>
                          ))}
                          <div className="absolute bottom-2 left-2 text-lg opacity-60">💨</div>
                          <div className="absolute bottom-2 right-2 text-lg opacity-50">🕯️</div>
                        </>
                      )}
                      {/* Light */}
                      {item.key === 'light' && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-indigo-500/30" />
                          <div className="absolute top-2 right-2 text-3xl">☀️</div>
                        </>
                      )}
                      {/* Dark */}
                      {item.key === 'dark' && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-700/40 to-indigo-900/50" />
                          <div className="absolute top-2 right-2 text-3xl">🌙</div>
                          {[...Array(8)].map((_, i) => (
                            <div key={i} className="absolute w-0.5 h-0.5 bg-white rounded-full" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: 0.6 }} />
                          ))}
                        </>
                      )}
                    </div>
                    <div className={`py-2.5 px-2 text-center ${item.dark ? 'bg-gray-800' : 'bg-white'}`}>
                      <span className="mr-1">{item.icon}</span>
                      <span className={`font-medium text-sm ${item.dark ? 'text-white' : 'text-gray-900'}`}>{item.name}</span>
                    </div>
                    {selectedTheme === item.key && (
                      <div className="absolute top-1.5 right-1.5 bg-blue-500 rounded-full p-0.5">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-6`}>Appearance</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${theme.text}`}>Animations</p>
                    <p className={`text-sm ${theme.textMuted}`}>Enable smooth transitions and animations</p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, animationsEnabled: !prev.animationsEnabled }))}
                    className={`w-12 h-6 rounded-full transition-all relative ${settings.animationsEnabled ? theme.toggleOn : theme.toggleOff}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${settings.animationsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Language Settings */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>Language</h3>
              <p className={`text-sm ${theme.textMuted} mb-6`}>Choose your preferred language for the application</p>
              
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(LANGUAGES).map(([code, lang]) => (
                  <button
                    key={code}
                    onClick={() => setLanguage(code)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                      language === code
                        ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                        : `${theme.border} hover:border-gray-500 ${theme.card}`
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <div className="text-left">
                      <p className={`font-medium ${theme.text}`}>{lang.nativeName}</p>
                      <p className={`text-xs ${theme.textMuted}`}>{lang.name}</p>
                    </div>
                    {language === code && (
                      <CheckCircle2 className="w-5 h-5 text-blue-500 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-6`}>CSV Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${theme.text}`}>Auto-validate CSV</p>
                    <p className={`text-sm ${theme.textMuted}`}>Automatically validate CSV files when selected</p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, autoValidateCsv: !prev.autoValidateCsv }))}
                    className={`w-12 h-6 rounded-full transition-all relative ${settings.autoValidateCsv ? theme.toggleOn : theme.toggleOff}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${settings.autoValidateCsv ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Partner Jurisdictions Settings */}
            <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>Partner Jurisdictions</h3>
              <p className={`text-sm ${theme.textMuted} mb-4`}>
                Manage which country codes are valid for your CRS reporting. Only selected countries will be used when generating test data.
              </p>
              
              {/* Search and Add */}
              <div className="relative mb-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.textMuted}`} />
                    <input
                      type="text"
                      value={jurisdictionSearch}
                      onChange={(e) => {
                        setJurisdictionSearch(e.target.value)
                        setShowJurisdictionDropdown(true)
                      }}
                      onFocus={() => setShowJurisdictionDropdown(true)}
                      placeholder="Search countries by name or code..."
                      className={`w-full pl-10 pr-4 py-2 rounded-lg border ${theme.input} ${theme.text}`}
                    />
                  </div>
                </div>
                
                {/* Dropdown */}
                {showJurisdictionDropdown && jurisdictionSearch && (
                  <div className={`absolute z-10 w-full mt-1 ${theme.card} border rounded-lg shadow-lg max-h-60 overflow-y-auto`}>
                    {searchCountries(jurisdictionSearch)
                      .filter(c => !settings.partnerJurisdictions?.includes(c.code))
                      .slice(0, 10)
                      .map(country => (
                        <button
                          key={country.code}
                          onClick={() => {
                            setSettings(prev => ({
                              ...prev,
                              partnerJurisdictions: [...(prev.partnerJurisdictions || []), country.code].sort()
                            }))
                            setJurisdictionSearch('')
                            setShowJurisdictionDropdown(false)
                          }}
                          className={`w-full px-4 py-2 text-left ${theme.cardHover} flex items-center justify-between ${theme.text}`}
                        >
                          <span>{country.name}</span>
                          <span className={`text-sm font-mono ${theme.textMuted}`}>{country.code}</span>
                        </button>
                      ))}
                    {searchCountries(jurisdictionSearch).filter(c => !settings.partnerJurisdictions?.includes(c.code)).length === 0 && (
                      <div className={`px-4 py-2 ${theme.textMuted}`}>No countries found or all matching countries already added</div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Selected Jurisdictions */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${theme.text}`}>
                    Selected Countries ({settings.partnerJurisdictions?.length || 0})
                  </span>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, partnerJurisdictions: DEFAULT_PARTNER_JURISDICTIONS }))}
                    className={`text-sm ${theme.accentText} hover:opacity-80`}
                  >
                    Reset to Default
                  </button>
                </div>
                <div className={`flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 border rounded-lg ${theme.card}`}>
                  {(settings.partnerJurisdictions || []).sort().map(code => (
                    <span
                      key={code}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${theme.badge}`}
                    >
                      <span className="font-medium">{getCountryName(code)}</span>
                      <span className="text-xs font-mono opacity-60">{code}</span>
                      <button
                        onClick={() => setSettings(prev => ({
                          ...prev,
                          partnerJurisdictions: prev.partnerJurisdictions.filter(c => c !== code)
                        }))}
                        className="ml-1 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {(!settings.partnerJurisdictions || settings.partnerJurisdictions.length === 0) && (
                    <span className={`${theme.textMuted} text-sm`}>No countries selected</span>
                  )}
                </div>
              </div>
            </div>

            <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-6`}>About</h3>
              <div className={`text-sm ${theme.textMuted} space-y-2`}>
                <p><strong>CRS Test Data Generator</strong></p>
                <p>Version 1.0.0</p>
                <p>Generate compliant CRS XML test files for development and testing.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${theme.card} rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden ${settings.animationsEnabled ? 'animate-slide-up' : ''}`}>
            <div className={`p-6 ${modalType === 'success' ? theme.buttonSuccess : theme.buttonDanger}`}>
              <div className="flex items-center gap-3">
                {modalType === 'success' ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                <h3 className="text-xl font-bold">{modalType === 'success' ? 'Success' : 'Error'}</h3>
              </div>
            </div>
            <div className="p-6">
              <p className={`${theme.text} whitespace-pre-line`}>{modalMessage}</p>
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => setShowModal(false)}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  modalType === 'success' ? theme.buttonSuccess : theme.buttonDanger
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* XML Validation Errors Modal */}
      {showXmlErrorsModal && xmlValidation?.errors?.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${theme.card} rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col ${settings.animationsEnabled ? 'animate-slide-up' : ''}`}>
            <div className={`p-6 ${theme.buttonDanger} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8" />
                <div>
                  <h3 className="text-xl font-bold">XML Validation Errors</h3>
                  <p className="text-red-100 text-sm">{xmlValidation.errors.length} error{xmlValidation.errors.length > 1 ? 's' : ''} found</p>
                </div>
              </div>
              <button onClick={() => setShowXmlErrorsModal(false)} className="p-2 hover:bg-white/20 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-2">
              {xmlValidation.errors.map((error, i) => (
                <div key={i} className={`${darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'} border rounded-lg p-3 text-sm ${theme.text}`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowXmlErrorsModal(false)}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Validation Error Modal */}
      {showValidationModal && validationErrors.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${theme.card} rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col ${settings.animationsEnabled ? 'animate-slide-up' : ''}`}>
            <div className="p-6 bg-red-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8" />
                <div>
                  <h3 className="text-xl font-bold">Validation Errors</h3>
                  <p className="text-red-100 text-sm">{validationErrors.length} error{validationErrors.length > 1 ? 's' : ''} found</p>
                </div>
              </div>
              <button onClick={() => setShowValidationModal(false)} className="p-2 hover:bg-white/20 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-2">
              {validationErrors.map((error, i) => (
                <div key={i} className={`${darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'} border rounded-lg p-3 text-sm ${theme.text}`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowValidationModal(false)}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Preview Modal */}
      {showPreviewModal && csvPreviewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${theme.card} rounded-2xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col ${settings.animationsEnabled ? 'animate-slide-up' : ''}`}>
            <div className="p-6 bg-green-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Table className="w-8 h-8" />
                <div>
                  <h3 className="text-xl font-bold">CSV Preview</h3>
                  <p className="text-green-100 text-sm">{csvPreviewData.preview_rows?.length || 0} of {csvPreviewData.total_rows || 0} rows</p>
                </div>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="p-2 hover:bg-white/20 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {csvPreviewData.preview_rows?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border-collapse">
                    <thead>
                      <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                        {csvPreviewData.columns?.slice(0, 12).map((col, i) => (
                          <th key={i} className={`border ${darkMode ? 'border-gray-600' : 'border-gray-300'} px-2 py-1 text-left font-semibold ${theme.text} whitespace-nowrap`}>
                            {col.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreviewData.preview_rows.map((row, i) => (
                        <tr key={i} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                          {csvPreviewData.columns?.slice(0, 12).map((col, j) => (
                            <td key={j} className={`border ${darkMode ? 'border-gray-600' : 'border-gray-300'} px-2 py-1 ${theme.text} whitespace-nowrap`}>
                              {row[col] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={theme.textMuted}>No data to preview</p>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={handleDownloadCsv}
                className={`px-6 py-3 ${theme.buttonSuccess} font-semibold rounded-lg flex items-center gap-2`}
              >
                <Download className="w-5 h-5" />
                Download Full CSV
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
                className={`flex-1 py-3 rounded-lg font-semibold ${theme.buttonSecondary}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CRS701 CSV Template Preview Modal */}
      {showCrs701CsvPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${theme.card} rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col ${settings.animationsEnabled ? 'animate-slide-up' : ''}`}>
            <div className={`p-6 ${theme.buttonSuccess} rounded-t-2xl`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Table className="w-8 h-8" />
                  <h3 className="text-xl font-bold">CRS 701 CSV Template</h3>
                </div>
                <button onClick={() => setShowCrs701CsvPreview(false)} className="hover:opacity-80 p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className={`${darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'} border rounded-lg p-4 mb-4`}>
                <p className={`font-medium ${darkMode ? 'text-green-300' : 'text-green-800'} mb-2`}>CRS 701 - New Account Report</p>
                <p className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                  Use this template to create CSV files for generating CRS 701 (new account) XML reports. 
                  Each row represents one account holder. You can have multiple accounts per Reporting FI.
                </p>
              </div>
              
              <h4 className={`font-medium ${theme.text} mb-2`}>Required Columns</h4>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <th className={`px-3 py-2 text-left font-medium ${theme.text} border`}>Column</th>
                      <th className={`px-3 py-2 text-left font-medium ${theme.text} border`}>Description</th>
                      <th className={`px-3 py-2 text-left font-medium ${theme.text} border`}>Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>SendingCompanyIN</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Your company TIN/identifier</td><td className={`px-3 py-2 border ${theme.textMuted}`}>NL123456789</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>TransmittingCountry</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>2-letter country code of sender</td><td className={`px-3 py-2 border ${theme.textMuted}`}>NL</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>ReceivingCountry</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>2-letter country code of receiver</td><td className={`px-3 py-2 border ${theme.textMuted}`}>DE</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>TaxYear</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Reporting tax year</td><td className={`px-3 py-2 border ${theme.textMuted}`}>2024</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>ReportingFI_*</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Reporting Financial Institution details</td><td className={`px-3 py-2 border ${theme.textMuted}`}>TIN, Name, Address</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>AccountNumber</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Account identifier</td><td className={`px-3 py-2 border ${theme.textMuted}`}>ACC123456</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>AccountBalance</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Account balance amount</td><td className={`px-3 py-2 border ${theme.textMuted}`}>50000.00</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>AccountCurrency</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>3-letter currency code</td><td className={`px-3 py-2 border ${theme.textMuted}`}>EUR</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>Individual_*</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Individual account holder fields</td><td className={`px-3 py-2 border ${theme.textMuted}`}>FirstName, LastName, BirthDate, TIN, Address</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>Organisation_*</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Organisation account holder fields</td><td className={`px-3 py-2 border ${theme.textMuted}`}>Name, TIN, Address</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>ControllingPerson_*</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Required for Organisation accounts</td><td className={`px-3 py-2 border ${theme.textMuted}`}>FirstName, LastName, BirthDate</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>Payment_Type</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>CRS501, CRS502, CRS503, or CRS504</td><td className={`px-3 py-2 border ${theme.textMuted}`}>CRS501</td></tr>
                  </tbody>
                </table>
              </div>

              <div className={`${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 mb-4`}>
                <p className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-800'} mb-2`}>Individual vs Organisation</p>
                <p className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                  Each row must have either <strong>Individual_*</strong> fields OR <strong>Organisation_*</strong> fields filled in, not both.
                  Organisation accounts require a Controlling Person.
                </p>
              </div>

              <h4 className={`font-medium ${theme.text} mb-2`}>Example Rows</h4>
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-4 overflow-x-auto font-mono text-xs`}>
                <pre className={theme.textMuted}>{`SendingCompanyIN,TransmittingCountry,ReceivingCountry,TaxYear,ReportingFI_TIN,ReportingFI_Name,...
"NL123456789","NL","DE","2024","FI001","Bank ABC","Main St","10","Amsterdam","1012AB","NL",...
"NL123456789","NL","DE","2024","FI001","Bank ABC","Main St","10","Amsterdam","1012AB","NL",...`}</pre>
              </div>
            </div>
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={async () => {
                  await handleDownloadTemplate()
                  setShowCrs701CsvPreview(false)
                }}
                className={`px-6 py-3 ${theme.buttonSuccess} font-semibold rounded-lg flex items-center gap-2`}
              >
                <Download className="w-5 h-5" />
                Download Template
              </button>
              <button
                onClick={() => setShowCrs701CsvPreview(false)}
                className={`flex-1 py-3 rounded-lg font-semibold ${theme.buttonSecondary}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Correction CSV Template Modal */}
      {showCorrectionCsvPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`${theme.card} rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col ${settings.animationsEnabled ? 'animate-slide-up' : ''}`}>
            <div className="p-6 bg-orange-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Table className="w-8 h-8" />
                  <h3 className="text-xl font-bold">Correction CSV Template</h3>
                </div>
                <button onClick={() => setShowCorrectionCsvPreview(false)} className="hover:bg-orange-700 p-2 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className={`${darkMode ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'} border rounded-lg p-4 mb-4`}>
                <p className={`font-medium ${darkMode ? 'text-amber-300' : 'text-amber-800'} mb-2`}>Important: DocRefId Column</p>
                <p className={`text-sm ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                  The <strong>DocRefId</strong> column must contain valid document reference IDs from your original CRS701 file. 
                  These IDs are used to identify which accounts to correct or delete.
                </p>
              </div>
              
              <h4 className={`font-medium ${theme.text} mb-2`}>Required Columns</h4>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <th className={`px-3 py-2 text-left font-medium ${theme.text} border`}>Column</th>
                      <th className={`px-3 py-2 text-left font-medium ${theme.text} border`}>Description</th>
                      <th className={`px-3 py-2 text-left font-medium ${theme.text} border`}>Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>DocRefId</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Original document reference ID to correct/delete</td><td className={`px-3 py-2 border text-green-500`}>Yes</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>Action</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>"correct" or "delete"</td><td className={`px-3 py-2 border text-green-500`}>Yes</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>AccountNumber</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>New account number (for corrections)</td><td className={`px-3 py-2 border ${theme.textMuted}`}>For corrections</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>AccountBalance</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>New balance amount</td><td className={`px-3 py-2 border ${theme.textMuted}`}>For corrections</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>AccountCurrency</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Currency code (EUR, USD, etc.)</td><td className={`px-3 py-2 border ${theme.textMuted}`}>For corrections</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>Individual_*</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Individual account holder fields</td><td className={`px-3 py-2 border ${theme.textMuted}`}>For individual corrections</td></tr>
                    <tr><td className={`px-3 py-2 border ${theme.text}`}><code>Organisation_*</code></td><td className={`px-3 py-2 border ${theme.textMuted}`}>Organisation account holder fields</td><td className={`px-3 py-2 border ${theme.textMuted}`}>For organisation corrections</td></tr>
                  </tbody>
                </table>
              </div>

              <h4 className={`font-medium ${theme.text} mb-2`}>Example Rows</h4>
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg p-4 overflow-x-auto font-mono text-xs`}>
                <pre className={theme.textMuted}>{`DocRefId,Action,AccountBalance,AccountCurrency
"NL2024FI001_ACC001","correct","75000.00","EUR"
"NL2024FI001_ACC002","delete","","" 
"NL2024FI001_ACC003","correct","120000.00","USD"`}</pre>
              </div>
            </div>
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={async () => {
                  await window.electronAPI.downloadCorrectionCsvTemplate()
                  setShowCorrectionCsvPreview(false)
                }}
                className={`px-6 py-3 ${theme.buttonSuccess} font-semibold rounded-lg flex items-center gap-2`}
              >
                <Download className="w-5 h-5" />
                Download Template
              </button>
              <button
                onClick={() => setShowCorrectionCsvPreview(false)}
                className={`flex-1 py-3 rounded-lg font-semibold ${theme.buttonSecondary}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals for new features - Simplified versions */}
      {showDashboard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDashboard(false)}>
          <div className={`w-full max-w-4xl max-h-[85vh] overflow-y-auto mx-4 p-6 rounded-xl shadow-2xl ${theme.card} border ${theme.border}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 className={`w-6 h-6 ${theme.accentText}`} />
                <h2 className={`text-xl font-semibold ${theme.text}`}>Dashboard</h2>
              </div>
              <button
                onClick={() => setShowDashboard(false)}
                className={`p-2 rounded-lg ${theme.buttonSecondary} hover:opacity-80`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Statistics Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border ${theme.border} ${theme.card}`}>
                  <p className={`text-sm ${theme.textMuted}`}>Total Files Generated</p>
                  <p className={`text-3xl font-bold ${theme.text} mt-2`}>{globalStats?.totalXmlGenerated || 0}</p>
                </div>
                <div className={`p-4 rounded-lg border ${theme.border} ${theme.card}`}>
                  <p className={`text-sm ${theme.textMuted}`}>Total Accounts</p>
                  <p className={`text-3xl font-bold ${theme.text} mt-2`}>{globalStats?.totalAccounts || 0}</p>
                </div>
                <div className={`p-4 rounded-lg border ${theme.border} ${theme.card}`}>
                  <p className={`text-sm ${theme.textMuted}`}>Total Corrections</p>
                  <p className={`text-3xl font-bold ${theme.text} mt-2`}>{globalStats?.totalCorrections || 0}</p>
                </div>
                <div className={`p-4 rounded-lg border ${theme.border} ${theme.card}`}>
                  <p className={`text-sm ${theme.textMuted}`}>Validation Errors</p>
                  <p className={`text-3xl font-bold ${theme.text} mt-2`}>{globalStats?.totalValidationErrors || 0}</p>
                </div>
              </div>
              
              {/* Module Breakdown */}
              <div className={`p-4 rounded-lg border ${theme.border} ${theme.card}`}>
                <h3 className={`text-lg font-semibold ${theme.text} mb-4`}>By Module</h3>
                <div className="space-y-3">
                  {['CRS', 'FATCA', 'CBC'].map((mod) => {
                    const count = globalStats?.byModule?.[mod.toLowerCase()] || 0;
                    const total = globalStats?.totalXmlGenerated || 1;
                    const percentage = Math.round((count / total) * 100) || 0;
                    return (
                      <div key={mod}>
                        <div className="flex justify-between mb-1">
                          <span className={`text-sm font-medium ${theme.text}`}>{mod}</span>
                          <span className={`text-sm ${theme.textMuted}`}>{count} files ({percentage}%)</span>
                        </div>
                        <div className={`h-2 rounded-full overflow-hidden ${theme.bg}`}>
                          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBatchProcessor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBatchProcessor(false)}>
          <div className={`w-full max-w-3xl max-h-[85vh] overflow-y-auto mx-4 p-6 rounded-xl shadow-2xl ${theme.card} border ${theme.border}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Layers className={`w-6 h-6 ${theme.accentText}`} />
                <h2 className={`text-xl font-semibold ${theme.text}`}>Batch Processing</h2>
              </div>
              <button
                onClick={() => setShowBatchProcessor(false)}
                className={`p-2 rounded-lg ${theme.buttonSecondary} hover:opacity-80`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className={`text-center py-12 ${theme.textMuted}`}>
              <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Batch Processing</p>
              <p className="text-sm">This feature allows you to process multiple files at once.</p>
              <p className="text-sm mt-4">Coming soon with full implementation!</p>
            </div>
          </div>
        </div>
      )}

      {showXMLDiff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowXMLDiff(false)}>
          <div className={`w-full max-w-4xl max-h-[85vh] overflow-y-auto mx-4 p-6 rounded-xl shadow-2xl ${theme.card} border ${theme.border}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <ArrowLeftRight className={`w-6 h-6 ${theme.accentText}`} />
                <h2 className={`text-xl font-semibold ${theme.text}`}>XML Comparison</h2>
              </div>
              <button
                onClick={() => setShowXMLDiff(false)}
                className={`p-2 rounded-lg ${theme.buttonSecondary} hover:opacity-80`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className={`text-center py-12 ${theme.textMuted}`}>
              <ArrowLeftRight className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">XML File Comparison</p>
              <p className="text-sm">Compare two XML files side-by-side to identify differences.</p>
              <p className="text-sm mt-4">Coming soon with full diff viewer!</p>
            </div>
          </div>
        </div>
      )}

      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowKeyboardShortcuts(false)}>
          <div className={`w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4 p-6 rounded-xl shadow-2xl ${theme.card} border ${theme.border}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Keyboard className={`w-6 h-6 ${theme.accentText}`} />
                <h2 className={`text-xl font-semibold ${theme.text}`}>Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                className={`p-2 rounded-lg ${theme.buttonSecondary} hover:opacity-80`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className={`text-sm font-semibold ${theme.textMuted} mb-3`}>Navigation</h3>
                <div className="space-y-2">
                  <div className={`flex justify-between items-center p-3 rounded-lg ${theme.bg}`}>
                    <span className={`text-sm ${theme.text}`}>Go to Home</span>
                    <kbd className={`px-3 py-1 text-xs font-mono rounded ${theme.buttonSecondary}`}>Ctrl+H</kbd>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-lg ${theme.bg}`}>
                    <span className={`text-sm ${theme.text}`}>Go to Settings</span>
                    <kbd className={`px-3 py-1 text-xs font-mono rounded ${theme.buttonSecondary}`}>Ctrl+,</kbd>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-lg ${theme.bg}`}>
                    <span className={`text-sm ${theme.text}`}>Escape / Close</span>
                    <kbd className={`px-3 py-1 text-xs font-mono rounded ${theme.buttonSecondary}`}>Esc</kbd>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className={`text-sm font-semibold ${theme.textMuted} mb-3`}>Modules</h3>
                <div className="space-y-2">
                  <div className={`flex justify-between items-center p-3 rounded-lg ${theme.bg}`}>
                    <span className={`text-sm ${theme.text}`}>Select CRS</span>
                    <kbd className={`px-3 py-1 text-xs font-mono rounded ${theme.buttonSecondary}`}>Ctrl+1</kbd>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-lg ${theme.bg}`}>
                    <span className={`text-sm ${theme.text}`}>Select FATCA</span>
                    <kbd className={`px-3 py-1 text-xs font-mono rounded ${theme.buttonSecondary}`}>Ctrl+2</kbd>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-lg ${theme.bg}`}>
                    <span className={`text-sm ${theme.text}`}>Select CBC</span>
                    <kbd className={`px-3 py-1 text-xs font-mono rounded ${theme.buttonSecondary}`}>Ctrl+3</kbd>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className={`text-sm font-semibold ${theme.textMuted} mb-3`}>Other</h3>
                <div className="space-y-2">
                  <div className={`flex justify-between items-center p-3 rounded-lg ${theme.bg}`}>
                    <span className={`text-sm ${theme.text}`}>Toggle Theme</span>
                    <kbd className={`px-3 py-1 text-xs font-mono rounded ${theme.buttonSecondary}`}>Ctrl+T</kbd>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-lg ${theme.bg}`}>
                    <span className={`text-sm ${theme.text}`}>Show This Help</span>
                    <kbd className={`px-3 py-1 text-xs font-mono rounded ${theme.buttonSecondary}`}>Shift+?</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Wrap App with providers
function AppWithProviders() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default AppWithProviders
