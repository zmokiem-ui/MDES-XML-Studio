import React, { useState, useEffect } from 'react'

// Fade In transition
export function FadeIn({ children, delay = 0, duration = 300, className = '' }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={`transition-all ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {children}
    </div>
  )
}

// Slide In transition
export function SlideIn({ children, direction = 'left', delay = 0, duration = 300, className = '' }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const transforms = {
    left: 'translateX(-20px)',
    right: 'translateX(20px)',
    up: 'translateY(-20px)',
    down: 'translateY(20px)'
  }

  return (
    <div
      className={`transition-all ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translate(0)' : transforms[direction],
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {children}
    </div>
  )
}

// Scale In transition
export function ScaleIn({ children, delay = 0, duration = 300, className = '' }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={`transition-all ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.95)',
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {children}
    </div>
  )
}

// Stagger children animation
export function StaggerChildren({ children, staggerDelay = 50, className = '' }) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <FadeIn delay={index * staggerDelay} key={index}>
          {child}
        </FadeIn>
      ))}
    </div>
  )
}

// Page transition wrapper
export function PageTransition({ children, className = '' }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  return (
    <div
      className={`transition-all duration-300 ${className}`}
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)'
      }}
    >
      {children}
    </div>
  )
}

// Collapse/Expand transition
export function Collapse({ isOpen, children, className = '' }) {
  const [height, setHeight] = useState(isOpen ? 'auto' : '0px')
  const [overflow, setOverflow] = useState(isOpen ? 'visible' : 'hidden')

  useEffect(() => {
    if (isOpen) {
      setHeight('auto')
      setTimeout(() => setOverflow('visible'), 300)
    } else {
      setOverflow('hidden')
      setHeight('0px')
    }
  }, [isOpen])

  return (
    <div
      className={`transition-all duration-300 ease-in-out ${className}`}
      style={{ height, overflow }}
    >
      {children}
    </div>
  )
}

export default { FadeIn, SlideIn, ScaleIn, StaggerChildren, PageTransition, Collapse }
