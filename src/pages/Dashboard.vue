<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button class="modules-trigger" @click="openModulesMenu">
            <ion-icon slot="start" :icon="apps"></ion-icon> 
          </ion-button>
        </ion-buttons>
        <ion-title class="dashboard-title">Panel de préstamos</ion-title>
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
          <ion-item button @click="navigateTo('/inventario-colaboradores')">
            <ion-icon slot="start" :icon="clipboardOutline"></ion-icon>
            <ion-label>Inventario de colaboradores</ion-label>
          </ion-item>
          <ion-item button @click="navigateTo('/inventario-bodega')">
            <ion-icon slot="start" :icon="cube"></ion-icon>
            <ion-label>Inventario Bodega</ion-label>
          </ion-item>
          <ion-item button @click="navigateTo('/dashboard')">
            <ion-icon slot="start" :icon="home"></ion-icon>
            <ion-label>Inicio</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-popover>

    <ion-content class="dashboard-content">
      <main class="page-shell">
        <section class="hero-card">
          <div class="hero-copy">
            <span class="eyebrow">Dashboard operativo</span>
            <h1>Información clave de préstamos</h1>
            <p>
              Revisa consumo, adeudos, pendientes y trabajos con mayor movimiento sin cargar todo el historial.
            </p>
          </div>

          <div class="hero-actions">
            <ion-button class="hero-button" :disabled="loading" @click="loadDashboardData">
              <ion-icon slot="start" :icon="refreshOutline"></ion-icon>
              Actualizar
            </ion-button>
            <span v-if="lastLoadedAt" class="last-update">Actualizado: {{ formatTime(lastLoadedAt) }}</span>
          </div>
        </section>

        <section class="filters-card">
          <div class="section-heading">
            <div>
              <h2>Filtros</h2>
              <p>{{ rangeLabel }}</p>
            </div>
            <button class="text-action" type="button" @click="resetFilters">Limpiar</button>
          </div>

          <ion-segment :value="rangePreset" class="range-segment" @ionChange="handleRangeChange">
            <ion-segment-button value="today">
              <ion-label>Hoy</ion-label>
            </ion-segment-button>
            <ion-segment-button value="week">
              <ion-label>Semana</ion-label>
            </ion-segment-button>
            <ion-segment-button value="month">
              <ion-label>Mes</ion-label>
            </ion-segment-button>
            <ion-segment-button value="30d">
              <ion-label>30 días</ion-label>
            </ion-segment-button>
            <ion-segment-button value="custom">
              <ion-label>Rango</ion-label>
            </ion-segment-button>
          </ion-segment>

          <div v-if="rangePreset === 'custom'" class="custom-range-grid">
            <label class="field-block">
              <span>Desde</span>
              <ion-input v-model="dateStart" class="dashboard-field" type="date" :legacy="true"></ion-input>
            </label>
            <label class="field-block">
              <span>Hasta</span>
              <ion-input v-model="dateEnd" class="dashboard-field" type="date" :legacy="true"></ion-input>
            </label>
            <ion-button class="apply-button" :disabled="loading" @click="loadDashboardData">Cargar rango</ion-button>
          </div>

          <div class="filter-grid">
            <label class="field-block field-wide">
              <span>Búsqueda general</span>
              <ion-input
                v-model="searchTerm"
                class="dashboard-field"
                type="text"
                placeholder="Empresa, unidad, trabajo, colaborador o producto"
                :legacy="true"
              ></ion-input>
            </label>

            <label class="field-block">
              <span>Empresa</span>
              <ion-select v-model="empresaFilter" class="dashboard-field" interface="popover" placeholder="Todas" :legacy="true">
                <ion-select-option value="">Todas</ion-select-option>
                <ion-select-option v-for="empresa in empresaOptions" :key="empresa" :value="empresa">
                  {{ empresa }}
                </ion-select-option>
              </ion-select>
            </label>

            <label class="field-block">
              <span>Unidad</span>
              <ion-select v-model="unidadFilter" class="dashboard-field" interface="popover" placeholder="Todas" :legacy="true">
                <ion-select-option value="">Todas</ion-select-option>
                <ion-select-option v-for="unidad in unidadOptions" :key="unidad" :value="unidad">
                  {{ unidad }}
                </ion-select-option>
              </ion-select>
            </label>
          </div>
        </section>

        <section v-if="loading" class="state-card">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Cargando información del periodo...</p>
        </section>

        <section v-else-if="loadError" class="state-card error-state">
          <ion-icon :icon="warningOutline"></ion-icon>
          <div>
            <h2>No se pudo cargar el dashboard</h2>
            <p>{{ loadError }}</p>
          </div>
        </section>

        <template v-else>
          <section class="summary-grid">
            <article class="summary-card summary-consumed">
              <span class="summary-label">Consumido</span>
              <strong>{{ formatNumber(dashboard.resumen.consumidoTotal) }}</strong>
              <small>Material usado en trabajos</small>
            </article>
            <article class="summary-card summary-debt">
              <span class="summary-label">Adeudado</span>
              <strong>{{ formatNumber(dashboard.resumen.adeudoTotal) }}</strong>
              <small>Pendiente de justificar o reponer</small>
            </article>
            <article class="summary-card summary-pending">
              <span class="summary-label">Pendiente</span>
              <strong>{{ formatNumber(dashboard.resumen.pendienteTotal) }}</strong>
              <small>Productos aún abiertos</small>
            </article>
            <article class="summary-card summary-work">
              <span class="summary-label">Trabajos</span>
              <strong>{{ formatNumber(dashboard.resumen.trabajosTotal) }}</strong>
              <small>{{ formatNumber(filteredPrestamos.length) }} préstamo(s) filtrados</small>
            </article>
          </section>

          <section v-if="!filteredPrestamos.length" class="state-card empty-state">
            <ion-icon :icon="analyticsOutline"></ion-icon>
            <div>
              <h2>Sin datos para mostrar</h2>
              <p>Prueba con otro rango de fechas, empresa, unidad o búsqueda.</p>
            </div>
          </section>

          <template v-else>
            <section class="chart-mode-card">
              <div class="section-heading compact-heading">
                <div>
                  <h2>Explorar gráficas</h2>
                  <p>Toca una barra para ver detalle, filtrar el dashboard o abrir préstamos.</p>
                </div>
              </div>
              <ion-segment :value="chartMetric" class="metric-segment" @ionChange="handleMetricChange">
                <ion-segment-button value="consumido"><ion-label>Consumido</ion-label></ion-segment-button>
                <ion-segment-button value="adeudo"><ion-label>Adeudo</ion-label></ion-segment-button>
                <ion-segment-button value="pendiente"><ion-label>Pendiente</ion-label></ion-segment-button>
                <ion-segment-button value="total"><ion-label>Total</ion-label></ion-segment-button>
              </ion-segment>
            </section>

            <section class="dashboard-graphs-grid">
              <article class="chart-card material-card">
                <div class="card-heading">
                  <div>
                    <span class="eyebrow">Estado del material</span>
                    <h2>Consumido, devuelto, adeudado y pendiente</h2>
                    <p>Resumen visual del material movido en el periodo.</p>
                  </div>
                  <div class="mini-badge">{{ formatNumber(dashboard.resumen.materialTotal) }} total</div>
                </div>

                <div class="material-layout">
                  <div class="donut-wrap">
                    <div class="status-donut" :style="estadoDonutStyle">
                      <span>{{ dashboard.resumen.materialTotal ? '100%' : '0%' }}</span>
                    </div>
                  </div>

                  <div class="bar-list status-bars">
                    <div v-for="item in dashboard.estadoMaterial" :key="item.key" class="bar-row status-row">
                      <div class="bar-meta">
                        <span>{{ item.label }}</span>
                        <strong>{{ formatNumber(item.value) }}</strong>
                      </div>
                      <div class="bar-track">
                        <div class="bar-fill" :class="`bar-${item.key}`" :style="{ width: getBarWidth(item.value, dashboard.maxEstadoMaterial) }"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

              <article class="chart-card product-bars-card">
                <div class="card-heading product-card-heading">
                  <div>
                    <span class="eyebrow">Productos</span>
                    <h2>Consumido vs adeudo por producto</h2>
                    <p>Observa cada suministro con dos tramos: lo consumido y lo que quedó adeudado.</p>
                  </div>
                  <ion-icon :icon="cubeOutline"></ion-icon>
                </div>

                <div v-if="productPieItems.length" class="product-pie">
                  <div class="product-pie-chart-wrap">
                    <div class="product-pie-donut" :style="productPieStyle" aria-label="Gráfica de pastel de productos">
                      <div class="product-pie-hole">
                        <strong>{{ formatNumber(productPieTotal) }}</strong>
                        <span>total</span>
                      </div>
                    </div>

                    <div class="product-pie-legend">
                      <button
                        v-for="(item, index) in productPieItems"
                        :key="`product-pie-${item.key || item.label}`"
                        class="product-pie-legend-item"
                        type="button"
                        @click="openInsightDetail('producto', item)"
                      >
                        <span class="product-pie-color" :style="{ background: getProductPieColor(index) }"></span>
                        <div class="product-pie-copy">
                          <strong>{{ item.label }}</strong>
                          <small>
                            {{ formatNumber((item.consumido || 0) + (item.adeudo || 0)) }} total ·
                            Cons {{ formatNumber(item.consumido || 0) }} · Ade {{ formatNumber(item.adeudo || 0) }}
                          </small>
                        </div>
                        <em>{{ getProductPieShare(item) }}</em>
                      </button>
                    </div>
                  </div>
                </div>

                <p v-else class="empty-text">No hay productos con movimiento en este periodo.</p>
              </article>

              <article v-for="chart in chartSections" :key="chart.key" class="chart-card graph-card">
                <div class="card-heading chart-heading">
                  <div>
                    <span class="eyebrow">{{ chart.eyebrow }}</span>
                    <h2>{{ chart.title }}</h2>
                    <p>{{ chart.description }}</p>
                  </div>
                  <ion-icon :icon="chart.icon"></ion-icon>
                </div>

                <div v-if="getVisibleChartItems(chart.items, chart.metric).length" class="insight-card-grid">
                  <button
                    v-for="(item, index) in getVisibleChartItems(chart.items, chart.metric)"
                    :key="`${chart.key}-${item.key || item.label}`"
                    class="insight-chart-card"
                    type="button"
                    @click="openInsightDetail(chart.type, item)"
                  >
                    <div class="insight-card-top">
                      <span class="insight-rank">#{{ index + 1 }}</span>
                      <div class="insight-card-copy">
                        <strong>{{ item.label }}</strong>
                        <small>{{ getChartSubLabel(item) }}</small>
                      </div>
                      <div class="insight-card-value">
                        <strong>{{ formatNumber(getMetricValue(item, chart.metric)) }}</strong>
                        <small>{{ getMetricLabel(chart.metric) }}</small>
                      </div>
                    </div>

                    <div class="mini-bar-chart" aria-label="Gráfica de barras">
                      <div
                        v-for="metricRow in chartLegend"
                        :key="`${chart.key}-${item.key}-${metricRow.key}`"
                        class="mini-bar-line"
                        :class="{ 'mini-bar-line--active': chart.metric === metricRow.key || chart.metric === 'total' }"
                      >
                        <span>{{ metricRow.label }}</span>
                        <div class="mini-bar-track">
                          <i
                            class="mini-bar-fill"
                            :class="`mini-bar-fill--${metricRow.key}`"
                            :style="{ width: getCardMetricWidth(item, chart.items, metricRow.key) }"
                          ></i>
                        </div>
                        <strong>{{ formatNumber(item[metricRow.key]) }}</strong>
                      </div>
                    </div>

                    <div class="insight-card-footer">
                      <span>{{ formatNumber(item.prestamosTotal || 0) }} préstamo(s)</span>
                      <em>Ver detalle</em>
                    </div>
                  </button>
                </div>

                <p v-else class="empty-text">{{ chart.emptyText }}</p>
              </article>
            </section>

            <section class="alerts-card">
              <div class="card-heading">
                <div>
                  <span class="eyebrow">Alertas</span>
                  <h2>Trabajos con adeudo o material pendiente</h2>
                </div>
                <span class="mini-badge warning">{{ dashboard.trabajosConAlerta.length }} alerta(s)</span>
              </div>

              <div v-if="dashboard.trabajosConAlerta.length" class="alert-list">
                <button
                  v-for="item in dashboard.trabajosConAlerta"
                  :key="item.key"
                  class="alert-row clickable-row"
                  type="button"
                  @click="openInsightDetail('trabajo', item)"
                >
                  <div class="alert-main">
                    <strong>{{ item.label }}</strong>
                    <span>{{ item.subLabel }}</span>
                  </div>
                  <div class="alert-values">
                    <span>Adeudo {{ formatNumber(item.adeudo) }}</span>
                    <span>Pendiente {{ formatNumber(item.pendiente) }}</span>
                  </div>
                </button>
              </div>

              <p v-else class="empty-text">No hay trabajos con alertas en este filtro.</p>
            </section>
          </template>
        </template>
      </main>
    </ion-content>

    <ion-modal :is-open="isInsightModalOpen" css-class="dashboard-detail-modal" @did-dismiss="closeInsightModal">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>{{ selectedInsightTitle }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeInsightModal">Cerrar</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="detail-modal-content">
        <div v-if="selectedInsight" class="detail-modal-body">
          <section class="detail-hero">
            <div>
              <span class="eyebrow">{{ selectedInsightKindLabel }}</span>
              <h2>{{ selectedInsight.label }}</h2>
              <p>{{ selectedInsight.subLabel || rangeLabel }}</p>
            </div>
            <span class="mini-badge">{{ chartMetricLabel }}</span>
          </section>

          <section class="detail-metrics-grid">
            <article class="detail-metric consumed">
              <span>Consumido</span>
              <strong>{{ formatNumber(selectedInsightDetail.resumen.consumido) }}</strong>
            </article>
            <article class="detail-metric debt">
              <span>Adeudado</span>
              <strong>{{ formatNumber(selectedInsightDetail.resumen.adeudo) }}</strong>
            </article>
            <article class="detail-metric pending">
              <span>Pendiente</span>
              <strong>{{ formatNumber(selectedInsightDetail.resumen.pendiente) }}</strong>
            </article>
            <article class="detail-metric returned">
              <span>Devuelto</span>
              <strong>{{ formatNumber(selectedInsightDetail.resumen.devuelto) }}</strong>
            </article>
          </section>

          <section class="detail-section">
            <div class="section-heading compact-heading">
              <div>
                <h2>Desglose visual</h2>
                <p>Gráfica de barras del elemento seleccionado.</p>
              </div>
            </div>
            <div class="mini-bar-chart mini-bar-chart--detail">
              <div v-for="metricRow in chartLegend" :key="`detail-${metricRow.key}`" class="mini-bar-line mini-bar-line--active">
                <span>{{ metricRow.label }}</span>
                <div class="mini-bar-track">
                  <i
                    class="mini-bar-fill"
                    :class="`mini-bar-fill--${metricRow.key}`"
                    :style="{ width: getDetailMetricWidth(metricRow.key) }"
                  ></i>
                </div>
                <strong>{{ formatNumber(selectedInsightDetail.resumen[metricRow.key]) }}</strong>
              </div>
            </div>
          </section>

          <section class="detail-section" v-if="selectedInsightDetail.productos.length">
            <div class="section-heading compact-heading">
              <div>
                <h2>Productos relacionados</h2>
                <p v-if="selectedInsight.type === 'trabajo'">Productos consumidos por este trabajo.</p>
                <p v-else>Productos con movimiento dentro de este filtro.</p>
              </div>
            </div>
            <div v-if="getVisibleChartItems(selectedInsightDetail.productos, 'consumido', DETAIL_LIMIT).length" class="insight-card-grid insight-card-grid--detail">
              <button
                v-for="(item, index) in getVisibleChartItems(selectedInsightDetail.productos, 'consumido', DETAIL_LIMIT)"
                :key="`detail-product-${item.key || item.label}`"
                class="insight-chart-card insight-chart-card--compact"
                type="button"
                @click="openInsightDetail('producto', item)"
              >
                <div class="insight-card-top">
                  <span class="insight-rank">#{{ index + 1 }}</span>
                  <div class="insight-card-copy">
                    <strong>{{ item.label }}</strong>
                    <small>{{ item.subLabel || 'Producto' }}</small>
                  </div>
                  <div class="insight-card-value">
                    <strong>{{ formatNumber(item.consumido) }}</strong>
                    <small>Consumido</small>
                  </div>
                </div>
                <div class="mini-bar-chart" aria-label="Gráfica de consumo del producto">
                  <div class="mini-bar-line mini-bar-line--active">
                    <span>Consumido</span>
                    <div class="mini-bar-track">
                      <i class="mini-bar-fill mini-bar-fill--consumido" :style="{ width: getCardMetricWidth(item, selectedInsightDetail.productos, 'consumido') }"></i>
                    </div>
                    <strong>{{ formatNumber(item.consumido) }}</strong>
                  </div>
                </div>
              </button>
            </div>
            <p v-else class="empty-text">Sin productos relacionados.</p>
          </section>

          <section class="detail-section" v-if="selectedInsightDetail.adeudos.length">
            <div class="section-heading compact-heading">
              <div>
                <h2>Adeudos del periodo</h2>
                <p>Material pendiente asociado a este elemento.</p>
              </div>
            </div>

            <div class="mini-list">
              <article v-for="row in selectedInsightDetail.adeudos" :key="row.key" class="mini-row">
                <div>
                  <strong>{{ row.producto }}</strong>
                  <span>{{ row.trabajo }} · {{ row.colaborador }}</span>
                </div>
                <em>{{ formatNumber(row.adeudo) }}</em>
              </article>
            </div>
          </section>

          <section class="detail-section" v-if="selectedInsightDetail.prestamos.length">
            <div class="section-heading compact-heading">
              <div>
                <h2>Préstamos relacionados</h2>
                <p>{{ selectedInsightDetail.prestamos.length }} registro(s) encontrados en el rango actual.</p>
              </div>
            </div>

            <div class="mini-list">
              <article v-for="prestamo in selectedInsightDetail.prestamos" :key="prestamo.id" class="mini-row loan-row">
                <div>
                  <strong>{{ cleanLabel(prestamo.descripcionTrabajo || prestamo.trabajoDescripcion, 'Sin descripción') }}</strong>
                  <span>
                    {{ cleanLabel(prestamo.empresaTrabajo || prestamo.empresa, 'Sin empresa') }} ·
                    {{ cleanLabel(prestamo.unidadTrabajo || prestamo.unidad || prestamo.placas, 'Sin unidad') }} ·
                    {{ cleanLabel(prestamo.colaboradorNombre || prestamo.colaborador, 'Sin colaborador') }}
                  </span>
                </div>
                <em>{{ getPrestamoFechaOperativa(prestamo) || 'Sin fecha' }}</em>
              </article>
            </div>
          </section>
        </div>
      </ion-content>

      <ion-footer>
        <div class="modal-footer-actions">
          <ion-button fill="outline" color="primary" @click="filterDashboardByInsight">
            Filtrar dashboard
          </ion-button>
          <ion-button color="primary" @click="openPrestamosWithInsight">
            Abrir en préstamos
          </ion-button>
        </div>
      </ion-footer>
    </ion-modal>
  </ion-page>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { db } from '../services/firebase'
import { collection, getDocs, query, where, orderBy, limit as limitQuery } from 'firebase/firestore'
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
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonModal,
  IonFooter
} from '@ionic/vue'
import {
  home,
  cube,
  people,
  swapHorizontal,
  logOut,
  apps,
  clipboardOutline,
  refreshOutline,
  warningOutline,
  analyticsOutline,
  businessOutline,
  medalOutline,
  cubeOutline,
  carSportOutline,
  briefcaseOutline
} from 'ionicons/icons'

