const fastify = require('fastify')({ trustProxy: true })
import * as feedScan from './feedScan';
import * as feedRoute from './routes/feed';
import * as countRoute from './routes/count';

console.log("adding cors");
fastify.register(require('fastify-cors'), {})

console.log("declaring routes")
fastify.register(feedRoute.registerRoute);
fastify.register(countRoute.registerRoute);

fastify.get('/', async (request, reply) => {
  reply.code(200).send('I am alive!'); 
});

fastify.register(require('fastify-swagger'), {
  mode: 'static',
  specification: {
    path: './doc/swagger-doc.yaml'
  },
  exposeRoute: true,
  routePrefix: '/docs'
})


// Run the server!
const start = async () => {
    try {
      //init feed first!
      await feedScan.initFeed()
      await feedRoute.init();
      await countRoute.init();

      await fastify.listen(4000,'0.0.0.0');
      console.log(`server listening on ${fastify.server.address().port}`)
      console.log("http://localhost:4000/");

      fastify.ready(err => {
        if (err) throw err
        fastify.swagger()
      })

    } catch (err) {
      fastify.log.error(err)
      process.exit(1)
    }
}

console.log("running server")
start();