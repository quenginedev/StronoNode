function isString (value) {
    return typeof value === 'string' || value instanceof String;
}

function isNumber (value) {
    return typeof value === 'number' && isFinite(value);
}

function isFunction(value){
    return typeof value === 'function'
}

function isArray(value){
    return Array.isArray(value);
}

function isObject(value){
    return value && typeof value === 'object' && value.constructor === Object
}

function isBoolean (value) {
    return typeof value === 'boolean';
}

function isDate (value) {
    return value instanceof Date;
}

function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function camelCase(value) {
    return value.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
}

function objectId () {
    return hex(Date.now() / 1000) +
      ' '.repeat(16).replace(/./g, () => hex(Math.random() * 16))
}

function hex (value) {
    return Math.floor(value).toString(16)
}

module.exports = {
    isArray,
    isNumber,
    isFunction,
    isDate,
    isString,
    isObject,
    isBoolean,
    objectId,
    camelCase,
    capitalize
}