const PRESTAMOS_COLLECTION = 'prestamos_diarios'
const MAX_PRESTAMOS_RANGO = 600
const TOP_LIMIT = 6
const DETAIL_LIMIT = 8

const router = useRouter()
const { logout } = useAuth()

const usuario = ref(null)
const isModulesMenuOpen = ref(false)
const loading = ref(false)
const loadError = ref('')
const prestamosRaw = ref([])
const lastLoadedAt = ref(null)

const rangePreset = ref('week')
const dateStart = ref('')
const dateEnd = ref('')
const searchTerm = ref('')
const debouncedSearch = ref('')
const empresaFilter = ref('')
const unidadFilter = ref('')
const chartMetric = ref('consumido')
const selectedInsight = ref(null)
const isInsightModalOpen = ref(false)

let searchTimer = null

const METRIC_LABELS = {
  consumido: 'Consumido',
  adeudo: 'Adeudo',
  pendiente: 'Pendiente',
  devuelto: 'Devuelto',
  total: 'Total'
}

const chartLegend = [
  { key: 'consumido', label: 'Consumido' },
  { key: 'adeudo', label: 'Adeudo' },
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'devuelto', label: 'Devuelto' }
]

const todayString = () => formatDateInput(new Date())

function formatDateInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

function getDateFromValue(value) {
  if (!value) return null
  if (value && typeof value.toDate === 'function') return value.toDate()
  if (value instanceof Date) return value
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getPrestamoDate(prestamo = {}) {
  return getDateFromValue(prestamo.fechaOperativa) || getDateFromValue(prestamo.createdAt) || getDateFromValue(prestamo.updatedAt)
}

function getPrestamoFechaOperativa(prestamo = {}) {
  if (prestamo.fechaOperativa && /^\d{4}-\d{2}-\d{2}$/.test(String(prestamo.fechaOperativa))) return prestamo.fechaOperativa
  const date = getPrestamoDate(prestamo)
  return date ? formatDateInput(date) : ''
}

function applyDatePreset(preset) {
  const today = new Date()
  const start = new Date(today)

  if (preset === 'today') {
    dateStart.value = todayString()
    dateEnd.value = todayString()
    return
  }

  if (preset === 'week') {
    const day = today.getDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    start.setDate(today.getDate() - diffToMonday)
    dateStart.value = formatDateInput(start)
    dateEnd.value = todayString()
    return
  }

  if (preset === 'month') {
    dateStart.value = formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1))
    dateEnd.value = todayString()
    return
  }

  start.setDate(today.getDate() - 29)
  dateStart.value = formatDateInput(start)
  dateEnd.value = todayString()
}

