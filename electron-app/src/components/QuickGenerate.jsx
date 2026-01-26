import React, { useState, useEffect } from 'react'
import { Zap, Clock, ChevronRight, Settings, RotateCcw } from 'lucide-react'

// Hook to manage last used settings
export function useLastSettings(module) {
  const storageKey = `lastSettings_${module}`
  
  const getLastSettings = () => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }
  
  const saveSettings = (settings) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        ...settings,
        timestamp: Date.now()
      }))
    } catch (e) {
      console.error('Failed to save settings:', e)
    }
  }
  
  const clearSettings = () => {
    localStorage.removeItem(storageKey)
  }
  
  return { getLastSettings, saveSettings, clearSettings }
}

// Quick Generate Button Component
export function QuickGenerateButton({ 
  module = 'crs',
  onGenerate,
  disabled = false,
  className = ''
}) {
  const { getLastSettings } = useLastSettings(module)
  const [lastSettings, setLastSettings] = useState(null)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    setLastSettings(getLastSettings())
  }, [module])

  const handleQuickGenerate = () => {
    if (lastSettings && onGenerate) {
      onGenerate(lastSettings)
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  if (!lastSettings) {
    return null
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleQuickGenerate}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          bg-gradient-to-r from-amber-500 to-orange-500 
          hover:from-amber-600 hover:to-orange-600
          text-white shadow-lg shadow-amber-500/25
          transition-all duration-200 hover:scale-105
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        `}
      >
        <Zap className="w-4 h-4" />
        Quick Generate
      </button>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Last used {formatTime(lastSettings.timestamp)}</span>
          </div>
          <div className="text-sm text-gray-200">
            {lastSettings.individualAccounts !== undefined && (
              <p>• {lastSettings.individualAccounts} Individual accounts</p>
            )}
            {lastSettings.organisationAccounts !== undefined && (
              <p>• {lastSettings.organisationAccounts} Organisation accounts</p>
            )}
            {lastSettings.sendingCountry && (
              <p>• From: {lastSettings.sendingCountry}</p>
            )}
            {lastSettings.receivingCountry && (
              <p>• To: {lastSettings.receivingCountry}</p>
            )}
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800 border-r border-b border-gray-700"></div>
        </div>
      )}
    </div>
  )
}

// Quick Generate Panel (for sidebar or home page)
export function QuickGeneratePanel({ 
  modules = ['crs', 'fatca', 'cbc'],
  onGenerate,
  theme = {},
  className = ''
}) {
  const [recentSettings, setRecentSettings] = useState({})

  useEffect(() => {
    const settings = {}
    modules.forEach(module => {
      const { getLastSettings } = useLastSettings(module)
      settings[module] = getLastSettings()
    })
    setRecentSettings(settings)
  }, [])

  const hasAnySettings = Object.values(recentSettings).some(s => s !== null)

  if (!hasAnySettings) {
    return null
  }

  const moduleLabels = {
    crs: 'CRS',
    fatca: 'FATCA',
    cbc: 'CBC'
  }

  const moduleColors = {
    crs: 'from-blue-500 to-cyan-500',
    fatca: 'from-purple-500 to-pink-500',
    cbc: 'from-green-500 to-emerald-500'
  }

  return (
    <div className={`p-4 rounded-xl ${theme.card || 'bg-gray-800/50'} border ${theme.border || 'border-gray-700'} ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-5 h-5 text-amber-400" />
        <h3 className={`font-semibold ${theme.text || 'text-gray-200'}`}>Quick Generate</h3>
      </div>
      <p className={`text-xs mb-4 ${theme.textMuted || 'text-gray-400'}`}>
        Regenerate with your last used settings
      </p>
      
      <div className="space-y-2">
        {modules.map(module => {
          const settings = recentSettings[module]
          if (!settings) return null
          
          return (
            <button
              key={module}
              onClick={() => onGenerate?.(module, settings)}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg
                bg-gradient-to-r ${moduleColors[module]} bg-opacity-10
                hover:bg-opacity-20 transition-all duration-200
                border border-white/10
              `}
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${moduleColors[module]} flex items-center justify-center`}>
                <span className="text-xs font-bold text-white">{moduleLabels[module][0]}</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-200">{moduleLabels[module]}</p>
                <p className="text-xs text-gray-400">
                  {settings.individualAccounts || 0} ind. / {settings.organisationAccounts || 0} org.
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Clear settings button
export function ClearSettingsButton({ module, onClear, className = '' }) {
  const { clearSettings } = useLastSettings(module)
  
  const handleClear = () => {
    clearSettings()
    onClear?.()
  }
  
  return (
    <button
      onClick={handleClear}
      className={`flex items-center gap-1 text-xs text-gray-500 hover:text-gray-400 transition-colors ${className}`}
    >
      <RotateCcw className="w-3 h-3" />
      Clear saved settings
    </button>
  )
}

export default { QuickGenerateButton, QuickGeneratePanel, useLastSettings, ClearSettingsButton }
