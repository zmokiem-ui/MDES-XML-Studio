import { t } from '../../i18n/translations'
import blyceLogo from '../../assets/blyce-logo.png'

const GRADIENTS = {
  ocean: 'linear-gradient(to right, #06b6d4, #0284c7, #0369a1)',
  forest: 'linear-gradient(to right, #10b981, #059669, #047857)',
  sunset: 'linear-gradient(to right, #fb923c, #f97316, #ea580c)',
  lavender: 'linear-gradient(to right, #a78bfa, #c084fc, #e879f9)',
  midnight: 'linear-gradient(to right, #8b5cf6, #7c3aed, #6d28d9)',
  spaceGalaxy: 'linear-gradient(to right, #00d9ff, #7b2cbf, #ff006e)',
  cyberpunkNeon: 'linear-gradient(to right, #ff006e, #00f0ff, #b400ff)',
  organicForest: 'linear-gradient(to right, #4a7c39, #2d5016, #65a30d)',
  oceanUnderwater: 'linear-gradient(to right, #06b6d4, #0891b2, #0e7490)',
  steampunkVictorian: 'linear-gradient(to right, #d4af37, #b87333, #8b4513)',
  dark: 'linear-gradient(to right, #3b82f6, #8b5cf6, #ec4899)',
}
const DEFAULT_GRADIENT = 'linear-gradient(to right, #2563eb, #7c3aed, #db2777)'

export function Footer({ theme, selectedTheme, language }) {
  return (
    <div className="mt-16 flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        <span className={`text-sm ${theme.textMuted}`}>Powered by</span>
        <img src={blyceLogo} alt="BLYCE" className="h-8 rounded" />
      </div>
      <p
        className="text-lg font-bold bg-clip-text text-transparent animate-pulse"
        style={{
          animationDuration: '3s',
          backgroundImage: GRADIENTS[selectedTheme] || DEFAULT_GRADIENT,
          filter: 'drop-shadow(0 0 10px rgba(147, 51, 234, 0.5))',
        }}
      >
        {t(language, 'footer.createdBy')}
      </p>
    </div>
  )
}
