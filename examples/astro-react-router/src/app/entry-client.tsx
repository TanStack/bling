import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { routes } from './root'
import { addSerializer } from '@tanstack/bling/client'

addSerializer({
  apply: (req) => req instanceof Request,
  serialize: (value) => '$request',
})

let router = createBrowserRouter(routes)

ReactDOM.hydrateRoot(document, <RouterProvider router={router} />)
