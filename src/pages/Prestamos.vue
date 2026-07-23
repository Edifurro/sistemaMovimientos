<template>
  <ion-page>
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button class="modules-trigger" @click="openModulesMenu">
            <ion-icon slot="icon-only" :icon="apps"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Préstamos</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-popover
      :is-open="isModulesMenuOpen"
      side="bottom"
      alignment="start"
      @didDismiss="isModulesMenuOpen = false"
    >
      <ion-content>
        <ion-list lines="none">
          <ion-item button @click="navigateTo('/dashboard')">
            <ion-icon slot="start" :icon="home"></ion-icon>
            <ion-label>Home</ion-label>
          </ion-item>
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
        </ion-list>
      </ion-content>
    </ion-popover>

    <ion-content class="prestamos-content">
      <div class="page-container prestamos-page">
        <section class="module-hero">
          <div class="hero-copy">
            <span class="eyebrow">Operación diaria</span>
            <h2>Préstamos</h2>
            <p>Controla préstamos diarios de Oficina, Bodega y Segundo Piso.</p>
          </div>
          <div class="hero-actions">
            <ion-button color="success" expand="block" class="hero-button" @click="openPrestamoModal()">
              <ion-icon slot="start" :icon="add"></ion-icon>
              Nuevo préstamo diario
            </ion-button>
          </div>
        </section>

        <section class="overview-grid" aria-label="Resumen de préstamos">
          <article class="overview-card overview-card--primary">
            <span class="overview-label">Abiertos</span>
            <strong>{{ prestamosSummary.abiertos }}</strong>
          </article>
          <article class="overview-card">
            <span class="overview-label">Por revisar</span>
            <strong>{{ prestamosSummary.pendientes }}</strong>
          </article>
          <article class="overview-card">
            <span class="overview-label">Cerrados</span>
            <strong>{{ prestamosSummary.cerrados }}</strong>
          </article>
          <article class="overview-card">
            <span class="overview-label">Adeudos</span>
            <strong>{{ prestamosSummary.adeudos }}</strong>
          </article>
        </section>

        <section class="toolbar-card">
          <div class="toolbar-copy">
            <h3>{{ selectedSegment === 'adeudos' ? 'Adeudos' : selectedSegment === 'hoy' ? 'Préstamos diarios' : selectedSegment === 'revision' ? 'Préstamos por revisar' : 'Préstamos cerrados' }}</h3>
            <p>{{ selectedSegment === 'adeudos' ? `${filteredAdeudos.length} adeudos` : `${filteredPrestamos.length} registros` }}</p>
          </div>

          <ion-segment class="modern-segment" v-model="selectedSegment" @ion-change="onSegmentChange" scrollable>
            <ion-segment-button value="hoy">
              <ion-label>Préstamos diarios</ion-label>
            </ion-segment-button>
            <ion-segment-button value="revision">
              <ion-label>Por revisar</ion-label>
            </ion-segment-button>
            <ion-segment-button value="cerrados">
              <ion-label>Cerrados</ion-label>
            </ion-segment-button>
            <ion-segment-button value="adeudos">
              <ion-label>Adeudos</ion-label>
            </ion-segment-button>
          </ion-segment>
        </section>

        <section class="filters-card modern-form-card">
          <div class="filters-grid">
            <ion-item v-if="selectedSegment !== 'hoy'" lines="none">
              <ion-label position="stacked">Desde</ion-label>
              <ion-input v-model="listFilters.fechaInicio" type="date" :legacy="true"></ion-input>
            </ion-item>

            <ion-item v-if="selectedSegment !== 'hoy'" lines="none">
              <ion-label position="stacked">Hasta</ion-label>
              <ion-input v-model="listFilters.fechaFin" type="date" :legacy="true"></ion-input>
            </ion-item>

            <ion-item lines="none">
              <ion-label position="stacked">Colaborador</ion-label>
              <ion-select v-model="listFilters.colaboradorId" placeholder="Todos" interface="popover">
                <ion-select-option value="">Todos</ion-select-option>
                <ion-select-option v-for="colaborador in colaboradoresFilterOptions" :key="colaborador.id" :value="colaborador.id">
                  {{ colaborador.nombre }}
                </ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item v-if="selectedSegment === 'cerrados'" lines="none">
              <ion-label position="stacked">Estado</ion-label>
              <ion-select v-model="listFilters.estado" placeholder="Todos" interface="popover">
                <ion-select-option value="">Todos</ion-select-option>
                <ion-select-option value="cerrado">Cerrado</ion-select-option>
                <ion-select-option value="cerrado_con_adeudo">Cerrado con adeudo</ion-select-option>
              </ion-select>
            </ion-item>


            <ion-item lines="none">
              <ion-label position="stacked">Área</ion-label>
              <ion-select v-model="listFilters.areaOrigen" placeholder="Todas" interface="popover">
                <ion-select-option value="">Todas</ion-select-option>
                <ion-select-option v-for="area in AREAS_TALLER" :key="area" :value="area">
                  {{ AREA_LABELS[area] }}
                </ion-select-option>
              </ion-select>
            </ion-item>

          </div>

          <ion-button expand="block" fill="outline" class="primary-action compact-action" @click="loadSegmentData">
            Aplicar filtros
          </ion-button>
        </section>

        <div v-if="error || adeudosError || formError" class="error-message">
          {{ formError || error || adeudosError }}
        </div>

        <div v-if="loading || adeudosLoading" class="loading-state modern-state">
          <ion-spinner name="circles"></ion-spinner>
          <p>Cargando...</p>
        </div>

        <template v-else>
          <section v-if="selectedSegment === 'hoy' || selectedSegment === 'revision' || selectedSegment === 'cerrados'">
            <ion-list v-if="filteredPrestamos.length" lines="none" class="prestamos-list">
              <ion-item
                v-for="prestamo in filteredPrestamos"
                :key="prestamo.id"
                button
                detail="false"
                lines="none"
                class="prestamo-card"
                @click="openPrestamoDetail(prestamo, selectedSegment === 'cerrados' ? 'readonly' : 'review')"
              >
                <div class="prestamo-card-content">
                  <div class="prestamo-topline">
                    <div class="prestamo-title-block">
                      <h3>{{ prestamo.colaboradorNombre || 'Sin colaborador' }}</h3>
                      <p>Fecha: {{ prestamo.fechaOperativa || '-' }}</p>
                    </div>
                    <div class="compact-chip-row">
                      <span class="ui-chip" :class="getPrestamoBadgeClass(prestamo)">{{ getPrestamoEstadoLabel(prestamo) }}</span>
                      <span v-if="prestamoHasAdeudo(prestamo)" class="ui-chip ui-chip--danger">Adeudo</span>
                    </div>
                  </div>

                  <div class="prestamo-work-legend" aria-label="Datos del préstamo diario">
                    <div class="work-legend-row work-legend-row--empresa">
                      <span class="work-legend-key">Tipo</span>
                      <strong class="work-legend-value">Préstamo diario</strong>
                    </div>
                    <div class="work-legend-row">
                      <span class="work-legend-key">Revisión</span>
                      <strong class="work-legend-value">{{ prestamo.estado === 'pendiente_revision' ? 'Pendiente de revisar' : 'Disponible hoy' }}</strong>
                    </div>
                    <div class="work-legend-row work-legend-row--trabajo">
                      <span class="work-legend-key">Áreas</span>
                      <strong class="work-legend-value">Oficina / Bodega / Segundo Piso</strong>
                    </div>
                  </div>

                  <div class="stock-grid prestamo-stats-grid">
                    <div class="stock-metric stock-metric--main">
                      <span>Total día</span>
                      <strong>{{ getPrestamoStats(prestamo).total }}</strong>
                    </div>
                    <div class="stock-metric">
                      <span>Productos</span>
                      <strong>{{ getPrestamoStats(prestamo).productos }}</strong>
                    </div>
                    <div class="stock-metric">
                      <span>Pendientes</span>
                      <strong>{{ getPrestamoStats(prestamo).pendiente }}</strong>
                    </div>
                    <div class="stock-metric">
                      <span>Adeudo</span>
                      <strong>{{ getPrestamoStats(prestamo).adeudo }}</strong>
                    </div>
                  </div>

                  <p class="card-footnote">Actualizado: {{ formatDate(prestamo.updatedAt || prestamo.createdAt) }}</p>
                </div>
              </ion-item>
            </ion-list>

            <div v-else class="empty-state modern-state">
              <p>{{ selectedSegment === 'hoy' ? 'No hay préstamos diarios registrados hoy.' : 'No hay registros.' }}</p>
            </div>
          </section>

          <section v-if="selectedSegment === 'adeudos'">
            <ion-list v-if="filteredAdeudos.length" lines="none" class="prestamos-list">
              <ion-item v-for="adeudo in filteredAdeudos" :key="adeudo.id" lines="none" class="prestamo-card adeudo-card">
                <div class="prestamo-card-content">
                  <div class="prestamo-topline">
                    <div class="prestamo-title-block">
                      <h3>{{ adeudo.colaboradorNombre }}</h3>
                      <p>{{ adeudo.productoNombre }} · {{ adeudo.fechaOperativa }}</p>
                      <p>Préstamo diario · Área: {{ getAreaLabel(adeudo.areaOrigen) }}</p>
                    </div>
                    <span class="ui-chip ui-chip--danger">Pendiente</span>
                  </div>

                  <div class="stock-grid adeudo-stats-grid">
                    <div class="stock-metric stock-metric--main">
                      <span>Pendiente</span>
                      <strong>{{ adeudo.cantidadPendiente }}</strong>
                    </div>
                    <div class="stock-metric">
                      <span>Adeudado</span>
                      <strong>{{ adeudo.cantidadAdeudada }}</strong>
                    </div>
                  </div>

                  <p v-if="adeudo.observaciones" class="card-footnote"><strong>Obs:</strong> {{ adeudo.observaciones }}</p>
                  <ion-button color="primary" fill="outline" class="primary-action compact-action" @click="openAdeudoModal(adeudo)">
                    Saldar
                  </ion-button>
                </div>
              </ion-item>
            </ion-list>
            <div v-else class="empty-state modern-state">
              <p>No hay adeudos.</p>
            </div>
          </section>
        </template>
      </div>
    </ion-content>

    <!-- Modal nueva entrega -->
    <ion-modal :is-open="isPrestamoModalOpen" css-class="prestamo-modal" @did-dismiss="closePrestamoModal">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>{{ prestamoModalTitle }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closePrestamoModal" class="close-modal-btn">
              <ion-icon slot="start" :icon="closeOutline"></ion-icon>
              Cerrar
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="modal-content">
        <div class="modal-form delivery-modal-form">
          <section class="form-card">
            <ion-item lines="none">
              <ion-label position="stacked">Fecha</ion-label>
              <ion-input v-model="newPrestamo.fechaOperativa" type="date" readonly :legacy="true"></ion-input>
            </ion-item>

            <ion-item lines="none">
              <ion-label position="stacked">Colaborador</ion-label>
              <ion-select v-model="newPrestamo.colaboradorId" placeholder="Selecciona colaborador" interface="popover" @ion-change="onNewPrestamoColaboradorChange">
                <ion-select-option v-for="colaborador in availableColaboradores" :key="colaborador.id" :value="colaborador.id">
                  {{ colaborador.nombre }}
                </ion-select-option>
              </ion-select>
            </ion-item>


            <ion-item lines="none" class="general-comment-input modern-textarea-field">
              <ion-label position="stacked">Comentario</ion-label>
              <ion-textarea
                v-model="newPrestamo.observaciones"
                rows="2"
                placeholder="Opcional: nota general"
                :legacy="true"
              ></ion-textarea>
            </ion-item>
          </section>

          <div v-if="selectedColaboradorAdeudos.length" class="warning-message">
            <strong>Adeudos pendientes:</strong>
            <ul>
              <li v-for="adeudo in selectedColaboradorAdeudos" :key="adeudo.id">
                {{ adeudo.productoNombre }}: {{ adeudo.cantidadPendiente }} pendiente(s)
              </li>
            </ul>
          </div>

          <section class="items-card modern-form-card cart-entry-card">
            <div class="section-heading cart-heading">
              <div>
                <h3>Carrito de préstamo diario</h3>
                <p>Agrega productos y ajusta cantidades.</p>
              </div>
              <span class="ui-chip ui-chip--muted">{{ getCartTotalItems() }} art.</span>
            </div>

            <div class="quick-area-card">
              <div class="quick-area-copy">
                <h3>Escaneo rápido</h3>
                <p>El escáner toma esta área.</p>
              </div>
              <ion-select v-model="newPrestamo.areaOrigen" interface="popover" class="quick-area-select" placeholder="Área rápida">
                <ion-select-option v-for="area in AREAS_TALLER" :key="area" :value="area">
                  {{ AREA_LABELS[area] }}
                </ion-select-option>
              </ion-select>
            </div>

            <div class="cart-actions-grid">
              <ion-button
                expand="block"
                fill="outline"
                class="primary-action scan-button cart-scan-button"
                :disabled="isScanningBarcode || isInstallingScannerModule"
                @click="openBarcodeScanner"
              >
                <ion-icon slot="start" :icon="scan"></ion-icon>
                {{ scannerButtonLabel }}
              </ion-button>

              <ion-item button detail lines="none" class="picker-trigger cart-picker-trigger" @click="openProductPicker">
                <ion-label>
                  <h3 class="picker-item-title">Buscar producto</h3>
                  <p>Toca para agregar o quitar.</p>
                </ion-label>
              </ion-item>
            </div>

            <ion-item lines="none" class="batch-scan-toggle compact-toggle">
              <ion-label>
                <h3 class="picker-item-title">Modo lote</h3>
                <p>Escaneo continuo</p>
              </ion-label>
              <ion-toggle v-model="isBatchScanMode"></ion-toggle>
            </ion-item>
            <div v-if="scannerError" class="error-message">{{ scannerError }}</div>
          </section>

          <section v-if="newPrestamo.detalles.length" class="items-card modern-form-card cart-card">
            <div class="section-heading cart-heading">
              <div>
                <h3>Carrito</h3>
                <p>Abre cada producto y ajusta sus áreas.</p>
              </div>
              <span class="ui-chip ui-chip--success">{{ cartProductGroups.length }} prod. · {{ getCartTotalItems() }} total</span>
            </div>

            <ion-accordion-group class="cart-list cart-product-accordion-group" :multiple="true">
              <ion-accordion
                v-for="group in cartProductGroups"
                :key="`cart-group-${group.productoId}`"
                :value="`cart-product-${group.productoId}`"
                class="cart-product-accordion"
              >
                <ion-item slot="header" lines="none" class="cart-product-accordion-header">
                  <ion-label class="cart-accordion-label">
                    <div class="cart-accordion-main-row">
                      <div class="prestamo-title-block">
                        <h3>{{ group.productoNombre }}</h3>
                        <p>{{ getProductCodeLabel(group.producto) }} · {{ getControlLabel(group.producto) }}</p>
                      </div>
                      <div class="cart-accordion-total" :class="{ 'cart-accordion-total--empty': group.total <= 0 }">
                        <strong>{{ group.total }}</strong>
                        <span>total</span>
                      </div>
                    </div>
                    <div class="cart-area-mini-row" aria-label="Áreas agregadas al carrito">
                      <span
                        v-for="summary in getCartGroupAreaSummaries(group)"
                        :key="`${group.productoId}-mini-${summary.area}`"
                        class="cart-area-mini-chip"
                      >
                        {{ summary.label }} {{ summary.total }}
                      </span>
                      <span v-if="!getCartGroupAreaSummaries(group).length" class="cart-area-mini-chip cart-area-mini-chip--empty">
                        Sin cant.
                      </span>
                    </div>
                  </ion-label>
                </ion-item>

                <div slot="content" class="cart-product-accordion-content">
                  <div
                    v-if="getCartGroupAreaEntries(group).length > 1"
                    class="area-switcher"
                    aria-label="Seleccionar área de stock"
                  >
                    <button
                      v-for="entry in getCartGroupAreaEntries(group)"
                      :key="`cart-switch-${getCartItemKey(entry.item)}`"
                      type="button"
                      class="area-switcher-button"
                      :class="{ 'is-active': getSelectedCartArea(group) === normalizeAreaKey(entry.item.areaOrigen) }"
                      @click="selectCartArea(group, entry.item.areaOrigen)"
                    >
                      <span>{{ getAreaLabel(entry.item.areaOrigen) }}</span>
                      <strong>{{ getCartItemTotal(entry.item) }}</strong>
                    </button>
                  </div>

                  <div
                    v-for="entry in getVisibleCartGroupAreaEntries(group)"
                    :key="getCartItemKey(entry.item)"
                    class="cart-area-direct-panel"
                    :class="{ 'has-quantity': getCartItemTotal(entry.item) > 0 }"
                  >
                    <div class="direct-area-heading">
                      <div>
                        <span class="eyebrow">Stock de origen</span>
                        <h4>{{ getAreaLabel(entry.item.areaOrigen) }}</h4>
                      </div>
                      <div class="cart-area-header-badges">
                        <span class="ui-chip ui-chip--muted">{{ getProductAreaAvailabilityShort(group.producto, entry.item.areaOrigen) }}</span>
                        <span class="ui-chip" :class="getCartItemTotal(entry.item) > 0 ? 'ui-chip--success' : 'ui-chip--muted'">
                          {{ getCartItemTotal(entry.item) }} en carrito
                        </span>
                      </div>
                    </div>

                    <div class="cart-area-accordion-content cart-area-direct-content">
                        <div class="cart-area-stock-note">
                          <span>Stock</span>
                          <strong>{{ getProductAreaAvailabilityShort(group.producto, entry.item.areaOrigen) }}</strong>
                        </div>

                        <div v-if="entry.item.categoriaControl === 'FRACCIONABLE'" class="cart-quantity-stack cart-quantity-stack--compact">
                          <div class="quantity-control-row">
                            <span>Nuevos</span>
                            <div class="cart-stepper">
                              <ion-button fill="clear" class="stepper-btn" :disabled="getCartStockLimit(entry.item, 'cantidadDesdeStockNuevo') <= 0" @click="changeCartQuantity(entry.index, 'cantidadDesdeStockNuevo', -1)"><ion-icon slot="icon-only" :icon="remove"></ion-icon></ion-button>
                              <ion-input
                                v-model.number="entry.item.cantidadDesdeStockNuevo"
                                type="text"
                                inputmode="numeric"
                                pattern="[0-9]*"
                                class="cart-quantity-input"
                                :legacy="true"
                                @ionBlur="normalizeCartItem(entry.index)"
                              ></ion-input>
                              <ion-button fill="clear" class="stepper-btn" :disabled="getCartStockLimit(entry.item, 'cantidadDesdeStockNuevo') <= 0" @click="changeCartQuantity(entry.index, 'cantidadDesdeStockNuevo', 1)"><ion-icon slot="icon-only" :icon="add"></ion-icon></ion-button>
                            </div>
                          </div>
                          <div class="quantity-control-row">
                            <span>Empezados</span>
                            <div class="cart-stepper">
                              <ion-button fill="clear" class="stepper-btn" :disabled="getCartStockLimit(entry.item, 'cantidadDesdeStockEmpezado') <= 0" @click="changeCartQuantity(entry.index, 'cantidadDesdeStockEmpezado', -1)"><ion-icon slot="icon-only" :icon="remove"></ion-icon></ion-button>
                              <ion-input
                                v-model.number="entry.item.cantidadDesdeStockEmpezado"
                                type="text"
                                inputmode="numeric"
                                pattern="[0-9]*"
                                class="cart-quantity-input"
                                :legacy="true"
                                @ionBlur="normalizeCartItem(entry.index)"
                              ></ion-input>
                              <ion-button fill="clear" class="stepper-btn" :disabled="getCartStockLimit(entry.item, 'cantidadDesdeStockEmpezado') <= 0" @click="changeCartQuantity(entry.index, 'cantidadDesdeStockEmpezado', 1)"><ion-icon slot="icon-only" :icon="add"></ion-icon></ion-button>
                            </div>
                          </div>
                        </div>

                        <div v-else class="cart-quantity-stack cart-quantity-stack--compact">
                          <div class="quantity-control-row">
                            <span>Cant.</span>
                            <div class="cart-stepper">
                              <ion-button fill="clear" class="stepper-btn" :disabled="getCartStockLimit(entry.item, 'cantidad') <= 0" @click="changeCartQuantity(entry.index, 'cantidad', -1)"><ion-icon slot="icon-only" :icon="remove"></ion-icon></ion-button>
                              <ion-input
                                v-model.number="entry.item.cantidad"
                                type="text"
                                inputmode="numeric"
                                pattern="[0-9]*"
                                class="cart-quantity-input"
                                :legacy="true"
                                @ionBlur="normalizeCartItem(entry.index)"
                              ></ion-input>
                              <ion-button fill="clear" class="stepper-btn" :disabled="getCartStockLimit(entry.item, 'cantidad') <= 0" @click="changeCartQuantity(entry.index, 'cantidad', 1)"><ion-icon slot="icon-only" :icon="add"></ion-icon></ion-button>
                            </div>
                          </div>
                        </div>

                        <ion-item lines="none" class="cart-comment-input cart-comment-input--compact">
                          <ion-label position="stacked">Comentario del área</ion-label>
                          <ion-textarea
                            v-model="entry.item.observacion"
                            rows="2"
                            placeholder="Nota opcional"
                            :legacy="true"
                          ></ion-textarea>
                        </ion-item>
                    </div>
                  </div>

                  <ion-button color="danger" fill="clear" class="remove-product-button" @click="removeProductFromCart(group.productoId)">
                    Quitar producto
                  </ion-button>
                </div>
              </ion-accordion>
            </ion-accordion-group>
          </section>

          <section v-else class="items-card modern-form-card empty-cart-card">
            <div class="modern-state compact-empty-state">
              <strong>Carrito vacío</strong>
              <p>Escanea o toca un producto para agregarlo.</p>
            </div>
          </section>

          <div v-if="formError" class="error-message">{{ formError }}</div>
        </div>
      </ion-content>
      <ion-footer class="modal-footer">
        <ion-toolbar>
          <ion-button expand="block" class="primary-action" @click="savePrestamo" :disabled="loading || !canSavePrestamo">
            {{ loading ? 'Guardando...' : prestamoSaveLabel }}
          </ion-button>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>

    <!-- Picker de productos -->
    <ion-modal :is-open="isProductPickerOpen" css-class="product-picker-modal" @did-dismiss="closeProductPicker">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>Productos</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeProductPicker" class="close-modal-btn">
              <ion-icon slot="start" :icon="closeOutline"></ion-icon>
              Cerrar
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="modal-content">
        <div class="modal-form product-picker-content picker-modal-form">
          <section class="toolbar-card picker-toolbar">
            <div class="toolbar-copy">
              <h3>Catálogo</h3>
              <p>Agrega directamente desde el área que tiene existencias.</p>
            </div>
            <ion-searchbar v-model="productSearchTerm" placeholder="Buscar nombre o código" :debounce="200" class="product-searchbar"></ion-searchbar>
          </section>

          <ion-list v-if="filteredProductsByName.length" lines="none" class="picker-list">
            <ion-item
              detail="false"
              lines="none"
              v-for="producto in filteredProductsByName"
              :key="producto.id"
              class="picker-product-card"
              :class="{ 'is-product-selected': isProductInCart(producto.id) }"
              :disabled="getProductTotalAvailableAllAreas(producto) <= 0 && !isProductInCart(producto.id)"
            >
              <div class="picker-product-content">
                <div class="prestamo-topline">
                  <div class="prestamo-title-block">
                    <h3>{{ producto.nombre }}</h3>
                    <p>{{ producto.codigoBarras || 'Sin código' }}</p>
                  </div>
                  <div class="compact-chip-row">
                    <span class="ui-chip ui-chip--muted">{{ getControlLabel(producto) }}</span>
                    <span v-if="isProductInCart(producto.id)" class="ui-chip ui-chip--success">
                      {{ getCartProductTotal(producto.id) }} en carrito
                    </span>
                  </div>
                </div>

                <div class="picker-area-actions">
                  <button
                    v-for="area in getAvailableAreasForProduct(producto)"
                    :key="`${producto.id}-${area}`"
                    type="button"
                    class="picker-area-add-button"
                    @click.stop="quickAddProductArea(producto, area)"
                  >
                    <span>
                      <strong>{{ getAvailableAreasForProduct(producto).length === 1 ? 'Agregar' : getAreaLabel(area) }}</strong>
                      <small>{{ getProductAreaAvailabilityShort(producto, area) }}</small>
                    </span>
                    <b>+1</b>
                  </button>
                </div>

                <button
                  v-if="isProductInCart(producto.id)"
                  type="button"
                  class="picker-remove-button"
                  @click.stop="removeProductFromCart(producto.id)"
                >
                  Quitar del carrito
                </button>
              </div>
            </ion-item>
          </ion-list>
          <div v-else class="empty-state modern-state">
            <p>Sin coincidencias.</p>
          </div>
        </div>
      </ion-content>
    </ion-modal>

    <!-- Modal detalle/revisión -->
    <ion-modal :is-open="isDetailModalOpen" css-class="prestamo-modal wide-modal" @did-dismiss="closeDetailModal">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>{{ isReadOnlyDetail ? 'Detalle cerrado' : 'Revisión de devoluciones' }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeDetailModal" class="close-modal-btn">
              <ion-icon slot="start" :icon="closeOutline"></ion-icon>
              Cerrar
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="modal-content">
        <div class="modal-form detail-modal-form" v-if="selectedPrestamoDetail">
          <section class="detail-hero">
            <div>
              <span class="eyebrow">{{ isReadOnlyDetail ? 'Consulta' : 'Revisión física' }}</span>
              <h3>{{ selectedPrestamoDetail.colaboradorNombre }}</h3>
              <p>Fecha: {{ selectedPrestamoDetail.fechaOperativa }} · Estado: {{ getPrestamoEstadoLabel(selectedPrestamoDetail) }}</p>
              <p v-if="selectedPrestamoDetail.observacionGeneral">Obs: {{ selectedPrestamoDetail.observacionGeneral }}</p>
              <p v-if="selectedPrestamoDetail.observacionCierre"><strong>Cierre:</strong> {{ selectedPrestamoDetail.observacionCierre }}</p>
            </div>
            <span class="ui-chip" :class="getPrestamoBadgeClass(selectedPrestamoDetail)">{{ getPrestamoEstadoLabel(selectedPrestamoDetail) }}</span>
          </section>

          <ion-accordion-group class="modern-accordion detail-product-accordion">
            <ion-accordion v-for="group in detailProductGroups" :key="group.productoId" :value="group.productoId" class="detail-product-card"
              :class="{ 'detail-product-card--resolved': getDetailGroupStats(group).pendiente <= 0 }">
              <ion-item slot="header" lines="none" class="accordion-card detail-product-header">
                <div class="accordion-header-content">
                  <div class="prestamo-topline">
                    <div class="prestamo-title-block">
                      <h3>{{ group.productoNombre }}</h3>
                      <p>{{ getDetailGroupStats(group).areas }} área(s) · Total {{ getDetailGroupStats(group).total }} · Pendiente {{ getDetailGroupStats(group).pendiente }}</p>
                    </div>
                    <span
                      class="ui-chip"
                      :class="getDetailGroupDraftPending(group) <= 0 ? 'ui-chip--success' : 'ui-chip--warning'"
                    >
                      {{ getDetailGroupDraftPending(group) <= 0 ? 'Listo' : getControlLabel(group.sample) }}
                    </span>
                  </div>

                  <div class="detail-area-chip-row">
                    <span
                      v-for="areaSummary in getDetailGroupAreaSummaries(group)"
                      :key="areaSummary.area"
                      class="ui-chip ui-chip--muted detail-area-chip"
                    >
                      {{ areaSummary.label }}: {{ areaSummary.total }}
                    </span>
                  </div>

                  <div class="stock-grid release-summary-grid detail-group-summary-grid">
                    <div class="stock-metric stock-metric--main">
                      <span>Total día</span>
                      <strong>{{ getDetailGroupStats(group).total }}</strong>
                    </div>
                    <div class="stock-metric">
                      <span>Pendiente</span>
                      <strong>{{ getDetailGroupDraftPending(group) }}</strong>
                    </div>
                    <div class="stock-metric">
                      <span>Devuelto</span>
                      <strong>{{ getDetailGroupStats(group).devueltoNuevo + getDetailGroupStats(group).devueltoEmpezado }}</strong>
                    </div>
                    <div class="stock-metric">
                      <span>Consumido</span>
                      <strong>{{ getDetailGroupStats(group).consumido }}</strong>
                    </div>
                    <div class="stock-metric">
                      <span>Adeudo</span>
                      <strong>{{ getDetailGroupStats(group).adeudo }}</strong>
                    </div>
                  </div>
                </div>
              </ion-item>

              <div slot="content" class="accordion-content detail-product-content">
                <section class="comments-box modern-form-card detail-comments-card">
                  <div class="section-heading compact-section-heading">
                    <h3>Comentarios de entrega</h3>
                    <p>{{ getComentariosEntregaPorProducto(group.productoId).length }} registro(s)</p>
                  </div>
                  <p v-if="!getComentariosEntregaPorProducto(group.productoId).length" class="card-footnote">Sin comentarios de entrega.</p>
                  <ul v-else class="clean-list">
                    <li v-for="(comentario, idx) in getComentariosEntregaPorProducto(group.productoId)" :key="idx">
                      <span>{{ formatDate(comentario.fecha) }}</span>
                      <strong>{{ getAreaLabel(comentario.areaOrigen) }} · Cant. {{ comentario.cantidad }}</strong>
                      <em>{{ comentario.observacion || 'Sin comentario' }}</em>
                    </li>
                  </ul>
                </section>

                <div
                  v-if="getDetailGroupAreaEntries(group).length > 1"
                  class="area-switcher review-area-switcher"
                  aria-label="Seleccionar área de devolución"
                >
                  <button
                    v-for="areaItem in getDetailGroupAreaEntries(group)"
                    :key="`review-switch-${getDetailKey(areaItem)}`"
                    type="button"
                    class="area-switcher-button"
                    :class="{ 'is-active': getSelectedReviewArea(group) === normalizeAreaKey(areaItem.areaOrigen) }"
                    @click="selectReviewArea(group, areaItem.areaOrigen)"
                  >
                    <span>{{ getAreaLabel(areaItem.areaOrigen) }}</span>
                    <strong>Pend. {{ getDraftPending(areaItem) }}</strong>
                  </button>
                </div>

                <section
                  v-for="item in getVisibleReviewAreaEntries(group)"
                  :key="getDetailKey(item)"
                  class="review-area-direct-panel"
                  :class="{ 'is-resolved': getDraftPending(item) <= 0 }"
                >
                  <div class="direct-area-heading review-direct-heading">
                    <div>
                      <span class="eyebrow">Stock de origen</span>
                      <h4>{{ getAreaLabel(item.areaOrigen) }}</h4>
                      <p>Nuevos <strong>{{ getDetalleStats(item).nuevos }}</strong> · Empezados <strong>{{ getDetalleStats(item).empezados }}</strong></p>
                    </div>
                    <span class="ui-chip" :class="getDraftPending(item) > 0 ? 'ui-chip--warning' : 'ui-chip--success'">
                      Pend. {{ getDraftPending(item) }}
                    </span>
                  </div>

                  <div class="area-review-content">
                      <div class="stock-grid release-summary-grid area-release-summary-grid">
                        <div class="stock-metric stock-metric--main">
                          <span>Total</span>
                          <strong>{{ getDetalleStats(item).total }}</strong>
                        </div>
                        <div class="stock-metric">
                          <span>Dev. nuevo</span>
                          <strong>{{ getDetalleStats(item).devueltoNuevo }}</strong>
                        </div>
                        <div class="stock-metric">
                          <span>Dev. empez.</span>
                          <strong>{{ getDetalleStats(item).devueltoEmpezado }}</strong>
                        </div>
                        <div class="stock-metric">
                          <span>Consumido</span>
                          <strong>{{ getDetalleStats(item).consumido }}</strong>
                        </div>
                        <div class="stock-metric">
                          <span>Adeudo</span>
                          <strong>{{ getDetalleStats(item).adeudo }}</strong>
                        </div>
                      </div>

                      <div v-if="!isReadOnlyDetail && isDetalleResolved(item)" class="resolved-review-note">
                        <strong>Producto resuelto</strong>
                        <span>Este registro ya no tiene cantidades pendientes.</span>
                      </div>

                      <div v-if="!isReadOnlyDetail && !isDetalleResolved(item)" class="return-disposition-grid">
                        <article class="return-disposition-card return-disposition-card--complete">
                          <div class="return-disposition-heading">
                            <div>
                              <h4>Devuelto completo</h4>
                              <p>Reingresa como <strong>stock completo</strong>.</p>
                            </div>
                            <span class="ui-chip return-count-chip">{{ getLiberationQuantity(item, 'cantidadDevuelta') }}</span>
                          </div>
                          <div class="release-action-content">
                            <div class="release-quantity-row">
                              <strong>Cantidad</strong>
                              <div class="release-stepper cart-stepper">
                                <ion-button fill="clear" class="stepper-btn release-stepper-btn" @click="changeLiberationQuantity(item, 'cantidadDevuelta', -1)">
                                  <ion-icon slot="icon-only" :icon="remove"></ion-icon>
                                </ion-button>
                                <ion-input
                                  v-model.number="liberationItems[getDetailKey(item)].cantidadDevuelta"
                                  type="text"
                                  inputmode="numeric"
                                  pattern="[0-9]*"
                                  class="cart-quantity-input release-quantity-input"
                                  @ionBlur="normalizeLiberationField(item, 'cantidadDevuelta')"
                                ></ion-input>
                                <ion-button fill="clear" class="stepper-btn release-stepper-btn" @click="changeLiberationQuantity(item, 'cantidadDevuelta', 1)">
                                  <ion-icon slot="icon-only" :icon="add"></ion-icon>
                                </ion-button>
                              </div>
                            </div>
                            <div class="release-comment-field">
                              <label><strong>Comentarios</strong> <span>(opcional)</span></label>
                              <ion-textarea
                                v-model="liberationItems[getDetailKey(item)].comentarioDevuelto"
                                class="release-comment-textarea"
                                rows="2"
                                aria-label="Comentario de devolución"
                                placeholder="Agrega una nota sobre la devolución"
                                :legacy="true"  
                              ></ion-textarea>
                            </div>
                          </div>
                        </article>

                        <article v-if="item.categoriaControl === 'FRACCIONABLE'" class="return-disposition-card return-disposition-card--opened">
                          <div class="return-disposition-heading">
                            <div>
                              <h4>Devuelto empezado</h4>
                              <p>Reingresa como <strong>envase abierto</strong>.</p>
                            </div>
                            <span class="ui-chip return-count-chip">{{ getLiberationQuantity(item, 'cantidadDevueltaComoEmpezado') }}</span>
                          </div>
                          <div class="release-action-content">
                            <div class="release-quantity-row">
                              <strong>Cantidad</strong>
                              <div class="release-stepper cart-stepper">
                                <ion-button fill="clear" class="stepper-btn release-stepper-btn" @click="changeLiberationQuantity(item, 'cantidadDevueltaComoEmpezado', -1)">
                                  <ion-icon slot="icon-only" :icon="remove"></ion-icon>
                                </ion-button>
                                <ion-input
                                  v-model.number="liberationItems[getDetailKey(item)].cantidadDevueltaComoEmpezado"
                                  type="text"
                                  inputmode="numeric"
                                  pattern="[0-9]*"
                                  class="cart-quantity-input release-quantity-input"
                                  @ionBlur="normalizeLiberationField(item, 'cantidadDevueltaComoEmpezado')"
                                ></ion-input>
                                <ion-button fill="clear" class="stepper-btn release-stepper-btn" @click="changeLiberationQuantity(item, 'cantidadDevueltaComoEmpezado', 1)">
                                  <ion-icon slot="icon-only" :icon="add"></ion-icon>
                                </ion-button>
                              </div>
                            </div>
                            <div class="release-comment-field">
                              <label><strong>Comentarios</strong> <span>(opcional)</span></label>
                              <ion-textarea
                                v-model="liberationItems[getDetailKey(item)].comentarioDevueltoComoEmpezado"
                                class="release-comment-textarea"
                                rows="2"
                                aria-label="Comentarios"
                                placeholder="Describe el estado del producto"
                                :legacy="true"
                              ></ion-textarea>
                            </div>
                          </div>
                        </article>

                        <article class="return-disposition-card return-disposition-card--consumed">
                          <div class="return-disposition-heading">
                            <div>
                              <h4>Consumido</h4>
                              <p>Se utilizó y <strong>no regresa a stock</strong>.</p>
                            </div>
                            <span class="ui-chip return-count-chip">{{ getLiberationQuantity(item, 'cantidadConsumida') }}</span>
                          </div>
                          <div class="release-action-content">
                            <div class="release-quantity-row">
                              <strong>Cantidad</strong>
                              <div class="release-stepper cart-stepper">
                                <ion-button fill="clear" class="stepper-btn release-stepper-btn" @click="changeLiberationQuantity(item, 'cantidadConsumida', -1)">
                                  <ion-icon slot="icon-only" :icon="remove"></ion-icon>
                                </ion-button>
                                <ion-input
                                  v-model.number="liberationItems[getDetailKey(item)].cantidadConsumida"
                                  type="text"
                                  inputmode="numeric"
                                  pattern="[0-9]*"
                                  class="cart-quantity-input release-quantity-input"
                                  @ionBlur="normalizeLiberationField(item, 'cantidadConsumida')"
                                ></ion-input>
                                <ion-button fill="clear" class="stepper-btn release-stepper-btn" @click="changeLiberationQuantity(item, 'cantidadConsumida', 1)">
                                  <ion-icon slot="icon-only" :icon="add"></ion-icon>
                                </ion-button>
                              </div>
                            </div>
                            <div class="release-comment-field">
                              <label><strong>Comentarios</strong> <span>(opcional)</span></label>
                              <ion-textarea
                                v-model="liberationItems[getDetailKey(item)].comentarioConsumo"
                                class="release-comment-textarea"
                                rows="2"
                                aria-label="Comentario de consumo"
                                placeholder="Indica cómo se utilizó el producto"
                                :legacy="true"
                              ></ion-textarea>
                            </div>
                          </div>
                        </article>
                      </div>

                  </div>
                </section>
              </div>
            </ion-accordion>
          </ion-accordion-group>

          <section v-if="isReadOnlyDetail" class="history-box modern-form-card">
            <div class="section-heading">
              <h3>Historial de liberaciones</h3>
              <p>{{ (selectedPrestamoDetail.historialLiberaciones || []).length }} movimiento(s)</p>
            </div>
            <div v-for="(lib, idx) in selectedPrestamoDetail.historialLiberaciones || []" :key="idx" class="history-entry">
              <p><strong>{{ formatDate(lib.fecha) }}</strong> · {{ lib.usuarioNombre || 'Usuario' }}</p>
              <ul class="clean-list">
                <li v-for="(detail, detailIdx) in lib.detalles || []" :key="detailIdx">
                  <span>{{ detail.productoNombre }}</span>
                  <em>Dev. nuevo {{ detail.cantidadDevuelta || 0 }} · Consumido {{ detail.cantidadConsumida || 0 }} · Dev. empezado {{ detail.cantidadDevueltaComoEmpezado || 0 }} · Adeudo {{ detail.cantidadAdeudada || 0 }}</em>
                </li>
              </ul>
            </div>
          </section>

          <section v-if="canFinalizeReview" class="closing-card modern-form-card">
            <div class="closing-ready-copy">
              <strong>Revisión lista para finalizar</strong>
              <span>Todos los artículos quedarán comprobados con esta guardada.</span>
            </div>
            <ion-item lines="none">
              <ion-label position="stacked">Observación de cierre</ion-label>
              <ion-textarea v-model="observacionCierre" rows="3" :legacy="true"></ion-textarea>
            </ion-item>
          </section>
        </div>
      </ion-content>
      <ion-footer v-if="!isReadOnlyDetail" class="modal-footer">
        <ion-toolbar>
          <div class="review-footer-actions">
            <ion-button expand="block" fill="outline" class="primary-action" @click="saveLiberacion(false)" :disabled="loading">
              {{ loading ? 'Guardando...' : 'Guardar avances' }}
            </ion-button>
            <ion-button v-if="canFinalizeReview" expand="block" color="success" class="primary-action" @click="saveLiberacion(true)" :disabled="loading">
              Guardar y finalizar
            </ion-button>
          </div>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>

    <!-- Modal saldar adeudo -->
    <ion-modal :is-open="isAdeudoModalOpen" css-class="prestamo-modal" @did-dismiss="closeAdeudoModal">
      <ion-header>
        <ion-toolbar color="primary">
          <ion-title>Saldar adeudo</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="closeAdeudoModal" class="close-modal-btn">
              <ion-icon slot="start" :icon="closeOutline"></ion-icon>
              Cerrar
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="modal-content">
        <div class="modal-form adeudo-modal-form" v-if="selectedAdeudo">
          <section class="detail-hero">
            <div>
              <span class="eyebrow">Adeudo</span>
              <h3>{{ selectedAdeudo.colaboradorNombre }}</h3>
              <p>{{ selectedAdeudo.productoNombre }} · Fecha {{ selectedAdeudo.fechaOperativa }}</p>
              <p>Préstamo diario · Área: {{ getAreaLabel(selectedAdeudo.areaOrigen) }}</p>
            </div>
            <span class="ui-chip ui-chip--danger">Pendiente {{ selectedAdeudo.cantidadPendiente }}</span>
          </section>

          <section class="form-card">
            <div class="quantity-control-row adeudo-quantity-row">
              <span>Cant. a saldar</span>
              <div class="cart-stepper adeudo-stepper">
                <ion-button fill="clear" class="stepper-btn adeudo-stepper-btn" @click="changeAdeudoQuantity(-1)">
                  <ion-icon slot="icon-only" :icon="remove"></ion-icon>
                </ion-button>
                <ion-input
                  v-model.number="adeudoForm.cantidadSaldar"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  class="cart-quantity-input adeudo-quantity-input"
                  :legacy="true"
                  @ionBlur="normalizeAdeudoQuantity"
                ></ion-input>
                <ion-button fill="clear" class="stepper-btn adeudo-stepper-btn" @click="changeAdeudoQuantity(1)">
                  <ion-icon slot="icon-only" :icon="add"></ion-icon>
                </ion-button>
              </div>
            </div>
            <ion-item lines="none">
              <ion-label position="stacked">Acción de inventario</ion-label>
              <ion-select v-model="adeudoForm.accionInventario" interface="popover">
                <ion-select-option value="SIN_MOVIMIENTO_STOCK">Sin movimiento de stock</ion-select-option>
                <ion-select-option value="REINGRESAR_STOCK">Reingresar stock</ion-select-option>
                <ion-select-option value="REINGRESAR_STOCK_EMPEZADO">Reingresar como empezado</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-label position="stacked">Observaciones *</ion-label>
              <ion-textarea v-model="adeudoForm.observaciones" rows="3" :legacy="true"></ion-textarea>
            </ion-item>
          </section>
        </div>
      </ion-content>
      <ion-footer class="modal-footer">
        <ion-toolbar>
          <ion-button expand="block" class="primary-action" @click="saveAdeudo" :disabled="adeudosLoading">
            {{ adeudosLoading ? 'Guardando...' : 'Saldar adeudo' }}
          </ion-button>
        </ion-toolbar>
      </ion-footer>
    </ion-modal>

    <ion-toast :is-open="showToast" :message="toastMessage" color="success" :duration="1800" position="top" @did-dismiss="showToast = false"></ion-toast>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning'
import { usePrestamos } from '../composables/usePrestamos'
import { useProducts } from '../composables/useProducts'
import { useColaboradores } from '../composables/useColaboradores'
import { useAdeudosProductos } from '../composables/useAdeudosProductos'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonPopover,
  IonList,
  IonItem,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonBadge,
  IonModal,
  IonFooter,
  IonSelect,
  IonSelectOption,
  IonSearchbar,
  IonTextarea,
  IonInput,
  IonToggle,
  IonToast,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonAccordionGroup,
  IonAccordion
} from '@ionic/vue'
import { add, apps, home, cube, people, swapHorizontal, scan, clipboardOutline, closeOutline, remove } from 'ionicons/icons'

const router = useRouter()
const {
  prestamos,
  prestamosSummary: prestamosCountSummary,
  loading,
  error,
  createPrestamo,
  getPrestamosSummary,
  subscribePrestamos,
  stopPrestamosListener,
  liberarPrestamoDiario,
  formatFechaOperativa,
  calcularPendienteDetalle
} = usePrestamos()
const { products, getProducts } = useProducts()
const { colaboradores, getColaboradores } = useColaboradores()
const {
  adeudosProductos,
  loading: adeudosLoading,
  error: adeudosError,
  startAdeudosPendientesListener,
  stopAdeudosPendientesListener,
  getAdeudosByColaborador,
  saldarAdeudoProducto
} = useAdeudosProductos()

const selectedSegment = ref('revision')
const isModulesMenuOpen = ref(false)
const isPrestamoModalOpen = ref(false)
const isProductPickerOpen = ref(false)
const isDetailModalOpen = ref(false)
const isAdeudoModalOpen = ref(false)
const selectedPrestamoDetail = ref(null)
const selectedDetailMode = ref('review')
const selectedAdeudo = ref(null)
const formError = ref('')
const showToast = ref(false)
const toastMessage = ref('')
const productSearchTerm = ref('')
const selectedColaboradorAdeudos = ref([])
const observacionCierre = ref('')
const liberationItems = ref({})
const selectedCartAreaByProduct = ref({})
const selectedReviewAreaByProduct = ref({})

const AREAS_TALLER = ['OFICINA', 'BODEGA', 'SEGUNDO_PISO']
const AREA_LABELS = { OFICINA: 'Oficina', BODEGA: 'Bodega', SEGUNDO_PISO: 'Segundo Piso' }
const TIPO_PRESTAMO = 'PRESTAMO'

const getCurrentMonthRange = () => {
  const today = formatFechaOperativa()
  const [year, month] = today.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return {
    fechaInicio: `${year}-${String(month).padStart(2, '0')}-01`,
    fechaFin: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  }
}

const listFilters = ref({
  ...getCurrentMonthRange(),
  colaboradorId: '',
  estado: '',
  areaOrigen: ''
})

const normalizeDateRangeFilters = () => {
  const range = getCurrentMonthRange()
  if (!listFilters.value.fechaInicio) listFilters.value.fechaInicio = range.fechaInicio
  if (!listFilters.value.fechaFin) listFilters.value.fechaFin = range.fechaFin
  if (listFilters.value.fechaInicio > listFilters.value.fechaFin) {
    const temp = listFilters.value.fechaInicio
    listFilters.value.fechaInicio = listFilters.value.fechaFin
    listFilters.value.fechaFin = temp
  }
}

const newPrestamo = ref({
  tipoOperacion: TIPO_PRESTAMO,
  colaboradorId: '',
  colaboradorNombre: '',
  fechaOperativa: formatFechaOperativa(),
  areaOrigen: 'OFICINA',
  observaciones: '',
  detalles: []
})

const itemForm = ref({
  productoId: '',
  cantidad: 0,
  cantidadDesdeStockNuevo: 0,
  cantidadDesdeStockEmpezado: 0,
  observacion: ''
})

const adeudoForm = ref({
  cantidadSaldar: 1,
  observaciones: '',
  accionInventario: 'SIN_MOVIMIENTO_STOCK'
})

const isScanningBarcode = ref(false)
const isInstallingScannerModule = ref(false)
const isBatchScanMode = ref(false)
const scannerError = ref('')
const SCANNER_TIMEOUT_MS = 15000
const DEBOUNCE_DELAY_MS = 800
const MODULE_INSTALL_TIMEOUT_MS = 20000
const MODULE_INSTALL_POLL_MS = 1000

const isReadOnlyDetail = computed(() => selectedDetailMode.value === 'readonly')
const canFinalizeReview = computed(() => {
  if (isReadOnlyDetail.value || selectedPrestamoDetail.value?.estado !== 'pendiente_revision') return false
  return (selectedPrestamoDetail.value?.detalles || []).every((item) => getDraftPending(item) <= 0)
})

const availableColaboradores = computed(() => colaboradores.value.filter((c) => c.activo !== false))
const colaboradoresFilterOptions = computed(() => [...colaboradores.value].sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')))
const availableProducts = computed(() => products.value.filter((p) => p.activo !== false && getProductTotalAvailableAllAreas(p) > 0))
const selectedProduct = computed(() => availableProducts.value.find((p) => p.id === itemForm.value.productoId) || null)

const normalizeLocalSearch = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()

const isInDateRange = (fechaOperativa) => {
  const fecha = String(fechaOperativa || '')
  if (!fecha) return false
  if (listFilters.value.fechaInicio && fecha < listFilters.value.fechaInicio) return false
  if (listFilters.value.fechaFin && fecha > listFilters.value.fechaFin) return false
  return true
}

const filteredPrestamos = computed(() => {
  let result = [...prestamos.value]
  if (selectedSegment.value !== 'hoy') {
    result = result.filter((p) => isInDateRange(p.fechaOperativa))
  }
  if (listFilters.value.colaboradorId) {
    result = result.filter((p) => p.colaboradorId === listFilters.value.colaboradorId)
  }
  if (selectedSegment.value === 'cerrados' && listFilters.value.estado) {
    result = result.filter((p) => p.estado === listFilters.value.estado)
  }
  if (listFilters.value.areaOrigen) {
    result = result.filter((p) => (p.detalles || []).some((d) => normalizeAreaKey(d.areaOrigen) === normalizeAreaKey(listFilters.value.areaOrigen)))
  }
  return result
})

const filteredAdeudos = computed(() => {
  let result = [...adeudosProductos.value]
  result = result.filter((adeudo) => isInDateRange(adeudo.fechaOperativa))
  if (listFilters.value.colaboradorId) {
    result = result.filter((adeudo) => adeudo.colaboradorId === listFilters.value.colaboradorId)
  }
  if (listFilters.value.areaOrigen) {
    result = result.filter((adeudo) => normalizeAreaKey(adeudo.areaOrigen) === normalizeAreaKey(listFilters.value.areaOrigen))
  }
  return result
})

const filteredProductsByName = computed(() => {
  const term = productSearchTerm.value.trim().toLowerCase()
  if (!term) return availableProducts.value
  return availableProducts.value.filter((p) => {
    const nombre = String(p.nombre || '').toLowerCase()
    const codigo = String(p.codigoBarras || p.codigo || '').toLowerCase()
    return nombre.includes(term) || codigo.includes(term)
  })
})

const selectedProductLabel = computed(() => {
  const producto = selectedProduct.value
  if (!producto) return 'Selecciona producto'
  return `${producto.nombre} · ${getProductStockLabel(producto, newPrestamo.value.areaOrigen)}`
})

const prestamoModalTitle = computed(() => 'Nuevo préstamo diario')
const prestamoSaveLabel = computed(() => 'Guardar préstamo diario')

const scannerButtonLabel = computed(() => {
  if (isInstallingScannerModule.value) return 'Instalando modulo de escaneo...'
  if (isScanningBarcode.value) return isBatchScanMode.value ? 'Escaneando en modo lote...' : 'Abriendo camara...'
  return isBatchScanMode.value ? 'Iniciar escaneo en lote' : 'Escanear codigo de barras'
})

const canAddItem = computed(() => {
  const producto = selectedProduct.value
  if (!producto) return false
  if (producto.categoriaControl === 'FRACCIONABLE') {
    const nuevo = Number(itemForm.value.cantidadDesdeStockNuevo || 0)
    const empezado = Number(itemForm.value.cantidadDesdeStockEmpezado || 0)
    return Number.isInteger(nuevo) && Number.isInteger(empezado) && nuevo >= 0 && empezado >= 0 &&
      nuevo + empezado > 0 && nuevo <= Number(getProductStockByArea(producto, newPrestamo.value.areaOrigen).stock || 0) && empezado <= Number(getProductStockByArea(producto, newPrestamo.value.areaOrigen).stockEmpezado || 0)
  }
  const cantidad = Number(itemForm.value.cantidad)
  return Number.isInteger(cantidad) && cantidad > 0 && cantidad <= Number(getProductStockByArea(producto, newPrestamo.value.areaOrigen).stock || 0)
})

const canSavePrestamo = computed(() => Boolean(newPrestamo.value.colaboradorId) && newPrestamo.value.detalles.some((item) => getCartItemTotal(item) > 0))

const normalizeAreaKey = (value) => {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '_')
  if (raw === 'SEGUNDO_PISO' || raw === 'SEGUNDOPISO') return 'SEGUNDO_PISO'
  if (raw === 'BODEGA') return 'BODEGA'
  return 'OFICINA'
}

const getAreaLabel = (area) => AREA_LABELS[normalizeAreaKey(area)] || 'Oficina'
const getTipoOperacionLabel = () => 'Préstamo diario'

const createEmptyStockPorArea = () => AREAS_TALLER.reduce((acc, area) => {
  acc[area] = { stock: 0, stockEmpezado: 0 }
  return acc
}, {})

const normalizeStockPorAreaLocal = (producto = {}) => {
  const stockPorArea = createEmptyStockPorArea()
  if (producto.stockPorArea && typeof producto.stockPorArea === 'object') {
    Object.entries(producto.stockPorArea).forEach(([rawArea, data]) => {
      const area = normalizeAreaKey(rawArea)
      stockPorArea[area] = {
        stock: Number(data?.stock || 0),
        stockEmpezado: producto.categoriaControl === 'FRACCIONABLE' ? Number(data?.stockEmpezado || 0) : 0
      }
    })
  } else {
    stockPorArea.OFICINA = {
      stock: Number(producto.stock || 0),
      stockEmpezado: producto.categoriaControl === 'FRACCIONABLE' ? Number(producto.stockEmpezado || 0) : 0
    }
  }
  return stockPorArea
}

const getProductStockByArea = (producto, area = 'OFICINA') => normalizeStockPorAreaLocal(producto)[normalizeAreaKey(area)] || { stock: 0, stockEmpezado: 0 }
const getProductAvailableInArea = (producto, area = 'OFICINA') => {
  const areaStock = getProductStockByArea(producto, area)
  return Number(areaStock.stock || 0) + Number(areaStock.stockEmpezado || 0)
}

const getProductTotalAvailableAllAreas = (producto) => {
  return AREAS_TALLER.reduce((sum, area) => sum + getProductAvailableInArea(producto, area), 0)
}

const getAvailableAreasForProduct = (producto) => {
  return AREAS_TALLER.filter((area) => getProductAvailableInArea(producto, area) > 0)
}

const getPreferredAreaForProduct = (producto, preferredArea = newPrestamo.value.areaOrigen) => {
  const preferred = normalizeAreaKey(preferredArea)
  if (getProductAvailableInArea(producto, preferred) > 0) return preferred
  return getAvailableAreasForProduct(producto)[0] || preferred
}

const getProductStockLabel = (producto, area = 'OFICINA') => {
  const areaStock = getProductStockByArea(producto, area)
  if (producto.categoriaControl === 'FRACCIONABLE') {
    return `Nuevos: ${areaStock.stock || 0} · Empezados: ${areaStock.stockEmpezado || 0}`
  }
  return `Stock actual: ${areaStock.stock || 0}`
}

const getProductAreaAvailabilityShort = (producto, area) => {
  const areaStock = getProductStockByArea(producto, area)
  if (producto?.categoriaControl === 'FRACCIONABLE') {
    return `Nuevos ${Number(areaStock.stock || 0)} · Emp. ${Number(areaStock.stockEmpezado || 0)}`
  }
  return `${Number(areaStock.stock || 0)} stock`
}


const getControlLabel = (item) => {
  const categoria = String(item?.categoriaControl || 'UNIDAD').toUpperCase()
  if (categoria === 'HERRAMIENTA') return 'Herramienta'
  if (categoria === 'FRACCIONABLE') return 'En envase'
  return 'Por pieza'
}

const getStockEnArea = (producto, area = newPrestamo.value.areaOrigen) => getProductAvailableInArea(producto, area)

const getStockStatusLabel = (producto) => getProductTotalAvailableAllAreas(producto) > 0 ? 'Con stock' : 'Sin stock'
const getStockStatusClass = (producto) => getProductTotalAvailableAllAreas(producto) > 0 ? 'ui-chip--success' : 'ui-chip--danger'

const getProductByCartItem = (item) => {
  return products.value.find((producto) => producto.id === item.productoId) || null
}

const getProductCodeLabel = (item) => {
  const producto = getProductByCartItem(item) || item
  const codigo = producto?.codigoBarras || producto?.codigo
  return codigo ? `Código: ${codigo}` : 'Sin código'
}

const getCartItemKey = (item) => `${item.productoId}_${normalizeAreaKey(item.areaOrigen)}`
const getDetailKey = (item) => `${item.productoId}_${normalizeAreaKey(item.areaOrigen)}`

const getCartProductTotal = (productoId) => {
  return newPrestamo.value.detalles
    .filter((detail) => detail.productoId === productoId)
    .reduce((sum, item) => sum + getCartItemTotal(item), 0)
}

const getCartProductTotalInArea = (productoId, area) => {
  const normalizedArea = normalizeAreaKey(area)
  return newPrestamo.value.detalles
    .filter((detail) => detail.productoId === productoId && normalizeAreaKey(detail.areaOrigen) === normalizedArea)
    .reduce((sum, item) => sum + getCartItemTotal(item), 0)
}

const isProductInCart = (productoId) => {
  return newPrestamo.value.detalles.some((detail) => detail.productoId === productoId)
}

const shouldShowCartAreaEntry = (group, entry) => {
  const item = entry?.item
  if (!item) return false
  const producto = group?.producto || getProductByCartItem(item) || item
  const area = normalizeAreaKey(item.areaOrigen)
  return getCartItemTotal(item) > 0 || getProductAvailableInArea(producto, area) > 0
}

const getCartGroupAreaEntries = (group) => {
  return [...(group?.items || [])]
    .filter((entry) => shouldShowCartAreaEntry(group, entry))
    .sort((a, b) => AREAS_TALLER.indexOf(normalizeAreaKey(a.item.areaOrigen)) - AREAS_TALLER.indexOf(normalizeAreaKey(b.item.areaOrigen)))
}

const getSelectedCartArea = (group) => {
  const entries = getCartGroupAreaEntries(group)
  const selected = normalizeAreaKey(selectedCartAreaByProduct.value[group?.productoId])
  return entries.some((entry) => normalizeAreaKey(entry.item.areaOrigen) === selected)
    ? selected
    : normalizeAreaKey(entries[0]?.item?.areaOrigen)
}

const selectCartArea = (group, area) => {
  if (!group?.productoId) return
  selectedCartAreaByProduct.value[group.productoId] = normalizeAreaKey(area)
}

const getVisibleCartGroupAreaEntries = (group) => {
  const entries = getCartGroupAreaEntries(group)
  if (entries.length <= 1) return entries
  const selected = getSelectedCartArea(group)
  return entries.filter((entry) => normalizeAreaKey(entry.item.areaOrigen) === selected)
}

const getCartGroupAreaSummaries = (group) => {
  if (!group?.items?.length) return []
  return group.items
    .map(({ item }) => {
      const area = normalizeAreaKey(item.areaOrigen)
      return {
        area,
        label: getAreaLabel(area),
        total: getCartItemTotal(item)
      }
    })
    .filter((summary) => summary.total > 0)
}

const getCartItemTotal = (item) => {
  if (!item) return 0
  if (item.categoriaControl === 'FRACCIONABLE') {
    return Number(item.cantidadDesdeStockNuevo || 0) + Number(item.cantidadDesdeStockEmpezado || 0)
  }
  return Number(item.cantidad || 0)
}

const getCartTotalItems = () => {
  return newPrestamo.value.detalles.reduce((sum, item) => sum + getCartItemTotal(item), 0)
}

const cartProductGroups = computed(() => {
  const groups = new Map()
  newPrestamo.value.detalles.forEach((item, index) => {
    const productoId = item.productoId || `sin-producto-${index}`
    if (!groups.has(productoId)) {
      const producto = getProductByCartItem(item) || item
      groups.set(productoId, {
        productoId,
        producto,
        productoNombre: item.productoNombre || item.nombre || producto?.nombre || 'Producto',
        items: [],
        total: 0
      })
    }
    const group = groups.get(productoId)
    group.items.push({ item, index })
    group.total += getCartItemTotal(item)
  })
  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => AREAS_TALLER.indexOf(normalizeAreaKey(a.item.areaOrigen)) - AREAS_TALLER.indexOf(normalizeAreaKey(b.item.areaOrigen)))
    }))
    .sort((a, b) => String(a.productoNombre).localeCompare(String(b.productoNombre), 'es'))
})

