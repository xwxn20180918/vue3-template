import '@/plugins/unocss';
import './assets/main.css';

import { createApp } from 'vue';
import App from './App.vue';
import { setupRouter } from './router';
import { setupStore } from '@/stores';
import { setupElementPlus } from '@/plugins/element-plus';

function bootstrap() {
  const app = createApp(App);

  // 配置store
  setupStore(app);

  // 注册全局组件
  setupElementPlus(app);

  // 初始化内部系统配置
  // initAppConfigStore();

  // 多语言配置
  // setupI18n(app);

  // 配置路由
  setupRouter(app);

  // 路由守卫
  // setupRouterGuard(router)

  // 注册全局指令
  // setupGlobDirectives(app)

  app.mount('#app');
}

bootstrap();
