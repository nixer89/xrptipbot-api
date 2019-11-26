const fastify = require('fastify')({ trustProxy: true })
import * as origFeedRoute from './routes/orig-feed';
import * as stdFeedRoute from './routes/std-feed';
import * as ilpFeedRoute from './routes/ilp-feed';
import * as stdIlpFeedRoute from './routes/std-ilp-feed';
import * as countRoute from './routes/count';
import * as aggregateRoute from './routes/aggregate';
import * as aggregateILPRoute from './routes/aggregate-ilp';
import * as distinctRoute from './routes/distinct';

console.log("adding cors");
fastify.register(require('fastify-cors'), {
  origin: true,
  methods: 'GET',
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin']
});

console.log("adding response compression");
fastify.register(require('fastify-compress'));

console.log("adding some security headers");
fastify.register(require('fastify-helmet'));

console.log("declaring routes");
fastify.register(origFeedRoute.registerRoutes);
fastify.register(stdFeedRoute.registerRoutes);
fastify.register(ilpFeedRoute.registerRoutes);
fastify.register(stdIlpFeedRoute.registerRoutes);
fastify.register(countRoute.registerRoutes);
fastify.register(aggregateRoute.registerRoutes);
fastify.register(aggregateILPRoute.registerRoutes);
fastify.register(distinctRoute.registerRoutes);

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
});


// Run the server!
const start = async () => {
    console.log("starting server");
    try {
      //init routes
      await origFeedRoute.init();
      await stdFeedRoute.init();
      await ilpFeedRoute.init();
      await stdIlpFeedRoute.init();
      await countRoute.init();
      await aggregateRoute.init();
      await aggregateILPRoute.init();
      await distinctRoute.init();

      await fastify.listen(4000,'0.0.0.0');
      console.log(`server listening on ${fastify.server.address().port}`);
      console.log("http://localhost:4000/");

      fastify.ready(err => {
        if (err) throw err
        fastify.swagger();
      });

    } catch (err) {
      fastify.log.error(err);
      process.exit(1);
    }
}

console.log("running server");
start();