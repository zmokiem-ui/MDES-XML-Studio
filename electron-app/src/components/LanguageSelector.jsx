import React, { useState } from 'react'
import { Languages, AlertTriangle, Info, X } from 'lucide-react'

// Language definitions matching Python backend
const LANGUAGES = {
  'en_US': { name: 'English (US)', script: 'Latin', safe: true },
  'nl_NL': { name: 'Dutch', script: 'Latin', safe: true },
  'fr_FR': { name: 'French', script: 'Latin', safe: true },
  'de_DE': { name: 'German', script: 'Latin', safe: true },
  'es_ES': { name: 'Spanish', script: 'Latin', safe: true },
  'ru_RU': { name: 'Russian (Cyrillic)', script: 'Cyrillic', safe: false },
  'uk_UA': { name: 'Ukrainian (Cyrillic)', script: 'Cyrillic', safe: false },
  'zh_CN': { name: 'Chinese (Simplified)', script: 'Chinese', safe: false },
  'zh_TW': { name: 'Chinese (Traditional)', script: 'Chinese', safe: false },
  'ja_JP': { name: 'Japanese', script: 'Japanese', safe: false },
  'ko_KR': { name: 'Korean', script: 'Korean', safe: false },
  'hi_IN': { name: 'Hindi (Devanagari)', script: 'Devanagari', safe: false },
  'ar_SA': { name: 'Arabic', script: 'Arabic', safe: false },
  'he_IL': { name: 'Hebrew', script: 'Hebrew', safe: false },
  'it_IT': { name: 'Italian', script: 'Latin', safe: true },
  'pt_BR': { name: 'Portuguese', script: 'Latin', safe: true },
  'pl_PL': { name: 'Polish', script: 'Latin', safe: true },
  'tr_TR': { name: 'Turkish', script: 'Latin', safe: true }
}

const LANGUAGE_CATEGORIES = {
  'Western European': ['en_US', 'nl_NL', 'fr_FR', 'de_DE', 'es_ES', 'it_IT', 'pt_BR'],
  'Eastern European': ['ru_RU', 'uk_UA', 'pl_PL', 'tr_TR'],
  'East Asian': ['zh_CN', 'zh_TW', 'ja_JP', 'ko_KR'],
  'South Asian': ['hi_IN'],
  'Middle Eastern': ['ar_SA', 'he_IL']
}

export function LanguageSelector({ value = 'en_US', onChange, theme = 'dark' }) {
  const [showModal, setShowModal] = useState(false)
  const [tempLanguage, setTempLanguage] = useState(value)

  const selectedLang = LANGUAGES[value] || LANGUAGES['en_US']
  const requiresNVarchar = !selectedLang.safe

  const handleSave = () => {
    onChange(tempLanguage)
    setShowModal(false)
  }

  return (
    <>
      {/* Compact Selector Button */}
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${
        theme === 'dark' 
          ? 'bg-gray-800/50 border-gray-700' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <Languages className="w-5 h-5 text-blue-400" />
        <div className="flex-1">
          <div className="text-sm font-medium">Data Language</div>
          <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {selectedLang.name}
            {requiresNVarchar && (
              <span className="ml-2 text-orange-400">⚠️ NVARCHAR Required</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            theme === 'dark'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          Change
        </button>
      </div>

      {/* Language Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-2xl rounded-xl shadow-2xl ${
            theme === 'dark' ? 'bg-gray-900' : 'bg-white'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <Languages className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold">Select Data Language</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Banner */}
            <div className={`mx-6 mt-6 p-4 rounded-lg border ${
              theme === 'dark'
                ? 'bg-blue-900/20 border-blue-800'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium mb-1">Language affects generated names, addresses, and company names</div>
                  <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    Languages with ⚠️ require NVARCHAR database columns (not VARCHAR)
                  </div>
                </div>
              </div>
            </div>

            {/* Language Grid */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {Object.entries(LANGUAGE_CATEGORIES).map(([category, langCodes]) => (
                <div key={category} className="mb-6 last:mb-0">
                  <h3 className={`text-sm font-semibold mb-3 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {langCodes.map(code => {
                      const lang = LANGUAGES[code]
                      const isSelected = tempLanguage === code
                      return (
                        <button
                          key={code}
                          onClick={() => setTempLanguage(code)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            isSelected
                              ? theme === 'dark'
                                ? 'bg-blue-600 border-blue-500'
                                : 'bg-blue-500 border-blue-400 text-white'
                              : theme === 'dark'
                                ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{lang.name}</span>
                            {!lang.safe && (
                              <AlertTriangle className="w-4 h-4 text-orange-400" />
                            )}
                          </div>
                          <div className={`text-xs mt-1 ${
                            isSelected 
                              ? 'text-blue-100' 
                              : theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
                          }`}>
                            {lang.script}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Warning for non-safe languages */}
            {!LANGUAGES[tempLanguage]?.safe && (
              <div className={`mx-6 mb-6 p-4 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-orange-900/20 border-orange-800'
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium mb-1 text-orange-400">Database Encoding Warning</div>
                    <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      {LANGUAGES[tempLanguage]?.name} contains non-Latin characters. Your database columns 
                      <strong className="text-orange-400"> MUST use NVARCHAR</strong> (not VARCHAR) to properly 
                      store these characters.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className={`flex items-center justify-between p-6 border-t ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <button
                onClick={() => {
                  setTempLanguage('en_US')
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Reset to English
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-800 hover:bg-gray-700'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Apply Language
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default LanguageSelector
