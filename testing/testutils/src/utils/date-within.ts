export const expectDate = (future: Date) => {
  return {
    willHappenWithin: (milliseconds: number) => {
      const now = new Date();
      const distanceInMs = future.getTime() - now.getTime();

      expect(distanceInMs).toBeLessThan(milliseconds);
    },
    willHappenAround: (milliseconds: number, delta: number) => {
      const now = new Date();
      const distanceInMs = future.getTime() - now.getTime();

      expect(distanceInMs).toBeGreaterThanOrEqual(milliseconds - delta);
      expect(distanceInMs).toBeLessThanOrEqual(milliseconds + delta);
    },
  };
};
