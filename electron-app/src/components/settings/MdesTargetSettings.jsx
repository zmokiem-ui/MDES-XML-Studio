import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle, Check, Database, Loader2, Plus, RefreshCw, Server, Trash2, X,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

/**
 * Bind the app to a real MDES instance.
 *
 * A target is a properties file plus a read-only database connection. Everything
 * that decides whether an upload will be accepted is read from those two places:
 * which country the instance is, which senders it will accept, and — the one
 * that catches otherwise-perfect files — which certificate it verifies each
 * sender against.
 *
 * Setup is detection-first on purpose. Asking someone to type a properties path,
 * a server name and a database name is three chances to get it wrong silently,
 * so **Add** scans the machine and fills the form in; the fields are there to
 * correct what it found, not to be filled from nothing. Nothing is saved until
 * the connection has actually been tried.
 *
 * Developer mode only.
 */

// Placeholders are prefixed "e.g." so an empty field can never be mistaken for a
// filled one. That mistake cost a real setup attempt.
const FIELDS = [
  { key: 'name', label: 'Name', placeholder: 'e.g. CW demo', required: true },
  { key: 'propsPath', label: 'Properties file', placeholder: 'e.g. C:\\MDES\\props\\PFGU.properties', required: true, browse: true },
  { key: 'server', label: 'SQL Server', placeholder: 'e.g. localhost\\SQLEXPRESS', required: true },
  { key: 'database', label: 'Database', placeholder: 'e.g. MDES-DEMO', required: true },
]

const EMPTY_DRAFT = {
  name: '', propsPath: '', server: '', database: '', username: '', password: '',
}

