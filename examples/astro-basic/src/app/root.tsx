import { fetch$, split$, server$ } from '@tanstack/bling'
import { secret } from './secret.server$'

const fetchHello = fetch$(() => console.log('Hello world'))

function ServerHello() {
  return <button onClick={() => fetchHello()}>ServerFn Hello</button>
}

const splitHello = split$(() => console.log('I am code split!'))

function SplitHello() {
  return <button onClick={() => splitHello()}>Split Hello</button>
}

const inlineSecret = server$('I am an inline server secret!')

export function App() {
  console.log('Do you know the server secret?', secret ?? 'Nope.')
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
