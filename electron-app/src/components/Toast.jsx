import React, { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

// Toast Context
const ToastContext = createContext(null)

// Toast types with their styles
const TOAST_TYPES = {
  success: {
    icon: CheckCircle2,
    bgClass: 'bg-green-500/10 border-green-500/50',
    iconClass: 'text-green-500',
    titleClass: 'text-green-400'
  },
  error: {
    icon: XCircle,
    bgClass: 'bg-red-500/10 border-red-500/50',
    iconClass: 'text-red-500',
    titleClass: 'text-red-400'
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-amber-500/10 border-amber-500/50',
    iconClass: 'text-amber-500',
    titleClass: 'text-amber-400'
  },
  info: {
    icon: Info,
    bgClass: 'bg-blue-500/10 border-blue-500/50',
    iconClass: 'text-blue-500',
    titleClass: 'text-blue-400'
  }
}

// Individual Toast Component
function Toast({ id, type = 'info', title, message, duration = 4000, onClose }) {
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(100)
  const config = TOAST_TYPES[type] || TOAST_TYPES.info
  const Icon = config.icon

  useEffect(() => {
    if (duration > 0) {
      const startTime = Date.now()
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
        setProgress(remaining)
        
        if (remaining <= 0) {
          clearInterval(interval)
          handleClose()
        }
      }, 50)
      
      return () => clearInterval(interval)
    }
  }, [duration])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => onClose(id), 300)
  }

  return (
    <div 
      className={`
        relative overflow-hidden
        flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm
        shadow-lg min-w-[320px] max-w-[420px]
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        ${config.bgClass}
      `}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconClass}`} />
      
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`font-semibold text-sm ${config.titleClass}`}>{title}</p>
        )}
        {message && (
          <p className="text-sm text-gray-300 mt-0.5">{message}</p>
        )}
      </div>
      
      <button 
        onClick={handleClose}
        className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
      
      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <div 
            className={`h-full transition-all duration-50 ${config.iconClass.replace('text-', 'bg-')}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

// Toast Container Component
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onClose={removeToast} />
      ))}
    </div>
  )
}

// Toast Provider Component
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((options) => {
    const id = Date.now() + Math.random()
    const toast = { id, ...options }
    setToasts(prev => [...prev, toast])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback({
    success: (title, message, duration) => addToast({ type: 'success', title, message, duration }),
    error: (title, message, duration) => addToast({ type: 'error', title, message, duration }),
    warning: (title, message, duration) => addToast({ type: 'warning', title, message, duration }),
    info: (title, message, duration) => addToast({ type: 'info', title, message, duration }),
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default Toast
