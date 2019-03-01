export const MockComponent = jest.fn(() => ({
  setState: jest.fn(),
  componentWillUnmount: jest.fn()
}))