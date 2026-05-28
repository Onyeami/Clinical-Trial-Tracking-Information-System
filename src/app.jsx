import { useState, useEffect } from 'react'
import './index.css'
import { auth } from './api/api'
import Dashboard    from './pages/Dashboard'
import Researchers  from './pages/Researchers'
import Trials       from './pages/Trials'
import Participants from './pages/Participants'
import Enrolments   from './pages/Enrolments'
import Checkins     from './pages/Checkins'
import Login        from './pages/Login'

const NAV = [
    { id: 'dashboard',    label: 'Dashboard',    icon: '⬛',  section: null },
    { id: 'researchers',  label: 'Researchers',  icon: '🔬', section: 'People' },
    { id: 'participants', label: 'Participants', icon: '👤', section: null },
    { id: 'trials',       label: 'Trials',       icon: '🧫', section: 'Trials' },
    { id: 'enrolments',   label: 'Enrolments',   icon: '📋', section: null },
    { id: 'checkins',     label: 'Check-ins',    icon: '📅', section: null },
]

const PAGES = {
    dashboard:    Dashboard,
    researchers:  Researchers,
    trials:       Trials,
    participants: Participants,
    enrolments:   Enrolments,
    checkins:     Checkins,
}

export default function App() {
    const [user, setUser] = useState(auth.getUser())
    const [page, setPage] = useState('dashboard')
    
    useEffect(() => {
        // Optional: verify token on load
        if (user) {
            auth.me().catch(() => handleLogout())
        }
    }, [])

    const handleLogin = () => setUser(auth.getUser())
    const handleLogout = () => {
        auth.logout()
        setUser(null)
    }

    if (!user) {
        return <Login onLogin={handleLogin} />
    }

    const Page = PAGES[page]

    let lastSection = null

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="wordmark">SVUH Clinical<br />Trial Tracker</div>
                    <div className="sub">Research Unit — Dublin 4</div>
                </div>

                <nav className="sidebar-nav">
                    {NAV.map(item => {
                        const showSection = item.section && item.section !== lastSection
                        if (item.section) lastSection = item.section
                        return (
                            <div key={item.id}>
                                {showSection && (
                                    <div className="nav-section-label">{item.section}</div>
                                )}
                                <div
                                    className={`nav-item${page === item.id ? ' active' : ''}`}
                                    onClick={() => setPage(item.id)}
                                >
                                    <span className="icon">{item.icon}</span>
                                    {item.label}
                                </div>
                            </div>
                        )
                    })}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="user-info">
                            <div className="user-email">{user.email}</div>
                            <div className={`badge badge-sm badge-${user.role === 'admin' ? 'red' : user.role === 'researcher' ? 'teal' : 'amber'}`}>
                                {user.role}
                            </div>
                        </div>
                        <button className="btn-logout" onClick={handleLogout} title="Sign Out">
                            Logout 🔒
                        </button>
                    </div>
                    <div className="staff-meta">
                        B8IT150 — Advanced Programming<br />
                        St Vincent's University Hospital, Dublin 4
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <Page />
            </main>
        </div>
    )
}
