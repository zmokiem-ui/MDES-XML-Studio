import { Loader2, CheckCircle2, X } from 'lucide-react'

export function UpdateBanner({ updateStatus, updateInfo, updateProgress, dismissed, onDismiss }) {
  if (dismissed) return null

  if (updateStatus === 'downloading') {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-2 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">
              Downloading update v{updateInfo?.version}... {updateProgress}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-48 h-2 bg-blue-400 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${updateProgress}%` }} />
            </div>
            <button onClick={onDismiss} className="p-1 hover:bg-blue-500 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (updateStatus === 'ready') {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white px-4 py-2 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">
              Update v{updateInfo?.version} is ready! Restart to apply.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.electronAPI?.installUpdate()}
              className="px-4 py-1 bg-white text-green-700 rounded-lg text-sm font-semibold hover:bg-green-50 transition-colors"
            >
              Restart Now
            </button>
            <button onClick={onDismiss} className="p-1 hover:bg-green-500 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
