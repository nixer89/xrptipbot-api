export interface QUERYBUILDER {
    filter: any;
    options: any;
}

export function buildQuery(filter): QUERYBUILDER {

    let returnValue:QUERYBUILDER = {
        filter: {},
        options: {}
    };

    let filterWithOperatorAnd:any[] = [];
    let options:any = {};

    let textSearch;

    if(filter.user) {
        textSearch = filter.user;
        filter.user = { $regex: "^"+filter.user+"$", $options: "i" }
    }

    if(filter.to) {
        if(!textSearch)
            textSearch = filter.to;
        
        filter.to = { $regex: "^"+filter.to+"$", $options: "i" }
    }

    if(filter.excludeUser) {
        filterWithOperatorAnd.push({user_id: {$nin: JSON.parse(filter.excludeUser)}});
        filterWithOperatorAnd.push({to_id: {$nin: JSON.parse(filter.excludeUser)}});
        delete filter.excludeUser;
    }

    if(filter.limit) {
        let limit = parseInt(filter.limit);
        if(isNaN(limit) || limit==0)
            return null;
        else
            options.limit = limit

        delete filter.limit;
    }

    if(filter.xrp) {
        if(!isNaN(filter.xrp)) {
            filterWithOperatorAnd.push({xrp: {$eq: Number(filter.xrp)}});
        } else {
            if(filter.xrp.includes('>='))
                filterWithOperatorAnd.push({xrp: {$gte: Number(filter.xrp.substring(2))}});
            else if(filter.xrp.includes('<='))
                filterWithOperatorAnd.push({xrp: {$lte: Number(filter.xrp.substring(2))}});
            else if(filter.xrp.includes('>'))
                filterWithOperatorAnd.push({xrp: {$gt: Number(filter.xrp.substring(1))}});
            else if(filter.xrp.includes('<'))
                filterWithOperatorAnd.push({xrp: {$lt: Number(filter.xrp.substring(1))}});
            else
                return null; //abort in case some weird stuff is typed in as xrp filter
        }

        delete filter.xrp;
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

    
    if(filter.result_fields) {
        let projection = {};
        let fields:any[] = filter.result_fields.split(',');
        fields.forEach(field => projection[field] = 1);

        options.projection = projection;
        delete filter.result_fields;
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

    returnValue.filter = finalFilter;
    returnValue.options = options;

    return returnValue;
}

export function checkParamsValidity(queryParams:string) : boolean {
    let paramsAreOk = true;

    let filter = JSON.parse(queryParams);

    let limit = -1;
    if(filter.limit) {
        limit = parseInt(filter.limit);
    }

    if((isNaN(limit) || limit<=0 || limit > 10000) && !filter.to && !filter.to_id && !filter.user && !filter.user_id && !filter.from_date && !filter.to_date)
            paramsAreOk = false;

    return paramsAreOk;
}