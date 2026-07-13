import { useState, useEffect } from 'react'

// Auto-update state + electron-updater IPC event wiring, extracted from App.jsx.
// The single choke point for update status/progress/errors and the
// check-for-updates / auto-update-toggle actions.
export function useUpdater() {
  const [updateStatus, setUpdateStatus] = useState('idle') // idle, checking, current, downloading, ready, error
  const [updateInfo, setUpdateInfo] = useState(null)
  const [updateProgress, setUpdateProgress] = useState(0)
  const [updateError, setUpdateError] = useState(null)
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true)
  const [appVersion, setAppVersion] = useState('')
  const [updateBannerDismissed, setUpdateBannerDismissed] = useState(false)

  useEffect(() => {
    if (!window.electronAPI) return

    // Load version and update settings
    window.electronAPI.getAppVersion()
      .then(v => setAppVersion(v))
      .catch(error => setUpdateError(error.message))
    window.electronAPI.getUpdateSettings()
      .then(s => setAutoUpdateEnabled(s.autoUpdateEnabled))
      .catch(error => setUpdateError(error.message))

    // Listen for update events
    const unsubscribeUpdateEvents = [
      window.electronAPI.onUpdateChecking(() => {
        setUpdateStatus('checking')
        setUpdateError(null)
        setUpdateProgress(0)
      }),
      window.electronAPI.onUpdateAvailable((info) => {
        setUpdateStatus('downloading')
        setUpdateInfo(info)
        setUpdateBannerDismissed(false)
      }),
      window.electronAPI.onUpdateNotAvailable(() => {
        setUpdateStatus('current')
        setUpdateInfo(null)
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
    setUpdateProgress(0)
    try {
      if (!window.electronAPI?.checkForUpdates) {
        throw new Error('Update service is unavailable')
      }
      const result = await window.electronAPI.checkForUpdates()
      if (result && !result.success) {
        throw new Error(result.error || 'Update check failed')
      }
    } catch (error) {
      setUpdateStatus('error')
      setUpdateError(error.message)
    }
  }

  const handleToggleAutoUpdate = async (enabled) => {
    const previous = autoUpdateEnabled
    setAutoUpdateEnabled(enabled)
    try {
      if (!window.electronAPI?.setUpdateSettings) {
        throw new Error('Update settings are unavailable')
      }
      await window.electronAPI.setUpdateSettings({ autoUpdateEnabled: enabled })
    } catch (error) {
      setAutoUpdateEnabled(previous)
      setUpdateError(error.message)
    }
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
