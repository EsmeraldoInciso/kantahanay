import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getAllSongs, addSong, updateSong, deleteSong } from '../services/songService'

const EMPTY_SONG = {
  title: '', artist: '', genre: '', language: 'en',
  file_url: '', file_type: 'kar', has_lyrics: true,
  duration_seconds: 0, file_size_kb: 0, tags: [],
}

export default function Admin() {
  const { user, loginWithGoogle } = useAuth()
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingSong, setEditingSong] = useState(null)
  const [form, setForm] = useState(EMPTY_SONG)
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadSongs()
  }, [])

  async function loadSongs() {
    setLoading(true)
    const all = await getAllSongs()
    setSongs(all)
    setLoading(false)
  }

  function handleNew() {
    setEditingSong(null)
    setForm(EMPTY_SONG)
    setTagInput('')
  }

  function handleEdit(song) {
    setEditingSong(song)
    setForm({
      title: song.title || '',
      artist: song.artist || '',
      genre: song.genre || '',
      language: song.language || 'en',
      file_url: song.file_url || '',
      file_type: song.file_type || 'kar',
      has_lyrics: song.has_lyrics ?? true,
      duration_seconds: song.duration_seconds || 0,
      file_size_kb: song.file_size_kb || 0,
      tags: song.tags || [],
    })
    setTagInput((song.tags || []).join(', '))
  }

  async function handleSave() {
    if (!form.title.trim()) return
    setSaving(true)

    const data = {
      ...form,
      tags: tagInput.split(',').map(t => t.trim()).filter(Boolean),
      duration_seconds: Number(form.duration_seconds) || 0,
      file_size_kb: Number(form.file_size_kb) || 0,
    }

    try {
      if (editingSong) {
        await updateSong(editingSong.id, data)
      } else {
        await addSong(data)
      }
      await loadSongs()
      handleNew()
    } catch (err) {
      console.error('Save error:', err)
      alert('Error saving song: ' + err.message)
    }
    setSaving(false)
  }

  async function handleDelete(song) {
    if (!confirm(`Delete "${song.title}"?`)) return
    await deleteSong(song.id)
    loadSongs()
    if (editingSong?.id === song.id) handleNew()
  }

  const filtered = search
    ? songs.filter(s =>
        (s.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.artist || '').toLowerCase().includes(search.toLowerCase())
      )
    : songs

  if (!user) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <div className="empty-state-title">Admin access requires sign-in</div>
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
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">Manage the song catalog</p>
      </div>

      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {/* Song form */}
        <div style={{ flex: '0 0 380px' }}>
          <h2 className="section-title" style={{ marginBottom: 16 }}>
            {editingSong ? 'Edit Song' : 'Add Song'}
          </h2>

          <div className="admin-form">
            <div className="form-group">
              <label>Title *</label>
              <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Artist</label>
              <input className="input" value={form.artist} onChange={e => setForm({ ...form, artist: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Genre</label>
                <input className="input" value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} placeholder="e.g. pop, rock, opm" />
              </div>
              <div className="form-group">
                <label>Language</label>
                <select className="select" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} style={{ width: '100%' }}>
                  <option value="en">English</option>
                  <option value="tl">Tagalog</option>
                  <option value="ceb">Cebuano</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="es">Spanish</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>File URL (MIDI/KAR)</label>
              <input className="input" value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} placeholder="https://cdn.jsdelivr.net/gh/..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>File Type</label>
                <select className="select" value={form.file_type} onChange={e => setForm({ ...form, file_type: e.target.value })} style={{ width: '100%' }}>
                  <option value="kar">KAR</option>
                  <option value="mid">MIDI</option>
                </select>
              </div>
              <div className="form-group">
                <label>Duration (seconds)</label>
                <input className="input" type="number" value={form.duration_seconds} onChange={e => setForm({ ...form, duration_seconds: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Tags (comma separated)</label>
              <input className="input" value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="ballad, 80s, love" />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.has_lyrics}
                  onChange={e => setForm({ ...form, has_lyrics: e.target.checked })}
                />
                Has lyrics
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingSong ? 'Update' : 'Add Song'}
              </button>
              {editingSong && (
                <button className="btn btn-ghost" onClick={handleNew}>Cancel</button>
              )}
            </div>
          </div>
        </div>

        {/* Song list */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <h2 className="section-title">Songs ({songs.length})</h2>
            <input
              className="input"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: 250 }}
            />
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Artist</th>
                    <th>Genre</th>
                    <th>Plays</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(song => (
                    <tr key={song.id}>
                      <td style={{ fontWeight: 500 }}>{song.title}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{song.artist}</td>
                      <td><span className="badge badge-warning">{song.genre || '-'}</span></td>
                      <td>{song.play_count || 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(song)}>Edit</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(song)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
