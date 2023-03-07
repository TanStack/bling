import { createContext } from 'react'

export const manifestContext = createContext<{ 'entry-client': string }>({
  'entry-client': '',
})
