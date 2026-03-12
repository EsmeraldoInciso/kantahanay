#!/usr/bin/env node
/**
 * Kantahanay — Batch Song Import Script
 *
 * Usage:
 *   node scripts/import-songs.js <folder-of-kar-files> [--github-user USERNAME] [--github-repo REPO]
 *
 * What it does (per the plan, Section 9):
 *   1. Scans a folder for .kar/.mid files
 *   2. Parses each file to extract metadata (title, artist, duration, has lyrics)
 *   3. Renames using consistent slug: artist-title.kar
 *   4. Copies files into the kantahanay-songs repo (organized by first letter)
 *   5. Generates Firestore import data (JSON) you can upload
 *
 * After running, cd into kantahanay-songs, commit, and push.
 * Then run: node scripts/firestore-upload.js to register songs in Firestore.
 */

import fs from 'fs'
import path from 'path'

const GITHUB_USER = process.argv.find((a, i) => process.argv[i - 1] === '--github-user') || 'EsmeraldoInciso'
const GITHUB_REPO = process.argv.find((a, i) => process.argv[i - 1] === '--github-repo') || 'kantahanay-songs'

const inputDir = process.argv[2]
if (!inputDir) {
  console.error('Usage: node scripts/import-songs.js <folder-of-kar-files>')
  process.exit(1)
}

