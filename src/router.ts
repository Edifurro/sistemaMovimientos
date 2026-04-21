import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/setup',
    component: () => import('./pages/Setup.vue')
  },
  {
    path: '/login',
    component: () => import('./pages/Login.vue')
  },
  {
    path: '/dashboard',
    component: () => import('./pages/Dashboard.vue')
  },
  {
    path: '/productos',
    component: () => import('./pages/Productos.vue')
  },
  {
    path: '/colaboradores',
    component: () => import('./pages/Colaboradores.vue')
  },
  {
    path: '/prestamos',
    component: () => import('./pages/Prestamos.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
