import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from './components/ui'
import { useAuth } from './lib/auth'
import { Admin } from './pages/Admin'
import { History } from './pages/History'
import { BoltIcon, Login } from './pages/Login'
import { Post } from './pages/Post'
import { Queue } from './pages/Queue'

export function App() {
  const { user, loading, signOut } = useAuth()

  if (loading) return <Spinner />
  if (!user) return <Login />

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              <BoltIcon />
            </span>
            PublishFast
          </NavLink>

          <nav className="nav">
            <NavLink to="/" end>
              Queue
            </NavLink>
            <NavLink to="/history">History</NavLink>
            {user.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
            <button className="btn btn-ghost btn-sm" onClick={() => void signOut()}>
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Queue />} />
          <Route path="/post/:id" element={<Post />} />
          <Route path="/history" element={<History />} />
          <Route path="/admin" element={user.role === 'admin' ? <Admin /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
