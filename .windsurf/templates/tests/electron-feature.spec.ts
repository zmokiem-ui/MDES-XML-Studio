// Electron Feature Test Template
// Use this template for testing Electron-specific features

import { test, expect, _electron as electron } from '@playwright/test'

test.describe('Feature Name', () => {
  let electronApp
  let window

  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: ['electron/main.js']
    })
    window = await electronApp.firstWindow()
    
    // Wait for app to be ready
    await window.waitForLoadState('domcontentloaded')
  })

  test.afterAll(async () => {
    await electronApp.close()
  })

  test('should display feature UI', async () => {
    // Navigate to feature
    await window.click('[data-testid="feature-button"]')
    
    // Verify UI elements
    await expect(window.locator('[data-testid="feature-title"]')).toBeVisible()
    await expect(window.locator('[data-testid="feature-content"]')).toBeVisible()
  })

  test('should handle user interaction', async () => {
    // Perform action
    await window.fill('[data-testid="input-field"]', 'test value')
    await window.click('[data-testid="submit-button"]')
    
    // Verify result
    await expect(window.locator('[data-testid="result"]')).toContainText('Success')
  })

  test('should verify IPC communication', async () => {
    // Trigger IPC call
    await window.click('[data-testid="action-button"]')
    
    // Wait for IPC response (check for UI update that indicates IPC completed)
    await expect(window.locator('[data-testid="status"]')).toContainText('Complete')
  })

  test('should handle errors gracefully', async () => {
    // Trigger error condition
    await window.fill('[data-testid="input-field"]', 'invalid')
    await window.click('[data-testid="submit-button"]')
    
    // Verify error message
    await expect(window.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(window.locator('[data-testid="error-message"]')).toContainText('Invalid')
  })

  test('should work in all languages', async () => {
    const languages = ['en', 'nl', 'es']
    const expectedTexts = {
      en: 'Feature Title',
      nl: 'Functie Titel',
      es: 'Título de Función'
    }

    for (const lang of languages) {
      // Switch language
      await window.click('[data-testid="language-selector"]')
      await window.click(`[data-testid="lang-${lang}"]`)
      
      // Verify translation
      await expect(window.locator('[data-testid="feature-title"]'))
        .toContainText(expectedTexts[lang])
    }
  })
})
