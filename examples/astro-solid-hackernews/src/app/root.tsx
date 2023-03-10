import { server$, import$, secret$, redirect } from '@tanstack/bling'
import {
  createSignal,
  ErrorBoundary,
  lazy,
  Show,
  Suspense,
  useContext,
} from 'solid-js'
import { HydrationScript, NoHydration } from 'solid-js/web'
import { manifestContext } from './manifest'
import {
  A,
  Link,
  Outlet,
  RouteDataFuncArgs,
  RouteDefinition,
  useRouteData,
} from '@solidjs/router'
import Nav from './components/nav'
import './root.css'
import { Component, createResource, For } from 'solid-js'
import type { IStory } from './types'
import fetchAPI from './lib/api'
import Story from './components/story'
import Comment from './components/comment'
const sayHello = server$(() => console.log('Hello world'))

const LazyHello3 = lazy(() =>
  import$({
    default: () => {
      return (
        <>
          <button onClick={() => sayHello()}>Split up</button>
        </>
      )
    },
  }),
)

const inlineSecret = secret$('I am an inline server secret!')

function App() {
  console.log(
    'Do you know the inline server secret?',
    inlineSecret ?? 'Not even.',
  )

  return (
    <html>
      <head>
        <title>SolidStart - Hacker News</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Hacker News Clone built with Solid" />
      </head>
      <body>
        <Nav />
        <Suspense fallback={<div class="news-list-nav">Loading...</div>}>
          <Outlet />
        </Suspense>
        <Scripts />
      </body>
    </html>
  )
}

function Scripts() {
  const manifest = useContext(manifestContext)
  return (
    <NoHydration>
      <HydrationScript />
      <script $ServerOnly>{`
        window._$HY.islandMap = {}
        window._$HY.island = (p, c) => window._$HY.islandMap[p] = c
      `}</script>
      {import.meta.env.DEV ? (
        <>
          <script type="module" src="/@vite/client" $ServerOnly></script>
          <script
            type="module"
            src="/src/app/entry-client.tsx"
            $ServerOnly
          ></script>
        </>
      ) : (
        <>
          <script
            type="module"
            src={manifest['entry-client']}
            $ServerOnly
          ></script>
        </>
      )}
    </NoHydration>
  )
}

const mapStories = {
  top: 'news',
  new: 'newest',
  show: 'show',
  ask: 'ask',
  job: 'jobs',
} as const

const storiesRouteData = ({ location, params }: RouteDataFuncArgs) => {
  const page = () => +location.query.page || 1
  const type = () => (params.stories || 'top') as keyof typeof mapStories

  const [stories] = createResource<IStory[], string>(
    () => `${mapStories[type()]}?page=${page()}`,
    fetchAPI,
  )

  return { type, stories, page }
}

const StoriesRoute: Component = () => {
  const { page, type, stories } = useRouteData<typeof storiesRouteData>()
  return (
    <div class="news-view">
      <div class="news-list-nav">
        <Show
          when={page() > 1}
          fallback={
            <span class="page-link disabled" aria-disabled="true">
              {'<'} prev
            </span>
          }
        >
          <A
            class="page-link"
            href={`/${type()}?page=${page() - 1}`}
            aria-label="Previous Page"
          >
            {'<'} prev
          </A>
        </Show>
        <span>page {page()}</span>
        <Show
          when={stories() && stories()!.length >= 29}
          fallback={
            <span class="page-link disabled" aria-disabled="true">
              more {'>'}
            </span>
          }
        >
          <A
            class="page-link"
            href={`/${type()}?page=${page() + 1}`}
            aria-label="Next Page"
          >
            more {'>'}
          </A>
        </Show>
      </div>
      <main class="news-list">
        <Show when={stories()}>
          <ul>
            <For each={stories()}>{(story) => <Story story={story} />}</For>
          </ul>
        </Show>
      </main>
    </div>
  )
}

const storyRouteData = (props: RouteDataFuncArgs) => {
  const [story] = createResource<IStory, string>(
    () => `item/${props.params.id}`,
    fetchAPI,
  )
  return story
}

const StoryRoute: Component = () => {
  const story = useRouteData<typeof storyRouteData>()
  return (
    <Show when={story()}>
      <div class="item-view">
        <div class="item-view-header">
          <a href={story()!.url} target="_blank">
            <h1>{story()!.title}</h1>
          </a>
          <Show when={story()!.domain}>
            <span class="host">({story()!.domain})</span>
          </Show>
          <p class="meta">
            {story()!.points} points | by{' '}
            <A href={`/users/${story()!.user}`}>{story()!.user}</A>{' '}
            {story()!.time_ago} ago
          </p>
        </div>
        <div class="item-view-comments">
          <p class="item-view-comments-header">
            {story()!.comments_count
              ? story()!.comments_count + ' comments'
              : 'No comments yet.'}
          </p>
          <ul class="comment-children">
            <For each={story()!.comments}>
              {(comment) => <Comment comment={comment} />}
            </For>
          </ul>
        </div>
      </div>
    </Show>
  )
}

interface IUser {
  error: string
  id: string
  created: string
  karma: number
  about: string
}

const userRouteData = (props: RouteDataFuncArgs) => {
  const [user] = createResource<IUser, string>(
    () => `user/${props.params.id}`,
    fetchAPI,
  )
  return user
}

const UserRoute: Component = () => {
  const user = useRouteData<typeof userRouteData>()
  return (
    <div class="user-view">
      <Show when={user()}>
        <Show when={!user()!.error} fallback={<h1>User not found.</h1>}>
          <h1>User : {user()!.id}</h1>
          <ul class="meta">
            <li>
              <span class="label">Created:</span> {user()!.created}
            </li>
            <li>
              <span class="label">Karma:</span> {user()!.karma}
            </li>
            <Show when={user()!.about}>
              <li innerHTML={user()!.about} class="about" />{' '}
            </Show>
          </ul>
          <p class="links">
            <a href={`https://news.ycombinator.com/submitted?id=${user()!.id}`}>
              submissions
            </a>{' '}
            |{' '}
            <a href={`https://news.ycombinator.com/threads?id=${user()!.id}`}>
              comments
            </a>
          </p>
        </Show>
      </Show>
    </div>
  )
}

export const routes = [
  {
    path: '/',
    component: App,
    children: [
      {
        path: '*stories',
        data: storiesRouteData,
        component: lazy(() => import$({ default: () => <StoriesRoute /> })),
      },
      {
        path: 'stories/:id',
        data: storyRouteData,
        component: lazy(() => import$({ default: () => <StoryRoute /> })),
      },
      {
        path: 'users/:id',
        data: userRouteData,
        component: lazy(() => import$({ default: () => <UserRoute /> })),
      },
    ],
  },
] satisfies RouteDefinition[]
