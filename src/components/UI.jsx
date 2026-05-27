import { useState } from 'react'

// ── Modal ──────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, onSubmit, children, submitLabel = 'Save', loading = false }) {
    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <button className="btn btn-icon" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">{children}</div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={onSubmit} disabled={loading}>
                        {loading ? 'Saving…' : submitLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Confirm Delete Modal ───────────────────────────────────────────────────
export function ConfirmModal({ message, onConfirm, onClose, loading }) {
    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 400 }}>
                <div className="modal-header">
                    <h2 className="modal-title">Confirm deletion</h2>
                    <button className="btn btn-icon" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>{message}</p>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Status Badge ───────────────────────────────────────────────────────────
const STATUS_MAP = {
    // trial statuses
    recruiting:    'badge-teal',
    active:        'badge-blue',
    completed:     'badge-green',
    suspended:     'badge-amber',
    // enrolment statuses
    enrolled:      'badge-teal',
    withdrawn:     'badge-red',
    adverse_event: 'badge-red',
    // checkin outcomes
    attended:      'badge-green',
    missed:        'badge-red',
    rescheduled:   'badge-amber',
    scheduled:     'badge-blue',
    // consent
    given:         'badge-green',
    pending:       'badge-amber',
    withdrawn_consent: 'badge-red',
    // active flag
    true:          'badge-green',
    false:         'badge-gray',
}

export function Badge({ value }) {
    const cls = STATUS_MAP[value?.toLowerCase?.() ?? value] ?? 'badge-gray'
    return <span className={`badge ${cls}`}>{value?.replace(/_/g, ' ')}</span>
}

// ── Form Field ─────────────────────────────────────────────────────────────
export function Field({ label, children, span2 = false }) {
    return (
        <div className={`form-group${span2 ? ' span-2' : ''}`}>
            <label>{label}</label>
            {children}
        </div>
    )
}

// ── Search Bar ─────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search…' }) {
    return (
        <div className="search-input-wrap">
            <span className="search-icon">⌕</span>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </div>
    )
}

// ── Empty State ────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', message = 'No records found' }) {
    return (
        <div className="empty-state">
            <div className="empty-icon">{icon}</div>
            <p>{message}</p>
        </div>
    )
}

// ── Loading ────────────────────────────────────────────────────────────────
export function Loading() {
    return <div className="loading">Loading…</div>
}

// ── Error / Success ────────────────────────────────────────────────────────
export function ErrMsg({ msg }) {
    return msg ? <div className="error-msg">⚠ {msg}</div> : null
}

export function OkMsg({ msg }) {
    return msg ? <div className="success-msg">✓ {msg}</div> : null
}

// ── useForm hook ───────────────────────────────────────────────────────────
export function useForm(initial) {
    const [form, setForm] = useState(initial)
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
    const reset = () => setForm(initial)
    const bind = (k) => ({
        value: form[k] ?? '',
        onChange: e => set(k, e.target.value),
    })
    return { form, set, reset, bind, setForm }
}
