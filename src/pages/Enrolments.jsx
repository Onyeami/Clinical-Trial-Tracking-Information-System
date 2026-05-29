import { useState, useEffect } from 'react'
import { enrolments, trials, phases, participants } from '../api/api'
import { Modal, ConfirmModal, Field, Badge, EmptyState, Loading, ErrMsg, OkMsg, useForm } from '../components/UI'

const EMPTY = { participant_id: '', trial_id: '', phase_id: '', enrolment_date: '', status: 'enrolled' }
const STATUSES = ['enrolled', 'completed', 'withdrawn', 'adverse_event']

export default function Enrolments() {
    const [list, setList]             = useState([])
    const [trialList, setTrialList]   = useState([])
    const [partList, setPartList]     = useState([])
    const [phaseOpts, setPhaseOpts]   = useState([])
    const [loading, setLoading]       = useState(true)
    const [filterTrial, setFilterTrial] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [modal, setModal]           = useState(false)
    const [editing, setEditing]       = useState(null)
    const [delTarget, setDelTarget]   = useState(null)
    const [err, setErr]               = useState('')
    const [ok, setOk]                 = useState('')
    const [saving, setSaving]         = useState(false)
    const { form, bind, setForm, reset } = useForm(EMPTY)

    const load = () => {
        setLoading(true)
        const filters = {}
        if (filterTrial)  filters.trial_id = filterTrial
        if (filterStatus) filters.status   = filterStatus
        Promise.all([
            enrolments.list(filters),
            trials.list().catch(() => []),
            participants.list().catch(() => []),
        ]).then(([e, t, p]) => {
            setList(e); setTrialList(t); setPartList(p)
        }).catch(() => setErr('Failed to load enrolments'))
        .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [filterTrial, filterStatus])

    // When trial changes in form, load its phases
    useEffect(() => {
        if (form.trial_id) {
            phases.list(form.trial_id).then(setPhaseOpts).catch(() => setPhaseOpts([]))
        } else {
            setPhaseOpts([])
        }
    }, [form.trial_id])

    const openAdd = () => { reset(); setEditing(null); setErr(''); setModal(true) }
    const openEdit = (e) => {
        setForm({ ...e }); setEditing(e); setErr('')
        phases.list(e.trial_id).then(setPhaseOpts).catch(() => {})
        setModal(true)
    }

    const save = async () => {
        if (!form.participant_id || !form.trial_id || !form.enrolment_date) {
            setErr('Participant, trial, and enrolment date are required.'); return
        }
        setSaving(true); setErr('')
        try {
            if (editing) await enrolments.update(editing.id, form)
                else         await enrolments.create(form)
                setOk(editing ? 'Enrolment updated.' : 'Participant enrolled.')
                setModal(false); load(); setTimeout(() => setOk(''), 3000)
        } catch (e) { setErr(e.message) }
        finally { setSaving(false) }
    }

    const del = async () => {
        setSaving(true)
        try {
            await enrolments.delete(delTarget.id)
            setDelTarget(null); load()
            setOk('Enrolment removed.'); setTimeout(() => setOk(''), 3000)
        }   catch (e) { setErr(e.message); setDelTarget(null) }
        finally { setSaving(false) }
    }

    const pName = (id) => {
        const p = partList.find(p => p.id === id)
        return p ? `${p.first_name} ${p.last_name}` : `Participant #${id}`
    }
    const tName = (id) => trialList.find(t => t.id === id)?.title ?? `Trial #${id}`
    const phName = (id) => phaseOpts.find(p => p.id === id)?.phase_name ?? `Phase #${id}`

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Enrolments</h1>
                    <p className="page-subtitle">Participant enrolment into trial phases</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>+ Enrol participant</button>
            </div>

            <ErrMsg msg={err} />
            <OkMsg msg={ok} />

            <div className="search-bar">
                <select value={filterTrial} onChange={e => setFilterTrial(e.target.value)} style={{ flex: 1 }}>
                    <option value="">All trials</option>
                    {trialList.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 180 }}>
                    <option value="">All statuses</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
            </div>

            {loading ? <Loading /> : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Participant</th>
                                <th>Trial</th>
                                <th>Phase</th>
                                <th>Enrolled</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map(e => (
                                <tr key={e.id}>
                                    <td style={{ fontWeight: 500 }}>{pName(e.participant_id)}</td>
                                    <td className="td-muted">{tName(e.trial_id)}</td>
                                    <td className="td-muted">{e.phase_id ? phName(e.phase_id) : '—'}</td>
                                    <td className="td-mono">{e.enrolment_date}</td>
                                    <td><Badge value={e.status} /></td>
                                    <td>
                                        <div className="inline-actions">
                                            <button className="btn btn-icon btn-sm" onClick={() => openEdit(e)}>✎</button>
                                            <button className="btn btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDelTarget(e)}>✕</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {list.length === 0 && <tr><td colSpan={6}><EmptyState icon="📋" message="No enrolments found" /></td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {modal && (
                <Modal
                    title={editing ? 'Update enrolment' : 'Enrol participant'}
                    onClose={() => setModal(false)}
                    onSubmit={save}
                    loading={saving}
                >
                    <ErrMsg msg={err} />
                    <div className="form-grid">
                        <Field label="Participant" span2>
                            <select {...bind('participant_id')}>
                                <option value="">Select participant…</option>
                                {partList.filter(p => p.is_active).map(p => (
                                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Trial" span2>
                            <select {...bind('trial_id')}>
                                <option value="">Select trial…</option>
                                {trialList.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                            </select>
                        </Field>
                        {phaseOpts.length > 0 && (
                            <Field label="Phase" span2>
                                <select {...bind('phase_id')}>
                                    <option value="">Select phase…</option>
                                    {phaseOpts.map(p => <option key={p.id} value={p.id}>{p.phase_name}</option>)}
                                </select>
                            </Field>
                        )}
                        <Field label="Enrolment date"><input {...bind('enrolment_date')} type="date" /></Field>
                        <Field label="Status">
                            <select {...bind('status')}>
                                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                            </select>
                        </Field>
                    </div>
                </Modal>
            )}

            {delTarget && (
                <ConfirmModal
                    message={`Remove enrolment for ${pName(delTarget.participant_id)}?`}
                    onConfirm={del} onClose={() => setDelTarget(null)} loading={saving}
                />
            )}
        </div>
    )
}
