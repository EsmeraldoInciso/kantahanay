import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllSongs } from '../services/songService'
import SongCard from '../components/SongCard'
import { useAuth } from '../hooks/useAuth'

export default function Home() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    getAllSongs()
      .then(setSongs)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const recentSongs = [...songs].sort((a, b) => {
    const aDate = a.added_at?.toDate?.() || new Date(a.added_at || 0)
    const bDate = b.added_at?.toDate?.() || new Date(b.added_at || 0)
    return bDate - aDate
  }).slice(0, 10)

  const popularSongs = [...songs].sort((a, b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 10)

  return (
    <div className="page">
      <div style={{ textAlign: 'center', padding: '48px 0 40px' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.8rem',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          marginBottom: 8,
        }}>
          Kanta ta hanay! 🎤
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 500, margin: '0 auto' }}>
          Free browser-based karaoke with synchronized lyrics. No downloads needed.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/browse')}>
            Browse Songs
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => navigate('/party')}>
            Party Mode
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : songs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎵</div>
          <div className="empty-state-title">No songs yet</div>
          <p>Add songs through the Admin panel to get started.</p>
          {user && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/admin')}>
              Go to Admin
            </button>
          )}
        </div>
      ) : (
        <>
          {recentSongs.length > 0 && (
            <div className="section">
              <div className="section-header">
                <h2 className="section-title">Recently Added</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/browse')}>
                  View all →
                </button>
              </div>
              <div className="song-grid">
                {recentSongs.map(song => (
                  <SongCard key={song.id} song={song} />
                ))}
              </div>
            </div>
          )}

          {popularSongs.length > 0 && (
            <div className="section">
              <div className="section-header">
                <h2 className="section-title">Most Played</h2>
              </div>
              <div className="song-grid">
                {popularSongs.map(song => (
                  <SongCard key={song.id} song={song} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
