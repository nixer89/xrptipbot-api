import { Model } from 'mongoose';
import * as db from '../db';
import * as util from '../util';

var tipbotModel: Model<any>;

export async function init() {
    tipbotModel = await db.getNewDbModelTipsStandarized();
}

export async function registerRoutes(fastify, opts, next) {
    fastify.get('/aggregate/xrp', async (request, reply) => {
        //console.log("query params for /aggregate/xrp: " + JSON.stringify(request.query));
        try {
            let aggregateResult = await Aggregate(JSON.stringify(request.query), { _id: null, xrp: { $sum: "$xrp" }}, {xrp:-1});
            //console.log("/aggregate/xrp Result: " + JSON.stringify(aggregateResult));

            if(aggregateResult) {
                return { xrp: aggregateResult.length > 0 ? aggregateResult[0].xrp : 0}
            } else {
                reply.code(500).send('Something went wrong. Please check your query params');  
            }
        } catch(err) {
            console.log(JSON.stringify(err));
            reply.code(500).send('Exception occured. Please check your query params');
        }
    });

    fastify.get('/aggregate/xrp/mostReceivedFrom', async (request, reply) => {
        //console.log("query params for /aggregate/mostXRPReceived: " + JSON.stringify(request.query));
        try {
            request.query.user_id = {"$ne":null}
            let aggregateResult = await Aggregate(JSON.stringify(request.query), { _id: "$user_id",xrp: {"$sum": "$xrp"}},{xrp:-1});
            //console.log("/aggregate/xrp/mostReceivedFrom Result: " + JSON.stringify(aggregateResult));

            if(aggregateResult) {
                return { result: aggregateResult}
            } else {
                reply.code(500).send('Something went wrong. Please check your query params');  
            }
        } catch(err) {
            console.log(JSON.stringify(err));
            reply.code(500).send('Something went wrong. Please check your query params');
        }
    });

    fastify.get('/aggregate/xrp/mostSentTo', async (request, reply) => {
        //console.log("query params for /aggregate/mostXRPSent: " + JSON.stringify(request.query));
        try {
            request.query.to_id = {"$ne":null}
            let aggregateResult = await Aggregate(JSON.stringify(request.query), { _id: "$to_id", xrp: {"$sum": "$xrp"}},{xrp:-1});
            //console.log("/aggregate/xrp/mostSentTo Result: " + JSON.stringify(aggregateResult));

            if(aggregateResult) {
                return { result: aggregateResult}
            } else {
                reply.code(500).send('Something went wrong. Please check your query params');
            }
        } catch(err) {
            console.log(JSON.stringify(err));
            reply.code(500).send('Something went wrong. Please check your query params');
        }
    });

    next()
}

async function Aggregate(filter:any, groupOptions: any, sortOptions?: any): Promise<any> {
    filter = JSON.parse(filter);
    
    if(tipbotModel) {
        try {
            
            let limit:number= 1000000;
            if(filter.limit) {
                limit = parseInt(filter.limit);
                if(isNaN(limit) || limit==0)
                    return null;

                delete filter.limit;
            }

            let finalFilter = util.generateDbFilter(filter);

            //console.log("Calling aggregate db with filter: " + JSON.stringify(finalFilter) + " and group options: " + JSON.stringify(groupOptions));
            let mongoResult = await tipbotModel.aggregate([
                { $match: finalFilter },
                { $group: groupOptions }
            ]).sort(sortOptions).limit(limit).exec();

            //console.log("aggregate db result: " + JSON.stringify(mongoResult));

            return mongoResult;

        } catch(err) {
            console.log(err);
            return null;
        }
    } else
        return null;
}