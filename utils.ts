
export function asyncLoopP(array, iter) {
    return new Promise((resolve, reject) => asyncLoop(array, iter, () => resolve()));
}

function asyncLoop(array, iter, complete, index = 0) {
    if (index >= array.length) complete();
    else iter(array[index], () => asyncLoop(array, iter, complete, ++index));
}