const getCartStockLimit = (item, field = 'total') => {
  const producto = getProductByCartItem(item) || item
  if (item?.categoriaControl === 'FRACCIONABLE') {
    if (field === 'cantidadDesdeStockNuevo') return Number(getProductStockByArea(producto, item.areaOrigen || newPrestamo.value.areaOrigen).stock || 0)
    if (field === 'cantidadDesdeStockEmpezado') return Number(getProductStockByArea(producto, item.areaOrigen || newPrestamo.value.areaOrigen).stockEmpezado || 0)
    return getProductAvailableInArea(producto, item.areaOrigen || newPrestamo.value.areaOrigen)
  }
  return Number(getProductStockByArea(producto, item?.areaOrigen || newPrestamo.value.areaOrigen).stock || 0)
}

const clampInteger = (value, min, max) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.min(max, Math.max(min, Math.trunc(number)))
}

const normalizeCartItem = (index) => {
  const item = newPrestamo.value.detalles[index]
  if (!item) return

  if (item.categoriaControl === 'FRACCIONABLE') {
    item.cantidadDesdeStockNuevo = clampInteger(item.cantidadDesdeStockNuevo, 0, getCartStockLimit(item, 'cantidadDesdeStockNuevo'))
    item.cantidadDesdeStockEmpezado = clampInteger(item.cantidadDesdeStockEmpezado, 0, getCartStockLimit(item, 'cantidadDesdeStockEmpezado'))
    item.cantidad = Number(item.cantidadDesdeStockNuevo || 0) + Number(item.cantidadDesdeStockEmpezado || 0)
    return
  }

  item.cantidad = clampInteger(item.cantidad, 0, getCartStockLimit(item, 'cantidad'))
  item.cantidadDesdeStockNuevo = Number(item.cantidad || 0)
  item.cantidadDesdeStockEmpezado = 0
}

