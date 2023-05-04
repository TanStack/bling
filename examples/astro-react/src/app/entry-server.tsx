import { hasHandler, handleFetch$ } from '@tanstack/bling/server'
import type { APIContext } from 'astro'
// @ts-ignore
import * as ReactDOM from 'react-dom/server.browser'
import { App } from './root'
// @ts-ignore
import { manifest } from 'astro:ssr-manifest'
import { manifestContext } from './manifest'

export const requestHandler = async ({ request }: APIContext) => {
  if (hasHandler(new URL(request.url).pathname)) {
    return await handleFetch$({
      request,
    })
  }

  return new Response(
    await ReactDOM.renderToReadableStream(
      <manifestContext.Provider value={manifest}>
        <App />
      </manifestContext.Provider>,
    ),
    {
      headers: {
        'content-type': 'text/html',
      },
    },
  )
}
