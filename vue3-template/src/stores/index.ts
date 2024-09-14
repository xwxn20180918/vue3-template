import type { App } from 'vue';
import { createPinia } from 'pinia';
import { registerPiniaPersistPlugin } from '@/stores/plugins/persist';

const store = createPinia();
registerPiniaPersistPlugin(store);

export function setupStore(app: App<Element>) {
  app.use(store);
}

export { store };
