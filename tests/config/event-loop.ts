/**
 * Wait for a fixed delay
 * @param delay
 */
export const waitFor = (delay: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, delay));

/**
 * Give back the control to the process after all the event loop's tasks are done
 * Allows to wait for all calls to `setImmediate` to resolve first.
 */
export const waitEndOfLoop = (): Promise<void> => waitFor(0);
