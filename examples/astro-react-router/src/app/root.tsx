import { server$, lazy$, secret$, import$ } from '@tanstack/bling'
import React, { Fragment, lazy, Suspense, useContext } from 'react'
import { Link, Outlet, RouteObject, useLoaderData } from 'react-router-dom'
import { manifestContext } from './manifest'

const sayHello = server$(() => console.log('Hello world'))

function ServerHello() {
  return <button onClick={() => sayHello()}>ServerFn Hello</button>
}

const LazyHello = lazy$((props) => {
  return <button {...props}>Split asHelo</button>
})

const LazyHello2 = lazy$(function SplitHelloas() {
  return (
    <Fragment>
      <button onClick={() => console.log('hello')}>Split asdasd21o</button>
      <LazyHello onClick={() => sayHello()} />
    </Fragment>
  )
})

const LazyHello3 = lazy(() =>
  import$({
    default: () => {
      return (
        <Fragment>
          <button onClick={() => console.log('hello')}>Split asdasd21o</button>
          <LazyHello onClick={() => sayHello()} />
        </Fragment>
      )
    },
  }),
)

const inlineSecret = secret$('I am an inline server secret!')

const App = lazy$(() => {
  console.log(
    'Do you know the inline server secret?',
    inlineSecret ?? 'Not even.',
  )

  return (
    <html>
      <head>
        <title>Hello World</title>
      </head>
      <body>
        <div>Hello world</div>
        <Link to="/hello">hello</Link>
        <Link to="/">home</Link>
        <Suspense>
          <Outlet />
        </Suspense>
        <Scripts />
      </body>
    </html>
  )
})

const SomeRoute = lazy$(() => {
  const [state, setState] = React.useState(0)

  return (
    <>
      <ServerHello />
      <button onClick={() => setState((s) => s + 1)}>Click</button>
      {state > 0 && (
        <Suspense fallback={'loading'}>
          <LazyHello />
          <LazyHello2 />
          <LazyHello3 />
        </Suspense>
      )}
    </>
  )
})

const SomeRoute2 = lazy(() =>
  import$({
    default: () => {
      const [state, setState] = React.useState(0)
      const data = useLoaderData()
      console.log(data)

      return (
        <>
          <button onClick={() => setState((s) => s + 1)}>Click</button>
        </>
      )
    },
  }),
)

function Scripts() {
  const manifest = useContext(manifestContext)
  return import.meta.env.DEV ? (
    <>
      <script type="module" src="/@vite/client"></script>
      <script type="module" src="/src/app/entry-client.tsx"></script>
    </>
  ) : (
    <script type="module" src={manifest['entry-client']}></script>
  )
}

export let routes = [
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <SomeRoute />,
      },
      {
        path: 'hello',
        loader: server$((args, { request }) => {
          console.log(inlineSecret)
          return {
            'got data': inlineSecret,
            req: [...request.headers.entries()],
          }
        }),

        element: <SomeRoute2 />,
      },
    ],
  },
] satisfies RouteObject[]
