import test from 'node:test'
import assert from 'node:assert/strict'

const storage = {}
globalThis.window = {
  localStorage: {
    getItem(key) {
      return storage[key] ?? null
    },
    setItem(key, value) {
      storage[key] = value
    },
    removeItem(key) {
      delete storage[key]
    }
  }
}

const { setDevtoolsEnabled, getDevtoolsEnabled, resetDevtoolsState } = await import('../src/utils/devtools.js')

test('debe persistir el estado activado y desactivado del inspector', () => {
  resetDevtoolsState()
  assert.equal(getDevtoolsEnabled(), false)

  setDevtoolsEnabled(true)
  assert.equal(getDevtoolsEnabled(), true)
  assert.equal(storage['app-devtools-enabled'], 'true')

  setDevtoolsEnabled(false)
  assert.equal(getDevtoolsEnabled(), false)
  assert.equal(storage['app-devtools-enabled'], 'false')
})
