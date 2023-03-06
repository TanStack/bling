export const FormError = Error
export const ServerError = Error

export type Serializer = {
  apply: (value: any) => boolean
  serialize: (value: any) => any
}

export type Deserializer = {
  apply: (value: any) => any
  deserialize: (value: any, ctx: FetchFnCtx) => any
}

export type AnyFetchFn = (payload: any, ctx: FetchFnCtxWithRequest) => any

export type FetchFnReturn<T extends AnyFetchFn> = Awaited<
  ReturnType<T>
> extends JsonResponse<infer R>
  ? R
  : ReturnType<T>

export type CreateFetcherFn = <T extends AnyFetchFn>(
  fn: T,
  opts?: FetchFnCtxWithRequest,
) => Fetcher<T>

export type FetcherFn<T extends AnyFetchFn> = (
  payload: Parameters<T>['0'] extends undefined
    ? void | undefined
    : Parameters<T>['0'],
  opts?: FetchFnCtx,
) => Promise<Awaited<FetchFnReturn<T>>>

export type FetcherMethods<T extends AnyFetchFn> = {
  url: string
  fetch: (
    init: RequestInit,
    opts?: FetchFnCtxOptions,
  ) => Promise<Awaited<FetchFnReturn<T>>>
}

export type Fetcher<T extends AnyFetchFn> = FetcherFn<T> & FetcherMethods<T>

export interface JsonResponse<TData> extends Response {}

export type FetchFnCtxBase = {
  method?: 'GET' | 'POST'
}

export type FetchFnCtxOptions = FetchFnCtxBase & {
  request?: RequestInit
  __hasRequest?: never
}

export type FetchFnCtxWithRequest = FetchFnCtxBase & {
  request: Request
  __hasRequest: true
}

export type FetchFnCtx = FetchFnCtxOptions | FetchFnCtxWithRequest

export type NonFnProps<T> = {
  [TKey in keyof T]: TKey extends (...args: any[]) => any ? never : T[TKey]
}

export type AnySplitFn = (...args: any[]) => any
export type ModuleObj = any

export type CreateSplitFn = <T extends AnySplitFn>(fn: T) => SplitFn<T>

export type CreateLazyFn = <T extends AnySplitFn>(fn: T) => T

export type CreateImportFn = <T extends any>(fn: T) => Promise<T>

export type SplitFn<T extends AnySplitFn> = (
  ...args: Parameters<T>
) => Promise<Awaited<ReturnType<T>>>

export type CreateServerFn = <T>(value: T) => T
