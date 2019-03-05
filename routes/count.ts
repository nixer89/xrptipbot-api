import { Model } from 'mongoose';
import * as db from '../db';

var tipbotModel: Model<any>;

export async function registerRoutes(fastify, opts, next) {
    fastify.get('/count', async (request, reply) => {
        console.log("query params for /count: " + JSON.stringify(request.query));
        try {
            let countResult = await Count(JSON.stringify(request.query), { _id: null, count: { $sum: 1 }}, {count:-1});
            //console.log("aggregate xrp Result: " + JSON.stringify(aggregateResult));
            if(countResult.length>=0) {
                console.log("number of documents with filter: '" + JSON.stringify(request.query)+ "' is: "+ countResult[0].count);
                return { count: countResult[0].count}
            } else {
                reply.code(500).send('Something went wrong. Please check your query params');  
            }
        } catch {
            reply.code(500).send('Something went wrong. Please check your query params');
        }
    });

    fastify.get('/count/mostReceivedFrom', async (request, reply) => {
        console.log("query params for /count/mostReceivedFrom: " + JSON.stringify(request.query));
        try {
            request.query.user_id = {"$ne":null}
            let countResult = await Count(JSON.stringify(request.query), { _id: "$user_id", count: {"$sum": 1}},{count:-1});
            //console.log("aggregate xrp Result: " + JSON.stringify(aggregateResult));
            if(countResult.length>=0) {
                console.log("number of documents with filter: '" + JSON.stringify(request.query)+ "' is: "+ countResult.length);
                return { result: countResult}
            } else {
                reply.code(500).send('Something went wrong. Please check your query params');  
            }
        } catch {
            reply.code(500).send('Something went wrong. Please check your query params');
        }
    });

    fastify.get('/count/mostSentTo', async (request, reply) => {
        console.log("query params for /count/mostSentTo: " + JSON.stringify(request.query));
        try {
            request.query.to_id = {"$ne":null}
            let countResult = await Count(JSON.stringify(request.query), { _id: "$to_id", count: {"$sum": 1}},{count:-1});
            //console.log("aggregate xrp Result: " + JSON.stringify(aggregateResult));
            if(countResult.length>=0) {
                console.log("number of documents with filter: '" + JSON.stringify(request.query)+ "' is: "+ countResult.length);
                return { result: countResult}
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

async function Count(filter:any, groupOptions: any, sortOptions?: any): Promise<any> {
    filter = JSON.parse(filter);
    
    let failedResult:number = -1;
    if(tipbotModel) {
        try {
            let filterWithOperatorAnd:any[] = [];
            let limit:number= 1000000;
            if(filter.limit) {
                limit = parseInt(filter.limit);
                if(isNaN(limit) || limit==0)
                    return failedResult;

                delete filter.limit;
            }

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

            console.log("Calling aggregate db with filter: " + JSON.stringify(finalFilter));
            let mongoResult = await tipbotModel.aggregate([
                { $match: finalFilter },
                { $group: groupOptions }
            ]).sort(sortOptions).limit(limit).exec();

            //console.log("aggregate result: " + JSON.stringify(mongoResult));

            if(mongoResult && mongoResult.length>0)
                return mongoResult;
            else
                return failedResult;
        } catch(err) {
            console.log(err);
            return failedResult;
        }
    } else
        return failedResult;
}