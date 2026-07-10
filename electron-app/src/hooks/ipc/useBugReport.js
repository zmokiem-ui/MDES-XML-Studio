import { useState } from 'react'
import { t } from '../../i18n/translations'

const EMPTY_REPORT = { title: '', description: '', steps: '', expected: '', actual: '', email: '' }

// Bug-report form state + GitHub-issue submission over IPC, extracted from
// App.jsx. onResult(type, message) surfaces the outcome in the app's modal.
export function useBugReport({ language, appVersion, onResult }) {
  const [showBugReportForm, setShowBugReportForm] = useState(false)
  const [bugReportData, setBugReportData] = useState(EMPTY_REPORT)
  const [bugReportErrors, setBugReportErrors] = useState({})
  const [isSubmittingBug, setIsSubmittingBug] = useState(false)
  const [bugReportScreenshots, setBugReportScreenshots] = useState([])

  const handleBugReportChange = (field, value) => {
    setBugReportData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (bugReportErrors[field]) {
      setBugReportErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const validateBugReport = () => {
    const errors = {}
    if (!bugReportData.title.trim()) {
      errors.title = t(language, 'bugReport.titleRequired')
    }
    if (!bugReportData.description.trim()) {
      errors.description = t(language, 'bugReport.descriptionRequired')
    }
    if (bugReportData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bugReportData.email)) {
      errors.email = t(language, 'bugReport.invalidEmail')
    }
    setBugReportErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmitBugReport = async () => {
    if (!validateBugReport()) return

    setIsSubmittingBug(true)
    try {
      // Collect system information
      const systemInfo = {
        appVersion: appVersion || '1.3.0',
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        language: language,
      }

      // Create GitHub issue via IPC
      const issueData = {
        title: bugReportData.title,
        body: `## Description\n${bugReportData.description}\n\n` +
              (bugReportData.steps ? `## Steps to Reproduce\n${bugReportData.steps}\n\n` : '') +
              (bugReportData.expected ? `## Expected Behavior\n${bugReportData.expected}\n\n` : '') +
              (bugReportData.actual ? `## Actual Behavior\n${bugReportData.actual}\n\n` : '') +
              (bugReportData.email ? `## Contact\n${bugReportData.email}\n\n` : '') +
              `## System Information\n` +
              `- App Version: ${systemInfo.appVersion}\n` +
              `- Platform: ${systemInfo.platform}\n` +
              `- Language: ${systemInfo.language}\n`,
        labels: ['bug', 'user-reported'],
      }

      const result = await window.electronAPI.createGitHubIssue(issueData)

      onResult('success', t(language, 'bugReport.successMessage', { url: result.html_url }))

      // Reset form
      setBugReportData(EMPTY_REPORT)
      setBugReportScreenshots([])
      setShowBugReportForm(false)
    } catch (error) {
      console.error('Bug report submission error:', error)
      onResult('error', error.message || t(language, 'bugReport.errorMessage'))
    } finally {
      setIsSubmittingBug(false)
    }
  }

  const handleCancelBugReport = () => {
    setBugReportData(EMPTY_REPORT)
    setBugReportErrors({})
    setBugReportScreenshots([])
    setShowBugReportForm(false)
  }

  const handleCaptureScreenshot = async () => {
    try {
      const screenshot = await window.electronAPI.captureScreenshot()
      setBugReportScreenshots(prev => [...prev, screenshot])
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
    }
  }

  return {
    showBugReportForm, setShowBugReportForm,
    bugReportData, bugReportErrors, bugReportScreenshots,
    isSubmittingBug,
    handleBugReportChange, handleSubmitBugReport,
    handleCancelBugReport, handleCaptureScreenshot,
  }
}
