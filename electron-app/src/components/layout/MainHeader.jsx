import { ArrowLeft, Rocket, FileEdit, AlertTriangle, Code, RefreshCw } from 'lucide-react'
import { t } from '../../i18n/translations'

export function MainHeader({
  theme,
  language,
  currentModule,
  ModuleIcon,
  activeModule,
  currentPage,
  onNavigate,
  onBack,
  onCycleTheme,
}) {
  const navItems = [
    { id: 'generator', icon: Rocket, label: t(language || 'en', 'nav.generator') },
    { id: 'corrections', icon: FileEdit, label: t(language || 'en', 'nav.correction') },
    { id: 'faulty-xml', icon: AlertTriangle, label: t(language, 'settingsMisc.faultyXml') },
    { id: 'editor', icon: Code, label: 'Editor' },
    ...(activeModule === 'crs' ? [{ id: 'tools', icon: RefreshCw, label: t(language || 'en', 'tools.title') }] : []),
  ]

  return (
    <header className={`${theme.header} border-b shadow-sm sticky top-0 z-40`}>
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Back to module selection */}
            <button
              onClick={onBack}
              className={`p-2 rounded-lg transition-colors ${theme.buttonSecondary}`}
              title="Back to module selection"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className={`w-10 h-10 rounded-xl ${theme.buttonPrimary} flex items-center justify-center shadow-lg`}>
              <ModuleIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${theme.text}`}>{currentModule.name} Generator</h1>
              <p className={`text-xs ${theme.textMuted}`}>{currentModule.fullName}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                  currentPage === id
                    ? `${theme.buttonPrimary} shadow-md`
                    : `${theme.icon} ${theme.iconHover} ${theme.cardHover}`
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>

          {/* Theme toggle */}
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
    </header>
  )
}
