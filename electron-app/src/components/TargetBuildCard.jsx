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

/** Why a fault is greyed out, in the dropdown itself — a disabled option with
 *  no reason reads as a bug rather than as a rule. */
function applicabilityHint(item) {
  if (item.applicable) return ''
  // A blocked fault is not "wrong target", it is "no target can show this" —
  // saying so stops someone hunting for the instance that would enable it.
  if (item.blocked) return ' (an upload cannot report this)'
  if (item.requiresEnvironment) return ` (needs a ${item.requiresEnvironment} instance)`
  if (item.requiresFileType) return ` (needs a ${item.requiresFileType} delivery)`
  return ' (does not apply here)'
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
  // The faults this build can deliberately provoke. The catalogue - including
  // which ones fit this target - comes from the backend, so the applicability
  // rules are stated once, next to the MDES rules they come from.
  const [provocations, setProvocations] = useState([])
  const [provoke, setProvoke] = useState('')
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

  // Whether a fault applies depends on the delivery this target produces: the
  // domestic prefix rules cannot fire on a cross-border upload, and the
  // test/production pair depends on the instance. Both are known only once
  // preflight has answered, so the catalogue is re-read with it.
  const sender = preflight?.sender
  const receiver = preflight?.receiver
  useEffect(() => {
    if (!selected) return
    const fileType = sender && receiver
      ? (sender === receiver ? 'domestic' : 'foreign')
      : null
    window.electronAPI.mdesTargetProvocations({ target: selected, fileType })
      .then(response => {
        const list = response.provocations || []
        setProvocations(list)
        // Keep the choice only if it still fits what this target can produce.
        setProvoke(current => {
          const match = list.find(item => item.code === current)
          return match && match.applicable ? current : ''
        })
      })
      .catch(() => setProvocations([]))
  }, [selected, sender, receiver])

  const build = async (force = false) => {
    setBuilding(true)
    setError(null)
    setResult(null)
    try {
      const response = await window.electronAPI.mdesTargetBuild({
        target: selected,
        outputDir: outputDir || null,
        provoke: provoke || null,
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
  const warnings = (preflight?.checks || []).filter(c => c.outcome === 'warn')
  const chosen = provocations.find(item => item.code === provoke) || null

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

      {/* Negative testing: build a delivery that fails for one known reason.
          One at a time, because MDES reports only the first check that fails —
          a package carrying two faults cannot tell you which rule caught it. */}
      <div className="mb-4">
        <label htmlFor="provoke-error" className={`block text-sm font-medium ${theme.text} mb-1`}>
          Provoke an error (optional)
        </label>
        <select
          id="provoke-error"
          data-testid="provoke-select"
          value={provoke}
          onChange={(event) => setProvoke(event.target.value)}
          className={`w-full px-3 py-2 rounded-lg border ${theme.input} ${theme.text}`}
        >
          <option value="">None — build a valid package</option>
          {[...new Set(provocations.map(item => item.stage))].map(stage => (
            <optgroup key={stage} label={stage}>
              {provocations.filter(item => item.stage === stage).map(item => (
                <option key={item.code} value={item.code} disabled={!item.applicable}>
                  {item.code} — {item.title}{applicabilityHint(item)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {chosen ? (
          <div className="mt-2 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10">
            <p className={`text-xs ${theme.text}`}>{chosen.method}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{chosen.expect}</p>
          </div>
        ) : (
          <p className={`text-xs ${theme.textMuted} mt-1`}>
            Builds a delivery MDES should reject for one known reason, so the upload
            result tells you which rule fired. The fault is verified before the
            package is written.
          </p>
        )}
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
              : warnings.length
                // "all clear" over a collapsed warning hides the one thing the
                // build cannot decide for itself - a mixed target, say.
                ? <span className="text-amber-500 ml-1">{warnings.length} to confirm</span>
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
                      {check.remedy && (check.outcome === 'fail' || check.outcome === 'warn') && (
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
          {building ? 'Building...'
            : checking ? 'Checking...'
              : provoke ? `Build faulty package (${provoke})`
                : 'Build and package'}
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
        <div className={`mt-4 p-4 rounded-lg border space-y-2 ${
          result.provoked
            ? 'border-amber-500/40 bg-amber-500/10'
            : 'border-green-500/40 bg-green-500/10'
        }`}>
          <div className="flex items-center gap-2">
            {/* A deliberately faulty package is not a success in green: it is
                only useful if the reader knows it is meant to be rejected. */}
            {result.provoked
              ? <AlertTriangle className="w-4 h-4 text-amber-500" />
              : <Check className="w-4 h-4 text-green-500" />}
            <span className={`text-sm font-medium ${theme.text}`}>{result.fileName}</span>
            {result.forced && (
              <span className="text-xs text-amber-500">built despite failing checks</span>
            )}
          </div>
          {result.provoked && (
            <div className="text-xs space-y-1" data-testid="provoked-summary">
              <p className={`font-medium ${theme.text}`}>
                Deliberately faulty: MDES {result.provoked.code} — {result.provoked.title}
              </p>
              {result.provoked.change && (
                <p className={theme.textMuted}>{result.provoked.change}</p>
              )}
              <p className={theme.textMuted}>{result.provoked.confirmedBy}</p>
              <p className="text-amber-600 dark:text-amber-400">{result.provoked.expect}</p>
            </div>
          )}
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
