const { contextBridge, ipcRenderer } = require('electron');

// Launching with MDES_DEVELOPER_MODE=1 opens the app with developer mode already
// on, so a session aimed at a real MDES instance does not start with a trip to
// Settings. It only ever turns the flag on; the toggle in Settings still owns it
// from then on, and an ordinary launch is unaffected.
if (process.env.MDES_DEVELOPER_MODE === '1') {
  try {
    const stored = JSON.parse(window.localStorage.getItem('crs-settings') || '{}');
    if (stored.developerMode !== true) {
      window.localStorage.setItem(
        'crs-settings', JSON.stringify({ ...stored, developerMode: true })
      );
    }
  } catch {
    // A storage failure must never stop the app loading.
  }
}

function subscribe(channel, callback) {
  const listener = (event, data) => callback(data);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

function subscribeNoData(channel, callback) {
  const listener = () => callback();
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectOutputFile: (module, defaultName) => ipcRenderer.invoke('select-output-file', module, defaultName),
  selectCsvFile: () => ipcRenderer.invoke('select-csv-file'),
  generateCsvPreview: (formData) => ipcRenderer.invoke('generate-csv-preview', formData),
  saveCsvPreview: (formData) => ipcRenderer.invoke('save-csv-preview', formData),
  generateCRS: (formData) => ipcRenderer.invoke('generate-crs', formData),
  openFileLocation: (filePath) => ipcRenderer.invoke('open-file-location', filePath),
  onGenerationProgress: (callback) => subscribe('generation-progress', callback),
  validateCsv: (csvPath) => ipcRenderer.invoke('validate-csv', csvPath),
  downloadCsvTemplate: (module) => ipcRenderer.invoke('download-csv-template', module),
  // Correction mode APIs
  selectXmlFile: () => ipcRenderer.invoke('select-xml-file'),
  validateXml: (xmlPath) => ipcRenderer.invoke('validate-xml', xmlPath),
  generateCorrection: (options) => ipcRenderer.invoke('generate-correction', options),
  selectCorrectionOutput: (module) => ipcRenderer.invoke('select-correction-output', module),
  // Correction CSV APIs
  selectCorrectionCsv: () => ipcRenderer.invoke('select-correction-csv'),
  downloadCorrectionCsvTemplate: () => ipcRenderer.invoke('download-correction-csv-template'),
  // CRS Country Code Replacer
  replaceCrsCountryCodes: (options) => ipcRenderer.invoke('replace-crs-country-codes', options),
  // FATCA APIs
  generateFATCA: (formData) => ipcRenderer.invoke('generate-fatca', formData),
  validateFatcaXml: (xmlPath) => ipcRenderer.invoke('validate-fatca-xml', xmlPath),
  generateFatcaCorrection: (options) => ipcRenderer.invoke('generate-fatca-correction', options),
  // CBC APIs
  generateCBC: (formData) => ipcRenderer.invoke('generate-cbc', formData),
  validateCbcXml: (xmlPath) => ipcRenderer.invoke('validate-cbc-xml', xmlPath),
  validateCbcCsv: (csvPath) => ipcRenderer.invoke('validate-cbc-csv', csvPath),
  generateCbcCorrection: (options) => ipcRenderer.invoke('generate-cbc-correction', options),
  
  // Excel Support
  readExcelFile: (filePath) => ipcRenderer.invoke('read-excel-file', filePath),
  
  // Statistics & Auto-save APIs
  getAppStats: () => ipcRenderer.invoke('get-app-stats'),
  saveAppStats: (stats) => ipcRenderer.invoke('save-app-stats', stats),
  saveFormState: (data) => ipcRenderer.invoke('save-form-state', data),
  loadFormState: (module) => ipcRenderer.invoke('load-form-state', module),
  
  // Error Injector APIs
  selectErrorInjectorFile: () => ipcRenderer.invoke('select-error-injector-file'),
  corruptFile: (config) => ipcRenderer.invoke('corrupt-file', config),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  
  // CTS / IDES packaging APIs. Passwords only ever travel inwards: the renderer
  // can set one and ask whether it works, but never read one back.
  ctsListCertificates: (country) => ipcRenderer.invoke('cts-list-certificates', country),
  ctsCheckPassword: (country) => ipcRenderer.invoke('cts-check-password', country),
  ctsSetPassword: (country, password) => ipcRenderer.invoke('cts-set-password', { country, password }),
  ctsCountriesWithPasswords: () => ipcRenderer.invoke('cts-countries-with-passwords'),
  ctsImportPasswords: (filePath) => ipcRenderer.invoke('cts-import-passwords', filePath),
  ctsImportCertificates: (country) => ipcRenderer.invoke('cts-import-certificates', country),
  ctsOpenStore: () => ipcRenderer.invoke('cts-open-store'),
  ctsRestoreBundledCertificates: () => ipcRenderer.invoke('cts-restore-bundled-certificates'),
  ctsSelectPackageFile: () => ipcRenderer.invoke('cts-select-package-file'),
  ctsSelectOutputFolder: () => ipcRenderer.invoke('cts-select-output-folder'),
  ctsValidateSource: (sourceFile) => ipcRenderer.invoke('cts-validate-source', sourceFile),
  ctsPack: (options) => ipcRenderer.invoke('cts-pack', options),
  ctsUnpack: (options) => ipcRenderer.invoke('cts-unpack', options),

  // MDES target APIs (developer mode). Like the certificate passwords, a SQL
  // password can be set but never read back.
  mdesTargetDiscover: (options) => ipcRenderer.invoke('mdes-target-discover', options),
  mdesTargetList: () => ipcRenderer.invoke('mdes-target-list'),
  mdesTargetSave: (target) => ipcRenderer.invoke('mdes-target-save', target),
  mdesTargetDelete: (name) => ipcRenderer.invoke('mdes-target-delete', name),
  mdesTargetTest: (draft) => ipcRenderer.invoke('mdes-target-test', draft),
  mdesTargetSetPassword: (name, password) => ipcRenderer.invoke('mdes-target-set-password', { name, password }),
  mdesTargetResolve: (name) => ipcRenderer.invoke('mdes-target-resolve', name),
  mdesTargetPreflight: (options) => ipcRenderer.invoke('mdes-target-preflight', options),
  mdesTargetBuild: (options) => ipcRenderer.invoke('mdes-target-build', options),
  mdesTargetPackage: (options) => ipcRenderer.invoke('mdes-target-package', options),
  mdesTargetSelectPropsFile: () => ipcRenderer.invoke('mdes-target-select-props-file'),

  // File Manager APIs
  listDirectory: (dirPath) => ipcRenderer.invoke('list-directory', dirPath),
  readFileContent: (filePath) => ipcRenderer.invoke('read-file-content', filePath),
  writeFileContent: (filePath, content) => ipcRenderer.invoke('write-file-content', filePath, content),
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('rename-file', oldPath, newPath),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  createFile: (filePath, content) => ipcRenderer.invoke('create-file', filePath, content),
  createFolder: (dirPath) => ipcRenderer.invoke('create-folder', dirPath),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath),
  validateXmlContent: (content, module) => ipcRenderer.invoke('validate-xml-content', content, module),
  formatXml: (content) => ipcRenderer.invoke('format-xml', content),
  
  // Auto-update APIs
  installUpdate: () => ipcRenderer.send('install-update'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getUpdateFeed: () => ipcRenderer.invoke('get-update-feed'),
  getUpdateSettings: () => ipcRenderer.invoke('get-update-settings'),
  setUpdateSettings: (settings) => ipcRenderer.invoke('set-update-settings', settings),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateChecking: (callback) => subscribeNoData('update-checking', callback),
  onUpdateAvailable: (callback) => subscribe('update-available', callback),
  onUpdateNotAvailable: (callback) => subscribe('update-not-available', callback),
  onDownloadProgress: (callback) => subscribe('download-progress', callback),
  onUpdateDownloaded: (callback) => subscribe('update-downloaded', callback),
  onUpdateError: (callback) => subscribe('update-error', callback),
  
  // Bug Reporting APIs
  createGitHubIssue: (issueData) => ipcRenderer.invoke('create-github-issue', issueData),
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
});
