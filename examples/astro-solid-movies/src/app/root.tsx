import { server$, import$, secret$, redirect } from '@tanstack/bling'
import {
  createSignal,
  ErrorBoundary,
  lazy,
  Show,
  Suspense,
  useContext,
} from 'solid-js'
import { HydrationScript, NoHydration } from 'solid-js/web'
import { manifestContext } from './manifest'
import {
  A,
  Link,
  Outlet,
  RouteDataFuncArgs,
  RouteDefinition,
  useRouteData,
} from '@solidjs/router'
import { Component, createResource, For } from 'solid-js'
import type { IStory } from './types'
import fetchAPI from './lib/api'
import Nav from './components/Nav'
import Footer from './components/Footer'
import GlobalLoader from './components/GlobalLoader'
import '~/assets/css/global.scss'
import { Head } from './Head'
import { Meta, Title } from '@solidjs/meta'

const sayHello = server$(() => console.log('Hello world'))

const style_pattern = /\.(css|less|sass|scss|styl|stylus|pcss|postcss)$/

const LazyHello3 = lazy(() =>
  import$({
    default: () => {
      return (
        <>
          <button onClick={() => sayHello()}>Split up</button>
        </>
      )
    },
  }),
)

const inlineSecret = secret$('I am an inline server secret!')

function App() {
  console.log(
    'Do you know the inline server secret?',
    inlineSecret ?? 'Not even.',
  )

  return (
    <html>
      <Head>
        <Title>SolidStart - Movies</Title>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta name="description" content="Hacker News Clone built with Solid" />
      </Head>
      <body>
        <Nav />
        <Suspense fallback={<div class="news-list-nav">Loading...</div>}>
          <Layout />
        </Suspense>
        <Scripts />
      </body>
    </html>
  )
}

import { Style } from '@solidjs/meta'
import { RequestContext } from './context'
import Page, { routeData } from './routes/(home)'
import Layout from './routes/(layout)'

// let warned = false;

function useRequest() {
  const context = useContext(RequestContext)
  if (!context) {
    throw new Error('useRequest must be used within a <ManifestProvider>')
  }
  return context
}

export function InlineStyles() {
  const isDev = import.meta.env.MODE === 'development'
  const context = useRequest()
  const manifest = useContext(manifestContext)
  if (!isDev) {
    return null
  }

  const [resource] = createResource(
    async () => {
      if (import.meta.env.SSR) {
        return await manifest.DEV.collectStyles?.(['src/app/entry-server'])
      } else {
        return {}
      }
    },
    {
      deferStream: true,
    },
  )

  // We need a space here to prevent the server from collapsing the space between the style tags
  // and making it invalid
  return (
    <Suspense>
      <Show when={resource()} keyed>
        {(resource) => {
          return (
            <Style>
              {Object.entries(resource)
                .filter(([k]) => style_pattern.test(k))
                .map(([k, v]) => {
                  return `/* ${k} */\n` + v
                })
                .join('\n') + ' '}
            </Style>
          )
        }}
      </Show>
    </Suspense>
  )
}

function DevInlineStyles() {
  return <InlineStyles />
}

function Scripts() {
  const manifest = useContext(manifestContext)
  return (
    <NoHydration>
      <HydrationScript />
      <DevInlineStyles />
      <script $ServerOnly>{`
        window._$HY.islandMap = {}
        window._$HY.island = (p, c) => window._$HY.islandMap[p] = c
      `}</script>
      {import.meta.env.DEV ? (
        <>
          <script type="module" src="/@vite/client" $ServerOnly></script>
          <script
            type="module"
            src="/src/app/entry-client.tsx"
            $ServerOnly
          ></script>
        </>
      ) : (
        <>
          <script
            type="module"
            src={manifest['entry-client']}
            $ServerOnly
          ></script>
        </>
      )}
    </NoHydration>
  )
}

export const routes = [
  {
    path: '/',
    component: App,
    children: [
      {
        path: '',
        data: routeData,
        component: Page,
      },
    ],
  },
] satisfies RouteDefinition[]
