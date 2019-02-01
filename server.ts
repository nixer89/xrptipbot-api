const fastify = require('fastify')()
const feed = require('./datagrabber');

console.log("declaring routes")
// Declare a route
fastify.get('/', async (request, reply) => {
    return { hello: 'world' }
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