export function MdesTargetSettings({ embedded = false }) {
  const { theme } = useApp()
  const [targets, setTargets] = useState([])
  const [selected, setSelected] = useState(null)
  const [resolution, setResolution] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const [draft, setDraft] = useState(null)
  const [candidates, setCandidates] = useState(null)
  const [detecting, setDetecting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)

  const refresh = useCallback(async () => {
    const result = await window.electronAPI.mdesTargetList()
    if (result.success === false) { setError(result.error); return }
    setTargets(result.targets || [])
  }, [])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (!selected && targets.length) setSelected(targets[0].name)
  }, [targets, selected])

  const inspect = useCallback(async (name) => {
    if (!name) return
    setBusy(true)
    setError(null)
    try {
      const result = await window.electronAPI.mdesTargetResolve(name)
      setResolution(result)
      if (result.success === false) setError(result.error)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { if (selected) inspect(selected) }, [selected, inspect])

  /** Add starts by looking, not by presenting an empty form. */
  const startAdd = async () => {
    setDraft({ ...EMPTY_DRAFT })
    setTestResult(null)
    setDetecting(true)
    setError(null)
    try {
      const found = await window.electronAPI.mdesTargetDiscover({})
      setCandidates(found)
      const props = found.propertiesFiles?.[0]
      const db = found.databases?.[0]
      if (props || db) {
        setDraft({
          ...EMPTY_DRAFT,
          propsPath: props?.path || '',
          server: db?.server || '',
          database: db?.database || '',
          name: props?.ownCountry ? `${props.ownCountry} ${db?.database || ''}`.trim()
                                  : (db?.database || ''),
        })
      }
    } catch (caught) {
      setError(caught.message)
    } finally {
      setDetecting(false)
    }
  }

  const test = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      setTestResult(await window.electronAPI.mdesTargetTest(draft))
    } catch (caught) {
      setTestResult({ success: false, error: caught.message })
    } finally {
      setTesting(false)
    }
  }

  const save = async () => {
    const result = await window.electronAPI.mdesTargetSave(draft)
    if (result.success === false) { setTestResult(result); return }
    if (draft.password) {
      await window.electronAPI.mdesTargetSetPassword(draft.name, draft.password)
    }
    const saved = draft.name
    setDraft(null)
    setCandidates(null)
    setTestResult(null)
    await refresh()
    setSelected(saved)
  }

  const remove = async (name) => {
    await window.electronAPI.mdesTargetDelete(name)
    if (selected === name) { setSelected(null); setResolution(null) }
    refresh()
  }

  const missing = draft
    ? FIELDS.filter(f => f.required && !draft[f.key]).map(f => f.label)
    : []

  const props = resolution?.properties
  const database = resolution?.database
  const assembly = database?.ctsAssembly

  return (
    <div className={embedded ? '' : `${theme.card} rounded-xl border p-6 shadow-sm`}>
      {/* Standalone this is its own card; inside a settings section the section
          header carries the title, so only the action is repeated here. */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        {!embedded && (
          <div>
            <h3 className={`text-lg font-semibold ${theme.text} flex items-center gap-2`}>
              <Server className="w-5 h-5" />
              MDES target
            </h3>
            <p className={`text-sm ${theme.textMuted} mt-1`}>
              Point the app at an MDES instance so packages are built to the rules
              that instance enforces, not just to the format.
            </p>
          </div>
        )}
        {!draft && (
          <button
            onClick={startAdd}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ml-auto ${theme.buttonPrimary}`}
          >
            <Plus className="w-4 h-4" />
            Add target
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg border border-red-500/40 bg-red-500/10">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* --- add form ------------------------------------------------------ */}
      {draft && (
        <div className={`mt-4 p-4 rounded-lg border ${theme.input} space-y-4`}>
          {detecting && (
            <p className={`text-sm ${theme.textMuted} flex items-center gap-2`}>
              <Loader2 className="w-4 h-4 animate-spin" />
              Looking for MDES properties files and databases on this machine...
            </p>
          )}

          {candidates && !detecting && (
            <div className="space-y-2">
              <p className={`text-xs font-medium ${theme.textMuted}`}>
                Found on this machine — click to use
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className={`text-xs ${theme.textMuted} mb-1`}>Properties files</p>
                  {(candidates.propertiesFiles || []).map(file => (
                    <button
                      key={file.path}
                      onClick={() => setDraft(d => ({ ...d, propsPath: file.path }))}
                      className={`block w-full text-left text-xs px-2 py-1 rounded ${
                        draft.propsPath === file.path ? theme.buttonPrimary : theme.cardHover
                      } ${draft.propsPath === file.path ? '' : theme.text}`}
                    >
                      <span className="font-semibold">{file.ownCountry}</span>{' '}
                      <span className="font-mono opacity-80">{file.path}</span>
                    </button>
                  ))}
                  {!candidates.propertiesFiles?.length && (
                    <p className={`text-xs ${theme.textMuted}`}>
                      None found — browse for it below.
                    </p>
                  )}
                </div>
                <div>
                  <p className={`text-xs ${theme.textMuted} mb-1`}>MDES databases</p>
                  {(candidates.databases || []).map(db => {
                    const active = draft.server === db.server && draft.database === db.database
                    return (
                      <button
                        key={`${db.server}/${db.database}`}
                        onClick={() => setDraft(d => ({ ...d, server: db.server, database: db.database }))}
                        className={`block w-full text-left text-xs font-mono px-2 py-1 rounded ${
                          active ? theme.buttonPrimary : `${theme.cardHover} ${theme.text}`
                        }`}
                      >
                        {db.server} / {db.database}
                        {db.hasCtsAssembly === false && (
                          <span className="ml-2 not-italic text-amber-500">no CTS.CLR</span>
                        )}
                      </button>
                    )
                  })}
                  {!candidates.databases?.length && (
                    <p className={`text-xs ${theme.textMuted}`}>
                      {(candidates.databaseErrors || []).join('; ')
                        || 'None found — type the server and database below.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FIELDS.map(({ key, label, placeholder, required, browse }) => (
              <div key={key}>
                <label className={`block text-xs font-medium ${theme.text} mb-1`}>
                  {label}
                  {required && !draft[key] && (
                    <span className="text-amber-500 ml-1">required</span>
                  )}
                </label>
                <div className="flex gap-1">
                  <input
                    value={draft[key] || ''}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    placeholder={placeholder}
                    className={`flex-1 px-2 py-1.5 rounded border text-sm ${theme.input} ${theme.text} ${
                      required && !draft[key] ? 'border-amber-500/60' : ''
                    }`}
                  />
                  {browse && (
                    <button
                      onClick={async () => {
                        const file = await window.electronAPI.mdesTargetSelectPropsFile()
                        if (file) setDraft(d => ({ ...d, propsPath: file }))
                      }}
                      className={`px-2 py-1.5 rounded text-xs ${theme.buttonSecondary}`}
                    >
                      Browse
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Windows authentication is the normal case for a local instance, so
              it is the default and the login fields stay out of the way. */}
          <details>
            <summary className={`text-xs cursor-pointer ${theme.textMuted}`}>
              Using a SQL login instead of Windows authentication?
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div>
                <label className={`block text-xs font-medium ${theme.text} mb-1`}>
                  SQL username
                </label>
                <input
                  value={draft.username || ''}
                  onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                  placeholder="e.g. sa — leave blank for Windows authentication"
                  className={`w-full px-2 py-1.5 rounded border text-sm ${theme.input} ${theme.text}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium ${theme.text} mb-1`}>
                  SQL password
                </label>
                <input
                  type="password"
                  value={draft.password || ''}
                  onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                  disabled={!draft.username}
                  className={`w-full px-2 py-1.5 rounded border text-sm ${theme.input} ${theme.text} disabled:opacity-50`}
                />
              </div>
            </div>
          </details>

          {/* --- test result ------------------------------------------------ */}
          {testResult && (
            <div className={`p-3 rounded-lg border ${
              testResult.success
                ? 'border-green-500/40 bg-green-500/10'
                : 'border-red-500/40 bg-red-500/10'
            }`}>
              {testResult.success ? (
                <div className="space-y-1">
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Connected to {testResult.database?.name}
                  </p>
                  <p className={`text-xs ${theme.textMuted}`}>
                    This instance is <strong>{testResult.ownCountry}</strong>,{' '}
                    {testResult.database?.acceptedSenders?.length || 0} accepted sender(s),
                    CTS.CLR {testResult.database?.ctsAssembly?.version || 'not deployed'}.
                  </p>
                  {(testResult.errors || []).map(message => (
                    <p key={message} className="text-xs text-amber-500">{message}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-red-600 dark:text-red-400">{testResult.error}</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={test}
              disabled={testing || missing.length > 0}
              className={`px-3 py-1.5 rounded text-sm ${theme.buttonSecondary} disabled:opacity-50`}
            >
              {testing ? 'Testing...' : 'Test connection'}
            </button>
            <button
              onClick={save}
              disabled={missing.length > 0}
              className={`px-3 py-1.5 rounded text-sm ${theme.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Save target
            </button>
            <button
              onClick={() => { setDraft(null); setCandidates(null); setTestResult(null) }}
              className={`px-3 py-1.5 rounded text-sm ${theme.buttonSecondary}`}
            >
              Cancel
            </button>
            {missing.length > 0 && (
              <span className="text-xs text-amber-500">
                Still needed: {missing.join(', ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* --- saved targets ------------------------------------------------- */}
      <div className="mt-4 flex flex-wrap gap-2">
        {targets.map(target => (
          <div
            key={target.name}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${
              selected === target.name ? theme.buttonPrimary : `${theme.input} ${theme.text}`
            }`}
            onClick={() => setSelected(target.name)}
          >
            <Database className="w-3.5 h-3.5" />
            {target.name}
            <button
              onClick={(e) => { e.stopPropagation(); remove(target.name) }}
              className="opacity-60 hover:opacity-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {!targets.length && !draft && (
          <p className={`text-sm ${theme.textMuted}`}>
            No targets yet. Press <strong>Add target</strong> — it scans this
            machine and fills in what it finds.
          </p>
        )}
      </div>

      {/* --- what the selected target says --------------------------------- */}
      {selected && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm font-medium ${theme.text}`}>{selected}</p>
            <button
              onClick={() => inspect(selected)}
              className={`text-xs flex items-center gap-1 ${theme.textMuted}`}
            >
              <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {(resolution?.errors || []).map(message => (
            <p key={message} className="text-xs text-amber-500 flex items-start gap-1 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {message}
            </p>
          ))}

          <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg border ${theme.input}`}>
            <Fact theme={theme} label="Country" value={resolution?.ownCountry || '—'} />
            <Fact theme={theme} label="Environment"
                  value={props ? (props.isTestEnvironment ? 'Test' : 'Production') : '—'} />
            <Fact theme={theme} label="Treaties" value={(props?.modules || []).join(', ') || '—'} />
            <Fact theme={theme} label="DocTypeIndic"
                  value={props ? `${props.docTypeIndics.CRS[0]}–${props.docTypeIndics.CRS.slice(-1)[0]}` : '—'} />
            <Fact theme={theme} label="CTS.CLR"
                  value={assembly ? assembly.version : 'not deployed'} warn={!assembly} />
            <Fact theme={theme} label="Reads column"
                  value={assembly ? assembly.certificateColumns.begin : '—'} />
            <Fact theme={theme} label="Own certificate"
                  value={database?.ownCertificate?.commonName || '—'} />
            <Fact theme={theme} label="Accepted senders"
                  value={String((database?.acceptedSenders || []).length)} />
          </div>

          {database?.partners?.length > 0 && (
            <details className="mt-3">
              <summary className={`text-xs cursor-pointer ${theme.textMuted}`}>
                Partner jurisdictions and the certificate each is verified against
              </summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className={`${theme.textMuted} text-left`}>
                      <th className="py-1 pr-3">Country</th>
                      <th className="py-1 pr-3">Accepted now</th>
                      <th className="py-1 pr-3">Certificate MDES holds</th>
                      <th className="py-1">Valid until</th>
                    </tr>
                  </thead>
                  <tbody>
                    {database.partners.map(partner => (
                      <tr key={partner.country} className="border-t border-white/5">
                        <td className={`py-1 pr-3 font-medium ${theme.text}`}>{partner.country}</td>
                        <td className="py-1 pr-3">
                          {partner.acceptedNow
                            ? <span className="text-green-500 inline-flex items-center gap-1"><Check className="w-3 h-3" />yes</span>
                            : <span className={theme.textMuted}>no</span>}
                        </td>
                        <td className={`py-1 pr-3 ${theme.textMuted}`}>
                          {partner.certificate?.commonName || '—'}
                        </td>
                        <td className={`py-1 ${theme.textMuted}`}>
                          {partner.validUntil ? partner.validUntil.slice(0, 10) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

function Fact({ theme, label, value, warn = false }) {
  return (
    <div>
      <p className={`text-xs ${theme.textMuted}`}>{label}</p>
      <p className={`text-sm font-medium ${warn ? 'text-amber-500' : theme.text}`}>{value}</p>
    </div>
  )
}
