import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import * as Tone from 'tone'
import { MidiPlayer, setMasterVolume } from '../services/midiEngine'
import { incrementPlayCount } from '../services/songService'
import { addRecentlyPlayed } from '../services/userService'

const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
  const playerRef = useRef(null)
  const [currentSong, setCurrentSong] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [lyrics, setLyrics] = useState([])
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1)
  const [volume, setVolumeState] = useState(0.8)
  const [transpose, setTransposeState] = useState(0)
  const [playbackRate, setPlaybackRateState] = useState(1)
  const [tracks, setTracks] = useState([])
  const [error, setError] = useState(null)

  const getPlayer = useCallback(() => {
    if (!playerRef.current) {
      playerRef.current = new MidiPlayer()
    }
    return playerRef.current
  }, [])

  // Load song data (fetch + parse) without starting audio
  const loadSong = useCallback(async (song) => {
    setError(null)
    setIsLoading(true)
    setIsLoaded(false)
    setIsPlaying(false)
    setCurrentSong(song)
    setLyrics([])
    setCurrentLyricIndex(-1)
    setCurrentTime(0)

    const player = getPlayer()
    player.stop()

    try {
      const result = await player.load(song.file_url)
      setDuration(result.duration)
      setLyrics(result.lyrics)
      setTracks(result.tracks)

      player.onTimeUpdate = (time) => setCurrentTime(time)
      player.onLyricUpdate = (idx) => setCurrentLyricIndex(idx)
      player.onEnd = () => {
        setIsPlaying(false)
        setCurrentTime(0)
      }

      setIsLoaded(true)
      setIsLoading(false)
    } catch (err) {
      console.error('MIDI load error:', err)
      setError('Failed to load song. The file may be unavailable.')
      setIsLoading(false)
    }
  }, [getPlayer])

  // Start playing — MUST be called from a user gesture (click)
  const startPlayback = useCallback(async (userId) => {
    const player = getPlayer()
    if (!isLoaded || !currentSong) return

    try {
      // Tone.start() requires user gesture — called here from click handler
      await Tone.start()
      await player.play()
      setIsPlaying(true)

      // Track play count
      try {
        await incrementPlayCount(currentSong.id)
        if (userId) await addRecentlyPlayed(userId, currentSong.id)
      } catch {
        // Non-critical
      }
    } catch (err) {
      console.error('Play error:', err)
      setError('Failed to start playback.')
    }
  }, [getPlayer, isLoaded, currentSong])

  // Combined load + mark ready (auto-play NOT called — user must click play)
  const loadAndPlay = useCallback(async (song, userId) => {
    await loadSong(song)
    // Don't auto-play. The PlayerPage will show a play button.
    // Save userId for when user clicks play
  }, [loadSong])

  const togglePlay = useCallback(async (userId) => {
    const player = getPlayer()
    if (isPlaying) {
      player.pause()
      setIsPlaying(false)
    } else if (isLoaded && currentSong) {
      try {
        await Tone.start()
        await player.play()
        setIsPlaying(true)

        // Track on first play
        try {
          await incrementPlayCount(currentSong.id)
          if (userId) await addRecentlyPlayed(userId, currentSong.id)
        } catch {
          // Non-critical
        }
      } catch (err) {
        console.error('Play error:', err)
      }
    }
  }, [isPlaying, isLoaded, currentSong, getPlayer])

  const stop = useCallback(() => {
    getPlayer().stop()
    setIsPlaying(false)
    setCurrentTime(0)
    setCurrentLyricIndex(-1)
  }, [getPlayer])

  const seek = useCallback((time) => {
    getPlayer().seek(time)
    setCurrentTime(time)
  }, [getPlayer])

  const setVolume = useCallback((val) => {
    setVolumeState(val)
    setMasterVolume(val)
  }, [])

  const setTranspose = useCallback((val) => {
    setTransposeState(val)
    getPlayer().setTranspose(val)
  }, [getPlayer])

  const setPlaybackRate = useCallback((val) => {
    setPlaybackRateState(val)
    getPlayer().setPlaybackRate(val)
  }, [getPlayer])

  const toggleMuteChannel = useCallback((channel) => {
    getPlayer().toggleMuteChannel(channel)
  }, [getPlayer])

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose()
        playerRef.current = null
      }
    }
  }, [])

  return (
    <PlayerContext.Provider value={{
      currentSong, isPlaying, isLoading, isLoaded, currentTime, duration,
      lyrics, currentLyricIndex, volume, transpose, playbackRate,
      tracks, error,
      loadAndPlay, loadSong, startPlayback, togglePlay, stop, seek, setVolume,
      setTranspose, setPlaybackRate, toggleMuteChannel,
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
