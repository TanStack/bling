import { server$, import$, secret$ } from '@tanstack/bling'
import { createSignal, lazy, Suspense, useContext } from 'solid-js'
import { HydrationScript, NoHydration } from 'solid-js/web'
import { manifestContext } from './manifest'
import { Link, Outlet, RouteDefinition } from '@solidjs/router'

const sayHello = server$(() => console.log('Hello world'))

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

export function App() {
  console.log(
    'Do you know the inline server secret?',
    inlineSecret ?? 'Not even.',
  )

  const [state, setState] = createSignal(0)

  return (
    <html>
      <head>
        <title>Hello World</title>
      </head>
      <body>
        <div>Hello world</div>
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
        <Suspense fallback={'loading'}>
          <Outlet />
        </Suspense>
        <button onClick={() => setState((s) => s + 1)}>{state}</button>
        <Scripts />
      </body>
    </html>
  )
}

function Scripts() {
  const manifest = useContext(manifestContext)
  return (
    <NoHydration>
      <HydrationScript />
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
        component: lazy(() => import$({ default: () => <div>Home</div> })),
      },
      {
        path: 'about',
        component: lazy(() =>
          import$({
            default: () => (
              <div>
                About{' '}
                <Suspense fallback={'loading'}>
                  <LazyHello3 />
                </Suspense>
              </div>
            ),
          }),
        ),
      },
    ],
  },
] satisfies RouteDefinition[]
