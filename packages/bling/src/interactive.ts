// @ts-nocheck
import { isServer, ssrAttribute as _$ssrAttribute } from 'solid-js/web'
import { mergeProps as _$mergeProps } from 'solid-js/web'
import { ssr as _$ssr } from 'solid-js/web'
import { escape as _$escape } from 'solid-js/web'
import { createComponent as _$createComponent } from 'solid-js/web'
import { ssrHydrationKey as _$ssrHydrationKey } from 'solid-js/web'
const _tmpl$ = ['<solid-children', '>', '</solid-children>'],
  _tmpl$2 = ['<solid-island', ' data-island="', '"', '>', '</solid-island>']
import {
  Component,
  ComponentProps,
  lazy,
  splitProps,
  useContext,
} from 'solid-js'
import { Hydration, NoHydration } from 'solid-js/web'
export function island(Comp: any, path: any): any {
  let Component = Comp
  function IslandComponent(props) {
    return _$createComponent(
      Component,
      _$mergeProps(props, {
        get children() {
          return _$ssr(
            _tmpl$,
            _$ssrHydrationKey(),
            _$escape(
              _$createComponent(NoHydration, {
                get children() {
                  return props.children
                },
              }),
            ),
          )
        },
      }),
    )
  }
  return (compProps) => {
    if (isServer) {
      const [, props] = splitProps(compProps, ['children'])
      let fpath

      fpath = `/` + path
      return _$createComponent(Hydration, {
        get children() {
          return _$ssr(
            _tmpl$2,
            _$ssrHydrationKey() +
              _$ssrAttribute(
                'data-props',
                _$escape(JSON.stringify(props), true),
                false,
              ) +
              _$ssrAttribute('data-component', _$escape(fpath, true), false),
            `/` + _$escape(path, true),
            _$ssrAttribute(
              'data-when',
              props['client:idle'] ? 'idle' : 'load',
              false,
            ),
            _$escape(_$createComponent(IslandComponent, compProps)),
          )
        },
      })
    } else {
      return _$createComponent(IslandComponent, {})
    }
  }
}
