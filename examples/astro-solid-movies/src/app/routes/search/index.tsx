import { For } from 'solid-js'
import { useLoader, useSearchParams } from '@solidjs/router'
import { Card } from '~/components/Card'
import { search } from '~/services/tmdbAPI'
import { SearchBox } from './SearchBox'
export default function Search() {
  const [params] = useSearchParams()
  const data = useLoader(async (q) => await search(q), {
    key: () => params.q,
  })

  return (
    <main class="main">
      <SearchBox value={params.q} />
      {data() && (
        <div class="listing">
          <div class="listing__head">
            <h2 class="listing__title">Searching for {params.q}</h2>
          </div>

          <div class="listing__items">
            <For each={data()?.results}>{(item) => <Card item={item} />}</For>
          </div>
          {/* <pre>{JSON.stringify(data(), null, 2)}</pre> */}

          {/* <div
      v-if="items.page < items.total_pages"
      class="listing__nav">
      <LoadingSpinnerIcon v-if="loading" />
    </div> */}
        </div>
      )}
    </main>
  )
}
