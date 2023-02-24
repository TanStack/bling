import {
  createFetcher,
  mergeRequestInits,
  parseResponse,
  payloadRequestInit,
  XBlingOrigin,
  XBlingResponseTypeHeader,
} from './utils/utils'

import type { AnyServerFn, Serializer, ServerFnOpts, ServerFn } from './types'

export { json } from './utils/utils'

//

let serializers: Serializer[] = []

export function addSerializer({ apply, serialize }: Serializer) {
  serializers.push({ apply, serialize })
}

export type ClientServerFnImpl = <T extends AnyServerFn>(
  fn: T,
  opts?: ServerFnOpts
) => ServerFn<T>

export type ClientServerFnMethods = {
  createFetcher(route: string, defualtOpts: ServerFnOpts): ServerFn<any>
}

export type ClientServerFn = ClientServerFnImpl & ClientServerFnMethods

const serverImpl = (() => {
  throw new Error('Should be compiled away')
}) as any

const serverMethods: ClientServerFnMethods = {
  createFetcher: (route: string, defaultOpts?: ServerFnOpts) => {
    return createFetcher(route, async (payload: any, opts?: ServerFnOpts) => {
      let payloadInit = payloadRequestInit(payload, serializers)

      const request = new Request(
        new URL(route, window.location.href).href,
        mergeRequestInits(
          {
            method: 'POST',
            headers: {
              [XBlingOrigin]: 'client',
            },
          },
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
    })
  },
  // // used to fetch from an API route on the server or client, without falling into
  // // fetch problems on the server
  // fetch: async function (route: string | URL, init: RequestInit) {
  //   if (route instanceof URL || route.startsWith('http')) {
  //     return await fetch(route, init)
  //   }
  //   const request = new Request(new URL(route, window.location.href).href, init)
  //   return await fetch(request)
  // },
}

export const server$: ClientServerFn = Object.assign(serverImpl, serverMethods)
