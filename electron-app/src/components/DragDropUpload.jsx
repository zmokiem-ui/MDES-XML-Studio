import React, { useState, useRef, useCallback } from 'react'
import { Upload, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react'

export function DragDropUpload({ 
  onFileSelect, 
  accept = '.csv,.xml',
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB default
  className = '',
  label = 'Drop files here or click to browse',
  sublabel = 'Supports CSV and XML files'
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState([])
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const validateFile = (file) => {
    const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase())
    const fileExt = '.' + file.name.split('.').pop().toLowerCase()
    
    if (!acceptedTypes.some(t => t === fileExt || t === '*')) {
      return `Invalid file type: ${fileExt}`
    }
    
    if (file.size > maxSize) {
      return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max ${maxSize / 1024 / 1024}MB)`
    }
    
    return null
  }

  const handleFiles = useCallback((fileList) => {
    const newFiles = Array.from(fileList)
    const validFiles = []
    let errorMsg = null

    for (const file of newFiles) {
      const validationError = validateFile(file)
      if (validationError) {
        errorMsg = validationError
        break
      }
      validFiles.push({
        file,
        name: file.name,
        size: file.size,
        type: file.type || file.name.split('.').pop()
      })
    }

    if (errorMsg) {
      setError(errorMsg)
      setTimeout(() => setError(null), 3000)
    } else {
      setError(null)
      setFiles(multiple ? [...files, ...validFiles] : validFiles)
      onFileSelect?.(multiple ? validFiles : validFiles[0])
    }
  }, [files, multiple, onFileSelect, accept, maxSize])

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleInputChange = (e) => {
    if (e.target.files?.length) {
      handleFiles(e.target.files)
    }
  }

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    onFileSelect?.(multiple ? newFiles : null)
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  return (
    <div className={className}>
      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200 ease-out
          ${isDragging 
            ? 'border-blue-500 bg-blue-500/10 scale-[1.02]' 
            : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/30'
          }
          ${error ? 'border-red-500 bg-red-500/5' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />
        
        <div className={`transition-transform duration-200 ${isDragging ? 'scale-110' : ''}`}>
          <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-blue-400' : 'text-gray-500'}`} />
        </div>
        
        <p className={`text-sm font-medium mb-1 ${isDragging ? 'text-blue-300' : 'text-gray-300'}`}>
          {isDragging ? 'Drop files here...' : label}
        </p>
        <p className="text-xs text-gray-500">{sublabel}</p>
        
        {error && (
          <div className="absolute inset-x-4 bottom-4 flex items-center gap-2 p-2 bg-red-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-300">{error}</span>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(index) }}
                className="p-1 rounded hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DragDropUpload
