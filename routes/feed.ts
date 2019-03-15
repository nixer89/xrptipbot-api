import { Model } from 'mongoose';
import * as db from '../db';

var tipbotModel: Model<any>;

export async function registerRoutes(fastify, opts, next) {
    fastify.get('/feed', async (request, reply) => {
        //console.log("query params: " + JSON.stringify(request.query));
        try {
            let feedResult = await getFeed(JSON.stringify(request.query));
            if(feedResult) {
                //console.log("feed length: " + feedResult.length);
                return { feed: feedResult}
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

async function getFeed(filter:any): Promise<any[]> {
    filter = JSON.parse(filter);
    
    if(tipbotModel) {
        try {
            let filterWithOperatorAnd:any[] = [];

            if(filter.user)
                filter.user = { $regex: "^"+filter.user+"$", $options: "i" }

            if(filter.to)
                filter.to = { $regex: "^"+filter.to+"$", $options: "i" }

            let limit:number;
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

            let result_fields:string;
            if(filter.result_fields) {
                result_fields = filter.result_fields.trim().replace(/,/g,' ');
                delete filter.result_fields;
            }

            let finalFilter:any;
            if(filterWithOperatorAnd.length>0) {
                filterWithOperatorAnd.push(filter)
                finalFilter = {$and: filterWithOperatorAnd}
            } else
                finalFilter = filter;

            //console.log("Calling db with finalFilter: " + JSON.stringify(finalFilter) + " , result_field: '" + result_fields + "' and limit: " +limit);
            let mongoResult:any[] = await tipbotModel.find(finalFilter, result_fields).sort({momentAsDate:-1}).limit(limit).exec();

            if(mongoResult) return mongoResult
            else return null;
        } catch(err) {
            console.log(err);
            return null;
        }
    } else
        return null;
}