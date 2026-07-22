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
  if (!fs.existsSync(filePath)) return {}

  const env = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) continue
    env[trimmed.slice(0, separatorIndex).trim()] = trimmed.slice(separatorIndex + 1).trim()
  }
  return env
}

const getFirebaseConfig = () => {
  const env = readEnvFile(path.join(process.cwd(), '.env.local'))
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

  if (missing.length) {
    throw new Error(`Faltan variables Firebase en .env.local: ${missing.join(', ')}`)
  }

  return config
}

const run = async () => {
  const { email, password } = parseArgs()
  if (!email || !password) {
    throw new Error('Uso: npm run cleanup:genera-adeudo -- --email tu@email.com --password tu_clave')
  }

  const app = initializeApp(getFirebaseConfig())
  const auth = getAuth(app)
  const db = getFirestore(app)

  await signInWithEmailAndPassword(auth, String(email).trim().toLowerCase(), password)

  const snapshot = await getDocs(collection(db, 'productos_nuevos'))
  let updatedCount = 0

  for (const productSnapshot of snapshot.docs) {
    if (!Object.prototype.hasOwnProperty.call(productSnapshot.data(), 'generaAdeudo')) continue

    await updateDoc(doc(db, 'productos_nuevos', productSnapshot.id), {
      generaAdeudo: deleteField()
    })
    updatedCount += 1
    console.log(`Campo eliminado: ${productSnapshot.id}`)
  }

  console.log(`Migracion completada. Productos actualizados: ${updatedCount}`)
}

run().catch((error) => {
  console.error('Error en migracion:', error.message || error)
  process.exitCode = 1
})
