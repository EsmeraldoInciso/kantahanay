import { useState, useEffect, useMemo } from 'react'
import { getAllSongs } from '../services/songService'
import SongCard from '../components/SongCard'
import { filterSongs } from '../utils/format'

const GENRES = ['all', 'pop', 'rock', 'ballad', 'opm', 'rnb', 'country', 'jazz', 'disco', 'hiphop']
const LANGUAGES = ['all', 'en', 'tl', 'ceb', 'ja', 'ko', 'es']

const LANGUAGE_LABELS = {
  all: 'All', en: 'English', tl: 'Tagalog', ceb: 'Cebuano',
  ja: 'Japanese', ko: 'Korean', es: 'Spanish',
}

export default function Browse() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('all')
  const [language, setLanguage] = useState('all')
  const [sortBy, setSortBy] = useState('title')

  useEffect(() => {
    getAllSongs()
      .then(setSongs)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let result = filterSongs(songs, search)
    if (genre !== 'all') result = result.filter(s => s.genre === genre)
    if (language !== 'all') result = result.filter(s => s.language === language)

    result.sort((a, b) => {
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '')
      if (sortBy === 'artist') return (a.artist || '').localeCompare(b.artist || '')
      if (sortBy === 'popular') return (b.play_count || 0) - (a.play_count || 0)
      if (sortBy === 'recent') {
        const aDate = a.added_at?.toDate?.() || new Date(a.added_at || 0)
        const bDate = b.added_at?.toDate?.() || new Date(b.added_at || 0)
        return bDate - aDate
      }
      return 0
    })

    return result
  }, [songs, search, genre, language, sortBy])

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Browse Songs</h1>
        <p className="page-subtitle">{songs.length} songs in catalog</p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="input-group" style={{ marginBottom: 16 }}>
          <span className="input-group-icon">🔍</span>
          <input
            className="input"
            type="text"
            placeholder="Search by title, artist, or tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div className="chip-group">
              {GENRES.map(g => (
                <button
                  key={g}
                  className={`chip ${genre === g ? 'active' : ''}`}
                  onClick={() => setGenre(g)}
                >
                  {g === 'all' ? 'All Genres' : g.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <select className="select" value={language} onChange={e => setLanguage(e.target.value)}>
            {LANGUAGES.map(l => (
              <option key={l} value={l}>{LANGUAGE_LABELS[l] || l}</option>
            ))}
          </select>

          <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="title">Sort by Title</option>
            <option value="artist">Sort by Artist</option>
            <option value="popular">Most Popular</option>
            <option value="recent">Recently Added</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">No songs found</div>
          <p>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="song-grid">
          {filtered.map(song => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      )}
    </div>
  )
}
