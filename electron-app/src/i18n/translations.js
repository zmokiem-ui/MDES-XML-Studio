/**
 * Multi-language translations for the application
 */

export const LANGUAGES = {
  en: { name: 'English', flag: '🇬🇧', nativeName: 'English' },
  nl: { name: 'Dutch', flag: '🇳🇱', nativeName: 'Nederlands' },
  es: { name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' }
};

export const translations = {
  en: {
    // App
    appTitle: 'Tax Reporting Generator',
    selectModule: 'Select a Module',
    
    // Modules
    modules: {
      crs: 'CRS',
      fatca: 'FATCA',
      cbc: 'CBC'
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
    },

    // Dashboard
    dashboard: {
      title: 'Dashboard',
      welcome: 'Welcome',
      quickActions: 'Quick Actions',
      statistics: 'Statistics',
      recentActivity: 'Recent Activity'
    },

    // Templates
    templates: {
      title: 'Template Library',
      select: 'Select Template',
      apply: 'Apply Template',
      basicIndividual: 'Basic Individual Accounts',
      basicOrg: 'Basic Organisation Accounts',
      mixed: 'Mixed Account Types',
      correction: 'Correction File',
      largeDataset: 'Large Dataset'
    },

    // Common
    common: {
      loading: 'Loading...',
      saving: 'Saving...',
      processing: 'Processing...',
      done: 'Done',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      or: 'or',
      and: 'and',
      all: 'All',
      none: 'None',
      select: 'Select',
      selected: 'Selected',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      more: 'More',
      less: 'Less',
      show: 'Show',
      hide: 'Hide',
      expand: 'Expand',
      collapse: 'Collapse',
      refresh: 'Refresh',
      retry: 'Retry',
      copy: 'Copy',
      copied: 'Copied!',
      paste: 'Paste',
      cut: 'Cut',
      undo: 'Undo',
      redo: 'Redo'
    }
  },
  
  nl: {
    // App
    appTitle: 'Belastingrapportage Generator',
    selectModule: 'Selecteer een Module',
    
    // Modules
    modules: {
      crs: 'CRS',
      fatca: 'FATCA',
      cbc: 'CBC'
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
    },

    // Dashboard
    dashboard: {
      title: 'Dashboard',
      welcome: 'Welkom',
      quickActions: 'Snelle Acties',
      statistics: 'Statistieken',
      recentActivity: 'Recente Activiteit'
    },

    // Templates
    templates: {
      title: 'Sjabloonbibliotheek',
      select: 'Sjabloon Selecteren',
      apply: 'Sjabloon Toepassen',
      basicIndividual: 'Basis Individuele Rekeningen',
      basicOrg: 'Basis Organisatie Rekeningen',
      mixed: 'Gemengde Rekeningtypen',
      correction: 'Correctiebestand',
      largeDataset: 'Grote Dataset'
    },

    // Common
    common: {
      loading: 'Laden...',
      saving: 'Opslaan...',
      processing: 'Verwerken...',
      done: 'Klaar',
      yes: 'Ja',
      no: 'Nee',
      ok: 'OK',
      or: 'of',
      and: 'en',
      all: 'Alles',
      none: 'Geen',
      select: 'Selecteren',
      selected: 'Geselecteerd',
      search: 'Zoeken',
      filter: 'Filteren',
      sort: 'Sorteren',
      more: 'Meer',
      less: 'Minder',
      show: 'Tonen',
      hide: 'Verbergen',
      expand: 'Uitvouwen',
      collapse: 'Invouwen',
      refresh: 'Vernieuwen',
      retry: 'Opnieuw proberen',
      copy: 'Kopiëren',
      copied: 'Gekopieerd!',
      paste: 'Plakken',
      cut: 'Knippen',
      undo: 'Ongedaan maken',
      redo: 'Opnieuw doen'
    }
  },

  // Spanish translations
  es: {
    // App
    appTitle: 'Generador de Informes Fiscales',
    selectModule: 'Seleccionar Módulo',
    
    // Modules
    modules: {
      crs: 'CRS',
      fatca: 'FATCA',
      cbc: 'CBC'
    },
    moduleDescriptions: {
      crs: 'Estándar Común de Reporte',
      fatca: 'Ley de Cumplimiento Fiscal de Cuentas Extranjeras',
      cbc: 'Informe País por País'
    },
    
    // Navigation
    nav: {
      home: 'Inicio',
      generator: 'Generador',
      validator: 'Validador',
      correction: 'Corrección',
      history: 'Historial',
      settings: 'Configuración',
      help: 'Ayuda'
    },
    
    // Actions
    actions: {
      generate: 'Generar',
      validate: 'Validar',
      save: 'Guardar',
      export: 'Exportar',
      import: 'Importar',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      delete: 'Eliminar',
      edit: 'Editar',
      preview: 'Vista previa',
      download: 'Descargar',
      upload: 'Subir',
      browse: 'Examinar',
      clear: 'Limpiar',
      reset: 'Restablecer',
      apply: 'Aplicar',
      close: 'Cerrar',
      back: 'Atrás',
      next: 'Siguiente',
      finish: 'Finalizar'
    },
    
    // Form labels
    form: {
      sendingCountry: 'País Emisor',
      receivingCountry: 'País Receptor',
      taxYear: 'Año Fiscal',
      reportingFI: 'Institución Financiera Reportante',
      numFIs: 'Número de Instituciones Financieras',
      individualAccounts: 'Cuentas Individuales',
      organisationAccounts: 'Cuentas de Organizaciones',
      controllingPersons: 'Personas Controladoras por Organización',
      outputFile: 'Archivo de Salida',
      inputFile: 'Archivo de Entrada',
      csvFile: 'Archivo CSV',
      xmlFile: 'Archivo XML'
    },
    
    // Messages
    messages: {
      generating: 'Generando...',
      validating: 'Validando...',
      success: '¡Éxito!',
      error: 'Error',
      warning: 'Advertencia',
      info: 'Información',
      fileGenerated: 'Archivo generado correctamente',
      validationPassed: 'Validación exitosa',
      validationFailed: 'Validación fallida',
      noFileSelected: 'Ningún archivo seleccionado',
      invalidInput: 'Entrada no válida',
      requiredField: 'Este campo es obligatorio',
      confirmDelete: '¿Está seguro de que desea eliminar esto?',
      unsavedChanges: 'Tiene cambios sin guardar'
    },
    
    // Settings
    settings: {
      title: 'Configuración',
      theme: 'Tema',
      language: 'Idioma',
      autoSave: 'Guardado automático',
      showTips: 'Mostrar consejos',
      recentFiles: 'Archivos recientes',
      partnerJurisdictions: 'Jurisdicciones Asociadas',
      keyboardShortcuts: 'Atajos de Teclado',
      appearance: 'Apariencia',
      darkMode: 'Modo Oscuro',
      lightMode: 'Modo Claro',
      general: 'General',
      advanced: 'Avanzado'
    },
    
    // History
    history: {
      title: 'Historial de Generación',
      noHistory: 'Sin historial de generación',
      clearHistory: 'Limpiar Historial',
      totalGenerated: 'Total Generado',
      totalAccounts: 'Total de Cuentas',
      lastGeneration: 'Última Generación'
    },
    
    // Recent files
    recentFiles: {
      title: 'Archivos Recientes',
      noFiles: 'Sin archivos recientes',
      clear: 'Limpiar archivos recientes',
      open: 'Abrir',
      remove: 'Quitar de la lista'
    },
    
    // Profiles
    profiles: {
      title: 'Perfiles Guardados',
      save: 'Guardar Perfil',
      load: 'Cargar Perfil',
      delete: 'Eliminar Perfil',
      name: 'Nombre del Perfil',
      noProfiles: 'Sin perfiles guardados',
      saveSuccess: 'Perfil guardado correctamente',
      loadSuccess: 'Perfil cargado correctamente'
    },
    
    // Validation
    validation: {
      title: 'Resultados de Validación',
      valid: 'Válido',
      invalid: 'No válido',
      errors: 'Errores',
      warnings: 'Advertencias',
      details: 'Detalles'
    },
    
    // Batch
    batch: {
      title: 'Procesamiento por Lotes',
      addFiles: 'Agregar Archivos',
      removeAll: 'Eliminar Todo',
      processAll: 'Procesar Todo',
      progress: 'Progreso',
      completed: 'Completado',
      failed: 'Fallido',
      pending: 'Pendiente'
    },
    
    // Diff
    diff: {
      title: 'Comparación XML',
      original: 'Original',
      modified: 'Modificado',
      differences: 'Diferencias',
      noDifferences: 'No se encontraron diferencias',
      added: 'Agregado',
      removed: 'Eliminado',
      changed: 'Modificado'
    },
    
    // Help
    help: {
      title: 'Ayuda',
      shortcuts: 'Atajos de Teclado',
      documentation: 'Documentación',
      about: 'Acerca de'
    },

    // Dashboard
    dashboard: {
      title: 'Panel de Control',
      welcome: 'Bienvenido',
      quickActions: 'Acciones Rápidas',
      statistics: 'Estadísticas',
      recentActivity: 'Actividad Reciente'
    },

    // Templates
    templates: {
      title: 'Biblioteca de Plantillas',
      select: 'Seleccionar Plantilla',
      apply: 'Aplicar Plantilla',
      basicIndividual: 'Cuentas Individuales Básicas',
      basicOrg: 'Cuentas de Organizaciones Básicas',
      mixed: 'Tipos de Cuenta Mixtos',
      correction: 'Archivo de Corrección',
      largeDataset: 'Conjunto de Datos Grande'
    },

    // Common
    common: {
      loading: 'Cargando...',
      saving: 'Guardando...',
      processing: 'Procesando...',
      done: 'Hecho',
      yes: 'Sí',
      no: 'No',
      ok: 'Aceptar',
      or: 'o',
      and: 'y',
      all: 'Todo',
      none: 'Ninguno',
      select: 'Seleccionar',
      selected: 'Seleccionado',
      search: 'Buscar',
      filter: 'Filtrar',
      sort: 'Ordenar',
      more: 'Más',
      less: 'Menos',
      show: 'Mostrar',
      hide: 'Ocultar',
      expand: 'Expandir',
      collapse: 'Contraer',
      refresh: 'Actualizar',
      retry: 'Reintentar',
      copy: 'Copiar',
      copied: '¡Copiado!',
      paste: 'Pegar',
      cut: 'Cortar',
      undo: 'Deshacer',
      redo: 'Rehacer'
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
