import { useState, useEffect } from 'react'
import { trials, phases, researchers } from '../api/api'
import { Modal, ConfirmModal, Field, Badge, SearchBar, EmptyState, Loading, ErrMsg, OkMsg, useForm } from '../components/UI'

const TRIAL_EMPTY  = { title: '', description: '', researcher_id: '', start_date: '', end_date: '', status: 'recruiting' }
const PHASE_EMPTY  = { phase_name: '', description: '', duration_weeks: '', order_number: '' }
const TRIAL_STATUSES = ['recruiting', 'active', 'completed', 'suspended']

export default function Trials() {
  const [list, setList]             = useState([])
  const [resList, setResList]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('all')
  const [selected, setSelected]     = useState(null)  // trial detail view
  const [phaseList, setPhaseList]   = useState([])

  const [trialModal, setTrialModal] = useState(false)
  const [editingTrial, setEditingTrial] = useState(null)
  const [phaseModal, setPhaseModal] = useState(false)
  const [editingPhase, setEditingPhase] = useState(null)
  const [delTrial, setDelTrial]     = useState(null)
  const [delPhase, setDelPhase]     = useState(null)

  const [err, setErr]   = useState('')
  const [ok, setOk]     = useState('')
  const [saving, setSaving] = useState(false)

  const tForm = useForm(TRIAL_EMPTY)
  const pForm = useForm(PHASE_EMPTY)

  const loadTrials = () => {
    setLoading(true)
    Promise.all([trials.list(), researchers.list().catch(() => [])])
      .then(([t, r]) => { setList(t); setResList(r) })
      .catch(() => setErr('Failed to load trials'))
      .finally(() => setLoading(false))
  }

  const loadPhases = (trialId) => {
    phases.list(trialId).then(setPhaseList).catch(() => {})
  }

  useEffect(() => { loadTrials() }, [])
  useEffect(() => { if (selected) loadPhases(selected.id) }, [selected])

  const filtered = list.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    return matchSearch && matchStatus
  })

  // Trial CRUD
  const openAddTrial = () => { tForm.reset(); setEditingTrial(null); setErr(''); setTrialModal(true) }
  const openEditTrial = (t) => { tForm.setForm({ ...t }); setEditingTrial(t); setErr(''); setTrialModal(true) }

  const saveTrial = async () => {
    if (!tForm.form.title || !tForm.form.start_date) { setErr('Title and start date are required.'); return }
    setSaving(true); setErr('')
    try {
      if (editingTrial) { await trials.update(editingTrial.id, tForm.form); if (selected?.id === editingTrial.id) setSelected({ ...selected, ...tForm.form }) }
      else await trials.create(tForm.form)
      setOk(editingTrial ? 'Trial updated.' : 'Trial created.')
      setTrialModal(false); loadTrials(); setTimeout(() => setOk(''), 3000)
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const deleteTrial = async () => {
    setSaving(true)
    try {
      await trials.delete(delTrial.id)
      setDelTrial(null); loadTrials(); setSelected(null)
      setOk('Trial deleted.'); setTimeout(() => setOk(''), 3000)
    } catch (e) { setErr(e.message); setDelTrial(null) }
    finally { setSaving(false) }
  }

  // Phase CRUD
  const openAddPhase = () => { pForm.reset(); setEditingPhase(null); setErr(''); setPhaseModal(true) }
  const openEditPhase = (p) => { pForm.setForm({ ...p }); setEditingPhase(p); setErr(''); setPhaseModal(true) }

  const savePhase = async () => {
    if (!pForm.form.phase_name) { setErr('Phase name is required.'); return }
    setSaving(true); setErr('')
    try {
      if (editingPhase) await phases.update(editingPhase.id, pForm.form)
      else await phases.create(selected.id, pForm.form)
      setOk(editingPhase ? 'Phase updated.' : 'Phase added.')
      setPhaseModal(false); loadPhases(selected.id); setTimeout(() => setOk(''), 3000)
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const deletePhase = async () => {
    setSaving(true)
    try {
      await phases.delete(delPhase.id)
      setDelPhase(null); loadPhases(selected.id)
      setOk('Phase deleted.'); setTimeout(() => setOk(''), 3000)
    } catch (e) { setErr(e.message); setDelPhase(null) }
    finally { setSaving(false) }
  }

  const resName = (id) => {
    const r = resList.find(r => r.id === id)
    return r ? `${r.first_name} ${r.last_name}` : '—'
  }

  // ── Detail view ──
  if (selected) return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={() => setSelected(null)}>← Back to trials</button>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">{selected.title}</h1>
          <p className="page-subtitle">{selected.description}</p>
        </div>
        <div className="inline-actions">
          <button className="btn btn-ghost" onClick={() => openEditTrial(selected)}>✎ Edit trial</button>
          <button className="btn btn-danger" onClick={() => setDelTrial(selected)}>Delete</button>
        </div>
      </div>

      <OkMsg msg={ok} />
      <ErrMsg msg={err} />

      <div className="card-row">
        <div className="card">
          <div className="stat-label" style={{ marginBottom: 6 }}>Status</div>
          <Badge value={selected.status} />
        </div>
        <div className="card">
          <div className="stat-label" style={{ marginBottom: 6 }}>Lead researcher</div>
          <div style={{ fontWeight: 500 }}>{resName(selected.researcher_id)}</div>
        </div>
        <div className="card">
          <div className="stat-label" style={{ marginBottom: 6 }}>Duration</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>
            {selected.start_date} → {selected.end_date || 'ongoing'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 16px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Trial phases</h2>
        <button className="btn btn-primary btn-sm" onClick={openAddPhase}>+ Add phase</button>
      </div>

      {phaseList.length === 0
        ? <EmptyState icon="🧪" message="No phases added yet — add your first phase above" />
        : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Phase name</th><th>Description</th><th>Duration (weeks)</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {[...phaseList].sort((a, b) => a.order_number - b.order_number).map(p => (
                  <tr key={p.id}>
                    <td className="td-mono">{p.order_number || '—'}</td>
                    <td style={{ fontWeight: 500 }}>{p.phase_name}</td>
                    <td className="td-muted">{p.description || '—'}</td>
                    <td className="td-mono">{p.duration_weeks || '—'}</td>
                    <td>
                      <div className="inline-actions">
                        <button className="btn btn-icon btn-sm" onClick={() => openEditPhase(p)}>✎</button>
                        <button className="btn btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDelPhase(p)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Modals */}
      {phaseModal && (
        <Modal title={editingPhase ? 'Edit phase' : 'Add phase'} onClose={() => setPhaseModal(false)} onSubmit={savePhase} loading={saving}>
          <ErrMsg msg={err} />
          <div className="form-grid">
            <Field label="Phase name"><input {...pForm.bind('phase_name')} placeholder="e.g. Phase I, Screening…" /></Field>
            <Field label="Order number"><input {...pForm.bind('order_number')} type="number" min="1" placeholder="1" /></Field>
            <Field label="Duration (weeks)"><input {...pForm.bind('duration_weeks')} type="number" min="1" placeholder="12" /></Field>
            <Field label="Description" span2><textarea {...pForm.bind('description')} placeholder="What happens in this phase?" /></Field>
          </div>
        </Modal>
      )}

      {delPhase && (
        <ConfirmModal message={`Delete phase "${delPhase.phase_name}"?`} onConfirm={deletePhase} onClose={() => setDelPhase(null)} loading={saving} />
      )}
      {delTrial && (
        <ConfirmModal message={`Delete trial "${delTrial.title}"? All related phases and enrolments will also be deleted.`} onConfirm={deleteTrial} onClose={() => setDelTrial(null)} loading={saving} />
      )}
    </div>
  )

  // ── List view ──
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clinical trials</h1>
          <p className="page-subtitle">{list.length} trial{list.length !== 1 ? 's' : ''} registered at SVUH</p>
        </div>
        <button className="btn btn-primary" onClick={openAddTrial}>+ New trial</button>
      </div>

      <ErrMsg msg={err} />
      <OkMsg msg={ok} />

      <div className="search-bar">
        <SearchBar value={search} onChange={setSearch} placeholder="Search trials…" />
        <select value={statusFilter} onChange={e => setStatus(e.target.value)} style={{ width: 160 }}>
          <option value="all">All statuses</option>
          {TRIAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <Loading /> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Title</th><th>Lead researcher</th><th>Status</th><th>Start date</th><th>End date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(t)}>
                  <td style={{ fontWeight: 500 }}>{t.title}</td>
                  <td className="td-muted">{resName(t.researcher_id)}</td>
                  <td onClick={e => e.stopPropagation()}><Badge value={t.status} /></td>
                  <td className="td-mono">{t.start_date}</td>
                  <td className="td-mono">{t.end_date || '—'}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="inline-actions">
                      <button className="btn btn-icon btn-sm" onClick={() => openEditTrial(t)}>✎</button>
                      <button className="btn btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDelTrial(t)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6}><EmptyState icon="🧫" message="No trials found" /></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {trialModal && (
        <Modal title={editingTrial ? 'Edit trial' : 'New clinical trial'} onClose={() => setTrialModal(false)} onSubmit={saveTrial} loading={saving}>
          <ErrMsg msg={err} />
          <div className="form-grid">
            <Field label="Title" span2><input {...tForm.bind('title')} placeholder="e.g. SVUH-ONCO-2024-01" /></Field>
            <Field label="Lead researcher" span2>
              <select {...tForm.bind('researcher_id')}>
                <option value="">Select researcher…</option>
                {resList.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select {...tForm.bind('status')}>
                {TRIAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <div />
            <Field label="Start date"><input {...tForm.bind('start_date')} type="date" /></Field>
            <Field label="End date"><input {...tForm.bind('end_date')} type="date" /></Field>
            <Field label="Description" span2><textarea {...tForm.bind('description')} placeholder="Brief description of the trial…" /></Field>
          </div>
        </Modal>
      )}

      {delTrial && (
        <ConfirmModal message={`Delete "${delTrial.title}"? All phases and enrolments will also be deleted.`} onConfirm={deleteTrial} onClose={() => setDelTrial(null)} loading={saving} />
      )}
    </div>
  )
}
