"use strict";
// Ripped from https://www.npmjs.com/package/typescript-memoize, maybe move to npm but dont want external deps for 100 lines of code
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoizeExpiring = exports.Memoize = void 0;
function Memoize(autoHashOrHashFn) {
    return (target, propertyKey, descriptor) => {
        if (descriptor.value != null) {
            descriptor.value = getNewFunction(descriptor.value, autoHashOrHashFn);
        }
        else if (descriptor.get != null) {
            descriptor.get = getNewFunction(descriptor.get, autoHashOrHashFn);
        }
        else {
            throw "Only put a Memoize() decorator on a method or get accessor.";
        }
    };
}
exports.Memoize = Memoize;
function MemoizeExpiring(duration, autoHashOrHashFn) {
    return (target, propertyKey, descriptor) => {
        if (descriptor.value != null) {
            descriptor.value = getNewFunction(descriptor.value, autoHashOrHashFn, duration);
        }
        else if (descriptor.get != null) {
            descriptor.get = getNewFunction(descriptor.get, autoHashOrHashFn, duration);
        }
        else {
            throw "Only put a Memoize() decorator on a method or get accessor.";
        }
    };
}
exports.MemoizeExpiring = MemoizeExpiring;
let counter = 0;
function getNewFunction(originalMethod, autoHashOrHashFn, duration = 0) {
    const identifier = ++counter;
    // The function returned here gets called instead of originalMethod.
    return function (...args) {
        const propValName = `__memoized_value_${identifier}`;
        const propMapName = `__memoized_map_${identifier}`;
        let returnedValue;
        if (autoHashOrHashFn || args.length > 0 || duration > 0) {
            // Get or create map
            if (!this.hasOwnProperty(propMapName)) {
                Object.defineProperty(this, propMapName, {
                    configurable: false,
                    enumerable: false,
                    writable: false,
                    value: new Map(),
                });
            }
            let myMap = this[propMapName];
            let hashKey;
            // If true is passed as first parameter, will automatically use every argument, passed to string
            if (autoHashOrHashFn === true) {
                hashKey = args.map((a) => a.toString()).join("!");
            }
            else if (autoHashOrHashFn) {
                hashKey = autoHashOrHashFn.apply(this, args);
            }
            else {
                hashKey = args[0];
            }
            const timestampKey = `${hashKey}__timestamp`;
            let isExpired = false;
            if (duration > 0) {
                if (!myMap.has(timestampKey)) {
                    // "Expired" since it was never called before
                    isExpired = true;
                }
                else {
                    let timestamp = myMap.get(timestampKey);
                    isExpired = Date.now() - timestamp > duration;
                }
            }
            if (myMap.has(hashKey) && !isExpired) {
                returnedValue = myMap.get(hashKey);
            }
            else {
                returnedValue = originalMethod.apply(this, args);
                myMap.set(hashKey, returnedValue);
                if (duration > 0) {
                    myMap.set(timestampKey, Date.now());
                }
            }
        }
        else {
            if (this.hasOwnProperty(propValName)) {
                returnedValue = this[propValName];
            }
            else {
                returnedValue = originalMethod.apply(this, args);
                Object.defineProperty(this, propValName, {
                    configurable: false,
                    enumerable: false,
                    writable: false,
                    value: returnedValue,
                });
            }
        }
        return returnedValue;
    };
}
//# sourceMappingURL=memoize.js.map