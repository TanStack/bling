export const FormError = Error
export const ServerError = Error

export interface FetchEvent {
  request: Request
  env: any
  locals: Record<string, unknown>
}

export type Serializer = {
  apply: (value: any) => boolean
  serialize: (value: any) => any
}

export type Deserializer = {
  apply: (value: any) => any
  deserialize: (value: any, ctx: ServerFunctionEvent) => any
}

export interface ServerFunctionEvent extends FetchEvent {
  // fetch(url: string, init: RequestInit): Promise<Response>
  // $type: typeof FETCH_EVENT
}

export type ServerFunction<
  E extends any[],
  T extends (...args: [...E]) => any,
  TReturn = Awaited<ReturnType<T>> extends JsonResponse<infer R>
    ? R
    : ReturnType<T>
> = ((...p: Parameters<T>) => Promise<Awaited<TReturn>>) & {
  url: string
  fetch: (init: RequestInit) => Promise<Awaited<TReturn>>
  withRequest: (
    init: Partial<RequestInit>
  ) => (...p: Parameters<T>) => Promise<Awaited<TReturn>>
}

export interface JsonResponse<TData> extends Response {}
