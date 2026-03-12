import * as Tone from 'tone'
import { Midi } from '@tonejs/midi'

let masterGain = null
let reverbNode = null
const synthPool = new Map()
const channelPrograms = new Map() // track program changes per channel

function getMasterGain() {
  if (!masterGain) {
    masterGain = new Tone.Gain(0.7).toDestination()
  }
  return masterGain
}

function getReverb() {
  if (!reverbNode) {
    reverbNode = new Tone.Reverb({ decay: 1.5, wet: 0.15 }).connect(getMasterGain())
  }
  return reverbNode
}

export function setMasterVolume(val) {
  getMasterGain().gain.value = Math.max(0, Math.min(1, val))
}

// GM instrument categories by program number
function getInstrumentCategory(program) {
  if (program <= 7) return 'piano'
  if (program <= 15) return 'chromatic' // celesta, glockenspiel, etc.
  if (program <= 23) return 'organ'
  if (program <= 31) return 'guitar'
  if (program <= 39) return 'bass'
  if (program <= 47) return 'strings'
  if (program <= 55) return 'ensemble'
  if (program <= 63) return 'brass'
  if (program <= 71) return 'reed'
  if (program <= 79) return 'pipe'
  if (program <= 87) return 'synthlead'
  if (program <= 95) return 'synthpad'
  if (program <= 103) return 'synthfx'
  if (program <= 111) return 'ethnic'
  if (program <= 119) return 'percussive'
  return 'sfx'
}

function createSynthForCategory(category) {
  const reverb = getReverb()

  switch (category) {
    case 'piano':
      return new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 12,
        options: {
          oscillator: { type: 'triangle8', partialCount: 4 },
          envelope: { attack: 0.005, decay: 0.8, sustain: 0.2, release: 1.2 },
          volume: -6,
        },
      }).connect(reverb)

    case 'organ':
      return new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 10,
        options: {
          oscillator: { type: 'sine4' },
          envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.3 },
          volume: -10,
        },
      }).connect(reverb)

    case 'guitar':
      return new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 8,
        options: {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.01, decay: 0.4, sustain: 0.15, release: 0.6 },
          volume: -8,
        },
      }).connect(reverb)

    case 'bass':
      return new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 4,
        options: {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.3 },
          volume: -6,
        },
      }).connect(getMasterGain()) // bass: no reverb

    case 'strings':
    case 'ensemble':
      return new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 12,
        options: {
          oscillator: { type: 'sawtooth8', partialCount: 3 },
          envelope: { attack: 0.15, decay: 0.3, sustain: 0.7, release: 0.8 },
          volume: -12,
        },
      }).connect(reverb)

    case 'brass':
      return new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 8,
        options: {
          oscillator: { type: 'sawtooth4' },
          envelope: { attack: 0.06, decay: 0.2, sustain: 0.6, release: 0.4 },
          volume: -10,
        },
      }).connect(reverb)

    case 'reed':
    case 'pipe':
      return new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 8,
        options: {
          oscillator: { type: 'sine8' },
          envelope: { attack: 0.04, decay: 0.2, sustain: 0.6, release: 0.5 },
          volume: -10,
        },
      }).connect(reverb)

    case 'synthlead':
      return new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 6,
        options: {
          oscillator: { type: 'square4' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.4 },
          volume: -10,
        },
      }).connect(reverb)

    case 'synthpad':
      return new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 8,
        options: {
          oscillator: { type: 'sine4' },
          envelope: { attack: 0.3, decay: 0.4, sustain: 0.7, release: 1.5 },
          volume: -12,
        },
      }).connect(reverb)

    case 'chromatic':
      return new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 8,
        options: {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.5, sustain: 0.1, release: 0.8 },
          volume: -8,
        },
      }).connect(reverb)

    default:
      return new Tone.PolySynth(Tone.Synth, {
        maxPolyphony: 8,
        options: {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.8 },
          volume: -10,
        },
      }).connect(reverb)
  }
}

// Create a basic noise-based drum synth
let drumSynth = null
function getDrumSynth() {
  if (drumSynth) return drumSynth

  drumSynth = {
    kick: new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.2 },
      volume: -4,
    }).connect(getMasterGain()),

    snare: new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 },
      volume: -10,
    }).connect(getMasterGain()),

    hihat: new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
      volume: -16,
    }).connect(getMasterGain()),

    tom: new Tone.MembraneSynth({
      pitchDecay: 0.03,
      octaves: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
      volume: -8,
    }).connect(getMasterGain()),
  }

  return drumSynth
}

