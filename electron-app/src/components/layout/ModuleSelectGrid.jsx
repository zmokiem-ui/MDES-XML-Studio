import { CheckCircle2 } from 'lucide-react'
import { t } from '../../i18n/translations'

export function ModuleSelectGrid({ theme, language, modules, animationsEnabled, onSelectModule }) {
  return (
    <>
      <div className="text-center mb-12">
        <h2 className={`text-3xl font-bold ${theme.headerText || theme.text} mb-3`}>{t(language, 'selectModule')}</h2>
        <p className={`text-lg ${theme.headerTextMuted || theme.textMuted}`}>{t(language, 'common.select')} the reporting standard you want to work with</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(modules).map(([key, module]) => {
          const Icon = module.icon
          return (
            <button
              key={key}
              onClick={() => onSelectModule(key)}
              className={`${theme.card} rounded-2xl border p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-left group hover:scale-[1.02] ${
                animationsEnabled ? 'animate-fade-in' : ''
              }`}
            >
              <div className={`w-14 h-14 rounded-xl ${theme.card} flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform border-2 ${theme.border}`}>
                <Icon className={`w-7 h-7 ${theme.accentText}`} />
              </div>
              <h3 className={`text-xl font-bold ${theme.text} mb-1`}>{module.name}</h3>
              <p className={`text-xs ${theme.textMuted} mb-3`}>{module.fullName}</p>
              <p className={`text-sm ${theme.textMuted} mb-4`}>{module.description}</p>
              <div className="space-y-1.5">
                {module.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${theme.accentText}`} />
                    <span className={`text-xs ${theme.text}`}>{feature}</span>
                  </div>
                ))}
              </div>
              <div className={`mt-4 py-2.5 px-3 rounded-lg ${theme.buttonPrimary} font-semibold text-center text-sm group-hover:opacity-90 transition-opacity border-2 ${theme.border}`}>
                {t(language, 'actions.open')} {module.name}
              </div>
            </button>
          )
        })}
      </div>

      {/* Coming Soon */}
      <div className="mt-10 text-center">
        <p className={`${theme.textMuted} text-sm mb-3`}>{t(language, 'footer.moreModulesComingSoon')}</p>
        <div className="flex justify-center gap-4">
          <div className={`${theme.card} rounded-lg border px-4 py-2 opacity-50`}>
            <span className={`font-medium ${theme.text}`}>NTJ</span>
            <span className={`text-xs ${theme.textMuted} ml-2`}>{t(language, 'footer.nonTaxJurisdiction')}</span>
          </div>
        </div>
      </div>
    </>
  )
}
