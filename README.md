# Kujob

A simple job queue for NodeJS, running on top of PostgreSQL using FOR UPDATE SKIP LOCKED.

# Motivation

I wrote this package for two reasons :
- First as an exercice to learn more about Job Queues & PostgreSQL
- Second as a potential replacement for Redis-based job queues because my apps mostly use PgSQL and I don't need to spend more money on redis just to run freaking jobs

# Features

- Schedule & Run jobs
- Group jobs into queues
- Prioritize jobs within a queue (TODO)
- Run jobs only after a certain delay (TODO)
- Retry failed jobs a fixed number of times (TODO)
- Configure either a linear or exponential backoff for failed jobs (TODO)
- Testability with in-memory scheduling (TODO)
- Emitting & Intercepting job events (TODO)
- Recovery of stalled jobs (TODO)
- Integration with NestJS (TODO)