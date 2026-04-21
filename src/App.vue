<template>
  <ion-app>
    <router-view />
  </ion-app>
</template>

<script setup>
import { IonApp } from '@ionic/vue'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'

const router = useRouter()
const { initAuthListener, checkSetupCompleted } = useAuth()
const setupCompleted = ref(null)

onMounted(async () => {
  try {
    initAuthListener(async (user) => {
      try {
        if (setupCompleted.value === null) {
          setupCompleted.value = await checkSetupCompleted()
        }
        
        const path = router.currentRoute.value.path
        if (!user) {
          const target = setupCompleted.value ? '/login' : '/setup'
          if (path !== target) await router.push(target)
        } else if (path === '/setup' || path === '/login') {
          await router.push('/dashboard')
        }
      } catch (err) {
        console.error('Auth error:', err)
      }
    })
  } catch (err) {
    console.error('App error:', err)
  }
})
</script>

<style scoped>
</style>