const changeCartQuantity = (index, field, delta) => {
  const item = newPrestamo.value.detalles[index]
  if (!item) return
  item[field] = Number(item[field] || 0) + Number(delta || 0)
  normalizeCartItem(index)
}

const createCartItemFromProduct = (producto, area = newPrestamo.value.areaOrigen) => {
  const areaKey = normalizeAreaKey(area)
  return {
    productoId: producto.id,
    productoNombre: producto.nombre,
    nombre: producto.nombre,
    tipo: producto.tipo,
    categoriaControl: producto.categoriaControl || 'UNIDAD',
    areaOrigen: areaKey,
    areaOrigenLabel: getAreaLabel(areaKey),
    cantidad: 0,
    cantidadDesdeStockNuevo: 0,
    cantidadDesdeStockEmpezado: 0,
    observacion: ''
  }
}

const ensureProductInCart = (producto) => {
  if (!producto?.id) return
  const availableAreas = getAvailableAreasForProduct(producto)
  availableAreas.forEach((area) => {
    if (findCartItemIndex(producto.id, area) < 0) {
      newPrestamo.value.detalles.push(createCartItemFromProduct(producto, area))
    }
  })
}

const removeProductFromCart = (productoOrId) => {
  const productoId = typeof productoOrId === 'object' ? productoOrId?.id : productoOrId
  if (!productoId) return
  newPrestamo.value.detalles = newPrestamo.value.detalles.filter((item) => item.productoId !== productoId)
}

const toggleProductInCart = (producto) => {
  formError.value = ''
  scannerError.value = ''
  if (!producto?.id) return

  if (isProductInCart(producto.id)) {
    removeProductFromCart(producto.id)
    return
  }

  if (getProductTotalAvailableAllAreas(producto) <= 0) {
    const message = `${producto.nombre} no tiene stock disponible en ninguna área.`
    formError.value = message
    scannerError.value = message
    return
  }

  ensureProductInCart(producto)
}

const quickAddProductArea = (producto, area) => {
  const areaKey = normalizeAreaKey(area)
  const added = addProductToCart(producto, areaKey, { allowFallback: false })
  if (added) selectedCartAreaByProduct.value[producto.id] = areaKey
}

const findCartItemIndex = (productoId, area) => {
  const areaKey = normalizeAreaKey(area)
  return newPrestamo.value.detalles.findIndex((item) => item.productoId === productoId && normalizeAreaKey(item.areaOrigen) === areaKey)
}

const mergeCartDuplicates = (targetIndex) => {
  const target = newPrestamo.value.detalles[targetIndex]
  if (!target) return targetIndex
  const areaKey = normalizeAreaKey(target.areaOrigen)
  const duplicateIndex = newPrestamo.value.detalles.findIndex((item, index) =>
    index !== targetIndex && item.productoId === target.productoId && normalizeAreaKey(item.areaOrigen) === areaKey
  )
  if (duplicateIndex < 0) return targetIndex

  const duplicate = newPrestamo.value.detalles[duplicateIndex]
  if (target.categoriaControl === 'FRACCIONABLE') {
    duplicate.cantidadDesdeStockNuevo = Number(duplicate.cantidadDesdeStockNuevo || 0) + Number(target.cantidadDesdeStockNuevo || 0)
    duplicate.cantidadDesdeStockEmpezado = Number(duplicate.cantidadDesdeStockEmpezado || 0) + Number(target.cantidadDesdeStockEmpezado || 0)
  } else {
    duplicate.cantidad = Number(duplicate.cantidad || 0) + Number(target.cantidad || 0)
  }
  duplicate.observacion = [duplicate.observacion, target.observacion].filter(Boolean).join(' | ')
  newPrestamo.value.detalles.splice(targetIndex, 1)
  const nextIndex = newPrestamo.value.detalles.indexOf(duplicate)
  normalizeCartItem(nextIndex)
  return nextIndex
}

const onCartItemAreaChange = (index) => {
  const item = newPrestamo.value.detalles[index]
  if (!item) return
  item.areaOrigen = normalizeAreaKey(item.areaOrigen)
  item.areaOrigenLabel = getAreaLabel(item.areaOrigen)
  const nextIndex = mergeCartDuplicates(index)
  normalizeCartItem(nextIndex)
}

const addProductToCart = (producto, area = newPrestamo.value.areaOrigen, options = {}) => {
  formError.value = ''
  scannerError.value = ''
  if (!producto) return false

  const allowFallback = options.allowFallback !== false
  const preferredArea = normalizeAreaKey(area)
  const areaToUse = allowFallback ? getPreferredAreaForProduct(producto, preferredArea) : preferredArea

  if (getProductAvailableInArea(producto, areaToUse) <= 0) {
    const availableAreas = getAvailableAreasForProduct(producto).map(getAreaLabel).join(', ')
    const message = availableAreas
      ? `${producto.nombre} no tiene stock en ${getAreaLabel(areaToUse)}. Disponible en: ${availableAreas}.`
      : `${producto.nombre} no tiene stock disponible en ninguna área.`
    formError.value = message
    scannerError.value = message
    return false
  }

  ensureProductInCart(producto)
  let index = findCartItemIndex(producto.id, areaToUse)
  if (index < 0) {
    newPrestamo.value.detalles.push(createCartItemFromProduct(producto, areaToUse))
    index = newPrestamo.value.detalles.length - 1
  }

  const item = newPrestamo.value.detalles[index]
  let added = false

  if (producto.categoriaControl === 'FRACCIONABLE') {
    const nuevoActual = Number(item.cantidadDesdeStockNuevo || 0)
    const empezadoActual = Number(item.cantidadDesdeStockEmpezado || 0)
    const stockNuevo = Number(getProductStockByArea(producto, areaToUse).stock || 0)
    const stockEmpezado = Number(getProductStockByArea(producto, areaToUse).stockEmpezado || 0)

    if (nuevoActual < stockNuevo) {
      item.cantidadDesdeStockNuevo = nuevoActual + 1
      added = true
    } else if (empezadoActual < stockEmpezado) {
      item.cantidadDesdeStockEmpezado = empezadoActual + 1
      added = true
    }
  } else {
    const cantidadActual = Number(item.cantidad || 0)
    const stock = Number(getProductStockByArea(producto, areaToUse).stock || 0)
    if (cantidadActual < stock) {
      item.cantidad = cantidadActual + 1
      added = true
    }
  }

  normalizeCartItem(index)

  if (!added) {
    const message = `No hay más stock en ${getAreaLabel(areaToUse)} para ${producto.nombre}.`
    formError.value = message
    scannerError.value = message
    return false
  }

  return true
}

const getPrestamoStats = (prestamo) => {
  const detalles = prestamo?.detalles || []
  return {
    productos: detalles.length,
    total: detalles.reduce((sum, item) => sum + Number(item.cantidad || 0), 0),
    pendiente: detalles.reduce((sum, item) => sum + getCantidadPendiente(item), 0),
    adeudo: detalles.reduce((sum, item) => sum + Number(item.cantidadAdeudada || 0), 0)
  }
}

const getDetalleStats = (item) => ({
  total: Number(item?.cantidad || 0),
  pendiente: getCantidadPendiente(item || {}),
  devueltoNuevo: Number(item?.cantidadDevuelta || 0),
  devueltoEmpezado: Number(item?.cantidadDevueltaComoEmpezado || 0),
  consumido: Number(item?.cantidadConsumida || 0),
  adeudo: Number(item?.cantidadAdeudada || 0),
  nuevos: Number(item?.cantidadDesdeStockNuevo || 0),
  empezados: Number(item?.cantidadDesdeStockEmpezado || 0)
})

const isDetalleResolved = (item) => getDetalleStats(item).pendiente <= 0
const getResolvedSortWeight = (item) => isDetalleResolved(item) ? 1 : 0

const detailProductGroups = computed(() => {
  const detalles = selectedPrestamoDetail.value?.detalles || []
  const groups = new Map()

  detalles.forEach((item, index) => {
    const productoId = item.productoId || `sin-producto-${index}`
    if (!groups.has(productoId)) {
      groups.set(productoId, {
        productoId,
        productoNombre: item.productoNombre || item.nombre || 'Producto',
        sample: item,
        items: []
      })
    }
    groups.get(productoId).items.push(item)
  })

  return Array.from(groups.values())
    .map((group) => {
      const stats = getDetailGroupStats(group)
      return {
        ...group,
        stats,
        resolved: stats.pendiente <= 0,
        items: group.items.sort((a, b) => {
          const resolvedDiff = getResolvedSortWeight(a) - getResolvedSortWeight(b)
          if (resolvedDiff) return resolvedDiff
          return AREAS_TALLER.indexOf(normalizeAreaKey(a.areaOrigen)) - AREAS_TALLER.indexOf(normalizeAreaKey(b.areaOrigen))
        })
      }
    })
    .sort((a, b) => {
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1
      return String(a.productoNombre).localeCompare(String(b.productoNombre), 'es')
    })
})

const getDetailGroupAreaEntries = (group) => [...(group?.items || [])]
  .sort((a, b) => {
    const resolvedDiff = getResolvedSortWeight(a) - getResolvedSortWeight(b)
    if (resolvedDiff) return resolvedDiff
    return AREAS_TALLER.indexOf(normalizeAreaKey(a.areaOrigen)) - AREAS_TALLER.indexOf(normalizeAreaKey(b.areaOrigen))
  })

const getSelectedReviewArea = (group) => {
  const entries = getDetailGroupAreaEntries(group)
  const selected = normalizeAreaKey(selectedReviewAreaByProduct.value[group?.productoId])
  return entries.some((item) => normalizeAreaKey(item.areaOrigen) === selected)
    ? selected
    : normalizeAreaKey(entries[0]?.areaOrigen)
}

const selectReviewArea = (group, area) => {
  if (!group?.productoId) return
  selectedReviewAreaByProduct.value[group.productoId] = normalizeAreaKey(area)
}

const getVisibleReviewAreaEntries = (group) => {
  const entries = getDetailGroupAreaEntries(group)
  if (entries.length <= 1) return entries
  const selected = getSelectedReviewArea(group)
  return entries.filter((item) => normalizeAreaKey(item.areaOrigen) === selected)
}

const getDetailGroupStats = (group) => {
  const items = group?.items || []
  return items.reduce((acc, item) => {
    const stats = getDetalleStats(item)
    acc.areas += 1
    acc.total += stats.total
    acc.pendiente += stats.pendiente
    acc.devueltoNuevo += stats.devueltoNuevo
    acc.devueltoEmpezado += stats.devueltoEmpezado
    acc.consumido += stats.consumido
    acc.adeudo += stats.adeudo
    acc.nuevos += stats.nuevos
    acc.empezados += stats.empezados
    return acc
  }, {
    areas: 0,
    total: 0,
    pendiente: 0,
    devueltoNuevo: 0,
    devueltoEmpezado: 0,
    consumido: 0,
    adeudo: 0,
    nuevos: 0,
    empezados: 0
  })
}

const getDetailGroupDraftPending = (group) => (group?.items || [])
  .reduce((sum, item) => sum + getDraftPending(item), 0)

const getDetailGroupAreaSummaries = (group) => getDetailGroupAreaEntries(group)
  .map((item) => ({
    area: normalizeAreaKey(item.areaOrigen),
    label: getAreaLabel(item.areaOrigen),
    total: getDetalleStats(item).total,
    pendiente: getDetalleStats(item).pendiente
  }))
  .filter((summary) => summary.total > 0 || summary.pendiente > 0)

const prestamosSummary = computed(() => {
  const adeudos = adeudosProductos.value.reduce((sum, adeudo) => sum + Number(adeudo.cantidadPendiente || 0), 0)
  return { ...prestamosCountSummary.value, adeudos }
})

const getCantidadPendiente = (item) => calcularPendienteDetalle(item)

const getSelectedPrestamoPendingTotal = () => (selectedPrestamoDetail.value?.detalles || [])
  .reduce((sum, item) => sum + getCantidadPendiente(item), 0)

const liberationQuantityFields = [
  'cantidadDevuelta',
  'cantidadConsumida',
  'cantidadDevueltaComoEmpezado'
]

const getLiberationData = (itemOrKey) => liberationItems.value[typeof itemOrKey === 'string' ? itemOrKey : getDetailKey(itemOrKey)] || {}

const getLiberationQuantity = (itemOrKey, field) => Number(getLiberationData(itemOrKey)[field] || 0)

const getDraftAllocated = (item) => liberationQuantityFields.reduce(
  (sum, field) => sum + getLiberationQuantity(item, field),
  0
)

const getDraftPending = (item) => Math.max(0, getCantidadPendiente(item) - getDraftAllocated(item))

const getLiberationFieldLimit = (item, field) => {
  const data = getLiberationData(item)
  const pendiente = Number(getCantidadPendiente(item || {}) || 0)
  const usedByOtherFields = liberationQuantityFields
    .filter((key) => key !== field)
    .reduce((sum, key) => sum + Number(data[key] || 0), 0)
  return Math.max(0, pendiente - usedByOtherFields)
}

const normalizeLiberationField = (item, field) => {
  const key = getDetailKey(item || {})
  if (!item?.productoId || !liberationItems.value[key]) return
  liberationItems.value[key][field] = clampInteger(
    liberationItems.value[key][field],
    0,
    getLiberationFieldLimit(item, field)
  )
}

const changeLiberationQuantity = (item, field, delta) => {
  const key = getDetailKey(item || {})
  if (!item?.productoId || !liberationItems.value[key]) return
  liberationItems.value[key][field] = Number(liberationItems.value[key][field] || 0) + Number(delta || 0)
  normalizeLiberationField(item, field)
}

const normalizeAdeudoQuantity = () => {
  const max = Number(selectedAdeudo.value?.cantidadPendiente || 1)
  adeudoForm.value.cantidadSaldar = clampInteger(adeudoForm.value.cantidadSaldar, 1, Math.max(1, max))
}

const changeAdeudoQuantity = (delta) => {
  adeudoForm.value.cantidadSaldar = Number(adeudoForm.value.cantidadSaldar || 0) + Number(delta || 0)
  normalizeAdeudoQuantity()
}
const prestamoHasAdeudo = (prestamo) => (prestamo.detalles || []).some((item) => Number(item.cantidadAdeudada || 0) > 0) || prestamo.estado === 'cerrado_con_adeudo'

const getPrestamoResumen = (prestamo) => {
  const detalles = prestamo.detalles || []
  const productos = detalles.length
  const pendiente = detalles.reduce((sum, item) => sum + getCantidadPendiente(item), 0)
  const adeudado = detalles.reduce((sum, item) => sum + Number(item.cantidadAdeudada || 0), 0)
  return `${productos} producto(s) · ${pendiente} unidad(es) pendientes · ${adeudado} adeudadas`
}

const getPrestamoEstadoLabel = (prestamo) => {
  if (prestamo?.estado === 'pendiente_revision') return 'Por revisar'
  if (prestamo?.estado === 'cerrado_con_adeudo') return 'Cerrado con adeudo'
  if (prestamo?.estado === 'cerrado') return 'Cerrado'
  return 'Abierto'
}

const getPrestamoBadgeClass = (prestamo) => {
  if (prestamo.estado === 'cerrado_con_adeudo') return 'prestamo-badge--vencido'
  if (prestamo.estado === 'cerrado') return 'prestamo-badge--devuelto'
  if (prestamo.estado === 'pendiente_revision') return 'prestamo-badge--revision'
  return 'prestamo-badge--activo'
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.toLocaleDateString('es-MX')} ${date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
}

const openModulesMenu = () => { isModulesMenuOpen.value = true }
const navigateTo = async (path) => {
  isModulesMenuOpen.value = false
  await router.push(path)
}

const resetPrestamoForm = () => {
  formError.value = ''
  scannerError.value = ''
  productSearchTerm.value = ''
  itemForm.value = { productoId: '', cantidad: 0, cantidadDesdeStockNuevo: 0, cantidadDesdeStockEmpezado: 0, observacion: '' }
  newPrestamo.value = { tipoOperacion: TIPO_PRESTAMO, colaboradorId: '', colaboradorNombre: '', fechaOperativa: formatFechaOperativa(), areaOrigen: 'OFICINA', observaciones: '', detalles: [] }
  selectedColaboradorAdeudos.value = []
  selectedCartAreaByProduct.value = {}
}

const openPrestamoModal = () => {
  resetPrestamoForm()
  newPrestamo.value.tipoOperacion = TIPO_PRESTAMO
  newPrestamo.value.fechaOperativa = formatFechaOperativa()
  newPrestamo.value.areaOrigen = 'OFICINA'
  isPrestamoModalOpen.value = true
}
const closePrestamoModal = () => { isPrestamoModalOpen.value = false; resetPrestamoForm() }
const openProductPicker = () => { productSearchTerm.value = ''; isProductPickerOpen.value = true }
const closeProductPicker = () => { isProductPickerOpen.value = false }
const selectProduct = (id) => {
  itemForm.value.productoId = id
  const product = selectedProduct.value
  if (product?.categoriaControl === 'FRACCIONABLE') {
    itemForm.value.cantidad = 0
    itemForm.value.cantidadDesdeStockNuevo = 0
    itemForm.value.cantidadDesdeStockEmpezado = 0
  } else {
    itemForm.value.cantidad = 0
    itemForm.value.cantidadDesdeStockNuevo = 0
    itemForm.value.cantidadDesdeStockEmpezado = 0
  }
  isProductPickerOpen.value = false
}

const onNewPrestamoColaboradorChange = async () => {
  const colaborador = availableColaboradores.value.find((c) => c.id === newPrestamo.value.colaboradorId)
  newPrestamo.value.colaboradorNombre = colaborador?.nombre || ''
  if (newPrestamo.value.colaboradorId) {
    try {
      selectedColaboradorAdeudos.value = await getAdeudosByColaborador(newPrestamo.value.colaboradorId)
    } catch {
      selectedColaboradorAdeudos.value = []
    }
  }
}

const addItemToPrestamo = () => {
  const producto = selectedProduct.value
  if (producto) addProductToCart(producto)
}

const removeItemFromPrestamo = (index) => {
  newPrestamo.value.detalles.splice(index, 1)
}


const savePrestamo = async () => {
  formError.value = ''
  if (!canSavePrestamo.value) {
    formError.value = 'Selecciona colaborador y agrega al menos un producto con cantidad mayor a 0.'
    return
  }
  try {
    newPrestamo.value.detalles.forEach((_, index) => normalizeCartItem(index))
    const detallesValidos = newPrestamo.value.detalles.filter((item) => getCartItemTotal(item) > 0)
    const colaborador = availableColaboradores.value.find((c) => c.id === newPrestamo.value.colaboradorId)
    await createPrestamo({
      ...newPrestamo.value,
      detalles: detallesValidos,
      colaboradorNombre: colaborador?.nombre || newPrestamo.value.colaboradorNombre
    })
    toastMessage.value = 'Préstamo diario guardado correctamente.'
    showToast.value = true
    closePrestamoModal()
    await refreshAll()
  } catch (err) {
    formError.value = err?.message || 'No se pudo guardar el registro.'
  }
}

const openPrestamoDetail = (prestamo, mode = 'review') => {
  selectedPrestamoDetail.value = JSON.parse(JSON.stringify(prestamo))
  selectedDetailMode.value = mode
  observacionCierre.value = ''
  liberationItems.value = {}
  selectedReviewAreaByProduct.value = {}
  ;(selectedPrestamoDetail.value.detalles || []).forEach((item) => {
    liberationItems.value[getDetailKey(item)] = {
      cantidadDevuelta: 0,
      comentarioDevuelto: '',
      cantidadConsumida: 0,
      comentarioConsumo: '',
      cantidadDevueltaComoEmpezado: 0,
      comentarioDevueltoComoEmpezado: ''
    }
  })
  detailProductGroups.value.forEach((group) => {
    selectedReviewAreaByProduct.value[group.productoId] = normalizeAreaKey(
      getDetailGroupAreaEntries(group).find((item) => getCantidadPendiente(item) > 0)?.areaOrigen ||
      getDetailGroupAreaEntries(group)[0]?.areaOrigen
    )
  })
  isDetailModalOpen.value = true
}
const closeDetailModal = () => { isDetailModalOpen.value = false; selectedPrestamoDetail.value = null }

const getComentariosEntregaPorProducto = (itemOrProductoId) => {
  const productoId = typeof itemOrProductoId === 'string' ? itemOrProductoId : itemOrProductoId?.productoId
  const areaOrigen = typeof itemOrProductoId === 'string' ? null : normalizeAreaKey(itemOrProductoId?.areaOrigen)
  return (selectedPrestamoDetail.value?.movimientosPrestamo || [])
    .filter((mov) => ['entrega', 'entrega_sin_adeudo'].includes(mov.tipo) && mov.productoId === productoId && (!areaOrigen || normalizeAreaKey(mov.areaOrigen) === areaOrigen))
    .map((mov) => ({ fecha: mov.fecha, cantidad: mov.cantidad, observacion: mov.observacion || '', areaOrigen: mov.areaOrigen }))
}

const saveLiberacion = async (finalizeReview = false) => {
  formError.value = ''
  if (!selectedPrestamoDetail.value) return
  try {
    ;(selectedPrestamoDetail.value.detalles || []).forEach((item) => {
      liberationQuantityFields.forEach((field) => normalizeLiberationField(item, field))
    })

    const detallesLiberacion = Object.entries(liberationItems.value)
      .map(([key, data]) => {
        const source = (selectedPrestamoDetail.value.detalles || []).find((detail) => getDetailKey(detail) === key) || {}
        return { productoId: source.productoId || key.split('_')[0], areaOrigen: source.areaOrigen || 'OFICINA', ...data }
      })
      .filter((item) => Number(item.cantidadDevuelta || 0) > 0 || Number(item.cantidadConsumida || 0) > 0 || Number(item.cantidadDevueltaComoEmpezado || 0) > 0)

    if (!detallesLiberacion.length && !finalizeReview) {
      formError.value = 'Captura al menos una cantidad para liberar.'
      return
    }

    if (finalizeReview && !canFinalizeReview.value) {
      formError.value = 'Solo puedes finalizar una revisión cuando todos los artículos estén comprobados.'
      return
    }

    await liberarPrestamoDiario(selectedPrestamoDetail.value.id, {
      detallesLiberacion,
      cierreDefinitivo: finalizeReview,
      observacionCierre: observacionCierre.value
    })
    toastMessage.value = finalizeReview ? 'Revisión finalizada y préstamo cerrado.' : 'Cambios guardados correctamente.'
    showToast.value = true
    closeDetailModal()
    await refreshAll()
  } catch (err) {
    formError.value = err?.message || 'No se pudo guardar la revisión.'
  }
}

const openAdeudoModal = (adeudo) => {
  selectedAdeudo.value = adeudo
  adeudoForm.value = { cantidadSaldar: Number(adeudo.cantidadPendiente || 1), observaciones: '', accionInventario: 'SIN_MOVIMIENTO_STOCK' }
  isAdeudoModalOpen.value = true
}
const closeAdeudoModal = () => { isAdeudoModalOpen.value = false; selectedAdeudo.value = null }
const saveAdeudo = async () => {
  formError.value = ''
  try {
    await saldarAdeudoProducto({ adeudoId: selectedAdeudo.value.id, ...adeudoForm.value })
    toastMessage.value = 'Adeudo actualizado correctamente.'
    showToast.value = true
    closeAdeudoModal()
    await refreshAll()
  } catch (err) {
    formError.value = err?.message || 'No se pudo saldar el adeudo.'
  }
}

const findProductByBarcode = (rawValue) => {
  const normalized = String(rawValue || '').trim().toLowerCase()
  if (!normalized) return null
  return availableProducts.value.find((producto) => String(producto.codigoBarras || producto.codigo || '').trim().toLowerCase() === normalized) || null
}

const addProductFromScan = (producto) => {
  return addProductToCart(producto)
}

const handleScannedBarcode = async (decodedText) => {
  const producto = findProductByBarcode(decodedText)
  if (!producto) {
    scannerError.value = `No se encontro producto para el codigo: ${decodedText}`
    return
  }
  scannerError.value = ''
  addProductFromScan(producto)
}

