import { type Encryption, EncryptionFactory, iv, key } from '@/utils/cipher';
import {
  createPersistedState,
  type PersistedStateFactoryOptions,
  type Serializer
} from 'pinia-plugin-persistedstate';
import type { Pinia } from 'pinia';
import { isDevelopment } from '@/utils/environment';

const persistEncryption: Encryption = EncryptionFactory.createAesEncryption({
  key,
  iv
});

/**
 * Custom serializer for serialization and deserialization of storage data
 * 自定义序列化器，用于序列化和反序列化存储数据
 * @param isEnableEncryption
 * @returns serializer
 */

function customSerializer(isEnableEncryption: boolean): Serializer {
  return {
    deserialize: (value: string) => {
      return isEnableEncryption
        ? persistEncryption.decrypt(value)
        : JSON.parse(value);
    },
    serialize: (value: any) => {
      return isEnableEncryption
        ? persistEncryption.encrypt(value)
        : JSON.stringify(value);
    }
  };
}

/**
 * Register Pinia Persist Plugin
 * 注册 Pinia 持久化插件
 *
 * @param pinia Pinia instance Pinia 实例
 */
export function registerPiniaPersistPlugin(pinia: Pinia) {
  pinia.use(
    createPersistedState(createPersistedStateOptions(import.meta.env.MODE))
  );
}

/**
 * Create Persisted State Options
 * 创建持久化状态选项
 *
 * @param prefix prefix for storage key 储存键前缀
 * @returns persisted state factory options
 */
export function createPersistedStateOptions(
  prefix: string
): PersistedStateFactoryOptions {
  return {
    storage: localStorage,
    key: (id: string) => `${prefix}__${id}`,
    serializer: customSerializer(!isDevelopment)
  };
}