const chartMetricLabel = computed(() => METRIC_LABELS[chartMetric.value] || 'Consumido')
const productPieItems = computed(() => mergeProductGraphItems(dashboard.value.productosConsumidos, dashboard.value.productosAdeudos))
const productPieTotal = computed(() => productPieItems.value.reduce((sum, item) => sum + Number(item.consumido || 0) + Number(item.adeudo || 0), 0))
const productPieStyle = computed(() => buildProductPieStyle(productPieItems.value))

const rangeLabel = computed(() => {
  if (!dateStart.value || !dateEnd.value) return 'Selecciona un rango para cargar métricas.'
  if (dateStart.value === dateEnd.value) return `Datos del ${formatShortDate(dateStart.value)}`
  return `Datos del ${formatShortDate(dateStart.value)} al ${formatShortDate(dateEnd.value)}`
})

const empresaOptions = computed(() => uniqueSorted(prestamosRaw.value.map((prestamo) => prestamo.empresaTrabajo || prestamo.empresa || '')))

const unidadOptions = computed(() => {
  const selectedEmpresa = normalizeText(empresaFilter.value)
  return uniqueSorted(
    prestamosRaw.value
      .filter((prestamo) => !selectedEmpresa || normalizeText(prestamo.empresaTrabajo || prestamo.empresa) === selectedEmpresa)
      .map((prestamo) => prestamo.unidadTrabajo || prestamo.unidad || prestamo.placas || '')
  )
})

const filteredPrestamos = computed(() => {
  const empresa = normalizeText(empresaFilter.value)
  const unidad = normalizeText(unidadFilter.value)
  const search = normalizeText(debouncedSearch.value)

  return prestamosRaw.value.filter((prestamo) => {
    const prestamoEmpresa = normalizeText(prestamo.empresaTrabajo || prestamo.empresa)
    const prestamoUnidad = normalizeText(prestamo.unidadTrabajo || prestamo.unidad || prestamo.placas)

    if (empresa && prestamoEmpresa !== empresa) return false
    if (unidad && prestamoUnidad !== unidad) return false
    if (!search) return true

    const detallesText = (prestamo.detalles || [])
      .map((item) => `${item.productoNombre || ''} ${item.nombre || ''} ${item.tipo || ''}`)
      .join(' ')

    const haystack = normalizeText([
      prestamo.empresaTrabajo,
      prestamo.empresa,
      prestamo.unidadTrabajo,
      prestamo.unidad,
      prestamo.placas,
      prestamo.descripcionTrabajo,
      prestamo.trabajoDescripcion,
      prestamo.colaboradorNombre,
      prestamo.colaborador,
      prestamo.estado,
      detallesText
    ].join(' '))

    return haystack.includes(search)
  })
})

const dashboard = computed(() => buildDashboardMetrics(filteredPrestamos.value, chartMetric.value))

const chartSections = computed(() => [
  {
    key: 'trabajos-consumo',
    type: 'trabajo',
    eyebrow: 'Trabajos',
    title: 'Material consumido por trabajo',
    description: 'Toca un trabajo para ver qué productos consumió.',
    icon: briefcaseOutline,
    metric: 'consumido',
    items: dashboard.value.consumoPorTrabajo,
    emptyText: 'Sin consumo registrado en este periodo.'
  },
  {
    key: 'colaboradores-adeudos',
    type: 'colaborador',
    eyebrow: 'Adeudos',
    title: 'Colaboradores con más adeudos',
    description: 'Revisa quién concentra más material pendiente.',
    icon: medalOutline,
    metric: 'adeudo',
    items: dashboard.value.adeudosPorColaborador,
    emptyText: 'Sin adeudos registrados.'
  },
  {
    key: 'unidades-metrica',
    type: 'unidad',
    eyebrow: 'Unidades',
    title: `Unidades por ${chartMetricLabel.value.toLowerCase()}`,
    description: 'Detecta qué unidades tienen más movimiento.',
    icon: carSportOutline,
    metric: chartMetric.value,
    items: dashboard.value.unidadesGrafica,
    emptyText: 'Sin unidades registradas.'
  },
  {
    key: 'empresas-metrica',
    type: 'empresa',
    eyebrow: 'Empresas',
    title: `Empresas por ${chartMetricLabel.value.toLowerCase()}`,
    description: 'Compara consumo y adeudos entre empresas.',
    icon: businessOutline,
    metric: chartMetric.value,
    items: dashboard.value.empresasGrafica,
    emptyText: 'Sin empresas registradas.'
  }
])

