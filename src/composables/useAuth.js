import { ref, computed } from 'vue'
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth'
import { auth, db } from '../services/firebase'
import { doc, getDoc, setDoc, query, collection, getDocs, limit, where } from 'firebase/firestore'

const currentUser = ref(null)
const usuario = ref(null)
const loading = ref(false)
const error = ref(null)

const sanitizeUsuarioData = (data = {}) => {
  const cleaned = { ...data }
  delete cleaned.password
  delete cleaned.contrasena
  delete cleaned['contraseña']
  return cleaned
}

const mapAuthErrorMessage = (err) => {
  const code = err?.code || ''
  const rawMessage = String(err?.message || '')

  if (code === 'auth/invalid-credential' || rawMessage.includes('INVALID_LOGIN_CREDENTIALS')) {
    return 'Correo o contraseña incorrectos. Verifica que no haya espacios extras y vuelve a intentar.'
  }
  if (code === 'auth/invalid-email') {
    return 'El correo electronico no tiene un formato valido.'
  }
  if (code === 'auth/user-disabled') {
    return 'Este usuario fue deshabilitado en Firebase Authentication.'
  }
  if (code === 'auth/too-many-requests') {
    return 'Demasiados intentos. Espera un momento e intenta de nuevo.'
  }
  if (code === 'auth/network-request-failed') {
    return 'Error de red. Revisa tu conexion a internet e intenta de nuevo.'
  }

  return err?.message || 'No fue posible autenticar al usuario.'
}

const isInvalidCredentialError = (err) => {
  const code = err?.code || ''
  const rawMessage = String(err?.message || '')
  return code === 'auth/invalid-credential' || rawMessage.includes('INVALID_LOGIN_CREDENTIALS')
}

const normalizeRole = (role) => {
  return String(role || '').trim().toLowerCase()
}

export function useAuth() {
  const isAuthenticated = computed(() => !!currentUser.value)
  const setupCacheKey = 'setupCompleted'

  const ensureUserProfile = async (user) => {
    const userRef = doc(db, 'usuarios', user.uid)
    const snapshot = await getDoc(userRef)

    if (!snapshot.exists()) {
      const fallbackNombre = String(user.displayName || '').trim() || String(user.email || '').split('@')[0] || 'Administrador'
      const fallbackEmail = String(user.email || '').trim().toLowerCase()

      await setDoc(userRef, {
        uid: user.uid,
        email: fallbackEmail,
        nombre: fallbackNombre,
        rol: 'admin',
        activo: true,
        createdAt: new Date().toISOString()
      })

      return {
        uid: user.uid,
        email: fallbackEmail,
        nombre: fallbackNombre,
        rol: 'admin',
        activo: true
      }
    }

    const data = sanitizeUsuarioData(snapshot.data())
    const normalized = {
      ...data,
      uid: data.uid || user.uid,
      email: String(data.email || user.email || '').trim().toLowerCase(),
      rol: normalizeRole(data.rol) || 'admin',
      activo: data.activo !== false
    }

    const needsPatch = !data.uid || !data.email || normalizeRole(data.rol) !== normalized.rol || data.activo !== normalized.activo

    if (needsPatch) {
      await setDoc(userRef, normalized, { merge: true })
    }

    return { uid: user.uid, ...normalized }
  }

  const checkSetupCompleted = async () => {
    const cached = localStorage.getItem(setupCacheKey)
    if (cached === 'true') {
      return true
    }

    try {
      const usuariosRef = collection(db, 'usuarios')
      const q = query(usuariosRef, limit(1))
      const snapshot = await getDocs(q)
      const completed = !snapshot.empty
      if (completed) {
        localStorage.setItem(setupCacheKey, 'true')
      }
      return completed
    } catch (err) {
      console.error('Error checking setup:', err)
      // Si Firestore niega lectura por reglas, priorizamos login para evitar loops a /setup.
      return true
    }
  }

  const createFirstUser = async (email, password, nombre, rol = 'admin') => {
    loading.value = true
    error.value = null
    try {
      const normalizedEmail = String(email || '').trim().toLowerCase()

      // Crear usuario en Firebase Auth
      const { user } = await createUserWithEmailAndPassword(auth, normalizedEmail, password)
      
      // Crear documento en Firestore
      await setDoc(doc(db, 'usuarios', user.uid), {
        uid: user.uid,
        email: normalizedEmail,
        nombre,
        rol,
        createdAt: new Date().toISOString(),
        activo: true
      })

      localStorage.setItem(setupCacheKey, 'true')
      
      return user
    } catch (err) {
      error.value = mapAuthErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const login = async (email, password) => {
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const normalizedPassword = String(password || '')

    loading.value = true
    error.value = null
    try {
      const { user } = await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword)

      usuario.value = await ensureUserProfile(user)

      localStorage.setItem(setupCacheKey, 'true')
      
      return user
    } catch (err) {
      if (isInvalidCredentialError(err)) {
        try {
          const q = query(
            collection(db, 'usuarios'),
            where('email', '==', normalizedEmail),
            limit(1)
          )
          const snapshot = await getDocs(q)

          if (!snapshot.empty) {
            error.value = 'El correo existe en Firestore, pero el acceso se valida con Firebase Authentication. Crea o restablece este usuario en Authentication con ese mismo correo.'
            throw err
          }
        } catch (lookupErr) {
          if (lookupErr === err) {
            throw err
          }
          console.error('Error validando usuario en Firestore:', lookupErr)
        }
      }

      error.value = mapAuthErrorMessage(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      await firebaseSignOut(auth)
      usuario.value = null
      currentUser.value = null
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const initAuthListener = (callback) => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser.value = user
        try {
          usuario.value = await ensureUserProfile(user)
        } catch (err) {
          console.error('Error sincronizando perfil de usuario:', err)
          usuario.value = null
        }
      } else {
        currentUser.value = null
        usuario.value = null
      }
      callback?.(user)
    })
  }

  return {
    currentUser,
    usuario,
    isAuthenticated,
    loading,
    error,
    checkSetupCompleted,
    createFirstUser,
    login,
    logout,
    initAuthListener
  }
}
