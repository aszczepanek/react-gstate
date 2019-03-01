import { GlobalState } from "../src/react-gs";

export interface CounterState {
  counterA: number;
  counterB: number;
  testObject: any;
}

export class CounterStateStore extends GlobalState<CounterState> {
  incrementA() {
    this.setState({
      counterA: this.state.counterA + 1
    })
  }
}

const initState: CounterState = {
  counterA: 10,
  counterB: 0,
  testObject: {}
}

export const counterStateHelper = {
  initState,
  createTestStore
}

function createTestStore() {
  return new CounterStateStore(initState)
}