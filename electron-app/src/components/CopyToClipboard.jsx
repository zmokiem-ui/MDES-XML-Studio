import React, { useState, useCallback } from 'react'
import { Copy, Check, Clipboard } from 'lucide-react'

// Copy to Clipboard Button
export function CopyButton({ 
  text, 
  onCopy,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label = 'Copy',
  successLabel = 'Copied!',
  className = '' 
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      onCopy?.()
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const sizes = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  const variants = {
    default: 'bg-gray-700 hover:bg-gray-600 text-gray-300',
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    ghost: 'hover:bg-gray-700 text-gray-400 hover:text-gray-200',
    success: 'bg-green-600 hover:bg-green-700 text-white'
  }

  return (
    <button
      onClick={handleCopy}
      className={`
        inline-flex items-center gap-1.5 rounded-lg transition-all duration-200
        ${sizes[size]}
        ${copied ? 'bg-green-600 text-white' : variants[variant]}
        ${className}
      `}
      title={copied ? successLabel : label}
    >
      {copied ? (
        <Check className={iconSizes[size]} />
      ) : (
        <Copy className={iconSizes[size]} />
      )}
      {showLabel && (
        <span className="text-sm font-medium">
          {copied ? successLabel : label}
        </span>
      )}
    </button>
  )
}

// Copy XML Button with preview
export function CopyXMLButton({ 
  xml, 
  fileName,
  onCopy,
  className = '' 
}) {
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(xml)
      setCopied(true)
      onCopy?.()
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const lineCount = xml?.split('\n').length || 0
  const charCount = xml?.length || 0

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleCopy}
        onMouseEnter={() => setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-all duration-200
          ${copied 
            ? 'bg-green-600 text-white' 
            : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
          }
        `}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Copied to Clipboard!
          </>
        ) : (
          <>
            <Clipboard className="w-4 h-4" />
            Copy XML
          </>
        )}
      </button>

      {/* Preview tooltip */}
      {showPreview && !copied && xml && (
        <div className="absolute bottom-full left-0 mb-2 w-80 p-3 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-300">{fileName || 'XML Content'}</span>
            <span className="text-xs text-gray-500">{lineCount} lines • {(charCount / 1024).toFixed(1)} KB</span>
          </div>
          <pre className="text-xs text-gray-400 font-mono overflow-hidden max-h-32 whitespace-pre-wrap">
            {xml.substring(0, 500)}
            {xml.length > 500 && '...'}
          </pre>
        </div>
      )}
    </div>
  )
}

// Inline copy field (for TINs, IDs, etc.)
export function CopyField({ 
  value, 
  label,
  className = '' 
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs text-gray-500 mb-1">{label}</label>
      )}
      <div 
        onClick={handleCopy}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
          transition-all duration-200
          ${copied 
            ? 'bg-green-500/20 border border-green-500/50' 
            : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
          }
        `}
      >
        <span className={`flex-1 font-mono text-sm truncate ${copied ? 'text-green-400' : 'text-gray-300'}`}>
          {value}
        </span>
        {copied ? (
          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
        ) : (
          <Copy className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}
      </div>
    </div>
  )
}

// Hook for clipboard operations
export function useClipboard() {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return true
    } catch (err) {
      console.error('Failed to copy:', err)
      return false
    }
  }, [])

  const paste = useCallback(async () => {
    try {
      return await navigator.clipboard.readText()
    } catch (err) {
      console.error('Failed to paste:', err)
      return null
    }
  }, [])

  return { copy, paste, copied }
}

export default { CopyButton, CopyXMLButton, CopyField, useClipboard }
