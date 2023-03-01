import { fetch$, split$ } from '@tanstack/bling'
import { secret } from './secret.server$'

const serverFnHello = fetch$(() => console.log('Hello world'))

function ServerHello() {
  return <button onClick={() => serverFnHello()}>ServerFn Hello</button>
}

const splitHello = split$(() => console.log('I am code split!'))

function SplitHello() {
  return <button onClick={() => splitHello()}>Split Hello</button>
}

export function App() {
  console.log('Do you know the secret?', secret)

  return (
    <html>
      <head>
        <title>Hello World</title>
      </head>
      <body>
        <div>Hello world</div>
        <ServerHello />
        <SplitHello />
        <Scripts />
      </body>
    </html>
  )
}

function Scripts() {
  return <script type="module" src="/src/app/entry-client.tsx"></script>
}
