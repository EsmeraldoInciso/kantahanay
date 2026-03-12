import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCJWyl4boV0ZdSTUj3et-BtDAWIq0EK_x4",
  authDomain: "kantahanay-e3982.firebaseapp.com",
  projectId: "kantahanay-e3982",
  storageBucket: "kantahanay-e3982.firebasestorage.app",
  messagingSenderId: "901151562488",
  appId: "1:901151562488:web:c9128b1897a1a64b76790d",
  measurementId: "G-L137269692",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
export default app
