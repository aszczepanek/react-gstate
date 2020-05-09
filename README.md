# react-gstate

> Allows to create global state classes like native react components with binding to your components state.

## Table of Contents

- [Key features](#key-features)
- [Install](#install)
- [Usage](#usage)
- [Why another global state library](#why-another-global-state-library)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [License](#License)

## Key features

- **Type safety with little code**
- **Doesn't interfere with static props like HOCs**
- **Rerenders only when necessary**
- **Multiple stores compatible with code splitting**
- **Zero dependency** (except react of course)
- **Small and simple**
- **Support for hooks** - you can use same global state with hooks and class components

## Install

```sh
$ npm install react-gstate
```

## Usage

```ts
// AppState.ts
import { GlobalState } from 'react-gstate'

export interface AppState {
  counterA: number
  userId: number
}

class AppStateStore extends GlobalState<CounterState> {
  incrementA() {
    this.setState({
      counterA: this.state.counterA + 1
    })
  }

  updateLoggedUser() {
    // perform some async call and then call setState
    // ...
  }
}

export const appState = new AppStateStore({
  counterA: 0,
  userId: 0
})
```

```tsx
// Counter.tsx
import React from 'react'
import { appState } from './AppState'

interface CounterState {
  counter: number
  localStateCounter: number
}

export class Counter extends React.Component<{}, CounterState> {
  constructor(props: {}) {
    super(props)

    this.state = {
      localStateCounter: 0,
      ...appState.connect(this, gs => ({ counter: gs.counterA }))
    }
  }

  render() {
    const { counter, localStateCounter } = this.state
    return (
      <div>
        <div>
          Counter: {counter}
          <button onClick={() => this.incrementGlobal()}>Increment</button>
        </div>
        <div>
          Local counter: {localStateCounter}
          <button onClick={() => this.incrementLocal()}>Increment</button>
        </div>
      </div>
    )
  }

  incrementGlobal() {
    appState.incrementA()
    // you can also call appState.setState
  }

  incrementLocal() {
    this.setState({
      localStateCounter: this.state.localStateCounter + 1
    })
  }
}
```

```tsx
// CounterUsingHooks.tsx
import React from 'react'
import { appState } from './AppState'

export function CounterUsingHooks() {
  const counter = appState.useState(gs => gs.counterA);

  return (
      <div>
        <div>
          Counter: {counter}
          <button onClick={() => appState.incrementA()}>Increment</button>
        </div>
      </div>
    )
}
```

### Global state class

Creating global state is almost identical to creating
new react component. Define interface for global state
and then create global state class which extends GlobalState.
In global state class you can define your own business logic
methods like you would do inside react component class.
The only difference is that you export global instance of
that class.

GlobalState base class provides two methods: setState and connect.

**setState(globalStatePatch)** - Works similar to setState from
react component. There is no second variant with function
transforming prevState into new state, because its synchronous.
All dependent components will be provided with new value (and only if changed) immediately through calling their setState method with
mapped properties. Because changed global state is propagated through
components' setState method you don't have to worry about calling
global setState multiple times - react will handle this through
batching setState calls.

**connect(componentInstance, mapGlobalStateToComponentState)** -
If you are familiar with react-redux this method may look
similar to connect from react-redux which creates HOC component.
The difference is here we are connecting instance of component
and global state is connected to state instead of props.
When you are dealing with global state and typescript this has
some advantages over HOC from react-redux - more about it in
[Why another global state library](#why-another-global-state-library)
section. Function mapGlobalStateToComponentState should return
part of state of component you are connecting. Typescript will help
you inferring types from passed componentInstance argument,
so you get type safety and intellisense help.
Result of connect call is mapped global state using
passed mapGlobalState as second argument, so you can initialize
state in component constructor satisfying typescript compiler.

You can modify global state only through setState method - it can
be called directly on global state instance object or through
your own methods which you can define as you would in normal
react component.

GlobalState has basic performance optimization which limits rerendered
components to minimum.
After setState call there will be notified only those components which mapped state has actually changed. To determine if mapped state has changed
shallow equality check is used.

## Why another global state library

I wanted simple, **type safe** global state management with as little
boilerplate code as possible. Everything I have looked into had some
flaws. I didn't find satisfying solution. Below you can find short comment on each option I've considered. I've implemented redux solution,
that's why redux have the most extensive description. Other options
I didn't try after looking into documentation/examples with knowledge
what problems I've encountered with redux, so they have a shorter comment.

### Redux

I spent most time trying redux from all global state management options.
The biggest drawback in my opinion is how much code you have to write
to handle simple operations. One part: reducer. Second part: actions. If you want type safety, you need next part with defined constants (action codes) and interface for almost every action. According to
[react-redux-typescript-guide](https://github.com/piotrwitek/react-redux-typescript-guide)
you can use some utility for creating actions which takes away some
boilerplate code you have to write, but that's another thing to learn.
I wanted two global state objects, one for each module of my app.
I wanted to load second module on demand using split code in webpack.
Redux offers solution to this problem using replaceReducers.
But that's yet another part I have to take care of.

Gradually I setup everything, app was working. I started to connect
more components to store. Some of them were using static fields
for defining some metadata about component. Unfortunately connecting
component to redux store is done through HOC. When you create HOC
using typescript you lose static fields at type level.
This is not strictly redux fault -
limiting factor is the way typescript handles static fields.
But HOC is the only way to connect to redux store in react, so it's another
problem I had to deal with.

Then I needed to perform some API request in redux store action.
It turned out that path actions -> reducer -> new state has to be synchronous.
And google said 'Hey, there is also solution to this problem. Please
learn redux-thunk which will allow you to perform async actions. It is middleware for redux.'

At this point I said stop. I wanted simple global state management.
Instead I've got a lot of code, a headache, and was about to
add another part 'redux-thunk' to do so simple and basic operation
as HTTP request which result should go into global state.

I solved all my problems creating my own global state implementation:

- Components are connected to global state through state instead of props,
  so no HOC - no problem with static fields
- Each module can have its own global state class in separate file, so no additional code required to support code splitting
- In global state class methods I can do synchronous and asynchronous operations
- When updating global state there is same shallow equality check
  performance optimization to find out which components should be updated - same as redux
- It's written with typescript in mind, so there is no extra constants
  or interfaces required to enrich solution with type safety like with redux,
  just write method in global state class and that's all.

Of course redux provides some other things that might be important for
you, like browser addon for global state debugging and time travel.
react-gstate in the end works similar to redux, it has single point of
state change, so it is possible to create such an addon like redux have.
But unfortunately I don't have time to develop such thing.

### MobX

I didn't try it. Too much magic under hood and ugly usage
without decorators. I'm not sure but from what I've seen
there could also be problems with static fields in typescript
when not using decorators (see redux description).

### react-globally

Connecting to global state through HOC which means
static field problem (see redux description).

## Contributing

Currently whole react-gstate fits in two files with less than 150 lines total
so you can easily explore its internals by yourself.
If you need some specific feature for your own project, you can even
copy those two files and make changes you need.
If you have some ideas to improve/extend core react-gstate which won't
complicate it's original form then feel free to create issue/PR.

## Changelog
2.0.0 - Breaking change: rename useState to useGlobalState to fix error in react dev tools.

1.2.1 - Fix notify when using map to primitive value during evaluation to falsy value.

1.2.0 - Support optional useState mapState function parameter which defaults to identity map function returning whole state.

1.1.1 - Fix readme typo

1.1.0 - Added hooks support

1.0.0 - Initial version

## License

MIT © [aszczepanek](https://github.com/aszczepanek)
