/**
 * Multi-language translations for the application
 */

export const LANGUAGES = {
  en: { name: 'English', flag: '🇬🇧' },
  nl: { name: 'Nederlands', flag: '🇳🇱' }
};

export const translations = {
  en: {
    // App
    appTitle: 'Tax Reporting Generator',
    selectModule: 'Select a Module',
    
    // Modules
    modules: {
      crs: 'CRS Generator',
      fatca: 'FATCA Generator',
      cbc: 'CBC Generator'
    },
    moduleDescriptions: {
      crs: 'Common Reporting Standard',
      fatca: 'Foreign Account Tax Compliance Act',
      cbc: 'Country-by-Country Reporting'
    },
    
    // Navigation
    nav: {
      home: 'Home',
      generator: 'Generator',
      validator: 'Validator',
      correction: 'Correction',
      history: 'History',
      settings: 'Settings',
      help: 'Help'
    },
    
    // Actions
    actions: {
      generate: 'Generate',
      validate: 'Validate',
      save: 'Save',
      export: 'Export',
      import: 'Import',
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      edit: 'Edit',
      preview: 'Preview',
      download: 'Download',
      upload: 'Upload',
      browse: 'Browse',
      clear: 'Clear',
      reset: 'Reset',
      apply: 'Apply',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      finish: 'Finish'
    },
    
    // Form labels
    form: {
      sendingCountry: 'Sending Country',
      receivingCountry: 'Receiving Country',
      taxYear: 'Tax Year',
      reportingFI: 'Reporting Financial Institution',
      numFIs: 'Number of Financial Institutions',
      individualAccounts: 'Individual Accounts',
      organisationAccounts: 'Organisation Accounts',
      controllingPersons: 'Controlling Persons per Organisation',
      outputFile: 'Output File',
      inputFile: 'Input File',
      csvFile: 'CSV File',
      xmlFile: 'XML File'
    },
    
    // Messages
    messages: {
      generating: 'Generating...',
      validating: 'Validating...',
      success: 'Success!',
      error: 'Error',
      warning: 'Warning',
      info: 'Information',
      fileGenerated: 'File generated successfully',
      validationPassed: 'Validation passed',
      validationFailed: 'Validation failed',
      noFileSelected: 'No file selected',
      invalidInput: 'Invalid input',
      requiredField: 'This field is required',
      confirmDelete: 'Are you sure you want to delete this?',
      unsavedChanges: 'You have unsaved changes'
    },
    
    // Settings
    settings: {
      title: 'Settings',
      theme: 'Theme',
      language: 'Language',
      autoSave: 'Auto-save',
      showTips: 'Show tips',
      recentFiles: 'Recent files',
      partnerJurisdictions: 'Partner Jurisdictions',
      keyboardShortcuts: 'Keyboard Shortcuts'
    },
    
    // History
    history: {
      title: 'Generation History',
      noHistory: 'No generation history yet',
      clearHistory: 'Clear History',
      totalGenerated: 'Total Generated',
      totalAccounts: 'Total Accounts',
      lastGeneration: 'Last Generation'
    },
    
    // Recent files
    recentFiles: {
      title: 'Recent Files',
      noFiles: 'No recent files',
      clear: 'Clear recent files',
      open: 'Open',
      remove: 'Remove from list'
    },
    
    // Profiles
    profiles: {
      title: 'Saved Profiles',
      save: 'Save Profile',
      load: 'Load Profile',
      delete: 'Delete Profile',
      name: 'Profile Name',
      noProfiles: 'No saved profiles',
      saveSuccess: 'Profile saved successfully',
      loadSuccess: 'Profile loaded successfully'
    },
    
    // Validation
    validation: {
      title: 'Validation Results',
      valid: 'Valid',
      invalid: 'Invalid',
      errors: 'Errors',
      warnings: 'Warnings',
      details: 'Details'
    },
    
    // Batch
    batch: {
      title: 'Batch Processing',
      addFiles: 'Add Files',
      removeAll: 'Remove All',
      processAll: 'Process All',
      progress: 'Progress',
      completed: 'Completed',
      failed: 'Failed',
      pending: 'Pending'
    },
    
    // Diff
    diff: {
      title: 'XML Comparison',
      original: 'Original',
      modified: 'Modified',
      differences: 'Differences',
      noDifferences: 'No differences found',
      added: 'Added',
      removed: 'Removed',
      changed: 'Changed'
    },
    
    // Help
    help: {
      title: 'Help',
      shortcuts: 'Keyboard Shortcuts',
      documentation: 'Documentation',
      about: 'About'
    }
  },
  
  nl: {
    // App
    appTitle: 'Belastingrapportage Generator',
    selectModule: 'Selecteer een Module',
    
    // Modules
    modules: {
      crs: 'CRS Generator',
      fatca: 'FATCA Generator',
      cbc: 'CBC Generator'
    },
    moduleDescriptions: {
      crs: 'Common Reporting Standard',
      fatca: 'Foreign Account Tax Compliance Act',
      cbc: 'Country-by-Country Rapportage'
    },
    
    // Navigation
    nav: {
      home: 'Start',
      generator: 'Generator',
      validator: 'Validator',
      correction: 'Correctie',
      history: 'Geschiedenis',
      settings: 'Instellingen',
      help: 'Help'
    },
    
    // Actions
    actions: {
      generate: 'Genereren',
      validate: 'Valideren',
      save: 'Opslaan',
      export: 'Exporteren',
      import: 'Importeren',
      cancel: 'Annuleren',
      confirm: 'Bevestigen',
      delete: 'Verwijderen',
      edit: 'Bewerken',
      preview: 'Voorbeeld',
      download: 'Downloaden',
      upload: 'Uploaden',
      browse: 'Bladeren',
      clear: 'Wissen',
      reset: 'Resetten',
      apply: 'Toepassen',
      close: 'Sluiten',
      back: 'Terug',
      next: 'Volgende',
      finish: 'Voltooien'
    },
    
    // Form labels
    form: {
      sendingCountry: 'Verzendend Land',
      receivingCountry: 'Ontvangend Land',
      taxYear: 'Belastingjaar',
      reportingFI: 'Rapporterende Financiële Instelling',
      numFIs: 'Aantal Financiële Instellingen',
      individualAccounts: 'Individuele Rekeningen',
      organisationAccounts: 'Organisatie Rekeningen',
      controllingPersons: 'Uiteindelijk Belanghebbenden per Organisatie',
      outputFile: 'Uitvoerbestand',
      inputFile: 'Invoerbestand',
      csvFile: 'CSV Bestand',
      xmlFile: 'XML Bestand'
    },
    
    // Messages
    messages: {
      generating: 'Bezig met genereren...',
      validating: 'Bezig met valideren...',
      success: 'Geslaagd!',
      error: 'Fout',
      warning: 'Waarschuwing',
      info: 'Informatie',
      fileGenerated: 'Bestand succesvol gegenereerd',
      validationPassed: 'Validatie geslaagd',
      validationFailed: 'Validatie mislukt',
      noFileSelected: 'Geen bestand geselecteerd',
      invalidInput: 'Ongeldige invoer',
      requiredField: 'Dit veld is verplicht',
      confirmDelete: 'Weet u zeker dat u dit wilt verwijderen?',
      unsavedChanges: 'U heeft niet-opgeslagen wijzigingen'
    },
    
    // Settings
    settings: {
      title: 'Instellingen',
      theme: 'Thema',
      language: 'Taal',
      autoSave: 'Automatisch opslaan',
      showTips: 'Tips tonen',
      recentFiles: 'Recente bestanden',
      partnerJurisdictions: 'Partner Jurisdicties',
      keyboardShortcuts: 'Sneltoetsen'
    },
    
    // History
    history: {
      title: 'Generatie Geschiedenis',
      noHistory: 'Nog geen generatie geschiedenis',
      clearHistory: 'Geschiedenis Wissen',
      totalGenerated: 'Totaal Gegenereerd',
      totalAccounts: 'Totaal Rekeningen',
      lastGeneration: 'Laatste Generatie'
    },
    
    // Recent files
    recentFiles: {
      title: 'Recente Bestanden',
      noFiles: 'Geen recente bestanden',
      clear: 'Recente bestanden wissen',
      open: 'Openen',
      remove: 'Verwijderen uit lijst'
    },
    
    // Profiles
    profiles: {
      title: 'Opgeslagen Profielen',
      save: 'Profiel Opslaan',
      load: 'Profiel Laden',
      delete: 'Profiel Verwijderen',
      name: 'Profielnaam',
      noProfiles: 'Geen opgeslagen profielen',
      saveSuccess: 'Profiel succesvol opgeslagen',
      loadSuccess: 'Profiel succesvol geladen'
    },
    
    // Validation
    validation: {
      title: 'Validatie Resultaten',
      valid: 'Geldig',
      invalid: 'Ongeldig',
      errors: 'Fouten',
      warnings: 'Waarschuwingen',
      details: 'Details'
    },
    
    // Batch
    batch: {
      title: 'Batch Verwerking',
      addFiles: 'Bestanden Toevoegen',
      removeAll: 'Alles Verwijderen',
      processAll: 'Alles Verwerken',
      progress: 'Voortgang',
      completed: 'Voltooid',
      failed: 'Mislukt',
      pending: 'Wachtend'
    },
    
    // Diff
    diff: {
      title: 'XML Vergelijking',
      original: 'Origineel',
      modified: 'Gewijzigd',
      differences: 'Verschillen',
      noDifferences: 'Geen verschillen gevonden',
      added: 'Toegevoegd',
      removed: 'Verwijderd',
      changed: 'Gewijzigd'
    },
    
    // Help
    help: {
      title: 'Help',
      shortcuts: 'Sneltoetsen',
      documentation: 'Documentatie',
      about: 'Over'
    }
  }
};

/**
 * Get translation by key path
 * @param {string} lang - Language code
 * @param {string} key - Dot-separated key path (e.g., 'nav.home')
 * @param {Object} params - Optional parameters for interpolation
 */
export function t(lang, key, params = {}) {
  const keys = key.split('.');
  let value = translations[lang] || translations.en;
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      // Fallback to English
      value = translations.en;
      for (const fallbackKey of keys) {
        value = value?.[fallbackKey];
      }
      break;
    }
  }
  
  if (typeof value !== 'string') {
    return key; // Return key if translation not found
  }
  
  // Simple interpolation
  return value.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`);
}

export default translations;
