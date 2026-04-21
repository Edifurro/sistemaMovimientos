# Sistema de Gestión de Inventario y Movimientos

Sistema para gestionar inventario y movimientos (préstamos) de herramientas y recursos en un taller de hojalatería.

## 📋 Características

- ✅ Gestión de Productos (RECURSO | HERRAMIENTA)
- ✅ Gestión de Colaboradores
- ✅ Registro de Préstamos/Movimientos
- ✅ Devoluciones (total o parcial según tipo de producto)
- ✅ Alertas de productos vencidos
- ✅ Reportes y estadísticas

## 🏗️ Estructura del Proyecto

```
sistemaMovimientos/
├── src/
│   ├── config/          # Configuración de Firebase
│   ├── controllers/     # Lógica de controladores
│   ├── routes/          # Rutas API
│   ├── middlewares/     # Middlewares (autenticación, etc.)
│   ├── services/        # Servicios/lógica negocio
│   └── utils/          # Utilidades
├── public/              # Frontend (HTML, CSS, JS)
│   ├── css/
│   ├── js/
│   └── index.html
├── uploads/             # Almacenamiento de fotos
├── package.json
├── server.js            # Punto de entrada
└── .env                 # Variables de entorno
```

## 🚀 Instalación

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   - Copiar `.env.example` a `.env`
   - Llenar credenciales de Firebase

4. **Descargar credenciales de Firebase**
   - Ir a Firebase Console
   - Configuración del proyecto → Cuentas de servicio
   - Generar clave privada (JSON)
   - Copiar valores a `.env`

5. **Iniciar servidor**
   ```bash
   npm run dev    # Con nodemon (desarrollo)
   npm start      # Producción
   ```

6. **Acceder a la aplicación**
   ```
   http://localhost:3000
   ```

## 🔧 Tecnologías

- **Backend**: Express.js
- **Base de Datos**: Firebase (Firestore)
- **Autenticación**: Firebase Authentication
- **Almacenamiento**: Firebase Storage
- **Frontend**: HTML5, CSS3, JavaScript Vanilla

## 📝 API Endpoints

### Setup
- `GET /api/setup/status` - Verificar si setup completado
- `POST /api/setup/create-user` - Crear primer usuario

### Autenticación
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Obtener usuario actual

### Productos
- `POST /api/productos` - Crear producto
- `GET /api/productos` - Listar productos
- `GET /api/productos/:id` - Obtener producto
- `PUT /api/productos/:id` - Actualizar producto
- `DELETE /api/productos/:id` - Eliminar producto

### Colaboradores
- `POST /api/colaboradores` - Crear colaborador
- `GET /api/colaboradores` - Listar colaboradores
- `GET /api/colaboradores/:id` - Obtener colaborador
- `PUT /api/colaboradores/:id` - Actualizar colaborador
- `DELETE /api/colaboradores/:id` - Eliminar colaborador

### Préstamos
- `POST /api/prestamos` - Crear préstamo
- `GET /api/prestamos` - Listar préstamos
- `GET /api/prestamos/:id` - Obtener préstamo
- `PUT /api/prestamos/:id/devolver` - Registrar devolución

## 📊 Estructura de Datos

### Usuarios
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@taller.com",
  "activo": true,
  "rol": "ADMIN",
  "fechaCreacion": "2026-04-16T10:00:00Z"
}
```

### Colaboradores
```json
{
  "nombre": "Carlos García",
  "codigoEmpleado": "E001",
  "cargo": "Soldador",
  "departamento": "Soldadura",
  "telefono": "555-0001",
  "activo": true
}
```

### Productos
```json
{
  "nombre": "Lija #120",
  "codigoBarras": "5901234123457",
  "tipo": "RECURSO",
  "cantidadTotal": 50,
  "cantidadMinima": 10,
  "fotos": [],
  "activo": true
}
```

### Préstamos
```json
{
  "idColaborador": "col_001",
  "estado": "PENDIENTE",
  "detalles": [
    {
      "idProducto": "prod_001",
      "cantidad": 5,
      "estado": "PENDIENTE"
    }
  ],
  "fechaSolicitud": "2026-04-16T14:30:00Z",
  "fechaDevolucionEsperada": "2026-04-16T17:00:00Z"
}
```

## 🔐 Seguridad

- Contraseñas hasheadas con bcryptjs
- Autenticación con Firebase Authentication
- Middleware de validación de tokens
- Reglas de seguridad en Firestore
- Validación de entrada con express-validator

## 📝 Notas

- El sistema está diseñado para 2 usuarios (Encargado + Ayudante)
- Colecciones se crean automáticamente en Firestore
- Las fotos se almacenan en Firebase Storage
- Soft-delete para preservar historial

## 📄 Licencia

ISC

## 👨‍💻 Autor

Sistema desarrollado para taller de hojalatería
