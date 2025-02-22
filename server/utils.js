import { SINGULAR_KEYS } from "./constants.js";

export const createQueryObj = (query) => {
    let queryObj = {};
    let queryKeys = Object.keys(query);

    for(let key of queryKeys) {
        if(!SINGULAR_KEYS.includes(key)) {
            queryObj[key] = {
                "$regex": query[key],
                "$options": "i"
            }
        } else if(key === 'tags'){
            queryObj[key] = {
                $in: query[key].split(',').map(ele => ele.trim())
            }
        } else if(key === 'from') {
            queryObj['created_at'] = {
                $gte: new Date(+query[key])
            };
            if(queryKeys.includes('to')) {
                queryObj.created_at["$lte"] = new Date(+query['to'])
            }
        }
    }
}

export const catchAsyncErrors = resolver => async(parent, args, context, info) => {
    try {
        return await resolver(parent, args, context, info);
    }
    catch(error) {
        console.error("Error:   ", error);
        throw new Error(error.message || "Internal Server Error");
    }
}

