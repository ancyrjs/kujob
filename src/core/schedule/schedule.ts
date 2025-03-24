export type NextRunAtParams = {
  now: Date;
};

/**
 * Strategy to schedule the next run of a job.
 */
export interface Schedule {
  /**
   * Serialize the data representation of the object
   * to be stored in database without the database knowing
   * the concrete implementation.
   */
  serialize(): object;

  /**
   * Determines if the job should be rescheduled.
   * Used for repeatable jobs
   */
  shouldReschedule(): boolean;

  /**
   * Determines when to run the job next
   * @param params
   */
  nextRunAt(params: NextRunAtParams): Date;
}
