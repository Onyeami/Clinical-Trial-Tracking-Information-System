import { useState, useEffect } from 'react'
import { trials, participants, enrolments, auth } from '../api/api'
import { Badge, Loading } from '../components/UI'

export default function Dashboard() {
    const user = auth.getUser()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            trials.list().catch(() => []),
            participants.list().catch(() => []),
            enrolments.list().catch(() => []),
        ]).then(([t, p, e]) => {
            setData({ trials: t, participants: p, enrolments: e })
            setLoading(false)
        })
    },  [])

    if (loading || !user) return <Loading />

    const { trials: t, participants: p, enrolments: e } = data
    const activeTrials = t.filter(x => x.status === 'active' || x.status === 'recruiting')
    const enrolledNow  = e.filter(x => x.status === 'enrolled')
    const adverse      = e.filter(x => x.status === 'adverse_event')

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Welcome back, <span style={{ color: 'var(--teal)', fontWeight: 500 }}>{user.role}</span> — St Vincent's UH Research Unit</p>
                </div>
            </div>

            <div className="stats-row">
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--teal)' }}>{t.length}</div>
                    <div className="stat-label">Total trials</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--blue)' }}>{activeTrials.length}</div>
                    <div className="stat-label">Active / recruiting</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--amber)' }}>{p.length}</div>
                    <div className="stat-label">Registered participants</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: adverse.length > 0 ? 'var(--red)' : 'var(--green)' }}>
                        {adverse.length}
                    </div>
                    <div className="stat-label">Adverse events</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Recent trials */}
                <div>
                    <h2 className="section-title">Recent trials</h2>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Trial</th>
                                    <th>Status</th>
                                    <th>Start</th>
                                </tr>
                            </thead>
                            <tbody>
                                {t.slice(0, 6).map(tr => (
                                    <tr key={tr.id}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{tr.title}</div>
                                        </td>
                                        <td><Badge value={tr.status} /></td>
                                        <td className="td-mono">{tr.start_date}</td>
                                    </tr>
                                ))}
                                {t.length === 0 && (
                                    <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px' }}>No trials yet</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Enrolment breakdown */}
                <div>
                    <h2 className="section-title">Enrolment breakdown</h2>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Count</th>
                                    <th>% of total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {['enrolled','completed','withdrawn','adverse_event'].map(s => {
                                    const count = e.filter(x => x.status === s).length
                                    const pct = e.length ? Math.round((count / e.length) * 100) : 0
                                    return (
                                        <tr key={s}>
                                            <td><Badge value={s} /></td>
                                            <td style={{ fontWeight: 500 }}>{count}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{
                                                        height: 6, width: `${pct}%`, minWidth: pct > 0 ? 4 : 0,
                                                        background: 'var(--teal)', borderRadius: 99, maxWidth: 80
                                                    }} />
                                                    <span className="td-muted">{pct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <h2 className="section-title">Participants currently enrolled</h2>
                        <div className="card">
                            <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', color: 'var(--teal)' }}>
                                {enrolledNow.length}
                            </div>
                            <div style={{ color: 'var(--text-2)', fontSize: '0.83rem', marginTop: 4 }}>
                                across {activeTrials.length} active trial{activeTrials.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
