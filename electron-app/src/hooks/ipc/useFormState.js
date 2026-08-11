import { useState } from 'react'
import { t } from '../../i18n/translations'

const currentYear = () => new Date().getFullYear().toString()

const createCrsFormData = () => ({
  // CRS schema version to generate. 2.0 stays the default; 3.0 is opt-in and
  // supported by both the random-data and CSV paths.
  crsVersion: '2.0',
  sendingCompanyIN: '',
  transmittingCountry: '',
  receivingCountry: '',
  reportingPeriod: currentYear(),
  numReportingFIs: '',
  reportingFITINs: [],
  individualAccounts: '',
  organisationAccounts: '',
  controllingPersons: '',
  accountHolderMode: 'random',
  accountHolderCountries: '',
  outputPath: '',
  testMode: true,
})

const createFatcaFormData = () => ({
  variant: 'fatca-crs',
  // FATCA-CRS combined schema version. 2.2 stays the default; 3.0 is opt-in and
  // applies to the fatca-crs variant only.
  fcVersion: '2.2',
  sendingCompanyIN: '',
  transmittingCountry: '',
  receivingCountry: 'US',
  reportingPeriod: currentYear(),
  numReportingFIs: '1',
  reportingFITINs: [],
  filerCategory: 'FATCA601',
  individualAccounts: '',
  organisationAccounts: '',
  substantialOwners: '1',
  accountHolderMode: 'random',
  accountHolderCountries: '',
  outputPath: '',
  testMode: true,
})

const createCbcFormData = () => ({
  sendingEntityIN: '',
  transmittingCountry: '',
  receivingCountry: '',
  reportingPeriod: currentYear(),
  mneGroupName: '',
  reportingEntityName: '',
  reportingRole: 'CBC701',
  numCbcReports: '3',
  constEntitiesPerReport: '2',
  jurisdictionCountries: '',
  outputPath: '',
  testMode: true,
  mode: 'random',
  csvPath: '',
})

const INITIAL_EXPANDED_SECTIONS = {
  messageHeader: true,
  fileSize: true,
  accountHolder: false,
  output: true,
}

// Per-module form state and CRS form helpers extracted from App.jsx. Keeping
// these names stable lets the IPC hooks and pages consume the same contract.
export function useFormState(language) {
  const [formData, setFormData] = useState(createCrsFormData)
  const [fatcaFormData, setFatcaFormData] = useState(createFatcaFormData)
  const [cbcFormData, setCbcFormData] = useState(createCbcFormData)
  const [cbcDataMode, setCbcDataMode] = useState('random')
  const [cbcCsvPath, setCbcCsvPath] = useState('')
  const [cbcFileType, setCbcFileType] = useState('domestic')
  const [expandedSections, setExpandedSections] = useState(INITIAL_EXPANDED_SECTIONS)
  const [errors, setErrors] = useState({})

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleNumFIsChange = (value) => {
    const num = parseInt(value) || 0
    if (num < 1 && value !== '') return
    handleInputChange('numReportingFIs', value)
    setFormData(prev => ({
      ...prev,
      reportingFITINs: num >= 1 ? Array(num).fill('') : [],
    }))
  }

  const handleTINChange = (index, value) => {
    setFormData(prev => {
      const reportingFITINs = [...prev.reportingFITINs]
      reportingFITINs[index] = value
      return { ...prev, reportingFITINs }
    })
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.sendingCompanyIN) newErrors.sendingCompanyIN = t(language, 'messages.requiredField')
    if (!formData.transmittingCountry) {
      newErrors.transmittingCountry = t(language, 'messages.requiredField')
    } else if (!/^[A-Z]{2}$/.test(formData.transmittingCountry.toUpperCase())) {
      newErrors.transmittingCountry = t(language, 'errors.mustBe2LetterISO')
    }
    if (!formData.receivingCountry) {
      newErrors.receivingCountry = t(language, 'messages.requiredField')
    } else if (!/^[A-Z]{2}$/.test(formData.receivingCountry.toUpperCase())) {
      newErrors.receivingCountry = t(language, 'errors.mustBe2LetterISO')
    }
    if (!formData.numReportingFIs || parseInt(formData.numReportingFIs) < 1) {
      newErrors.numReportingFIs = t(language, 'errors.mustBeAtLeast1')
    }
    if (parseInt(formData.numReportingFIs) >= 1) {
      formData.reportingFITINs.forEach((tin, index) => {
        if (!tin) newErrors[`tin_${index}`] = t(language, 'messages.requiredField')
      })
    }
    if (!formData.outputPath) newErrors.outputPath = 'Required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  return {
    formData, setFormData,
    fatcaFormData, setFatcaFormData,
    cbcFormData, setCbcFormData,
    cbcDataMode, setCbcDataMode,
    cbcCsvPath, setCbcCsvPath,
    cbcFileType, setCbcFileType,
    expandedSections, errors, setErrors,
    toggleSection, handleInputChange, handleNumFIsChange, handleTINChange,
    validateForm,
  }
}
