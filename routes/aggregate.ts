import { Collection } from 'mongodb';
import * as db from '../db';
import * as utils from '../utils';

var tipbotModel: Collection<any>;

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
            let aggregateResult = await Aggregate(JSON.stringify(request.query), { _id: { user: {$toLower: "$user"}, network: {$toLower: "$user_network"}, id: "$user_id" }, userName: {$first: '$user'}, xrp: {"$sum": "$xrp"}},{xrp:-1});
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
            let aggregateResult = await Aggregate(JSON.stringify(request.query), { _id: { user: {$toLower: "$to"}, network: {$toLower: "$to_network"}, id: "$to_id" }, userName: {$first: '$to'}, xrp: {"$sum": "$xrp"}},{xrp:-1});
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
    let parsedFilter = JSON.parse(filter);
    //console.log("received filter: " + JSON.stringify(filter));
    
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

            //console.time("dbTimeAggregate: "+JSON.stringify(aggregateQuerty));
            let mongoResult:any[] = await tipbotModel.aggregate(aggregateQuerty, queryParams.options).toArray();
            //console.timeEnd("dbTimeAggregate: "+JSON.stringify(aggregateQuerty));

            return mongoResult;

        } catch(err) {
            console.log(err);
            return null;
        }
    } else
        return null;
}