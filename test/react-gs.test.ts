import { counterStateHelper } from './counterState'
import { MockComponent } from './mockComponent'

const initState = counterStateHelper.initState

describe('GlobalState', () => {
  it('init state', () => {
    const store = counterStateHelper.createTestStore()

    expect(store.state).toBeDefined()
    expect(store.state.counterA).toBe(initState.counterA)
  })

  it('setState', () => {
    const store = counterStateHelper.createTestStore()
    store.setState({ counterA: 20 })

    expect(store.state.counterA).toBe(20)
  })

  it('mapped current state on connect component', () => {
    const store = counterStateHelper.createTestStore()
    const component = new MockComponent()
    const result = store.connect(component as any, gs => ({ counter: gs.counterA }))

    expect(result).toBeDefined()
    expect(result).toMatchObject({ counter: initState.counterA })
  })

  it('track connected item', () => {
    const test = createTestConnectedComponent()

    expect(Object.keys(test.store.connectedItems).length).toBe(1)
    expect(test.store.connectedItems[test.connectedItemKey]).toBeDefined()
    expect(test.connectedItem.target).toBe(test.component)
  })

  it('untrack connected item on unmount', () => {
    const test = createTestConnectedComponent()
    test.component.componentWillUnmount()

    expect(Object.keys(test.store.connectedItems).length).toBe(0)
  })

  it('call original unmount on unmount', () => {
    const store = counterStateHelper.createTestStore()
    const component = new MockComponent()
    const originalUnmount = component.componentWillUnmount
    store.connect(component as any, gs => ({ counter: gs.counterA }))

    component.componentWillUnmount()

    expect(originalUnmount).toHaveBeenCalledTimes(1)
  })

  it('notify connected component - connected part of state', () => {
    const test = createTestConnectedComponent()
    test.store.setState({ counterA: 20 })

    expect(test.component.setState).toHaveBeenCalledTimes(1)
    expect(test.component.setState).toHaveBeenCalledWith({ counter: 20 })
  })

  it('do not notify connected component - not connected part of state', () => {
    const test = createTestConnectedComponent()
    test.store.setState({ counterB: 20 })

    expect(test.component.setState).toHaveBeenCalledTimes(0)
  })

  it('do not notify connected component - setState with same value', () => {
    const test = createTestConnectedComponent()
    test.store.setState({ counterA: initState.counterA })

    expect(test.component.setState).toHaveBeenCalledTimes(0)
  })

  it('do not notify connected component - error in map state function', () => {
    const store = counterStateHelper.createTestStore()
    const component = new MockComponent()
    let called = false
    store.connect(component as any, gs => {
      if (!called) {
        called = true
        return {
          counter: gs.counterA
        }
      } else {
        throw new Error('Error in map state')
      }
    })

    store.setState({ counterA: 20 })

    expect(component.setState).toHaveBeenCalledTimes(0)
  })
})

function createTestConnectedComponent() {
  const store = counterStateHelper.createTestStore()
  const component = new MockComponent()
  store.connect(component as any, gs => ({ counter: gs.counterA }))

  const key = Object.keys(store.connectedItems)[0]

  return {
    store,
    component,
    connectedItemKey: Number(key),
    connectedItem: store.connectedItems[Number(key)]
  }
}
