import { useState, useEffect } from 'react'
import { researchers } from '../api/api'
import { Modal, ConfirmModal, Field, SearchBar, EmptyState, Loading, ErrMsg, OkMsg, useForm } from '../components/UI'

const EMPTY = { first_name: '', last_name: '', email: '', department: '' }

export default function Researchers() {
  const [list, setList]       = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(null)   // null | 'add' | 'edit'
  const [editing, setEditing] = useState(null)
  const [delTarget, setDelTarget] = useState(null)
  const [err, setErr]         = useState('')
  const [ok, setOk]           = useState('')
  const [saving, setSaving]   = useState(false)
  const { form, bind, setForm, reset } = useForm(EMPTY)

  const load = () => {
    setLoading(true)
    researchers.list()
      .then(setList)
      .catch(() => setErr('Failed to load researchers'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = list.filter(r =>
    `${r.first_name} ${r.last_name} ${r.email} ${r.department}`
      .toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => { reset(); setEditing(null); setErr(''); setModal('edit') }
  const openEdit = (r) => { setForm({ ...r }); setEditing(r); setErr(''); setModal('edit') }

  const save = async () => {
    if (!form.first_name || !form.last_name || !form.email) {
      setErr('First name, last name and email are required.'); return
    }
    setSaving(true); setErr('')
    try {
      if (editing) await researchers.update(editing.id, form)
      else         await researchers.create(form)
      setOk(editing ? 'Researcher updated.' : 'Researcher added.')
      setModal(null); load()
      setTimeout(() => setOk(''), 3000)
    } catch (e) {
      setErr(e.message)
    } finally { setSaving(false) }
  }

  const del = async () => {
    setSaving(true)
    try {
      await researchers.delete(delTarget.id)
      setDelTarget(null); load()
      setOk('Researcher deleted.'); setTimeout(() => setOk(''), 3000)
    } catch (e) {
      setErr(e.message); setDelTarget(null)
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Researchers</h1>
          <p className="page-subtitle">Lead researchers managing clinical trials</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add researcher</button>
      </div>

      <ErrMsg msg={err} />
      <OkMsg msg={ok} />

      <div className="search-bar">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email or department…" />
      </div>

      {loading ? <Loading /> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.first_name} {r.last_name}</td>
                  <td className="td-muted">{r.email}</td>
                  <td className="td-muted">{r.department}</td>
                  <td className="td-mono">#{r.id}</td>
                  <td>
                    <div className="inline-actions">
                      <button className="btn btn-icon btn-sm" onClick={() => openEdit(r)}>✎</button>
                      <button className="btn btn-icon btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDelTarget(r)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5}><EmptyState icon="🔬" message="No researchers found" /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'edit' && (
        <Modal
          title={editing ? 'Edit researcher' : 'Add researcher'}
          onClose={() => setModal(null)}
          onSubmit={save}
          loading={saving}
        >
          <ErrMsg msg={err} />
          <div className="form-grid">
            <Field label="First name"><input {...bind('first_name')} placeholder="e.g. Aoife" /></Field>
            <Field label="Last name"><input {...bind('last_name')} placeholder="e.g. Murphy" /></Field>
            <Field label="Email" span2><input {...bind('email')} type="email" placeholder="a.murphy@svuh.ie" /></Field>
            <Field label="Department" span2>
              <input {...bind('department')} placeholder="e.g. Oncology, Cardiology…" />
            </Field>
          </div>
        </Modal>
      )}

      {delTarget && (
        <ConfirmModal
          message={`Delete ${delTarget.first_name} ${delTarget.last_name}? This cannot be undone.`}
          onConfirm={del}
          onClose={() => setDelTarget(null)}
          loading={saving}
        />
      )}
    </div>
  )
}
