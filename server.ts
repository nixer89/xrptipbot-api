const fastify = require('fastify')({ trustProxy: true })
const feed = require('./datagrabber');


fastify.register(require('fastify-cors'), {})

console.log("declaring routes")
// Declare a route
fastify.get('/', async (request, reply) => {
  reply.code(200).send('I am alive!'); 
});

fastify.get('/feed', async (request, reply) => {
  console.log("query params: " + JSON.stringify(request.query));
    let feedResult = await feed.getFeed(request.query);
    console.log("feed length: " + feedResult.length);
    return { feed: feedResult}
})

// Run the server!
const start = async () => {
    try {
      feed.initFeed();
      await fastify.listen(8443)
      console.log(`server listening on ${fastify.server.address().port}`)
      console.log("http://localhost/");
    } catch (err) {
      fastify.log.error(err)
      process.exit(1)
    }
}

console.log("running server")
start();