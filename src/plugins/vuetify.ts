// src/plugins/vuetify.ts
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// If you created themes.ts, keep this import. Otherwise, you can remove it
// and comment out the `theme` block below.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { themes } from '../themes'

// Import ONLY what you use (tree-shake)
import {
  VApp,
  VMain,
  VContainer,
  VCard,
  VCardTitle,
  VCardText,
  VAlert,
  VAppBar,
  VBtn,
  VIcon,
  VSpacer,
  VToolbarTitle,
  VDivider,
  VCol,
  VRow,
} from 'vuetify/components'
import { Ripple } from 'vuetify/directives'

export const vuetify = createVuetify({
  components: {
    VApp,
    VMain,
    VContainer,
    VCard,
    VCardTitle,
    VCardText,
    VAlert,
    VAppBar,
    VBtn,
    VIcon,
    VSpacer,
    VToolbarTitle,
    VDivider,
    VCol,
    VRow,
  },
  directives: { Ripple },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  // Comment this block if you don't want custom themes yet
  theme: {
    defaultTheme: 'light',
    themes,
  },
})