const openBarcodeScanner = async () => {
  scannerError.value = ''
  if (isScanningBarcode.value || isInstallingScannerModule.value) return
  if (!Capacitor?.isNativePlatform?.()) {
    scannerError.value = 'El escaneo solo funciona en la app instalada.'
    return
  }
  try {
    isScanningBarcode.value = true
    const { supported } = await BarcodeScanner.isSupported()
    if (!supported) throw new Error('Este dispositivo no soporta escaneo de códigos.')
    const permissions = await BarcodeScanner.requestPermissions()
    if (permissions.camera !== 'granted') throw new Error('Necesitas permitir acceso a la cámara.')

    if (Capacitor.getPlatform() === 'android') {
      const moduleStatus = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
      if (!moduleStatus.available) {
        isInstallingScannerModule.value = true
        await BarcodeScanner.installGoogleBarcodeScannerModule()
        const started = Date.now()
        while (Date.now() - started < MODULE_INSTALL_TIMEOUT_MS) {
          const status = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
          if (status.available) break
          await new Promise((r) => setTimeout(r, MODULE_INSTALL_POLL_MS))
        }
        isInstallingScannerModule.value = false
      }
    }

    let scanTimeout = false
    const scannerTimeoutId = setTimeout(() => {
      scanTimeout = true
      BarcodeScanner.stopScan().catch(() => {})
      scannerError.value = 'Tiempo de escaneo agotado (15s).'
      isScanningBarcode.value = false
    }, SCANNER_TIMEOUT_MS)

    const result = await BarcodeScanner.scan({
      formats: [BarcodeFormat.Code128, BarcodeFormat.Code39, BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE, BarcodeFormat.Itf]
    })
    clearTimeout(scannerTimeoutId)
    if (scanTimeout) return
    const first = result?.barcodes?.[0]
    const decoded = (first?.rawValue || first?.displayValue || '').trim()
    if (!decoded) throw new Error('No se detectó ningún código.')
    await handleScannedBarcode(decoded)
  } catch (err) {
    const msg = err?.message || ''
    if (!msg.includes('cancel') && !msg.includes('dismiss') && !msg.includes('timeout')) {
      scannerError.value = err?.message || 'No se pudo iniciar el escáner.'
    }
  } finally {
    isScanningBarcode.value = false
    isInstallingScannerModule.value = false
    await new Promise((r) => setTimeout(r, DEBOUNCE_DELAY_MS))
  }
}

const buildListFilters = () => {
  normalizeDateRangeFilters()
  return {
    fechaInicio: listFilters.value.fechaInicio || undefined,
    fechaFin: listFilters.value.fechaFin || undefined,
    colaboradorId: listFilters.value.colaboradorId || undefined,
    estado: listFilters.value.estado || undefined,
    areaOrigen: listFilters.value.areaOrigen || undefined
  }
}

const loadSegmentData = async () => {
  formError.value = ''
  const filters = buildListFilters()
  if (selectedSegment.value === 'hoy') {
    await subscribePrestamos({
      fechaOperativa: formatFechaOperativa(),
      estados: ['abierto', 'activo']
    })
  } else if (selectedSegment.value === 'revision') {
    await subscribePrestamos({ ...filters, estado: 'pendiente_revision' })
  } else if (selectedSegment.value === 'cerrados') {
    await subscribePrestamos({
      ...filters,
      estado: filters.estado || undefined,
      estados: filters.estado ? undefined : ['cerrado', 'cerrado_con_adeudo']
    })
  } else if (selectedSegment.value === 'adeudos') {
    stopPrestamosListener()
  }
}

const refreshAll = async () => {
  normalizeDateRangeFilters()
  await Promise.all([getProducts(), getColaboradores(), getPrestamosSummary()])
  await loadSegmentData()
}

const onSegmentChange = async () => {
  listFilters.value.estado = ''
  if (selectedSegment.value !== 'hoy') normalizeDateRangeFilters()
  await loadSegmentData()
}

onMounted(async () => {
  await Promise.all([
    startAdeudosPendientesListener(),
    refreshAll()
  ])
})

onBeforeUnmount(() => {
  stopPrestamosListener()
  stopAdeudosPendientesListener()
})
</script>

<style scoped>
.prestamos-content {
  --background: #f5f7fb;
}

.page-container {
  padding: 0.75rem;
}

.prestamos-page {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.modules-trigger {
  --color: #ffffff;
}

.module-hero {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 0.62rem;
  padding: 0.82rem;
  border-radius: 16px;
  background: linear-gradient(135deg, #ffffff 0%, #eef7ff 100%);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.hero-copy {
  min-width: 0;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.12);
  padding: 0.16rem 0.38rem;
  border-radius: 999px;
}

.module-hero h2,
.detail-hero h3 {
  margin: 0.32rem 0 0;
  color: #0f172a;
  font-size: 1.2rem;
  line-height: 1.1;
  font-weight: 850;
}

.module-hero p,
.detail-hero p {
  margin: 0.22rem 0 0;
  color: #64748b;
  font-size: 0.72rem;
  line-height: 1.28;
}

.hero-actions {
  display: flex;
  align-items: center;
  min-width: 140px;
}

.hero-button,
.primary-action {
  min-height: 38px;
  height: auto;
  margin: 0;
  font-size: 0.68rem;
  font-weight: 750;
  line-height: 1.12;
  text-transform: none;
  white-space: normal;
  --border-radius: 12px;
  --padding-top: 0.52rem;
  --padding-bottom: 0.52rem;
  --padding-start: 0.65rem;
  --padding-end: 0.65rem;
}

.compact-action {
  min-height: 34px;
  margin-top: 0.45rem;
  font-size: 0.64rem;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.42rem;
}

.overview-card {
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  padding: 0.55rem 0.42rem;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.045);
  min-width: 0;
}

.overview-card--primary {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.overview-label {
  display: block;
  color: #64748b;
  font-size: 0.56rem;
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.overview-card strong {
  display: block;
  margin-top: 0.18rem;
  color: #0f172a;
  font-size: 0.98rem;
  line-height: 1;
}

.toolbar-card,
.filters-card,
.form-card,
.modern-form-card,
.detail-hero,
.release-action-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 0.58rem;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.toolbar-card {
  display: flex;
  flex-direction: column;
  gap: 0.48rem;
}

.toolbar-copy {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.45rem;
}

.toolbar-copy h3,
.section-heading h3,
.release-action-card h4 {
  margin: 0;
  color: #0f172a;
  font-size: 0.82rem;
  font-weight: 850;
  line-height: 1.14;
}

.toolbar-copy p,
.section-heading p {
  margin: 0;
  color: #64748b;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.15;
  white-space: nowrap;
}

.modern-segment {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.16rem;
  min-height: 36px;
}

.modern-segment ion-segment-button {
  min-height: 30px;
  --padding-start: 0.46rem;
  --padding-end: 0.46rem;
  --background: transparent;
  --background-checked: transparent;
  --indicator-color: var(--ion-color-primary, #2563eb);
  --color: #475569;
  --color-checked: #475569;
  color: #475569;
  font-size: 0.64rem;
  font-weight: 800;
  text-transform: none;
}

.modern-segment ion-segment-button::part(native) {
  color: #475569 !important;
  background: transparent !important;
}

.modern-segment ion-segment-button.segment-button-checked::part(native) {
  color: #475569 !important;
  background: transparent !important;
  font-weight: 900;
}

.modern-segment ion-segment-button::part(indicator-background) {
  background: var(--ion-color-primary, #2563eb);
  border-radius: 999px;
}

.filters-grid,
.quantity-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
}

.filters-grid ion-item,
.form-card ion-item,
.modern-form-card ion-item,
.release-action-card ion-item {
  --background: transparent;
  --padding-start: 0;
  --inner-padding-end: 0;
  --min-height: 42px;
  font-size: 0.78rem;
}

.work-filter-search {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  min-width: 0;
}

.work-filter-search ion-label {
  color: #334155;
  font-size: clamp(0.7rem, 2.4vw, 0.78rem);
  line-height: 1.25;
  font-weight: 750;
}

.work-searchbar {
  width: 100%;
}

.filters-grid ion-label,
.form-card ion-label,
.modern-form-card ion-label,
.release-action-card ion-label {
  color: #334155;
  font-size: 0.66rem;
  font-weight: 750;
}

.prestamos-list,
.picker-list,
.mini-list {
  background: transparent;
  padding: 0;
}

.prestamo-card,
.picker-product-card,
.mini-card,
.accordion-card {
  --background: #ffffff;
  --padding-start: 0;
  --inner-padding-end: 0;
  --min-height: 0;
  border: 1px solid #e5e7eb;
  border-radius: 15px;
  margin: 0 0 0.5rem;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.045);
  overflow: hidden;
}

.prestamo-card::part(native),
.picker-product-card::part(native),
.mini-card::part(native),
.accordion-card::part(native) {
  padding: 0;
}

.prestamo-card-content,
.picker-product-content,
.accordion-header-content {
  width: 100%;
  padding: 0.62rem;
  min-width: 0;
}

.prestamo-topline {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.45rem;
  margin-bottom: 0.42rem;
}

.prestamo-title-block {
  min-width: 0;
}

.prestamo-title-block h3,
.picker-item-title,
.mini-card-content h4 {
  margin: 0;
  color: #0f172a;
  font-size: 0.9rem;
  font-weight: 850;
  line-height: 1.15;
  word-break: break-word;
}

.prestamo-work-legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.28rem;
  width: 100%;
  padding: 0.46rem 0.52rem;
  border: 1px solid #dbe5f2;
  border-radius: 13px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.9));
  color: #475569;
  font-size: 0.72rem;
  line-height: 1.2;
  box-sizing: border-box;
}

.prestamo-work-legend strong {
  color: #0f172a;
  font-weight: 850;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.work-legend-label {
  color: #64748b;
  font-size: 0.62rem;
  font-weight: 850;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.work-legend-separator {
  color: #94a3b8;
  font-weight: 900;
}

.prestamo-title-block p,
.card-footnote,
.mini-card-content p {
  margin: 0.14rem 0 0;
  color: #64748b;
  font-size: 0.64rem;
  line-height: 1.25;
}

.compact-chip-row,
.product-chip-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.18rem;
}

.ui-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 15px;
  padding: 0.06rem 0.28rem;
  border-radius: 999px;
  font-size: 0.5rem;
  font-weight: 850;
  line-height: 1;
  white-space: nowrap;
  border: 1px solid transparent;
}

.ui-chip--muted {
  color: #475569;
  background: #f1f5f9;
  border-color: #e2e8f0;
}

.ui-chip--success,
.prestamo-badge--devuelto {
  color: #047857;
  background: #ecfdf5;
  border-color: #bbf7d0;
}

.ui-chip--danger,
.prestamo-badge--vencido {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}

.ui-chip--warning {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.prestamo-badge--activo {
  color: #1d4ed8;
  background: #dbeafe;
  border-color: #bfdbfe;
}

.prestamo-badge--revision {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.stock-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.28rem;
}

.prestamo-stats-grid,
.adeudo-stats-grid,
.picker-stock-grid,
.selected-product-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.adeudo-stats-grid,
.picker-stock-grid,
.selected-product-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.release-summary-grid {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.stock-metric {
  padding: 0.31rem 0.3rem;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
  min-width: 0;
}

.stock-metric--main {
  background: #eef6ff;
  border-color: #bfdbfe;
}

.stock-metric span {
  display: block;
  color: #64748b;
  font-size: 0.48rem;
  font-weight: 850;
  line-height: 1.05;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.stock-metric strong {
  display: block;
  margin-top: 0.12rem;
  color: #0f172a;
  font-size: 0.75rem;
  line-height: 1;
}

.modal-content {
  --background: #f5f7fb;
  --padding-bottom: 8px;
}

.modal-form {
  padding: 0.72rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

:global(ion-modal.prestamo-modal),
:global(ion-modal.product-picker-modal) {
  --width: min(760px, 94vw);
  --height: min(86vh, 820px);
  --border-radius: 20px;
  --box-shadow: 0 24px 60px rgba(15, 23, 42, 0.3);
  --backdrop-opacity: 0.42;
}

:global(ion-modal.wide-modal) {
  --width: min(980px, 96vw);
  --height: min(90vh, 900px);
}

:global(ion-modal.prestamo-modal::part(content)),
:global(ion-modal.product-picker-modal::part(content)) {
  overflow: hidden;
  background: #f5f7fb;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.35rem;
  margin-bottom: 0.45rem;
}

.picker-trigger,
.batch-scan-toggle {
  --background: #f8fafc;
  --padding-start: 0.55rem;
  --inner-padding-end: 0.55rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 0.45rem;
}

.selected-product-summary {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  padding: 0.45rem;
  margin-bottom: 0.45rem;
}

.selected-product-summary .stock-grid {
  margin-top: 0.35rem;
}

.product-searchbar {
  padding: 0;
  min-height: 36px;
}

.product-searchbar::part(container) {
  min-height: 36px;
  border-radius: 12px;
  box-shadow: none;
  border: 1px solid #e2e8f0;
}

.product-searchbar::part(input) {
  font-size: 0.72rem;
}

.picker-toolbar {
  gap: 0.42rem;
}

.release-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.46rem;
  margin-top: 0.5rem;
}

.release-action-card {
  padding: 0.52rem;
  box-shadow: none;
}

.release-action-card--danger {
  border-color: #fecaca;
  background: #fffafa;
}

.release-action-card h4 {
  font-size: 0.72rem;
  margin-bottom: 0.35rem;
}

.modern-accordion ion-accordion {
  background: transparent;
  margin-bottom: 0.45rem;
  border-radius: 15px;
  overflow: hidden;
}

.accordion-content {
  padding: 0.58rem;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-top: 0;
  border-radius: 0 0 15px 15px;
  margin-top: -0.5rem;
}

.comments-box {
  margin-bottom: 0.5rem;
}

.clean-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.clean-list li {
  padding: 0.42rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.66rem;
  line-height: 1.25;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.clean-list span {
  color: #64748b;
  font-weight: 700;
}

.clean-list strong {
  color: #0f172a;
  font-weight: 850;
}

.clean-list em {
  color: #475569;
  font-style: normal;
}

.history-entry {
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.history-entry:last-child {
  margin-bottom: 0;
  border-bottom: 0;
}

.closing-card {
  margin-top: 0.1rem;
}

.mini-card-content {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem;
}

.mini-chip-row {
  justify-content: flex-start;
  margin-top: 0.28rem;
}

.mini-remove {
  min-width: 64px;
  margin: 0;
  font-size: 0.64rem;
  text-transform: none;
}

.error-message {
  background-color: #fee2e2;
  color: #7f1d1d;
  padding: 0.68rem;
  border-radius: 12px;
  font-size: 0.68rem;
  border-left: 4px solid #b45757;
}

.warning-message {
  background: #fffbeb;
  color: #92400e;
  padding: 0.68rem;
  border-radius: 12px;
  font-size: 0.68rem;
  border-left: 4px solid #f59e0b;
}

.warning-message ul {
  margin: 0.35rem 0 0;
  padding-left: 1rem;
}

.empty-state,
.loading-state,
.modern-state {
  text-align: center;
  padding: 1.8rem 1rem;
  color: #64748b;
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 18px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.modal-footer {
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
}

.modal-footer ion-toolbar {
  --background: #ffffff;
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 8px;
  --padding-bottom: 10px;
}

ion-button {
  text-transform: none;
}

@media (max-width: 720px) {
  .overview-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .overview-card {
    padding: 0.48rem 0.38rem;
  }

  .overview-label {
    font-size: 0.54rem;
  }

  .overview-card strong {
    font-size: 0.92rem;
  }

  .filters-grid,
  .quantity-grid,
  .release-grid {
    grid-template-columns: 1fr;
  }

  .prestamo-topline {
    flex-direction: column;
    align-items: stretch;
  }

  .compact-chip-row {
    justify-content: flex-start;
  }

  .stock-grid,
  .prestamo-stats-grid,
  .release-summary-grid,
  .adeudo-stats-grid,
  .picker-stock-grid,
  .selected-product-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .page-container {
    padding: 0.62rem;
  }

  .module-hero {
    flex-direction: column;
    padding: 0.68rem;
  }

  .hero-actions {
    min-width: 0;
    width: 100%;
  }

  .hero-button {
    width: 100%;
  }

  :global(ion-modal.prestamo-modal),
  :global(ion-modal.product-picker-modal) {
    --width: 96vw;
    --height: 90vh;
  }

  .modal-form {
    padding: 0.7rem;
  }
}

@media (max-width: 430px) {
  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stock-grid,
  .prestamo-stats-grid,
  .release-summary-grid,
  .adeudo-stats-grid,
  .picker-stock-grid,
  .selected-product-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .prestamo-card-content,
  .picker-product-content,
  .accordion-header-content {
    padding: 0.56rem;
  }

  .prestamo-title-block h3,
  .picker-item-title,
  .mini-card-content h4 {
    font-size: 0.84rem;
  }

  .ui-chip {
    font-size: 0.48rem;
    padding: 0.05rem 0.24rem;
    min-height: 14px;
  }

  .toolbar-copy {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.05rem;
  }
}
.cart-entry-card,
.cart-card,
.empty-cart-card {
  overflow: visible;
}

.cart-heading {
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.cart-heading > div {
  min-width: 0;
}

.cart-heading h3 {
  margin: 0 0 0.12rem;
}

.cart-heading p {
  margin: 0;
  color: #64748b;
  font-size: 0.66rem;
  line-height: 1.25;
}

.cart-actions-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.45rem;
  margin-top: 0.1rem;
}

.cart-scan-button {
  margin: 0;
  min-height: 38px;
  font-size: 0.72rem;
  white-space: normal;
}

.cart-picker-trigger {
  margin: 0;
  min-height: 48px;
  --padding-top: 0.42rem;
  --padding-bottom: 0.42rem;
  --min-height: 48px;
}

.cart-picker-trigger .picker-item-title {
  font-size: 0.76rem;
  line-height: 1.15;
  margin-bottom: 0.12rem;
}

.cart-picker-trigger p {
  font-size: 0.64rem;
  line-height: 1.22;
  color: #64748b;
  white-space: normal;
  margin: 0;
}

.compact-toggle {
  margin-top: 0.45rem;
  --min-height: 44px;
}

.compact-toggle h3 {
  margin: 0 0 0.08rem;
  font-size: 0.72rem;
  color: #0f172a;
}

.compact-toggle p {
  margin: 0;
  font-size: 0.62rem;
  line-height: 1.2;
  color: #64748b;
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: transparent;
}

.cart-product-card {
  --background: #ffffff;
  --padding-start: 0;
  --inner-padding-end: 0;
  --min-height: auto;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.055);
  overflow: hidden;
}

.cart-item-content {
  width: 100%;
  padding: 0.58rem;
}

.cart-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.45rem;
  margin-bottom: 0.42rem;
}

.cart-chip-row {
  justify-content: flex-end;
  max-width: 45%;
}

.cart-stock-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.26rem;
  margin-bottom: 0.48rem;
}

.cart-quantity-stack {
  display: flex;
  flex-direction: column;
  gap: 0.38rem;
  margin-top: 0.35rem;
}

.quantity-control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.45rem;
  background: #f8fafc;
  border: 1px solid #e8edf4;
  border-radius: 12px;
}

.quantity-control-row > span {
  color: #334155;
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 1.15;
}

.cart-stepper {
  display: grid;
  grid-template-columns: 32px 56px 32px;
  align-items: center;
  gap: 0.22rem;
}

.stepper-btn {
  --padding-start: 0;
  --padding-end: 0;
  --border-radius: 10px;
  width: 32px;
  height: 32px;
  min-height: 32px;
  margin: 0;
  color: #0f172a;
  font-size: 1rem;
  font-weight: 900;
  background: #ffffff;
  border: 1px solid #dbe3ee;
}

.cart-quantity-input {
  min-height: 32px;
  text-align: center;
  --padding-start: 0;
  --padding-end: 0;
  --background: #ffffff;
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 850;
}

.cart-comment-input {
  --background: #f8fafc;
  --padding-start: 0.45rem;
  --inner-padding-end: 0.45rem;
  --padding-top: 0.3rem;
  --padding-bottom: 0.3rem;
  border: 1px solid #e8edf4;
  border-radius: 12px;
  margin-top: 0.42rem;
}

.cart-comment-input ion-label {
  font-size: 0.64rem;
  font-weight: 800;
  color: #64748b;
}

.cart-comment-input ion-textarea {
  font-size: 0.68rem;
}

.cart-remove-button {
  width: 100%;
  margin: 0.48rem 0 0;
  min-height: 34px;
  font-size: 0.68rem;
  text-transform: none;
}

.compact-empty-state {
  padding: 1.05rem 0.65rem;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
}

.compact-empty-state strong {
  display: block;
  color: #0f172a;
  font-size: 0.78rem;
  margin-bottom: 0.2rem;
}

.compact-empty-state p {
  margin: 0;
  font-size: 0.66rem;
  line-height: 1.3;
}

.picker-product-card {
  --min-height: auto;
}

.picker-product-content {
  padding: 0.48rem 0.1rem;
}

.product-picker-content .prestamo-title-block h3 {
  font-size: 0.76rem;
  line-height: 1.16;
}

.product-picker-content .prestamo-title-block p {
  font-size: 0.62rem;
  line-height: 1.2;
}

.product-picker-content .ui-chip {
  font-size: 0.49rem;
  padding: 0.13rem 0.28rem;
}

@media (max-width: 520px) {
  .cart-item-header {
    flex-direction: column;
    align-items: stretch;
  }

  .cart-chip-row {
    justify-content: flex-start;
    max-width: 100%;
  }

  .cart-stock-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .quantity-control-row {
    padding: 0.36rem;
  }

  .quantity-control-row > span {
    font-size: 0.64rem;
  }

  .cart-stepper {
    grid-template-columns: 30px 52px 30px;
  }

  .stepper-btn {
    width: 30px;
    height: 30px;
    min-height: 30px;
  }

  .cart-quantity-input {
    min-height: 30px;
    font-size: 0.74rem;
  }
}



/* Ajustes finales: modales de nueva entrega y selector de productos */
.product-picker-content {
  padding: 0.82rem;
  gap: 0.62rem;
}

.picker-toolbar {
  padding: 0.72rem;
  gap: 0.58rem;
  border-radius: 16px;
  border-color: #dde6f2;
}

.picker-toolbar .toolbar-copy {
  align-items: flex-start;
}

.product-searchbar {
  padding: 0;
  min-height: 40px;
  --background: transparent;
  --box-shadow: none;
  --border-radius: 13px;
}

.product-searchbar::part(container) {
  min-height: 40px;
  border-radius: 13px;
  border: 1px solid #dbe5f2;
  background: #f8fafc;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.product-searchbar::part(input) {
  font-size: 0.72rem;
  font-weight: 650;
  color: #0f172a;
}

.picker-list {
  display: flex;
  flex-direction: column;
  gap: 0.58rem;
  background: transparent;
}

.picker-product-card {
  margin: 0;
  border-radius: 16px;
  border-color: #dde6f2;
}

.picker-product-content {
  width: 100%;
  padding: 0.72rem;
}

.product-picker-content .prestamo-topline {
  gap: 0.62rem;
}

.product-picker-content .prestamo-title-block h3 {
  font-size: 0.78rem;
  line-height: 1.18;
}

.product-picker-content .prestamo-title-block p {
  font-size: 0.63rem;
  margin-top: 0.12rem;
}

.product-picker-content .compact-chip-row {
  gap: 0.24rem;
}

.product-picker-content .ui-chip {
  font-size: 0.48rem;
  padding: 0.12rem 0.26rem;
  border-radius: 999px;
}

.picker-stock-grid {
  margin-top: 0.52rem;
  gap: 0.32rem;
}

.cart-actions-grid {
  gap: 0.55rem;
}

.cart-picker-trigger,
.compact-toggle {
  --background: #f8fafc;
  --padding-start: 0.72rem;
  --inner-padding-end: 0.72rem;
  --padding-top: 0.62rem;
  --padding-bottom: 0.62rem;
  --min-height: 56px;
  border: 1px solid #dbe5f2;
  border-radius: 14px;
  margin: 0;
  overflow: hidden;
}

.cart-picker-trigger::part(native),
.compact-toggle::part(native) {
  border-radius: 14px;
}

.cart-picker-trigger .picker-item-title,
.compact-toggle h3 {
  font-size: 0.74rem;
  line-height: 1.16;
  margin: 0 0 0.14rem;
}

.cart-picker-trigger p,
.compact-toggle p {
  font-size: 0.63rem;
  line-height: 1.25;
  margin: 0;
  color: #64748b;
}

.general-comment-input,
.cart-comment-input {
  --background: #f8fafc;
  --padding-start: 0.72rem;
  --inner-padding-end: 0.72rem;
  --padding-top: 0.58rem;
  --padding-bottom: 0.58rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
}

.general-comment-input {
  margin-top: 0.5rem;
}

.general-comment-input ion-label,
.cart-comment-input ion-label {
  font-size: 0.64rem;
  font-weight: 800;
  color: #64748b;
  margin-bottom: 0.22rem;
}

.general-comment-input ion-textarea,
.cart-comment-input ion-textarea {
  font-size: 0.7rem;
  line-height: 1.28;
  --padding-start: 0.04rem;
  --padding-end: 0.04rem;
  --padding-top: 0.26rem;
  --padding-bottom: 0.12rem;
}

.cart-comment-input {
  margin-top: 0.52rem;
}

.quantity-control-row {
  padding: 0.46rem 0.52rem;
  gap: 0.5rem;
}

.cart-stepper {
  display: grid;
  grid-template-columns: 36px 36px 36px;
  align-items: center;
  gap: 0.28rem;
}

.stepper-btn,
.cart-quantity-input {
  width: 36px;
  height: 36px;
  min-height: 36px;
  max-height: 36px;
}

.stepper-btn {
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  --border-radius: 11px;
  margin: 0;
  font-size: 1rem;
  line-height: 1;
}

.cart-quantity-input {
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  --background: #ffffff;
  border: 1px solid #dbe3ee;
  border-radius: 11px;
  text-align: center;
  font-size: 0.76rem;
  font-weight: 850;
}

.cart-quantity-input::part(native) {
  text-align: center;
  padding: 0;
  appearance: textfield;
  -moz-appearance: textfield;
}

.cart-quantity-input::part(native)::-webkit-outer-spin-button,
.cart-quantity-input::part(native)::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

@media (max-width: 520px) {
  .product-picker-content {
    padding: 0.7rem;
  }

  .picker-toolbar,
  .picker-product-content {
    padding: 0.64rem;
  }

  .cart-picker-trigger,
  .compact-toggle,
  .general-comment-input,
  .cart-comment-input {
    --padding-start: 0.62rem;
    --inner-padding-end: 0.62rem;
  }

  .cart-stepper {
    grid-template-columns: 34px 34px 34px;
    gap: 0.24rem;
  }

  .stepper-btn,
  .cart-quantity-input {
    width: 34px;
    height: 34px;
    min-height: 34px;
    max-height: 34px;
  }
}


/* Ajuste definitivo de respiración interna en Nueva entrega */
.cart-entry-card,
.cart-card,
.empty-cart-card {
  padding: 0.72rem;
}

.cart-entry-card .cart-heading,
.cart-card .cart-heading {
  margin-bottom: 0.68rem;
}

.cart-actions-grid {
  gap: 0.68rem;
  margin-top: 0.16rem;
}

.cart-picker-trigger,
.compact-toggle {
  --background: #f8fafc;
  --min-height: auto;
  --padding-start: 0;
  --inner-padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  border: 1px solid #dbe5f2;
  border-radius: 16px;
  margin: 0;
  overflow: hidden;
}

.cart-picker-trigger::part(native),
.compact-toggle::part(native) {
  min-height: 58px;
  padding: 0.78rem 0.86rem;
  border-radius: 16px;
  box-sizing: border-box;
}

.cart-picker-trigger ion-label,
.compact-toggle ion-label {
  margin: 0;
  padding: 0;
}

.cart-picker-trigger .picker-item-title,
.compact-toggle h3 {
  margin: 0 0 0.18rem;
  font-size: 0.75rem;
  line-height: 1.15;
}

.cart-picker-trigger p,
.compact-toggle p {
  margin: 0;
  font-size: 0.64rem;
  line-height: 1.28;
  color: #64748b;
  white-space: normal;
}

/* Textareas con borde real y contenido separado del borde izquierdo */
.general-comment-input,
.cart-comment-input {
  --background: #f8fafc;
  --padding-start: 0;
  --inner-padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  border: 1px solid #dbe5f2;
  border-radius: 16px;
  margin-top: 0.58rem;
  overflow: hidden;
}

.general-comment-input::part(native),
.cart-comment-input::part(native) {
  padding: 0.74rem 0.86rem 0.72rem;
  align-items: flex-start;
  box-sizing: border-box;
}

.general-comment-input ion-label,
.cart-comment-input ion-label {
  margin: 0 0 0.28rem;
  padding: 0;
  font-size: 0.65rem;
  font-weight: 850;
  color: #64748b;
  letter-spacing: 0.01em;
}

.general-comment-input ion-textarea,
.cart-comment-input ion-textarea {
  width: 100%;
  font-size: 0.72rem;
  line-height: 1.35;
  --padding-start: 0.18rem;
  --padding-end: 0.18rem;
  --padding-top: 0.32rem;
  --padding-bottom: 0.18rem;
}

.cart-comment-input {
  margin-top: 0.66rem;
}

/* Cantidades: botones y caja alineados, sin sensación de doble control */
.quantity-control-row {
  padding: 0.56rem 0.62rem;
  gap: 0.62rem;
  border-radius: 14px;
}

.quantity-control-row > span {
  min-width: 0;
  line-height: 1.2;
}

.cart-stepper {
  grid-template-columns: 38px 38px 38px;
  gap: 0.26rem;
  flex-shrink: 0;
}

.stepper-btn,
.cart-quantity-input {
  width: 38px;
  height: 38px;
  min-height: 38px;
  max-height: 38px;
}

.stepper-btn::part(native) {
  padding: 0;
}

.cart-quantity-input::part(native) {
  text-align: center;
  padding: 0 !important;
  appearance: textfield;
  -moz-appearance: textfield;
}

.cart-quantity-input::part(native)::-webkit-outer-spin-button,
.cart-quantity-input::part(native)::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Selector de productos: cards con más aire interno */
.product-picker-content {
  padding: 0.86rem;
}

.picker-toolbar {
  padding: 0.82rem;
  border-radius: 18px;
}

.product-searchbar::part(container) {
  min-height: 42px;
  padding-left: 0.25rem;
  padding-right: 0.25rem;
}

.picker-product-card {
  --padding-start: 0;
  --inner-padding-end: 0;
  border-radius: 17px;
  overflow: hidden;
}

.picker-product-card::part(native) {
  padding: 0;
}

.picker-product-content {
  padding: 0.78rem 0.82rem;
  box-sizing: border-box;
}

.picker-stock-grid {
  margin-top: 0.58rem;
}

@media (max-width: 520px) {
  .cart-entry-card,
  .cart-card,
  .empty-cart-card {
    padding: 0.64rem;
  }

  .cart-picker-trigger::part(native),
  .compact-toggle::part(native),
  .general-comment-input::part(native),
  .cart-comment-input::part(native) {
    padding-left: 0.72rem;
    padding-right: 0.72rem;
  }

  .cart-stepper {
    grid-template-columns: 36px 36px 36px;
    gap: 0.22rem;
  }

  .stepper-btn,
  .cart-quantity-input {
    width: 36px;
    height: 36px;
    min-height: 36px;
    max-height: 36px;
  }

  .picker-product-content,
  .picker-toolbar {
    padding: 0.72rem;
  }
}


/* Ajuste fino: padding simétrico en Nueva entrega */
.cart-picker-trigger::part(native),
.compact-toggle::part(native) {
  padding: 0.68rem !important;
  min-height: 0;
  align-items: center;
}

.general-comment-input::part(native),
.cart-comment-input::part(native) {
  padding: 0.68rem !important;
  align-items: flex-start;
}

.cart-picker-trigger,
.compact-toggle,
.general-comment-input,
.cart-comment-input {
  border-radius: 15px;
}

.cart-picker-trigger .picker-item-title,
.compact-toggle h3 {
  margin-bottom: 0.14rem;
}

.general-comment-input ion-label,
.cart-comment-input ion-label {
  margin-bottom: 0.22rem;
}

.general-comment-input ion-textarea,
.cart-comment-input ion-textarea {
  --padding-start: 0.08rem;
  --padding-end: 0.08rem;
  --padding-top: 0.22rem;
  --padding-bottom: 0.08rem;
}

.cart-entry-card,
.cart-card,
.empty-cart-card {
  padding: 0.68rem !important;
}

.cart-actions-grid {
  gap: 0.58rem;
}

.product-picker-content,
.picker-toolbar,
.picker-product-content {
  padding: 0.72rem !important;
}

@media (max-width: 520px) {
  .cart-picker-trigger::part(native),
  .compact-toggle::part(native),
  .general-comment-input::part(native),
  .cart-comment-input::part(native) {
    padding: 0.64rem !important;
  }

  .cart-entry-card,
  .cart-card,
  .empty-cart-card {
    padding: 0.64rem !important;
  }

  .product-picker-content,
  .picker-toolbar,
  .picker-product-content {
    padding: 0.66rem !important;
  }
}


/* Ajuste solicitado: separación entre Buscar producto / Modo lote y stepper táctil */
.cart-entry-card .cart-actions-grid {
  margin-bottom: 0.78rem !important;
}

.cart-entry-card .batch-scan-toggle,
.cart-entry-card .compact-toggle {
  margin-top: 0 !important;
}

.cart-entry-card .cart-picker-trigger::part(native),
.cart-entry-card .compact-toggle::part(native) {
  padding: 0.68rem !important;
}

.cart-picker-trigger .picker-item-title,
.compact-toggle .picker-item-title {
  margin: 0 0 0.14rem !important;
  color: #0f172a;
  font-size: 0.75rem !important;
  font-weight: 850 !important;
  line-height: 1.15 !important;
  letter-spacing: 0;
}

.compact-toggle p,
.cart-picker-trigger p {
  margin: 0 !important;
}

.cart-stepper {
  grid-template-columns: 34px 40px 34px !important;
  gap: 0.28rem !important;
  align-items: center;
}

.stepper-btn {
  width: 34px !important;
  height: 34px !important;
  min-width: 34px !important;
  min-height: 34px !important;
  max-width: 34px !important;
  max-height: 34px !important;
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  --border-radius: 10px;
  margin: 0 !important;
}

.stepper-btn::part(native) {
  width: 34px;
  height: 34px;
  min-height: 34px;
  padding: 0 !important;
}

.stepper-btn ion-icon {
  font-size: 1rem;
}

.cart-quantity-input {
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  min-height: 40px !important;
  max-width: 40px !important;
  max-height: 40px !important;
}

@media (max-width: 520px) {
  .cart-entry-card .cart-actions-grid {
    margin-bottom: 0.7rem !important;
  }

  .cart-stepper {
    grid-template-columns: 32px 38px 32px !important;
    gap: 0.24rem !important;
  }

  .stepper-btn,
  .stepper-btn::part(native) {
    width: 32px !important;
    height: 32px !important;
    min-width: 32px !important;
    min-height: 32px !important;
    max-width: 32px !important;
    max-height: 32px !important;
  }

  .cart-quantity-input {
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;
    min-height: 38px !important;
    max-width: 38px !important;
    max-height: 38px !important;
  }
}



/* Revisión integral de modales: bordes, separación y márgenes simétricos */
:global(ion-modal.prestamo-modal),
:global(ion-modal.product-picker-modal) {
  --border-radius: 22px;
}

.modal-content {
  --background: #f5f7fb;
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
}

.modal-form,
.delivery-modal-form,
.detail-modal-form,
.adeudo-modal-form,
.picker-modal-form {
  padding: 0.82rem !important;
  gap: 0.72rem !important;
  box-sizing: border-box;
}

.form-card,
.modern-form-card,
.items-card,
.detail-hero,
.comments-box,
.history-box,
.closing-card,
.release-action-card,
.toolbar-card,
.picker-toolbar,
.empty-cart-card,
.cart-entry-card,
.cart-card {
  border: 1px solid #dbe5f2;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.045);
  box-sizing: border-box;
}

.form-card,
.modern-form-card,
.items-card,
.detail-hero,
.comments-box,
.history-box,
.closing-card,
.release-action-card,
.toolbar-card,
.picker-toolbar,
.empty-cart-card,
.cart-entry-card,
.cart-card {
  padding: 0.78rem !important;
}

.detail-hero,
.section-heading,
.cart-heading,
.toolbar-copy,
.prestamo-topline,
.cart-item-header {
  gap: 0.58rem;
}

.detail-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.detail-hero > div,
.section-heading > div,
.cart-heading > div,
.toolbar-copy,
.prestamo-title-block {
  min-width: 0;
}

.detail-hero h3,
.section-heading h3,
.cart-heading h3,
.toolbar-copy h3,
.release-action-card h4 {
  margin-top: 0;
}

.detail-hero p,
.section-heading p,
.cart-heading p,
.toolbar-copy p,
.card-footnote {
  margin-bottom: 0;
}

.modal-form ion-item,
.detail-modal-form ion-item,
.adeudo-modal-form ion-item,
.delivery-modal-form ion-item {
  --background: #f8fafc;
  --padding-start: 0;
  --inner-padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  --min-height: auto;
  border-radius: 15px;
  overflow: hidden;
}

.modal-form ion-item::part(native),
.detail-modal-form ion-item::part(native),
.adeudo-modal-form ion-item::part(native),
.delivery-modal-form ion-item::part(native) {
  padding: 0.68rem !important;
  min-height: 0;
  box-sizing: border-box;
  align-items: center;
}

.form-card > ion-item + ion-item,
.closing-card > ion-item + ion-item,
.release-action-card > ion-item + ion-item,
.adeudo-modal-form .form-card > ion-item + ion-item,
.delivery-modal-form .form-card > ion-item + ion-item {
  margin-top: 0.58rem;
}

.release-grid {
  gap: 0.68rem !important;
  margin-top: 0.68rem !important;
}

.release-action-card {
  display: flex;
  flex-direction: column;
  gap: 0.58rem;
}

.release-action-card > ion-item {
  border: 1px solid #e4ebf5;
}

.release-action-card h4 {
  margin-bottom: 0 !important;
  color: #0f172a;
  font-size: 0.76rem;
  font-weight: 850;
  line-height: 1.2;
}

.accordion-card,
.cart-product-card,
.picker-product-card {
  border: 1px solid #dbe5f2;
  border-radius: 18px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.045);
  overflow: hidden;
}

.accordion-card::part(native),
.cart-product-card::part(native),
.picker-product-card::part(native) {
  padding: 0 !important;
}

.accordion-header-content,
.cart-item-content,
.picker-product-content,
.prestamo-card-content {
  padding: 0.78rem !important;
  box-sizing: border-box;
}

.accordion-content {
  padding: 0.72rem !important;
  margin-top: -0.25rem;
  border-color: #dbe5f2;
}

.comments-box {
  margin-bottom: 0.68rem !important;
}

.clean-list {
  gap: 0.48rem !important;
}

.clean-list li,
.history-entry {
  padding: 0.62rem !important;
  border-radius: 14px;
  box-sizing: border-box;
}

.history-entry {
  border: 1px solid #e4ebf5;
  background: #f8fafc;
  margin-bottom: 0.58rem;
}

.closing-card ion-item {
  border: 1px solid #e4ebf5;
}

.general-comment-input,
.cart-comment-input,
.cart-picker-trigger,
.compact-toggle {
  border: 1px solid #dbe5f2;
  border-radius: 16px;
  box-sizing: border-box;
}

.general-comment-input::part(native),
.cart-comment-input::part(native),
.cart-picker-trigger::part(native),
.compact-toggle::part(native) {
  padding: 0.68rem !important;
  box-sizing: border-box;
}

.cart-entry-card .cart-actions-grid {
  margin-bottom: 0.78rem !important;
}

.cart-list,
.picker-list,
.modern-accordion {
  gap: 0.62rem !important;
}

.product-picker-content,
.picker-modal-form {
  padding: 0.82rem !important;
  gap: 0.72rem !important;
}

.picker-toolbar,
.picker-product-content {
  padding: 0.78rem !important;
}

.product-searchbar::part(container) {
  min-height: 42px;
  border: 1px solid #dbe5f2;
  border-radius: 14px;
  background: #f8fafc;
}

.product-searchbar::part(input) {
  padding-inline-start: 0.18rem;
}

.cart-stepper {
  grid-template-columns: 32px 40px 32px !important;
}

.stepper-btn,
.stepper-btn::part(native) {
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  min-height: 32px !important;
  max-width: 32px !important;
  max-height: 32px !important;
}

.cart-quantity-input {
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  min-height: 40px !important;
  max-width: 40px !important;
  max-height: 40px !important;
}

.modal-footer ion-toolbar {
  --padding-start: 0.82rem;
  --padding-end: 0.82rem;
  --padding-top: 0.72rem;
  --padding-bottom: 0.82rem;
}

@media (max-width: 520px) {
  .modal-form,
  .delivery-modal-form,
  .detail-modal-form,
  .adeudo-modal-form,
  .picker-modal-form,
  .product-picker-content {
    padding: 0.7rem !important;
    gap: 0.64rem !important;
  }

  .form-card,
  .modern-form-card,
  .items-card,
  .detail-hero,
  .comments-box,
  .history-box,
  .closing-card,
  .release-action-card,
  .toolbar-card,
  .picker-toolbar,
  .empty-cart-card,
  .cart-entry-card,
  .cart-card,
  .accordion-header-content,
  .cart-item-content,
  .picker-product-content,
  .prestamo-card-content {
    padding: 0.68rem !important;
  }

  .modal-form ion-item::part(native),
  .detail-modal-form ion-item::part(native),
  .adeudo-modal-form ion-item::part(native),
  .delivery-modal-form ion-item::part(native),
  .general-comment-input::part(native),
  .cart-comment-input::part(native),
  .cart-picker-trigger::part(native),
  .compact-toggle::part(native) {
    padding: 0.62rem !important;
  }

  .detail-hero,
  .section-heading,
  .cart-heading,
  .prestamo-topline,
  .cart-item-header {
    gap: 0.48rem;
  }

  .modal-footer ion-toolbar {
    --padding-start: 0.7rem;
    --padding-end: 0.7rem;
    --padding-top: 0.64rem;
    --padding-bottom: 0.7rem;
  }
}


/* Revisión diaria: acciones de devolución desplegables y steppers centrados */
.release-accordion-group {
  display: flex;
  flex-direction: column;
  gap: 0.62rem;
  margin-top: 0.72rem;
}

.release-action-accordion {
  background: #ffffff;
  border: 1px solid #dbe5f2;
  border-radius: 17px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.035);
}

