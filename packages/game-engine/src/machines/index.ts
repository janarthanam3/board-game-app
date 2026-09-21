// The five machines of docs/06-state-machines.md (task C5a). Each is a discriminated union plus
// one total transition function; see core.ts for the shared shape.
export type { Transition } from "./core";
export * from "./turn";
export * from "./auction";
export * from "./trade";
export * from "./bankruptcy";
export * from "./lifecycle";
