import {
  mergeRequestInits,
  mergeServerOpts,
  parseResponse,
  payloadRequestInit,
  resolveRequestHref,
  XBlingOrigin,
  XBlingResponseTypeHeader,
} from './utils/utils'

import type {
  AnyServerFn,
  Serializer,
  FetcherFn,
  FetcherMethods,
  ServerFnReturn,
  ServerFnCtxOptions,
  ServerFnCtx,
} from './types'

export * from './utils/utils'

//

let serializers: Serializer[] = []

export function addSerializer({ apply, serialize }: Serializer) {
  serializers.push({ apply, serialize })
}

export type CreateClientFetcherFn = <T extends AnyServerFn>(
  fn: T,
  opts?: ServerFnCtxOptions
) => ClientFetcher<T>

export type CreateClientFetcherMethods = {
  createFetcher(
    route: string,
    defualtOpts: ServerFnCtxOptions
  ): ClientFetcher<any>
}

export type ClientFetcher<T extends AnyServerFn> = FetcherFn<T> &
  FetcherMethods<T>

export type ClientFetcherMethods<T extends AnyServerFn> = FetcherMethods<T> & {
  fetch: (
    init: RequestInit,
    opts?: ServerFnCtxOptions
  ) => Promise<Awaited<ServerFnReturn<T>>>
}

export type ClientServerFn = CreateClientFetcherFn & CreateClientFetcherMethods

const serverImpl = (() => {
  throw new Error('Should be compiled away')
}) as any

const serverMethods: CreateClientFetcherMethods = {
  createFetcher: (pathname: string, defaultOpts?: ServerFnCtxOptions) => {
    const fetcherImpl = async (payload: any, opts?: ServerFnCtxOptions) => {
      const method = opts?.method || defaultOpts?.method || 'POST'

      const baseInit: RequestInit = {
        method,
        headers: {
          [XBlingOrigin]: 'client',
        },
      }

      let payloadInit = payloadRequestInit(payload, serializers)

      const resolvedHref = resolveRequestHref(pathname, method, payloadInit)

      const request = new Request(
        resolvedHref,
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

    const fetcherMethods: ClientFetcherMethods<any> = {
      url: pathname,
      fetch: (request: RequestInit, opts?: ServerFnCtxOptions) => {
        return fetcherImpl(undefined, mergeServerOpts({ request }, opts))
      },
    }

    return Object.assign(fetcherImpl, fetcherMethods) as ClientFetcher<any>
  },
}

export const serverFn$: ClientServerFn = Object.assign(
  serverImpl,
  serverMethods
)
