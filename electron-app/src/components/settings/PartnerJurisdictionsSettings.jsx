import { useState } from 'react'
import { X } from 'lucide-react'
import { COUNTRIES, DEFAULT_PARTNER_JURISDICTIONS, getCountryName, searchCountries } from '../../countryData'
import { useApp } from '../../context/AppContext'
import { t } from '../../i18n/translations'

export function PartnerJurisdictionsSettings({ embedded = false }) {
  const { theme, language, settings, setSettings } = useApp()
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const selected = settings.partnerJurisdictions || []
  const matches = searchCountries(search)
    .filter(country => !selected.includes(country.code))
    .slice(0, 10)

  const setSelected = (partnerJurisdictions) => {
    setSettings(prev => ({ ...prev, partnerJurisdictions }))
  }

  const addCountry = (code) => {
    setSelected([...selected, code].sort())
    setSearch('')
    setShowDropdown(false)
  }

  const removeCountry = (code) => {
    setSelected(selected.filter(country => country !== code))
  }

  return (
    <div className={embedded ? '' : `${theme.card} rounded-xl border p-6 shadow-sm`}>
      {/* Standalone, this block is its own card; inside a settings section the
          section header already says what it is. */}
      {!embedded && (
        <>
          <h3 className={`text-lg font-semibold ${theme.text} mb-2`}>
            {t(language, 'jurisdictions.title')}
          </h3>
          <p className={`text-sm ${theme.textMuted} mb-4`}>
            {t(language, 'jurisdictions.description')}
          </p>
        </>
      )}

      <div className="relative mb-4">
        <input
          type="text"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={t(language, 'jurisdictions.searchPlaceholder')}
          className={`w-full px-4 py-2 rounded-lg border ${theme.input} ${theme.text}`}
        />

        {showDropdown && search && (
          <div className={`absolute z-10 w-full mt-1 ${theme.card} border rounded-lg shadow-lg max-h-60 overflow-y-auto`}>
            {matches.map(country => (
              <button
                key={country.code}
                type="button"
                onClick={() => addCountry(country.code)}
                className={`w-full px-4 py-2 text-left ${theme.cardHover} flex items-center justify-between ${theme.text}`}
              >
                <span>{country.name}</span>
                <span className={`text-sm font-mono ${theme.textMuted}`}>{country.code}</span>
              </button>
            ))}
            {matches.length === 0 && (
              <div className={`px-4 py-2 ${theme.textMuted}`}>
                {t(language, 'jurisdictions.noCountriesFound')}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 mb-2">
        <span className={`text-sm font-medium ${theme.text}`}>
          {t(language, 'jurisdictions.selectedCountries')} ({selected.length})
        </span>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setSelected(COUNTRIES.map(country => country.code))}
            className={`text-xs px-2 py-1 rounded ${theme.buttonSecondary}`}
          >
            {t(language, 'jurisdictions.selectAll')}
          </button>
          <button
            type="button"
            onClick={() => setSelected([])}
            className={`text-xs px-2 py-1 rounded ${theme.buttonSecondary}`}
          >
            {t(language, 'jurisdictions.clearAll')}
          </button>
          <button
            type="button"
            onClick={() => setSelected(DEFAULT_PARTNER_JURISDICTIONS)}
            className={`text-xs px-2 py-1 rounded ${theme.accentText} hover:opacity-80`}
          >
            {t(language, 'jurisdictions.resetToDefault')}
          </button>
        </div>
      </div>

      <div className={`flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 border rounded-lg ${theme.card}`}>
        {selected.map(code => (
          <span key={code} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${theme.badge}`}>
            <span className="font-medium">{getCountryName(code)}</span>
            <span className="text-xs font-mono opacity-60">{code}</span>
            <button
              type="button"
              onClick={() => removeCountry(code)}
              className="ml-1 hover:text-red-500 transition-colors"
              aria-label={`${t(language, 'common.remove')} ${getCountryName(code)}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {selected.length === 0 && (
          <span className={`${theme.textMuted} text-sm`}>
            {t(language, 'jurisdictions.noCountriesSelected')}
          </span>
        )}
      </div>
    </div>
  )
}
