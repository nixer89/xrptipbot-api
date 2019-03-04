import { Model } from 'mongoose';
import * as db from '../db';

var tipbotModel: Model<any>;

export async function registerRoute(fastify, opts, next) {
    fastify.get('/aggregateXRP', async (request, reply) => {
        console.log("query params: " + JSON.stringify(request.query));
        try {
            let aggregateResult = await Aggregate(JSON.stringify(request.query));
            console.log("aggregateResult: " + JSON.stringify(aggregateResult));
            if(aggregateResult>=0) {
                console.log("number of documents with filter: '" + JSON.stringify(request.query)+ "' is: "+ aggregateResult);
                return { xrp: aggregateResult}
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

async function Aggregate(filter:any): Promise<number> {
    filter = JSON.parse(filter);
    
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

            console.log("Calling aggregate db with filter: " + JSON.stringify(finalFilter));
            let mongoResult = await tipbotModel.aggregate([
                { $match: finalFilter },
                { $group: { _id: null, xrp: { $sum: "$xrp" } } }
            ]);

            console.log("aggregate result: " + JSON.stringify(mongoResult));

            if(mongoResult && mongoResult.length>0)
                return mongoResult[0].xrp;
            else
                return failedResult;
        } catch(err) {
            console.log(err);
            return failedResult;
        }
    } else
        return failedResult;
}