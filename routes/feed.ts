const feed = require('../datagrabber');

module.exports = function (fastify, opts, next) {
    fastify.get('/feed', async (request, reply) => {
        console.log("query params: " + JSON.stringify(request.query));
        try {
            let feedResult = await feed.getFeed(request.query);
            if(feedResult) {
            console.log("feed length: " + feedResult.length);
            return { feed: feedResult}
            } else {
                reply.code(500).send('Something went wrong. Please check your query params');  
            }
        } catch {
            reply.code(500).send('Something went wrong. Please check your query params');
        }
    });
    next()
}