import { createContext } from 'solid-js'

export const manifestContext = createContext<{ 'entry-client': string }>({
  'entry-client': '',
})
