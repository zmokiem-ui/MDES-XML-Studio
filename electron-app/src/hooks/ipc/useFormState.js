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
  // Which MDES intake the CRS file targets. 'domestic' keeps the previous
  // behaviour (receiving country mirrors the transmitting one); 'foreign'
  // is a delivery from a partner jurisdiction and needs both countries.
  const [crsFileType, setCrsFileType] = useState('domestic')
  const [expandedSections, setExpandedSections] = useState(INITIAL_EXPANDED_SECTIONS)
  const [errors, setErrors] = useState({})

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value }
      // On a foreign delivery the reported holders live in the receiving
      // jurisdiction, so keep the account-holder country following that field
      // rather than making the user set the same code twice.
      if (field === 'receivingCountry' && crsFileType === 'foreign'
          && next.accountHolderMode === 'single') {
        next.accountHolderCountries = value
      }
      return next
    })
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

  // Switching intake rewrites the fields that only make sense for one of them.
  // Foreign deliveries report holders resident in the receiving jurisdiction
  // (MDES 60011/60012), so that becomes the account-holder default; going back
  // to domestic clears both and restores the random spread.
  const handleCrsFileTypeChange = (fileType) => {
    setCrsFileType(fileType)
    setErrors(prev => ({ ...prev, receivingCountry: null }))
    setFormData(prev => fileType === 'foreign'
      ? { ...prev, accountHolderMode: 'single', accountHolderCountries: prev.receivingCountry }
      : { ...prev, receivingCountry: '', accountHolderMode: 'random', accountHolderCountries: '' })
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
    // A domestic filing has no separate receiving country — it is derived from
    // the transmitting one at generation time, so the field is not shown.
    if (crsFileType === 'foreign') {
      if (!formData.receivingCountry) {
        newErrors.receivingCountry = t(language, 'messages.requiredField')
      } else if (!/^[A-Z]{2}$/.test(formData.receivingCountry.toUpperCase())) {
        newErrors.receivingCountry = t(language, 'errors.mustBe2LetterISO')
      } else if (formData.receivingCountry.toUpperCase()
                 === formData.transmittingCountry.toUpperCase()) {
        newErrors.receivingCountry = t(language, 'errors.foreignCountriesMustDiffer')
      }
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
    crsFileType, setCrsFileType, handleCrsFileTypeChange,
    expandedSections, errors, setErrors,
    toggleSection, handleInputChange, handleNumFIsChange, handleTINChange,
    validateForm,
  }
}
