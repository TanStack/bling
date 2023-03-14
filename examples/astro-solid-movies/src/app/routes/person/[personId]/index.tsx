import { Show } from 'solid-js'
import { useLoader, useRouteData } from '@solidjs/router'
import { getPerson } from '~/services/tmdbAPI'
import { PersonInfo } from './PersonInfo'

export function routeData({ params }) {
  return useLoader(
    async (id) => {
      try {
        const item = await getPerson(id)

        if (item.adult) {
          throw new Error('Data not available')
        } else {
          return { item }
        }
      } catch {
        throw new Error('Data not available')
      }
    },
    {
      key: () => params.personId,
    },
  )
}

export default function PersonPage() {
  const data = useRouteData<typeof routeData>()

  return (
    <main>
      <Show when={data()}>
        <PersonInfo person={data().item} />
      </Show>
    </main>
  )
}
