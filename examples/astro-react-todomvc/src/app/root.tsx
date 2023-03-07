import type { Todo } from '@prisma/client'
import { fetch$, json } from '@tanstack/bling'
import { useContext, useRef } from 'react'
import {
  ActionFunctionArgs,
  Form,
  NavLink,
  RouteObject,
  useLoaderData,
  useSubmit,
} from 'react-router-dom'
import '../app.css'
import { prisma } from './db.server$'
import invariant from 'tiny-invariant'
import { manifestContext } from './manifest'

function validateNewTodoTitle(title: string) {
  return title ? null : 'Todo title required'
}

const generalActions = {
  async createTodo({ formData, intent }) {
    const title = formData.get('title')
    invariant(typeof title === 'string', 'title must be a string')
    if (title.includes('error')) {
      return json(
        {
          type: 'error',
          intent,
          title,
          error: `Todos cannot include the word "error"`,
        },
        { status: 400 },
      )
    }

    const titleError = validateNewTodoTitle(title)
    if (titleError) {
      return json({ type: 'error', intent, error: titleError }, { status: 400 })
    }
    await prisma.todo.create({
      data: {
        complete: false,
        title: String(title),
      },
    })
    return json({ type: 'success', intent })
  },
  async toggleAllTodos({ formData, intent }) {
    await prisma.todo.updateMany({
      data: { complete: formData.get('complete') === 'true' },
    })
    return json({ type: 'success', intent })
  },
  async deleteCompletedTodos({ intent }) {
    await prisma.todo.deleteMany({ where: { complete: true } })
    return json({ type: 'success', intent })
  },
} satisfies Record<
  string,
  (args: {
    formData: FormData
    intent: string
  }) => Promise<
    ReturnType<
      typeof json<
        | { type: 'success'; intent: string }
        | { type: 'error'; intent: string; error: string }
      >
    >
  >
>

const todoActions = {
  async toggleTodo({ todoId, formData, intent }) {
    await prisma.todo.update({
      where: { id: todoId },
      data: { complete: formData.get('complete') === 'true' },
    })
    return json({ type: 'success', intent })
  },
  async updateTodo({ formData, todoId, intent }) {
    const title = formData.get('title')
    invariant(typeof title === 'string', 'title must be a string')
    if (title.includes('error')) {
      return json(
        {
          type: 'error',
          intent,
          error: `Todos cannot include the word "error"`,
        },
        { status: 400 },
      )
    }
    const titleError = validateNewTodoTitle(title)
    if (titleError) {
      return json({ type: 'error', intent, error: titleError }, { status: 400 })
    }

    await prisma.todo.update({
      where: { id: todoId },
      data: { title },
    })
    return json({ type: 'success', intent })
  },
  async deleteTodo({ todoId, intent }) {
    await prisma.todo.delete({ where: { id: todoId } })
    return json({ type: 'success', intent })
  },
} satisfies Record<
  string,
  (args: {
    formData: FormData
    todoId: string
    intent: string
  }) => Promise<
    ReturnType<
      typeof json<
        | { type: 'success'; intent: string }
        | { type: 'error'; error: string; intent: string }
      >
    >
  >
>

function hasKey<Obj extends Record<string, unknown>>(
  obj: Obj,
  key: any,
): key is keyof Obj {
  return obj.hasOwnProperty(key)
}

function Scripts() {
  const manifest = useContext(manifestContext)
  return import.meta.env.DEV ? (
    <>
      <script type="module" src="/@vite/client"></script>
      <script type="module" src="/src/app/entry-client.tsx"></script>
    </>
  ) : (
    <script type="module" src={manifest['entry-client']}></script>
  )
}

function Todomvc() {
  let todos = useLoaderData() as Todo[]
  console.log({ todos })
  let submit = useSubmit()
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <html lang="en" data-framework="es6">
      <head>
        <meta charSet="utf-8" />
        <title>Astro Bling • TodoMVC</title>
      </head>
      <body>
        <section className="todoapp">
          <header className="header">
            <h1>todos</h1>
            <Form
              action="/"
              method="post"
              onSubmit={(e) => {
                if (!inputRef.current!.value.trim()) e.preventDefault()
                setTimeout(() => (inputRef.current!.value = ''))
              }}
            >
              <input type="hidden" name="intent" value="createTodo" />
              <input
                ref={inputRef}
                name="title"
                className="new-todo"
                placeholder="What needs to be done?"
                autoFocus
              />
            </Form>
          </header>
          <section className="main">
            <input id="toggle-all" className="toggle-all" type="checkbox" />
            <label htmlFor="toggle-all">Mark all as complete</label>
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
                            intent: 'toggleTodo',
                            complete: `${e.currentTarget.checked}`,
                            todoId: todo.id,
                          },
                          {
                            method: 'post',
                          },
                        )
                      }
                    />
                    <label
                    // onDoubleClick={this.handleEdit}
                    >
                      {todo.title}
                    </label>
                    <Form method="post" action="/">
                      <input type="hidden" name="todoId" value={todo.id} />
                      <button
                        type="submit"
                        name="intent"
                        value="deleteTodo"
                        className="destroy"
                      />
                    </Form>
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
            <footer className="footer">
              <span className="todo-count"></span>
              <ul className="filters">
                <li>
                  <NavLink
                    to="/"
                    className={({ isActive }) => (isActive ? 'selected' : '')}
                  >
                    All
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/active"
                    className={({ isActive }) => (isActive ? 'selected' : '')}
                  >
                    Active
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/completed"
                    className={({ isActive }) => (isActive ? 'selected' : '')}
                  >
                    Completed
                  </NavLink>
                </li>
              </ul>
              <Form method="post">
                <button
                  className="clear-completed"
                  name="intent"
                  value="deleteCompletedTodos"
                >
                  Clear completed
                </button>
              </Form>
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

async function action({ request, params, context }: ActionFunctionArgs) {
  // debugger
  let entry = await request.formData()

  return await fetch$(async (formData, ctx) => {
    const intent = formData.get('intent')

    if (hasKey(generalActions, intent)) {
      return generalActions[intent]({ formData, intent })
    } else if (hasKey(todoActions, intent)) {
      const todoId = formData.get('todoId')
      invariant(typeof todoId === 'string', 'todoId must be a string')
      // make sure the todo belongs to the user
      const todo = await prisma.todo.findFirst({ where: { id: todoId } })

      if (!todo) {
        throw json({ error: 'todo not found' }, { status: 404 })
      }
      return todoActions[intent]({ formData, intent, todoId })
    } else {
      throw json({ error: `Unknown intent: ${intent}` }, { status: 400 })
    }
  })(entry)
}

export let routes = [
  {
    path: '/',
    loader: fetch$(async (args) => {
      return await prisma.todo.findMany()
    }),
    action,
    element: <Todomvc />,
  },
  {
    path: '/active',
    loader: fetch$(async (args) => {
      return await prisma.todo.findMany({
        where: {
          complete: false,
        },
      })
    }),
    action,
    element: <Todomvc />,
  },
  {
    path: '/completed',
    loader: fetch$(async (args) => {
      return await prisma.todo.findMany({
        where: {
          complete: true,
        },
      })
    }),
    action,
    element: <Todomvc />,
  },
] satisfies RouteObject[]
