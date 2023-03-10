import { server$, secret$, import$ } from '@tanstack/bling'
import { createSignal, lazy, Suspense, useContext } from 'solid-js'
import { HydrationScript, NoHydration } from 'solid-js/web'
import { manifestContext } from './manifest'
import { secret } from './server.secret$'

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

  console.log(
    'Do you know the server secret in server.secret.ts?',
    secret ?? 'Nope',
  )

  const [state, setState] = createSignal(0)

  return (
    <html>
      <head>
        <title>Hello World</title>
      </head>
      <body>
        <div>Hello world</div>
        <button onClick={() => setState((s) => s + 1)}>{state}</button>
        <Suspense fallback={'loading'}>
          <LazyHello3 />
        </Suspense>
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
