import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api/client'

const READER_URL = import.meta.env.VITE_PRESCRIPTION_READER_URL || 'http://localhost:8000'

export default function PrescriptionUploadPage() {
  const { token } = useAuth()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loadingReader, setLoadingReader] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)

  function handleFileChange(e) {
    const selected = e.target.files?.[0]
    setResult(null)
    setSuccess('')
    setError('')
    setFile(selected || null)
    setPreview(selected ? URL.createObjectURL(selected) : '')
  }

  async function handleExtract(e) {
    e.preventDefault()
    if (!file) {
      setError('Please choose an image file first.')
      return
    }

    setLoadingReader(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${READER_URL}/extract`, {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Extraction failed' }))
        throw new Error(err.detail || err.error || 'Extraction failed')
      }

      const data = await res.json()
      setResult(data)
      setSuccess('Extraction successful. Review below before saving.')
    } catch (err) {
      setError(err.message || 'Unable to process the prescription')
    } finally {
      setLoadingReader(false)
    }
  }

  async function handleSave() {
    if (!result) return
    setLoadingSave(true)
    setError('')
    setSuccess('')
    try {
      await apiFetch('/api/prescriptions/import', {
        method: 'POST',
        body: result,
        token
      })
      setSuccess('Prescription saved to your account.')
    } catch (err) {
      setError(err.message || 'Failed to save prescription')
    } finally {
      setLoadingSave(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Prescription Reader</h2>
          <p className="muted">Upload a prescription image to extract medicines and save them to your profile.</p>
        </div>
      </div>

      <div className="card">
        <form className="form" onSubmit={handleExtract}>
          <label>Prescription image</label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {preview && (
            <div className="card" style={{ padding: 0 }}>
              <img src={preview} alt="Selected prescription" style={{ width: '100%', borderRadius: '12px', display: 'block' }} />
            </div>
          )}
          <div className="actions">
            <button className="btn" type="submit" disabled={!file || loadingReader}>
              {loadingReader ? 'Processing...' : 'Extract medicines'}
            </button>
          </div>
        </form>
      </div>

      {(error || success) && (
        <div className={error ? 'error' : 'success'}>
          {error || success}
        </div>
      )}

      {result && (
        <div className="card">
          <div className="page-header">
            <h3>Extraction result</h3>
            <div className="actions">
              <button className="btn" onClick={handleSave} disabled={loadingSave}>
                {loadingSave ? 'Saving...' : 'Save to my prescriptions'}
              </button>
            </div>
          </div>

          <div className="grid">
            {result.prescription?.medicines?.map((med, idx) => (
              <div key={idx} className="medicine-card">
                <div className="medicine-header">
                  <h4>{med.name}</h4>
                  {med.dosage && <span className="badge">{med.dosage}</span>}
                </div>
                <p className="medicine-description">{med.frequency || 'No frequency detected'}</p>
                <div className="medicine-symptoms">
                  {med.timing && <div className="detail-row"><span className="detail-label">Timing</span><span>{med.timing}</span></div>}
                  {med.duration && <div className="detail-row"><span className="detail-label">Duration</span><span>{med.duration}</span></div>}
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ background: '#0f1420', borderColor: '#1b2333' }}>
            <strong>Raw text</strong>
            <p style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{result.raw_text || result.rawText || 'N/A'}</p>
          </div>
        </div>
      )}
    </div>
  )
}


