export const FormError = Error
export const ServerError = Error

export type Serializer = {
  apply: (value: any) => boolean
  serialize: (value: any) => any
}

export type Deserializer = {
  apply: (value: any) => any
  deserialize: (value: any, ctx: ServerFnCtx) => any
}

export type AnyServerFn = (payload: any, ctx: ServerFnCtx) => any

export type ServerFnReturn<T extends AnyServerFn> = Awaited<
  ReturnType<T>
> extends JsonResponse<infer R>
  ? R
  : ReturnType<T>

export type CreateFetcherFn = <T extends AnyServerFn>(
  fn: T,
  opts?: ServerFnOpts
) => Fetcher<T>

export type FetcherFn<T extends AnyServerFn> = (
  payload: Parameters<T>['0'],
  opts?: ServerFnOpts
) => Promise<Awaited<ServerFnReturn<T>>>

export type FetcherMethods<T extends AnyServerFn> = {
  url: string
  fetch: (
    init: RequestInit,
    opts?: ServerFnOpts
  ) => Promise<Awaited<ServerFnReturn<T>>>
}

export type Fetcher<T extends AnyServerFn> = FetcherFn<T> & FetcherMethods<T>

export interface JsonResponse<TData> extends Response {}

export type ServerFnOpts = {
  method?: 'POST' | 'GET'
  request?: RequestInit
}

export type ServerFnCtx = {
  request: Request
}

export type NonFnProps<T> = {
  [TKey in keyof T]: TKey extends (...args: any[]) => any ? never : T[TKey]
}
