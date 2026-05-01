<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button class="modules-trigger" @click="openModulesMenu">
            <ion-icon slot="start" :icon="apps"></ion-icon>
            <span class="modules-label">Modulos</span>
          </ion-button>
        </ion-buttons>
        <ion-title class="dashboard-title">Panel de Control</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="handleLogout">
            <ion-icon slot="icon-only" :icon="logOut"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-popover
      :is-open="isModulesMenuOpen"
      side="bottom"
      alignment="end"
      @didDismiss="isModulesMenuOpen = false"
    >
      <ion-content>
        <ion-list lines="none">
          <ion-item button @click="navigateTo('/productos')">
            <ion-icon slot="start" :icon="cube"></ion-icon>
            <ion-label>Productos</ion-label>
          </ion-item>
          <ion-item button @click="navigateTo('/colaboradores')">
            <ion-icon slot="start" :icon="people"></ion-icon>
            <ion-label>Colaboradores</ion-label>
          </ion-item>
          <ion-item button @click="navigateTo('/prestamos')">
            <ion-icon slot="start" :icon="swapHorizontal"></ion-icon>
            <ion-label>Préstamos</ion-label>
          </ion-item>
          <ion-item button @click="navigateTo('/dashboard')">
            <ion-icon slot="start" :icon="home"></ion-icon>
            <ion-label>Inicio</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-popover>

    <ion-content class="dashboard-content">
      <div class="page-section">
        <div class="welcome-section">
          <h1>Bienvenido, {{ usuario?.nombre }}</h1>
          <p class="subtitle">Sistema de Gestión de Movimientos para el Taller Castillo</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">📦</div>
            <div class="stat-value">{{ productCount }}</div>
            <div class="stat-label">Productos</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-value">{{ colaboradorCount }}</div>
            <div class="stat-label">Colaboradores</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📋</div>
            <div class="stat-value">{{ prestamoCount }}</div>
            <div class="stat-label">Préstamos Activos</div>
          </div>
        </div>

        <div class="insights-grid">
          <div class="insight-card">
            <div class="insight-header">
              <h2>Stock bajo</h2>
              <span class="insight-chip"><= {{ lowStockThreshold }}</span>
            </div>
            <div v-if="lowStockProducts.length" class="insight-list">
              <div v-for="producto in lowStockProducts" :key="producto.id" class="insight-row">
                <div class="insight-main">
                  <span class="insight-title">{{ producto.nombre }}</span>
                  <span class="insight-sub">{{ producto.tipo || 'Sin tipo' }}</span>
                </div>
                <div class="insight-value">{{ producto.stock || 0 }}</div>
              </div>
            </div>
            <p v-else class="insight-empty">Sin productos con stock bajo.</p>
          </div>

          <div class="insight-card">
            <div class="insight-header">
              <h2>Último préstamo</h2>
            </div>
            <div v-if="latestPrestamo" class="insight-latest">
              <p class="insight-title">{{ latestPrestamo.colaboradorNombre || 'Sin colaborador' }}</p>
              <p class="insight-sub">{{ getPrestamoSummary(latestPrestamo) }}</p>
              <p class="insight-date">{{ formatDate(latestPrestamo.createdAt) }}</p>
            </div>
            <p v-else class="insight-empty">Sin préstamos registrados.</p>
          </div>
          <div class="insight-card">
            <div class="insight-header">
              <h2>Movimientos recientes</h2>
            </div>
            <div v-if="movimientosRecientes.length" class="insight-list">
              <div v-for="m in movimientosRecientes" :key="m.id" class="insight-row">
                <div class="insight-main">
                  <span class="insight-title">{{ m.tipo === 'salida' ? 'Salida' : 'Entrada' }} • {{ m.motivo || '' }}</span>
                    <span class="insight-sub">Producto: {{ m.productoNombre || m.productoId }}</span>
                  <span class="insight-sub">Usuario: {{ m.usuarioNombre || m.usuarioId || '—' }}</span>
                </div>
                <div class="insight-value">{{ m.cantidad }}</div>
              </div>
            </div>
            <p v-else class="insight-empty">Sin movimientos recientes.</p>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useProducts } from '../composables/useProducts'
import { useColaboradores } from '../composables/useColaboradores'
import { usePrestamos } from '../composables/usePrestamos'
import { useMovimientos } from '../composables/useMovimientos'
import {
  IonPage,
  IonHeader,
  IonContent,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonPopover,
  IonList,
  IonItem,
  IonLabel
} from '@ionic/vue'
import { home, cube, people, swapHorizontal, logOut, apps } from 'ionicons/icons'

