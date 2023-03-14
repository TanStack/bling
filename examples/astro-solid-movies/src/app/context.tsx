import { createContext } from 'solid-js'

export const RequestContext = createContext<{
  tags: any[]
  routerContext: any
}>()