const selectedInsightTitle = computed(() => {
  if (!selectedInsight.value) return 'Detalle'
  return `Detalle: ${selectedInsight.value.label}`
})

const selectedInsightKindLabel = computed(() => {
  const type = selectedInsight.value?.type
  if (type === 'trabajo') return 'Trabajo'
  if (type === 'colaborador') return 'Colaborador'
  if (type === 'producto') return 'Producto'
  if (type === 'unidad') return 'Unidad'
  if (type === 'empresa') return 'Empresa'
  return 'Detalle'
})

const selectedInsightDetail = computed(() => buildInsightDetail(selectedInsight.value, filteredPrestamos.value))

const estadoDonutStyle = computed(() => {
  const estado = dashboard.value.estadoMaterial
  const total = dashboard.value.resumen.materialTotal
  if (!total) return { background: '#e5eaf2' }

  let cursor = 0
  const colors = {
    consumido: '#2f5b8e',
    devuelto: '#16a34a',
    adeudo: '#b42318',
    pendiente: '#d97706'
  }

  const segments = estado.map((item) => {
    const start = cursor
    const end = cursor + (Number(item.value || 0) / total) * 100
    cursor = end
    return `${colors[item.key]} ${start}% ${end}%`
  })

  return { background: `conic-gradient(${segments.join(', ')})` }
})

watch(searchTerm, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedSearch.value = value
  }, 250)
})

watch(empresaFilter, () => {
  if (!unidadFilter.value) return
  const exists = unidadOptions.value.some((unidad) => normalizeText(unidad) === normalizeText(unidadFilter.value))
  if (!exists) unidadFilter.value = ''
})

onMounted(async () => {
  const userJSON = localStorage.getItem('user')
  if (userJSON) {
    try {
      usuario.value = JSON.parse(userJSON)
    } catch (error) {
      usuario.value = null
    }
  }

  applyDatePreset(rangePreset.value)
  await loadDashboardData()
})

async function handleRangeChange(event) {
  const value = event?.detail?.value || 'week'
  rangePreset.value = value
  if (value === 'custom') return
  applyDatePreset(value)
  await loadDashboardData()
}

function handleMetricChange(event) {
  chartMetric.value = event?.detail?.value || 'consumido'
}

async function loadDashboardData() {
  if (!dateStart.value || !dateEnd.value) {
    loadError.value = 'Selecciona una fecha inicial y una fecha final.'
    return
  }

  if (dateStart.value > dateEnd.value) {
    loadError.value = 'La fecha inicial no puede ser mayor que la fecha final.'
    return
  }

  loading.value = true
  loadError.value = ''

  try {
    const prestamosQuery = query(
      collection(db, PRESTAMOS_COLLECTION),
      where('fechaOperativa', '>=', dateStart.value),
      where('fechaOperativa', '<=', dateEnd.value),
      orderBy('fechaOperativa', 'desc'),
      limitQuery(MAX_PRESTAMOS_RANGO)
    )

    const snapshot = await getDocs(prestamosQuery)
    prestamosRaw.value = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .sort(sortPrestamosDesc)

    lastLoadedAt.value = new Date()
    syncFiltersWithLoadedData()
  } catch (error) {
    loadError.value = error?.message || 'Ocurrió un error al cargar los préstamos.'
  } finally {
    loading.value = false
  }
}

function syncFiltersWithLoadedData() {
  if (empresaFilter.value && !empresaOptions.value.some((empresa) => normalizeText(empresa) === normalizeText(empresaFilter.value))) empresaFilter.value = ''
  if (unidadFilter.value && !unidadOptions.value.some((unidad) => normalizeText(unidad) === normalizeText(unidadFilter.value))) unidadFilter.value = ''
}

function resetFilters() {
  searchTerm.value = ''
  debouncedSearch.value = ''
  empresaFilter.value = ''
  unidadFilter.value = ''
}

function buildDashboardMetrics(prestamos = [], metric = 'consumido') {
  const resumen = {
    consumidoTotal: 0,
    adeudoTotal: 0,
    devueltoTotal: 0,
    pendienteTotal: 0,
    materialTotal: 0,
    trabajosTotal: 0,
    prestamosActivos: 0,
    prestamosCerrados: 0
  }

  const trabajosSet = new Set()
  const trabajosMap = new Map()
  const colaboradorAdeudoMap = new Map()
  const productosMap = new Map()
  const empresasMap = new Map()
  const unidadesMap = new Map()
  const alertasMap = new Map()

  for (const prestamo of prestamos) {
    const estado = normalizeText(prestamo.estado)
    const detalles = Array.isArray(prestamo.detalles) ? prestamo.detalles : []
    const empresa = cleanLabel(prestamo.empresaTrabajo || prestamo.empresa, 'Sin empresa')
    const unidad = cleanLabel(prestamo.unidadTrabajo || prestamo.unidad || prestamo.placas, 'Sin unidad')
    const trabajo = cleanLabel(prestamo.descripcionTrabajo || prestamo.trabajoDescripcion, 'Sin descripción')
    const colaborador = cleanLabel(prestamo.colaboradorNombre || prestamo.colaborador, 'Sin colaborador')
    const fecha = getPrestamoFechaOperativa(prestamo)
    const trabajoKey = getTrabajoKey(prestamo, empresa, unidad, trabajo)
    const empresaKey = normalizeText(empresa)
    const unidadKey = normalizeText(unidad)
    const colaboradorKey = normalizeText(colaborador)

    trabajosSet.add(trabajoKey)
    if (estado === 'abierto' || estado === 'activo') resumen.prestamosActivos += 1
    if (estado === 'cerrado' || estado === 'cerrado_con_adeudo') resumen.prestamosCerrados += 1

    for (const item of detalles) {
      const cantidades = getDetalleCantidades(item, prestamo)
      resumen.consumidoTotal += cantidades.consumido
      resumen.adeudoTotal += cantidades.adeudo
      resumen.devueltoTotal += cantidades.devuelto
      resumen.pendienteTotal += cantidades.pendiente

      addMetricToMap(trabajosMap, trabajoKey, {
        type: 'trabajo',
        label: trabajo,
        subLabel: `${empresa} · ${unidad}`,
        empresa,
        unidad,
        trabajo,
        trabajoKey
      }, cantidades, prestamo.id)

      addMetricToMap(colaboradorAdeudoMap, colaboradorKey, {
        type: 'colaborador',
        label: colaborador,
        subLabel: `${empresa} · ${unidad}`,
        colaborador
      }, cantidades, prestamo.id)

      const productKey = getProductKey(item)
      addMetricToMap(productosMap, productKey, {
        type: 'producto',
        label: cleanLabel(item.productoNombre || item.nombre, 'Producto sin nombre'),
        subLabel: cleanLabel(item.categoriaControl || item.tipo, 'Material'),
        productoId: item.productoId || '',
        productoKey: productKey
      }, cantidades, prestamo.id)

      addMetricToMap(empresasMap, empresaKey, {
        type: 'empresa',
        label: empresa,
        subLabel: `${unidad}`,
        empresa
      }, cantidades, prestamo.id)

      addMetricToMap(unidadesMap, unidadKey, {
        type: 'unidad',
        label: unidad,
        subLabel: empresa,
        empresa,
        unidad
      }, cantidades, prestamo.id)

      if (cantidades.adeudo > 0 || cantidades.pendiente > 0) {
        const existing = alertasMap.get(trabajoKey) || createMetricItem({
          key: trabajoKey,
          type: 'trabajo',
          label: trabajo,
          subLabel: `${empresa} · ${unidad}${fecha ? ` · ${formatShortDate(fecha)}` : ''}`,
          empresa,
          unidad,
          trabajo,
          trabajoKey
        })
        addQuantities(existing, cantidades, prestamo.id)
        alertasMap.set(trabajoKey, existing)
      }
    }
  }

  resumen.materialTotal = resumen.consumidoTotal + resumen.adeudoTotal + resumen.devueltoTotal + resumen.pendienteTotal
  resumen.trabajosTotal = trabajosSet.size

  const estadoMaterial = [
    { key: 'consumido', label: 'Consumido', value: resumen.consumidoTotal },
    { key: 'devuelto', label: 'Devuelto', value: resumen.devueltoTotal },
    { key: 'adeudo', label: 'Adeudado', value: resumen.adeudoTotal },
    { key: 'pendiente', label: 'Pendiente', value: resumen.pendienteTotal }
  ]

  return {
    resumen,
    estadoMaterial,
    maxEstadoMaterial: Math.max(...estadoMaterial.map((item) => item.value), 0),
    consumoPorTrabajo: topMetricItems(trabajosMap, 'consumido'),
    adeudosPorColaborador: topMetricItems(colaboradorAdeudoMap, 'adeudo'),
    productosConsumidos: topMetricItems(productosMap, 'consumido'),
    productosAdeudos: topMetricItems(productosMap, 'adeudo'),
    productosGrafica: topMetricItems(productosMap, metric),
    unidadesGrafica: topMetricItems(unidadesMap, metric),
    empresasGrafica: topMetricItems(empresasMap, metric),
    trabajosConAlerta: Array.from(alertasMap.values())
      .sort((a, b) => (b.adeudo + b.pendiente) - (a.adeudo + a.pendiente))
      .slice(0, TOP_LIMIT)
  }
}