function playDrum(note, time, velocity) {
  const drums = getDrumSynth()
  const v = Math.min(velocity, 0.9)

  try {
    // GM drum map
    switch (note) {
      case 35: case 36: // Acoustic/Electric Bass Drum
        drums.kick.triggerAttackRelease('C1', '8n', time, v)
        break
      case 38: case 40: // Snare
        drums.snare.triggerAttackRelease('8n', time, v)
        break
      case 42: case 44: case 46: // Hi-hats
        drums.hihat.triggerAttackRelease('32n', time, v * 0.6)
        break
      case 41: case 43: case 45: case 47: case 48: case 50: // Toms
        drums.tom.triggerAttackRelease('C2', '8n', time, v)
        break
      case 49: case 51: case 52: case 53: case 55: case 57: case 59: // Cymbals
        drums.hihat.triggerAttackRelease('16n', time, v * 0.5)
        break
      default:
        // Generic percussion — use hihat
        drums.hihat.triggerAttackRelease('32n', time, v * 0.4)
        break
    }
  } catch {
    // ignore
  }
}

function getSynth(channel, program = 0) {
  const key = `${channel}-${program}`
  if (synthPool.has(key)) return synthPool.get(key)

  const category = getInstrumentCategory(program)
  const synth = createSynthForCategory(category)
  synthPool.set(key, synth)
  return synth
}

export function extractLyricsFromArrayBuffer(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer)
  const lyrics = []
  let ticksPerQuarter = 480
  const tempoMap = []

  if (data[0] !== 0x4D || data[1] !== 0x54) return lyrics

  // MThd header: bytes 0-3 = "MThd", bytes 4-7 = header data length (always 6),
  // bytes 8-9 = format, bytes 10-11 = numTracks, bytes 12-13 = ticksPerQuarter
  const headerDataLen = (data[4] << 24) | (data[5] << 16) | (data[6] << 8) | data[7]
  const numTracks = (data[10] << 8) | data[11]
  ticksPerQuarter = (data[12] << 8) | data[13]

  let offset = 8 + headerDataLen

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
          // Skip KAR metadata lines that start with @
          if (!text.startsWith('@') && (absoluteTick > 0 || metaType === 0x05)) {
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

    // Extract program changes per channel
    channelPrograms.clear()
    for (const track of this.midi.tracks) {
      if (track.instrument && track.instrument.number !== undefined) {
        channelPrograms.set(track.channel, track.instrument.number)
      }
    }

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

    // Schedule all notes
    for (const track of this.midi.tracks) {
      const channel = track.channel
      if (this.mutedChannels.has(channel)) continue

      const program = channelPrograms.get(channel) || 0

      for (const note of track.notes) {
        const noteTime = note.time / this.playbackRate
        const playAt = now + noteTime - startOffset / this.playbackRate

        if (playAt < now - 0.01) continue

        const midiNote = note.midi + this.transpose
        if (midiNote < 0 || midiNote > 127) continue

        // Channel 9 = drums (GM standard)
        if (channel === 9) {
          playDrum(note.midi, playAt, note.velocity)
          continue
        }

        const noteDur = Math.max(0.05, note.duration / this.playbackRate)
        const freq = Tone.Frequency(midiNote, 'midi').toFrequency()

        const synth = getSynth(channel, program)
        try {
          synth.triggerAttackRelease(freq, noteDur, playAt, Math.min(note.velocity, 0.85))
        } catch {
          // ignore — polyphony limit reached
        }
      }
    }

    // Time/lyrics update interval
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
    // Release drum synths
    if (drumSynth) {
      try { drumSynth.kick.triggerRelease() } catch { /* */ }
    }
  }

  dispose() {
    this.stop()
    synthPool.forEach(s => { try { s.dispose() } catch { /* */ } })
    synthPool.clear()
    channelPrograms.clear()
    if (drumSynth) {
      try { drumSynth.kick.dispose() } catch { /* */ }
      try { drumSynth.snare.dispose() } catch { /* */ }
      try { drumSynth.hihat.dispose() } catch { /* */ }
      try { drumSynth.tom.dispose() } catch { /* */ }
      drumSynth = null
    }
    if (reverbNode) {
      try { reverbNode.dispose() } catch { /* */ }
      reverbNode = null
    }
    if (masterGain) {
      try { masterGain.dispose() } catch { /* */ }
      masterGain = null
    }
  }
}
