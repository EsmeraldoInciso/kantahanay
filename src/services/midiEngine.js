import * as Tone from 'tone'
import { Midi } from '@tonejs/midi'

let masterGain = null
const synthPool = new Map()

function getMasterGain() {
  if (!masterGain) {
    masterGain = new Tone.Gain(0.8).toDestination()
  }
  return masterGain
}

export function setMasterVolume(val) {
  getMasterGain().gain.value = Math.max(0, Math.min(1, val))
}

function getSynth(channel) {
  if (synthPool.has(channel)) return synthPool.get(channel)

  const synth = new Tone.PolySynth(Tone.Synth, {
    maxPolyphony: 16,
    options: {
      oscillator: { type: channel === 0 ? 'triangle' : 'sine' },
      envelope: {
        attack: 0.02,
        decay: 0.3,
        sustain: 0.4,
        release: 0.8,
      },
      volume: -8,
    },
  }).connect(getMasterGain())

  synthPool.set(channel, synth)
  return synth
}

export function extractLyricsFromArrayBuffer(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer)
  const lyrics = []
  let ticksPerQuarter = 480
  const tempoMap = []

  if (data[0] !== 0x4D || data[1] !== 0x54) return lyrics

  const headerLen = (data[8] << 24) | (data[9] << 16) | (data[10] << 8) | data[11]
  const numTracks = (data[12] << 8) | data[13]
  ticksPerQuarter = (data[14] << 8) | data[15]

  let offset = 8 + 4 + headerLen

  function readVarLen(pos) {
    let value = 0
    let bytesRead = 0
    let byte
    do {
      byte = data[pos + bytesRead]
      value = (value << 7) | (byte & 0x7F)
      bytesRead++
    } while (byte & 0x80 && bytesRead < 4)
    return { value, bytesRead }
  }

  function ticksToSeconds(ticks) {
    let seconds = 0
    let lastTick = 0
    let currentTempo = 500000
    for (const t of tempoMap) {
      if (t.tick <= ticks) {
        seconds += ((t.tick - lastTick) / ticksPerQuarter) * (currentTempo / 1000000)
        lastTick = t.tick
        currentTempo = t.tempo
      }
    }
    seconds += ((ticks - lastTick) / ticksPerQuarter) * (currentTempo / 1000000)
    return seconds
  }

  // First pass: collect tempo map
  let off = offset
  for (let t = 0; t < numTracks; t++) {
    if (off + 8 > data.length) break
    if (data[off] !== 0x4D || data[off + 1] !== 0x54 || data[off + 2] !== 0x72 || data[off + 3] !== 0x6B) break
    const trackLen = (data[off + 4] << 24) | (data[off + 5] << 16) | (data[off + 6] << 8) | data[off + 7]
    let pos = off + 8
    const trackEnd = pos + trackLen
    let absoluteTick = 0
    let runningStatus = 0

    while (pos < trackEnd && pos < data.length) {
      const delta = readVarLen(pos)
      pos += delta.bytesRead
      absoluteTick += delta.value
      if (pos >= data.length) break
      const status = data[pos]

      if (status === 0xFF) {
        pos++
        if (pos >= data.length) break
        const metaType = data[pos]
        pos++
        const len = readVarLen(pos)
        pos += len.bytesRead
        if (metaType === 0x51 && len.value === 3 && pos + 3 <= data.length) {
          tempoMap.push({ tick: absoluteTick, tempo: (data[pos] << 16) | (data[pos + 1] << 8) | data[pos + 2] })
        }
        pos += len.value
      } else if (status === 0xF0 || status === 0xF7) {
        pos++
        const len = readVarLen(pos)
        pos += len.bytesRead + len.value
      } else if (status >= 0x80) {
        runningStatus = status
        pos++
        const type = status & 0xF0
        pos += (type === 0xC0 || type === 0xD0) ? 1 : 2
      } else {
        const type = runningStatus & 0xF0
        pos += (type === 0xC0 || type === 0xD0) ? 1 : 2
      }
    }
    off += 8 + trackLen
  }

  if (tempoMap.length === 0) tempoMap.push({ tick: 0, tempo: 500000 })
  tempoMap.sort((a, b) => a.tick - b.tick)

  // Second pass: extract lyrics
  off = offset
  for (let t = 0; t < numTracks; t++) {
    if (off + 8 > data.length) break
    if (data[off] !== 0x4D || data[off + 1] !== 0x54 || data[off + 2] !== 0x72 || data[off + 3] !== 0x6B) break
    const trackLen = (data[off + 4] << 24) | (data[off + 5] << 16) | (data[off + 6] << 8) | data[off + 7]
    let pos = off + 8
    const trackEnd = pos + trackLen
    let absoluteTick = 0
    let runningStatus = 0

    while (pos < trackEnd && pos < data.length) {
      const delta = readVarLen(pos)
      pos += delta.bytesRead
      absoluteTick += delta.value
      if (pos >= data.length) break
      const status = data[pos]

      if (status === 0xFF) {
        pos++
        if (pos >= data.length) break
        const metaType = data[pos]
        pos++
        const len = readVarLen(pos)
        pos += len.bytesRead
        if ((metaType === 0x05 || metaType === 0x01) && len.value > 0 && pos + len.value <= data.length) {
          let text = ''
          for (let i = 0; i < len.value; i++) text += String.fromCharCode(data[pos + i])
          if (absoluteTick > 0 || metaType === 0x05) {
            lyrics.push({ text, time: ticksToSeconds(absoluteTick), tick: absoluteTick })
          }
        }
        pos += len.value
      } else if (status === 0xF0 || status === 0xF7) {
        pos++
        const len = readVarLen(pos)
        pos += len.bytesRead + len.value
      } else if (status >= 0x80) {
        runningStatus = status
        pos++
        const type = status & 0xF0
        pos += (type === 0xC0 || type === 0xD0) ? 1 : 2
      } else {
        const type = runningStatus & 0xF0
        pos += (type === 0xC0 || type === 0xD0) ? 1 : 2
      }
    }
    off += 8 + trackLen
  }

  return lyrics
}

