import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { PlayerProvider } from './hooks/usePlayer'
import Navbar from './components/Navbar'
import MiniPlayer from './components/MiniPlayer'
import Home from './pages/Home'
import Browse from './pages/Browse'
import PlayerPage from './pages/PlayerPage'
import Library from './pages/Library'
import Party from './pages/Party'
import Admin from './pages/Admin'

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <PlayerProvider>
          <div className="app-layout">
            <Navbar />
            <main className="app-main">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/browse" element={<Browse />} />
                <Route path="/play/:id" element={<PlayerPage />} />
                <Route path="/library" element={<Library />} />
                <Route path="/party" element={<Party />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </main>
            <MiniPlayer />
          </div>
        </PlayerProvider>
      </AuthProvider>
    </HashRouter>
  )
}
