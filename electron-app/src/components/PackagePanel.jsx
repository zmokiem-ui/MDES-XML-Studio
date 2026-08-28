import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, Check, FileArchive, FolderOpen, Lock, Package, Search, X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'

/**
 * Encrypt and package a generated XML into a delivery MDES will accept.
 *
 * The three entry names inside the ZIP are derived from sender, receiver and
 * module, and MDES locates them by that shape rather than by a manifest, so the
 * panel shows them before packaging: a wrong country here is a rejected upload,
 * and seeing `GL_CRS_Key` appear is the cheapest way to notice.
 */

// Kept in step with crs_generator.cts.packager.Defect. Each one provokes a
// specific MDES file-level error; they exist to test the intake, not to ship.
const DEFECTS = [
  { value: 'ecb_mode', label: 'ECB instead of CBC', code: '50013' },
  { value: 'short_key', label: 'Key without the IV', code: '50013' },
  { value: 'uncompressed_payload', label: 'Payload not compressed', code: '50003' },
  { value: 'tamper_signature', label: 'Broken signature', code: '50004' },
  { value: 'wrong_receiver', label: 'Metadata names another country', code: '50012' },
  { value: 'corrupt_key', label: 'Corrupted key file', code: '50002' },
]

function baseModule(communicationType) {
  if (communicationType === 'RPT') return 'FATCA'
  return communicationType.replace(/Status$/, '')
}

