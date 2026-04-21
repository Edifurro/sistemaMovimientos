// App principal - Manejo de routing y estado global

class App {
  constructor() {
    this.usuario = null;
    this.token = localStorage.getItem('token');
    this.setupCompleted = false;
    this.currentPage = 'setup';
  }

  async init() {
    try {
      // Verificar setup
      const setupResponse = await fetch('/api/setup/status');
      const setupData = await setupResponse.json();
      this.setupCompleted = setupData.setupCompleted;

      // Si setup completado, intentar cargar usuario
      if (this.setupCompleted && this.token) {
        await this.loadCurrentUser();
      }

      this.render();
    } catch (error) {
      console.error('Error al inicializar app:', error);
      this.showError('Error al inicializar la aplicación');
    }
  }

  async loadCurrentUser() {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.usuario = data.usuario;
      } else {
        // Token inválido
        localStorage.removeItem('token');
        this.token = null;
      }
    } catch (error) {
      console.error('Error al cargar usuario:', error);
    }
  }

  render() {
    const app = document.getElementById('app');

    if (!this.setupCompleted) {
      app.innerHTML = this.getSetupPageHTML();
      this.attachSetupListeners();
    } else if (!this.usuario) {
      app.innerHTML = this.getLoginPageHTML();
      this.attachLoginListeners();
    } else {
      app.innerHTML = this.getDashboardHTML();
      this.attachDashboardListeners();
    }
  }

  getSetupPageHTML() {
    return `
      <div class="setup-page">
        <div class="setup-form">
          <h1>🔧 Configuración Inicial</h1>
          <form id="setupForm">
            <div class="form-group">
              <label for="nombre">Nombre del Encargado</label>
              <input type="text" id="nombre" required>
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" required>
            </div>
            <div class="form-group">
              <label for="password">Contraseña</label>
              <input type="password" id="password" required>
            </div>
            <button type="submit">Crear Usuario</button>
          </form>
          <div id="setupMessage"></div>
        </div>
      </div>
    `;
  }

  getLoginPageHTML() {
    return `
      <div class="setup-page">
        <div class="setup-form">
          <h1>🔐 Iniciar Sesión</h1>
          <form id="loginForm">
            <div class="form-group">
              <label for="loginEmail">Email</label>
              <input type="email" id="loginEmail" required>
            </div>
            <div class="form-group">
              <label for="loginPassword">Contraseña</label>
              <input type="password" id="loginPassword" required>
            </div>
            <button type="submit">Ingresar</button>
          </form>
          <div id="loginMessage"></div>
        </div>
      </div>
    `;
  }

  getDashboardHTML() {
    return `
      <header>
        <h1>📊 Sistema Gestión Inventario</h1>
        <p>Bienvenido, ${this.usuario.nombre}</p>
      </header>
      <nav>
        <ul>
          <li><a href="#" data-page="inicio">Inicio</a></li>
          <li><a href="#" data-page="productos">Productos</a></li>
          <li><a href="#" data-page="colaboradores">Colaboradores</a></li>
          <li><a href="#" data-page="prestamos">Préstamos</a></li>
          <li><a href="#" data-page="reportes">Reportes</a></li>
          <li><a href="#" data-logout>Cerrar Sesión</a></li>
        </ul>
      </nav>
      <main>
        <div class="container" id="mainContent">
          Selecciona una opción del menú
        </div>
      </main>
    `;
  }

  attachSetupListeners() {
    const form = document.getElementById('setupForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nombre = document.getElementById('nombre').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const response = await fetch('/api/setup/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre, email, password })
        });

        const data = await response.json();

        if (response.ok) {
          document.getElementById('setupMessage').innerHTML = 
            '<div class="success">✅ Usuario creado. Redirigiendo...</div>';
          
          setTimeout(() => {
            this.setupCompleted = true;
            this.render();
          }, 2000);
        } else {
          document.getElementById('setupMessage').innerHTML = 
            `<div class="error">❌ ${data.error}</div>`;
        }
      } catch (error) {
        console.error('Error:', error);
        document.getElementById('setupMessage').innerHTML = 
          '<div class="error">❌ Error al crear usuario</div>';
      }
    });
  }

  attachLoginListeners() {
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
          // Aquí debería obtener un token de Firebase
          // Por ahora solo guardamos datos básicos
          localStorage.setItem('token', 'temp-token');
          this.token = 'temp-token';
          this.usuario = data.usuario;
          document.getElementById('loginMessage').innerHTML = 
            '<div class="success">✅ Login exitoso. Redirigiendo...</div>';
          
          setTimeout(() => {
            this.render();
          }, 1000);
        } else {
          document.getElementById('loginMessage').innerHTML = 
            `<div class="error">❌ ${data.error}</div>`;
        }
      } catch (error) {
        console.error('Error:', error);
        document.getElementById('loginMessage').innerHTML = 
          '<div class="error">❌ Error en login</div>';
      }
    });
  }

  attachDashboardListeners() {
    // Cerrar sesión
    const logoutLink = document.querySelector('[data-logout]');
    if (logoutLink) {
      logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        this.token = null;
        this.usuario = null;
        this.render();
      });
    }

    // Navegación
    document.querySelectorAll('nav a[data-page]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        this.showPage(page);
      });
    });
  }

  showPage(page) {
    const mainContent = document.getElementById('mainContent');
    
    switch (page) {
      case 'inicio':
        mainContent.innerHTML = '<h2>Inicio</h2><p>Bienvenido al sistema</p>';
        break;
      case 'productos':
        mainContent.innerHTML = '<h2>Gestión de Productos</h2><p>Aquí irá la lista de productos</p>';
        break;
      case 'colaboradores':
        mainContent.innerHTML = '<h2>Gestión de Colaboradores</h2><p>Aquí irá la lista de colaboradores</p>';
        break;
      case 'prestamos':
        mainContent.innerHTML = '<h2>Registro de Préstamos</h2><p>Aquí irá el registro de préstamos</p>';
        break;
      case 'reportes':
        mainContent.innerHTML = '<h2>Reportes</h2><p>Aquí irán los reportes</p>';
        break;
    }
  }

  showError(message) {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="error">${message}</div>`;
  }
}

// Inicializar app cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