function buildInsightDetail(insight, prestamos = []) {
  const resumen = { consumido: 0, adeudo: 0, pendiente: 0, devuelto: 0, total: 0 }
  const productosMap = new Map()
  const prestamosRelacionados = []
  const adeudos = []

  if (!insight) {
    return { resumen, productos: [], prestamos: [], adeudos: [] }
  }

  for (const prestamo of prestamos) {
    if (!matchesInsight(prestamo, insight)) continue

    const detalles = Array.isArray(prestamo.detalles) ? prestamo.detalles : []
    let prestamoTieneMovimiento = false

    for (const item of detalles) {
      if (insight.type === 'producto' && getProductKey(item) !== insight.key && normalizeText(item.productoNombre || item.nombre) !== insight.key) continue

      const cantidades = getDetalleCantidades(item, prestamo)
      if (!cantidades.total) continue

      resumen.consumido += cantidades.consumido
      resumen.adeudo += cantidades.adeudo
      resumen.pendiente += cantidades.pendiente
      resumen.devuelto += cantidades.devuelto
      resumen.total += cantidades.total
      prestamoTieneMovimiento = true

      const productKey = getProductKey(item)
      addMetricToMap(productosMap, productKey, {
        type: 'producto',
        label: cleanLabel(item.productoNombre || item.nombre, 'Producto sin nombre'),
        subLabel: cleanLabel(item.categoriaControl || item.tipo, 'Material'),
        productoId: item.productoId || '',
        productoKey: productKey
      }, cantidades, prestamo.id)

      if (cantidades.adeudo > 0) {
        adeudos.push({
          key: `${prestamo.id}-${productKey}-${adeudos.length}`,
          producto: cleanLabel(item.productoNombre || item.nombre, 'Producto sin nombre'),
          trabajo: cleanLabel(prestamo.descripcionTrabajo || prestamo.trabajoDescripcion, 'Sin descripción'),
          colaborador: cleanLabel(prestamo.colaboradorNombre || prestamo.colaborador, 'Sin colaborador'),
          adeudo: cantidades.adeudo
        })
      }
    }

    if (prestamoTieneMovimiento) prestamosRelacionados.push(prestamo)
  }

  return {
    resumen,
    productos: topMetricItems(productosMap, 'consumido', DETAIL_LIMIT),
    prestamos: prestamosRelacionados.sort(sortPrestamosDesc).slice(0, DETAIL_LIMIT),
    adeudos: adeudos.sort((a, b) => b.adeudo - a.adeudo).slice(0, DETAIL_LIMIT)
  }
}

function matchesInsight(prestamo = {}, insight = {}) {
  const empresa = cleanLabel(prestamo.empresaTrabajo || prestamo.empresa, 'Sin empresa')
  const unidad = cleanLabel(prestamo.unidadTrabajo || prestamo.unidad || prestamo.placas, 'Sin unidad')
  const trabajo = cleanLabel(prestamo.descripcionTrabajo || prestamo.trabajoDescripcion, 'Sin descripción')
  const colaborador = cleanLabel(prestamo.colaboradorNombre || prestamo.colaborador, 'Sin colaborador')
  const trabajoKey = getTrabajoKey(prestamo, empresa, unidad, trabajo)

  if (insight.type === 'empresa') return normalizeText(empresa) === insight.key
  if (insight.type === 'unidad') return normalizeText(unidad) === insight.key
  if (insight.type === 'colaborador') return normalizeText(colaborador) === insight.key
  if (insight.type === 'trabajo') return trabajoKey === insight.key || trabajoKey === insight.trabajoKey
  if (insight.type === 'producto') {
    return (prestamo.detalles || []).some((item) => getProductKey(item) === insight.key || normalizeText(item.productoNombre || item.nombre) === insight.key)
  }
  return false
}

function getDetalleCantidades(item = {}, prestamo = {}) {
  const cantidadCapturada = toNumber(item.cantidad)
  const cantidadDesdeStock = toNumber(item.cantidadDesdeStockNuevo) + toNumber(item.cantidadDesdeStockEmpezado)
  const cantidad = cantidadCapturada || cantidadDesdeStock
  let consumido = toNumber(item.cantidadConsumida)
  const adeudo = toNumber(item.cantidadAdeudada)
  const devuelto = toNumber(item.cantidadDevuelta) + toNumber(item.cantidadDevueltaComoEmpezado)
  const tipoOperacion = normalizeText(prestamo.tipoOperacion || prestamo.operacion)
  const esEntregaSinAdeudo = tipoOperacion.includes('entrega') && tipoOperacion.includes('sin') && tipoOperacion.includes('adeudo')

  if (esEntregaSinAdeudo && consumido === 0 && adeudo === 0 && devuelto === 0) consumido = cantidad

  const pendiente = Math.max(0, cantidad - consumido - adeudo - devuelto)
  const total = consumido + adeudo + devuelto + pendiente

  return { cantidad, consumido, adeudo, devuelto, pendiente, total }
}

function createMetricItem(data) {
  return {
    key: data.key,
    type: data.type,
    label: data.label,
    subLabel: data.subLabel || '',
    empresa: data.empresa || '',
    unidad: data.unidad || '',
    trabajo: data.trabajo || '',
    colaborador: data.colaborador || '',
    productoId: data.productoId || '',
    productoKey: data.productoKey || '',
    trabajoKey: data.trabajoKey || '',
    consumido: 0,
    adeudo: 0,
    pendiente: 0,
    devuelto: 0,
    total: 0,
    prestamosIds: new Set()
  }
}

function addMetricToMap(map, key, base, cantidades, prestamoId) {
  const safeKey = key || normalizeText(base.label)
  if (!safeKey) return
  const existing = map.get(safeKey) || createMetricItem({ ...base, key: safeKey })
  addQuantities(existing, cantidades, prestamoId)
  map.set(safeKey, existing)
}

function addQuantities(target, cantidades, prestamoId) {
  target.consumido += Number(cantidades.consumido || 0)
  target.adeudo += Number(cantidades.adeudo || 0)
  target.pendiente += Number(cantidades.pendiente || 0)
  target.devuelto += Number(cantidades.devuelto || 0)
  target.total += Number(cantidades.total || 0)
  if (prestamoId) target.prestamosIds.add(prestamoId)
}

function getMetricValue(item = {}, metric = 'consumido') {
  if (metric === 'total') return Number(item.total || item.consumido + item.adeudo + item.pendiente + item.devuelto || 0)
  return Number(item[metric] || 0)
}

function getMetricLabel(metric = 'consumido') {
  return METRIC_LABELS[metric] || 'Total'
}

function getVisibleChartItems(items = [], metric = 'consumido', limit = TOP_LIMIT) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => getMetricValue(item, metric) > 0 || Number(item.total || 0) > 0)
    .slice(0, limit)
}

function getChartMax(items = [], metric = 'consumido') {
  const visibleItems = getVisibleChartItems(items, metric, TOP_LIMIT)
  return Math.max(...visibleItems.map((item) => getMetricValue(item, metric)), 0)
}

function getChartWidth(item = {}, items = [], metric = 'consumido') {
  const value = getMetricValue(item, metric)
  const max = getChartMax(items, metric)
  if (!value || !max) return '0%'
  return `${Math.max(7, Math.min(100, Math.round((value / max) * 100)))}%`
}

function getCardMetricWidth(item = {}, items = [], metric = 'consumido') {
  const value = getMetricValue(item, metric)
  const max = Math.max(
    ...getVisibleChartItems(items, metric, TOP_LIMIT).map((row) => getMetricValue(row, metric)),
    value,
    0
  )
  if (!value || !max) return '0%'
  return `${Math.max(6, Math.min(100, Math.round((value / max) * 100)))}%`
}

function getDetailMetricWidth(metric = 'consumido') {
  const resumen = selectedInsightDetail.value?.resumen || {}
  const value = Number(resumen[metric] || 0)
  const max = Math.max(
    Number(resumen.consumido || 0),
    Number(resumen.adeudo || 0),
    Number(resumen.pendiente || 0),
    Number(resumen.devuelto || 0),
    0
  )
  if (!value || !max) return '0%'
  return `${Math.max(6, Math.min(100, Math.round((value / max) * 100)))}%`
}

