import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { getSong } from '../services/songService'
import { getUserPlaylists, createPlaylist, deletePlaylist, addSongToPlaylist, removeSongFromPlaylist, getPlaylist } from '../services/playlistService'
import SongCard from '../components/SongCard'

export default function Library() {
  const { user, userData, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('favorites')
  const [favSongs, setFavSongs] = useState([])
  const [recentSongs, setRecentSongs] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [playlistSongs, setPlaylistSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (!user || !userData) { setLoading(false); return }
    loadData()
  }, [user, userData, tab])

  async function loadData() {
    setLoading(true)
    try {
      if (tab === 'favorites' && userData?.favorites?.length > 0) {
        const songs = await Promise.all(
          userData.favorites.map(id => getSong(id).catch(() => null))
        )
        setFavSongs(songs.filter(Boolean))
      }

      if (tab === 'recent' && userData?.recently_played?.length > 0) {
        const songs = await Promise.all(
          userData.recently_played.slice(0, 20).map(r => getSong(r.song_id).catch(() => null))
        )
        setRecentSongs(songs.filter(Boolean))
      }

      if (tab === 'playlists') {
        const lists = await getUserPlaylists(user.uid)
        setPlaylists(lists)
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  async function handleCreatePlaylist() {
    if (!newPlaylistName.trim()) return
    await createPlaylist(user.uid, newPlaylistName.trim())
    setNewPlaylistName('')
    setShowCreate(false)
    loadData()
  }

  async function handleDeletePlaylist(id) {
    if (!confirm('Delete this playlist?')) return
    await deletePlaylist(id)
    setSelectedPlaylist(null)
    loadData()
  }

  async function handleViewPlaylist(playlist) {
    setSelectedPlaylist(playlist)
    if (playlist.songs?.length > 0) {
      const songs = await Promise.all(
        playlist.songs.map(id => getSong(id).catch(() => null))
      )
      setPlaylistSongs(songs.filter(Boolean))
    } else {
      setPlaylistSongs([])
    }
  }

  if (!user) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <div className="empty-state-title">Sign in to access your library</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={loginWithGoogle}>
            Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">My Library</h1>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'favorites' ? 'active' : ''}`} onClick={() => setTab('favorites')}>
          Favorites
        </button>
        <button className={`tab ${tab === 'recent' ? 'active' : ''}`} onClick={() => setTab('recent')}>
          Recently Played
        </button>
        <button className={`tab ${tab === 'playlists' ? 'active' : ''}`} onClick={() => setTab('playlists')}>
          Playlists
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : (
        <>
          {tab === 'favorites' && (
            favSongs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">❤️</div>
                <div className="empty-state-title">No favorites yet</div>
                <p>Tap the heart on any song to add it here.</p>
              </div>
            ) : (
              <div className="song-grid">
                {favSongs.map(song => <SongCard key={song.id} song={song} />)}
              </div>
            )
          )}

          {tab === 'recent' && (
            recentSongs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🕐</div>
                <div className="empty-state-title">No recently played songs</div>
                <p>Start playing some songs!</p>
              </div>
            ) : (
              <div className="song-grid">
                {recentSongs.map(song => <SongCard key={song.id} song={song} />)}
              </div>
            )
          )}

          {tab === 'playlists' && !selectedPlaylist && (
            <>
              <div style={{ marginBottom: 16 }}>
                {showCreate ? (
                  <div style={{ display: 'flex', gap: 8, maxWidth: 400 }}>
                    <input
                      className="input"
                      placeholder="Playlist name"
                      value={newPlaylistName}
                      onChange={e => setNewPlaylistName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreatePlaylist()}
                      autoFocus
                    />
                    <button className="btn btn-primary" onClick={handleCreatePlaylist}>Create</button>
                    <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                  </div>
                ) : (
                  <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                    + New Playlist
                  </button>
                )}
              </div>

              {playlists.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <div className="empty-state-title">No playlists yet</div>
                  <p>Create a playlist to organize your songs.</p>
                </div>
              ) : (
                <div className="song-grid">
                  {playlists.map(pl => (
                    <div key={pl.id} className="card card-clickable" onClick={() => handleViewPlaylist(pl)}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{pl.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {pl.songs?.length || 0} songs
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'playlists' && selectedPlaylist && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <button className="btn btn-ghost" onClick={() => setSelectedPlaylist(null)}>← Back</button>
                <h2 style={{ fontWeight: 600 }}>{selectedPlaylist.name}</h2>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeletePlaylist(selectedPlaylist.id)}
                >
                  Delete
                </button>
              </div>
              {playlistSongs.length === 0 ? (
                <div className="empty-state">
                  <p>This playlist is empty. Add songs from the Browse page.</p>
                </div>
              ) : (
                <div className="song-grid">
                  {playlistSongs.map(song => <SongCard key={song.id} song={song} />)}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
