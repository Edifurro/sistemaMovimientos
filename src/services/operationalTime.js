import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

const TIME_ZONE = 'America/Cancun'
const getServerOperationalContext = httpsCallable(functions, 'obtenerContextoOperativo')

const formatDateInTimeZone = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const get = (type) => parts.find((part) => part.type === type)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

export const getOperationalContext = async () => {
  try {
    const response = await getServerOperationalContext()
    const data = response?.data || {}
    if (data.fechaOperativa && data.nowIso) {
      return {
        fechaOperativa: data.fechaOperativa,
        nowIso: data.nowIso,
        timeZone: data.timeZone || TIME_ZONE,
        source: 'server'
      }
    }
  } catch (error) {
    console.warn('No se pudo obtener la hora del servidor; se usará America/Cancun localmente.', error)
  }

  const now = new Date()
  return {
    fechaOperativa: formatDateInTimeZone(now),
    nowIso: now.toISOString(),
    timeZone: TIME_ZONE,
    source: 'fallback'
  }
}

export const formatOperationalDate = (date = new Date()) => formatDateInTimeZone(date)