function getSegmentWidth(item = {}, key = 'consumido') {
  const total = getMetricValue(item, 'total')
  const value = Number(item[key] || 0)
  if (!value || !total) return '0%'
  return `${Math.max(3, Math.min(100, (value / total) * 100))}%`
}

function getChartSubLabel(item = {}) {
  if (item.subLabel) return item.subLabel
  return `${formatNumber(item.prestamosTotal || 0)} préstamo(s)`
}

function topMetricItems(map, metric = 'consumido', limit = TOP_LIMIT) {
  return Array.from(map.values())
    .map((item) => ({
      ...item,
      prestamosIds: undefined,
      prestamosTotal: item.prestamosIds?.size || 0,
      value: getMetricValue(item, metric)
    }))
    .filter((item) => getMetricValue(item, metric) > 0 || Number(item.total || 0) > 0)
    .sort((a, b) => getMetricValue(b, metric) - getMetricValue(a, metric))
    .slice(0, limit)
}

function mergeProductGraphItems(consumidos = [], adeudos = []) {
  const itemsByKey = new Map()

  const ingest = (item = {}) => {
    const key = item.productoKey || item.productoId || normalizeText(item.label)
    if (!key) return

    const existing = itemsByKey.get(key) || {
      ...item,
      consumido: 0,
      adeudo: 0,
      pendiente: 0,
      devuelto: 0,
      total: 0,
      prestamosIds: new Set(),
      prestamosTotal: 0,
      value: 0
    }

    existing.label = item.label || existing.label || 'Producto sin nombre'
    existing.subLabel = item.subLabel || existing.subLabel || 'Material'
    existing.productoId = item.productoId || existing.productoId || ''
    existing.productoKey = item.productoKey || existing.productoKey || key
    existing.consumido = Math.max(Number(existing.consumido || 0), Number(item.consumido || 0))
    existing.adeudo = Math.max(Number(existing.adeudo || 0), Number(item.adeudo || 0))
    existing.pendiente = Math.max(Number(existing.pendiente || 0), Number(item.pendiente || 0))
    existing.devuelto = Math.max(Number(existing.devuelto || 0), Number(item.devuelto || 0))
    existing.total = Math.max(Number(existing.total || 0), Number(item.total || 0))
    existing.prestamosIds = new Set([...(existing.prestamosIds || []), ...(item.prestamosIds || [])])

    itemsByKey.set(key, existing)
  }

  consumidos.forEach(ingest)
  adeudos.forEach(ingest)

  return Array.from(itemsByKey.values())
    .map((item) => ({
      ...item,
      prestamosTotal: item.prestamosIds?.size || item.prestamosTotal || 0,
      value: Number(item.consumido || 0) + Number(item.adeudo || 0)
    }))
    .filter((item) => Number(item.consumido || 0) > 0 || Number(item.adeudo || 0) > 0)
    .sort((a, b) => (Number(b.consumido || 0) + Number(b.adeudo || 0)) - (Number(a.consumido || 0) + Number(a.adeudo || 0)))
}

function buildProductPieStyle(items = []) {
  const total = items.reduce((sum, item) => sum + Number(item.consumido || 0) + Number(item.adeudo || 0), 0)
  if (!total) return { background: '#e5eaf2' }

  let cursor = 0
  const segments = items.map((item, index) => {
    const value = Number(item.consumido || 0) + Number(item.adeudo || 0)
    const start = cursor
    const end = cursor + (value / total) * 100
    cursor = end
    return `${getProductPieColor(index)} ${start}% ${end}%`
  })

  return { background: `conic-gradient(${segments.join(', ')})` }
}

function getProductPieColor(index = 0) {
  const palette = [
    '#2f5b8e',
    '#16a34a',
    '#b42318',
    '#d97706',
    '#0f766e',
    '#7c3aed',
    '#db2777',
    '#2563eb',
    '#4f46e5',
    '#84cc16'
  ]
  return palette[index % palette.length]
}

function getProductPieShare(item = {}) {
  const total = Number(productPieTotal.value || 0)
  if (!total) return '0%'
  const value = Number(item.consumido || 0) + Number(item.adeudo || 0)
  return `${Math.round((value / total) * 100)}%`
}

function getProductKey(item = {}) {
  return item.productoId || normalizeText(item.productoNombre || item.nombre)
}

function getTrabajoKey(prestamo = {}, empresa = '', unidad = '', trabajo = '') {
  return prestamo.trabajoId || `${normalizeText(empresa)}__${normalizeText(unidad)}__${normalizeText(trabajo)}`
}

function uniqueSorted(values = []) {
  const seen = new Map()
  values.forEach((value) => {
    const label = String(value || '').trim()
    const key = normalizeText(label)
    if (label && !seen.has(key)) seen.set(key, label)
  })
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, 'es'))
}

function cleanLabel(value, fallback = '—') {
  const label = String(value || '').trim()
  return label || fallback
}

function sortPrestamosDesc(a, b) {
  const aTime = getPrestamoDate(a)?.getTime() || 0
  const bTime = getPrestamoDate(b)?.getTime() || 0
  return bTime - aTime
}

function getBarWidth(value, max) {
  if (!max) return '0%'
  return `${Math.max(5, Math.round((Number(value || 0) / max) * 100))}%`
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(Number(value || 0))
}

