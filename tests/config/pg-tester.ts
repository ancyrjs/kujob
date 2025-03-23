// Kept for posterity
// export class Tester {
//   // @ts-ignore
//   private pgkue: Pgkue;
//
//   // @ts-ignore
//   private container: StartedPostgreSqlContainer;
//
//   async beforeAll() {
//     this.container = await new PostgreSqlContainer().start();
//
//     this.pgkue = new Pgkue({
//       poolFactory: new DefaultPoolFactory({
//         user: this.container.getUsername(),
//         password: this.container.getPassword(),
//         host: this.container.getHost(),
//         port: this.container.getPort(),
//         database: this.container.getDatabase(),
//       }),
//     });
//
//     await this.pgkue.start();
//   }
//
//   async beforeEach() {
//     await this.pgkue.purge();
//   }
//
//   async afterAll() {
//     await this.pgkue.end();
//     await this.container.stop();
//   }
//
//   getPgkue() {
//     return this.pgkue;
//   }
// }