export function PackagePanel() {
  const { theme } = useApp()

  const [sourceFile, setSourceFile] = useState('')
  const [sender, setSender] = useState('')
  const [receiver, setReceiver] = useState('')
  const [communicationType, setCommunicationType] = useState('CRS')
  const [taxYear, setTaxYear] = useState(String(new Date().getFullYear() - 1))
  const [outputDir, setOutputDir] = useState('')
  const [defects, setDefects] = useState([])
  const [showDefects, setShowDefects] = useState(false)
  const [sourceValidation, setSourceValidation] = useState(null)
  const [validatingSource, setValidatingSource] = useState(false)
  const [targets, setTargets] = useState([])
  const [selectedTarget, setSelectedTarget] = useState('')
  const [targetPreflight, setTargetPreflight] = useState(null)
  const [checkingTarget, setCheckingTarget] = useState(false)

  const [signingCountries, setSigningCountries] = useState([])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const [inspectFile, setInspectFile] = useState('')
  const [inspectCountry, setInspectCountry] = useState('')
  const [inspection, setInspection] = useState(null)
  const [inspecting, setInspecting] = useState(false)
  const [inspectionMode, setInspectionMode] = useState('general')
  const [inspectionTarget, setInspectionTarget] = useState('')
  const [inspectionTargetResolution, setInspectionTargetResolution] = useState(null)
  const [inspectionTargetPreflight, setInspectionTargetPreflight] = useState(null)
  const [checkingInspectionTarget, setCheckingInspectionTarget] = useState(false)

  const loadStore = useCallback(async () => {
    const [passwords, targetList] = await Promise.all([
      window.electronAPI.ctsCountriesWithPasswords(),
      window.electronAPI.mdesTargetList().catch(() => ({ targets: [] })),
    ])
    setSigningCountries(passwords.countries || [])
    setTargets(targetList.targets || [])
  }, [])

  useEffect(() => { loadStore() }, [loadStore])

  useEffect(() => {
    let cancelled = false
    if (!selectedTarget || !sourceValidation?.success) {
      setTargetPreflight(null)
      setCheckingTarget(false)
      return undefined
    }

    setCheckingTarget(true)
    window.electronAPI.mdesTargetPreflight({
      target: selectedTarget,
      sender: sourceValidation.facts.sender,
      receiver: sourceValidation.facts.receiver,
      communicationType: 'CRS',
      taxYear: sourceValidation.facts.taxYear,
      messageRefId: sourceValidation.facts.messageRefId,
      doctypeIndics: sourceValidation.facts.docTypeIndics || [],
    }).then(response => {
      if (!cancelled) setTargetPreflight(response)
    }).catch(caught => {
      if (!cancelled) setTargetPreflight({ success: false, error: caught.message })
    }).finally(() => {
      if (!cancelled) setCheckingTarget(false)
    })

    return () => { cancelled = true }
  }, [selectedTarget, sourceValidation])

  useEffect(() => {
    let cancelled = false
    setInspectionTargetResolution(null)
    setInspectionTargetPreflight(null)

    if (inspectionMode !== 'target' || !inspectionTarget) {
      setCheckingInspectionTarget(false)
      return undefined
    }

    setCheckingInspectionTarget(true)
    const identity = inspection?.identity
    const facts = inspection?.sourceValidation?.facts || {}
    const preflight = identity
      ? window.electronAPI.mdesTargetPreflight({
        target: inspectionTarget,
        sender: identity.sender || null,
        receiver: identity.receiver || null,
        communicationType: identity.communicationType || 'CRS',
        taxYear: identity.taxYear ? Number(identity.taxYear) : null,
        messageRefId: facts.messageRefId || identity.messageRefId || null,
        doctypeIndics: facts.docTypeIndics || identity.docTypeIndics || [],
      })
      : Promise.resolve(null)

    Promise.all([
      window.electronAPI.mdesTargetResolve(inspectionTarget),
      preflight,
    ]).then(([resolution, result]) => {
      if (cancelled) return
      setInspectionTargetResolution(resolution)
      setInspectionTargetPreflight(result)
    }).catch(caught => {
      if (!cancelled) setInspectionTargetResolution({ success: false, error: caught.message })
    }).finally(() => {
      if (!cancelled) setCheckingInspectionTarget(false)
    })

    return () => { cancelled = true }
  }, [inspection, inspectionMode, inspectionTarget])

  const entries = useMemo(() => {
    if (!sender || !receiver) return null
    const module = baseModule(communicationType)
    const infix = module === 'FATCA' ? '' : `_${module}`
    return [
      `${sender.toUpperCase()}${infix}_Metadata.xml`,
      `${receiver.toUpperCase()}${infix}_Key`,
      `${sender.toUpperCase()}${infix}_Payload`,
    ]
  }, [sender, receiver, communicationType])

  const canSign = sender && signingCountries.includes(sender.toUpperCase())

  const pickSource = async () => {
    const filePath = await window.electronAPI.selectXmlFile()
    if (!filePath) return
    setSourceFile(filePath)
    setSender('')
    setReceiver('')
    setTaxYear('')
    setCommunicationType('CRS')
    setSourceValidation(null)
    setTargetPreflight(null)
    setResult(null)
    setError(null)
    setValidatingSource(true)
    try {
      const validation = await window.electronAPI.ctsValidateSource(filePath)
      setSourceValidation(validation)
      if (validation.success) {
        setSender(validation.facts.sender)
        setReceiver(validation.facts.receiver)
        setTaxYear(validation.facts.taxYear)
      }
    } catch (caught) {
      setSourceValidation({ success: false, valid: false, error: caught.message, errors: [caught.message] })
    } finally {
      setValidatingSource(false)
    }
  }

  const pickOutput = async () => {
    const dir = await window.electronAPI.ctsSelectOutputFolder()
    if (dir) setOutputDir(dir)
  }

  const toggleDefect = (value) => {
    setDefects(prev => (prev.includes(value)
      ? prev.filter(d => d !== value)
      : [...prev, value]))
  }

  const buildPackage = async () => {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const response = selectedTarget
        ? await window.electronAPI.mdesTargetPackage({
          target: selectedTarget,
          sourceFile,
          sender: sender.toUpperCase(),
          receiver: receiver.toUpperCase(),
          communicationType,
          taxYear,
          outputDir: outputDir || null,
        })
        : await window.electronAPI.ctsPack({
          sourceFile,
          sender: sender.toUpperCase(),
          receiver: receiver.toUpperCase(),
          communicationType,
          taxYear,
          outputDir: outputDir || null,
          defects,
        })
      if (response.success) setResult(response)
      else setError(response.error || 'The package could not be built')
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }

  const inspect = async (selectedFile = inspectFile) => {
    if (!selectedFile) return
    setInspecting(true)
    setInspection(null)
    setInspectCountry('')
    setInspectionTargetResolution(null)
    setInspectionTargetPreflight(null)
    try {
      const recognised = await window.electronAPI.ctsUnpack({ packageFile: selectedFile })
      if (!recognised.success) {
        setInspection(recognised)
        return
      }
      const detectedReceiver = recognised.identity?.receiver || ''
      setInspectCountry(detectedReceiver)
      if (detectedReceiver && signingCountries.includes(detectedReceiver)) {
        const opened = await window.electronAPI.ctsUnpack({
          packageFile: selectedFile,
          country: detectedReceiver,
        })
        if (opened.success) {
          setInspection(opened)
        } else {
        setInspection({
            ...recognised,
            warnings: [
              ...(recognised.warnings || []),
              `Automatic decryption as ${detectedReceiver} failed: ${opened.error}`,
            ],
          })
        }
      } else {
        setInspection(recognised)
      }
    } catch (caught) {
      setInspection({ success: false, error: caught.message })
    } finally {
      setInspecting(false)
    }
  }

  const lockedFactInput = (value, label, placeholder = '') => (
    <div>
      <label className={`block text-sm font-medium ${theme.text} mb-1`}>{label}</label>
      <input
        readOnly
        value={value}
        placeholder={placeholder}
        className={`w-full px-3 py-2 rounded-lg border ${theme.input} ${theme.text} opacity-80`}
      />
    </div>
  )

  const targetBlocked = selectedTarget && (
    checkingTarget || !targetPreflight || targetPreflight.success === false || targetPreflight.blocked
  )
  const inspectionVerdict = inspection?.verdict
  const inspectionVerdictClass = inspectionVerdict === 'upload-ready'
    ? 'text-green-500'
    : inspectionVerdict === 'metadata-only'
      ? theme.textMuted
      : 'text-red-500'
  const inspectionVerdictLabel = inspectionVerdict === 'upload-ready'
    ? inspectionMode === 'general'
      ? 'Package checks passed - MDES target not checked'
      : 'Package checks passed - see target comparison'
    : inspectionVerdict === 'metadata-only'
      ? 'Metadata only - decryption not checked'
      : inspectionVerdict === 'not-upload-ready'
        ? 'Not upload-ready'
        : null

  return (
    <div className="space-y-6">
      {/* --- Build ---------------------------------------------------- */}
      <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
        <h2 className={`text-lg font-semibold ${theme.text} flex items-center gap-2 mb-1`}>
          <Package className="w-5 h-5" />
          Encrypt and package
        </h2>
        <p className={`text-sm ${theme.textMuted} mb-5`}>
          Signs the document, compresses it, encrypts it with AES-256-CBC and
          wraps the key under the receiver's certificate - the format MDES
          expects on upload.
        </p>

          <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${theme.text} mb-1`}>Source XML</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={sourceFile}
                placeholder="Select the XML file to package"
                className={`flex-1 px-3 py-2 rounded-lg border ${theme.input} ${theme.text}`}
              />
              <button onClick={pickSource} className={`px-4 py-2 rounded-lg ${theme.buttonSecondary}`}>
                Browse
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {lockedFactInput(sender, 'Sender', 'From XML')}
            {lockedFactInput(receiver, 'Receiver', 'From XML')}
            {lockedFactInput(communicationType === 'CRS' ? 'CRS delivery' : communicationType, 'Type', 'From XML')}
            {lockedFactInput(taxYear, 'Tax year', 'From XML')}
          </div>

          {validatingSource && (
            <div className={`p-3 rounded-lg border ${theme.input} text-sm ${theme.textMuted}`}>
              Validating XML schema and foreign CRS rules...
            </div>
          )}

          {sourceValidation?.success && (
            <div className="p-3 rounded-lg border border-green-500/40 bg-green-500/10 flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <div className={`text-sm ${theme.text}`}>
                <p className="font-medium">Valid foreign CRS delivery: {sender} → {receiver}</p>
                <p className={`text-xs ${theme.textMuted}`}>
                  Schema {sourceValidation.facts.schemaVersion}; reporting year {taxYear}; package values are locked to the XML.
                </p>
              </div>
            </div>
          )}

          {targets.length > 0 && (
            <div>
              <label className={`block text-sm font-medium ${theme.text} mb-1`}>
                MDES target (optional, recommended)
              </label>
              <select
                value={selectedTarget}
                onChange={event => setSelectedTarget(event.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${theme.input} ${theme.text}`}
              >
                <option value="">Generic CTS validation only</option>
                {targets.map(target => (
                  <option key={target.name} value={target.name}>{target.name}</option>
                ))}
              </select>
              <p className={`text-xs ${theme.textMuted} mt-1`}>
                Selecting a target checks its database, certificates, environment,
                tax year and MessageRefId before packaging.
              </p>
            </div>
          )}

          {selectedTarget && targetPreflight?.checks && (
            <div className={`p-3 rounded-lg border ${targetPreflight.blocked ? 'border-red-500/40 bg-red-500/10' : 'border-green-500/40 bg-green-500/10'}`}>
              <p className={`text-sm font-medium ${targetPreflight.blocked ? 'text-red-500' : 'text-green-500'}`}>
                {checkingTarget ? 'Checking MDES target...' : targetPreflight.blocked ? 'MDES target blocks this package' : 'MDES target preflight passed'}
              </p>
              <ul className="mt-2 space-y-1">
                {targetPreflight.checks.map(check => (
                  <li key={check.id} className={`text-xs ${check.outcome === 'fail' ? 'text-red-500' : check.outcome === 'warn' ? 'text-amber-500' : theme.textMuted}`}>
                    {check.outcome === 'pass' ? '✓' : check.outcome === 'fail' ? '✕' : '•'} {check.title}: {check.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedTarget && targetPreflight?.success === false && !targetPreflight.checks && (
            <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-sm text-red-600 dark:text-red-400">
              MDES target preflight failed: {targetPreflight.error}
            </div>
          )}

          {sourceValidation && !sourceValidation.success && (
            <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 flex items-start gap-2">
              <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div className="text-sm text-red-600 dark:text-red-400">
                <p className="font-medium">This XML cannot be packaged as a foreign CRS delivery.</p>
                <ul className="mt-1 list-disc pl-5">
                  {(sourceValidation.errors?.length ? sourceValidation.errors : [sourceValidation.error]).map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div>
            <label className={`block text-sm font-medium ${theme.text} mb-1`}>Output folder</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={outputDir}
                placeholder="Alongside the source file"
                className={`flex-1 px-3 py-2 rounded-lg border ${theme.input} ${theme.text}`}
              />
              <button onClick={pickOutput} className={`px-4 py-2 rounded-lg ${theme.buttonSecondary}`}>
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
          </div>

          {entries && (
            <div className={`p-3 rounded-lg border ${theme.input}`}>
              <p className={`text-xs font-medium ${theme.textMuted} mb-1`}>
                The ZIP will contain, in this order:
              </p>
              <ul className={`text-xs font-mono ${theme.text} space-y-0.5`}>
                {entries.map(entry => <li key={entry}>{entry}</li>)}
              </ul>
            </div>
          )}

          {sender && !canSign && (
            <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                No signing password stored for {sender.toUpperCase()}. Add it under
                Settings, Certificates - packaging needs the private key.
              </p>
            </div>
          )}

          {/* Deliberate defects, folded away: this is a negative-testing tool,
              not part of producing a valid delivery. */}
          <div>
            <button
              onClick={() => setShowDefects(!showDefects)}
              className={`text-sm ${theme.textMuted} hover:underline flex items-center gap-1`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {showDefects ? 'Hide' : 'Show'} deliberate defects
              {defects.length > 0 && ` (${defects.length} selected)`}
            </button>
            {showDefects && (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {DEFECTS.map(({ value, label, code }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${theme.input}`}
                  >
                    <input
                      type="checkbox"
                      checked={defects.includes(value)}
                      onChange={() => toggleDefect(value)}
                    />
                    <span className={`text-sm ${theme.text}`}>{label}</span>
                    <span className={`text-xs ${theme.textMuted} ml-auto`}>MDES {code}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={buildPackage}
            disabled={busy || validatingSource || checkingTarget || !sourceValidation?.success || !canSign || targetBlocked}
            className={`w-full px-4 py-3 rounded-lg font-medium ${theme.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {busy ? 'Packaging...' : selectedTarget ? 'Validate and package for MDES' : 'Build package'}
          </button>

          {error && (
            <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 flex items-start gap-2">
              <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {result && (
            <div className="p-4 rounded-lg border border-green-500/40 bg-green-500/10 space-y-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className={`text-sm font-medium ${theme.text}`}>{result.fileName}</span>
              </div>
              <dl className={`text-xs ${theme.textMuted} space-y-1`}>
                <div><dt className="inline font-medium">SenderFileId: </dt>
                  <dd className="inline font-mono">{result.senderFileId}</dd></div>
                <div><dt className="inline font-medium">Entries: </dt>
                  <dd className="inline font-mono">{(result.entries || []).join(', ')}</dd></div>
                {result.defects?.length > 0 && (
                  <div className="text-amber-500">
                    <dt className="inline font-medium">Deliberately broken: </dt>
                    <dd className="inline">{result.defects.join(', ')}</dd>
                  </div>
                )}
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
      </div>

      {/* --- Inspect -------------------------------------------------- */}
      <div className={`${theme.card} rounded-xl border p-6 shadow-sm`}>
        <h2 className={`text-lg font-semibold ${theme.text} flex items-center gap-2 mb-1`}>
          <FileArchive className="w-5 h-5" />
          Inspect a package
        </h2>
        <p className={`text-sm ${theme.textMuted} mb-5`}>
          General mode checks the package itself. Target mode also reads the
          selected MDES properties file and database to tell you whether this
          exact delivery should work on that instance now.
        </p>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              readOnly
              value={inspectFile}
              placeholder="Select a delivery ZIP"
              className={`flex-1 px-3 py-2 rounded-lg border ${theme.input} ${theme.text}`}
            />
            <button
              onClick={async () => {
                const filePath = await window.electronAPI.ctsSelectPackageFile()
                if (filePath) {
                  setInspectFile(filePath)
                  await inspect(filePath)
                }
              }}
              className={`px-4 py-2 rounded-lg ${theme.buttonSecondary}`}
            >
              Browse
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium ${theme.text} mb-1`}>
                Inspection mode
              </label>
              <select
                aria-label="Inspection mode"
                value={inspectionMode}
                onChange={event => setInspectionMode(event.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${theme.input} ${theme.text}`}
              >
                <option value="general">General package inspection</option>
                <option value="target">Compare with an MDES target</option>
              </select>
            </div>
            {inspectionMode === 'target' && (
              <div>
                <label className={`block text-sm font-medium ${theme.text} mb-1`}>
                  MDES target
                </label>
                <select
                  aria-label="MDES target for inspection"
                  value={inspectionTarget}
                  onChange={event => setInspectionTarget(event.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${theme.input} ${theme.text}`}
                  disabled={!targets.length}
                >
                  <option value="">
                    {targets.length ? 'Select the instance you will upload to' : 'No saved MDES targets'}
                  </option>
                  {targets.map(target => (
                    <option key={target.name} value={target.name}>{target.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <p className={`text-xs ${theme.textMuted}`}>
            {inspectionMode === 'general'
              ? 'General mode checks the package itself. It cannot prove that a particular MDES instance will accept it.'
              : 'Target mode compares this package with the selected properties file and read-only MDES database.'}
          </p>

          <div className="flex gap-2 items-end">
            <div className="w-40">
              {lockedFactInput(inspectCountry, 'Detected receiver', 'Read from ZIP')}
            </div>
            <button
              onClick={() => inspect()}
              disabled={inspecting || !inspectFile}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${theme.buttonPrimary} disabled:opacity-50`}
            >
              <Search className="w-4 h-4" />
              {inspecting ? 'Reading...' : 'Inspect again'}
            </button>
          </div>

          {inspection && (
            <div className={`p-4 rounded-lg border ${theme.input} space-y-3`}>
              {inspection.success === false ? (
                <p className="text-sm text-red-600 dark:text-red-400">{inspection.error}</p>
              ) : (
                <>
                  {inspection.identity && (
                    <div>
                      <p className={`text-xs font-medium ${theme.textMuted} mb-1`}>Recognised package</p>
                      <p className={`text-sm ${theme.text}`}>
                        {inspection.identity.sender || '?'} → {inspection.identity.receiver || '?'} · {inspection.identity.communicationType || 'unknown type'}
                        {inspection.identity.taxYear && ` · ${inspection.identity.taxYear}`}
                      </p>
                      {inspection.identity.metadataReceiver && inspection.identity.keyReceiver && (
                        <p className={`text-xs mt-1 ${inspection.identity.metadataReceiver === inspection.identity.keyReceiver ? theme.textMuted : 'text-red-500'}`}>
                          Metadata receiver: {inspection.identity.metadataReceiver}; key receiver: {inspection.identity.keyReceiver}
                        </p>
                      )}
                    </div>
                  )}
                  {inspectionVerdictLabel && (
                    <p className={`text-sm font-medium ${inspectionVerdictClass}`}>
                      {inspectionVerdictLabel}
                    </p>
                  )}
                  {inspectionMode === 'target' && (
                    <div className={`p-3 rounded-lg border ${inspectionTargetPreflight?.blocked ? 'border-red-500/40 bg-red-500/10' : 'border-blue-500/40 bg-blue-500/10'} space-y-2`}>
                      <p className={`text-xs font-medium ${theme.textMuted}`}>MDES target comparison</p>
                      {!inspectionTarget && (
                        <p className={`text-xs ${theme.textMuted}`}>
                          Select the MDES instance you will upload to.
                        </p>
                      )}
                      {inspectionTarget && inspectionTargetResolution?.success === false && (
                        <p className="text-xs text-red-500">Could not read target: {inspectionTargetResolution.error}</p>
                      )}
                      {inspectionTarget && inspectionTargetResolution?.success !== false && (
                        <div className={`text-xs ${theme.textMuted} space-y-0.5`}>
                          <p>
                            Environment: {inspectionTargetResolution.properties?.environmentName || 'unknown'}
                            {' · '}instance country: {inspectionTargetResolution.ownCountry || 'unknown'}
                          </p>
                          <p className="truncate" title={inspectionTargetResolution.properties?.path}>
                            Properties: {inspectionTargetResolution.properties?.path || 'not readable'}
                          </p>
                          <p>
                            Database: {inspectionTargetResolution.profile?.server || '?'} / {inspectionTargetResolution.profile?.database || '?'}
                          </p>
                        </div>
                      )}
                      {inspectionTarget && checkingInspectionTarget && (
                        <p className={`text-xs ${theme.textMuted}`}>Comparing package facts with the selected target...</p>
                      )}
                      {inspectionTarget && !checkingInspectionTarget && inspection && !inspectionTargetPreflight && (
                        <p className={`text-xs ${theme.textMuted}`}>
                          Inspect the package to run the target comparison.
                        </p>
                      )}
                      {inspectionTargetPreflight?.success === false && !inspectionTargetPreflight.checks && (
                        <p className="text-xs text-red-500">Target comparison failed: {inspectionTargetPreflight.error}</p>
                      )}
                      {inspectionTargetPreflight && (
                        inspectionTargetPreflight.success !== false || inspectionTargetPreflight.checks?.length > 0
                      ) && (
                        <>
                          <p className={`text-sm font-medium ${inspectionTargetPreflight.blocked ? 'text-red-500' : inspection.uploadReady === true ? 'text-green-500' : 'text-amber-500'}`}>
                            {inspectionTargetPreflight.blocked
                              ? 'This target would reject the package'
                              : inspection.uploadReady === true
                                ? 'This package should work on this target now'
                                : 'Target rules pass, but the package itself is not fully proven upload-ready'}
                          </p>
                          <ul className="space-y-1">
                            {(inspectionTargetPreflight.checks || []).map(check => (
                              <li key={check.id} className={`text-xs ${check.outcome === 'fail' ? 'text-red-500' : check.outcome === 'warn' ? 'text-amber-500' : theme.textMuted}`}>
                                {check.outcome === 'pass' ? '✓' : check.outcome === 'fail' ? '✕' : '•'} {check.title}: {check.detail}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                  {inspection.checks?.length > 0 && (
                    <div>
                      <p className={`text-xs font-medium ${theme.textMuted} mb-1`}>Checks</p>
                      <ul className="space-y-1">
                        {inspection.checks.map(check => (
                          <li key={check.id} className={`text-xs ${check.outcome === 'pass' ? 'text-green-500' : check.outcome === 'fail' ? 'text-red-500' : check.outcome === 'pending' ? theme.textMuted : 'text-amber-500'}`}>
                            {check.outcome === 'pass' ? '✓' : check.outcome === 'fail' ? '✕' : check.outcome === 'pending' ? '○' : '•'} {check.detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <p className={`text-xs font-medium ${theme.textMuted} mb-1`}>Entries</p>
                    <p className={`text-xs font-mono ${theme.text}`}>
                      {(inspection.entries || []).join(', ')}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${theme.textMuted} mb-1`}>Metadata</p>
                    <dl className={`text-xs font-mono ${theme.text} grid grid-cols-2 gap-x-4`}>
                      {Object.entries(inspection.metadata || {}).map(([key, value]) => (
                        <div key={key} className="contents">
                          <dt className={theme.textMuted}>{key}</dt>
                          <dd className="truncate">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  {inspection.signature && (
                    <p className={`text-xs ${inspection.signature.valid ? 'text-green-500' : 'text-red-500'}`}>
                      {inspection.signature.valid ? 'Signature valid' : 'Signature invalid'}
                      {inspection.signature.subject && ` - ${inspection.signature.subject}`}
                      {!inspection.signature.valid && ` (${inspection.signature.reason})`}
                    </p>
                  )}
                  {(inspection.warnings || []).map(warning => (
                    <p key={warning} className="text-xs text-amber-500 flex items-start gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      {warning}
                    </p>
                  ))}
                  {inspectionVerdict === 'metadata-only' && (
                    <p className={`text-xs ${theme.textMuted}`}>
                      Metadata only. The receiver was recognised, but its working private-key password is not configured under Settings, Certificates.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
