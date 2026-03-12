import {
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'

const USERS = 'users'

export async function getOrCreateUser(uid, displayName) {
  const ref = doc(db, USERS, uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return { id: snap.id, ...snap.data() }

  const data = {
    display_name: displayName || 'Anonymous',
    favorites: [],
    recently_played: [],
    created_at: serverTimestamp(),
  }
  await setDoc(ref, data)
  return { id: uid, ...data }
}

export async function toggleFavorite(uid, songId) {
  const ref = doc(db, USERS, uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return false

  const favorites = snap.data().favorites || []
  const isFav = favorites.includes(songId)

  await updateDoc(ref, {
    favorites: isFav ? arrayRemove(songId) : arrayUnion(songId),
  })

  return !isFav
}

export async function addRecentlyPlayed(uid, songId) {
  const ref = doc(db, USERS, uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  let recent = snap.data().recently_played || []
  recent = recent.filter(r => r.song_id !== songId)
  recent.unshift({ song_id: songId, played_at: new Date().toISOString() })
  recent = recent.slice(0, 50)

  await updateDoc(ref, { recently_played: recent })
}

export async function getUserData(uid) {
  const snap = await getDoc(doc(db, USERS, uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
