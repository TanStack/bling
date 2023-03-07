import { hasHandler, handleFetch$ } from '@tanstack/bling/server'
import type { APIContext } from 'astro'
import { renderToStringAsync } from 'solid-js/web'
import { App } from './root'
import { manifest } from 'astro:ssr-manifest'
import { manifestContext } from './manifest'

export const requestHandler = async ({ request }: APIContext) => {
  if (hasHandler(new URL(request.url).pathname)) {
    return await handleFetch$({
      request,
    })
  }

  return new Response(
    await renderToStringAsync(() => (
      <manifestContext.Provider value={manifest}>
        <App />
      </manifestContext.Provider>
    )),
    {
      headers: {
        'content-type': 'text/html',
      },
    },
  )
}
