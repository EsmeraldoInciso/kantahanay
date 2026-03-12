import * as Tone from 'tone'
import { Midi } from '@tonejs/midi'

const SOUNDFONT_BASE = 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite'

const GM_INSTRUMENTS = [
  'acoustic_grand_piano', 'bright_acoustic_piano', 'electric_grand_piano',
  'honkytonk_piano', 'electric_piano_1', 'electric_piano_2', 'harpsichord',
  'clavinet', 'celesta', 'glockenspiel', 'music_box', 'vibraphone',
  'marimba', 'xylophone', 'tubular_bells', 'dulcimer', 'drawbar_organ',
  'percussive_organ', 'rock_organ', 'church_organ', 'reed_organ',
  'accordion', 'harmonica', 'tango_accordion', 'acoustic_guitar_nylon',
  'acoustic_guitar_steel', 'electric_guitar_jazz', 'electric_guitar_clean',
  'electric_guitar_muted', 'overdriven_guitar', 'distortion_guitar',
  'guitar_harmonics', 'acoustic_bass', 'electric_bass_finger',
  'electric_bass_pick', 'fretless_bass', 'slap_bass_1', 'slap_bass_2',
  'synth_bass_1', 'synth_bass_2', 'violin', 'viola', 'cello', 'contrabass',
  'tremolo_strings', 'pizzicato_strings', 'orchestral_harp', 'timpani',
  'string_ensemble_1', 'string_ensemble_2', 'synth_strings_1',
  'synth_strings_2', 'choir_aahs', 'voice_oohs', 'synth_choir',
  'orchestra_hit', 'trumpet', 'trombone', 'tuba', 'muted_trumpet',
  'french_horn', 'brass_section', 'synth_brass_1', 'synth_brass_2',
  'soprano_sax', 'alto_sax', 'tenor_sax', 'baritone_sax', 'oboe',
  'english_horn', 'bassoon', 'clarinet', 'piccolo', 'flute', 'recorder',
  'pan_flute', 'blown_bottle', 'shakuhachi', 'whistle', 'ocarina',
  'lead_1_square', 'lead_2_sawtooth', 'lead_3_calliope', 'lead_4_chiff',
  'lead_5_charang', 'lead_6_voice', 'lead_7_fifths', 'lead_8_bass_lead',
  'pad_1_new_age', 'pad_2_warm', 'pad_3_polysynth', 'pad_4_choir',
  'pad_5_bowed', 'pad_6_metallic', 'pad_7_halo', 'pad_8_sweep',
  'fx_1_rain', 'fx_2_soundtrack', 'fx_3_crystal', 'fx_4_atmosphere',
  'fx_5_brightness', 'fx_6_goblins', 'fx_7_echoes', 'fx_8_scifi',
  'sitar', 'banjo', 'shamisen', 'koto', 'kalimba', 'bagpipe', 'fiddle',
  'shanai', 'tinkle_bell', 'agogo', 'steel_drums', 'woodblock',
  'taiko_drum', 'melodic_tom', 'synth_drum', 'reverse_cymbal',
  'guitar_fret_noise', 'breath_noise', 'seashore', 'bird_tweet',
  'telephone_ring', 'helicopter', 'applause', 'gunshot',
]

const loadedSamplers = new Map()
const channelGains = new Map()
let masterGain = null

export function getMasterGain() {
  if (!masterGain) {
    masterGain = new Tone.Gain(0.8).toDestination()
  }
  return masterGain
}

export function setMasterVolume(val) {
  getMasterGain().gain.value = Math.max(0, Math.min(1, val))
}

export function setChannelMute(channel, muted) {
  const gain = channelGains.get(channel)
  if (gain) gain.gain.value = muted ? 0 : 1
}

