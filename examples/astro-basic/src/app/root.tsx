import { serverFn$, split$ } from '@tanstack/bling'
import { secret } from './secret.server$'

const serverFnHello = serverFn$(() => console.log('Hello world'))

const splitHello = split$(() => console.log('Hello split!'))

export function App() {
  console.log('Do you know the secret?', secret)

  return (
    <html>
      <head>
        <title>Hello World</title>
      </head>
      <body>
        <div>Hello world</div>
        <button onClick={() => serverFnHello()}>ServerFn Hello</button>
        <button onClick={() => splitHello()}>Split Hello</button>
        <Scripts />
      </body>
    </html>
  )
}

function Scripts() {
  return <script type="module" src="/src/app/entry-client.tsx"></script>
}