const SONGS_REPO_PATH = path.resolve(import.meta.dirname, '../../kantahanay-songs')

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function readVarLen(data, pos) {
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

function parseMidiMetadata(filePath) {
  const data = fs.readFileSync(filePath)
  const result = {
    title: '',
    artist: '',
    duration_seconds: 0,
    has_lyrics: false,
    textEvents: [],
  }

  if (data[0] !== 0x4D || data[1] !== 0x54 || data[2] !== 0x68 || data[3] !== 0x64) {
    return result // Not a valid MIDI file
  }

  const headerLen = (data[8] << 24) | (data[9] << 16) | (data[10] << 8) | data[11]
  const numTracks = (data[12] << 8) | data[13]
  const ticksPerQuarter = (data[14] << 8) | data[15]

  let tempo = 500000 // default 120 BPM
  let maxTick = 0
  let offset = 8 + headerLen

  for (let t = 0; t < numTracks; t++) {
    if (offset + 8 > data.length) break

    // Verify track header
    if (data[offset] !== 0x4D || data[offset + 1] !== 0x54 ||
        data[offset + 2] !== 0x72 || data[offset + 3] !== 0x6B) {
      break
    }

    const trackLen = (data[offset + 4] << 24) | (data[offset + 5] << 16) |
                     (data[offset + 6] << 8) | data[offset + 7]
    let pos = offset + 8
    const trackEnd = pos + trackLen
    let absoluteTick = 0
    let runningStatus = 0

    while (pos < trackEnd && pos < data.length) {
      const delta = readVarLen(data, pos)
      pos += delta.bytesRead
      absoluteTick += delta.value
      maxTick = Math.max(maxTick, absoluteTick)

      if (pos >= data.length) break
      const status = data[pos]

      if (status === 0xFF) {
        pos++
        if (pos >= data.length) break
        const metaType = data[pos]
        pos++
        const len = readVarLen(data, pos)
        pos += len.bytesRead

        if (len.value > 0 && pos + len.value <= data.length) {
          const textBytes = data.slice(pos, pos + len.value)
          const text = Buffer.from(textBytes).toString('utf-8')

          if (metaType === 0x03 && t === 0) {
            // Track name — often the song title
            if (!result.title) result.title = text.trim()
          }

          if (metaType === 0x02) {
            // Copyright — sometimes has artist
            if (!result.artist && text.trim()) result.artist = text.trim()
          }

          if (metaType === 0x01) {
            // Text event — could be lyrics or metadata
            result.textEvents.push(text)
            if (absoluteTick > 0) result.has_lyrics = true
          }

          if (metaType === 0x05) {
            // Lyric event — definitely has lyrics
            result.has_lyrics = true
          }

          if (metaType === 0x51 && len.value === 3) {
            tempo = (data[pos] << 16) | (data[pos + 1] << 8) | data[pos + 2]
          }
        }

        pos += len.value
      } else if (status === 0xF0 || status === 0xF7) {
        pos++
        const len = readVarLen(data, pos)
        pos += len.bytesRead + len.value
      } else if (status >= 0x80) {
        runningStatus = status
        const type = status & 0xF0
        pos++
        if (type === 0xC0 || type === 0xD0) pos += 1
        else pos += 2
      } else {
        const type = runningStatus & 0xF0
        if (type === 0xC0 || type === 0xD0) pos += 1
        else pos += 2
      }
    }

    offset += 8 + trackLen
  }

  // Calculate duration
  if (ticksPerQuarter > 0 && maxTick > 0) {
    result.duration_seconds = Math.round((maxTick / ticksPerQuarter) * (tempo / 1000000))
  }

  // Try to extract title/artist from filename if not found in metadata
  if (!result.title) {
    const basename = path.basename(filePath, path.extname(filePath))
    const parts = basename.split(/[-_]/)
    if (parts.length >= 2) {
      result.artist = parts[0].trim().replace(/^\w/, c => c.toUpperCase())
      result.title = parts.slice(1).join(' ').trim().replace(/^\w/, c => c.toUpperCase())
    } else {
      result.title = basename.replace(/[-_]/g, ' ').trim()
    }
  }

  // Try to extract artist from text events (common pattern: "@T..." for title, "@A..." for artist in KAR)
  for (const text of result.textEvents) {
    if (text.startsWith('@T') && !result.title) {
      result.title = text.slice(2).trim()
    }
    if (text.startsWith('@A') || text.startsWith('@ A')) {
      result.artist = text.replace(/^@\s*A\s*/, '').trim()
    }
  }

  return result
}

// Main
console.log(`\nKantahanay Song Importer`)
console.log(`=======================\n`)
console.log(`Scanning: ${inputDir}`)
console.log(`Songs repo: ${SONGS_REPO_PATH}`)
console.log(`CDN base: https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}\n`)

const files = fs.readdirSync(inputDir).filter(f =>
  f.toLowerCase().endsWith('.kar') || f.toLowerCase().endsWith('.mid')
)

if (files.length === 0) {
  console.log('No .kar or .mid files found in the specified folder.')
  process.exit(0)
}

console.log(`Found ${files.length} files\n`)

const importData = []
let imported = 0
let skipped = 0

for (const file of files) {
  const fullPath = path.join(inputDir, file)
  const ext = path.extname(file).toLowerCase().replace('.', '')

  try {
    const meta = parseMidiMetadata(fullPath)
    const title = meta.title || path.basename(file, path.extname(file))
    const artist = meta.artist || 'Unknown'
    const slug = slugify(`${artist}-${title}`)
    const firstLetter = slug[0] || 'z'

    // Copy file to songs repo
    const destDir = path.join(SONGS_REPO_PATH, 'songs', firstLetter)
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true })

    const destFile = `${slug}.${ext}`
    const destPath = path.join(destDir, destFile)
    fs.copyFileSync(fullPath, destPath)

    const fileSize = Math.round(fs.statSync(fullPath).size / 1024)
    const fileUrl = `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}/songs/${firstLetter}/${destFile}`

    const songData = {
      title: title,
      artist: artist,
      genre: '',
      language: 'en',
      duration_seconds: meta.duration_seconds,
      file_url: fileUrl,
      file_type: ext,
      file_size_kb: fileSize,
      has_lyrics: meta.has_lyrics,
      tags: [],
      play_count: 0,
    }

    importData.push(songData)
    imported++
    console.log(`  ✓ ${title} — ${artist} (${fileSize} KB, ${meta.has_lyrics ? 'lyrics' : 'no lyrics'})`)
  } catch (err) {
    skipped++
    console.log(`  ✗ ${file}: ${err.message}`)
  }
}

// Write import JSON
const outputPath = path.join(SONGS_REPO_PATH, 'import-data.json')
fs.writeFileSync(outputPath, JSON.stringify(importData, null, 2))

// Update index.json
const indexPath = path.join(SONGS_REPO_PATH, 'index.json')
fs.writeFileSync(indexPath, JSON.stringify({ songs: importData }, null, 2))

console.log(`\n✅ Imported: ${imported}`)
console.log(`⏭  Skipped: ${skipped}`)
console.log(`\nFiles copied to: ${SONGS_REPO_PATH}/songs/`)
console.log(`Import data saved to: ${outputPath}`)
console.log(`\nNext steps:`)
console.log(`  1. cd "${SONGS_REPO_PATH}"`)
console.log(`  2. git add . && git commit -m "Add ${imported} songs" && git push`)
console.log(`  3. node scripts/firestore-upload.js   (to register songs in Firestore)`)
