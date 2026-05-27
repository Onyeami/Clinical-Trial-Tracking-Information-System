import { useState, useEffect } from 'react'
import { checkins, enrolments, participants, trials } from '../api/api'
import { Modal, ConfirmModal, Field, Badge, EmptyState, Loading, ErrMsg, OkMsg, useForm } from '../components/UI'

const EMPTY = {
    enrolment_id: '', scheduled_date: '', actual_date: '',
    checkin_type: 'in-person', outcome: 'scheduled', notes: ''
}
const TYPES    = ['in-person', 'remote']
const OUTCOMES = ['scheduled', 'attended', 'missed', 'rescheduled']

export default function Checkins() {
    const [list, setList]           = useState([])
    const [enrolList, setEnrolList] = useState([])
    const [partList, setPartList]   = useState([])
    const [trialList, setTrialList] = useState([])
    const [loading, setLoading]     = useState(true)
    const [filterEnrol, setFilterEnrol] = useState('')
    const [filterOutcome, setFilterOutcome] = useState('')
    const [modal, setModal]         = useState(false)
    const [editing, setEditing]     = useState(null)
    const [delTarget, setDelTarget] = useState(null)
    const [err, setErr]             = useState('')
    const [ok, setOk]               = useState('')
    const [saving, setSaving]       = useState(false)
    const { form, bind, reset, setForm } = useForm(EMPTY)

    const load = () => {
        setLoading(true)
        Promise.all([
            enrolments.list(),
            participants.list().catch(() => []),
            trials.list().catch(() => []),
        ]).then(async ([el, pl, tl]) => {
            setEnrolList(el); setPartList(pl); setTrialList(tl)
            // Load all checkins across enrolments
            const all = []
            await Promise.all(el.map(e =>
                checkins.list(e.id).then(cs => all.push(...cs)).catch(() => {})
            ))
            let filtered = all
            if (filterEnrol)  filtered = filtered.filter(c => String(c.enrolment_id) === String(filterEnrol))
            if (filterOutcome) filtered = filtered.filter(c => c.outcome === filterOutcome)
            // Sort by scheduled_date desc
            filtered.sort((a, b) => (b.scheduled_date ?? '').localeCompare(a.scheduled_date ?? ''))
            setList(filtered)
        }).catch(() => setErr('Failed to load check-ins'))
        .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [filterEnrol, filterOutcome])

    const openAdd = () => { reset(); setEditing(null); setErr(''); setModal(true) }
    const openEdit = (c) => { setForm({ ...c }); setEditing(c); setErr(''); setModal(true) }

    const save = async () => {
        if (!form.enrolment_id || !form.scheduled_date) {
            setErr('Enrolment and scheduled date are required.'); return
        }
        setSaving(true); setErr('')
        try {
            if (editing) await checkins.update(editing.id, form)
            else         await checkins.create(form.enrolment_id, form)
            setOk(editing ? 'Check-in updated.' : 'Check-in scheduled.')
            setModal(false); load(); setTimeout(() => setOk(''), 3000)
        }   catch (e) { setErr(e.message) }
        finally { setSaving(false) }
    }

    const del = async () => {
        setSaving(true)
        try {
            await checkins.delete(delTarget.id)
            setDelTarget(null); load()
            setOk('Check-in deleted.'); setTimeout(() => setOk(''), 3000)
        }   catch (e) { setErr(e.message); setDelTarget(null) }
        finally { setSaving(false) }
    }

    const enrolLabel = (id) => {
        const e = enrolList.find(e => e.id === id)
        if (!e) return `Enrolment #${id}`
        const p = partList.find(p => p.id === e.participant_id)
        const t = trialList.find(t => t.id === e.trial_id)
        return p && t ? `${p.first_name} ${p.last_name} — ${t.title}` : `Enrolment #${id}`
    }

    // Upcoming (scheduled + future)
    const today = new Date().toISOString().slice(0, 10)
    const upcoming = list.filter(c => c.outcome === 'scheduled' && c.scheduled_date >= today)
    const overdue  = list.filter(c => c.outcome === 'scheduled' && c.scheduled_date < today)

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Check-ins</h1>
                    <p className="page-subtitle">Scheduled and completed participant check-ins</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>+ Schedule check-in</button>
            </div>

            <ErrMsg msg={err} />
            <OkMsg msg={ok} />

            {/* Summary strip */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                <div className="card" style={{ flex: 1, minWidth: 140 }}>
                    <div className="stat-value" style={{ color: 'var(--blue)', fontSize: '1.6rem' }}>{upcoming.length}</div>
                    <div className="stat-label">Upcoming</div>
                </div>
                <div className="card" style={{ flex: 1, minWidth: 140 }}>
                    <div className="stat-value" style={{ color: overdue.length > 0 ? 'var(--red)' : 'var(--text-3)', fontSize: '1.6rem' }}>{overdue.length}</div>
                    <div className="stat-label">Overdue</div>
                </div>
                <div className="card" style={{ flex: 1, minWidth: 140 }}>
                    <div className="stat-value" style={{ color: 'var(--green)', fontSize: '1.6rem' }}>{list.filter(c => c.outcome === 'attended').length}</div>
                    <div className="stat-label">Attended</div>
                </div>
                <div className="card" style={{ flex: 1, minWidth: 140 }}>
                    <div className="stat-value" style={{ color: 'var(--red)', fontSize: '1.6rem' }}>{list.filter(c => c.outcome === 'missed').length}</div>
                    <div className="stat-label">Missed</div>
                </div>
            </div>

            <div className="search-bar">
                <select value={filterEnrol} onChange={e => setFilterEnrol(e.target.value)} style={{ flex: 1 }}>
                    <option value="">All enrolments</option>
                    {enrolList.map(e => (
                        <option key={e.id} value={e.id}>{enrolLabel(e.id)}</option>
                    ))}
                </select>
                <select value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)} style={{ width: 180 }}>
                    <option value="">All outcomes</option>
                    {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            </div>

            {loading ? <Loading /> : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Participant — Trial</th>
                                <th>Scheduled</th>
                                <th>Actual</th>
                                <th>Type</th>
                                <th>Outcome</th>
                                <th>Notes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map(c => (
                                <tr key={c.id} style={{ background: c.outcome === 'scheduled' && c.scheduled_date < today ? 'rgba(239,68,68,0.04)' : undefined }}>
                                    <td style={{ fontWeight: 500 }}>{enrolLabel(c.enrolment_id)}</td>
                                    <td className="td-mono" style={{ color: c.outcome === 'scheduled' && c.scheduled_date < today ? 'var(--red)' : undefined }}>
                                        {c.scheduled_date}
                                    </td>
                                    <td className="td-mono">{c.actual_date || '—'}</td>
                                    <td className="td-muted">{c.checkin_type}</td>
                                    <td><Badge value={c.outcome} /></td>
                                    <td className="td-muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.notes || '—'}
                                    </td>
                                    <td>
                                        <div className="inline-actions">
                                            <button className="btn btn-icon btn-sm" onClick={() => openEdit(c)}>✎</button>
                                            <button className="btn btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDelTarget(c)}>✕</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {list.length === 0 && <tr><td colSpan={7}><EmptyState icon="📅" message="No check-ins found" /></td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {modal && (
                <Modal
                    title={editing ? 'Update check-in' : 'Schedule check-in'}
                    onClose={() => setModal(false)}
                    onSubmit={save}
                    loading={saving}
                >
                    <ErrMsg msg={err} />
                    <div className="form-grid">
                        <Field label="Enrolment" span2>
                            <select {...bind('enrolment_id')}>
                                <option value="">Select enrolment…</option>
                                {enrolList.map(e => (
                                    <option key={e.id} value={e.id}>{enrolLabel(e.id)}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Scheduled date"><input {...bind('scheduled_date')} type="date" /></Field>
                        <Field label="Actual date"><input {...bind('actual_date')} type="date" /></Field>
                        <Field label="Type">
                            <select {...bind('checkin_type')}>
                                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </Field>
                        <Field label="Outcome">
                            <select {...bind('outcome')}>
                                {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </Field>
                        <Field label="Clinical notes" span2>
                            <textarea {...bind('notes')} placeholder="Any clinical observations or notes…" />
                        </Field>
                    </div>
                </Modal>
            )}

            {delTarget && (
                <ConfirmModal
                    message="Delete this check-in record? This cannot be undone."
                    onConfirm={del} onClose={() => setDelTarget(null)} loading={saving}
                />
            )}
        </div>
    )
}
