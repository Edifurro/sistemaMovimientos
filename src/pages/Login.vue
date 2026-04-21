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
            <ion-input v-model="formData.password" type="password"></ion-input>
          </ion-item>

          <div v-if="error" class="alert alert-danger">{{ error }}</div>

          <ion-button expand="block" @click="handleLogin" :disabled="loading">
            <ion-spinner v-if="loading" name="circles"></ion-spinner>
            {{ loading ? 'Iniciando...' : 'Iniciar Sesión' }}
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref } from 'vue'
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
  IonSpinner
} from '@ionic/vue'

const router = useRouter()
const { login, loading, error } = useAuth()

const formData = ref({
  email: '',
  password: ''
})

const handleLogin = async () => {
  if (!formData.value.email || !formData.value.password) {
    alert('Por favor complete todos los campos')
    return
  }

  try {
    await login(formData.value.email, formData.value.password)
    router.push('/dashboard')
  } catch (err) {
    console.error('Error en login:', err)
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
