import { Router, useRoutes } from '@solidjs/router'
import { hydrate } from 'solid-js/web'
import { manifestContext } from './manifest'
// @ts-ignore
import { manifest } from 'astro:ssr-manifest'
import { routes } from './root'

hydrate(() => {
  const Routes = useRoutes(routes)
  return (
    <manifestContext.Provider value={manifest}>
      <Router>
        <Routes />
      </Router>
    </manifestContext.Provider>
  )
}, document)
