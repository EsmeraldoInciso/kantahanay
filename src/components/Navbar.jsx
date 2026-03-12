import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { user, loginWithGoogle, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
        Kantahanay
      </NavLink>

      <ul className="navbar-nav">
        <li><NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>Home</NavLink></li>
        <li><NavLink to="/browse" className={({ isActive }) => isActive ? 'active' : ''}>Browse</NavLink></li>
        <li><NavLink to="/party" className={({ isActive }) => isActive ? 'active' : ''}>Party</NavLink></li>
        {user && (
          <li><NavLink to="/library" className={({ isActive }) => isActive ? 'active' : ''}>My Library</NavLink></li>
        )}
        {user && (
          <li><NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>Admin</NavLink></li>
        )}
      </ul>

      <div className="navbar-actions">
        {user ? (
          <div className="navbar-user">
            {user.photoURL && (
              <img src={user.photoURL} alt="" className="navbar-avatar" referrerPolicy="no-referrer" />
            )}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {user.displayName?.split(' ')[0]}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
          </div>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={loginWithGoogle}>
            Sign in with Google
          </button>
        )}
      </div>
    </nav>
  )
}
