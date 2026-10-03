import { createApp } from 'vue'
import App from './App.vue'
import BookApp from './BookApp.vue'
import './style.css'

createApp(window.location.pathname.includes('/book') ? BookApp : App).mount('#app')