async function loadSampler(programNumber) {
  const key = programNumber
  if (loadedSamplers.has(key)) return loadedSamplers.get(key)

  const name = GM_INSTRUMENTS[programNumber] || 'acoustic_grand_piano'
  const url = `${SOUNDFONT_BASE}/${name}-ogg.js`

  try {
    const response = await fetch(url)
    const text = await response.text()

    const match = text.match(/MIDI\.Soundfont\.[\w]+\s*=\s*(\{[\s\S]*\})/)
    if (!match) throw new Error('Could not parse soundfont')

    const data = JSON.parse(match[1])
    const urls = {}
    for (const [note, dataUri] of Object.entries(data)) {
      urls[note] = dataUri
    }

    const sampler = new Tone.Sampler({
      urls,
      release: 1,
    }).connect(getMasterGain())

    await Tone.loaded()
    loadedSamplers.set(key, sampler)
    return sampler
  } catch {
    if (loadedSamplers.has(0)) return loadedSamplers.get(0)

    const sampler = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 32,
      voice: Tone.Synth,
      options: { oscillator: { type: 'triangle' }, envelope: { release: 0.5 } },
    }).connect(getMasterGain())

    loadedSamplers.set(key, sampler)
    return sampler
  }
}

export async function parseMidiFile(url) {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const midi = new Midi(arrayBuffer)
  return midi
}

export function extractLyrics(midi) {
  const lyrics = []

  for (const track of midi.tracks) {
    // @tonejs/midi doesn't expose meta events directly,
    // so we parse the raw MIDI for lyrics
  }

  // Fallback: try track names that suggest lyrics
  for (const track of midi.tracks) {
    if (track.name && /lyric|vocal|word|text/i.test(track.name)) {
      // Use note events as timing markers
      for (const note of track.notes) {
        lyrics.push({
          text: '',
          time: note.time,
          duration: note.duration,
        })
      }
    }
  }

  return lyrics
}

