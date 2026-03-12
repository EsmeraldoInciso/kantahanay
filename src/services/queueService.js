import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, setDoc,
} from 'firebase/firestore'
import { db } from '../config/firebase'

const QUEUE = 'queue'
const SESSIONS = 'sessions'

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function createSession(hostUid, hostName) {
  let code = generateRoomCode()
  const existing = await getDocs(
    query(collection(db, SESSIONS), where('code', '==', code), where('active', '==', true))
  )
  if (!existing.empty) code = generateRoomCode()

  const data = {
    code,
    host_uid: hostUid,
    host_name: hostName,
    active: true,
    current_song: null,
    is_playing: false,
    created_at: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, SESSIONS), data)
  return { id: ref.id, ...data }
}

export async function findSession(code) {
  const q = query(
    collection(db, SESSIONS),
    where('code', '==', code.toUpperCase()),
    where('active', '==', true)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

export async function endSession(sessionId) {
  await updateDoc(doc(db, SESSIONS, sessionId), { active: false })
}

export async function updateSessionPlayback(sessionId, updates) {
  await updateDoc(doc(db, SESSIONS, sessionId), updates)
}

export function subscribeSession(sessionId, callback) {
  return onSnapshot(doc(db, SESSIONS, sessionId), snap => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() })
  })
}

export async function addToQueue(sessionId, songId, songTitle, displayName, uid) {
  const q = query(collection(db, QUEUE), where('session_id', '==', sessionId))
  const snap = await getDocs(q)
  const position = snap.size

  const data = {
    session_id: sessionId,
    song_id: songId,
    song_title: songTitle,
    requested_by: uid || null,
    display_name: displayName,
    status: 'waiting',
    position,
    requested_at: serverTimestamp(),
  }
  const ref = await addDoc(collection(db, QUEUE), data)
  return { id: ref.id, ...data }
}

export async function updateQueueItem(itemId, updates) {
  await updateDoc(doc(db, QUEUE, itemId), updates)
}

export async function removeFromQueue(itemId) {
  await deleteDoc(doc(db, QUEUE, itemId))
}

export function subscribeQueue(sessionId, callback) {
  const q = query(
    collection(db, QUEUE),
    where('session_id', '==', sessionId),
    orderBy('position')
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}
