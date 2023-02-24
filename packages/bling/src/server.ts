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
  mergeServerOpts,
  parseResponse,
  payloadRequestInit,
} from './utils/utils'
import type {
  AnyServerFn,
  Deserializer,
  ServerFnOpts,
  ServerFn,
  ServerFnCtx,
  NonFnProps,
} from './types'

export { json } from './utils/utils'

const deserializers: Deserializer[] = []

export function addDeserializer(deserializer: Deserializer) {
  deserializers.push(deserializer)
}

type ServerServerFnMethods = {
  createHandler(
    fn: AnyServerFn,
    route: string,
    opts: ServerFnOpts
  ): ServerFn<any>
}

type ServerServerFnImpl = <T extends AnyServerFn>(
  fn: T,
  opts?: ServerFnOpts
) => ServerFn<T>

export type ServerServerFn = ServerServerFnImpl & ServerServerFnMethods

const serverImpl = (() => {
  throw new Error('Should be compiled away')
}) as any

const serverMethods: ServerServerFnMethods = {
  createHandler: (
    fn: AnyServerFn,
    route: string,
    defaultOpts?: ServerFnOpts
  ): ServerFn<any> => {
    return createFetcher(route, async (payload: any, opts?: ServerFnOpts) => {
      console.log(`Executing server function: ${route}`)
      if (payload) console.log(`  Fn Payload: ${payload}`)

      let payloadInit = payloadRequestInit(payload, false)

      // Even though we're not crossing the network, we still need to
      // create a Request object to pass to the server function
      const request = new Request(
        route,
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

      try {
        // Do the same parsing of the result as we do on the client
        return parseResponse(
          await fn(payload, {
            request: request,
          })
        )
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
  // used to fetch from an API route on the server or client, without falling into
  // fetch problems on the server
  // fetch: async function (route: string | URL, init: RequestInit) {
  //   if (route instanceof URL || route.startsWith('http')) {
  //     return await fetch(route, init)
  //   }
  //   const request = new Request(new URL(route, window.location.href).href, init)
  //   return await fetch(request)
  // },
}

export const server$: ServerServerFn = Object.assign(serverImpl, serverMethods)

async function parseRequest(event: ServerFnCtx) {
  let request = event.request
  let contentType = request.headers.get(ContentTypeHeader)
  let name = new URL(request.url).pathname,
    args = []

  if (contentType) {
    if (contentType === JSONResponseType) {
      let text = await request.text()
      try {
        args = JSON.parse(text, (key: string, value: any) => {
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
      args = [formData, event]
    }
  }
  return [name, args]
}

function respondWith(
  { request }: ServerFnCtx,
  data: Response | Error | string | object,
  responseType: 'throw' | 'return'
) {
  if (data instanceof Response) {
    if (
      isRedirectResponse(data) &&
      request.headers.get(XBlingOrigin) === 'client'
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
    headers.set(XBlingContentTypeHeader, 'response')

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

export async function handleEvent(event: ServerFnCtx) {
  const url = new URL(event.request.url)

  if (hasHandler(url.pathname)) {
    try {
      let [name, args] = await parseRequest(event)
      let handler = getHandler(name)
      if (!handler) {
        throw {
          status: 404,
          message: 'Handler Not Found for ' + name,
        }
      }
      const data = await handler.call(
        event,
        ...(Array.isArray(args) ? args : [args])
      )
      return respondWith(event, data, 'return')
    } catch (error) {
      return respondWith(event, error as Error, 'throw')
    }
  }

  return null
}

const handlers = new Map()

export function registerHandler(route: string, handler: any): any {
  console.log('Registering handler', route)
  handlers.set(route, handler)
}

export function getHandler(route: string) {
  return handlers.get(route)
}

export function hasHandler(route: string) {
  return handlers.has(route)
}

// used to fetch from an API route on the server or client, without falling into
// fetch problems on the server
// server$.fetch = fetch
