import { Router, useRoutes } from '@solidjs/router'
import { hydrate } from 'solid-js/web'
import { manifestContext } from './manifest'
import { manifest } from 'astro:ssr-manifest'
import { routes } from './root'
import mountRouter from './router'

async function mount() {
  mountRouter()
}

mount()

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
