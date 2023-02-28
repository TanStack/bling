import { server$ } from "@tanstack/bling";

export function App() {
  let sayHello = server$(() => console.log("Hello world"));
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
  );
}

function Scripts() {
  return <script type="module" src="/src/app/entry-client.tsx"></script>;
}
