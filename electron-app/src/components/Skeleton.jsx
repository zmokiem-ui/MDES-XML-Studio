import React from 'react'

// Base Skeleton Component with shimmer animation
export function Skeleton({ className = '', variant = 'rectangular' }) {
  const baseClass = 'animate-pulse bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 bg-[length:200%_100%]'
  
  const variantClasses = {
    rectangular: 'rounded',
    circular: 'rounded-full',
    text: 'rounded h-4',
    button: 'rounded-lg h-10',
    card: 'rounded-xl',
  }

  return (
    <div 
      className={`${baseClass} ${variantClasses[variant] || variantClasses.rectangular} ${className}`}
      style={{ animation: 'shimmer 1.5s infinite' }}
    />
  )
}

// Skeleton for form fields
export function FormFieldSkeleton({ label = true }) {
  return (
    <div className="space-y-2">
      {label && <Skeleton className="h-4 w-24" />}
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}

// Skeleton for cards
export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" style={{ width: `${100 - i * 15}%` }} />
      ))}
    </div>
  )
}

// Skeleton for table rows
export function TableRowSkeleton({ columns = 4 }) {
  return (
    <div className="flex items-center gap-4 p-3 border-b border-gray-700">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  )
}

// Skeleton for stats cards
export function StatCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <Skeleton variant="circular" className="w-8 h-8" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-8 w-20 mb-1" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

// Skeleton for module selection cards
export function ModuleCardSkeleton() {
  return (
    <div className="p-6 rounded-2xl bg-gray-800/50 border border-gray-700 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" className="w-14 h-14" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}

// Skeleton for generation form
export function GenerationFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <FormFieldSkeleton />
        <FormFieldSkeleton />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <FormFieldSkeleton />
        <FormFieldSkeleton />
        <FormFieldSkeleton />
      </div>
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-12 flex-1 rounded-lg" />
        <Skeleton className="h-12 w-32 rounded-lg" />
      </div>
    </div>
  )
}

// Add shimmer keyframes to document
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `
  if (!document.querySelector('#skeleton-styles')) {
    style.id = 'skeleton-styles'
    document.head.appendChild(style)
  }
}

export default Skeleton
