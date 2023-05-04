# @TanStack/Bling

Framework agnostic transpilation utilities for client/server RPCs, env isolation, islands, module splitting, and more.

=======

# API

## Macros

<details>
<summary><span style="font-size: 1.5rem; font-weight: bold"><code>server$</code></span></summary>

The `server$` function is used to create an isomorphic server-side RPC. It takes a function and an optional configuration object and returns a function that can be called on both server (ssr or ssg) and client. The function passed to `server$` will only be executed on the server. On the client, a `fetch` call is made to the server function instead. The results of the function will be exactly the same on both server and client.

**🧠 Important Notes**:

- The server-side function must be an `async` function.
- The fetch calls made by the client default to using the `POST` method and passing arguments via the request body. To use `GET` requests and search-param payloads instead, the `opts.method` can be set to `GET`. This will automatically configure both the method and the payload serialization to work via search params instead of a request body. You can also alter the actual request (and request body) manually to your liking.

```tsx
import { server$ } from '@tanstack/bling'

const fetchFn = server$(async (payload) => {
  // do something
  return 'result'
})
```

### Signature

```tsx
server$<T extends (...args: any[]) => Promise<any>>(fn: T, options: {
  method?: 'POST' | 'GET' // Defaults to `POST`
  request?: RequestInit
}): T
```

### Arguments

- `fn`
  - The function to be called from the client-side.
  - Arguments
    - `payload`
      - The payload passed from the client-side.
    - `ctx`
      - The context object passed from the client-side.
      - `request`
        - The request object passed from the client-side.
  - Returns the data or response to be sent back to the client-side
    - `Promise<JSON | Response>`
  - Can use utilities like `json`, `redirect`, or `eventStream` to return convenient responses.
- `options`
  - `method`
    - The HTTP method to use when calling the server-side function.
    - Defaults to `POST`
    - If `GET` is used, the payload will automatically be encoded as query parameters.
  - `request`
    - The default request object to be passed to the `fetch` call to the server function.
    - Can be used to add headers, signals, etc.

### Returns

A function that can be called isomorphically from server or client side code to execute the server-side function.

- ```tsx
    fn(
      payload: JSON,
      options: {
        method?: 'POST' | 'GET' // Defaults to `POST`
        request?: RequestInit
      }
    ) => Promise<
      Awaited<ReturnType<T>> extends JsonResponse<infer R>
        ? R
        : ReturnType<T>
    >
  ```

  - Arguments
    - `payload`
      - The payload to be passed to the server-side function.
    - `options`
      - `method`
        - The HTTP method to use when calling the server-side function.
        - Defaults to `POST`
        - If `GET` is used, the payload will automatically be encoded as query parameters.
      - `request`
        - The request object to be passed to the `fetch` call to the server function.
        - Can be used to add headers, signals, etc.
  - Returns
    - If a plain Response is returned in the server function, it will be returned here.
    - If a redirect is returned or thrown in the server function, the redirect will be followed.
    - All other values will be treated as JSON. For type-safe JSON, use the `json(data, responseInit)` utility

- `fn.fetch`

  - A convenience `fn.fetch` method is also exposed on the function itself to facilitate custom fetch calls. In this case, only the request object is passed as the first argument. Any data you wish to pass should be encoded in the request object.

  ```tsx
    fn.fetch(
      request: RequestInit,
    ) => Promise<
      Awaited<ReturnType<T>> extends JsonResponse<infer R>
        ? R
        : ReturnType<T>
    >
  ```

  - Arguments
    - `payload`
      - The payload to be passed to the server-side function.
    - `options`
      - `request`
        - The request object to be passed to the `fetch` call to the server function.
        - Can be used to add headers, signals, etc.

</details>

<details>
<summary><code>secret$</code></summary>

## `secret$`

The `secret$` function can be used to scope any expression to the server (secret)-bundle only. This means that the expression will be removed from the client bundle. This is useful for things like server-side only imports, server-side only code or sensitive env variables that should never be available on the client.

```tsx
import { secret$ } from '@tanstack/bling'

const secretMessage = secret$('It is a secret!')
```

Server Output:

```tsx
const secretMessage = server$('It is a secret!')
```

Client Output:

```tsx
const secretMessage = undefined
```

### Signature

```tsx
secret$<T>(input: T): T
```

> 🧠 The return type is the same as the input type. Although the value could technically be `undefined` on the client, it's more useful to retain a non-nullable type in the wild.

### Arguments

- `input`
  - Any function, expression, or variable.

### Returns

- The variable on the server
- `undefined` on the client

</details>

<details>
<summary><code>import$</code></summary>

## `import$`

The `import$` function can be used to code-split any expression into it's own module on both server and client at build-time. This is helpful for you to coordinate what code loads when without having to create new files for every part you want want to code-split. It's an async function just like the native dynamic import. It actually compiles down to a dynamic import, but with a unique hash for each import$ instance used in the file.

```tsx
import { import$ } from '@tanstack/bling'

const fn = await import$(async (name: string) => {
  return `Hello ${name}`
})
```

This can be used to code-split React/Solid components too:

```tsx
import { import$ } from '@tanstack/bling'
import { lazy } from 'react'

const fn = lazy(() =>
  import$({
    default: () => <div>Hello World!</div>,
  }),
)
```

Output:

```tsx
const fn = await import('/this/file?split=0&ref=fn').then((m) => m.default)
```

### Signature

```tsx
import$<T extends any>(fn: T) => Promise<T>
```

### Arguments

- `value`
  - The value/expression/function to be code-split.

### Returns

- A code-split version of the original expression.

</details>

## File conventions

<details>
<summary><code>Secret files</code></summary>

## Server-Only Files

The `[filename].secret.[ext]` pattern can be used to create server-side only files. These files will be removed from the client bundle. This is useful for things like server-side only imports, or server-side only code. It works with any file name and extension so long as `.server$.` is found in the resolved file pathname.

When a server-only file is imported on the client, it will be provided the same exports, but stubbed with undefined values. Don't put anything sensitive in the exported variable name! 😜

```tsx
// secret.server$.ts`
export const secret = 'This is top secret!'
export const anotherSecret = '🤫 Shhh!'
```

Client output:

```tsx
export const secret = undefined
export const anotherSecret = undefined
```

</details>

## Proposed APIs

The following APIs are proposed for future versions of Bling. They are not yet implemented, but are being considered for future releases.

<details>
<summary><code>worker$</code></summary>

## `worker$`

The `worker$` function is used to create an isomorphic Web Worker and interact with it. On the server, the function will run in the same process as the server. On the client, the function will be compiled to a Web Worker and will return an interface similar to `server$` to make it easy to call from the client

> 🧠 Similar to `server$`, data sent to and from workers will be serialized. This means that you can pass any JSON-serializable data to the worker, but you cannot pass functions or classes. If you need to use non-serializable assets in your worker, you can import them and use them directly in the worker function, however the instances of those assets will be unique to the worker thread.

```tsx
import { worker$ } from '@tanstack/bling'

const sayHello = worker$(async (name: string) => {
  // do something
  return `Hello ${name}`
})

const result = sayHello('World!')
console.log(result) // 'Hello World!'
```

</details>
<!-- Use the force, Luke! -->

- [`websocket$`](#websocket)
- [`lazy$`](#lazy)
- [`interactive$`/`island$`](#interactive)
