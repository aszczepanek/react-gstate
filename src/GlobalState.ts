import React from 'react'
import { shallowEqual } from './shallowEqual'

type Connectable<S> = React.Component<any, S> | React.PureComponent<any, S>
type MapStateFn<GS, LS, K extends keyof LS> = (gs: GS) => Pick<LS, K> | LS

export class GlobalState<S> {
  connectedItems: { [key: number]: ConnectedItem<S, any, any> } = {}
  state: S

  constructor(initState: S) {
    this.state = initState
  }

  setState<K extends keyof S>(newStatePatch: Pick<S, K> | S) {
    const newState = Object.assign({}, this.state, newStatePatch)
    if (shallowEqual(this.state, newState)) return

    this.state = newState
    this.notifyStateChanged()
  }

  connect<LS, K extends keyof LS>(target: Connectable<LS>, mapState: MapStateFn<S, LS, K>) {
    const connectedItem = new ConnectedItem(target, mapState, this.state)

    this.connectedItems[connectedItem.id] = connectedItem
    this.hookDisconnectOnUnmount(connectedItem)

    return connectedItem.mappedState
  }

  private hookDisconnectOnUnmount(item: ConnectedItem<S, any, any>) {
    const prevUnmount = item.target.componentWillUnmount

    item.target.componentWillUnmount = () => {
      this.disconnect(item)
      prevUnmount && prevUnmount.call(item.target)
    }
  }

  private disconnect(item: ConnectedItem<S, any, any>) {
    delete this.connectedItems[item.id]
  }

  private notifyStateChanged() {
    for (let key in this.connectedItems) {
      this.connectedItems[key].processNewGlobaleState(this.state)
    }
  }
}

let connectedItemIdGen = 1

class ConnectedItem<GS, LS, K extends keyof LS> {
  id = connectedItemIdGen++
  mappedState: ReturnType<MapStateFn<GS, LS, K>>

  constructor(public target: Connectable<LS>, public mapStateFn: MapStateFn<GS, LS, K>, gs: GS) {
    this.mappedState = mapStateFn(gs)
  }

  processNewGlobaleState(gs: GS) {
    const newMappedState = this.evaluateMapState(gs)
    if (!newMappedState) return
    if (shallowEqual(this.mappedState, newMappedState)) return

    this.mappedState = newMappedState
    this.target.setState(this.mappedState)
  }

  private evaluateMapState(gs: GS) {
    try {
      return this.mapStateFn(gs)
    } catch (e) {
      console.error(
        'Error in map global state function for component ' + this.target.constructor.name
      )
      console.error(e)
      return undefined
    }
  }
}
