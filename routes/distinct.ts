import { Collection } from 'mongodb';
import * as db from '../db';
import * as utils from '../utils';

var tipbotModel: Collection<any>;

export async function init() {
    tipbotModel = await db.getNewDbModelTipsStandarized();
}

export async function registerRoutes(fastify, opts, next) {
    fastify.get('/distinct', async (request, reply) => {
        //console.log("query params for /distinct: " + JSON.stringify(request.query));
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

async function Distinct(filter:any): Promise<any> {
    let parsedFilter = JSON.parse(filter);
    
    if(tipbotModel && parsedFilter.distinct) {
        try {
            let queryParams:utils.QUERYBUILDER = utils.buildQuery(parsedFilter);

            let distinctField = filter.distinct;
            delete filter.distinct;
            
            //console.time("dbTimeDistinct: "+JSON.stringify(finalFilter)+" || DISTINCTFIELD: "+distinctField);
            let mongoResult = await tipbotModel.distinct(distinctField,queryParams.filter);
            //console.timeEnd("dbTimeDistinct: "+JSON.stringify(finalFilter)+" || DISTINCTFIELD: "+distinctField)

            return mongoResult;

        } catch(err) {
            console.log(err);
            return null;
        }
    } else
        return null;
}