import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RootLayout() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  function handleLogout() {
    logout()
    navigate('/')
  }

  // Redirect to dashboard if logged in and on auth page
  if (token && location.pathname === '/') {
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="brand">
          <div className="logo-dot" />
          <span>MedAssist</span>
        </div>
        <div className="header-actions">
          {token ? (
            <div className="user-menu">
              <span className="user-name">{user?.name || 'User'}</span>
              <button onClick={handleLogout} className="btn ghost">Logout</button>
            </div>
          ) : (
            <Link to="/" className="btn ghost">Login</Link>
          )}
        </div>
      </header>
      <div className="shell">
        <aside className="sidebar">
          {token && (
            <nav className="side-links">
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
              <NavLink to="/tracker" className={({ isActive }) => isActive ? 'active' : ''}>Tracker</NavLink>
              <NavLink to="/prescriptions" className={({ isActive }) => isActive ? 'active' : ''}>Prescriptions</NavLink>
              <NavLink to="/medicines" className={({ isActive }) => isActive ? 'active' : ''}>Medicines</NavLink>
              <NavLink to="/chatbot" className={({ isActive }) => isActive ? 'active' : ''}>Chatbot</NavLink>
              <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>Profile</NavLink>
            </nav>
          )}
          <div className="sidebar-footer">{token ? `Signed in as ${user?.name || 'User'}` : 'Guest'}</div>
        </aside>
        <main className="content">
          <div className="container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}


