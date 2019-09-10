import { Collection } from 'mongodb';
import * as db from '../db';
import * as utils from '../utils';

var tipbotModel: Collection<any>;

export async function init() {
    tipbotModel = await db.getNewDbModelTipsStandarized();
}

export async function registerRoutes(fastify, opts, next) {
    fastify.get('/count', async (request, reply) => {
        //console.log("query params for /count: " + JSON.stringify(request.query));
        try {
            let countResult = await Count(JSON.stringify(request.query), { _id: null, count: { $sum: 1 }}, {count:-1});
            //console.log("/count Result: " + JSON.stringify(countResult));
            //check if we have a count result
            if(countResult) {
                return { count: countResult.length > 0 ? countResult[0].count : 0}
            } else {
                reply.code(500).send('Something went wrong. Please check your query params');  
            }
        } catch(err) {
            console.log(JSON.stringify(err));
            reply.code(500).send('Exception occured. Please check your query params');
        }
    });

    fastify.get('/count/mostReceivedFrom', async (request, reply) => {
        //console.log("query params for /count/mostReceivedFrom: " + JSON.stringify(request.query));
        request.query.user_id = {"$ne":null}
        try {
            let countResult = await Count(JSON.stringify(request.query), { _id: { user: {$toLower: "$user"}, network: {$toLower: "$user_network"}, id: "$user_id"}, userName: {$first: '$user'}, count: {"$sum": 1}},{count:-1});
            //console.log("/count/mostReceivedFrom Result: " + JSON.stringify(countResult));

            if(countResult) {
                return { result: countResult}
            } else {
                reply.code(500).send('Something went wrong. Please check your query params');  
            }
        } catch(err) {
            console.log(JSON.stringify(err));
            reply.code(500).send('Something went wrong. Please check your query params');
        }
    });

    fastify.get('/count/mostSentTo', async (request, reply) => {
        //console.log("query params for /count/mostSentTo: " + JSON.stringify(request.query));
        try {
            request.query.to_id = {"$ne":null}
            let countResult = await Count(JSON.stringify(request.query), { _id: { user: {$toLower: "$to"}, network: {$toLower: "$to_network"}, id: "$to_id"}, userName: {$first: '$to'}, count: {"$sum": 1}},{count:-1});
            //console.log("/count/mostSentTo Result: " + JSON.stringify(countResult));

            if(countResult) {
                return { result: countResult}
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

async function Count(filter:any, groupOptions: any, sortOptions?: any): Promise<any> {
    let parsedFilter = JSON.parse(filter);
    
    if(tipbotModel) {
        try {
            let aggregateQuerty:any[] = [];
            let queryParams:utils.QUERYBUILDER = utils.buildQuery(parsedFilter);
            if(queryParams.filter)
                aggregateQuerty.push({$match: queryParams.filter});

            if(groupOptions)
                aggregateQuerty.push({ $group: groupOptions })

            if(sortOptions)
                aggregateQuerty.push({ $sort: sortOptions})

            //console.time("dbTimeCount: "+JSON.stringify(aggregateQuerty));
            let mongoResult:any[] = await tipbotModel.aggregate(aggregateQuerty, queryParams.options).toArray();
            //console.timeEnd("dbTimeCount: "+JSON.stringify(aggregateQuerty));

            return mongoResult;

        } catch(err) {
            console.log(err);
            return null;
        }
    } else
        return null;
}