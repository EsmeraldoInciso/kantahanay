import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePlayer } from '../hooks/usePlayer'
import { getAllSongs } from '../services/songService'
import {
  createSession, findSession, endSession, updateSessionPlayback,
  subscribeSession, addToQueue, removeFromQueue, subscribeQueue,
} from '../services/queueService'
import SongCard from '../components/SongCard'
import { filterSongs } from '../utils/format'

export default function Party() {
  const { user } = useAuth()
  const { loadAndPlay } = usePlayer()
  const [mode, setMode] = useState(null) // null, 'host', 'guest'
  const [session, setSession] = useState(null)
  const [queue, setQueue] = useState([])
  const [joinCode, setJoinCode] = useState('')
  const [guestName, setGuestName] = useState('')
  const [error, setError] = useState('')
  const [songs, setSongs] = useState([])
  const [search, setSearch] = useState('')
  const [showSongPicker, setShowSongPicker] = useState(false)

  useEffect(() => {
    getAllSongs().then(setSongs).catch(console.error)
  }, [])

  useEffect(() => {
    if (!session) return
    const unsub1 = subscribeSession(session.id, setSession)
    const unsub2 = subscribeQueue(session.id, setQueue)
    return () => { unsub1(); unsub2() }
  }, [session?.id])

  async function handleCreateRoom() {
    const name = user?.displayName || 'Host'
    const s = await createSession(user?.uid || 'anon', name)
    setSession(s)
    setMode('host')
  }

  async function handleJoinRoom() {
    if (!joinCode.trim()) { setError('Enter a room code'); return }
    const s = await findSession(joinCode.trim())
    if (!s) { setError('Room not found'); return }
    setSession(s)
    setMode('guest')
    setError('')
  }

  async function handleEndRoom() {
    if (session) await endSession(session.id)
    setSession(null)
    setMode(null)
    setQueue([])
  }

  async function handleAddSong(song) {
    if (!session) return
    const name = user?.displayName || guestName || 'Guest'
    await addToQueue(session.id, song.id, song.title, name, user?.uid)
    setShowSongPicker(false)
    setSearch('')
  }

  async function handleRemove(itemId) {
    await removeFromQueue(itemId)
  }

  async function handlePlayNext() {
    const waiting = queue.filter(q => q.status === 'waiting')
    if (waiting.length === 0) return
    const next = waiting[0]
    const song = songs.find(s => s.id === next.song_id)
    if (song) {
      await updateSessionPlayback(session.id, { current_song: next.song_id, is_playing: true })
      loadAndPlay(song, user?.uid)
      await removeFromQueue(next.id)
    }
  }

  const filteredSongs = filterSongs(songs, search)

  // Landing: choose host or guest
  if (!mode) {
    return (
      <div className="page" style={{ textAlign: 'center' }}>
        <div className="page-header">
          <h1 className="page-title">Party Mode 🎉</h1>
          <p className="page-subtitle">Sing together! Host a room or join one.</p>
        </div>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
          <div className="card" style={{ maxWidth: 320, textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎤</div>
            <h3 style={{ marginBottom: 8 }}>Host a Room</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
              Create a room and share the code with friends.
            </p>
            <button className="btn btn-primary" onClick={handleCreateRoom}>
              Create Room
            </button>
          </div>

          <div className="card" style={{ maxWidth: 320, textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎵</div>
            <h3 style={{ marginBottom: 8 }}>Join a Room</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
              Enter a room code to join the party.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                placeholder="Room code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
                style={{ textAlign: 'center', letterSpacing: '0.2em', textTransform: 'uppercase' }}
                onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
              />
              <button className="btn btn-primary" onClick={handleJoinRoom}>Join</button>
            </div>
            {!user && (
              <input
                className="input"
                placeholder="Your name"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                style={{ marginTop: 8 }}
              />
            )}
            {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>{error}</p>}
          </div>
        </div>
      </div>
    )
  }

  // Active room
  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Party Room</h1>
          <div className="room-code" style={{ marginTop: 8 }}>{session?.code || '----'}</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 8 }}>
            Share this code with friends to join
          </p>
        </div>
        {mode === 'host' && (
          <button className="btn btn-danger" onClick={handleEndRoom}>End Room</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Queue */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <div className="section-header">
            <h2 className="section-title">Queue ({queue.length})</h2>
            {mode === 'host' && queue.length > 0 && (
              <button className="btn btn-primary btn-sm" onClick={handlePlayNext}>
                Play Next ▶
              </button>
            )}
          </div>

          {queue.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <p>No songs in queue. Add some!</p>
            </div>
          ) : (
            <div className="queue-container">
              {queue.map((item, i) => (
                <div key={item.id} className="queue-item">
                  <div className="queue-position">{i + 1}</div>
                  <div className="queue-item-info">
                    <div className="queue-item-title">{item.song_title}</div>
                    <div className="queue-item-by">Requested by {item.display_name}</div>
                  </div>
                  {mode === 'host' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(item.id)}>✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Song picker */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <div className="section-header">
            <h2 className="section-title">Add a Song</h2>
          </div>
          <input
            className="input"
            placeholder="Search songs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {filteredSongs.slice(0, 20).map(song => (
              <SongCard key={song.id} song={song} showActions={false} onAddToQueue={handleAddSong} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
