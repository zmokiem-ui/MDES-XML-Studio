// Electron Test Helpers for CRS-xml-generator
// Common helper functions for Electron + Playwright testing

import { Page, ElectronApplication } from '@playwright/test'

/**
 * Launch Electron app and return window
 */
export async function launchElectronApp(electron: any): Promise<{ app: ElectronApplication, window: Page }> {
  const app = await electron.launch({
    args: ['electron/main.js']
  })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')
  return { app, window }
}

/**
 * Switch language in the app
 */
export async function switchLanguage(window: Page, lang: 'en' | 'nl' | 'es'): Promise<void> {
  await window.click('[data-testid="language-selector"]')
  await window.click(`[data-testid="lang-${lang}"]`)
  await window.waitForTimeout(500) // Wait for translations to apply
}

/**
 * Navigate to a specific module
 */
export async function navigateToModule(window: Page, module: 'crs' | 'fatca' | 'cbc'): Promise<void> {
  await window.click(`[data-testid="module-${module}"]`)
  await window.waitForLoadState('networkidle')
}

/**
 * Navigate to settings page
 */
export async function navigateToSettings(window: Page): Promise<void> {
  await window.click('[data-testid="settings-button"]')
  await window.waitForLoadState('networkidle')
}

/**
 * Wait for IPC operation to complete (checks for success/error message)
 */
export async function waitForIPCComplete(window: Page, timeout: number = 30000): Promise<boolean> {
  try {
    await window.waitForSelector('[data-testid="success-message"], [data-testid="error-message"]', { timeout })
    const hasError = await window.locator('[data-testid="error-message"]').isVisible()
    return !hasError
  } catch {
    return false
  }
}

/**
 * Get console errors from Electron window
 */
export async function getConsoleErrors(window: Page): Promise<string[]> {
  const errors: string[] = []
  window.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  return errors
}

/**
 * Verify no console errors occurred
 */
export async function verifyNoConsoleErrors(window: Page): Promise<void> {
  const errors = await getConsoleErrors(window)
  if (errors.length > 0) {
    throw new Error(`Console errors detected: ${errors.join(', ')}`)
  }
}

/**
 * Fill form with data
 */
export async function fillForm(window: Page, formData: Record<string, string>): Promise<void> {
  for (const [field, value] of Object.entries(formData)) {
    await window.fill(`[data-testid="${field}"]`, value)
  }
}

/**
 * Verify file was created (checks if file path is displayed)
 */
export async function verifyFileCreated(window: Page): Promise<string> {
  const filePath = await window.locator('[data-testid="file-path"]').textContent()
  if (!filePath) {
    throw new Error('File path not found')
  }
  return filePath
}
