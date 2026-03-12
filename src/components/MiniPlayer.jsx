import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../hooks/usePlayer'
import { formatTime } from '../utils/format'

export default function MiniPlayer() {
  const {
    currentSong, isPlaying, isLoading, currentTime, duration,
    togglePlay, stop, seek, volume, setVolume,
  } = usePlayer()
  const navigate = useNavigate()

  if (!currentSong) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  function handleProgressClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    seek(pct * duration)
  }

  function handleExpand() {
    navigate(`/play/${currentSong.id}`, { state: { song: currentSong } })
  }

  return (
    <div className="mini-player">
      <div className="mini-player-info" onClick={handleExpand} style={{ cursor: 'pointer' }}>
        <div className="song-card-icon" style={{ width: 40, height: 40, fontSize: '1rem' }}>
          {isPlaying ? '♫' : '♪'}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="song-card-title" style={{ fontSize: '0.85rem' }}>
            {currentSong.title}
          </div>
          <div className="song-card-artist" style={{ fontSize: '0.75rem' }}>
            {currentSong.artist}
          </div>
        </div>
      </div>

      <div className="mini-player-controls">
        <button className="btn btn-ghost btn-icon-sm" onClick={stop}>⏹</button>
        <button
          className="play-btn"
          onClick={togglePlay}
          disabled={isLoading}
          style={{ width: 40, height: 40, fontSize: '1rem' }}
        >
          {isLoading ? '...' : isPlaying ? '⏸' : '▶'}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="player-time">{formatTime(currentTime)}</span>
        <div className="progress-bar" onClick={handleProgressClick}>
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          <div className="progress-bar-thumb" style={{ left: `${progress}%` }} />
        </div>
        <span className="player-time">{formatTime(duration)}</span>
      </div>

      <div className="mini-player-right">
        <div className="volume-slider">
          <span style={{ fontSize: '0.9rem' }}>🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
          />
        </div>
      </div>
    </div>
  )
}
