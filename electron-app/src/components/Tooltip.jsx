import React, { useState, useRef, useEffect } from 'react'

export function Tooltip({ 
  children, 
  content, 
  position = 'top',
  delay = 200,
  className = '' 
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef(null)
  const tooltipRef = useRef(null)
  const timeoutRef = useRef(null)

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      
      let x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
      let y = 0

      switch (position) {
        case 'top':
          y = triggerRect.top - tooltipRect.height - 8
          break
        case 'bottom':
          y = triggerRect.bottom + 8
          break
        case 'left':
          x = triggerRect.left - tooltipRect.width - 8
          y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
          break
        case 'right':
          x = triggerRect.right + 8
          y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
          break
      }

      // Keep tooltip within viewport
      x = Math.max(8, Math.min(x, window.innerWidth - tooltipRect.width - 8))
      y = Math.max(8, Math.min(y, window.innerHeight - tooltipRect.height - 8))

      setCoords({ x, y })
    }
  }, [isVisible, position])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  if (!content) return children

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className={`inline-block ${className}`}
      >
        {children}
      </span>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] px-3 py-2 text-sm text-gray-200 bg-gray-800 rounded-lg shadow-xl border border-gray-700 pointer-events-none animate-fadeIn"
          style={{ left: coords.x, top: coords.y }}
        >
          {content}
          <div 
            className={`absolute w-2 h-2 bg-gray-800 border-gray-700 transform rotate-45 ${
              position === 'top' ? 'bottom-[-5px] left-1/2 -translate-x-1/2 border-r border-b' :
              position === 'bottom' ? 'top-[-5px] left-1/2 -translate-x-1/2 border-l border-t' :
              position === 'left' ? 'right-[-5px] top-1/2 -translate-y-1/2 border-t border-r' :
              'left-[-5px] top-1/2 -translate-y-1/2 border-b border-l'
            }`}
          />
        </div>
      )}
    </>
  )
}

export default Tooltip
