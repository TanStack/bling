import { serverFn$ } from '@tanstack/bling'
import { secret } from './secret.server$'

const sayHello = serverFn$(() => console.log('Hello world'))

export function App() {
  console.log('Do you know the secret?', secret)

  return (
    <html>
      <head>
        <title>Hello World</title>
      </head>
      <body>
        <div>Hello world</div>
        <button onClick={() => sayHello()}>Click me</button>
        <Scripts />
      </body>
    </html>
  )
}

function Scripts() {
  return <script type="module" src="/src/app/entry-client.tsx"></script>
}
