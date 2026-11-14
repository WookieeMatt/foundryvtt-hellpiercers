/**
 * Minimal GM-delegation over the system socket. Players can't modify actors they don't own, so
 * operations that need to are forwarded to the active GM, who runs a registered handler.
 *
 * Only registered operations can run, and only on the active GM's client.
 */

const EVENT = () => `system.${game.system.id}`;

/** @type {Map<string, (payload: any, requester: foundry.documents.User) => Promise<unknown> | unknown>} */
const operations = new Map();

/**
 * Register an operation that the GM may execute on behalf of players.
 * @param {string} name
 * @param {(payload: any, requester: foundry.documents.User) => unknown} handler
 */
export function registerGmOperation(name, handler) {
  operations.set(name, handler);
}

/**
 * Run an operation: directly if you are the active GM, otherwise via the active GM.
 * @param {string} operation
 * @param {object} payload
 */
export async function gmDo(operation, payload) {
  if (!operations.has(operation)) throw new Error(`Unknown GM operation "${operation}"`);
  if (game.user.isActiveGM) return operations.get(operation)(payload, game.user);
  if (!game.users.activeGM) {
    ui.notifications.warn("A GM must be online to do that.");
    return null;
  }
  game.socket.emit(EVENT(), { operation, payload, userId: game.user.id });
  return null;
}

/** Start listening for delegated operations. Call once on `ready`. */
export function activateSocket() {
  game.socket.on(EVENT(), async ({ operation, payload, userId } = {}) => {
    if (!game.user.isActiveGM) return;
    const handler = operations.get(operation);
    if (!handler) return;
    try {
      await handler(payload, game.users.get(userId));
    } catch (err) {
      console.error(`hellpiercers | GM operation "${operation}" failed`, err);
    }
  });
}
