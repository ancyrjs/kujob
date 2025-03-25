export const expectDate = (future: Date) => {
  return {
    willHappenWithin: (milliseconds: number) => {
      const now = new Date();
      const distanceInMs = future.getTime() - now.getTime();

      expect(distanceInMs).toBeLessThan(milliseconds);
    },
  };
};
