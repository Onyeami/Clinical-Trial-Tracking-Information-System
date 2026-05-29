import { useState } from 'react'
import { auth } from '../api/api'

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            await auth.login(email, password)
            onLogin()
        }   catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-page">
            <div className="login-card glass">
                <div className="login-header">
                    <div className="logo-badge">🔬</div>
                    <h1>Clinical Research Login</h1>
                    <p>St Vincent's University Hospital Research Unit</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="login-error alert-error">{error}</div>}

                    <div className="form-group">
                        <label>Staff Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. admin@svuh.ie"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={loading}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Protected Clinical Information System</p>
                    <div className="login-hints">
                        <span>Admin: admin@svuh.ie / admin123</span>
                        <span>Staff: password123</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
