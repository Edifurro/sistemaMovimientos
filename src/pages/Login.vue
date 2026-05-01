<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Iniciar Sesión</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="login-container">
        <div class="login-card">
          <h1>Sistema de Movimientos</h1>
          <p>Ingrese sus credenciales para continuar.</p>
          
          <ion-item>
            <ion-label position="floating">Correo Electrónico</ion-label>
            <ion-input v-model="formData.email" type="email"></ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="floating">Contraseña</ion-label>
            <ion-input v-model="formData.password" :type="showPassword ? 'text' : 'password'"></ion-input>
            <ion-button slot="end" fill="clear" @click="showPassword = !showPassword" aria-label="Ver contraseña">
              <ion-icon :icon="showPassword ? eyeOff : eye"></ion-icon>
            </ion-button>
          </ion-item>

          <div v-if="localError || error" class="alert alert-danger">{{ localError || error }}</div>

          <ion-button expand="block" @click="handleLogin" :disabled="loading || !isValid">
            <ion-spinner v-if="loading" name="circles"></ion-spinner>
            {{ loading ? 'Iniciando...' : 'Iniciar Sesión' }}
          </ion-button>

          <ion-toast :is-open="showToast" :message="toastMessage" color="danger" duration="2500" @did-dismiss="showToast = false" />
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonSpinner,
  IonIcon
} from '@ionic/vue'
import { eye, eyeOff } from 'ionicons/icons'

const router = useRouter()
const { login, loading, error } = useAuth()

const formData = ref({
  email: '',
  password: ''
})

const localError = ref('')
const toastMessage = ref('')
const showToast = ref(false)
const showPassword = ref(false)

const isValid = computed(() => {
  const email = String(formData.value.email || '').trim()
  const pass = String(formData.value.password || '')
  // validación mínima: email y contraseña al menos 6 caracteres
  return email.length > 3 && pass.length >= 6
})

const handleLogin = async () => {
  localError.value = ''
  if (!isValid.value) {
    localError.value = 'Completa correo y contraseña (mínimo 6 caracteres).'
    toastMessage.value = localError.value
    showToast.value = true
    return
  }

  try {
    await login(formData.value.email, formData.value.password)
    router.push('/dashboard')
  } catch (err) {
    console.error('Error en login:', err)
    // useAuth.error ya muestra mensaje mapeado; además abrir toast
    toastMessage.value = error.value || 'Error iniciando sesión.'
    showToast.value = true
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
  background: linear-gradient(135deg, #2f5b8e 0%, #7eb3d5 58%, #e8e5de 100%);
}

.login-card {
  background: white;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.login-card h1 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.login-card p {
  color: #6b7280;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
}

ion-item {
  margin-bottom: 1rem;
}

.alert {
  padding: 0.75rem;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.alert-danger {
  background-color: #fee2e2;
  color: #7f1d1d;
  border-left: 4px solid #b45757;
}
</style>
