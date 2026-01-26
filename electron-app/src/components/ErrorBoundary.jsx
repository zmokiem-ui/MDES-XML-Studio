import React, { Component } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    
    // Log error to console for debugging
    console.error('Error Boundary caught an error:', error, errorInfo)
    
    // Could send to error tracking service here
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onGoHome) {
      this.props.onGoHome()
    }
  }

  render() {
    if (this.state.hasError) {
      const { fallback, theme = {} } = this.props
      
      // Custom fallback UI
      if (fallback) {
        return fallback(this.state.error, this.handleRetry)
      }

      // Default error UI
      return (
        <div className={`min-h-[400px] flex items-center justify-center p-8 ${theme.bg || 'bg-gray-900'}`}>
          <div className="max-w-md w-full text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            {/* Error Message */}
            <h2 className={`text-xl font-semibold mb-2 ${theme.text || 'text-gray-200'}`}>
              Something went wrong
            </h2>
            <p className={`text-sm mb-6 ${theme.textMuted || 'text-gray-400'}`}>
              An unexpected error occurred. Don't worry, your data is safe.
            </p>
            
            {/* Action Buttons */}
            <div className="flex justify-center gap-3 mb-6">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>
            
            {/* Error Details Toggle */}
            <button
              onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
              className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1 mx-auto"
            >
              <Bug className="w-3 h-3" />
              {this.state.showDetails ? 'Hide' : 'Show'} technical details
            </button>
            
            {/* Error Details */}
            {this.state.showDetails && (
              <div className="mt-4 p-4 bg-gray-800 rounded-lg text-left overflow-auto max-h-48">
                <p className="text-xs font-mono text-red-400 mb-2">
                  {this.state.error?.toString()}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-xs font-mono text-gray-500 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional wrapper for easier use
export function withErrorBoundary(WrappedComponent, options = {}) {
  return function WithErrorBoundary(props) {
    return (
      <ErrorBoundary {...options}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}

// Hook for error handling in functional components
export function useErrorHandler() {
  const [error, setError] = React.useState(null)
  
  const handleError = React.useCallback((err) => {
    console.error('Error caught by useErrorHandler:', err)
    setError(err)
  }, [])
  
  const clearError = React.useCallback(() => {
    setError(null)
  }, [])
  
  // Throw error to be caught by ErrorBoundary
  if (error) {
    throw error
  }
  
  return { handleError, clearError }
}

export default ErrorBoundary
