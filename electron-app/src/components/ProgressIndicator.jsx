import React, { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

// Circular Progress Indicator
export function CircularProgress({ progress = 0, size = 60, strokeWidth = 4, className = '' }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-blue-500 transition-all duration-300"
        />
      </svg>
      <span className="absolute text-sm font-semibold text-gray-200">
        {Math.round(progress)}%
      </span>
    </div>
  )
}

// Linear Progress Bar
export function LinearProgress({ 
  progress = 0, 
  showLabel = true, 
  size = 'md',
  color = 'blue',
  animated = true,
  className = '' 
}) {
  const heights = { sm: 'h-1', md: 'h-2', lg: 'h-3' }
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500'
  }

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-xs text-gray-400">Progress</span>
          <span className="text-xs font-medium text-gray-300">{Math.round(progress)}%</span>
        </div>
      )}
      <div className={`w-full ${heights[size]} bg-gray-700 rounded-full overflow-hidden`}>
        <div
          className={`${heights[size]} ${colors[color]} rounded-full transition-all duration-300 ${animated ? 'relative overflow-hidden' : ''}`}
          style={{ width: `${progress}%` }}
        >
          {animated && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          )}
        </div>
      </div>
    </div>
  )
}

// Generation Progress Component with steps
export function GenerationProgress({ 
  steps = [], 
  currentStep = 0, 
  progress = 0,
  status = 'running', // 'running' | 'success' | 'error'
  className = '' 
}) {
  return (
    <div className={`p-4 rounded-xl bg-gray-800/50 border border-gray-700 ${className}`}>
      {/* Overall progress */}
      <div className="flex items-center gap-4 mb-4">
        {status === 'running' && (
          <div className="relative">
            <CircularProgress progress={progress} size={50} strokeWidth={3} />
          </div>
        )}
        {status === 'success' && (
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          </div>
        )}
        {status === 'error' && (
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-200">
            {status === 'running' && 'Generating...'}
            {status === 'success' && 'Generation Complete!'}
            {status === 'error' && 'Generation Failed'}
          </p>
          <p className="text-xs text-gray-400">
            {status === 'running' && `Step ${currentStep + 1} of ${steps.length}`}
            {status === 'success' && 'All files generated successfully'}
            {status === 'error' && 'An error occurred during generation'}
          </p>
        </div>
      </div>

      {/* Steps list */}
      {steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div 
              key={index}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                index < currentStep ? 'bg-green-500/10' :
                index === currentStep ? 'bg-blue-500/10' :
                'bg-gray-800/30'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                index < currentStep ? 'bg-green-500 text-white' :
                index === currentStep ? 'bg-blue-500 text-white' :
                'bg-gray-700 text-gray-400'
              }`}>
                {index < currentStep ? '✓' : index + 1}
              </div>
              <span className={`text-sm ${
                index <= currentStep ? 'text-gray-200' : 'text-gray-500'
              }`}>
                {step}
              </span>
              {index === currentStep && status === 'running' && (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin ml-auto" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Simple inline progress with ETA
export function InlineProgress({ progress = 0, startTime, className = '' }) {
  const [eta, setEta] = useState('')

  useEffect(() => {
    if (startTime && progress > 0 && progress < 100) {
      const elapsed = Date.now() - startTime
      const estimated = (elapsed / progress) * (100 - progress)
      const seconds = Math.round(estimated / 1000)
      
      if (seconds < 60) {
        setEta(`~${seconds}s remaining`)
      } else {
        setEta(`~${Math.round(seconds / 60)}m remaining`)
      }
    } else if (progress >= 100) {
      setEta('Complete!')
    } else {
      setEta('Calculating...')
    }
  }, [progress, startTime])

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LinearProgress progress={progress} showLabel={false} size="sm" className="flex-1" />
      <span className="text-xs text-gray-400 min-w-[100px] text-right">{eta}</span>
    </div>
  )
}

// Add shimmer animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .animate-shimmer {
      animation: shimmer 1.5s infinite;
    }
  `
  if (!document.querySelector('#progress-styles')) {
    style.id = 'progress-styles'
    document.head.appendChild(style)
  }
}

export default { CircularProgress, LinearProgress, GenerationProgress, InlineProgress }