export function extractLyricsFromArrayBuffer(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer)
  const lyrics = []
  let ticksPerQuarter = 480
  let tempo = 500000 // microseconds per beat (120 BPM default)
  const tempoMap = []

  // Read header
  if (data[0] !== 0x4D || data[1] !== 0x54) return lyrics // Not MIDI

  const headerLen = (data[8] << 24) | (data[9] << 16) | (data[10] << 8) | data[11]
  const format = (data[8 + 4] << 8) | data[8 + 5]
  const numTracks = (data[8 + 6] << 8) | data[8 + 7]
  ticksPerQuarter = (data[8 + 8] << 8) | data[8 + 9]

  let offset = 8 + 4 + headerLen

  function readVarLen(pos) {
    let value = 0
    let byte
    let bytesRead = 0
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
        seconds += ((Math.min(t.tick, ticks) - lastTick) / ticksPerQuarter) * (currentTempo / 1000000)
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
    const trackLen = (data[off + 4] << 24) | (data[off + 5] << 16) | (data[off + 6] << 8) | data[off + 7]
    let pos = off + 8
    const trackEnd = pos + trackLen
    let absoluteTick = 0

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

        if (metaType === 0x51 && len.value === 3) {
          const t = (data[pos] << 16) | (data[pos + 1] << 8) | data[pos + 2]
          tempoMap.push({ tick: absoluteTick, tempo: t })
        }
        pos += len.value
      } else if (status === 0xF0 || status === 0xF7) {
        pos++
        const len = readVarLen(pos)
        pos += len.bytesRead + len.value
      } else if (status >= 0x80) {
        const type = status & 0xF0
        pos++
        if (type === 0xC0 || type === 0xD0) pos += 1
        else pos += 2
      } else {
        pos += 2
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

        // 0x05 = Lyric, 0x01 = Text
        if ((metaType === 0x05 || metaType === 0x01) && len.value > 0) {
          let text = ''
          for (let i = 0; i < len.value; i++) {
            text += String.fromCharCode(data[pos + i])
          }
          // Filter out non-lyric text events (like track names at tick 0)
          if (absoluteTick > 0 || metaType === 0x05) {
            lyrics.push({
              text,
              time: ticksToSeconds(absoluteTick),
              tick: absoluteTick,
            })
          }
        }
        pos += len.value
      } else if (status === 0xF0 || status === 0xF7) {
        pos++
        const len = readVarLen(pos)
        pos += len.bytesRead + len.value
      } else if (status >= 0x80) {
        runningStatus = status
        const type = status & 0xF0
        pos++
        if (type === 0xC0 || type === 0xD0) pos += 1
        else pos += 2
      } else {
        // Running status
        const type = runningStatus & 0xF0
        if (type === 0xC0 || type === 0xD0) pos += 1
        else pos += 2
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
    this.scheduledEvents = []
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

    // Preload instruments used in this MIDI
    const programs = new Set()
    for (const track of this.midi.tracks) {
      if (track.instrument) {
        programs.add(track.instrument.number || 0)
      }
    }
    if (programs.size === 0) programs.add(0)

    // Load first few instruments, rest will load on demand
    const toLoad = [...programs].slice(0, 4)
    await Promise.all(toLoad.map(p => loadSampler(p)))

    return { duration: this.duration, lyrics: this.lyrics, tracks: this.midi.tracks }
  }

  async play(fromTime = null) {
    await Tone.start()

    if (fromTime !== null) {
      this.pauseTime = fromTime
    }

    const startOffset = this.pauseTime
    this.startTime = Tone.now() - startOffset / this.playbackRate
    this.isPlaying = true

    channelGains.clear()

    for (const track of this.midi.tracks) {
      const channel = track.channel
      if (this.mutedChannels.has(channel)) continue
      if (channel === 9) continue // Skip percussion for now

      const program = track.instrument?.number || 0

      let gain = channelGains.get(channel)
      if (!gain) {
        gain = new Tone.Gain(1).connect(getMasterGain())
        channelGains.set(channel, gain)
      }

      loadSampler(program).then(sampler => {
        if (!this.isPlaying) return

        for (const note of track.notes) {
          const noteTime = note.time / this.playbackRate
          const adjustedTime = noteTime - startOffset / this.playbackRate

          if (adjustedTime < 0) continue

          const eventId = Tone.Transport.schedule(time => {
            if (!this.isPlaying) return
            const midiNote = note.midi + this.transpose
            if (midiNote < 0 || midiNote > 127) return
            try {
              sampler.triggerAttackRelease(
                Tone.Frequency(midiNote, 'midi').toFrequency(),
                note.duration / this.playbackRate,
                time,
                note.velocity
              )
            } catch {
              // Ignore playback errors
            }
          }, `+${adjustedTime}`)

          this.scheduledEvents.push(eventId)
        }
      })
    }

    Tone.Transport.start()

    this._timeInterval = setInterval(() => {
      if (!this.isPlaying) return
      const elapsed = (Tone.now() - this.startTime) * this.playbackRate
      this.onTimeUpdate?.(elapsed)

      // Check lyrics
      if (this.lyrics.length > 0) {
        let currentIdx = -1
        for (let i = 0; i < this.lyrics.length; i++) {
          if (this.lyrics[i].time <= elapsed) currentIdx = i
          else break
        }
        this.onLyricUpdate?.(currentIdx, elapsed)
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
    this._cleanup()
    this.isPlaying = false
  }

  stop() {
    this.pauseTime = 0
    this._cleanup()
    this.isPlaying = false
  }

  seek(time) {
    const wasPlaying = this.isPlaying
    this._cleanup()
    this.pauseTime = Math.max(0, Math.min(time, this.duration))
    this.isPlaying = false
    if (wasPlaying) this.play()
  }

  setTranspose(semitones) {
    this.transpose = semitones
    if (this.isPlaying) {
      const currentTime = (Tone.now() - this.startTime) * this.playbackRate
      this.pause()
      this.pauseTime = currentTime
      this.play()
    }
  }

  setPlaybackRate(rate) {
    this.playbackRate = Math.max(0.5, Math.min(2, rate))
    if (this.isPlaying) {
      const currentTime = (Tone.now() - this.startTime) * this.playbackRate
      this.pause()
      this.pauseTime = currentTime
      this.play()
    }
  }

  toggleMuteChannel(channel) {
    if (this.mutedChannels.has(channel)) {
      this.mutedChannels.delete(channel)
      setChannelMute(channel, false)
    } else {
      this.mutedChannels.add(channel)
      setChannelMute(channel, true)
    }
  }

  getCurrentTime() {
    if (!this.isPlaying) return this.pauseTime
    return (Tone.now() - this.startTime) * this.playbackRate
  }

  _cleanup() {
    if (this._timeInterval) {
      clearInterval(this._timeInterval)
      this._timeInterval = null
    }
    for (const id of this.scheduledEvents) {
      Tone.Transport.clear(id)
    }
    this.scheduledEvents = []
    Tone.Transport.stop()
    Tone.Transport.cancel()
  }

  dispose() {
    this.stop()
    loadedSamplers.forEach(s => s.dispose())
    loadedSamplers.clear()
    channelGains.forEach(g => g.dispose())
    channelGains.clear()
    if (masterGain) {
      masterGain.dispose()
      masterGain = null
    }
  }
}
