import { fetch$, server$, lazy$, import$ } from '@tanstack/bling'
import React, { Fragment, lazy, Suspense, useContext } from 'react'
import { manifestContext } from './manifest'

const fetchHello = fetch$(() => console.log('Hello world'))

function ServerHello() {
  return <button onClick={() => fetchHello()}>ServerFn Hello</button>
}

const LazyHello = lazy$((props) => {
  return <button {...props}>Split asHelo</button>
})

const LazyHello2 = lazy$(function SplitHelloas() {
  return (
    <Fragment>
      <button onClick={() => console.log('hello')}>Split asdasd21o</button>
      <LazyHello onClick={() => fetchHello()} />
    </Fragment>
  )
})

const LazyHello3 = lazy(() =>
  import$({
    default: () => {
      return (
        <Fragment>
          <button onClick={() => console.log('hello')}>Split asdasd21o</button>
          <LazyHello onClick={() => fetchHello()} />
        </Fragment>
      )
    },
  }),
)

const inlineSecret = server$('I am an inline server secret!')

export function App() {
  console.log(
    'Do you know the inline server secret?',
    inlineSecret ?? 'Not even.',
  )

  const [state, setState] = React.useState(0)

  return (
    <html>
      <head>
        <title>Hello World</title>
      </head>
      <body>
        <div>Hello world</div>
        <ServerHello />
        <button onClick={() => setState((s) => s + 1)}>Click</button>
        {state > 0 && (
          <Suspense fallback={'loading'}>
            <LazyHello />
            <LazyHello2 />
            <LazyHello3 />
          </Suspense>
        )}
        <Scripts />
      </body>
    </html>
  )
}

function Scripts() {
  const manifest = useContext(manifestContext)
  return import.meta.env.DEV ? (
    <>
      <script type="module" src="/@vite/client"></script>
      <script type="module" src="/src/app/entry-client.tsx"></script>
    </>
  ) : (
    <>
      <script type="module" src={manifest['entry-client']}></script>
    </>
  )
}
