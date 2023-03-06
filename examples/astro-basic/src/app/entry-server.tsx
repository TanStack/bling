import { hasHandler, handleFetch$ } from '@tanstack/bling/server'
import type { APIContext } from 'astro'
import * as ReactDOM from 'react-dom/server.browser'
import { App } from './root'
import { manifest } from './manifest'

export const requestHandler = async ({ request }: APIContext) => {
  // manifest['entry-client'] = 1
  if (hasHandler(new URL(request.url).pathname)) {
    return await handleFetch$({
      request,
    })
  }

  return new Response(await ReactDOM.renderToReadableStream(<App />), {
    headers: {
      'content-type': 'text/html',
    },
  })
}