.release-action-accordion--danger {
  border-color: #fecaca;
  background: #fffafa;
}

.release-accordion-header {
  --background: #ffffff;
  --min-height: auto;
  border: 0 !important;
  border-radius: 17px;
  overflow: hidden;
}

.release-accordion-header--danger {
  --background: #fffafa;
}

.release-accordion-header::part(native) {
  padding: 0 !important;
  min-height: 0;
  align-items: stretch;
}

.release-header-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.68rem;
  padding: 0.72rem 0.76rem;
  box-sizing: border-box;
}

.release-header-content > div {
  min-width: 0;
}

.release-header-content h4 {
  margin: 0;
  color: #0f172a;
  font-size: 0.76rem;
  font-weight: 850;
  line-height: 1.18;
}

.release-header-content p {
  margin: 0.16rem 0 0;
  color: #64748b;
  font-size: 0.62rem;
  font-weight: 650;
  line-height: 1.25;
}

.release-action-content {
  margin: 0;
  border: 0 !important;
  border-top: 1px solid #e8eef6 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 0.72rem 0.76rem !important;
  gap: 0.62rem !important;
}

.release-quantity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.68rem;
  padding: 0.58rem 0.62rem;
  border: 1px solid #e4ebf5;
  border-radius: 14px;
  background: #f8fafc;
  box-sizing: border-box;
}

.release-quantity-row > span {
  color: #334155;
  font-size: 0.68rem;
  font-weight: 820;
  line-height: 1.15;
}

.release-stepper {
  grid-template-columns: 32px 40px 32px !important;
  gap: 0.26rem !important;
  align-items: center;
  justify-content: end;
  flex-shrink: 0;
}

.release-stepper-btn,
.release-stepper-btn::part(native) {
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  min-height: 32px !important;
  max-width: 32px !important;
  max-height: 32px !important;
}

.stepper-btn::part(native),
.release-stepper-btn::part(native) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  line-height: 1 !important;
}

.stepper-btn ion-icon,
.release-stepper-btn ion-icon {
  width: 15px;
  height: 15px;
  margin: 0 !important;
  display: block;
  line-height: 1;
  flex: 0 0 auto;
}

.release-quantity-input {
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  min-height: 40px !important;
  max-width: 40px !important;
  max-height: 40px !important;
}

.release-comment-input {
  --background: #f8fafc;
  --padding-start: 0;
  --inner-padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  border: 1px solid #e4ebf5 !important;
  border-radius: 14px !important;
  overflow: hidden;
  margin-top: 0 !important;
}

.release-comment-input::part(native) {
  padding: 0.62rem !important;
  align-items: flex-start !important;
}

.release-comment-input ion-label {
  margin: 0 0 0.22rem;
  color: #64748b;
  font-size: 0.64rem;
  font-weight: 850;
}

.release-comment-input ion-textarea {
  font-size: 0.7rem;
  line-height: 1.34;
  --padding-start: 0.08rem;
  --padding-end: 0.08rem;
  --padding-top: 0.22rem;
  --padding-bottom: 0.08rem;
}

@media (max-width: 520px) {
  .release-accordion-group {
    gap: 0.56rem;
    margin-top: 0.64rem;
  }

  .release-header-content {
    padding: 0.66rem 0.68rem;
    gap: 0.56rem;
  }

  .release-action-content {
    padding: 0.66rem 0.68rem !important;
    gap: 0.56rem !important;
  }

  .release-quantity-row {
    padding: 0.56rem;
  }

  .release-stepper {
    grid-template-columns: 30px 38px 30px !important;
    gap: 0.22rem !important;
  }

  .release-stepper-btn,
  .release-stepper-btn::part(native) {
    width: 30px !important;
    height: 30px !important;
    min-width: 30px !important;
    min-height: 30px !important;
    max-width: 30px !important;
    max-height: 30px !important;
  }

  .release-quantity-input {
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;
    min-height: 38px !important;
    max-width: 38px !important;
    max-height: 38px !important;
  }
}


/* Corrección visual: el borde pertenece al área táctil real del botón */
.stepper-btn {
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.stepper-btn::part(native) {
  border: 1px solid #dbe3ee !important;
  border-radius: 10px !important;
  background: #ffffff !important;
  box-sizing: border-box !important;
}


/* Ajuste compacto final: acordeones de devolución y botones de cantidad */
.release-accordion-group {
  gap: 0.42rem !important;
  margin-top: 0.54rem !important;
}

.release-action-accordion {
  border-radius: 14px !important;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.028) !important;
}

.release-accordion-header {
  border-radius: 14px !important;
}

.release-header-content {
  padding: 0.48rem 0.56rem !important;
  gap: 0.42rem !important;
  min-height: 0 !important;
  align-items: center !important;
}

.release-header-content h4 {
  font-size: 0.66rem !important;
  line-height: 1.08 !important;
  font-weight: 850 !important;
  letter-spacing: -0.005em;
}

.release-header-content p {
  margin-top: 0.08rem !important;
  font-size: 0.52rem !important;
  line-height: 1.12 !important;
  font-weight: 650 !important;
  color: #64748b;
}

.release-header-content .ui-chip {
  flex: 0 0 auto;
  min-width: 1.25rem;
  padding: 0.1rem 0.26rem !important;
  border-radius: 999px !important;
  font-size: 0.52rem !important;
  line-height: 1 !important;
  text-align: center;
}

.release-action-content {
  padding: 0.52rem 0.56rem !important;
  gap: 0.46rem !important;
}

.release-quantity-row {
  padding: 0.42rem 0.46rem !important;
  gap: 0.44rem !important;
  border-radius: 12px !important;
}

.release-quantity-row > span {
  font-size: 0.6rem !important;
  line-height: 1.1 !important;
}

.release-stepper {
  grid-template-columns: 28px 38px 28px !important;
  gap: 0.2rem !important;
  align-items: center !important;
}

.release-stepper-btn {
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  min-height: 28px !important;
  max-width: 28px !important;
  max-height: 28px !important;
  margin: 0 !important;
  border: 0 !important;
  background: transparent !important;
  overflow: visible !important;
}

.release-stepper-btn::part(native) {
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  min-height: 28px !important;
  max-width: 28px !important;
  max-height: 28px !important;
  padding: 0 !important;
  margin: 0 !important;
  display: grid !important;
  place-items: center !important;
  box-sizing: border-box !important;
  border: 1px solid #dbe3ee !important;
  border-radius: 9px !important;
  background: #ffffff !important;
  line-height: 1 !important;
  transform: none !important;
}

.release-stepper-btn ion-icon {
  width: 13px !important;
  height: 13px !important;
  font-size: 13px !important;
  line-height: 1 !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  position: static !important;
  transform: none !important;
}

.release-quantity-input {
  width: 38px !important;
  height: 36px !important;
  min-width: 38px !important;
  min-height: 36px !important;
  max-width: 38px !important;
  max-height: 36px !important;
  border-radius: 9px !important;
}

.release-quantity-input::part(native) {
  padding: 0 !important;
  text-align: center !important;
  line-height: 36px !important;
}

.release-comment-input::part(native) {
  padding: 0.5rem !important;
}

.release-comment-input ion-label {
  font-size: 0.58rem !important;
  margin-bottom: 0.16rem !important;
}

.release-comment-input ion-textarea {
  font-size: 0.64rem !important;
  line-height: 1.25 !important;
}

@media (max-width: 520px) {
  .release-accordion-group {
    gap: 0.38rem !important;
    margin-top: 0.48rem !important;
  }

  .release-header-content {
    padding: 0.44rem 0.5rem !important;
    gap: 0.38rem !important;
  }

  .release-header-content h4 {
    font-size: 0.62rem !important;
  }

  .release-header-content p {
    font-size: 0.5rem !important;
  }

  .release-header-content .ui-chip {
    font-size: 0.5rem !important;
    padding: 0.09rem 0.23rem !important;
  }

  .release-action-content {
    padding: 0.48rem 0.5rem !important;
    gap: 0.42rem !important;
  }

  .release-quantity-row {
    padding: 0.38rem 0.42rem !important;
  }

  .release-stepper {
    grid-template-columns: 27px 36px 27px !important;
    gap: 0.18rem !important;
  }

  .release-stepper-btn,
  .release-stepper-btn::part(native) {
    width: 27px !important;
    height: 27px !important;
    min-width: 27px !important;
    min-height: 27px !important;
    max-width: 27px !important;
    max-height: 27px !important;
  }

  .release-stepper-btn ion-icon {
    width: 12px !important;
    height: 12px !important;
    font-size: 12px !important;
  }

  .release-quantity-input {
    width: 36px !important;
    height: 35px !important;
    min-width: 36px !important;
    min-height: 35px !important;
    max-width: 36px !important;
    max-height: 35px !important;
  }
}


/* Corrección final: posición de botones de cantidad en revisión diaria */
.release-action-content .release-quantity-row {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
  justify-items: stretch !important;
  column-gap: 0.46rem !important;
}

.release-action-content .release-quantity-row > span {
  align-self: center !important;
  justify-self: start !important;
  min-width: 0 !important;
  margin: 0 !important;
}

.release-action-content .release-stepper.cart-stepper {
  display: grid !important;
  grid-template-columns: 28px 38px 28px !important;
  width: max-content !important;
  min-width: max-content !important;
  align-items: center !important;
  justify-content: end !important;
  justify-self: end !important;
  place-items: center !important;
  gap: 0.2rem !important;
  margin: 0 !important;
  flex: 0 0 auto !important;
}

.release-action-content .release-stepper-btn,
.release-action-content .release-stepper-btn::part(native) {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  justify-self: center !important;
  align-self: center !important;
  position: relative !important;
  margin: 0 !important;
  transform: none !important;
  box-sizing: border-box !important;
}

.release-action-content .release-stepper-btn::part(native) {
  inset: auto !important;
}

.release-action-content .release-stepper-btn ion-icon {
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  margin: 0 !important;
}

.release-action-content .release-quantity-input {
  justify-self: center !important;
  align-self: center !important;
  margin: 0 !important;
  display: block !important;
}

@media (max-width: 520px) {
  .release-action-content .release-quantity-row {
    column-gap: 0.38rem !important;
  }

  .release-action-content .release-stepper.cart-stepper {
    grid-template-columns: 27px 36px 27px !important;
    gap: 0.18rem !important;
  }
}

/* Reestructura trabajo/area */
.work-info-card {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 0.72rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.work-info-card h3 {
  margin: 0 0 0.2rem;
  font-size: 0.92rem;
  font-weight: 800;
  color: #0f172a;
}


/* Multiárea en préstamos: selección por producto y área rápida */
.work-info-note {
  background: #ffffff;
  border: 1px solid #dbe5f2;
  border-radius: 14px;
  padding: 0.64rem;
  box-sizing: border-box;
}

.work-info-note strong {
  display: block;
  color: #0f172a;
  font-size: 0.7rem;
  line-height: 1.15;
  margin: 0 0 0.16rem;
}

.work-info-note p {
  margin: 0;
  color: #64748b;
  font-size: 0.62rem;
  line-height: 1.28;
}

.quick-area-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 138px;
  align-items: center;
  gap: 0.62rem;
  background: #f8fafc;
  border: 1px solid #dbe5f2;
  border-radius: 16px;
  padding: 0.68rem;
  margin: 0.58rem 0 0.68rem;
  box-sizing: border-box;
}

.quick-area-copy h3 {
  margin: 0 0 0.14rem;
  color: #0f172a;
  font-size: 0.75rem;
  font-weight: 850;
  line-height: 1.14;
}

.quick-area-copy p {
  margin: 0;
  color: #64748b;
  font-size: 0.62rem;
  line-height: 1.25;
}

.quick-area-select {
  width: 100%;
  min-height: 38px;
  --padding-start: 0.54rem;
  --padding-end: 0.54rem;
  --background: #ffffff;
  border: 1px solid #dbe5f2;
  border-radius: 12px;
  color: #0f172a;
  font-size: 0.68rem;
  font-weight: 800;
}

.cart-area-selector {
  --background: #f8fafc;
  --padding-start: 0;
  --inner-padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  border: 1px solid #e4ebf5;
  border-radius: 14px;
  margin: 0.48rem 0;
  overflow: hidden;
}

.cart-area-selector::part(native) {
  padding: 0.58rem !important;
  min-height: 0;
  box-sizing: border-box;
}

.cart-area-selector ion-label {
  margin: 0 0 0.16rem;
  color: #64748b;
  font-size: 0.62rem;
  font-weight: 850;
}

.cart-area-selector ion-select {
  width: 100%;
  font-size: 0.7rem;
  font-weight: 800;
  color: #0f172a;
}

.picker-area-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.34rem;
  margin-top: 0.58rem;
}

.area-add-button {
  margin: 0;
  min-height: 34px;
  --border-radius: 12px;
  --padding-start: 0.22rem;
  --padding-end: 0.22rem;
  font-size: 0.58rem;
  font-weight: 800;
  white-space: normal;
}

.area-add-button::part(native) {
  display: flex;
  flex-direction: column;
  gap: 0.03rem;
  padding: 0.28rem 0.2rem;
}

.area-add-button span,
.area-add-button strong {
  display: block;
  line-height: 1.08;
}

.area-add-button strong {
  font-size: 0.72rem;
  font-weight: 900;
}

.product-picker-content .picker-product-card {
  cursor: pointer;
}

.product-picker-content .picker-product-card:active {
  transform: scale(0.996);
}

@media (max-width: 520px) {
  .quick-area-card {
    grid-template-columns: 1fr;
    gap: 0.48rem;
    padding: 0.62rem;
  }

  .quick-area-select {
    min-height: 36px;
  }

  .picker-area-actions {
    grid-template-columns: 1fr;
    gap: 0.3rem;
  }

  .area-add-button {
    min-height: 32px;
  }

  .area-add-button::part(native) {
    flex-direction: row;
    justify-content: space-between;
    padding: 0.26rem 0.44rem;
  }

  .cart-area-selector::part(native) {
    padding: 0.54rem !important;
  }
}


/* Reparación visual multiárea: alinear Prestamos con el estilo de Productos */
.hero-actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  gap: 0.34rem;
  min-width: 132px;
  flex-shrink: 0;
}

.hero-actions .hero-button {
  width: 100%;
}

.prestamos-list {
  display: flex;
  flex-direction: column;
  gap: 0.52rem;
}

.prestamo-card {
  margin: 0 !important;
  border-radius: 16px;
}

.prestamo-card-content {
  display: flex;
  flex-direction: column;
  gap: 0.52rem;
  padding: 0.7rem !important;
}

.prestamo-card-content .prestamo-topline,
.picker-product-content .prestamo-topline,
.cart-item-content .cart-item-header {
  margin-bottom: 0 !important;
}

.card-footnote {
  margin-top: 0 !important;
}

.delivery-modal-form,
.detail-modal-form,
.adeudo-modal-form,
.picker-modal-form {
  gap: 0.68rem !important;
}

.form-card,
.items-card,
.modern-form-card,
.detail-hero,
.toolbar-card,
.comments-box,
.history-box,
.closing-card {
  border-color: #dbe5f2 !important;
  border-radius: 18px !important;
}

