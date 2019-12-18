import * as React from 'react'
import { counterStateHelper, CounterState, CounterStateStore } from './counterState'
import * as TestRenderer from 'react-test-renderer'

const initState = counterStateHelper.initState

let store: CounterStateStore
let renderCount = 0
let fnComponentLastState: any = undefined

beforeEach(() => {
  store = counterStateHelper.createTestStore()
  renderCount = 0
  fnComponentLastState = undefined
})

interface MockProps {
  mapFn?: (gs: CounterState) => any
}

function MockFnComponent(props: MockProps) {
  renderCount++
  fnComponentLastState = store.useState(props.mapFn)

  return <span>{JSON.stringify(fnComponentLastState)}</span>
}

describe('GlobalState hooks interface', () => {
  it('mapped current state', () => {
    TestRenderer.act(() => {
      TestRenderer.create(<MockFnComponent mapFn={gs => ({ counter: gs.counterA })} />)
    })

    const result = fnComponentLastState

    expect(result).toBeDefined()
    expect(result).toMatchObject({ counter: initState.counterA })
    expect(renderCount).toBe(1)
  })

  it('mapped default state', () => {
    TestRenderer.act(() => {
      TestRenderer.create(<MockFnComponent mapFn={undefined} />)
    })

    const result = fnComponentLastState

    expect(result).toBeDefined()
    expect(result).toBe(initState)
    expect(renderCount).toBe(1)
  })

  it('track connected item', () => {
    const hookId = createTestConnectedHook()
    expect(Object.keys(store.connectedHooks).length).toBe(1)
    expect(store.connectedHooks[hookId]).toBeDefined()
  })

  it('untrack connected item on unmount', () => {
    let renderer: any = undefined

    TestRenderer.act(() => {
      renderer = TestRenderer.create(<MockFnComponent mapFn={gs => ({ counter: gs.counterA })} />)
    })

    expect(Object.keys(store.connectedHooks).length).toBe(1)

    TestRenderer.act(() => {
      renderer.unmount()
    })

    expect(Object.keys(store.connectedHooks).length).toBe(0)
    expect(renderCount).toBe(1)
  })

  it('notify connected component - connected part of state', () => {
    let renderer: any = undefined

    TestRenderer.act(() => {
      renderer = TestRenderer.create(<MockFnComponent mapFn={gs => ({ counter: gs.counterA })} />)
    })

    expect(fnComponentLastState).toMatchObject({ counter: initState.counterA })

    TestRenderer.act(() => {
      store.setState({ counterA: 20 })
    })

    expect(fnComponentLastState).toMatchObject({ counter: 20 })
    expect(renderCount).toBe(2)
  })

  it('do not notify connected component - not connected part of state', () => {
    TestRenderer.act(() => {
      TestRenderer.create(<MockFnComponent mapFn={gs => ({ counter: gs.counterA })} />)
    })

    TestRenderer.act(() => {
      store.setState({ counterB: 20 })
    })

    expect(fnComponentLastState).toMatchObject({ counter: initState.counterA })
    expect(renderCount).toBe(1)
  })

  it('do not notify connected component - setState with same value', () => {
    TestRenderer.act(() => {
      TestRenderer.create(<MockFnComponent mapFn={gs => ({ counter: gs.counterA })} />)
    })

    TestRenderer.act(() => {
      store.setState({ counterA: initState.counterA })
    })

    expect(fnComponentLastState).toMatchObject({ counter: initState.counterA })
    expect(renderCount).toBe(1)
  })

  it('do not notify connected component - error in map state function', () => {
    let called = false
    const mapState = (gs: CounterState) => {
      if (!called) {
        called = true
        return {
          counter: gs.counterA
        }
      } else {
        throw new Error('Error in map state')
      }
    }
    TestRenderer.act(() => {
      TestRenderer.create(<MockFnComponent mapFn={mapState} />)
    })

    TestRenderer.act(() => {
      store.setState({ counterA: 20 })
    })

    expect(fnComponentLastState).toMatchObject({ counter: initState.counterA })
    expect(renderCount).toBe(1)
  })

  it('map global state to primitive value', () => {
    TestRenderer.act(() => {
      TestRenderer.create(<MockFnComponent mapFn={gs => gs.counterA} />)
    })

    expect(fnComponentLastState).toBe(initState.counterA)

    TestRenderer.act(() => {
      store.setState({ counterA: 20 })
    })

    expect(fnComponentLastState).toBe(20)
    expect(renderCount).toBe(2)
  })

  it('do not notify primitive if same value', () => {
    TestRenderer.act(() => {
      TestRenderer.create(<MockFnComponent mapFn={gs => gs.counterA} />)
    })

    expect(fnComponentLastState).toBe(initState.counterA)

    TestRenderer.act(() => {
      store.setState({ counterA: initState.counterA })
    })

    expect(fnComponentLastState).toBe(initState.counterA)
    expect(renderCount).toBe(1)
  })

  it('do not notify primitive if ohter part global state changed', () => {
    TestRenderer.act(() => {
      TestRenderer.create(<MockFnComponent mapFn={gs => gs.counterA} />)
    })

    expect(fnComponentLastState).toBe(initState.counterA)

    TestRenderer.act(() => {
      store.setState({ counterB: 20 })
    })

    expect(fnComponentLastState).toBe(initState.counterA)
    expect(renderCount).toBe(1)
  })
})

function createTestConnectedHook() {
  TestRenderer.act(() => {
    TestRenderer.create(<MockFnComponent mapFn={gs => ({ counter: gs.counterA })} />)
  })

  const key = Object.keys(store.connectedHooks)[0]
  return Number(key)
}
