const fastify = require('fastify')({ trustProxy: true })
const feedInit = require('./datagrabber');

console.log("adding cors");
fastify.register(require('fastify-cors'), {})

console.log("declaring routes")
fastify.register(require('./routes/feed'));

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
      feedInit.initFeed();
      await fastify.listen(4000,'0.0.0.0');
      console.log(`server listening on ${fastify.server.address().port}`)
      console.log("http://localhost/");

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