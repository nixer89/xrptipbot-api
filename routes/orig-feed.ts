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
            if(utils.checkParamsValidity(JSON.stringify(request.query))) {
                let feedResult = await getFeed(JSON.stringify(request.query));
                if(feedResult) {
                    //console.log("feed length: " + feedResult.length);
                    return { feed: feedResult}
                } else {
                    reply.code(500).send('Something went wrong. Please check your query params or contact @nixerFFM');  
                }
            } else {
                reply.code(500).send('This request is not possible. Please contact @nixerFFM');  
            }
        } catch (err) {
            reply.code(500).send('Something went wrong. Please check your query params or contact @nixerFFM');
        }
    });
    next()
}

async function getFeed(filter:any): Promise<any[]> {
    let parsedFilter = JSON.parse(filter);
    
    if(tipbotModel) {
        try {
            let queryParams:utils.QUERYBUILDER = utils.buildQuery(parsedFilter);
            
            queryParams.options.sort = {momentAsDate:-1};

            //console.log("Calling db with finalFilter: " + JSON.stringify(finalFilter) + " , result_field: '" + options + "' and limit: " +limit);
            let mongoResult:any[] = await tipbotModel.find(queryParams.filter, queryParams.options).toArray();

            if(mongoResult) return mongoResult
            else return null;
        } catch(err) {
            console.log(err);
            return null;
        }
    } else
        return null;
}