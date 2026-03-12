#!/usr/bin/env node
/**
 * Kantahanay — Download free MIDI/KAR sample files for testing
 *
 * Downloads a handful of freely available MIDI files
 * so you can test the player and import pipeline.
 *
 * Usage:
 *   node scripts/download-free-midis.js
 *
 * Files are saved to ./downloads/
 */

import fs from 'fs'
import path from 'path'
import https from 'https'

const DOWNLOAD_DIR = path.resolve(import.meta.dirname, '../downloads')

// Free MIDI files from various sources (public domain / free to use)
const SAMPLES = [
  {
    url: 'https://www.midiworld.com/download/4603',
    filename: 'beethoven-fur-elise.mid',
    title: 'Fur Elise',
    artist: 'Beethoven',
  },
  {
    url: 'https://www.midiworld.com/download/4636',
    filename: 'bach-toccata-fugue.mid',
    title: 'Toccata and Fugue in D minor',
    artist: 'Bach',
  },
  {
    url: 'https://www.midiworld.com/download/4618',
    filename: 'chopin-nocturne-op9-no2.mid',
    title: 'Nocturne Op.9 No.2',
    artist: 'Chopin',
  },
  {
    url: 'https://www.midiworld.com/download/4660',
    filename: 'mozart-eine-kleine.mid',
    title: 'Eine Kleine Nachtmusik',
    artist: 'Mozart',
  },
  {
    url: 'https://www.midiworld.com/download/4685',
    filename: 'vivaldi-spring.mid',
    title: 'Spring (Four Seasons)',
    artist: 'Vivaldi',
  },
]

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)
    https.get(url, { headers: { 'User-Agent': 'Kantahanay/1.0' } }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        download(response.headers.location, destPath).then(resolve).catch(reject)
        return
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`))
        return
      }
      response.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', reject)
  })
}

async function main() {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })

  console.log(`\nDownloading ${SAMPLES.length} sample MIDI files...\n`)

  for (const sample of SAMPLES) {
    const destPath = path.join(DOWNLOAD_DIR, sample.filename)
    try {
      await download(sample.url, destPath)
      const size = Math.round(fs.statSync(destPath).size / 1024)
      console.log(`  ✓ ${sample.title} — ${sample.artist} (${size} KB)`)
    } catch (err) {
      console.log(`  ✗ ${sample.filename}: ${err.message}`)
    }
  }

  console.log(`\nFiles saved to: ${DOWNLOAD_DIR}`)
  console.log(`\nNext: run the import script:`)
  console.log(`  node scripts/import-songs.js ./downloads`)
}

main()
