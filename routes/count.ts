import { Model } from 'mongoose';
import * as db from '../db';

var tipbotModel: Model<any>;

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
    filter = JSON.parse(filter);
    
    if(tipbotModel) {
        try {
            let filterWithOperatorAnd:any[] = [];
            
            if(filter.user)
                filter.user = { $regex: "^"+filter.user+"$", $options: "i" }

            if(filter.to)
                filter.to = { $regex: "^"+filter.to+"$", $options: "i" }

            if(filter.excludeUser) {
                filterWithOperatorAnd.push({user_id: {$nin: JSON.parse(filter.excludeUser)}});
                filterWithOperatorAnd.push({to_id: {$nin: JSON.parse(filter.excludeUser)}});
                delete filter.excludeUser;
            }

            let limit:number= 1000000;
            if(filter.limit) {
                limit = parseInt(filter.limit);
                if(isNaN(limit) || limit==0)
                    return null;

                delete filter.limit;
            }

            if(filter.xrp) {
                if(isNaN(filter.xrp)) {
                    if(filter.xrp.includes('>='))
                        filterWithOperatorAnd.push({xrp: {$gte: filter.xrp.substring(2)}});
                    else if(filter.xrp.includes('<='))
                        filterWithOperatorAnd.push({xrp: {$lte: filter.xrp.substring(2)}});
                    else if(filter.xrp.includes('>'))
                        filterWithOperatorAnd.push({xrp: {$gt: filter.xrp.substring(1)}});
                    else if(filter.xrp.includes('<'))
                        filterWithOperatorAnd.push({xrp: {$lt: filter.xrp.substring(1)}});
                    delete filter.xrp;
                }
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

            //console.log("Calling count db with filter: " + JSON.stringify(finalFilter));
            //console.time("dbTimeCount"+JSON.stringify(finalFilter));
            let mongoResult = await tipbotModel.aggregate([
                { $match: finalFilter },
                { $group: groupOptions }
            ]).sort(sortOptions).limit(limit).exec();
            //console.timeEnd("dbTimeCount"+JSON.stringify(finalFilter));

            //console.log("aggregate result: " + JSON.stringify(mongoResult));

            return mongoResult;

        } catch(err) {
            console.log(err);
            return null;
        }
    } else
        return null;
}