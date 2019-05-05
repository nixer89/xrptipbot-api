export function generateDbFilter(filterByUser:any): any {

    let filterByUserWithOperatorAnd:any[] = [];

    if(filterByUser.user)
        filterByUser.user = { $regex: "^"+filterByUser.user+"$", $options: "i" }

    if(filterByUser.to)
        filterByUser.to = { $regex: "^"+filterByUser.to+"$", $options: "i" }

    if(filterByUser.xrp) {
        if(isNaN(filterByUser.xrp)) {
            if(filterByUser.xrp.includes('>='))
                filterByUserWithOperatorAnd.push({xrp: {$gte: filterByUser.xrp.substring(2)}});
            else if(filterByUser.xrp.includes('<='))
                filterByUserWithOperatorAnd.push({xrp: {$lte: filterByUser.xrp.substring(2)}});
            else if(filterByUser.xrp.includes('>'))
                filterByUserWithOperatorAnd.push({xrp: {$gt: filterByUser.xrp.substring(1)}});
            else if(filterByUser.xrp.includes('<'))
                filterByUserWithOperatorAnd.push({xrp: {$lt: filterByUser.xrp.substring(1)}});
            delete filterByUser.xrp;
        }
    }

    let from_date:Date;
    if(filterByUser.from_date) {
        from_date = new Date(filterByUser.from_date)
        filterByUserWithOperatorAnd.push({momentAsDate: {$gte: from_date}});
        delete filterByUser.from_date;
    }

    let to_date:Date;
    if(filterByUser.to_date) {
        to_date = new Date(filterByUser.to_date)
        filterByUserWithOperatorAnd.push({momentAsDate: {$lte: to_date}});
        delete filterByUser.to_date;
    }

    let dbFilter:any;
    if(filterByUserWithOperatorAnd.length>0) {
        filterByUserWithOperatorAnd.push(filterByUser)
        dbFilter = {$and: filterByUserWithOperatorAnd}
    } else {
        dbFilter = filterByUser;
    }

    return dbFilter;
}

export function checkLimitFilter(filter: any): number {
    let limit:number = 10000000;
    if(filter.limit) {
        if(isNaN(limit) || limit==0)
            limit = null;

        delete filter.limit;
    }

    return limit;
}