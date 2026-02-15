import React, { useState } from 'react';
import { 
  Upload, AlertTriangle, Zap, Settings, Download, FileText, 
  Trash2, RefreshCw, CheckCircle2, XCircle, AlertCircle,
  Sliders, FileWarning, Bug, Wrench, Target
} from 'lucide-react';

/**
 * XML/CSV Error Injector - Corrupt files for testing purposes
 * Supports CRS, FATCA, and CBC modules with various corruption types
 */
export function ErrorInjector({ theme, language }) {
  const [selectedModule, setSelectedModule] = useState('crs');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileType, setFileType] = useState('xml'); // 'xml' or 'csv'
  const [corruptionLevel, setCorruptionLevel] = useState(3); // 1-5 scale
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customOptions, setCustomOptions] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  // Corruption presets for each module
  const CORRUPTION_PRESETS = {
    crs: [
      {
        id: 'missing_required',
        name: 'Missing Required Fields',
        description: 'Remove mandatory fields like DocRefId, MessageRefId, TIN',
        severity: 2,
        options: ['docRefId', 'messageRefId', 'tin', 'name', 'address']
      },
      {
        id: 'invalid_dates',
        name: 'Invalid Date Formats',
        description: 'Corrupt date fields with invalid formats',
        severity: 1,
        options: ['reportingPeriod', 'birthDate', 'timestamp']
      },
      {
        id: 'wrong_country_codes',
        name: 'Invalid Country Codes',
        description: 'Use non-existent or wrong format country codes',
        severity: 2,
        options: ['resCountryCode', 'sendingCountry', 'receivingCountry']
      },
      {
        id: 'invalid_amounts',
        name: 'Invalid Account Balances',
        description: 'Corrupt currency amounts with invalid formats',
        severity: 1,
        options: ['accountBalance', 'payment', 'negativeAmounts']
      },
      {
        id: 'duplicate_docrefids',
        name: 'Duplicate DocRefIds',
        description: 'Create duplicate document reference IDs',
        severity: 3,
        options: ['duplicateAll', 'duplicateRandom']
      },
      {
        id: 'wrong_message_type',
        name: 'Wrong Message Type Indicators',
        description: 'Use incorrect CRS701/702/703 indicators',
        severity: 2,
        options: ['messageTypeIndic', 'docTypeIndic']
      },
      {
        id: 'malformed_xml',
        name: 'Malformed XML Structure',
        description: 'Break XML syntax (unclosed tags, invalid characters)',
        severity: 5,
        options: ['unclosedTags', 'invalidChars', 'brokenNamespaces']
      },
      {
        id: 'invalid_tin_format',
        name: 'Invalid TIN Formats',
        description: 'Corrupt TIN/GIIN formats',
        severity: 2,
        options: ['tin', 'giin', 'invalidLength']
      }
    ],
    fatca: [
      {
        id: 'missing_required',
        name: 'Missing Required Fields',
        description: 'Remove mandatory FATCA fields',
        severity: 2,
        options: ['docRefId', 'giin', 'filerCategory', 'accountNumber']
      },
      {
        id: 'invalid_giin',
        name: 'Invalid GIIN Format',
        description: 'Corrupt GIIN format (should be XXXXXX.XXXXX.XX.XXX)',
        severity: 2,
        options: ['wrongFormat', 'invalidLength', 'missingDots']
      },
      {
        id: 'wrong_filer_category',
        name: 'Invalid Filer Category',
        description: 'Use non-existent FATCA601-611 codes',
        severity: 2,
        options: ['invalidCode', 'wrongRange']
      },
      {
        id: 'invalid_account_types',
        name: 'Invalid Account Holder Types',
        description: 'Use wrong FATCA101-106 codes',
        severity: 2,
        options: ['accountHolderType', 'poolReportType']
      },
      {
        id: 'wrong_payment_types',
        name: 'Invalid Payment Types',
        description: 'Corrupt FATCA501-504 payment codes',
        severity: 1,
        options: ['paymentType', 'invalidCode']
      },
      {
        id: 'us_indicia_errors',
        name: 'US Indicia Conflicts',
        description: 'Create conflicts with US person indicators',
        severity: 3,
        options: ['missingSubstantialOwner', 'wrongCountryCode']
      },
      {
        id: 'malformed_xml',
        name: 'Malformed XML Structure',
        description: 'Break FATCA XML syntax',
        severity: 5,
        options: ['unclosedTags', 'invalidChars', 'brokenNamespaces']
      }
    ],
    cbc: [
      {
        id: 'missing_required',
        name: 'Missing Required Fields',
        description: 'Remove mandatory CBC fields',
        severity: 2,
        options: ['docRefId', 'reportingEntity', 'revenues', 'constituentEntity']
      },
      {
        id: 'invalid_revenues',
        name: 'Invalid Revenue Amounts',
        description: 'Corrupt financial data (revenues, profits, taxes)',
        severity: 2,
        options: ['revenues', 'profitLoss', 'taxPaid', 'negativeValues']
      },
      {
        id: 'wrong_entity_types',
        name: 'Invalid Entity Types',
        description: 'Use incorrect CBC entity type codes',
        severity: 2,
        options: ['entityType', 'invalidCode']
      },
      {
        id: 'missing_cbc_reports',
        name: 'Missing CBC Reports',
        description: 'Remove CbcReports or ConstituentEntity sections',
        severity: 3,
        options: ['cbcReports', 'constituentEntity', 'summary']
      },
      {
        id: 'invalid_message_type',
        name: 'Wrong CBC Message Type',
        description: 'Use incorrect CBC401/402/403 indicators',
        severity: 2,
        options: ['messageTypeIndic', 'docTypeIndic']
      },
      {
        id: 'duplicate_entities',
        name: 'Duplicate Entity Names',
        description: 'Create duplicate constituent entities',
        severity: 2,
        options: ['duplicateNames', 'duplicateDocRefIds']
      },
      {
        id: 'malformed_xml',
        name: 'Malformed XML Structure',
        description: 'Break CBC XML syntax',
        severity: 5,
        options: ['unclosedTags', 'invalidChars', 'brokenNamespaces']
      }
    ]
  };

  // CSV-specific corruption options
  const CSV_CORRUPTION_OPTIONS = [
    { id: 'missing_headers', name: 'Remove CSV Headers', severity: 3 },
    { id: 'wrong_delimiter', name: 'Change Delimiter (comma to semicolon)', severity: 2 },
    { id: 'missing_columns', name: 'Remove Random Columns', severity: 3 },
    { id: 'invalid_data_types', name: 'Corrupt Data Types (text in number fields)', severity: 2 },
    { id: 'empty_required_fields', name: 'Empty Required Fields', severity: 2 },
    { id: 'duplicate_rows', name: 'Duplicate Random Rows', severity: 1 },
    { id: 'invalid_dates', name: 'Invalid Date Formats', severity: 2 },
    { id: 'special_characters', name: 'Inject Special Characters', severity: 1 },
    { id: 'encoding_issues', name: 'Break UTF-8 Encoding', severity: 4 },
    { id: 'line_breaks', name: 'Add Random Line Breaks', severity: 3 }
  ];

  const handleFileUpload = async () => {
    const file = await window.electronAPI.selectXmlFile();
    if (file) {
      setUploadedFile(file);
      // Auto-detect file type
      const ext = file.split('.').pop().toLowerCase();
      setFileType(ext === 'csv' ? 'csv' : 'xml');
    }
  };

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset);
    // Initialize custom options based on preset
    const options = {};
    preset.options.forEach(opt => {
      options[opt] = true;
    });
    setCustomOptions(options);
  };

  const handleCorrupt = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const corruptionConfig = {
        module: selectedModule,
        fileType,
        corruptionLevel,
        preset: selectedPreset?.id,
        customOptions,
        inputFile: uploadedFile
      };

      const result = await window.electronAPI.corruptFile(corruptionConfig);
      setResult(result);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      1: 'text-yellow-500',
      2: 'text-orange-500',
      3: 'text-red-500',
      4: 'text-red-600',
      5: 'text-red-700'
    };
    return colors[severity] || 'text-gray-500';
  };

  const getSeverityBadge = (severity) => {
    const badges = {
      1: { label: 'Minor', class: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
      2: { label: 'Moderate', class: 'bg-orange-500/20 text-orange-600 border-orange-500/30' },
      3: { label: 'Severe', class: 'bg-red-500/20 text-red-600 border-red-500/30' },
      4: { label: 'Critical', class: 'bg-red-600/20 text-red-700 border-red-600/30' },
      5: { label: 'Fatal', class: 'bg-red-700/20 text-red-800 border-red-700/30' }
    };
    const badge = badges[severity] || badges[1];
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${badge.class}`}>
        {badge.label}
      </span>
    );
  };

  const currentPresets = fileType === 'csv' ? CSV_CORRUPTION_OPTIONS : CORRUPTION_PRESETS[selectedModule];

  return (
    <div className={`min-h-screen ${theme.background}`}>
      {/* Header */}
      <div className={`${theme.card} border-b ${theme.border} sticky top-0 z-10`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${theme.accent}`}>
                <Bug className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${theme.text}`}>Error Injector</h1>
                <p className={`text-sm ${theme.textMuted}`}>Corrupt XML/CSV files for testing purposes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span className={`text-sm ${theme.textMuted}`}>Testing Tool Only</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Upload & Module Selection */}
          <div className="lg:col-span-1 space-y-6">
            {/* Module Selection */}
            <div className={`${theme.card} rounded-xl border ${theme.border} p-6`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-4 flex items-center gap-2`}>
                <Target className="w-5 h-5" />
                Target Module
              </h3>
              <div className="space-y-2">
                {['crs', 'fatca', 'cbc'].map(module => (
                  <button
                    key={module}
                    onClick={() => setSelectedModule(module)}
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all text-left ${
                      selectedModule === module
                        ? 'border-blue-500 bg-blue-500/10'
                        : `${theme.border} ${theme.cardHover}`
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${theme.text}`}>{module.toUpperCase()}</span>
                      {selectedModule === module && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* File Upload */}
            <div className={`${theme.card} rounded-xl border ${theme.border} p-6`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-4 flex items-center gap-2`}>
                <Upload className="w-5 h-5" />
                Upload File
              </h3>
              
              {!uploadedFile ? (
                <button
                  onClick={handleFileUpload}
                  className={`w-full py-8 border-2 border-dashed ${theme.border} rounded-lg ${theme.cardHover} transition-all`}
                >
                  <FileText className={`w-12 h-12 mx-auto mb-3 ${theme.textMuted}`} />
                  <p className={`text-sm font-medium ${theme.text}`}>Click to upload</p>
                  <p className={`text-xs ${theme.textMuted} mt-1`}>XML or CSV file</p>
                </button>
              ) : (
                <div className={`p-4 rounded-lg border ${theme.border} bg-green-500/10`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className={`text-sm font-medium ${theme.text}`}>
                          {uploadedFile.split(/[/\\]/).pop()}
                        </p>
                        <p className={`text-xs ${theme.textMuted} mt-1`}>
                          Type: {fileType.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUploadedFile(null)}
                      className={`p-1 rounded ${theme.buttonSecondary} hover:opacity-80`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* File Type Toggle */}
              {uploadedFile && (
                <div className="mt-4 flex items-center gap-2">
                  <span className={`text-sm ${theme.textMuted}`}>File Type:</span>
                  <div className="flex gap-2">
                    {['xml', 'csv'].map(type => (
                      <button
                        key={type}
                        onClick={() => setFileType(type)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                          fileType === type
                            ? 'bg-blue-500 text-white'
                            : `${theme.buttonSecondary}`
                        }`}
                      >
                        {type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Corruption Level Slider */}
            <div className={`${theme.card} rounded-xl border ${theme.border} p-6`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-4 flex items-center gap-2`}>
                <Sliders className="w-5 h-5" />
                Corruption Intensity
              </h3>
              <div className="space-y-4">
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={corruptionLevel}
                  onChange={(e) => setCorruptionLevel(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="flex justify-between text-xs">
                  <span className={theme.textMuted}>Mild</span>
                  <span className={`font-bold ${getSeverityColor(corruptionLevel)}`}>
                    Level {corruptionLevel}
                  </span>
                  <span className={theme.textMuted}>Severe</span>
                </div>
                <p className={`text-xs ${theme.textMuted} text-center`}>
                  {corruptionLevel === 1 && 'Minor errors - Easy to fix'}
                  {corruptionLevel === 2 && 'Moderate errors - Some validation failures'}
                  {corruptionLevel === 3 && 'Severe errors - Multiple validation failures'}
                  {corruptionLevel === 4 && 'Critical errors - Hard to process'}
                  {corruptionLevel === 5 && 'Fatal errors - Completely broken'}
                </p>
              </div>
            </div>
          </div>

          {/* Middle Panel - Corruption Presets */}
          <div className="lg:col-span-2">
            <div className={`${theme.card} rounded-xl border ${theme.border} p-6`}>
              <h3 className={`text-lg font-semibold ${theme.text} mb-4 flex items-center gap-2`}>
                <Wrench className="w-5 h-5" />
                Corruption Presets
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentPresets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedPreset?.id === preset.id
                        ? 'border-red-500 bg-red-500/10'
                        : `${theme.border} ${theme.cardHover}`
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileWarning className={`w-5 h-5 ${getSeverityColor(preset.severity)}`} />
                        <span className={`font-medium ${theme.text}`}>{preset.name}</span>
                      </div>
                      {getSeverityBadge(preset.severity)}
                    </div>
                    <p className={`text-sm ${theme.textMuted}`}>{preset.description}</p>
                    
                    {/* Show options if selected */}
                    {selectedPreset?.id === preset.id && preset.options && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className={`text-xs font-medium ${theme.textMuted} mb-2`}>Options:</p>
                        <div className="flex flex-wrap gap-2">
                          {preset.options.map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={customOptions[opt] || false}
                                onChange={(e) => setCustomOptions(prev => ({
                                  ...prev,
                                  [opt]: e.target.checked
                                }))}
                                className="rounded"
                              />
                              <span className={`text-xs ${theme.text}`}>{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleCorrupt}
                  disabled={!uploadedFile || !selectedPreset || isProcessing}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    !uploadedFile || !selectedPreset || isProcessing
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Corrupting...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Corrupt File
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedPreset(null);
                    setCustomOptions({});
                    setResult(null);
                  }}
                  className={`px-6 py-3 rounded-lg font-medium ${theme.buttonSecondary} hover:opacity-80`}
                >
                  Reset
                </button>
              </div>

              {/* Result Display */}
              {result && (
                <div className={`mt-6 p-4 rounded-lg border ${
                  result.success 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${theme.text}`}>
                        {result.success ? 'File Corrupted Successfully!' : 'Corruption Failed'}
                      </p>
                      {result.outputPath && (
                        <p className={`text-sm ${theme.textMuted} mt-1`}>
                          Saved to: {result.outputPath}
                        </p>
                      )}
                      {result.error && (
                        <p className="text-sm text-red-600 mt-1">{result.error}</p>
                      )}
                      {result.corruptionsApplied && (
                        <div className="mt-2">
                          <p className={`text-xs font-medium ${theme.textMuted}`}>
                            Corruptions Applied: {result.corruptionsApplied.length}
                          </p>
                          <ul className="mt-1 space-y-1">
                            {result.corruptionsApplied.map((corruption, idx) => (
                              <li key={idx} className={`text-xs ${theme.textMuted}`}>
                                • {corruption}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    {result.success && result.outputPath && (
                      <button
                        onClick={() => window.electronAPI.openFile(result.outputPath)}
                        className={`px-3 py-1.5 rounded text-sm font-medium ${theme.buttonPrimary} hover:opacity-80 flex items-center gap-2`}
                      >
                        <Download className="w-4 h-4" />
                        Open
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ErrorInjector;
