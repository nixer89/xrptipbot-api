const fastify = require('fastify')({ trustProxy: true })
import * as db from './db';
import * as feedScan from './feedScan';
import * as feedRoute from './routes/feed';
import * as ilpFeedRoute from './routes/ilp-feed';
import * as countRoute from './routes/count';
import * as aggregateRoute from './routes/aggregateXRP';

let feedURL = 'https://www.xrptipbot.com/json/feed';
let ilpFeedURL = 'https://www.xrptipbot.com/json/ilp-feed';

console.log("adding cors");
fastify.register(require('fastify-cors'), {})

console.log("declaring routes")
fastify.register(feedRoute.registerRoute);
fastify.register(ilpFeedRoute.registerRoute);
fastify.register(countRoute.registerRoute);
fastify.register(aggregateRoute.registerRoute);

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
      let isNewCollectionTips = await db.initTipDB();
      let isNewCollectionILP = await db.initILPDB();
      let tipsFeed = new feedScan.FeedScan(await db.getNewDbModelTips(), feedURL, false);
      let ilpFeed = new feedScan.FeedScan(await db.getNewDbModelILP(), ilpFeedURL, true);
      await tipsFeed.initFeed(isNewCollectionTips);
      await ilpFeed.initFeed(isNewCollectionILP);
      await feedRoute.init();
      await ilpFeedRoute.init();
      await countRoute.init();
      await aggregateRoute.init();

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