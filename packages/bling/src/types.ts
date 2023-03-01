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
  opts?: ServerFnCtx
) => Fetcher<T>

export type FetcherFn<T extends AnyServerFn> = (
  payload: Parameters<T>['0'] extends undefined
    ? void | undefined
    : Parameters<T>['0'],
  opts?: ServerFnCtx
) => Promise<Awaited<ServerFnReturn<T>>>

export type FetcherMethods<T extends AnyServerFn> = {
  url: string
  fetch: (
    init: RequestInit,
    opts?: ServerFnCtxOptions
  ) => Promise<Awaited<ServerFnReturn<T>>>
}

export type Fetcher<T extends AnyServerFn> = FetcherFn<T> & FetcherMethods<T>

export interface JsonResponse<TData> extends Response {}

export type ServerFnCtxBase = {
  method?: 'GET' | 'POST'
}

export type ServerFnCtxOptions = ServerFnCtxBase & {
  request?: RequestInit
  __hasRequest?: never
}

export type ServerFnCtxWithRequest = ServerFnCtxBase & {
  request: Request
  __hasRequest: true
}

export type ServerFnCtx = ServerFnCtxOptions | ServerFnCtxWithRequest

export type NonFnProps<T> = {
  [TKey in keyof T]: TKey extends (...args: any[]) => any ? never : T[TKey]
}

export type AnySplitFn = (...args: any[]) => any

export type CreateSplitFn = <T extends AnySplitFn>(fn: T) => SplitFn<T>

export type SplitFn<T extends AnySplitFn> = (
  ...args: Parameters<T>
) => Promise<Awaited<ReturnType<T>>>
