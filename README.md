# @TanStack/Bling

Framework agnostic transpilation utilities for client/server RPCs, env isolation, islands, module splitting, and more.

# API

## `server$`

The `server$` function is used to create a server-side RPC. It takes a function as its only argument, and returns a function that can be called from the client-side.

**🧠 Important Notes**:

- The server-side function must be an `async` function.
- RPC's default to `POST` requests. To use `GET` requests, use the `fn.get` convenience method or alter the request manually to your liking.

```tsx
import { server$ } from '@tanstack/bling'

const serverFn = server$(async (payload) => {
  // do something
  return 'result'
})
```

### Signature

```tsx
server$<T extends (...args: any[]) => any>(fn: T, options: {
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

<!-- Use the force, Luke! -->
