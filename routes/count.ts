import { Model } from 'mongoose';
import * as db from '../db';

var tipbotModel: Model<any>;

export async function registerRoute(fastify, opts, next) {
    fastify.get('/count', async (request, reply) => {
        console.log("query params: " + JSON.stringify(request.query));
        try {
            let countResult = await getCount(request.query);
            if(countResult) {
                console.log("number of documents with filter: '" + JSON.stringify(request.query)+ "' is: "+ countResult);
                return { count: countResult}
            } else {
                reply.code(500).send('Something went wrong. Please check your query params');  
            }
        } catch {
            reply.code(500).send('Something went wrong. Please check your query params');
        }
    });
    next()
}

export async function init() {
    tipbotModel = await db.getNewDbModel();
}

async function getCount(filter:any): Promise<number> {
    let failedResult:number = -1;
    if(tipbotModel) {
        try {
            console.log("Calling db with filter: " + JSON.stringify(filter));
            let mongoResult:number;
            if(filter.length <=2)
                mongoResult = await tipbotModel.estimatedDocumentCount();
            else
                mongoResult = await tipbotModel.countDocuments(filter);

            if(mongoResult) return mongoResult
            else failedResult;
        } catch(err) {
            console.log(err);
            return failedResult;
        }
    } else
        return failedResult;
}