import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteField
} from 'firebase/firestore'

const parseArgs = () => {
  const args = process.argv.slice(2)
  const parsed = {}
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--email') parsed.email = args[i + 1]
    if (args[i] === '--password') parsed.password = args[i + 1]
  }
  return parsed
}

const readEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  const content = fs.readFileSync(filePath, 'utf8')
  const env = {}

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    env[key] = value
  }

  return env
}

const getFirebaseConfig = () => {
  const cwd = process.cwd()
  const envPath = path.join(cwd, '.env.local')
  const env = readEnvFile(envPath)

  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID
  }

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(`Faltan variables Firebase en .env.local: ${missing.join(', ')}`)
  }

  return config
}

const hasLegacyPasswordField = (data) => {
  return Object.prototype.hasOwnProperty.call(data, 'password')
    || Object.prototype.hasOwnProperty.call(data, 'contrasena')
    || Object.prototype.hasOwnProperty.call(data, 'contraseña')
}

const run = async () => {
  const { email, password } = parseArgs()

  if (!email || !password) {
    throw new Error('Uso: npm run cleanup:user-password-fields -- --email tu@email.com --password tu_clave')
  }

  const firebaseConfig = getFirebaseConfig()
  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)

  await signInWithEmailAndPassword(auth, String(email).trim().toLowerCase(), String(password))

  const usuariosRef = collection(db, 'usuarios')
  const snapshot = await getDocs(usuariosRef)

  let updatedCount = 0

  for (const userDoc of snapshot.docs) {
    const data = userDoc.data()
    if (!hasLegacyPasswordField(data)) {
      continue
    }

    await updateDoc(doc(db, 'usuarios', userDoc.id), {
      password: deleteField(),
      contrasena: deleteField(),
      'contraseña': deleteField()
    })

    updatedCount += 1
    console.log(`Limpiado: ${userDoc.id}`)
  }

  console.log(`Migracion completada. Documentos actualizados: ${updatedCount}`)
}

run().catch((err) => {
  console.error('Error en migracion:', err.message || err)
  process.exitCode = 1
})
