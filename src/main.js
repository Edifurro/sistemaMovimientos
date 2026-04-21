import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'
import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'
import './styles/global.css'

import App from './App.vue'
import router from './router.ts'

const app = createApp(App)
  .use(IonicVue)
  .use(router)

router
  .isReady()
  .then(() => {
    app.mount('#app')
  })
  .catch((error) => {
    console.error('Router initialization failed:', error)
    app.mount('#app')
  })
