import type { Todo } from '@prisma/client'
import { fetch$, server$, lazy$, import$, json } from '@tanstack/bling'
import React, { Fragment, lazy, Suspense } from 'react'
import {
  Link,
  Outlet,
  RouteObject,
  useFetcher,
  useFormAction,
  useLoaderData,
  useSubmit,
} from 'react-router-dom'
import '../app.css'
import { prisma } from './db.server$'
import { dehydrate, QueryClient } from '@tanstack/react-query'
function Scripts() {
  return import.meta.env.DEV ? (
    <>
      <script type="module" src="/@vite/client"></script>
      <script type="module" src="/src/app/entry-client.tsx"></script>
    </>
  ) : (
    <>{/* <script type="module" src={manifest['entry-client']}></script> */}</>
  )
}

// async function todoLoader(args, ctx) {
//   return await prisma.todo.findMany()
// }

// const updateTodoComplete = fetch$(({ id, complete }) => {
//   return prisma.todo.update({
//     where: { id },
//     data: {
//       complete,
//     },
//   })
// })

function Todomvc() {
  let todos = useLoaderData() as Todo[]
  let submit = useSubmit()
  return (
    <html lang="en" data-framework="es6">
      <head>
        <meta charSet="utf-8" />
        <title>Vanilla ES6 • TodoMVC</title>
      </head>
      <body>
        <section className="todoapp">
          <header className="header">
            <h1>todos</h1>
            <input
              className="new-todo"
              placeholder="What needs to be done?"
              autoFocus
            />
          </header>
          <section className="main">
            <ul className="todo-list">
              {todos.map((todo) => (
                <li key={todo.id}>
                  <div className="view">
                    <input
                      className="toggle"
                      type="checkbox"
                      checked={todo.complete}
                      onChange={(e) =>
                        submit(
                          {
                            intent: 'update',
                            complete: `${e.currentTarget.checked}`,
                            id: todo.id,
                          },
                          {
                            method: 'post',
                          },
                        )
                      }
                      // onChange={this.props.onToggle}
                    />
                    <label
                    // onDoubleClick={this.handleEdit}
                    >
                      {todo.title}
                    </label>
                    <button
                      className="destroy"
                      // onClick={this.props.onDestroy}
                    />
                  </div>
                  <input
                    // ref="editField"
                    className="edit"
                    // value={this.state.editText}
                    // onBlur={this.handleSubmit}
                    // onChange={this.handleChange}
                    // onKeyDown={this.handleKeyDown}
                  />
                </li>
              ))}
            </ul>
            <input id="toggle-all" className="toggle-all" type="checkbox" />
            <label htmlFor="toggle-all">Mark all as complete</label>
            <ul className="todo-list"></ul>
            <footer className="footer">
              <span className="todo-count"></span>
              <ul className="filters">
                <li>
                  <a href="#/" className="selected">
                    All
                  </a>
                </li>
                <li>
                  <a href="#/active">Active</a>
                </li>
                <li>
                  <a href="#/completed">Completed</a>
                </li>
              </ul>
              <button className="clear-completed">Clear completed</button>
            </footer>
          </section>
        </section>
        <footer className="info">
          <p>Double-click to edit a todo</p>
          <p>
            Written by <a href="http://twitter.com/lukeed05">Luke Edwards</a>
          </p>
          <p>
            Refactored by{' '}
            <a href="https://github.com/xorgy">Aaron Muir Hamilton</a>
          </p>
          <p>
            Part of <a href="http://todomvc.com">TodoMVC</a>
          </p>
        </footer>
        <Scripts />
      </body>
    </html>
  )
}

export let routes = [
  {
    path: '/',
    loader: async () => {
      const queryClient = new QueryClient()

      await queryClient.prefetchQuery(['posts'], async () => {
        let fetchTodos = fetch$(() => {
          return prisma.todo.findMany()
        })
        return await fetchTodos()
      })

      return json({ dehydratedState: dehydrate(queryClient) })
    },
    action: ({ request }) => {
      console.log(request)
      fetch$(async (args, ctx) => {
        let data = await ctx.request.json()
        console.log(data)
      })
    },
    element: <Todomvc />,
  },
] satisfies RouteObject[]
