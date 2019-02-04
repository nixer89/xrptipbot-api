const fastify = require('fastify')()
const feed = require('./datagrabber');


fastify.register(require('fastify-cors'), {})

console.log("declaring routes")
// Declare a route
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
      await fastify.listen(4000)
      console.log(`server listening on ${fastify.server.address().port}`)
      console.log("https://localhost:4000");
    } catch (err) {
      fastify.log.error(err)
      process.exit(1)
    }
}

console.log("running server")
start();