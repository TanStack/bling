import { Router, useRoutes } from '@solidjs/router'
import { getNextElement, hydrate } from 'solid-js/web'
import { manifestContext } from './manifest'
import { manifest } from 'astro:ssr-manifest'
import { routes } from './root'
import { createComponent, getOwner } from 'solid-js'
import './root.css'

function lookupOwner(el: HTMLElement) {
  const parent = el.closest('solid-children')
  return parent && (parent as any).__$owner
}

async function mountIsland(el: HTMLElement) {
  let Component = el.dataset.island && window._$HY.islandMap[el.dataset.island]
  if (!Component || !el.dataset.hk) return
  // _$DEBUG(
  //   "hydrating island",
  //   el.dataset.island,
  //   el.dataset.hk.slice(0, el.dataset.hk.length - 1) + `1-`,
  //   el
  // );

  hydrate(
    () =>
      !Component || typeof Component === 'string'
        ? Component
        : createComponent(Component, {
            ...JSON.parse(el.dataset.props || 'undefined'),
            get children() {
              const el = getNextElement()
              ;(el as any).__$owner = getOwner()
              return
            },
          }),
    el,
    {
      renderId: el.dataset.hk.slice(0, el.dataset.hk.length - 1) + `1-`,
      owner: lookupOwner(el),
    },
  )

  delete el.dataset.hk
}

let queue: HTMLElement[] = []
let queued = false
function runTaskQueue(info: { timeRemaining(): number }) {
  while (info.timeRemaining() > 0 && queue.length) {
    mountIsland(queue.shift() as HTMLElement)
  }
  if (queue.length) {
    requestIdleCallback(runTaskQueue)
  } else queued = false
}
window._$HY.hydrateIslands = () => {
  const islands = document.querySelectorAll('solid-island[data-hk]')
  const assets = new Set<string>()
  islands.forEach((el: Element) =>
    assets.add((el as HTMLElement).dataset.component || ''),
  )
  Promise.all(
    [...assets].map((asset) => import(/* @vite-ignore */ asset)),
  ).then(() => {
    islands.forEach((el: Element) => {
      if (
        (el as HTMLElement).dataset.when === 'idle' &&
        'requestIdleCallback' in window
      ) {
        if (!queued) {
          queued = true
          requestIdleCallback(runTaskQueue)
        }
        queue.push(el as HTMLElement)
      } else mountIsland(el as HTMLElement)
    })
  })
}
window._$HY.fe = window._$HY.hydrateIslands

window._$HY.hydrateIslands()

// hydrate(() => {
//   const Routes = useRoutes(routes)
//   return (
//     <manifestContext.Provider value={manifest}>
//       <Router>
//         <Routes />
//       </Router>
//     </manifestContext.Provider>
//   )
// }, document)
