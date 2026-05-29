import { useState, useEffect } from 'react'
import { participants } from '../api/api'
import { Modal, ConfirmModal, Field, Badge, SearchBar, EmptyState, Loading, ErrMsg, OkMsg, useForm } from '../components/UI'

const EMPTY = {
  first_name: '', last_name: '', date_of_birth: '',
  pps_number: '', phone: '', email: '',
  address: '', consent_status: 'pending', is_active: true
}

const CONSENT_OPTS = ['pending', 'given', 'withdrawn_consent']

export default function Participants() {
  const [list, setList]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [delTarget, setDelTarget] = useState(null)
  const [detail, setDetail]     = useState(null)
  const [err, setErr]           = useState('')
  const [ok, setOk]             = useState('')
  const [saving, setSaving]     = useState(false)
  const { form, bind, setForm, reset } = useForm(EMPTY)

  const load = (q = '') => {
    setLoading(true)
    participants.list(q)
      .then(setList)
      .catch(() => setErr('Failed to load participants'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const t = setTimeout(() => load(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const openAdd = () => { reset(); setEditing(null); setErr(''); setModal(true) }
  const openEdit = (p) => { setForm({ ...p }); setEditing(p); setErr(''); setModal(true) }

  const save = async () => {
    if (!form.first_name || !form.last_name || !form.date_of_birth) {
      setErr('First name, last name and date of birth are required.'); return
    }
    setSaving(true); setErr('')
    try {
      if (editing) await participants.update(editing.id, form)
      else         await participants.create(form)
      setOk(editing ? 'Participant updated.' : 'Participant registered.')
      setModal(false); load(search); setTimeout(() => setOk(''), 3000)
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const del = async () => {
    setSaving(true)
    try {
      await participants.delete(delTarget.id)
      setDelTarget(null); load(search); setDetail(null)
      setOk('Participant withdrawn.'); setTimeout(() => setOk(''), 3000)
    } catch (e) { setErr(e.message); setDelTarget(null) }
    finally { setSaving(false) }
  }

  // ── Detail view ──
  if (detail) return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={() => setDetail(null)}>← Back to participants</button>
      </div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{detail.first_name} {detail.last_name}</h1>
          <p className="page-subtitle mono-id">Participant #{detail.id}</p>
        </div>
        <div className="inline-actions">
          <button className="btn btn-ghost" onClick={() => { openEdit(detail); setDetail(null) }}>✎ Edit</button>
          <button className="btn btn-danger" onClick={() => setDelTarget(detail)}>Withdraw</button>
        </div>
      </div>

      <div className="card-row">
        <div className="card">
          <div className="stat-label" style={{ marginBottom: 6 }}>Date of birth</div>
          <div style={{ fontFamily: 'var(--font-mono)' }}>{detail.date_of_birth}</div>
        </div>
        <div className="card">
          <div className="stat-label" style={{ marginBottom: 6 }}>Consent status</div>
          <Badge value={detail.consent_status} />
        </div>
        <div className="card">
          <div className="stat-label" style={{ marginBottom: 6 }}>Active</div>
          <Badge value={detail.is_active ? 'true' : 'false'} />
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Contact details</h2>
        <div className="form-grid">
          <div>
            <div className="stat-label" style={{ marginBottom: 4 }}>Email</div>
            <div style={{ color: 'var(--text-1)' }}>{detail.email || '—'}</div>
          </div>
          <div>
            <div className="stat-label" style={{ marginBottom: 4 }}>Phone</div>
            <div style={{ color: 'var(--text-1)' }}>{detail.phone || '—'}</div>
          </div>
          <div className="form-group span-2">
            <div className="stat-label" style={{ marginBottom: 4 }}>Address</div>
            <div style={{ color: 'var(--text-1)' }}>{detail.address || '—'}</div>
          </div>
        </div>
      </div>

      {delTarget && (
        <ConfirmModal
          message={`Withdraw ${delTarget.first_name} ${delTarget.last_name}? Their record will be marked inactive.`}
          onConfirm={del} onClose={() => setDelTarget(null)} loading={saving}
        />
      )}
    </div>
  )

  // ── List view ──
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Participants</h1>
          <p className="page-subtitle">{list.length} participant{list.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Register participant</button>
      </div>

      <ErrMsg msg={err} />
      <OkMsg msg={ok} />

      <div className="search-bar">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or PPS number…" />
      </div>

      {loading ? <Loading /> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Date of birth</th>
                <th>Contact</th>
                <th>Consent</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(p)}>
                  <td style={{ fontWeight: 500 }}>{p.first_name} {p.last_name}</td>
                  <td className="td-mono">{p.date_of_birth}</td>
                  <td className="td-muted">{p.email || p.phone || '—'}</td>
                  <td onClick={e => e.stopPropagation()}><Badge value={p.consent_status} /></td>
                  <td onClick={e => e.stopPropagation()}><Badge value={p.is_active ? 'true' : 'false'} /></td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="inline-actions">
                      <button className="btn btn-icon btn-sm" onClick={() => openEdit(p)}>✎</button>
                      <button className="btn btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDelTarget(p)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={6}><EmptyState icon="👤" message="No participants registered" /></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal
          title={editing ? 'Edit participant' : 'Register participant'}
          onClose={() => setModal(false)}
          onSubmit={save}
          loading={saving}
        >
          <ErrMsg msg={err} />
          <div className="form-grid">
            <Field label="First name"><input {...bind('first_name')} placeholder="First name" /></Field>
            <Field label="Last name"><input {...bind('last_name')} placeholder="Last name" /></Field>
            <Field label="Date of birth"><input {...bind('date_of_birth')} type="date" /></Field>
            <Field label="PPS number"><input {...bind('pps_number')} placeholder="e.g. 1234567T" /></Field>
            <Field label="Email"><input {...bind('email')} type="email" placeholder="participant@email.com" /></Field>
            <Field label="Phone"><input {...bind('phone')} placeholder="+353 87 000 0000" /></Field>
            <Field label="Consent status">
              <select {...bind('consent_status')}>
                {CONSENT_OPTS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </Field>
            <Field label="Active">
              <select
                value={form.is_active ? 'true' : 'false'}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}
              >
                <option value="true">Active</option>
                <option value="false">Withdrawn</option>
              </select>
            </Field>
            <Field label="Address" span2><textarea {...bind('address')} placeholder="Address…" /></Field>
          </div>
        </Modal>
      )}

      {delTarget && !detail && (
        <ConfirmModal
          message={`Withdraw ${delTarget.first_name} ${delTarget.last_name}?`}
          onConfirm={del} onClose={() => setDelTarget(null)} loading={saving}
        />
      )}
    </div>
  )
}
