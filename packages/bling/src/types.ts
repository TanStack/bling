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

export type ServerFnImpl<T extends AnyServerFn> = (
  payload: Parameters<T>['0'],
  opts?: ServerFnOpts
) => Promise<Awaited<ServerFnReturn<T>>>

export type ServerFnMethods<T extends AnyServerFn> = {
  url: string
  query: (
    payload: Parameters<T>['0'],
    opts: ServerFnOpts
  ) => Promise<Awaited<ServerFnReturn<T>>>
  mutate: (
    payload: Parameters<T>['0'],
    opts: ServerFnOpts
  ) => Promise<Awaited<ServerFnReturn<T>>>
  fetch: (
    init: RequestInit,
    opts: ServerFnOpts
  ) => Promise<Awaited<ServerFnReturn<T>>>
}

export type ServerFn<T extends AnyServerFn> = ServerFnImpl<T> &
  ServerFnMethods<T>

export interface JsonResponse<TData> extends Response {}

export type ServerFnOpts = {
  request?: RequestInit
}

export type ServerFnCtx = {
  request: Request
}

export type NonFnProps<T> = {
  [TKey in keyof T]: TKey extends (...args: any[]) => any ? never : T[TKey]
}
