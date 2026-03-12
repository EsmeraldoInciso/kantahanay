import { useEffect, useState, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { usePlayer } from '../hooks/usePlayer'
import { useAuth } from '../hooks/useAuth'
import { getSong } from '../services/songService'
import { toggleFavorite } from '../services/userService'
import LyricsDisplay from '../components/LyricsDisplay'
import { formatTime } from '../utils/format'

export default function PlayerPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, userData, refreshUserData } = useAuth()
  const {
    currentSong, isPlaying, isLoading, isLoaded, currentTime, duration,
    lyrics, currentLyricIndex, volume, transpose, playbackRate,
    tracks, error,
    loadAndPlay, togglePlay, stop, seek, setVolume,
    setTranspose, setPlaybackRate, toggleMuteChannel,
  } = usePlayer()

  const [song, setSong] = useState(location.state?.song || null)
  const [isFav, setIsFav] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const progressRef = useRef(null)

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
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seek(pct * duration)
  }

  if (!song) {
    return (
      <div className="kara-player">
        <div className="kara-loading">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="kara-player">
      {/* Background glow effect */}
      <div className="kara-bg-glow" />

      {/* Top bar */}
      <div className="kara-top-bar">
        <button className="kara-back-btn" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="kara-now-playing-label">Now Playing</div>
        <button
          className="kara-controls-toggle"
          onClick={() => setShowControls(!showControls)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>

      {/* Song info */}
      <div className="kara-song-info">
        <div className="kara-song-icon">
          <span>{isPlaying ? '♪' : '♫'}</span>
        </div>
        <h1 className="kara-title">{song.title || 'Untitled'}</h1>
        <p className="kara-artist">{song.artist || 'Unknown Artist'}</p>
      </div>

      {error && (
        <div className="kara-error">{error}</div>
      )}

      {/* Lyrics area — the main attraction */}
      <div className="kara-lyrics-container">
        <LyricsDisplay
          lyrics={lyrics}
          currentIndex={currentLyricIndex}
          currentTime={currentTime}
        />
      </div>

      {/* Controls panel (toggleable) */}
      {showControls && (
        <div className="kara-settings-panel">
          <div className="kara-setting">
            <span className="kara-setting-label">Key</span>
            <div className="kara-setting-controls">
              <button onClick={() => setTranspose(transpose - 1)}>−</button>
              <span className="kara-setting-value">{transpose > 0 ? `+${transpose}` : transpose}</span>
              <button onClick={() => setTranspose(transpose + 1)}>+</button>
            </div>
          </div>
          <div className="kara-setting">
            <span className="kara-setting-label">Tempo</span>
            <div className="kara-setting-controls">
              <button onClick={() => setPlaybackRate(Math.max(0.5, playbackRate - 0.1))}>−</button>
              <span className="kara-setting-value">{Math.round(playbackRate * 100)}%</span>
              <button onClick={() => setPlaybackRate(Math.min(2, playbackRate + 0.1))}>+</button>
            </div>
          </div>
          <div className="kara-setting">
            <span className="kara-setting-label">Volume</span>
            <input
              type="range" min="0" max="1" step="0.01"
              value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              className="kara-volume-slider"
            />
          </div>
          {tracks.length > 0 && (
            <div className="kara-tracks">
              <span className="kara-setting-label">Tracks</span>
              <div className="kara-track-chips">
                {tracks.map((track, i) => (
                  <button
                    key={i}
                    className="kara-track-chip"
                    onClick={() => toggleMuteChannel(track.channel)}
                  >
                    {track.instrument?.name || track.name || `Ch ${track.channel}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom transport */}
      <div className="kara-transport">
        {/* Progress bar */}
        <div className="kara-progress-wrap">
          <span className="kara-time">{formatTime(currentTime)}</span>
          <div className="kara-progress" ref={progressRef} onClick={handleSeek}>
            <div className="kara-progress-bg" />
            <div className="kara-progress-fill" style={{ width: `${progress}%` }} />
            <div className="kara-progress-knob" style={{ left: `${progress}%` }} />
          </div>
          <span className="kara-time">{formatTime(duration)}</span>
        </div>

        {/* Main playback buttons */}
        <div className="kara-main-controls">
          <button className="kara-ctrl-btn" onClick={stop} title="Stop">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1"/>
            </svg>
          </button>

          <button
            className="kara-play-btn"
            onClick={() => togglePlay(user?.uid)}
            disabled={isLoading || !isLoaded}
          >
            {isLoading ? (
              <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
            ) : isPlaying ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6,4 20,12 6,20"/>
              </svg>
            )}
          </button>

          {user && (
            <button
              className={`kara-ctrl-btn ${isFav ? 'kara-fav-active' : ''}`}
              onClick={handleFavorite}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
