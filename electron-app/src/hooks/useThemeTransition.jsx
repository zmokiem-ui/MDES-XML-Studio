import { useState, useEffect, useCallback } from 'react'

// Hook for smooth theme transitions
export function useThemeTransition(initialTheme = 'dark') {
  const [theme, setTheme] = useState(initialTheme)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Apply transition class to body
  useEffect(() => {
    // Add transition styles to document
    const style = document.createElement('style')
    style.id = 'theme-transition-styles'
    style.textContent = `
      .theme-transitioning * {
        transition: background-color 0.3s ease, 
                    border-color 0.3s ease, 
                    color 0.3s ease,
                    box-shadow 0.3s ease !important;
      }
    `
    
    if (!document.querySelector('#theme-transition-styles')) {
      document.head.appendChild(style)
    }

    return () => {
      const existingStyle = document.querySelector('#theme-transition-styles')
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

  const changeTheme = useCallback((newTheme) => {
    if (newTheme === theme) return

    // Start transition
    setIsTransitioning(true)
    document.body.classList.add('theme-transitioning')

    // Change theme after a small delay to ensure transition class is applied
    requestAnimationFrame(() => {
      setTheme(newTheme)
      
      // Remove transition class after animation completes
      setTimeout(() => {
        document.body.classList.remove('theme-transitioning')
        setIsTransitioning(false)
      }, 350)
    })
  }, [theme])

  const toggleTheme = useCallback(() => {
    changeTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, changeTheme])

  return {
    theme,
    setTheme: changeTheme,
    toggleTheme,
    isTransitioning,
    isDark: theme === 'dark'
  }
}

// Animated theme toggle button component
export function ThemeToggleButton({ 
  isDark, 
  onToggle, 
  size = 'md',
  className = '' 
}) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <button
      onClick={onToggle}
      className={`
        relative rounded-full overflow-hidden
        transition-all duration-300 ease-out
        ${isDark 
          ? 'bg-gray-700 hover:bg-gray-600' 
          : 'bg-amber-100 hover:bg-amber-200'
        }
        ${sizes[size]}
        ${className}
      `}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun icon */}
      <div
        className={`
          absolute inset-0 flex items-center justify-center
          transition-all duration-300 ease-out
          ${isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}
        `}
      >
        <svg className={`${iconSizes[size]} text-amber-500`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
        </svg>
      </div>
      
      {/* Moon icon */}
      <div
        className={`
          absolute inset-0 flex items-center justify-center
          transition-all duration-300 ease-out
          ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}
        `}
      >
        <svg className={`${iconSizes[size]} text-blue-300`} fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
        </svg>
      </div>
    </button>
  )
}

export default { useThemeTransition, ThemeToggleButton }
