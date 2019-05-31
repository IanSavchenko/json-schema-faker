/*!
 * json-schema-faker v0.5.0-rc17
 * (c) Alvaro Cabrera <pateketrueke@gmail.com> (https://soypache.co)
 * Released under the MIT License.
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('util'), require('fs'), require('url'), require('http'), require('https'), require('assert'), require('path'), require('module')) :
  typeof define === 'function' && define.amd ? define(['util', 'fs', 'url', 'http', 'https', 'assert', 'path', 'module'], factory) :
  (global = global || self, global.JSONSchemaFaker = factory(global.util$2, global.fs, global.url, global.http, global.https, global.assert, global.path, global.module));
}(this, function (util$2, fs, url, http, https, assert, path, module) { 'use strict';

  util$2 = util$2 && util$2.hasOwnProperty('default') ? util$2['default'] : util$2;
  fs = fs && fs.hasOwnProperty('default') ? fs['default'] : fs;
  url = url && url.hasOwnProperty('default') ? url['default'] : url;
  http = http && http.hasOwnProperty('default') ? http['default'] : http;
  https = https && https.hasOwnProperty('default') ? https['default'] : https;
  assert = assert && assert.hasOwnProperty('default') ? assert['default'] : assert;
  path = path && path.hasOwnProperty('default') ? path['default'] : path;
  module = module && module.hasOwnProperty('default') ? module['default'] : module;

  var json = {
    /**
     * The order that this parser will run, in relation to other parsers.
     *
     * @type {number}
     */
    order: 100,

    /**
     * Whether to allow "empty" files. This includes zero-byte files, as well as empty JSON objects.
     *
     * @type {boolean}
     */
    allowEmpty: true,

    /**
     * Determines whether this parser can parse a given file reference.
     * Parsers that match will be tried, in order, until one successfully parses the file.
     * Parsers that don't match will be skipped, UNLESS none of the parsers match, in which case
     * every parser will be tried.
     *
     * @type {RegExp|string[]|function}
     */
    canParse: ".json",

    /**
     * Parses the given file as JSON
     *
     * @param {object} file           - An object containing information about the referenced file
     * @param {string} file.url       - The full URL of the referenced file
     * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
     * @param {*}      file.data      - The file contents. This will be whatever data type was returned by the resolver
     * @returns {Promise}
     */
    parse: function parseJSON (file) {
      return new Promise(function (resolve, reject) {
        var data = file.data;
        if (Buffer.isBuffer(data)) {
          data = data.toString();
        }

        if (typeof data === "string") {
          if (data.trim().length === 0) {
            resolve(undefined);  // This mirrors the YAML behavior
          }
          else {
            resolve(JSON.parse(data));
          }
        }
        else {
          // data is already a JavaScript value (object, array, number, null, NaN, etc.)
          resolve(data);
        }
      });
    }
  };

  function isNothing(subject) {
    return (typeof subject === 'undefined') || (subject === null);
  }


  function isObject(subject) {
    return (typeof subject === 'object') && (subject !== null);
  }


  function toArray(sequence) {
    if (Array.isArray(sequence)) { return sequence; }
    else if (isNothing(sequence)) { return []; }

    return [ sequence ];
  }


  function extend(target, source) {
    var index, length, key, sourceKeys;

    if (source) {
      sourceKeys = Object.keys(source);

      for (index = 0, length = sourceKeys.length; index < length; index += 1) {
        key = sourceKeys[index];
        target[key] = source[key];
      }
    }

    return target;
  }


  function repeat(string, count) {
    var result = '', cycle;

    for (cycle = 0; cycle < count; cycle += 1) {
      result += string;
    }

    return result;
  }


  function isNegativeZero(number) {
    return (number === 0) && (Number.NEGATIVE_INFINITY === 1 / number);
  }


  var isNothing_1      = isNothing;
  var isObject_1       = isObject;
  var toArray_1        = toArray;
  var repeat_1         = repeat;
  var isNegativeZero_1 = isNegativeZero;
  var extend_1         = extend;

  var common = {
  	isNothing: isNothing_1,
  	isObject: isObject_1,
  	toArray: toArray_1,
  	repeat: repeat_1,
  	isNegativeZero: isNegativeZero_1,
  	extend: extend_1
  };

  // YAML error class. http://stackoverflow.com/questions/8458984

  function YAMLException(reason, mark) {
    // Super constructor
    Error.call(this);

    this.name = 'YAMLException';
    this.reason = reason;
    this.mark = mark;
    this.message = (this.reason || '(unknown reason)') + (this.mark ? ' ' + this.mark.toString() : '');

    // Include stack trace in error object
    if (Error.captureStackTrace) {
      // Chrome and NodeJS
      Error.captureStackTrace(this, this.constructor);
    } else {
      // FF, IE 10+ and Safari 6+. Fallback for others
      this.stack = (new Error()).stack || '';
    }
  }


  // Inherit from Error
  YAMLException.prototype = Object.create(Error.prototype);
  YAMLException.prototype.constructor = YAMLException;


  YAMLException.prototype.toString = function toString(compact) {
    var result = this.name + ': ';

    result += this.reason || '(unknown reason)';

    if (!compact && this.mark) {
      result += ' ' + this.mark.toString();
    }

    return result;
  };


  var exception = YAMLException;

  function Mark(name, buffer, position, line, column) {
    this.name     = name;
    this.buffer   = buffer;
    this.position = position;
    this.line     = line;
    this.column   = column;
  }


  Mark.prototype.getSnippet = function getSnippet(indent, maxLength) {
    var head, start, tail, end, snippet;

    if (!this.buffer) { return null; }

    indent = indent || 4;
    maxLength = maxLength || 75;

    head = '';
    start = this.position;

    while (start > 0 && '\x00\r\n\x85\u2028\u2029'.indexOf(this.buffer.charAt(start - 1)) === -1) {
      start -= 1;
      if (this.position - start > (maxLength / 2 - 1)) {
        head = ' ... ';
        start += 5;
        break;
      }
    }

    tail = '';
    end = this.position;

    while (end < this.buffer.length && '\x00\r\n\x85\u2028\u2029'.indexOf(this.buffer.charAt(end)) === -1) {
      end += 1;
      if (end - this.position > (maxLength / 2 - 1)) {
        tail = ' ... ';
        end -= 5;
        break;
      }
    }

    snippet = this.buffer.slice(start, end);

    return common.repeat(' ', indent) + head + snippet + tail + '\n' +
           common.repeat(' ', indent + this.position - start + head.length) + '^';
  };


  Mark.prototype.toString = function toString(compact) {
    var snippet, where = '';

    if (this.name) {
      where += 'in "' + this.name + '" ';
    }

    where += 'at line ' + (this.line + 1) + ', column ' + (this.column + 1);

    if (!compact) {
      snippet = this.getSnippet();

      if (snippet) {
        where += ':\n' + snippet;
      }
    }

    return where;
  };


  var mark = Mark;

  var TYPE_CONSTRUCTOR_OPTIONS = [
    'kind',
    'resolve',
    'construct',
    'instanceOf',
    'predicate',
    'represent',
    'defaultStyle',
    'styleAliases'
  ];

  var YAML_NODE_KINDS = [
    'scalar',
    'sequence',
    'mapping'
  ];

  function compileStyleAliases(map) {
    var result = {};

    if (map !== null) {
      Object.keys(map).forEach(function (style) {
        map[style].forEach(function (alias) {
          result[String(alias)] = style;
        });
      });
    }

    return result;
  }

  function Type(tag, options) {
    options = options || {};

    Object.keys(options).forEach(function (name) {
      if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
        throw new exception('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
      }
    });

    // TODO: Add tag format check.
    this.tag          = tag;
    this.kind         = options['kind']         || null;
    this.resolve      = options['resolve']      || function () { return true; };
    this.construct    = options['construct']    || function (data) { return data; };
    this.instanceOf   = options['instanceOf']   || null;
    this.predicate    = options['predicate']    || null;
    this.represent    = options['represent']    || null;
    this.defaultStyle = options['defaultStyle'] || null;
    this.styleAliases = compileStyleAliases(options['styleAliases'] || null);

    if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
      throw new exception('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
    }
  }

  var type = Type;

  /*eslint-disable max-len*/






  function compileList(schema, name, result) {
    var exclude = [];

    schema.include.forEach(function (includedSchema) {
      result = compileList(includedSchema, name, result);
    });

    schema[name].forEach(function (currentType) {
      result.forEach(function (previousType, previousIndex) {
        if (previousType.tag === currentType.tag && previousType.kind === currentType.kind) {
          exclude.push(previousIndex);
        }
      });

      result.push(currentType);
    });

    return result.filter(function (type, index) {
      return exclude.indexOf(index) === -1;
    });
  }


  function compileMap(/* lists... */) {
    var arguments$1 = arguments;

    var result = {
          scalar: {},
          sequence: {},
          mapping: {},
          fallback: {}
        }, index, length;

    function collectType(type) {
      result[type.kind][type.tag] = result['fallback'][type.tag] = type;
    }

    for (index = 0, length = arguments.length; index < length; index += 1) {
      arguments$1[index].forEach(collectType);
    }
    return result;
  }


  function Schema(definition) {
    this.include  = definition.include  || [];
    this.implicit = definition.implicit || [];
    this.explicit = definition.explicit || [];

    this.implicit.forEach(function (type) {
      if (type.loadKind && type.loadKind !== 'scalar') {
        throw new exception('There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.');
      }
    });

    this.compiledImplicit = compileList(this, 'implicit', []);
    this.compiledExplicit = compileList(this, 'explicit', []);
    this.compiledTypeMap  = compileMap(this.compiledImplicit, this.compiledExplicit);
  }


  Schema.DEFAULT = null;


  Schema.create = function createSchema() {
    var schemas, types;

    switch (arguments.length) {
      case 1:
        schemas = Schema.DEFAULT;
        types = arguments[0];
        break;

      case 2:
        schemas = arguments[0];
        types = arguments[1];
        break;

      default:
        throw new exception('Wrong number of arguments for Schema.create function');
    }

    schemas = common.toArray(schemas);
    types = common.toArray(types);

    if (!schemas.every(function (schema) { return schema instanceof Schema; })) {
      throw new exception('Specified list of super schemas (or a single Schema object) contains a non-Schema object.');
    }

    if (!types.every(function (type$1) { return type$1 instanceof type; })) {
      throw new exception('Specified list of YAML types (or a single Type object) contains a non-Type object.');
    }

    return new Schema({
      include: schemas,
      explicit: types
    });
  };


  var schema = Schema;

  var str = new type('tag:yaml.org,2002:str', {
    kind: 'scalar',
    construct: function (data) { return data !== null ? data : ''; }
  });

  var seq = new type('tag:yaml.org,2002:seq', {
    kind: 'sequence',
    construct: function (data) { return data !== null ? data : []; }
  });

  var map = new type('tag:yaml.org,2002:map', {
    kind: 'mapping',
    construct: function (data) { return data !== null ? data : {}; }
  });

  var failsafe = new schema({
    explicit: [
      str,
      seq,
      map
    ]
  });

  function resolveYamlNull(data) {
    if (data === null) { return true; }

    var max = data.length;

    return (max === 1 && data === '~') ||
           (max === 4 && (data === 'null' || data === 'Null' || data === 'NULL'));
  }

  function constructYamlNull() {
    return null;
  }

  function isNull(object) {
    return object === null;
  }

  var _null = new type('tag:yaml.org,2002:null', {
    kind: 'scalar',
    resolve: resolveYamlNull,
    construct: constructYamlNull,
    predicate: isNull,
    represent: {
      canonical: function () { return '~';    },
      lowercase: function () { return 'null'; },
      uppercase: function () { return 'NULL'; },
      camelcase: function () { return 'Null'; }
    },
    defaultStyle: 'lowercase'
  });

  function resolveYamlBoolean(data) {
    if (data === null) { return false; }

    var max = data.length;

    return (max === 4 && (data === 'true' || data === 'True' || data === 'TRUE')) ||
           (max === 5 && (data === 'false' || data === 'False' || data === 'FALSE'));
  }

  function constructYamlBoolean(data) {
    return data === 'true' ||
           data === 'True' ||
           data === 'TRUE';
  }

  function isBoolean(object) {
    return Object.prototype.toString.call(object) === '[object Boolean]';
  }

  var bool = new type('tag:yaml.org,2002:bool', {
    kind: 'scalar',
    resolve: resolveYamlBoolean,
    construct: constructYamlBoolean,
    predicate: isBoolean,
    represent: {
      lowercase: function (object) { return object ? 'true' : 'false'; },
      uppercase: function (object) { return object ? 'TRUE' : 'FALSE'; },
      camelcase: function (object) { return object ? 'True' : 'False'; }
    },
    defaultStyle: 'lowercase'
  });

  function isHexCode(c) {
    return ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */)) ||
           ((0x41/* A */ <= c) && (c <= 0x46/* F */)) ||
           ((0x61/* a */ <= c) && (c <= 0x66/* f */));
  }

  function isOctCode(c) {
    return ((0x30/* 0 */ <= c) && (c <= 0x37/* 7 */));
  }

  function isDecCode(c) {
    return ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */));
  }

  function resolveYamlInteger(data) {
    if (data === null) { return false; }

    var max = data.length,
        index = 0,
        hasDigits = false,
        ch;

    if (!max) { return false; }

    ch = data[index];

    // sign
    if (ch === '-' || ch === '+') {
      ch = data[++index];
    }

    if (ch === '0') {
      // 0
      if (index + 1 === max) { return true; }
      ch = data[++index];

      // base 2, base 8, base 16

      if (ch === 'b') {
        // base 2
        index++;

        for (; index < max; index++) {
          ch = data[index];
          if (ch === '_') { continue; }
          if (ch !== '0' && ch !== '1') { return false; }
          hasDigits = true;
        }
        return hasDigits && ch !== '_';
      }


      if (ch === 'x') {
        // base 16
        index++;

        for (; index < max; index++) {
          ch = data[index];
          if (ch === '_') { continue; }
          if (!isHexCode(data.charCodeAt(index))) { return false; }
          hasDigits = true;
        }
        return hasDigits && ch !== '_';
      }

      // base 8
      for (; index < max; index++) {
        ch = data[index];
        if (ch === '_') { continue; }
        if (!isOctCode(data.charCodeAt(index))) { return false; }
        hasDigits = true;
      }
      return hasDigits && ch !== '_';
    }

    // base 10 (except 0) or base 60

    // value should not start with `_`;
    if (ch === '_') { return false; }

    for (; index < max; index++) {
      ch = data[index];
      if (ch === '_') { continue; }
      if (ch === ':') { break; }
      if (!isDecCode(data.charCodeAt(index))) {
        return false;
      }
      hasDigits = true;
    }

    // Should have digits and should not end with `_`
    if (!hasDigits || ch === '_') { return false; }

    // if !base60 - done;
    if (ch !== ':') { return true; }

    // base60 almost not used, no needs to optimize
    return /^(:[0-5]?[0-9])+$/.test(data.slice(index));
  }

  function constructYamlInteger(data) {
    var value = data, sign = 1, ch, base, digits = [];

    if (value.indexOf('_') !== -1) {
      value = value.replace(/_/g, '');
    }

    ch = value[0];

    if (ch === '-' || ch === '+') {
      if (ch === '-') { sign = -1; }
      value = value.slice(1);
      ch = value[0];
    }

    if (value === '0') { return 0; }

    if (ch === '0') {
      if (value[1] === 'b') { return sign * parseInt(value.slice(2), 2); }
      if (value[1] === 'x') { return sign * parseInt(value, 16); }
      return sign * parseInt(value, 8);
    }

    if (value.indexOf(':') !== -1) {
      value.split(':').forEach(function (v) {
        digits.unshift(parseInt(v, 10));
      });

      value = 0;
      base = 1;

      digits.forEach(function (d) {
        value += (d * base);
        base *= 60;
      });

      return sign * value;

    }

    return sign * parseInt(value, 10);
  }

  function isInteger(object) {
    return (Object.prototype.toString.call(object)) === '[object Number]' &&
           (object % 1 === 0 && !common.isNegativeZero(object));
  }

  var int_1 = new type('tag:yaml.org,2002:int', {
    kind: 'scalar',
    resolve: resolveYamlInteger,
    construct: constructYamlInteger,
    predicate: isInteger,
    represent: {
      binary:      function (obj) { return obj >= 0 ? '0b' + obj.toString(2) : '-0b' + obj.toString(2).slice(1); },
      octal:       function (obj) { return obj >= 0 ? '0'  + obj.toString(8) : '-0'  + obj.toString(8).slice(1); },
      decimal:     function (obj) { return obj.toString(10); },
      /* eslint-disable max-len */
      hexadecimal: function (obj) { return obj >= 0 ? '0x' + obj.toString(16).toUpperCase() :  '-0x' + obj.toString(16).toUpperCase().slice(1); }
    },
    defaultStyle: 'decimal',
    styleAliases: {
      binary:      [ 2,  'bin' ],
      octal:       [ 8,  'oct' ],
      decimal:     [ 10, 'dec' ],
      hexadecimal: [ 16, 'hex' ]
    }
  });

  var YAML_FLOAT_PATTERN = new RegExp(
    // 2.5e4, 2.5 and integers
    '^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?' +
    // .2e4, .2
    // special case, seems not from spec
    '|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?' +
    // 20:59
    '|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*' +
    // .inf
    '|[-+]?\\.(?:inf|Inf|INF)' +
    // .nan
    '|\\.(?:nan|NaN|NAN))$');

  function resolveYamlFloat(data) {
    if (data === null) { return false; }

    if (!YAML_FLOAT_PATTERN.test(data) ||
        // Quick hack to not allow integers end with `_`
        // Probably should update regexp & check speed
        data[data.length - 1] === '_') {
      return false;
    }

    return true;
  }

  function constructYamlFloat(data) {
    var value, sign, base, digits;

    value  = data.replace(/_/g, '').toLowerCase();
    sign   = value[0] === '-' ? -1 : 1;
    digits = [];

    if ('+-'.indexOf(value[0]) >= 0) {
      value = value.slice(1);
    }

    if (value === '.inf') {
      return (sign === 1) ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;

    } else if (value === '.nan') {
      return NaN;

    } else if (value.indexOf(':') >= 0) {
      value.split(':').forEach(function (v) {
        digits.unshift(parseFloat(v, 10));
      });

      value = 0.0;
      base = 1;

      digits.forEach(function (d) {
        value += d * base;
        base *= 60;
      });

      return sign * value;

    }
    return sign * parseFloat(value, 10);
  }


  var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;

  function representYamlFloat(object, style) {
    var res;

    if (isNaN(object)) {
      switch (style) {
        case 'lowercase': return '.nan';
        case 'uppercase': return '.NAN';
        case 'camelcase': return '.NaN';
      }
    } else if (Number.POSITIVE_INFINITY === object) {
      switch (style) {
        case 'lowercase': return '.inf';
        case 'uppercase': return '.INF';
        case 'camelcase': return '.Inf';
      }
    } else if (Number.NEGATIVE_INFINITY === object) {
      switch (style) {
        case 'lowercase': return '-.inf';
        case 'uppercase': return '-.INF';
        case 'camelcase': return '-.Inf';
      }
    } else if (common.isNegativeZero(object)) {
      return '-0.0';
    }

    res = object.toString(10);

    // JS stringifier can build scientific format without dots: 5e-100,
    // while YAML requres dot: 5.e-100. Fix it with simple hack

    return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace('e', '.e') : res;
  }

  function isFloat(object) {
    return (Object.prototype.toString.call(object) === '[object Number]') &&
           (object % 1 !== 0 || common.isNegativeZero(object));
  }

  var float_1 = new type('tag:yaml.org,2002:float', {
    kind: 'scalar',
    resolve: resolveYamlFloat,
    construct: constructYamlFloat,
    predicate: isFloat,
    represent: representYamlFloat,
    defaultStyle: 'lowercase'
  });

  var json$1 = new schema({
    include: [
      failsafe
    ],
    implicit: [
      _null,
      bool,
      int_1,
      float_1
    ]
  });

  var core = new schema({
    include: [
      json$1
    ]
  });

  var YAML_DATE_REGEXP = new RegExp(
    '^([0-9][0-9][0-9][0-9])'          + // [1] year
    '-([0-9][0-9])'                    + // [2] month
    '-([0-9][0-9])$');                   // [3] day

  var YAML_TIMESTAMP_REGEXP = new RegExp(
    '^([0-9][0-9][0-9][0-9])'          + // [1] year
    '-([0-9][0-9]?)'                   + // [2] month
    '-([0-9][0-9]?)'                   + // [3] day
    '(?:[Tt]|[ \\t]+)'                 + // ...
    '([0-9][0-9]?)'                    + // [4] hour
    ':([0-9][0-9])'                    + // [5] minute
    ':([0-9][0-9])'                    + // [6] second
    '(?:\\.([0-9]*))?'                 + // [7] fraction
    '(?:[ \\t]*(Z|([-+])([0-9][0-9]?)' + // [8] tz [9] tz_sign [10] tz_hour
    '(?::([0-9][0-9]))?))?$');           // [11] tz_minute

  function resolveYamlTimestamp(data) {
    if (data === null) { return false; }
    if (YAML_DATE_REGEXP.exec(data) !== null) { return true; }
    if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) { return true; }
    return false;
  }

  function constructYamlTimestamp(data) {
    var match, year, month, day, hour, minute, second, fraction = 0,
        delta = null, tz_hour, tz_minute, date;

    match = YAML_DATE_REGEXP.exec(data);
    if (match === null) { match = YAML_TIMESTAMP_REGEXP.exec(data); }

    if (match === null) { throw new Error('Date resolve error'); }

    // match: [1] year [2] month [3] day

    year = +(match[1]);
    month = +(match[2]) - 1; // JS month starts with 0
    day = +(match[3]);

    if (!match[4]) { // no hour
      return new Date(Date.UTC(year, month, day));
    }

    // match: [4] hour [5] minute [6] second [7] fraction

    hour = +(match[4]);
    minute = +(match[5]);
    second = +(match[6]);

    if (match[7]) {
      fraction = match[7].slice(0, 3);
      while (fraction.length < 3) { // milli-seconds
        fraction += '0';
      }
      fraction = +fraction;
    }

    // match: [8] tz [9] tz_sign [10] tz_hour [11] tz_minute

    if (match[9]) {
      tz_hour = +(match[10]);
      tz_minute = +(match[11] || 0);
      delta = (tz_hour * 60 + tz_minute) * 60000; // delta in mili-seconds
      if (match[9] === '-') { delta = -delta; }
    }

    date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));

    if (delta) { date.setTime(date.getTime() - delta); }

    return date;
  }

  function representYamlTimestamp(object /*, style*/) {
    return object.toISOString();
  }

  var timestamp = new type('tag:yaml.org,2002:timestamp', {
    kind: 'scalar',
    resolve: resolveYamlTimestamp,
    construct: constructYamlTimestamp,
    instanceOf: Date,
    represent: representYamlTimestamp
  });

  function resolveYamlMerge(data) {
    return data === '<<' || data === null;
  }

  var merge = new type('tag:yaml.org,2002:merge', {
    kind: 'scalar',
    resolve: resolveYamlMerge
  });

  /*eslint-disable no-bitwise*/

  var NodeBuffer;

  try {
    // A trick for browserified version, to not include `Buffer` shim
    var _require = require;
    NodeBuffer = _require('buffer').Buffer;
  } catch (__) {}




  // [ 64, 65, 66 ] -> [ padding, CR, LF ]
  var BASE64_MAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r';


  function resolveYamlBinary(data) {
    if (data === null) { return false; }

    var code, idx, bitlen = 0, max = data.length, map = BASE64_MAP;

    // Convert one by one.
    for (idx = 0; idx < max; idx++) {
      code = map.indexOf(data.charAt(idx));

      // Skip CR/LF
      if (code > 64) { continue; }

      // Fail on illegal characters
      if (code < 0) { return false; }

      bitlen += 6;
    }

    // If there are any bits left, source was corrupted
    return (bitlen % 8) === 0;
  }

  function constructYamlBinary(data) {
    var idx, tailbits,
        input = data.replace(/[\r\n=]/g, ''), // remove CR/LF & padding to simplify scan
        max = input.length,
        map = BASE64_MAP,
        bits = 0,
        result = [];

    // Collect by 6*4 bits (3 bytes)

    for (idx = 0; idx < max; idx++) {
      if ((idx % 4 === 0) && idx) {
        result.push((bits >> 16) & 0xFF);
        result.push((bits >> 8) & 0xFF);
        result.push(bits & 0xFF);
      }

      bits = (bits << 6) | map.indexOf(input.charAt(idx));
    }

    // Dump tail

    tailbits = (max % 4) * 6;

    if (tailbits === 0) {
      result.push((bits >> 16) & 0xFF);
      result.push((bits >> 8) & 0xFF);
      result.push(bits & 0xFF);
    } else if (tailbits === 18) {
      result.push((bits >> 10) & 0xFF);
      result.push((bits >> 2) & 0xFF);
    } else if (tailbits === 12) {
      result.push((bits >> 4) & 0xFF);
    }

    // Wrap into Buffer for NodeJS and leave Array for browser
    if (NodeBuffer) {
      // Support node 6.+ Buffer API when available
      return NodeBuffer.from ? NodeBuffer.from(result) : new NodeBuffer(result);
    }

    return result;
  }

  function representYamlBinary(object /*, style*/) {
    var result = '', bits = 0, idx, tail,
        max = object.length,
        map = BASE64_MAP;

    // Convert every three bytes to 4 ASCII characters.

    for (idx = 0; idx < max; idx++) {
      if ((idx % 3 === 0) && idx) {
        result += map[(bits >> 18) & 0x3F];
        result += map[(bits >> 12) & 0x3F];
        result += map[(bits >> 6) & 0x3F];
        result += map[bits & 0x3F];
      }

      bits = (bits << 8) + object[idx];
    }

    // Dump tail

    tail = max % 3;

    if (tail === 0) {
      result += map[(bits >> 18) & 0x3F];
      result += map[(bits >> 12) & 0x3F];
      result += map[(bits >> 6) & 0x3F];
      result += map[bits & 0x3F];
    } else if (tail === 2) {
      result += map[(bits >> 10) & 0x3F];
      result += map[(bits >> 4) & 0x3F];
      result += map[(bits << 2) & 0x3F];
      result += map[64];
    } else if (tail === 1) {
      result += map[(bits >> 2) & 0x3F];
      result += map[(bits << 4) & 0x3F];
      result += map[64];
      result += map[64];
    }

    return result;
  }

  function isBinary(object) {
    return NodeBuffer && NodeBuffer.isBuffer(object);
  }

  var binary = new type('tag:yaml.org,2002:binary', {
    kind: 'scalar',
    resolve: resolveYamlBinary,
    construct: constructYamlBinary,
    predicate: isBinary,
    represent: representYamlBinary
  });

  var _hasOwnProperty = Object.prototype.hasOwnProperty;
  var _toString       = Object.prototype.toString;

  function resolveYamlOmap(data) {
    if (data === null) { return true; }

    var objectKeys = [], index, length, pair, pairKey, pairHasKey,
        object = data;

    for (index = 0, length = object.length; index < length; index += 1) {
      pair = object[index];
      pairHasKey = false;

      if (_toString.call(pair) !== '[object Object]') { return false; }

      for (pairKey in pair) {
        if (_hasOwnProperty.call(pair, pairKey)) {
          if (!pairHasKey) { pairHasKey = true; }
          else { return false; }
        }
      }

      if (!pairHasKey) { return false; }

      if (objectKeys.indexOf(pairKey) === -1) { objectKeys.push(pairKey); }
      else { return false; }
    }

    return true;
  }

  function constructYamlOmap(data) {
    return data !== null ? data : [];
  }

  var omap = new type('tag:yaml.org,2002:omap', {
    kind: 'sequence',
    resolve: resolveYamlOmap,
    construct: constructYamlOmap
  });

  var _toString$1 = Object.prototype.toString;

  function resolveYamlPairs(data) {
    if (data === null) { return true; }

    var index, length, pair, keys, result,
        object = data;

    result = new Array(object.length);

    for (index = 0, length = object.length; index < length; index += 1) {
      pair = object[index];

      if (_toString$1.call(pair) !== '[object Object]') { return false; }

      keys = Object.keys(pair);

      if (keys.length !== 1) { return false; }

      result[index] = [ keys[0], pair[keys[0]] ];
    }

    return true;
  }

  function constructYamlPairs(data) {
    if (data === null) { return []; }

    var index, length, pair, keys, result,
        object = data;

    result = new Array(object.length);

    for (index = 0, length = object.length; index < length; index += 1) {
      pair = object[index];

      keys = Object.keys(pair);

      result[index] = [ keys[0], pair[keys[0]] ];
    }

    return result;
  }

  var pairs = new type('tag:yaml.org,2002:pairs', {
    kind: 'sequence',
    resolve: resolveYamlPairs,
    construct: constructYamlPairs
  });

  var _hasOwnProperty$1 = Object.prototype.hasOwnProperty;

  function resolveYamlSet(data) {
    if (data === null) { return true; }

    var key, object = data;

    for (key in object) {
      if (_hasOwnProperty$1.call(object, key)) {
        if (object[key] !== null) { return false; }
      }
    }

    return true;
  }

  function constructYamlSet(data) {
    return data !== null ? data : {};
  }

  var set = new type('tag:yaml.org,2002:set', {
    kind: 'mapping',
    resolve: resolveYamlSet,
    construct: constructYamlSet
  });

  var default_safe = new schema({
    include: [
      core
    ],
    implicit: [
      timestamp,
      merge
    ],
    explicit: [
      binary,
      omap,
      pairs,
      set
    ]
  });

  function resolveJavascriptUndefined() {
    return true;
  }

  function constructJavascriptUndefined() {
    /*eslint-disable no-undefined*/
    return undefined;
  }

  function representJavascriptUndefined() {
    return '';
  }

  function isUndefined(object) {
    return typeof object === 'undefined';
  }

  var _undefined = new type('tag:yaml.org,2002:js/undefined', {
    kind: 'scalar',
    resolve: resolveJavascriptUndefined,
    construct: constructJavascriptUndefined,
    predicate: isUndefined,
    represent: representJavascriptUndefined
  });

  function resolveJavascriptRegExp(data) {
    if (data === null) { return false; }
    if (data.length === 0) { return false; }

    var regexp = data,
        tail   = /\/([gim]*)$/.exec(data),
        modifiers = '';

    // if regexp starts with '/' it can have modifiers and must be properly closed
    // `/foo/gim` - modifiers tail can be maximum 3 chars
    if (regexp[0] === '/') {
      if (tail) { modifiers = tail[1]; }

      if (modifiers.length > 3) { return false; }
      // if expression starts with /, is should be properly terminated
      if (regexp[regexp.length - modifiers.length - 1] !== '/') { return false; }
    }

    return true;
  }

  function constructJavascriptRegExp(data) {
    var regexp = data,
        tail   = /\/([gim]*)$/.exec(data),
        modifiers = '';

    // `/foo/gim` - tail can be maximum 4 chars
    if (regexp[0] === '/') {
      if (tail) { modifiers = tail[1]; }
      regexp = regexp.slice(1, regexp.length - modifiers.length - 1);
    }

    return new RegExp(regexp, modifiers);
  }

  function representJavascriptRegExp(object /*, style*/) {
    var result = '/' + object.source + '/';

    if (object.global) { result += 'g'; }
    if (object.multiline) { result += 'm'; }
    if (object.ignoreCase) { result += 'i'; }

    return result;
  }

  function isRegExp(object) {
    return Object.prototype.toString.call(object) === '[object RegExp]';
  }

  var regexp = new type('tag:yaml.org,2002:js/regexp', {
    kind: 'scalar',
    resolve: resolveJavascriptRegExp,
    construct: constructJavascriptRegExp,
    predicate: isRegExp,
    represent: representJavascriptRegExp
  });

  var esprima;

  // Browserified version does not have esprima
  //
  // 1. For node.js just require module as deps
  // 2. For browser try to require mudule via external AMD system.
  //    If not found - try to fallback to window.esprima. If not
  //    found too - then fail to parse.
  //
  try {
    // workaround to exclude package from browserify list.
    var _require$1 = require;
    esprima = _require$1('esprima');
  } catch (_) {
    /*global window */
    if (typeof window !== 'undefined') { esprima = window.esprima; }
  }



  function resolveJavascriptFunction(data) {
    if (data === null) { return false; }

    try {
      var source = '(' + data + ')',
          ast    = esprima.parse(source, { range: true });

      if (ast.type                    !== 'Program'             ||
          ast.body.length             !== 1                     ||
          ast.body[0].type            !== 'ExpressionStatement' ||
          (ast.body[0].expression.type !== 'ArrowFunctionExpression' &&
            ast.body[0].expression.type !== 'FunctionExpression')) {
        return false;
      }

      return true;
    } catch (err) {
      return false;
    }
  }

  function constructJavascriptFunction(data) {
    /*jslint evil:true*/

    var source = '(' + data + ')',
        ast    = esprima.parse(source, { range: true }),
        params = [],
        body;

    if (ast.type                    !== 'Program'             ||
        ast.body.length             !== 1                     ||
        ast.body[0].type            !== 'ExpressionStatement' ||
        (ast.body[0].expression.type !== 'ArrowFunctionExpression' &&
          ast.body[0].expression.type !== 'FunctionExpression')) {
      throw new Error('Failed to resolve function');
    }

    ast.body[0].expression.params.forEach(function (param) {
      params.push(param.name);
    });

    body = ast.body[0].expression.body.range;

    // Esprima's ranges include the first '{' and the last '}' characters on
    // function expressions. So cut them out.
    if (ast.body[0].expression.body.type === 'BlockStatement') {
      /*eslint-disable no-new-func*/
      return new Function(params, source.slice(body[0] + 1, body[1] - 1));
    }
    // ES6 arrow functions can omit the BlockStatement. In that case, just return
    // the body.
    /*eslint-disable no-new-func*/
    return new Function(params, 'return ' + source.slice(body[0], body[1]));
  }

  function representJavascriptFunction(object /*, style*/) {
    return object.toString();
  }

  function isFunction(object) {
    return Object.prototype.toString.call(object) === '[object Function]';
  }

  var _function = new type('tag:yaml.org,2002:js/function', {
    kind: 'scalar',
    resolve: resolveJavascriptFunction,
    construct: constructJavascriptFunction,
    predicate: isFunction,
    represent: representJavascriptFunction
  });

  var default_full = schema.DEFAULT = new schema({
    include: [
      default_safe
    ],
    explicit: [
      _undefined,
      regexp,
      _function
    ]
  });

  /*eslint-disable max-len,no-use-before-define*/








  var _hasOwnProperty$2 = Object.prototype.hasOwnProperty;


  var CONTEXT_FLOW_IN   = 1;
  var CONTEXT_FLOW_OUT  = 2;
  var CONTEXT_BLOCK_IN  = 3;
  var CONTEXT_BLOCK_OUT = 4;


  var CHOMPING_CLIP  = 1;
  var CHOMPING_STRIP = 2;
  var CHOMPING_KEEP  = 3;


  var PATTERN_NON_PRINTABLE         = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
  var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
  var PATTERN_FLOW_INDICATORS       = /[,\[\]\{\}]/;
  var PATTERN_TAG_HANDLE            = /^(?:!|!!|![a-z\-]+!)$/i;
  var PATTERN_TAG_URI               = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;


  function _class(obj) { return Object.prototype.toString.call(obj); }

  function is_EOL(c) {
    return (c === 0x0A/* LF */) || (c === 0x0D/* CR */);
  }

  function is_WHITE_SPACE(c) {
    return (c === 0x09/* Tab */) || (c === 0x20/* Space */);
  }

  function is_WS_OR_EOL(c) {
    return (c === 0x09/* Tab */) ||
           (c === 0x20/* Space */) ||
           (c === 0x0A/* LF */) ||
           (c === 0x0D/* CR */);
  }

  function is_FLOW_INDICATOR(c) {
    return c === 0x2C/* , */ ||
           c === 0x5B/* [ */ ||
           c === 0x5D/* ] */ ||
           c === 0x7B/* { */ ||
           c === 0x7D/* } */;
  }

  function fromHexCode(c) {
    var lc;

    if ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */)) {
      return c - 0x30;
    }

    /*eslint-disable no-bitwise*/
    lc = c | 0x20;

    if ((0x61/* a */ <= lc) && (lc <= 0x66/* f */)) {
      return lc - 0x61 + 10;
    }

    return -1;
  }

  function escapedHexLen(c) {
    if (c === 0x78/* x */) { return 2; }
    if (c === 0x75/* u */) { return 4; }
    if (c === 0x55/* U */) { return 8; }
    return 0;
  }

  function fromDecimalCode(c) {
    if ((0x30/* 0 */ <= c) && (c <= 0x39/* 9 */)) {
      return c - 0x30;
    }

    return -1;
  }

  function simpleEscapeSequence(c) {
    /* eslint-disable indent */
    return (c === 0x30/* 0 */) ? '\x00' :
          (c === 0x61/* a */) ? '\x07' :
          (c === 0x62/* b */) ? '\x08' :
          (c === 0x74/* t */) ? '\x09' :
          (c === 0x09/* Tab */) ? '\x09' :
          (c === 0x6E/* n */) ? '\x0A' :
          (c === 0x76/* v */) ? '\x0B' :
          (c === 0x66/* f */) ? '\x0C' :
          (c === 0x72/* r */) ? '\x0D' :
          (c === 0x65/* e */) ? '\x1B' :
          (c === 0x20/* Space */) ? ' ' :
          (c === 0x22/* " */) ? '\x22' :
          (c === 0x2F/* / */) ? '/' :
          (c === 0x5C/* \ */) ? '\x5C' :
          (c === 0x4E/* N */) ? '\x85' :
          (c === 0x5F/* _ */) ? '\xA0' :
          (c === 0x4C/* L */) ? '\u2028' :
          (c === 0x50/* P */) ? '\u2029' : '';
  }

  function charFromCodepoint(c) {
    if (c <= 0xFFFF) {
      return String.fromCharCode(c);
    }
    // Encode UTF-16 surrogate pair
    // https://en.wikipedia.org/wiki/UTF-16#Code_points_U.2B010000_to_U.2B10FFFF
    return String.fromCharCode(
      ((c - 0x010000) >> 10) + 0xD800,
      ((c - 0x010000) & 0x03FF) + 0xDC00
    );
  }

  var simpleEscapeCheck = new Array(256); // integer, for fast access
  var simpleEscapeMap = new Array(256);
  for (var i = 0; i < 256; i++) {
    simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
    simpleEscapeMap[i] = simpleEscapeSequence(i);
  }


  function State(input, options) {
    this.input = input;

    this.filename  = options['filename']  || null;
    this.schema    = options['schema']    || default_full;
    this.onWarning = options['onWarning'] || null;
    this.legacy    = options['legacy']    || false;
    this.json      = options['json']      || false;
    this.listener  = options['listener']  || null;

    this.implicitTypes = this.schema.compiledImplicit;
    this.typeMap       = this.schema.compiledTypeMap;

    this.length     = input.length;
    this.position   = 0;
    this.line       = 0;
    this.lineStart  = 0;
    this.lineIndent = 0;

    this.documents = [];

    /*
    this.version;
    this.checkLineBreaks;
    this.tagMap;
    this.anchorMap;
    this.tag;
    this.anchor;
    this.kind;
    this.result;*/

  }


  function generateError(state, message) {
    return new exception(
      message,
      new mark(state.filename, state.input, state.position, state.line, (state.position - state.lineStart)));
  }

  function throwError(state, message) {
    throw generateError(state, message);
  }

  function throwWarning(state, message) {
    if (state.onWarning) {
      state.onWarning.call(null, generateError(state, message));
    }
  }


  var directiveHandlers = {

    YAML: function handleYamlDirective(state, name, args) {

      var match, major, minor;

      if (state.version !== null) {
        throwError(state, 'duplication of %YAML directive');
      }

      if (args.length !== 1) {
        throwError(state, 'YAML directive accepts exactly one argument');
      }

      match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);

      if (match === null) {
        throwError(state, 'ill-formed argument of the YAML directive');
      }

      major = parseInt(match[1], 10);
      minor = parseInt(match[2], 10);

      if (major !== 1) {
        throwError(state, 'unacceptable YAML version of the document');
      }

      state.version = args[0];
      state.checkLineBreaks = (minor < 2);

      if (minor !== 1 && minor !== 2) {
        throwWarning(state, 'unsupported YAML version of the document');
      }
    },

    TAG: function handleTagDirective(state, name, args) {

      var handle, prefix;

      if (args.length !== 2) {
        throwError(state, 'TAG directive accepts exactly two arguments');
      }

      handle = args[0];
      prefix = args[1];

      if (!PATTERN_TAG_HANDLE.test(handle)) {
        throwError(state, 'ill-formed tag handle (first argument) of the TAG directive');
      }

      if (_hasOwnProperty$2.call(state.tagMap, handle)) {
        throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
      }

      if (!PATTERN_TAG_URI.test(prefix)) {
        throwError(state, 'ill-formed tag prefix (second argument) of the TAG directive');
      }

      state.tagMap[handle] = prefix;
    }
  };


  function captureSegment(state, start, end, checkJson) {
    var _position, _length, _character, _result;

    if (start < end) {
      _result = state.input.slice(start, end);

      if (checkJson) {
        for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
          _character = _result.charCodeAt(_position);
          if (!(_character === 0x09 ||
                (0x20 <= _character && _character <= 0x10FFFF))) {
            throwError(state, 'expected valid JSON character');
          }
        }
      } else if (PATTERN_NON_PRINTABLE.test(_result)) {
        throwError(state, 'the stream contains non-printable characters');
      }

      state.result += _result;
    }
  }

  function mergeMappings(state, destination, source, overridableKeys) {
    var sourceKeys, key, index, quantity;

    if (!common.isObject(source)) {
      throwError(state, 'cannot merge mappings; the provided source object is unacceptable');
    }

    sourceKeys = Object.keys(source);

    for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
      key = sourceKeys[index];

      if (!_hasOwnProperty$2.call(destination, key)) {
        destination[key] = source[key];
        overridableKeys[key] = true;
      }
    }
  }

  function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startPos) {
    var index, quantity;

    // The output is a plain object here, so keys can only be strings.
    // We need to convert keyNode to a string, but doing so can hang the process
    // (deeply nested arrays that explode exponentially using aliases).
    if (Array.isArray(keyNode)) {
      keyNode = Array.prototype.slice.call(keyNode);

      for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
        if (Array.isArray(keyNode[index])) {
          throwError(state, 'nested arrays are not supported inside keys');
        }

        if (typeof keyNode === 'object' && _class(keyNode[index]) === '[object Object]') {
          keyNode[index] = '[object Object]';
        }
      }
    }

    // Avoid code execution in load() via toString property
    // (still use its own toString for arrays, timestamps,
    // and whatever user schema extensions happen to have @@toStringTag)
    if (typeof keyNode === 'object' && _class(keyNode) === '[object Object]') {
      keyNode = '[object Object]';
    }


    keyNode = String(keyNode);

    if (_result === null) {
      _result = {};
    }

    if (keyTag === 'tag:yaml.org,2002:merge') {
      if (Array.isArray(valueNode)) {
        for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
          mergeMappings(state, _result, valueNode[index], overridableKeys);
        }
      } else {
        mergeMappings(state, _result, valueNode, overridableKeys);
      }
    } else {
      if (!state.json &&
          !_hasOwnProperty$2.call(overridableKeys, keyNode) &&
          _hasOwnProperty$2.call(_result, keyNode)) {
        state.line = startLine || state.line;
        state.position = startPos || state.position;
        throwError(state, 'duplicated mapping key');
      }
      _result[keyNode] = valueNode;
      delete overridableKeys[keyNode];
    }

    return _result;
  }

  function readLineBreak(state) {
    var ch;

    ch = state.input.charCodeAt(state.position);

    if (ch === 0x0A/* LF */) {
      state.position++;
    } else if (ch === 0x0D/* CR */) {
      state.position++;
      if (state.input.charCodeAt(state.position) === 0x0A/* LF */) {
        state.position++;
      }
    } else {
      throwError(state, 'a line break is expected');
    }

    state.line += 1;
    state.lineStart = state.position;
  }

  function skipSeparationSpace(state, allowComments, checkIndent) {
    var lineBreaks = 0,
        ch = state.input.charCodeAt(state.position);

    while (ch !== 0) {
      while (is_WHITE_SPACE(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }

      if (allowComments && ch === 0x23/* # */) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0x0A/* LF */ && ch !== 0x0D/* CR */ && ch !== 0);
      }

      if (is_EOL(ch)) {
        readLineBreak(state);

        ch = state.input.charCodeAt(state.position);
        lineBreaks++;
        state.lineIndent = 0;

        while (ch === 0x20/* Space */) {
          state.lineIndent++;
          ch = state.input.charCodeAt(++state.position);
        }
      } else {
        break;
      }
    }

    if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
      throwWarning(state, 'deficient indentation');
    }

    return lineBreaks;
  }

  function testDocumentSeparator(state) {
    var _position = state.position,
        ch;

    ch = state.input.charCodeAt(_position);

    // Condition state.position === state.lineStart is tested
    // in parent on each call, for efficiency. No needs to test here again.
    if ((ch === 0x2D/* - */ || ch === 0x2E/* . */) &&
        ch === state.input.charCodeAt(_position + 1) &&
        ch === state.input.charCodeAt(_position + 2)) {

      _position += 3;

      ch = state.input.charCodeAt(_position);

      if (ch === 0 || is_WS_OR_EOL(ch)) {
        return true;
      }
    }

    return false;
  }

  function writeFoldedLines(state, count) {
    if (count === 1) {
      state.result += ' ';
    } else if (count > 1) {
      state.result += common.repeat('\n', count - 1);
    }
  }


  function readPlainScalar(state, nodeIndent, withinFlowCollection) {
    var preceding,
        following,
        captureStart,
        captureEnd,
        hasPendingContent,
        _line,
        _lineStart,
        _lineIndent,
        _kind = state.kind,
        _result = state.result,
        ch;

    ch = state.input.charCodeAt(state.position);

    if (is_WS_OR_EOL(ch)      ||
        is_FLOW_INDICATOR(ch) ||
        ch === 0x23/* # */    ||
        ch === 0x26/* & */    ||
        ch === 0x2A/* * */    ||
        ch === 0x21/* ! */    ||
        ch === 0x7C/* | */    ||
        ch === 0x3E/* > */    ||
        ch === 0x27/* ' */    ||
        ch === 0x22/* " */    ||
        ch === 0x25/* % */    ||
        ch === 0x40/* @ */    ||
        ch === 0x60/* ` */) {
      return false;
    }

    if (ch === 0x3F/* ? */ || ch === 0x2D/* - */) {
      following = state.input.charCodeAt(state.position + 1);

      if (is_WS_OR_EOL(following) ||
          withinFlowCollection && is_FLOW_INDICATOR(following)) {
        return false;
      }
    }

    state.kind = 'scalar';
    state.result = '';
    captureStart = captureEnd = state.position;
    hasPendingContent = false;

    while (ch !== 0) {
      if (ch === 0x3A/* : */) {
        following = state.input.charCodeAt(state.position + 1);

        if (is_WS_OR_EOL(following) ||
            withinFlowCollection && is_FLOW_INDICATOR(following)) {
          break;
        }

      } else if (ch === 0x23/* # */) {
        preceding = state.input.charCodeAt(state.position - 1);

        if (is_WS_OR_EOL(preceding)) {
          break;
        }

      } else if ((state.position === state.lineStart && testDocumentSeparator(state)) ||
                 withinFlowCollection && is_FLOW_INDICATOR(ch)) {
        break;

      } else if (is_EOL(ch)) {
        _line = state.line;
        _lineStart = state.lineStart;
        _lineIndent = state.lineIndent;
        skipSeparationSpace(state, false, -1);

        if (state.lineIndent >= nodeIndent) {
          hasPendingContent = true;
          ch = state.input.charCodeAt(state.position);
          continue;
        } else {
          state.position = captureEnd;
          state.line = _line;
          state.lineStart = _lineStart;
          state.lineIndent = _lineIndent;
          break;
        }
      }

      if (hasPendingContent) {
        captureSegment(state, captureStart, captureEnd, false);
        writeFoldedLines(state, state.line - _line);
        captureStart = captureEnd = state.position;
        hasPendingContent = false;
      }

      if (!is_WHITE_SPACE(ch)) {
        captureEnd = state.position + 1;
      }

      ch = state.input.charCodeAt(++state.position);
    }

    captureSegment(state, captureStart, captureEnd, false);

    if (state.result) {
      return true;
    }

    state.kind = _kind;
    state.result = _result;
    return false;
  }

  function readSingleQuotedScalar(state, nodeIndent) {
    var ch,
        captureStart, captureEnd;

    ch = state.input.charCodeAt(state.position);

    if (ch !== 0x27/* ' */) {
      return false;
    }

    state.kind = 'scalar';
    state.result = '';
    state.position++;
    captureStart = captureEnd = state.position;

    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      if (ch === 0x27/* ' */) {
        captureSegment(state, captureStart, state.position, true);
        ch = state.input.charCodeAt(++state.position);

        if (ch === 0x27/* ' */) {
          captureStart = state.position;
          state.position++;
          captureEnd = state.position;
        } else {
          return true;
        }

      } else if (is_EOL(ch)) {
        captureSegment(state, captureStart, captureEnd, true);
        writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
        captureStart = captureEnd = state.position;

      } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
        throwError(state, 'unexpected end of the document within a single quoted scalar');

      } else {
        state.position++;
        captureEnd = state.position;
      }
    }

    throwError(state, 'unexpected end of the stream within a single quoted scalar');
  }

  function readDoubleQuotedScalar(state, nodeIndent) {
    var captureStart,
        captureEnd,
        hexLength,
        hexResult,
        tmp,
        ch;

    ch = state.input.charCodeAt(state.position);

    if (ch !== 0x22/* " */) {
      return false;
    }

    state.kind = 'scalar';
    state.result = '';
    state.position++;
    captureStart = captureEnd = state.position;

    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      if (ch === 0x22/* " */) {
        captureSegment(state, captureStart, state.position, true);
        state.position++;
        return true;

      } else if (ch === 0x5C/* \ */) {
        captureSegment(state, captureStart, state.position, true);
        ch = state.input.charCodeAt(++state.position);

        if (is_EOL(ch)) {
          skipSeparationSpace(state, false, nodeIndent);

          // TODO: rework to inline fn with no type cast?
        } else if (ch < 256 && simpleEscapeCheck[ch]) {
          state.result += simpleEscapeMap[ch];
          state.position++;

        } else if ((tmp = escapedHexLen(ch)) > 0) {
          hexLength = tmp;
          hexResult = 0;

          for (; hexLength > 0; hexLength--) {
            ch = state.input.charCodeAt(++state.position);

            if ((tmp = fromHexCode(ch)) >= 0) {
              hexResult = (hexResult << 4) + tmp;

            } else {
              throwError(state, 'expected hexadecimal character');
            }
          }

          state.result += charFromCodepoint(hexResult);

          state.position++;

        } else {
          throwError(state, 'unknown escape sequence');
        }

        captureStart = captureEnd = state.position;

      } else if (is_EOL(ch)) {
        captureSegment(state, captureStart, captureEnd, true);
        writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
        captureStart = captureEnd = state.position;

      } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
        throwError(state, 'unexpected end of the document within a double quoted scalar');

      } else {
        state.position++;
        captureEnd = state.position;
      }
    }

    throwError(state, 'unexpected end of the stream within a double quoted scalar');
  }

  function readFlowCollection(state, nodeIndent) {
    var readNext = true,
        _line,
        _tag     = state.tag,
        _result,
        _anchor  = state.anchor,
        following,
        terminator,
        isPair,
        isExplicitPair,
        isMapping,
        overridableKeys = {},
        keyNode,
        keyTag,
        valueNode,
        ch;

    ch = state.input.charCodeAt(state.position);

    if (ch === 0x5B/* [ */) {
      terminator = 0x5D;/* ] */
      isMapping = false;
      _result = [];
    } else if (ch === 0x7B/* { */) {
      terminator = 0x7D;/* } */
      isMapping = true;
      _result = {};
    } else {
      return false;
    }

    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = _result;
    }

    ch = state.input.charCodeAt(++state.position);

    while (ch !== 0) {
      skipSeparationSpace(state, true, nodeIndent);

      ch = state.input.charCodeAt(state.position);

      if (ch === terminator) {
        state.position++;
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = isMapping ? 'mapping' : 'sequence';
        state.result = _result;
        return true;
      } else if (!readNext) {
        throwError(state, 'missed comma between flow collection entries');
      }

      keyTag = keyNode = valueNode = null;
      isPair = isExplicitPair = false;

      if (ch === 0x3F/* ? */) {
        following = state.input.charCodeAt(state.position + 1);

        if (is_WS_OR_EOL(following)) {
          isPair = isExplicitPair = true;
          state.position++;
          skipSeparationSpace(state, true, nodeIndent);
        }
      }

      _line = state.line;
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      keyTag = state.tag;
      keyNode = state.result;
      skipSeparationSpace(state, true, nodeIndent);

      ch = state.input.charCodeAt(state.position);

      if ((isExplicitPair || state.line === _line) && ch === 0x3A/* : */) {
        isPair = true;
        ch = state.input.charCodeAt(++state.position);
        skipSeparationSpace(state, true, nodeIndent);
        composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
        valueNode = state.result;
      }

      if (isMapping) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode);
      } else if (isPair) {
        _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode));
      } else {
        _result.push(keyNode);
      }

      skipSeparationSpace(state, true, nodeIndent);

      ch = state.input.charCodeAt(state.position);

      if (ch === 0x2C/* , */) {
        readNext = true;
        ch = state.input.charCodeAt(++state.position);
      } else {
        readNext = false;
      }
    }

    throwError(state, 'unexpected end of the stream within a flow collection');
  }

  function readBlockScalar(state, nodeIndent) {
    var captureStart,
        folding,
        chomping       = CHOMPING_CLIP,
        didReadContent = false,
        detectedIndent = false,
        textIndent     = nodeIndent,
        emptyLines     = 0,
        atMoreIndented = false,
        tmp,
        ch;

    ch = state.input.charCodeAt(state.position);

    if (ch === 0x7C/* | */) {
      folding = false;
    } else if (ch === 0x3E/* > */) {
      folding = true;
    } else {
      return false;
    }

    state.kind = 'scalar';
    state.result = '';

    while (ch !== 0) {
      ch = state.input.charCodeAt(++state.position);

      if (ch === 0x2B/* + */ || ch === 0x2D/* - */) {
        if (CHOMPING_CLIP === chomping) {
          chomping = (ch === 0x2B/* + */) ? CHOMPING_KEEP : CHOMPING_STRIP;
        } else {
          throwError(state, 'repeat of a chomping mode identifier');
        }

      } else if ((tmp = fromDecimalCode(ch)) >= 0) {
        if (tmp === 0) {
          throwError(state, 'bad explicit indentation width of a block scalar; it cannot be less than one');
        } else if (!detectedIndent) {
          textIndent = nodeIndent + tmp - 1;
          detectedIndent = true;
        } else {
          throwError(state, 'repeat of an indentation width identifier');
        }

      } else {
        break;
      }
    }

    if (is_WHITE_SPACE(ch)) {
      do { ch = state.input.charCodeAt(++state.position); }
      while (is_WHITE_SPACE(ch));

      if (ch === 0x23/* # */) {
        do { ch = state.input.charCodeAt(++state.position); }
        while (!is_EOL(ch) && (ch !== 0));
      }
    }

    while (ch !== 0) {
      readLineBreak(state);
      state.lineIndent = 0;

      ch = state.input.charCodeAt(state.position);

      while ((!detectedIndent || state.lineIndent < textIndent) &&
             (ch === 0x20/* Space */)) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }

      if (!detectedIndent && state.lineIndent > textIndent) {
        textIndent = state.lineIndent;
      }

      if (is_EOL(ch)) {
        emptyLines++;
        continue;
      }

      // End of the scalar.
      if (state.lineIndent < textIndent) {

        // Perform the chomping.
        if (chomping === CHOMPING_KEEP) {
          state.result += common.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);
        } else if (chomping === CHOMPING_CLIP) {
          if (didReadContent) { // i.e. only if the scalar is not empty.
            state.result += '\n';
          }
        }

        // Break this `while` cycle and go to the funciton's epilogue.
        break;
      }

      // Folded style: use fancy rules to handle line breaks.
      if (folding) {

        // Lines starting with white space characters (more-indented lines) are not folded.
        if (is_WHITE_SPACE(ch)) {
          atMoreIndented = true;
          // except for the first content line (cf. Example 8.1)
          state.result += common.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);

        // End of more-indented block.
        } else if (atMoreIndented) {
          atMoreIndented = false;
          state.result += common.repeat('\n', emptyLines + 1);

        // Just one line break - perceive as the same line.
        } else if (emptyLines === 0) {
          if (didReadContent) { // i.e. only if we have already read some scalar content.
            state.result += ' ';
          }

        // Several line breaks - perceive as different lines.
        } else {
          state.result += common.repeat('\n', emptyLines);
        }

      // Literal style: just add exact number of line breaks between content lines.
      } else {
        // Keep all line breaks except the header line break.
        state.result += common.repeat('\n', didReadContent ? 1 + emptyLines : emptyLines);
      }

      didReadContent = true;
      detectedIndent = true;
      emptyLines = 0;
      captureStart = state.position;

      while (!is_EOL(ch) && (ch !== 0)) {
        ch = state.input.charCodeAt(++state.position);
      }

      captureSegment(state, captureStart, state.position, false);
    }

    return true;
  }

  function readBlockSequence(state, nodeIndent) {
    var _line,
        _tag      = state.tag,
        _anchor   = state.anchor,
        _result   = [],
        following,
        detected  = false,
        ch;

    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = _result;
    }

    ch = state.input.charCodeAt(state.position);

    while (ch !== 0) {

      if (ch !== 0x2D/* - */) {
        break;
      }

      following = state.input.charCodeAt(state.position + 1);

      if (!is_WS_OR_EOL(following)) {
        break;
      }

      detected = true;
      state.position++;

      if (skipSeparationSpace(state, true, -1)) {
        if (state.lineIndent <= nodeIndent) {
          _result.push(null);
          ch = state.input.charCodeAt(state.position);
          continue;
        }
      }

      _line = state.line;
      composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
      _result.push(state.result);
      skipSeparationSpace(state, true, -1);

      ch = state.input.charCodeAt(state.position);

      if ((state.line === _line || state.lineIndent > nodeIndent) && (ch !== 0)) {
        throwError(state, 'bad indentation of a sequence entry');
      } else if (state.lineIndent < nodeIndent) {
        break;
      }
    }

    if (detected) {
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = 'sequence';
      state.result = _result;
      return true;
    }
    return false;
  }

  function readBlockMapping(state, nodeIndent, flowIndent) {
    var following,
        allowCompact,
        _line,
        _pos,
        _tag          = state.tag,
        _anchor       = state.anchor,
        _result       = {},
        overridableKeys = {},
        keyTag        = null,
        keyNode       = null,
        valueNode     = null,
        atExplicitKey = false,
        detected      = false,
        ch;

    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = _result;
    }

    ch = state.input.charCodeAt(state.position);

    while (ch !== 0) {
      following = state.input.charCodeAt(state.position + 1);
      _line = state.line; // Save the current line.
      _pos = state.position;

      //
      // Explicit notation case. There are two separate blocks:
      // first for the key (denoted by "?") and second for the value (denoted by ":")
      //
      if ((ch === 0x3F/* ? */ || ch === 0x3A/* : */) && is_WS_OR_EOL(following)) {

        if (ch === 0x3F/* ? */) {
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
            keyTag = keyNode = valueNode = null;
          }

          detected = true;
          atExplicitKey = true;
          allowCompact = true;

        } else if (atExplicitKey) {
          // i.e. 0x3A/* : */ === character after the explicit key.
          atExplicitKey = false;
          allowCompact = true;

        } else {
          throwError(state, 'incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line');
        }

        state.position += 1;
        ch = following;

      //
      // Implicit notation case. Flow-style node as the key first, then ":", and the value.
      //
      } else if (composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {

        if (state.line === _line) {
          ch = state.input.charCodeAt(state.position);

          while (is_WHITE_SPACE(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }

          if (ch === 0x3A/* : */) {
            ch = state.input.charCodeAt(++state.position);

            if (!is_WS_OR_EOL(ch)) {
              throwError(state, 'a whitespace character is expected after the key-value separator within a block mapping');
            }

            if (atExplicitKey) {
              storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
              keyTag = keyNode = valueNode = null;
            }

            detected = true;
            atExplicitKey = false;
            allowCompact = false;
            keyTag = state.tag;
            keyNode = state.result;

          } else if (detected) {
            throwError(state, 'can not read an implicit mapping pair; a colon is missed');

          } else {
            state.tag = _tag;
            state.anchor = _anchor;
            return true; // Keep the result of `composeNode`.
          }

        } else if (detected) {
          throwError(state, 'can not read a block mapping entry; a multiline key may not be an implicit key');

        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true; // Keep the result of `composeNode`.
        }

      } else {
        break; // Reading is done. Go to the epilogue.
      }

      //
      // Common reading code for both explicit and implicit notations.
      //
      if (state.line === _line || state.lineIndent > nodeIndent) {
        if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
          if (atExplicitKey) {
            keyNode = state.result;
          } else {
            valueNode = state.result;
          }
        }

        if (!atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _pos);
          keyTag = keyNode = valueNode = null;
        }

        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
      }

      if (state.lineIndent > nodeIndent && (ch !== 0)) {
        throwError(state, 'bad indentation of a mapping entry');
      } else if (state.lineIndent < nodeIndent) {
        break;
      }
    }

    //
    // Epilogue.
    //

    // Special case: last mapping's node contains only the key in explicit notation.
    if (atExplicitKey) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
    }

    // Expose the resulting mapping.
    if (detected) {
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = 'mapping';
      state.result = _result;
    }

    return detected;
  }

  function readTagProperty(state) {
    var _position,
        isVerbatim = false,
        isNamed    = false,
        tagHandle,
        tagName,
        ch;

    ch = state.input.charCodeAt(state.position);

    if (ch !== 0x21/* ! */) { return false; }

    if (state.tag !== null) {
      throwError(state, 'duplication of a tag property');
    }

    ch = state.input.charCodeAt(++state.position);

    if (ch === 0x3C/* < */) {
      isVerbatim = true;
      ch = state.input.charCodeAt(++state.position);

    } else if (ch === 0x21/* ! */) {
      isNamed = true;
      tagHandle = '!!';
      ch = state.input.charCodeAt(++state.position);

    } else {
      tagHandle = '!';
    }

    _position = state.position;

    if (isVerbatim) {
      do { ch = state.input.charCodeAt(++state.position); }
      while (ch !== 0 && ch !== 0x3E/* > */);

      if (state.position < state.length) {
        tagName = state.input.slice(_position, state.position);
        ch = state.input.charCodeAt(++state.position);
      } else {
        throwError(state, 'unexpected end of the stream within a verbatim tag');
      }
    } else {
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {

        if (ch === 0x21/* ! */) {
          if (!isNamed) {
            tagHandle = state.input.slice(_position - 1, state.position + 1);

            if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
              throwError(state, 'named tag handle cannot contain such characters');
            }

            isNamed = true;
            _position = state.position + 1;
          } else {
            throwError(state, 'tag suffix cannot contain exclamation marks');
          }
        }

        ch = state.input.charCodeAt(++state.position);
      }

      tagName = state.input.slice(_position, state.position);

      if (PATTERN_FLOW_INDICATORS.test(tagName)) {
        throwError(state, 'tag suffix cannot contain flow indicator characters');
      }
    }

    if (tagName && !PATTERN_TAG_URI.test(tagName)) {
      throwError(state, 'tag name cannot contain such characters: ' + tagName);
    }

    if (isVerbatim) {
      state.tag = tagName;

    } else if (_hasOwnProperty$2.call(state.tagMap, tagHandle)) {
      state.tag = state.tagMap[tagHandle] + tagName;

    } else if (tagHandle === '!') {
      state.tag = '!' + tagName;

    } else if (tagHandle === '!!') {
      state.tag = 'tag:yaml.org,2002:' + tagName;

    } else {
      throwError(state, 'undeclared tag handle "' + tagHandle + '"');
    }

    return true;
  }

  function readAnchorProperty(state) {
    var _position,
        ch;

    ch = state.input.charCodeAt(state.position);

    if (ch !== 0x26/* & */) { return false; }

    if (state.anchor !== null) {
      throwError(state, 'duplication of an anchor property');
    }

    ch = state.input.charCodeAt(++state.position);
    _position = state.position;

    while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }

    if (state.position === _position) {
      throwError(state, 'name of an anchor node must contain at least one character');
    }

    state.anchor = state.input.slice(_position, state.position);
    return true;
  }

  function readAlias(state) {
    var _position, alias,
        ch;

    ch = state.input.charCodeAt(state.position);

    if (ch !== 0x2A/* * */) { return false; }

    ch = state.input.charCodeAt(++state.position);
    _position = state.position;

    while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }

    if (state.position === _position) {
      throwError(state, 'name of an alias node must contain at least one character');
    }

    alias = state.input.slice(_position, state.position);

    if (!state.anchorMap.hasOwnProperty(alias)) {
      throwError(state, 'unidentified alias "' + alias + '"');
    }

    state.result = state.anchorMap[alias];
    skipSeparationSpace(state, true, -1);
    return true;
  }

  function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
    var allowBlockStyles,
        allowBlockScalars,
        allowBlockCollections,
        indentStatus = 1, // 1: this>parent, 0: this=parent, -1: this<parent
        atNewLine  = false,
        hasContent = false,
        typeIndex,
        typeQuantity,
        type,
        flowIndent,
        blockIndent;

    if (state.listener !== null) {
      state.listener('open', state);
    }

    state.tag    = null;
    state.anchor = null;
    state.kind   = null;
    state.result = null;

    allowBlockStyles = allowBlockScalars = allowBlockCollections =
      CONTEXT_BLOCK_OUT === nodeContext ||
      CONTEXT_BLOCK_IN  === nodeContext;

    if (allowToSeek) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;

        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      }
    }

    if (indentStatus === 1) {
      while (readTagProperty(state) || readAnchorProperty(state)) {
        if (skipSeparationSpace(state, true, -1)) {
          atNewLine = true;
          allowBlockCollections = allowBlockStyles;

          if (state.lineIndent > parentIndent) {
            indentStatus = 1;
          } else if (state.lineIndent === parentIndent) {
            indentStatus = 0;
          } else if (state.lineIndent < parentIndent) {
            indentStatus = -1;
          }
        } else {
          allowBlockCollections = false;
        }
      }
    }

    if (allowBlockCollections) {
      allowBlockCollections = atNewLine || allowCompact;
    }

    if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
      if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
        flowIndent = parentIndent;
      } else {
        flowIndent = parentIndent + 1;
      }

      blockIndent = state.position - state.lineStart;

      if (indentStatus === 1) {
        if (allowBlockCollections &&
            (readBlockSequence(state, blockIndent) ||
             readBlockMapping(state, blockIndent, flowIndent)) ||
            readFlowCollection(state, flowIndent)) {
          hasContent = true;
        } else {
          if ((allowBlockScalars && readBlockScalar(state, flowIndent)) ||
              readSingleQuotedScalar(state, flowIndent) ||
              readDoubleQuotedScalar(state, flowIndent)) {
            hasContent = true;

          } else if (readAlias(state)) {
            hasContent = true;

            if (state.tag !== null || state.anchor !== null) {
              throwError(state, 'alias node should not have any properties');
            }

          } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
            hasContent = true;

            if (state.tag === null) {
              state.tag = '?';
            }
          }

          if (state.anchor !== null) {
            state.anchorMap[state.anchor] = state.result;
          }
        }
      } else if (indentStatus === 0) {
        // Special case: block sequences are allowed to have same indentation level as the parent.
        // http://www.yaml.org/spec/1.2/spec.html#id2799784
        hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
      }
    }

    if (state.tag !== null && state.tag !== '!') {
      if (state.tag === '?') {
        for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
          type = state.implicitTypes[typeIndex];

          // Implicit resolving is not allowed for non-scalar types, and '?'
          // non-specific tag is only assigned to plain scalars. So, it isn't
          // needed to check for 'kind' conformity.

          if (type.resolve(state.result)) { // `state.result` updated in resolver if matched
            state.result = type.construct(state.result);
            state.tag = type.tag;
            if (state.anchor !== null) {
              state.anchorMap[state.anchor] = state.result;
            }
            break;
          }
        }
      } else if (_hasOwnProperty$2.call(state.typeMap[state.kind || 'fallback'], state.tag)) {
        type = state.typeMap[state.kind || 'fallback'][state.tag];

        if (state.result !== null && type.kind !== state.kind) {
          throwError(state, 'unacceptable node kind for !<' + state.tag + '> tag; it should be "' + type.kind + '", not "' + state.kind + '"');
        }

        if (!type.resolve(state.result)) { // `state.result` updated in resolver if matched
          throwError(state, 'cannot resolve a node with !<' + state.tag + '> explicit tag');
        } else {
          state.result = type.construct(state.result);
          if (state.anchor !== null) {
            state.anchorMap[state.anchor] = state.result;
          }
        }
      } else {
        throwError(state, 'unknown tag !<' + state.tag + '>');
      }
    }

    if (state.listener !== null) {
      state.listener('close', state);
    }
    return state.tag !== null ||  state.anchor !== null || hasContent;
  }

  function readDocument(state) {
    var documentStart = state.position,
        _position,
        directiveName,
        directiveArgs,
        hasDirectives = false,
        ch;

    state.version = null;
    state.checkLineBreaks = state.legacy;
    state.tagMap = {};
    state.anchorMap = {};

    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      skipSeparationSpace(state, true, -1);

      ch = state.input.charCodeAt(state.position);

      if (state.lineIndent > 0 || ch !== 0x25/* % */) {
        break;
      }

      hasDirectives = true;
      ch = state.input.charCodeAt(++state.position);
      _position = state.position;

      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }

      directiveName = state.input.slice(_position, state.position);
      directiveArgs = [];

      if (directiveName.length < 1) {
        throwError(state, 'directive name must not be less than one character in length');
      }

      while (ch !== 0) {
        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }

        if (ch === 0x23/* # */) {
          do { ch = state.input.charCodeAt(++state.position); }
          while (ch !== 0 && !is_EOL(ch));
          break;
        }

        if (is_EOL(ch)) { break; }

        _position = state.position;

        while (ch !== 0 && !is_WS_OR_EOL(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }

        directiveArgs.push(state.input.slice(_position, state.position));
      }

      if (ch !== 0) { readLineBreak(state); }

      if (_hasOwnProperty$2.call(directiveHandlers, directiveName)) {
        directiveHandlers[directiveName](state, directiveName, directiveArgs);
      } else {
        throwWarning(state, 'unknown document directive "' + directiveName + '"');
      }
    }

    skipSeparationSpace(state, true, -1);

    if (state.lineIndent === 0 &&
        state.input.charCodeAt(state.position)     === 0x2D/* - */ &&
        state.input.charCodeAt(state.position + 1) === 0x2D/* - */ &&
        state.input.charCodeAt(state.position + 2) === 0x2D/* - */) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);

    } else if (hasDirectives) {
      throwError(state, 'directives end mark is expected');
    }

    composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
    skipSeparationSpace(state, true, -1);

    if (state.checkLineBreaks &&
        PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
      throwWarning(state, 'non-ASCII line breaks are interpreted as content');
    }

    state.documents.push(state.result);

    if (state.position === state.lineStart && testDocumentSeparator(state)) {

      if (state.input.charCodeAt(state.position) === 0x2E/* . */) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);
      }
      return;
    }

    if (state.position < (state.length - 1)) {
      throwError(state, 'end of the stream or a document separator is expected');
    } else {
      return;
    }
  }


  function loadDocuments(input, options) {
    input = String(input);
    options = options || {};

    if (input.length !== 0) {

      // Add tailing `\n` if not exists
      if (input.charCodeAt(input.length - 1) !== 0x0A/* LF */ &&
          input.charCodeAt(input.length - 1) !== 0x0D/* CR */) {
        input += '\n';
      }

      // Strip BOM
      if (input.charCodeAt(0) === 0xFEFF) {
        input = input.slice(1);
      }
    }

    var state = new State(input, options);

    // Use 0 as string terminator. That significantly simplifies bounds check.
    state.input += '\0';

    while (state.input.charCodeAt(state.position) === 0x20/* Space */) {
      state.lineIndent += 1;
      state.position += 1;
    }

    while (state.position < (state.length - 1)) {
      readDocument(state);
    }

    return state.documents;
  }


  function loadAll(input, iterator, options) {
    var documents = loadDocuments(input, options), index, length;

    if (typeof iterator !== 'function') {
      return documents;
    }

    for (index = 0, length = documents.length; index < length; index += 1) {
      iterator(documents[index]);
    }
  }


  function load(input, options) {
    var documents = loadDocuments(input, options);

    if (documents.length === 0) {
      /*eslint-disable no-undefined*/
      return undefined;
    } else if (documents.length === 1) {
      return documents[0];
    }
    throw new exception('expected a single document in the stream, but found more');
  }


  function safeLoadAll(input, output, options) {
    if (typeof output === 'function') {
      loadAll(input, output, common.extend({ schema: default_safe }, options));
    } else {
      return loadAll(input, common.extend({ schema: default_safe }, options));
    }
  }


  function safeLoad(input, options) {
    return load(input, common.extend({ schema: default_safe }, options));
  }


  var loadAll_1     = loadAll;
  var load_1        = load;
  var safeLoadAll_1 = safeLoadAll;
  var safeLoad_1    = safeLoad;

  var loader = {
  	loadAll: loadAll_1,
  	load: load_1,
  	safeLoadAll: safeLoadAll_1,
  	safeLoad: safeLoad_1
  };

  /*eslint-disable no-use-before-define*/






  var _toString$2       = Object.prototype.toString;
  var _hasOwnProperty$3 = Object.prototype.hasOwnProperty;

  var CHAR_TAB                  = 0x09; /* Tab */
  var CHAR_LINE_FEED            = 0x0A; /* LF */
  var CHAR_SPACE                = 0x20; /* Space */
  var CHAR_EXCLAMATION          = 0x21; /* ! */
  var CHAR_DOUBLE_QUOTE         = 0x22; /* " */
  var CHAR_SHARP                = 0x23; /* # */
  var CHAR_PERCENT              = 0x25; /* % */
  var CHAR_AMPERSAND            = 0x26; /* & */
  var CHAR_SINGLE_QUOTE         = 0x27; /* ' */
  var CHAR_ASTERISK             = 0x2A; /* * */
  var CHAR_COMMA                = 0x2C; /* , */
  var CHAR_MINUS                = 0x2D; /* - */
  var CHAR_COLON                = 0x3A; /* : */
  var CHAR_GREATER_THAN         = 0x3E; /* > */
  var CHAR_QUESTION             = 0x3F; /* ? */
  var CHAR_COMMERCIAL_AT        = 0x40; /* @ */
  var CHAR_LEFT_SQUARE_BRACKET  = 0x5B; /* [ */
  var CHAR_RIGHT_SQUARE_BRACKET = 0x5D; /* ] */
  var CHAR_GRAVE_ACCENT         = 0x60; /* ` */
  var CHAR_LEFT_CURLY_BRACKET   = 0x7B; /* { */
  var CHAR_VERTICAL_LINE        = 0x7C; /* | */
  var CHAR_RIGHT_CURLY_BRACKET  = 0x7D; /* } */

  var ESCAPE_SEQUENCES = {};

  ESCAPE_SEQUENCES[0x00]   = '\\0';
  ESCAPE_SEQUENCES[0x07]   = '\\a';
  ESCAPE_SEQUENCES[0x08]   = '\\b';
  ESCAPE_SEQUENCES[0x09]   = '\\t';
  ESCAPE_SEQUENCES[0x0A]   = '\\n';
  ESCAPE_SEQUENCES[0x0B]   = '\\v';
  ESCAPE_SEQUENCES[0x0C]   = '\\f';
  ESCAPE_SEQUENCES[0x0D]   = '\\r';
  ESCAPE_SEQUENCES[0x1B]   = '\\e';
  ESCAPE_SEQUENCES[0x22]   = '\\"';
  ESCAPE_SEQUENCES[0x5C]   = '\\\\';
  ESCAPE_SEQUENCES[0x85]   = '\\N';
  ESCAPE_SEQUENCES[0xA0]   = '\\_';
  ESCAPE_SEQUENCES[0x2028] = '\\L';
  ESCAPE_SEQUENCES[0x2029] = '\\P';

  var DEPRECATED_BOOLEANS_SYNTAX = [
    'y', 'Y', 'yes', 'Yes', 'YES', 'on', 'On', 'ON',
    'n', 'N', 'no', 'No', 'NO', 'off', 'Off', 'OFF'
  ];

  function compileStyleMap(schema, map) {
    var result, keys, index, length, tag, style, type;

    if (map === null) { return {}; }

    result = {};
    keys = Object.keys(map);

    for (index = 0, length = keys.length; index < length; index += 1) {
      tag = keys[index];
      style = String(map[tag]);

      if (tag.slice(0, 2) === '!!') {
        tag = 'tag:yaml.org,2002:' + tag.slice(2);
      }
      type = schema.compiledTypeMap['fallback'][tag];

      if (type && _hasOwnProperty$3.call(type.styleAliases, style)) {
        style = type.styleAliases[style];
      }

      result[tag] = style;
    }

    return result;
  }

  function encodeHex(character) {
    var string, handle, length;

    string = character.toString(16).toUpperCase();

    if (character <= 0xFF) {
      handle = 'x';
      length = 2;
    } else if (character <= 0xFFFF) {
      handle = 'u';
      length = 4;
    } else if (character <= 0xFFFFFFFF) {
      handle = 'U';
      length = 8;
    } else {
      throw new exception('code point within a string may not be greater than 0xFFFFFFFF');
    }

    return '\\' + handle + common.repeat('0', length - string.length) + string;
  }

  function State$1(options) {
    this.schema        = options['schema'] || default_full;
    this.indent        = Math.max(1, (options['indent'] || 2));
    this.noArrayIndent = options['noArrayIndent'] || false;
    this.skipInvalid   = options['skipInvalid'] || false;
    this.flowLevel     = (common.isNothing(options['flowLevel']) ? -1 : options['flowLevel']);
    this.styleMap      = compileStyleMap(this.schema, options['styles'] || null);
    this.sortKeys      = options['sortKeys'] || false;
    this.lineWidth     = options['lineWidth'] || 80;
    this.noRefs        = options['noRefs'] || false;
    this.noCompatMode  = options['noCompatMode'] || false;
    this.condenseFlow  = options['condenseFlow'] || false;

    this.implicitTypes = this.schema.compiledImplicit;
    this.explicitTypes = this.schema.compiledExplicit;

    this.tag = null;
    this.result = '';

    this.duplicates = [];
    this.usedDuplicates = null;
  }

  // Indents every line in a string. Empty lines (\n only) are not indented.
  function indentString(string, spaces) {
    var ind = common.repeat(' ', spaces),
        position = 0,
        next = -1,
        result = '',
        line,
        length = string.length;

    while (position < length) {
      next = string.indexOf('\n', position);
      if (next === -1) {
        line = string.slice(position);
        position = length;
      } else {
        line = string.slice(position, next + 1);
        position = next + 1;
      }

      if (line.length && line !== '\n') { result += ind; }

      result += line;
    }

    return result;
  }

  function generateNextLine(state, level) {
    return '\n' + common.repeat(' ', state.indent * level);
  }

  function testImplicitResolving(state, str) {
    var index, length, type;

    for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
      type = state.implicitTypes[index];

      if (type.resolve(str)) {
        return true;
      }
    }

    return false;
  }

  // [33] s-white ::= s-space | s-tab
  function isWhitespace(c) {
    return c === CHAR_SPACE || c === CHAR_TAB;
  }

  // Returns true if the character can be printed without escaping.
  // From YAML 1.2: "any allowed characters known to be non-printable
  // should also be escaped. [However,] This isn’t mandatory"
  // Derived from nb-char - \t - #x85 - #xA0 - #x2028 - #x2029.
  function isPrintable(c) {
    return  (0x00020 <= c && c <= 0x00007E)
        || ((0x000A1 <= c && c <= 0x00D7FF) && c !== 0x2028 && c !== 0x2029)
        || ((0x0E000 <= c && c <= 0x00FFFD) && c !== 0xFEFF /* BOM */)
        ||  (0x10000 <= c && c <= 0x10FFFF);
  }

  // Simplified test for values allowed after the first character in plain style.
  function isPlainSafe(c) {
    // Uses a subset of nb-char - c-flow-indicator - ":" - "#"
    // where nb-char ::= c-printable - b-char - c-byte-order-mark.
    return isPrintable(c) && c !== 0xFEFF
      // - c-flow-indicator
      && c !== CHAR_COMMA
      && c !== CHAR_LEFT_SQUARE_BRACKET
      && c !== CHAR_RIGHT_SQUARE_BRACKET
      && c !== CHAR_LEFT_CURLY_BRACKET
      && c !== CHAR_RIGHT_CURLY_BRACKET
      // - ":" - "#"
      && c !== CHAR_COLON
      && c !== CHAR_SHARP;
  }

  // Simplified test for values allowed as the first character in plain style.
  function isPlainSafeFirst(c) {
    // Uses a subset of ns-char - c-indicator
    // where ns-char = nb-char - s-white.
    return isPrintable(c) && c !== 0xFEFF
      && !isWhitespace(c) // - s-white
      // - (c-indicator ::=
      // “-” | “?” | “:” | “,” | “[” | “]” | “{” | “}”
      && c !== CHAR_MINUS
      && c !== CHAR_QUESTION
      && c !== CHAR_COLON
      && c !== CHAR_COMMA
      && c !== CHAR_LEFT_SQUARE_BRACKET
      && c !== CHAR_RIGHT_SQUARE_BRACKET
      && c !== CHAR_LEFT_CURLY_BRACKET
      && c !== CHAR_RIGHT_CURLY_BRACKET
      // | “#” | “&” | “*” | “!” | “|” | “>” | “'” | “"”
      && c !== CHAR_SHARP
      && c !== CHAR_AMPERSAND
      && c !== CHAR_ASTERISK
      && c !== CHAR_EXCLAMATION
      && c !== CHAR_VERTICAL_LINE
      && c !== CHAR_GREATER_THAN
      && c !== CHAR_SINGLE_QUOTE
      && c !== CHAR_DOUBLE_QUOTE
      // | “%” | “@” | “`”)
      && c !== CHAR_PERCENT
      && c !== CHAR_COMMERCIAL_AT
      && c !== CHAR_GRAVE_ACCENT;
  }

  // Determines whether block indentation indicator is required.
  function needIndentIndicator(string) {
    var leadingSpaceRe = /^\n* /;
    return leadingSpaceRe.test(string);
  }

  var STYLE_PLAIN   = 1,
      STYLE_SINGLE  = 2,
      STYLE_LITERAL = 3,
      STYLE_FOLDED  = 4,
      STYLE_DOUBLE  = 5;

  // Determines which scalar styles are possible and returns the preferred style.
  // lineWidth = -1 => no limit.
  // Pre-conditions: str.length > 0.
  // Post-conditions:
  //    STYLE_PLAIN or STYLE_SINGLE => no \n are in the string.
  //    STYLE_LITERAL => no lines are suitable for folding (or lineWidth is -1).
  //    STYLE_FOLDED => a line > lineWidth and can be folded (and lineWidth != -1).
  function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType) {
    var i;
    var char;
    var hasLineBreak = false;
    var hasFoldableLine = false; // only checked if shouldTrackWidth
    var shouldTrackWidth = lineWidth !== -1;
    var previousLineBreak = -1; // count the first line correctly
    var plain = isPlainSafeFirst(string.charCodeAt(0))
            && !isWhitespace(string.charCodeAt(string.length - 1));

    if (singleLineOnly) {
      // Case: no block styles.
      // Check for disallowed characters to rule out plain and single.
      for (i = 0; i < string.length; i++) {
        char = string.charCodeAt(i);
        if (!isPrintable(char)) {
          return STYLE_DOUBLE;
        }
        plain = plain && isPlainSafe(char);
      }
    } else {
      // Case: block styles permitted.
      for (i = 0; i < string.length; i++) {
        char = string.charCodeAt(i);
        if (char === CHAR_LINE_FEED) {
          hasLineBreak = true;
          // Check if any line can be folded.
          if (shouldTrackWidth) {
            hasFoldableLine = hasFoldableLine ||
              // Foldable line = too long, and not more-indented.
              (i - previousLineBreak - 1 > lineWidth &&
               string[previousLineBreak + 1] !== ' ');
            previousLineBreak = i;
          }
        } else if (!isPrintable(char)) {
          return STYLE_DOUBLE;
        }
        plain = plain && isPlainSafe(char);
      }
      // in case the end is missing a \n
      hasFoldableLine = hasFoldableLine || (shouldTrackWidth &&
        (i - previousLineBreak - 1 > lineWidth &&
         string[previousLineBreak + 1] !== ' '));
    }
    // Although every style can represent \n without escaping, prefer block styles
    // for multiline, since they're more readable and they don't add empty lines.
    // Also prefer folding a super-long line.
    if (!hasLineBreak && !hasFoldableLine) {
      // Strings interpretable as another type have to be quoted;
      // e.g. the string 'true' vs. the boolean true.
      return plain && !testAmbiguousType(string)
        ? STYLE_PLAIN : STYLE_SINGLE;
    }
    // Edge case: block indentation indicator can only have one digit.
    if (indentPerLevel > 9 && needIndentIndicator(string)) {
      return STYLE_DOUBLE;
    }
    // At this point we know block styles are valid.
    // Prefer literal style unless we want to fold.
    return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
  }

  // Note: line breaking/folding is implemented for only the folded style.
  // NB. We drop the last trailing newline (if any) of a returned block scalar
  //  since the dumper adds its own newline. This always works:
  //    • No ending newline => unaffected; already using strip "-" chomping.
  //    • Ending newline    => removed then restored.
  //  Importantly, this keeps the "+" chomp indicator from gaining an extra line.
  function writeScalar(state, string, level, iskey) {
    state.dump = (function () {
      if (string.length === 0) {
        return "''";
      }
      if (!state.noCompatMode &&
          DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1) {
        return "'" + string + "'";
      }

      var indent = state.indent * Math.max(1, level); // no 0-indent scalars
      // As indentation gets deeper, let the width decrease monotonically
      // to the lower bound min(state.lineWidth, 40).
      // Note that this implies
      //  state.lineWidth ≤ 40 + state.indent: width is fixed at the lower bound.
      //  state.lineWidth > 40 + state.indent: width decreases until the lower bound.
      // This behaves better than a constant minimum width which disallows narrower options,
      // or an indent threshold which causes the width to suddenly increase.
      var lineWidth = state.lineWidth === -1
        ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);

      // Without knowing if keys are implicit/explicit, assume implicit for safety.
      var singleLineOnly = iskey
        // No block styles in flow mode.
        || (state.flowLevel > -1 && level >= state.flowLevel);
      function testAmbiguity(string) {
        return testImplicitResolving(state, string);
      }

      switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity)) {
        case STYLE_PLAIN:
          return string;
        case STYLE_SINGLE:
          return "'" + string.replace(/'/g, "''") + "'";
        case STYLE_LITERAL:
          return '|' + blockHeader(string, state.indent)
            + dropEndingNewline(indentString(string, indent));
        case STYLE_FOLDED:
          return '>' + blockHeader(string, state.indent)
            + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
        case STYLE_DOUBLE:
          return '"' + escapeString(string, lineWidth) + '"';
        default:
          throw new exception('impossible error: invalid scalar style');
      }
    }());
  }

  // Pre-conditions: string is valid for a block scalar, 1 <= indentPerLevel <= 9.
  function blockHeader(string, indentPerLevel) {
    var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : '';

    // note the special case: the string '\n' counts as a "trailing" empty line.
    var clip =          string[string.length - 1] === '\n';
    var keep = clip && (string[string.length - 2] === '\n' || string === '\n');
    var chomp = keep ? '+' : (clip ? '' : '-');

    return indentIndicator + chomp + '\n';
  }

  // (See the note for writeScalar.)
  function dropEndingNewline(string) {
    return string[string.length - 1] === '\n' ? string.slice(0, -1) : string;
  }

  // Note: a long line without a suitable break point will exceed the width limit.
  // Pre-conditions: every char in str isPrintable, str.length > 0, width > 0.
  function foldString(string, width) {
    // In folded style, $k$ consecutive newlines output as $k+1$ newlines—
    // unless they're before or after a more-indented line, or at the very
    // beginning or end, in which case $k$ maps to $k$.
    // Therefore, parse each chunk as newline(s) followed by a content line.
    var lineRe = /(\n+)([^\n]*)/g;

    // first line (possibly an empty line)
    var result = (function () {
      var nextLF = string.indexOf('\n');
      nextLF = nextLF !== -1 ? nextLF : string.length;
      lineRe.lastIndex = nextLF;
      return foldLine(string.slice(0, nextLF), width);
    }());
    // If we haven't reached the first content line yet, don't add an extra \n.
    var prevMoreIndented = string[0] === '\n' || string[0] === ' ';
    var moreIndented;

    // rest of the lines
    var match;
    while ((match = lineRe.exec(string))) {
      var prefix = match[1], line = match[2];
      moreIndented = (line[0] === ' ');
      result += prefix
        + (!prevMoreIndented && !moreIndented && line !== ''
          ? '\n' : '')
        + foldLine(line, width);
      prevMoreIndented = moreIndented;
    }

    return result;
  }

  // Greedy line breaking.
  // Picks the longest line under the limit each time,
  // otherwise settles for the shortest line over the limit.
  // NB. More-indented lines *cannot* be folded, as that would add an extra \n.
  function foldLine(line, width) {
    if (line === '' || line[0] === ' ') { return line; }

    // Since a more-indented line adds a \n, breaks can't be followed by a space.
    var breakRe = / [^ ]/g; // note: the match index will always be <= length-2.
    var match;
    // start is an inclusive index. end, curr, and next are exclusive.
    var start = 0, end, curr = 0, next = 0;
    var result = '';

    // Invariants: 0 <= start <= length-1.
    //   0 <= curr <= next <= max(0, length-2). curr - start <= width.
    // Inside the loop:
    //   A match implies length >= 2, so curr and next are <= length-2.
    while ((match = breakRe.exec(line))) {
      next = match.index;
      // maintain invariant: curr - start <= width
      if (next - start > width) {
        end = (curr > start) ? curr : next; // derive end <= length-2
        result += '\n' + line.slice(start, end);
        // skip the space that was output as \n
        start = end + 1;                    // derive start <= length-1
      }
      curr = next;
    }

    // By the invariants, start <= length-1, so there is something left over.
    // It is either the whole string or a part starting from non-whitespace.
    result += '\n';
    // Insert a break if the remainder is too long and there is a break available.
    if (line.length - start > width && curr > start) {
      result += line.slice(start, curr) + '\n' + line.slice(curr + 1);
    } else {
      result += line.slice(start);
    }

    return result.slice(1); // drop extra \n joiner
  }

  // Escapes a double-quoted string.
  function escapeString(string) {
    var result = '';
    var char, nextChar;
    var escapeSeq;

    for (var i = 0; i < string.length; i++) {
      char = string.charCodeAt(i);
      // Check for surrogate pairs (reference Unicode 3.0 section "3.7 Surrogates").
      if (char >= 0xD800 && char <= 0xDBFF/* high surrogate */) {
        nextChar = string.charCodeAt(i + 1);
        if (nextChar >= 0xDC00 && nextChar <= 0xDFFF/* low surrogate */) {
          // Combine the surrogate pair and store it escaped.
          result += encodeHex((char - 0xD800) * 0x400 + nextChar - 0xDC00 + 0x10000);
          // Advance index one extra since we already used that char here.
          i++; continue;
        }
      }
      escapeSeq = ESCAPE_SEQUENCES[char];
      result += !escapeSeq && isPrintable(char)
        ? string[i]
        : escapeSeq || encodeHex(char);
    }

    return result;
  }

  function writeFlowSequence(state, level, object) {
    var _result = '',
        _tag    = state.tag,
        index,
        length;

    for (index = 0, length = object.length; index < length; index += 1) {
      // Write only valid elements.
      if (writeNode(state, level, object[index], false, false)) {
        if (index !== 0) { _result += ',' + (!state.condenseFlow ? ' ' : ''); }
        _result += state.dump;
      }
    }

    state.tag = _tag;
    state.dump = '[' + _result + ']';
  }

  function writeBlockSequence(state, level, object, compact) {
    var _result = '',
        _tag    = state.tag,
        index,
        length;

    for (index = 0, length = object.length; index < length; index += 1) {
      // Write only valid elements.
      if (writeNode(state, level + 1, object[index], true, true)) {
        if (!compact || index !== 0) {
          _result += generateNextLine(state, level);
        }

        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          _result += '-';
        } else {
          _result += '- ';
        }

        _result += state.dump;
      }
    }

    state.tag = _tag;
    state.dump = _result || '[]'; // Empty sequence if no valid values.
  }

  function writeFlowMapping(state, level, object) {
    var _result       = '',
        _tag          = state.tag,
        objectKeyList = Object.keys(object),
        index,
        length,
        objectKey,
        objectValue,
        pairBuffer;

    for (index = 0, length = objectKeyList.length; index < length; index += 1) {
      pairBuffer = state.condenseFlow ? '"' : '';

      if (index !== 0) { pairBuffer += ', '; }

      objectKey = objectKeyList[index];
      objectValue = object[objectKey];

      if (!writeNode(state, level, objectKey, false, false)) {
        continue; // Skip this pair because of invalid key;
      }

      if (state.dump.length > 1024) { pairBuffer += '? '; }

      pairBuffer += state.dump + (state.condenseFlow ? '"' : '') + ':' + (state.condenseFlow ? '' : ' ');

      if (!writeNode(state, level, objectValue, false, false)) {
        continue; // Skip this pair because of invalid value.
      }

      pairBuffer += state.dump;

      // Both key and value are valid.
      _result += pairBuffer;
    }

    state.tag = _tag;
    state.dump = '{' + _result + '}';
  }

  function writeBlockMapping(state, level, object, compact) {
    var _result       = '',
        _tag          = state.tag,
        objectKeyList = Object.keys(object),
        index,
        length,
        objectKey,
        objectValue,
        explicitPair,
        pairBuffer;

    // Allow sorting keys so that the output file is deterministic
    if (state.sortKeys === true) {
      // Default sorting
      objectKeyList.sort();
    } else if (typeof state.sortKeys === 'function') {
      // Custom sort function
      objectKeyList.sort(state.sortKeys);
    } else if (state.sortKeys) {
      // Something is wrong
      throw new exception('sortKeys must be a boolean or a function');
    }

    for (index = 0, length = objectKeyList.length; index < length; index += 1) {
      pairBuffer = '';

      if (!compact || index !== 0) {
        pairBuffer += generateNextLine(state, level);
      }

      objectKey = objectKeyList[index];
      objectValue = object[objectKey];

      if (!writeNode(state, level + 1, objectKey, true, true, true)) {
        continue; // Skip this pair because of invalid key.
      }

      explicitPair = (state.tag !== null && state.tag !== '?') ||
                     (state.dump && state.dump.length > 1024);

      if (explicitPair) {
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          pairBuffer += '?';
        } else {
          pairBuffer += '? ';
        }
      }

      pairBuffer += state.dump;

      if (explicitPair) {
        pairBuffer += generateNextLine(state, level);
      }

      if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
        continue; // Skip this pair because of invalid value.
      }

      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += ':';
      } else {
        pairBuffer += ': ';
      }

      pairBuffer += state.dump;

      // Both key and value are valid.
      _result += pairBuffer;
    }

    state.tag = _tag;
    state.dump = _result || '{}'; // Empty mapping if no valid pairs.
  }

  function detectType(state, object, explicit) {
    var _result, typeList, index, length, type, style;

    typeList = explicit ? state.explicitTypes : state.implicitTypes;

    for (index = 0, length = typeList.length; index < length; index += 1) {
      type = typeList[index];

      if ((type.instanceOf  || type.predicate) &&
          (!type.instanceOf || ((typeof object === 'object') && (object instanceof type.instanceOf))) &&
          (!type.predicate  || type.predicate(object))) {

        state.tag = explicit ? type.tag : '?';

        if (type.represent) {
          style = state.styleMap[type.tag] || type.defaultStyle;

          if (_toString$2.call(type.represent) === '[object Function]') {
            _result = type.represent(object, style);
          } else if (_hasOwnProperty$3.call(type.represent, style)) {
            _result = type.represent[style](object, style);
          } else {
            throw new exception('!<' + type.tag + '> tag resolver accepts not "' + style + '" style');
          }

          state.dump = _result;
        }

        return true;
      }
    }

    return false;
  }

  // Serializes `object` and writes it to global `result`.
  // Returns true on success, or false on invalid object.
  //
  function writeNode(state, level, object, block, compact, iskey) {
    state.tag = null;
    state.dump = object;

    if (!detectType(state, object, false)) {
      detectType(state, object, true);
    }

    var type = _toString$2.call(state.dump);

    if (block) {
      block = (state.flowLevel < 0 || state.flowLevel > level);
    }

    var objectOrArray = type === '[object Object]' || type === '[object Array]',
        duplicateIndex,
        duplicate;

    if (objectOrArray) {
      duplicateIndex = state.duplicates.indexOf(object);
      duplicate = duplicateIndex !== -1;
    }

    if ((state.tag !== null && state.tag !== '?') || duplicate || (state.indent !== 2 && level > 0)) {
      compact = false;
    }

    if (duplicate && state.usedDuplicates[duplicateIndex]) {
      state.dump = '*ref_' + duplicateIndex;
    } else {
      if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
        state.usedDuplicates[duplicateIndex] = true;
      }
      if (type === '[object Object]') {
        if (block && (Object.keys(state.dump).length !== 0)) {
          writeBlockMapping(state, level, state.dump, compact);
          if (duplicate) {
            state.dump = '&ref_' + duplicateIndex + state.dump;
          }
        } else {
          writeFlowMapping(state, level, state.dump);
          if (duplicate) {
            state.dump = '&ref_' + duplicateIndex + ' ' + state.dump;
          }
        }
      } else if (type === '[object Array]') {
        var arrayLevel = (state.noArrayIndent && (level > 0)) ? level - 1 : level;
        if (block && (state.dump.length !== 0)) {
          writeBlockSequence(state, arrayLevel, state.dump, compact);
          if (duplicate) {
            state.dump = '&ref_' + duplicateIndex + state.dump;
          }
        } else {
          writeFlowSequence(state, arrayLevel, state.dump);
          if (duplicate) {
            state.dump = '&ref_' + duplicateIndex + ' ' + state.dump;
          }
        }
      } else if (type === '[object String]') {
        if (state.tag !== '?') {
          writeScalar(state, state.dump, level, iskey);
        }
      } else {
        if (state.skipInvalid) { return false; }
        throw new exception('unacceptable kind of an object to dump ' + type);
      }

      if (state.tag !== null && state.tag !== '?') {
        state.dump = '!<' + state.tag + '> ' + state.dump;
      }
    }

    return true;
  }

  function getDuplicateReferences(object, state) {
    var objects = [],
        duplicatesIndexes = [],
        index,
        length;

    inspectNode(object, objects, duplicatesIndexes);

    for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
      state.duplicates.push(objects[duplicatesIndexes[index]]);
    }
    state.usedDuplicates = new Array(length);
  }

  function inspectNode(object, objects, duplicatesIndexes) {
    var objectKeyList,
        index,
        length;

    if (object !== null && typeof object === 'object') {
      index = objects.indexOf(object);
      if (index !== -1) {
        if (duplicatesIndexes.indexOf(index) === -1) {
          duplicatesIndexes.push(index);
        }
      } else {
        objects.push(object);

        if (Array.isArray(object)) {
          for (index = 0, length = object.length; index < length; index += 1) {
            inspectNode(object[index], objects, duplicatesIndexes);
          }
        } else {
          objectKeyList = Object.keys(object);

          for (index = 0, length = objectKeyList.length; index < length; index += 1) {
            inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
          }
        }
      }
    }
  }

  function dump(input, options) {
    options = options || {};

    var state = new State$1(options);

    if (!state.noRefs) { getDuplicateReferences(input, state); }

    if (writeNode(state, 0, input, true, true)) { return state.dump + '\n'; }

    return '';
  }

  function safeDump(input, options) {
    return dump(input, common.extend({ schema: default_safe }, options));
  }

  var dump_1     = dump;
  var safeDump_1 = safeDump;

  var dumper = {
  	dump: dump_1,
  	safeDump: safeDump_1
  };

  function deprecated(name) {
    return function () {
      throw new Error('Function ' + name + ' is deprecated and cannot be used.');
    };
  }


  var Type$1                = type;
  var Schema$1              = schema;
  var FAILSAFE_SCHEMA     = failsafe;
  var JSON_SCHEMA         = json$1;
  var CORE_SCHEMA         = core;
  var DEFAULT_SAFE_SCHEMA = default_safe;
  var DEFAULT_FULL_SCHEMA = default_full;
  var load$1                = loader.load;
  var loadAll$1             = loader.loadAll;
  var safeLoad$1            = loader.safeLoad;
  var safeLoadAll$1         = loader.safeLoadAll;
  var dump$1                = dumper.dump;
  var safeDump$1            = dumper.safeDump;
  var YAMLException$1       = exception;

  // Deprecated schema names from JS-YAML 2.0.x
  var MINIMAL_SCHEMA = failsafe;
  var SAFE_SCHEMA    = default_safe;
  var DEFAULT_SCHEMA = default_full;

  // Deprecated functions from JS-YAML 1.x.x
  var scan           = deprecated('scan');
  var parse          = deprecated('parse');
  var compose        = deprecated('compose');
  var addConstructor = deprecated('addConstructor');

  var jsYaml = {
  	Type: Type$1,
  	Schema: Schema$1,
  	FAILSAFE_SCHEMA: FAILSAFE_SCHEMA,
  	JSON_SCHEMA: JSON_SCHEMA,
  	CORE_SCHEMA: CORE_SCHEMA,
  	DEFAULT_SAFE_SCHEMA: DEFAULT_SAFE_SCHEMA,
  	DEFAULT_FULL_SCHEMA: DEFAULT_FULL_SCHEMA,
  	load: load$1,
  	loadAll: loadAll$1,
  	safeLoad: safeLoad$1,
  	safeLoadAll: safeLoadAll$1,
  	dump: dump$1,
  	safeDump: safeDump$1,
  	YAMLException: YAMLException$1,
  	MINIMAL_SCHEMA: MINIMAL_SCHEMA,
  	SAFE_SCHEMA: SAFE_SCHEMA,
  	DEFAULT_SCHEMA: DEFAULT_SCHEMA,
  	scan: scan,
  	parse: parse,
  	compose: compose,
  	addConstructor: addConstructor
  };

  var jsYaml$1 = jsYaml;

  var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  function getCjsExportFromNamespace (n) {
  	return n && n.default || n;
  }

  var formatUtil = util$2.format;

  var ono = createCommonjsModule(function (module) {


  var slice = Array.prototype.slice;
  var protectedProperties = ['name', 'message', 'stack'];
  var errorPrototypeProperties = [
    'name', 'message', 'description', 'number', 'code', 'fileName', 'lineNumber', 'columnNumber',
    'sourceURL', 'line', 'column', 'stack'
  ];

  module.exports = create(Error);
  module.exports.error = create(Error);
  module.exports.eval = create(EvalError);
  module.exports.range = create(RangeError);
  module.exports.reference = create(ReferenceError);
  module.exports.syntax = create(SyntaxError);
  module.exports.type = create(TypeError);
  module.exports.uri = create(URIError);
  module.exports.formatter = formatUtil;

  /**
   * Creates a new {@link ono} function that creates the given Error class.
   *
   * @param {Class} Klass - The Error subclass to create
   * @returns {ono}
   */
  function create (Klass) {
    /**
     * @param {Error}   [err]     - The original error, if any
     * @param {object}  [props]   - An object whose properties will be added to the error object
     * @param {string}  [message] - The error message. May contain {@link util#format} placeholders
     * @param {...*}    [params]  - Parameters that map to the `message` placeholders
     * @returns {Error}
     */
    return function onoFactory (err, props, message, params) {   // eslint-disable-line no-unused-vars
      var formatArgs = [];
      var formattedMessage = '';

      // Determine which arguments were actually specified
      if (typeof err === 'string') {
        formatArgs = slice.call(arguments);
        err = props = undefined;
      }
      else if (typeof props === 'string') {
        formatArgs = slice.call(arguments, 1);
        props = undefined;
      }
      else if (typeof message === 'string') {
        formatArgs = slice.call(arguments, 2);
      }

      // If there are any format arguments, then format the error message
      if (formatArgs.length > 0) {
        formattedMessage = module.exports.formatter.apply(null, formatArgs);
      }

      if (err && err.message) {
        // The inner-error's message will be added to the new message
        formattedMessage += (formattedMessage ? ' \n' : '') + err.message;
      }

      // Create the new error
      // NOTE: DON'T move this to a separate function! We don't want to pollute the stack trace
      var newError = new Klass(formattedMessage);

      // Extend the new error with the additional properties
      extendError(newError, err);   // Copy properties of the original error
      extendToJSON(newError);       // Replace the original toJSON method
      extend(newError, props);      // Copy custom properties, possibly including a custom toJSON method

      return newError;
    };
  }

  /**
   * Extends the targetError with the properties of the source error.
   *
   * @param {Error}   targetError - The error object to extend
   * @param {?Error}  sourceError - The source error object, if any
   */
  function extendError (targetError, sourceError) {
    extendStack(targetError, sourceError);
    extend(targetError, sourceError);
  }

  /**
   * JavaScript engines differ in how errors are serialized to JSON - especially when it comes
   * to custom error properties and stack traces.  So we add our own toJSON method that ALWAYS
   * outputs every property of the error.
   */
  function extendToJSON (error) {
    error.toJSON = errorToJSON;

    // Also add an inspect() method, for compatibility with Node.js' `util.inspect()` method
    error.inspect = errorToString;
  }

  /**
   * Extends the target object with the properties of the source object.
   *
   * @param {object}  target - The object to extend
   * @param {?source} source - The object whose properties are copied
   */
  function extend (target, source) {
    if (source && typeof source === 'object') {
      var keys = Object.keys(source);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];

        // Don't copy "protected" properties, since they have special meaning/behavior
        // and are set by the onoFactory function
        if (protectedProperties.indexOf(key) >= 0) {
          continue;
        }

        try {
          target[key] = source[key];
        }
        catch (e) {
          // This property is read-only, so it can't be copied
        }
      }
    }
  }

  /**
   * Custom JSON serializer for Error objects.
   * Returns all built-in error properties, as well as extended properties.
   *
   * @returns {object}
   */
  function errorToJSON () {
    var json = {};

    // Get all the properties of this error
    var keys = Object.keys(this);

    // Also include properties from the Error prototype
    keys = keys.concat(errorPrototypeProperties);

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = this[key];
      var type = typeof value;
      if (type !== 'undefined' && type !== 'function') {
        json[key] = value;
      }
    }

    return json;
  }

  /**
   * Serializes Error objects as human-readable JSON strings for debugging/logging purposes.
   *
   * @returns {string}
   */
  function errorToString () {
    return JSON.stringify(this, null, 2).replace(/\\n/g, '\n');
  }

  /**
   * Extend the error stack to include its cause
   *
   * @param {Error} targetError
   * @param {Error} sourceError
   */
  function extendStack (targetError, sourceError) {
    if (hasLazyStack(targetError)) {
      if (sourceError) {
        lazyJoinStacks(targetError, sourceError);
      }
      else {
        lazyPopStack(targetError);
      }
    }
    else {
      if (sourceError) {
        targetError.stack = joinStacks(targetError.stack, sourceError.stack);
      }
      else {
        targetError.stack = popStack(targetError.stack);
      }
    }
  }

  /**
   * Appends the original {@link Error#stack} property to the new Error's stack.
   *
   * @param {string} newStack
   * @param {string} originalStack
   * @returns {string}
   */
  function joinStacks (newStack, originalStack) {
    newStack = popStack(newStack);

    if (newStack && originalStack) {
      return newStack + '\n\n' + originalStack;
    }
    else {
      return newStack || originalStack;
    }
  }

  /**
   * Removes Ono from the stack, so that the stack starts at the original error location
   *
   * @param {string} stack
   * @returns {string}
   */
  function popStack (stack) {
    if (stack) {
      var lines = stack.split('\n');

      if (lines.length < 2) {
        // The stack only has one line, so there's nothing we can remove
        return stack;
      }

      // Find the `onoFactory` call in the stack, and remove it
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.indexOf('onoFactory') >= 0) {
          lines.splice(i, 1);
          return lines.join('\n');
        }
      }

      // If we get here, then the stack doesn't contain a call to `onoFactory`.
      // This may be due to minification or some optimization of the JS engine.
      // So just return the stack as-is.
      return stack;
    }
  }

  /**
   * Does a one-time determination of whether this JavaScript engine
   * supports lazy `Error.stack` properties.
   */
  var supportsLazyStack = (function () {
    return !!(
      // ES5 property descriptors must be supported
      Object.getOwnPropertyDescriptor && Object.defineProperty &&

      // Chrome on Android doesn't support lazy stacks :(
      (typeof navigator === 'undefined' || !/Android/.test(navigator.userAgent))
    );
  }());

  /**
   * Does this error have a lazy stack property?
   *
   * @param {Error} err
   * @returns {boolean}
   */
  function hasLazyStack (err) {
    if (!supportsLazyStack) {
      return false;
    }

    var descriptor = Object.getOwnPropertyDescriptor(err, 'stack');
    if (!descriptor) {
      return false;
    }
    return typeof descriptor.get === 'function';
  }

  /**
   * Calls {@link joinStacks} lazily, when the {@link Error#stack} property is accessed.
   *
   * @param {Error} targetError
   * @param {Error} sourceError
   */
  function lazyJoinStacks (targetError, sourceError) {
    var targetStack = Object.getOwnPropertyDescriptor(targetError, 'stack');

    Object.defineProperty(targetError, 'stack', {
      get: function () {
        return joinStacks(targetStack.get.apply(targetError), sourceError.stack);
      },
      enumerable: false,
      configurable: true
    });
  }

  /**
   * Calls {@link popStack} lazily, when the {@link Error#stack} property is accessed.
   *
   * @param {Error} error
   */
  function lazyPopStack (error) {
    var targetStack = Object.getOwnPropertyDescriptor(error, 'stack');

    Object.defineProperty(error, 'stack', {
      get: function () {
        return popStack(targetStack.get.apply(error));
      },
      enumerable: false,
      configurable: true
    });
  }
  });
  var ono_1 = ono.error;
  var ono_2 = ono.range;
  var ono_3 = ono.reference;
  var ono_4 = ono.syntax;
  var ono_5 = ono.type;
  var ono_6 = ono.uri;
  var ono_7 = ono.formatter;

  /**
   * Simple YAML parsing functions, similar to {@link JSON.parse} and {@link JSON.stringify}
   */
  var yaml_1 = {
    /**
     * Parses a YAML string and returns the value.
     *
     * @param {string} text - The YAML string to be parsed
     * @param {function} [reviver] - Not currently supported. Provided for consistency with {@link JSON.parse}
     * @returns {*}
     */
    parse: function yamlParse (text, reviver) {
      try {
        return jsYaml$1.safeLoad(text);
      }
      catch (e) {
        if (e instanceof Error) {
          throw e;
        }
        else {
          // https://github.com/nodeca/js-yaml/issues/153
          throw ono(e, e.message);
        }
      }
    },

    /**
     * Converts a JavaScript value to a YAML string.
     *
     * @param   {*} value - The value to convert to YAML
     * @param   {function|array} replacer - Not currently supported. Provided for consistency with {@link JSON.stringify}
     * @param   {string|number} space - The number of spaces to use for indentation, or a string containing the number of spaces.
     * @returns {string}
     */
    stringify: function yamlStringify (value, replacer, space) {
      try {
        var indent = (typeof space === "string" ? space.length : space) || 2;
        return jsYaml$1.safeDump(value, { indent: indent });
      }
      catch (e) {
        if (e instanceof Error) {
          throw e;
        }
        else {
          // https://github.com/nodeca/js-yaml/issues/153
          throw ono(e, e.message);
        }
      }
    }
  };

  var yaml = {
    /**
     * The order that this parser will run, in relation to other parsers.
     *
     * @type {number}
     */
    order: 200,

    /**
     * Whether to allow "empty" files. This includes zero-byte files, as well as empty JSON objects.
     *
     * @type {boolean}
     */
    allowEmpty: true,

    /**
     * Determines whether this parser can parse a given file reference.
     * Parsers that match will be tried, in order, until one successfully parses the file.
     * Parsers that don't match will be skipped, UNLESS none of the parsers match, in which case
     * every parser will be tried.
     *
     * @type {RegExp|string[]|function}
     */
    canParse: [".yaml", ".yml", ".json"],  // JSON is valid YAML

    /**
     * Parses the given file as YAML
     *
     * @param {object} file           - An object containing information about the referenced file
     * @param {string} file.url       - The full URL of the referenced file
     * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
     * @param {*}      file.data      - The file contents. This will be whatever data type was returned by the resolver
     * @returns {Promise}
     */
    parse: function parseYAML (file) {
      return new Promise(function (resolve, reject) {
        var data = file.data;
        if (Buffer.isBuffer(data)) {
          data = data.toString();
        }

        if (typeof data === "string") {
          resolve(yaml_1.parse(data));
        }
        else {
          // data is already a JavaScript value (object, array, number, null, NaN, etc.)
          resolve(data);
        }
      });
    }
  };

  var TEXT_REGEXP = /\.(txt|htm|html|md|xml|js|min|map|css|scss|less|svg)$/i;

  var text = {
    /**
     * The order that this parser will run, in relation to other parsers.
     *
     * @type {number}
     */
    order: 300,

    /**
     * Whether to allow "empty" files (zero bytes).
     *
     * @type {boolean}
     */
    allowEmpty: true,

    /**
     * The encoding that the text is expected to be in.
     *
     * @type {string}
     */
    encoding: "utf8",

    /**
     * Determines whether this parser can parse a given file reference.
     * Parsers that return true will be tried, in order, until one successfully parses the file.
     * Parsers that return false will be skipped, UNLESS all parsers returned false, in which case
     * every parser will be tried.
     *
     * @param {object} file           - An object containing information about the referenced file
     * @param {string} file.url       - The full URL of the referenced file
     * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
     * @param {*}      file.data      - The file contents. This will be whatever data type was returned by the resolver
     * @returns {boolean}
     */
    canParse: function isText (file) {
      // Use this parser if the file is a string or Buffer, and has a known text-based extension
      return (typeof file.data === "string" || Buffer.isBuffer(file.data)) && TEXT_REGEXP.test(file.url);
    },

    /**
     * Parses the given file as text
     *
     * @param {object} file           - An object containing information about the referenced file
     * @param {string} file.url       - The full URL of the referenced file
     * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
     * @param {*}      file.data      - The file contents. This will be whatever data type was returned by the resolver
     * @returns {Promise<string>}
     */
    parse: function parseText (file) {
      if (typeof file.data === "string") {
        return file.data;
      }
      else if (Buffer.isBuffer(file.data)) {
        return file.data.toString(this.encoding);
      }
      else {
        throw new Error("data is not text");
      }
    }
  };

  var BINARY_REGEXP = /\.(jpeg|jpg|gif|png|bmp|ico)$/i;

  var binary$1 = {
    /**
     * The order that this parser will run, in relation to other parsers.
     *
     * @type {number}
     */
    order: 400,

    /**
     * Whether to allow "empty" files (zero bytes).
     *
     * @type {boolean}
     */
    allowEmpty: true,

    /**
     * Determines whether this parser can parse a given file reference.
     * Parsers that return true will be tried, in order, until one successfully parses the file.
     * Parsers that return false will be skipped, UNLESS all parsers returned false, in which case
     * every parser will be tried.
     *
     * @param {object} file           - An object containing information about the referenced file
     * @param {string} file.url       - The full URL of the referenced file
     * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
     * @param {*}      file.data      - The file contents. This will be whatever data type was returned by the resolver
     * @returns {boolean}
     */
    canParse: function isBinary (file) {
      // Use this parser if the file is a Buffer, and has a known binary extension
      return Buffer.isBuffer(file.data) && BINARY_REGEXP.test(file.url);
    },

    /**
     * Parses the given data as a Buffer (byte array).
     *
     * @param {object} file           - An object containing information about the referenced file
     * @param {string} file.url       - The full URL of the referenced file
     * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
     * @param {*}      file.data      - The file contents. This will be whatever data type was returned by the resolver
     * @returns {Promise<Buffer>}
     */
    parse: function parseBinary (file) {
      if (Buffer.isBuffer(file.data)) {
        return file.data;
      }
      else {
        // This will reject if data is anything other than a string or typed array
        return new Buffer(file.data);
      }
    }
  };

  var url_1 = createCommonjsModule(function (module, exports) {

  var isWindows = /^win/.test(process.platform),
      forwardSlashPattern = /\//g,
      protocolPattern = /^(\w{2,}):\/\//i,
      url$1 = module.exports;

  // RegExp patterns to URL-encode special characters in local filesystem paths
  var urlEncodePatterns = [
    /\?/g, "%3F",
    /\#/g, "%23" ];

  // RegExp patterns to URL-decode special characters for local filesystem paths
  var urlDecodePatterns = [
    /\%23/g, "#",
    /\%24/g, "$",
    /\%26/g, "&",
    /\%2C/g, ",",
    /\%40/g, "@"
  ];

  exports.parse = url.parse;
  exports.resolve = url.resolve;

  /**
   * Returns the current working directory (in Node) or the current page URL (in browsers).
   *
   * @returns {string}
   */
  exports.cwd = function cwd () {
    return process.browser ? location.href : process.cwd() + "/";
  };

  /**
   * Returns the protocol of the given URL, or `undefined` if it has no protocol.
   *
   * @param   {string} path
   * @returns {?string}
   */
  exports.getProtocol = function getProtocol (path) {
    var match = protocolPattern.exec(path);
    if (match) {
      return match[1].toLowerCase();
    }
  };

  /**
   * Returns the lowercased file extension of the given URL,
   * or an empty string if it has no extension.
   *
   * @param   {string} path
   * @returns {string}
   */
  exports.getExtension = function getExtension (path) {
    var lastDot = path.lastIndexOf(".");
    if (lastDot >= 0) {
      return path.substr(lastDot).toLowerCase();
    }
    return "";
  };

  /**
   * Returns the hash (URL fragment), of the given path.
   * If there is no hash, then the root hash ("#") is returned.
   *
   * @param   {string} path
   * @returns {string}
   */
  exports.getHash = function getHash (path) {
    var hashIndex = path.indexOf("#");
    if (hashIndex >= 0) {
      return path.substr(hashIndex);
    }
    return "#";
  };

  /**
   * Removes the hash (URL fragment), if any, from the given path.
   *
   * @param   {string} path
   * @returns {string}
   */
  exports.stripHash = function stripHash (path) {
    var hashIndex = path.indexOf("#");
    if (hashIndex >= 0) {
      path = path.substr(0, hashIndex);
    }
    return path;
  };

  /**
   * Determines whether the given path is an HTTP(S) URL.
   *
   * @param   {string} path
   * @returns {boolean}
   */
  exports.isHttp = function isHttp (path) {
    var protocol = url$1.getProtocol(path);
    if (protocol === "http" || protocol === "https") {
      return true;
    }
    else if (protocol === undefined) {
      // There is no protocol.  If we're running in a browser, then assume it's HTTP.
      return process.browser;
    }
    else {
      // It's some other protocol, such as "ftp://", "mongodb://", etc.
      return false;
    }
  };

  /**
   * Determines whether the given path is a filesystem path.
   * This includes "file://" URLs.
   *
   * @param   {string} path
   * @returns {boolean}
   */
  exports.isFileSystemPath = function isFileSystemPath (path) {
    if (process.browser) {
      // We're running in a browser, so assume that all paths are URLs.
      // This way, even relative paths will be treated as URLs rather than as filesystem paths
      return false;
    }

    var protocol = url$1.getProtocol(path);
    return protocol === undefined || protocol === "file";
  };

  /**
   * Converts a filesystem path to a properly-encoded URL.
   *
   * This is intended to handle situations where JSON Schema $Ref Parser is called
   * with a filesystem path that contains characters which are not allowed in URLs.
   *
   * @example
   * The following filesystem paths would be converted to the following URLs:
   *
   *    <"!@#$%^&*+=?'>.json              ==>   %3C%22!@%23$%25%5E&*+=%3F\'%3E.json
   *    C:\\My Documents\\File (1).json   ==>   C:/My%20Documents/File%20(1).json
   *    file://Project #42/file.json      ==>   file://Project%20%2342/file.json
   *
   * @param {string} path
   * @returns {string}
   */
  exports.fromFileSystemPath = function fromFileSystemPath (path) {
    // Step 1: On Windows, replace backslashes with forward slashes,
    // rather than encoding them as "%5C"
    if (isWindows) {
      path = path.replace(/\\/g, "/");
    }

    // Step 2: `encodeURI` will take care of MOST characters
    path = encodeURI(path);

    // Step 3: Manually encode characters that are not encoded by `encodeURI`.
    // This includes characters such as "#" and "?", which have special meaning in URLs,
    // but are just normal characters in a filesystem path.
    for (var i = 0; i < urlEncodePatterns.length; i += 2) {
      path = path.replace(urlEncodePatterns[i], urlEncodePatterns[i + 1]);
    }

    return path;
  };

  /**
   * Converts a URL to a local filesystem path.
   *
   * @param {string}  path
   * @param {boolean} [keepFileProtocol] - If true, then "file://" will NOT be stripped
   * @returns {string}
   */
  exports.toFileSystemPath = function toFileSystemPath (path, keepFileProtocol) {
    // Step 1: `decodeURI` will decode characters such as Cyrillic characters, spaces, etc.
    path = decodeURI(path);

    // Step 2: Manually decode characters that are not decoded by `decodeURI`.
    // This includes characters such as "#" and "?", which have special meaning in URLs,
    // but are just normal characters in a filesystem path.
    for (var i = 0; i < urlDecodePatterns.length; i += 2) {
      path = path.replace(urlDecodePatterns[i], urlDecodePatterns[i + 1]);
    }

    // Step 3: If it's a "file://" URL, then format it consistently
    // or convert it to a local filesystem path
    var isFileUrl = path.substr(0, 7).toLowerCase() === "file://";
    if (isFileUrl) {
      // Strip-off the protocol, and the initial "/", if there is one
      path = path[7] === "/" ? path.substr(8) : path.substr(7);

      // insert a colon (":") after the drive letter on Windows
      if (isWindows && path[1] === "/") {
        path = path[0] + ":" + path.substr(1);
      }

      if (keepFileProtocol) {
        // Return the consistently-formatted "file://" URL
        path = "file:///" + path;
      }
      else {
        // Convert the "file://" URL to a local filesystem path.
        // On Windows, it will start with something like "C:/".
        // On Posix, it will start with "/"
        isFileUrl = false;
        path = isWindows ? path : "/" + path;
      }
    }

    // Step 4: Normalize Windows paths (unless it's a "file://" URL)
    if (isWindows && !isFileUrl) {
      // Replace forward slashes with backslashes
      path = path.replace(forwardSlashPattern, "\\");

      // Capitalize the drive letter
      if (path.substr(1, 2) === ":\\") {
        path = path[0].toUpperCase() + path.substr(1);
      }
    }

    return path;
  };
  });
  var url_2 = url_1.parse;
  var url_3 = url_1.resolve;
  var url_4 = url_1.cwd;
  var url_5 = url_1.getProtocol;
  var url_6 = url_1.getExtension;
  var url_7 = url_1.getHash;
  var url_8 = url_1.stripHash;
  var url_9 = url_1.isHttp;
  var url_10 = url_1.isFileSystemPath;
  var url_11 = url_1.fromFileSystemPath;
  var url_12 = url_1.toFileSystemPath;

  var file = {
    /**
     * The order that this resolver will run, in relation to other resolvers.
     *
     * @type {number}
     */
    order: 100,

    /**
     * Determines whether this resolver can read a given file reference.
     * Resolvers that return true will be tried, in order, until one successfully resolves the file.
     * Resolvers that return false will not be given a chance to resolve the file.
     *
     * @param {object} file           - An object containing information about the referenced file
     * @param {string} file.url       - The full URL of the referenced file
     * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
     * @returns {boolean}
     */
    canRead: function isFile (file) {
      return url_1.isFileSystemPath(file.url);
    },

    /**
     * Reads the given file and returns its raw contents as a Buffer.
     *
     * @param {object} file           - An object containing information about the referenced file
     * @param {string} file.url       - The full URL of the referenced file
     * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
     * @returns {Promise<Buffer>}
     */
    read: function readFile (file) {
      return new Promise(function (resolve, reject) {
        var path;
        try {
          path = url_1.toFileSystemPath(file.url);
        }
        catch (err) {
          reject(ono.uri(err, "Malformed URI: %s", file.url));
        }

        // console.log('Opening file: %s', path);

        try {
          fs.readFile(path, function (err, data) {
            if (err) {
              reject(ono(err, 'Error opening file "%s"', path));
            }
            else {
              resolve(data);
            }
          });
        }
        catch (err) {
          reject(ono(err, 'Error opening file "%s"', path));
        }
      });
    }
  };

  var http_1 = {
    /**
     * The order that this resolver will run, in relation to other resolvers.
     *
     * @type {number}
     */
    order: 200,

    /**
     * HTTP headers to send when downloading files.
     *
     * @example:
     * {
     *   "User-Agent": "JSON Schema $Ref Parser",
     *   Accept: "application/json"
     * }
     *
     * @type {object}
     */
    headers: null,

    /**
     * HTTP request timeout (in milliseconds).
     *
     * @type {number}
     */
    timeout: 5000, // 5 seconds

    /**
     * The maximum number of HTTP redirects to follow.
     * To disable automatic following of redirects, set this to zero.
     *
     * @type {number}
     */
    redirects: 5,

    /**
     * The `withCredentials` option of XMLHttpRequest.
     * Set this to `true` if you're downloading files from a CORS-enabled server that requires authentication
     *
     * @type {boolean}
     */
    withCredentials: false,

    /**
     * Determines whether this resolver can read a given file reference.
     * Resolvers that return true will be tried in order, until one successfully resolves the file.
     * Resolvers that return false will not be given a chance to resolve the file.
     *
     * @param {object} file           - An object containing information about the referenced file
     * @param {string} file.url       - The full URL of the referenced file
     * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
     * @returns {boolean}
     */
    canRead: function isHttp (file) {
      return url_1.isHttp(file.url);
    },

    /**
     * Reads the given URL and returns its raw contents as a Buffer.
     *
     * @param {object} file           - An object containing information about the referenced file
     * @param {string} file.url       - The full URL of the referenced file
     * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
     * @returns {Promise<Buffer>}
     */
    read: function readHttp (file) {
      var u = url_1.parse(file.url);

      if (process.browser && !u.protocol) {
        // Use the protocol of the current page
        u.protocol = url_1.parse(location.href).protocol;
      }

      return download(u, this);
    }
  };

  /**
   * Downloads the given file.
   *
   * @param {Url|string} u        - The url to download (can be a parsed {@link Url} object)
   * @param {object} httpOptions  - The `options.resolve.http` object
   * @param {number} [redirects]  - The redirect URLs that have already been followed
   *
   * @returns {Promise<Buffer>}
   * The promise resolves with the raw downloaded data, or rejects if there is an HTTP error.
   */
  function download (u, httpOptions, redirects) {
    return new Promise(function (resolve, reject) {
      u = url_1.parse(u);
      redirects = redirects || [];
      redirects.push(u.href);

      get(u, httpOptions)
        .then(function (res) {
          if (res.statusCode >= 400) {
            throw ono({ status: res.statusCode }, "HTTP ERROR %d", res.statusCode);
          }
          else if (res.statusCode >= 300) {
            if (redirects.length > httpOptions.redirects) {
              reject(ono({ status: res.statusCode }, "Error downloading %s. \nToo many redirects: \n  %s",
                redirects[0], redirects.join(" \n  ")));
            }
            else if (!res.headers.location) {
              throw ono({ status: res.statusCode }, "HTTP %d redirect with no location header", res.statusCode);
            }
            else {
              // console.log('HTTP %d redirect %s -> %s', res.statusCode, u.href, res.headers.location);
              var redirectTo = url_1.resolve(u, res.headers.location);
              download(redirectTo, httpOptions, redirects).then(resolve, reject);
            }
          }
          else {
            resolve(res.body || new Buffer(0));
          }
        })
        .catch(function (err) {
          reject(ono(err, "Error downloading", u.href));
        });
    });
  }

  /**
   * Sends an HTTP GET request.
   *
   * @param {Url} u - A parsed {@link Url} object
   * @param {object} httpOptions - The `options.resolve.http` object
   *
   * @returns {Promise<Response>}
   * The promise resolves with the HTTP Response object.
   */
  function get (u, httpOptions) {
    return new Promise(function (resolve, reject) {
      // console.log('GET', u.href);

      var protocol = u.protocol === "https:" ? https : http;
      var req = protocol.get({
        hostname: u.hostname,
        port: u.port,
        path: u.path,
        auth: u.auth,
        protocol: u.protocol,
        headers: httpOptions.headers || {},
        withCredentials: httpOptions.withCredentials
      });

      if (typeof req.setTimeout === "function") {
        req.setTimeout(httpOptions.timeout);
      }

      req.on("timeout", function () {
        req.abort();
      });

      req.on("error", reject);

      req.once("response", function (res) {
        res.body = new Buffer(0);

        res.on("data", function (data) {
          res.body = Buffer.concat([res.body, new Buffer(data)]);
        });

        res.on("error", reject);

        res.on("end", function () {
          resolve(res);
        });
      });
    });
  }

  var options = $RefParserOptions;

  /**
   * Options that determine how JSON schemas are parsed, resolved, and dereferenced.
   *
   * @param {object|$RefParserOptions} [options] - Overridden options
   * @constructor
   */
  function $RefParserOptions (options) {
    merge$1(this, $RefParserOptions.defaults);
    merge$1(this, options);
  }

  $RefParserOptions.defaults = {
    /**
     * Determines how different types of files will be parsed.
     *
     * You can add additional parsers of your own, replace an existing one with
     * your own implemenation, or disable any parser by setting it to false.
     */
    parse: {
      json: json,
      yaml: yaml,
      text: text,
      binary: binary$1,
    },

    /**
     * Determines how JSON References will be resolved.
     *
     * You can add additional resolvers of your own, replace an existing one with
     * your own implemenation, or disable any resolver by setting it to false.
     */
    resolve: {
      file: file,
      http: http_1,

      /**
       * Determines whether external $ref pointers will be resolved.
       * If this option is disabled, then none of above resolvers will be called.
       * Instead, external $ref pointers will simply be ignored.
       *
       * @type {boolean}
       */
      external: true,
    },

    /**
     * Determines the types of JSON references that are allowed.
     */
    dereference: {
      /**
       * Dereference circular (recursive) JSON references?
       * If false, then a {@link ReferenceError} will be thrown if a circular reference is found.
       * If "ignore", then circular references will not be dereferenced.
       *
       * @type {boolean|string}
       */
      circular: true
    },
  };

  /**
   * Merges the properties of the source object into the target object.
   *
   * @param {object} target - The object that we're populating
   * @param {?object} source - The options that are being merged
   * @returns {object}
   */
  function merge$1 (target, source) {
    if (isMergeable(source)) {
      var keys = Object.keys(source);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var sourceSetting = source[key];
        var targetSetting = target[key];

        if (isMergeable(sourceSetting)) {
          // It's a nested object, so merge it recursively
          target[key] = merge$1(targetSetting || {}, sourceSetting);
        }
        else if (sourceSetting !== undefined) {
          // It's a scalar value, function, or array. No merging necessary. Just overwrite the target value.
          target[key] = sourceSetting;
        }
      }
    }
    return target;
  }

  /**
   * Determines whether the given value can be merged,
   * or if it is a scalar value that should just override the target value.
   *
   * @param   {*}  val
   * @returns {Boolean}
   */
  function isMergeable (val) {
    return val &&
      (typeof val === "object") &&
      !Array.isArray(val) &&
      !(val instanceof RegExp) &&
      !(val instanceof Date);
  }

  var pointer = Pointer;

  var slashes = /\//g,
      tildes = /~/g,
      escapedSlash = /~1/g,
      escapedTilde = /~0/g;

  /**
   * This class represents a single JSON pointer and its resolved value.
   *
   * @param {$Ref} $ref
   * @param {string} path
   * @param {string} [friendlyPath] - The original user-specified path (used for error messages)
   * @constructor
   */
  function Pointer ($ref, path, friendlyPath) {
    /**
     * The {@link $Ref} object that contains this {@link Pointer} object.
     * @type {$Ref}
     */
    this.$ref = $ref;

    /**
     * The file path or URL, containing the JSON pointer in the hash.
     * This path is relative to the path of the main JSON schema file.
     * @type {string}
     */
    this.path = path;

    /**
     * The original path or URL, used for error messages.
     * @type {string}
     */
    this.originalPath = friendlyPath || path;

    /**
     * The value of the JSON pointer.
     * Can be any JSON type, not just objects. Unknown file types are represented as Buffers (byte arrays).
     * @type {?*}
     */
    this.value = undefined;

    /**
     * Indicates whether the pointer references itself.
     * @type {boolean}
     */
    this.circular = false;

    /**
     * The number of indirect references that were traversed to resolve the value.
     * Resolving a single pointer may require resolving multiple $Refs.
     * @type {number}
     */
    this.indirections = 0;
  }

  /**
   * Resolves the value of a nested property within the given object.
   *
   * @param {*} obj - The object that will be crawled
   * @param {$RefParserOptions} options
   *
   * @returns {Pointer}
   * Returns a JSON pointer whose {@link Pointer#value} is the resolved value.
   * If resolving this value required resolving other JSON references, then
   * the {@link Pointer#$ref} and {@link Pointer#path} will reflect the resolution path
   * of the resolved value.
   */
  Pointer.prototype.resolve = function (obj, options) {
    var tokens = Pointer.parse(this.path);

    // Crawl the object, one token at a time
    this.value = obj;
    for (var i = 0; i < tokens.length; i++) {
      if (resolveIf$Ref(this, options)) {
        // The $ref path has changed, so append the remaining tokens to the path
        this.path = Pointer.join(this.path, tokens.slice(i));
      }

      var token = tokens[i];
      if (this.value[token] === undefined) {
        throw ono.syntax('Error resolving $ref pointer "%s". \nToken "%s" does not exist.', this.originalPath, token);
      }
      else {
        this.value = this.value[token];
      }
    }

    // Resolve the final value
    resolveIf$Ref(this, options);
    return this;
  };

  /**
   * Sets the value of a nested property within the given object.
   *
   * @param {*} obj - The object that will be crawled
   * @param {*} value - the value to assign
   * @param {$RefParserOptions} options
   *
   * @returns {*}
   * Returns the modified object, or an entirely new object if the entire object is overwritten.
   */
  Pointer.prototype.set = function (obj, value, options) {
    var tokens = Pointer.parse(this.path);
    var token;

    if (tokens.length === 0) {
      // There are no tokens, replace the entire object with the new value
      this.value = value;
      return value;
    }

    // Crawl the object, one token at a time
    this.value = obj;
    for (var i = 0; i < tokens.length - 1; i++) {
      resolveIf$Ref(this, options);

      token = tokens[i];
      if (this.value && this.value[token] !== undefined) {
        // The token exists
        this.value = this.value[token];
      }
      else {
        // The token doesn't exist, so create it
        this.value = setValue(this, token, {});
      }
    }

    // Set the value of the final token
    resolveIf$Ref(this, options);
    token = tokens[tokens.length - 1];
    setValue(this, token, value);

    // Return the updated object
    return obj;
  };

  /**
   * Parses a JSON pointer (or a path containing a JSON pointer in the hash)
   * and returns an array of the pointer's tokens.
   * (e.g. "schema.json#/definitions/person/name" => ["definitions", "person", "name"])
   *
   * The pointer is parsed according to RFC 6901
   * {@link https://tools.ietf.org/html/rfc6901#section-3}
   *
   * @param {string} path
   * @returns {string[]}
   */
  Pointer.parse = function (path) {
    // Get the JSON pointer from the path's hash
    var pointer = url_1.getHash(path).substr(1);

    // If there's no pointer, then there are no tokens,
    // so return an empty array
    if (!pointer) {
      return [];
    }

    // Split into an array
    pointer = pointer.split("/");

    // Decode each part, according to RFC 6901
    for (var i = 0; i < pointer.length; i++) {
      pointer[i] = decodeURIComponent(pointer[i].replace(escapedSlash, "/").replace(escapedTilde, "~"));
    }

    if (pointer[0] !== "") {
      throw ono.syntax('Invalid $ref pointer "%s". Pointers must begin with "#/"', pointer);
    }

    return pointer.slice(1);
  };

  /**
   * Creates a JSON pointer path, by joining one or more tokens to a base path.
   *
   * @param {string} base - The base path (e.g. "schema.json#/definitions/person")
   * @param {string|string[]} tokens - The token(s) to append (e.g. ["name", "first"])
   * @returns {string}
   */
  Pointer.join = function (base, tokens) {
    // Ensure that the base path contains a hash
    if (base.indexOf("#") === -1) {
      base += "#";
    }

    // Append each token to the base path
    tokens = Array.isArray(tokens) ? tokens : [tokens];
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      // Encode the token, according to RFC 6901
      base += "/" + encodeURIComponent(token.replace(tildes, "~0").replace(slashes, "~1"));
    }

    return base;
  };

  /**
   * If the given pointer's {@link Pointer#value} is a JSON reference,
   * then the reference is resolved and {@link Pointer#value} is replaced with the resolved value.
   * In addition, {@link Pointer#path} and {@link Pointer#$ref} are updated to reflect the
   * resolution path of the new value.
   *
   * @param {Pointer} pointer
   * @param {$RefParserOptions} options
   * @returns {boolean} - Returns `true` if the resolution path changed
   */
  function resolveIf$Ref (pointer, options) {
    // Is the value a JSON reference? (and allowed?)

    if (ref.isAllowed$Ref(pointer.value, options)) {
      var $refPath = url_1.resolve(pointer.path, pointer.value.$ref);

      if ($refPath === pointer.path) {
        // The value is a reference to itself, so there's nothing to do.
        pointer.circular = true;
      }
      else {
        var resolved = pointer.$ref.$refs._resolve($refPath, options);
        pointer.indirections += resolved.indirections + 1;

        if (ref.isExtended$Ref(pointer.value)) {
          // This JSON reference "extends" the resolved value, rather than simply pointing to it.
          // So the resolved path does NOT change.  Just the value does.
          pointer.value = ref.dereference(pointer.value, resolved.value);
          return false;
        }
        else {
          // Resolve the reference
          pointer.$ref = resolved.$ref;
          pointer.path = resolved.path;
          pointer.value = resolved.value;
        }

        return true;
      }
    }
  }

  /**
   * Sets the specified token value of the {@link Pointer#value}.
   *
   * The token is evaluated according to RFC 6901.
   * {@link https://tools.ietf.org/html/rfc6901#section-4}
   *
   * @param {Pointer} pointer - The JSON Pointer whose value will be modified
   * @param {string} token - A JSON Pointer token that indicates how to modify `obj`
   * @param {*} value - The value to assign
   * @returns {*} - Returns the assigned value
   */
  function setValue (pointer, token, value) {
    if (pointer.value && typeof pointer.value === "object") {
      if (token === "-" && Array.isArray(pointer.value)) {
        pointer.value.push(value);
      }
      else {
        pointer.value[token] = value;
      }
    }
    else {
      throw ono.syntax('Error assigning $ref pointer "%s". \nCannot set "%s" of a non-object.', pointer.path, token);
    }
    return value;
  }

  var ref = $Ref;



  /**
   * This class represents a single JSON reference and its resolved value.
   *
   * @constructor
   */
  function $Ref () {
    /**
     * The file path or URL of the referenced file.
     * This path is relative to the path of the main JSON schema file.
     *
     * This path does NOT contain document fragments (JSON pointers). It always references an ENTIRE file.
     * Use methods such as {@link $Ref#get}, {@link $Ref#resolve}, and {@link $Ref#exists} to get
     * specific JSON pointers within the file.
     *
     * @type {string}
     */
    this.path = undefined;

    /**
     * The resolved value of the JSON reference.
     * Can be any JSON type, not just objects. Unknown file types are represented as Buffers (byte arrays).
     * @type {?*}
     */
    this.value = undefined;

    /**
     * The {@link $Refs} object that contains this {@link $Ref} object.
     * @type {$Refs}
     */
    this.$refs = undefined;

    /**
     * Indicates the type of {@link $Ref#path} (e.g. "file", "http", etc.)
     * @type {?string}
     */
    this.pathType = undefined;
  }

  /**
   * Determines whether the given JSON reference exists within this {@link $Ref#value}.
   *
   * @param {string} path - The full path being resolved, optionally with a JSON pointer in the hash
   * @param {$RefParserOptions} options
   * @returns {boolean}
   */
  $Ref.prototype.exists = function (path, options) {
    try {
      this.resolve(path, options);
      return true;
    }
    catch (e) {
      return false;
    }
  };

  /**
   * Resolves the given JSON reference within this {@link $Ref#value} and returns the resolved value.
   *
   * @param {string} path - The full path being resolved, optionally with a JSON pointer in the hash
   * @param {$RefParserOptions} options
   * @returns {*} - Returns the resolved value
   */
  $Ref.prototype.get = function (path, options) {
    return this.resolve(path, options).value;
  };

  /**
   * Resolves the given JSON reference within this {@link $Ref#value}.
   *
   * @param {string} path - The full path being resolved, optionally with a JSON pointer in the hash
   * @param {$RefParserOptions} options
   * @param {string} [friendlyPath] - The original user-specified path (used for error messages)
   * @returns {Pointer}
   */
  $Ref.prototype.resolve = function (path, options, friendlyPath) {
    var pointer$1 = new pointer(this, path, friendlyPath);
    return pointer$1.resolve(this.value, options);
  };

  /**
   * Sets the value of a nested property within this {@link $Ref#value}.
   * If the property, or any of its parents don't exist, they will be created.
   *
   * @param {string} path - The full path of the property to set, optionally with a JSON pointer in the hash
   * @param {*} value - The value to assign
   */
  $Ref.prototype.set = function (path, value) {
    var pointer$1 = new pointer(this, path);
    this.value = pointer$1.set(this.value, value);
  };

  /**
   * Determines whether the given value is a JSON reference.
   *
   * @param {*} value - The value to inspect
   * @returns {boolean}
   */
  $Ref.is$Ref = function (value) {
    return value && typeof value === "object" && typeof value.$ref === "string" && value.$ref.length > 0;
  };

  /**
   * Determines whether the given value is an external JSON reference.
   *
   * @param {*} value - The value to inspect
   * @returns {boolean}
   */
  $Ref.isExternal$Ref = function (value) {
    return $Ref.is$Ref(value) && value.$ref[0] !== "#";
  };

  /**
   * Determines whether the given value is a JSON reference, and whether it is allowed by the options.
   * For example, if it references an external file, then options.resolve.external must be true.
   *
   * @param {*} value - The value to inspect
   * @param {$RefParserOptions} options
   * @returns {boolean}
   */
  $Ref.isAllowed$Ref = function (value, options) {
    if ($Ref.is$Ref(value)) {
      if (value.$ref.substr(0, 2) === "#/" || value.$ref === "#") {
        // It's a JSON Pointer reference, which is always allowed
        return true;
      }
      else if (value.$ref[0] !== "#" && (!options || options.resolve.external)) {
        // It's an external reference, which is allowed by the options
        return true;
      }
    }
  };

  /**
   * Determines whether the given value is a JSON reference that "extends" its resolved value.
   * That is, it has extra properties (in addition to "$ref"), so rather than simply pointing to
   * an existing value, this $ref actually creates a NEW value that is a shallow copy of the resolved
   * value, plus the extra properties.
   *
   * @example:
   *  {
   *    person: {
   *      properties: {
   *        firstName: { type: string }
   *        lastName: { type: string }
   *      }
   *    }
   *    employee: {
   *      properties: {
   *        $ref: #/person/properties
   *        salary: { type: number }
   *      }
   *    }
   *  }
   *
   *  In this example, "employee" is an extended $ref, since it extends "person" with an additional
   *  property (salary).  The result is a NEW value that looks like this:
   *
   *  {
   *    properties: {
   *      firstName: { type: string }
   *      lastName: { type: string }
   *      salary: { type: number }
   *    }
   *  }
   *
   * @param {*} value - The value to inspect
   * @returns {boolean}
   */
  $Ref.isExtended$Ref = function (value) {
    return $Ref.is$Ref(value) && Object.keys(value).length > 1;
  };

  /**
   * Returns the resolved value of a JSON Reference.
   * If necessary, the resolved value is merged with the JSON Reference to create a new object
   *
   * @example:
   *  {
   *    person: {
   *      properties: {
   *        firstName: { type: string }
   *        lastName: { type: string }
   *      }
   *    }
   *    employee: {
   *      properties: {
   *        $ref: #/person/properties
   *        salary: { type: number }
   *      }
   *    }
   *  }
   *
   *  When "person" and "employee" are merged, you end up with the following object:
   *
   *  {
   *    properties: {
   *      firstName: { type: string }
   *      lastName: { type: string }
   *      salary: { type: number }
   *    }
   *  }
   *
   * @param {object} $ref - The JSON reference object (the one with the "$ref" property)
   * @param {*} resolvedValue - The resolved value, which can be any type
   * @returns {*} - Returns the dereferenced value
   */
  $Ref.dereference = function ($ref, resolvedValue) {
    if (resolvedValue && typeof resolvedValue === "object" && $Ref.isExtended$Ref($ref)) {
      var merged = {};
      Object.keys($ref).forEach(function (key) {
        if (key !== "$ref") {
          merged[key] = $ref[key];
        }
      });
      Object.keys(resolvedValue).forEach(function (key) {
        if (!(key in merged)) {
          merged[key] = resolvedValue[key];
        }
      });
      return merged;
    }
    else {
      // Completely replace the original reference with the resolved value
      return resolvedValue;
    }
  };

  var refs = $Refs;

  /**
   * This class is a map of JSON references and their resolved values.
   */
  function $Refs () {
    /**
     * Indicates whether the schema contains any circular references.
     *
     * @type {boolean}
     */
    this.circular = false;

    /**
     * A map of paths/urls to {@link $Ref} objects
     *
     * @type {object}
     * @protected
     */
    this._$refs = {};

    /**
     * The {@link $Ref} object that is the root of the JSON schema.
     *
     * @type {$Ref}
     * @protected
     */
    this._root$Ref = null;
  }

  /**
   * Returns the paths of all the files/URLs that are referenced by the JSON schema,
   * including the schema itself.
   *
   * @param {...string|string[]} [types] - Only return paths of the given types ("file", "http", etc.)
   * @returns {string[]}
   */
  $Refs.prototype.paths = function (types) {
    var paths = getPaths(this._$refs, arguments);
    return paths.map(function (path) {
      return path.decoded;
    });
  };

  /**
   * Returns the map of JSON references and their resolved values.
   *
   * @param {...string|string[]} [types] - Only return references of the given types ("file", "http", etc.)
   * @returns {object}
   */
  $Refs.prototype.values = function (types) {
    var $refs = this._$refs;
    var paths = getPaths($refs, arguments);
    return paths.reduce(function (obj, path) {
      obj[path.decoded] = $refs[path.encoded].value;
      return obj;
    }, {});
  };

  /**
   * Returns a POJO (plain old JavaScript object) for serialization as JSON.
   *
   * @returns {object}
   */
  $Refs.prototype.toJSON = $Refs.prototype.values;

  /**
   * Determines whether the given JSON reference exists.
   *
   * @param {string} path - The path being resolved, optionally with a JSON pointer in the hash
   * @param {$RefParserOptions} [options]
   * @returns {boolean}
   */
  $Refs.prototype.exists = function (path, options) {
    try {
      this._resolve(path, options);
      return true;
    }
    catch (e) {
      return false;
    }
  };

  /**
   * Resolves the given JSON reference and returns the resolved value.
   *
   * @param {string} path - The path being resolved, with a JSON pointer in the hash
   * @param {$RefParserOptions} [options]
   * @returns {*} - Returns the resolved value
   */
  $Refs.prototype.get = function (path, options) {
    return this._resolve(path, options).value;
  };

  /**
   * Sets the value of a nested property within this {@link $Ref#value}.
   * If the property, or any of its parents don't exist, they will be created.
   *
   * @param {string} path - The path of the property to set, optionally with a JSON pointer in the hash
   * @param {*} value - The value to assign
   */
  $Refs.prototype.set = function (path, value) {
    var absPath = url_1.resolve(this._root$Ref.path, path);
    var withoutHash = url_1.stripHash(absPath);
    var $ref = this._$refs[withoutHash];

    if (!$ref) {
      throw ono('Error resolving $ref pointer "%s". \n"%s" not found.', path, withoutHash);
    }

    $ref.set(absPath, value);
  };

  /**
   * Creates a new {@link $Ref} object and adds it to this {@link $Refs} object.
   *
   * @param {string} path  - The file path or URL of the referenced file
   */
  $Refs.prototype._add = function (path) {
    var withoutHash = url_1.stripHash(path);

    var $ref = new ref();
    $ref.path = withoutHash;
    $ref.$refs = this;

    this._$refs[withoutHash] = $ref;
    this._root$Ref = this._root$Ref || $ref;

    return $ref;
  };

  /**
   * Resolves the given JSON reference.
   *
   * @param {string} path - The path being resolved, optionally with a JSON pointer in the hash
   * @param {$RefParserOptions} [options]
   * @returns {Pointer}
   * @protected
   */
  $Refs.prototype._resolve = function (path, options) {
    var absPath = url_1.resolve(this._root$Ref.path, path);
    var withoutHash = url_1.stripHash(absPath);
    var $ref = this._$refs[withoutHash];

    if (!$ref) {
      throw ono('Error resolving $ref pointer "%s". \n"%s" not found.', path, withoutHash);
    }

    return $ref.resolve(absPath, options, path);
  };

  /**
   * Returns the specified {@link $Ref} object, or undefined.
   *
   * @param {string} path - The path being resolved, optionally with a JSON pointer in the hash
   * @returns {$Ref|undefined}
   * @protected
   */
  $Refs.prototype._get$Ref = function (path) {
    path = url_1.resolve(this._root$Ref.path, path);
    var withoutHash = url_1.stripHash(path);
    return this._$refs[withoutHash];
  };

  /**
   * Returns the encoded and decoded paths keys of the given object.
   *
   * @param {object} $refs - The object whose keys are URL-encoded paths
   * @param {...string|string[]} [types] - Only return paths of the given types ("file", "http", etc.)
   * @returns {object[]}
   */
  function getPaths ($refs, types) {
    var paths = Object.keys($refs);

    // Filter the paths by type
    types = Array.isArray(types[0]) ? types[0] : Array.prototype.slice.call(types);
    if (types.length > 0 && types[0]) {
      paths = paths.filter(function (key) {
        return types.indexOf($refs[key].pathType) !== -1;
      });
    }

    // Decode local filesystem paths
    return paths.map(function (path) {
      return {
        encoded: path,
        decoded: $refs[path].pathType === "file" ? url_1.toFileSystemPath(path, true) : path
      };
    });
  }

  /**
   * Returns the given plugins as an array, rather than an object map.
   * All other methods in this module expect an array of plugins rather than an object map.
   *
   * @param  {object} plugins - A map of plugin objects
   * @return {object[]}
   */
  var all = function (plugins) {
    return Object.keys(plugins)
      .filter(function (key) {
        return typeof plugins[key] === "object";
      })
      .map(function (key) {
        plugins[key].name = key;
        return plugins[key];
      });
  };

  /**
   * Filters the given plugins, returning only the ones return `true` for the given method.
   *
   * @param  {object[]} plugins - An array of plugin objects
   * @param  {string}   method  - The name of the filter method to invoke for each plugin
   * @param  {object}   file    - A file info object, which will be passed to each method
   * @return {object[]}
   */
  var filter = function (plugins, method, file) {
    return plugins
      .filter(function (plugin) {
        return !!getResult(plugin, method, file);
      });
  };

  /**
   * Sorts the given plugins, in place, by their `order` property.
   *
   * @param {object[]} plugins - An array of plugin objects
   * @returns {object[]}
   */
  var sort = function (plugins) {
    plugins.forEach(function (plugin) {
      plugin.order = plugin.order || Number.MAX_SAFE_INTEGER;
    });

    return plugins.sort(function (a, b) { return a.order - b.order; });
  };

  /**
   * Runs the specified method of the given plugins, in order, until one of them returns a successful result.
   * Each method can return a synchronous value, a Promise, or call an error-first callback.
   * If the promise resolves successfully, or the callback is called without an error, then the result
   * is immediately returned and no further plugins are called.
   * If the promise rejects, or the callback is called with an error, then the next plugin is called.
   * If ALL plugins fail, then the last error is thrown.
   *
   * @param {object[]}  plugins - An array of plugin objects
   * @param {string}    method  - The name of the method to invoke for each plugin
   * @param {object}    file    - A file info object, which will be passed to each method
   * @returns {Promise}
   */
  var run = function (plugins, method, file) {
    var plugin, lastError, index = 0;

    return new Promise(function (resolve, reject) {
      runNextPlugin();

      function runNextPlugin () {
        plugin = plugins[index++];
        if (!plugin) {
          // There are no more functions, so re-throw the last error
          return reject(lastError);
        }

        try {
          // console.log('  %s', plugin.name);
          var result = getResult(plugin, method, file, callback);
          if (result && typeof result.then === "function") {
            // A promise was returned
            result.then(onSuccess, onError);
          }
          else if (result !== undefined) {
            // A synchronous result was returned
            onSuccess(result);
          }
          // else { the callback will be called }
        }
        catch (e) {
          onError(e);
        }
      }

      function callback (err, result) {
        if (err) {
          onError(err);
        }
        else {
          onSuccess(result);
        }
      }

      function onSuccess (result) {
        // console.log('    success');
        resolve({
          plugin: plugin,
          result: result
        });
      }

      function onError (err) {
        // console.log('    %s', err.message || err);
        lastError = err;
        runNextPlugin();
      }
    });
  };

  /**
   * Returns the value of the given property.
   * If the property is a function, then the result of the function is returned.
   * If the value is a RegExp, then it will be tested against the file URL.
   * If the value is an aray, then it will be compared against the file extension.
   *
   * @param   {object}   obj        - The object whose property/method is called
   * @param   {string}   prop       - The name of the property/method to invoke
   * @param   {object}   file       - A file info object, which will be passed to the method
   * @param   {function} [callback] - A callback function, which will be passed to the method
   * @returns {*}
   */
  function getResult (obj, prop, file, callback) {
    var value = obj[prop];

    if (typeof value === "function") {
      return value.apply(obj, [file, callback]);
    }

    if (!callback) {
      // The synchronous plugin functions (canParse and canRead)
      // allow a "shorthand" syntax, where the user can match
      // files by RegExp or by file extension.
      if (value instanceof RegExp) {
        return value.test(file.url);
      }
      else if (typeof value === "string") {
        return value === file.extension;
      }
      else if (Array.isArray(value)) {
        return value.indexOf(file.extension) !== -1;
      }
    }

    return value;
  }

  var plugins = {
  	all: all,
  	filter: filter,
  	sort: sort,
  	run: run
  };

  var parse_1 = parse$1;

  /**
   * Reads and parses the specified file path or URL.
   *
   * @param {string} path - This path MUST already be resolved, since `read` doesn't know the resolution context
   * @param {$Refs} $refs
   * @param {$RefParserOptions} options
   *
   * @returns {Promise}
   * The promise resolves with the parsed file contents, NOT the raw (Buffer) contents.
   */
  function parse$1 (path, $refs, options) {
    try {
      // Remove the URL fragment, if any
      path = url_1.stripHash(path);

      // Add a new $Ref for this file, even though we don't have the value yet.
      // This ensures that we don't simultaneously read & parse the same file multiple times
      var $ref = $refs._add(path);

      // This "file object" will be passed to all resolvers and parsers.
      var file = {
        url: path,
        extension: url_1.getExtension(path),
      };

      // Read the file and then parse the data
      return readFile(file, options)
        .then(function (resolver) {
          $ref.pathType = resolver.plugin.name;
          file.data = resolver.result;
          return parseFile(file, options);
        })
        .then(function (parser) {
          $ref.value = parser.result;
          return parser.result;
        });
    }
    catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Reads the given file, using the configured resolver plugins
   *
   * @param {object} file           - An object containing information about the referenced file
   * @param {string} file.url       - The full URL of the referenced file
   * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
   * @param {$RefParserOptions} options
   *
   * @returns {Promise}
   * The promise resolves with the raw file contents and the resolver that was used.
   */
  function readFile (file, options) {
    return new Promise(function (resolve, reject) {
      // console.log('Reading %s', file.url);

      // Find the resolvers that can read this file
      var resolvers = plugins.all(options.resolve);
      resolvers = plugins.filter(resolvers, "canRead", file);

      // Run the resolvers, in order, until one of them succeeds
      plugins.sort(resolvers);
      plugins.run(resolvers, "read", file)
        .then(resolve, onError);

      function onError (err) {
        // Throw the original error, if it's one of our own (user-friendly) errors.
        // Otherwise, throw a generic, friendly error.
        if (err && !(err instanceof SyntaxError)) {
          reject(err);
        }
        else {
          reject(ono.syntax('Unable to resolve $ref pointer "%s"', file.url));
        }
      }
    });
  }

  /**
   * Parses the given file's contents, using the configured parser plugins.
   *
   * @param {object} file           - An object containing information about the referenced file
   * @param {string} file.url       - The full URL of the referenced file
   * @param {string} file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
   * @param {*}      file.data      - The file contents. This will be whatever data type was returned by the resolver
   * @param {$RefParserOptions} options
   *
   * @returns {Promise}
   * The promise resolves with the parsed file contents and the parser that was used.
   */
  function parseFile (file, options) {
    return new Promise(function (resolve, reject) {
      // console.log('Parsing %s', file.url);

      // Find the parsers that can read this file type.
      // If none of the parsers are an exact match for this file, then we'll try ALL of them.
      // This handles situations where the file IS a supported type, just with an unknown extension.
      var allParsers = plugins.all(options.parse);
      var filteredParsers = plugins.filter(allParsers, "canParse", file);
      var parsers = filteredParsers.length > 0 ? filteredParsers : allParsers;

      // Run the parsers, in order, until one of them succeeds
      plugins.sort(parsers);
      plugins.run(parsers, "parse", file)
        .then(onParsed, onError);

      function onParsed (parser) {
        if (!parser.plugin.allowEmpty && isEmpty(parser.result)) {
          reject(ono.syntax('Error parsing "%s" as %s. \nParsed value is empty', file.url, parser.plugin.name));
        }
        else {
          resolve(parser);
        }
      }

      function onError (err) {
        if (err) {
          err = err instanceof Error ? err : new Error(err);
          reject(ono.syntax(err, "Error parsing %s", file.url));
        }
        else {
          reject(ono.syntax("Unable to parse %s", file.url));
        }
      }
    });
  }

  /**
   * Determines whether the parsed value is "empty".
   *
   * @param {*} value
   * @returns {boolean}
   */
  function isEmpty (value) {
    return value === undefined ||
      (typeof value === "object" && Object.keys(value).length === 0) ||
      (typeof value === "string" && value.trim().length === 0) ||
      (Buffer.isBuffer(value) && value.length === 0);
  }

  var normalizeArgs_1 = normalizeArgs;

  /**
   * Normalizes the given arguments, accounting for optional args.
   *
   * @param {Arguments} args
   * @returns {object}
   */
  function normalizeArgs (args) {
    var path, schema, options$1, callback;
    args = Array.prototype.slice.call(args);

    if (typeof args[args.length - 1] === "function") {
      // The last parameter is a callback function
      callback = args.pop();
    }

    if (typeof args[0] === "string") {
      // The first parameter is the path
      path = args[0];
      if (typeof args[2] === "object") {
        // The second parameter is the schema, and the third parameter is the options
        schema = args[1];
        options$1 = args[2];
      }
      else {
        // The second parameter is the options
        schema = undefined;
        options$1 = args[1];
      }
    }
    else {
      // The first parameter is the schema
      path = "";
      schema = args[0];
      options$1 = args[1];
    }

    if (!(options$1 instanceof options)) {
      options$1 = new options(options$1);
    }

    return {
      path: path,
      schema: schema,
      options: options$1,
      callback: callback
    };
  }

  var resolveExternal_1 = resolveExternal;

  /**
   * Crawls the JSON schema, finds all external JSON references, and resolves their values.
   * This method does not mutate the JSON schema. The resolved values are added to {@link $RefParser#$refs}.
   *
   * NOTE: We only care about EXTERNAL references here. INTERNAL references are only relevant when dereferencing.
   *
   * @param {$RefParser} parser
   * @param {$RefParserOptions} options
   *
   * @returns {Promise}
   * The promise resolves once all JSON references in the schema have been resolved,
   * including nested references that are contained in externally-referenced files.
   */
  function resolveExternal (parser, options) {
    if (!options.resolve.external) {
      // Nothing to resolve, so exit early
      return Promise.resolve();
    }

    try {
      // console.log('Resolving $ref pointers in %s', parser.$refs._root$Ref.path);
      var promises = crawl(parser.schema, parser.$refs._root$Ref.path + "#", parser.$refs, options);
      return Promise.all(promises);
    }
    catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Recursively crawls the given value, and resolves any external JSON references.
   *
   * @param {*} obj - The value to crawl. If it's not an object or array, it will be ignored.
   * @param {string} path - The full path of `obj`, possibly with a JSON Pointer in the hash
   * @param {$Refs} $refs
   * @param {$RefParserOptions} options
   *
   * @returns {Promise[]}
   * Returns an array of promises. There will be one promise for each JSON reference in `obj`.
   * If `obj` does not contain any JSON references, then the array will be empty.
   * If any of the JSON references point to files that contain additional JSON references,
   * then the corresponding promise will internally reference an array of promises.
   */
  function crawl (obj, path, $refs, options) {
    var promises = [];

    if (obj && typeof obj === "object") {
      if (ref.isExternal$Ref(obj)) {
        promises.push(resolve$Ref(obj, path, $refs, options));
      }
      else {
        Object.keys(obj).forEach(function (key) {
          var keyPath = pointer.join(path, key);
          var value = obj[key];

          if (ref.isExternal$Ref(value)) {
            promises.push(resolve$Ref(value, keyPath, $refs, options));
          }
          else {
            promises = promises.concat(crawl(value, keyPath, $refs, options));
          }
        });
      }
    }

    return promises;
  }

  /**
   * Resolves the given JSON Reference, and then crawls the resulting value.
   *
   * @param {{$ref: string}} $ref - The JSON Reference to resolve
   * @param {string} path - The full path of `$ref`, possibly with a JSON Pointer in the hash
   * @param {$Refs} $refs
   * @param {$RefParserOptions} options
   *
   * @returns {Promise}
   * The promise resolves once all JSON references in the object have been resolved,
   * including nested references that are contained in externally-referenced files.
   */
  function resolve$Ref ($ref, path, $refs, options) {
    // console.log('Resolving $ref pointer "%s" at %s', $ref.$ref, path);

    var resolvedPath = url_1.resolve(path, $ref.$ref);
    var withoutHash = url_1.stripHash(resolvedPath);

    // Do we already have this $ref?
    $ref = $refs._$refs[withoutHash];
    if ($ref) {
      // We've already parsed this $ref, so use the existing value
      return Promise.resolve($ref.value);
    }

    // Parse the $referenced file/url
    return parse_1(resolvedPath, $refs, options)
      .then(function (result) {
        // Crawl the parsed value
        // console.log('Resolving $ref pointers in %s', withoutHash);
        var promises = crawl(result, withoutHash + "#", $refs, options);
        return Promise.all(promises);
      });
  }

  var bundle_1 = bundle;

  /**
   * Bundles all external JSON references into the main JSON schema, thus resulting in a schema that
   * only has *internal* references, not any *external* references.
   * This method mutates the JSON schema object, adding new references and re-mapping existing ones.
   *
   * @param {$RefParser} parser
   * @param {$RefParserOptions} options
   */
  function bundle (parser, options) {
    // console.log('Bundling $ref pointers in %s', parser.$refs._root$Ref.path);

    // Build an inventory of all $ref pointers in the JSON Schema
    var inventory = [];
    crawl$1(parser, "schema", parser.$refs._root$Ref.path + "#", "#", 0, inventory, parser.$refs, options);

    // Remap all $ref pointers
    remap(inventory);
  }

  /**
   * Recursively crawls the given value, and inventories all JSON references.
   *
   * @param {object} parent - The object containing the value to crawl. If the value is not an object or array, it will be ignored.
   * @param {string} key - The property key of `parent` to be crawled
   * @param {string} path - The full path of the property being crawled, possibly with a JSON Pointer in the hash
   * @param {string} pathFromRoot - The path of the property being crawled, from the schema root
   * @param {object[]} inventory - An array of already-inventoried $ref pointers
   * @param {$Refs} $refs
   * @param {$RefParserOptions} options
   */
  function crawl$1 (parent, key, path, pathFromRoot, indirections, inventory, $refs, options) {
    var obj = key === null ? parent : parent[key];

    if (obj && typeof obj === "object") {
      if (ref.isAllowed$Ref(obj)) {
        inventory$Ref(parent, key, path, pathFromRoot, indirections, inventory, $refs, options);
      }
      else {
        // Crawl the object in a specific order that's optimized for bundling.
        // This is important because it determines how `pathFromRoot` gets built,
        // which later determines which keys get dereferenced and which ones get remapped
        var keys = Object.keys(obj)
          .sort(function (a, b) {
            // Most people will expect references to be bundled into the the "definitions" property,
            // so we always crawl that property first, if it exists.
            if (a === "definitions") {
              return -1;
            }
            else if (b === "definitions") {
              return 1;
            }
            else {
              // Otherwise, crawl the keys based on their length.
              // This produces the shortest possible bundled references
              return a.length - b.length;
            }
          });

        keys.forEach(function (key) {
          var keyPath = pointer.join(path, key);
          var keyPathFromRoot = pointer.join(pathFromRoot, key);
          var value = obj[key];

          if (ref.isAllowed$Ref(value)) {
            inventory$Ref(obj, key, path, keyPathFromRoot, indirections, inventory, $refs, options);
          }
          else {
            crawl$1(obj, key, keyPath, keyPathFromRoot, indirections, inventory, $refs, options);
          }
        });
      }
    }
  }

  /**
   * Inventories the given JSON Reference (i.e. records detailed information about it so we can
   * optimize all $refs in the schema), and then crawls the resolved value.
   *
   * @param {object} $refParent - The object that contains a JSON Reference as one of its keys
   * @param {string} $refKey - The key in `$refParent` that is a JSON Reference
   * @param {string} path - The full path of the JSON Reference at `$refKey`, possibly with a JSON Pointer in the hash
   * @param {string} pathFromRoot - The path of the JSON Reference at `$refKey`, from the schema root
   * @param {object[]} inventory - An array of already-inventoried $ref pointers
   * @param {$Refs} $refs
   * @param {$RefParserOptions} options
   */
  function inventory$Ref ($refParent, $refKey, path, pathFromRoot, indirections, inventory, $refs, options) {
    var $ref = $refKey === null ? $refParent : $refParent[$refKey];
    var $refPath = url_1.resolve(path, $ref.$ref);
    var pointer$1 = $refs._resolve($refPath, options);
    var depth = pointer.parse(pathFromRoot).length;
    var file = url_1.stripHash(pointer$1.path);
    var hash = url_1.getHash(pointer$1.path);
    var external = file !== $refs._root$Ref.path;
    var extended = ref.isExtended$Ref($ref);
    indirections += pointer$1.indirections;

    var existingEntry = findInInventory(inventory, $refParent, $refKey);
    if (existingEntry) {
      // This $Ref has already been inventoried, so we don't need to process it again
      if (depth < existingEntry.depth || indirections < existingEntry.indirections) {
        removeFromInventory(inventory, existingEntry);
      }
      else {
        return;
      }
    }

    inventory.push({
      $ref: $ref,                   // The JSON Reference (e.g. {$ref: string})
      parent: $refParent,           // The object that contains this $ref pointer
      key: $refKey,                 // The key in `parent` that is the $ref pointer
      pathFromRoot: pathFromRoot,   // The path to the $ref pointer, from the JSON Schema root
      depth: depth,                 // How far from the JSON Schema root is this $ref pointer?
      file: file,                   // The file that the $ref pointer resolves to
      hash: hash,                   // The hash within `file` that the $ref pointer resolves to
      value: pointer$1.value,         // The resolved value of the $ref pointer
      circular: pointer$1.circular,   // Is this $ref pointer DIRECTLY circular? (i.e. it references itself)
      extended: extended,           // Does this $ref extend its resolved value? (i.e. it has extra properties, in addition to "$ref")
      external: external,           // Does this $ref pointer point to a file other than the main JSON Schema file?
      indirections: indirections,   // The number of indirect references that were traversed to resolve the value
    });

    // Recursively crawl the resolved value
    crawl$1(pointer$1.value, null, pointer$1.path, pathFromRoot, indirections + 1, inventory, $refs, options);
  }

  /**
   * Re-maps every $ref pointer, so that they're all relative to the root of the JSON Schema.
   * Each referenced value is dereferenced EXACTLY ONCE.  All subsequent references to the same
   * value are re-mapped to point to the first reference.
   *
   * @example:
   *  {
   *    first: { $ref: somefile.json#/some/part },
   *    second: { $ref: somefile.json#/another/part },
   *    third: { $ref: somefile.json },
   *    fourth: { $ref: somefile.json#/some/part/sub/part }
   *  }
   *
   * In this example, there are four references to the same file, but since the third reference points
   * to the ENTIRE file, that's the only one we need to dereference.  The other three can just be
   * remapped to point inside the third one.
   *
   * On the other hand, if the third reference DIDN'T exist, then the first and second would both need
   * to be dereferenced, since they point to different parts of the file. The fourth reference does NOT
   * need to be dereferenced, because it can be remapped to point inside the first one.
   *
   * @param {object[]} inventory
   */
  function remap (inventory) {
    // Group & sort all the $ref pointers, so they're in the order that we need to dereference/remap them
    inventory.sort(function (a, b) {
      if (a.file !== b.file) {
        // Group all the $refs that point to the same file
        return a.file < b.file ? -1 : +1;
      }
      else if (a.hash !== b.hash) {
        // Group all the $refs that point to the same part of the file
        return a.hash < b.hash ? -1 : +1;
      }
      else if (a.circular !== b.circular) {
        // If the $ref points to itself, then sort it higher than other $refs that point to this $ref
        return a.circular ? -1 : +1;
      }
      else if (a.extended !== b.extended) {
        // If the $ref extends the resolved value, then sort it lower than other $refs that don't extend the value
        return a.extended ? +1 : -1;
      }
      else if (a.indirections !== b.indirections) {
        // Sort direct references higher than indirect references
        return a.indirections - b.indirections;
      }
      else if (a.depth !== b.depth) {
        // Sort $refs by how close they are to the JSON Schema root
        return a.depth - b.depth;
      }
      else {
        // Determine how far each $ref is from the "definitions" property.
        // Most people will expect references to be bundled into the the "definitions" property if possible.
        var aDefinitionsIndex = a.pathFromRoot.lastIndexOf("/definitions");
        var bDefinitionsIndex = b.pathFromRoot.lastIndexOf("/definitions");

        if (aDefinitionsIndex !== bDefinitionsIndex) {
          // Give higher priority to the $ref that's closer to the "definitions" property
          return bDefinitionsIndex - aDefinitionsIndex;
        }
        else {
          // All else is equal, so use the shorter path, which will produce the shortest possible reference
          return a.pathFromRoot.length - b.pathFromRoot.length;
        }
      }
    });

    var file, hash, pathFromRoot;
    inventory.forEach(function (entry) {
      // console.log('Re-mapping $ref pointer "%s" at %s', entry.$ref.$ref, entry.pathFromRoot);

      if (!entry.external) {
        // This $ref already resolves to the main JSON Schema file
        entry.$ref.$ref = entry.hash;
      }
      else if (entry.file === file && entry.hash === hash) {
        // This $ref points to the same value as the prevous $ref, so remap it to the same path
        entry.$ref.$ref = pathFromRoot;
      }
      else if (entry.file === file && entry.hash.indexOf(hash + "/") === 0) {
        // This $ref points to a sub-value of the prevous $ref, so remap it beneath that path
        entry.$ref.$ref = pointer.join(pathFromRoot, pointer.parse(entry.hash.replace(hash, "#")));
      }
      else {
        // We've moved to a new file or new hash
        file = entry.file;
        hash = entry.hash;
        pathFromRoot = entry.pathFromRoot;

        // This is the first $ref to point to this value, so dereference the value.
        // Any other $refs that point to the same value will point to this $ref instead
        entry.$ref = entry.parent[entry.key] = ref.dereference(entry.$ref, entry.value);

        if (entry.circular) {
          // This $ref points to itself
          entry.$ref.$ref = entry.pathFromRoot;
        }
      }

      // console.log('    new value: %s', (entry.$ref && entry.$ref.$ref) ? entry.$ref.$ref : '[object Object]');
    });
  }

  /**
   * TODO
   */
  function findInInventory (inventory, $refParent, $refKey) {
    for (var i = 0; i < inventory.length; i++) {
      var existingEntry = inventory[i];
      if (existingEntry.parent === $refParent && existingEntry.key === $refKey) {
        return existingEntry;
      }
    }
  }

  function removeFromInventory (inventory, entry) {
    var index = inventory.indexOf(entry);
    inventory.splice(index, 1);
  }

  var dereference_1 = dereference;

  /**
   * Crawls the JSON schema, finds all JSON references, and dereferences them.
   * This method mutates the JSON schema object, replacing JSON references with their resolved value.
   *
   * @param {$RefParser} parser
   * @param {$RefParserOptions} options
   */
  function dereference (parser, options) {
    // console.log('Dereferencing $ref pointers in %s', parser.$refs._root$Ref.path);
    var dereferenced = crawl$2(parser.schema, parser.$refs._root$Ref.path, "#", [], parser.$refs, options);
    parser.$refs.circular = dereferenced.circular;
    parser.schema = dereferenced.value;
  }

  /**
   * Recursively crawls the given value, and dereferences any JSON references.
   *
   * @param {*} obj - The value to crawl. If it's not an object or array, it will be ignored.
   * @param {string} path - The full path of `obj`, possibly with a JSON Pointer in the hash
   * @param {string} pathFromRoot - The path of `obj` from the schema root
   * @param {object[]} parents - An array of the parent objects that have already been dereferenced
   * @param {$Refs} $refs
   * @param {$RefParserOptions} options
   * @returns {{value: object, circular: boolean}}
   */
  function crawl$2 (obj, path, pathFromRoot, parents, $refs, options) {
    var dereferenced;
    var result = {
      value: obj,
      circular: false
    };

    if (obj && typeof obj === "object") {
      parents.push(obj);

      if (ref.isAllowed$Ref(obj, options)) {
        dereferenced = dereference$Ref(obj, path, pathFromRoot, parents, $refs, options);
        result.circular = dereferenced.circular;
        result.value = dereferenced.value;
      }
      else {
        Object.keys(obj).forEach(function (key) {
          var keyPath = pointer.join(path, key);
          var keyPathFromRoot = pointer.join(pathFromRoot, key);
          var value = obj[key];
          var circular = false;

          if (ref.isAllowed$Ref(value, options)) {
            dereferenced = dereference$Ref(value, keyPath, keyPathFromRoot, parents, $refs, options);
            circular = dereferenced.circular;
            obj[key] = dereferenced.value;
          }
          else {
            if (parents.indexOf(value) === -1) {
              dereferenced = crawl$2(value, keyPath, keyPathFromRoot, parents, $refs, options);
              circular = dereferenced.circular;
              obj[key] = dereferenced.value;
            }
            else {
              circular = foundCircularReference(keyPath, $refs, options);
            }
          }

          // Set the "isCircular" flag if this or any other property is circular
          result.circular = result.circular || circular;
        });
      }

      parents.pop();
    }

    return result;
  }

  /**
   * Dereferences the given JSON Reference, and then crawls the resulting value.
   *
   * @param {{$ref: string}} $ref - The JSON Reference to resolve
   * @param {string} path - The full path of `$ref`, possibly with a JSON Pointer in the hash
   * @param {string} pathFromRoot - The path of `$ref` from the schema root
   * @param {object[]} parents - An array of the parent objects that have already been dereferenced
   * @param {$Refs} $refs
   * @param {$RefParserOptions} options
   * @returns {{value: object, circular: boolean}}
   */
  function dereference$Ref ($ref, path, pathFromRoot, parents, $refs, options) {
    // console.log('Dereferencing $ref pointer "%s" at %s', $ref.$ref, path);

    var $refPath = url_1.resolve(path, $ref.$ref);
    var pointer = $refs._resolve($refPath, options);

    // Check for circular references
    var directCircular = pointer.circular;
    var circular = directCircular || parents.indexOf(pointer.value) !== -1;
    circular && foundCircularReference(path, $refs, options);

    // Dereference the JSON reference
    var dereferencedValue = ref.dereference($ref, pointer.value);

    // Crawl the dereferenced value (unless it's circular)
    if (!circular) {
      // Determine if the dereferenced value is circular
      var dereferenced = crawl$2(dereferencedValue, pointer.path, pathFromRoot, parents, $refs, options);
      circular = dereferenced.circular;
      dereferencedValue = dereferenced.value;
    }

    if (circular && !directCircular && options.dereference.circular === "ignore") {
      // The user has chosen to "ignore" circular references, so don't change the value
      dereferencedValue = $ref;
    }

    if (directCircular) {
      // The pointer is a DIRECT circular reference (i.e. it references itself).
      // So replace the $ref path with the absolute path from the JSON Schema root
      dereferencedValue.$ref = pathFromRoot;
    }

    return {
      circular: circular,
      value: dereferencedValue
    };
  }

  /**
   * Called when a circular reference is found.
   * It sets the {@link $Refs#circular} flag, and throws an error if options.dereference.circular is false.
   *
   * @param {string} keyPath - The JSON Reference path of the circular reference
   * @param {$Refs} $refs
   * @param {$RefParserOptions} options
   * @returns {boolean} - always returns true, to indicate that a circular reference was found
   */
  function foundCircularReference (keyPath, $refs, options) {
    $refs.circular = true;
    if (!options.dereference.circular) {
      throw ono.reference("Circular $ref pointer found at %s", keyPath);
    }
    return true;
  }

  var next = (commonjsGlobal.process && process.nextTick) || commonjsGlobal.setImmediate || function (f) {
    setTimeout(f, 0);
  };

  var callMeMaybe = function maybe (cb, promise) {
    if (cb) {
      promise
        .then(function (result) {
          next(function () { cb(null, result); });
        }, function (err) {
          next(function () { cb(err); });
        });
      return undefined
    }
    else {
      return promise
    }
  };

  var lib = $RefParser;
  var YAML = yaml_1;

  /**
   * This class parses a JSON schema, builds a map of its JSON references and their resolved values,
   * and provides methods for traversing, manipulating, and dereferencing those references.
   *
   * @constructor
   */
  function $RefParser () {
    /**
     * The parsed (and possibly dereferenced) JSON schema object
     *
     * @type {object}
     * @readonly
     */
    this.schema = null;

    /**
     * The resolved JSON references
     *
     * @type {$Refs}
     * @readonly
     */
    this.$refs = new refs();
  }

  /**
   * Parses the given JSON schema.
   * This method does not resolve any JSON references.
   * It just reads a single file in JSON or YAML format, and parse it as a JavaScript object.
   *
   * @param {string} [path] - The file path or URL of the JSON schema
   * @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
   * @param {$RefParserOptions} [options] - Options that determine how the schema is parsed
   * @param {function} [callback] - An error-first callback. The second parameter is the parsed JSON schema object.
   * @returns {Promise} - The returned promise resolves with the parsed JSON schema object.
   */
  $RefParser.parse = function (path, schema, options, callback) {
    var Class = this; // eslint-disable-line consistent-this
    var instance = new Class();
    return instance.parse.apply(instance, arguments);
  };

  /**
   * Parses the given JSON schema.
   * This method does not resolve any JSON references.
   * It just reads a single file in JSON or YAML format, and parse it as a JavaScript object.
   *
   * @param {string} [path] - The file path or URL of the JSON schema
   * @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
   * @param {$RefParserOptions} [options] - Options that determine how the schema is parsed
   * @param {function} [callback] - An error-first callback. The second parameter is the parsed JSON schema object.
   * @returns {Promise} - The returned promise resolves with the parsed JSON schema object.
   */
  $RefParser.prototype.parse = function (path, schema, options, callback) {
    var args = normalizeArgs_1(arguments);
    var promise;

    if (!args.path && !args.schema) {
      var err = ono("Expected a file path, URL, or object. Got %s", args.path || args.schema);
      return callMeMaybe(args.callback, Promise.reject(err));
    }

    // Reset everything
    this.schema = null;
    this.$refs = new refs();

    // If the path is a filesystem path, then convert it to a URL.
    // NOTE: According to the JSON Reference spec, these should already be URLs,
    // but, in practice, many people use local filesystem paths instead.
    // So we're being generous here and doing the conversion automatically.
    // This is not intended to be a 100% bulletproof solution.
    // If it doesn't work for your use-case, then use a URL instead.
    var pathType = "http";
    if (url_1.isFileSystemPath(args.path)) {
      args.path = url_1.fromFileSystemPath(args.path);
      pathType = "file";
    }

    // Resolve the absolute path of the schema
    args.path = url_1.resolve(url_1.cwd(), args.path);

    if (args.schema && typeof args.schema === "object") {
      // A schema object was passed-in.
      // So immediately add a new $Ref with the schema object as its value
      var $ref = this.$refs._add(args.path);
      $ref.value = args.schema;
      $ref.pathType = pathType;
      promise = Promise.resolve(args.schema);
    }
    else {
      // Parse the schema file/url
      promise = parse_1(args.path, this.$refs, args.options);
    }

    var me = this;
    return promise
      .then(function (result) {
        if (!result || typeof result !== "object" || Buffer.isBuffer(result)) {
          throw ono.syntax('"%s" is not a valid JSON Schema', me.$refs._root$Ref.path || result);
        }
        else {
          me.schema = result;
          return callMeMaybe(args.callback, Promise.resolve(me.schema));
        }
      })
      .catch(function (e) {
        return callMeMaybe(args.callback, Promise.reject(e));
      });
  };

  /**
   * Parses the given JSON schema and resolves any JSON references, including references in
   * externally-referenced files.
   *
   * @param {string} [path] - The file path or URL of the JSON schema
   * @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
   * @param {$RefParserOptions} [options] - Options that determine how the schema is parsed and resolved
   * @param {function} [callback]
   * - An error-first callback. The second parameter is a {@link $Refs} object containing the resolved JSON references
   *
   * @returns {Promise}
   * The returned promise resolves with a {@link $Refs} object containing the resolved JSON references
   */
  $RefParser.resolve = function (path, schema, options, callback) {
    var Class = this; // eslint-disable-line consistent-this
    var instance = new Class();
    return instance.resolve.apply(instance, arguments);
  };

  /**
   * Parses the given JSON schema and resolves any JSON references, including references in
   * externally-referenced files.
   *
   * @param {string} [path] - The file path or URL of the JSON schema
   * @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
   * @param {$RefParserOptions} [options] - Options that determine how the schema is parsed and resolved
   * @param {function} [callback]
   * - An error-first callback. The second parameter is a {@link $Refs} object containing the resolved JSON references
   *
   * @returns {Promise}
   * The returned promise resolves with a {@link $Refs} object containing the resolved JSON references
   */
  $RefParser.prototype.resolve = function (path, schema, options, callback) {
    var me = this;
    var args = normalizeArgs_1(arguments);

    return this.parse(args.path, args.schema, args.options)
      .then(function () {
        return resolveExternal_1(me, args.options);
      })
      .then(function () {
        return callMeMaybe(args.callback, Promise.resolve(me.$refs));
      })
      .catch(function (err) {
        return callMeMaybe(args.callback, Promise.reject(err));
      });
  };

  /**
   * Parses the given JSON schema, resolves any JSON references, and bundles all external references
   * into the main JSON schema. This produces a JSON schema that only has *internal* references,
   * not any *external* references.
   *
   * @param {string} [path] - The file path or URL of the JSON schema
   * @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
   * @param {$RefParserOptions} [options] - Options that determine how the schema is parsed, resolved, and dereferenced
   * @param {function} [callback] - An error-first callback. The second parameter is the bundled JSON schema object
   * @returns {Promise} - The returned promise resolves with the bundled JSON schema object.
   */
  $RefParser.bundle = function (path, schema, options, callback) {
    var Class = this; // eslint-disable-line consistent-this
    var instance = new Class();
    return instance.bundle.apply(instance, arguments);
  };

  /**
   * Parses the given JSON schema, resolves any JSON references, and bundles all external references
   * into the main JSON schema. This produces a JSON schema that only has *internal* references,
   * not any *external* references.
   *
   * @param {string} [path] - The file path or URL of the JSON schema
   * @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
   * @param {$RefParserOptions} [options] - Options that determine how the schema is parsed, resolved, and dereferenced
   * @param {function} [callback] - An error-first callback. The second parameter is the bundled JSON schema object
   * @returns {Promise} - The returned promise resolves with the bundled JSON schema object.
   */
  $RefParser.prototype.bundle = function (path, schema, options, callback) {
    var me = this;
    var args = normalizeArgs_1(arguments);

    return this.resolve(args.path, args.schema, args.options)
      .then(function () {
        bundle_1(me, args.options);
        return callMeMaybe(args.callback, Promise.resolve(me.schema));
      })
      .catch(function (err) {
        return callMeMaybe(args.callback, Promise.reject(err));
      });
  };

  /**
   * Parses the given JSON schema, resolves any JSON references, and dereferences the JSON schema.
   * That is, all JSON references are replaced with their resolved values.
   *
   * @param {string} [path] - The file path or URL of the JSON schema
   * @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
   * @param {$RefParserOptions} [options] - Options that determine how the schema is parsed, resolved, and dereferenced
   * @param {function} [callback] - An error-first callback. The second parameter is the dereferenced JSON schema object
   * @returns {Promise} - The returned promise resolves with the dereferenced JSON schema object.
   */
  $RefParser.dereference = function (path, schema, options, callback) {
    var Class = this; // eslint-disable-line consistent-this
    var instance = new Class();
    return instance.dereference.apply(instance, arguments);
  };

  /**
   * Parses the given JSON schema, resolves any JSON references, and dereferences the JSON schema.
   * That is, all JSON references are replaced with their resolved values.
   *
   * @param {string} [path] - The file path or URL of the JSON schema
   * @param {object} [schema] - A JSON schema object. This object will be used instead of reading from `path`.
   * @param {$RefParserOptions} [options] - Options that determine how the schema is parsed, resolved, and dereferenced
   * @param {function} [callback] - An error-first callback. The second parameter is the dereferenced JSON schema object
   * @returns {Promise} - The returned promise resolves with the dereferenced JSON schema object.
   */
  $RefParser.prototype.dereference = function (path, schema, options, callback) {
    var me = this;
    var args = normalizeArgs_1(arguments);

    return this.resolve(args.path, args.schema, args.options)
      .then(function () {
        dereference_1(me, args.options);
        return callMeMaybe(args.callback, Promise.resolve(me.schema));
      })
      .catch(function (err) {
        return callMeMaybe(args.callback, Promise.reject(err));
      });
  };
  lib.YAML = YAML;

  /**
   * This class defines a registry for custom formats used within JSF.
   */
  var Registry = function Registry() {
    // empty by default
    this.data = {};
  };
  /**
   * Unregisters custom format(s)
   * @param name
   */


  Registry.prototype.unregister = function unregister (name) {
    if (!name) {
      this.data = {};
    } else {
      delete this.data[name];
    }
  };
  /**
   * Registers custom format
   */


  Registry.prototype.register = function register (name, callback) {
    this.data[name] = callback;
  };
  /**
   * Register many formats at one shot
   */


  Registry.prototype.registerMany = function registerMany (formats) {
      var this$1 = this;

    Object.keys(formats).forEach(function (name) {
      this$1.data[name] = formats[name];
    });
  };
  /**
   * Returns element by registry key
   */


  Registry.prototype.get = function get (name) {
    var format = this.data[name];
    return format;
  };
  /**
   * Returns the whole registry content
   */


  Registry.prototype.list = function list () {
    return this.data;
  };

  var defaults = {};
  defaults.defaultInvalidTypeProduct = null;
  defaults.defaultRandExpMax = 10;
  defaults.ignoreProperties = [];
  defaults.ignoreMissingRefs = false;
  defaults.failOnInvalidTypes = true;
  defaults.failOnInvalidFormat = true;
  defaults.alwaysFakeOptionals = false;
  defaults.optionalsProbability = false;
  defaults.fixedProbabilities = false;
  defaults.useExamplesValue = false;
  defaults.useDefaultValue = false;
  defaults.requiredOnly = false;
  defaults.minItems = 0;
  defaults.maxItems = null;
  defaults.minLength = 0;
  defaults.maxLength = null;
  defaults.resolveJsonPath = false;
  defaults.reuseProperties = false;
  defaults.fillProperties = true;
  defaults.random = Math.random;
  /**
   * This class defines a registry for custom settings used within JSF.
   */

  var OptionRegistry = /*@__PURE__*/(function (Registry) {
    function OptionRegistry() {
      Registry.call(this);
      this.data = Object.assign({}, defaults);
      this._defaults = defaults;
    }

    if ( Registry ) OptionRegistry.__proto__ = Registry;
    OptionRegistry.prototype = Object.create( Registry && Registry.prototype );
    OptionRegistry.prototype.constructor = OptionRegistry;

    var prototypeAccessors = { defaults: { configurable: true } };

    prototypeAccessors.defaults.get = function () {
      return Object.assign({}, this._defaults);
    };

    Object.defineProperties( OptionRegistry.prototype, prototypeAccessors );

    return OptionRegistry;
  }(Registry));

  var registry = new OptionRegistry();
  /**
   * Custom option API
   *
   * @param nameOrOptionMap
   * @returns {any}
   */

  function optionAPI(nameOrOptionMap, optionalValue) {
    if (typeof nameOrOptionMap === 'string') {
      if (typeof optionalValue !== 'undefined') {
        return registry.register(nameOrOptionMap, optionalValue);
      }

      return registry.get(nameOrOptionMap);
    }

    return registry.registerMany(nameOrOptionMap);
  }

  optionAPI.getDefaults = function () { return registry.defaults; };

  var ALL_TYPES = ['array', 'object', 'integer', 'number', 'string', 'boolean', 'null'];
  var MOST_NEAR_DATETIME = 2524608000000;
  var MIN_INTEGER = -100000000;
  var MAX_INTEGER = 100000000;
  var MIN_NUMBER = -100;
  var MAX_NUMBER = 100;
  var env = {
    ALL_TYPES: ALL_TYPES,
    MIN_NUMBER: MIN_NUMBER,
    MAX_NUMBER: MAX_NUMBER,
    MIN_INTEGER: MIN_INTEGER,
    MAX_INTEGER: MAX_INTEGER,
    MOST_NEAR_DATETIME: MOST_NEAR_DATETIME
  };

  var types = {
    ROOT       : 0,
    GROUP      : 1,
    POSITION   : 2,
    SET        : 3,
    RANGE      : 4,
    REPETITION : 5,
    REFERENCE  : 6,
    CHAR       : 7,
  };

  var INTS = function () { return [{ type: types.RANGE , from: 48, to: 57 }]; };

  var WORDS = function () {
    return [
      { type: types.CHAR, value: 95 },
      { type: types.RANGE, from: 97, to: 122 },
      { type: types.RANGE, from: 65, to: 90 }
    ].concat(INTS());
  };

  var WHITESPACE = function () {
    return [
      { type: types.CHAR, value: 9 },
      { type: types.CHAR, value: 10 },
      { type: types.CHAR, value: 11 },
      { type: types.CHAR, value: 12 },
      { type: types.CHAR, value: 13 },
      { type: types.CHAR, value: 32 },
      { type: types.CHAR, value: 160 },
      { type: types.CHAR, value: 5760 },
      { type: types.RANGE, from: 8192, to: 8202 },
      { type: types.CHAR, value: 8232 },
      { type: types.CHAR, value: 8233 },
      { type: types.CHAR, value: 8239 },
      { type: types.CHAR, value: 8287 },
      { type: types.CHAR, value: 12288 },
      { type: types.CHAR, value: 65279 }
    ];
  };

  var NOTANYCHAR = function () {
    return [
      { type: types.CHAR, value: 10 },
      { type: types.CHAR, value: 13 },
      { type: types.CHAR, value: 8232 },
      { type: types.CHAR, value: 8233 } ];
  };

  // Predefined class objects.
  var words = function () { return ({ type: types.SET, set: WORDS(), not: false }); };
  var notWords = function () { return ({ type: types.SET, set: WORDS(), not: true }); };
  var ints = function () { return ({ type: types.SET, set: INTS(), not: false }); };
  var notInts = function () { return ({ type: types.SET, set: INTS(), not: true }); };
  var whitespace = function () { return ({ type: types.SET, set: WHITESPACE(), not: false }); };
  var notWhitespace = function () { return ({ type: types.SET, set: WHITESPACE(), not: true }); };
  var anyChar = function () { return ({ type: types.SET, set: NOTANYCHAR(), not: true }); };

  var sets = {
  	words: words,
  	notWords: notWords,
  	ints: ints,
  	notInts: notInts,
  	whitespace: whitespace,
  	notWhitespace: notWhitespace,
  	anyChar: anyChar
  };

  var util = createCommonjsModule(function (module, exports) {
  var CTRL = '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^ ?';
  var SLSH = { '0': 0, 't': 9, 'n': 10, 'v': 11, 'f': 12, 'r': 13 };

  /**
   * Finds character representations in str and convert all to
   * their respective characters
   *
   * @param {String} str
   * @return {String}
   */
  exports.strToChars = function(str) {
    /* jshint maxlen: false */
    var chars_regex = /(\[\\b\])|(\\)?\\(?:u([A-F0-9]{4})|x([A-F0-9]{2})|(0?[0-7]{2})|c([@A-Z[\\\]^?])|([0tnvfr]))/g;
    str = str.replace(chars_regex, function(s, b, lbs, a16, b16, c8, dctrl, eslsh) {
      if (lbs) {
        return s;
      }

      var code = b ? 8 :
        a16   ? parseInt(a16, 16) :
        b16   ? parseInt(b16, 16) :
        c8    ? parseInt(c8,   8) :
        dctrl ? CTRL.indexOf(dctrl) :
        SLSH[eslsh];

      var c = String.fromCharCode(code);

      // Escape special regex characters.
      if (/[[\]{}^$.|?*+()]/.test(c)) {
        c = '\\' + c;
      }

      return c;
    });

    return str;
  };


  /**
   * turns class into tokens
   * reads str until it encounters a ] not preceeded by a \
   *
   * @param {String} str
   * @param {String} regexpStr
   * @return {Array.<Array.<Object>, Number>}
   */
  exports.tokenizeClass = function (str, regexpStr) {
    /* jshint maxlen: false */
    var tokens = [];
    var regexp = /\\(?:(w)|(d)|(s)|(W)|(D)|(S))|((?:(?:\\)(.)|([^\]\\]))-(?:\\)?([^\]]))|(\])|(?:\\)?([^])/g;
    var rs, c;


    while ((rs = regexp.exec(str)) != null) {
      if (rs[1]) {
        tokens.push(sets.words());

      } else if (rs[2]) {
        tokens.push(sets.ints());

      } else if (rs[3]) {
        tokens.push(sets.whitespace());

      } else if (rs[4]) {
        tokens.push(sets.notWords());

      } else if (rs[5]) {
        tokens.push(sets.notInts());

      } else if (rs[6]) {
        tokens.push(sets.notWhitespace());

      } else if (rs[7]) {
        tokens.push({
          type: types.RANGE,
          from: (rs[8] || rs[9]).charCodeAt(0),
          to: rs[10].charCodeAt(0),
        });

      } else if ((c = rs[12])) {
        tokens.push({
          type: types.CHAR,
          value: c.charCodeAt(0),
        });

      } else {
        return [tokens, regexp.lastIndex];
      }
    }

    exports.error(regexpStr, 'Unterminated character class');
  };


  /**
   * Shortcut to throw errors.
   *
   * @param {String} regexp
   * @param {String} msg
   */
  exports.error = function (regexp, msg) {
    throw new SyntaxError('Invalid regular expression: /' + regexp + '/: ' + msg);
  };
  });
  var util_1 = util.strToChars;
  var util_2 = util.tokenizeClass;
  var util_3 = util.error;

  var wordBoundary = function () { return ({ type: types.POSITION, value: 'b' }); };
  var nonWordBoundary = function () { return ({ type: types.POSITION, value: 'B' }); };
  var begin = function () { return ({ type: types.POSITION, value: '^' }); };
  var end = function () { return ({ type: types.POSITION, value: '$' }); };

  var positions = {
  	wordBoundary: wordBoundary,
  	nonWordBoundary: nonWordBoundary,
  	begin: begin,
  	end: end
  };

  var lib$1 = function (regexpStr) {
    var i = 0, l, c,
      start = { type: types.ROOT, stack: []},

      // Keep track of last clause/group and stack.
      lastGroup = start,
      last = start.stack,
      groupStack = [];


    var repeatErr = function (i) {
      util.error(regexpStr, ("Nothing to repeat at column " + (i - 1)));
    };

    // Decode a few escaped characters.
    var str = util.strToChars(regexpStr);
    l = str.length;

    // Iterate through each character in string.
    while (i < l) {
      c = str[i++];

      switch (c) {
        // Handle escaped characters, inclues a few sets.
        case '\\':
          c = str[i++];

          switch (c) {
            case 'b':
              last.push(positions.wordBoundary());
              break;

            case 'B':
              last.push(positions.nonWordBoundary());
              break;

            case 'w':
              last.push(sets.words());
              break;

            case 'W':
              last.push(sets.notWords());
              break;

            case 'd':
              last.push(sets.ints());
              break;

            case 'D':
              last.push(sets.notInts());
              break;

            case 's':
              last.push(sets.whitespace());
              break;

            case 'S':
              last.push(sets.notWhitespace());
              break;

            default:
              // Check if c is integer.
              // In which case it's a reference.
              if (/\d/.test(c)) {
                last.push({ type: types.REFERENCE, value: parseInt(c, 10) });

              // Escaped character.
              } else {
                last.push({ type: types.CHAR, value: c.charCodeAt(0) });
              }
          }

          break;


        // Positionals.
        case '^':
          last.push(positions.begin());
          break;

        case '$':
          last.push(positions.end());
          break;


        // Handle custom sets.
        case '[':
          // Check if this class is 'anti' i.e. [^abc].
          var not;
          if (str[i] === '^') {
            not = true;
            i++;
          } else {
            not = false;
          }

          // Get all the characters in class.
          var classTokens = util.tokenizeClass(str.slice(i), regexpStr);

          // Increase index by length of class.
          i += classTokens[1];
          last.push({
            type: types.SET,
            set: classTokens[0],
            not: not,
          });

          break;


        // Class of any character except \n.
        case '.':
          last.push(sets.anyChar());
          break;


        // Push group onto stack.
        case '(':
          // Create group.
          var group = {
            type: types.GROUP,
            stack: [],
            remember: true,
          };

          c = str[i];

          // If if this is a special kind of group.
          if (c === '?') {
            c = str[i + 1];
            i += 2;

            // Match if followed by.
            if (c === '=') {
              group.followedBy = true;

            // Match if not followed by.
            } else if (c === '!') {
              group.notFollowedBy = true;

            } else if (c !== ':') {
              util.error(regexpStr,
                "Invalid group, character '" + c + "'" +
                " after '?' at column " + (i - 1));
            }

            group.remember = false;
          }

          // Insert subgroup into current group stack.
          last.push(group);

          // Remember the current group for when the group closes.
          groupStack.push(lastGroup);

          // Make this new group the current group.
          lastGroup = group;
          last = group.stack;
          break;


        // Pop group out of stack.
        case ')':
          if (groupStack.length === 0) {
            util.error(regexpStr, ("Unmatched ) at column " + (i - 1)));
          }
          lastGroup = groupStack.pop();

          // Check if this group has a PIPE.
          // To get back the correct last stack.
          last = lastGroup.options ?
            lastGroup.options[lastGroup.options.length - 1] : lastGroup.stack;
          break;


        // Use pipe character to give more choices.
        case '|':
          // Create array where options are if this is the first PIPE
          // in this clause.
          if (!lastGroup.options) {
            lastGroup.options = [lastGroup.stack];
            delete lastGroup.stack;
          }

          // Create a new stack and add to options for rest of clause.
          var stack = [];
          lastGroup.options.push(stack);
          last = stack;
          break;


        // Repetition.
        // For every repetition, remove last element from last stack
        // then insert back a RANGE object.
        // This design is chosen because there could be more than
        // one repetition symbols in a regex i.e. `a?+{2,3}`.
        case '{':
          var rs = /^(\d+)(,(\d+)?)?\}/.exec(str.slice(i)), min, max;
          if (rs !== null) {
            if (last.length === 0) {
              repeatErr(i);
            }
            min = parseInt(rs[1], 10);
            max = rs[2] ? rs[3] ? parseInt(rs[3], 10) : Infinity : min;
            i += rs[0].length;

            last.push({
              type: types.REPETITION,
              min: min,
              max: max,
              value: last.pop(),
            });
          } else {
            last.push({
              type: types.CHAR,
              value: 123,
            });
          }
          break;

        case '?':
          if (last.length === 0) {
            repeatErr(i);
          }
          last.push({
            type: types.REPETITION,
            min: 0,
            max: 1,
            value: last.pop(),
          });
          break;

        case '+':
          if (last.length === 0) {
            repeatErr(i);
          }
          last.push({
            type: types.REPETITION,
            min: 1,
            max: Infinity,
            value: last.pop(),
          });
          break;

        case '*':
          if (last.length === 0) {
            repeatErr(i);
          }
          last.push({
            type: types.REPETITION,
            min: 0,
            max: Infinity,
            value: last.pop(),
          });
          break;


        // Default is a character that is not `\[](){}?+*^$`.
        default:
          last.push({
            type: types.CHAR,
            value: c.charCodeAt(0),
          });
      }

    }

    // Check if any groups have not been closed.
    if (groupStack.length !== 0) {
      util.error(regexpStr, 'Unterminated group');
    }

    return start;
  };

  var types_1 = types;
  lib$1.types = types_1;

  /* eslint indent: 4 */


  // Private helper class
  var SubRange = function SubRange(low, high) {
      this.low = low;
      this.high = high;
      this.length = 1 + high - low;
  };

  SubRange.prototype.overlaps = function overlaps (range) {
      return !(this.high < range.low || this.low > range.high);
  };

  SubRange.prototype.touches = function touches (range) {
      return !(this.high + 1 < range.low || this.low - 1 > range.high);
  };

  // Returns inclusive combination of SubRanges as a SubRange.
  SubRange.prototype.add = function add (range) {
      return new SubRange(
          Math.min(this.low, range.low),
          Math.max(this.high, range.high)
      );
  };

  // Returns subtraction of SubRanges as an array of SubRanges.
  // (There's a case where subtraction divides it in 2)
  SubRange.prototype.subtract = function subtract (range) {
      if (range.low <= this.low && range.high >= this.high) {
          return [];
      } else if (range.low > this.low && range.high < this.high) {
          return [
              new SubRange(this.low, range.low - 1),
              new SubRange(range.high + 1, this.high)
          ];
      } else if (range.low <= this.low) {
          return [new SubRange(range.high + 1, this.high)];
      } else {
          return [new SubRange(this.low, range.low - 1)];
      }
  };

  SubRange.prototype.toString = function toString () {
      return this.low == this.high ?
          this.low.toString() : this.low + '-' + this.high;
  };


  var DRange = function DRange(a, b) {
      this.ranges = [];
      this.length = 0;
      if (a != null) { this.add(a, b); }
  };

  DRange.prototype._update_length = function _update_length () {
      this.length = this.ranges.reduce(function (previous, range) {
          return previous + range.length;
      }, 0);
  };

  DRange.prototype.add = function add (a, b) {
          var this$1 = this;

      var _add = function (subrange) {
          var i = 0;
          while (i < this$1.ranges.length && !subrange.touches(this$1.ranges[i])) {
              i++;
          }
          var newRanges = this$1.ranges.slice(0, i);
          while (i < this$1.ranges.length && subrange.touches(this$1.ranges[i])) {
              subrange = subrange.add(this$1.ranges[i]);
              i++;
          }
          newRanges.push(subrange);
          this$1.ranges = newRanges.concat(this$1.ranges.slice(i));
          this$1._update_length();
      };

      if (a instanceof DRange) {
          a.ranges.forEach(_add);
      } else {
          if (b == null) { b = a; }
          _add(new SubRange(a, b));
      }
      return this;
  };

  DRange.prototype.subtract = function subtract (a, b) {
          var this$1 = this;

      var _subtract = function (subrange) {
          var i = 0;
          while (i < this$1.ranges.length && !subrange.overlaps(this$1.ranges[i])) {
              i++;
          }
          var newRanges = this$1.ranges.slice(0, i);
          while (i < this$1.ranges.length && subrange.overlaps(this$1.ranges[i])) {
              newRanges = newRanges.concat(this$1.ranges[i].subtract(subrange));
              i++;
          }
          this$1.ranges = newRanges.concat(this$1.ranges.slice(i));
          this$1._update_length();
      };

      if (a instanceof DRange) {
          a.ranges.forEach(_subtract);
      } else {
          if (b == null) { b = a; }
          _subtract(new SubRange(a, b));
      }
      return this;
  };

  DRange.prototype.intersect = function intersect (a, b) {
          var this$1 = this;

      var newRanges = [];
      var _intersect = function (subrange) {
          var i = 0;
          while (i < this$1.ranges.length && !subrange.overlaps(this$1.ranges[i])) {
              i++;
          }
          while (i < this$1.ranges.length && subrange.overlaps(this$1.ranges[i])) {
              var low = Math.max(this$1.ranges[i].low, subrange.low);
              var high = Math.min(this$1.ranges[i].high, subrange.high);
              newRanges.push(new SubRange(low, high));
              i++;
          }
      };

      if (a instanceof DRange) {
          a.ranges.forEach(_intersect);
      } else {
          if (b == null) { b = a; }
          _intersect(new SubRange(a, b));
      }
      this.ranges = newRanges;
      this._update_length();
      return this;
  };

  DRange.prototype.index = function index (index$1) {
      var i = 0;
      while (i < this.ranges.length && this.ranges[i].length <= index$1) {
          index$1 -= this.ranges[i].length;
          i++;
      }
      return this.ranges[i].low + index$1;
  };

  DRange.prototype.toString = function toString () {
      return '[ ' + this.ranges.join(', ') + ' ]';
  };

  DRange.prototype.clone = function clone () {
      return new DRange(this);
  };

  var lib$2 = DRange;

  var types$1  = lib$1.types;


  var randexp = /*@__PURE__*/(function () {
    function RandExp(regexp, m) {
      this._setDefaults(regexp);
      if (regexp instanceof RegExp) {
        this.ignoreCase = regexp.ignoreCase;
        this.multiline = regexp.multiline;
        regexp = regexp.source;

      } else if (typeof regexp === 'string') {
        this.ignoreCase = m && m.indexOf('i') !== -1;
        this.multiline = m && m.indexOf('m') !== -1;
      } else {
        throw new Error('Expected a regexp or string');
      }

      this.tokens = lib$1(regexp);
    }

    var prototypeAccessors = { defaultRange: { configurable: true } };


    /**
     * Checks if some custom properties have been set for this regexp.
     *
     * @param {RandExp} randexp
     * @param {RegExp} regexp
     */
    RandExp.prototype._setDefaults = function _setDefaults (regexp) {
      // When a repetitional token has its max set to Infinite,
      // randexp won't actually generate a random amount between min and Infinite
      // instead it will see Infinite as min + 100.
      this.max = regexp.max != null ? regexp.max :
        RandExp.prototype.max != null ? RandExp.prototype.max : 100;

      // This allows expanding to include additional characters
      // for instance: RandExp.defaultRange.add(0, 65535);
      this.defaultRange = regexp.defaultRange ?
        regexp.defaultRange : this.defaultRange.clone();

      if (regexp.randInt) {
        this.randInt = regexp.randInt;
      }
    };


    /**
     * Generates the random string.
     *
     * @return {String}
     */
    RandExp.prototype.gen = function gen () {
      return this._gen(this.tokens, []);
    };


    /**
     * Generate random string modeled after given tokens.
     *
     * @param {Object} token
     * @param {Array.<String>} groups
     * @return {String}
     */
    RandExp.prototype._gen = function _gen (token, groups) {
      var stack, str, n, i, l;

      switch (token.type) {
        case types$1.ROOT:
        case types$1.GROUP:
          // Ignore lookaheads for now.
          if (token.followedBy || token.notFollowedBy) { return ''; }

          // Insert placeholder until group string is generated.
          if (token.remember && token.groupNumber === undefined) {
            token.groupNumber = groups.push(null) - 1;
          }

          stack = token.options ?
            this._randSelect(token.options) : token.stack;

          str = '';
          for (i = 0, l = stack.length; i < l; i++) {
            str += this._gen(stack[i], groups);
          }

          if (token.remember) {
            groups[token.groupNumber] = str;
          }
          return str;

        case types$1.POSITION:
          // Do nothing for now.
          return '';

        case types$1.SET:
          var expandedSet = this._expand(token);
          if (!expandedSet.length) { return ''; }
          return String.fromCharCode(this._randSelect(expandedSet));

        case types$1.REPETITION:
          // Randomly generate number between min and max.
          n = this.randInt(token.min,
            token.max === Infinity ? token.min + this.max : token.max);

          str = '';
          for (i = 0; i < n; i++) {
            str += this._gen(token.value, groups);
          }

          return str;

        case types$1.REFERENCE:
          return groups[token.value - 1] || '';

        case types$1.CHAR:
          var code = this.ignoreCase && this._randBool() ?
            this._toOtherCase(token.value) : token.value;
          return String.fromCharCode(code);
      }
    };


    /**
     * If code is alphabetic, converts to other case.
     * If not alphabetic, returns back code.
     *
     * @param {Number} code
     * @return {Number}
     */
    RandExp.prototype._toOtherCase = function _toOtherCase (code) {
      return code + (97 <= code && code <= 122 ? -32 :
        65 <= code && code <= 90  ?  32 : 0);
    };


    /**
     * Randomly returns a true or false value.
     *
     * @return {Boolean}
     */
    RandExp.prototype._randBool = function _randBool () {
      return !this.randInt(0, 1);
    };


    /**
     * Randomly selects and returns a value from the array.
     *
     * @param {Array.<Object>} arr
     * @return {Object}
     */
    RandExp.prototype._randSelect = function _randSelect (arr) {
      if (arr instanceof lib$2) {
        return arr.index(this.randInt(0, arr.length - 1));
      }
      return arr[this.randInt(0, arr.length - 1)];
    };


    /**
     * expands a token to a DiscontinuousRange of characters which has a
     * length and an index function (for random selecting)
     *
     * @param {Object} token
     * @return {DiscontinuousRange}
     */
    RandExp.prototype._expand = function _expand (token) {
      if (token.type === lib$1.types.CHAR) {
        return new lib$2(token.value);
      } else if (token.type === lib$1.types.RANGE) {
        return new lib$2(token.from, token.to);
      } else {
        var drange = new lib$2();
        for (var i = 0; i < token.set.length; i++) {
          var subrange = this._expand(token.set[i]);
          drange.add(subrange);
          if (this.ignoreCase) {
            for (var j = 0; j < subrange.length; j++) {
              var code = subrange.index(j);
              var otherCaseCode = this._toOtherCase(code);
              if (code !== otherCaseCode) {
                drange.add(otherCaseCode);
              }
            }
          }
        }
        if (token.not) {
          return this.defaultRange.clone().subtract(drange);
        } else {
          return this.defaultRange.clone().intersect(drange);
        }
      }
    };


    /**
     * Randomly generates and returns a number between a and b (inclusive).
     *
     * @param {Number} a
     * @param {Number} b
     * @return {Number}
     */
    RandExp.prototype.randInt = function randInt (a, b) {
      return a + Math.floor(Math.random() * (1 + b - a));
    };


    /**
     * Default range of characters to generate from.
     */
    prototypeAccessors.defaultRange.get = function () {
      return this._range = this._range || new lib$2(32, 126);
    };

    prototypeAccessors.defaultRange.set = function (range) {
      this._range = range;
    };


    /**
     *
     * Enables use of randexp with a shorter call.
     *
     * @param {RegExp|String| regexp}
     * @param {String} m
     * @return {String}
     */
    RandExp.randexp = function randexp (regexp, m) {
      var randexp;
      if(typeof regexp === 'string') {
        regexp = new RegExp(regexp, m);
      }

      if (regexp._randexp === undefined) {
        randexp = new RandExp(regexp, m);
        regexp._randexp = randexp;
      } else {
        randexp = regexp._randexp;
        randexp._setDefaults(regexp);
      }
      return randexp.gen();
    };


    /**
     * Enables sugary /regexp/.gen syntax.
     */
    RandExp.sugar = function sugar () {
      /* eshint freeze:false */
      RegExp.prototype.gen = function() {
        return RandExp.randexp(this);
      };
    };

    Object.defineProperties( RandExp.prototype, prototypeAccessors );

    return RandExp;
  }());

  function getRandomInteger(min, max) {
    min = typeof min === 'undefined' ? env.MIN_INTEGER : min;
    max = typeof max === 'undefined' ? env.MAX_INTEGER : max;
    return Math.floor(optionAPI('random')() * (max - min + 1)) + min;
  }

  function _randexp(value) {
    // set maximum default, see #193
    randexp.prototype.max = optionAPI('defaultRandExpMax'); // same implementation as the original except using our random

    randexp.prototype.randInt = function (a, b) { return a + Math.floor(optionAPI('random')() * (1 + (b - a))); };

    var re = new randexp(value);
    return re.gen();
  }
  /**
   * Returns random element of a collection
   *
   * @param collection
   * @returns {T}
   */


  function pick(collection) {
    return collection[Math.floor(optionAPI('random')() * collection.length)];
  }
  /**
   * Returns shuffled collection of elements
   *
   * @param collection
   * @returns {T[]}
   */


  function shuffle(collection) {
    var tmp;
    var key;
    var length = collection.length;
    var copy = collection.slice();

    for (; length > 0;) {
      key = Math.floor(optionAPI('random')() * length); // swap

      length -= 1;
      tmp = copy[length];
      copy[length] = copy[key];
      copy[key] = tmp;
    }

    return copy;
  }
  /**
   * Returns a random integer between min (inclusive) and max (inclusive)
   * Using Math.round() will give you a non-uniform distribution!
   * @see http://stackoverflow.com/a/1527820/769384
   */


  function getRandom(min, max) {
    return optionAPI('random')() * (max - min) + min;
  }
  /**
   * Generates random number according to parameters passed
   *
   * @param min
   * @param max
   * @param defMin
   * @param defMax
   * @param hasPrecision
   * @returns {number}
   */


  function number(min, max, defMin, defMax, hasPrecision) {
    if ( hasPrecision === void 0 ) hasPrecision = false;

    defMin = typeof defMin === 'undefined' ? env.MIN_NUMBER : defMin;
    defMax = typeof defMax === 'undefined' ? env.MAX_NUMBER : defMax;
    min = typeof min === 'undefined' ? defMin : min;
    max = typeof max === 'undefined' ? defMax : max;

    if (max < min) {
      max += min;
    }

    if (hasPrecision) {
      return getRandom(min, max);
    }

    return getRandomInteger(min, max);
  }

  function by(type) {
    switch (type) {
      case 'seconds':
        return number(0, 60) * 60;

      case 'minutes':
        return number(15, 50) * 612;

      case 'hours':
        return number(12, 72) * 36123;

      case 'days':
        return number(7, 30) * 86412345;

      case 'weeks':
        return number(4, 52) * 604812345;

      case 'months':
        return number(2, 13) * 2592012345;

      case 'years':
        return number(1, 20) * 31104012345;

      default:
        break;
    }
  }

  function date(step) {
    if (step) {
      return by(step);
    }

    var now = new Date();
    var days = number(-1000, env.MOST_NEAR_DATETIME);
    now.setTime(now.getTime() - days);
    return now;
  }

  var random = {
    pick: pick,
    date: date,
    shuffle: shuffle,
    number: number,
    randexp: _randexp
  };

  function getSubAttribute(obj, dotSeparatedKey) {
    var keyElements = dotSeparatedKey.split('.');

    while (keyElements.length) {
      var prop = keyElements.shift();

      if (!obj[prop]) {
        break;
      }

      obj = obj[prop];
    }

    return obj;
  }
  /**
   * Returns true/false whether the object parameter has its own properties defined
   *
   * @param obj
   * @param properties
   * @returns {boolean}
   */


  function hasProperties(obj) {
    var properties = [], len = arguments.length - 1;
    while ( len-- > 0 ) properties[ len ] = arguments[ len + 1 ];

    return properties.filter(function (key) {
      return typeof obj[key] !== 'undefined';
    }).length > 0;
  }
  /**
   * Returns typecasted value.
   * External generators (faker, chance, casual) may return data in non-expected formats, such as string, when you might expect an
   * integer. This function is used to force the typecast. This is the base formatter for all result values.
   *
   * @param type
   * @param schema
   * @param callback
   * @returns {any}
   */


  function typecast(type, schema, callback) {
    var params = {}; // normalize constraints

    switch (type || schema.type) {
      case 'integer':
      case 'number':
        if (typeof schema.minimum !== 'undefined') {
          params.minimum = schema.minimum;
        }

        if (typeof schema.maximum !== 'undefined') {
          params.maximum = schema.maximum;
        }

        if (schema.enum) {
          var min = Math.max(params.minimum || 0, 0);
          var max = Math.min(params.maximum || Infinity, Infinity);

          if (schema.exclusiveMinimum && min === schema.minimum) {
            min += schema.multipleOf || 1;
          }

          if (schema.exclusiveMaximum && max === schema.maximum) {
            max -= schema.multipleOf || 1;
          } // discard out-of-bounds enumerations


          if (min || max !== Infinity) {
            schema.enum = schema.enum.filter(function (x) {
              if (x >= min && x <= max) {
                return true;
              }

              return false;
            });
          }
        }

        break;

      case 'string':
        {
          if (typeof schema.minLength !== 'undefined') {
            params.minLength = schema.minLength;
          }

          if (typeof schema.maxLength !== 'undefined') {
            params.maxLength = schema.maxLength;
          }

          var _maxLength = optionAPI('maxLength');

          var _minLength = optionAPI('minLength'); // Don't allow user to set max length above our maximum


          if (_maxLength && params.maxLength > _maxLength) {
            params.maxLength = _maxLength;
          } // Don't allow user to set min length above our maximum


          if (_minLength && params.minLength < _minLength) {
            params.minLength = _minLength;
          }

          break;
        }

      default:
        break;
    } // execute generator


    var value = callback(params); // normalize output value

    switch (type || schema.type) {
      case 'number':
        value = parseFloat(value);
        break;

      case 'integer':
        value = parseInt(value, 10);
        break;

      case 'boolean':
        value = !!value;
        break;

      case 'string':
        {
          value = String(value);
          var min$1 = Math.max(params.minLength || 0, 0);
          var max$1 = Math.min(params.maxLength || Infinity, Infinity);

          while (value.length < min$1) {
            if (!schema.pattern) {
              value += "" + (random.pick([' ', '/', '_', '-', '+', '=', '@', '^'])) + value;
            } else {
              value += random.randexp(schema.pattern);
            }
          }

          if (value.length > max$1) {
            value = value.substr(0, max$1);
          }

          switch (schema.format) {
            case 'date-time':
            case 'datetime':
              value = new Date(value).toISOString().replace(/([0-9])0+Z$/, '$1Z');
              break;

            case 'date':
              value = new Date(value).toISOString().substr(0, 10);
              break;

            case 'time':
              value = new Date(("1969-01-01 " + value)).toISOString().substr(11);
              break;

            default:
              break;
          }

          break;
        }

      default:
        break;
    }

    return value;
  }

  function merge$2(a, b) {
    Object.keys(b).forEach(function (key) {
      if (typeof b[key] !== 'object' || b[key] === null) {
        a[key] = b[key];
      } else if (Array.isArray(b[key])) {
        a[key] = a[key] || []; // fix #292 - skip duplicated values from merge object (b)

        b[key].forEach(function (value) {
          if (a[key].indexOf(value) === -1) {
            a[key].push(value);
          }
        });
      } else if (typeof a[key] !== 'object' || a[key] === null || Array.isArray(a[key])) {
        a[key] = merge$2({}, b[key]);
      } else {
        a[key] = merge$2(a[key], b[key]);
      }
    });
    return a;
  }

  function clone(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(function (x) { return clone(x); });
    }

    return Object.keys(obj).reduce(function (prev, cur) {
      prev[cur] = clone(obj[cur]);
      return prev;
    }, {});
  }

  function short(schema) {
    var s = JSON.stringify(schema);
    var l = JSON.stringify(schema, null, 2);
    return s.length > 400 ? ((l.substr(0, 400)) + "...") : l;
  }

  function anyValue() {
    return random.pick([false, true, null, -1, NaN, Math.PI, Infinity, undefined, [], {}, // FIXME: use built-in random?
    Math.random(), Math.random().toString(36).substr(2)]);
  }

  function notValue(schema, parent) {
    var copy = merge$2({}, parent);

    if (typeof schema.minimum !== 'undefined') {
      copy.maximum = schema.minimum;
      copy.exclusiveMaximum = true;
    }

    if (typeof schema.maximum !== 'undefined') {
      copy.minimum = schema.maximum > copy.maximum ? 0 : schema.maximum;
      copy.exclusiveMinimum = true;
    }

    if (typeof schema.minLength !== 'undefined') {
      copy.maxLength = schema.minLength;
    }

    if (typeof schema.maxLength !== 'undefined') {
      copy.minLength = schema.maxLength > copy.maxLength ? 0 : schema.maxLength;
    }

    if (schema.type) {
      copy.type = random.pick(env.ALL_TYPES.filter(function (x) {
        var types = Array.isArray(schema.type) ? schema.type : [schema.type];
        return types.every(function (type) {
          // treat both types as _similar enough_ to be skipped equal
          if (x === 'number' || x === 'integer') {
            return type !== 'number' && type !== 'integer';
          }

          return x !== type;
        });
      }));
    } else if (schema.enum) {
      var value;

      do {
        value = anyValue();
      } while (schema.enum.indexOf(value) !== -1);

      copy.enum = [value];
    }

    if (schema.required && copy.properties) {
      schema.required.forEach(function (prop) {
        delete copy.properties[prop];
      });
    } // TODO: explore more scenarios


    return copy;
  } // FIXME: evaluate more constraints?


  function validate(value, schemas) {
    return !schemas.every(function (x) {
      if (typeof x.minimum !== 'undefined' && value >= x.minimum) {
        return true;
      }

      if (typeof x.maximum !== 'undefined' && value <= x.maximum) {
        return true;
      }

      return false;
    });
  }

  function isKey(prop) {
    return ['enum', 'const', 'default', 'examples', 'required', 'definitions'].indexOf(prop) !== -1;
  }

  function omitProps(obj, props) {
    var copy = {};
    Object.keys(obj).forEach(function (k) {
      if (props.indexOf(k) === -1) {
        if (Array.isArray(obj[k])) {
          copy[k] = obj[k].slice();
        } else {
          copy[k] = obj[k] instanceof Object ? merge$2({}, obj[k]) : obj[k];
        }
      }
    });
    return copy;
  }

  function template(value, schema) {
    if (Array.isArray(value)) {
      return value.map(function (x) { return template(x, schema); });
    }

    if (typeof value === 'string') {
      value = value.replace(/#\{([\w.-]+)\}/g, function (_, $1) { return schema[$1]; });
    }

    return value;
  }

  var utils = {
    getSubAttribute: getSubAttribute,
    hasProperties: hasProperties,
    omitProps: omitProps,
    typecast: typecast,
    merge: merge$2,
    clone: clone,
    short: short,
    notValue: notValue,
    anyValue: anyValue,
    validate: validate,
    isKey: isKey,
    template: template
  };

  function proxy(gen) {
    return function (value, schema, property, rootSchema) {
      var fn = value;
      var args = []; // support for nested object, first-key is the generator

      if (typeof value === 'object') {
        fn = Object.keys(value)[0]; // treat the given array as arguments,

        if (Array.isArray(value[fn])) {
          // if the generator is expecting arrays they should be nested, e.g. `[[1, 2, 3], true, ...]`
          args = value[fn];
        } else {
          args.push(value[fn]);
        }
      } // support for keypaths, e.g. "internet.email"


      var props = fn.split('.'); // retrieve a fresh dependency

      var ctx = gen();

      while (props.length > 1) {
        ctx = ctx[props.shift()];
      } // retrieve last value from context object


      value = typeof ctx === 'object' ? ctx[props[0]] : ctx; // invoke dynamic generators

      if (typeof value === 'function') {
        value = value.apply(ctx, args.map(function (x) { return utils.template(x, rootSchema); }));
      } // test for pending callbacks


      if (Object.prototype.toString.call(value) === '[object Object]') {
        Object.keys(value).forEach(function (key) {
          if (typeof value[key] === 'function') {
            throw new Error(("Cannot resolve value for '" + property + ": " + fn + "', given: " + value));
          }
        });
      }

      return value;
    };
  }
  /**
   * Container is used to wrap external generators (faker, chance, casual, etc.) and its dependencies.
   *
   * - `jsf.extend('faker')` will enhance or define the given dependency.
   * - `jsf.define('faker')` will provide the "faker" keyword support.
   *
   * RandExp is not longer considered an "extension".
   */


  var Container = function Container() {
    // dynamic requires - handle all dependencies
    // they will NOT be included on the bundle
    this.registry = {};
    this.support = {};
  };
  /**
   * Unregister extensions
   * @param name
   */


  Container.prototype.reset = function reset (name) {
    if (!name) {
      this.registry = {};
      this.support = {};
    } else {
      delete this.registry[name];
      delete this.support[name];
    }
  };
  /**
   * Override dependency given by name
   * @param name
   * @param callback
   */


  Container.prototype.extend = function extend (name, callback) {
      var this$1 = this;

    this.registry[name] = callback(this.registry[name]); // built-in proxy (can be overridden)

    if (!this.support[name]) {
      this.support[name] = proxy(function () { return this$1.registry[name]; });
    }
  };
  /**
   * Set keyword support by name
   * @param name
   * @param callback
   */


  Container.prototype.define = function define (name, callback) {
    this.support[name] = callback;
  };
  /**
   * Returns dependency given by name
   * @param name
   * @returns {Dependency}
   */


  Container.prototype.get = function get (name) {
    if (typeof this.registry[name] === 'undefined') {
      throw new ReferenceError(("'" + name + "' dependency doesn't exist."));
    }

    return this.registry[name];
  };
  /**
   * Apply a custom keyword
   * @param schema
   */


  Container.prototype.wrap = function wrap (schema) {
      var this$1 = this;

    var keys = Object.keys(schema);
    var context = {};
    var length = keys.length;

    var loop = function () {
      // eslint-disable-line
      var fn = keys[length].replace(/^x-/, '');
      var gen = this$1.support[fn];

      if (typeof gen === 'function') {
        Object.defineProperty(schema, 'generate', {
          configurable: false,
          enumerable: false,
          writable: false,
          value: function (rootSchema) { return gen.call(context, schema[keys[length]], schema, keys[length], rootSchema); } // eslint-disable-line

        });
        return 'break';
      }
    };

      while (length--) {
        var returned = loop();

        if ( returned === 'break' ) break;
      }

    return schema;
  };

  var registry$1 = new Registry();
  /**
   * Custom format API
   *
   * @see https://github.com/json-schema-faker/json-schema-faker#custom-formats
   * @param nameOrFormatMap
   * @param callback
   * @returns {any}
   */

  function formatAPI(nameOrFormatMap, callback) {
    if (typeof nameOrFormatMap === 'undefined') {
      return registry$1.list();
    }

    if (typeof nameOrFormatMap === 'string') {
      if (typeof callback === 'function') {
        registry$1.register(nameOrFormatMap, callback);
      } else if (callback === null || callback === false) {
        registry$1.unregister(nameOrFormatMap);
      } else {
        return registry$1.get(nameOrFormatMap);
      }
    } else {
      registry$1.registerMany(nameOrFormatMap);
    }
  }

  var dict = {
    identifier: "[a-zA-Z_]+[a-zA-Z0-9_]*",
    integer: "-?(?:0|[1-9][0-9]*)",
    qq_string: "\"(?:\\\\[\"bfnrt/\\\\]|\\\\u[a-fA-F0-9]{4}|[^\"\\\\])*\"",
    q_string: "'(?:\\\\[\'bfnrt/\\\\]|\\\\u[a-fA-F0-9]{4}|[^\'\\\\])*'"
  };

  var grammar = {

      lex: {

          macros: {
              esc: "\\\\",
              int: dict.integer
          },

          rules: [
              ["\\$", "return 'DOLLAR'"],
              ["\\.\\.", "return 'DOT_DOT'"],
              ["\\.", "return 'DOT'"],
              ["\\*", "return 'STAR'"],
              [dict.identifier, "return 'IDENTIFIER'"],
              ["\\[", "return '['"],
              ["\\]", "return ']'"],
              [",", "return ','"],
              ["({int})?\\:({int})?(\\:({int})?)?", "return 'ARRAY_SLICE'"],
              ["{int}", "return 'INTEGER'"],
              [dict.qq_string, "yytext = yytext.substr(1,yyleng-2); return 'QQ_STRING';"],
              [dict.q_string, "yytext = yytext.substr(1,yyleng-2); return 'Q_STRING';"],
              ["\\(.+?\\)(?=\\])", "return 'SCRIPT_EXPRESSION'"],
              ["\\?\\(.+?\\)(?=\\])", "return 'FILTER_EXPRESSION'"]
          ]
      },

      start: "JSON_PATH",

      bnf: {

          JSON_PATH: [
                  [ 'DOLLAR',                 'yy.ast.set({ expression: { type: "root", value: $1 } }); yy.ast.unshift(); return yy.ast.yield()' ],
                  [ 'DOLLAR PATH_COMPONENTS', 'yy.ast.set({ expression: { type: "root", value: $1 } }); yy.ast.unshift(); return yy.ast.yield()' ],
                  [ 'LEADING_CHILD_MEMBER_EXPRESSION',                 'yy.ast.unshift(); return yy.ast.yield()' ],
                  [ 'LEADING_CHILD_MEMBER_EXPRESSION PATH_COMPONENTS', 'yy.ast.set({ operation: "member", scope: "child", expression: { type: "identifier", value: $1 }}); yy.ast.unshift(); return yy.ast.yield()' ] ],

          PATH_COMPONENTS: [
                  [ 'PATH_COMPONENT',                 '' ],
                  [ 'PATH_COMPONENTS PATH_COMPONENT', '' ] ],

          PATH_COMPONENT: [
                  [ 'MEMBER_COMPONENT',    'yy.ast.set({ operation: "member" }); yy.ast.push()' ],
                  [ 'SUBSCRIPT_COMPONENT', 'yy.ast.set({ operation: "subscript" }); yy.ast.push() ' ] ],

          MEMBER_COMPONENT: [
                  [ 'CHILD_MEMBER_COMPONENT',      'yy.ast.set({ scope: "child" })' ],
                  [ 'DESCENDANT_MEMBER_COMPONENT', 'yy.ast.set({ scope: "descendant" })' ] ],

          CHILD_MEMBER_COMPONENT: [
                  [ 'DOT MEMBER_EXPRESSION', '' ] ],

          LEADING_CHILD_MEMBER_EXPRESSION: [
                  [ 'MEMBER_EXPRESSION', 'yy.ast.set({ scope: "child", operation: "member" })' ] ],

          DESCENDANT_MEMBER_COMPONENT: [
                  [ 'DOT_DOT MEMBER_EXPRESSION', '' ] ],

          MEMBER_EXPRESSION: [
                  [ 'STAR',              'yy.ast.set({ expression: { type: "wildcard", value: $1 } })' ],
                  [ 'IDENTIFIER',        'yy.ast.set({ expression: { type: "identifier", value: $1 } })' ],
                  [ 'SCRIPT_EXPRESSION', 'yy.ast.set({ expression: { type: "script_expression", value: $1 } })' ],
                  [ 'INTEGER',           'yy.ast.set({ expression: { type: "numeric_literal", value: parseInt($1) } })' ],
                  [ 'END',               '' ] ],

          SUBSCRIPT_COMPONENT: [
                  [ 'CHILD_SUBSCRIPT_COMPONENT',      'yy.ast.set({ scope: "child" })' ],
                  [ 'DESCENDANT_SUBSCRIPT_COMPONENT', 'yy.ast.set({ scope: "descendant" })' ] ],

          CHILD_SUBSCRIPT_COMPONENT: [
                  [ '[ SUBSCRIPT ]', '' ] ],

          DESCENDANT_SUBSCRIPT_COMPONENT: [
                  [ 'DOT_DOT [ SUBSCRIPT ]', '' ] ],

          SUBSCRIPT: [
                  [ 'SUBSCRIPT_EXPRESSION', '' ],
                  [ 'SUBSCRIPT_EXPRESSION_LIST', '$1.length > 1? yy.ast.set({ expression: { type: "union", value: $1 } }) : $$ = $1' ] ],

          SUBSCRIPT_EXPRESSION_LIST: [
                  [ 'SUBSCRIPT_EXPRESSION_LISTABLE', '$$ = [$1]'],
                  [ 'SUBSCRIPT_EXPRESSION_LIST , SUBSCRIPT_EXPRESSION_LISTABLE', '$$ = $1.concat($3)' ] ],

          SUBSCRIPT_EXPRESSION_LISTABLE: [
                  [ 'INTEGER',           '$$ = { expression: { type: "numeric_literal", value: parseInt($1) } }; yy.ast.set($$)' ],
                  [ 'STRING_LITERAL',    '$$ = { expression: { type: "string_literal", value: $1 } }; yy.ast.set($$)' ],
                  [ 'ARRAY_SLICE',       '$$ = { expression: { type: "slice", value: $1 } }; yy.ast.set($$)' ] ],

          SUBSCRIPT_EXPRESSION: [
                  [ 'STAR',              '$$ = { expression: { type: "wildcard", value: $1 } }; yy.ast.set($$)' ],
                  [ 'SCRIPT_EXPRESSION', '$$ = { expression: { type: "script_expression", value: $1 } }; yy.ast.set($$)' ],
                  [ 'FILTER_EXPRESSION', '$$ = { expression: { type: "filter_expression", value: $1 } }; yy.ast.set($$)' ] ],

          STRING_LITERAL: [
                  [ 'QQ_STRING', "$$ = $1" ],
                  [ 'Q_STRING',  "$$ = $1" ] ]
      }
  };
  if (fs.readFileSync) {
    grammar.moduleInclude = fs.readFileSync(require.resolve("../include/module.js"));
    grammar.actionInclude = fs.readFileSync(require.resolve("../include/action.js"));
  }

  var grammar_1 = grammar;

  var parser_1 = createCommonjsModule(function (module, exports) {
  /* parser generated by jison 0.4.13 */
  /*
    Returns a Parser object of the following structure:

    Parser: {
      yy: {}
    }

    Parser.prototype: {
      yy: {},
      trace: function(),
      symbols_: {associative list: name ==> number},
      terminals_: {associative list: number ==> name},
      productions_: [...],
      performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
      table: [...],
      defaultActions: {...},
      parseError: function(str, hash),
      parse: function(input),

      lexer: {
          EOF: 1,
          parseError: function(str, hash),
          setInput: function(input),
          input: function(),
          unput: function(str),
          more: function(),
          less: function(n),
          pastInput: function(),
          upcomingInput: function(),
          showPosition: function(),
          test_match: function(regex_match_array, rule_index),
          next: function(),
          lex: function(),
          begin: function(condition),
          popState: function(),
          _currentRules: function(),
          topState: function(),
          pushState: function(condition),

          options: {
              ranges: boolean           (optional: true ==> token location info will include a .range[] member)
              flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
              backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
          },

          performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
          rules: [...],
          conditions: {associative list: name ==> set},
      }
    }


    token location info (@$, _$, etc.): {
      first_line: n,
      last_line: n,
      first_column: n,
      last_column: n,
      range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
    }


    the parseError function receives a 'hash' object with these members for lexer and parser errors: {
      text:        (matched text)
      token:       (the produced terminal token, if any)
      line:        (yylineno)
    }
    while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
      loc:         (yylloc)
      expected:    (string describing the set of expected tokens)
      recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
    }
  */
  var parser = (function(){
  var parser = {trace: function trace() { },
  yy: {},
  symbols_: {"error":2,"JSON_PATH":3,"DOLLAR":4,"PATH_COMPONENTS":5,"LEADING_CHILD_MEMBER_EXPRESSION":6,"PATH_COMPONENT":7,"MEMBER_COMPONENT":8,"SUBSCRIPT_COMPONENT":9,"CHILD_MEMBER_COMPONENT":10,"DESCENDANT_MEMBER_COMPONENT":11,"DOT":12,"MEMBER_EXPRESSION":13,"DOT_DOT":14,"STAR":15,"IDENTIFIER":16,"SCRIPT_EXPRESSION":17,"INTEGER":18,"END":19,"CHILD_SUBSCRIPT_COMPONENT":20,"DESCENDANT_SUBSCRIPT_COMPONENT":21,"[":22,"SUBSCRIPT":23,"]":24,"SUBSCRIPT_EXPRESSION":25,"SUBSCRIPT_EXPRESSION_LIST":26,"SUBSCRIPT_EXPRESSION_LISTABLE":27,",":28,"STRING_LITERAL":29,"ARRAY_SLICE":30,"FILTER_EXPRESSION":31,"QQ_STRING":32,"Q_STRING":33,"$accept":0,"$end":1},
  terminals_: {2:"error",4:"DOLLAR",12:"DOT",14:"DOT_DOT",15:"STAR",16:"IDENTIFIER",17:"SCRIPT_EXPRESSION",18:"INTEGER",19:"END",22:"[",24:"]",28:",",30:"ARRAY_SLICE",31:"FILTER_EXPRESSION",32:"QQ_STRING",33:"Q_STRING"},
  productions_: [0,[3,1],[3,2],[3,1],[3,2],[5,1],[5,2],[7,1],[7,1],[8,1],[8,1],[10,2],[6,1],[11,2],[13,1],[13,1],[13,1],[13,1],[13,1],[9,1],[9,1],[20,3],[21,4],[23,1],[23,1],[26,1],[26,3],[27,1],[27,1],[27,1],[25,1],[25,1],[25,1],[29,1],[29,1]],
  performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */
  /**/) {
  /* this == yyval */
  if (!yy.ast) {
      yy.ast = _ast;
      _ast.initialize();
  }

  var $0 = $$.length - 1;
  switch (yystate) {
  case 1:yy.ast.set({ expression: { type: "root", value: $$[$0] } }); yy.ast.unshift(); return yy.ast.yield()
  break;
  case 2:yy.ast.set({ expression: { type: "root", value: $$[$0-1] } }); yy.ast.unshift(); return yy.ast.yield()
  break;
  case 3:yy.ast.unshift(); return yy.ast.yield()
  break;
  case 4:yy.ast.set({ operation: "member", scope: "child", expression: { type: "identifier", value: $$[$0-1] }}); yy.ast.unshift(); return yy.ast.yield()
  break;
  case 5:
  break;
  case 6:
  break;
  case 7:yy.ast.set({ operation: "member" }); yy.ast.push();
  break;
  case 8:yy.ast.set({ operation: "subscript" }); yy.ast.push(); 
  break;
  case 9:yy.ast.set({ scope: "child" });
  break;
  case 10:yy.ast.set({ scope: "descendant" });
  break;
  case 11:
  break;
  case 12:yy.ast.set({ scope: "child", operation: "member" });
  break;
  case 13:
  break;
  case 14:yy.ast.set({ expression: { type: "wildcard", value: $$[$0] } });
  break;
  case 15:yy.ast.set({ expression: { type: "identifier", value: $$[$0] } });
  break;
  case 16:yy.ast.set({ expression: { type: "script_expression", value: $$[$0] } });
  break;
  case 17:yy.ast.set({ expression: { type: "numeric_literal", value: parseInt($$[$0]) } });
  break;
  case 18:
  break;
  case 19:yy.ast.set({ scope: "child" });
  break;
  case 20:yy.ast.set({ scope: "descendant" });
  break;
  case 21:
  break;
  case 22:
  break;
  case 23:
  break;
  case 24:$$[$0].length > 1? yy.ast.set({ expression: { type: "union", value: $$[$0] } }) : this.$ = $$[$0];
  break;
  case 25:this.$ = [$$[$0]];
  break;
  case 26:this.$ = $$[$0-2].concat($$[$0]);
  break;
  case 27:this.$ = { expression: { type: "numeric_literal", value: parseInt($$[$0]) } }; yy.ast.set(this.$);
  break;
  case 28:this.$ = { expression: { type: "string_literal", value: $$[$0] } }; yy.ast.set(this.$);
  break;
  case 29:this.$ = { expression: { type: "slice", value: $$[$0] } }; yy.ast.set(this.$);
  break;
  case 30:this.$ = { expression: { type: "wildcard", value: $$[$0] } }; yy.ast.set(this.$);
  break;
  case 31:this.$ = { expression: { type: "script_expression", value: $$[$0] } }; yy.ast.set(this.$);
  break;
  case 32:this.$ = { expression: { type: "filter_expression", value: $$[$0] } }; yy.ast.set(this.$);
  break;
  case 33:this.$ = $$[$0];
  break;
  case 34:this.$ = $$[$0];
  break;
  }
  },
  table: [{3:1,4:[1,2],6:3,13:4,15:[1,5],16:[1,6],17:[1,7],18:[1,8],19:[1,9]},{1:[3]},{1:[2,1],5:10,7:11,8:12,9:13,10:14,11:15,12:[1,18],14:[1,19],20:16,21:17,22:[1,20]},{1:[2,3],5:21,7:11,8:12,9:13,10:14,11:15,12:[1,18],14:[1,19],20:16,21:17,22:[1,20]},{1:[2,12],12:[2,12],14:[2,12],22:[2,12]},{1:[2,14],12:[2,14],14:[2,14],22:[2,14]},{1:[2,15],12:[2,15],14:[2,15],22:[2,15]},{1:[2,16],12:[2,16],14:[2,16],22:[2,16]},{1:[2,17],12:[2,17],14:[2,17],22:[2,17]},{1:[2,18],12:[2,18],14:[2,18],22:[2,18]},{1:[2,2],7:22,8:12,9:13,10:14,11:15,12:[1,18],14:[1,19],20:16,21:17,22:[1,20]},{1:[2,5],12:[2,5],14:[2,5],22:[2,5]},{1:[2,7],12:[2,7],14:[2,7],22:[2,7]},{1:[2,8],12:[2,8],14:[2,8],22:[2,8]},{1:[2,9],12:[2,9],14:[2,9],22:[2,9]},{1:[2,10],12:[2,10],14:[2,10],22:[2,10]},{1:[2,19],12:[2,19],14:[2,19],22:[2,19]},{1:[2,20],12:[2,20],14:[2,20],22:[2,20]},{13:23,15:[1,5],16:[1,6],17:[1,7],18:[1,8],19:[1,9]},{13:24,15:[1,5],16:[1,6],17:[1,7],18:[1,8],19:[1,9],22:[1,25]},{15:[1,29],17:[1,30],18:[1,33],23:26,25:27,26:28,27:32,29:34,30:[1,35],31:[1,31],32:[1,36],33:[1,37]},{1:[2,4],7:22,8:12,9:13,10:14,11:15,12:[1,18],14:[1,19],20:16,21:17,22:[1,20]},{1:[2,6],12:[2,6],14:[2,6],22:[2,6]},{1:[2,11],12:[2,11],14:[2,11],22:[2,11]},{1:[2,13],12:[2,13],14:[2,13],22:[2,13]},{15:[1,29],17:[1,30],18:[1,33],23:38,25:27,26:28,27:32,29:34,30:[1,35],31:[1,31],32:[1,36],33:[1,37]},{24:[1,39]},{24:[2,23]},{24:[2,24],28:[1,40]},{24:[2,30]},{24:[2,31]},{24:[2,32]},{24:[2,25],28:[2,25]},{24:[2,27],28:[2,27]},{24:[2,28],28:[2,28]},{24:[2,29],28:[2,29]},{24:[2,33],28:[2,33]},{24:[2,34],28:[2,34]},{24:[1,41]},{1:[2,21],12:[2,21],14:[2,21],22:[2,21]},{18:[1,33],27:42,29:34,30:[1,35],32:[1,36],33:[1,37]},{1:[2,22],12:[2,22],14:[2,22],22:[2,22]},{24:[2,26],28:[2,26]}],
  defaultActions: {27:[2,23],29:[2,30],30:[2,31],31:[2,32]},
  parseError: function parseError(str, hash) {
      if (hash.recoverable) {
          this.trace(str);
      } else {
          throw new Error(str);
      }
  },
  parse: function parse(input) {
      var self = this, stack = [0], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, TERROR = 2, EOF = 1;
      var args = lstack.slice.call(arguments, 1);
      this.lexer.setInput(input);
      this.lexer.yy = this.yy;
      this.yy.lexer = this.lexer;
      this.yy.parser = this;
      if (typeof this.lexer.yylloc == 'undefined') {
          this.lexer.yylloc = {};
      }
      var yyloc = this.lexer.yylloc;
      lstack.push(yyloc);
      var ranges = this.lexer.options && this.lexer.options.ranges;
      if (typeof this.yy.parseError === 'function') {
          this.parseError = this.yy.parseError;
      } else {
          this.parseError = Object.getPrototypeOf(this).parseError;
      }
      function lex() {
          var token;
          token = self.lexer.lex() || EOF;
          if (typeof token !== 'number') {
              token = self.symbols_[token] || token;
          }
          return token;
      }
      var symbol, preErrorSymbol, state, action, r, yyval = {}, p, len, newState, expected;
      while (true) {
          state = stack[stack.length - 1];
          if (this.defaultActions[state]) {
              action = this.defaultActions[state];
          } else {
              if (symbol === null || typeof symbol == 'undefined') {
                  symbol = lex();
              }
              action = table[state] && table[state][symbol];
          }
                      if (typeof action === 'undefined' || !action.length || !action[0]) {
                  var errStr = '';
                  expected = [];
                  for (p in table[state]) {
                      if (this.terminals_[p] && p > TERROR) {
                          expected.push('\'' + this.terminals_[p] + '\'');
                      }
                  }
                  if (this.lexer.showPosition) {
                      errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + this.lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                  } else {
                      errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                  }
                  this.parseError(errStr, {
                      text: this.lexer.match,
                      token: this.terminals_[symbol] || symbol,
                      line: this.lexer.yylineno,
                      loc: yyloc,
                      expected: expected
                  });
              }
          if (action[0] instanceof Array && action.length > 1) {
              throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
          }
          switch (action[0]) {
          case 1:
              stack.push(symbol);
              vstack.push(this.lexer.yytext);
              lstack.push(this.lexer.yylloc);
              stack.push(action[1]);
              symbol = null;
              if (!preErrorSymbol) {
                  yyleng = this.lexer.yyleng;
                  yytext = this.lexer.yytext;
                  yylineno = this.lexer.yylineno;
                  yyloc = this.lexer.yylloc;
              } else {
                  symbol = preErrorSymbol;
                  preErrorSymbol = null;
              }
              break;
          case 2:
              len = this.productions_[action[1]][1];
              yyval.$ = vstack[vstack.length - len];
              yyval._$ = {
                  first_line: lstack[lstack.length - (len || 1)].first_line,
                  last_line: lstack[lstack.length - 1].last_line,
                  first_column: lstack[lstack.length - (len || 1)].first_column,
                  last_column: lstack[lstack.length - 1].last_column
              };
              if (ranges) {
                  yyval._$.range = [
                      lstack[lstack.length - (len || 1)].range[0],
                      lstack[lstack.length - 1].range[1]
                  ];
              }
              r = this.performAction.apply(yyval, [
                  yytext,
                  yyleng,
                  yylineno,
                  this.yy,
                  action[1],
                  vstack,
                  lstack
              ].concat(args));
              if (typeof r !== 'undefined') {
                  return r;
              }
              if (len) {
                  stack = stack.slice(0, -1 * len * 2);
                  vstack = vstack.slice(0, -1 * len);
                  lstack = lstack.slice(0, -1 * len);
              }
              stack.push(this.productions_[action[1]][0]);
              vstack.push(yyval.$);
              lstack.push(yyval._$);
              newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
              stack.push(newState);
              break;
          case 3:
              return true;
          }
      }
      return true;
  }};
  var _ast = {

    initialize: function() {
      this._nodes = [];
      this._node = {};
      this._stash = [];
    },

    set: function(props) {
      for (var k in props) { this._node[k] = props[k]; }
      return this._node;
    },

    node: function(obj) {
      if (arguments.length) { this._node = obj; }
      return this._node;
    },

    push: function() {
      this._nodes.push(this._node);
      this._node = {};
    },

    unshift: function() {
      this._nodes.unshift(this._node);
      this._node = {};
    },

    yield: function() {
      var _nodes = this._nodes;
      this.initialize();
      return _nodes;
    }
  };
  /* generated by jison-lex 0.2.1 */
  var lexer = (function(){
  var lexer = {

  EOF:1,

  parseError:function parseError(str, hash) {
          if (this.yy.parser) {
              this.yy.parser.parseError(str, hash);
          } else {
              throw new Error(str);
          }
      },

  // resets the lexer, sets new input
  setInput:function (input) {
          this._input = input;
          this._more = this._backtrack = this.done = false;
          this.yylineno = this.yyleng = 0;
          this.yytext = this.matched = this.match = '';
          this.conditionStack = ['INITIAL'];
          this.yylloc = {
              first_line: 1,
              first_column: 0,
              last_line: 1,
              last_column: 0
          };
          if (this.options.ranges) {
              this.yylloc.range = [0,0];
          }
          this.offset = 0;
          return this;
      },

  // consumes and returns one char from the input
  input:function () {
          var ch = this._input[0];
          this.yytext += ch;
          this.yyleng++;
          this.offset++;
          this.match += ch;
          this.matched += ch;
          var lines = ch.match(/(?:\r\n?|\n).*/g);
          if (lines) {
              this.yylineno++;
              this.yylloc.last_line++;
          } else {
              this.yylloc.last_column++;
          }
          if (this.options.ranges) {
              this.yylloc.range[1]++;
          }

          this._input = this._input.slice(1);
          return ch;
      },

  // unshifts one char (or a string) into the input
  unput:function (ch) {
          var len = ch.length;
          var lines = ch.split(/(?:\r\n?|\n)/g);

          this._input = ch + this._input;
          this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
          //this.yyleng -= len;
          this.offset -= len;
          var oldLines = this.match.split(/(?:\r\n?|\n)/g);
          this.match = this.match.substr(0, this.match.length - 1);
          this.matched = this.matched.substr(0, this.matched.length - 1);

          if (lines.length - 1) {
              this.yylineno -= lines.length - 1;
          }
          var r = this.yylloc.range;

          this.yylloc = {
              first_line: this.yylloc.first_line,
              last_line: this.yylineno + 1,
              first_column: this.yylloc.first_column,
              last_column: lines ?
                  (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                   + oldLines[oldLines.length - lines.length].length - lines[0].length :
                this.yylloc.first_column - len
          };

          if (this.options.ranges) {
              this.yylloc.range = [r[0], r[0] + this.yyleng - len];
          }
          this.yyleng = this.yytext.length;
          return this;
      },

  // When called from action, caches matched text and appends it on next action
  more:function () {
          this._more = true;
          return this;
      },

  // When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
  reject:function () {
          if (this.options.backtrack_lexer) {
              this._backtrack = true;
          } else {
              return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                  text: "",
                  token: null,
                  line: this.yylineno
              });

          }
          return this;
      },

  // retain first n characters of the match
  less:function (n) {
          this.unput(this.match.slice(n));
      },

  // displays already matched input, i.e. for error messages
  pastInput:function () {
          var past = this.matched.substr(0, this.matched.length - this.match.length);
          return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
      },

  // displays upcoming input, i.e. for error messages
  upcomingInput:function () {
          var next = this.match;
          if (next.length < 20) {
              next += this._input.substr(0, 20-next.length);
          }
          return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
      },

  // displays the character position where the lexing error occurred, i.e. for error messages
  showPosition:function () {
          var pre = this.pastInput();
          var c = new Array(pre.length + 1).join("-");
          return pre + this.upcomingInput() + "\n" + c + "^";
      },

  // test the lexed token: return FALSE when not a match, otherwise return token
  test_match:function (match, indexed_rule) {
          var token,
              lines,
              backup;

          if (this.options.backtrack_lexer) {
              // save context
              backup = {
                  yylineno: this.yylineno,
                  yylloc: {
                      first_line: this.yylloc.first_line,
                      last_line: this.last_line,
                      first_column: this.yylloc.first_column,
                      last_column: this.yylloc.last_column
                  },
                  yytext: this.yytext,
                  match: this.match,
                  matches: this.matches,
                  matched: this.matched,
                  yyleng: this.yyleng,
                  offset: this.offset,
                  _more: this._more,
                  _input: this._input,
                  yy: this.yy,
                  conditionStack: this.conditionStack.slice(0),
                  done: this.done
              };
              if (this.options.ranges) {
                  backup.yylloc.range = this.yylloc.range.slice(0);
              }
          }

          lines = match[0].match(/(?:\r\n?|\n).*/g);
          if (lines) {
              this.yylineno += lines.length;
          }
          this.yylloc = {
              first_line: this.yylloc.last_line,
              last_line: this.yylineno + 1,
              first_column: this.yylloc.last_column,
              last_column: lines ?
                           lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                           this.yylloc.last_column + match[0].length
          };
          this.yytext += match[0];
          this.match += match[0];
          this.matches = match;
          this.yyleng = this.yytext.length;
          if (this.options.ranges) {
              this.yylloc.range = [this.offset, this.offset += this.yyleng];
          }
          this._more = false;
          this._backtrack = false;
          this._input = this._input.slice(match[0].length);
          this.matched += match[0];
          token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
          if (this.done && this._input) {
              this.done = false;
          }
          if (token) {
              return token;
          } else if (this._backtrack) {
              // recover context
              for (var k in backup) {
                  this[k] = backup[k];
              }
              return false; // rule action called reject() implying the next rule should be tested instead.
          }
          return false;
      },

  // return next match in input
  next:function () {
          if (this.done) {
              return this.EOF;
          }
          if (!this._input) {
              this.done = true;
          }

          var token,
              match,
              tempMatch,
              index;
          if (!this._more) {
              this.yytext = '';
              this.match = '';
          }
          var rules = this._currentRules();
          for (var i = 0; i < rules.length; i++) {
              tempMatch = this._input.match(this.rules[rules[i]]);
              if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                  match = tempMatch;
                  index = i;
                  if (this.options.backtrack_lexer) {
                      token = this.test_match(tempMatch, rules[i]);
                      if (token !== false) {
                          return token;
                      } else if (this._backtrack) {
                          match = false;
                          continue; // rule action called reject() implying a rule MISmatch.
                      } else {
                          // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                          return false;
                      }
                  } else if (!this.options.flex) {
                      break;
                  }
              }
          }
          if (match) {
              token = this.test_match(match, rules[index]);
              if (token !== false) {
                  return token;
              }
              // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
              return false;
          }
          if (this._input === "") {
              return this.EOF;
          } else {
              return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                  text: "",
                  token: null,
                  line: this.yylineno
              });
          }
      },

  // return next match that has a token
  lex:function lex() {
          var r = this.next();
          if (r) {
              return r;
          } else {
              return this.lex();
          }
      },

  // activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
  begin:function begin(condition) {
          this.conditionStack.push(condition);
      },

  // pop the previously active lexer condition state off the condition stack
  popState:function popState() {
          var n = this.conditionStack.length - 1;
          if (n > 0) {
              return this.conditionStack.pop();
          } else {
              return this.conditionStack[0];
          }
      },

  // produce the lexer rule set which is active for the currently active lexer condition state
  _currentRules:function _currentRules() {
          if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
              return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
          } else {
              return this.conditions["INITIAL"].rules;
          }
      },

  // return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
  topState:function topState(n) {
          n = this.conditionStack.length - 1 - Math.abs(n || 0);
          if (n >= 0) {
              return this.conditionStack[n];
          } else {
              return "INITIAL";
          }
      },

  // alias for begin(condition)
  pushState:function pushState(condition) {
          this.begin(condition);
      },

  // return the number of states currently on the stack
  stateStackSize:function stateStackSize() {
          return this.conditionStack.length;
      },
  options: {},
  performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START
  /**/) {
  switch($avoiding_name_collisions) {
  case 0:return 4
  break;
  case 1:return 14
  break;
  case 2:return 12
  break;
  case 3:return 15
  break;
  case 4:return 16
  break;
  case 5:return 22
  break;
  case 6:return 24
  break;
  case 7:return 28
  break;
  case 8:return 30
  break;
  case 9:return 18
  break;
  case 10:yy_.yytext = yy_.yytext.substr(1,yy_.yyleng-2); return 32;
  break;
  case 11:yy_.yytext = yy_.yytext.substr(1,yy_.yyleng-2); return 33;
  break;
  case 12:return 17
  break;
  case 13:return 31
  break;
  }
  },
  rules: [/^(?:\$)/,/^(?:\.\.)/,/^(?:\.)/,/^(?:\*)/,/^(?:[a-zA-Z_]+[a-zA-Z0-9_]*)/,/^(?:\[)/,/^(?:\])/,/^(?:,)/,/^(?:((-?(?:0|[1-9][0-9]*)))?\:((-?(?:0|[1-9][0-9]*)))?(\:((-?(?:0|[1-9][0-9]*)))?)?)/,/^(?:(-?(?:0|[1-9][0-9]*)))/,/^(?:"(?:\\["bfnrt/\\]|\\u[a-fA-F0-9]{4}|[^"\\])*")/,/^(?:'(?:\\['bfnrt/\\]|\\u[a-fA-F0-9]{4}|[^'\\])*')/,/^(?:\(.+?\)(?=\]))/,/^(?:\?\(.+?\)(?=\]))/],
  conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13],"inclusive":true}}
  };
  return lexer;
  })();
  parser.lexer = lexer;
  function Parser () {
    this.yy = {};
  }
  Parser.prototype = parser;parser.Parser = Parser;
  return new Parser;
  })();


  if (typeof require !== 'undefined' && 'object' !== 'undefined') {
  exports.parser = parser;
  exports.Parser = parser.Parser;
  exports.parse = function () { return parser.parse.apply(parser, arguments); };
  exports.main = function commonjsMain(args) {
      if (!args[1]) {
          console.log('Usage: '+args[0]+' FILE');
          process.exit(1);
      }
      var source = fs.readFileSync(path.normalize(args[1]), "utf8");
      return exports.parser.parse(source);
  };
  if (require.main === module) {
    exports.main(process.argv.slice(1));
  }
  }
  });
  var parser_2 = parser_1.parser;
  var parser_3 = parser_1.Parser;
  var parser_4 = parser_1.parse;
  var parser_5 = parser_1.main;

  var Parser = function() {

    var parser = new parser_1.Parser();

    var _parseError = parser.parseError;
    parser.yy.parseError = function() {
      if (parser.yy.ast) {
        parser.yy.ast.initialize();
      }
      _parseError.apply(parser, arguments);
    };

    return parser;

  };

  Parser.grammar = grammar_1;
  var parser = Parser;

  var aesprim = createCommonjsModule(function (module$1) {
  var file = require.resolve('esprima');
  var source = fs.readFileSync(file, 'utf-8');

  // inject '@' as a valid identifier!
  source = source.replace(/(function isIdentifierStart\(ch\) {\s+return)/m, '$1 (ch == 0x40) || ');

  //If run as script just output patched file
  if (require.main === module$1)
    { console.log(source); }
  else {
    var _module = new module('aesprim');
    _module._compile(source, __filename);

    module$1.exports = _module.exports;
  }
  });

  var slice = function(arr, start, end, step) {

    if (typeof start == 'string') { throw new Error("start cannot be a string"); }
    if (typeof end == 'string') { throw new Error("end cannot be a string"); }
    if (typeof step == 'string') { throw new Error("step cannot be a string"); }

    var len = arr.length;

    if (step === 0) { throw new Error("step cannot be zero"); }
    step = step ? integer(step) : 1;

    // normalize negative values
    start = start < 0 ? len + start : start;
    end = end < 0 ? len + end : end;

    // default extents to extents
    start = integer(start === 0 ? 0 : !start ? (step > 0 ? 0 : len - 1) : start);
    end = integer(end === 0 ? 0 : !end ? (step > 0 ? len : -1) : end);

    // clamp extents
    start = step > 0 ? Math.max(0, start) : Math.min(len, start);
    end = step > 0 ? Math.min(end, len) : Math.max(-1, end);

    // return empty if extents are backwards
    if (step > 0 && end <= start) { return []; }
    if (step < 0 && start <= end) { return []; }

    var result = [];

    for (var i = start; i != end; i += step) {
      if ((step < 0 && i <= end) || (step > 0 && i >= end)) { break; }
      result.push(arr[i]);
    }

    return result;
  };

  function integer(val) {
    return String(val).match(/^[0-9]+$/) ? parseInt(val) :
      Number.isFinite(val) ? parseInt(val, 10) : 0;
  }

  var estraverse = createCommonjsModule(function (module, exports) {
  /*
    Copyright (C) 2012-2013 Yusuke Suzuki <utatane.tea@gmail.com>
    Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are met:

      * Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.
      * Redistributions in binary form must reproduce the above copyright
        notice, this list of conditions and the following disclaimer in the
        documentation and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
    AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
    ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
    DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
    (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
    LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
    ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
    (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
    THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
  */
  /*jslint vars:false, bitwise:true*/
  /*jshint indent:4*/
  /*global exports:true, define:true*/
  (function (root, factory) {

      // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
      // and plain browser loading,
      {
          factory(exports);
      }
  }(commonjsGlobal, function (exports) {

      var Syntax,
          isArray,
          VisitorOption,
          VisitorKeys,
          BREAK,
          SKIP;

      Syntax = {
          AssignmentExpression: 'AssignmentExpression',
          ArrayExpression: 'ArrayExpression',
          ArrowFunctionExpression: 'ArrowFunctionExpression',
          BlockStatement: 'BlockStatement',
          BinaryExpression: 'BinaryExpression',
          BreakStatement: 'BreakStatement',
          CallExpression: 'CallExpression',
          CatchClause: 'CatchClause',
          ClassBody: 'ClassBody',
          ClassDeclaration: 'ClassDeclaration',
          ClassExpression: 'ClassExpression',
          ConditionalExpression: 'ConditionalExpression',
          ContinueStatement: 'ContinueStatement',
          DebuggerStatement: 'DebuggerStatement',
          DirectiveStatement: 'DirectiveStatement',
          DoWhileStatement: 'DoWhileStatement',
          EmptyStatement: 'EmptyStatement',
          ExpressionStatement: 'ExpressionStatement',
          ForStatement: 'ForStatement',
          ForInStatement: 'ForInStatement',
          FunctionDeclaration: 'FunctionDeclaration',
          FunctionExpression: 'FunctionExpression',
          Identifier: 'Identifier',
          IfStatement: 'IfStatement',
          Literal: 'Literal',
          LabeledStatement: 'LabeledStatement',
          LogicalExpression: 'LogicalExpression',
          MemberExpression: 'MemberExpression',
          MethodDefinition: 'MethodDefinition',
          NewExpression: 'NewExpression',
          ObjectExpression: 'ObjectExpression',
          Program: 'Program',
          Property: 'Property',
          ReturnStatement: 'ReturnStatement',
          SequenceExpression: 'SequenceExpression',
          SwitchStatement: 'SwitchStatement',
          SwitchCase: 'SwitchCase',
          ThisExpression: 'ThisExpression',
          ThrowStatement: 'ThrowStatement',
          TryStatement: 'TryStatement',
          UnaryExpression: 'UnaryExpression',
          UpdateExpression: 'UpdateExpression',
          VariableDeclaration: 'VariableDeclaration',
          VariableDeclarator: 'VariableDeclarator',
          WhileStatement: 'WhileStatement',
          WithStatement: 'WithStatement',
          YieldExpression: 'YieldExpression'
      };

      isArray = Array.isArray;
      if (!isArray) {
          isArray = function isArray(array) {
              return Object.prototype.toString.call(array) === '[object Array]';
          };
      }

      function deepCopy(obj) {
          var ret = {}, key, val;
          for (key in obj) {
              if (obj.hasOwnProperty(key)) {
                  val = obj[key];
                  if (typeof val === 'object' && val !== null) {
                      ret[key] = deepCopy(val);
                  } else {
                      ret[key] = val;
                  }
              }
          }
          return ret;
      }

      // based on LLVM libc++ upper_bound / lower_bound
      // MIT License

      function upperBound(array, func) {
          var diff, len, i, current;

          len = array.length;
          i = 0;

          while (len) {
              diff = len >>> 1;
              current = i + diff;
              if (func(array[current])) {
                  len = diff;
              } else {
                  i = current + 1;
                  len -= diff + 1;
              }
          }
          return i;
      }

      VisitorKeys = {
          AssignmentExpression: ['left', 'right'],
          ArrayExpression: ['elements'],
          ArrowFunctionExpression: ['params', 'body'],
          BlockStatement: ['body'],
          BinaryExpression: ['left', 'right'],
          BreakStatement: ['label'],
          CallExpression: ['callee', 'arguments'],
          CatchClause: ['param', 'body'],
          ClassBody: ['body'],
          ClassDeclaration: ['id', 'body', 'superClass'],
          ClassExpression: ['id', 'body', 'superClass'],
          ConditionalExpression: ['test', 'consequent', 'alternate'],
          ContinueStatement: ['label'],
          DebuggerStatement: [],
          DirectiveStatement: [],
          DoWhileStatement: ['body', 'test'],
          EmptyStatement: [],
          ExpressionStatement: ['expression'],
          ForStatement: ['init', 'test', 'update', 'body'],
          ForInStatement: ['left', 'right', 'body'],
          FunctionDeclaration: ['id', 'params', 'body'],
          FunctionExpression: ['id', 'params', 'body'],
          Identifier: [],
          IfStatement: ['test', 'consequent', 'alternate'],
          Literal: [],
          LabeledStatement: ['label', 'body'],
          LogicalExpression: ['left', 'right'],
          MemberExpression: ['object', 'property'],
          MethodDefinition: ['key', 'value'],
          NewExpression: ['callee', 'arguments'],
          ObjectExpression: ['properties'],
          Program: ['body'],
          Property: ['key', 'value'],
          ReturnStatement: ['argument'],
          SequenceExpression: ['expressions'],
          SwitchStatement: ['discriminant', 'cases'],
          SwitchCase: ['test', 'consequent'],
          ThisExpression: [],
          ThrowStatement: ['argument'],
          TryStatement: ['block', 'handlers', 'handler', 'guardedHandlers', 'finalizer'],
          UnaryExpression: ['argument'],
          UpdateExpression: ['argument'],
          VariableDeclaration: ['declarations'],
          VariableDeclarator: ['id', 'init'],
          WhileStatement: ['test', 'body'],
          WithStatement: ['object', 'body'],
          YieldExpression: ['argument']
      };

      // unique id
      BREAK = {};
      SKIP = {};

      VisitorOption = {
          Break: BREAK,
          Skip: SKIP
      };

      function Reference(parent, key) {
          this.parent = parent;
          this.key = key;
      }

      Reference.prototype.replace = function replace(node) {
          this.parent[this.key] = node;
      };

      function Element(node, path, wrap, ref) {
          this.node = node;
          this.path = path;
          this.wrap = wrap;
          this.ref = ref;
      }

      function Controller() { }

      // API:
      // return property path array from root to current node
      Controller.prototype.path = function path() {
          var i, iz, j, jz, result, element;

          function addToPath(result, path) {
              if (isArray(path)) {
                  for (j = 0, jz = path.length; j < jz; ++j) {
                      result.push(path[j]);
                  }
              } else {
                  result.push(path);
              }
          }

          // root node
          if (!this.__current.path) {
              return null;
          }

          // first node is sentinel, second node is root element
          result = [];
          for (i = 2, iz = this.__leavelist.length; i < iz; ++i) {
              element = this.__leavelist[i];
              addToPath(result, element.path);
          }
          addToPath(result, this.__current.path);
          return result;
      };

      // API:
      // return array of parent elements
      Controller.prototype.parents = function parents() {
          var i, iz, result;

          // first node is sentinel
          result = [];
          for (i = 1, iz = this.__leavelist.length; i < iz; ++i) {
              result.push(this.__leavelist[i].node);
          }

          return result;
      };

      // API:
      // return current node
      Controller.prototype.current = function current() {
          return this.__current.node;
      };

      Controller.prototype.__execute = function __execute(callback, element) {
          var previous, result;

          result = undefined;

          previous  = this.__current;
          this.__current = element;
          this.__state = null;
          if (callback) {
              result = callback.call(this, element.node, this.__leavelist[this.__leavelist.length - 1].node);
          }
          this.__current = previous;

          return result;
      };

      // API:
      // notify control skip / break
      Controller.prototype.notify = function notify(flag) {
          this.__state = flag;
      };

      // API:
      // skip child nodes of current node
      Controller.prototype.skip = function () {
          this.notify(SKIP);
      };

      // API:
      // break traversals
      Controller.prototype['break'] = function () {
          this.notify(BREAK);
      };

      Controller.prototype.__initialize = function(root, visitor) {
          this.visitor = visitor;
          this.root = root;
          this.__worklist = [];
          this.__leavelist = [];
          this.__current = null;
          this.__state = null;
      };

      Controller.prototype.traverse = function traverse(root, visitor) {
          var worklist,
              leavelist,
              element,
              node,
              nodeType,
              ret,
              key,
              current,
              current2,
              candidates,
              candidate,
              sentinel;

          this.__initialize(root, visitor);

          sentinel = {};

          // reference
          worklist = this.__worklist;
          leavelist = this.__leavelist;

          // initialize
          worklist.push(new Element(root, null, null, null));
          leavelist.push(new Element(null, null, null, null));

          while (worklist.length) {
              element = worklist.pop();

              if (element === sentinel) {
                  element = leavelist.pop();

                  ret = this.__execute(visitor.leave, element);

                  if (this.__state === BREAK || ret === BREAK) {
                      return;
                  }
                  continue;
              }

              if (element.node) {

                  ret = this.__execute(visitor.enter, element);

                  if (this.__state === BREAK || ret === BREAK) {
                      return;
                  }

                  worklist.push(sentinel);
                  leavelist.push(element);

                  if (this.__state === SKIP || ret === SKIP) {
                      continue;
                  }

                  node = element.node;
                  nodeType = element.wrap || node.type;
                  candidates = VisitorKeys[nodeType];

                  current = candidates.length;
                  while ((current -= 1) >= 0) {
                      key = candidates[current];
                      candidate = node[key];
                      if (!candidate) {
                          continue;
                      }

                      if (!isArray(candidate)) {
                          worklist.push(new Element(candidate, key, null, null));
                          continue;
                      }

                      current2 = candidate.length;
                      while ((current2 -= 1) >= 0) {
                          if (!candidate[current2]) {
                              continue;
                          }
                          if (nodeType === Syntax.ObjectExpression && 'properties' === candidates[current]) {
                              element = new Element(candidate[current2], [key, current2], 'Property', null);
                          } else {
                              element = new Element(candidate[current2], [key, current2], null, null);
                          }
                          worklist.push(element);
                      }
                  }
              }
          }
      };

      Controller.prototype.replace = function replace(root, visitor) {
          var worklist,
              leavelist,
              node,
              nodeType,
              target,
              element,
              current,
              current2,
              candidates,
              candidate,
              sentinel,
              outer,
              key;

          this.__initialize(root, visitor);

          sentinel = {};

          // reference
          worklist = this.__worklist;
          leavelist = this.__leavelist;

          // initialize
          outer = {
              root: root
          };
          element = new Element(root, null, null, new Reference(outer, 'root'));
          worklist.push(element);
          leavelist.push(element);

          while (worklist.length) {
              element = worklist.pop();

              if (element === sentinel) {
                  element = leavelist.pop();

                  target = this.__execute(visitor.leave, element);

                  // node may be replaced with null,
                  // so distinguish between undefined and null in this place
                  if (target !== undefined && target !== BREAK && target !== SKIP) {
                      // replace
                      element.ref.replace(target);
                  }

                  if (this.__state === BREAK || target === BREAK) {
                      return outer.root;
                  }
                  continue;
              }

              target = this.__execute(visitor.enter, element);

              // node may be replaced with null,
              // so distinguish between undefined and null in this place
              if (target !== undefined && target !== BREAK && target !== SKIP) {
                  // replace
                  element.ref.replace(target);
                  element.node = target;
              }

              if (this.__state === BREAK || target === BREAK) {
                  return outer.root;
              }

              // node may be null
              node = element.node;
              if (!node) {
                  continue;
              }

              worklist.push(sentinel);
              leavelist.push(element);

              if (this.__state === SKIP || target === SKIP) {
                  continue;
              }

              nodeType = element.wrap || node.type;
              candidates = VisitorKeys[nodeType];

              current = candidates.length;
              while ((current -= 1) >= 0) {
                  key = candidates[current];
                  candidate = node[key];
                  if (!candidate) {
                      continue;
                  }

                  if (!isArray(candidate)) {
                      worklist.push(new Element(candidate, key, null, new Reference(node, key)));
                      continue;
                  }

                  current2 = candidate.length;
                  while ((current2 -= 1) >= 0) {
                      if (!candidate[current2]) {
                          continue;
                      }
                      if (nodeType === Syntax.ObjectExpression && 'properties' === candidates[current]) {
                          element = new Element(candidate[current2], [key, current2], 'Property', new Reference(candidate, current2));
                      } else {
                          element = new Element(candidate[current2], [key, current2], null, new Reference(candidate, current2));
                      }
                      worklist.push(element);
                  }
              }
          }

          return outer.root;
      };

      function traverse(root, visitor) {
          var controller = new Controller();
          return controller.traverse(root, visitor);
      }

      function replace(root, visitor) {
          var controller = new Controller();
          return controller.replace(root, visitor);
      }

      function extendCommentRange(comment, tokens) {
          var target;

          target = upperBound(tokens, function search(token) {
              return token.range[0] > comment.range[0];
          });

          comment.extendedRange = [comment.range[0], comment.range[1]];

          if (target !== tokens.length) {
              comment.extendedRange[1] = tokens[target].range[0];
          }

          target -= 1;
          if (target >= 0) {
              comment.extendedRange[0] = tokens[target].range[1];
          }

          return comment;
      }

      function attachComments(tree, providedComments, tokens) {
          // At first, we should calculate extended comment ranges.
          var comments = [], comment, len, i, cursor;

          if (!tree.range) {
              throw new Error('attachComments needs range information');
          }

          // tokens array is empty, we attach comments to tree as 'leadingComments'
          if (!tokens.length) {
              if (providedComments.length) {
                  for (i = 0, len = providedComments.length; i < len; i += 1) {
                      comment = deepCopy(providedComments[i]);
                      comment.extendedRange = [0, tree.range[0]];
                      comments.push(comment);
                  }
                  tree.leadingComments = comments;
              }
              return tree;
          }

          for (i = 0, len = providedComments.length; i < len; i += 1) {
              comments.push(extendCommentRange(deepCopy(providedComments[i]), tokens));
          }

          // This is based on John Freeman's implementation.
          cursor = 0;
          traverse(tree, {
              enter: function (node) {
                  var comment;

                  while (cursor < comments.length) {
                      comment = comments[cursor];
                      if (comment.extendedRange[1] > node.range[0]) {
                          break;
                      }

                      if (comment.extendedRange[1] === node.range[0]) {
                          if (!node.leadingComments) {
                              node.leadingComments = [];
                          }
                          node.leadingComments.push(comment);
                          comments.splice(cursor, 1);
                      } else {
                          cursor += 1;
                      }
                  }

                  // already out of owned node
                  if (cursor === comments.length) {
                      return VisitorOption.Break;
                  }

                  if (comments[cursor].extendedRange[0] > node.range[1]) {
                      return VisitorOption.Skip;
                  }
              }
          });

          cursor = 0;
          traverse(tree, {
              leave: function (node) {
                  var comment;

                  while (cursor < comments.length) {
                      comment = comments[cursor];
                      if (node.range[1] < comment.extendedRange[0]) {
                          break;
                      }

                      if (node.range[1] === comment.extendedRange[0]) {
                          if (!node.trailingComments) {
                              node.trailingComments = [];
                          }
                          node.trailingComments.push(comment);
                          comments.splice(cursor, 1);
                      } else {
                          cursor += 1;
                      }
                  }

                  // already out of owned node
                  if (cursor === comments.length) {
                      return VisitorOption.Break;
                  }

                  if (comments[cursor].extendedRange[0] > node.range[1]) {
                      return VisitorOption.Skip;
                  }
              }
          });

          return tree;
      }

      exports.version = '1.3.2';
      exports.Syntax = Syntax;
      exports.traverse = traverse;
      exports.replace = replace;
      exports.attachComments = attachComments;
      exports.VisitorKeys = VisitorKeys;
      exports.VisitorOption = VisitorOption;
      exports.Controller = Controller;
  }));
  /* vim: set sw=4 ts=4 et tw=80 : */
  });

  /* -*- Mode: js; js-indent-level: 2; -*- */
  /*
   * Copyright 2011 Mozilla Foundation and contributors
   * Licensed under the New BSD license. See LICENSE or:
   * http://opensource.org/licenses/BSD-3-Clause
   */

  var intToCharMap = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");

  /**
   * Encode an integer in the range of 0 to 63 to a single base 64 digit.
   */
  var encode = function(number) {
    if (0 <= number && number < intToCharMap.length) {
      return intToCharMap[number];
    }
    throw new TypeError("Must be between 0 and 63: " + number);
  };

  var base64 = {
  	encode: encode
  };

  /* -*- Mode: js; js-indent-level: 2; -*- */
  /*
   * Copyright 2011 Mozilla Foundation and contributors
   * Licensed under the New BSD license. See LICENSE or:
   * http://opensource.org/licenses/BSD-3-Clause
   *
   * Based on the Base 64 VLQ implementation in Closure Compiler:
   * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
   *
   * Copyright 2011 The Closure Compiler Authors. All rights reserved.
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are
   * met:
   *
   *  * Redistributions of source code must retain the above copyright
   *    notice, this list of conditions and the following disclaimer.
   *  * Redistributions in binary form must reproduce the above
   *    copyright notice, this list of conditions and the following
   *    disclaimer in the documentation and/or other materials provided
   *    with the distribution.
   *  * Neither the name of Google Inc. nor the names of its
   *    contributors may be used to endorse or promote products derived
   *    from this software without specific prior written permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
   * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
   * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
   * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
   * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
   * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
   * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
   * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
   * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
   * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
   * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   */



  // A single base 64 digit can contain 6 bits of data. For the base 64 variable
  // length quantities we use in the source map spec, the first bit is the sign,
  // the next four bits are the actual value, and the 6th bit is the
  // continuation bit. The continuation bit tells us whether there are more
  // digits in this value following this digit.
  //
  //   Continuation
  //   |    Sign
  //   |    |
  //   V    V
  //   101011

  var VLQ_BASE_SHIFT = 5;

  // binary: 100000
  var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

  // binary: 011111
  var VLQ_BASE_MASK = VLQ_BASE - 1;

  // binary: 100000
  var VLQ_CONTINUATION_BIT = VLQ_BASE;

  /**
   * Converts from a two-complement value to a value where the sign bit is
   * placed in the least significant bit.  For example, as decimals:
   *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
   *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
   */
  function toVLQSigned(aValue) {
    return aValue < 0
      ? ((-aValue) << 1) + 1
      : (aValue << 1) + 0;
  }

  /**
   * Returns the base 64 VLQ encoded value.
   */
  var encode$1 = function base64VLQ_encode(aValue) {
    var encoded = "";
    var digit;

    var vlq = toVLQSigned(aValue);

    do {
      digit = vlq & VLQ_BASE_MASK;
      vlq >>>= VLQ_BASE_SHIFT;
      if (vlq > 0) {
        // There are still more digits in this value, so we must make sure the
        // continuation bit is marked.
        digit |= VLQ_CONTINUATION_BIT;
      }
      encoded += base64.encode(digit);
    } while (vlq > 0);

    return encoded;
  };

  var base64Vlq = {
  	encode: encode$1
  };

  var util$1 = createCommonjsModule(function (module, exports) {
  /* -*- Mode: js; js-indent-level: 2; -*- */
  /*
   * Copyright 2011 Mozilla Foundation and contributors
   * Licensed under the New BSD license. See LICENSE or:
   * http://opensource.org/licenses/BSD-3-Clause
   */

  /**
   * This is a helper function for getting values from parameter/options
   * objects.
   *
   * @param args The object we are extracting values from
   * @param name The name of the property we are getting.
   * @param defaultValue An optional value to return if the property is missing
   * from the object. If this is not specified and the property is missing, an
   * error will be thrown.
   */
  function getArg(aArgs, aName, aDefaultValue) {
    if (aName in aArgs) {
      return aArgs[aName];
    } else if (arguments.length === 3) {
      return aDefaultValue;
    }
      throw new Error('"' + aName + '" is a required argument.');

  }
  exports.getArg = getArg;

  var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.-]*)(?::(\d+))?(.*)$/;
  var dataUrlRegexp = /^data:.+\,.+$/;

  function urlParse(aUrl) {
    var match = aUrl.match(urlRegexp);
    if (!match) {
      return null;
    }
    return {
      scheme: match[1],
      auth: match[2],
      host: match[3],
      port: match[4],
      path: match[5]
    };
  }
  exports.urlParse = urlParse;

  function urlGenerate(aParsedUrl) {
    var url = "";
    if (aParsedUrl.scheme) {
      url += aParsedUrl.scheme + ":";
    }
    url += "//";
    if (aParsedUrl.auth) {
      url += aParsedUrl.auth + "@";
    }
    if (aParsedUrl.host) {
      url += aParsedUrl.host;
    }
    if (aParsedUrl.port) {
      url += ":" + aParsedUrl.port;
    }
    if (aParsedUrl.path) {
      url += aParsedUrl.path;
    }
    return url;
  }
  exports.urlGenerate = urlGenerate;

  var MAX_CACHED_INPUTS = 32;

  /**
   * Takes some function `f(input) -> result` and returns a memoized version of
   * `f`.
   *
   * We keep at most `MAX_CACHED_INPUTS` memoized results of `f` alive. The
   * memoization is a dumb-simple, linear least-recently-used cache.
   */
  function lruMemoize(f) {
    var cache = [];

    return function(input) {
      for (var i = 0; i < cache.length; i++) {
        if (cache[i].input === input) {
          var temp = cache[0];
          cache[0] = cache[i];
          cache[i] = temp;
          return cache[0].result;
        }
      }

      var result = f(input);

      cache.unshift({
        input: input,
        result: result,
      });

      if (cache.length > MAX_CACHED_INPUTS) {
        cache.pop();
      }

      return result;
    };
  }

  /**
   * Normalizes a path, or the path portion of a URL:
   *
   * - Replaces consecutive slashes with one slash.
   * - Removes unnecessary '.' parts.
   * - Removes unnecessary '<dir>/..' parts.
   *
   * Based on code in the Node.js 'path' core module.
   *
   * @param aPath The path or url to normalize.
   */
  var normalize = lruMemoize(function normalize(aPath) {
    var path = aPath;
    var url = urlParse(aPath);
    if (url) {
      if (!url.path) {
        return aPath;
      }
      path = url.path;
    }
    var isAbsolute = exports.isAbsolute(path);

    // Split the path into parts between `/` characters. This is much faster than
    // using `.split(/\/+/g)`.
    var parts = [];
    var start = 0;
    var i = 0;
    while (true) {
      start = i;
      i = path.indexOf("/", start);
      if (i === -1) {
        parts.push(path.slice(start));
        break;
      } else {
        parts.push(path.slice(start, i));
        while (i < path.length && path[i] === "/") {
          i++;
        }
      }
    }

    var up = 0;
    for (i = parts.length - 1; i >= 0; i--) {
      var part = parts[i];
      if (part === ".") {
        parts.splice(i, 1);
      } else if (part === "..") {
        up++;
      } else if (up > 0) {
        if (part === "") {
          // The first part is blank if the path is absolute. Trying to go
          // above the root is a no-op. Therefore we can remove all '..' parts
          // directly after the root.
          parts.splice(i + 1, up);
          up = 0;
        } else {
          parts.splice(i, 2);
          up--;
        }
      }
    }
    path = parts.join("/");

    if (path === "") {
      path = isAbsolute ? "/" : ".";
    }

    if (url) {
      url.path = path;
      return urlGenerate(url);
    }
    return path;
  });
  exports.normalize = normalize;

  /**
   * Joins two paths/URLs.
   *
   * @param aRoot The root path or URL.
   * @param aPath The path or URL to be joined with the root.
   *
   * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
   *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
   *   first.
   * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
   *   is updated with the result and aRoot is returned. Otherwise the result
   *   is returned.
   *   - If aPath is absolute, the result is aPath.
   *   - Otherwise the two paths are joined with a slash.
   * - Joining for example 'http://' and 'www.example.com' is also supported.
   */
  function join(aRoot, aPath) {
    if (aRoot === "") {
      aRoot = ".";
    }
    if (aPath === "") {
      aPath = ".";
    }
    var aPathUrl = urlParse(aPath);
    var aRootUrl = urlParse(aRoot);
    if (aRootUrl) {
      aRoot = aRootUrl.path || "/";
    }

    // `join(foo, '//www.example.org')`
    if (aPathUrl && !aPathUrl.scheme) {
      if (aRootUrl) {
        aPathUrl.scheme = aRootUrl.scheme;
      }
      return urlGenerate(aPathUrl);
    }

    if (aPathUrl || aPath.match(dataUrlRegexp)) {
      return aPath;
    }

    // `join('http://', 'www.example.com')`
    if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
      aRootUrl.host = aPath;
      return urlGenerate(aRootUrl);
    }

    var joined = aPath.charAt(0) === "/"
      ? aPath
      : normalize(aRoot.replace(/\/+$/, "") + "/" + aPath);

    if (aRootUrl) {
      aRootUrl.path = joined;
      return urlGenerate(aRootUrl);
    }
    return joined;
  }
  exports.join = join;

  exports.isAbsolute = function(aPath) {
    return aPath.charAt(0) === "/" || urlRegexp.test(aPath);
  };

  /**
   * Make a path relative to a URL or another path.
   *
   * @param aRoot The root path or URL.
   * @param aPath The path or URL to be made relative to aRoot.
   */
  function relative(aRoot, aPath) {
    if (aRoot === "") {
      aRoot = ".";
    }

    aRoot = aRoot.replace(/\/$/, "");

    // It is possible for the path to be above the root. In this case, simply
    // checking whether the root is a prefix of the path won't work. Instead, we
    // need to remove components from the root one by one, until either we find
    // a prefix that fits, or we run out of components to remove.
    var level = 0;
    while (aPath.indexOf(aRoot + "/") !== 0) {
      var index = aRoot.lastIndexOf("/");
      if (index < 0) {
        return aPath;
      }

      // If the only part of the root that is left is the scheme (i.e. http://,
      // file:///, etc.), one or more slashes (/), or simply nothing at all, we
      // have exhausted all components, so the path is not relative to the root.
      aRoot = aRoot.slice(0, index);
      if (aRoot.match(/^([^\/]+:\/)?\/*$/)) {
        return aPath;
      }

      ++level;
    }

    // Make sure we add a "../" for each component we removed from the root.
    return Array(level + 1).join("../") + aPath.substr(aRoot.length + 1);
  }
  exports.relative = relative;

  var supportsNullProto = (function() {
    var obj = Object.create(null);
    return !("__proto__" in obj);
  }());

  function identity(s) {
    return s;
  }

  /**
   * Because behavior goes wacky when you set `__proto__` on objects, we
   * have to prefix all the strings in our set with an arbitrary character.
   *
   * See https://github.com/mozilla/source-map/pull/31 and
   * https://github.com/mozilla/source-map/issues/30
   *
   * @param String aStr
   */
  function toSetString(aStr) {
    if (isProtoString(aStr)) {
      return "$" + aStr;
    }

    return aStr;
  }
  exports.toSetString = supportsNullProto ? identity : toSetString;

  function fromSetString(aStr) {
    if (isProtoString(aStr)) {
      return aStr.slice(1);
    }

    return aStr;
  }
  exports.fromSetString = supportsNullProto ? identity : fromSetString;

  function isProtoString(s) {
    if (!s) {
      return false;
    }

    var length = s.length;

    if (length < 9 /* "__proto__".length */) {
      return false;
    }

    /* eslint-disable no-multi-spaces */
    if (s.charCodeAt(length - 1) !== 95  /* '_' */ ||
        s.charCodeAt(length - 2) !== 95  /* '_' */ ||
        s.charCodeAt(length - 3) !== 111 /* 'o' */ ||
        s.charCodeAt(length - 4) !== 116 /* 't' */ ||
        s.charCodeAt(length - 5) !== 111 /* 'o' */ ||
        s.charCodeAt(length - 6) !== 114 /* 'r' */ ||
        s.charCodeAt(length - 7) !== 112 /* 'p' */ ||
        s.charCodeAt(length - 8) !== 95  /* '_' */ ||
        s.charCodeAt(length - 9) !== 95  /* '_' */) {
      return false;
    }
    /* eslint-enable no-multi-spaces */

    for (var i = length - 10; i >= 0; i--) {
      if (s.charCodeAt(i) !== 36 /* '$' */) {
        return false;
      }
    }

    return true;
  }

  /**
   * Comparator between two mappings where the original positions are compared.
   *
   * Optionally pass in `true` as `onlyCompareGenerated` to consider two
   * mappings with the same original source/line/column, but different generated
   * line and column the same. Useful when searching for a mapping with a
   * stubbed out mapping.
   */
  function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
    var cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp !== 0 || onlyCompareOriginal) {
      return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp !== 0) {
      return cmp;
    }

    return strcmp(mappingA.name, mappingB.name);
  }
  exports.compareByOriginalPositions = compareByOriginalPositions;

  /**
   * Comparator between two mappings with deflated source and name indices where
   * the generated positions are compared.
   *
   * Optionally pass in `true` as `onlyCompareGenerated` to consider two
   * mappings with the same generated line and column, but different
   * source/name/original line and column the same. Useful when searching for a
   * mapping with a stubbed out mapping.
   */
  function compareByGeneratedPositionsDeflated(mappingA, mappingB, onlyCompareGenerated) {
    var cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp !== 0 || onlyCompareGenerated) {
      return cmp;
    }

    cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp !== 0) {
      return cmp;
    }

    return strcmp(mappingA.name, mappingB.name);
  }
  exports.compareByGeneratedPositionsDeflated = compareByGeneratedPositionsDeflated;

  function strcmp(aStr1, aStr2) {
    if (aStr1 === aStr2) {
      return 0;
    }

    if (aStr1 === null) {
      return 1; // aStr2 !== null
    }

    if (aStr2 === null) {
      return -1; // aStr1 !== null
    }

    if (aStr1 > aStr2) {
      return 1;
    }

    return -1;
  }

  /**
   * Comparator between two mappings with inflated source and name strings where
   * the generated positions are compared.
   */
  function compareByGeneratedPositionsInflated(mappingA, mappingB) {
    var cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp !== 0) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp !== 0) {
      return cmp;
    }

    return strcmp(mappingA.name, mappingB.name);
  }
  exports.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

  /**
   * Strip any JSON XSSI avoidance prefix from the string (as documented
   * in the source maps specification), and then parse the string as
   * JSON.
   */
  function parseSourceMapInput(str) {
    return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ""));
  }
  exports.parseSourceMapInput = parseSourceMapInput;

  /**
   * Compute the URL of a source given the the source root, the source's
   * URL, and the source map's URL.
   */
  function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
    sourceURL = sourceURL || "";

    if (sourceRoot) {
      // This follows what Chrome does.
      if (sourceRoot[sourceRoot.length - 1] !== "/" && sourceURL[0] !== "/") {
        sourceRoot += "/";
      }
      // The spec says:
      //   Line 4: An optional source root, useful for relocating source
      //   files on a server or removing repeated values in the
      //   “sources” entry.  This value is prepended to the individual
      //   entries in the “source” field.
      sourceURL = sourceRoot + sourceURL;
    }

    // Historically, SourceMapConsumer did not take the sourceMapURL as
    // a parameter.  This mode is still somewhat supported, which is why
    // this code block is conditional.  However, it's preferable to pass
    // the source map URL to SourceMapConsumer, so that this function
    // can implement the source URL resolution algorithm as outlined in
    // the spec.  This block is basically the equivalent of:
    //    new URL(sourceURL, sourceMapURL).toString()
    // ... except it avoids using URL, which wasn't available in the
    // older releases of node still supported by this library.
    //
    // The spec says:
    //   If the sources are not absolute URLs after prepending of the
    //   “sourceRoot”, the sources are resolved relative to the
    //   SourceMap (like resolving script src in a html document).
    if (sourceMapURL) {
      var parsed = urlParse(sourceMapURL);
      if (!parsed) {
        throw new Error("sourceMapURL could not be parsed");
      }
      if (parsed.path) {
        // Strip the last path component, but keep the "/".
        var index = parsed.path.lastIndexOf("/");
        if (index >= 0) {
          parsed.path = parsed.path.substring(0, index + 1);
        }
      }
      sourceURL = join(urlGenerate(parsed), sourceURL);
    }

    return normalize(sourceURL);
  }
  exports.computeSourceURL = computeSourceURL;
  });
  var util_1$1 = util$1.getArg;
  var util_2$1 = util$1.urlParse;
  var util_3$1 = util$1.urlGenerate;
  var util_4 = util$1.normalize;
  var util_5 = util$1.join;
  var util_6 = util$1.isAbsolute;
  var util_7 = util$1.relative;
  var util_8 = util$1.toSetString;
  var util_9 = util$1.fromSetString;
  var util_10 = util$1.compareByOriginalPositions;
  var util_11 = util$1.compareByGeneratedPositionsDeflated;
  var util_12 = util$1.compareByGeneratedPositionsInflated;
  var util_13 = util$1.parseSourceMapInput;
  var util_14 = util$1.computeSourceURL;

  /* -*- Mode: js; js-indent-level: 2; -*- */
  /*
   * Copyright 2011 Mozilla Foundation and contributors
   * Licensed under the New BSD license. See LICENSE or:
   * http://opensource.org/licenses/BSD-3-Clause
   */

  /**
   * A data structure which is a combination of an array and a set. Adding a new
   * member is O(1), testing for membership is O(1), and finding the index of an
   * element is O(1). Removing elements from the set is not supported. Only
   * strings are supported for membership.
   */
  var ArraySet = function ArraySet() {
    this._array = [];
    this._set = new Map();
  };

  /**
   * Static method for creating ArraySet instances from an existing array.
   */
  ArraySet.fromArray = function fromArray (aArray, aAllowDuplicates) {
    var set = new ArraySet();
    for (var i = 0, len = aArray.length; i < len; i++) {
      set.add(aArray[i], aAllowDuplicates);
    }
    return set;
  };

  /**
   * Return how many unique items are in this ArraySet. If duplicates have been
   * added, than those do not count towards the size.
   *
   * @returns Number
   */
  ArraySet.prototype.size = function size () {
    return this._set.size;
  };

  /**
   * Add the given string to this set.
   *
   * @param String aStr
   */
  ArraySet.prototype.add = function add (aStr, aAllowDuplicates) {
    var isDuplicate = this.has(aStr);
    var idx = this._array.length;
    if (!isDuplicate || aAllowDuplicates) {
      this._array.push(aStr);
    }
    if (!isDuplicate) {
      this._set.set(aStr, idx);
    }
  };

  /**
   * Is the given string a member of this set?
   *
   * @param String aStr
   */
  ArraySet.prototype.has = function has (aStr) {
      return this._set.has(aStr);
  };

  /**
   * What is the index of the given string in the array?
   *
   * @param String aStr
   */
  ArraySet.prototype.indexOf = function indexOf (aStr) {
    var idx = this._set.get(aStr);
    if (idx >= 0) {
        return idx;
    }
    throw new Error('"' + aStr + '" is not in the set.');
  };

  /**
   * What is the element at the given index?
   *
   * @param Number aIdx
   */
  ArraySet.prototype.at = function at (aIdx) {
    if (aIdx >= 0 && aIdx < this._array.length) {
      return this._array[aIdx];
    }
    throw new Error("No element indexed by " + aIdx);
  };

  /**
   * Returns the array representation of this set (which has the proper indices
   * indicated by indexOf). Note that this is a copy of the internal array used
   * for storing the members so that no one can mess with internal state.
   */
  ArraySet.prototype.toArray = function toArray () {
    return this._array.slice();
  };
  var ArraySet_1 = ArraySet;

  var arraySet = {
  	ArraySet: ArraySet_1
  };

  /* -*- Mode: js; js-indent-level: 2; -*- */
  /*
   * Copyright 2014 Mozilla Foundation and contributors
   * Licensed under the New BSD license. See LICENSE or:
   * http://opensource.org/licenses/BSD-3-Clause
   */



  /**
   * Determine whether mappingB is after mappingA with respect to generated
   * position.
   */
  function generatedPositionAfter(mappingA, mappingB) {
    // Optimized for most common case
    var lineA = mappingA.generatedLine;
    var lineB = mappingB.generatedLine;
    var columnA = mappingA.generatedColumn;
    var columnB = mappingB.generatedColumn;
    return lineB > lineA || lineB == lineA && columnB >= columnA ||
           util$1.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0;
  }

  /**
   * A data structure to provide a sorted view of accumulated mappings in a
   * performance conscious manner. It trades a negligible overhead in general
   * case for a large speedup in case of mappings being added in order.
   */
  var MappingList = function MappingList() {
    this._array = [];
    this._sorted = true;
    // Serves as infimum
    this._last = {generatedLine: -1, generatedColumn: 0};
  };

  /**
   * Iterate through internal items. This method takes the same arguments that
   * `Array.prototype.forEach` takes.
   *
   * NOTE: The order of the mappings is NOT guaranteed.
   */
  MappingList.prototype.unsortedForEach = function unsortedForEach (aCallback, aThisArg) {
    this._array.forEach(aCallback, aThisArg);
  };

  /**
   * Add the given source mapping.
   *
   * @param Object aMapping
   */
  MappingList.prototype.add = function add (aMapping) {
    if (generatedPositionAfter(this._last, aMapping)) {
      this._last = aMapping;
      this._array.push(aMapping);
    } else {
      this._sorted = false;
      this._array.push(aMapping);
    }
  };

  /**
   * Returns the flat, sorted array of mappings. The mappings are sorted by
   * generated position.
   *
   * WARNING: This method returns internal data without copying, for
   * performance. The return value must NOT be mutated, and should be treated as
   * an immutable borrow. If you want to take ownership, you must make your own
   * copy.
   */
  MappingList.prototype.toArray = function toArray () {
    if (!this._sorted) {
      this._array.sort(util$1.compareByGeneratedPositionsInflated);
      this._sorted = true;
    }
    return this._array;
  };

  var MappingList_1 = MappingList;

  var mappingList = {
  	MappingList: MappingList_1
  };

  /* -*- Mode: js; js-indent-level: 2; -*- */
  /*
   * Copyright 2011 Mozilla Foundation and contributors
   * Licensed under the New BSD license. See LICENSE or:
   * http://opensource.org/licenses/BSD-3-Clause
   */



  var ArraySet$1 = arraySet.ArraySet;
  var MappingList$1 = mappingList.MappingList;

  /**
   * An instance of the SourceMapGenerator represents a source map which is
   * being built incrementally. You may pass an object with the following
   * properties:
   *
   *   - file: The filename of the generated source.
   *   - sourceRoot: A root for all relative URLs in this source map.
   */
  var SourceMapGenerator = function SourceMapGenerator(aArgs) {
    if (!aArgs) {
      aArgs = {};
    }
    this._file = util$1.getArg(aArgs, "file", null);
    this._sourceRoot = util$1.getArg(aArgs, "sourceRoot", null);
    this._skipValidation = util$1.getArg(aArgs, "skipValidation", false);
    this._sources = new ArraySet$1();
    this._names = new ArraySet$1();
    this._mappings = new MappingList$1();
    this._sourcesContents = null;
  };

  /**
   * Creates a new SourceMapGenerator based on a SourceMapConsumer
   *
   * @param aSourceMapConsumer The SourceMap.
   */
  SourceMapGenerator.fromSourceMap = function fromSourceMap (aSourceMapConsumer) {
    var sourceRoot = aSourceMapConsumer.sourceRoot;
    var generator = new SourceMapGenerator({
      file: aSourceMapConsumer.file,
      sourceRoot: sourceRoot
    });
    aSourceMapConsumer.eachMapping(function(mapping) {
      var newMapping = {
        generated: {
          line: mapping.generatedLine,
          column: mapping.generatedColumn
        }
      };

      if (mapping.source != null) {
        newMapping.source = mapping.source;
        if (sourceRoot != null) {
          newMapping.source = util$1.relative(sourceRoot, newMapping.source);
        }

        newMapping.original = {
          line: mapping.originalLine,
          column: mapping.originalColumn
        };

        if (mapping.name != null) {
          newMapping.name = mapping.name;
        }
      }

      generator.addMapping(newMapping);
    });
    aSourceMapConsumer.sources.forEach(function(sourceFile) {
      var sourceRelative = sourceFile;
      if (sourceRoot !== null) {
        sourceRelative = util$1.relative(sourceRoot, sourceFile);
      }

      if (!generator._sources.has(sourceRelative)) {
        generator._sources.add(sourceRelative);
      }

      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        generator.setSourceContent(sourceFile, content);
      }
    });
    return generator;
  };

  /**
   * Add a single mapping from original source line and column to the generated
   * source's line and column for this source map being created. The mapping
   * object should have the following properties:
   *
   * - generated: An object with the generated line and column positions.
   * - original: An object with the original line and column positions.
   * - source: The original source file (relative to the sourceRoot).
   * - name: An optional original token name for this mapping.
   */
  SourceMapGenerator.prototype.addMapping = function addMapping (aArgs) {
    var generated = util$1.getArg(aArgs, "generated");
    var original = util$1.getArg(aArgs, "original", null);
    var source = util$1.getArg(aArgs, "source", null);
    var name = util$1.getArg(aArgs, "name", null);

    if (!this._skipValidation) {
      this._validateMapping(generated, original, source, name);
    }

    if (source != null) {
      source = String(source);
      if (!this._sources.has(source)) {
        this._sources.add(source);
      }
    }

    if (name != null) {
      name = String(name);
      if (!this._names.has(name)) {
        this._names.add(name);
      }
    }

    this._mappings.add({
      generatedLine: generated.line,
      generatedColumn: generated.column,
      originalLine: original != null && original.line,
      originalColumn: original != null && original.column,
      source: source,
      name: name
    });
  };

  /**
   * Set the source content for a source file.
   */
  SourceMapGenerator.prototype.setSourceContent = function setSourceContent (aSourceFile, aSourceContent) {
    var source = aSourceFile;
    if (this._sourceRoot != null) {
      source = util$1.relative(this._sourceRoot, source);
    }

    if (aSourceContent != null) {
      // Add the source content to the _sourcesContents map.
      // Create a new _sourcesContents map if the property is null.
      if (!this._sourcesContents) {
        this._sourcesContents = Object.create(null);
      }
      this._sourcesContents[util$1.toSetString(source)] = aSourceContent;
    } else if (this._sourcesContents) {
      // Remove the source file from the _sourcesContents map.
      // If the _sourcesContents map is empty, set the property to null.
      delete this._sourcesContents[util$1.toSetString(source)];
      if (Object.keys(this._sourcesContents).length === 0) {
        this._sourcesContents = null;
      }
    }
  };

  /**
   * Applies the mappings of a sub-source-map for a specific source file to the
   * source map being generated. Each mapping to the supplied source file is
   * rewritten using the supplied source map. Note: The resolution for the
   * resulting mappings is the minimium of this map and the supplied map.
   *
   * @param aSourceMapConsumer The source map to be applied.
   * @param aSourceFile Optional. The filename of the source file.
   *      If omitted, SourceMapConsumer's file property will be used.
   * @param aSourceMapPath Optional. The dirname of the path to the source map
   *      to be applied. If relative, it is relative to the SourceMapConsumer.
   *      This parameter is needed when the two source maps aren't in the same
   *      directory, and the source map to be applied contains relative source
   *      paths. If so, those relative source paths need to be rewritten
   *      relative to the SourceMapGenerator.
   */
  SourceMapGenerator.prototype.applySourceMap = function applySourceMap (aSourceMapConsumer, aSourceFile, aSourceMapPath) {
    var sourceFile = aSourceFile;
    // If aSourceFile is omitted, we will use the file property of the SourceMap
    if (aSourceFile == null) {
      if (aSourceMapConsumer.file == null) {
        throw new Error(
          "SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, " +
          'or the source map\'s "file" property. Both were omitted.'
        );
      }
      sourceFile = aSourceMapConsumer.file;
    }
    var sourceRoot = this._sourceRoot;
    // Make "sourceFile" relative if an absolute Url is passed.
    if (sourceRoot != null) {
      sourceFile = util$1.relative(sourceRoot, sourceFile);
    }
    // Applying the SourceMap can add and remove items from the sources and
    // the names array.
    var newSources = this._mappings.toArray().length > 0
      ? new ArraySet$1()
      : this._sources;
    var newNames = new ArraySet$1();

    // Find mappings for the "sourceFile"
    this._mappings.unsortedForEach(function(mapping) {
      if (mapping.source === sourceFile && mapping.originalLine != null) {
        // Check if it can be mapped by the source map, then update the mapping.
        var original = aSourceMapConsumer.originalPositionFor({
          line: mapping.originalLine,
          column: mapping.originalColumn
        });
        if (original.source != null) {
          // Copy mapping
          mapping.source = original.source;
          if (aSourceMapPath != null) {
            mapping.source = util$1.join(aSourceMapPath, mapping.source);
          }
          if (sourceRoot != null) {
            mapping.source = util$1.relative(sourceRoot, mapping.source);
          }
          mapping.originalLine = original.line;
          mapping.originalColumn = original.column;
          if (original.name != null) {
            mapping.name = original.name;
          }
        }
      }

      var source = mapping.source;
      if (source != null && !newSources.has(source)) {
        newSources.add(source);
      }

      var name = mapping.name;
      if (name != null && !newNames.has(name)) {
        newNames.add(name);
      }

    }, this);
    this._sources = newSources;
    this._names = newNames;

    // Copy sourcesContents of applied map.
    aSourceMapConsumer.sources.forEach(function(srcFile) {
      var content = aSourceMapConsumer.sourceContentFor(srcFile);
      if (content != null) {
        if (aSourceMapPath != null) {
          srcFile = util$1.join(aSourceMapPath, srcFile);
        }
        if (sourceRoot != null) {
          srcFile = util$1.relative(sourceRoot, srcFile);
        }
        this.setSourceContent(srcFile, content);
      }
    }, this);
  };

  /**
   * A mapping can have one of the three levels of data:
   *
   * 1. Just the generated position.
   * 2. The Generated position, original position, and original source.
   * 3. Generated and original position, original source, as well as a name
   *    token.
   *
   * To maintain consistency, we validate that any new mapping being added falls
   * in to one of these categories.
   */
  SourceMapGenerator.prototype._validateMapping = function _validateMapping (aGenerated, aOriginal, aSource, aName) {
    // When aOriginal is truthy but has empty values for .line and .column,
    // it is most likely a programmer error. In this case we throw a very
    // specific error message to try to guide them the right way.
    // For example: https://github.com/Polymer/polymer-bundler/pull/519
    if (aOriginal && typeof aOriginal.line !== "number" && typeof aOriginal.column !== "number") {
        throw new Error(
            "original.line and original.column are not numbers -- you probably meant to omit " +
            "the original mapping entirely and only map the generated position. If so, pass " +
            "null for the original mapping instead of an object with empty or null values."
        );
    }

    if (aGenerated && "line" in aGenerated && "column" in aGenerated
        && aGenerated.line > 0 && aGenerated.column >= 0
        && !aOriginal && !aSource && !aName) ; else if (aGenerated && "line" in aGenerated && "column" in aGenerated
             && aOriginal && "line" in aOriginal && "column" in aOriginal
             && aGenerated.line > 0 && aGenerated.column >= 0
             && aOriginal.line > 0 && aOriginal.column >= 0
             && aSource) ; else {
      throw new Error("Invalid mapping: " + JSON.stringify({
        generated: aGenerated,
        source: aSource,
        original: aOriginal,
        name: aName
      }));
    }
  };

  /**
   * Serialize the accumulated mappings in to the stream of base 64 VLQs
   * specified by the source map format.
   */
  SourceMapGenerator.prototype._serializeMappings = function _serializeMappings () {
    var previousGeneratedColumn = 0;
    var previousGeneratedLine = 1;
    var previousOriginalColumn = 0;
    var previousOriginalLine = 0;
    var previousName = 0;
    var previousSource = 0;
    var result = "";
    var next;
    var mapping;
    var nameIdx;
    var sourceIdx;

    var mappings = this._mappings.toArray();
    for (var i = 0, len = mappings.length; i < len; i++) {
      mapping = mappings[i];
      next = "";

      if (mapping.generatedLine !== previousGeneratedLine) {
        previousGeneratedColumn = 0;
        while (mapping.generatedLine !== previousGeneratedLine) {
          next += ";";
          previousGeneratedLine++;
        }
      } else if (i > 0) {
        if (!util$1.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])) {
          continue;
        }
        next += ",";
      }

      next += base64Vlq.encode(mapping.generatedColumn
                                 - previousGeneratedColumn);
      previousGeneratedColumn = mapping.generatedColumn;

      if (mapping.source != null) {
        sourceIdx = this._sources.indexOf(mapping.source);
        next += base64Vlq.encode(sourceIdx - previousSource);
        previousSource = sourceIdx;

        // lines are stored 0-based in SourceMap spec version 3
        next += base64Vlq.encode(mapping.originalLine - 1
                                   - previousOriginalLine);
        previousOriginalLine = mapping.originalLine - 1;

        next += base64Vlq.encode(mapping.originalColumn
                                   - previousOriginalColumn);
        previousOriginalColumn = mapping.originalColumn;

        if (mapping.name != null) {
          nameIdx = this._names.indexOf(mapping.name);
          next += base64Vlq.encode(nameIdx - previousName);
          previousName = nameIdx;
        }
      }

      result += next;
    }

    return result;
  };

  SourceMapGenerator.prototype._generateSourcesContent = function _generateSourcesContent (aSources, aSourceRoot) {
    return aSources.map(function(source) {
      if (!this._sourcesContents) {
        return null;
      }
      if (aSourceRoot != null) {
        source = util$1.relative(aSourceRoot, source);
      }
      var key = util$1.toSetString(source);
      return Object.prototype.hasOwnProperty.call(this._sourcesContents, key)
        ? this._sourcesContents[key]
        : null;
    }, this);
  };

  /**
   * Externalize the source map.
   */
  SourceMapGenerator.prototype.toJSON = function toJSON () {
    var map = {
      version: this._version,
      sources: this._sources.toArray(),
      names: this._names.toArray(),
      mappings: this._serializeMappings()
    };
    if (this._file != null) {
      map.file = this._file;
    }
    if (this._sourceRoot != null) {
      map.sourceRoot = this._sourceRoot;
    }
    if (this._sourcesContents) {
      map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
    }

    return map;
  };

  /**
   * Render the source map being generated to a string.
   */
  SourceMapGenerator.prototype.toString = function toString () {
    return JSON.stringify(this.toJSON());
  };

  SourceMapGenerator.prototype._version = 3;
  var SourceMapGenerator_1 = SourceMapGenerator;

  var sourceMapGenerator = {
  	SourceMapGenerator: SourceMapGenerator_1
  };

  var binarySearch = createCommonjsModule(function (module, exports) {
  /* -*- Mode: js; js-indent-level: 2; -*- */
  /*
   * Copyright 2011 Mozilla Foundation and contributors
   * Licensed under the New BSD license. See LICENSE or:
   * http://opensource.org/licenses/BSD-3-Clause
   */

  exports.GREATEST_LOWER_BOUND = 1;
  exports.LEAST_UPPER_BOUND = 2;

  /**
   * Recursive implementation of binary search.
   *
   * @param aLow Indices here and lower do not contain the needle.
   * @param aHigh Indices here and higher do not contain the needle.
   * @param aNeedle The element being searched for.
   * @param aHaystack The non-empty array being searched.
   * @param aCompare Function which takes two elements and returns -1, 0, or 1.
   * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
   *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
   *     closest element that is smaller than or greater than the one we are
   *     searching for, respectively, if the exact element cannot be found.
   */
  function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare, aBias) {
    // This function terminates when one of the following is true:
    //
    //   1. We find the exact element we are looking for.
    //
    //   2. We did not find the exact element, but we can return the index of
    //      the next-closest element.
    //
    //   3. We did not find the exact element, and there is no next-closest
    //      element than the one we are searching for, so we return -1.
    var mid = Math.floor((aHigh - aLow) / 2) + aLow;
    var cmp = aCompare(aNeedle, aHaystack[mid], true);
    if (cmp === 0) {
      // Found the element we are looking for.
      return mid;
    } else if (cmp > 0) {
      // Our needle is greater than aHaystack[mid].
      if (aHigh - mid > 1) {
        // The element is in the upper half.
        return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare, aBias);
      }

      // The exact needle element was not found in this haystack. Determine if
      // we are in termination case (3) or (2) and return the appropriate thing.
      if (aBias == exports.LEAST_UPPER_BOUND) {
        return aHigh < aHaystack.length ? aHigh : -1;
      }
      return mid;
    }

    // Our needle is less than aHaystack[mid].
    if (mid - aLow > 1) {
      // The element is in the lower half.
      return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare, aBias);
    }

    // we are in termination case (3) or (2) and return the appropriate thing.
    if (aBias == exports.LEAST_UPPER_BOUND) {
      return mid;
    }
    return aLow < 0 ? -1 : aLow;
  }

  /**
   * This is an implementation of binary search which will always try and return
   * the index of the closest element if there is no exact hit. This is because
   * mappings between original and generated line/col pairs are single points,
   * and there is an implicit region between each of them, so a miss just means
   * that you aren't on the very start of a region.
   *
   * @param aNeedle The element you are looking for.
   * @param aHaystack The array that is being searched.
   * @param aCompare A function which takes the needle and an element in the
   *     array and returns -1, 0, or 1 depending on whether the needle is less
   *     than, equal to, or greater than the element, respectively.
   * @param aBias Either 'binarySearch.GREATEST_LOWER_BOUND' or
   *     'binarySearch.LEAST_UPPER_BOUND'. Specifies whether to return the
   *     closest element that is smaller than or greater than the one we are
   *     searching for, respectively, if the exact element cannot be found.
   *     Defaults to 'binarySearch.GREATEST_LOWER_BOUND'.
   */
  exports.search = function search(aNeedle, aHaystack, aCompare, aBias) {
    if (aHaystack.length === 0) {
      return -1;
    }

    var index = recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack,
                                aCompare, aBias || exports.GREATEST_LOWER_BOUND);
    if (index < 0) {
      return -1;
    }

    // We have found either the exact element, or the next-closest element than
    // the one we are searching for. However, there may be more than one such
    // element. Make sure we always return the smallest of these.
    while (index - 1 >= 0) {
      if (aCompare(aHaystack[index], aHaystack[index - 1], true) !== 0) {
        break;
      }
      --index;
    }

    return index;
  };
  });
  var binarySearch_1 = binarySearch.GREATEST_LOWER_BOUND;
  var binarySearch_2 = binarySearch.LEAST_UPPER_BOUND;
  var binarySearch_3 = binarySearch.search;

  var readWasm = createCommonjsModule(function (module) {
  if (typeof fetch === "function") {
    // Web version of reading a wasm file into an array buffer.

    var mappingsWasmUrl = null;

    module.exports = function readWasm() {
      if (typeof mappingsWasmUrl !== "string") {
        throw new Error("You must provide the URL of lib/mappings.wasm by calling " +
                        "SourceMapConsumer.initialize({ 'lib/mappings.wasm': ... }) " +
                        "before using SourceMapConsumer");
      }

      return fetch(mappingsWasmUrl)
        .then(function (response) { return response.arrayBuffer(); });
    };

    module.exports.initialize = function (url) { return mappingsWasmUrl = url; };
  } else {
    // Node version of reading a wasm file into an array buffer.
    var fs$1 = fs;
    var path$1 = path;

    module.exports = function readWasm() {
      return new Promise(function (resolve, reject) {
        var wasmPath = path$1.join(__dirname, "mappings.wasm");
        fs$1.readFile(wasmPath, null, function (error, data) {
          if (error) {
            reject(error);
            return;
          }

          resolve(data.buffer);
        });
      });
    };

    module.exports.initialize = function (_) {
      console.debug("SourceMapConsumer.initialize is a no-op when running in node.js");
    };
  }
  });
  var readWasm_1 = readWasm.initialize;

  /**
   * Provide the JIT with a nice shape / hidden class.
   */
  function Mapping() {
    this.generatedLine = 0;
    this.generatedColumn = 0;
    this.lastGeneratedColumn = null;
    this.source = null;
    this.originalLine = null;
    this.originalColumn = null;
    this.name = null;
  }

  var cachedWasm = null;

  var wasm = function wasm() {
    if (cachedWasm) {
      return cachedWasm;
    }

    var callbackStack = [];

    cachedWasm = readWasm().then(function (buffer) {
        return WebAssembly.instantiate(buffer, {
          env: {
            mapping_callback: function mapping_callback(
              generatedLine,
              generatedColumn,

              hasLastGeneratedColumn,
              lastGeneratedColumn,

              hasOriginal,
              source,
              originalLine,
              originalColumn,

              hasName,
              name
            ) {
              var mapping = new Mapping();
              // JS uses 1-based line numbers, wasm uses 0-based.
              mapping.generatedLine = generatedLine + 1;
              mapping.generatedColumn = generatedColumn;

              if (hasLastGeneratedColumn) {
                // JS uses inclusive last generated column, wasm uses exclusive.
                mapping.lastGeneratedColumn = lastGeneratedColumn - 1;
              }

              if (hasOriginal) {
                mapping.source = source;
                // JS uses 1-based line numbers, wasm uses 0-based.
                mapping.originalLine = originalLine + 1;
                mapping.originalColumn = originalColumn;

                if (hasName) {
                  mapping.name = name;
                }
              }

              callbackStack[callbackStack.length - 1](mapping);
            },

            start_all_generated_locations_for: function start_all_generated_locations_for() { console.time("all_generated_locations_for"); },
            end_all_generated_locations_for: function end_all_generated_locations_for() { console.timeEnd("all_generated_locations_for"); },

            start_compute_column_spans: function start_compute_column_spans() { console.time("compute_column_spans"); },
            end_compute_column_spans: function end_compute_column_spans() { console.timeEnd("compute_column_spans"); },

            start_generated_location_for: function start_generated_location_for() { console.time("generated_location_for"); },
            end_generated_location_for: function end_generated_location_for() { console.timeEnd("generated_location_for"); },

            start_original_location_for: function start_original_location_for() { console.time("original_location_for"); },
            end_original_location_for: function end_original_location_for() { console.timeEnd("original_location_for"); },

            start_parse_mappings: function start_parse_mappings() { console.time("parse_mappings"); },
            end_parse_mappings: function end_parse_mappings() { console.timeEnd("parse_mappings"); },

            start_sort_by_generated_location: function start_sort_by_generated_location() { console.time("sort_by_generated_location"); },
            end_sort_by_generated_location: function end_sort_by_generated_location() { console.timeEnd("sort_by_generated_location"); },

            start_sort_by_original_location: function start_sort_by_original_location() { console.time("sort_by_original_location"); },
            end_sort_by_original_location: function end_sort_by_original_location() { console.timeEnd("sort_by_original_location"); },
          }
        });
    }).then(function (Wasm) {
      return {
        exports: Wasm.instance.exports,
        withMappingCallback: function (mappingCallback, f) {
          callbackStack.push(mappingCallback);
          try {
            f();
          } finally {
            callbackStack.pop();
          }
        }
      };
    }).then(null, function (e) {
      cachedWasm = null;
      throw e;
    });

    return cachedWasm;
  };

  /* -*- Mode: js; js-indent-level: 2; -*- */
  /*
   * Copyright 2011 Mozilla Foundation and contributors
   * Licensed under the New BSD license. See LICENSE or:
   * http://opensource.org/licenses/BSD-3-Clause
   */



  var ArraySet$2 = arraySet.ArraySet;
   // eslint-disable-line no-unused-vars



  var INTERNAL = Symbol("smcInternal");

  var SourceMapConsumer = function SourceMapConsumer(aSourceMap, aSourceMapURL) {
    // If the constructor was called by super(), just return Promise<this>.
    // Yes, this is a hack to retain the pre-existing API of the base-class
    // constructor also being an async factory function.
    if (aSourceMap == INTERNAL) {
      return Promise.resolve(this);
    }

    return _factory(aSourceMap, aSourceMapURL);
  };

  SourceMapConsumer.initialize = function initialize (opts) {
    readWasm.initialize(opts["lib/mappings.wasm"]);
  };

  SourceMapConsumer.fromSourceMap = function fromSourceMap (aSourceMap, aSourceMapURL) {
    return _factoryBSM(aSourceMap, aSourceMapURL);
  };

  /**
   * Construct a new `SourceMapConsumer` from `rawSourceMap` and `sourceMapUrl`
   * (see the `SourceMapConsumer` constructor for details. Then, invoke the `async
   * function f(SourceMapConsumer) -> T` with the newly constructed consumer, wait
   * for `f` to complete, call `destroy` on the consumer, and return `f`'s return
   * value.
   *
   * You must not use the consumer after `f` completes!
   *
   * By using `with`, you do not have to remember to manually call `destroy` on
   * the consumer, since it will be called automatically once `f` completes.
   *
   * ```js
   * const xSquared = await SourceMapConsumer.with(
   * myRawSourceMap,
   * null,
   * async function (consumer) {
   *   // Use `consumer` inside here and don't worry about remembering
   *   // to call `destroy`.
   *
   *   const x = await whatever(consumer);
   *   return x * x;
   * }
   * );
   *
   * // You may not use that `consumer` anymore out here; it has
   * // been destroyed. But you can use `xSquared`.
   * console.log(xSquared);
   * ```
   */
  SourceMapConsumer.with = function with$1 (rawSourceMap, sourceMapUrl, f) {
    // Note: The `acorn` version that `webpack` currently depends on doesn't
    // support `async` functions, and the nodes that we support don't all have
    // `.finally`. Therefore, this is written a bit more convolutedly than it
    // should really be.

    var consumer = null;
    var promise = new SourceMapConsumer(rawSourceMap, sourceMapUrl);
    return promise
      .then(function (c) {
        consumer = c;
        return f(c);
      })
      .then(function (x) {
        if (consumer) {
          consumer.destroy();
        }
        return x;
      }, function (e) {
        if (consumer) {
          consumer.destroy();
        }
        throw e;
      });
  };

  /**
   * Parse the mappings in a string in to a data structure which we can easily
   * query (the ordered arrays in the `this.__generatedMappings` and
   * `this.__originalMappings` properties).
   */
  SourceMapConsumer.prototype._parseMappings = function _parseMappings (aStr, aSourceRoot) {
    throw new Error("Subclasses must implement _parseMappings");
  };

  /**
   * Iterate over each mapping between an original source/line/column and a
   * generated line/column in this source map.
   *
   * @param Function aCallback
   *      The function that is called with each mapping.
   * @param Object aContext
   *      Optional. If specified, this object will be the value of `this` every
   *      time that `aCallback` is called.
   * @param aOrder
   *      Either `SourceMapConsumer.GENERATED_ORDER` or
   *      `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
   *      iterate over the mappings sorted by the generated file's line/column
   *      order or the original's source/line/column order, respectively. Defaults to
   *      `SourceMapConsumer.GENERATED_ORDER`.
   */
  SourceMapConsumer.prototype.eachMapping = function eachMapping (aCallback, aContext, aOrder) {
    throw new Error("Subclasses must implement eachMapping");
  };

  /**
   * Returns all generated line and column information for the original source,
   * line, and column provided. If no column is provided, returns all mappings
   * corresponding to a either the line we are searching for or the next
   * closest line that has any mappings. Otherwise, returns all mappings
   * corresponding to the given line and either the column we are searching for
   * or the next closest column that has any offsets.
   *
   * The only argument is an object with the following properties:
   *
   * - source: The filename of the original source.
   * - line: The line number in the original source.The line number is 1-based.
   * - column: Optional. the column number in the original source.
   *  The column number is 0-based.
   *
   * and an array of objects is returned, each with the following properties:
   *
   * - line: The line number in the generated source, or null.The
   *  line number is 1-based.
   * - column: The column number in the generated source, or null.
   *  The column number is 0-based.
   */
  SourceMapConsumer.prototype.allGeneratedPositionsFor = function allGeneratedPositionsFor (aArgs) {
    throw new Error("Subclasses must implement allGeneratedPositionsFor");
  };

  SourceMapConsumer.prototype.destroy = function destroy () {
    throw new Error("Subclasses must implement destroy");
  };

  /**
   * The version of the source mapping spec that we are consuming.
   */
  SourceMapConsumer.prototype._version = 3;
  SourceMapConsumer.GENERATED_ORDER = 1;
  SourceMapConsumer.ORIGINAL_ORDER = 2;

  SourceMapConsumer.GREATEST_LOWER_BOUND = 1;
  SourceMapConsumer.LEAST_UPPER_BOUND = 2;

  var SourceMapConsumer_1 = SourceMapConsumer;

  /**
   * A BasicSourceMapConsumer instance represents a parsed source map which we can
   * query for information about the original file positions by giving it a file
   * position in the generated source.
   *
   * The first parameter is the raw source map (either as a JSON string, or
   * already parsed to an object). According to the spec, source maps have the
   * following attributes:
   *
   *   - version: Which version of the source map spec this map is following.
   *   - sources: An array of URLs to the original source files.
   *   - names: An array of identifiers which can be referenced by individual mappings.
   *   - sourceRoot: Optional. The URL root from which all sources are relative.
   *   - sourcesContent: Optional. An array of contents of the original source files.
   *   - mappings: A string of base64 VLQs which contain the actual mappings.
   *   - file: Optional. The generated file this source map is associated with.
   *
   * Here is an example source map, taken from the source map spec[0]:
   *
   *     {
   *       version : 3,
   *       file: "out.js",
   *       sourceRoot : "",
   *       sources: ["foo.js", "bar.js"],
   *       names: ["src", "maps", "are", "fun"],
   *       mappings: "AA,AB;;ABCDE;"
   *     }
   *
   * The second parameter, if given, is a string whose value is the URL
   * at which the source map was found.  This URL is used to compute the
   * sources array.
   *
   * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
   */
  var BasicSourceMapConsumer = /*@__PURE__*/(function (SourceMapConsumer) {
    function BasicSourceMapConsumer(aSourceMap, aSourceMapURL) {
      return SourceMapConsumer.call(this, INTERNAL).then(function (that) {
        var sourceMap = aSourceMap;
        if (typeof aSourceMap === "string") {
          sourceMap = util$1.parseSourceMapInput(aSourceMap);
        }

        var version = util$1.getArg(sourceMap, "version");
        var sources = util$1.getArg(sourceMap, "sources");
        // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
        // requires the array) to play nice here.
        var names = util$1.getArg(sourceMap, "names", []);
        var sourceRoot = util$1.getArg(sourceMap, "sourceRoot", null);
        var sourcesContent = util$1.getArg(sourceMap, "sourcesContent", null);
        var mappings = util$1.getArg(sourceMap, "mappings");
        var file = util$1.getArg(sourceMap, "file", null);

        // Once again, Sass deviates from the spec and supplies the version as a
        // string rather than a number, so we use loose equality checking here.
        if (version != that._version) {
          throw new Error("Unsupported version: " + version);
        }

        if (sourceRoot) {
          sourceRoot = util$1.normalize(sourceRoot);
        }

        sources = sources
          .map(String)
          // Some source maps produce relative source paths like "./foo.js" instead of
          // "foo.js".  Normalize these first so that future comparisons will succeed.
          // See bugzil.la/1090768.
          .map(util$1.normalize)
          // Always ensure that absolute sources are internally stored relative to
          // the source root, if the source root is absolute. Not doing this would
          // be particularly problematic when the source root is a prefix of the
          // source (valid, but why??). See github issue #199 and bugzil.la/1188982.
          .map(function(source) {
            return sourceRoot && util$1.isAbsolute(sourceRoot) && util$1.isAbsolute(source)
              ? util$1.relative(sourceRoot, source)
              : source;
          });

        // Pass `true` below to allow duplicate names and sources. While source maps
        // are intended to be compressed and deduplicated, the TypeScript compiler
        // sometimes generates source maps with duplicates in them. See Github issue
        // #72 and bugzil.la/889492.
        that._names = ArraySet$2.fromArray(names.map(String), true);
        that._sources = ArraySet$2.fromArray(sources, true);

        that._absoluteSources = that._sources.toArray().map(function(s) {
          return util$1.computeSourceURL(sourceRoot, s, aSourceMapURL);
        });

        that.sourceRoot = sourceRoot;
        that.sourcesContent = sourcesContent;
        that._mappings = mappings;
        that._sourceMapURL = aSourceMapURL;
        that.file = file;

        that._computedColumnSpans = false;
        that._mappingsPtr = 0;
        that._wasm = null;

        return wasm().then(function (w) {
          that._wasm = w;
          return that;
        });
      });
    }

    if ( SourceMapConsumer ) BasicSourceMapConsumer.__proto__ = SourceMapConsumer;
    BasicSourceMapConsumer.prototype = Object.create( SourceMapConsumer && SourceMapConsumer.prototype );
    BasicSourceMapConsumer.prototype.constructor = BasicSourceMapConsumer;

    var prototypeAccessors = { sources: { configurable: true } };

    /**
     * Utility function to find the index of a source.  Returns -1 if not
     * found.
     */
    BasicSourceMapConsumer.prototype._findSourceIndex = function _findSourceIndex (aSource) {
      var relativeSource = aSource;
      if (this.sourceRoot != null) {
        relativeSource = util$1.relative(this.sourceRoot, relativeSource);
      }

      if (this._sources.has(relativeSource)) {
        return this._sources.indexOf(relativeSource);
      }

      // Maybe aSource is an absolute URL as returned by |sources|.  In
      // this case we can't simply undo the transform.
      for (var i = 0; i < this._absoluteSources.length; ++i) {
        if (this._absoluteSources[i] == aSource) {
          return i;
        }
      }

      return -1;
    };

    /**
     * Create a BasicSourceMapConsumer from a SourceMapGenerator.
     *
     * @param SourceMapGenerator aSourceMap
     *        The source map that will be consumed.
     * @param String aSourceMapURL
     *        The URL at which the source map can be found (optional)
     * @returns BasicSourceMapConsumer
     */
    BasicSourceMapConsumer.fromSourceMap = function fromSourceMap (aSourceMap, aSourceMapURL) {
      return new BasicSourceMapConsumer(aSourceMap.toString());
    };

    prototypeAccessors.sources.get = function () {
      return this._absoluteSources.slice();
    };

    BasicSourceMapConsumer.prototype._getMappingsPtr = function _getMappingsPtr () {
      if (this._mappingsPtr === 0) {
        this._parseMappings(this._mappings, this.sourceRoot);
      }

      return this._mappingsPtr;
    };

    /**
     * Parse the mappings in a string in to a data structure which we can easily
     * query (the ordered arrays in the `this.__generatedMappings` and
     * `this.__originalMappings` properties).
     */
    BasicSourceMapConsumer.prototype._parseMappings = function _parseMappings (aStr, aSourceRoot) {
      var size = aStr.length;

      var mappingsBufPtr = this._wasm.exports.allocate_mappings(size);
      var mappingsBuf = new Uint8Array(this._wasm.exports.memory.buffer, mappingsBufPtr, size);
      for (var i = 0; i < size; i++) {
        mappingsBuf[i] = aStr.charCodeAt(i);
      }

      var mappingsPtr = this._wasm.exports.parse_mappings(mappingsBufPtr);

      if (!mappingsPtr) {
        var error = this._wasm.exports.get_last_error();
        var msg = "Error parsing mappings (code " + error + "): ";

        // XXX: keep these error codes in sync with `fitzgen/source-map-mappings`.
        switch (error) {
          case 1:
            msg += "the mappings contained a negative line, column, source index, or name index";
            break;
          case 2:
            msg += "the mappings contained a number larger than 2**32";
            break;
          case 3:
            msg += "reached EOF while in the middle of parsing a VLQ";
            break;
          case 4:
            msg += "invalid base 64 character while parsing a VLQ";
            break;
          default:
            msg += "unknown error code";
            break;
        }

        throw new Error(msg);
      }

      this._mappingsPtr = mappingsPtr;
    };

    BasicSourceMapConsumer.prototype.eachMapping = function eachMapping (aCallback, aContext, aOrder) {
      var this$1 = this;

      var context = aContext || null;
      var order = aOrder || SourceMapConsumer.GENERATED_ORDER;
      var sourceRoot = this.sourceRoot;

      this._wasm.withMappingCallback(
        function (mapping) {
          if (mapping.source !== null) {
            mapping.source = this$1._sources.at(mapping.source);
            mapping.source = util$1.computeSourceURL(sourceRoot, mapping.source, this$1._sourceMapURL);

            if (mapping.name !== null) {
              mapping.name = this$1._names.at(mapping.name);
            }
          }

          aCallback.call(context, mapping);
        },
        function () {
          switch (order) {
          case SourceMapConsumer.GENERATED_ORDER:
            this$1._wasm.exports.by_generated_location(this$1._getMappingsPtr());
            break;
          case SourceMapConsumer.ORIGINAL_ORDER:
            this$1._wasm.exports.by_original_location(this$1._getMappingsPtr());
            break;
          default:
            throw new Error("Unknown order of iteration.");
          }
        }
      );
    };

    BasicSourceMapConsumer.prototype.allGeneratedPositionsFor = function allGeneratedPositionsFor (aArgs) {
      var this$1 = this;

      var source = util$1.getArg(aArgs, "source");
      var originalLine = util$1.getArg(aArgs, "line");
      var originalColumn = aArgs.column || 0;

      source = this._findSourceIndex(source);
      if (source < 0) {
        return [];
      }

      if (originalLine < 1) {
        throw new Error("Line numbers must be >= 1");
      }

      if (originalColumn < 0) {
        throw new Error("Column numbers must be >= 0");
      }

      var mappings = [];

      this._wasm.withMappingCallback(
        function (m) {
          var lastColumn = m.lastGeneratedColumn;
          if (this$1._computedColumnSpans && lastColumn === null) {
            lastColumn = Infinity;
          }
          mappings.push({
            line: m.generatedLine,
            column: m.generatedColumn,
            lastColumn: lastColumn,
          });
        }, function () {
          this$1._wasm.exports.all_generated_locations_for(
            this$1._getMappingsPtr(),
            source,
            originalLine - 1,
            "column" in aArgs,
            originalColumn
          );
        }
      );

      return mappings;
    };

    BasicSourceMapConsumer.prototype.destroy = function destroy () {
      if (this._mappingsPtr !== 0) {
        this._wasm.exports.free_mappings(this._mappingsPtr);
        this._mappingsPtr = 0;
      }
    };

    /**
     * Compute the last column for each generated mapping. The last column is
     * inclusive.
     */
    BasicSourceMapConsumer.prototype.computeColumnSpans = function computeColumnSpans () {
      if (this._computedColumnSpans) {
        return;
      }

      this._wasm.exports.compute_column_spans(this._getMappingsPtr());
      this._computedColumnSpans = true;
    };

    /**
     * Returns the original source, line, and column information for the generated
     * source's line and column positions provided. The only argument is an object
     * with the following properties:
     *
     *   - line: The line number in the generated source.  The line number
     *     is 1-based.
     *   - column: The column number in the generated source.  The column
     *     number is 0-based.
     *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
     *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
     *     closest element that is smaller than or greater than the one we are
     *     searching for, respectively, if the exact element cannot be found.
     *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
     *
     * and an object is returned with the following properties:
     *
     *   - source: The original source file, or null.
     *   - line: The line number in the original source, or null.  The
     *     line number is 1-based.
     *   - column: The column number in the original source, or null.  The
     *     column number is 0-based.
     *   - name: The original identifier, or null.
     */
    BasicSourceMapConsumer.prototype.originalPositionFor = function originalPositionFor (aArgs) {
      var this$1 = this;

      var needle = {
        generatedLine: util$1.getArg(aArgs, "line"),
        generatedColumn: util$1.getArg(aArgs, "column")
      };

      if (needle.generatedLine < 1) {
        throw new Error("Line numbers must be >= 1");
      }

      if (needle.generatedColumn < 0) {
        throw new Error("Column numbers must be >= 0");
      }

      var bias = util$1.getArg(aArgs, "bias", SourceMapConsumer.GREATEST_LOWER_BOUND);
      if (bias == null) {
        bias = SourceMapConsumer.GREATEST_LOWER_BOUND;
      }

      var mapping;
      this._wasm.withMappingCallback(function (m) { return mapping = m; }, function () {
        this$1._wasm.exports.original_location_for(
          this$1._getMappingsPtr(),
          needle.generatedLine - 1,
          needle.generatedColumn,
          bias
        );
      });

      if (mapping) {
        if (mapping.generatedLine === needle.generatedLine) {
          var source = util$1.getArg(mapping, "source", null);
          if (source !== null) {
            source = this._sources.at(source);
            source = util$1.computeSourceURL(this.sourceRoot, source, this._sourceMapURL);
          }

          var name = util$1.getArg(mapping, "name", null);
          if (name !== null) {
            name = this._names.at(name);
          }

          return {
            source: source,
            line: util$1.getArg(mapping, "originalLine", null),
            column: util$1.getArg(mapping, "originalColumn", null),
            name: name
          };
        }
      }

      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    };

    /**
     * Return true if we have the source content for every source in the source
     * map, false otherwise.
     */
    BasicSourceMapConsumer.prototype.hasContentsOfAllSources = function hasContentsOfAllSources () {
      if (!this.sourcesContent) {
        return false;
      }
      return this.sourcesContent.length >= this._sources.size() &&
        !this.sourcesContent.some(function(sc) { return sc == null; });
    };

    /**
     * Returns the original source content. The only argument is the url of the
     * original source file. Returns null if no original source content is
     * available.
     */
    BasicSourceMapConsumer.prototype.sourceContentFor = function sourceContentFor (aSource, nullOnMissing) {
      if (!this.sourcesContent) {
        return null;
      }

      var index = this._findSourceIndex(aSource);
      if (index >= 0) {
        return this.sourcesContent[index];
      }

      var relativeSource = aSource;
      if (this.sourceRoot != null) {
        relativeSource = util$1.relative(this.sourceRoot, relativeSource);
      }

      var url;
      if (this.sourceRoot != null
          && (url = util$1.urlParse(this.sourceRoot))) {
        // XXX: file:// URIs and absolute paths lead to unexpected behavior for
        // many users. We can help them out when they expect file:// URIs to
        // behave like it would if they were running a local HTTP server. See
        // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
        var fileUriAbsPath = relativeSource.replace(/^file:\/\//, "");
        if (url.scheme == "file"
            && this._sources.has(fileUriAbsPath)) {
          return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)];
        }

        if ((!url.path || url.path == "/")
            && this._sources.has("/" + relativeSource)) {
          return this.sourcesContent[this._sources.indexOf("/" + relativeSource)];
        }
      }

      // This function is used recursively from
      // IndexedSourceMapConsumer.prototype.sourceContentFor. In that case, we
      // don't want to throw if we can't find the source - we just want to
      // return null, so we provide a flag to exit gracefully.
      if (nullOnMissing) {
        return null;
      }

      throw new Error('"' + relativeSource + '" is not in the SourceMap.');
    };

    /**
     * Returns the generated line and column information for the original source,
     * line, and column positions provided. The only argument is an object with
     * the following properties:
     *
     *   - source: The filename of the original source.
     *   - line: The line number in the original source.  The line number
     *     is 1-based.
     *   - column: The column number in the original source.  The column
     *     number is 0-based.
     *   - bias: Either 'SourceMapConsumer.GREATEST_LOWER_BOUND' or
     *     'SourceMapConsumer.LEAST_UPPER_BOUND'. Specifies whether to return the
     *     closest element that is smaller than or greater than the one we are
     *     searching for, respectively, if the exact element cannot be found.
     *     Defaults to 'SourceMapConsumer.GREATEST_LOWER_BOUND'.
     *
     * and an object is returned with the following properties:
     *
     *   - line: The line number in the generated source, or null.  The
     *     line number is 1-based.
     *   - column: The column number in the generated source, or null.
     *     The column number is 0-based.
     */
    BasicSourceMapConsumer.prototype.generatedPositionFor = function generatedPositionFor (aArgs) {
      var this$1 = this;

      var source = util$1.getArg(aArgs, "source");
      source = this._findSourceIndex(source);
      if (source < 0) {
        return {
          line: null,
          column: null,
          lastColumn: null
        };
      }

      var needle = {
        source: source,
        originalLine: util$1.getArg(aArgs, "line"),
        originalColumn: util$1.getArg(aArgs, "column")
      };

      if (needle.originalLine < 1) {
        throw new Error("Line numbers must be >= 1");
      }

      if (needle.originalColumn < 0) {
        throw new Error("Column numbers must be >= 0");
      }

      var bias = util$1.getArg(aArgs, "bias", SourceMapConsumer.GREATEST_LOWER_BOUND);
      if (bias == null) {
        bias = SourceMapConsumer.GREATEST_LOWER_BOUND;
      }

      var mapping;
      this._wasm.withMappingCallback(function (m) { return mapping = m; }, function () {
        this$1._wasm.exports.generated_location_for(
          this$1._getMappingsPtr(),
          needle.source,
          needle.originalLine - 1,
          needle.originalColumn,
          bias
        );
      });

      if (mapping) {
        if (mapping.source === needle.source) {
          var lastColumn = mapping.lastGeneratedColumn;
          if (this._computedColumnSpans && lastColumn === null) {
            lastColumn = Infinity;
          }
          return {
            line: util$1.getArg(mapping, "generatedLine", null),
            column: util$1.getArg(mapping, "generatedColumn", null),
            lastColumn: lastColumn,
          };
        }
      }

      return {
        line: null,
        column: null,
        lastColumn: null
      };
    };

    Object.defineProperties( BasicSourceMapConsumer.prototype, prototypeAccessors );

    return BasicSourceMapConsumer;
  }(SourceMapConsumer));

  BasicSourceMapConsumer.prototype.consumer = SourceMapConsumer;
  var BasicSourceMapConsumer_1 = BasicSourceMapConsumer;

  /**
   * An IndexedSourceMapConsumer instance represents a parsed source map which
   * we can query for information. It differs from BasicSourceMapConsumer in
   * that it takes "indexed" source maps (i.e. ones with a "sections" field) as
   * input.
   *
   * The first parameter is a raw source map (either as a JSON string, or already
   * parsed to an object). According to the spec for indexed source maps, they
   * have the following attributes:
   *
   *   - version: Which version of the source map spec this map is following.
   *   - file: Optional. The generated file this source map is associated with.
   *   - sections: A list of section definitions.
   *
   * Each value under the "sections" field has two fields:
   *   - offset: The offset into the original specified at which this section
   *       begins to apply, defined as an object with a "line" and "column"
   *       field.
   *   - map: A source map definition. This source map could also be indexed,
   *       but doesn't have to be.
   *
   * Instead of the "map" field, it's also possible to have a "url" field
   * specifying a URL to retrieve a source map from, but that's currently
   * unsupported.
   *
   * Here's an example source map, taken from the source map spec[0], but
   * modified to omit a section which uses the "url" field.
   *
   *  {
   *    version : 3,
   *    file: "app.js",
   *    sections: [{
   *      offset: {line:100, column:10},
   *      map: {
   *        version : 3,
   *        file: "section.js",
   *        sources: ["foo.js", "bar.js"],
   *        names: ["src", "maps", "are", "fun"],
   *        mappings: "AAAA,E;;ABCDE;"
   *      }
   *    }],
   *  }
   *
   * The second parameter, if given, is a string whose value is the URL
   * at which the source map was found.  This URL is used to compute the
   * sources array.
   *
   * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.535es3xeprgt
   */
  var IndexedSourceMapConsumer = /*@__PURE__*/(function (SourceMapConsumer) {
    function IndexedSourceMapConsumer(aSourceMap, aSourceMapURL) {
      return SourceMapConsumer.call(this, INTERNAL).then(function (that) {
        var sourceMap = aSourceMap;
        if (typeof aSourceMap === "string") {
          sourceMap = util$1.parseSourceMapInput(aSourceMap);
        }

        var version = util$1.getArg(sourceMap, "version");
        var sections = util$1.getArg(sourceMap, "sections");

        if (version != that._version) {
          throw new Error("Unsupported version: " + version);
        }

        that._sources = new ArraySet$2();
        that._names = new ArraySet$2();
        that.__generatedMappings = null;
        that.__originalMappings = null;
        that.__generatedMappingsUnsorted = null;
        that.__originalMappingsUnsorted = null;

        var lastOffset = {
          line: -1,
          column: 0
        };
        return Promise.all(sections.map(function (s) {
          if (s.url) {
            // The url field will require support for asynchronicity.
            // See https://github.com/mozilla/source-map/issues/16
            throw new Error("Support for url field in sections not implemented.");
          }
          var offset = util$1.getArg(s, "offset");
          var offsetLine = util$1.getArg(offset, "line");
          var offsetColumn = util$1.getArg(offset, "column");

          if (offsetLine < lastOffset.line ||
              (offsetLine === lastOffset.line && offsetColumn < lastOffset.column)) {
            throw new Error("Section offsets must be ordered and non-overlapping.");
          }
          lastOffset = offset;

          var cons = new SourceMapConsumer(util$1.getArg(s, "map"), aSourceMapURL);
          return cons.then(function (consumer) {
            return {
              generatedOffset: {
                // The offset fields are 0-based, but we use 1-based indices when
                // encoding/decoding from VLQ.
                generatedLine: offsetLine + 1,
                generatedColumn: offsetColumn + 1
              },
              consumer: consumer
            };
          });
        })).then(function (s) {
          that._sections = s;
          return that;
        });
      });
    }

    if ( SourceMapConsumer ) IndexedSourceMapConsumer.__proto__ = SourceMapConsumer;
    IndexedSourceMapConsumer.prototype = Object.create( SourceMapConsumer && SourceMapConsumer.prototype );
    IndexedSourceMapConsumer.prototype.constructor = IndexedSourceMapConsumer;

    var prototypeAccessors$1 = { _generatedMappings: { configurable: true },_originalMappings: { configurable: true },_generatedMappingsUnsorted: { configurable: true },_originalMappingsUnsorted: { configurable: true },sources: { configurable: true } };

    // `__generatedMappings` and `__originalMappings` are arrays that hold the
    // parsed mapping coordinates from the source map's "mappings" attribute. They
    // are lazily instantiated, accessed via the `_generatedMappings` and
    // `_originalMappings` getters respectively, and we only parse the mappings
    // and create these arrays once queried for a source location. We jump through
    // these hoops because there can be many thousands of mappings, and parsing
    // them is expensive, so we only want to do it if we must.
    //
    // Each object in the arrays is of the form:
    //
    //     {
    //       generatedLine: The line number in the generated code,
    //       generatedColumn: The column number in the generated code,
    //       source: The path to the original source file that generated this
    //               chunk of code,
    //       originalLine: The line number in the original source that
    //                     corresponds to this chunk of generated code,
    //       originalColumn: The column number in the original source that
    //                       corresponds to this chunk of generated code,
    //       name: The name of the original symbol which generated this chunk of
    //             code.
    //     }
    //
    // All properties except for `generatedLine` and `generatedColumn` can be
    // `null`.
    //
    // `_generatedMappings` is ordered by the generated positions.
    //
    // `_originalMappings` is ordered by the original positions.
    prototypeAccessors$1._generatedMappings.get = function () {
      if (!this.__generatedMappings) {
        this._sortGeneratedMappings();
      }

      return this.__generatedMappings;
    };

    prototypeAccessors$1._originalMappings.get = function () {
      if (!this.__originalMappings) {
        this._sortOriginalMappings();
      }

      return this.__originalMappings;
    };

    prototypeAccessors$1._generatedMappingsUnsorted.get = function () {
      if (!this.__generatedMappingsUnsorted) {
        this._parseMappings(this._mappings, this.sourceRoot);
      }

      return this.__generatedMappingsUnsorted;
    };

    prototypeAccessors$1._originalMappingsUnsorted.get = function () {
      if (!this.__originalMappingsUnsorted) {
        this._parseMappings(this._mappings, this.sourceRoot);
      }

      return this.__originalMappingsUnsorted;
    };

    IndexedSourceMapConsumer.prototype._sortGeneratedMappings = function _sortGeneratedMappings () {
      var mappings = this._generatedMappingsUnsorted;
      mappings.sort(util$1.compareByGeneratedPositionsDeflated);
      this.__generatedMappings = mappings;
    };

    IndexedSourceMapConsumer.prototype._sortOriginalMappings = function _sortOriginalMappings () {
      var mappings = this._originalMappingsUnsorted;
      mappings.sort(util$1.compareByOriginalPositions);
      this.__originalMappings = mappings;
    };

    /**
     * The list of original sources.
     */
    prototypeAccessors$1.sources.get = function () {
      var sources = [];
      for (var i = 0; i < this._sections.length; i++) {
        for (var j = 0; j < this._sections[i].consumer.sources.length; j++) {
          sources.push(this._sections[i].consumer.sources[j]);
        }
      }
      return sources;
    };

    /**
     * Returns the original source, line, and column information for the generated
     * source's line and column positions provided. The only argument is an object
     * with the following properties:
     *
     *   - line: The line number in the generated source.  The line number
     *     is 1-based.
     *   - column: The column number in the generated source.  The column
     *     number is 0-based.
     *
     * and an object is returned with the following properties:
     *
     *   - source: The original source file, or null.
     *   - line: The line number in the original source, or null.  The
     *     line number is 1-based.
     *   - column: The column number in the original source, or null.  The
     *     column number is 0-based.
     *   - name: The original identifier, or null.
     */
    IndexedSourceMapConsumer.prototype.originalPositionFor = function originalPositionFor (aArgs) {
      var needle = {
        generatedLine: util$1.getArg(aArgs, "line"),
        generatedColumn: util$1.getArg(aArgs, "column")
      };

      // Find the section containing the generated position we're trying to map
      // to an original position.
      var sectionIndex = binarySearch.search(needle, this._sections,
        function(aNeedle, section) {
          var cmp = aNeedle.generatedLine - section.generatedOffset.generatedLine;
          if (cmp) {
            return cmp;
          }

          return (aNeedle.generatedColumn -
                  section.generatedOffset.generatedColumn);
        });
      var section = this._sections[sectionIndex];

      if (!section) {
        return {
          source: null,
          line: null,
          column: null,
          name: null
        };
      }

      return section.consumer.originalPositionFor({
        line: needle.generatedLine -
          (section.generatedOffset.generatedLine - 1),
        column: needle.generatedColumn -
          (section.generatedOffset.generatedLine === needle.generatedLine
           ? section.generatedOffset.generatedColumn - 1
           : 0),
        bias: aArgs.bias
      });
    };

    /**
     * Return true if we have the source content for every source in the source
     * map, false otherwise.
     */
    IndexedSourceMapConsumer.prototype.hasContentsOfAllSources = function hasContentsOfAllSources () {
      return this._sections.every(function(s) {
        return s.consumer.hasContentsOfAllSources();
      });
    };

    /**
     * Returns the original source content. The only argument is the url of the
     * original source file. Returns null if no original source content is
     * available.
     */
    IndexedSourceMapConsumer.prototype.sourceContentFor = function sourceContentFor (aSource, nullOnMissing) {
      for (var i = 0; i < this._sections.length; i++) {
        var section = this._sections[i];

        var content = section.consumer.sourceContentFor(aSource, true);
        if (content) {
          return content;
        }
      }
      if (nullOnMissing) {
        return null;
      }
      throw new Error('"' + aSource + '" is not in the SourceMap.');
    };

    /**
     * Returns the generated line and column information for the original source,
     * line, and column positions provided. The only argument is an object with
     * the following properties:
     *
     *   - source: The filename of the original source.
     *   - line: The line number in the original source.  The line number
     *     is 1-based.
     *   - column: The column number in the original source.  The column
     *     number is 0-based.
     *
     * and an object is returned with the following properties:
     *
     *   - line: The line number in the generated source, or null.  The
     *     line number is 1-based.
     *   - column: The column number in the generated source, or null.
     *     The column number is 0-based.
     */
    IndexedSourceMapConsumer.prototype.generatedPositionFor = function generatedPositionFor (aArgs) {
      for (var i = 0; i < this._sections.length; i++) {
        var section = this._sections[i];

        // Only consider this section if the requested source is in the list of
        // sources of the consumer.
        if (section.consumer._findSourceIndex(util$1.getArg(aArgs, "source")) === -1) {
          continue;
        }
        var generatedPosition = section.consumer.generatedPositionFor(aArgs);
        if (generatedPosition) {
          var ret = {
            line: generatedPosition.line +
              (section.generatedOffset.generatedLine - 1),
            column: generatedPosition.column +
              (section.generatedOffset.generatedLine === generatedPosition.line
               ? section.generatedOffset.generatedColumn - 1
               : 0)
          };
          return ret;
        }
      }

      return {
        line: null,
        column: null
      };
    };

    /**
     * Parse the mappings in a string in to a data structure which we can easily
     * query (the ordered arrays in the `this.__generatedMappings` and
     * `this.__originalMappings` properties).
     */
    IndexedSourceMapConsumer.prototype._parseMappings = function _parseMappings (aStr, aSourceRoot) {
      var this$1 = this;

      var generatedMappings = this.__generatedMappingsUnsorted = [];
      var originalMappings = this.__originalMappingsUnsorted = [];
      var loop = function ( i ) {
        var section = this$1._sections[i];

        var sectionMappings = [];
        section.consumer.eachMapping(function (m) { return sectionMappings.push(m); });

        for (var j = 0; j < sectionMappings.length; j++) {
          var mapping = sectionMappings[j];

          // TODO: test if null is correct here.  The original code used
          // `source`, which would actually have gotten used as null because
          // var's get hoisted.
          // See: https://github.com/mozilla/source-map/issues/333
          var source = util$1.computeSourceURL(section.consumer.sourceRoot, null, this$1._sourceMapURL);
          this$1._sources.add(source);
          source = this$1._sources.indexOf(source);

          var name = null;
          if (mapping.name) {
            this$1._names.add(mapping.name);
            name = this$1._names.indexOf(mapping.name);
          }

          // The mappings coming from the consumer for the section have
          // generated positions relative to the start of the section, so we
          // need to offset them to be relative to the start of the concatenated
          // generated file.
          var adjustedMapping = {
            source: source,
            generatedLine: mapping.generatedLine +
              (section.generatedOffset.generatedLine - 1),
            generatedColumn: mapping.generatedColumn +
              (section.generatedOffset.generatedLine === mapping.generatedLine
              ? section.generatedOffset.generatedColumn - 1
              : 0),
            originalLine: mapping.originalLine,
            originalColumn: mapping.originalColumn,
            name: name
          };

          generatedMappings.push(adjustedMapping);
          if (typeof adjustedMapping.originalLine === "number") {
            originalMappings.push(adjustedMapping);
          }
        }
      };

      for (var i = 0; i < this$1._sections.length; i++) loop( i );
    };

    IndexedSourceMapConsumer.prototype.eachMapping = function eachMapping (aCallback, aContext, aOrder) {
      var context = aContext || null;
      var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

      var mappings;
      switch (order) {
      case SourceMapConsumer.GENERATED_ORDER:
        mappings = this._generatedMappings;
        break;
      case SourceMapConsumer.ORIGINAL_ORDER:
        mappings = this._originalMappings;
        break;
      default:
        throw new Error("Unknown order of iteration.");
      }

      var sourceRoot = this.sourceRoot;
      mappings.map(function(mapping) {
        var source = null;
        if (mapping.source !== null) {
          source = this._sources.at(mapping.source);
          source = util$1.computeSourceURL(sourceRoot, source, this._sourceMapURL);
        }
        return {
          source: source,
          generatedLine: mapping.generatedLine,
          generatedColumn: mapping.generatedColumn,
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: mapping.name === null ? null : this._names.at(mapping.name)
        };
      }, this).forEach(aCallback, context);
    };

    /**
     * Find the mapping that best matches the hypothetical "needle" mapping that
     * we are searching for in the given "haystack" of mappings.
     */
    IndexedSourceMapConsumer.prototype._findMapping = function _findMapping (aNeedle, aMappings, aLineName,
                aColumnName, aComparator, aBias) {
      // To return the position we are searching for, we must first find the
      // mapping for the given position and then return the opposite position it
      // points to. Because the mappings are sorted, we can use binary search to
      // find the best mapping.

      if (aNeedle[aLineName] <= 0) {
        throw new TypeError("Line must be greater than or equal to 1, got "
                            + aNeedle[aLineName]);
      }
      if (aNeedle[aColumnName] < 0) {
        throw new TypeError("Column must be greater than or equal to 0, got "
                            + aNeedle[aColumnName]);
      }

      return binarySearch.search(aNeedle, aMappings, aComparator, aBias);
    };

    IndexedSourceMapConsumer.prototype.allGeneratedPositionsFor = function allGeneratedPositionsFor (aArgs) {
      var line = util$1.getArg(aArgs, "line");

      // When there is no exact match, BasicSourceMapConsumer.prototype._findMapping
      // returns the index of the closest mapping less than the needle. By
      // setting needle.originalColumn to 0, we thus find the last mapping for
      // the given line, provided such a mapping exists.
      var needle = {
        source: util$1.getArg(aArgs, "source"),
        originalLine: line,
        originalColumn: util$1.getArg(aArgs, "column", 0)
      };

      needle.source = this._findSourceIndex(needle.source);
      if (needle.source < 0) {
        return [];
      }

      if (needle.originalLine < 1) {
        throw new Error("Line numbers must be >= 1");
      }

      if (needle.originalColumn < 0) {
        throw new Error("Column numbers must be >= 0");
      }

      var mappings = [];

      var index = this._findMapping(needle,
                                    this._originalMappings,
                                    "originalLine",
                                    "originalColumn",
                                    util$1.compareByOriginalPositions,
                                    binarySearch.LEAST_UPPER_BOUND);
      if (index >= 0) {
        var mapping = this._originalMappings[index];

        if (aArgs.column === undefined) {
          var originalLine = mapping.originalLine;

          // Iterate until either we run out of mappings, or we run into
          // a mapping for a different line than the one we found. Since
          // mappings are sorted, this is guaranteed to find all mappings for
          // the line we found.
          while (mapping && mapping.originalLine === originalLine) {
            var lastColumn = mapping.lastGeneratedColumn;
            if (this._computedColumnSpans && lastColumn === null) {
              lastColumn = Infinity;
            }
            mappings.push({
              line: util$1.getArg(mapping, "generatedLine", null),
              column: util$1.getArg(mapping, "generatedColumn", null),
              lastColumn: lastColumn,
            });

            mapping = this._originalMappings[++index];
          }
        } else {
          var originalColumn = mapping.originalColumn;

          // Iterate until either we run out of mappings, or we run into
          // a mapping for a different line than the one we were searching for.
          // Since mappings are sorted, this is guaranteed to find all mappings for
          // the line we are searching for.
          while (mapping &&
                 mapping.originalLine === line &&
                 mapping.originalColumn == originalColumn) {
            var lastColumn$1 = mapping.lastGeneratedColumn;
            if (this._computedColumnSpans && lastColumn$1 === null) {
              lastColumn$1 = Infinity;
            }
            mappings.push({
              line: util$1.getArg(mapping, "generatedLine", null),
              column: util$1.getArg(mapping, "generatedColumn", null),
              lastColumn: lastColumn$1,
            });

            mapping = this._originalMappings[++index];
          }
        }
      }

      return mappings;
    };

    IndexedSourceMapConsumer.prototype.destroy = function destroy () {
      for (var i = 0; i < this._sections.length; i++) {
        this._sections[i].consumer.destroy();
      }
    };

    Object.defineProperties( IndexedSourceMapConsumer.prototype, prototypeAccessors$1 );

    return IndexedSourceMapConsumer;
  }(SourceMapConsumer));
  var IndexedSourceMapConsumer_1 = IndexedSourceMapConsumer;

  /*
   * Cheat to get around inter-twingled classes.  `factory()` can be at the end
   * where it has access to non-hoisted classes, but it gets hoisted itself.
   */
  function _factory(aSourceMap, aSourceMapURL) {
    var sourceMap = aSourceMap;
    if (typeof aSourceMap === "string") {
      sourceMap = util$1.parseSourceMapInput(aSourceMap);
    }

    var consumer = sourceMap.sections != null
        ? new IndexedSourceMapConsumer(sourceMap, aSourceMapURL)
        : new BasicSourceMapConsumer(sourceMap, aSourceMapURL);
    return Promise.resolve(consumer);
  }

  function _factoryBSM(aSourceMap, aSourceMapURL) {
    return BasicSourceMapConsumer.fromSourceMap(aSourceMap, aSourceMapURL);
  }

  var sourceMapConsumer = {
  	SourceMapConsumer: SourceMapConsumer_1,
  	BasicSourceMapConsumer: BasicSourceMapConsumer_1,
  	IndexedSourceMapConsumer: IndexedSourceMapConsumer_1
  };

  /* -*- Mode: js; js-indent-level: 2; -*- */
  /*
   * Copyright 2011 Mozilla Foundation and contributors
   * Licensed under the New BSD license. See LICENSE or:
   * http://opensource.org/licenses/BSD-3-Clause
   */

  var SourceMapGenerator$1 = sourceMapGenerator.SourceMapGenerator;


  // Matches a Windows-style `\r\n` newline or a `\n` newline used by all other
  // operating systems these days (capturing the result).
  var REGEX_NEWLINE = /(\r?\n)/;

  // Newline character code for charCodeAt() comparisons
  var NEWLINE_CODE = 10;

  // Private symbol for identifying `SourceNode`s when multiple versions of
  // the source-map library are loaded. This MUST NOT CHANGE across
  // versions!
  var isSourceNode = "$$$isSourceNode$$$";

  /**
   * SourceNodes provide a way to abstract over interpolating/concatenating
   * snippets of generated JavaScript source code while maintaining the line and
   * column information associated with the original source code.
   *
   * @param aLine The original line number.
   * @param aColumn The original column number.
   * @param aSource The original source's filename.
   * @param aChunks Optional. An array of strings which are snippets of
   *        generated JS, or other SourceNodes.
   * @param aName The original identifier.
   */
  var SourceNode = function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
    this.children = [];
    this.sourceContents = {};
    this.line = aLine == null ? null : aLine;
    this.column = aColumn == null ? null : aColumn;
    this.source = aSource == null ? null : aSource;
    this.name = aName == null ? null : aName;
    this[isSourceNode] = true;
    if (aChunks != null) { this.add(aChunks); }
  };

  /**
   * Creates a SourceNode from generated code and a SourceMapConsumer.
   *
   * @param aGeneratedCode The generated code
   * @param aSourceMapConsumer The SourceMap for the generated code
   * @param aRelativePath Optional. The path that relative sources in the
   *      SourceMapConsumer should be relative to.
   */
  SourceNode.fromStringWithSourceMap = function fromStringWithSourceMap (aGeneratedCode, aSourceMapConsumer, aRelativePath) {
    // The SourceNode we want to fill with the generated code
    // and the SourceMap
    var node = new SourceNode();

    // All even indices of this array are one line of the generated code,
    // while all odd indices are the newlines between two adjacent lines
    // (since `REGEX_NEWLINE` captures its match).
    // Processed fragments are accessed by calling `shiftNextLine`.
    var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
    var remainingLinesIndex = 0;
    var shiftNextLine = function() {
      var lineContents = getNextLine();
      // The last line of a file might not have a newline.
      var newLine = getNextLine() || "";
      return lineContents + newLine;

      function getNextLine() {
        return remainingLinesIndex < remainingLines.length ?
            remainingLines[remainingLinesIndex++] : undefined;
      }
    };

    // We need to remember the position of "remainingLines"
    var lastGeneratedLine = 1, lastGeneratedColumn = 0;

    // The generate SourceNodes we need a code range.
    // To extract it current and last mapping is used.
    // Here we store the last mapping.
    var lastMapping = null;
    var nextLine;

    aSourceMapConsumer.eachMapping(function(mapping) {
      if (lastMapping !== null) {
        // We add the code from "lastMapping" to "mapping":
        // First check if there is a new line in between.
        if (lastGeneratedLine < mapping.generatedLine) {
          // Associate first line with "lastMapping"
          addMappingWithCode(lastMapping, shiftNextLine());
          lastGeneratedLine++;
          lastGeneratedColumn = 0;
          // The remaining code is added without mapping
        } else {
          // There is no new line in between.
          // Associate the code between "lastGeneratedColumn" and
          // "mapping.generatedColumn" with "lastMapping"
          nextLine = remainingLines[remainingLinesIndex] || "";
          var code = nextLine.substr(0, mapping.generatedColumn -
                                        lastGeneratedColumn);
          remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn -
                                              lastGeneratedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
          addMappingWithCode(lastMapping, code);
          // No more remaining code, continue
          lastMapping = mapping;
          return;
        }
      }
      // We add the generated code until the first mapping
      // to the SourceNode without any mapping.
      // Each line is added as separate string.
      while (lastGeneratedLine < mapping.generatedLine) {
        node.add(shiftNextLine());
        lastGeneratedLine++;
      }
      if (lastGeneratedColumn < mapping.generatedColumn) {
        nextLine = remainingLines[remainingLinesIndex] || "";
        node.add(nextLine.substr(0, mapping.generatedColumn));
        remainingLines[remainingLinesIndex] = nextLine.substr(mapping.generatedColumn);
        lastGeneratedColumn = mapping.generatedColumn;
      }
      lastMapping = mapping;
    }, this);
    // We have processed all mappings.
    if (remainingLinesIndex < remainingLines.length) {
      if (lastMapping) {
        // Associate the remaining code in the current line with "lastMapping"
        addMappingWithCode(lastMapping, shiftNextLine());
      }
      // and add the remaining lines without any mapping
      node.add(remainingLines.splice(remainingLinesIndex).join(""));
    }

    // Copy sourcesContent into SourceNode
    aSourceMapConsumer.sources.forEach(function(sourceFile) {
      var content = aSourceMapConsumer.sourceContentFor(sourceFile);
      if (content != null) {
        if (aRelativePath != null) {
          sourceFile = util$1.join(aRelativePath, sourceFile);
        }
        node.setSourceContent(sourceFile, content);
      }
    });

    return node;

    function addMappingWithCode(mapping, code) {
      if (mapping === null || mapping.source === undefined) {
        node.add(code);
      } else {
        var source = aRelativePath
          ? util$1.join(aRelativePath, mapping.source)
          : mapping.source;
        node.add(new SourceNode(mapping.originalLine,
                                mapping.originalColumn,
                                source,
                                code,
                                mapping.name));
      }
    }
  };

  /**
   * Add a chunk of generated JS to this source node.
   *
   * @param aChunk A string snippet of generated JS code, another instance of
   *      SourceNode, or an array where each member is one of those things.
   */
  SourceNode.prototype.add = function add (aChunk) {
    if (Array.isArray(aChunk)) {
      aChunk.forEach(function(chunk) {
        this.add(chunk);
      }, this);
    } else if (aChunk[isSourceNode] || typeof aChunk === "string") {
      if (aChunk) {
        this.children.push(aChunk);
      }
    } else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  };

  /**
   * Add a chunk of generated JS to the beginning of this source node.
   *
   * @param aChunk A string snippet of generated JS code, another instance of
   *      SourceNode, or an array where each member is one of those things.
   */
  SourceNode.prototype.prepend = function prepend (aChunk) {
    if (Array.isArray(aChunk)) {
      for (var i = aChunk.length - 1; i >= 0; i--) {
        this.prepend(aChunk[i]);
      }
    } else if (aChunk[isSourceNode] || typeof aChunk === "string") {
      this.children.unshift(aChunk);
    } else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  };

  /**
   * Walk over the tree of JS snippets in this node and its children. The
   * walking function is called once for each snippet of JS and is passed that
   * snippet and the its original associated source's line/column location.
   *
   * @param aFn The traversal function.
   */
  SourceNode.prototype.walk = function walk (aFn) {
    var chunk;
    for (var i = 0, len = this.children.length; i < len; i++) {
      chunk = this.children[i];
      if (chunk[isSourceNode]) {
        chunk.walk(aFn);
      } else if (chunk !== "") {
        aFn(chunk, { source: this.source,
                      line: this.line,
                      column: this.column,
                      name: this.name });
      }
    }
  };

  /**
   * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
   * each of `this.children`.
   *
   * @param aSep The separator.
   */
  SourceNode.prototype.join = function join (aSep) {
    var newChildren;
    var i;
    var len = this.children.length;
    if (len > 0) {
      newChildren = [];
      for (i = 0; i < len - 1; i++) {
        newChildren.push(this.children[i]);
        newChildren.push(aSep);
      }
      newChildren.push(this.children[i]);
      this.children = newChildren;
    }
    return this;
  };

  /**
   * Call String.prototype.replace on the very right-most source snippet. Useful
   * for trimming whitespace from the end of a source node, etc.
   *
   * @param aPattern The pattern to replace.
   * @param aReplacement The thing to replace the pattern with.
   */
  SourceNode.prototype.replaceRight = function replaceRight (aPattern, aReplacement) {
    var lastChild = this.children[this.children.length - 1];
    if (lastChild[isSourceNode]) {
      lastChild.replaceRight(aPattern, aReplacement);
    } else if (typeof lastChild === "string") {
      this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
    } else {
      this.children.push("".replace(aPattern, aReplacement));
    }
    return this;
  };

  /**
   * Set the source content for a source file. This will be added to the SourceMapGenerator
   * in the sourcesContent field.
   *
   * @param aSourceFile The filename of the source file
   * @param aSourceContent The content of the source file
   */
  SourceNode.prototype.setSourceContent = function setSourceContent (aSourceFile, aSourceContent) {
    this.sourceContents[util$1.toSetString(aSourceFile)] = aSourceContent;
  };

  /**
   * Walk over the tree of SourceNodes. The walking function is called for each
   * source file content and is passed the filename and source content.
   *
   * @param aFn The traversal function.
   */
  SourceNode.prototype.walkSourceContents = function walkSourceContents (aFn) {
    for (var i = 0, len = this.children.length; i < len; i++) {
      if (this.children[i][isSourceNode]) {
        this.children[i].walkSourceContents(aFn);
      }
    }

    var sources = Object.keys(this.sourceContents);
    for (var i$1 = 0, len$1 = sources.length; i$1 < len$1; i$1++) {
      aFn(util$1.fromSetString(sources[i$1]), this.sourceContents[sources[i$1]]);
    }
  };

  /**
   * Return the string representation of this source node. Walks over the tree
   * and concatenates all the various snippets together to one string.
   */
  SourceNode.prototype.toString = function toString () {
    var str = "";
    this.walk(function(chunk) {
      str += chunk;
    });
    return str;
  };

  /**
   * Returns the string representation of this source node along with a source
   * map.
   */
  SourceNode.prototype.toStringWithSourceMap = function toStringWithSourceMap (aArgs) {
    var generated = {
      code: "",
      line: 1,
      column: 0
    };
    var map = new SourceMapGenerator$1(aArgs);
    var sourceMappingActive = false;
    var lastOriginalSource = null;
    var lastOriginalLine = null;
    var lastOriginalColumn = null;
    var lastOriginalName = null;
    this.walk(function(chunk, original) {
      generated.code += chunk;
      if (original.source !== null
          && original.line !== null
          && original.column !== null) {
        if (lastOriginalSource !== original.source
          || lastOriginalLine !== original.line
          || lastOriginalColumn !== original.column
          || lastOriginalName !== original.name) {
          map.addMapping({
            source: original.source,
            original: {
              line: original.line,
              column: original.column
            },
            generated: {
              line: generated.line,
              column: generated.column
            },
            name: original.name
          });
        }
        lastOriginalSource = original.source;
        lastOriginalLine = original.line;
        lastOriginalColumn = original.column;
        lastOriginalName = original.name;
        sourceMappingActive = true;
      } else if (sourceMappingActive) {
        map.addMapping({
          generated: {
            line: generated.line,
            column: generated.column
          }
        });
        lastOriginalSource = null;
        sourceMappingActive = false;
      }
      for (var idx = 0, length = chunk.length; idx < length; idx++) {
        if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
          generated.line++;
          generated.column = 0;
          // Mappings end at eol
          if (idx + 1 === length) {
            lastOriginalSource = null;
            sourceMappingActive = false;
          } else if (sourceMappingActive) {
            map.addMapping({
              source: original.source,
              original: {
                line: original.line,
                column: original.column
              },
              generated: {
                line: generated.line,
                column: generated.column
              },
              name: original.name
            });
          }
        } else {
          generated.column++;
        }
      }
    });
    this.walkSourceContents(function(sourceFile, sourceContent) {
      map.setSourceContent(sourceFile, sourceContent);
    });

    return { code: generated.code, map: map };
  };

  var SourceNode_1 = SourceNode;

  var sourceNode = {
  	SourceNode: SourceNode_1
  };

  /*
   * Copyright 2009-2011 Mozilla Foundation and contributors
   * Licensed under the New BSD license. See LICENSE.txt or:
   * http://opensource.org/licenses/BSD-3-Clause
   */
  var SourceMapGenerator$2 = sourceMapGenerator.SourceMapGenerator;
  var SourceMapConsumer$1 = sourceMapConsumer.SourceMapConsumer;
  var SourceNode$1 = sourceNode.SourceNode;

  var sourceMap = {
  	SourceMapGenerator: SourceMapGenerator$2,
  	SourceMapConsumer: SourceMapConsumer$1,
  	SourceNode: SourceNode$1
  };

  var _from = "escodegen@~0.0.24";
  var _id = "escodegen@0.0.28";
  var _inBundle = false;
  var _integrity = "sha1-Dk/xcV8yh3XWyrUaxEpAbNer/9M=";
  var _location = "/static-eval/escodegen";
  var _phantomChildren = {
  };
  var _requested = {
  	type: "range",
  	registry: true,
  	raw: "escodegen@~0.0.24",
  	name: "escodegen",
  	escapedName: "escodegen",
  	rawSpec: "~0.0.24",
  	saveSpec: null,
  	fetchSpec: "~0.0.24"
  };
  var _requiredBy = [
  	"/static-eval"
  ];
  var _resolved = "https://registry.npmjs.org/escodegen/-/escodegen-0.0.28.tgz";
  var _shasum = "0e4ff1715f328775d6cab51ac44a406cd7abffd3";
  var _spec = "escodegen@~0.0.24";
  var _where = "/Users/alvarius/Repositories/json-schema-faker/node_modules/static-eval";
  var bin = {
  	esgenerate: "./bin/esgenerate.js",
  	escodegen: "./bin/escodegen.js"
  };
  var bugs = {
  	url: "https://github.com/Constellation/escodegen/issues"
  };
  var bundleDependencies = false;
  var dependencies = {
  	esprima: "~1.0.2",
  	estraverse: "~1.3.0",
  	"source-map": ">= 0.1.2"
  };
  var deprecated$1 = false;
  var description = "ECMAScript code generator";
  var devDependencies = {
  	bower: "*",
  	chai: "~1.7.2",
  	"commonjs-everywhere": "~0.8.0",
  	"esprima-moz": "*",
  	grunt: "~0.4.1",
  	"grunt-cli": "~0.1.9",
  	"grunt-contrib-jshint": "~0.5.0",
  	"grunt-mocha-test": "~0.6.2",
  	q: "*",
  	semver: "*"
  };
  var engines = {
  	node: ">=0.4.0"
  };
  var homepage = "http://github.com/Constellation/escodegen.html";
  var licenses = [
  	{
  		type: "BSD",
  		url: "http://github.com/Constellation/escodegen/raw/master/LICENSE.BSD"
  	}
  ];
  var main = "escodegen.js";
  var maintainers = [
  	{
  		name: "Yusuke Suzuki",
  		email: "utatane.tea@gmail.com",
  		url: "http://github.com/Constellation"
  	}
  ];
  var name = "escodegen";
  var optionalDependencies = {
  	"source-map": ">= 0.1.2"
  };
  var repository = {
  	type: "git",
  	url: "git+ssh://git@github.com/Constellation/escodegen.git"
  };
  var scripts = {
  	build: "cjsify -a path: tools/entry-point.js > escodegen.browser.js",
  	"build-min": "cjsify -ma path: tools/entry-point.js > escodegen.browser.min.js",
  	lint: "grunt lint",
  	release: "node tools/release.js",
  	test: "grunt travis",
  	"unit-test": "grunt test"
  };
  var version = "0.0.28";
  var _package = {
  	_from: _from,
  	_id: _id,
  	_inBundle: _inBundle,
  	_integrity: _integrity,
  	_location: _location,
  	_phantomChildren: _phantomChildren,
  	_requested: _requested,
  	_requiredBy: _requiredBy,
  	_resolved: _resolved,
  	_shasum: _shasum,
  	_spec: _spec,
  	_where: _where,
  	bin: bin,
  	bugs: bugs,
  	bundleDependencies: bundleDependencies,
  	dependencies: dependencies,
  	deprecated: deprecated$1,
  	description: description,
  	devDependencies: devDependencies,
  	engines: engines,
  	homepage: homepage,
  	licenses: licenses,
  	main: main,
  	maintainers: maintainers,
  	name: name,
  	optionalDependencies: optionalDependencies,
  	repository: repository,
  	scripts: scripts,
  	version: version
  };

  var _package$1 = /*#__PURE__*/Object.freeze({
    _from: _from,
    _id: _id,
    _inBundle: _inBundle,
    _integrity: _integrity,
    _location: _location,
    _phantomChildren: _phantomChildren,
    _requested: _requested,
    _requiredBy: _requiredBy,
    _resolved: _resolved,
    _shasum: _shasum,
    _spec: _spec,
    _where: _where,
    bin: bin,
    bugs: bugs,
    bundleDependencies: bundleDependencies,
    dependencies: dependencies,
    deprecated: deprecated$1,
    description: description,
    devDependencies: devDependencies,
    engines: engines,
    homepage: homepage,
    licenses: licenses,
    main: main,
    maintainers: maintainers,
    name: name,
    optionalDependencies: optionalDependencies,
    repository: repository,
    scripts: scripts,
    version: version,
    default: _package
  });

  var require$$2 = getCjsExportFromNamespace(_package$1);

  var escodegen = createCommonjsModule(function (module, exports) {
  /*
    Copyright (C) 2012-2013 Yusuke Suzuki <utatane.tea@gmail.com>
    Copyright (C) 2012-2013 Michael Ficarra <escodegen.copyright@michael.ficarra.me>
    Copyright (C) 2012-2013 Mathias Bynens <mathias@qiwi.be>
    Copyright (C) 2013 Irakli Gozalishvili <rfobic@gmail.com>
    Copyright (C) 2012 Robert Gust-Bardon <donate@robert.gust-bardon.org>
    Copyright (C) 2012 John Freeman <jfreeman08@gmail.com>
    Copyright (C) 2011-2012 Ariya Hidayat <ariya.hidayat@gmail.com>
    Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
    Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
    Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are met:

      * Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.
      * Redistributions in binary form must reproduce the above copyright
        notice, this list of conditions and the following disclaimer in the
        documentation and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
    AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
    ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
    DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
    (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
    LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
    ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
    (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
    THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
  */

  /*global exports:true, generateStatement:true, generateExpression:true, require:true, global:true*/
  (function () {

      var Syntax,
          Precedence,
          BinaryPrecedence,
          Regex,
          SourceNode,
          estraverse$1,
          isArray,
          base,
          indent,
          json,
          renumber,
          hexadecimal,
          quotes,
          escapeless,
          newline,
          space,
          parentheses,
          semicolons,
          safeConcatenation,
          directive,
          extra,
          parse,
          sourceMap$1,
          FORMAT_MINIFY,
          FORMAT_DEFAULTS;

      estraverse$1 = estraverse;

      Syntax = {
          AssignmentExpression: 'AssignmentExpression',
          ArrayExpression: 'ArrayExpression',
          ArrayPattern: 'ArrayPattern',
          ArrowFunctionExpression: 'ArrowFunctionExpression',
          BlockStatement: 'BlockStatement',
          BinaryExpression: 'BinaryExpression',
          BreakStatement: 'BreakStatement',
          CallExpression: 'CallExpression',
          CatchClause: 'CatchClause',
          ComprehensionBlock: 'ComprehensionBlock',
          ComprehensionExpression: 'ComprehensionExpression',
          ConditionalExpression: 'ConditionalExpression',
          ContinueStatement: 'ContinueStatement',
          DirectiveStatement: 'DirectiveStatement',
          DoWhileStatement: 'DoWhileStatement',
          DebuggerStatement: 'DebuggerStatement',
          EmptyStatement: 'EmptyStatement',
          ExpressionStatement: 'ExpressionStatement',
          ForStatement: 'ForStatement',
          ForInStatement: 'ForInStatement',
          FunctionDeclaration: 'FunctionDeclaration',
          FunctionExpression: 'FunctionExpression',
          Identifier: 'Identifier',
          IfStatement: 'IfStatement',
          Literal: 'Literal',
          LabeledStatement: 'LabeledStatement',
          LogicalExpression: 'LogicalExpression',
          MemberExpression: 'MemberExpression',
          NewExpression: 'NewExpression',
          ObjectExpression: 'ObjectExpression',
          ObjectPattern: 'ObjectPattern',
          Program: 'Program',
          Property: 'Property',
          ReturnStatement: 'ReturnStatement',
          SequenceExpression: 'SequenceExpression',
          SwitchStatement: 'SwitchStatement',
          SwitchCase: 'SwitchCase',
          ThisExpression: 'ThisExpression',
          ThrowStatement: 'ThrowStatement',
          TryStatement: 'TryStatement',
          UnaryExpression: 'UnaryExpression',
          UpdateExpression: 'UpdateExpression',
          VariableDeclaration: 'VariableDeclaration',
          VariableDeclarator: 'VariableDeclarator',
          WhileStatement: 'WhileStatement',
          WithStatement: 'WithStatement',
          YieldExpression: 'YieldExpression'

      };

      Precedence = {
          Sequence: 0,
          Assignment: 1,
          Conditional: 2,
          ArrowFunction: 2,
          LogicalOR: 3,
          LogicalAND: 4,
          BitwiseOR: 5,
          BitwiseXOR: 6,
          BitwiseAND: 7,
          Equality: 8,
          Relational: 9,
          BitwiseSHIFT: 10,
          Additive: 11,
          Multiplicative: 12,
          Unary: 13,
          Postfix: 14,
          Call: 15,
          New: 16,
          Member: 17,
          Primary: 18
      };

      BinaryPrecedence = {
          '||': Precedence.LogicalOR,
          '&&': Precedence.LogicalAND,
          '|': Precedence.BitwiseOR,
          '^': Precedence.BitwiseXOR,
          '&': Precedence.BitwiseAND,
          '==': Precedence.Equality,
          '!=': Precedence.Equality,
          '===': Precedence.Equality,
          '!==': Precedence.Equality,
          'is': Precedence.Equality,
          'isnt': Precedence.Equality,
          '<': Precedence.Relational,
          '>': Precedence.Relational,
          '<=': Precedence.Relational,
          '>=': Precedence.Relational,
          'in': Precedence.Relational,
          'instanceof': Precedence.Relational,
          '<<': Precedence.BitwiseSHIFT,
          '>>': Precedence.BitwiseSHIFT,
          '>>>': Precedence.BitwiseSHIFT,
          '+': Precedence.Additive,
          '-': Precedence.Additive,
          '*': Precedence.Multiplicative,
          '%': Precedence.Multiplicative,
          '/': Precedence.Multiplicative
      };

      Regex = {
          NonAsciiIdentifierPart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u0487\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u05d0-\u05ea\u05f0-\u05f2\u0610-\u061a\u0620-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u0800-\u082d\u0840-\u085b\u08a0\u08a2-\u08ac\u08e4-\u08fe\u0900-\u0963\u0966-\u096f\u0971-\u0977\u0979-\u097f\u0981-\u0983\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7\u09c8\u09cb-\u09ce\u09d7\u09dc\u09dd\u09df-\u09e3\u09e6-\u09f1\u0a01-\u0a03\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5c\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71\u0b82\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c58\u0c59\u0c60-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0cf1\u0cf2\u0d02\u0d03\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d-\u0d44\u0d46-\u0d48\u0d4a-\u0d4e\u0d57\u0d60-\u0d63\u0d66-\u0d6f\u0d7a-\u0d7f\u0d82\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb9\u0ebb-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ecd\u0ed0-\u0ed9\u0edc-\u0edf\u0f00\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u109d\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135d-\u135f\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772\u1773\u1780-\u17d3\u17d7\u17dc\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1820-\u1877\u1880-\u18aa\u18b0-\u18f5\u1900-\u191c\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u19d0-\u19d9\u1a00-\u1a1b\u1a20-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1aa7\u1b00-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1bf3\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1cd0-\u1cd2\u1cd4-\u1cf6\u1d00-\u1de6\u1dfc-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u200c\u200d\u203f\u2040\u2054\u2071\u207f\u2090-\u209c\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d7f-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u2e2f\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099\u309a\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua62b\ua640-\ua66f\ua674-\ua67d\ua67f-\ua697\ua69f-\ua6f1\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua827\ua840-\ua873\ua880-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f7\ua8fb\ua900-\ua92d\ua930-\ua953\ua960-\ua97c\ua980-\ua9c0\ua9cf-\ua9d9\uaa00-\uaa36\uaa40-\uaa4d\uaa50-\uaa59\uaa60-\uaa76\uaa7a\uaa7b\uaa80-\uaac2\uaadb-\uaadd\uaae0-\uaaef\uaaf2-\uaaf6\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabea\uabec\uabed\uabf0-\uabf9\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff3f\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]')
      };

      function getDefaultOptions() {
          // default options
          return {
              indent: null,
              base: null,
              parse: null,
              comment: false,
              format: {
                  indent: {
                      style: '    ',
                      base: 0,
                      adjustMultilineComment: false
                  },
                  newline: '\n',
                  space: ' ',
                  json: false,
                  renumber: false,
                  hexadecimal: false,
                  quotes: 'single',
                  escapeless: false,
                  compact: false,
                  parentheses: true,
                  semicolons: true,
                  safeConcatenation: false
              },
              moz: {
                  starlessGenerator: false,
                  parenthesizedComprehensionBlock: false
              },
              sourceMap: null,
              sourceMapRoot: null,
              sourceMapWithCode: false,
              directive: false,
              verbatim: null
          };
      }

      function stringToArray(str) {
          var length = str.length,
              result = [],
              i;
          for (i = 0; i < length; i += 1) {
              result[i] = str.charAt(i);
          }
          return result;
      }

      function stringRepeat(str, num) {
          var result = '';

          for (num |= 0; num > 0; num >>>= 1, str += str) {
              if (num & 1) {
                  result += str;
              }
          }

          return result;
      }

      isArray = Array.isArray;
      if (!isArray) {
          isArray = function isArray(array) {
              return Object.prototype.toString.call(array) === '[object Array]';
          };
      }

      // Fallback for the non SourceMap environment
      function SourceNodeMock(line, column, filename, chunk) {
          var result = [];

          function flatten(input) {
              var i, iz;
              if (isArray(input)) {
                  for (i = 0, iz = input.length; i < iz; ++i) {
                      flatten(input[i]);
                  }
              } else if (input instanceof SourceNodeMock) {
                  result.push(input);
              } else if (typeof input === 'string' && input) {
                  result.push(input);
              }
          }

          flatten(chunk);
          this.children = result;
      }

      SourceNodeMock.prototype.toString = function toString() {
          var res = '', i, iz, node;
          for (i = 0, iz = this.children.length; i < iz; ++i) {
              node = this.children[i];
              if (node instanceof SourceNodeMock) {
                  res += node.toString();
              } else {
                  res += node;
              }
          }
          return res;
      };

      SourceNodeMock.prototype.replaceRight = function replaceRight(pattern, replacement) {
          var last = this.children[this.children.length - 1];
          if (last instanceof SourceNodeMock) {
              last.replaceRight(pattern, replacement);
          } else if (typeof last === 'string') {
              this.children[this.children.length - 1] = last.replace(pattern, replacement);
          } else {
              this.children.push(''.replace(pattern, replacement));
          }
          return this;
      };

      SourceNodeMock.prototype.join = function join(sep) {
          var i, iz, result;
          result = [];
          iz = this.children.length;
          if (iz > 0) {
              for (i = 0, iz -= 1; i < iz; ++i) {
                  result.push(this.children[i], sep);
              }
              result.push(this.children[iz]);
              this.children = result;
          }
          return this;
      };

      function hasLineTerminator(str) {
          return (/[\r\n]/g).test(str);
      }

      function endsWithLineTerminator(str) {
          var ch = str.charAt(str.length - 1);
          return ch && isLineTerminator(ch);
      }

      function updateDeeply(target, override) {
          var key, val;

          function isHashObject(target) {
              return typeof target === 'object' && target instanceof Object && !(target instanceof RegExp);
          }

          for (key in override) {
              if (override.hasOwnProperty(key)) {
                  val = override[key];
                  if (isHashObject(val)) {
                      if (isHashObject(target[key])) {
                          updateDeeply(target[key], val);
                      } else {
                          target[key] = updateDeeply({}, val);
                      }
                  } else {
                      target[key] = val;
                  }
              }
          }
          return target;
      }

      function generateNumber(value) {
          var result, point, temp, exponent, pos;

          if (value !== value) {
              throw new Error('Numeric literal whose value is NaN');
          }
          if (value < 0 || (value === 0 && 1 / value < 0)) {
              throw new Error('Numeric literal whose value is negative');
          }

          if (value === 1 / 0) {
              return json ? 'null' : renumber ? '1e400' : '1e+400';
          }

          result = '' + value;
          if (!renumber || result.length < 3) {
              return result;
          }

          point = result.indexOf('.');
          if (!json && result.charAt(0) === '0' && point === 1) {
              point = 0;
              result = result.slice(1);
          }
          temp = result;
          result = result.replace('e+', 'e');
          exponent = 0;
          if ((pos = temp.indexOf('e')) > 0) {
              exponent = +temp.slice(pos + 1);
              temp = temp.slice(0, pos);
          }
          if (point >= 0) {
              exponent -= temp.length - point - 1;
              temp = +(temp.slice(0, point) + temp.slice(point + 1)) + '';
          }
          pos = 0;
          while (temp.charAt(temp.length + pos - 1) === '0') {
              pos -= 1;
          }
          if (pos !== 0) {
              exponent -= pos;
              temp = temp.slice(0, pos);
          }
          if (exponent !== 0) {
              temp += 'e' + exponent;
          }
          if ((temp.length < result.length ||
                      (hexadecimal && value > 1e12 && Math.floor(value) === value && (temp = '0x' + value.toString(16)).length < result.length)) &&
                  +temp === value) {
              result = temp;
          }

          return result;
      }

      // Generate valid RegExp expression.
      // This function is based on https://github.com/Constellation/iv Engine

      function escapeRegExpCharacter(ch, previousIsBackslash) {
          // not handling '\' and handling \u2028 or \u2029 to unicode escape sequence
          if ((ch & ~1) === 0x2028) {
              return (previousIsBackslash ? 'u' : '\\u') + ((ch === 0x2028) ? '2028' : '2029');
          } else if (ch === 10 || ch === 13) {  // \n, \r
              return (previousIsBackslash ? '' : '\\') + ((ch === 10) ? 'n' : 'r');
          }
          return String.fromCharCode(ch);
      }

      function generateRegExp(reg) {
          var match, result, flags, i, iz, ch, characterInBrack, previousIsBackslash;

          result = reg.toString();

          if (reg.source) {
              // extract flag from toString result
              match = result.match(/\/([^/]*)$/);
              if (!match) {
                  return result;
              }

              flags = match[1];
              result = '';

              characterInBrack = false;
              previousIsBackslash = false;
              for (i = 0, iz = reg.source.length; i < iz; ++i) {
                  ch = reg.source.charCodeAt(i);

                  if (!previousIsBackslash) {
                      if (characterInBrack) {
                          if (ch === 93) {  // ]
                              characterInBrack = false;
                          }
                      } else {
                          if (ch === 47) {  // /
                              result += '\\';
                          } else if (ch === 91) {  // [
                              characterInBrack = true;
                          }
                      }
                      result += escapeRegExpCharacter(ch, previousIsBackslash);
                      previousIsBackslash = ch === 92;  // \
                  } else {
                      // if new RegExp("\\\n') is provided, create /\n/
                      result += escapeRegExpCharacter(ch, previousIsBackslash);
                      // prevent like /\\[/]/
                      previousIsBackslash = false;
                  }
              }

              return '/' + result + '/' + flags;
          }

          return result;
      }

      function escapeAllowedCharacter(ch, next) {
          var code = ch.charCodeAt(0), hex = code.toString(16), result = '\\';

          switch (ch) {
          case '\b':
              result += 'b';
              break;
          case '\f':
              result += 'f';
              break;
          case '\t':
              result += 't';
              break;
          default:
              if (json || code > 0xff) {
                  result += 'u' + '0000'.slice(hex.length) + hex;
              } else if (ch === '\u0000' && '0123456789'.indexOf(next) < 0) {
                  result += '0';
              } else if (ch === '\x0B') { // '\v'
                  result += 'x0B';
              } else {
                  result += 'x' + '00'.slice(hex.length) + hex;
              }
              break;
          }

          return result;
      }

      function escapeDisallowedCharacter(ch) {
          var result = '\\';
          switch (ch) {
          case '\\':
              result += '\\';
              break;
          case '\n':
              result += 'n';
              break;
          case '\r':
              result += 'r';
              break;
          case '\u2028':
              result += 'u2028';
              break;
          case '\u2029':
              result += 'u2029';
              break;
          default:
              throw new Error('Incorrectly classified character');
          }

          return result;
      }

      function escapeDirective(str) {
          var i, iz, ch, buf, quote;

          buf = str;
          if (typeof buf[0] === 'undefined') {
              buf = stringToArray(buf);
          }

          quote = quotes === 'double' ? '"' : '\'';
          for (i = 0, iz = buf.length; i < iz; i += 1) {
              ch = buf[i];
              if (ch === '\'') {
                  quote = '"';
                  break;
              } else if (ch === '"') {
                  quote = '\'';
                  break;
              } else if (ch === '\\') {
                  i += 1;
              }
          }

          return quote + str + quote;
      }

      function escapeString(str) {
          var result = '', i, len, ch, singleQuotes = 0, doubleQuotes = 0, single;

          if (typeof str[0] === 'undefined') {
              str = stringToArray(str);
          }

          for (i = 0, len = str.length; i < len; i += 1) {
              ch = str[i];
              if (ch === '\'') {
                  singleQuotes += 1;
              } else if (ch === '"') {
                  doubleQuotes += 1;
              } else if (ch === '/' && json) {
                  result += '\\';
              } else if ('\\\n\r\u2028\u2029'.indexOf(ch) >= 0) {
                  result += escapeDisallowedCharacter(ch);
                  continue;
              } else if ((json && ch < ' ') || !(json || escapeless || (ch >= ' ' && ch <= '~'))) {
                  result += escapeAllowedCharacter(ch, str[i + 1]);
                  continue;
              }
              result += ch;
          }

          single = !(quotes === 'double' || (quotes === 'auto' && doubleQuotes < singleQuotes));
          str = result;
          result = single ? '\'' : '"';

          if (typeof str[0] === 'undefined') {
              str = stringToArray(str);
          }

          for (i = 0, len = str.length; i < len; i += 1) {
              ch = str[i];
              if ((ch === '\'' && single) || (ch === '"' && !single)) {
                  result += '\\';
              }
              result += ch;
          }

          return result + (single ? '\'' : '"');
      }

      function isWhiteSpace(ch) {
          // Use `\x0B` instead of `\v` for IE < 9 compatibility
          return '\t\x0B\f \xa0'.indexOf(ch) >= 0 || (ch.charCodeAt(0) >= 0x1680 && '\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\ufeff'.indexOf(ch) >= 0);
      }

      function isLineTerminator(ch) {
          return '\n\r\u2028\u2029'.indexOf(ch) >= 0;
      }

      function isIdentifierPart(ch) {
          return (ch === '$') || (ch === '_') || (ch === '\\') ||
              (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
              ((ch >= '0') && (ch <= '9')) ||
              ((ch.charCodeAt(0) >= 0x80) && Regex.NonAsciiIdentifierPart.test(ch));
      }

      // takes char code
      function isDecimalDigit(ch) {
          return (ch >= 48 && ch <= 57);   // 0..9
      }

      function toSourceNode(generated, node) {
          if (node == null) {
              if (generated instanceof SourceNode) {
                  return generated;
              } else {
                  node = {};
              }
          }
          if (node.loc == null) {
              return new SourceNode(null, null, sourceMap$1, generated, node.name || null);
          }
          return new SourceNode(node.loc.start.line, node.loc.start.column, (sourceMap$1 === true ? node.loc.source || null : sourceMap$1), generated, node.name || null);
      }

      function noEmptySpace() {
          return (space) ? space : ' ';
      }

      function join(left, right) {
          var leftSource = toSourceNode(left).toString(),
              rightSource = toSourceNode(right).toString(),
              leftChar = leftSource.charAt(leftSource.length - 1),
              rightChar = rightSource.charAt(0);

          if ((leftChar === '+' || leftChar === '-') && leftChar === rightChar ||
          isIdentifierPart(leftChar) && isIdentifierPart(rightChar) ||
          leftChar === '/' && rightChar === 'i') { // infix word operators all start with `i`
              return [left, noEmptySpace(), right];
          } else if (isWhiteSpace(leftChar) || isLineTerminator(leftChar) || isWhiteSpace(rightChar) || isLineTerminator(rightChar)) {
              return [left, right];
          }
          return [left, space, right];
      }

      function addIndent(stmt) {
          return [base, stmt];
      }

      function withIndent(fn) {
          var previousBase, result;
          previousBase = base;
          base += indent;
          result = fn.call(this, base);
          base = previousBase;
          return result;
      }

      function calculateSpaces(str) {
          var i;
          for (i = str.length - 1; i >= 0; i -= 1) {
              if (isLineTerminator(str.charAt(i))) {
                  break;
              }
          }
          return (str.length - 1) - i;
      }

      function adjustMultilineComment(value, specialBase) {
          var array, i, len, line, j, spaces, previousBase;

          array = value.split(/\r\n|[\r\n]/);
          spaces = Number.MAX_VALUE;

          // first line doesn't have indentation
          for (i = 1, len = array.length; i < len; i += 1) {
              line = array[i];
              j = 0;
              while (j < line.length && isWhiteSpace(line[j])) {
                  j += 1;
              }
              if (spaces > j) {
                  spaces = j;
              }
          }

          if (typeof specialBase !== 'undefined') {
              // pattern like
              // {
              //   var t = 20;  /*
              //                 * this is comment
              //                 */
              // }
              previousBase = base;
              if (array[1][spaces] === '*') {
                  specialBase += ' ';
              }
              base = specialBase;
          } else {
              if (spaces & 1) {
                  // /*
                  //  *
                  //  */
                  // If spaces are odd number, above pattern is considered.
                  // We waste 1 space.
                  spaces -= 1;
              }
              previousBase = base;
          }

          for (i = 1, len = array.length; i < len; i += 1) {
              array[i] = toSourceNode(addIndent(array[i].slice(spaces))).join('');
          }

          base = previousBase;

          return array.join('\n');
      }

      function generateComment(comment, specialBase) {
          if (comment.type === 'Line') {
              if (endsWithLineTerminator(comment.value)) {
                  return '//' + comment.value;
              } else {
                  // Always use LineTerminator
                  return '//' + comment.value + '\n';
              }
          }
          if (extra.format.indent.adjustMultilineComment && /[\n\r]/.test(comment.value)) {
              return adjustMultilineComment('/*' + comment.value + '*/', specialBase);
          }
          return '/*' + comment.value + '*/';
      }

      function addCommentsToStatement(stmt, result) {
          var i, len, comment, save, tailingToStatement, specialBase, fragment;

          if (stmt.leadingComments && stmt.leadingComments.length > 0) {
              save = result;

              comment = stmt.leadingComments[0];
              result = [];
              if (safeConcatenation && stmt.type === Syntax.Program && stmt.body.length === 0) {
                  result.push('\n');
              }
              result.push(generateComment(comment));
              if (!endsWithLineTerminator(toSourceNode(result).toString())) {
                  result.push('\n');
              }

              for (i = 1, len = stmt.leadingComments.length; i < len; i += 1) {
                  comment = stmt.leadingComments[i];
                  fragment = [generateComment(comment)];
                  if (!endsWithLineTerminator(toSourceNode(fragment).toString())) {
                      fragment.push('\n');
                  }
                  result.push(addIndent(fragment));
              }

              result.push(addIndent(save));
          }

          if (stmt.trailingComments) {
              tailingToStatement = !endsWithLineTerminator(toSourceNode(result).toString());
              specialBase = stringRepeat(' ', calculateSpaces(toSourceNode([base, result, indent]).toString()));
              for (i = 0, len = stmt.trailingComments.length; i < len; i += 1) {
                  comment = stmt.trailingComments[i];
                  if (tailingToStatement) {
                      // We assume target like following script
                      //
                      // var t = 20;  /**
                      //               * This is comment of t
                      //               */
                      if (i === 0) {
                          // first case
                          result = [result, indent];
                      } else {
                          result = [result, specialBase];
                      }
                      result.push(generateComment(comment, specialBase));
                  } else {
                      result = [result, addIndent(generateComment(comment))];
                  }
                  if (i !== len - 1 && !endsWithLineTerminator(toSourceNode(result).toString())) {
                      result = [result, '\n'];
                  }
              }
          }

          return result;
      }

      function parenthesize(text, current, should) {
          if (current < should) {
              return ['(', text, ')'];
          }
          return text;
      }

      function maybeBlock(stmt, semicolonOptional, functionBody) {
          var result, noLeadingComment;

          noLeadingComment = !extra.comment || !stmt.leadingComments;

          if (stmt.type === Syntax.BlockStatement && noLeadingComment) {
              return [space, generateStatement(stmt, { functionBody: functionBody })];
          }

          if (stmt.type === Syntax.EmptyStatement && noLeadingComment) {
              return ';';
          }

          withIndent(function () {
              result = [newline, addIndent(generateStatement(stmt, { semicolonOptional: semicolonOptional, functionBody: functionBody }))];
          });

          return result;
      }

      function maybeBlockSuffix(stmt, result) {
          var ends = endsWithLineTerminator(toSourceNode(result).toString());
          if (stmt.type === Syntax.BlockStatement && (!extra.comment || !stmt.leadingComments) && !ends) {
              return [result, space];
          }
          if (ends) {
              return [result, base];
          }
          return [result, newline, base];
      }

      function generateVerbatim(expr, option) {
          var i, result;
          result = expr[extra.verbatim].split(/\r\n|\n/);
          for (i = 1; i < result.length; i++) {
              result[i] = newline + base + result[i];
          }

          result = parenthesize(result, Precedence.Sequence, option.precedence);
          return toSourceNode(result, expr);
      }

      function generateIdentifier(node) {
          return toSourceNode(node.name, node);
      }

      function generateFunctionBody(node) {
          var result, i, len, expr, arrow;

          arrow = node.type === Syntax.ArrowFunctionExpression;

          if (arrow && node.params.length === 1 && node.params[0].type === Syntax.Identifier) {
              // arg => { } case
              result = [generateIdentifier(node.params[0])];
          } else {
              result = ['('];
              for (i = 0, len = node.params.length; i < len; i += 1) {
                  result.push(generateIdentifier(node.params[i]));
                  if (i + 1 < len) {
                      result.push(',' + space);
                  }
              }
              result.push(')');
          }

          if (arrow) {
              result.push(space, '=>');
          }

          if (node.expression) {
              result.push(space);
              expr = generateExpression(node.body, {
                  precedence: Precedence.Assignment,
                  allowIn: true,
                  allowCall: true
              });
              if (expr.toString().charAt(0) === '{') {
                  expr = ['(', expr, ')'];
              }
              result.push(expr);
          } else {
              result.push(maybeBlock(node.body, false, true));
          }
          return result;
      }

      function generateExpression(expr, option) {
          var result,
              precedence,
              type,
              currentPrecedence,
              i,
              len,
              raw,
              fragment,
              multiline,
              leftChar,
              leftSource,
              rightChar,
              allowIn,
              allowCall,
              allowUnparenthesizedNew,
              property;

          precedence = option.precedence;
          allowIn = option.allowIn;
          allowCall = option.allowCall;
          type = expr.type || option.type;

          if (extra.verbatim && expr.hasOwnProperty(extra.verbatim)) {
              return generateVerbatim(expr, option);
          }

          switch (type) {
          case Syntax.SequenceExpression:
              result = [];
              allowIn |= (Precedence.Sequence < precedence);
              for (i = 0, len = expr.expressions.length; i < len; i += 1) {
                  result.push(generateExpression(expr.expressions[i], {
                      precedence: Precedence.Assignment,
                      allowIn: allowIn,
                      allowCall: true
                  }));
                  if (i + 1 < len) {
                      result.push(',' + space);
                  }
              }
              result = parenthesize(result, Precedence.Sequence, precedence);
              break;

          case Syntax.AssignmentExpression:
              allowIn |= (Precedence.Assignment < precedence);
              result = parenthesize(
                  [
                      generateExpression(expr.left, {
                          precedence: Precedence.Call,
                          allowIn: allowIn,
                          allowCall: true
                      }),
                      space + expr.operator + space,
                      generateExpression(expr.right, {
                          precedence: Precedence.Assignment,
                          allowIn: allowIn,
                          allowCall: true
                      })
                  ],
                  Precedence.Assignment,
                  precedence
              );
              break;

          case Syntax.ArrowFunctionExpression:
              allowIn |= (Precedence.ArrowFunction < precedence);
              result = parenthesize(generateFunctionBody(expr), Precedence.ArrowFunction, precedence);
              break;

          case Syntax.ConditionalExpression:
              allowIn |= (Precedence.Conditional < precedence);
              result = parenthesize(
                  [
                      generateExpression(expr.test, {
                          precedence: Precedence.LogicalOR,
                          allowIn: allowIn,
                          allowCall: true
                      }),
                      space + '?' + space,
                      generateExpression(expr.consequent, {
                          precedence: Precedence.Assignment,
                          allowIn: allowIn,
                          allowCall: true
                      }),
                      space + ':' + space,
                      generateExpression(expr.alternate, {
                          precedence: Precedence.Assignment,
                          allowIn: allowIn,
                          allowCall: true
                      })
                  ],
                  Precedence.Conditional,
                  precedence
              );
              break;

          case Syntax.LogicalExpression:
          case Syntax.BinaryExpression:
              currentPrecedence = BinaryPrecedence[expr.operator];

              allowIn |= (currentPrecedence < precedence);

              fragment = generateExpression(expr.left, {
                  precedence: currentPrecedence,
                  allowIn: allowIn,
                  allowCall: true
              });

              leftSource = fragment.toString();

              if (leftSource.charAt(leftSource.length - 1) === '/' && isIdentifierPart(expr.operator.charAt(0))) {
                  result = [fragment, noEmptySpace(), expr.operator];
              } else {
                  result = join(fragment, expr.operator);
              }

              fragment = generateExpression(expr.right, {
                  precedence: currentPrecedence + 1,
                  allowIn: allowIn,
                  allowCall: true
              });

              if (expr.operator === '/' && fragment.toString().charAt(0) === '/' ||
              expr.operator.slice(-1) === '<' && fragment.toString().slice(0, 3) === '!--') {
                  // If '/' concats with '/' or `<` concats with `!--`, it is interpreted as comment start
                  result.push(noEmptySpace(), fragment);
              } else {
                  result = join(result, fragment);
              }

              if (expr.operator === 'in' && !allowIn) {
                  result = ['(', result, ')'];
              } else {
                  result = parenthesize(result, currentPrecedence, precedence);
              }

              break;

          case Syntax.CallExpression:
              result = [generateExpression(expr.callee, {
                  precedence: Precedence.Call,
                  allowIn: true,
                  allowCall: true,
                  allowUnparenthesizedNew: false
              })];

              result.push('(');
              for (i = 0, len = expr['arguments'].length; i < len; i += 1) {
                  result.push(generateExpression(expr['arguments'][i], {
                      precedence: Precedence.Assignment,
                      allowIn: true,
                      allowCall: true
                  }));
                  if (i + 1 < len) {
                      result.push(',' + space);
                  }
              }
              result.push(')');

              if (!allowCall) {
                  result = ['(', result, ')'];
              } else {
                  result = parenthesize(result, Precedence.Call, precedence);
              }
              break;

          case Syntax.NewExpression:
              len = expr['arguments'].length;
              allowUnparenthesizedNew = option.allowUnparenthesizedNew === undefined || option.allowUnparenthesizedNew;

              result = join(
                  'new',
                  generateExpression(expr.callee, {
                      precedence: Precedence.New,
                      allowIn: true,
                      allowCall: false,
                      allowUnparenthesizedNew: allowUnparenthesizedNew && !parentheses && len === 0
                  })
              );

              if (!allowUnparenthesizedNew || parentheses || len > 0) {
                  result.push('(');
                  for (i = 0; i < len; i += 1) {
                      result.push(generateExpression(expr['arguments'][i], {
                          precedence: Precedence.Assignment,
                          allowIn: true,
                          allowCall: true
                      }));
                      if (i + 1 < len) {
                          result.push(',' + space);
                      }
                  }
                  result.push(')');
              }

              result = parenthesize(result, Precedence.New, precedence);
              break;

          case Syntax.MemberExpression:
              result = [generateExpression(expr.object, {
                  precedence: Precedence.Call,
                  allowIn: true,
                  allowCall: allowCall,
                  allowUnparenthesizedNew: false
              })];

              if (expr.computed) {
                  result.push('[', generateExpression(expr.property, {
                      precedence: Precedence.Sequence,
                      allowIn: true,
                      allowCall: allowCall
                  }), ']');
              } else {
                  if (expr.object.type === Syntax.Literal && typeof expr.object.value === 'number') {
                      fragment = toSourceNode(result).toString();
                      // When the following conditions are all true,
                      //   1. No floating point
                      //   2. Don't have exponents
                      //   3. The last character is a decimal digit
                      //   4. Not hexadecimal OR octal number literal
                      // we should add a floating point.
                      if (
                              fragment.indexOf('.') < 0 &&
                              !/[eExX]/.test(fragment) &&
                              isDecimalDigit(fragment.charCodeAt(fragment.length - 1)) &&
                              !(fragment.length >= 2 && fragment.charCodeAt(0) === 48)  // '0'
                              ) {
                          result.push('.');
                      }
                  }
                  result.push('.', generateIdentifier(expr.property));
              }

              result = parenthesize(result, Precedence.Member, precedence);
              break;

          case Syntax.UnaryExpression:
              fragment = generateExpression(expr.argument, {
                  precedence: Precedence.Unary,
                  allowIn: true,
                  allowCall: true
              });

              if (space === '') {
                  result = join(expr.operator, fragment);
              } else {
                  result = [expr.operator];
                  if (expr.operator.length > 2) {
                      // delete, void, typeof
                      // get `typeof []`, not `typeof[]`
                      result = join(result, fragment);
                  } else {
                      // Prevent inserting spaces between operator and argument if it is unnecessary
                      // like, `!cond`
                      leftSource = toSourceNode(result).toString();
                      leftChar = leftSource.charAt(leftSource.length - 1);
                      rightChar = fragment.toString().charAt(0);

                      if (((leftChar === '+' || leftChar === '-') && leftChar === rightChar) || (isIdentifierPart(leftChar) && isIdentifierPart(rightChar))) {
                          result.push(noEmptySpace(), fragment);
                      } else {
                          result.push(fragment);
                      }
                  }
              }
              result = parenthesize(result, Precedence.Unary, precedence);
              break;

          case Syntax.YieldExpression:
              if (expr.delegate) {
                  result = 'yield*';
              } else {
                  result = 'yield';
              }
              if (expr.argument) {
                  result = join(
                      result,
                      generateExpression(expr.argument, {
                          precedence: Precedence.Assignment,
                          allowIn: true,
                          allowCall: true
                      })
                  );
              }
              break;

          case Syntax.UpdateExpression:
              if (expr.prefix) {
                  result = parenthesize(
                      [
                          expr.operator,
                          generateExpression(expr.argument, {
                              precedence: Precedence.Unary,
                              allowIn: true,
                              allowCall: true
                          })
                      ],
                      Precedence.Unary,
                      precedence
                  );
              } else {
                  result = parenthesize(
                      [
                          generateExpression(expr.argument, {
                              precedence: Precedence.Postfix,
                              allowIn: true,
                              allowCall: true
                          }),
                          expr.operator
                      ],
                      Precedence.Postfix,
                      precedence
                  );
              }
              break;

          case Syntax.FunctionExpression:
              result = 'function';

              if (expr.id) {
                  result = [result, noEmptySpace(),
                            generateIdentifier(expr.id),
                            generateFunctionBody(expr)];
              } else {
                  result = [result + space, generateFunctionBody(expr)];
              }

              break;

          case Syntax.ArrayPattern:
          case Syntax.ArrayExpression:
              if (!expr.elements.length) {
                  result = '[]';
                  break;
              }
              multiline = expr.elements.length > 1;
              result = ['[', multiline ? newline : ''];
              withIndent(function (indent) {
                  for (i = 0, len = expr.elements.length; i < len; i += 1) {
                      if (!expr.elements[i]) {
                          if (multiline) {
                              result.push(indent);
                          }
                          if (i + 1 === len) {
                              result.push(',');
                          }
                      } else {
                          result.push(multiline ? indent : '', generateExpression(expr.elements[i], {
                              precedence: Precedence.Assignment,
                              allowIn: true,
                              allowCall: true
                          }));
                      }
                      if (i + 1 < len) {
                          result.push(',' + (multiline ? newline : space));
                      }
                  }
              });
              if (multiline && !endsWithLineTerminator(toSourceNode(result).toString())) {
                  result.push(newline);
              }
              result.push(multiline ? base : '', ']');
              break;

          case Syntax.Property:
              if (expr.kind === 'get' || expr.kind === 'set') {
                  result = [
                      expr.kind, noEmptySpace(),
                      generateExpression(expr.key, {
                          precedence: Precedence.Sequence,
                          allowIn: true,
                          allowCall: true
                      }),
                      generateFunctionBody(expr.value)
                  ];
              } else {
                  if (expr.shorthand) {
                      result = generateExpression(expr.key, {
                          precedence: Precedence.Sequence,
                          allowIn: true,
                          allowCall: true
                      });
                  } else if (expr.method) {
                      result = [];
                      if (expr.value.generator) {
                          result.push('*');
                      }
                      result.push(generateExpression(expr.key, {
                          precedence: Precedence.Sequence,
                          allowIn: true,
                          allowCall: true
                      }), generateFunctionBody(expr.value));
                  } else {
                      result = [
                          generateExpression(expr.key, {
                              precedence: Precedence.Sequence,
                              allowIn: true,
                              allowCall: true
                          }),
                          ':' + space,
                          generateExpression(expr.value, {
                              precedence: Precedence.Assignment,
                              allowIn: true,
                              allowCall: true
                          })
                      ];
                  }
              }
              break;

          case Syntax.ObjectExpression:
              if (!expr.properties.length) {
                  result = '{}';
                  break;
              }
              multiline = expr.properties.length > 1;

              withIndent(function () {
                  fragment = generateExpression(expr.properties[0], {
                      precedence: Precedence.Sequence,
                      allowIn: true,
                      allowCall: true,
                      type: Syntax.Property
                  });
              });

              if (!multiline) {
                  // issues 4
                  // Do not transform from
                  //   dejavu.Class.declare({
                  //       method2: function () {}
                  //   });
                  // to
                  //   dejavu.Class.declare({method2: function () {
                  //       }});
                  if (!hasLineTerminator(toSourceNode(fragment).toString())) {
                      result = [ '{', space, fragment, space, '}' ];
                      break;
                  }
              }

              withIndent(function (indent) {
                  result = [ '{', newline, indent, fragment ];

                  if (multiline) {
                      result.push(',' + newline);
                      for (i = 1, len = expr.properties.length; i < len; i += 1) {
                          result.push(indent, generateExpression(expr.properties[i], {
                              precedence: Precedence.Sequence,
                              allowIn: true,
                              allowCall: true,
                              type: Syntax.Property
                          }));
                          if (i + 1 < len) {
                              result.push(',' + newline);
                          }
                      }
                  }
              });

              if (!endsWithLineTerminator(toSourceNode(result).toString())) {
                  result.push(newline);
              }
              result.push(base, '}');
              break;

          case Syntax.ObjectPattern:
              if (!expr.properties.length) {
                  result = '{}';
                  break;
              }

              multiline = false;
              if (expr.properties.length === 1) {
                  property = expr.properties[0];
                  if (property.value.type !== Syntax.Identifier) {
                      multiline = true;
                  }
              } else {
                  for (i = 0, len = expr.properties.length; i < len; i += 1) {
                      property = expr.properties[i];
                      if (!property.shorthand) {
                          multiline = true;
                          break;
                      }
                  }
              }
              result = ['{', multiline ? newline : '' ];

              withIndent(function (indent) {
                  for (i = 0, len = expr.properties.length; i < len; i += 1) {
                      result.push(multiline ? indent : '', generateExpression(expr.properties[i], {
                          precedence: Precedence.Sequence,
                          allowIn: true,
                          allowCall: true
                      }));
                      if (i + 1 < len) {
                          result.push(',' + (multiline ? newline : space));
                      }
                  }
              });

              if (multiline && !endsWithLineTerminator(toSourceNode(result).toString())) {
                  result.push(newline);
              }
              result.push(multiline ? base : '', '}');
              break;

          case Syntax.ThisExpression:
              result = 'this';
              break;

          case Syntax.Identifier:
              result = generateIdentifier(expr);
              break;

          case Syntax.Literal:
              if (expr.hasOwnProperty('raw') && parse) {
                  try {
                      raw = parse(expr.raw).body[0].expression;
                      if (raw.type === Syntax.Literal) {
                          if (raw.value === expr.value) {
                              result = expr.raw;
                              break;
                          }
                      }
                  } catch (e) {
                      // not use raw property
                  }
              }

              if (expr.value === null) {
                  result = 'null';
                  break;
              }

              if (typeof expr.value === 'string') {
                  result = escapeString(expr.value);
                  break;
              }

              if (typeof expr.value === 'number') {
                  result = generateNumber(expr.value);
                  break;
              }

              if (typeof expr.value === 'boolean') {
                  result = expr.value ? 'true' : 'false';
                  break;
              }

              result = generateRegExp(expr.value);
              break;

          case Syntax.ComprehensionExpression:
              result = [
                  '[',
                  generateExpression(expr.body, {
                      precedence: Precedence.Assignment,
                      allowIn: true,
                      allowCall: true
                  })
              ];

              if (expr.blocks) {
                  for (i = 0, len = expr.blocks.length; i < len; i += 1) {
                      fragment = generateExpression(expr.blocks[i], {
                          precedence: Precedence.Sequence,
                          allowIn: true,
                          allowCall: true
                      });
                      result = join(result, fragment);
                  }
              }

              if (expr.filter) {
                  result = join(result, 'if' + space);
                  fragment = generateExpression(expr.filter, {
                      precedence: Precedence.Sequence,
                      allowIn: true,
                      allowCall: true
                  });
                  if (extra.moz.parenthesizedComprehensionBlock) {
                      result = join(result, [ '(', fragment, ')' ]);
                  } else {
                      result = join(result, fragment);
                  }
              }
              result.push(']');
              break;

          case Syntax.ComprehensionBlock:
              if (expr.left.type === Syntax.VariableDeclaration) {
                  fragment = [
                      expr.left.kind, noEmptySpace(),
                      generateStatement(expr.left.declarations[0], {
                          allowIn: false
                      })
                  ];
              } else {
                  fragment = generateExpression(expr.left, {
                      precedence: Precedence.Call,
                      allowIn: true,
                      allowCall: true
                  });
              }

              fragment = join(fragment, expr.of ? 'of' : 'in');
              fragment = join(fragment, generateExpression(expr.right, {
                  precedence: Precedence.Sequence,
                  allowIn: true,
                  allowCall: true
              }));

              if (extra.moz.parenthesizedComprehensionBlock) {
                  result = [ 'for' + space + '(', fragment, ')' ];
              } else {
                  result = join('for' + space, fragment);
              }
              break;

          default:
              throw new Error('Unknown expression type: ' + expr.type);
          }

          return toSourceNode(result, expr);
      }

      function generateStatement(stmt, option) {
          var i, len, result, node, allowIn, functionBody, directiveContext, fragment, semicolon;

          allowIn = true;
          semicolon = ';';
          functionBody = false;
          directiveContext = false;
          if (option) {
              allowIn = option.allowIn === undefined || option.allowIn;
              if (!semicolons && option.semicolonOptional === true) {
                  semicolon = '';
              }
              functionBody = option.functionBody;
              directiveContext = option.directiveContext;
          }

          switch (stmt.type) {
          case Syntax.BlockStatement:
              result = ['{', newline];

              withIndent(function () {
                  for (i = 0, len = stmt.body.length; i < len; i += 1) {
                      fragment = addIndent(generateStatement(stmt.body[i], {
                          semicolonOptional: i === len - 1,
                          directiveContext: functionBody
                      }));
                      result.push(fragment);
                      if (!endsWithLineTerminator(toSourceNode(fragment).toString())) {
                          result.push(newline);
                      }
                  }
              });

              result.push(addIndent('}'));
              break;

          case Syntax.BreakStatement:
              if (stmt.label) {
                  result = 'break ' + stmt.label.name + semicolon;
              } else {
                  result = 'break' + semicolon;
              }
              break;

          case Syntax.ContinueStatement:
              if (stmt.label) {
                  result = 'continue ' + stmt.label.name + semicolon;
              } else {
                  result = 'continue' + semicolon;
              }
              break;

          case Syntax.DirectiveStatement:
              if (stmt.raw) {
                  result = stmt.raw + semicolon;
              } else {
                  result = escapeDirective(stmt.directive) + semicolon;
              }
              break;

          case Syntax.DoWhileStatement:
              // Because `do 42 while (cond)` is Syntax Error. We need semicolon.
              result = join('do', maybeBlock(stmt.body));
              result = maybeBlockSuffix(stmt.body, result);
              result = join(result, [
                  'while' + space + '(',
                  generateExpression(stmt.test, {
                      precedence: Precedence.Sequence,
                      allowIn: true,
                      allowCall: true
                  }),
                  ')' + semicolon
              ]);
              break;

          case Syntax.CatchClause:
              withIndent(function () {
                  result = [
                      'catch' + space + '(',
                      generateExpression(stmt.param, {
                          precedence: Precedence.Sequence,
                          allowIn: true,
                          allowCall: true
                      }),
                      ')'
                  ];
              });
              result.push(maybeBlock(stmt.body));
              break;

          case Syntax.DebuggerStatement:
              result = 'debugger' + semicolon;
              break;

          case Syntax.EmptyStatement:
              result = ';';
              break;

          case Syntax.ExpressionStatement:
              result = [generateExpression(stmt.expression, {
                  precedence: Precedence.Sequence,
                  allowIn: true,
                  allowCall: true
              })];
              // 12.4 '{', 'function' is not allowed in this position.
              // wrap expression with parentheses
              fragment = toSourceNode(result).toString();
              if (fragment.charAt(0) === '{' || (fragment.slice(0, 8) === 'function' && ' ('.indexOf(fragment.charAt(8)) >= 0) || (directive && directiveContext && stmt.expression.type === Syntax.Literal && typeof stmt.expression.value === 'string')) {
                  result = ['(', result, ')' + semicolon];
              } else {
                  result.push(semicolon);
              }
              break;

          case Syntax.VariableDeclarator:
              if (stmt.init) {
                  result = [
                      generateExpression(stmt.id, {
                          precedence: Precedence.Assignment,
                          allowIn: allowIn,
                          allowCall: true
                      }),
                      space,
                      '=',
                      space,
                      generateExpression(stmt.init, {
                          precedence: Precedence.Assignment,
                          allowIn: allowIn,
                          allowCall: true
                      })
                  ];
              } else {
                  result = generateIdentifier(stmt.id);
              }
              break;

          case Syntax.VariableDeclaration:
              result = [stmt.kind];
              // special path for
              // var x = function () {
              // };
              if (stmt.declarations.length === 1 && stmt.declarations[0].init &&
                      stmt.declarations[0].init.type === Syntax.FunctionExpression) {
                  result.push(noEmptySpace(), generateStatement(stmt.declarations[0], {
                      allowIn: allowIn
                  }));
              } else {
                  // VariableDeclarator is typed as Statement,
                  // but joined with comma (not LineTerminator).
                  // So if comment is attached to target node, we should specialize.
                  withIndent(function () {
                      node = stmt.declarations[0];
                      if (extra.comment && node.leadingComments) {
                          result.push('\n', addIndent(generateStatement(node, {
                              allowIn: allowIn
                          })));
                      } else {
                          result.push(noEmptySpace(), generateStatement(node, {
                              allowIn: allowIn
                          }));
                      }

                      for (i = 1, len = stmt.declarations.length; i < len; i += 1) {
                          node = stmt.declarations[i];
                          if (extra.comment && node.leadingComments) {
                              result.push(',' + newline, addIndent(generateStatement(node, {
                                  allowIn: allowIn
                              })));
                          } else {
                              result.push(',' + space, generateStatement(node, {
                                  allowIn: allowIn
                              }));
                          }
                      }
                  });
              }
              result.push(semicolon);
              break;

          case Syntax.ThrowStatement:
              result = [join(
                  'throw',
                  generateExpression(stmt.argument, {
                      precedence: Precedence.Sequence,
                      allowIn: true,
                      allowCall: true
                  })
              ), semicolon];
              break;

          case Syntax.TryStatement:
              result = ['try', maybeBlock(stmt.block)];
              result = maybeBlockSuffix(stmt.block, result);
              if (stmt.handlers) {
                  // old interface
                  for (i = 0, len = stmt.handlers.length; i < len; i += 1) {
                      result = join(result, generateStatement(stmt.handlers[i]));
                      if (stmt.finalizer || i + 1 !== len) {
                          result = maybeBlockSuffix(stmt.handlers[i].body, result);
                      }
                  }
              } else {
                  // new interface
                  if (stmt.handler) {
                      result = join(result, generateStatement(stmt.handler));
                      if (stmt.finalizer || stmt.guardedHandlers.length > 0) {
                          result = maybeBlockSuffix(stmt.handler.body, result);
                      }
                  }

                  for (i = 0, len = stmt.guardedHandlers.length; i < len; i += 1) {
                      result = join(result, generateStatement(stmt.guardedHandlers[i]));
                      if (stmt.finalizer || i + 1 !== len) {
                          result = maybeBlockSuffix(stmt.guardedHandlers[i].body, result);
                      }
                  }
              }
              if (stmt.finalizer) {
                  result = join(result, ['finally', maybeBlock(stmt.finalizer)]);
              }
              break;

          case Syntax.SwitchStatement:
              withIndent(function () {
                  result = [
                      'switch' + space + '(',
                      generateExpression(stmt.discriminant, {
                          precedence: Precedence.Sequence,
                          allowIn: true,
                          allowCall: true
                      }),
                      ')' + space + '{' + newline
                  ];
              });
              if (stmt.cases) {
                  for (i = 0, len = stmt.cases.length; i < len; i += 1) {
                      fragment = addIndent(generateStatement(stmt.cases[i], {semicolonOptional: i === len - 1}));
                      result.push(fragment);
                      if (!endsWithLineTerminator(toSourceNode(fragment).toString())) {
                          result.push(newline);
                      }
                  }
              }
              result.push(addIndent('}'));
              break;

          case Syntax.SwitchCase:
              withIndent(function () {
                  if (stmt.test) {
                      result = [
                          join('case', generateExpression(stmt.test, {
                              precedence: Precedence.Sequence,
                              allowIn: true,
                              allowCall: true
                          })),
                          ':'
                      ];
                  } else {
                      result = ['default:'];
                  }

                  i = 0;
                  len = stmt.consequent.length;
                  if (len && stmt.consequent[0].type === Syntax.BlockStatement) {
                      fragment = maybeBlock(stmt.consequent[0]);
                      result.push(fragment);
                      i = 1;
                  }

                  if (i !== len && !endsWithLineTerminator(toSourceNode(result).toString())) {
                      result.push(newline);
                  }

                  for (; i < len; i += 1) {
                      fragment = addIndent(generateStatement(stmt.consequent[i], {semicolonOptional: i === len - 1 && semicolon === ''}));
                      result.push(fragment);
                      if (i + 1 !== len && !endsWithLineTerminator(toSourceNode(fragment).toString())) {
                          result.push(newline);
                      }
                  }
              });
              break;

          case Syntax.IfStatement:
              withIndent(function () {
                  result = [
                      'if' + space + '(',
                      generateExpression(stmt.test, {
                          precedence: Precedence.Sequence,
                          allowIn: true,
                          allowCall: true
                      }),
                      ')'
                  ];
              });
              if (stmt.alternate) {
                  result.push(maybeBlock(stmt.consequent));
                  result = maybeBlockSuffix(stmt.consequent, result);
                  if (stmt.alternate.type === Syntax.IfStatement) {
                      result = join(result, ['else ', generateStatement(stmt.alternate, {semicolonOptional: semicolon === ''})]);
                  } else {
                      result = join(result, join('else', maybeBlock(stmt.alternate, semicolon === '')));
                  }
              } else {
                  result.push(maybeBlock(stmt.consequent, semicolon === ''));
              }
              break;

          case Syntax.ForStatement:
              withIndent(function () {
                  result = ['for' + space + '('];
                  if (stmt.init) {
                      if (stmt.init.type === Syntax.VariableDeclaration) {
                          result.push(generateStatement(stmt.init, {allowIn: false}));
                      } else {
                          result.push(generateExpression(stmt.init, {
                              precedence: Precedence.Sequence,
                              allowIn: false,
                              allowCall: true
                          }), ';');
                      }
                  } else {
                      result.push(';');
                  }

                  if (stmt.test) {
                      result.push(space, generateExpression(stmt.test, {
                          precedence: Precedence.Sequence,
                          allowIn: true,
                          allowCall: true
                      }), ';');
                  } else {
                      result.push(';');
                  }

                  if (stmt.update) {
                      result.push(space, generateExpression(stmt.update, {
                          precedence: Precedence.Sequence,
                          allowIn: true,
                          allowCall: true
                      }), ')');
                  } else {
                      result.push(')');
                  }
              });

              result.push(maybeBlock(stmt.body, semicolon === ''));
              break;

          case Syntax.ForInStatement:
              result = ['for' + space + '('];
              withIndent(function () {
                  if (stmt.left.type === Syntax.VariableDeclaration) {
                      withIndent(function () {
                          result.push(stmt.left.kind + noEmptySpace(), generateStatement(stmt.left.declarations[0], {
                              allowIn: false
                          }));
                      });
                  } else {
                      result.push(generateExpression(stmt.left, {
                          precedence: Precedence.Call,
                          allowIn: true,
                          allowCall: true
                      }));
                  }

                  result = join(result, 'in');
                  result = [join(
                      result,
                      generateExpression(stmt.right, {
                          precedence: Precedence.Sequence,
                          allowIn: true,
                          allowCall: true
                      })
                  ), ')'];
              });
              result.push(maybeBlock(stmt.body, semicolon === ''));
              break;

          case Syntax.LabeledStatement:
              result = [stmt.label.name + ':', maybeBlock(stmt.body, semicolon === '')];
              break;

          case Syntax.Program:
              len = stmt.body.length;
              result = [safeConcatenation && len > 0 ? '\n' : ''];
              for (i = 0; i < len; i += 1) {
                  fragment = addIndent(
                      generateStatement(stmt.body[i], {
                          semicolonOptional: !safeConcatenation && i === len - 1,
                          directiveContext: true
                      })
                  );
                  result.push(fragment);
                  if (i + 1 < len && !endsWithLineTerminator(toSourceNode(fragment).toString())) {
                      result.push(newline);
                  }
              }
              break;

          case Syntax.FunctionDeclaration:
              result = [(stmt.generator && !extra.moz.starlessGenerator ? 'function* ' : 'function '),
                        generateIdentifier(stmt.id),
                        generateFunctionBody(stmt)];
              break;

          case Syntax.ReturnStatement:
              if (stmt.argument) {
                  result = [join(
                      'return',
                      generateExpression(stmt.argument, {
                          precedence: Precedence.Sequence,
                          allowIn: true,
                          allowCall: true
                      })
                  ), semicolon];
              } else {
                  result = ['return' + semicolon];
              }
              break;

          case Syntax.WhileStatement:
              withIndent(function () {
                  result = [
                      'while' + space + '(',
                      generateExpression(stmt.test, {
                          precedence: Precedence.Sequence,
                          allowIn: true,
                          allowCall: true
                      }),
                      ')'
                  ];
              });
              result.push(maybeBlock(stmt.body, semicolon === ''));
              break;

          case Syntax.WithStatement:
              withIndent(function () {
                  result = [
                      'with' + space + '(',
                      generateExpression(stmt.object, {
                          precedence: Precedence.Sequence,
                          allowIn: true,
                          allowCall: true
                      }),
                      ')'
                  ];
              });
              result.push(maybeBlock(stmt.body, semicolon === ''));
              break;

          default:
              throw new Error('Unknown statement type: ' + stmt.type);
          }

          // Attach comments

          if (extra.comment) {
              result = addCommentsToStatement(stmt, result);
          }

          fragment = toSourceNode(result).toString();
          if (stmt.type === Syntax.Program && !safeConcatenation && newline === '' &&  fragment.charAt(fragment.length - 1) === '\n') {
              result = toSourceNode(result).replaceRight(/\s+$/, '');
          }

          return toSourceNode(result, stmt);
      }

      function generate(node, options) {
          var defaultOptions = getDefaultOptions(), result, pair;

          if (options != null) {
              // Obsolete options
              //
              //   `options.indent`
              //   `options.base`
              //
              // Instead of them, we can use `option.format.indent`.
              if (typeof options.indent === 'string') {
                  defaultOptions.format.indent.style = options.indent;
              }
              if (typeof options.base === 'number') {
                  defaultOptions.format.indent.base = options.base;
              }
              options = updateDeeply(defaultOptions, options);
              indent = options.format.indent.style;
              if (typeof options.base === 'string') {
                  base = options.base;
              } else {
                  base = stringRepeat(indent, options.format.indent.base);
              }
          } else {
              options = defaultOptions;
              indent = options.format.indent.style;
              base = stringRepeat(indent, options.format.indent.base);
          }
          json = options.format.json;
          renumber = options.format.renumber;
          hexadecimal = json ? false : options.format.hexadecimal;
          quotes = json ? 'double' : options.format.quotes;
          escapeless = options.format.escapeless;
          newline = options.format.newline;
          space = options.format.space;
          if (options.format.compact) {
              newline = space = indent = base = '';
          }
          parentheses = options.format.parentheses;
          semicolons = options.format.semicolons;
          safeConcatenation = options.format.safeConcatenation;
          directive = options.directive;
          parse = json ? null : options.parse;
          sourceMap$1 = options.sourceMap;
          extra = options;

          if (sourceMap$1) {
              if (!exports.browser) {
                  // We assume environment is node.js
                  // And prevent from including source-map by browserify
                  SourceNode = sourceMap.SourceNode;
              } else {
                  SourceNode = commonjsGlobal.sourceMap.SourceNode;
              }
          } else {
              SourceNode = SourceNodeMock;
          }

          switch (node.type) {
          case Syntax.BlockStatement:
          case Syntax.BreakStatement:
          case Syntax.CatchClause:
          case Syntax.ContinueStatement:
          case Syntax.DirectiveStatement:
          case Syntax.DoWhileStatement:
          case Syntax.DebuggerStatement:
          case Syntax.EmptyStatement:
          case Syntax.ExpressionStatement:
          case Syntax.ForStatement:
          case Syntax.ForInStatement:
          case Syntax.FunctionDeclaration:
          case Syntax.IfStatement:
          case Syntax.LabeledStatement:
          case Syntax.Program:
          case Syntax.ReturnStatement:
          case Syntax.SwitchStatement:
          case Syntax.SwitchCase:
          case Syntax.ThrowStatement:
          case Syntax.TryStatement:
          case Syntax.VariableDeclaration:
          case Syntax.VariableDeclarator:
          case Syntax.WhileStatement:
          case Syntax.WithStatement:
              result = generateStatement(node);
              break;

          case Syntax.AssignmentExpression:
          case Syntax.ArrayExpression:
          case Syntax.ArrayPattern:
          case Syntax.BinaryExpression:
          case Syntax.CallExpression:
          case Syntax.ConditionalExpression:
          case Syntax.FunctionExpression:
          case Syntax.Identifier:
          case Syntax.Literal:
          case Syntax.LogicalExpression:
          case Syntax.MemberExpression:
          case Syntax.NewExpression:
          case Syntax.ObjectExpression:
          case Syntax.ObjectPattern:
          case Syntax.Property:
          case Syntax.SequenceExpression:
          case Syntax.ThisExpression:
          case Syntax.UnaryExpression:
          case Syntax.UpdateExpression:
          case Syntax.YieldExpression:

              result = generateExpression(node, {
                  precedence: Precedence.Sequence,
                  allowIn: true,
                  allowCall: true
              });
              break;

          default:
              throw new Error('Unknown node type: ' + node.type);
          }

          if (!sourceMap$1) {
              return result.toString();
          }

          pair = result.toStringWithSourceMap({
              file: options.file,
              sourceRoot: options.sourceMapRoot
          });

          if (options.sourceMapWithCode) {
              return pair;
          }
          return pair.map.toString();
      }

      FORMAT_MINIFY = {
          indent: {
              style: '',
              base: 0
          },
          renumber: true,
          hexadecimal: true,
          quotes: 'auto',
          escapeless: true,
          compact: true,
          parentheses: false,
          semicolons: false
      };

      FORMAT_DEFAULTS = getDefaultOptions().format;

      exports.version = require$$2.version;
      exports.generate = generate;
      exports.attachComments = estraverse$1.attachComments;
      exports.browser = false;
      exports.FORMAT_MINIFY = FORMAT_MINIFY;
      exports.FORMAT_DEFAULTS = FORMAT_DEFAULTS;
  }());
  /* vim: set sw=4 ts=4 et tw=80 : */
  });
  var escodegen_1 = escodegen.version;
  var escodegen_2 = escodegen.generate;
  var escodegen_3 = escodegen.attachComments;
  var escodegen_4 = escodegen.browser;
  var escodegen_5 = escodegen.FORMAT_MINIFY;
  var escodegen_6 = escodegen.FORMAT_DEFAULTS;

  var unparse = escodegen.generate;

  var staticEval = function (ast, vars) {
      if (!vars) { vars = {}; }
      var FAIL = {};
      
      var result = (function walk (node) {
          if (node.type === 'Literal') {
              return node.value;
          }
          else if (node.type === 'UnaryExpression'){
              var val = walk(node.argument);
              if (node.operator === '+') { return +val }
              if (node.operator === '-') { return -val }
              if (node.operator === '~') { return ~val }
              if (node.operator === '!') { return !val }
              return FAIL
          }
          else if (node.type === 'ArrayExpression') {
              var xs = [];
              for (var i = 0, l = node.elements.length; i < l; i++) {
                  var x = walk(node.elements[i]);
                  if (x === FAIL) { return FAIL; }
                  xs.push(x);
              }
              return xs;
          }
          else if (node.type === 'ObjectExpression') {
              var obj = {};
              for (var i = 0; i < node.properties.length; i++) {
                  var prop = node.properties[i];
                  var value = prop.value === null
                      ? prop.value
                      : walk(prop.value)
                  ;
                  if (value === FAIL) { return FAIL; }
                  obj[prop.key.value || prop.key.name] = value;
              }
              return obj;
          }
          else if (node.type === 'BinaryExpression' ||
                   node.type === 'LogicalExpression') {
              var l = walk(node.left);
              if (l === FAIL) { return FAIL; }
              var r = walk(node.right);
              if (r === FAIL) { return FAIL; }
              
              var op = node.operator;
              if (op === '==') { return l == r; }
              if (op === '===') { return l === r; }
              if (op === '!=') { return l != r; }
              if (op === '!==') { return l !== r; }
              if (op === '+') { return l + r; }
              if (op === '-') { return l - r; }
              if (op === '*') { return l * r; }
              if (op === '/') { return l / r; }
              if (op === '%') { return l % r; }
              if (op === '<') { return l < r; }
              if (op === '<=') { return l <= r; }
              if (op === '>') { return l > r; }
              if (op === '>=') { return l >= r; }
              if (op === '|') { return l | r; }
              if (op === '&') { return l & r; }
              if (op === '^') { return l ^ r; }
              if (op === '&&') { return l && r; }
              if (op === '||') { return l || r; }
              
              return FAIL;
          }
          else if (node.type === 'Identifier') {
              if ({}.hasOwnProperty.call(vars, node.name)) {
                  return vars[node.name];
              }
              else { return FAIL; }
          }
          else if (node.type === 'CallExpression') {
              var callee = walk(node.callee);
              if (callee === FAIL) { return FAIL; }
              
              var ctx = node.callee.object ? walk(node.callee.object) : FAIL;
              if (ctx === FAIL) { ctx = null; }

              var args = [];
              for (var i = 0, l = node.arguments.length; i < l; i++) {
                  var x = walk(node.arguments[i]);
                  if (x === FAIL) { return FAIL; }
                  args.push(x);
              }
              return callee.apply(ctx, args);
          }
          else if (node.type === 'MemberExpression') {
              var obj = walk(node.object);
              if (obj === FAIL) { return FAIL; }
              if (node.property.type === 'Identifier') {
                  return obj[node.property.name];
              }
              var prop = walk(node.property);
              if (prop === FAIL) { return FAIL; }
              return obj[prop];
          }
          else if (node.type === 'ConditionalExpression') {
              var val = walk(node.test);
              if (val === FAIL) { return FAIL; }
              return val ? walk(node.consequent) : walk(node.alternate)
          }
          else if (node.type === 'FunctionExpression') {
              return Function('return ' + unparse(node))();
          }
          else { return FAIL; }
      })(ast);
      
      return result === FAIL ? undefined : result;
  };

  var underscore = createCommonjsModule(function (module, exports) {
  //     Underscore.js 1.7.0
  //     http://underscorejs.org
  //     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
  //     Underscore may be freely distributed under the MIT license.

  (function() {

    // Baseline setup
    // --------------

    // Establish the root object, `window` in the browser, or `exports` on the server.
    var root = this;

    // Save the previous value of the `_` variable.
    var previousUnderscore = root._;

    // Save bytes in the minified (but not gzipped) version:
    var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

    // Create quick reference variables for speed access to core prototypes.
    var
      push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

    // All **ECMAScript 5** native function implementations that we hope to use
    // are declared here.
    var
      nativeIsArray      = Array.isArray,
      nativeKeys         = Object.keys,
      nativeBind         = FuncProto.bind;

    // Create a safe reference to the Underscore object for use below.
    var _ = function(obj) {
      if (obj instanceof _) { return obj; }
      if (!(this instanceof _)) { return new _(obj); }
      this._wrapped = obj;
    };

    // Export the Underscore object for **Node.js**, with
    // backwards-compatibility for the old `require()` API. If we're in
    // the browser, add `_` as a global object.
    {
      if (module.exports) {
        exports = module.exports = _;
      }
      exports._ = _;
    }

    // Current version.
    _.VERSION = '1.7.0';

    // Internal function that returns an efficient (for current engines) version
    // of the passed-in callback, to be repeatedly applied in other Underscore
    // functions.
    var createCallback = function(func, context, argCount) {
      if (context === void 0) { return func; }
      switch (argCount == null ? 3 : argCount) {
        case 1: return function(value) {
          return func.call(context, value);
        };
        case 2: return function(value, other) {
          return func.call(context, value, other);
        };
        case 3: return function(value, index, collection) {
          return func.call(context, value, index, collection);
        };
        case 4: return function(accumulator, value, index, collection) {
          return func.call(context, accumulator, value, index, collection);
        };
      }
      return function() {
        return func.apply(context, arguments);
      };
    };

    // A mostly-internal function to generate callbacks that can be applied
    // to each element in a collection, returning the desired result — either
    // identity, an arbitrary callback, a property matcher, or a property accessor.
    _.iteratee = function(value, context, argCount) {
      if (value == null) { return _.identity; }
      if (_.isFunction(value)) { return createCallback(value, context, argCount); }
      if (_.isObject(value)) { return _.matches(value); }
      return _.property(value);
    };

    // Collection Functions
    // --------------------

    // The cornerstone, an `each` implementation, aka `forEach`.
    // Handles raw objects in addition to array-likes. Treats all
    // sparse array-likes as if they were dense.
    _.each = _.forEach = function(obj, iteratee, context) {
      if (obj == null) { return obj; }
      iteratee = createCallback(iteratee, context);
      var i, length = obj.length;
      if (length === +length) {
        for (i = 0; i < length; i++) {
          iteratee(obj[i], i, obj);
        }
      } else {
        var keys = _.keys(obj);
        for (i = 0, length = keys.length; i < length; i++) {
          iteratee(obj[keys[i]], keys[i], obj);
        }
      }
      return obj;
    };

    // Return the results of applying the iteratee to each element.
    _.map = _.collect = function(obj, iteratee, context) {
      if (obj == null) { return []; }
      iteratee = _.iteratee(iteratee, context);
      var keys = obj.length !== +obj.length && _.keys(obj),
          length = (keys || obj).length,
          results = Array(length),
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys ? keys[index] : index;
        results[index] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
    };

    var reduceError = 'Reduce of empty array with no initial value';

    // **Reduce** builds up a single result from a list of values, aka `inject`,
    // or `foldl`.
    _.reduce = _.foldl = _.inject = function(obj, iteratee, memo, context) {
      if (obj == null) { obj = []; }
      iteratee = createCallback(iteratee, context, 4);
      var keys = obj.length !== +obj.length && _.keys(obj),
          length = (keys || obj).length,
          index = 0, currentKey;
      if (arguments.length < 3) {
        if (!length) { throw new TypeError(reduceError); }
        memo = obj[keys ? keys[index++] : index++];
      }
      for (; index < length; index++) {
        currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    };

    // The right-associative version of reduce, also known as `foldr`.
    _.reduceRight = _.foldr = function(obj, iteratee, memo, context) {
      if (obj == null) { obj = []; }
      iteratee = createCallback(iteratee, context, 4);
      var keys = obj.length !== + obj.length && _.keys(obj),
          index = (keys || obj).length,
          currentKey;
      if (arguments.length < 3) {
        if (!index) { throw new TypeError(reduceError); }
        memo = obj[keys ? keys[--index] : --index];
      }
      while (index--) {
        currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    };

    // Return the first value which passes a truth test. Aliased as `detect`.
    _.find = _.detect = function(obj, predicate, context) {
      var result;
      predicate = _.iteratee(predicate, context);
      _.some(obj, function(value, index, list) {
        if (predicate(value, index, list)) {
          result = value;
          return true;
        }
      });
      return result;
    };

    // Return all the elements that pass a truth test.
    // Aliased as `select`.
    _.filter = _.select = function(obj, predicate, context) {
      var results = [];
      if (obj == null) { return results; }
      predicate = _.iteratee(predicate, context);
      _.each(obj, function(value, index, list) {
        if (predicate(value, index, list)) { results.push(value); }
      });
      return results;
    };

    // Return all the elements for which a truth test fails.
    _.reject = function(obj, predicate, context) {
      return _.filter(obj, _.negate(_.iteratee(predicate)), context);
    };

    // Determine whether all of the elements match a truth test.
    // Aliased as `all`.
    _.every = _.all = function(obj, predicate, context) {
      if (obj == null) { return true; }
      predicate = _.iteratee(predicate, context);
      var keys = obj.length !== +obj.length && _.keys(obj),
          length = (keys || obj).length,
          index, currentKey;
      for (index = 0; index < length; index++) {
        currentKey = keys ? keys[index] : index;
        if (!predicate(obj[currentKey], currentKey, obj)) { return false; }
      }
      return true;
    };

    // Determine if at least one element in the object matches a truth test.
    // Aliased as `any`.
    _.some = _.any = function(obj, predicate, context) {
      if (obj == null) { return false; }
      predicate = _.iteratee(predicate, context);
      var keys = obj.length !== +obj.length && _.keys(obj),
          length = (keys || obj).length,
          index, currentKey;
      for (index = 0; index < length; index++) {
        currentKey = keys ? keys[index] : index;
        if (predicate(obj[currentKey], currentKey, obj)) { return true; }
      }
      return false;
    };

    // Determine if the array or object contains a given value (using `===`).
    // Aliased as `include`.
    _.contains = _.include = function(obj, target) {
      if (obj == null) { return false; }
      if (obj.length !== +obj.length) { obj = _.values(obj); }
      return _.indexOf(obj, target) >= 0;
    };

    // Invoke a method (with arguments) on every item in a collection.
    _.invoke = function(obj, method) {
      var args = slice.call(arguments, 2);
      var isFunc = _.isFunction(method);
      return _.map(obj, function(value) {
        return (isFunc ? method : value[method]).apply(value, args);
      });
    };

    // Convenience version of a common use case of `map`: fetching a property.
    _.pluck = function(obj, key) {
      return _.map(obj, _.property(key));
    };

    // Convenience version of a common use case of `filter`: selecting only objects
    // containing specific `key:value` pairs.
    _.where = function(obj, attrs) {
      return _.filter(obj, _.matches(attrs));
    };

    // Convenience version of a common use case of `find`: getting the first object
    // containing specific `key:value` pairs.
    _.findWhere = function(obj, attrs) {
      return _.find(obj, _.matches(attrs));
    };

    // Return the maximum element (or element-based computation).
    _.max = function(obj, iteratee, context) {
      var result = -Infinity, lastComputed = -Infinity,
          value, computed;
      if (iteratee == null && obj != null) {
        obj = obj.length === +obj.length ? obj : _.values(obj);
        for (var i = 0, length = obj.length; i < length; i++) {
          value = obj[i];
          if (value > result) {
            result = value;
          }
        }
      } else {
        iteratee = _.iteratee(iteratee, context);
        _.each(obj, function(value, index, list) {
          computed = iteratee(value, index, list);
          if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
            result = value;
            lastComputed = computed;
          }
        });
      }
      return result;
    };

    // Return the minimum element (or element-based computation).
    _.min = function(obj, iteratee, context) {
      var result = Infinity, lastComputed = Infinity,
          value, computed;
      if (iteratee == null && obj != null) {
        obj = obj.length === +obj.length ? obj : _.values(obj);
        for (var i = 0, length = obj.length; i < length; i++) {
          value = obj[i];
          if (value < result) {
            result = value;
          }
        }
      } else {
        iteratee = _.iteratee(iteratee, context);
        _.each(obj, function(value, index, list) {
          computed = iteratee(value, index, list);
          if (computed < lastComputed || computed === Infinity && result === Infinity) {
            result = value;
            lastComputed = computed;
          }
        });
      }
      return result;
    };

    // Shuffle a collection, using the modern version of the
    // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
    _.shuffle = function(obj) {
      var set = obj && obj.length === +obj.length ? obj : _.values(obj);
      var length = set.length;
      var shuffled = Array(length);
      for (var index = 0, rand; index < length; index++) {
        rand = _.random(0, index);
        if (rand !== index) { shuffled[index] = shuffled[rand]; }
        shuffled[rand] = set[index];
      }
      return shuffled;
    };

    // Sample **n** random values from a collection.
    // If **n** is not specified, returns a single random element.
    // The internal `guard` argument allows it to work with `map`.
    _.sample = function(obj, n, guard) {
      if (n == null || guard) {
        if (obj.length !== +obj.length) { obj = _.values(obj); }
        return obj[_.random(obj.length - 1)];
      }
      return _.shuffle(obj).slice(0, Math.max(0, n));
    };

    // Sort the object's values by a criterion produced by an iteratee.
    _.sortBy = function(obj, iteratee, context) {
      iteratee = _.iteratee(iteratee, context);
      return _.pluck(_.map(obj, function(value, index, list) {
        return {
          value: value,
          index: index,
          criteria: iteratee(value, index, list)
        };
      }).sort(function(left, right) {
        var a = left.criteria;
        var b = right.criteria;
        if (a !== b) {
          if (a > b || a === void 0) { return 1; }
          if (a < b || b === void 0) { return -1; }
        }
        return left.index - right.index;
      }), 'value');
    };

    // An internal function used for aggregate "group by" operations.
    var group = function(behavior) {
      return function(obj, iteratee, context) {
        var result = {};
        iteratee = _.iteratee(iteratee, context);
        _.each(obj, function(value, index) {
          var key = iteratee(value, index, obj);
          behavior(result, value, key);
        });
        return result;
      };
    };

    // Groups the object's values by a criterion. Pass either a string attribute
    // to group by, or a function that returns the criterion.
    _.groupBy = group(function(result, value, key) {
      if (_.has(result, key)) { result[key].push(value); } else { result[key] = [value]; }
    });

    // Indexes the object's values by a criterion, similar to `groupBy`, but for
    // when you know that your index values will be unique.
    _.indexBy = group(function(result, value, key) {
      result[key] = value;
    });

    // Counts instances of an object that group by a certain criterion. Pass
    // either a string attribute to count by, or a function that returns the
    // criterion.
    _.countBy = group(function(result, value, key) {
      if (_.has(result, key)) { result[key]++; } else { result[key] = 1; }
    });

    // Use a comparator function to figure out the smallest index at which
    // an object should be inserted so as to maintain order. Uses binary search.
    _.sortedIndex = function(array, obj, iteratee, context) {
      iteratee = _.iteratee(iteratee, context, 1);
      var value = iteratee(obj);
      var low = 0, high = array.length;
      while (low < high) {
        var mid = low + high >>> 1;
        if (iteratee(array[mid]) < value) { low = mid + 1; } else { high = mid; }
      }
      return low;
    };

    // Safely create a real, live array from anything iterable.
    _.toArray = function(obj) {
      if (!obj) { return []; }
      if (_.isArray(obj)) { return slice.call(obj); }
      if (obj.length === +obj.length) { return _.map(obj, _.identity); }
      return _.values(obj);
    };

    // Return the number of elements in an object.
    _.size = function(obj) {
      if (obj == null) { return 0; }
      return obj.length === +obj.length ? obj.length : _.keys(obj).length;
    };

    // Split a collection into two arrays: one whose elements all satisfy the given
    // predicate, and one whose elements all do not satisfy the predicate.
    _.partition = function(obj, predicate, context) {
      predicate = _.iteratee(predicate, context);
      var pass = [], fail = [];
      _.each(obj, function(value, key, obj) {
        (predicate(value, key, obj) ? pass : fail).push(value);
      });
      return [pass, fail];
    };

    // Array Functions
    // ---------------

    // Get the first element of an array. Passing **n** will return the first N
    // values in the array. Aliased as `head` and `take`. The **guard** check
    // allows it to work with `_.map`.
    _.first = _.head = _.take = function(array, n, guard) {
      if (array == null) { return void 0; }
      if (n == null || guard) { return array[0]; }
      if (n < 0) { return []; }
      return slice.call(array, 0, n);
    };

    // Returns everything but the last entry of the array. Especially useful on
    // the arguments object. Passing **n** will return all the values in
    // the array, excluding the last N. The **guard** check allows it to work with
    // `_.map`.
    _.initial = function(array, n, guard) {
      return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
    };

    // Get the last element of an array. Passing **n** will return the last N
    // values in the array. The **guard** check allows it to work with `_.map`.
    _.last = function(array, n, guard) {
      if (array == null) { return void 0; }
      if (n == null || guard) { return array[array.length - 1]; }
      return slice.call(array, Math.max(array.length - n, 0));
    };

    // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
    // Especially useful on the arguments object. Passing an **n** will return
    // the rest N values in the array. The **guard**
    // check allows it to work with `_.map`.
    _.rest = _.tail = _.drop = function(array, n, guard) {
      return slice.call(array, n == null || guard ? 1 : n);
    };

    // Trim out all falsy values from an array.
    _.compact = function(array) {
      return _.filter(array, _.identity);
    };

    // Internal implementation of a recursive `flatten` function.
    var flatten = function(input, shallow, strict, output) {
      if (shallow && _.every(input, _.isArray)) {
        return concat.apply(output, input);
      }
      for (var i = 0, length = input.length; i < length; i++) {
        var value = input[i];
        if (!_.isArray(value) && !_.isArguments(value)) {
          if (!strict) { output.push(value); }
        } else if (shallow) {
          push.apply(output, value);
        } else {
          flatten(value, shallow, strict, output);
        }
      }
      return output;
    };

    // Flatten out an array, either recursively (by default), or just one level.
    _.flatten = function(array, shallow) {
      return flatten(array, shallow, false, []);
    };

    // Return a version of the array that does not contain the specified value(s).
    _.without = function(array) {
      return _.difference(array, slice.call(arguments, 1));
    };

    // Produce a duplicate-free version of the array. If the array has already
    // been sorted, you have the option of using a faster algorithm.
    // Aliased as `unique`.
    _.uniq = _.unique = function(array, isSorted, iteratee, context) {
      if (array == null) { return []; }
      if (!_.isBoolean(isSorted)) {
        context = iteratee;
        iteratee = isSorted;
        isSorted = false;
      }
      if (iteratee != null) { iteratee = _.iteratee(iteratee, context); }
      var result = [];
      var seen = [];
      for (var i = 0, length = array.length; i < length; i++) {
        var value = array[i];
        if (isSorted) {
          if (!i || seen !== value) { result.push(value); }
          seen = value;
        } else if (iteratee) {
          var computed = iteratee(value, i, array);
          if (_.indexOf(seen, computed) < 0) {
            seen.push(computed);
            result.push(value);
          }
        } else if (_.indexOf(result, value) < 0) {
          result.push(value);
        }
      }
      return result;
    };

    // Produce an array that contains the union: each distinct element from all of
    // the passed-in arrays.
    _.union = function() {
      return _.uniq(flatten(arguments, true, true, []));
    };

    // Produce an array that contains every item shared between all the
    // passed-in arrays.
    _.intersection = function(array) {
      var arguments$1 = arguments;

      if (array == null) { return []; }
      var result = [];
      var argsLength = arguments.length;
      for (var i = 0, length = array.length; i < length; i++) {
        var item = array[i];
        if (_.contains(result, item)) { continue; }
        for (var j = 1; j < argsLength; j++) {
          if (!_.contains(arguments$1[j], item)) { break; }
        }
        if (j === argsLength) { result.push(item); }
      }
      return result;
    };

    // Take the difference between one array and a number of other arrays.
    // Only the elements present in just the first array will remain.
    _.difference = function(array) {
      var rest = flatten(slice.call(arguments, 1), true, true, []);
      return _.filter(array, function(value){
        return !_.contains(rest, value);
      });
    };

    // Zip together multiple lists into a single array -- elements that share
    // an index go together.
    _.zip = function(array) {
      var arguments$1 = arguments;

      if (array == null) { return []; }
      var length = _.max(arguments, 'length').length;
      var results = Array(length);
      for (var i = 0; i < length; i++) {
        results[i] = _.pluck(arguments$1, i);
      }
      return results;
    };

    // Converts lists into objects. Pass either a single array of `[key, value]`
    // pairs, or two parallel arrays of the same length -- one of keys, and one of
    // the corresponding values.
    _.object = function(list, values) {
      if (list == null) { return {}; }
      var result = {};
      for (var i = 0, length = list.length; i < length; i++) {
        if (values) {
          result[list[i]] = values[i];
        } else {
          result[list[i][0]] = list[i][1];
        }
      }
      return result;
    };

    // Return the position of the first occurrence of an item in an array,
    // or -1 if the item is not included in the array.
    // If the array is large and already in sort order, pass `true`
    // for **isSorted** to use binary search.
    _.indexOf = function(array, item, isSorted) {
      if (array == null) { return -1; }
      var i = 0, length = array.length;
      if (isSorted) {
        if (typeof isSorted == 'number') {
          i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
        } else {
          i = _.sortedIndex(array, item);
          return array[i] === item ? i : -1;
        }
      }
      for (; i < length; i++) { if (array[i] === item) { return i; } }
      return -1;
    };

    _.lastIndexOf = function(array, item, from) {
      if (array == null) { return -1; }
      var idx = array.length;
      if (typeof from == 'number') {
        idx = from < 0 ? idx + from + 1 : Math.min(idx, from + 1);
      }
      while (--idx >= 0) { if (array[idx] === item) { return idx; } }
      return -1;
    };

    // Generate an integer Array containing an arithmetic progression. A port of
    // the native Python `range()` function. See
    // [the Python documentation](http://docs.python.org/library/functions.html#range).
    _.range = function(start, stop, step) {
      if (arguments.length <= 1) {
        stop = start || 0;
        start = 0;
      }
      step = step || 1;

      var length = Math.max(Math.ceil((stop - start) / step), 0);
      var range = Array(length);

      for (var idx = 0; idx < length; idx++, start += step) {
        range[idx] = start;
      }

      return range;
    };

    // Function (ahem) Functions
    // ------------------

    // Reusable constructor function for prototype setting.
    var Ctor = function(){};

    // Create a function bound to a given object (assigning `this`, and arguments,
    // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
    // available.
    _.bind = function(func, context) {
      var args, bound;
      if (nativeBind && func.bind === nativeBind) { return nativeBind.apply(func, slice.call(arguments, 1)); }
      if (!_.isFunction(func)) { throw new TypeError('Bind must be called on a function'); }
      args = slice.call(arguments, 2);
      bound = function() {
        if (!(this instanceof bound)) { return func.apply(context, args.concat(slice.call(arguments))); }
        Ctor.prototype = func.prototype;
        var self = new Ctor;
        Ctor.prototype = null;
        var result = func.apply(self, args.concat(slice.call(arguments)));
        if (_.isObject(result)) { return result; }
        return self;
      };
      return bound;
    };

    // Partially apply a function by creating a version that has had some of its
    // arguments pre-filled, without changing its dynamic `this` context. _ acts
    // as a placeholder, allowing any combination of arguments to be pre-filled.
    _.partial = function(func) {
      var boundArgs = slice.call(arguments, 1);
      return function() {
        var arguments$1 = arguments;

        var position = 0;
        var args = boundArgs.slice();
        for (var i = 0, length = args.length; i < length; i++) {
          if (args[i] === _) { args[i] = arguments$1[position++]; }
        }
        while (position < arguments.length) { args.push(arguments$1[position++]); }
        return func.apply(this, args);
      };
    };

    // Bind a number of an object's methods to that object. Remaining arguments
    // are the method names to be bound. Useful for ensuring that all callbacks
    // defined on an object belong to it.
    _.bindAll = function(obj) {
      var arguments$1 = arguments;

      var i, length = arguments.length, key;
      if (length <= 1) { throw new Error('bindAll must be passed function names'); }
      for (i = 1; i < length; i++) {
        key = arguments$1[i];
        obj[key] = _.bind(obj[key], obj);
      }
      return obj;
    };

    // Memoize an expensive function by storing its results.
    _.memoize = function(func, hasher) {
      var memoize = function(key) {
        var cache = memoize.cache;
        var address = hasher ? hasher.apply(this, arguments) : key;
        if (!_.has(cache, address)) { cache[address] = func.apply(this, arguments); }
        return cache[address];
      };
      memoize.cache = {};
      return memoize;
    };

    // Delays a function for the given number of milliseconds, and then calls
    // it with the arguments supplied.
    _.delay = function(func, wait) {
      var args = slice.call(arguments, 2);
      return setTimeout(function(){
        return func.apply(null, args);
      }, wait);
    };

    // Defers a function, scheduling it to run after the current call stack has
    // cleared.
    _.defer = function(func) {
      return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
    };

    // Returns a function, that, when invoked, will only be triggered at most once
    // during a given window of time. Normally, the throttled function will run
    // as much as it can, without ever going more than once per `wait` duration;
    // but if you'd like to disable the execution on the leading edge, pass
    // `{leading: false}`. To disable execution on the trailing edge, ditto.
    _.throttle = function(func, wait, options) {
      var context, args, result;
      var timeout = null;
      var previous = 0;
      if (!options) { options = {}; }
      var later = function() {
        previous = options.leading === false ? 0 : _.now();
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) { context = args = null; }
      };
      return function() {
        var now = _.now();
        if (!previous && options.leading === false) { previous = now; }
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0 || remaining > wait) {
          clearTimeout(timeout);
          timeout = null;
          previous = now;
          result = func.apply(context, args);
          if (!timeout) { context = args = null; }
        } else if (!timeout && options.trailing !== false) {
          timeout = setTimeout(later, remaining);
        }
        return result;
      };
    };

    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds. If `immediate` is passed, trigger the function on the
    // leading edge, instead of the trailing.
    _.debounce = function(func, wait, immediate) {
      var timeout, args, context, timestamp, result;

      var later = function() {
        var last = _.now() - timestamp;

        if (last < wait && last > 0) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) {
            result = func.apply(context, args);
            if (!timeout) { context = args = null; }
          }
        }
      };

      return function() {
        context = this;
        args = arguments;
        timestamp = _.now();
        var callNow = immediate && !timeout;
        if (!timeout) { timeout = setTimeout(later, wait); }
        if (callNow) {
          result = func.apply(context, args);
          context = args = null;
        }

        return result;
      };
    };

    // Returns the first function passed as an argument to the second,
    // allowing you to adjust arguments, run code before and after, and
    // conditionally execute the original function.
    _.wrap = function(func, wrapper) {
      return _.partial(wrapper, func);
    };

    // Returns a negated version of the passed-in predicate.
    _.negate = function(predicate) {
      return function() {
        return !predicate.apply(this, arguments);
      };
    };

    // Returns a function that is the composition of a list of functions, each
    // consuming the return value of the function that follows.
    _.compose = function() {
      var args = arguments;
      var start = args.length - 1;
      return function() {
        var i = start;
        var result = args[start].apply(this, arguments);
        while (i--) { result = args[i].call(this, result); }
        return result;
      };
    };

    // Returns a function that will only be executed after being called N times.
    _.after = function(times, func) {
      return function() {
        if (--times < 1) {
          return func.apply(this, arguments);
        }
      };
    };

    // Returns a function that will only be executed before being called N times.
    _.before = function(times, func) {
      var memo;
      return function() {
        if (--times > 0) {
          memo = func.apply(this, arguments);
        } else {
          func = null;
        }
        return memo;
      };
    };

    // Returns a function that will be executed at most one time, no matter how
    // often you call it. Useful for lazy initialization.
    _.once = _.partial(_.before, 2);

    // Object Functions
    // ----------------

    // Retrieve the names of an object's properties.
    // Delegates to **ECMAScript 5**'s native `Object.keys`
    _.keys = function(obj) {
      if (!_.isObject(obj)) { return []; }
      if (nativeKeys) { return nativeKeys(obj); }
      var keys = [];
      for (var key in obj) { if (_.has(obj, key)) { keys.push(key); } }
      return keys;
    };

    // Retrieve the values of an object's properties.
    _.values = function(obj) {
      var keys = _.keys(obj);
      var length = keys.length;
      var values = Array(length);
      for (var i = 0; i < length; i++) {
        values[i] = obj[keys[i]];
      }
      return values;
    };

    // Convert an object into a list of `[key, value]` pairs.
    _.pairs = function(obj) {
      var keys = _.keys(obj);
      var length = keys.length;
      var pairs = Array(length);
      for (var i = 0; i < length; i++) {
        pairs[i] = [keys[i], obj[keys[i]]];
      }
      return pairs;
    };

    // Invert the keys and values of an object. The values must be serializable.
    _.invert = function(obj) {
      var result = {};
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        result[obj[keys[i]]] = keys[i];
      }
      return result;
    };

    // Return a sorted list of the function names available on the object.
    // Aliased as `methods`
    _.functions = _.methods = function(obj) {
      var names = [];
      for (var key in obj) {
        if (_.isFunction(obj[key])) { names.push(key); }
      }
      return names.sort();
    };

    // Extend a given object with all the properties in passed-in object(s).
    _.extend = function(obj) {
      var arguments$1 = arguments;

      if (!_.isObject(obj)) { return obj; }
      var source, prop;
      for (var i = 1, length = arguments.length; i < length; i++) {
        source = arguments$1[i];
        for (prop in source) {
          if (hasOwnProperty.call(source, prop)) {
              obj[prop] = source[prop];
          }
        }
      }
      return obj;
    };

    // Return a copy of the object only containing the whitelisted properties.
    _.pick = function(obj, iteratee, context) {
      var result = {}, key;
      if (obj == null) { return result; }
      if (_.isFunction(iteratee)) {
        iteratee = createCallback(iteratee, context);
        for (key in obj) {
          var value = obj[key];
          if (iteratee(value, key, obj)) { result[key] = value; }
        }
      } else {
        var keys = concat.apply([], slice.call(arguments, 1));
        obj = new Object(obj);
        for (var i = 0, length = keys.length; i < length; i++) {
          key = keys[i];
          if (key in obj) { result[key] = obj[key]; }
        }
      }
      return result;
    };

     // Return a copy of the object without the blacklisted properties.
    _.omit = function(obj, iteratee, context) {
      if (_.isFunction(iteratee)) {
        iteratee = _.negate(iteratee);
      } else {
        var keys = _.map(concat.apply([], slice.call(arguments, 1)), String);
        iteratee = function(value, key) {
          return !_.contains(keys, key);
        };
      }
      return _.pick(obj, iteratee, context);
    };

    // Fill in a given object with default properties.
    _.defaults = function(obj) {
      var arguments$1 = arguments;

      if (!_.isObject(obj)) { return obj; }
      for (var i = 1, length = arguments.length; i < length; i++) {
        var source = arguments$1[i];
        for (var prop in source) {
          if (obj[prop] === void 0) { obj[prop] = source[prop]; }
        }
      }
      return obj;
    };

    // Create a (shallow-cloned) duplicate of an object.
    _.clone = function(obj) {
      if (!_.isObject(obj)) { return obj; }
      return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
    };

    // Invokes interceptor with the obj, and then returns obj.
    // The primary purpose of this method is to "tap into" a method chain, in
    // order to perform operations on intermediate results within the chain.
    _.tap = function(obj, interceptor) {
      interceptor(obj);
      return obj;
    };

    // Internal recursive comparison function for `isEqual`.
    var eq = function(a, b, aStack, bStack) {
      // Identical objects are equal. `0 === -0`, but they aren't identical.
      // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
      if (a === b) { return a !== 0 || 1 / a === 1 / b; }
      // A strict comparison is necessary because `null == undefined`.
      if (a == null || b == null) { return a === b; }
      // Unwrap any wrapped objects.
      if (a instanceof _) { a = a._wrapped; }
      if (b instanceof _) { b = b._wrapped; }
      // Compare `[[Class]]` names.
      var className = toString.call(a);
      if (className !== toString.call(b)) { return false; }
      switch (className) {
        // Strings, numbers, regular expressions, dates, and booleans are compared by value.
        case '[object RegExp]':
        // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
        case '[object String]':
          // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
          // equivalent to `new String("5")`.
          return '' + a === '' + b;
        case '[object Number]':
          // `NaN`s are equivalent, but non-reflexive.
          // Object(NaN) is equivalent to NaN
          if (+a !== +a) { return +b !== +b; }
          // An `egal` comparison is performed for other numeric values.
          return +a === 0 ? 1 / +a === 1 / b : +a === +b;
        case '[object Date]':
        case '[object Boolean]':
          // Coerce dates and booleans to numeric primitive values. Dates are compared by their
          // millisecond representations. Note that invalid dates with millisecond representations
          // of `NaN` are not equivalent.
          return +a === +b;
      }
      if (typeof a != 'object' || typeof b != 'object') { return false; }
      // Assume equality for cyclic structures. The algorithm for detecting cyclic
      // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
      var length = aStack.length;
      while (length--) {
        // Linear search. Performance is inversely proportional to the number of
        // unique nested structures.
        if (aStack[length] === a) { return bStack[length] === b; }
      }
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (
        aCtor !== bCtor &&
        // Handle Object.create(x) cases
        'constructor' in a && 'constructor' in b &&
        !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
          _.isFunction(bCtor) && bCtor instanceof bCtor)
      ) {
        return false;
      }
      // Add the first object to the stack of traversed objects.
      aStack.push(a);
      bStack.push(b);
      var size, result;
      // Recursively compare objects and arrays.
      if (className === '[object Array]') {
        // Compare array lengths to determine if a deep comparison is necessary.
        size = a.length;
        result = size === b.length;
        if (result) {
          // Deep compare the contents, ignoring non-numeric properties.
          while (size--) {
            if (!(result = eq(a[size], b[size], aStack, bStack))) { break; }
          }
        }
      } else {
        // Deep compare objects.
        var keys = _.keys(a), key;
        size = keys.length;
        // Ensure that both objects contain the same number of properties before comparing deep equality.
        result = _.keys(b).length === size;
        if (result) {
          while (size--) {
            // Deep compare each member
            key = keys[size];
            if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) { break; }
          }
        }
      }
      // Remove the first object from the stack of traversed objects.
      aStack.pop();
      bStack.pop();
      return result;
    };

    // Perform a deep comparison to check if two objects are equal.
    _.isEqual = function(a, b) {
      return eq(a, b, [], []);
    };

    // Is a given array, string, or object empty?
    // An "empty" object has no enumerable own-properties.
    _.isEmpty = function(obj) {
      if (obj == null) { return true; }
      if (_.isArray(obj) || _.isString(obj) || _.isArguments(obj)) { return obj.length === 0; }
      for (var key in obj) { if (_.has(obj, key)) { return false; } }
      return true;
    };

    // Is a given value a DOM element?
    _.isElement = function(obj) {
      return !!(obj && obj.nodeType === 1);
    };

    // Is a given value an array?
    // Delegates to ECMA5's native Array.isArray
    _.isArray = nativeIsArray || function(obj) {
      return toString.call(obj) === '[object Array]';
    };

    // Is a given variable an object?
    _.isObject = function(obj) {
      var type = typeof obj;
      return type === 'function' || type === 'object' && !!obj;
    };

    // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
    _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
      _['is' + name] = function(obj) {
        return toString.call(obj) === '[object ' + name + ']';
      };
    });

    // Define a fallback version of the method in browsers (ahem, IE), where
    // there isn't any inspectable "Arguments" type.
    if (!_.isArguments(arguments)) {
      _.isArguments = function(obj) {
        return _.has(obj, 'callee');
      };
    }

    // Optimize `isFunction` if appropriate. Work around an IE 11 bug.
    {
      _.isFunction = function(obj) {
        return typeof obj == 'function' || false;
      };
    }

    // Is a given object a finite number?
    _.isFinite = function(obj) {
      return isFinite(obj) && !isNaN(parseFloat(obj));
    };

    // Is the given value `NaN`? (NaN is the only number which does not equal itself).
    _.isNaN = function(obj) {
      return _.isNumber(obj) && obj !== +obj;
    };

    // Is a given value a boolean?
    _.isBoolean = function(obj) {
      return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
    };

    // Is a given value equal to null?
    _.isNull = function(obj) {
      return obj === null;
    };

    // Is a given variable undefined?
    _.isUndefined = function(obj) {
      return obj === void 0;
    };

    // Shortcut function for checking if an object has a given property directly
    // on itself (in other words, not on a prototype).
    _.has = function(obj, key) {
      return obj != null && hasOwnProperty.call(obj, key);
    };

    // Utility Functions
    // -----------------

    // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
    // previous owner. Returns a reference to the Underscore object.
    _.noConflict = function() {
      root._ = previousUnderscore;
      return this;
    };

    // Keep the identity function around for default iteratees.
    _.identity = function(value) {
      return value;
    };

    _.constant = function(value) {
      return function() {
        return value;
      };
    };

    _.noop = function(){};

    _.property = function(key) {
      return function(obj) {
        return obj[key];
      };
    };

    // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
    _.matches = function(attrs) {
      var pairs = _.pairs(attrs), length = pairs.length;
      return function(obj) {
        if (obj == null) { return !length; }
        obj = new Object(obj);
        for (var i = 0; i < length; i++) {
          var pair = pairs[i], key = pair[0];
          if (pair[1] !== obj[key] || !(key in obj)) { return false; }
        }
        return true;
      };
    };

    // Run a function **n** times.
    _.times = function(n, iteratee, context) {
      var accum = Array(Math.max(0, n));
      iteratee = createCallback(iteratee, context, 1);
      for (var i = 0; i < n; i++) { accum[i] = iteratee(i); }
      return accum;
    };

    // Return a random integer between min and max (inclusive).
    _.random = function(min, max) {
      if (max == null) {
        max = min;
        min = 0;
      }
      return min + Math.floor(Math.random() * (max - min + 1));
    };

    // A (possibly faster) way to get the current timestamp as an integer.
    _.now = Date.now || function() {
      return new Date().getTime();
    };

     // List of HTML entities for escaping.
    var escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '`': '&#x60;'
    };
    var unescapeMap = _.invert(escapeMap);

    // Functions for escaping and unescaping strings to/from HTML interpolation.
    var createEscaper = function(map) {
      var escaper = function(match) {
        return map[match];
      };
      // Regexes for identifying a key that needs to be escaped
      var source = '(?:' + _.keys(map).join('|') + ')';
      var testRegexp = RegExp(source);
      var replaceRegexp = RegExp(source, 'g');
      return function(string) {
        string = string == null ? '' : '' + string;
        return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
      };
    };
    _.escape = createEscaper(escapeMap);
    _.unescape = createEscaper(unescapeMap);

    // If the value of the named `property` is a function then invoke it with the
    // `object` as context; otherwise, return it.
    _.result = function(object, property) {
      if (object == null) { return void 0; }
      var value = object[property];
      return _.isFunction(value) ? object[property]() : value;
    };

    // Generate a unique integer id (unique within the entire client session).
    // Useful for temporary DOM ids.
    var idCounter = 0;
    _.uniqueId = function(prefix) {
      var id = ++idCounter + '';
      return prefix ? prefix + id : id;
    };

    // By default, Underscore uses ERB-style template delimiters, change the
    // following template settings to use alternative delimiters.
    _.templateSettings = {
      evaluate    : /<%([\s\S]+?)%>/g,
      interpolate : /<%=([\s\S]+?)%>/g,
      escape      : /<%-([\s\S]+?)%>/g
    };

    // When customizing `templateSettings`, if you don't want to define an
    // interpolation, evaluation or escaping regex, we need one that is
    // guaranteed not to match.
    var noMatch = /(.)^/;

    // Certain characters need to be escaped so that they can be put into a
    // string literal.
    var escapes = {
      "'":      "'",
      '\\':     '\\',
      '\r':     'r',
      '\n':     'n',
      '\u2028': 'u2028',
      '\u2029': 'u2029'
    };

    var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

    var escapeChar = function(match) {
      return '\\' + escapes[match];
    };

    // JavaScript micro-templating, similar to John Resig's implementation.
    // Underscore templating handles arbitrary delimiters, preserves whitespace,
    // and correctly escapes quotes within interpolated code.
    // NB: `oldSettings` only exists for backwards compatibility.
    _.template = function(text, settings, oldSettings) {
      if (!settings && oldSettings) { settings = oldSettings; }
      settings = _.defaults({}, settings, _.templateSettings);

      // Combine delimiters into one regular expression via alternation.
      var matcher = RegExp([
        (settings.escape || noMatch).source,
        (settings.interpolate || noMatch).source,
        (settings.evaluate || noMatch).source
      ].join('|') + '|$', 'g');

      // Compile the template source, escaping string literals appropriately.
      var index = 0;
      var source = "__p+='";
      text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
        source += text.slice(index, offset).replace(escaper, escapeChar);
        index = offset + match.length;

        if (escape) {
          source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
        } else if (interpolate) {
          source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
        } else if (evaluate) {
          source += "';\n" + evaluate + "\n__p+='";
        }

        // Adobe VMs need the match returned to produce the correct offest.
        return match;
      });
      source += "';\n";

      // If a variable is not specified, place data values in local scope.
      if (!settings.variable) { source = 'with(obj||{}){\n' + source + '}\n'; }

      source = "var __t,__p='',__j=Array.prototype.join," +
        "print=function(){__p+=__j.call(arguments,'');};\n" +
        source + 'return __p;\n';

      try {
        var render = new Function(settings.variable || 'obj', '_', source);
      } catch (e) {
        e.source = source;
        throw e;
      }

      var template = function(data) {
        return render.call(this, data, _);
      };

      // Provide the compiled source as a convenience for precompilation.
      var argument = settings.variable || 'obj';
      template.source = 'function(' + argument + '){\n' + source + '}';

      return template;
    };

    // Add a "chain" function. Start chaining a wrapped Underscore object.
    _.chain = function(obj) {
      var instance = _(obj);
      instance._chain = true;
      return instance;
    };

    // OOP
    // ---------------
    // If Underscore is called as a function, it returns a wrapped object that
    // can be used OO-style. This wrapper holds altered versions of all the
    // underscore functions. Wrapped objects may be chained.

    // Helper function to continue chaining intermediate results.
    var result = function(obj) {
      return this._chain ? _(obj).chain() : obj;
    };

    // Add your own custom functions to the Underscore object.
    _.mixin = function(obj) {
      _.each(_.functions(obj), function(name) {
        var func = _[name] = obj[name];
        _.prototype[name] = function() {
          var args = [this._wrapped];
          push.apply(args, arguments);
          return result.call(this, func.apply(_, args));
        };
      });
    };

    // Add all of the Underscore functions to the wrapper object.
    _.mixin(_);

    // Add all mutator Array functions to the wrapper.
    _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
      var method = ArrayProto[name];
      _.prototype[name] = function() {
        var obj = this._wrapped;
        method.apply(obj, arguments);
        if ((name === 'shift' || name === 'splice') && obj.length === 0) { delete obj[0]; }
        return result.call(this, obj);
      };
    });

    // Add all accessor Array functions to the wrapper.
    _.each(['concat', 'join', 'slice'], function(name) {
      var method = ArrayProto[name];
      _.prototype[name] = function() {
        return result.call(this, method.apply(this._wrapped, arguments));
      };
    });

    // Extracts the result from a wrapped and chained object.
    _.prototype.value = function() {
      return this._wrapped;
    };
  }.call(commonjsGlobal));
  });
  var underscore_1 = underscore._;

  var _uniq = underscore.uniq;

  var Handlers = function() {
    return this.initialize.apply(this, arguments);
  };

  Handlers.prototype.initialize = function() {
    this.traverse = traverser(true);
    this.descend = traverser();
  };

  Handlers.prototype.keys = Object.keys;

  Handlers.prototype.resolve = function(component) {

    var key = [ component.operation, component.scope, component.expression.type ].join('-');
    var method = this._fns[key];

    if (!method) { throw new Error("couldn't resolve key: " + key); }
    return method.bind(this);
  };

  Handlers.prototype.register = function(key, handler) {

    if (!handler instanceof Function) {
      throw new Error("handler must be a function");
    }

    this._fns[key] = handler;
  };

  Handlers.prototype._fns = {

    'member-child-identifier': function(component, partial) {
      var key = component.expression.value;
      var value = partial.value;
      if (value instanceof Object && key in value) {
        return [ { value: value[key], path: partial.path.concat(key) } ]
      }
    },

    'member-descendant-identifier':
      _traverse(function(key, value, ref) { return key == ref }),

    'subscript-child-numeric_literal':
      _descend(function(key, value, ref) { return key === ref }),

    'member-child-numeric_literal':
      _descend(function(key, value, ref) { return String(key) === String(ref) }),

    'subscript-descendant-numeric_literal':
      _traverse(function(key, value, ref) { return key === ref }),

    'member-child-wildcard':
      _descend(function() { return true }),

    'member-descendant-wildcard':
      _traverse(function() { return true }),

    'subscript-descendant-wildcard':
      _traverse(function() { return true }),

    'subscript-child-wildcard':
      _descend(function() { return true }),

    'subscript-child-slice': function(component, partial) {
      if (is_array(partial.value)) {
        var args = component.expression.value.split(':').map(_parse_nullable_int);
        var values = partial.value.map(function(v, i) { return { value: v, path: partial.path.concat(i) } });
        return slice.apply(null, [values].concat(args));
      }
    },

    'subscript-child-union': function(component, partial) {
      var results = [];
      component.expression.value.forEach(function(component) {
        var _component = { operation: 'subscript', scope: 'child', expression: component.expression };
        var handler = this.resolve(_component);
        var _results = handler(_component, partial);
        if (_results) {
          results = results.concat(_results);
        }
      }, this);

      return unique(results);
    },

    'subscript-descendant-union': function(component, partial, count) {

      var jp = jsonpath;
      var self = this;

      var results = [];
      var nodes = jp.nodes(partial, '$..*').slice(1);

      nodes.forEach(function(node) {
        if (results.length >= count) { return; }
        component.expression.value.forEach(function(component) {
          var _component = { operation: 'subscript', scope: 'child', expression: component.expression };
          var handler = self.resolve(_component);
          var _results = handler(_component, node);
          results = results.concat(_results);
        });
      });

      return unique(results);
    },

    'subscript-child-filter_expression': function(component, partial, count) {

      // slice out the expression from ?(expression)
      var src = component.expression.value.slice(2, -1);
      var ast = aesprim.parse(src).body[0].expression;

      var passable = function(key, value) {
        return evaluate(ast, { '@': value });
      };

      return this.descend(partial, null, passable, count);

    },

    'subscript-descendant-filter_expression': function(component, partial, count) {

      // slice out the expression from ?(expression)
      var src = component.expression.value.slice(2, -1);
      var ast = aesprim.parse(src).body[0].expression;

      var passable = function(key, value) {
        return evaluate(ast, { '@': value });
      };

      return this.traverse(partial, null, passable, count);
    },

    'subscript-child-script_expression': function(component, partial) {
      var exp = component.expression.value.slice(1, -1);
      return eval_recurse(partial, exp, '$[{{value}}]');
    },

    'member-child-script_expression': function(component, partial) {
      var exp = component.expression.value.slice(1, -1);
      return eval_recurse(partial, exp, '$.{{value}}');
    },

    'member-descendant-script_expression': function(component, partial) {
      var exp = component.expression.value.slice(1, -1);
      return eval_recurse(partial, exp, '$..value');
    }
  };

  Handlers.prototype._fns['subscript-child-string_literal'] =
  	Handlers.prototype._fns['member-child-identifier'];

  Handlers.prototype._fns['member-descendant-numeric_literal'] =
      Handlers.prototype._fns['subscript-descendant-string_literal'] =
      Handlers.prototype._fns['member-descendant-identifier'];

  function eval_recurse(partial, src, template) {

    var jp = lib$3;
    var ast = aesprim.parse(src).body[0].expression;
    var value = evaluate(ast, { '@': partial.value });
    var path = template.replace(/\{\{\s*value\s*\}\}/g, value);

    var results = jp.nodes(partial.value, path);
    results.forEach(function(r) {
      r.path = partial.path.concat(r.path.slice(1));
    });

    return results;
  }

  function is_array(val) {
    return Array.isArray(val);
  }

  function is_object(val) {
    // is this a non-array, non-null object?
    return val && !(val instanceof Array) && val instanceof Object;
  }

  function traverser(recurse) {

    return function(partial, ref, passable, count) {

      var value = partial.value;
      var path = partial.path;

      var results = [];

      var descend = function(value, path) {

        if (is_array(value)) {
          value.forEach(function(element, index) {
            if (results.length >= count) { return }
            if (passable(index, element, ref)) {
              results.push({ path: path.concat(index), value: element });
            }
          });
          value.forEach(function(element, index) {
            if (results.length >= count) { return }
            if (recurse) {
              descend(element, path.concat(index));
            }
          });
        } else if (is_object(value)) {
          this.keys(value).forEach(function(k) {
            if (results.length >= count) { return }
            if (passable(k, value[k], ref)) {
              results.push({ path: path.concat(k), value: value[k] });
            }
          });
          this.keys(value).forEach(function(k) {
            if (results.length >= count) { return }
            if (recurse) {
              descend(value[k], path.concat(k));
            }
          });
        }
      }.bind(this);
      descend(value, path);
      return results;
    }
  }

  function _descend(passable) {
    return function(component, partial, count) {
      return this.descend(partial, component.expression.value, passable, count);
    }
  }

  function _traverse(passable) {
    return function(component, partial, count) {
      return this.traverse(partial, component.expression.value, passable, count);
    }
  }

  function evaluate() {
    try { return staticEval.apply(this, arguments) }
    catch (e) { }
  }

  function unique(results) {
    results = results.filter(function(d) { return d });
    return _uniq(
      results,
      function(r) { return r.path.map(function(c) { return String(c).replace('-', '--') }).join('-') }
    );
  }

  function _parse_nullable_int(val) {
    var sval = String(val);
    return sval.match(/^-?[0-9]+$/) ? parseInt(sval) : null;
  }

  var handlers = Handlers;

  var JSONPath = function() {
    this.initialize.apply(this, arguments);
  };

  JSONPath.prototype.initialize = function() {
    this.parser = new parser();
    this.handlers = new handlers();
  };

  JSONPath.prototype.parse = function(string) {
    assert.ok(_is_string(string), "we need a path");
    return this.parser.parse(string);
  };

  JSONPath.prototype.parent = function(obj, string) {

    assert.ok(obj instanceof Object, "obj needs to be an object");
    assert.ok(string, "we need a path");

    var node = this.nodes(obj, string)[0];
    var key = node.path.pop(); /* jshint unused:false */
    return this.value(obj, node.path);
  };

  JSONPath.prototype.apply = function(obj, string, fn) {

    assert.ok(obj instanceof Object, "obj needs to be an object");
    assert.ok(string, "we need a path");
    assert.equal(typeof fn, "function", "fn needs to be function");

    var nodes = this.nodes(obj, string).sort(function(a, b) {
      // sort nodes so we apply from the bottom up
      return b.path.length - a.path.length;
    });

    nodes.forEach(function(node) {
      var key = node.path.pop();
      var parent = this.value(obj, this.stringify(node.path));
      var val = node.value = fn.call(obj, parent[key]);
      parent[key] = val;
    }, this);

    return nodes;
  };

  JSONPath.prototype.value = function(obj, path, value) {

    assert.ok(obj instanceof Object, "obj needs to be an object");
    assert.ok(path, "we need a path");

    if (arguments.length >= 3) {
      var node = this.nodes(obj, path).shift();
      if (!node) { return this._vivify(obj, path, value); }
      var key = node.path.slice(-1).shift();
      var parent = this.parent(obj, this.stringify(node.path));
      parent[key] = value;
    }
    return this.query(obj, this.stringify(path), 1).shift();
  };

  JSONPath.prototype._vivify = function(obj, string, value) {

    var self = this;

    assert.ok(obj instanceof Object, "obj needs to be an object");
    assert.ok(string, "we need a path");

    var path = this.parser.parse(string)
      .map(function(component) { return component.expression.value });

    var setValue = function(path, value) {
      var key = path.pop();
      var node = self.value(obj, path);
      if (!node) {
        setValue(path.concat(), typeof key === 'string' ? {} : []);
        node = self.value(obj, path);
      }
      node[key] = value;
    };
    setValue(path, value);
    return this.query(obj, string)[0];
  };

  JSONPath.prototype.query = function(obj, string, count) {

    assert.ok(obj instanceof Object, "obj needs to be an object");
    assert.ok(_is_string(string), "we need a path");

    var results = this.nodes(obj, string, count)
      .map(function(r) { return r.value });

    return results;
  };

  JSONPath.prototype.paths = function(obj, string, count) {

    assert.ok(obj instanceof Object, "obj needs to be an object");
    assert.ok(string, "we need a path");

    var results = this.nodes(obj, string, count)
      .map(function(r) { return r.path });

    return results;
  };

  JSONPath.prototype.nodes = function(obj, string, count) {

    assert.ok(obj instanceof Object, "obj needs to be an object");
    assert.ok(string, "we need a path");

    if (count === 0) { return []; }

    var path = this.parser.parse(string);
    var handlers = this.handlers;

    var partials = [ { path: ['$'], value: obj } ];
    var matches = [];

    if (path.length && path[0].expression.type == 'root') { path.shift(); }

    if (!path.length) { return partials; }

    path.forEach(function(component, index) {

      if (matches.length >= count) { return; }
      var handler = handlers.resolve(component);
      var _partials = [];

      partials.forEach(function(p) {

        if (matches.length >= count) { return; }
        var results = handler(component, p, count);

        if (index == path.length - 1) {
          // if we're through the components we're done
          matches = matches.concat(results || []);
        } else {
          // otherwise accumulate and carry on through
          _partials = _partials.concat(results || []);
        }
      });

      partials = _partials;

    });

    return count ? matches.slice(0, count) : matches;
  };

  JSONPath.prototype.stringify = function(path) {

    assert.ok(path, "we need a path");

    var string = '$';

    var templates = {
      'descendant-member': '..{{value}}',
      'child-member': '.{{value}}',
      'descendant-subscript': '..[{{value}}]',
      'child-subscript': '[{{value}}]'
    };

    path = this._normalize(path);

    path.forEach(function(component) {

      if (component.expression.type == 'root') { return; }

      var key = [component.scope, component.operation].join('-');
      var template = templates[key];
      var value;

      if (component.expression.type == 'string_literal') {
        value = JSON.stringify(component.expression.value);
      } else {
        value = component.expression.value;
      }

      if (!template) { throw new Error("couldn't find template " + key); }

      string += template.replace(/{{value}}/, value);
    });

    return string;
  };

  JSONPath.prototype._normalize = function(path) {

    assert.ok(path, "we need a path");

    if (typeof path == "string") {

      return this.parser.parse(path);

    } else if (Array.isArray(path) && typeof path[0] == "string") {

      var _path = [ { expression: { type: "root", value: "$" } } ];

      path.forEach(function(component, index) {

        if (component == '$' && index === 0) { return; }

        if (typeof component == "string" && component.match("^" + dict.identifier + "$")) {

          _path.push({
            operation: 'member',
            scope: 'child',
            expression: { value: component, type: 'identifier' }
          });

        } else {

          var type = typeof component == "number" ?
            'numeric_literal' : 'string_literal';

          _path.push({
            operation: 'subscript',
            scope: 'child',
            expression: { value: component, type: type }
          });
        }
      });

      return _path;

    } else if (Array.isArray(path) && typeof path[0] == "object") {

      return path
    }

    throw new Error("couldn't understand path " + path);
  };

  function _is_string(obj) {
    return Object.prototype.toString.call(obj) == '[object String]';
  }

  JSONPath.Handlers = handlers;
  JSONPath.Parser = parser;

  var instance = new JSONPath;
  instance.JSONPath = JSONPath;

  var lib$3 = instance;

  var jsonpath = lib$3;

  var ParseError = /*@__PURE__*/(function (Error) {
    function ParseError(message, path) {
      Error.call(this);

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }

      this.name = 'ParseError';
      this.message = message;
      this.path = path;
    }

    if ( Error ) ParseError.__proto__ = Error;
    ParseError.prototype = Object.create( Error && Error.prototype );
    ParseError.prototype.constructor = ParseError;

    return ParseError;
  }(Error));

  var inferredProperties = {
    array: ['additionalItems', 'items', 'maxItems', 'minItems', 'uniqueItems'],
    integer: ['exclusiveMaximum', 'exclusiveMinimum', 'maximum', 'minimum', 'multipleOf'],
    object: ['additionalProperties', 'dependencies', 'maxProperties', 'minProperties', 'patternProperties', 'properties', 'required'],
    string: ['maxLength', 'minLength', 'pattern', 'format']
  };
  inferredProperties.number = inferredProperties.integer;
  var subschemaProperties = ['additionalItems', 'items', 'additionalProperties', 'dependencies', 'patternProperties', 'properties'];
  /**
   * Iterates through all keys of `obj` and:
   * - checks whether those keys match properties of a given inferred type
   * - makes sure that `obj` is not a subschema; _Do not attempt to infer properties named as subschema containers. The
   * reason for this is that any property name within those containers that matches one of the properties used for
   * inferring missing type values causes the container itself to get processed which leads to invalid output. (Issue 62)_
   *
   * @returns {boolean}
   */

  function matchesType(obj, lastElementInPath, inferredTypeProperties) {
    return Object.keys(obj).filter(function (prop) {
      var isSubschema = subschemaProperties.indexOf(lastElementInPath) > -1;
      var inferredPropertyFound = inferredTypeProperties.indexOf(prop) > -1;

      if (inferredPropertyFound && !isSubschema) {
        return true;
      }

      return false;
    }).length > 0;
  }
  /**
   * Checks whether given `obj` type might be inferred. The mechanism iterates through all inferred types definitions,
   * tries to match allowed properties with properties of given `obj`. Returns type name, if inferred, or null.
   *
   * @returns {string|null}
   */


  function inferType(obj, schemaPath) {
    var keys = Object.keys(inferredProperties);

    for (var i = 0; i < keys.length; i += 1) {
      var typeName = keys[i];
      var lastElementInPath = schemaPath[schemaPath.length - 1];

      if (matchesType(obj, lastElementInPath, inferredProperties[typeName])) {
        return typeName;
      }
    }
  }

  /**
   * Generates randomized boolean value.
   *
   * @returns {boolean}
   */

  function booleanGenerator() {
    return optionAPI('random')() > 0.5;
  }

  var booleanType = booleanGenerator;

  /**
   * Generates null value.
   *
   * @returns {null}
   */
  function nullGenerator() {
    return null;
  }

  var nullType = nullGenerator;

  function unique$1(path, items, value, sample, resolve, traverseCallback) {
    var tmp = [];
    var seen = [];

    function walk(obj) {
      var json = JSON.stringify(obj);

      if (seen.indexOf(json) === -1) {
        seen.push(json);
        tmp.push(obj);
        return true;
      }

      return false;
    }

    items.forEach(walk); // TODO: find a better solution?

    var limit = 100;

    while (tmp.length !== items.length) {
      if (!walk(traverseCallback(value.items || sample, path, resolve))) {
        limit -= 1;
      }

      if (!limit) {
        break;
      }
    }

    return tmp;
  } // TODO provide types


  function arrayType(value, path, resolve, traverseCallback) {
    var items = [];

    if (!(value.items || value.additionalItems)) {
      if (utils.hasProperties(value, 'minItems', 'maxItems', 'uniqueItems')) {
        throw new ParseError(("missing items for " + (utils.short(value))), path);
      }

      return items;
    }

    if (Array.isArray(value.items)) {
      return value.items.map(function (item, key) {
        var itemSubpath = path.concat(['items', key]);
        return traverseCallback(item, itemSubpath, resolve);
      });
    }

    var minItems = value.minItems;
    var maxItems = value.maxItems;

    if (optionAPI('minItems')) {
      // fix boundaries
      minItems = !maxItems ? optionAPI('minItems') : Math.min(optionAPI('minItems'), maxItems);
    }

    if (optionAPI('maxItems')) {
      // Don't allow user to set max items above our maximum
      if (maxItems && maxItems > optionAPI('maxItems')) {
        maxItems = optionAPI('maxItems');
      } // Don't allow user to set min items above our maximum


      if (minItems && minItems > optionAPI('maxItems')) {
        minItems = maxItems;
      }
    }

    var optionalsProbability = optionAPI('alwaysFakeOptionals') === true ? 1.0 : optionAPI('optionalsProbability');
    var fixedProbabilities = optionAPI('alwaysFakeOptionals') || optionAPI('fixedProbabilities') || false;
    var length = random.number(minItems, maxItems, 1, 5);

    if (optionalsProbability !== false) {
      length = Math.max(fixedProbabilities ? Math.round((maxItems || length) * optionalsProbability) : Math.abs(random.number(minItems, maxItems) * optionalsProbability), minItems || 0);
    } // TODO below looks bad. Should additionalItems be copied as-is?


    var sample = typeof value.additionalItems === 'object' ? value.additionalItems : {};

    for (var current = items.length; current < length; current += 1) {
      var itemSubpath = path.concat(['items', current]);
      var element = traverseCallback(value.items || sample, itemSubpath, resolve);
      items.push(element);
    }

    if (value.uniqueItems) {
      return unique$1(path.concat(['items']), items, value, sample, resolve, traverseCallback);
    }

    return items;
  }

  function numberType(value) {
    var min = typeof value.minimum === 'undefined' ? env.MIN_INTEGER : value.minimum;
    var max = typeof value.maximum === 'undefined' ? env.MAX_INTEGER : value.maximum;
    var multipleOf = value.multipleOf;

    if (multipleOf) {
      max = Math.floor(max / multipleOf) * multipleOf;
      min = Math.ceil(min / multipleOf) * multipleOf;
    }

    if (value.exclusiveMinimum && min === value.minimum) {
      min += multipleOf || 1;
    }

    if (value.exclusiveMaximum && max === value.maximum) {
      max -= multipleOf || 1;
    }

    if (min > max) {
      return NaN;
    }

    if (multipleOf) {
      if (String(multipleOf).indexOf('.') === -1) {
        var base = random.number(Math.floor(min / multipleOf), Math.floor(max / multipleOf)) * multipleOf;

        while (base < min) {
          base += value.multipleOf;
        }

        return base;
      }

      var boundary = (max - min) / multipleOf;
      var num;
      var fix;

      do {
        num = random.number(0, boundary) * multipleOf;
        fix = num / multipleOf % 1;
      } while (fix !== 0); // FIXME: https://github.com/json-schema-faker/json-schema-faker/issues/379


      return num;
    }

    return random.number(min, max, undefined, undefined, true);
  }

  // returns floating point numbers, and `integer` type truncates the fraction
  // part, leaving the result as an integer.

  function integerType(value) {
    return numberType(Object.assign({
      multipleOf: 1
    }, value));
  }

  var LIPSUM_WORDS = "Lorem ipsum dolor sit amet consectetur adipisicing elit sed do eiusmod tempor incididunt ut labore\net dolore magna aliqua Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea\ncommodo consequat Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla\npariatur Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est\nlaborum".split(/\W/);
  /**
   * Generates randomized array of single lorem ipsum words.
   *
   * @param length
   * @returns {Array.<string>}
   */

  function wordsGenerator(length) {
    var words = random.shuffle(LIPSUM_WORDS);
    return words.slice(0, length);
  }

  var anyType = {
    type: ['string', 'number', 'integer', 'boolean']
  }; // TODO provide types

  function objectType(value, path, resolve, traverseCallback) {
    var props = {};
    var properties = value.properties || {};
    var patternProperties = value.patternProperties || {};
    var requiredProperties = typeof value.required === 'boolean' ? [] : (value.required || []).slice();
    var allowsAdditional = value.additionalProperties !== false;
    var propertyKeys = Object.keys(properties);
    var patternPropertyKeys = Object.keys(patternProperties);
    var optionalProperties = propertyKeys.concat(patternPropertyKeys).reduce(function (_response, _key) {
      if (requiredProperties.indexOf(_key) === -1) { _response.push(_key); }
      return _response;
    }, []);
    var allProperties = requiredProperties.concat(optionalProperties);
    var additionalProperties = allowsAdditional // eslint-disable-line
    ? value.additionalProperties === true ? anyType : value.additionalProperties : value.additionalProperties;

    if (!allowsAdditional && propertyKeys.length === 0 && patternPropertyKeys.length === 0 && utils.hasProperties(value, 'minProperties', 'maxProperties', 'dependencies', 'required')) {
      // just nothing
      return {};
    }

    if (optionAPI('requiredOnly') === true) {
      requiredProperties.forEach(function (key) {
        if (properties[key]) {
          props[key] = properties[key];
        }
      });
      return traverseCallback(props, path.concat(['properties']), resolve);
    }

    var optionalsProbability = optionAPI('alwaysFakeOptionals') === true ? 1.0 : optionAPI('optionalsProbability');
    var fixedProbabilities = optionAPI('alwaysFakeOptionals') || optionAPI('fixedProbabilities') || false;
    var ignoreProperties = optionAPI('ignoreProperties') || [];
    var min = Math.max(value.minProperties || 0, requiredProperties.length);
    var max = value.maxProperties || allProperties.length + random.number(1, 5);
    var neededExtras = Math.max(0, min - requiredProperties.length);

    if (allProperties.length === 1 && !requiredProperties.length) {
      neededExtras = random.number(neededExtras, allProperties.length + (allProperties.length - min));
    }

    if (optionalsProbability !== false) {
      if (fixedProbabilities === true) {
        neededExtras = Math.round(min - requiredProperties.length + optionalsProbability * (allProperties.length - min));
      } else {
        neededExtras = random.number(min - requiredProperties.length, optionalsProbability * (allProperties.length - min));
      }
    }

    var extraPropertiesRandomOrder = random.shuffle(optionalProperties).slice(0, neededExtras);
    var extraProperties = optionalProperties.filter(function (_item) {
      return extraPropertiesRandomOrder.indexOf(_item) !== -1;
    }); // properties are read from right-to-left

    var _props = requiredProperties.concat(extraProperties).slice(0, max);

    var _defns = [];

    if (value.dependencies) {
      Object.keys(value.dependencies).forEach(function (prop) {
        var _required = value.dependencies[prop];

        if (_props.indexOf(prop) !== -1) {
          if (Array.isArray(_required)) {
            // property-dependencies
            _required.forEach(function (sub) {
              if (_props.indexOf(sub) === -1) {
                _props.push(sub);
              }
            });
          } else {
            _defns.push(_required);
          }
        }
      }); // schema-dependencies

      if (_defns.length) {
        delete value.dependencies;
        return traverseCallback({
          allOf: _defns.concat(value)
        }, path.concat(['properties']), resolve);
      }
    }

    var skipped = [];

    _props.forEach(function (key) {
      for (var i = 0; i < ignoreProperties.length; i += 1) {
        if (ignoreProperties[i] instanceof RegExp && ignoreProperties[i].test(key) || typeof ignoreProperties[i] === 'string' && ignoreProperties[i] === key || typeof ignoreProperties[i] === 'function' && ignoreProperties[i](properties[key], key)) {
          skipped.push(key);
          return;
        }
      }

      if (additionalProperties === false) {
        if (requiredProperties.indexOf(key) !== -1) {
          props[key] = properties[key];
        }
      } else if (properties[key]) {
        props[key] = properties[key];
      }

      var found; // then try patternProperties

      patternPropertyKeys.forEach(function (_key) {
        if (key.match(new RegExp(_key))) {
          found = true;

          if (props[key]) {
            utils.merge(props[key], patternProperties[_key]);
          } else {
            props[random.randexp(key)] = patternProperties[_key];
          }
        }
      });

      if (!found) {
        // try patternProperties again,
        var subschema = patternProperties[key] || additionalProperties; // FIXME: allow anyType as fallback when no subschema is given?

        if (subschema && additionalProperties !== false) {
          // otherwise we can use additionalProperties?
          props[patternProperties[key] ? random.randexp(key) : key] = properties[key] || subschema;
        }
      }
    });

    var fillProps = optionAPI('fillProperties');
    var reuseProps = optionAPI('reuseProperties'); // discard already ignored props if they're not required to be filled...

    var current = Object.keys(props).length + (fillProps ? 0 : skipped.length); // generate dynamic suffix for additional props...

    var hash = function (suffix) { return random.randexp(("_?[_a-f\\d]{1,3}" + (suffix ? '\\$?' : ''))); };

    function get() {
      var one;

      do {
        one = requiredProperties.shift();
      } while (props[one]);

      return one;
    }

    while (fillProps) {
      if (!(patternPropertyKeys.length || allowsAdditional)) {
        break;
      }

      if (current >= min) {
        break;
      }

      if (allowsAdditional) {
        if (reuseProps && propertyKeys.length - current > min) {
          var count = 0;
          var key = (void 0);

          do {
            count += 1; // skip large objects

            if (count > 1000) {
              break;
            }

            key = get() || random.pick(propertyKeys);
          } while (typeof props[key] !== 'undefined');

          if (typeof props[key] === 'undefined') {
            props[key] = properties[key];
            current += 1;
          }
        } else if (patternPropertyKeys.length && !additionalProperties) {
          var prop = random.pick(patternPropertyKeys);
          var word = random.randexp(prop);

          if (!props[word]) {
            props[word] = patternProperties[prop];
            current += 1;
          }
        } else {
          var word$1 = get() || wordsGenerator(1) + hash();

          if (!props[word$1]) {
            props[word$1] = additionalProperties || anyType;
            current += 1;
          }
        }
      }

      for (var i = 0; current < min && i < patternPropertyKeys.length; i += 1) {
        var _key = patternPropertyKeys[i];
        var word$2 = random.randexp(_key);

        if (!props[word$2]) {
          props[word$2] = patternProperties[_key];
          current += 1;
        }
      }
    } // fill up-to this value and no more!


    var maximum = random.number(min, max);

    for (; current < maximum && additionalProperties;) {
      var word$3 = wordsGenerator(1) + hash(true);

      if (!props[word$3]) {
        props[word$3] = additionalProperties;
        current += 1;
      }
    }

    return traverseCallback(props, path.concat(['properties']), resolve);
  }

  /**
   * Helper function used by thunkGenerator to produce some words for the final result.
   *
   * @returns {string}
   */

  function produce() {
    var length = random.number(1, 5);
    return wordsGenerator(length).join(' ');
  }
  /**
   * Generates randomized concatenated string based on words generator.
   *
   * @returns {string}
   */


  function thunkGenerator(min, max) {
    if ( min === void 0 ) min = 0;
    if ( max === void 0 ) max = 140;

    var _min = Math.max(0, min);

    var _max = random.number(_min, max);

    var result = produce(); // append until length is reached

    while (result.length < _min) {
      result += produce();
    } // cut if needed


    if (result.length > _max) {
      result = result.substr(0, _max);
    }

    return result;
  }

  /**
   * Generates randomized ipv4 address.
   *
   * @returns {string}
   */

  function ipv4Generator() {
    return [0, 0, 0, 0].map(function () {
      return random.number(0, 255);
    }).join('.');
  }

  /**
   * Generates randomized date time ISO format string.
   *
   * @returns {string}
   */

  function dateTimeGenerator() {
    return random.date().toISOString();
  }

  /**
   * Generates randomized date format string.
   *
   * @returns {string}
   */

  function dateGenerator() {
    return dateTimeGenerator().slice(0, 10);
  }

  /**
   * Generates randomized time format string.
   *
   * @returns {string}
   */

  function timeGenerator() {
    return dateTimeGenerator().slice(11);
  }

  var FRAGMENT = '[a-zA-Z][a-zA-Z0-9+-.]*';
  var URI_PATTERN = "https?://{hostname}(?:" + FRAGMENT + ")+";
  var PARAM_PATTERN = '(?:\\?([a-z]{1,7}(=\\w{1,5})?&){0,3})?';
  /**
   * Predefined core formats
   * @type {[key: string]: string}
   */

  var regexps = {
    email: '[a-zA-Z\\d][a-zA-Z\\d-]{1,13}[a-zA-Z\\d]@{hostname}',
    hostname: '[a-zA-Z]{1,33}\\.[a-z]{2,4}',
    ipv6: '[a-f\\d]{4}(:[a-f\\d]{4}){7}',
    uri: URI_PATTERN,
    slug: '[a-zA-Z\\d_-]+',
    // types from draft-0[67] (?)
    'uri-reference': ("" + URI_PATTERN + PARAM_PATTERN),
    'uri-template': URI_PATTERN.replace('(?:', '(?:/\\{[a-z][:a-zA-Z0-9-]*\\}|'),
    'json-pointer': ("(/(?:" + (FRAGMENT.replace(']*', '/]*')) + "|~[01]))+"),
    // some types from https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#data-types (?)
    uuid: '^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$'
  };
  regexps.iri = regexps['uri-reference'];
  regexps['iri-reference'] = regexps['uri-reference'];
  regexps['idn-email'] = regexps.email;
  regexps['idn-hostname'] = regexps.hostname;
  var ALLOWED_FORMATS = new RegExp(("\\{(" + (Object.keys(regexps).join('|')) + ")\\}"));
  /**
   * Generates randomized string basing on a built-in regex format
   *
   * @param coreFormat
   * @returns {string}
   */

  function coreFormatGenerator(coreFormat) {
    return random.randexp(regexps[coreFormat]).replace(ALLOWED_FORMATS, function (match, key) {
      return random.randexp(regexps[key]);
    });
  }

  function generateFormat(value, invalid) {
    var callback = formatAPI(value.format);

    if (typeof callback === 'function') {
      return callback(value);
    }

    switch (value.format) {
      case 'date-time':
      case 'datetime':
        return dateTimeGenerator();

      case 'date':
        return dateGenerator();

      case 'time':
        return timeGenerator();

      case 'ipv4':
        return ipv4Generator();

      case 'regex':
        // TODO: discuss
        return '.+?';

      case 'email':
      case 'hostname':
      case 'ipv6':
      case 'uri':
      case 'uri-reference':
      case 'iri':
      case 'iri-reference':
      case 'idn-email':
      case 'idn-hostname':
      case 'json-pointer':
      case 'slug':
      case 'uri-template':
      case 'uuid':
        return coreFormatGenerator(value.format);

      default:
        if (typeof callback === 'undefined') {
          if (optionAPI('failOnInvalidFormat')) {
            throw new Error(("unknown registry key " + (utils.short(value.format))));
          } else {
            return invalid();
          }
        }

        throw new Error(("unsupported format '" + (value.format) + "'"));
    }
  }

  function stringType(value) {
    // here we need to force type to fix #467
    var output = utils.typecast('string', value, function (opts) {
      if (value.format) {
        return generateFormat(value, function () { return thunkGenerator(opts.minLength, opts.maxLength); });
      }

      if (value.pattern) {
        return random.randexp(value.pattern);
      }

      return thunkGenerator(opts.minLength, opts.maxLength);
    });
    return output;
  }

  var typeMap = {
    boolean: booleanType,
    null: nullType,
    array: arrayType,
    integer: integerType,
    number: numberType,
    object: objectType,
    string: stringType
  };

  function traverse(schema, path, resolve, rootSchema) {
    schema = resolve(schema, undefined, path);

    if (!schema) {
      return;
    } // default values has higher precedence


    if (path[path.length - 1] !== 'properties') {
      // example values have highest precedence
      if (optionAPI('useExamplesValue') && Array.isArray(schema.examples)) {
        // include `default` value as example too
        var fixedExamples = schema.examples.concat('default' in schema ? [schema.default] : []);
        return utils.typecast(null, schema, function () { return random.pick(fixedExamples); });
      }

      if (optionAPI('useDefaultValue') && 'default' in schema) {
        return schema.default;
      }

      if ('template' in schema) {
        return utils.template(schema.template, rootSchema);
      }
    }

    if (schema.not && typeof schema.not === 'object') {
      schema = utils.notValue(schema.not, utils.omitProps(schema, ['not']));
    }

    if ('const' in schema) {
      return schema.const;
    }

    if (Array.isArray(schema.enum)) {
      return utils.typecast(null, schema, function () { return random.pick(schema.enum); });
    } // thunks can return sub-schemas


    if (typeof schema.thunk === 'function') {
      return traverse(schema.thunk(), path, resolve);
    }

    if (typeof schema.generate === 'function') {
      return utils.typecast(null, schema, function () { return schema.generate(rootSchema); });
    } // TODO remove the ugly overcome


    var type = schema.type;

    if (Array.isArray(type)) {
      type = random.pick(type);
    } else if (typeof type === 'undefined') {
      // Attempt to infer the type
      type = inferType(schema, path) || type;

      if (type) {
        schema.type = type;
      }
    }

    if (typeof type === 'string') {
      if (!typeMap[type]) {
        if (optionAPI('failOnInvalidTypes')) {
          throw new ParseError(("unknown primitive " + (utils.short(type))), path.concat(['type']));
        } else {
          return optionAPI('defaultInvalidTypeProduct');
        }
      } else {
        try {
          return typeMap[type](schema, path, resolve, traverse);
        } catch (e) {
          if (typeof e.path === 'undefined') {
            throw new ParseError(e.stack, path);
          }

          throw e;
        }
      }
    }

    var copy = {};

    if (Array.isArray(schema)) {
      copy = [];
    }

    Object.keys(schema).forEach(function (prop) {
      if (typeof schema[prop] === 'object' && prop !== 'definitions') {
        copy[prop] = traverse(schema[prop], path.concat([prop]), resolve, copy);
      } else {
        copy[prop] = schema[prop];
      }
    });
    return copy;
  }

  function pick$1(data) {
    return Array.isArray(data) ? random.pick(data) : data;
  }

  function cycle(data, reverse) {
    if (!Array.isArray(data)) {
      return data;
    }

    var value = reverse ? data.pop() : data.shift();

    if (reverse) {
      data.unshift(value);
    } else {
      data.push(value);
    }

    return value;
  }

  function resolve(obj, data, values, property) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (!values) {
      values = {};
    }

    if (!data) {
      data = obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(function (x) { return resolve(x, data, values, property); });
    }

    if (obj.jsonPath) {
      var params = typeof obj.jsonPath !== 'object' ? {
        path: obj.jsonPath
      } : obj.jsonPath;
      params.group = obj.group || params.group || property;
      params.cycle = obj.cycle || params.cycle || false;
      params.reverse = obj.reverse || params.reverse || false;
      params.count = obj.count || params.count || 1;
      var key = (params.group) + "__" + (params.path);

      if (!values[key]) {
        if (params.count > 1) {
          values[key] = jsonpath.query(data, params.path, params.count);
        } else {
          values[key] = jsonpath.query(data, params.path);
        }
      }

      if (params.cycle || params.reverse) {
        return cycle(values[key], params.reverse);
      }

      return pick$1(values[key]);
    }

    Object.keys(obj).forEach(function (k) {
      obj[k] = resolve(obj[k], data, values, k);
    });
    return obj;
  } // TODO provide types


  function run$1(refs, schema, container) {
    try {
      var result = traverse(utils.clone(schema), [], function reduce(sub, maxReduceDepth, parentSchemaPath) {
        if (typeof maxReduceDepth === 'undefined') {
          maxReduceDepth = random.number(1, 3);
        }

        if (!sub) {
          return null;
        }

        if (typeof sub.generate === 'function') {
          return sub;
        } // cleanup


        var _id = sub.$id || sub.id;

        if (typeof _id === 'string') {
          delete sub.id;
          delete sub.$id;
          delete sub.$schema;
        }

        if (typeof sub.$ref === 'string') {
          if (sub.$ref === '#') {
            delete sub.$ref;
            return sub;
          }

          var ref;

          if (sub.$ref.indexOf('#/') === -1) {
            ref = refs[sub.$ref] || null;
          }

          if (sub.$ref.indexOf('#/definitions/') === 0) {
            ref = schema.definitions[sub.$ref.split('#/definitions/')[1]] || null;
          }

          if (typeof ref !== 'undefined') {
            if (!ref && optionAPI('ignoreMissingRefs') !== true) {
              throw new Error(("Reference not found: " + (sub.$ref)));
            }

            utils.merge(sub, ref || {});
          } // just remove the reference


          delete sub.$ref;
          return sub;
        }

        if (Array.isArray(sub.allOf)) {
          var schemas = sub.allOf;
          delete sub.allOf; // this is the only case where all sub-schemas
          // must be resolved before any merge

          schemas.forEach(function (subSchema) {
            var _sub = reduce(subSchema, maxReduceDepth + 1, parentSchemaPath); // call given thunks if present


            utils.merge(sub, typeof _sub.thunk === 'function' ? _sub.thunk() : _sub);
          });
        }

        if (Array.isArray(sub.oneOf || sub.anyOf)) {
          var mix = sub.oneOf || sub.anyOf; // test every value from the enum against each-oneOf
          // schema, only values that validate once are kept

          if (sub.enum && sub.oneOf) {
            sub.enum = sub.enum.filter(function (x) { return utils.validate(x, mix); });
          }

          return {
            thunk: function thunk() {
              var copy = utils.omitProps(sub, ['anyOf', 'oneOf']);
              var fixed = random.pick(mix);
              utils.merge(copy, fixed);

              if (sub.oneOf) {
                mix.forEach(function (omit) {
                  if (omit !== fixed && omit.required) {
                    omit.required.forEach(function (key) {
                      delete copy.properties[key];
                    });
                  }
                });
              }

              return copy;
            }

          };
        }

        Object.keys(sub).forEach(function (prop) {
          if ((Array.isArray(sub[prop]) || typeof sub[prop] === 'object') && !utils.isKey(prop)) {
            sub[prop] = reduce(sub[prop], maxReduceDepth, parentSchemaPath.concat(prop));
          }
        }); // avoid extra calls on sub-schemas, fixes #458

        if (parentSchemaPath) {
          var lastProp = parentSchemaPath[parentSchemaPath.length - 1];

          if (lastProp === 'properties' || lastProp === 'items') {
            return sub;
          }
        }

        return container.wrap(sub);
      });

      if (optionAPI('resolveJsonPath')) {
        return resolve(result);
      }

      return result;
    } catch (e) {
      if (e.path) {
        throw new Error(((e.message) + " in /" + (e.path.join('/'))));
      } else {
        throw e;
      }
    }
  }

  var container = new Container();

  function setupKeywords() {
    // built-in support
    container.define('pattern', random.randexp); // safe auto-increment values

    container.define('autoIncrement', function autoIncrement(value, schema) {
      if (!this.offset) {
        var min = schema.minimum || 1;
        var max = min + env.MAX_NUMBER;
        var offset = value.initialOffset || schema.initialOffset;
        this.offset = offset || random.number(min, max);
      }

      if (value === true) {
        return this.offset++; // eslint-disable-line
      }

      return schema;
    }); // safe-and-sequential dates

    container.define('sequentialDate', function sequentialDate(value, schema) {
      if (!this.now) {
        this.now = random.date();
      }

      if (value) {
        schema = this.now.toISOString();
        value = value === true ? 'days' : value;

        if (['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'].indexOf(value) === -1) {
          throw new Error(("Unsupported increment by " + (utils.short(value))));
        }

        this.now.setTime(this.now.getTime() + random.date(value));
      }

      return schema;
    });
  }

  function getRefs(refs) {
    var $refs = {};

    if (Array.isArray(refs)) {
      refs.forEach(function (schema) {
        $refs[schema.$id || schema.id] = schema;
      });
    } else {
      $refs = refs || {};
    }

    return $refs;
  }

  var jsf = function (schema, refs, cwd) {
    console.log('[json-schema-faker] calling JsonSchemaFaker() is deprecated, call either .generate() or .resolve()');

    if (cwd) {
      console.log('[json-schema-faker] references are only supported by calling .resolve()');
    }

    return jsf.generate(schema, refs);
  };

  jsf.generate = function (schema, refs) {
    var $refs = getRefs(refs);
    return run$1($refs, schema, container);
  };

  jsf.resolve = function (schema, refs, cwd) {
    if (typeof refs === 'string') {
      cwd = refs;
      refs = {};
    } // normalize basedir (browser aware)


    cwd = cwd || (typeof process !== 'undefined' ? process.cwd() : '');
    cwd = (cwd.replace(/\/+$/, '')) + "/";
    var $refs = getRefs(refs); // identical setup as json-schema-sequelizer

    var fixedRefs = {
      order: 300,
      canRead: true,

      read: function read(file, callback) {
        try {
          callback(null, $refs[file.url] || $refs[file.url.split('/').pop()]);
        } catch (e) {
          callback(e);
        }
      }

    };
    return lib.dereference(cwd, schema, {
      resolve: {
        file: {
          order: 100
        },
        http: {
          order: 200
        },
        fixedRefs: fixedRefs
      },
      dereference: {
        circular: 'ignore'
      }
    }).then(function (sub) { return run$1($refs, sub, container); });
  };

  setupKeywords();
  jsf.format = formatAPI;
  jsf.option = optionAPI;
  jsf.random = random; // returns itself for chaining

  jsf.extend = function (name, cb) {
    container.extend(name, cb);
    return jsf;
  };

  jsf.define = function (name, cb) {
    container.define(name, cb);
    return jsf;
  };

  jsf.reset = function (name) {
    container.reset(name);
    setupKeywords();
    return jsf;
  };

  jsf.locate = function (name) {
    return container.get(name);
  };

  jsf.version = '0.5.0-rc16';

  return jsf;

}));
