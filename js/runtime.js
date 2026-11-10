// A nézetek és modalok így érik el a ui.js-ben definiált függvényeket anélkül,
// hogy a ui.js-t importálnák (ez körkörös függőséget okozna).
const handlers = {};

export function registerRuntime(implementations) {
  Object.assign(handlers, implementations);
}

export const render = (...args) => handlers.render(...args);
export const toast = (...args) => handlers.toast(...args);
export const refreshRemote = (...args) => handlers.refreshRemote(...args);
