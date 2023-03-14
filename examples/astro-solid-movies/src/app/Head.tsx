import { useContext } from 'solid-js'
import { renderTags } from '@solidjs/meta'
import { ssr, useAssets } from 'solid-js/web'
import { RequestContext } from './context'

export function Meta() {
  const context = useContext(RequestContext)
  // @ts-expect-error The ssr() types do not match the Assets child types
  useAssets(() => ssr(renderTags(context.tags)))
  return null
}
export function Head({ children }) {
  return (
    <head>
      {children}
      <Meta />
    </head>
  )
}
