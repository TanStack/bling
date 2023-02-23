import {
  ContentTypeHeader,
  JSONResponseType,
  mergeHeaders,
  parseResponse,
  XBlingContentTypeHeader,
  XBlingOrigin,
  XBlingResponseTypeHeader,
} from './utils/responses'

import type {
  Deserializer,
  FetchEvent,
  Serializer,
  ServerFunction,
} from './types'

export { json } from './utils/responses'

export type CreateClientServerFunction = (<
  E extends any[],
  T extends (...args: [...E]) => any
>(
  fn: T
) => ServerFunction<E, T>) & {
  addSerializer(serializer: Serializer): void
  createFetcher(
    route: string,
    serverResource: boolean
  ): ServerFunction<any, any>
  fetch(route: string, init?: RequestInit): Promise<Response>
  createRequestInit: (path: string, args: any[], meta: any) => RequestInit
  addDeserializer(deserializer: Deserializer): void
} & FetchEvent

export const server$: CreateClientServerFunction = ((_fn: any) => {
  throw new Error('Should be compiled away')
}) as unknown as CreateClientServerFunction

let serializers: Serializer[] = []

server$.addSerializer = ({ apply, serialize }: Serializer) => {
  serializers.push({ apply, serialize })
}

server$.createRequestInit = function (route, args: any[], meta): RequestInit {
  let body,
    headers: Record<string, string> = {
      [XBlingOrigin]: 'client',
    }

  if (args[0] instanceof FormData) {
    body = args[0]
  } else {
    body = JSON.stringify(args, (key, value) => {
      let serializer = serializers.find(({ apply }) => apply(value))
      if (serializer) {
        return serializer.serialize(value)
      }
      return value
    })
    headers[ContentTypeHeader] = JSONResponseType
  }

  return {
    method: 'POST',
    body: body,
    headers: new Headers({
      ...headers,
    }),
  }
}

type ServerCall = (route: string, init: RequestInit) => Promise<Response>

server$.createFetcher = (route, meta) => {
  let fetcher: any = (...args: any[]) => {
    const requestInit = server$.createRequestInit(route, args, meta)
    // request body: json, formData, or string
    return (server$.call as ServerCall)(route, requestInit)
  }

  fetcher.url = route

  fetcher.fetch = (init: RequestInit) =>
    (server$.call as ServerCall)(route, init)

  fetcher.withRequest =
    (partialInit: Partial<RequestInit>) =>
    (...args: any) => {
      let requestInit = server$.createRequestInit(route, args, meta)
      // request body: json, formData, or string
      return (server$.call as ServerCall)(route, {
        ...requestInit,
        ...partialInit,
        headers: mergeHeaders(requestInit.headers, partialInit.headers),
      })
    }

  return fetcher as ServerFunction<any, any>
}

server$.call = async function (route: string, init: RequestInit) {
  const request = new Request(new URL(route, window.location.href).href, init)

  const response = await fetch(request)

  // // throws response, error, form error, json object, string
  if (response.headers.get(XBlingResponseTypeHeader) === 'throw') {
    throw await parseResponse(response)
  } else {
    return await parseResponse(response)
  }
} as any

// used to fetch from an API route on the server or client, without falling into
// fetch problems on the server
server$.fetch = async function (route: string | URL, init: RequestInit) {
  if (route instanceof URL || route.startsWith('http')) {
    return await fetch(route, init)
  }
  const request = new Request(new URL(route, window.location.href).href, init)
  return await fetch(request)
}
