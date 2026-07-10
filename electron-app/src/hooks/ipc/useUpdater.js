import { useState, useEffect } from 'react'

// Auto-update state + electron-updater IPC event wiring, extracted from App.jsx.
// The single choke point for update status/progress/errors and the
// check-for-updates / auto-update-toggle actions.
export function useUpdater() {
  const [updateStatus, setUpdateStatus] = useState('idle') // idle, checking, available, downloading, ready, error
  const [updateInfo, setUpdateInfo] = useState(null)
  const [updateProgress, setUpdateProgress] = useState(0)
  const [updateError, setUpdateError] = useState(null)
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true)
  const [appVersion, setAppVersion] = useState('')
  const [updateBannerDismissed, setUpdateBannerDismissed] = useState(false)

  useEffect(() => {
    if (!window.electronAPI) return

    // Load version and update settings
    window.electronAPI.getAppVersion().then(v => setAppVersion(v))
    window.electronAPI.getUpdateSettings().then(s => setAutoUpdateEnabled(s.autoUpdateEnabled))

    // Listen for update events
    const unsubscribeUpdateEvents = [
      window.electronAPI.onUpdateChecking(() => {
        setUpdateStatus('checking')
        setUpdateError(null)
      }),
      window.electronAPI.onUpdateAvailable((info) => {
        setUpdateStatus('downloading')
        setUpdateInfo(info)
        setUpdateBannerDismissed(false)
      }),
      window.electronAPI.onUpdateNotAvailable(() => {
        setUpdateStatus('idle')
      }),
      window.electronAPI.onDownloadProgress((progress) => {
        setUpdateProgress(Math.round(progress.percent || 0))
      }),
      window.electronAPI.onUpdateDownloaded((info) => {
        setUpdateStatus('ready')
        setUpdateInfo(info)
        setUpdateBannerDismissed(false)
      }),
      window.electronAPI.onUpdateError((msg) => {
        setUpdateStatus('error')
        setUpdateError(msg)
      }),
    ].filter(Boolean)

    return () => {
      unsubscribeUpdateEvents.forEach((unsubscribe) => unsubscribe())
    }
  }, [])

  const handleCheckForUpdates = async () => {
    setUpdateStatus('checking')
    setUpdateError(null)
    const result = await window.electronAPI?.checkForUpdates()
    if (result && !result.success) {
      setUpdateStatus('error')
      setUpdateError(result.error)
    }
  }

  const handleToggleAutoUpdate = async (enabled) => {
    setAutoUpdateEnabled(enabled)
    await window.electronAPI?.setUpdateSettings({ autoUpdateEnabled: enabled })
  }

  return {
    updateStatus,
    updateInfo,
    updateProgress,
    updateError,
    autoUpdateEnabled,
    appVersion,
    updateBannerDismissed,
    setUpdateBannerDismissed,
    handleCheckForUpdates,
    handleToggleAutoUpdate,
  }
}