const router = useRouter()
const { logout } = useAuth()
const { getProducts } = useProducts()
const { getColaboradores } = useColaboradores()
const { getPrestamos } = usePrestamos()
const { getMovimientos } = useMovimientos()

const usuario = ref(null)
const productCount = ref(0)
const colaboradorCount = ref(0)
const prestamoCount = ref(0)
const isModulesMenuOpen = ref(false)
const lowStockProducts = ref([])
const latestPrestamo = ref(null)
const movimientosRecientes = ref([])
const lowStockThreshold = 5

onMounted(async () => {
  const userJSON = localStorage.getItem('user')
  if (userJSON) {
    usuario.value = JSON.parse(userJSON)
  }

  try {
    const products = await getProducts()
    productCount.value = products.length
    lowStockProducts.value = products
      .filter(p => Number(p.stock || 0) <= lowStockThreshold)
      .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))
      .slice(0, 6)

    const colaboradores = await getColaboradores()
    colaboradorCount.value = colaboradores.length

    const prestamos = await getPrestamos()
    prestamoCount.value = prestamos.filter(p => p.estado === 'activo').length
    latestPrestamo.value = [...prestamos].sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime()
      const bDate = new Date(b.createdAt || 0).getTime()
      return bDate - aDate
    })[0] || null
    // movimientos recientes
    try {
      movimientosRecientes.value = await getMovimientos({ limit: 6 })
    } catch (mvErr) {
      console.warn('No se pudieron cargar movimientos recientes:', mvErr)
    }
  } catch (error) {
    console.error('Error cargando datos:', error)
  }
})

const openModulesMenu = () => {
  isModulesMenuOpen.value = true
}

const navigateTo = async (path) => {
  isModulesMenuOpen.value = false
  await router.push(path)
}

const handleLogout = async () => {
  await logout()
  router.push('/login')
}

const formatDate = (value) => {
  if (!value) return 'Sin fecha'
  return new Date(value).toLocaleString('es-MX')
}

const getPrestamoSummary = (prestamo) => {
  const totalItems = (prestamo?.detalles || []).length
  return `${totalItems} producto(s)`
}
</script>

<style scoped>
.dashboard-content {
  --padding-start: 0.75rem;
  --padding-end: 0.75rem;
  --padding-top: 0.75rem;
  --padding-bottom: 1rem;
}

.dashboard-title {
  font-size: 1rem;
  font-weight: 600;
}

.modules-trigger {
  --padding-start: 8px;
  --padding-end: 8px;
  --color: #ffffff;
  font-size: 0.9rem;
}

.modules-trigger ion-icon {
  color: #ffffff;
}

.modules-label {
  margin-left: 4px;
}

.page-section {
  padding: 16px;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.welcome-section {
  text-align: center;
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #2f5b8e 0%, #7eb3d5 58%, #e8e5de 100%);
  border-radius: 12px;
  color: #1d3550;
}

.welcome-section h1 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  font-weight: bold;
}

.subtitle {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.insight-card {
  background: #ffffff;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.insight-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.insight-header h2 {
  margin: 0;
  font-size: 1rem;
  color: #1f3555;
}

.insight-chip {
  background: #e8eff7;
  color: #35507a;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 999px;
}

.insight-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.insight-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f7f8fb;
}

.insight-main {
  display: flex;
  flex-direction: column;
}

.insight-title {
  font-weight: 600;
  color: #1f3555;
}

.insight-sub {
  font-size: 0.8rem;
  color: #667085;
}

.insight-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #b45309;
}

.insight-latest {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.insight-date {
  font-size: 0.8rem;
  color: #667085;
}

.insight-empty {
  margin: 0;
  color: #667085;
  font-size: 0.85rem;
}

.stat-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: bold;
  color: #2f5b8e;
  margin: 8px 0;
}

.stat-label {
  font-size: 0.85rem;
  color: #666;
  margin-top: 8px;
}

@media (max-width: 640px) {
  .modules-label {
    display: none;
  }

  .modules-trigger {
    --padding-start: 6px;
    --padding-end: 6px;
  }

  .dashboard-title {
    font-size: 0.95rem;
  }

  .page-section {
    padding: 12px;
  }

  .welcome-section h1 {
    font-size: 1.25rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .insights-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    padding: 12px;
  }

  .stat-value {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .welcome-section {
    padding: 16px;
    margin-bottom: 16px;
  }

  .welcome-section h1 {
    font-size: 1.1rem;
  }

  .subtitle {
    font-size: 0.8rem;
  }

  ion-card {
    margin: 8px 0;
  }
}
</style>
