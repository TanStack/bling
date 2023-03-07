import {
  AnyFetchFn,
  JsonResponse,
  Serializer,
  Fetcher,
  FetcherFn,
  FetcherMethods,
  FetchFnCtx,
  FetchFnCtxOptions,
  FetchFnCtxWithRequest,
} from '../types'

export const XBlingStatusCodeHeader = 'x-bling-status-code'
export const XBlingLocationHeader = 'x-bling-location'
export const LocationHeader = 'Location'
export const ContentTypeHeader = 'content-type'
export const XBlingResponseTypeHeader = 'x-bling-response-type'
export const XBlingContentTypeHeader = 'x-bling-content-type'
export const XBlingOrigin = 'x-bling-origin'
export const JSONResponseType = 'application/json'

/**
 * A JSON response. Converts `data` to JSON and sets the `Content-Type` header.
 */
export function json<TData>(
  data: TData,
  init: number | ResponseInit = {},
): JsonResponse<TData> {
  let responseInit: any = init
  if (typeof init === 'number') {
    responseInit = { status: init }
  }

  let headers = new Headers(responseInit.headers)

  if (!headers.has(ContentTypeHeader)) {
    headers.set(ContentTypeHeader, 'application/json; charset=utf-8')
  }

  headers.set(XBlingContentTypeHeader, 'json')

  const response = new Response(JSON.stringify(data), {
    ...responseInit,
    headers,
  })

  return response
}

/**
 * A redirect response. Sets the status code and the `Location` header.
 * Defaults to "302 Found".
 */
export function redirect(
  url: string,
  init: number | ResponseInit = 302,
): Response {
  let responseInit = init
  if (typeof responseInit === 'number') {
    responseInit = { status: responseInit }
  } else if (typeof responseInit.status === 'undefined') {
    responseInit.status = 302
  }

  if (url === '') {
    url = '/'
  }

  if (process.env.NODE_ENV === 'development') {
    if (url.startsWith('.')) {
      throw new Error('Relative URLs are not allowed in redirect')
    }
  }

  let headers = new Headers(responseInit.headers)
  headers.set(LocationHeader, url)

  const response = new Response(null, {
    ...responseInit,
    headers: headers,
  })

  return response
}

export function eventStream(
  request: Request,
  init: (send: (event: string, data: any) => void) => () => void,
) {
  let stream = new ReadableStream({
    start(controller) {
      let encoder = new TextEncoder()
      let send = (event: string, data: any) => {
        controller.enqueue(encoder.encode('event: ' + event + '\n'))
        controller.enqueue(encoder.encode('data: ' + data + '\n' + '\n'))
      }
      let cleanup = init(send)
      let closed = false
      let close = () => {
        if (closed) return
        cleanup()
        closed = true
        request.signal.removeEventListener('abort', close)
        controller.close()
      }
      request.signal.addEventListener('abort', close)
      if (request.signal.aborted) {
        close()
        return
      }
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

export function isResponse(value: any): value is Response {
  return (
    value != null &&
    typeof value.status === 'number' &&
    typeof value.statusText === 'string' &&
    typeof value.headers === 'object' &&
    typeof value.body !== 'undefined'
  )
}

const redirectStatusCodes = new Set([204, 301, 302, 303, 307, 308])

export function isRedirectResponse(
  response: Response | any,
): response is Response {
  return (
    response &&
    response instanceof Response &&
    redirectStatusCodes.has(response.status)
  )
}

export function mergeHeaders(...objs: (Headers | HeadersInit | undefined)[]) {
  const allHeaders: any = {}

  for (const header of objs) {
    if (!header) continue
    const headers: Headers = new Headers(header)

    for (const [key, value] of (headers as any).entries()) {
      if (value === undefined || value === 'undefined') {
        delete allHeaders[key]
      } else {
        allHeaders[key] = value
      }
    }
  }

  return new Headers(allHeaders)
}

export function mergeRequestInits(...objs: (RequestInit | undefined)[]) {
  return Object.assign({}, ...objs, {
    headers: mergeHeaders(...objs.map((o) => o && o.headers)),
  })
}

export async function parseResponse(response: Response) {
  if (response instanceof Response) {
    const contentType =
      response.headers.get(XBlingContentTypeHeader) ||
      response.headers.get(ContentTypeHeader) ||
      ''

    if (contentType.includes('json')) {
      return await response.json()
    } else if (contentType.includes('text')) {
      return await response.text()
    } else if (contentType.includes('error')) {
      const data = await response.json()
      const error = new Error(data.error.message)
      if (data.error.stack) {
        error.stack = data.error.stack
      }
      return error
    } else if (contentType.includes('response')) {
      if (response.status === 204 && response.headers.get(LocationHeader)) {
        return redirect(response.headers.get(LocationHeader)!)
      }
      return response
    } else {
      if (response.status === 200) {
        const text = await response.text()
        try {
          return JSON.parse(text)
        } catch {}
      }
      if (response.status === 204 && response.headers.get(LocationHeader)) {
        return redirect(response.headers.get(LocationHeader)!)
      }
      return response
    }
  }

  return response
}

export function mergeFetchOpts(
  ...objs: (FetchFnCtxOptions | undefined)[]
): FetchFnCtxWithRequest {
  return Object.assign({}, [
    ...objs,
    {
      request: mergeRequestInits(...objs.map((o) => o && o.request)),
    },
  ]) as any
}

export function payloadRequestInit(
  payload: any,
  serializers: false | Serializer[],
) {
  let req: RequestInit = {}

  if (payload instanceof FormData) {
    req.body = payload
  } else {
    req.body = JSON.stringify(
      payload,
      serializers
        ? (key, value) => {
            let serializer = serializers.find(({ apply }) => apply(value))
            if (serializer) {
              return serializer.serialize(value)
            }
            return value
          }
        : undefined,
    )

    req.headers = {
      [ContentTypeHeader]: JSONResponseType,
    }
  }

  return req
}

export function createFetcher<T extends AnyFetchFn>(
  route: string,
  fetcherImpl: FetcherFn<T>,
): Fetcher<T> {
  const fetcherMethods: FetcherMethods<T> = {
    url: route,
    fetch: (request: RequestInit, ctx?: FetchFnCtxOptions) => {
      return fetcherImpl({} as any, mergeFetchOpts({ request }, ctx))
    },
  }

  return Object.assign(fetcherImpl, fetcherMethods) as Fetcher<T>
}

export function resolveRequestHref(
  pathname: string,
  method: 'GET' | 'POST',
  payloadInit: RequestInit,
) {
  const resolved =
    method.toLowerCase() === 'get'
      ? `${pathname}?payload=${encodeURIComponent(payloadInit.body as string)}`
      : pathname

  return new URL(
    resolved,
    typeof document !== 'undefined' ? window.location.href : `http://localhost`,
  ).href
}
