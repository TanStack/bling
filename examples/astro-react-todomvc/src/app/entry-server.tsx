import {
  hasHandler,
  handleFetch$,
  addDeserializer,
} from '@tanstack/bling/server'
import type { APIContext } from 'astro'
import * as ReactDOM from 'react-dom/server.browser'
import { createStaticHandler } from '@remix-run/router'
import {
  createStaticRouter,
  StaticRouterProvider,
} from 'react-router-dom/server'
import { routes } from './root'
import { manifestContext } from './manifest'
import { manifest } from 'astro:ssr-manifest'

addDeserializer({
  apply: (req) => req === '$request',
  deserialize: (value, ctx) => ctx.request,
})

export const requestHandler = async ({ request }: APIContext) => {
  // manifest['entry-client'] = 1
  if (hasHandler(new URL(request.url).pathname)) {
    return await handleFetch$({
      request,
    })
  }

  let { query } = createStaticHandler(routes)
  let context = await query(request)

  if (context instanceof Response) {
    throw context
  }

  let router = createStaticRouter(routes, context)

  return new Response(
    await ReactDOM.renderToReadableStream(
      <manifestContext.Provider value={manifest}>
        <StaticRouterProvider
          router={router}
          context={context}
          nonce="the-nonce"
        />
      </manifestContext.Provider>,
    ),
    {
      headers: {
        'content-type': 'text/html',
      },
    },
  )
}
