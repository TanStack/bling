import { hydrate } from 'solid-js/web'
import { manifestContext } from './manifest'
import { App } from './root'

hydrate(
  () => (
    <manifestContext.Provider value={{}}>
      <App />
    </manifestContext.Provider>
  ),
  document,
)
