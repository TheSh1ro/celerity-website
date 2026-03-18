import { createApp } from 'vue'
import { createPinia } from 'pinia'

import '@/assets/global.css'

import App from './App.vue'
import router from './router'
import { SessionInvalidError } from '@/errors'
import { useAuthStore } from '@/stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.config.errorHandler = (err) => {
  if (err instanceof SessionInvalidError) {
    useAuthStore().logout()
  }
}

app.mount('#app')
