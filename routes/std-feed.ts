import { Collection } from 'mongodb';
import * as db from '../db';
import * as utils from '../utils';

var tipbotModel: Collection<any>;

export async function init() {
    tipbotModel = await db.getNewDbModelTipsStandarized();
}

export async function registerRoutes(fastify, opts, next) {
    fastify.get('/std-feed', async (request, reply) => {
        //console.log("query params: " + JSON.stringify(request.query));
        try {
            let feedResult = await getStandarizedFeed(JSON.stringify(request.query));
            if(feedResult) {
                //console.log("feed length: " + feedResult.length);
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

async function getStandarizedFeed(filter:any): Promise<any[]> {
    filter = JSON.parse(filter);
    
    if(tipbotModel) {
        try {
            let queryParams:any[] = utils.buildQuery(filter);
            
            queryParams[1].sort = {momentAsDate:-1};

            //console.log("Calling db with finalFilter: " + JSON.stringify(finalFilter) + " , result_field: '" + result_fields + "' and limit: " +limit);
            console.time("dbTimeStandard"+JSON.stringify(queryParams));
            let mongoResult:any[] = await tipbotModel.find(queryParams[0], queryParams[1]).toArray();
            console.timeEnd("dbTimeStandard"+JSON.stringify(queryParams));
            //console.log("mongoResult: " + JSON.stringify(mongoResult));

            if(mongoResult) return mongoResult
            else return null;

        } catch(err) {
            console.log(err);
            return null;
        }
    } else
        return null;
}