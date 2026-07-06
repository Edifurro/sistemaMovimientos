import { createRouter, createWebHistory } from 'vue-router'
import Setup from './pages/Setup.vue'
import Login from './pages/Login.vue'
import Dashboard from './pages/Dashboard.vue'
import Productos from './pages/Productos.vue'
import Colaboradores from './pages/Colaboradores.vue'
import Prestamos from './pages/Prestamos.vue'
import InventarioColaboradores from './pages/InventarioColaboradores.vue'
import InventarioBodega from './pages/InventarioBodega.vue'
import ConteoColaborador from './pages/ConteoColaborador.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/setup', component: Setup },
  { path: '/login', component: Login },
  { path: '/dashboard', component: Dashboard },
  { path: '/productos', component: Productos },
  { path: '/colaboradores', component: Colaboradores },
  { path: '/conteo/:id', component: ConteoColaborador },
  { path: '/prestamos', component: Prestamos },
  { path: '/inventario-colaboradores', component: InventarioColaboradores },
  { path: '/inventario-bodega', component: InventarioBodega }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
