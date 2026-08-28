import { useMemo, useState } from 'react'
import { AlertTriangle, BookOpen, ChevronDown, Search } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  MDES_ERROR_CATALOG,
  MDES_ERROR_STAGES,
  searchMdesErrors,
} from '../data/mdesErrorCatalog.mjs'

const FEATURED = new Set(['50002', '50004', '50008', '50009', 'TARGET-COUNTRY'])

export function MdesErrorGuide() {
  const { theme } = useApp()
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState('All')
  const [expanded, setExpanded] = useState(false)
  const matches = useMemo(() => searchMdesErrors(query, stage), [query, stage])
  const visible = expanded || query || stage !== 'All'
    ? matches
    : matches.filter(item => FEATURED.has(item.code))

  return (
    <section className={`${theme.card} rounded-xl border p-6 shadow-sm`} aria-labelledby="mdes-error-guide-title">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 id="mdes-error-guide-title" className={`text-lg font-semibold ${theme.text} flex items-center gap-2`}>
            <BookOpen className="w-5 h-5" />
            MDES error guide
          </h2>
          <p className={`text-sm ${theme.textMuted} mt-1 max-w-3xl`}>
            Search a portal code or symptom. Each answer separates target setup,
            certificates, package encryption, XML headers, and business data—and
            tells you whether the same ZIP is safe to retry.
          </p>
        </div>
        <span className={`text-xs ${theme.textMuted}`}>
          {MDES_ERROR_CATALOG.length} documented problems
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3 mb-4">
        <label className="relative">
          <span className="sr-only">Search MDES errors</span>
          <Search className={`absolute left-3 top-2.5 w-4 h-4 ${theme.textMuted}`} />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Try 50008, signature, properties, duplicate…"
            className={`w-full pl-9 pr-3 py-2 rounded-lg border ${theme.input} ${theme.text}`}
          />
        </label>
        <select
          aria-label="Filter MDES errors by stage"
          value={stage}
          onChange={event => setStage(event.target.value)}
          className={`w-full px-3 py-2 rounded-lg border ${theme.input} ${theme.text}`}
        >
          <option>All</option>
          {MDES_ERROR_STAGES.map(value => <option key={value}>{value}</option>)}
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className={`text-sm ${theme.text}`}>
            No exact match. Copy the complete MDES description, code, node/path,
            and whether one file or every file fails; those details identify the stage.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(item => (
            <details key={item.code} className={`rounded-lg border ${theme.input} group`}>
              <summary className="list-none cursor-pointer px-4 py-3 flex items-center gap-3">
                <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-300 shrink-0">
                  {item.code}
                </span>
                <span className={`font-medium ${theme.text} flex-1`}>{item.title}</span>
                <span className={`hidden sm:inline text-xs ${theme.textMuted}`}>{item.stage}</span>
                <ChevronDown className={`w-4 h-4 ${theme.textMuted} transition-transform group-open:rotate-180`} />
              </summary>
              <div className="px-4 pb-4 pt-1 grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                <div>
                  <h3 className={`font-semibold ${theme.text} mb-1`}>What it means</h3>
                  <p className={theme.textMuted}>{item.meaning}</p>
                  <h3 className={`font-semibold ${theme.text} mt-3 mb-1`}>Likely causes</h3>
                  <ul className={`list-disc pl-5 space-y-1 ${theme.textMuted}`}>
                    {item.causes.map(cause => <li key={cause}>{cause}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className={`font-semibold ${theme.text} mb-1`}>What to do</h3>
                  <ol className={`list-decimal pl-5 space-y-1 ${theme.textMuted}`}>
                    {item.actions.map(action => <li key={action}>{action}</li>)}
                  </ol>
                  <div className="mt-3 rounded-md border border-blue-500/30 bg-blue-500/5 p-3">
                    <span className={`font-semibold ${theme.text}`}>Retry guidance: </span>
                    <span className={theme.textMuted}>{item.retry}</span>
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}

      {!query && stage === 'All' && (
        <button
          type="button"
          onClick={() => setExpanded(value => !value)}
          className={`mt-4 text-sm ${theme.textMuted} hover:underline`}
        >
          {expanded ? 'Show common errors only' : `Show all ${MDES_ERROR_CATALOG.length} errors`}
        </button>
      )}
    </section>
  )
}
