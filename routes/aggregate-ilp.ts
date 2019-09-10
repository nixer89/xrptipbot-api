import { Collection } from 'mongodb';
import * as db from '../db';
import * as utils from '../utils';

var tipbotModel: Collection<any>;

export async function init() {
    tipbotModel = await db.getNewDbModelILPStandarized();
}

export async function registerRoutes(fastify, opts, next) {
    fastify.get('/aggregate-ilp/xrp', async (request, reply) => {
        //console.log("query params for /aggregate-ilp/xrp: " + JSON.stringify(request.query));
        try {
            let aggregateResult = await Aggregate(JSON.stringify(request.query), { _id: null, amount: { $sum: "$amount" }}, {amount:-1});
            //console.log("/aggregate/xrp Result: " + JSON.stringify(aggregateResult));

            if(aggregateResult) {
                return { amount: aggregateResult.length > 0 ? aggregateResult[0].amount : 0}
            } else {
                reply.code(500).send('Something went wrong. Please check your query params');  
            }
        } catch(err) {
            console.log(JSON.stringify(err));
            reply.code(500).send('Exception occured. Please check your query params');
        }
    });

    fastify.get('/aggregate-ilp/xrp/mostReceived', async (request, reply) => {
        //console.log("query params for /aggregate-ilp/xrp/mostReceived: " + JSON.stringify(request.query));
        try {
            let aggregateResult = await Aggregate(JSON.stringify(request.query), { _id: { user: {$toLower: "$user"}, network: {$toLower: "$network"}, id: "$user_id" }, userName: {$first: '$user'}, amount: {"$sum": "$amount"}},{amount:-1});
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

    fastify.get('/aggregate-ilp/xrp/leastReceived', async (request, reply) => {
        //console.log("query params for /aggregate-ilp/xrp/mostReceived: " + JSON.stringify(request.query));
        try {
            let aggregateResult = await Aggregate(JSON.stringify(request.query), { _id: { user: {$toLower: "$user"}, network: {$toLower: "$network"}, id: "$user_id" }, userName: {$first: '$user'}, amount: {"$sum": "$amount"}},{amount:1});
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

    next()
}

async function Aggregate(filter:any, groupOptions: any, sortOptions?: any): Promise<any> {
    let parsedFilter = JSON.parse(filter);
    
    if(tipbotModel) {
        try {
            let queryParams:utils.QUERYBUILDER = utils.buildQuery(parsedFilter);

            let aggregateQuerty:any[] = [];
            if(queryParams.filter)
                aggregateQuerty.push({$match: queryParams.filter});

            if(groupOptions)
                aggregateQuerty.push({ $group: groupOptions });

            if(sortOptions)
                aggregateQuerty.push({ $sort: sortOptions});

            //console.time("dbTimeAggregateILP: "+JSON.stringify(aggregateQuerty));
            let mongoResult:any[] = await tipbotModel.aggregate(aggregateQuerty, queryParams.options).toArray();
            //console.timeEnd("dbTimeAggregateILP: "+JSON.stringify(aggregateQuerty));

            return mongoResult;

        } catch(err) {
            console.log(err);
            return null;
        }
    } else
        return null;
}