export class MidiPlayer {
  constructor() {
    this.midi = null
    this.lyrics = []
    this.isPlaying = false
    this.startTime = 0
    this.pauseTime = 0
    this.duration = 0
    this.transpose = 0
    this.playbackRate = 1
    this.mutedChannels = new Set()
    this.onLyricUpdate = null
    this.onTimeUpdate = null
    this.onEnd = null
    this._timeInterval = null
    this._scheduledIds = []
    this._rawBuffer = null
  }

  async load(url) {
    this.stop()

    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    this._rawBuffer = arrayBuffer

    this.midi = new Midi(arrayBuffer)
    this.lyrics = extractLyricsFromArrayBuffer(arrayBuffer)
    this.duration = this.midi.duration

    return { duration: this.duration, lyrics: this.lyrics, tracks: this.midi.tracks }
  }

  async play(fromTime = null) {
    await Tone.start()

    if (fromTime !== null) {
      this.pauseTime = fromTime
    }

    const startOffset = this.pauseTime
    const now = Tone.now()
    this.startTime = now - startOffset / this.playbackRate
    this.isPlaying = true

    // Schedule all notes using Tone.now() offsets (no Transport needed)
    for (const track of this.midi.tracks) {
      const channel = track.channel
      if (this.mutedChannels.has(channel)) continue
      if (channel === 9) continue // skip drums

      const synth = getSynth(channel)

      for (const note of track.notes) {
        const noteTime = note.time / this.playbackRate
        const playAt = now + noteTime - startOffset / this.playbackRate

        if (playAt < now - 0.01) continue // skip past notes

        const midiNote = note.midi + this.transpose
        if (midiNote < 21 || midiNote > 108) continue

        const noteDur = Math.max(0.05, note.duration / this.playbackRate)
        const freq = Tone.Frequency(midiNote, 'midi').toFrequency()

        try {
          synth.triggerAttackRelease(freq, noteDur, playAt, Math.min(note.velocity, 0.9))
        } catch {
          // ignore — polyphony limit reached
        }
      }
    }

    // Time update interval
    this._timeInterval = setInterval(() => {
      if (!this.isPlaying) return
      const elapsed = (Tone.now() - this.startTime) * this.playbackRate

      this.onTimeUpdate?.(Math.min(elapsed, this.duration))

      if (this.lyrics.length > 0) {
        let idx = -1
        for (let i = 0; i < this.lyrics.length; i++) {
          if (this.lyrics[i].time <= elapsed) idx = i
          else break
        }
        this.onLyricUpdate?.(idx, elapsed)
      }

      if (elapsed >= this.duration) {
        this.stop()
        this.onEnd?.()
      }
    }, 50)
  }

  pause() {
    if (!this.isPlaying) return
    this.pauseTime = (Tone.now() - this.startTime) * this.playbackRate
    this._stopSounds()
    this.isPlaying = false
  }

  stop() {
    this.pauseTime = 0
    this._stopSounds()
    this.isPlaying = false
  }

  seek(time) {
    const wasPlaying = this.isPlaying
    this._stopSounds()
    this.pauseTime = Math.max(0, Math.min(time, this.duration))
    this.isPlaying = false
    if (wasPlaying) this.play()
  }

  setTranspose(semitones) {
    this.transpose = semitones
    if (this.isPlaying) {
      const cur = (Tone.now() - this.startTime) * this.playbackRate
      this._stopSounds()
      this.pauseTime = cur
      this.isPlaying = false
      this.play()
    }
  }

  setPlaybackRate(rate) {
    this.playbackRate = Math.max(0.5, Math.min(2, rate))
    if (this.isPlaying) {
      const cur = (Tone.now() - this.startTime) * this.playbackRate
      this._stopSounds()
      this.pauseTime = cur
      this.isPlaying = false
      this.play()
    }
  }

  toggleMuteChannel(channel) {
    if (this.mutedChannels.has(channel)) {
      this.mutedChannels.delete(channel)
    } else {
      this.mutedChannels.add(channel)
    }
    // Re-schedule with updated mutes
    if (this.isPlaying) {
      const cur = (Tone.now() - this.startTime) * this.playbackRate
      this._stopSounds()
      this.pauseTime = cur
      this.isPlaying = false
      this.play()
    }
  }

  getCurrentTime() {
    if (!this.isPlaying) return this.pauseTime
    return (Tone.now() - this.startTime) * this.playbackRate
  }

  _stopSounds() {
    if (this._timeInterval) {
      clearInterval(this._timeInterval)
      this._timeInterval = null
    }
    // Release all active notes
    synthPool.forEach(synth => {
      try { synth.releaseAll() } catch { /* ignore */ }
    })
  }

  dispose() {
    this.stop()
    synthPool.forEach(s => { try { s.dispose() } catch { /* */ } })
    synthPool.clear()
    if (masterGain) {
      try { masterGain.dispose() } catch { /* */ }
      masterGain = null
    }
  }
}
