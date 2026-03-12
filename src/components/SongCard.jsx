import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../hooks/usePlayer'
import { useAuth } from '../hooks/useAuth'
import { formatDuration } from '../utils/format'

export default function SongCard({ song, showActions = true, onAddToQueue }) {
  const navigate = useNavigate()
  const { loadAndPlay, currentSong, isPlaying } = usePlayer()
  const { user } = useAuth()
  const isCurrentSong = currentSong?.id === song.id

  function handlePlay(e) {
    e.stopPropagation()
    loadAndPlay(song, user?.uid)
  }

  function handleClick() {
    navigate(`/play/${song.id}`, { state: { song } })
  }

  return (
    <div className={`song-card ${isCurrentSong ? 'now-playing' : ''}`} onClick={handleClick}>
      <div className="song-card-icon">
        {isCurrentSong && isPlaying ? '♫' : '♪'}
      </div>
      <div className="song-card-info">
        <div className="song-card-title">{song.title || 'Untitled'}</div>
        <div className="song-card-artist">{song.artist || 'Unknown Artist'}</div>
      </div>
      <div className="song-card-meta">
        {song.duration_seconds && (
          <span>{formatDuration(song.duration_seconds)}</span>
        )}
        {song.has_lyrics && <span className="badge badge-success">Lyrics</span>}
      </div>
      {showActions && (
        <div className="song-card-actions">
          <button className="btn btn-ghost btn-sm" onClick={handlePlay} title="Play now">
            ▶
          </button>
          {onAddToQueue && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={(e) => { e.stopPropagation(); onAddToQueue(song) }}
              title="Add to queue"
            >
              +
            </button>
          )}
        </div>
      )}
    </div>
  )
}
