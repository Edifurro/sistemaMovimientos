# Sistema de Movimientos - Guía de Instalación y Setup

## Arquitectura

**Backend**: Firebase SDK (client-side only)  
**Frontend**: Ionic-Vue (Vue 3 + Ionic Components)  
**Database**: Firestore (real-time, serverless)  
**Authentication**: Firebase Authentication  
**Storage**: Firebase Storage (para fotos de productos)  

## Requisitos Previos

- Node.js 18+ instalado
- npm o yarn
- Proyecto Firebase creado en https://console.firebase.google.com

## Instalación

### 1. Clonar/Descargar el proyecto
```bash
cd c:\Users\edifu\OneDrive\Escritorio\sistemaMovimientos
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Firebase

1. Copia `.env.example` a `.env.local`
```bash
cp .env.example .env.local
```

2. Obtén tus credenciales de Firebase:
   - Ve a Firebase Console → Configuración del proyecto
   - En la sección "SDK de administrador" → "Configuración", copia los valores
   
3. Actualiza `.env.local` con tus credenciales:
```
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Configurar Firestore Security Rules

1. Ve a Firebase Console → Firestore Database → Rules
2. Copia el contenido de `FIRESTORE_SECURITY_RULES.txt`
3. Reemplaza todas las reglas con el contenido copiado
4. Publica los cambios

### 5. Ejecutar el proyecto en desarrollo
```bash
npm run dev
```

La aplicación estará disponible en http://localhost:3000

## Estructura de Carpetas

```
sistemaMovimientos/
├── src/
│   ├── components/        # Componentes reutilizables (futuro)
│   ├── composables/       # Lógica con Firestore
│   │   ├── useAuth.js     # Autenticación
│   │   ├── useProducts.js # Productos CRUD
│   │   ├── useColaboradores.js  # Colaboradores CRUD
│   │   └── usePrestamos.js      # Préstamos CRUD
│   ├── pages/            # Páginas principales
│   │   ├── Setup.vue     # Configuración inicial (crear primer usuario)
│   │   ├── Login.vue     # Inicio de sesión
│   │   ├── Dashboard.vue # Panel de control
│   │   ├── Productos.vue # Gestión de productos
│   │   ├── Colaboradores.vue # Gestión de colaboradores
│   │   └── Prestamos.vue # Gestión de préstamos
│   ├── services/
│   │   └── firebase.js   # Configuración de Firebase
│   ├── styles/
│   │   └── global.css    # Estilos globales
│   ├── App.vue           # Componente raíz
│   ├── router.js         # Configuración de rutas
│   └── main.js           # Punto de entrada
├── index.html            # HTML principal
├── package.json
├── vite.config.js
└── .env.example
```

## Primeros Pasos

1. **Ejecutar el servidor**: `npm run dev`
2. **Crear usuario admin**: 
   - La app detectará que no hay usuarios y mostrará la página de Setup
   - Completa los datos del administrador
   - Se creará automáticamente en Firebase Auth y Firestore
3. **Iniciar sesión**: Usa las credenciales que acabas de crear
4. **Dashboard**: Verás el menú para navegar por módulos

## Composables Disponibles

### useAuth()
- `checkSetupCompleted()`: Verifica si hay usuarios registrados
- `createFirstUser(email, password, nombre)`: Crea primer usuario admin
- `login(email, password)`: Inicia sesión
- `logout()`: Cierra sesión
- `initAuthListener(callback)`: Escucha cambios de autenticación

### useProducts()
- `createProduct(data)`: Crear producto
- `getProducts(filters)`: Listar productos
- `getProductById(id)`: Obtener producto específico
- `updateProduct(id, updates)`: Actualizar producto
- `deleteProduct(id)`: Eliminar producto

### useColaboradores()
- `createColaborador(data)`: Crear colaborador
- `getColaboradores(filters)`: Listar colaboradores
- `getColaboradorById(id)`: Obtener colaborador específico
- `updateColaborador(id, updates)`: Actualizar colaborador
- `deleteColaborador(id)`: Eliminar colaborador

### usePrestamos()
- `createPrestamo(data)`: Crear préstamo (valida reglas)
- `getPrestamos(filters)`: Listar préstamos
- `getPrestamoById(id)`: Obtener préstamo específico
- `devolverPrestamo(id, detalles)`: Registrar devolución
- `getPendientes()`: Préstamos activos
- `getVencidos()`: Préstamos vencidos

## Construir para Producción

```bash
npm run build
```

Genera carpeta `dist/` lista para deploy o empaquetar como Electron app.

## Próximos Pasos Recomendados

1. **Implementar modales**: Crear componentes modales para CRUD de productos, colaboradores
2. **Cargar datos iniciales**: Tabla para cargar CSV de productos/colaboradores
3. **Funcionalidad completa**: Implementar todas las operaciones CRUD en UI
4. **Validaciones**: Agregar validaciones visuales en formularios
5. **Exportar reportes**: Generar PDFs/Excel de movimientos
6. **Desplegar en Electron**: Si quieres app desktop nativa

## Notas Importantes

- **Sin servidor**: No necesitas mantener ningún servidor Express o similar
- **Real-time**: Los cambios en Firestore se sincronizan automáticamente entre usuarios
- **Offline**: Firebase maneja offline persistence automáticamente
- **Security**: Las reglas de Firestore protegen los datos según rol del usuario
- **Libre**: Firebase tiene plan gratuito que cubre ampliamente este uso

¿Necesitas ayuda con algún módulo en particular?
