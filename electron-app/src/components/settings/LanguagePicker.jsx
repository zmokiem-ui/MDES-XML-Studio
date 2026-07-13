import { CheckCircle2 } from 'lucide-react'
import { LANGUAGES } from '../../i18n/translations'

export function LanguagePicker({ theme, language, onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Object.entries(LANGUAGES).map(([code, lang]) => (
        <button
          key={code}
          onClick={() => onSelect(code)}
          type="button"
          data-testid={`language-${code}`}
          aria-pressed={language === code}
          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
            language === code
              ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
              : `${theme.border} hover:border-gray-400`
          }`}
        >
          <span className="text-2xl">{lang.flag}</span>
          <div className="text-left">
            <p className={`font-medium ${theme.text}`}>{lang.nativeName}</p>
            <p className={`text-xs ${theme.textMuted}`}>{lang.name}</p>
          </div>
          {language === code && (
            <CheckCircle2 className="w-5 h-5 text-blue-500 ml-auto" />
          )}
        </button>
      ))}
    </div>
  )
}
