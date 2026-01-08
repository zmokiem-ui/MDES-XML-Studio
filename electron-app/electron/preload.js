const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectOutputFile: () => ipcRenderer.invoke('select-output-file'),
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
  downloadCsvTemplate: () => ipcRenderer.invoke('download-csv-template'),
  // Correction mode APIs
  selectXmlFile: () => ipcRenderer.invoke('select-xml-file'),
  validateXml: (xmlPath) => ipcRenderer.invoke('validate-xml', xmlPath),
  generateCorrection: (options) => ipcRenderer.invoke('generate-correction', options),
  selectCorrectionOutput: () => ipcRenderer.invoke('select-correction-output'),
  // Correction CSV APIs
  selectCorrectionCsv: () => ipcRenderer.invoke('select-correction-csv'),
  downloadCorrectionCsvTemplate: () => ipcRenderer.invoke('download-correction-csv-template'),
  // FATCA APIs
  generateFATCA: (formData) => ipcRenderer.invoke('generate-fatca', formData),
  validateFatcaXml: (xmlPath) => ipcRenderer.invoke('validate-fatca-xml', xmlPath),
  generateFatcaCorrection: (options) => ipcRenderer.invoke('generate-fatca-correction', options)
});