.form-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.form-card > ion-item,
.work-info-card ion-item,
.closing-card ion-item,
.adeudo-modal-form ion-item {
  border: 1px solid #e4ebf5;
  background: #f8fafc;
}

.work-info-card {
  background: #ffffff !important;
  border: 1px solid #dbe5f2 !important;
  border-radius: 18px !important;
  padding: 0.76rem !important;
  gap: 0.58rem !important;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
}

.work-info-card h3 {
  margin: 0 !important;
  font-size: 0.86rem !important;
  line-height: 1.16;
}

.work-info-note {
  padding: 0.62rem !important;
  border-radius: 14px !important;
  background: #f8fafc !important;
}

.general-comment-input,
.cart-comment-input,
.release-comment-input {
  background: #f8fafc;
  border-color: #dbe5f2 !important;
  border-radius: 15px !important;
}

.general-comment-input {
  margin-top: 0 !important;
}

.general-comment-input::part(native),
.cart-comment-input::part(native),
.release-comment-input::part(native) {
  padding: 0.62rem !important;
}

.cart-entry-card,
.cart-card,
.empty-cart-card {
  display: flex;
  flex-direction: column;
  gap: 0.64rem;
  padding: 0.72rem !important;
}

.cart-entry-card .cart-heading,
.cart-card .cart-heading,
.empty-cart-card .cart-heading {
  margin: 0 !important;
}

.quick-area-card {
  margin: 0 !important;
  padding: 0.64rem !important;
  border-radius: 15px !important;
  background: #f8fafc !important;
  border-color: #dbe5f2 !important;
  gap: 0.58rem !important;
}

.quick-area-copy h3,
.cart-picker-trigger .picker-item-title,
.compact-toggle .picker-item-title,
.compact-toggle h3 {
  color: #0f172a !important;
  font-size: 0.74rem !important;
  font-weight: 850 !important;
  line-height: 1.14 !important;
}

.quick-area-copy p,
.cart-picker-trigger p,
.compact-toggle p {
  color: #64748b !important;
  font-size: 0.62rem !important;
  line-height: 1.24 !important;
}

.quick-area-select {
  min-height: 36px !important;
  border-radius: 12px !important;
  background: #ffffff !important;
}

.cart-actions-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.58rem !important;
  margin: 0 !important;
}

.cart-scan-button {
  margin: 0 !important;
  min-height: 42px;
  --border-radius: 14px;
}

.cart-picker-trigger,
.compact-toggle,
.batch-scan-toggle {
  margin: 0 !important;
  border-color: #dbe5f2 !important;
  border-radius: 15px !important;
  background: #f8fafc !important;
}

.cart-picker-trigger::part(native),
.compact-toggle::part(native),
.batch-scan-toggle::part(native) {
  padding: 0.62rem !important;
  min-height: 52px !important;
  box-sizing: border-box !important;
  align-items: center !important;
}

.batch-scan-toggle ion-toggle {
  flex: 0 0 auto;
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: 0.62rem !important;
}

.cart-product-card {
  margin: 0 !important;
  border-color: #dbe5f2 !important;
  border-radius: 18px !important;
  background: #ffffff;
}

.cart-product-card::part(native) {
  padding: 0 !important;
}

.cart-item-content {
  display: flex;
  flex-direction: column;
  gap: 0.56rem;
  padding: 0.72rem !important;
}

.cart-item-header {
  margin: 0 !important;
  gap: 0.42rem !important;
}

.cart-chip-row {
  gap: 0.22rem;
}

.cart-area-selector {
  margin: 0 !important;
  border-color: #e4ebf5 !important;
  border-radius: 14px !important;
  background: #f8fafc;
}

.cart-area-selector::part(native) {
  padding: 0.56rem !important;
}

.cart-stock-grid {
  margin: 0 !important;
  gap: 0.28rem !important;
}

.cart-quantity-stack {
  margin: 0 !important;
  gap: 0.42rem !important;
}

.quantity-control-row {
  margin: 0 !important;
  padding: 0.46rem 0.5rem !important;
  border-radius: 14px !important;
  border-color: #e4ebf5 !important;
  background: #f8fafc !important;
}

.quantity-control-row > span {
  font-size: 0.66rem !important;
  font-weight: 820 !important;
}

.cart-stepper {
  grid-template-columns: 32px 40px 32px !important;
  gap: 0.22rem !important;
  align-items: center !important;
  justify-content: end !important;
}

.stepper-btn,
.stepper-btn::part(native) {
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  min-height: 32px !important;
  max-width: 32px !important;
  max-height: 32px !important;
}

.cart-quantity-input {
  width: 40px !important;
  height: 38px !important;
  min-width: 40px !important;
  min-height: 38px !important;
  max-width: 40px !important;
  max-height: 38px !important;
}

.cart-comment-input {
  margin: 0 !important;
}

.cart-remove-button {
  margin: 0 !important;
  min-height: 34px;
  --border-radius: 12px;
}

.product-picker-content,
.picker-modal-form {
  gap: 0.62rem !important;
}

.picker-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem !important;
  padding: 0.72rem !important;
  border-radius: 18px !important;
  background: #ffffff !important;
}

.product-searchbar::part(container) {
  min-height: 40px !important;
  border: 1px solid #dbe5f2 !important;
  border-radius: 14px !important;
  background: #f8fafc !important;
  box-shadow: none !important;
}

.product-searchbar::part(search-icon) {
  color: #64748b;
}

.product-searchbar::part(input) {
  color: #0f172a;
  font-size: 0.72rem !important;
  font-weight: 700;
}

.picker-list {
  display: flex;
  flex-direction: column;
  gap: 0.58rem !important;
}

.picker-product-card {
  margin: 0 !important;
  border-color: #dbe5f2 !important;
  border-radius: 18px !important;
}

.picker-product-content {
  display: flex;
  flex-direction: column;
  gap: 0.52rem;
  padding: 0.72rem !important;
}

.picker-stock-grid {
  margin: 0 !important;
}

.picker-area-actions {
  margin: 0 !important;
  gap: 0.34rem !important;
}

.area-add-button {
  min-height: 34px !important;
  margin: 0 !important;
  --border-radius: 12px;
}

.area-add-button::part(native) {
  padding: 0.28rem 0.34rem !important;
  min-height: 34px;
  box-sizing: border-box;
}

.detail-hero {
  align-items: flex-start !important;
  padding: 0.76rem !important;
}

.modern-accordion {
  display: flex;
  flex-direction: column;
  gap: 0.58rem !important;
}

.modern-accordion ion-accordion {
  margin: 0 !important;
}

.accordion-card {
  margin: 0 !important;
  border-color: #dbe5f2 !important;
}

.accordion-header-content {
  display: flex;
  flex-direction: column;
  gap: 0.52rem;
  padding: 0.72rem !important;
}

.release-summary-grid {
  margin: 0 !important;
}

.accordion-content {
  margin-top: 0 !important;
  padding: 0.64rem !important;
  border-radius: 0 0 18px 18px !important;
}

.release-accordion-group {
  margin-top: 0.58rem !important;
}

.release-action-accordion {
  border-color: #dbe5f2 !important;
}

.release-header-content {
  padding: 0.48rem 0.54rem !important;
}

.release-action-content {
  padding: 0.5rem 0.54rem !important;
}

.release-quantity-row {
  padding: 0.42rem 0.46rem !important;
}

.closing-card {
  display: flex;
  flex-direction: column;
  gap: 0.56rem;
}

.closing-card ion-item {
  margin: 0 !important;
}

.adeudo-modal-form .detail-hero,
.adeudo-modal-form .form-card {
  padding: 0.74rem !important;
}

.modal-footer ion-toolbar {
  --padding-start: 0.78rem;
  --padding-end: 0.78rem;
  --padding-top: 0.68rem;
  --padding-bottom: 0.78rem;
}

@media (max-width: 640px) {
  .hero-actions {
    width: 100%;
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-button {
    width: 100%;
  }
}

@media (max-width: 520px) {
  .modal-form,
  .delivery-modal-form,
  .detail-modal-form,
  .adeudo-modal-form,
  .picker-modal-form,
  .product-picker-content {
    padding: 0.68rem !important;
    gap: 0.6rem !important;
  }

  .form-card,
  .items-card,
  .modern-form-card,
  .detail-hero,
  .toolbar-card,
  .comments-box,
  .history-box,
  .closing-card,
  .cart-entry-card,
  .cart-card,
  .empty-cart-card,
  .work-info-card,
  .picker-toolbar,
  .accordion-header-content,
  .cart-item-content,
  .picker-product-content,
  .prestamo-card-content {
    padding: 0.64rem !important;
  }

  .quick-area-card {
    grid-template-columns: 1fr !important;
    padding: 0.58rem !important;
  }

  .cart-item-header,
  .prestamo-topline {
    flex-direction: column;
    align-items: stretch;
  }

  .compact-chip-row,
  .cart-chip-row {
    justify-content: flex-start;
    max-width: 100%;
  }

  .quantity-control-row,
  .release-action-content .release-quantity-row {
    grid-template-columns: 1fr auto !important;
    gap: 0.38rem !important;
  }

  .picker-area-actions {
    grid-template-columns: 1fr !important;
  }

  .modal-footer ion-toolbar {
    --padding-start: 0.68rem;
    --padding-end: 0.68rem;
    --padding-top: 0.62rem;
    --padding-bottom: 0.68rem;
  }
}


/* Ajuste final: steppers alineados y reutilizables */
.cart-quantity-stack {
  gap: 0.44rem !important;
}

.quantity-control-row,
.release-quantity-row,
.adeudo-quantity-row {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
  gap: 0.58rem !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

.quantity-control-row > span,
.release-quantity-row > span,
.adeudo-quantity-row > span {
  min-width: 0 !important;
  align-self: center !important;
  display: block !important;
}

.cart-stepper,
.release-stepper,
.adeudo-stepper {
  display: grid !important;
  grid-template-columns: 30px 48px 30px !important;
  align-items: center !important;
  justify-items: center !important;
  justify-self: end !important;
  gap: 0.24rem !important;
  width: auto !important;
  min-width: 0 !important;
  flex: 0 0 auto !important;
}

.stepper-btn,
.release-stepper-btn,
.adeudo-stepper-btn {
  width: 30px !important;
  height: 30px !important;
  min-width: 30px !important;
  min-height: 30px !important;
  max-width: 30px !important;
  max-height: 30px !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  overflow: visible !important;
}

.stepper-btn::part(native),
.release-stepper-btn::part(native),
.adeudo-stepper-btn::part(native) {
  width: 30px !important;
  height: 30px !important;
  min-width: 30px !important;
  min-height: 30px !important;
  max-width: 30px !important;
  max-height: 30px !important;
  display: grid !important;
  place-items: center !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 1px solid #dbe3ee !important;
  border-radius: 9px !important;
  background: #ffffff !important;
  box-sizing: border-box !important;
  transform: none !important;
}

.stepper-btn ion-icon,
.release-stepper-btn ion-icon,
.adeudo-stepper-btn ion-icon {
  width: 14px !important;
  height: 14px !important;
  font-size: 14px !important;
  line-height: 1 !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  position: static !important;
  transform: none !important;
}

.cart-quantity-input,
.release-quantity-input,
.adeudo-quantity-input {
  width: 48px !important;
  height: 34px !important;
  min-width: 48px !important;
  min-height: 34px !important;
  max-width: 48px !important;
  max-height: 34px !important;
  align-self: center !important;
  justify-self: center !important;
  box-sizing: border-box !important;
  border-radius: 9px !important;
  overflow: hidden !important;
}

.cart-quantity-input::part(native),
.release-quantity-input::part(native),
.adeudo-quantity-input::part(native) {
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
  text-align: center !important;
  line-height: 34px !important;
}

.adeudo-quantity-row {
  margin-bottom: 0.52rem !important;
  padding: 0.5rem 0.54rem !important;
  border: 1px solid #e4ebf5 !important;
  border-radius: 13px !important;
  background: #f8fafc !important;
}

@media (max-width: 430px) {
  .cart-stepper,
  .release-stepper,
  .adeudo-stepper {
    grid-template-columns: 28px 44px 28px !important;
    gap: 0.2rem !important;
  }

  .stepper-btn,
  .stepper-btn::part(native),
  .release-stepper-btn,
  .release-stepper-btn::part(native),
  .adeudo-stepper-btn,
  .adeudo-stepper-btn::part(native) {
    width: 28px !important;
    height: 28px !important;
    min-width: 28px !important;
    min-height: 28px !important;
    max-width: 28px !important;
    max-height: 28px !important;
  }

  .cart-quantity-input,
  .release-quantity-input,
  .adeudo-quantity-input {
    width: 44px !important;
    min-width: 44px !important;
    max-width: 44px !important;
  }
}


/* UX multiárea: carrito agrupado por producto y selección clara de origen */
.cart-group-list {
  gap: 0.72rem !important;
}

.cart-group-card {
  border-radius: 20px !important;
  border-color: #dbe5f2 !important;
  background: #ffffff !important;
}

.cart-group-content {
  gap: 0.66rem !important;
}

.cart-group-header {
  padding-bottom: 0.18rem;
  border-bottom: 1px solid #edf2f7;
}

.cart-area-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.34rem;
  width: 100%;
}

.cart-area-summary-pill {
  display: flex;
  flex-direction: column;
  gap: 0.08rem;
  min-width: 0;
  padding: 0.44rem 0.38rem;
  border: 1px solid #e6edf6;
  border-radius: 14px;
  background: #f8fafc;
  color: #64748b;
  box-sizing: border-box;
}

.cart-area-summary-pill.is-active {
  border-color: #a7f3d0;
  background: #ecfdf5;
  color: #047857;
}

.cart-area-summary-pill strong {
  font-size: 0.62rem;
  line-height: 1.05;
  font-weight: 900;
  color: #0f172a;
}

.cart-area-summary-pill span,
.cart-area-summary-pill small {
  font-size: 0.56rem;
  line-height: 1.12;
  font-weight: 750;
}

.cart-area-lines {
  display: flex;
  flex-direction: column;
  gap: 0.62rem;
}

.cart-area-line {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.62rem;
  border: 1px solid #e4ebf5;
  border-radius: 16px;
  background: #fbfdff;
  box-sizing: border-box;
}

.cart-area-line-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.44rem;
}

.cart-area-line-header h4 {
  margin: 0.08rem 0 0;
  font-size: 0.78rem;
  line-height: 1.12;
  font-weight: 900;
  color: #0f172a;
}

.compact-area-selector {
  border-radius: 13px !important;
}

.compact-area-selector::part(native) {
  padding: 0.48rem !important;
}

.cart-add-area-panel {
  display: flex;
  flex-direction: column;
  gap: 0.44rem;
  padding: 0.58rem;
  border: 1px dashed #cbd5e1;
  border-radius: 16px;
  background: #f8fafc;
  box-sizing: border-box;
}

.cart-add-area-heading {
  display: flex;
  justify-content: space-between;
  gap: 0.38rem;
  align-items: flex-start;
}

.cart-add-area-heading strong {
  font-size: 0.68rem;
  line-height: 1.16;
  color: #0f172a;
  font-weight: 900;
}

.cart-add-area-heading span {
  font-size: 0.58rem;
  line-height: 1.18;
  color: #64748b;
  text-align: right;
}

.cart-area-add-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.34rem;
}

.area-add-button--cart::part(native) {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0.04rem !important;
  min-height: 44px !important;
  padding: 0.32rem 0.2rem !important;
}

.area-add-button--cart span,
.area-add-button--cart strong,
.area-add-button--cart small {
  display: block;
  line-height: 1.08;
}

.area-add-button--cart span {
  font-size: 0.56rem;
  font-weight: 850;
}

.area-add-button--cart strong {
  font-size: 0.72rem;
  font-weight: 950;
}

.area-add-button--cart small {
  font-size: 0.5rem;
  opacity: 0.72;
}

.picker-area-cards {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 0.42rem !important;
  margin: 0 !important;
}

.area-pick-card {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  min-width: 0;
  width: 100%;
  min-height: 78px;
  padding: 0.52rem 0.48rem;
  border: 1px solid #dbe5f2;
  border-radius: 15px;
  background: #ffffff;
  color: #0f172a;
  text-align: left;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  box-sizing: border-box;
}

.area-pick-card.is-fast-area {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.area-pick-card.has-cart {
  border-color: #a7f3d0;
  background: #ecfdf5;
}

.area-pick-card.is-disabled {
  opacity: 0.48;
  box-shadow: none;
}

.area-pick-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.3rem;
}

.area-pick-topline strong {
  font-size: 0.66rem;
  line-height: 1.08;
  font-weight: 950;
}

.area-pick-topline small {
  padding: 0.12rem 0.28rem;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
  font-size: 0.48rem;
  line-height: 1;
  font-weight: 900;
}

.area-pick-stock {
  font-size: 0.56rem;
  line-height: 1.18;
  color: #475569;
  font-weight: 760;
}

.area-pick-cart {
  margin-top: auto;
  font-size: 0.54rem;
  line-height: 1.1;
  color: #047857;
  font-weight: 900;
}

.area-pick-cart--empty {
  color: #64748b;
}

.cart-area-line .quantity-control-row {
  grid-template-columns: minmax(0, 1fr) auto !important;
  min-height: 42px;
}

.cart-area-line .cart-stepper {
  justify-self: end !important;
  align-self: center !important;
}

@media (max-width: 520px) {
  .cart-area-summary,
  .cart-area-add-grid,
  .picker-area-cards {
    grid-template-columns: 1fr !important;
  }

  .cart-area-summary-pill {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 0.3rem;
  }

  .cart-area-line {
    padding: 0.56rem;
  }

  .cart-area-line-header,
  .cart-add-area-heading {
    flex-direction: column;
    align-items: stretch;
  }


  @media (max-width: 640px) {
    .prestamo-title-block h3,
    .cart-accordion-main-row .prestamo-title-block h3,
    .cart-add-area-heading strong,
    .area-pick-topline strong,
    .cart-edit-hint strong {
      font-size: 1rem !important;
      line-height: 1.25 !important;
    }

    .prestamo-title-block p,
    .cart-accordion-main-row .prestamo-title-block p,
    .cart-add-area-heading span,
    .area-pick-topline small,
    .area-pick-stock,
    .area-pick-cart,
    .cart-edit-hint span,
    .field-hint,
    .empty-state p,
    .loading-state p {
      font-size: 0.82rem !important;
      line-height: 1.45 !important;
    }

    .cart-area-mini-chip,
    .ui-chip,
    .overview-label,
    .stock-metric span,
    .cart-accordion-total span,
    .sort-control ion-label,
    .form-card ion-label,
    .modern-form-card ion-label,
    .section-label {
      font-size: 0.72rem !important;
      line-height: 1.3 !important;
    }

    .cart-accordion-total strong,
    .stock-metric strong,
    .overview-card strong,
    .area-pick-topline strong {
      font-size: 1rem !important;
      line-height: 1.12 !important;
    }

    .form-card ion-input,
    .form-card ion-select,
    .form-card ion-textarea,
    .modern-form-card ion-input,
    .modern-form-card ion-select,
    .modern-form-card ion-textarea,
    .product-searchbar::part(input) {
      font-size: 0.92rem !important;
      line-height: 1.4 !important;
    }

    :global(ion-modal.prestamo-modal) .modal-form,
    :global(ion-modal.prestamo-modal) .modal-form *,
    :global(ion-modal.product-picker-modal) .modal-form,
    :global(ion-modal.product-picker-modal) .modal-form *,
    :global(ion-modal.wide-modal) .modal-form,
    :global(ion-modal.wide-modal) .modal-form * {
      font-size: 0.92rem !important;
      line-height: 1.4 !important;
    }

    :global(ion-modal.prestamo-modal) .modal-form h2,
    :global(ion-modal.prestamo-modal) .modal-form h3,
    :global(ion-modal.product-picker-modal) .modal-form h2,
    :global(ion-modal.product-picker-modal) .modal-form h3,
    :global(ion-modal.wide-modal) .modal-form h2,
    :global(ion-modal.wide-modal) .modal-form h3 {
      font-size: 1rem !important;
      line-height: 1.25 !important;
    }
  }
  .cart-add-area-heading span {
    text-align: left;
  }

  .area-add-button--cart::part(native) {
    flex-direction: row !important;
    justify-content: space-between !important;
    min-height: 38px !important;
    padding: 0.3rem 0.48rem !important;
  }

  .area-pick-card {
    min-height: 0;
    padding: 0.48rem;
  }
}


/* Carrito atomizado por producto: acordeones compactos y áreas internas */
.cart-product-accordion-group {
  display: grid;
  gap: 0.58rem;
  background: transparent;
  padding: 0;
}

.cart-product-accordion {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.06);
}

.cart-product-accordion-header {
  --background: transparent;
  --padding-start: 0;
  --inner-padding-end: 0;
  --min-height: 0;
  --border-width: 0;
  --ripple-color: rgba(37, 99, 235, 0.08);
  margin: 0;
}

.cart-product-accordion-header::part(native) {
  padding: 0.68rem 0.76rem;
  align-items: center;
}

.cart-accordion-label {
  margin: 0 !important;
}

.cart-accordion-main-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.55rem;
  align-items: center;
}

.cart-accordion-main-row .prestamo-title-block h3 {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.15;
  font-weight: 900;
  color: #0f172a;
}

.cart-accordion-main-row .prestamo-title-block p {
  margin: 0.16rem 0 0;
  font-size: 0.66rem;
  line-height: 1.2;
  color: #64748b;
  font-weight: 700;
}

.cart-accordion-total {
  min-width: 48px;
  padding: 0.3rem 0.42rem;
  border-radius: 14px;
  background: rgba(22, 163, 74, 0.12);
  border: 1px solid rgba(22, 163, 74, 0.18);
  color: #047857;
  display: grid;
  justify-items: center;
  line-height: 1;
}

.cart-accordion-total strong {
  font-size: 0.92rem;
  font-weight: 950;
}

.cart-accordion-total span {
  margin-top: 0.12rem;
  font-size: 0.52rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cart-area-mini-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.28rem;
  margin-top: 0.42rem;
}

.cart-area-mini-chip {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0.16rem 0.38rem;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  border: 1px solid rgba(37, 99, 235, 0.14);
  color: #1d4ed8;
  font-size: 0.58rem;
  line-height: 1;
  font-weight: 900;
}

.cart-product-accordion-content {
  display: grid;
  gap: 0.6rem;
  padding: 0 0.72rem 0.78rem;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.68), rgba(255, 255, 255, 0.96));
}

.cart-edit-hint {
  display: grid;
  gap: 0.14rem;
  padding: 0.5rem 0.56rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(248, 250, 252, 0.86);
}

.cart-edit-hint strong {
  font-size: 0.68rem;
  line-height: 1.1;
  color: #0f172a;
  font-weight: 900;
}

.cart-edit-hint span {
  font-size: 0.6rem;
  line-height: 1.25;
  color: #64748b;
  font-weight: 700;
}

.cart-area-line--compact {
  padding: 0.6rem !important;
  border-radius: 16px;
  gap: 0.54rem;
}

.cart-line-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.32rem;
  flex-wrap: wrap;
}

.cart-remove-button--compact {
  margin: 0 !important;
  min-height: 24px !important;
  height: 24px !important;
  font-size: 0.58rem !important;
  font-weight: 900;
}

.cart-remove-button--compact::part(native) {
  padding: 0 0.32rem !important;
}

.cart-stock-grid--compact {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.36rem;
}

.cart-stock-grid--compact .stock-metric {
  min-height: 46px;
  padding: 0.38rem 0.42rem;
}

.cart-stock-grid--compact .stock-metric span {
  font-size: 0.54rem;
}

.cart-stock-grid--compact .stock-metric strong {
  font-size: 0.82rem;
}

.cart-quantity-stack--compact {
  gap: 0.38rem;
}

.cart-quantity-stack--compact .quantity-control-row {
  min-height: 38px !important;
  padding: 0.38rem 0.45rem !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
}

.cart-quantity-stack--compact .quantity-control-row > span {
  font-size: 0.64rem !important;
  line-height: 1.15;
}

.cart-quantity-stack--compact .cart-stepper {
  height: 32px !important;
  align-items: center !important;
}

.cart-quantity-stack--compact .stepper-btn {
  width: 30px !important;
  height: 30px !important;
  min-width: 30px !important;
  min-height: 30px !important;
}

.cart-quantity-stack--compact .stepper-btn::part(native) {
  width: 30px !important;
  height: 30px !important;
  min-width: 30px !important;
  min-height: 30px !important;
  border-radius: 10px !important;
  padding: 0 !important;
}

.cart-quantity-stack--compact .cart-quantity-input {
  width: 52px !important;
  min-width: 52px !important;
  height: 32px !important;
  min-height: 32px !important;
  font-size: 0.78rem !important;
}

.cart-comment-input--compact {
  margin-top: 0.02rem;
}

.cart-comment-input--compact::part(native) {
  padding: 0.48rem 0.56rem !important;
  min-height: 0 !important;
}

.cart-add-area-panel--compact {
  padding: 0.58rem !important;
  border-radius: 16px;
}

.cart-add-area-panel--compact .cart-add-area-heading {
  gap: 0.16rem;
  margin-bottom: 0.46rem;
}

.cart-add-area-panel--compact .cart-add-area-heading strong {
  font-size: 0.68rem;
}

.cart-add-area-panel--compact .cart-add-area-heading span {
  font-size: 0.58rem;
}

.cart-add-area-panel--compact .area-add-button--cart::part(native) {
  min-height: 36px !important;
  padding: 0.28rem 0.42rem !important;
}

.product-picker-content .area-pick-cart--empty {
  font-weight: 850;
}

@media (max-width: 520px) {
  .cart-product-accordion-header::part(native) {
    padding: 0.62rem 0.64rem;
  }

  .cart-product-accordion-content {
    padding: 0 0.58rem 0.66rem;
  }

  .cart-accordion-main-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .cart-stock-grid--compact {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }

  .cart-area-line-header {
    flex-direction: row !important;
    align-items: center !important;
  }

  .cart-line-actions {
    align-items: flex-end;
  }

  .cart-quantity-stack--compact .quantity-control-row {
    grid-template-columns: minmax(0, 1fr) auto !important;
  }
}

@media (max-width: 390px) {
  .cart-stock-grid--compact {
    grid-template-columns: 1fr !important;
  }

  .cart-area-line-header {
    flex-direction: column !important;
    align-items: stretch !important;
  }

  .cart-line-actions {
    justify-content: space-between;
  }
}


/* Ajuste estético final: carrito atomizado integrado al estilo moderno del módulo */
.cart-product-accordion-group {
  display: grid !important;
  gap: 0.64rem !important;
  padding: 0 !important;
}

.cart-product-accordion {
  border: 1px solid #dbe5f2 !important;
  border-radius: 20px !important;
  background: #ffffff !important;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.055) !important;
  overflow: hidden !important;
}

.cart-product-accordion-header {
  --background: #ffffff !important;
  --border-width: 0 !important;
  --inner-border-width: 0 !important;
  --padding-start: 0 !important;
  --inner-padding-end: 0 !important;
  --min-height: 0 !important;
  margin: 0 !important;
}

.cart-product-accordion-header::part(native) {
  min-height: 0 !important;
  padding: 0.72rem 0.76rem !important;
  align-items: center !important;
}

.cart-accordion-label {
  margin: 0 !important;
  display: block !important;
}

.cart-accordion-main-row {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
  gap: 0.58rem !important;
}

.cart-accordion-main-row .prestamo-title-block {
  min-width: 0 !important;
}

.cart-accordion-main-row .prestamo-title-block h3 {
  margin: 0 !important;
  font-size: 0.84rem !important;
  line-height: 1.18 !important;
  font-weight: 900 !important;
  letter-spacing: -0.01em !important;
  color: #0f172a !important;
  white-space: normal !important;
}

.cart-accordion-main-row .prestamo-title-block p {
  margin: 0.18rem 0 0 !important;
  font-size: 0.62rem !important;
  line-height: 1.22 !important;
  color: #64748b !important;
  font-weight: 750 !important;
}

.cart-accordion-total {
  min-width: 44px !important;
  padding: 0.28rem 0.4rem !important;
  border-radius: 14px !important;
  background: #ecfdf5 !important;
  border: 1px solid #bbf7d0 !important;
  color: #047857 !important;
  display: grid !important;
  place-items: center !important;
  line-height: 1 !important;
}

.cart-accordion-total strong {
  font-size: 0.88rem !important;
  font-weight: 950 !important;
}

.cart-accordion-total span {
  margin-top: 0.12rem !important;
  font-size: 0.48rem !important;
  font-weight: 900 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
}

.cart-area-mini-row {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 0.28rem !important;
  margin-top: 0.44rem !important;
}

.cart-area-mini-chip {
  min-height: 20px !important;
  padding: 0.16rem 0.38rem !important;
  border-radius: 999px !important;
  background: #eff6ff !important;
  border: 1px solid #dbeafe !important;
  color: #1d4ed8 !important;
  font-size: 0.56rem !important;
  line-height: 1 !important;
  font-weight: 900 !important;
}