function formatShortDate(value) {
  const date = getDateFromValue(value)
  if (!date) return value || 'Sin fecha'
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function formatTime(value) {
  const date = getDateFromValue(value)
  if (!date) return '—'
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function openInsightDetail(type, item) {
  selectedInsight.value = {
    ...item,
    type: type || item.type
  }
  isInsightModalOpen.value = true
}

function closeInsightModal() {
  isInsightModalOpen.value = false
  selectedInsight.value = null
}

function filterDashboardByInsight() {
  const insight = selectedInsight.value
  if (!insight) return

  if (insight.type === 'empresa') {
    empresaFilter.value = insight.label
    unidadFilter.value = ''
    searchTerm.value = ''
    debouncedSearch.value = ''
  } else if (insight.type === 'unidad') {
    if (insight.empresa) empresaFilter.value = insight.empresa
    unidadFilter.value = insight.label
    searchTerm.value = ''
    debouncedSearch.value = ''
  } else {
    searchTerm.value = insight.label
    debouncedSearch.value = insight.label
  }

  closeInsightModal()
}

async function openPrestamosWithInsight() {
  const insight = selectedInsight.value
  const queryParams = {
    desde: dateStart.value,
    hasta: dateEnd.value
  }

  if (insight) {
    if (insight.empresa) queryParams.empresaTrabajo = insight.empresa
    if (insight.unidad) queryParams.unidadTrabajo = insight.unidad
    if (insight.trabajo) queryParams.descripcionTrabajo = insight.trabajo
    if (insight.colaborador) queryParams.colaboradorNombre = insight.colaborador
    if (insight.type === 'producto') queryParams.producto = insight.label
  }

  closeInsightModal()
  await router.push({ path: '/prestamos', query: queryParams })
}

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
</script>

<style scoped>
.dashboard-content {
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 1rem;
  --background: #f3f6fb;
}

.dashboard-title {
  font-size: 1rem;
  font-weight: 700;
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

.page-shell {
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero-card,
.filters-card,
.chart-mode-card,
.chart-card,
.alerts-card,
.state-card,
.summary-card,
.detail-section,
.detail-hero,
.detail-metric {
  border: 1px solid #dfe6f0;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(31, 53, 85, 0.08);
}

.hero-card {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 18px;
  padding: 20px;
  overflow: hidden;
  color: #ffffff;
  background:
    radial-gradient(circle at 90% 18%, rgba(255, 255, 255, 0.28), transparent 28%),
    linear-gradient(135deg, #1f3555 0%, #2f5b8e 54%, #7eb3d5 100%);
}

.hero-copy,
.hero-actions {
  position: relative;
  z-index: 1;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(47, 91, 142, 0.1);
  color: #2f5b8e;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.hero-card .eyebrow {
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.hero-card h1,
.card-heading h2,
.section-heading h2,
.state-card h2,
.detail-hero h2 {
  margin: 0;
  color: #1f3555;
  font-size: 1.12rem;
  font-weight: 800;
  line-height: 1.2;
}

.hero-card h1 {
  margin-top: 10px;
  color: #ffffff;
  font-size: 1.35rem;
}

.hero-card p,
.section-heading p,
.state-card p,
.empty-text,
.last-update,
.detail-hero p {
  margin: 0;
  color: #667085;
  font-size: 0.9rem;
  line-height: 1.45;
}

.hero-card p {
  max-width: 620px;
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.86);
}

.hero-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  min-width: 160px;
}

.hero-button {
  --border-radius: 14px;
  --background: #ffffff;
  --color: #1f3555;
  --box-shadow: 0 12px 24px rgba(31, 53, 85, 0.18);
  min-height: 42px;
  font-weight: 800;
  text-transform: none;
}

.last-update {
  color: rgba(255, 255, 255, 0.78);
  text-align: right;
}

.filters-card,
.chart-mode-card,
.chart-card,
.alerts-card,
.state-card,
.detail-section,
.detail-hero {
  padding: 16px;
}

.section-heading,
.card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.compact-heading {
  margin-bottom: 10px;
}

.card-heading ion-icon {
  color: #2f5b8e;
  font-size: 1.35rem;
}

.text-action {
  appearance: none;
  border: 0;
  background: transparent;
  color: #2f5b8e;
  font-size: 0.9rem;
  font-weight: 800;
  padding: 4px 0;
}

.range-segment,
.metric-segment {
  --background: #eef3f9;
  border-radius: 16px;
  padding: 4px;
  margin-bottom: 14px;
}

.metric-segment {
  margin-bottom: 0;
}

.range-segment ion-segment-button,
.metric-segment ion-segment-button {
  --border-radius: 12px;
  --indicator-color: #ffffff;
  --color: #667085;
  --color-checked: #1f3555;
  min-height: 38px;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: none;
}

.filter-grid,
.custom-range-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.9fr 0.9fr;
  gap: 12px;
  align-items: end;
}

.custom-range-grid {
  grid-template-columns: 1fr 1fr auto;
  margin-bottom: 12px;
}

.field-wide {
  min-width: 0;
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.field-block > span {
  color: #344054;
  font-size: 0.78rem;
  font-weight: 800;
}

.dashboard-field {
  min-height: 44px;
  border: 1px solid #d7deea;
  border-radius: 14px;
  background: #f8fafc;
  color: #1f2937;
  overflow: hidden;
  --background: #f8fafc;
  --color: #1f2937;
  --placeholder-color: #98a2b3;
  --placeholder-opacity: 1;
  --padding-start: 12px;
  --padding-end: 12px;
  font-size: 0.9rem;
  font-weight: 600;
}

.apply-button {
  --border-radius: 14px;
  --background: #2f5b8e;
  min-height: 44px;
  font-size: 0.9rem;
  font-weight: 800;
  text-transform: none;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-left: 5px solid #2f5b8e;
}

.summary-debt { border-left-color: #b42318; }
.summary-pending { border-left-color: #d97706; }
.summary-work { border-left-color: #16a34a; }

.summary-label,
.mini-badge,
.alert-values span,
.detail-metric span {
  color: #667085;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.summary-card strong {
  color: #1f3555;
  font-size: 1.35rem;
  font-weight: 900;
  line-height: 1;
}

.summary-card small {
  color: #667085;
  font-size: 0.9rem;
  line-height: 1.35;
}

.state-card {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #1f3555;
}

.state-card ion-spinner,
.state-card ion-icon {
  flex: 0 0 auto;
  color: #2f5b8e;
  font-size: 1.5rem;
}

.error-state ion-icon { color: #b42318; }

.charts-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 14px;
}

.insight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.mini-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 5px 10px;
  border-radius: 999px;
  background: #eef3f9;
  color: #2f5b8e;
  white-space: nowrap;
}

.mini-badge.warning {
  background: #fff7ed;
  color: #c2410c;
}

.material-layout {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
}

.donut-wrap { display: grid; place-items: center; }

.status-donut {
  width: 138px;
  height: 138px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  position: relative;
  box-shadow: inset 0 0 0 1px rgba(31, 53, 85, 0.08);
}

.status-donut::after {
  content: '';
  position: absolute;
  width: 86px;
  height: 86px;
  border-radius: 999px;
  background: #ffffff;
}

.status-donut span {
  position: relative;
  z-index: 1;
  color: #1f3555;
  font-size: 1.12rem;
  font-weight: 900;
}

.bar-list,
.alert-list,
.metric-chart-list,
.mini-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar-row,
.alert-row,
.metric-chart-row,
.mini-row {
  width: 100%;
  padding: 10px;
  border: 1px solid #e6ebf2;
  border-radius: 16px;
  background: #f8fafc;
}

.clickable-row {
  appearance: none;
  border: 1px solid #e6ebf2;
  text-align: left;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}

.clickable-row:active {
  transform: scale(0.99);
}

.clickable-row:hover {
  border-color: #b8c7dc;
  box-shadow: 0 10px 20px rgba(31, 53, 85, 0.08);
}

.bar-meta,
.alert-row,
.metric-row-top,
.mini-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.bar-meta span,
.alert-main strong,
.metric-row-copy strong,
.mini-row strong {
  color: #1f3555;
  font-size: 0.9rem;
  font-weight: 800;
}

.bar-meta strong,
.metric-row-top em,
.mini-row em {
  color: #1f3555;
  font-size: 0.9rem;
  font-style: normal;
  font-weight: 900;
  white-space: nowrap;
}

.bar-track,
.metric-bar-shell {
  width: 100%;
  height: 9px;
  margin-top: 8px;
  border-radius: 999px;
  background: #e7edf5;
  overflow: hidden;
}

.bar-fill {
  width: var(--bar-width);
  min-width: 0;
  height: 100%;
  border-radius: inherit;
  background: #2f5b8e;
}

.metric-bar-outer {
  display: flex;
  width: var(--bar-width);
  min-width: 0;
  height: 100%;
  border-radius: inherit;
  overflow: hidden;
  background: #2f5b8e;
}

.stack-segment {
  display: block;
  width: var(--segment-width);
  height: 100%;
}

.segment-consumido,
.bar-consumido { background: #2f5b8e; }
.segment-adeudo,
.bar-adeudo { background: #b42318; }
.segment-pendiente,
.bar-pendiente { background: #d97706; }
.bar-devuelto { background: #16a34a; }

.metric-row-copy,
.alert-main,
.mini-row > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.metric-row-copy span,
.alert-main span,
.mini-row span,
.metric-breakdown span {
  color: #667085;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.35;
}

.metric-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.metric-breakdown span {
  padding: 4px 7px;
  border-radius: 999px;
  background: #eef3f9;
}

.metric-breakdown b {
  color: #1f3555;
}

.alert-values {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.alert-values span {
  padding: 5px 8px;
  border-radius: 999px;
  background: #fff7ed;
  color: #c2410c;
}

.empty-text {
  padding: 10px 0 0;
  color: #667085;
}

.detail-modal-content {
  --background: #f3f6fb;
}

.detail-modal-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.detail-hero h2 {
  margin-top: 8px;
}

.detail-metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.detail-metric {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-left: 4px solid #2f5b8e;
}

.detail-metric.debt { border-left-color: #b42318; }
.detail-metric.pending { border-left-color: #d97706; }
.detail-metric.returned { border-left-color: #16a34a; }

.detail-metric strong {
  color: #1f3555;
  font-size: 1.15rem;
  font-weight: 900;
}

.loan-row em {
  color: #667085;
  font-size: 0.78rem;
}

.modal-footer-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1px solid #e6ebf2;
}

.modal-footer-actions ion-button {
  --border-radius: 14px;
  min-height: 42px;
  font-size: 0.9rem;
  font-weight: 800;
  text-transform: none;
}


/* Gráficas del dashboard: HTML/CSS simple, rápido y acorde al sistema */
.dashboard-graphs-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.graph-card {
  overflow: hidden;
}

.chart-heading {
  margin-bottom: 12px;
}

.card-heading p {
  margin: 5px 0 0;
  color: #667085;
  font-size: 0.9rem;
  line-height: 1.35;
}

.graph-chart {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  border: 1px solid #e5eaf2;
  border-radius: 14px;
  background: #f8fafc;
}

.legend-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #667085;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1.15;
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.legend-dot--consumido,
.graph-fill--consumido,
.graph-segment--consumido { background: #2f5b8e; }

.legend-dot--adeudo,
.graph-fill--adeudo,
.graph-segment--adeudo { background: #b42318; }

.legend-dot--pendiente,
.graph-fill--pendiente,
.graph-segment--pendiente { background: #d97706; }

.legend-dot--devuelto,
.graph-fill--devuelto,
.graph-segment--devuelto { background: #16a34a; }

.chart-axis {
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  gap: 8px;
  color: #667085;
  font-size: 0.78rem;
  font-weight: 800;
}

.chart-axis strong {
  text-align: center;
  color: #344054;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.chart-axis span:last-child {
  text-align: right;
}

.graph-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.graph-row {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px;
  border: 1px solid #e0e7f1;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 8px 18px rgba(31, 53, 85, 0.045);
}

.graph-row-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.graph-title-wrap {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  min-width: 0;
}

.graph-rank {
  width: 30px;
  min-width: 30px;
  height: 30px;
  display: inline-grid;
  place-items: center;
  border-radius: 11px;
  background: #eef3f9;
  color: #2f5b8e;
  font-size: 0.78rem;
  font-weight: 900;
}

.graph-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.graph-copy strong {
  color: #1f3555;
  font-size: 0.96rem;
  font-weight: 900;
  line-height: 1.18;
  overflow-wrap: anywhere;
}

.graph-copy small {
  color: #667085;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.32;
  overflow-wrap: anywhere;
}

.graph-value {
  min-width: 64px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  color: #1f3555;
}

.graph-value strong {
  font-size: 1.06rem;
  font-weight: 950;
  line-height: 1;
}

.graph-value small {
  color: #667085;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.graph-track {
  position: relative;
  width: 100%;
  height: 30px;
  border: 1px solid #dce5f0;
  border-radius: 13px;
  background:
    linear-gradient(90deg, rgba(31, 53, 85, 0.06) 1px, transparent 1px),
    #eef3f9;
  background-size: 25% 100%, auto;
  overflow: hidden;
}

.graph-fill {
  display: flex;
  height: 100%;
  min-width: 0;
  border-radius: 12px;
  overflow: hidden;
  transition: width 0.22s ease;
}

.graph-fill--total {
  background: transparent;
}

.graph-segment {
  display: block;
  height: 100%;
  min-width: 0;
}

.graph-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.breakdown-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 7px;
  border-radius: 999px;
  background: #eef3f9;
  color: #667085;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1.15;
}

.breakdown-pill b {
  color: #1f3555;
}

.breakdown-pill--consumido { background: #e8f0fa; color: #2f5b8e; }
.breakdown-pill--adeudo { background: #fef2f2; color: #b42318; }
.breakdown-pill--pendiente { background: #fff7ed; color: #c2410c; }
.breakdown-pill--devuelto { background: #ecfdf3; color: #15803d; }

.compact-graph .graph-row {
  box-shadow: none;
}



/* Cards con gráfica de barras: versión corregida y consistente con el sistema */
.insight-card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.insight-card-grid--detail {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.insight-chart-card {
  width: 100%;
  appearance: none;
  border: 1px solid #dfe6f0;
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
  box-shadow: 0 10px 22px rgba(31, 53, 85, 0.06);
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
}

.insight-chart-card:hover {
  border-color: #b8c7dc;
  box-shadow: 0 14px 28px rgba(31, 53, 85, 0.1);
}

.insight-chart-card:active {
  transform: scale(0.985);
}

.insight-chart-card--compact {
  box-shadow: none;
}

.insight-card-top {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: flex-start;
}

.insight-rank {
  width: 32px;
  min-width: 32px;
  height: 32px;
  display: inline-grid;
  place-items: center;
  border-radius: 12px;
  background: #eef3f9;
  color: #2f5b8e;
  font-size: 0.78rem;
  font-weight: 950;
  line-height: 1;
}

.insight-card-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.insight-card-copy strong {
  color: #1f3555;
  font-size: 0.96rem;
  font-weight: 950;
  line-height: 1.18;
  overflow-wrap: anywhere;
}

.insight-card-copy small {
  color: #667085;
  font-size: 0.82rem;
  font-weight: 750;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.insight-card-value {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 62px;
}

.insight-card-value strong {
  color: #1f3555;
  font-size: 1.06rem;
  font-weight: 950;
  line-height: 1;
}

.insight-card-value small {
  color: #667085;
  font-size: 0.7rem;
  font-weight: 850;
  line-height: 1.1;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.mini-bar-chart {
  padding: 10px;
  border: 1px solid #e6ebf2;
  border-radius: 16px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mini-bar-chart--detail {
  background: #f8fafc;
}

.mini-bar-line {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 8px;
  opacity: 0.72;
}

.mini-bar-line--active {
  opacity: 1;
}

.mini-bar-line span,
.mini-bar-line strong {
  color: #475467;
  font-size: 0.76rem;
  font-weight: 850;
  line-height: 1.1;
}

.mini-bar-line strong {
  color: #1f3555;
  text-align: right;
  font-weight: 950;
}

.mini-bar-track {
  width: 100%;
  height: 13px;
  border-radius: 999px;
  background: #e8edf5;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(31, 53, 85, 0.04);
}

.mini-bar-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.22s ease;
}

.mini-bar-fill--consumido { background: #2f5b8e; }
.mini-bar-fill--adeudo { background: #b42318; }
.mini-bar-fill--pendiente { background: #d97706; }
.mini-bar-fill--devuelto { background: #16a34a; }

.insight-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 2px;
}

.insight-card-footer span,
.insight-card-footer em {
  color: #667085;
  font-size: 0.78rem;
  font-weight: 850;
  line-height: 1.15;
  font-style: normal;
}

.insight-card-footer em {
  color: #2f5b8e;
}



/* Card de productos: gráfica de pastel compacta */
.product-bars-card {
  grid-column: span 1;
}

.product-card-heading {
  margin-bottom: 10px;
}

.product-pie {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-pie-chart-wrap {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.product-pie-donut {
  width: 220px;
  height: 220px;
  border-radius: 50%;
  padding: 18px;
  position: relative;
  box-shadow: inset 0 0 0 1px rgba(31, 53, 85, 0.08), 0 10px 24px rgba(31, 53, 85, 0.08);
}

.product-pie-hole {
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  z-index: 1;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(31, 53, 85, 0.05);
}

.product-pie-hole strong {
  color: #1f3555;
  font-size: 1.35rem;
  font-weight: 950;
  line-height: 1;
}

.product-pie-hole span {
  color: #667085;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.product-pie-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 260px;
  overflow: auto;
  padding-right: 4px;
}

.product-pie-legend-item {
  width: 100%;
  appearance: none;
  border: 1px solid #e4eaf3;
  border-radius: 14px;
  background: #ffffff;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  text-align: left;
  box-shadow: 0 6px 14px rgba(31, 53, 85, 0.04);
  transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.product-pie-legend-item:hover {
  border-color: #b8c7dc;
  box-shadow: 0 10px 20px rgba(31, 53, 85, 0.08);
}

.product-pie-legend-item:active {
  transform: scale(0.987);
}

.product-pie-color {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  flex: 0 0 auto;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.8);
}

.product-pie-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.product-pie-copy strong {
  color: #1f3555;
  font-size: 0.96rem;
  font-weight: 950;
  line-height: 1.18;
  overflow-wrap: anywhere;
}

.product-pie-copy small {
  color: #667085;
  font-size: 0.82rem;
  font-weight: 750;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.product-pie-legend-item em {
  color: #1f3555;
  font-style: normal;
  font-size: 0.82rem;
  font-weight: 950;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .summary-grid,
  .dashboard-graphs-grid,
  .charts-grid,
  .insight-grid,
  .filter-grid,
  .custom-range-grid,
  .detail-metrics-grid {
    grid-template-columns: 1fr 1fr;
  }

  .field-wide,
  .material-card {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .modules-label { display: none; }

  .dashboard-title { font-size: 0.95rem; }

  .page-shell {
    padding: 12px;
    gap: 12px;
  }

  .hero-card {
    flex-direction: column;
    padding: 16px;
    border-radius: 20px;
  }

  .hero-card h1 { font-size: 1.12rem; }

  .hero-actions {
    align-items: stretch;
    min-width: 0;
  }

  .last-update { text-align: left; }

  .filters-card,
  .chart-mode-card,
  .chart-card,
  .alerts-card,
  .state-card,
  .summary-card,
  .detail-section,
  .detail-hero,
  .detail-metric {
    padding: 14px;
    border-radius: 18px;
  }

  .range-segment,
  .metric-segment {
    overflow-x: auto;
    justify-content: flex-start;
  }

  .range-segment ion-segment-button,
  .metric-segment ion-segment-button {
    min-width: 76px;
  }

  .summary-grid,
  .dashboard-graphs-grid,
  .charts-grid,
  .insight-grid,
  .filter-grid,
  .custom-range-grid,
  .material-layout,
  .detail-metrics-grid {
    grid-template-columns: 1fr;
  }

  .summary-card strong { font-size: 1.25rem; }

  .donut-wrap { display: none; }

  .alert-row,
  .detail-hero,
  .mini-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .alert-values { justify-content: flex-start; }

  .insight-card-grid--detail {
    grid-template-columns: 1fr;
  }

  .insight-card-top {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .insight-card-value {
    grid-column: 1 / -1;
    align-items: flex-start;
    padding-left: 42px;
  }

  .mini-bar-line {
    grid-template-columns: 70px minmax(0, 1fr) 38px;
    gap: 7px;
  }

  .modal-footer-actions {
    grid-template-columns: 1fr;
  }

  .product-pie-chart-wrap {
    grid-template-columns: 1fr;
  }

  .product-pie-donut {
    width: min(176px, 100%);
    height: auto;
    aspect-ratio: 1 / 1;
    margin: 0 auto;
  }

  .product-pie-legend {
    max-height: 240px;
    overscroll-behavior: contain;
  }

  .product-pie-legend-item {
    padding: 8px 10px;
    gap: 8px;
  }

  .product-pie-copy strong {
    font-size: 0.88rem;
    line-height: 1.15;
  }

  .product-pie-copy small {
    font-size: 0.76rem;
    line-height: 1.25;
  }

  .product-pie-legend-item em {
    font-size: 0.76rem;
    min-width: 44px;
    text-align: right;
  }
}
</style>
