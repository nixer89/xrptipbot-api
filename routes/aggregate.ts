import { Collection } from 'mongodb';
import * as db from '../db';

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
    filter = JSON.parse(filter);
    //console.log("received filter: " + JSON.stringify(filter));
    
    if(tipbotModel) {
        try {
            let filterWithOperatorAnd:any[] = [];

            let textSearch;

            if(filter.user) {
                textSearch = filter.user;
                filter.user = { $regex: "^"+filter.user+"$", $options: "i" }
            }

            if(filter.to) {
                textSearch = filter.to;
                filter.to = { $regex: "^"+filter.to+"$", $options: "i" }
            }

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

            let normalFilter:any;
            if(filterWithOperatorAnd.length>0) {
                filterWithOperatorAnd.push(filter)
                normalFilter = {$and: filterWithOperatorAnd}
            } else
                normalFilter = filter;

            let finalFilter;
            if(textSearch) {
                finalFilter = {$and:[{$text: {$search: textSearch}},normalFilter]}
            } else
                finalFilter = normalFilter;

            let aggregateQuerty:any[] = [];
            if(finalFilter)
                aggregateQuerty.push({$match: finalFilter});

            if(groupOptions)
                aggregateQuerty.push({ $group: groupOptions })


            //console.log("Calling aggregate db with filter: " + JSON.stringify(finalFilter) + " and group options: " + JSON.stringify(groupOptions));
            //console.time("dbTimeAggregate: "+JSON.stringify(finalFilter)+" || GROUPOPTIONS: "+JSON.stringify(groupOptions)+" || SORTOPTIONS: "+JSON.stringify(sortOptions));
            let mongoResult:any[];
            if(limit)
                mongoResult = await tipbotModel.aggregate(aggregateQuerty).sort(sortOptions).limit(limit).toArray();
            else
                mongoResult = await tipbotModel.aggregate(aggregateQuerty).sort(sortOptions).toArray();
            //console.timeEnd("dbTimeAggregate: "+JSON.stringify(finalFilter)+" || GROUPOPTIONS: "+JSON.stringify(groupOptions)+" || SORTOPTIONS: "+JSON.stringify(sortOptions));

            //console.log("aggregate db result: " + JSON.stringify(mongoResult));

            return mongoResult;

        } catch(err) {
            console.log(err);
            return null;
        }
    } else
        return null;
}