import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useApp } from '../../context/AppContext'

/**
 * The settings page as a set of collapsible sections.
 *
 * Settings grew a section at a time — jurisdictions, certificates, an MDES
 * target — until the page was a single scroll no one could keep in their head.
 * Collapsing turns it back into a list you can read: every section states what
 * it is and, where it helps, what it is currently set to, so the common case is
 * answered from the header without opening anything.
 *
 * Which sections are open is remembered per machine, so someone who lives in
 * one section does not reopen it every visit.
 */

const OPEN_SECTIONS_KEY = 'crs-settings-open-sections'

function readOpenSections() {
  try {
    const saved = JSON.parse(localStorage.getItem(OPEN_SECTIONS_KEY))
    return saved && typeof saved === 'object' ? saved : {}
  } catch {
    return {}
  }
}

/**
 * Open/closed state for a page of sections. `defaults` decides what a first
 * visit shows; anything the user has since toggled wins over it.
 */
export function useSettingsSections(defaults = {}) {
  const [open, setOpen] = useState(() => {
    const saved = readOpenSections()
    // Only ids this page knows about: a stale id from an older build should not
    // linger in state and end up back in storage.
    return Object.fromEntries(
      Object.keys(defaults).map(id => [
        id, typeof saved[id] === 'boolean' ? saved[id] : defaults[id],
      ])
    )
  })

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_SECTIONS_KEY, JSON.stringify(open))
    } catch {
      // A settings page that cannot remember its layout is still a usable one.
    }
  }, [open])

  return {
    isOpen: (id) => !!open[id],
    toggle: (id) => setOpen(prev => ({ ...prev, [id]: !prev[id] })),
    setAll: (value) => setOpen(prev => (
      Object.fromEntries(Object.keys(prev).map(id => [id, value]))
    )),
    allOpen: Object.values(open).every(Boolean),
  }
}

export function SettingsSection({
  icon: Icon,
  title,
  description,
  summary,
  open,
  onToggle,
  testId,
  children,
}) {
  const { theme } = useApp()

  return (
    <section
      className={`${theme.card} rounded-xl border shadow-sm overflow-hidden`}
      data-testid={testId}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${theme.cardHover}`}
      >
        {Icon && (
          <span className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${theme.bg}`}>
            <Icon className={`w-5 h-5 ${theme.accentText}`} />
          </span>
        )}
        <span className="flex-1 min-w-0">
          <h3 className={`font-semibold ${theme.text}`}>{title}</h3>
          {description && (
            <p className={`text-sm ${theme.textMuted} mt-0.5`}>{description}</p>
          )}
        </span>
        {summary && (
          <span className={`hidden sm:inline-block shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${theme.badge}`}>
            {summary}
          </span>
        )}
        <ChevronDown
          className={`w-5 h-5 shrink-0 ${theme.textMuted} transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className={`px-5 pb-5 pt-5 border-t ${theme.border}`}>
          {children}
        </div>
      )}
    </section>
  )
}

/** A labelled switch: the shape every on/off setting on this page takes. */
export function SettingToggle({ label, description, checked, onChange, testId }) {
  const { theme } = useApp()

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className={`font-medium ${theme.text}`}>{label}</p>
        {description && (
          <p className={`text-sm ${theme.textMuted} mt-1`}>{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        data-testid={testId}
        aria-checked={checked}
        aria-pressed={checked}
        aria-label={typeof label === 'string' ? label : undefined}
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 mt-0.5 ${checked ? 'bg-blue-600' : 'bg-gray-400'}`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${checked ? 'translate-x-6' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  )
}

/** A titled block inside a section, for sections that hold more than one thing. */
export function SettingsBlock({ title, description, action, children, divided = true }) {
  const { theme } = useApp()

  return (
    <div className={divided ? `border-t ${theme.border} pt-5 mt-5` : ''}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            {title && <h4 className={`font-medium ${theme.text}`}>{title}</h4>}
            {description && (
              <p className={`text-sm ${theme.textMuted} mt-0.5`}>{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
