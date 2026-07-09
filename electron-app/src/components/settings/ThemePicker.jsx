export function ThemePicker({ theme, selectedTheme, themes, onSelect }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {Object.entries(themes).map(([key, themeObj]) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`p-3 rounded-xl border-2 transition-all ${
            selectedTheme === key
              ? `${themeObj.buttonPrimary} shadow-lg`
              : `${theme.border} ${theme.cardHover}`
          }`}
        >
          <span className="text-2xl">{themeObj.emoji}</span>
          <p className={`text-xs mt-1 ${theme.text}`}>{themeObj.name}</p>
        </button>
      ))}
    </div>
  )
}
