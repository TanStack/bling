import {
  createFetcher,
  mergeRequestInits,
  parseResponse,
  payloadRequestInit,
  XBlingOrigin,
  XBlingResponseTypeHeader,
} from './utils/utils'

import type {
  AnyServerFn,
  Serializer,
  ServerFnOpts,
  Fetcher,
  CreateFetcherFn,
} from './types'

export * from './utils/utils'

//

let serializers: Serializer[] = []

export function addSerializer({ apply, serialize }: Serializer) {
  serializers.push({ apply, serialize })
}

export type ClientFetcherMethods = {
  createFetcher(route: string, defualtOpts: ServerFnOpts): Fetcher<any>
}

export type ClientServerFn = CreateFetcherFn & ClientFetcherMethods

const serverImpl = (() => {
  throw new Error('Should be compiled away')
}) as any

const serverMethods: ClientFetcherMethods = {
  createFetcher: (pathname: string, defaultOpts?: ServerFnOpts) => {
    return createFetcher(
      pathname,
      async (payload: any, opts?: ServerFnOpts) => {
        const method = opts?.method || defaultOpts?.method || 'POST'
        const baseInit: RequestInit = {
          method,
          headers: {
            [XBlingOrigin]: 'client',
          },
        }

        let payloadInit = payloadRequestInit(payload, serializers)

        const resolvedRoute =
          method === 'GET'
            ? payloadInit.body === 'string'
              ? `${pathname}?payload=${encodeURIComponent(payloadInit.body)}`
              : pathname
            : pathname

        const request = new Request(
          new URL(resolvedRoute, window.location.href).href,
          mergeRequestInits(
            baseInit,
            payloadInit,
            defaultOpts?.request,
            opts?.request
          )
        )

        const response = await fetch(request)

        // // throws response, error, form error, json object, string
        if (response.headers.get(XBlingResponseTypeHeader) === 'throw') {
          throw await parseResponse(response)
        } else {
          return await parseResponse(response)
        }
      }
    )
  },
}

export const server$: ClientServerFn = Object.assign(serverImpl, serverMethods)
