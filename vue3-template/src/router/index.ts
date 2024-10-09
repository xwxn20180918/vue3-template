import { createRouter, createWebHistory } from 'vue-router';
import type { App } from 'vue';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Login',
      component: () => import('@/views/login/Login.vue')
    }
  ]
});

// 配置路由器
export function setupRouter(app: App<Element>) {
  app.use(router);
}
