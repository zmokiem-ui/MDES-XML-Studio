import { useState, useEffect, useCallback, useRef } from 'react'

// Debounce a value
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// Debounce a callback function
export function useDebouncedCallback(callback, delay = 300) {
  const timeoutRef = useRef(null)
  const callbackRef = useRef(callback)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args)
    }, delay)
  }, [delay])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

// Throttle a callback function
export function useThrottledCallback(callback, delay = 300) {
  const lastCallRef = useRef(0)
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const throttledCallback = useCallback((...args) => {
    const now = Date.now()
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now
      callbackRef.current(...args)
    }
  }, [delay])

  return throttledCallback
}

// Debounced input handler
export function useDebouncedInput(initialValue = '', delay = 300) {
  const [value, setValue] = useState(initialValue)
  const [debouncedValue, setDebouncedValue] = useState(initialValue)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  const handleChange = useCallback((e) => {
    const newValue = e.target ? e.target.value : e
    setValue(newValue)
  }, [])

  const reset = useCallback(() => {
    setValue(initialValue)
    setDebouncedValue(initialValue)
  }, [initialValue])

  return {
    value,
    debouncedValue,
    onChange: handleChange,
    setValue,
    reset,
    isDebouncing: value !== debouncedValue
  }
}

// Memoization hook with cache
export function useMemoizedCallback(callback, deps, cacheSize = 10) {
  const cacheRef = useRef(new Map())
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  return useCallback((...args) => {
    const key = JSON.stringify(args)
    
    if (cacheRef.current.has(key)) {
      return cacheRef.current.get(key)
    }

    const result = callbackRef.current(...args)
    
    // Limit cache size
    if (cacheRef.current.size >= cacheSize) {
      const firstKey = cacheRef.current.keys().next().value
      cacheRef.current.delete(firstKey)
    }
    
    cacheRef.current.set(key, result)
    return result
  }, deps)
}

export default { useDebounce, useDebouncedCallback, useThrottledCallback, useDebouncedInput, useMemoizedCallback }
