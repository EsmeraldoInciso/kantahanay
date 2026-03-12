import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, increment, serverTimestamp,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '../config/firebase'

const SONGS = 'songs'

export async function getSongs({ genre, language, search, sortBy = 'title', pageSize = 50, lastDoc = null } = {}) {
  const constraints = []

  if (genre) constraints.push(where('genre', '==', genre))
  if (language) constraints.push(where('language', '==', language))

  constraints.push(orderBy(sortBy))
  constraints.push(limit(pageSize))

  if (lastDoc) constraints.push(startAfter(lastDoc))

  const q = query(collection(db, SONGS), ...constraints)
  const snap = await getDocs(q)

  return {
    songs: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
  }
}

export async function getAllSongs() {
  const snap = await getDocs(collection(db, SONGS))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getSong(id) {
  const snap = await getDoc(doc(db, SONGS, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function addSong(song) {
  const data = {
    ...song,
    play_count: 0,
    added_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, SONGS), data)
  return ref.id
}

export async function updateSong(id, updates) {
  await updateDoc(doc(db, SONGS, id), { ...updates, updated_at: serverTimestamp() })
}

export async function deleteSong(id) {
  await deleteDoc(doc(db, SONGS, id))
}

export async function incrementPlayCount(id) {
  await updateDoc(doc(db, SONGS, id), { play_count: increment(1) })
}

export function subscribeSongs(callback) {
  const q = query(collection(db, SONGS), orderBy('title'))
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}
