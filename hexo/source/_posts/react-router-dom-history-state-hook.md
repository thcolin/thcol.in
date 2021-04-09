---
title: React Router DOM History state hook
date: 2021-04-09 13:59:09
photos:
- https://miro.medium.com/max/1024/1*DU5n6M4z1mRlxEl_Co6EGg.jpeg
---

Hi, it's been a while !

Guess what, i'd another issue at work today, share a `state` between two **React** components not rendered by the same parent

<!-- more -->

A really simple solution I occasionally use is the not-so-known [`History.state`](https://developer.mozilla.org/en-US/docs/Web/API/History/state)

With `react-router-dom`, `History.state` is available through [`location`](https://reactrouter.com/web/api/location) with [`useLocation`](https://reactrouter.com/web/api/Hooks/uselocation) hook for example, and you can set it with a [`<Link />`](https://reactrouter.com/web/api/Link/to-object) component or with the [`history.replace`](https://reactrouter.com/web/api/history) available through [`useRouter`](https://reactrouter.com/web/api/Hooks/usehistory) hook

With a few lines we can re-create `React.useState` behavior with `History.state` and help from `react-router-dom` hooks !
<br/>

```js
import { useRef, useCallback, useEffect } from 'react'
import { useHistory, useLocation } from 'react-router-dom'

// Use a "creator" with a `key` allow us to have multiple History.state usage in the same page
export const createHistoryState = (key, initial = {}) => () => {
  const ready = useRef(false)
  const { replace } = useHistory()
  const { state = { [key]: initial }, ...location } = useLocation()
  const setState = useCallback(next => replace({ ...location, state: { ...state, [key]: next } }), [location])

  useEffect(() => {
    ready.current = true
    setState(initial)
  }, [])

  return [ready.current ? state[key] : initial, setState]
}
```
<br/>

### Usage
```js
const useHistoryState = createHistoryState('custom-key', { loading: false })

const Button = ({ ...props }) => {
  const [state, setState] = useHistoryState()

  useEffect(() => {
    const cb = async () => {
      setState({ loading: true })
      // await [...]
      setState({ loading: false })
    }

    cb()
  }, [])

  return (
    <button disabled={state.loading}>
      Refresh
    </button>
  )
}

const Content = ({ ...props }) => {
  const [state, setState] = useHistoryState()

  return (
    <div>
      {state.loading ? 'Loading...' : 'Hello World !'}
    <div>
  )
}
```
<br/>

**IMPORTANT:** This solution have some limits
  * Remember, `state` will be `JSON.stringify`, therefore [*properties that are not enumerable will be ignored*](https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description) (like `Function`)
  * `location.state` is only available for `BrowserRouter` and `MemoryRouter`, not for `HashRouter`, see [note](https://reactrouter.com/web/api/HashRouter)
