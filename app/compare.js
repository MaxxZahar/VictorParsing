const comparePaths = require('./tpaths');
const mainPaths = require('./fpaths');

function findSimilarKeys(keys1, keys2) {
    const similarKeys = [];
    for (const key1 of keys1) {
        for (const key2 of keys2) {
            if (key1 === key2) {
                similarKeys.push(key1);
            }
        }
    }
    return similarKeys;
}

console.log(findSimilarKeys(Object.keys(mainPaths), Object.keys(comparePaths)));