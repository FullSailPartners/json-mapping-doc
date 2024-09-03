const parseMap = (mapObject, inData) => {
    // helper function to check if a value is an object {}.
    const isObj = (e) => (typeof e === 'object' && e !== null && !Array.isArray(e));
    // helper function to build the map stack values.
    const buildStack = (cur, next) => {
        return {
            value: next,
            index: cur.index + 1
        };
    };

    // Define our stacks to hold processing data ...
    const outData = {};
    const mapStack = [];
    // ... push the map object to the map stack ...
    mapStack.push(buildStack({ index: -1 }, mapObject));

    const dataStack = [];
    // ... and the input data to the data stack ...
    dataStack.push(inData);

    // ... then for each value in the stack ...
    let map = null;
    let data = null;
    const scopedData = {};
    do {
        // ... save our initial variables ...
        const stack = mapStack.pop();
        map = stack.value;
        data = dataStack.pop();

        if (map.scope) {
            scopedData[map.scope] = data;
        }

        const getValue = (data, path) => {
            let outData = data;
            // ... then if the path is an array ...
            if (Array.isArray(path)) {
                // ... for each part of the path ...
                for (let i = 0; i < path.length; i++) {
                    // ... if cond data is null ...
                    if (outData == null) {
                        // ... exit the loop ...
                        break;
                    }

                    // ... otherwise set cond data to the next depth along
                    // the path ...
                    outData = outData[path[i]];
                }
            } else {
                // ... otherwise, just set cond data to the value at the path ...
                outData = outData[path];
            }

            return outData;
        };

        // ... define our helper function for checking conditions ...
        const checkCondition = (condition, join = null) => {
            // If this is an array of conditions ...
            if (Array.isArray(condition)) {
                // join notes
                // last value in array is used as the join for
                // all values in the array
                // in the set: [[A, B], [C, D]], the join value of
                // D will be used to combine AB and CD.
                // Also, A will be used to join AB, while C is used to join CD.
                // In this case, B will not be used.

                // ... if the  join object does not exist ...
                if (!join) {
                    // ... create it with the default ...
                    join = {op: "&&"};
                }

                // ... then for each condition ...
                let overall = -1;
                for (let i = 0; i < condition.length; i++) {
                    const cond = condition[i];
                    // ... run it through the check method ...
                    let res = checkCondition(cond, join);
                    // ... if overall is set ...
                    if (overall != -1) {
                        // ... then check the join value and append to result ...
                        switch(join.op) {
                            case "||":
                                overall ||= res;
                                break;
                            case "&&":
                            default:
                                overall &&= res;
                                break;
                        }
                    } else {
                        // ... otherwise set overall as the first result ...
                        overall = res;
                    }

                    // ... then if this is a condition and not any array ...
                    if (!Array.isArray(cond)) {
                        // ... set the join for the next operation ...
                        join.op = cond.join || '&&';
                    }
                }

                // ... then return the overall result.
                return overall;
            }

            // ... otherwise, start processing a single condition ...

            // ... setup the cond data variable ...
            let condData = (condition.check || "input") == "input"
                ? scopedData[condition.scope] || inData
                : outData;

            // ... and defined the path ...
            const path = condition.property;
            condData = getValue(condData, path);

            // ... then for each op type, get a result ...
            let res = false;
            switch (condition.op) {
                case "&&":
                    res = condData && condition.value;
                    break;
                case "||":
                    res = condData || condition.value;
                    break;
                case "<":
                    res = condData < condition.value;
                    break;
                case "<=":
                    res = condData <= condition.value;
                    break;
                case ">":
                    res = condData > condition.value;
                    break;
                case ">=":
                    res = condData >= condition.value;
                    break;
                case "==":
                    res = condData == condition.value;
                    break;
                case "null":
                    res = condData === null;
                    break;
                case "empty":
                    res = !condData;
                    break;
                default:
                    return false;
            }

            // ... if this is a not operation, flip the result,
            // otherwise return it.
            return condition.not ? !res : res;
        };

        // ... helper function for conversions ...
        const convertValue = (value, token, stage) => {
            const opt = stage == 'pre' ? token.convert?.pre : token.convert?.post;

            let val = value;
            switch (opt) {
                case "number":
                    val = Number(val);
                    break;
                case "string":
                    val = String(val);
                    break;
            }

            return val;
        };

        // ... helper function for math ...
        const doMath = (value, token) => {
            // ... get the op ...
            const op = token.math?.op;

            // ... if there is none, return the value ...
            if (!op) {
                return value;
            }

            // ... otherwise order the params ...
            const order = [token.math.a, token.math.b]
                .map(e => e == "input" ? value : e)
                .filter(e => e != null);

            // ... then do some math ...
            let val = value;
            switch (op) {
                case "+":
                    val = order[0] + order[1];
                    break;
                case "-":
                    val = order[0] - order[1];
                    break;
                case "*":
                    val = order[0] * order[1];
                    break;
                case "/":
                    val = order[0] / order[1];
                    break;
                case "%":
                    val = order[0] + order[1];
                    break;
                case "^":
                    val = Math.pow(order[0], order[1]);
                    break;
            }

            // ... and return the value ...
            return val;
        };

        // ... define the helper for modifying values ...
        const modifyValue = (curData, key, next, token) => {
            next = convertValue(next, token, 'pre');
            next = doMath(next, token);

            // ... if modify does not exist ...
            if (!token.modify) {
                // ... then set the value and exit ...
                curData[key] = convertValue(next, token, 'post');
                return;
            }

            // ... get the current data ...
            let cur = curData[key];

            // ... if the current value is null ...
            if (cur == null) {
                // ... and modify should create missing values ...
                if (token.modify.createIfMissing) {
                    // ... apply the value normally ...
                    curData[key] = next;
                }

                // ... then/otherwise exit.
                return;
            }

            // ... otherwise perform an operation ...
            let newVal = null;
            switch (token.modify.op) {
                case "add":
                    newVal = cur + next;
                    break;
                case "sub":
                    newVal = cur - next;
                    break;

                // the following two operations will auto-convert
                // to string during array.join()
                case "append":
                    newVal = [cur, next].join(token.modify.spacer);
                    break;
                case "prepend":
                    newVal = [next, cur].join(token.modify.spacer);
                    break;
            }

            // ... the set the new value.
            curData[key] = convertValue(newVal, token, 'post');
        };

        // ... define our helper function for adding values ...
        const addValue = (elem, value, token) => {
            // ... if the value is not an array ...
            if (!Array.isArray(elem)) {
                // ... if it does, modify the value ...
                modifyValue(outData, elem, value, token);
                return;
            }

            // ... if it is an array of arrays ...
            if (elem.length > 0 && Array.isArray(elem[0])) {
                // ... then run add value for each array ...
                for (let i = 0; i < elem.length; i++) {
                    const e = elem[i];
                    addValue(e, value, token);
                }

                // ... and return.
                return;
            }

            // ... otherwise, for each elem in the array ...
            let curData = outData;
            for (let i = 0; i < elem.length - 1; i++) {
                const e = elem[i];
                // ... create it as an object if it does not exist ...
                if (!curData[e]) {
                    // ... if modify indicates no new values should be created ...
                    if (token.modify && !token.modify.createIfMissing) {
                        // .. then set the data to null and break out of the loop ...
                        curData = null;
                        break;
                    }

                    curData[e] = {};
                }

                // ... and assign the new object to the current data ...
                curData = curData[e];
            }

            // ... if cur data is null, do nothing and return ...
            if (!curData) {
                return;
            }

            // ... if it does, modify the value ...
            modifyValue(curData, elem[elem.length - 1], value, token);
        };

        const addToDefaultListIfNeeded = () => {
            if (map.type != 'value' 
                || map.default == undefined 
                || map.default == null) {
                return;
            }

            const curVal = getValue(outData, map.property);
            if (curVal != undefined) {
                return;
            }

            // addValue(map.property, map.default, map);
            // ... otherwise, expand the value shorthand ...
            const valueMap = {
                "type": "value",
                "property": map.property,
                "condition": {
                    "op": "empty",
                    "not": false,
                    "property": map.property,
                    "check": "output"
                }
            }

            // ... and push it to the stack ...
            const nextStack = buildStack(stack, valueMap);
            const valueMapRaw = JSON.stringify(nextStack);

            // ... we dont need to add things twice ...
            if (mapStack.some(e => JSON.stringify(e) == valueMapRaw)) {
                return;
            }

            mapStack.unshift(nextStack);
            dataStack.unshift(map.default);
        }

        // ... first, check to see if we have a condition to evaluate ...
        if (map.condition && !checkCondition(map.condition)) {
            // ... and if it fails, continue to the next ...
            addToDefaultListIfNeeded();
            continue;
        }

        // ... then check the map type ...
        switch (map.type) {
            // ... if it is a map ...
            case 'map':
                // ... reverse the keys so they are inserted
                // in to the stack in the right order...
                const mapObj = map.map;
                const keys = Object.keys(mapObj);
                keys.reverse();
                // ... then for each key ...
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    // ... make sure it exists ...
                    if (Object.hasOwnProperty.call(mapObj, key)) {
                        // ... then get the element ...
                        let elemSet = mapObj[key];
                        // ... if it is not an array of values ...
                        if (!Array.isArray(elemSet)) {
                            // ... make it an array of values 
                            elemSet = [elemSet];
                        }

                        // ... and if it is an array of objects ...
                        if (isObj(elemSet[0])) {
                            // ... reverse the set to keep order ...
                            elemSet.reverse();

                            // ... the for each object ...
                            for (let x = 0; x < elemSet.length; x++) {
                                // ... get the element ...
                                const elem = elemSet[x];

                                if (map.type != 'obj-set') {
                                    const arraysAllowed = (map.array || true);
                                    let nextData = data[key];
                                    // ... if the data is an array and arrays are not allowed ...
                                    if (Array.isArray(nextData) && !arraysAllowed) {
                                        // ... go to the next item ...
                                        continue;
                                    }

                                    // ... otherwise, if the data is not an array ...
                                    if (!Array.isArray(nextData)) {
                                        // ... make it one for processing ...
                                        nextData = [nextData];
                                    } else {
                                        // ... or reverse the array to ensure top to bottom processing ...
                                        nextData.reverse();
                                    }

                                    // ... then build the next stack ...
                                    const nextStack = buildStack(stack, elem);

                                    // ... and for each bit of data ...
                                    for (let dataIndex = 0; dataIndex < nextData.length; dataIndex++) {
                                        const nextDataPart = nextData[dataIndex];

                                        // ... push it to the stacks ...
                                        mapStack.push(nextStack);
                                        dataStack.push(nextDataPart);
                                    }
                                } else {
                                    // ... push it to the stack and
                                    // do processing on it ...
                                    const nextStack = buildStack(stack, elem);
                                    mapStack.push(nextStack);
                                    dataStack.push(data[key]);
                                }
                            }
                        } else {
                            // ... otherwise, expand the value shorthand ...
                            const valueMap = {
                                "type": "value",
                                "property": elemSet
                            }

                            // ... and push it to the stack ...
                            const nextStack = buildStack(stack, valueMap);
                            mapStack.push(nextStack);
                            dataStack.push(data[key]);
                        }
                    }
                }
                break;

            // ... if it is a code value ...
            case 'code':
                // ... get the codes ...
                let codified = map.code[data];
                // ... and add a value ...
                addValue(map.property, codified, map);
                break;

            // ... if it is an object array ...
            case 'obj-array':
                // ... define a new map ...
                let newMap = {
                    "type": "map",
                    // ... pass the map config in ...
                    "map": map.map
                }

                // ... using the existing key/value data, build a custom
                // set of data for the map ...
                let newData = {};
                for (let i = 0; i < data.length; i++) {
                    const obj = data[i];
                    newData[obj[map.dataMap.key]] = obj[map.dataMap.value];
                }

                // ... then push the map and data to the stack ...
                const nextStack = buildStack(stack, newMap);
                mapStack.push(nextStack);
                dataStack.push(newData)
                break;

            case 'value':
                // ... add a value ...
                addValue(map.property, data, map);
                break;

            case 'raw':
                // ... if raw, use the set value in the map to
                // pass it to the add value func ...
                addValue(map.property, map.value, map);
                break;

            case null:
                // ... if no type, do nothing ...
                break;
        }

        // ... then set a default if we need it to be set ...
        addToDefaultListIfNeeded();

        // ... continue until the map stack is empty ...
    } while (mapStack.length > 0);

    // ... finally, return our output.
    return outData;
};

import { isMain } from './lib/utils.js';
import { readFileSync } from 'fs';

if (isMain(import.meta.url)) {
    const map = JSON.parse(readFileSync(process.argv[2], 'utf-8'));
    const inData = JSON.parse(readFileSync(process.argv[3], 'utf-8'));

    console.log(parseMap(map, inData));

    console.log('done');
}

export function runParseMap(map, data) {
    return parseMap(map, data);
}
