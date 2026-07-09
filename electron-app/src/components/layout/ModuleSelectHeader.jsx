import { Settings } from 'lucide-react'
import { t } from '../../i18n/translations'
import mdesLogo from '../../assets/mdes-logo.png'

export function ModuleSelectHeader({ theme, language, onOpenSettings, onCycleTheme }) {
  return (
    <header className={`${theme.header} border-b shadow-sm`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={mdesLogo} alt="MDES" className="h-12 rounded-lg shadow-lg" />
            <div>
              <h1 className={`text-2xl font-bold ${theme.headerText || theme.text}`}>{t(language, 'appTitle')}</h1>
              <p className={`text-sm ${theme.headerTextMuted || theme.textMuted}`}>Professional XML generation for CRS, FATCA &amp; CBC reporting</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSettings}
              className={`p-2 rounded-lg transition-all ${theme.buttonSecondary}`}
              title="Settings"
              data-testid="nav-settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={onCycleTheme}
              className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${theme.buttonSecondary}`}
              title="Click to change theme"
            >
              <span>{theme.emoji}</span>
              <span className="text-sm font-medium hidden sm:inline">{theme.name}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
