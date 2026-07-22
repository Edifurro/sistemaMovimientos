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
import { useProducts } from './composables/useProducts'

const router = useRouter()
const { initAuthListener, checkSetupCompleted } = useAuth()
const { startProductsListener, stopProductsListener } = useProducts()
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
          stopProductsListener()
          const target = setupCompleted.value ? '/login' : '/setup'
          if (path !== target) await router.push(target)
        } else {
          await startProductsListener()
          if (path === '/setup' || path === '/login') {
            await router.push('/dashboard')
          }
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
