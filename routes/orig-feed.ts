import { Collection } from 'mongodb';
import * as db from '../db';
import * as utils from '../utils';

var tipbotModel: Collection<any>;

export async function init() {
    tipbotModel = await db.getNewDbModelTips();
}

export async function registerRoutes(fastify, opts, next) {
    fastify.get('/feed', async (request, reply) => {
        //console.log("query params: " + JSON.stringify(request.query));
        try {
            let feedResult = await getFeed(JSON.stringify(request.query));
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

async function getFeed(filter:any): Promise<any[]> {
    filter = JSON.parse(filter);
    
    if(tipbotModel) {
        try {
            let queryParams:any[] = utils.buildQuery(filter);
            
            queryParams[1].sort = {momentAsDate:-1};

            //console.log("Calling db with finalFilter: " + JSON.stringify(finalFilter) + " , result_field: '" + options + "' and limit: " +limit);
            let mongoResult:any[] = await tipbotModel.find(queryParams[0], queryParams[1]).toArray();

            if(mongoResult) return mongoResult
            else return null;
        } catch(err) {
            console.log(err);
            return null;
        }
    } else
        return null;
}