import type { ThemeDefinition } from 'vuetify'
import { lightTheme } from './light'
import { darkTheme } from './dark'

export const themes: { light: ThemeDefinition; dark: ThemeDefinition } = {
  light: lightTheme,
  dark: darkTheme,
}

export { lightTheme, darkTheme }
