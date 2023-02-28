import {
  ContentTypeHeader,
  JSONResponseType,
  LocationHeader,
  XBlingContentTypeHeader,
  XBlingLocationHeader,
  XBlingOrigin,
  XBlingResponseTypeHeader,
  createFetcher,
  isRedirectResponse,
  mergeRequestInits,
  parseResponse,
  payloadRequestInit,
  resolveRequestHref,
} from './utils/utils'
import type {
  AnyServerFn,
  Deserializer,
  Fetcher,
  ServerFnCtx,
  CreateFetcherFn,
  ServerFnCtxOptions,
  ServerFnCtxWithRequest,
} from './types'

export * from './utils/utils'

const deserializers: Deserializer[] = []

export function addDeserializer(deserializer: Deserializer) {
  deserializers.push(deserializer)
}

export type ServerFetcherMethods = {
  createHandler(
    fn: AnyServerFn,
    pathame: string,
    opts: ServerFnCtxOptions
  ): Fetcher<any>
  registerHandler(pathname: string, handler: Fetcher<any>): void
}

export type ServerFn = CreateFetcherFn & ServerFetcherMethods

const serverImpl = (() => {
  throw new Error('Should be compiled away')
}) as any

const serverMethods: ServerFetcherMethods = {
  createHandler: (
    fn: AnyServerFn,
    pathname: string,
    defaultOpts?: ServerFnCtxOptions
  ): Fetcher<any> => {
    return createFetcher(pathname, async (payload: any, opts?: ServerFnCtx) => {
      const method = opts?.method || defaultOpts?.method || 'POST'

      console.log(`Executing server function: ${method}  ${pathname}`)
      if (payload) console.log(`  Fn Payload: ${payload}`)

      opts = opts ?? {}

      if (!opts.__hasRequest) {
        // This will happen if the server function is called directly during SSR
        // Even though we're not crossing the network, we still need to
        // create a Request object to pass to the server function as if it was

        let payloadInit = payloadRequestInit(payload, false)

        const resolvedHref = resolveRequestHref(pathname, method, payloadInit)
        opts.request = new Request(
          resolvedHref,
          mergeRequestInits(
            {
              method: 'POST',
              headers: {
                [XBlingOrigin]: 'server',
              },
            },
            payloadInit,
            defaultOpts?.request,
            opts?.request
          )
        )
      }

      try {
        // Do the same parsing of the result as we do on the client
        const response = await fn(payload, opts)

        if (!opts.__hasRequest) {
          // If we're on the server during SSR, we can skip to
          // parsing the response directly
          return parseResponse(response)
        }

        // Otherwise, the client-side code will parse the response properly
        return response
      } catch (e) {
        if (e instanceof Error && /[A-Za-z]+ is not defined/.test(e.message)) {
          const error = new Error(
            e.message +
              '\n' +
              ' You probably are using a variable defined in a closure in your server function. Make sure you pass any variables needed to the server function as arguments. These arguments must be serializable.'
          )
          error.stack = e.stack ?? ''
          throw error
        }
        throw e
      }
    })
  },
  registerHandler(pathname: string, handler: Fetcher<any>): any {
    console.log('Registering handler', pathname)
    handlers.set(pathname, handler)
  },
}

export const serverFn$: ServerFn = Object.assign(serverImpl, serverMethods)

export async function handleEvent(
  _ctx: Omit<ServerFnCtxWithRequest, '__hasRequest'>
) {
  if (!_ctx.request) {
    throw new Error('handleEvent must be called with a request.')
  }

  const ctx: ServerFnCtxWithRequest = { ..._ctx, __hasRequest: true }

  const url = new URL(ctx.request.url)

  if (hasHandler(url.pathname)) {
    try {
      let [pathname, payload] = await parseRequest(ctx)
      let handler = getHandler(pathname)
      if (!handler) {
        throw {
          status: 404,
          message: 'Handler Not Found for ' + pathname,
        }
      }
      const data = await handler(payload, { ...ctx, __hasRequest: true })
      return respondWith(ctx, data, 'return')
    } catch (error) {
      return respondWith(ctx, error as Error, 'throw')
    }
  }

  return null
}

