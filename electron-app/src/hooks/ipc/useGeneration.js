import { t } from '../../i18n/translations'

// CRS/FATCA/CBC generation IPC handlers extracted from App.jsx. State remains
// owned by App so this slice only moves the operational boundary.
export function useGeneration({
  language,
  formData,
  fatcaFormData,
  cbcFormData,
  cbcDataMode,
  cbcCsvPath,
  cbcFileType,
  crsFileType,
  dataMode,
  csvFilePath,
  csvStatistics,
  globalStats,
  updateStats,
  addToHistory,
  validateCsvForm,
  validateForm,
  setIsGenerating,
  setGenerationProgress,
  onResult,
}) {
  const handleGenerateFATCA = async () => {
    if (!fatcaFormData.transmittingCountry || !fatcaFormData.outputPath) {
      onResult('error', t(language, 'errors.pleaseFillRequiredFieldsFATCA'))
      return
    }

    setIsGenerating(true)
    setGenerationProgress(t(language, 'progressMessages.initializingFATCA'))

    let unsubscribeGenerationProgress
    try {
      unsubscribeGenerationProgress = window.electronAPI.onGenerationProgress((data) => setGenerationProgress(data))

      const generateData = {
        ...fatcaFormData,
        transmittingCountry: fatcaFormData.transmittingCountry.toUpperCase(),
        receivingCountry: fatcaFormData.receivingCountry.toUpperCase(),
        numReportingFIs: parseInt(fatcaFormData.numReportingFIs) || 1,
        individualAccounts: parseInt(fatcaFormData.individualAccounts) || 0,
        organisationAccounts: parseInt(fatcaFormData.organisationAccounts) || 0,
        substantialOwners: parseInt(fatcaFormData.substantialOwners) || 1,
      }

      const result = await window.electronAPI.generateFATCA(generateData)
      setGenerationProgress('')

      const individualCount = parseInt(fatcaFormData.individualAccounts) || 0
      const organisationCount = parseInt(fatcaFormData.organisationAccounts) || 0
      const fiCount = parseInt(fatcaFormData.numReportingFIs) || 1

      updateStats({
        totalXmlGenerated: globalStats.totalXmlGenerated + 1,
        totalIndividualAccounts: globalStats.totalIndividualAccounts + individualCount,
        totalOrganisationAccounts: globalStats.totalOrganisationAccounts + organisationCount,
        totalReportingFIs: globalStats.totalReportingFIs + fiCount,
        lastGenerated: new Date().toISOString(),
      })

      addToHistory({
        id: Date.now().toString(),
        type: 'fatca-xml',
        mode: 'random',
        fileName: result.filePath.split(/[\\/]/).pop(),
        filePath: result.filePath,
        fileSize: result.fileSize,
        timestamp: new Date().toISOString(),
        accounts: individualCount + organisationCount,
        individualAccounts: individualCount,
        organisationAccounts: organisationCount,
        reportingFIs: fiCount,
      })

      onResult('success', `${t(language, 'modals.fatcaGeneratedSuccess')}\n${t(language, 'modals.fileSize', { size: result.fileSize })}`)
    } catch (error) {
      setGenerationProgress('')
      onResult('error', error.message || t(language, 'modals.anErrorOccurred'))
    } finally {
      if (unsubscribeGenerationProgress) unsubscribeGenerationProgress()
      setIsGenerating(false)
    }
  }

  const handleGenerateCBC = async () => {
    if (cbcDataMode === 'csv') {
      if (!cbcCsvPath || !cbcFormData.outputPath) {
        onResult('error', t(language, 'errors.pleaseSelectCsvAndOutput'))
        return
      }
    } else {
      if (!cbcFormData.transmittingCountry || !cbcFormData.outputPath) {
        onResult('error', t(language, 'errors.pleaseFillRequiredFieldsFATCA'))
        return
      }
      if (cbcFileType === 'foreign' && !cbcFormData.receivingCountry) {
        onResult('error', t(language, 'errors.specifyReceivingCountry'))
        return
      }
    }

    setIsGenerating(true)
    setGenerationProgress(t(language, 'progressMessages.initializingCBC'))

    let unsubscribeGenerationProgress
    try {
      unsubscribeGenerationProgress = window.electronAPI.onGenerationProgress((data) => setGenerationProgress(data))

      const effectiveReceivingCountry = cbcFileType === 'domestic'
        ? cbcFormData.transmittingCountry.toUpperCase()
        : cbcFormData.receivingCountry.toUpperCase()

      const generateData = {
        ...cbcFormData,
        mode: cbcDataMode,
        csvPath: cbcCsvPath,
        fileType: cbcFileType,
        transmittingCountry: cbcFormData.transmittingCountry.toUpperCase(),
        receivingCountry: effectiveReceivingCountry,
        numCbcReports: parseInt(cbcFormData.numCbcReports) || 3,
        constEntitiesPerReport: parseInt(cbcFormData.constEntitiesPerReport) || 2,
      }

      const result = await window.electronAPI.generateCBC(generateData)
      setGenerationProgress('')

      const reportCount = cbcDataMode === 'csv' ? 'N/A' : parseInt(cbcFormData.numCbcReports) || 3
      const entitiesPerReport = cbcDataMode === 'csv' ? 'N/A' : parseInt(cbcFormData.constEntitiesPerReport) || 2

      updateStats({
        totalXmlGenerated: globalStats.totalXmlGenerated + 1,
        lastGenerated: new Date().toISOString(),
      })

      addToHistory({
        id: Date.now().toString(),
        type: 'cbc-xml',
        mode: cbcDataMode,
        fileName: result.filePath.split(/[\\/]/).pop(),
        filePath: result.filePath,
        fileSize: result.fileSize,
        timestamp: new Date().toISOString(),
        cbcReports: reportCount,
        constEntities: cbcDataMode === 'csv' ? 'N/A' : reportCount * entitiesPerReport,
      })

      const modeMsg = cbcDataMode === 'csv'
        ? t(language, 'modals.fromCsvData')
        : t(language, 'modals.jurisdictionReports', { reportCount, entityCount: reportCount * entitiesPerReport })
      onResult('success', `${t(language, 'modals.cbcGeneratedSuccess')}\n${modeMsg}\n${t(language, 'modals.fileSize', { size: result.fileSize })}`)
    } catch (error) {
      setGenerationProgress('')
      onResult('error', error.message || t(language, 'modals.anErrorOccurred'))
    } finally {
      if (unsubscribeGenerationProgress) unsubscribeGenerationProgress()
      setIsGenerating(false)
    }
  }

  const handleGenerate = async () => {
    if (dataMode === 'csv') {
      if (!validateCsvForm()) return
    } else if (!validateForm()) {
      return
    }

    setIsGenerating(true)
    setGenerationProgress(t(language, 'progressMessages.initializing'))

    let unsubscribeGenerationProgress
    try {
      // A domestic filing is addressed to the sender's own tax authority, so
      // the receiving country is the transmitting one; only a foreign delivery
      // names a second jurisdiction. Same derivation the CBC module uses.
      const effectiveReceivingCountry = crsFileType === 'domestic'
        ? formData.transmittingCountry.toUpperCase()
        : formData.receivingCountry.toUpperCase()

      const generateData = dataMode === 'csv'
        ? {
            mode: 'csv',
            csvPath: csvFilePath,
            outputPath: formData.outputPath,
            crsVersion: formData.crsVersion,
          }
        : {
            mode: 'random',
            ...formData,
            fileType: crsFileType,
            transmittingCountry: formData.transmittingCountry.toUpperCase(),
            receivingCountry: effectiveReceivingCountry,
            numReportingFIs: parseInt(formData.numReportingFIs),
            individualAccounts: parseInt(formData.individualAccounts) || 0,
            organisationAccounts: parseInt(formData.organisationAccounts) || 0,
            controllingPersons: parseInt(formData.controllingPersons) || 0,
          }

      unsubscribeGenerationProgress = window.electronAPI.onGenerationProgress((data) => setGenerationProgress(data))
      const result = await window.electronAPI.generateCRS(generateData)
      setGenerationProgress('')

      const individualCount = dataMode === 'csv'
        ? (csvStatistics?.individual_accounts || 0)
        : (parseInt(formData.individualAccounts) || 0) * parseInt(formData.numReportingFIs)
      const organisationCount = dataMode === 'csv'
        ? (csvStatistics?.organisation_accounts || 0)
        : (parseInt(formData.organisationAccounts) || 0) * parseInt(formData.numReportingFIs)
      const fiCount = dataMode === 'csv'
        ? (csvStatistics?.reporting_fis || 0)
        : parseInt(formData.numReportingFIs)

      updateStats({
        totalXmlGenerated: globalStats.totalXmlGenerated + 1,
        totalCsvUploaded: dataMode === 'csv' ? globalStats.totalCsvUploaded + 1 : globalStats.totalCsvUploaded,
        totalIndividualAccounts: globalStats.totalIndividualAccounts + individualCount,
        totalOrganisationAccounts: globalStats.totalOrganisationAccounts + organisationCount,
        totalReportingFIs: globalStats.totalReportingFIs + fiCount,
        lastGenerated: new Date().toISOString(),
      })

      addToHistory({
        id: Date.now().toString(),
        type: 'xml',
        mode: dataMode,
        fileName: result.filePath.split(/[\\/]/).pop(),
        filePath: result.filePath,
        fileSize: result.fileSize,
        timestamp: new Date().toISOString(),
        accounts: individualCount + organisationCount,
        individualAccounts: individualCount,
        organisationAccounts: organisationCount,
        reportingFIs: fiCount,
      })

      onResult('success', `${t(language, 'modals.generatedSuccess')}\n${t(language, 'modals.fileSize', { size: result.fileSize })}`)
    } catch (error) {
      setGenerationProgress('')
      onResult('error', error.message || t(language, 'modals.anErrorOccurred'))
    } finally {
      if (unsubscribeGenerationProgress) unsubscribeGenerationProgress()
      setIsGenerating(false)
    }
  }

  return { handleGenerateFATCA, handleGenerateCBC, handleGenerate }
}