.cart-product-accordion-content {
  display: grid !important;
  gap: 0.62rem !important;
  padding: 0.68rem !important;
  border-top: 1px solid #eef2f7 !important;
  background: #f8fafc !important;
}

.cart-edit-hint {
  display: grid !important;
  gap: 0.14rem !important;
  padding: 0.54rem 0.58rem !important;
  border-radius: 15px !important;
  border: 1px solid #e4ebf5 !important;
  background: #ffffff !important;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.035) !important;
}

.cart-edit-hint strong {
  font-size: 0.66rem !important;
  line-height: 1.12 !important;
  color: #0f172a !important;
  font-weight: 900 !important;
}

.cart-edit-hint span {
  font-size: 0.58rem !important;
  line-height: 1.24 !important;
  color: #64748b !important;
  font-weight: 700 !important;
}

.cart-area-lines {
  display: grid !important;
  gap: 0.62rem !important;
}

.cart-area-line,
.cart-area-line--compact {
  display: grid !important;
  gap: 0.58rem !important;
  padding: 0.66rem !important;
  border: 1px solid #dbe5f2 !important;
  border-radius: 18px !important;
  background: #ffffff !important;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.04) !important;
  box-sizing: border-box !important;
}

.cart-area-line-header {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
  gap: 0.48rem !important;
}

.cart-area-line-header .eyebrow {
  font-size: 0.54rem !important;
  line-height: 1 !important;
  font-weight: 900 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
  color: #64748b !important;
}

.cart-area-line-header h4 {
  margin: 0.14rem 0 0 !important;
  font-size: 0.78rem !important;
  line-height: 1.1 !important;
  font-weight: 950 !important;
  color: #0f172a !important;
}

.cart-line-actions {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 0.32rem !important;
  flex-wrap: nowrap !important;
}

.cart-remove-button--compact {
  height: 26px !important;
  min-height: 26px !important;
  margin: 0 !important;
  font-size: 0.58rem !important;
  font-weight: 900 !important;
}

.cart-remove-button--compact::part(native) {
  min-height: 26px !important;
  padding: 0 0.36rem !important;
  border-radius: 999px !important;
}

.cart-stock-grid--compact {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 0.38rem !important;
}

.cart-stock-grid--compact .stock-metric {
  min-height: 44px !important;
  padding: 0.38rem 0.42rem !important;
  border-radius: 14px !important;
}

.cart-stock-grid--compact .stock-metric span {
  font-size: 0.52rem !important;
  line-height: 1.05 !important;
}

.cart-stock-grid--compact .stock-metric strong {
  font-size: 0.8rem !important;
  line-height: 1 !important;
}

.cart-quantity-stack--compact {
  display: grid !important;
  gap: 0.38rem !important;
}

.cart-quantity-stack--compact .quantity-control-row,
.cart-area-line .quantity-control-row {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
  min-height: 38px !important;
  padding: 0.4rem 0.46rem !important;
  border: 1px solid #e4ebf5 !important;
  border-radius: 14px !important;
  background: #f8fafc !important;
  gap: 0.48rem !important;
}

.cart-quantity-stack--compact .quantity-control-row > span,
.cart-area-line .quantity-control-row > span {
  min-width: 0 !important;
  font-size: 0.64rem !important;
  line-height: 1.15 !important;
  font-weight: 900 !important;
  color: #334155 !important;
}

.cart-quantity-stack--compact .cart-stepper,
.cart-area-line .cart-stepper {
  display: grid !important;
  grid-template-columns: 30px 54px 30px !important;
  align-items: center !important;
  justify-items: center !important;
  gap: 0.18rem !important;
  width: auto !important;
  height: 32px !important;
  margin: 0 !important;
  justify-self: end !important;
  overflow: visible !important;
}

.cart-quantity-stack--compact .stepper-btn,
.cart-area-line .stepper-btn {
  width: 30px !important;
  height: 30px !important;
  min-width: 30px !important;
  min-height: 30px !important;
  margin: 0 !important;
  --padding-start: 0 !important;
  --padding-end: 0 !important;
  --border-radius: 10px !important;
  overflow: visible !important;
}

.cart-quantity-stack--compact .stepper-btn::part(native),
.cart-area-line .stepper-btn::part(native) {
  width: 30px !important;
  height: 30px !important;
  min-width: 30px !important;
  min-height: 30px !important;
  padding: 0 !important;
  border-radius: 10px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.cart-quantity-stack--compact .stepper-btn ion-icon,
.cart-area-line .stepper-btn ion-icon {
  width: 15px !important;
  height: 15px !important;
  margin: 0 !important;
}

.cart-quantity-stack--compact .cart-quantity-input,
.cart-area-line .cart-quantity-input {
  width: 54px !important;
  min-width: 54px !important;
  max-width: 54px !important;
  height: 32px !important;
  min-height: 32px !important;
  --padding-start: 0 !important;
  --padding-end: 0 !important;
  text-align: center !important;
  font-size: 0.78rem !important;
  font-weight: 950 !important;
  border-radius: 10px !important;
}

.cart-comment-input--compact {
  border: 1px solid #e4ebf5 !important;
  border-radius: 15px !important;
  background: #ffffff !important;
  overflow: hidden !important;
}

.cart-comment-input--compact::part(native) {
  padding: 0.52rem 0.58rem !important;
  min-height: 0 !important;
}

.cart-add-area-panel,
.cart-add-area-panel--compact {
  display: grid !important;
  gap: 0.5rem !important;
  padding: 0.62rem !important;
  border: 1px dashed #cbd5e1 !important;
  border-radius: 18px !important;
  background: #f8fafc !important;
  box-sizing: border-box !important;
}

.cart-add-area-panel--compact .cart-add-area-heading,
.cart-add-area-heading {
  display: grid !important;
  gap: 0.16rem !important;
  margin: 0 !important;
}

.cart-add-area-panel--compact .cart-add-area-heading strong,
.cart-add-area-heading strong {
  font-size: 0.68rem !important;
  line-height: 1.12 !important;
  font-weight: 950 !important;
  color: #0f172a !important;
}

.cart-add-area-panel--compact .cart-add-area-heading span,
.cart-add-area-heading span {
  font-size: 0.58rem !important;
  line-height: 1.22 !important;
  font-weight: 700 !important;
  color: #64748b !important;
  text-align: left !important;
}

.cart-area-add-grid {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 0.38rem !important;
}

.area-add-button--cart {
  margin: 0 !important;
  height: auto !important;
  min-height: 0 !important;
}

.area-add-button--cart::part(native) {
  display: grid !important;
  gap: 0.04rem !important;
  min-height: 44px !important;
  padding: 0.34rem 0.42rem !important;
  border-radius: 14px !important;
  align-content: center !important;
  justify-items: center !important;
}

.area-add-button--cart span,
.area-add-button--cart strong,
.area-add-button--cart small {
  line-height: 1.08 !important;
}

.area-add-button--cart span {
  font-size: 0.56rem !important;
  font-weight: 900 !important;
}

.area-add-button--cart strong {
  font-size: 0.72rem !important;
  font-weight: 950 !important;
}

.area-add-button--cart small {
  font-size: 0.5rem !important;
  font-weight: 850 !important;
  opacity: 0.72 !important;
}

.picker-area-cards {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 0.42rem !important;
  margin-top: 0.52rem !important;
}

.area-pick-card {
  border: 1px solid #dbe5f2 !important;
  border-radius: 16px !important;
  background: #ffffff !important;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.045) !important;
  padding: 0.54rem 0.5rem !important;
}

.area-pick-card.is-fast-area {
  border-color: #bfdbfe !important;
  background: #eff6ff !important;
}

.area-pick-card.has-cart {
  border-color: #a7f3d0 !important;
  background: #ecfdf5 !important;
}

@media (max-width: 520px) {
  .cart-product-accordion-header::part(native) {
    padding: 0.66rem !important;
  }

  .cart-product-accordion-content {
    padding: 0.62rem !important;
  }

  .cart-area-line,
  .cart-area-line--compact {
    padding: 0.6rem !important;
  }

  .cart-area-line-header {
    grid-template-columns: minmax(0, 1fr) auto !important;
  }

  .cart-line-actions {
    flex-wrap: wrap !important;
  }

  .cart-stock-grid--compact {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }

  .cart-area-add-grid,
  .picker-area-cards {
    grid-template-columns: 1fr !important;
  }

  .area-add-button--cart::part(native) {
    grid-template-columns: minmax(0, 1fr) auto auto !important;
    min-height: 38px !important;
    justify-items: start !important;
    align-items: center !important;
    padding: 0.32rem 0.5rem !important;
  }
}

@media (max-width: 390px) {
  .cart-accordion-main-row,
  .cart-area-line-header,
  .cart-quantity-stack--compact .quantity-control-row,
  .cart-area-line .quantity-control-row {
    grid-template-columns: 1fr !important;
  }

  .cart-accordion-total,
  .cart-line-actions,
  .cart-quantity-stack--compact .cart-stepper,
  .cart-area-line .cart-stepper {
    justify-self: start !important;
  }

  .cart-stock-grid--compact {
    grid-template-columns: 1fr !important;
  }
}


/* Flujo simplificado: selección tipo toggle y áreas plegables dentro del carrito */
.picker-product-card.is-product-selected {
  border-color: #86efac !important;
  background: #f0fdf4 !important;
}

.picker-product-card.is-product-selected .picker-product-content {
  background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%) !important;
}

.picker-area-preview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.34rem;
  margin: 0 !important;
}

.picker-area-preview-chip {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
  padding: 0.42rem 0.38rem;
  border: 1px solid #e4ebf5;
  border-radius: 14px;
  background: #f8fafc;
  box-sizing: border-box;
}

.picker-area-preview-chip.has-stock {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.picker-area-preview-chip.has-cart {
  border-color: #86efac;
  background: #ecfdf5;
}

.picker-area-preview-chip strong {
  color: #0f172a;
  font-size: 0.58rem;
  line-height: 1.05;
  font-weight: 950;
}

.picker-area-preview-chip small {
  color: #64748b;
  font-size: 0.52rem;
  line-height: 1.15;
  font-weight: 760;
}

.picker-toggle-copy {
  padding: 0.44rem 0.5rem;
  border: 1px dashed #cbd5e1;
  border-radius: 13px;
  background: #f8fafc;
  color: #475569;
  font-size: 0.62rem;
  line-height: 1.2;
  font-weight: 850;
  text-align: center;
}

.picker-toggle-copy.is-selected {
  border-color: #86efac;
  background: #ecfdf5;
  color: #047857;
}

.cart-accordion-total--empty {
  background: #f8fafc !important;
  border-color: #e2e8f0 !important;
  color: #64748b !important;
}

.cart-area-mini-chip--empty {
  background: #f8fafc !important;
  border-color: #e2e8f0 !important;
  color: #64748b !important;
}

.cart-area-accordion-group {
  display: grid;
  gap: 0.46rem;
  padding: 0;
  background: transparent;
}

.cart-area-accordion {
  border: 1px solid #dbe5f2;
  border-radius: 16px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.035);
}

.cart-area-accordion.has-quantity {
  border-color: #a7f3d0;
  background: #ffffff;
}

.cart-area-accordion.is-empty-stock {
  opacity: 0.82;
}

.cart-area-accordion-header {
  --background: #ffffff;
  --padding-start: 0;
  --inner-padding-end: 0;
  --min-height: 0;
  --border-width: 0;
  margin: 0;
}

.cart-area-accordion-header::part(native) {
  min-height: 0 !important;
  padding: 0.54rem 0.6rem !important;
  align-items: center !important;
}

.cart-area-accordion-header ion-label {
  margin: 0 !important;
}

.cart-area-accordion-title {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.46rem;
}

.cart-area-accordion-title .eyebrow {
  display: block;
  color: #64748b;
  font-size: 0.5rem;
  line-height: 1;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.cart-area-accordion-title h4 {
  margin: 0.12rem 0 0;
  color: #0f172a;
  font-size: 0.74rem;
  line-height: 1.1;
  font-weight: 950;
}

.cart-area-header-badges {
  display: flex;
  justify-content: flex-end;
  gap: 0.24rem;
  flex-wrap: wrap;
}

.cart-area-accordion-content {
  display: grid;
  gap: 0.5rem;
  padding: 0.56rem 0.6rem 0.62rem !important;
  border-top: 1px solid #eef2f7;
  background: #fbfdff;
}

.cart-area-accordion-content .cart-stock-grid--compact {
  margin: 0 !important;
}

.cart-area-accordion-content .cart-comment-input--compact {
  margin: 0 !important;
}

.remove-product-button {
  margin: 0 !important;
  min-height: 34px;
  --border-radius: 13px;
  font-size: 0.68rem;
  font-weight: 900;
}

.remove-product-button::part(native) {
  min-height: 34px;
  padding: 0.28rem 0.5rem !important;
}

@media (max-width: 520px) {
  .picker-area-preview {
    grid-template-columns: 1fr;
    gap: 0.3rem;
  }

  .picker-area-preview-chip {
    grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr);
    align-items: center;
    padding: 0.36rem 0.44rem;
  }

  .cart-area-accordion-title {
    grid-template-columns: 1fr;
    gap: 0.34rem;
  }

  .cart-area-header-badges {
    justify-content: flex-start;
  }

  .cart-area-accordion-header::part(native),
  .cart-area-accordion-content {
    padding-left: 0.54rem !important;
    padding-right: 0.54rem !important;
  }
}


/* Ajuste final: carrito toggle por producto con estética consistente y menos ruido */
.delivery-modal-form > .form-card {
  gap: 0.62rem;
}

.work-info-card {
  background: #ffffff;
  border-color: #dbe5f2;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.work-info-card h3 {
  font-size: 0.82rem;
  letter-spacing: -0.01em;
}

.cart-entry-card .cart-heading p,
.cart-card .cart-heading p,
.picker-toolbar .toolbar-copy p {
  max-width: 34rem;
}

.quick-area-card {
  grid-template-columns: minmax(0, 1fr) minmax(112px, 0.42fr);
  margin: 0.45rem 0 0.58rem;
  padding: 0.62rem;
  border-radius: 15px;
  background: #f8fafc;
  border-color: #e2e8f0;
}

.quick-area-copy h3 {
  font-size: 0.72rem;
}

.quick-area-copy p {
  font-size: 0.6rem;
}

.quick-area-select {
  min-height: 36px;
  font-size: 0.66rem;
}

.cart-product-accordion-group {
  gap: 0.52rem !important;
}

.cart-product-accordion {
  border-color: #dbe5f2 !important;
  border-radius: 17px !important;
  background: #ffffff !important;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.045) !important;
}

.cart-product-accordion-header::part(native) {
  padding: 0.62rem 0.68rem !important;
}

.cart-accordion-main-row {
  gap: 0.5rem;
}

.cart-accordion-main-row .prestamo-title-block h3 {
  font-size: 0.8rem;
  line-height: 1.14;
}

.cart-accordion-main-row .prestamo-title-block p {
  font-size: 0.61rem;
  margin-top: 0.1rem;
}

.cart-accordion-total {
  min-width: 43px;
  padding: 0.26rem 0.36rem;
  border-radius: 13px;
}

.cart-accordion-total strong {
  font-size: 0.84rem;
}

.cart-accordion-total span {
  font-size: 0.48rem;
}

.cart-area-mini-row {
  gap: 0.22rem;
  margin-top: 0.36rem;
}

.cart-area-mini-chip {
  min-height: 18px;
  padding: 0.13rem 0.32rem;
  font-size: 0.53rem;
}

.cart-product-accordion-content {
  gap: 0.48rem;
  padding: 0 0.6rem 0.64rem !important;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
}

.cart-area-accordion-group {
  gap: 0.38rem;
}

.cart-area-accordion {
  border-radius: 14px !important;
  box-shadow: none !important;
  border-color: #e2e8f0 !important;
}

.cart-area-accordion.has-quantity {
  border-color: #86efac !important;
}

.cart-area-accordion-header::part(native) {
  padding: 0.48rem 0.54rem !important;
}

.cart-area-accordion-title {
  gap: 0.38rem;
}

.cart-area-accordion-title .eyebrow {
  font-size: 0.46rem;
}

.cart-area-accordion-title h4 {
  font-size: 0.68rem;
}

.cart-area-header-badges .ui-chip {
  font-size: 0.5rem;
  padding: 0.11rem 0.25rem;
}

.cart-area-accordion-content {
  gap: 0.42rem;
  padding: 0.5rem 0.54rem 0.56rem !important;
}

.cart-area-stock-note {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.42rem;
  padding: 0.38rem 0.44rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  box-sizing: border-box;
}

.cart-area-stock-note span {
  color: #64748b;
  font-size: 0.56rem;
  font-weight: 850;
  line-height: 1.1;
}

.cart-area-stock-note strong {
  color: #0f172a;
  font-size: 0.6rem;
  font-weight: 900;
  line-height: 1.15;
  text-align: right;
}

.cart-quantity-stack--compact {
  gap: 0.34rem !important;
  margin-top: 0 !important;
}

.cart-area-accordion-content .quantity-control-row {
  padding: 0.42rem 0.46rem !important;
  border-radius: 12px !important;
}

.cart-area-accordion-content .quantity-control-row > span {
  font-size: 0.62rem !important;
}

.cart-area-accordion-content .cart-comment-input--compact {
  margin-top: 0.06rem !important;
}

.remove-product-button {
  margin-top: 0.04rem !important;
}

.picker-toolbar {
  padding: 0.72rem !important;
}

.product-picker-content .prestamo-topline {
  align-items: flex-start;
}

.picker-product-card {
  border-color: #dbe5f2 !important;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.035);
}

.picker-product-card.is-product-selected {
  border-color: #86efac !important;
}

.picker-product-content {
  display: grid;
  gap: 0.5rem;
  padding: 0.68rem !important;
}

.picker-product-card.is-product-selected .picker-product-content {
  background: linear-gradient(180deg, #ecfdf5 0%, #ffffff 74%) !important;
}

.picker-area-preview {
  gap: 0.28rem !important;
}

.picker-area-preview-chip {
  padding: 0.34rem 0.32rem;
  border-radius: 12px;
}

.picker-area-preview-chip strong {
  font-size: 0.54rem;
}

.picker-area-preview-chip small {
  font-size: 0.49rem;
}

.picker-toggle-copy,
.picker-stock-grid,
.cart-edit-hint,
.work-info-note {
  display: none !important;
}

@media (max-width: 520px) {
  .quick-area-card {
    grid-template-columns: 1fr;
    gap: 0.46rem;
    padding: 0.58rem;
  }

  .cart-accordion-main-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .cart-product-accordion-header::part(native) {
    padding: 0.58rem 0.62rem !important;
  }

  .cart-product-accordion-content {
    padding: 0 0.52rem 0.58rem !important;
  }

  .cart-area-accordion-title {
    grid-template-columns: minmax(0, 1fr);
  }

  .cart-area-header-badges {
    justify-content: flex-start;
  }

  .cart-area-stock-note {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.16rem;
  }

  .cart-area-stock-note strong {
    text-align: left;
  }

  .picker-product-content {
    padding: 0.62rem !important;
  }
}


/* Revisión diaria agrupada por producto y área */
.detail-product-accordion {
  display: flex;
  flex-direction: column;
  gap: 0.72rem;
}

.detail-product-card {
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid #dbe5f2;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.045);
}

.detail-product-header {
  --background: #ffffff;
  border: 0 !important;
  margin: 0 !important;
}

.detail-product-header::part(native) {
  padding: 0.78rem !important;
  min-height: auto;
  align-items: stretch;
}

.detail-product-content {
  padding: 0 0.72rem 0.78rem;
  display: grid;
  gap: 0.64rem;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.detail-area-chip-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.32rem;
  margin-top: 0.1rem;
}

.detail-area-chip {
  font-size: 0.56rem !important;
  padding: 0.18rem 0.38rem !important;
  border-radius: 999px !important;
}

.detail-group-summary-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.42rem !important;
  margin-top: 0.12rem;
}

.detail-comments-card {
  margin: 0 !important;
  padding: 0.64rem !important;
  border-radius: 16px !important;
  box-shadow: none !important;
}

.compact-section-heading {
  margin-bottom: 0.36rem;
}

.compact-section-heading h3 {
  font-size: 0.76rem !important;
}

.compact-section-heading p {
  font-size: 0.62rem !important;
}

.area-review-accordion-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.area-review-accordion {
  background: #ffffff;
  border: 1px solid #dfe8f4;
  border-radius: 17px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.035);
}

.area-review-header {
  --background: #ffffff;
  --min-height: auto;
  border: 0 !important;
}

.area-review-header::part(native) {
  padding: 0 !important;
  min-height: 0;
}

.area-review-header-content {
  width: 100%;
  padding: 0.58rem 0.64rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.56rem;
  box-sizing: border-box;
}

.area-review-header-content h4 {
  margin: 0;
  color: #0f172a;
  font-size: 0.74rem;
  font-weight: 850;
  line-height: 1.12;
}

.area-review-header-content p {
  margin: 0.12rem 0 0;
  color: #64748b;
  font-size: 0.58rem;
  font-weight: 650;
  line-height: 1.2;
}

.area-review-content {
  padding: 0.58rem 0.64rem 0.64rem;
  border-top: 1px solid #e8eef6;
  background: #fbfdff;
  display: grid;
  gap: 0.54rem;
}

.area-release-summary-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.36rem !important;
}

.area-review-content .release-accordion-group {
  margin-top: 0 !important;
}

@media (max-width: 520px) {
  .detail-product-accordion {
    gap: 0.62rem;
  }

  .detail-product-header::part(native) {
    padding: 0.66rem !important;
  }

  .detail-product-content {
    padding: 0 0.58rem 0.64rem;
    gap: 0.56rem;
  }

  .detail-group-summary-grid,
  .area-release-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .area-review-header-content {
    padding: 0.52rem 0.56rem;
  }

  .area-review-content {
    padding: 0.52rem 0.56rem 0.58rem;
  }
}


/* Ajuste visual final: revisión diaria agrupada y controles táctiles alineados */
.detail-modal-form {
  gap: 0.64rem !important;
}

.detail-modal-form .detail-hero {
  border-radius: 18px !important;
  border: 1px solid #dbe5f2 !important;
  background: #ffffff !important;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.045) !important;
  padding: 0.72rem !important;
  gap: 0.52rem !important;
}

.detail-modal-form .detail-hero h3 {
  margin: 0.1rem 0 0 !important;
  font-size: 0.9rem !important;
  line-height: 1.15 !important;
  letter-spacing: -0.01em !important;
}

.detail-modal-form .detail-hero p {
  margin: 0.18rem 0 0 !important;
  font-size: 0.64rem !important;
  line-height: 1.25 !important;
  color: #64748b !important;
  font-weight: 700 !important;
}

.detail-product-accordion {
  gap: 0.58rem !important;
}

.detail-product-card {
  border: 1px solid #dbe5f2 !important;
  border-radius: 18px !important;
  background: #ffffff !important;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.045) !important;
}

.detail-product-header {
  --background: #ffffff !important;
  --padding-start: 0 !important;
  --inner-padding-end: 0 !important;
  --min-height: 0 !important;
}

.detail-product-header::part(native) {
  padding: 0.66rem 0.68rem !important;
  min-height: 0 !important;
  align-items: center !important;
}

.detail-product-card .accordion-header-content {
  padding: 0 !important;
  gap: 0.46rem !important;
}

.detail-product-card .prestamo-topline {
  align-items: flex-start !important;
  gap: 0.48rem !important;
}

.detail-product-card .prestamo-title-block h3 {
  margin: 0 !important;
  color: #0f172a !important;
  font-size: 0.84rem !important;
  line-height: 1.15 !important;
  font-weight: 950 !important;
  letter-spacing: -0.01em !important;
}

.detail-product-card .prestamo-title-block p {
  margin: 0.14rem 0 0 !important;
  color: #64748b !important;
  font-size: 0.6rem !important;
  line-height: 1.18 !important;
  font-weight: 760 !important;
}

.detail-product-card .ui-chip {
  font-size: 0.52rem !important;
  line-height: 1 !important;
  padding: 0.13rem 0.34rem !important;
}

.detail-area-chip-row {
  gap: 0.24rem !important;
  margin-top: 0 !important;
}

.detail-area-chip {
  min-height: 18px !important;
  font-size: 0.52rem !important;
  padding: 0.13rem 0.32rem !important;
  background: #eff6ff !important;
  border: 1px solid #dbeafe !important;
  color: #1d4ed8 !important;
}

.detail-group-summary-grid {
  gap: 0.34rem !important;
  margin: 0 !important;
}

.detail-group-summary-grid .stock-metric,
.area-release-summary-grid .stock-metric {
  min-height: 42px !important;
  padding: 0.36rem 0.4rem !important;
  border-radius: 13px !important;
}

.detail-group-summary-grid .stock-metric span,
.area-release-summary-grid .stock-metric span {
  font-size: 0.5rem !important;
  line-height: 1.05 !important;
}

.detail-group-summary-grid .stock-metric strong,
.area-release-summary-grid .stock-metric strong {
  font-size: 0.78rem !important;
  line-height: 1 !important;
}

.detail-product-content {
  padding: 0.6rem !important;
  gap: 0.54rem !important;
  border-top: 1px solid #eef2f7 !important;
  background: #f8fafc !important;
}

.detail-comments-card {
  padding: 0.56rem !important;
  border-radius: 15px !important;
  background: #ffffff !important;
  border: 1px solid #e4ebf5 !important;
  box-shadow: none !important;
}

.detail-comments-card .clean-list li {
  padding: 0.46rem 0.5rem !important;
  border-radius: 12px !important;
}

.area-review-accordion-group {
  gap: 0.42rem !important;
}

.area-review-accordion {
  border: 1px solid #dbe5f2 !important;
  border-radius: 15px !important;
  background: #ffffff !important;
  box-shadow: none !important;
}

.area-review-header {
  --background: #ffffff !important;
  --padding-start: 0 !important;
  --inner-padding-end: 0 !important;
  --min-height: 0 !important;
}

.area-review-header::part(native) {
  padding: 0 !important;
  min-height: 0 !important;
  align-items: center !important;
}

.area-review-header-content {
  padding: 0.5rem 0.54rem !important;
  gap: 0.4rem !important;
  align-items: center !important;
}

.area-review-header-content h4 {
  font-size: 0.7rem !important;
  line-height: 1.1 !important;
  font-weight: 950 !important;
  margin: 0 !important;
}

.area-review-header-content p {
  margin-top: 0.1rem !important;
  font-size: 0.52rem !important;
  line-height: 1.15 !important;
  color: #64748b !important;
  font-weight: 760 !important;
}

.area-review-content {
  padding: 0.52rem 0.54rem 0.58rem !important;
  gap: 0.46rem !important;
  border-top: 1px solid #eef2f7 !important;
  background: #fbfdff !important;
}

.area-release-summary-grid {
  gap: 0.32rem !important;
  margin: 0 !important;
}

.area-review-content .release-accordion-group {
  gap: 0.36rem !important;
  margin: 0 !important;
}

.area-review-content .release-action-accordion {
  border: 1px solid #e4ebf5 !important;
  border-radius: 14px !important;
  background: #ffffff !important;
  box-shadow: none !important;
}

.area-review-content .release-action-accordion--danger {
  border-color: #fecaca !important;
  background: #fffafa !important;
}

.area-review-content .release-accordion-header {
  --background: #ffffff !important;
  --padding-start: 0 !important;
  --inner-padding-end: 0 !important;
  --min-height: 0 !important;
  border-radius: 14px !important;
}

.area-review-content .release-accordion-header--danger {
  --background: #fffafa !important;
}

.area-review-content .release-accordion-header::part(native) {
  padding: 0 !important;
  min-height: 0 !important;
  align-items: center !important;
}

.area-review-content .release-header-content {
  padding: 0.44rem 0.5rem !important;
  gap: 0.38rem !important;
  align-items: center !important;
}

.area-review-content .release-header-content h4 {
  font-size: 0.62rem !important;
  line-height: 1.08 !important;
  font-weight: 900 !important;
}

.area-review-content .release-header-content p {
  margin-top: 0.08rem !important;
  font-size: 0.5rem !important;
  line-height: 1.12 !important;
  font-weight: 700 !important;
}

.area-review-content .release-header-content .ui-chip {
  min-width: 1.25rem !important;
  padding: 0.1rem 0.26rem !important;
  font-size: 0.5rem !important;
  line-height: 1 !important;
  text-align: center !important;
}

.area-review-content .release-action-content {
  padding: 0.48rem 0.5rem !important;
  gap: 0.42rem !important;
  border-top: 1px solid #eef2f7 !important;
  background: #ffffff !important;
}

.area-review-content .release-quantity-row {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: center !important;
  gap: 0.42rem !important;
  min-height: 38px !important;
  padding: 0.38rem 0.42rem !important;
  border: 1px solid #e4ebf5 !important;
  border-radius: 12px !important;
  background: #f8fafc !important;
  box-sizing: border-box !important;
}

