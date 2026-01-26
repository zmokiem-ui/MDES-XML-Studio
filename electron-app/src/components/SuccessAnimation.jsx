import React, { useState, useEffect } from 'react'
import { CheckCircle2, FileText, Download } from 'lucide-react'

// Success checkmark animation
export function SuccessCheckmark({ size = 80, className = '' }) {
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Background circle */}
      <div 
        className={`absolute inset-0 rounded-full bg-green-500/20 transition-transform duration-500 ${animate ? 'scale-100' : 'scale-0'}`}
      />
      
      {/* Checkmark SVG */}
      <svg 
        viewBox="0 0 52 52" 
        className="absolute inset-0 w-full h-full"
      >
        <circle
          cx="26"
          cy="26"
          r="24"
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          className={`transition-all duration-500 ${animate ? 'opacity-100' : 'opacity-0'}`}
          style={{
            strokeDasharray: 150,
            strokeDashoffset: animate ? 0 : 150,
            transition: 'stroke-dashoffset 0.5s ease-out'
          }}
        />
        <path
          fill="none"
          stroke="#22c55e"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 27l8 8 16-16"
          style={{
            strokeDasharray: 50,
            strokeDashoffset: animate ? 0 : 50,
            transition: 'stroke-dashoffset 0.3s ease-out 0.3s'
          }}
        />
      </svg>
    </div>
  )
}

// Success modal/overlay for generation complete
export function GenerationSuccessOverlay({ 
  isVisible, 
  fileName, 
  fileSize,
  filePath,
  onClose,
  onOpenFile,
  onOpenFolder,
  theme = {}
}) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => setShow(true), 50)
    } else {
      setShow(false)
    }
  }, [isVisible])

  if (!isVisible) return null

  const formatSize = (bytes) => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${show ? 'bg-black/50' : 'bg-transparent'}`}
      onClick={onClose}
    >
      <div 
        className={`
          max-w-md w-full mx-4 p-8 rounded-2xl text-center
          transition-all duration-500 ease-out
          ${show ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}
          ${theme.card || 'bg-gray-900'} border ${theme.border || 'border-gray-700'}
          shadow-2xl
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* Success Animation */}
        <div className="flex justify-center mb-6">
          <SuccessCheckmark size={80} />
        </div>

        {/* Title */}
        <h2 className={`text-xl font-bold mb-2 ${theme.text || 'text-gray-100'}`}>
          Generation Complete!
        </h2>
        
        {/* File info */}
        <div className={`p-4 rounded-xl mb-6 ${theme.bg || 'bg-gray-800/50'}`}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span className={`font-medium truncate ${theme.text || 'text-gray-200'}`}>
              {fileName || 'output.xml'}
            </span>
          </div>
          {fileSize && (
            <p className={`text-sm ${theme.textMuted || 'text-gray-400'}`}>
              Size: {formatSize(fileSize)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onOpenFolder}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all hover:scale-[1.02] ${theme.buttonSecondary || 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
          >
            <Download className="w-4 h-4" />
            Open Folder
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/25"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// Inline success indicator
export function InlineSuccess({ message = 'Success!', className = '' }) {
  return (
    <div className={`flex items-center gap-2 text-green-400 animate-fadeIn ${className}`}>
      <CheckCircle2 className="w-4 h-4" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}

export default { SuccessCheckmark, GenerationSuccessOverlay, InlineSuccess }
