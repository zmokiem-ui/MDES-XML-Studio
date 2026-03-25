// IPC Communication Test Template
// Use this for testing Electron IPC between main and renderer processes

import { test, expect, _electron as electron } from '@playwright/test'

test.describe('IPC Communication', () => {
  let electronApp
  let window

  test.beforeAll(async () => {
    electronApp = await electron.launch({ args: ['electron/main.js'] })
    window = await electronApp.firstWindow()
  })

  test.afterAll(async () => {
    await electronApp.close()
  })

  test('should send IPC request and receive response', async () => {
    // Trigger IPC call via UI
    await window.fill('[data-testid="input"]', 'test-data')
    await window.click('[data-testid="send-button"]')
    
    // Wait for IPC response (UI update)
    await expect(window.locator('[data-testid="response"]')).toContainText('Success')
  })

  test('should handle IPC errors', async () => {
    // Trigger error condition
    await window.fill('[data-testid="input"]', 'invalid-data')
    await window.click('[data-testid="send-button"]')
    
    // Verify error handling
    await expect(window.locator('[data-testid="error"]')).toBeVisible()
  })

  test('should verify file operations via IPC', async () => {
    // Trigger file operation
    await window.click('[data-testid="generate-button"]')
    
    // Wait for completion
    await expect(window.locator('[data-testid="status"]')).toContainText('Generated')
    
    // Verify file path is shown
    await expect(window.locator('[data-testid="file-path"]')).toBeVisible()
  })
})
