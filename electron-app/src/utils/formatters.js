// Utility functions for formatting values

// Format file size
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i]
}

// Format number with commas
export function formatNumber(num) {
  if (num === null || num === undefined) return '0'
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// Format date relative (e.g., "2 hours ago")
export function formatRelativeTime(date) {
  if (!date) return ''
  
  const now = new Date()
  const past = new Date(date)
  const diffMs = now - past
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return past.toLocaleDateString()
}

// Format date as ISO string (YYYY-MM-DD)
export function formatDateISO(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

// Format date as readable string
export function formatDateReadable(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format duration in ms to readable string
export function formatDuration(ms) {
  if (!ms || ms < 0) return '0s'
  
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

// Truncate string with ellipsis
export function truncate(str, maxLength = 50) {
  if (!str) return ''
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - 3) + '...'
}

// Get file name from path
export function getFileName(path) {
  if (!path) return ''
  return path.split(/[/\\]/).pop() || path
}

// Get file extension
export function getFileExtension(path) {
  if (!path) return ''
  const parts = path.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

// Capitalize first letter
export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Convert camelCase to Title Case
export function camelToTitle(str) {
  if (!str) return ''
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim()
}

// Pluralize word
export function pluralize(count, singular, plural) {
  return count === 1 ? singular : (plural || singular + 's')
}

// Format percentage
export function formatPercentage(value, decimals = 0) {
  if (value === null || value === undefined) return '0%'
  return value.toFixed(decimals) + '%'
}

export default {
  formatFileSize,
  formatNumber,
  formatRelativeTime,
  formatDateISO,
  formatDateReadable,
  formatDuration,
  truncate,
  getFileName,
  getFileExtension,
  capitalize,
  camelToTitle,
  pluralize,
  formatPercentage
}
