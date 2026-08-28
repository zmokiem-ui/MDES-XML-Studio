import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, FolderOpen, KeyRound, RotateCcw, Upload } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getCountryName } from '../../countryData'

/**
 * The certificate store behind CTS packaging.
 *
 * Signing certificates and their passwords are what stand between a generated
 * XML and a file MDES will accept, and the failure mode is silent: an expired
 * certificate produces a package that is only rejected after upload. So this
 * screen leads with expiry and with which countries can actually sign.
 *
 * Passwords travel one way. The renderer can set one and ask whether it opens
 * the certificate, but there is no channel for reading one back.
 */
export function CertificatesSettings({ embedded = false }) {
  const { theme } = useApp()
  const [certificates, setCertificates] = useState([])
  const [withPasswords, setWithPasswords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [passwordDraft, setPasswordDraft] = useState({})
  const [status, setStatus] = useState({})
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, passwords] = await Promise.all([
        window.electronAPI.ctsListCertificates(),
        window.electronAPI.ctsCountriesWithPasswords(),
      ])
      if (list.success === false) {
        setError(list.error || 'The certificate store could not be read')
        setCertificates([])
      } else {
        setCertificates(list.certificates || [])
      }
      setWithPasswords(passwords.countries || [])
    } catch (caught) {
      setError(caught.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // One row per country: the encryption certificate is what the store always
  // has, and signing is the capability that may be missing.
  const rows = useMemo(() => {
    const byCountry = new Map()
    for (const certificate of certificates) {
      const row = byCountry.get(certificate.country) || { country: certificate.country }
      row[certificate.role] = certificate
      byCountry.set(certificate.country, row)
    }
    return [...byCountry.values()].sort((a, b) => a.country.localeCompare(b.country))
  }, [certificates])

  const expiring = rows.filter(row => row.encryption?.expires_soon || row.encryption?.is_expired)

  const savePassword = async (country) => {
    const password = passwordDraft[country] || ''
    setStatus(prev => ({ ...prev, [country]: { state: 'checking' } }))
    const saved = await window.electronAPI.ctsSetPassword(country, password)
    if (!saved.success) {
      setStatus(prev => ({ ...prev, [country]: { state: 'error', message: saved.error } }))
      return
    }
    // Saving is not the same as working: prove the password opens the
    // certificate now, rather than at package time.
    const checked = await window.electronAPI.ctsCheckPassword(country)
    setStatus(prev => ({
      ...prev,
      [country]: checked.canSign
        ? { state: 'ok', persisted: saved.persisted }
        : { state: 'error', message: checked.error || 'That password does not open the certificate' },
    }))
    setPasswordDraft(prev => ({ ...prev, [country]: '' }))
    if (checked.canSign) refresh()
    setWithPasswords(prev => (prev.includes(country) ? prev : [...prev, country]))
  }

  const importFor = async (country) => {
    const result = await window.electronAPI.ctsImportCertificates(country)
    if (result.success) refresh()
    else if (!result.cancelled) {
      setStatus(prev => ({ ...prev, [country]: { state: 'error', message: result.error } }))
    }
  }

  // One action instead of eleven password prompts. The file is the estate's own
  // list; nothing about it reaches this component, only which countries landed.
  const importPasswords = async () => {
    setImporting(true)
    setError(null)
    try {
      const result = await window.electronAPI.ctsImportPasswords()
      if (result.cancelled) return
      if (!result.success) {
        setError(result.error || 'No passwords could be imported from that file.')
        return
      }
      setImportSummary({
        imported: result.imported || [],
        failed: result.failed || [],
        warnings: result.warnings || [],
      })
      refresh()
    } finally {
      setImporting(false)
    }
  }

  const restoreBundled = async () => {
    const result = await window.electronAPI.ctsRestoreBundledCertificates()
    if (result.success) refresh()
    else setError(result.error)
  }

  const expiryClass = (certificate) => {
    if (!certificate) return theme.textMuted
    if (certificate.is_expired) return 'text-red-500'
    if (certificate.expires_soon) return 'text-amber-500'
    return theme.textMuted
  }

  return (
    <div className={embedded ? '' : `${theme.card} rounded-xl border p-6 shadow-sm`}>
      {/* Standalone this is its own card; inside a settings section the section
          header carries the title, so only the actions are repeated here. */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        {!embedded && (
          <div>
            <h3 className={`text-lg font-semibold ${theme.text} flex items-center gap-2`}>
              <KeyRound className="w-5 h-5" />
              Certificates
            </h3>
            <p className={`text-sm ${theme.textMuted} mt-1`}>
              Used to sign and encrypt delivery packages. A country can only send
              once its signing password is stored here.
            </p>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <button
            onClick={importPasswords}
            disabled={importing}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${theme.buttonSecondary} disabled:opacity-50`}
            title="Import an ART TestData/Certificates/Passwords.csv"
          >
            <KeyRound className="w-4 h-4" />
            {importing ? 'Importing...' : 'Import passwords'}
          </button>
          <button
            onClick={() => window.electronAPI.ctsOpenStore()}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${theme.buttonSecondary}`}
            title="Open the certificate folder"
          >
            <FolderOpen className="w-4 h-4" />
            Open folder
          </button>
          <button
            onClick={restoreBundled}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${theme.buttonSecondary}`}
            title="Discard local changes and restore the certificates shipped with this version"
          >
            <RotateCcw className="w-4 h-4" />
            Restore bundled
          </button>
        </div>
      </div>

      {expiring.length > 0 && (
        <div className="mt-4 mb-2 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {expiring.map(row => row.country).join(', ')}
            {expiring.length === 1 ? ' is' : ' are'} at or near expiry. Packages
            signed with an expired certificate are rejected after upload, not before.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg border border-red-500/40 bg-red-500/10">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {importSummary && (
        <div className="mt-4 p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10">
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            Stored passwords for {importSummary.imported.length} countr
            {importSummary.imported.length === 1 ? 'y' : 'ies'}
            {importSummary.imported.length ? `: ${importSummary.imported.join(', ')}` : ''}.
          </p>
          {importSummary.failed.length > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              No password in the file opens {importSummary.failed.join(', ')}.
            </p>
          )}
          {importSummary.warnings.map((warning, index) => (
            <p key={index} className={`text-xs ${theme.textMuted} mt-1`}>{warning}</p>
          ))}
        </div>
      )}

      {loading ? (
        <p className={`text-sm ${theme.textMuted} mt-4`}>Reading the certificate store...</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`${theme.textMuted} text-left`}>
                <th className="py-2 pr-4 font-medium">Country</th>
                <th className="py-2 pr-4 font-medium">Certificate</th>
                <th className="py-2 pr-4 font-medium">Key</th>
                <th className="py-2 pr-4 font-medium">Expires</th>
                <th className="py-2 pr-4 font-medium">Can sign</th>
                <th className="py-2 font-medium">Signing password</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const certificate = row.encryption || row.signing
                const hasPassword = withPasswords.includes(row.country)
                const rowStatus = status[row.country]
                return (
                  <tr key={row.country} className="border-t border-white/5">
                    <td className={`py-2 pr-4 font-medium ${theme.text}`}>
                      {row.country}
                      <span className={`block text-xs ${theme.textMuted}`}>
                        {getCountryName(row.country) || certificate?.common_name}
                      </span>
                    </td>
                    <td className={`py-2 pr-4 ${theme.textMuted}`}>{certificate?.common_name || '-'}</td>
                    <td className={`py-2 pr-4 whitespace-nowrap ${theme.textMuted}`}>
                      {certificate ? `RSA-${certificate.key_size}` : '-'}
                    </td>
                    {/* Date first, remaining life underneath: the date is what
                        gets checked, the countdown is what gets acted on. */}
                    <td className={`py-2 pr-4 whitespace-nowrap ${expiryClass(certificate)}`}>
                      {certificate ? (
                        <>
                          {certificate.is_expired ? 'expired ' : ''}
                          {certificate.not_after.slice(0, 10)}
                          {!certificate.is_expired && (
                            <span className={`block text-xs ${theme.textMuted}`}>
                              in {certificate.days_until_expiry} days
                            </span>
                          )}
                        </>
                      ) : '-'}
                    </td>
                    <td className="py-2 pr-4">
                      {hasPassword ? (
                        <span className="inline-flex items-center gap-1 text-green-500">
                          <Check className="w-4 h-4" /> yes
                        </span>
                      ) : (
                        <span className={theme.textMuted}>no password</span>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          value={passwordDraft[row.country] || ''}
                          onChange={(event) => setPasswordDraft(prev => ({
                            ...prev, [row.country]: event.target.value,
                          }))}
                          onKeyDown={(event) => { if (event.key === 'Enter') savePassword(row.country) }}
                          placeholder={hasPassword ? 'stored' : 'set password'}
                          className={`w-36 px-2 py-1 rounded border ${theme.input} ${theme.text}`}
                        />
                        <button
                          onClick={() => savePassword(row.country)}
                          className={`px-2 py-1 rounded text-xs ${theme.buttonSecondary}`}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => importFor(row.country)}
                          className={`px-2 py-1 rounded text-xs ${theme.buttonSecondary}`}
                          title="Replace this country's certificate files"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {rowStatus?.state === 'error' && (
                        <p className="text-xs text-red-500 mt-1">{rowStatus.message}</p>
                      )}
                      {rowStatus?.state === 'ok' && (
                        <p className="text-xs text-green-500 mt-1">
                          {rowStatus.persisted ? 'Saved' : 'Saved for this session only'}
                        </p>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
