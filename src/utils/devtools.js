const STORAGE_KEY = 'app-devtools-enabled'

export function getDevtoolsEnabled() {
  if (typeof window === 'undefined' || !window.localStorage) return false
  const storedValue = window.localStorage.getItem(STORAGE_KEY)
  if (storedValue === null) return false
  return storedValue === 'true'
}

export function setDevtoolsEnabled(value) {
  if (typeof window === 'undefined' || !window.localStorage) return false
  window.localStorage.setItem(STORAGE_KEY, String(value))
  return true
}

export function applyDevtoolsState(app, value = getDevtoolsEnabled()) {
  if (typeof window === 'undefined') return false

  if (app) {
    app.config.devtools = value
  }

  const inspector = window.__VUE_INSPECTOR__
  if (inspector) {
    if (value) {
      inspector.enable?.()
    } else {
      inspector.disable?.()
    }
  }

  const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__
  if (hook) {
    hook.enabled = value
    if (value) {
      hook.Vue = app
    } else if (hook.Vue === app) {
      hook.Vue = undefined
    }
  }

  return true
}

export function toggleDevtoolsEnabled(app = null) {
  const nextValue = !getDevtoolsEnabled()
  setDevtoolsEnabled(nextValue)
  applyDevtoolsState(app, nextValue)
  return nextValue
}

export function resetDevtoolsState() {
  if (typeof window === 'undefined' || !window.localStorage) return false
  window.localStorage.removeItem(STORAGE_KEY)
  return true
}
