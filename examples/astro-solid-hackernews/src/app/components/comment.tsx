import { Component, For, lazy, Show } from 'solid-js'
import { A } from '@solidjs/router'
import type { IComment } from '../types'
import { interactive$ } from '@tanstack/bling'

const Toggle = interactive$(() => import('./toggle'))

const Comment: Component<{ comment: IComment }> = (props) => {
  return (
    <li class="comment">
      <div class="by">
        <A href={`/users/${props.comment.user}`}>{props.comment.user}</A>{' '}
        {props.comment.time_ago} ago
      </div>
      <div class="text" innerHTML={props.comment.content} />
      <Show when={props.comment.comments.length}>
        <Toggle>
          <For each={props.comment.comments}>
            {(comment) => <Comment comment={comment} />}
          </For>
        </Toggle>
      </Show>
    </li>
  )
}

export default Comment
