import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle, Check, ChevronDown, ChevronRight, FolderOpen, MinusCircle, Server, Zap,
} from 'lucide-react'
import { useApp } from '../context/AppContext'

/**
 * One click: ask the target what it would accept, then build exactly that.
 *
 * The preflight list is the point of the card, not decoration. Each check names
 * the MDES error it predicts, so a refusal reads as "this would come back as
 * 50004" — which is the question a tester is actually asking. A failing check
 * blocks the build; the override is deliberate and separate.
 *
 * Developer mode only.
 */

const OUTCOME_STYLES = {
  pass: { icon: Check, className: 'text-green-500' },
  warn: { icon: AlertTriangle, className: 'text-amber-500' },
  fail: { icon: AlertTriangle, className: 'text-red-500' },
  skip: { icon: MinusCircle, className: 'opacity-50' },
}

export function TargetBuildCard({ onPackageBuilt }) {
  const { theme } = useApp()
  const [targets, setTargets] = useState([])
  const [selected, setSelected] = useState('')
  const [preflight, setPreflight] = useState(null)
  const [outputDir, setOutputDir] = useState('')
  const [checking, setChecking] = useState(false)
  const [building, setBuilding] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(true)
  // Reading the target list spawns the backend, so it takes a moment. Until it
  // answers we must not claim there are none - that reads as "not configured"
  // to someone who configured it a minute ago.
  const [loadingTargets, setLoadingTargets] = useState(true)

  useEffect(() => {
    window.electronAPI.mdesTargetList()
      .then(response => {
        const list = response.targets || []
        setTargets(list)
        if (list.length && !selected) setSelected(list[0].name)
      })
      .finally(() => setLoadingTargets(false))
    // Deliberately runs once: the target list is edited in Settings, not here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const check = useCallback(async (name) => {
    if (!name) return
    setChecking(true)
    setError(null)
    setResult(null)
    try {
      const response = await window.electronAPI.mdesTargetPreflight({ target: name })
      setPreflight(response)
      if (response.success === false && !response.checks) setError(response.error)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => { if (selected) check(selected) }, [selected, check])

  const build = async (force = false) => {
    setBuilding(true)
    setError(null)
    setResult(null)
    try {
      const response = await window.electronAPI.mdesTargetBuild({
        target: selected,
        outputDir: outputDir || null,
        force,
      })
      if (response.success) {
        setResult(response)
        onPackageBuilt?.(response)
      } else {
        setError(response.error || 'The package could not be built')
        if (response.checks) setPreflight(response)
      }
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBuilding(false)
    }
  }

  if (loadingTargets || !targets.length) {
    return (
      <div className={`${theme.card} rounded-xl border p-6 shadow-sm`} data-testid="target-build-card">
        <h2 className={`text-lg font-semibold ${theme.text} flex items-center gap-2 mb-1`}>
          <Server className="w-5 h-5" />
          Build for an MDES instance
        </h2>
        <p className={`text-sm ${theme.textMuted}`}>
          {loadingTargets
            ? 'Reading configured targets...'
            : 'No targets configured. Add one under Settings, MDES target — then this builds an upload-ready package in one click.'}
        </p>
      </div>
    )
  }

  const blocked = preflight?.blocked
  const failures = (preflight?.checks || []).filter(c => c.outcome === 'fail')

  return (
    <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
      <h2 className={`text-lg font-semibold ${theme.text} flex items-center gap-2 mb-1`}>
        <Server className="w-5 h-5" />
        Build for an MDES instance
      </h2>
      <p className={`text-sm ${theme.textMuted} mb-5`}>
        Reads the instance's own rules — its country, which senders it accepts and
        which certificate it verifies each one against — then generates and
        packages a delivery that fits.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className={`block text-sm font-medium ${theme.text} mb-1`}>Target</label>
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${theme.input} ${theme.text}`}
          >
            {targets.map(target => (
              <option key={target.name} value={target.name}>{target.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={`block text-sm font-medium ${theme.text} mb-1`}>Output folder</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={outputDir}
              placeholder="Working directory"
              className={`flex-1 px-3 py-2 rounded-lg border ${theme.input} ${theme.text}`}
            />
            <button
              onClick={async () => {
                const dir = await window.electronAPI.ctsSelectOutputFolder()
                if (dir) setOutputDir(dir)
              }}
              className={`px-4 py-2 rounded-lg ${theme.buttonSecondary}`}
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {preflight?.sender && (
        <div className={`p-3 rounded-lg border ${theme.input} mb-4`}>
          <p className={`text-sm ${theme.text}`}>
            This target wants{' '}
            <span className="font-mono font-semibold">{preflight.sender}</span>
            {' → '}
            <span className="font-mono font-semibold">{preflight.receiver}</span>
            {preflight.taxYear ? `, tax year ${preflight.taxYear}` : ''}
            {preflight.docTypeIndics?.length
              ? `, DocTypeIndic ${preflight.docTypeIndics[0]}–${preflight.docTypeIndics.slice(-1)[0]}`
              : ''}
            .
          </p>
        </div>
      )}

      {/* --- preflight ---------------------------------------------------- */}
      {preflight?.checks && (
        <div className="mb-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`text-sm flex items-center gap-1 ${theme.textMuted} mb-2`}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Preflight
            {blocked
              ? <span className="text-red-500 ml-1">{failures.length} blocking</span>
              : <span className="text-green-500 ml-1">all clear</span>}
          </button>
          {expanded && (
            <ul className="space-y-1.5">
              {preflight.checks.map(check => {
                const style = OUTCOME_STYLES[check.outcome] || OUTCOME_STYLES.skip
                const Icon = style.icon
                return (
                  <li key={check.id + check.title} className="flex items-start gap-2">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${style.className}`} />
                    <div className="min-w-0">
                      <p className={`text-sm ${theme.text}`}>
                        {check.title}
                        {check.mdesError && check.outcome === 'fail' && (
                          <span className="ml-2 text-xs font-mono text-red-500">
                            MDES {check.mdesError}
                          </span>
                        )}
                      </p>
                      <p className={`text-xs ${theme.textMuted}`}>{check.detail}</p>
                      {check.remedy && check.outcome === 'fail' && (
                        <p className="text-xs text-amber-500">{check.remedy}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => build(false)}
          disabled={building || checking || blocked}
          className={`flex-1 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${theme.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Zap className="w-4 h-4" />
          {building ? 'Building...' : checking ? 'Checking...' : 'Build and package'}
        </button>
        {blocked && (
          <button
            onClick={() => build(true)}
            disabled={building}
            className={`px-4 py-3 rounded-lg text-sm ${theme.buttonSecondary}`}
            title="Build despite the failing checks - the file will be rejected"
          >
            Build anyway
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg border border-red-500/40 bg-red-500/10">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 rounded-lg border border-green-500/40 bg-green-500/10 space-y-2">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span className={`text-sm font-medium ${theme.text}`}>{result.fileName}</span>
            {result.forced && (
              <span className="text-xs text-amber-500">built despite failing checks</span>
            )}
          </div>
          <dl className={`text-xs ${theme.textMuted} space-y-1`}>
            <div><dt className="inline font-medium">Entries: </dt>
              <dd className="inline font-mono">{(result.entries || []).join(', ')}</dd></div>
            <div><dt className="inline font-medium">SenderFileId: </dt>
              <dd className="inline font-mono">{result.senderFileId}</dd></div>
            <div><dt className="inline font-medium">From: </dt>
              <dd className="inline font-mono">{result.sourceFile}</dd></div>
          </dl>
          <button
            onClick={() => window.electronAPI.openFileLocation(result.filePath)}
            className={`px-3 py-1.5 rounded text-xs ${theme.buttonSecondary}`}
          >
            Show in folder
          </button>
        </div>
      )}
    </div>
  )
}
