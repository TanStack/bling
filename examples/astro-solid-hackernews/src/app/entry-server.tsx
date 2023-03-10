import { hasHandler, handleFetch$ } from '@tanstack/bling/server'
import type { APIContext } from 'astro'
import { NoHydration, renderToStringAsync } from 'solid-js/web'
import { manifest } from 'astro:ssr-manifest'
import { manifestContext } from './manifest'
import { routes } from './root'
import { Router, Routes, useRoutes } from '@solidjs/router'

export const requestHandler = async ({ request }: APIContext) => {
  if (hasHandler(new URL(request.url).pathname)) {
    return await handleFetch$({
      request,
    })
  }

  return new Response(
    await renderToStringAsync(() => {
      const Routes = useRoutes(routes)
      return (
        <NoHydration>
          <manifestContext.Provider value={manifest}>
            <Router url={request.url.toString()}>
              <Routes />
            </Router>
          </manifestContext.Provider>
        </NoHydration>
      )
    }),
    {
      headers: {
        'content-type': 'text/html',
      },
    },
  )
}
