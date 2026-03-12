#!/usr/bin/env node
/**
 * Kantahanay — Firestore Upload Script
 *
 * Reads import-data.json from the kantahanay-songs repo
 * and uploads each song entry to Firestore.
 * Also removes old songs that are no longer in import-data.json.
 *
 * Usage:
 *   node scripts/firestore-upload.js
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore'
import fs from 'fs'
import path from 'path'

const firebaseConfig = {
  apiKey: "AIzaSyCJWyl4boV0ZdSTUj3et-BtDAWIq0EK_x4",
  authDomain: "kantahanay-e3982.firebaseapp.com",
  projectId: "kantahanay-e3982",
  storageBucket: "kantahanay-e3982.firebasestorage.app",
  messagingSenderId: "901151562488",
  appId: "1:901151562488:web:c9128b1897a1a64b76790d",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const SONGS_REPO_PATH = path.resolve(import.meta.dirname, '../../kantahanay-songs')
const importFile = path.join(SONGS_REPO_PATH, 'import-data.json')

if (!fs.existsSync(importFile)) {
  console.error(`No import-data.json found at: ${importFile}`)
  console.error('Run the import-songs.js script first.')
  process.exit(1)
}

const songs = JSON.parse(fs.readFileSync(importFile, 'utf-8'))
const newUrls = new Set(songs.map(s => s.file_url))

// Step 1: Delete old songs not in the new import data
console.log('\nStep 1: Cleaning up old songs...\n')
const allDocs = await getDocs(collection(db, 'songs'))
let deleted = 0
for (const docSnap of allDocs.docs) {
  const data = docSnap.data()
  if (!newUrls.has(data.file_url)) {
    await deleteDoc(doc(db, 'songs', docSnap.id))
    console.log(`  🗑 Removed: ${data.title || data.file_url}`)
    deleted++
  }
}
console.log(`  Removed ${deleted} old songs`)

// Step 2: Upload new songs
console.log(`\nStep 2: Uploading ${songs.length} songs...\n`)
let added = 0
let skipped = 0

for (const song of songs) {
  try {
    const existing = await getDocs(
      query(collection(db, 'songs'), where('file_url', '==', song.file_url))
    )

    if (!existing.empty) {
      console.log(`  ⏭ Already exists: ${song.title}`)
      skipped++
      continue
    }

    await addDoc(collection(db, 'songs'), {
      ...song,
      added_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    })
    added++
    console.log(`  ✓ ${song.title} — ${song.artist}`)
  } catch (err) {
    console.error(`  ✗ ${song.title}: ${err.message}`)
    skipped++
  }
}

console.log(`\n✅ Added: ${added}`)
console.log(`⏭  Skipped: ${skipped}`)
console.log(`🗑  Deleted: ${deleted}`)
console.log('\nDone! Songs should now appear in your Kantahanay app.')
process.exit(0)
