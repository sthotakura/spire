import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: App },
    // The book's code and chapters load only when a reader opens it.
    { path: '/book/:slug?', component: () => import('./BookView.vue') },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
  // A book search result links to a heading of a chapter by its anchor.
  scrollBehavior: (to) => (to.hash ? { el: to.hash } : { top: 0 }),
})
