import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'

const PLAYLISTS = 'playlists'

export async function getUserPlaylists(uid) {
  const q = query(
    collection(db, PLAYLISTS),
    where('owner_uid', '==', uid),
    orderBy('created_at', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getPublicPlaylists() {
  const q = query(
    collection(db, PLAYLISTS),
    where('is_public', '==', true),
    orderBy('created_at', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getPlaylist(id) {
  const snap = await getDoc(doc(db, PLAYLISTS, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function createPlaylist(uid, name, isPublic = false) {
  const data = {
    owner_uid: uid,
    name,
    songs: [],
    is_public: isPublic,
    created_at: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, PLAYLISTS), data)
  return { id: ref.id, ...data }
}

export async function addSongToPlaylist(playlistId, songId) {
  const ref = doc(db, PLAYLISTS, playlistId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const songs = snap.data().songs || []
  if (!songs.includes(songId)) {
    await updateDoc(ref, { songs: [...songs, songId] })
  }
}

export async function removeSongFromPlaylist(playlistId, songId) {
  const ref = doc(db, PLAYLISTS, playlistId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const songs = (snap.data().songs || []).filter(s => s !== songId)
  await updateDoc(ref, { songs })
}

export async function deletePlaylist(id) {
  await deleteDoc(doc(db, PLAYLISTS, id))
}
