import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { routes } from './root'
import { addSerializer } from '@tanstack/bling/client'
import { QueryClientProvider } from '@tanstack/react-query'

addSerializer({
  apply: (req) => req instanceof Request,
  serialize: (value) => '$request',
})

let router = createBrowserRouter(routes)

function Client() {
  return <RouterProvider router={router} />
}

ReactDOM.hydrateRoot(document, <Client />)
