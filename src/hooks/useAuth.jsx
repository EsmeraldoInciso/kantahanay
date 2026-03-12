import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../config/firebase'
import { getOrCreateUser } from '../services/userService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const data = await getOrCreateUser(firebaseUser.uid, firebaseUser.displayName)
          setUserData(data)
        } catch (err) {
          console.error('Failed to get user data:', err)
        }
      } else {
        setUserData(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      console.error('Google sign-in error:', err)
      throw err
    }
  }

  const logout = async () => {
    await signOut(auth)
    setUserData(null)
  }

  const refreshUserData = async () => {
    if (user) {
      const data = await getOrCreateUser(user.uid, user.displayName)
      setUserData(data)
    }
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, loginWithGoogle, logout, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