.area-review-content .release-quantity-row > span {
  margin: 0 !important;
  min-width: 0 !important;
  color: #334155 !important;
  font-size: 0.6rem !important;
  line-height: 1.1 !important;
  font-weight: 900 !important;
  align-self: center !important;
}

.area-review-content .release-stepper.cart-stepper {
  display: grid !important;
  grid-template-columns: 28px 48px 28px !important;
  gap: 0.18rem !important;
  align-items: center !important;
  justify-items: center !important;
  justify-self: end !important;
  width: auto !important;
  height: 32px !important;
  min-width: 0 !important;
  margin: 0 !important;
  overflow: visible !important;
}

.area-review-content .release-stepper-btn {
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  min-height: 28px !important;
  max-width: 28px !important;
  max-height: 28px !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  overflow: visible !important;
  align-self: center !important;
  justify-self: center !important;
  position: relative !important;
}

.area-review-content .release-stepper-btn::part(native) {
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  min-height: 28px !important;
  max-width: 28px !important;
  max-height: 28px !important;
  padding: 0 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border: 1px solid #dbe3ee !important;
  border-radius: 9px !important;
  background: #ffffff !important;
  box-sizing: border-box !important;
  transform: none !important;
}

.area-review-content .release-stepper-btn ion-icon {
  width: 13px !important;
  height: 13px !important;
  font-size: 13px !important;
  line-height: 1 !important;
  margin: 0 !important;
  padding: 0 !important;
  position: static !important;
  transform: none !important;
  display: block !important;
}

.area-review-content .release-quantity-input {
  width: 48px !important;
  min-width: 48px !important;
  max-width: 48px !important;
  height: 32px !important;
  min-height: 32px !important;
  max-height: 32px !important;
  margin: 0 !important;
  border-radius: 9px !important;
  align-self: center !important;
  justify-self: center !important;
  overflow: hidden !important;
}

.area-review-content .release-quantity-input::part(native) {
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
  text-align: center !important;
  line-height: 32px !important;
  font-size: 0.76rem !important;
  font-weight: 950 !important;
}

.area-review-content .release-comment-input {
  border: 1px solid #e4ebf5 !important;
  border-radius: 12px !important;
  background: #f8fafc !important;
  margin: 0 !important;
}

.area-review-content .release-comment-input::part(native) {
  padding: 0.5rem !important;
}

.area-review-content .release-comment-input ion-label {
  margin: 0 0 0.14rem !important;
  font-size: 0.56rem !important;
  line-height: 1.1 !important;
  font-weight: 900 !important;
}

.area-review-content .release-comment-input ion-textarea {
  font-size: 0.64rem !important;
  line-height: 1.25 !important;
  --padding-start: 0 !important;
  --padding-end: 0 !important;
  --padding-top: 0.18rem !important;
  --padding-bottom: 0 !important;
}

@media (max-width: 520px) {
  .detail-modal-form {
    gap: 0.56rem !important;
  }

  .detail-modal-form .detail-hero,
  .detail-product-header::part(native),
  .detail-product-content {
    padding: 0.58rem !important;
  }

  .detail-product-card .prestamo-topline {
    flex-direction: column !important;
    align-items: stretch !important;
  }

  .detail-area-chip-row,
  .compact-chip-row {
    justify-content: flex-start !important;
  }

  .detail-group-summary-grid,
  .area-release-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .area-review-header-content,
  .area-review-content .release-header-content,
  .area-review-content .release-action-content,
  .area-review-content .release-quantity-row {
    padding-left: 0.46rem !important;
    padding-right: 0.46rem !important;
  }

  .area-review-content .release-stepper.cart-stepper {
    grid-template-columns: 27px 44px 27px !important;
    gap: 0.16rem !important;
  }

  .area-review-content .release-stepper-btn,
  .area-review-content .release-stepper-btn::part(native) {
    width: 27px !important;
    height: 27px !important;
    min-width: 27px !important;
    min-height: 27px !important;
    max-width: 27px !important;
    max-height: 27px !important;
  }

  .area-review-content .release-quantity-input {
    width: 44px !important;
    min-width: 44px !important;
    max-width: 44px !important;
  }
}

@media (max-width: 370px) {
  .area-review-content .release-quantity-row {
    grid-template-columns: 1fr !important;
    justify-items: stretch !important;
  }

  .area-review-content .release-stepper.cart-stepper {
    justify-self: start !important;
  }
}

/* Ajuste final: leyenda Empresa/Unidad alineada al lenguaje visual actual */
.prestamo-work-legend {
  display: grid !important;
  grid-template-columns: auto minmax(0, 1fr) !important;
  align-items: center !important;
  gap: 0.46rem !important;
  width: 100% !important;
  padding: 0.52rem 0.58rem !important;
  margin: 0 !important;
  border: 1px solid #e4ebf5 !important;
  border-radius: 14px !important;
  background: #f8fafc !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72) !important;
  color: #475569 !important;
  box-sizing: border-box !important;
}

.work-legend-label {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 24px !important;
  padding: 0.22rem 0.42rem !important;
  border-radius: 999px !important;
  background: #ffffff !important;
  border: 1px solid #dbe5f2 !important;
  color: #2563eb !important;
  font-size: 0.58rem !important;
  font-weight: 900 !important;
  line-height: 1 !important;
  letter-spacing: 0.045em !important;
  text-transform: uppercase !important;
  white-space: nowrap !important;
}

.work-legend-values {
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  gap: 0.46rem !important;
  min-width: 0 !important;
  width: 100% !important;
}

.work-legend-item {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.08rem !important;
  min-width: 0 !important;
  line-height: 1.12 !important;
}

.work-legend-item small {
  color: #64748b !important;
  font-size: 0.56rem !important;
  font-weight: 850 !important;
  letter-spacing: 0.03em !important;
  text-transform: uppercase !important;
}

.work-legend-item strong {
  display: block !important;
  min-width: 0 !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  color: #0f172a !important;
  font-size: 0.72rem !important;
  font-weight: 850 !important;
}

.work-legend-separator {
  display: none !important;
}

@media (max-width: 420px) {
  .prestamo-work-legend {
    grid-template-columns: 1fr !important;
    gap: 0.4rem !important;
    padding: 0.5rem !important;
  }

  .work-legend-label {
    justify-self: start !important;
  }

  .work-legend-values {
    grid-template-columns: 1fr !important;
    gap: 0.34rem !important;
  }
}

/* Mejora visual final: leyenda de empresa/unidad integrada a la card */
.prestamo-card-content .prestamo-work-legend {
  display: grid !important;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) !important;
  align-items: stretch !important;
  gap: 0.44rem !important;
  width: 100% !important;
  padding: 0.48rem !important;
  margin: 0.08rem 0 0.46rem !important;
  border: 1px solid #e4ebf5 !important;
  border-radius: 15px !important;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.78)) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82) !important;
  box-sizing: border-box !important;
}

.work-legend-header {
  display: grid !important;
  grid-template-columns: 28px minmax(0, 1fr) !important;
  align-items: center !important;
  gap: 0.42rem !important;
  min-width: 0 !important;
}

.work-legend-icon {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 28px !important;
  height: 28px !important;
  min-width: 28px !important;
  border-radius: 10px !important;
  border: 1px solid rgba(37, 99, 235, 0.16) !important;
  background: rgba(37, 99, 235, 0.08) !important;
  color: #2563eb !important;
  box-sizing: border-box !important;
}

.work-legend-icon ion-icon {
  width: 15px !important;
  height: 15px !important;
  font-size: 15px !important;
}

.work-legend-main {
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  gap: 0.08rem !important;
  min-width: 0 !important;
}

.work-legend-main small,
.work-legend-pill small {
  color: #64748b !important;
  font-size: 0.54rem !important;
  font-weight: 900 !important;
  line-height: 1 !important;
  letter-spacing: 0.045em !important;
  text-transform: uppercase !important;
}

.work-legend-main strong,
.work-legend-pill strong {
  display: block !important;
  min-width: 0 !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  color: #0f172a !important;
  font-size: 0.74rem !important;
  font-weight: 900 !important;
  line-height: 1.12 !important;
}

.work-legend-meta {
  display: grid !important;
  grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr) !important;
  gap: 0.34rem !important;
  min-width: 0 !important;
  align-items: stretch !important;
}

.work-legend-pill {
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  gap: 0.08rem !important;
  min-width: 0 !important;
  min-height: 30px !important;
  padding: 0.28rem 0.36rem !important;
  border-radius: 11px !important;
  border: 1px solid #e7edf6 !important;
  background: rgba(255, 255, 255, 0.78) !important;
  box-sizing: border-box !important;
}

.work-legend-pill--wide:only-child {
  grid-column: 1 / -1 !important;
}

@media (max-width: 520px) {
  .prestamo-card-content .prestamo-work-legend {
    grid-template-columns: 1fr !important;
    gap: 0.38rem !important;
    padding: 0.44rem !important;
    margin-bottom: 0.44rem !important;
  }

  .work-legend-meta {
    grid-template-columns: 1fr !important;
    gap: 0.28rem !important;
  }

  .work-legend-header {
    grid-template-columns: 26px minmax(0, 1fr) !important;
    gap: 0.36rem !important;
  }

  .work-legend-icon {
    width: 26px !important;
    height: 26px !important;
    min-width: 26px !important;
    border-radius: 9px !important;
  }

  .work-legend-main strong,
  .work-legend-pill strong {
    font-size: 0.7rem !important;
  }
}


/* Corrección visual: leyenda de trabajo menos apretada en cards de préstamo */
.prestamo-card-content .prestamo-work-legend {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  gap: 0.36rem !important;
  width: 100% !important;
  padding: 0.62rem 0.68rem !important;
  margin: 0.26rem 0 0.68rem !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 16px !important;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.82)) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86) !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
}

.prestamo-card-content .work-legend-row {
  display: grid !important;
  grid-template-columns: 4.6rem minmax(0, 1fr) !important;
  align-items: center !important;
  column-gap: 0.58rem !important;
  min-width: 0 !important;
  width: 100% !important;
  min-height: 1.42rem !important;
  line-height: 1.15 !important;
}

.prestamo-card-content .work-legend-row--empresa {
  padding-bottom: 0.34rem !important;
  border-bottom: 1px solid rgba(226, 232, 240, 0.92) !important;
}

.prestamo-card-content .work-legend-key {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  color: #64748b !important;
  font-size: 0.58rem !important;
  font-weight: 900 !important;
  line-height: 1 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
  white-space: nowrap !important;
}

.prestamo-card-content .work-legend-value {
  display: block !important;
  min-width: 0 !important;
  max-width: 100% !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
  color: #0f172a !important;
  font-size: 0.78rem !important;
  font-weight: 900 !important;
  line-height: 1.18 !important;
  letter-spacing: -0.01em !important;
}

@media (max-width: 420px) {
  .prestamo-card-content .prestamo-work-legend {
    gap: 0.34rem !important;
    padding: 0.58rem 0.62rem !important;
    margin: 0.24rem 0 0.64rem !important;
    border-radius: 15px !important;
  }

  .prestamo-card-content .work-legend-row {
    grid-template-columns: 4rem minmax(0, 1fr) !important;
    column-gap: 0.46rem !important;
    min-height: 1.34rem !important;
  }

  .prestamo-card-content .work-legend-key {
    font-size: 0.54rem !important;
  }

  .prestamo-card-content .work-legend-value {
    font-size: 0.73rem !important;
  }
}


/* Legibilidad móvil: textos claros y consistentes */
.prestamos-page,
.modal-form,
.prestamo-card-content,
.picker-product-content,
.accordion-header-content {
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.prestamo-title-block h3,
.picker-item-title,
.mini-card-content h4,
.cart-accordion-label h3,
.area-review-title h4 {
  font-size: clamp(0.9rem, 2.9vw, 1rem);
  line-height: 1.22;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.prestamo-title-block p,
.card-footnote,
.mini-card-content p,
.cart-heading p,
.cart-picker-trigger p,
.compact-toggle p,
.clean-list li,
.empty-state p,
.loading-state p,
.field-hint {
  font-size: clamp(0.7rem, 2.5vw, 0.78rem);
  line-height: 1.36;
}

.toolbar-copy h3,
.section-heading h3,
.release-action-card h4,
.work-info-card h3,
.quick-area-copy h3,
.cart-heading h3 {
  font-size: clamp(0.88rem, 2.8vw, 1rem);
  line-height: 1.22;
  letter-spacing: -0.005em;
}

.toolbar-copy p,
.section-heading p {
  font-size: clamp(0.68rem, 2.4vw, 0.76rem);
  line-height: 1.32;
  white-space: normal;
}

.ui-chip,
.work-legend-key,
.overview-label,
.stock-metric span,
.cart-area-mini-chip,
.picker-area-preview-chip small {
  font-size: clamp(0.56rem, 2.1vw, 0.64rem);
  line-height: 1.15;
  letter-spacing: 0.01em;
}

.stock-metric strong,
.overview-card strong,
.cart-accordion-total strong {
  font-size: clamp(0.82rem, 3vw, 1rem);
  line-height: 1.05;
}

.filters-grid ion-label,
.form-card ion-label,
.modern-form-card ion-label,
.release-action-card ion-label,
.cart-comment-input ion-label {
  font-size: clamp(0.7rem, 2.4vw, 0.78rem);
  line-height: 1.25;
  letter-spacing: 0;
}

.filters-grid ion-input,
.filters-grid ion-select,
.form-card ion-input,
.form-card ion-select,
.form-card ion-textarea,
.modern-form-card ion-input,
.modern-form-card ion-select,
.modern-form-card ion-textarea,
.cart-comment-input ion-textarea,
.product-searchbar::part(input) {
  font-size: clamp(0.78rem, 2.7vw, 0.88rem);
  line-height: 1.35;
}

.prestamo-work-legend {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.38rem;
  padding: 0.58rem;
}

.prestamo-card-content .work-legend-row {
  display: grid;
  grid-template-columns: 4.4rem minmax(0, 1fr);
  align-items: start;
  gap: 0.42rem;
  padding: 0;
  border: 0;
  background: transparent;
}

.work-legend-value {
  white-space: normal;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.prestamo-stats-grid .stock-metric,
.adeudo-stats-grid .stock-metric,
.picker-stock-grid .stock-metric,
.selected-product-grid .stock-metric,
.release-summary-grid .stock-metric {
  padding: 0.42rem 0.4rem;
}

.prestamo-card-content,
.picker-product-content,
.accordion-header-content {
  padding: 0.68rem;
}

.cart-area-accordion-title h4,
.release-action-title h4,
.area-review-title h4 {
  font-size: clamp(0.82rem, 2.6vw, 0.94rem);
  line-height: 1.24;
}

.quantity-control-row > span,
.release-control-row > span {
  font-size: clamp(0.7rem, 2.4vw, 0.78rem);
  line-height: 1.25;
}

.cart-stepper,
.release-stepper,
.area-review-content .release-stepper.cart-stepper {
  align-items: center;
  justify-items: center;
}

.stepper-btn ion-icon,
.release-stepper-btn ion-icon {
  flex-shrink: 0;
}

@media (max-width: 430px) {
  .page-container {
    padding: 0.68rem;
  }

  .modal-form {
    padding: 0.72rem;
    gap: 0.62rem;
  }

  .module-hero p {
    font-size: 0.74rem;
  }

  .modern-segment ion-segment-button {
    font-size: 0.7rem;
    min-height: 34px;
  }

  .prestamo-work-legend {
    padding: 0.6rem;
  }

  .prestamo-card-content .work-legend-row {
    grid-template-columns: 1fr;
    gap: 0.12rem;
  }

  .work-legend-key {
    font-size: 0.6rem;
  }

  .work-legend-value {
    font-size: 0.78rem;
  }

  .stock-grid,
  .prestamo-stats-grid,
  .release-summary-grid,
  .adeudo-stats-grid,
  .picker-stock-grid,
  .selected-product-grid {
    gap: 0.34rem;
  }
}

.closure-auto-debt-note {
  margin: 0.45rem 0 0.75rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid rgba(245, 158, 11, 0.24);
  border-radius: 14px;
  background: rgba(245, 158, 11, 0.08);
  color: #92400e;
  font-size: var(--font-sm);
  line-height: 1.35;
}


/* Mejoras de revisión por rango y captura rápida */
.filters-grid {
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.detail-product-card--resolved {
  opacity: 0.72;
  filter: grayscale(0.25);
}

.detail-product-card--resolved .detail-product-header,
.area-review-accordion--resolved .area-review-header,
.area-review-accordion--resolved .area-review-content {
  background: #f1f5f9 !important;
}

.detail-product-card--resolved .prestamo-title-block h3,
.area-review-accordion--resolved h4 {
  color: #64748b;
}

.area-review-accordion--resolved {
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  overflow: hidden;
}

.resolved-review-note {
  display: flex;
  flex-direction: column;
  gap: 0.16rem;
  margin: 0 0 0.55rem;
  padding: 0.7rem;
  border: 1px solid #cbd5e1;
  border-radius: 13px;
  background: #f8fafc;
  color: #475569;
}

.resolved-review-note strong {
  color: #334155;
  font-size: 0.86rem;
}

.resolved-review-note span {
  font-size: 0.75rem;
}

.release-accordion-group--large {
  display: grid;
  gap: 0.55rem;
}

.release-accordion-group--large .release-action-accordion {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  background: #ffffff;
}

.release-accordion-group--large .release-accordion-header {
  --min-height: 62px;
}

.release-accordion-group--large .release-action-content {
  padding: 0.8rem;
}

.release-accordion-group--large .release-quantity-row {
  min-height: 58px;
  align-items: center;
}

.release-accordion-group--large .release-quantity-row > span {
  font-size: 0.86rem;
  font-weight: 850;
}

.release-accordion-group--large .release-stepper {
  min-width: 170px;
  min-height: 48px;
}

.release-accordion-group--large .release-stepper-btn {
  width: 48px;
  height: 48px;
}

.release-accordion-group--large .release-quantity-input {
  min-width: 64px;
  font-size: 1.05rem;
  font-weight: 900;
  text-align: center;
}

@media (max-width: 620px) {
  .release-accordion-group--large .release-stepper {
    min-width: 150px;
  }
}

/* Flujos directos de área y devolución */
.area-switcher {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
  gap: 0.55rem;
  margin-bottom: 0.75rem;
}

.area-switcher-button {
  min-height: 50px;
  padding: 0.6rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 13px;
  background: #ffffff;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font: inherit;
  cursor: pointer;
}

.area-switcher-button span {
  font-size: 0.82rem;
  font-weight: 800;
}

.area-switcher-button strong {
  font-size: 0.75rem;
  color: #64748b;
}

.area-switcher-button.is-active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
  box-shadow: 0 0 0 2px rgb(37 99 235 / 10%);
}

.cart-area-direct-panel,
.review-area-direct-panel {
  border: 1px solid #dbe3ef;
  border-radius: 16px;
  background: #ffffff;
  overflow: hidden;
}

.cart-area-direct-panel.has-quantity {
  border-color: #86efac;
}

.review-area-direct-panel.is-resolved {
  border-color: #86efac;
  background: #f0fdf4;
}

.direct-area-heading {
  padding: 0.85rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.direct-area-heading h4,
.return-disposition-heading h4 {
  margin: 0.15rem 0 0;
  color: #0f172a;
  font-size: 0.95rem;
}

.direct-area-heading p,
.return-disposition-heading p {
  margin: 0.2rem 0 0;
  color: #64748b;
  font-size: 0.75rem;
}

.cart-area-direct-content,
.area-review-content {
  padding: 0.85rem;
}

.picker-area-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.5rem;
  margin-top: 0.7rem;
}

.picker-area-add-button {
  min-height: 54px;
  padding: 0.55rem 0.7rem;
  border: 1px solid #bfdbfe;
  border-radius: 13px;
  background: #eff6ff;
  color: #1d4ed8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  text-align: left;
  cursor: pointer;
}

.picker-area-add-button span {
  display: grid;
  gap: 0.12rem;
}

.picker-area-add-button strong {
  font-size: 0.82rem;
}

.picker-area-add-button small {
  color: #475569;
  font-size: 0.7rem;
}

.picker-area-add-button b {
  font-size: 0.9rem;
}

.picker-remove-button {
  width: 100%;
  min-height: 42px;
  margin-top: 0.5rem;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #b91c1c;
  font-weight: 800;
  cursor: pointer;
}

.return-disposition-grid {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 0.75rem !important;
  margin-top: 0.8rem !important;
}

.return-disposition-card {
  display: grid;
  grid-template-columns: minmax(190px, 220px) minmax(0, 1fr);
  border: 1px solid #dbe3ef;
  border-left-width: 4px;
  border-radius: 15px;
  background: #ffffff;
  overflow: hidden;
  box-shadow: 0 5px 14px rgb(15 23 42 / 5%);
}

.return-disposition-card--complete {
  border-color: #86efac;
}

.return-disposition-card--opened {
  border-color: #fcd34d;
}

.return-disposition-card--consumed {
  border-color: #fca5a5;
}

.return-disposition-heading {
  min-height: 100%;
  padding: 0.8rem;
  border-right: 1px solid currentColor;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.65rem;
  box-sizing: border-box;
}

.return-disposition-card--complete .return-disposition-heading {
  color: #047857;
  background: #ecfdf5;
  border-color: #bbf7d0;
}

.return-disposition-card--opened .return-disposition-heading {
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.return-disposition-card--consumed .return-disposition-heading {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}

.return-disposition-heading h4 {
  color: inherit !important;
  font-size: 0.82rem !important;
  line-height: 1.2 !important;
  font-weight: 900 !important;
}

.return-disposition-heading p {
  color: #475569 !important;
  font-size: 0.67rem !important;
  line-height: 1.3 !important;
}

.return-disposition-heading p strong,
.review-direct-heading p strong {
  font-weight: 900;
  color: inherit;
}

.return-count-chip {
  flex: 0 0 auto;
  min-width: 28px;
  font-size: 0.68rem;
  font-weight: 900;
}

.return-disposition-card--complete .return-count-chip {
  color: #047857;
  background: #dcfce7;
  border-color: #bbf7d0;
}

.return-disposition-card--opened .return-count-chip {
  color: #92400e;
  background: #fef3c7;
  border-color: #fde68a;
}

.return-disposition-card--consumed .return-count-chip {
  color: #b91c1c;
  background: #fee2e2;
  border-color: #fecaca;
}

.return-disposition-card .release-action-content {
  display: grid !important;
  grid-template-columns: minmax(205px, 0.8fr) minmax(260px, 1.2fr) !important;
  align-items: stretch !important;
  gap: 0.65rem !important;
  padding: 0.65rem !important;
  border-top: 0 !important;
}

.return-disposition-card .release-quantity-row {
  display: grid !important;
  grid-template-columns: 68px minmax(0, 1fr) !important;
  align-items: center !important;
  gap: 0.6rem !important;
  min-height: 78px !important;
  padding: 0.6rem !important;
  margin: 0 !important;
}

.return-disposition-card .release-quantity-row > strong {
  color: #334155;
  font-size: 0.72rem;
  font-weight: 900;
}

.return-disposition-card .release-stepper.cart-stepper {
  display: grid !important;
  grid-template-columns: 38px 54px 38px !important;
  align-items: center !important;
  justify-items: center !important;
  justify-content: end !important;
  justify-self: stretch !important;
  gap: 0.3rem !important;
  width: 100% !important;
  min-width: 0 !important;
  height: 38px !important;
  min-height: 38px !important;
  max-height: 38px !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: visible !important;
}

.return-disposition-card .release-stepper-btn,
.return-disposition-card .release-stepper-btn::part(native) {
  width: 38px !important;
  height: 38px !important;
  min-width: 38px !important;
  min-height: 38px !important;
  max-width: 38px !important;
  max-height: 38px !important;
}

.return-disposition-card .release-stepper-btn ion-icon {
  width: 16px !important;
  height: 16px !important;
  font-size: 16px !important;
}

.return-disposition-card .release-quantity-input {
  --min-height: 38px !important;
  --padding-start: 0 !important;
  --padding-end: 0 !important;
  --padding-top: 0 !important;
  --padding-bottom: 0 !important;
  --background: #ffffff !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 54px !important;
  min-width: 54px !important;
  max-width: 54px !important;
  height: 38px !important;
  min-height: 38px !important;
  max-height: 38px !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 1px solid #dbe3ee !important;
  border-radius: 9px !important;
  box-sizing: border-box !important;
  position: relative !important;
  align-self: center !important;
  justify-self: center !important;
  overflow: hidden !important;
  transform: none !important;
}

.return-disposition-card .release-quantity-input::part(native) {
  position: static !important;
  display: block !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  height: 36px !important;
  min-height: 36px !important;
  max-height: 36px !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 8px !important;
  box-sizing: border-box !important;
  background: transparent !important;
  font-size: 0.9rem !important;
  line-height: 36px !important;
  text-align: center !important;
  vertical-align: middle !important;
  transform: none !important;
  appearance: none !important;
}

/* IonInput legacy renderiza el input real en el DOM interno y no siempre expone ::part(native). */
.return-disposition-card .release-quantity-input :deep(input.native-input) {
  position: absolute !important;
  inset: 0 !important;
  display: block !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  height: 36px !important;
  min-height: 36px !important;
  max-height: 36px !important;
  margin: auto !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 8px !important;
  box-sizing: border-box !important;
  background: transparent !important;
  color: inherit !important;
  font: inherit !important;
  font-size: 0.9rem !important;
  font-weight: 900 !important;
  line-height: 36px !important;
  text-align: center !important;
  vertical-align: middle !important;
  transform: none !important;
  appearance: none !important;
}

.return-disposition-card .release-comment-field {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  align-self: stretch;
  gap: 0.12rem;
  width: 100%;
  height: 78px;
  min-height: 78px;
  max-height: 78px;
  margin: 0;
  padding: 0.48rem 0.62rem;
  border: 1px solid #e4ebf5;
  border-radius: 12px;
  background: #f8fafc;
  box-sizing: border-box;
  overflow: hidden;
}

.return-disposition-card .release-comment-field label {
  display: block;
  margin: 0;
  color: #334155;
  font-size: 0.66rem;
  line-height: 1.2;
  white-space: normal;
}

.return-disposition-card .release-comment-field label strong {
  font-weight: 900;
}

.return-disposition-card .release-comment-field label span {
  color: #64748b;
  font-weight: 650;
}

.return-disposition-card .release-comment-field label .required-mark {
  color: #dc2626;
  font-weight: 900;
}

.return-disposition-card .release-comment-textarea {
  --background: transparent !important;
  --padding-start: 0 !important;
  --padding-end: 0 !important;
  --padding-top: 0.16rem !important;
  --padding-bottom: 0 !important;
  display: block !important;
  width: 100% !important;
  height: 44px !important;
  min-height: 44px !important;
  max-height: 44px !important;
  margin: 0 !important;
  padding: 0 !important;
  font-size: 0.73rem !important;
  line-height: 1.3 !important;
  box-sizing: border-box !important;
  align-self: end !important;
  overflow: hidden !important;
}

.return-disposition-card .release-comment-textarea::part(native) {
  width: 100% !important;
  height: 44px !important;
  min-height: 44px !important;
  max-height: 44px !important;
  margin: 0 !important;
  padding: 0.16rem 0 0 !important;
  border: 0 !important;
  box-sizing: border-box !important;
}

.review-direct-heading .eyebrow {
  font-size: 0.58rem;
}

.review-direct-heading h4 {
  font-size: 0.86rem;
}

.review-direct-heading p {
  font-size: 0.68rem;
}

.closing-ready-copy {
  display: grid;
  gap: 0.2rem;
  padding: 0.8rem;
  color: #166534;
}

.closing-ready-copy span {
  color: #475569;
  font-size: 0.78rem;
}

.review-footer-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
  padding: 0.45rem 0.75rem;
}

.review-footer-actions > ion-button:only-child {
  grid-column: 1 / -1;
}

@media (max-width: 760px) {
  .area-switcher,
  .picker-area-actions,
  .return-disposition-grid,
  .review-footer-actions {
    grid-template-columns: 1fr;
  }

  .direct-area-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .direct-area-heading .cart-area-header-badges {
    width: 100%;
    justify-content: flex-start;
  }

  .return-disposition-card {
    grid-template-columns: minmax(0, 1fr);
  }

  .return-disposition-heading {
    min-height: auto;
    border-right: 0;
    border-bottom: 1px solid currentColor;
  }

  .return-disposition-card .release-action-content {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .return-disposition-card .release-quantity-row {
    min-height: 70px !important;
  }

  .return-disposition-card .release-comment-field {
    height: 78px;
    min-height: 78px;
    max-height: 78px;
  }
}

@media (max-width: 420px) {
  .return-disposition-card .release-quantity-row {
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 0.45rem !important;
  }

  .return-disposition-card .release-stepper.cart-stepper {
    justify-content: center !important;
  }
}

</style>
