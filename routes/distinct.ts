import { Model } from 'mongoose';
import * as db from '../db';

var tipbotModel: Model<any>;

export async function registerRoutes(fastify, opts, next) {
    fastify.get('/distinct', async (request, reply) => {
        console.log("query params for /distinct: " + JSON.stringify(request.query));
        try {
            let distinctResult = await Distinct(JSON.stringify(request.query));
            //console.log("/count Result: " + JSON.stringify(countResult));
            //check if we have a count result
            if(distinctResult) {
                return { distinctCount: distinctResult.length}
            } else {
                reply.code(500).send('Something went wrong. Please check your query params');  
            }
        } catch(err) {
            console.log(JSON.stringify(err));
            reply.code(500).send('Exception occured. Please check your query params');
        }
    });

    next()
}

export async function init() {
    tipbotModel = await db.getNewDbModelTips();
}

async function Distinct(filter:any): Promise<any> {
    filter = JSON.parse(filter);
    
    if(tipbotModel && filter.distinct) {
        try {
            let filterWithOperatorAnd:any[] = [];

            let distinctField = filter.distinct;
            delete filter.distinct;
            
            if(filter.user)
                filter.user = { $regex: "^"+filter.user+"$", $options: "i" }

            if(filter.to)
                filter.to = { $regex: "^"+filter.to+"$", $options: "i" }

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

            console.log("Calling distinct db with filter: " + JSON.stringify(finalFilter) + " and distinctField: " + distinctField);
            let mongoResult = await tipbotModel.distinct(distinctField,finalFilter).exec();

            //console.log("aggregate result: " + JSON.stringify(mongoResult));

            return mongoResult;

        } catch(err) {
            console.log(err);
            return null;
        }
    } else
        return null;
}