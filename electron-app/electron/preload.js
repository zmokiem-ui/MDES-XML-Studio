const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectOutputFile: (module) => ipcRenderer.invoke('select-output-file', module),
  selectCsvFile: () => ipcRenderer.invoke('select-csv-file'),
  getCsvTemplatePath: () => ipcRenderer.invoke('get-csv-template-path'),
  generateCsvPreview: (formData) => ipcRenderer.invoke('generate-csv-preview', formData),
  saveCsvPreview: (formData) => ipcRenderer.invoke('save-csv-preview', formData),
  generateCRS: (formData) => ipcRenderer.invoke('generate-crs', formData),
  openFileLocation: (filePath) => ipcRenderer.invoke('open-file-location', filePath),
  onGenerationProgress: (callback) => {
    ipcRenderer.on('generation-progress', (event, data) => callback(data));
  },
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
  
  // Batch Processing APIs
  selectBatchFiles: (fileType) => ipcRenderer.invoke('select-batch-files', fileType),
  
  // XML Diff APIs
  readXmlFile: (filePath) => ipcRenderer.invoke('read-xml-file', filePath),
  
  // Excel Support
  readExcelFile: (filePath) => ipcRenderer.invoke('read-excel-file', filePath),
  
  // Statistics & Auto-save APIs
  getAppStats: () => ipcRenderer.invoke('get-app-stats'),
  saveAppStats: (stats) => ipcRenderer.invoke('save-app-stats', stats),
  saveFormState: (data) => ipcRenderer.invoke('save-form-state', data),
  loadFormState: (module) => ipcRenderer.invoke('load-form-state', module),
  
  // Error Injector APIs
  corruptFile: (config) => ipcRenderer.invoke('corrupt-file', config),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath)
});
