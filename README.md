# @TanStack/Bling

Framework agnostic transpilation utilities for client/server RPCs, env isolation, islands, module splitting, and more.

=======

# API

## `fetch$`

The `fetch$` function is used to create an isomorphic server-side RPC. It takes a function and an optional configuration object and returns a function that can be called on both server (ssr or ssg) and client. The function passed to `fetch$` will only be executed on the server. On the client, a `fetch` call is made to the server function instead. The results of the function will be exactly the same on both server and client.

**🧠 Important Notes**:

- The server-side function must be an `async` function.
- The fetch calls made by the client default to using the `POST` method and passing arguments via the request body. To use `GET` requests and search-param payloads instead, the `opts.method` can be set to `GET`. This will automatically configure both the method and the payload serialization to work via search params instead of a request body. You can also alter the actual request (and request body) manually to your liking.

```tsx
import { fetch$ } from '@tanstack/bling'

const fetchFn = fetch$(async (payload) => {
  // do something
  return 'result'
})
```

### Signature

```tsx
fetch$<T extends (...args: any[]) => Promise<any>>(fn: T, options: {
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

## Server-Only Files (`filename.server$.ext`)

The `filename.server$.ext` pattern can be used to create server-side only files. These files will be removed from the client bundle. This is useful for things like server-side only imports, or server-side only code. It works with any file name and extension so long as `.server$.` is found in the resolved file pathname.

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

## `server$` (Coming Soon)

The `server$` function can be used to scope any expression to the server-bundle only. This means that the expression will be removed from the client bundle. This is useful for things like server-side only imports, or server-side only code.

```tsx
import { server$ } from '@tanstack/bling'

const serverOnly = server$('It is a secret!')')
```

Server Output:

```tsx
const serverOnly = server$('It is a secret!')')
```

Client Output:

```tsx
const serverOnly = undefined
```

### Signature

```tsx
server$<T>(input: T): T | undefined
```

### Arguments

- `input`
  - Any function, expression, or variable.

### Returns

- The variable on the server
- `undefined` on the client

## `split$` (Coming Soon)

The `split$` function can be used to code-split any asynchronous function on both server and client at build-time.

```tsx
import { split$ } from '@tanstack/bling'

const fn = split$(async (name: string) => {
  return `Hello ${name}`
})
```

Output:

```tsx
const fn = (name: string) =>
  import('virtual:split$-[hash]').then((m) => m.default(name))
```

### Signature

```tsx
split$<T extends (...args: any[]) => Promise<any>>(fn: T): T
```

### Arguments

- `fn`
  - The asynchronous function to be code-split.

### Returns

- A code-split version of the original function.

# Proposed APIs

The following APIs are proposed for future versions of Bling. They are not yet implemented, but are being considered for future releases.

## `worker$`

The `worker$` function is used to create an isomorphic Web Worker and interact with it. On the server, the function will run in the same process as the server. On the client, the function will be compiled to a Web Worker and will return an interface similar to `fetch$` to make it easy to call from the client

> 🧠 Similar to `fetch$`, data sent to and from workers will be serialized. This means that you can pass any JSON-serializable data to the worker, but you cannot pass functions or classes. If you need to use non-serializable assets in your worker, you can import them and use them directly in the worker function, however the instances of those assets will be unique to the worker thread.

```tsx
import { worker$ } from '@tanstack/bling'

const sayHello = worker$(async (name: string) => {
  // do something
  return `Hello ${name}`
})

const result = sayHello('World!')
console.log(result) // 'Hello World!'
```

<!-- Use the force, Luke! -->
