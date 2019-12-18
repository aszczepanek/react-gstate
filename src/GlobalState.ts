import React, { useEffect, useState } from 'react'
import { shallowEqual } from './shallowEqual'

/**
 * GS - Global State
 * LS - Local State
 */

type Connectable<S> = React.Component<any, S> | React.PureComponent<any, S>
type MapStateFn<GS, LS, K extends keyof LS> = (gs: GS) => Pick<LS, K> | LS
type HookMapState<GS, LS> = (gs: GS) => LS

export class GlobalState<S> {
  connectedItems: { [key: number]: ConnectedItem<S, any, any> } = {}
  connectedHooks: { [key: number]: ConnectedHook<S, any> } = {}
  state: S
  defaultMapState: HookMapState<S, S> = gs => gs

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
    this.interceptUnmountToDisconnect(connectedItem)

    return connectedItem.mappedState
  }

  useState(mapState?: undefined): S
  useState<LS>(mapState: HookMapState<S, LS>): LS
  useState<LS>(mapState?: HookMapState<S, LS>): LS | S {
    const mapStateFn = mapState || this.defaultMapState
    const [mappedState, setMappedState] = useState(mapStateFn(this.state))
    const [connectedHook, setConnectedHook] = useState(
      () => new ConnectedHook(mappedState, mapStateFn, setMappedState)
    )

    useEffect(() => {
      this.connectedHooks[connectedHook.id] = connectedHook
      return () => {
        delete this.connectedHooks[connectedHook.id]
      }
    }, [])

    return mappedState
  }

  private interceptUnmountToDisconnect(item: ConnectedItem<S, any, any>) {
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
    for (let key in this.connectedHooks) {
      this.connectedHooks[key].processNewGlobaleState(this.state)
    }
  }
}

let connectedItemIdGen = 1

class ConnectedHook<GS, LS> {
  id = connectedItemIdGen++

  constructor(
    public mappedState: LS,
    public mapStateFn: HookMapState<GS, LS>,
    public setMappedStateFn: React.Dispatch<React.SetStateAction<LS>>
  ) {}

  processNewGlobaleState(gs: GS) {
    const newMappedState = this.evaluateMapState(gs)
    if (!newMappedState) return
    if (shallowEqual(this.mappedState, newMappedState)) return

    this.mappedState = newMappedState
    this.setMappedStateFn(this.mappedState)
  }

  private evaluateMapState(gs: GS) {
    try {
      return this.mapStateFn(gs)
    } catch (e) {
      console.error('Error in map global state function for hook ')
      console.error(e)
      return undefined
    }
  }
}

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