async function parseRequest(event: ServerFnCtxWithRequest) {
  let request = event.request
  let contentType = request.headers.get(ContentTypeHeader)
  let pathname = new URL(request.url).pathname,
    payload

  // Get request have their payload in the query string
  if (request.method.toLowerCase() === 'get') {
    let url = new URL(request.url)
    let params = new URLSearchParams(url.search)
    const payloadSearchStr = params.get('payload')
    if (payloadSearchStr) {
      let payloadStr = decodeURIComponent(params.get('payload') ?? '')
      payload = JSON.parse(payloadStr)
    }
  } else if (contentType) {
    // Post requests have their payload in the body
    if (contentType === JSONResponseType) {
      let text = await request.text()
      try {
        payload = JSON.parse(text, (key: string, value: any) => {
          if (!value) {
            return value
          }

          let deserializer = deserializers.find((d) => d.apply(value))
          if (deserializer) {
            return deserializer.deserialize(value, event)
          }
          return value
        })
      } catch (e) {
        throw new Error(`Error parsing request body: ${text}`)
      }
    } else if (contentType.includes('form')) {
      let formData = await request.clone().formData()
      payload = formData
    }
  }

  return [pathname, payload]
}

function respondWith(
  ctx: ServerFnCtxWithRequest,
  data: Response | Error | string | object,
  responseType: 'throw' | 'return'
) {
  if (data instanceof Response) {
    if (
      isRedirectResponse(data) &&
      ctx.request.headers.get(XBlingOrigin) === 'client'
    ) {
      let headers = new Headers(data.headers)
      headers.set(XBlingOrigin, 'server')
      headers.set(XBlingLocationHeader, data.headers.get(LocationHeader)!)
      headers.set(XBlingResponseTypeHeader, responseType)
      headers.set(XBlingContentTypeHeader, 'response')
      return new Response(null, {
        status: 204,
        statusText: 'Redirected',
        headers: headers,
      })
    }

    if (data.status === 101) {
      // this is a websocket upgrade, so we don't want to modify the response
      return data
    }

    let headers = new Headers(data.headers)
    headers.set(XBlingOrigin, 'server')
    headers.set(XBlingResponseTypeHeader, responseType)
    if (!headers.has(XBlingContentTypeHeader)) {
      headers.set(XBlingContentTypeHeader, 'response')
    }

    return new Response(data.body, {
      status: data.status,
      statusText: data.statusText,
      headers,
    })
  }

  if (data instanceof Error) {
    console.error(data)
    return new Response(
      JSON.stringify({
        error: {
          stack: `This error happened inside a server function and you didn't handle it. So the client will receive an Internal Server Error. You can catch the error and throw a ServerError that makes sense for your UI. In production, the user will have no idea what the error is: \n\n${data.stack}`,
          status: (data as any).status,
        },
      }),
      {
        status: (data as any).status || 500,
        headers: {
          [XBlingResponseTypeHeader]: responseType,
          [XBlingContentTypeHeader]: 'error',
        },
      }
    )
  }

  if (
    typeof data === 'object' ||
    typeof data === 'string' ||
    typeof data === 'number' ||
    typeof data === 'boolean'
  ) {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        [ContentTypeHeader]: 'application/json',
        [XBlingResponseTypeHeader]: responseType,
        [XBlingContentTypeHeader]: 'json',
      },
    })
  }

  return new Response('null', {
    status: 200,
    headers: {
      [ContentTypeHeader]: 'application/json',
      [XBlingContentTypeHeader]: 'json',
      [XBlingResponseTypeHeader]: responseType,
    },
  })
}

const handlers = new Map<string, Fetcher<any>>()

export function getHandler(pathname: string) {
  return handlers.get(pathname)
}

export function hasHandler(pathname: string) {
  return handlers.has(pathname)
}

// used to fetch from an API route on the server or client, without falling into
// fetch problems on the server
// serverFn$.fetch = fetch
