import { Model } from 'mongoose';
import * as db from '../db';

var tipbotModel: Model<any>;

export async function registerRoutes(fastify, opts, next) {
    fastify.get('/aggregate/xrp', async (request, reply) => {
        console.log("query params for /aggregate/xrp: " + JSON.stringify(request.query));
        try {
            let aggregateResult = await Aggregate(JSON.stringify(request.query), { _id: null, xrp: { $sum: "$xrp" }}, {xrp:-1});
            //console.log("aggregate xrp Result: " + JSON.stringify(aggregateResult));
            if(aggregateResult.length>=0) {
                console.log("number of documents with filter: '" + JSON.stringify(request.query)+ "' is: "+ aggregateResult[0].xrp);
                return { xrp: aggregateResult[0].xrp}
            } else {
                reply.code(500).send('Something went wrong. Please check your query params');  
            }
        } catch {
            reply.code(500).send('Something went wrong. Please check your query params');
        }
    });

    fastify.get('/aggregate/xrp/mostReceivedFrom', async (request, reply) => {
        console.log("query params for /aggregate/mostXRPReceived: " + JSON.stringify(request.query));
        try {
            request.query.user_id = {"$ne":null}
            let aggregateResult = await Aggregate(JSON.stringify(request.query), { _id: "$user_id",xrp: {"$sum": "$xrp"}},{xrp:-1});
            //console.log("aggregate xrp Result: " + JSON.stringify(aggregateResult));
            if(aggregateResult.length>=0) {
                console.log("number of documents with filter: '" + JSON.stringify(request.query)+ "' is: "+ aggregateResult.length);
                return { result: aggregateResult}
            } else {
                reply.code(500).send('Something went wrong. Please check your query params');  
            }
        } catch {
            reply.code(500).send('Something went wrong. Please check your query params');
        }
    });

    fastify.get('/aggregate/xrp/mostSentTo', async (request, reply) => {
        console.log("query params for /aggregate/mostXRPSent: " + JSON.stringify(request.query));
        try {
            request.query.to_id = {"$ne":null}
            let aggregateResult = await Aggregate(JSON.stringify(request.query), { _id: "$to_id", xrp: {"$sum": "$xrp"}},{xrp:-1});
            //console.log("aggregate xrp Result: " + JSON.stringify(aggregateResult));
            if(aggregateResult.length>=0) {
                console.log("number of documents with filter: '" + JSON.stringify(request.query)+ "' is: "+ aggregateResult.length);
                return { result: aggregateResult}
            } else {
                reply.code(500).send('Something went wrong. Please check your query params');
            }
        } catch {
            reply.code(500).send('Something went wrong. Please check your query params');
        }
    });

    fastify.get('/aggregate/tips', async (request, reply) => {
        console.log("query params for /aggregate/tips: " + JSON.stringify(request.query));
        try {
            let aggregateResult = await Aggregate(JSON.stringify(request.query), { _id: null, count: { $sum: 1 }}, {count:-1});
            //console.log("aggregate xrp Result: " + JSON.stringify(aggregateResult));
            if(aggregateResult.length>=0) {
                console.log("number of documents with filter: '" + JSON.stringify(request.query)+ "' is: "+ aggregateResult[0].count);
                return { count: aggregateResult[0].count}
            } else {
                reply.code(500).send('Something went wrong. Please check your query params');  
            }
        } catch {
            reply.code(500).send('Something went wrong. Please check your query params');
        }
    });

    fastify.get('/aggregate/tips/mostReceivedFrom', async (request, reply) => {
        console.log("query params for /aggregate/mostTipsReceived: " + JSON.stringify(request.query));
        try {
            request.query.user_id = {"$ne":null}
            let aggregateResult = await Aggregate(JSON.stringify(request.query), { _id: "$user_id", count: {"$sum": 1}},{count:-1});
            //console.log("aggregate xrp Result: " + JSON.stringify(aggregateResult));
            if(aggregateResult.length>=0) {
                console.log("number of documents with filter: '" + JSON.stringify(request.query)+ "' is: "+ aggregateResult.length);
                return { result: aggregateResult}
            } else {
                reply.code(500).send('Something went wrong. Please check your query params');  
            }
        } catch {
            reply.code(500).send('Something went wrong. Please check your query params');
        }
    });

    fastify.get('/aggregate/tips/mostSentTo', async (request, reply) => {
        console.log("query params for /aggregate/mostTipsSent: " + JSON.stringify(request.query));
        try {
            request.query.to_id = {"$ne":null}
            let aggregateResult = await Aggregate(JSON.stringify(request.query), { _id: "$to_id", count: {"$sum": 1}},{count:-1});
            //console.log("aggregate xrp Result: " + JSON.stringify(aggregateResult));
            if(aggregateResult.length>=0) {
                console.log("number of documents with filter: '" + JSON.stringify(request.query)+ "' is: "+ aggregateResult.length);
                return { result: aggregateResult}
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

async function Aggregate(filter:any, groupOptions: any, sortOptions?: any): Promise<any> {
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