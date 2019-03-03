import { Model } from 'mongoose';
import * as db from '../db';

var tipbotModel: Model<any>;

export async function registerRoute(fastify, opts, next) {
    fastify.get('/count', async (request, reply) => {
        console.log("query params: " + JSON.stringify(request.query));
        try {
            let countResult = await getCount(request.query);
            console.log("countResult: " + JSON.stringify(countResult));
            if(countResult>=0) {
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
    tipbotModel = await db.getNewDbModelTips();
}

async function getCount(filter:any): Promise<number> {
    let failedResult:number = -1;
    if(tipbotModel) {
        try {
            let filterWithOperatorAnd:any[] = [];

            let from_date:Date;
            if(filter.from_date) {
                from_date = new Date(filter.from_date)
                filterWithOperatorAnd.push({momentAsDate: {$gte: from_date}});
                delete filter.from_date;
            }

            let to_date:Date;
            if(filter.to_date) {
                to_date = new Date(filter.to_date)
                filterWithOperatorAnd.push({momentAsDate: {$lte: to_date}});
                delete filter.to_date;
            }

            let finalFilter:any;
            if(filterWithOperatorAnd.length>0) {
                filterWithOperatorAnd.push(filter)
                finalFilter = {$and: filterWithOperatorAnd}
            } else
                finalFilter = filter;

            console.log("Calling db with filter: " + JSON.stringify(finalFilter));
            let mongoResult:number;
            if(finalFilter.length <=2)
                mongoResult = await tipbotModel.estimatedDocumentCount().exec();
            else
                mongoResult = await tipbotModel.countDocuments(finalFilter).exec();

            if(mongoResult || mongoResult===0)
                return mongoResult
            else
                return failedResult;
        } catch(err) {
            console.log(err);
            return failedResult;
        }
    } else
        return failedResult;
}