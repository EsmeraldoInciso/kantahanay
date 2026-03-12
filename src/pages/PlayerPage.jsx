import { useEffect, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { usePlayer } from '../hooks/usePlayer'
import { useAuth } from '../hooks/useAuth'
import { getSong } from '../services/songService'
import { toggleFavorite, getUserData } from '../services/userService'
import LyricsDisplay from '../components/LyricsDisplay'
import { formatTime } from '../utils/format'

export default function PlayerPage() {
  const { id } = useParams()
  const location = useLocation()
  const { user, userData, refreshUserData } = useAuth()
  const {
    currentSong, isPlaying, isLoading, currentTime, duration,
    lyrics, currentLyricIndex, volume, transpose, playbackRate,
    tracks, error,
    loadAndPlay, togglePlay, stop, seek, setVolume,
    setTranspose, setPlaybackRate, toggleMuteChannel,
  } = usePlayer()

  const [song, setSong] = useState(location.state?.song || null)
  const [isFav, setIsFav] = useState(false)

  useEffect(() => {
    if (!song && id) {
      getSong(id).then(s => {
        if (s) setSong(s)
      })
    }
  }, [id, song])

  useEffect(() => {
    if (song && (!currentSong || currentSong.id !== song.id)) {
      loadAndPlay(song, user?.uid)
    }
  }, [song])

  useEffect(() => {
    if (userData && song) {
      setIsFav((userData.favorites || []).includes(song.id))
    }
  }, [userData, song])

  async function handleFavorite() {
    if (!user || !song) return
    const result = await toggleFavorite(user.uid, song.id)
    setIsFav(result)
    refreshUserData()
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  function handleSeek(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    seek(pct * duration)
  }

  if (!song) {
    return (
      <div className="page">
        <div className="loading-spinner"><div className="spinner" /></div>
      </div>
    )
  }

  return (
    <div className="player-page">
      <div className="player-song-title">{song.title || 'Untitled'}</div>
      <div className="player-song-artist">{song.artist || 'Unknown Artist'}</div>

      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: 16, padding: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)' }}>
          {error}
        </div>
      )}

      <LyricsDisplay
        lyrics={lyrics}
        currentIndex={currentLyricIndex}
        currentTime={currentTime}
      />

      <div className="player-controls-bar">
        <button className="btn btn-ghost btn-icon" onClick={stop}>⏹</button>
        <button
          className="play-btn"
          onClick={togglePlay}
          disabled={isLoading}
        >
          {isLoading ? '...' : isPlaying ? '⏸' : '▶'}
        </button>
        {user && (
          <button
            className="btn btn-ghost btn-icon"
            onClick={handleFavorite}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFav ? '❤️' : '🤍'}
          </button>
        )}
      </div>

      <div className="player-time-bar">
        <span className="player-time">{formatTime(currentTime)}</span>
        <div className="progress-bar" onClick={handleSeek} style={{ flex: 1 }}>
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          <div className="progress-bar-thumb" style={{ left: `${progress}%` }} />
        </div>
        <span className="player-time">{formatTime(duration)}</span>
      </div>

      <div className="player-extra-controls">
        <div className="control-group">
          <label>Volume</label>
          <input
            type="range" min="0" max="1" step="0.01"
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            style={{ accentColor: 'var(--accent)' }}
          />
        </div>

        <div className="control-group">
          <label>Key</label>
          <button className="btn btn-secondary btn-sm" onClick={() => setTranspose(transpose - 1)}>-</button>
          <span style={{ minWidth: 30, textAlign: 'center' }}>{transpose > 0 ? `+${transpose}` : transpose}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setTranspose(transpose + 1)}>+</button>
        </div>

        <div className="control-group">
          <label>Tempo</label>
          <button className="btn btn-secondary btn-sm" onClick={() => setPlaybackRate(Math.max(0.5, playbackRate - 0.1))}>-</button>
          <span style={{ minWidth: 40, textAlign: 'center' }}>{Math.round(playbackRate * 100)}%</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPlaybackRate(Math.min(2, playbackRate + 0.1))}>+</button>
        </div>
      </div>

      {tracks.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>Tracks</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {tracks.map((track, i) => (
              <button
                key={i}
                className="chip"
                onClick={() => toggleMuteChannel(track.channel)}
                title={`Toggle ${track.name || `Track ${i + 1}`}`}
              >
                {track.name || `Ch ${track.channel}`}
                {track.instrument?.name && ` (${track.instrument.name})`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
