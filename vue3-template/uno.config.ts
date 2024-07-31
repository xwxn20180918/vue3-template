// uno.config.ts
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  // presetUno,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup
} from 'unocss';
// @ts-ignore
import { presetUni } from '@uni-helper/unocss-preset-uni';

export default defineConfig({
  shortcuts: {
    'wh-full': 'w-full h-full'
  },
  theme: {
    colors: {
      // ...
    }
  },
  presets: [
    // presetUno(),
    presetUni(),
    presetAttributify(),
    presetIcons(),
    presetTypography(),
    presetWebFonts({
      fonts: {
        // ...
      }
    })
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()]
});
