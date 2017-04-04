var compromise = (function () {
'use strict';

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by rollup-plugin-commonjs');
}



function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

//these are regexes applied to t.text, instead of t.normal
var punct_rules = [
  //#funtime
  ['^#[a-z]+', 'HashTag'],
  //chillin'
  ['[a-z]+n\'', 'Gerund'],
  //spencers'
  ['[a-z]+s\'', 'Possessive'],
  //589-3809
  ['[0-9]{3}-[0-9]{4}', 'PhoneNumber'],
  //632-589-3809
  ['\\(?[0-9]{3}\\)?[ -]?[0-9]{3}-[0-9]{4}', 'PhoneNumber'],

  //dates/times
  ['[012]?[0-9](:[0-5][0-9])(:[0-5][0-9])', 'Time'], //4:32:32
  ['[012]?[0-9](:[0-5][0-9])?(:[0-5][0-9])? ?(am|pm)', 'Time'], //4pm
  ['[012]?[0-9](:[0-5][0-9])(:[0-5][0-9])? ?(am|pm)?', 'Time'], //4:00pm
  ['[PMCE]ST', 'Time'], //PST, time zone abbrevs
  ['utc ?[\+\-]?[0-9]\+?', 'Time'], //UTC 8+
  ['[a-z0-9]*? o\'?clock', 'Time'], //3 oclock
  ['[0-9]{1,4}[/\\-\\.][0-9]{1,2}[/\\-\\.][0-9]{1,4}', 'Date'], //03/02/89, 03-02-89

  //money
  ['^[\-\+]?[$€¥£][0-9]+(\.[0-9]{1,2})?$', 'Money'], //like $5.30
  ['^[\-\+]?[$€¥£][0-9]{1,3}(,[0-9]{3})+(\.[0-9]{1,2})?$', 'Money'], //like $5,231.30

  //values
  ['[0-9]{1,4}(st|nd|rd|th)?-[0-9]{1,4}(st|nd|rd|th)?', 'NumberRange'], //5-7
  ['^[\-\+]?[0-9]{1,3}(,[0-9]{3})+(\.[0-9]+)?$', 'NiceNumber'], //like 5,999.0
  ['^[\-\+]?[0-9]+(\.[0-9]+)?$', 'NumericValue'], //like +5.0

  ['[0-9]{1,4}/[0-9]{1,4}', 'Fraction'], //3/2ths
  ['[0-9]{1,2}-[0-9]{1,2}', 'Value'], //7-8

  //mc'adams
  ['ma?c\'.*', 'LastName'],
  //o'douggan
  ['o\'[drlkn].*', 'LastName'],

].map(function (a) {
  return {
    reg: new RegExp('^' + a[0] + '$', 'i'),
    tag: a[1],
    str: a[0]
  };
});

//regs-
const titleCase = /^[A-Z][a-z']/;
const romanNum = /^[IVXCM]+$/;

//not so smart (right now)
const isRomanNumeral = function(t) {
  if (t.text.length > 1 && romanNum.test(t.text) === true) {
    return t.canBe('RomanNumeral');
  }
  return false;
};

const oneLetters = {
  a: true,
  i: true,
  //internet-slang
  u: true,
  r: true,
  c: true,
  k: true
};

const punctuation_step = function (ts) {
  ts.terms.forEach((t) => {
    let str = t.text;
    //anything can be titlecase
    if (titleCase.test(str) === true) {
      t.tag('TitleCase', 'punct-rule');
    }
    //ok, normalise it a little,
    str = str.replace(/[,\.\?]$/, '');
    //do punctuation rules (on t.text)
    for (let i = 0; i < punct_rules.length; i++) {
      let r = punct_rules[i];
      if (r.reg.test(str) === true) {
        //don't over-write any other known tags
        if (t.canBe(r.tag)) {
          t.tag(r.tag, 'punctuation-rule- "' + r.str + '"');
        }
        return;
      }
    }
    //terms like 'e'
    if (str.length === 1 && !oneLetters[str.toLowerCase()]) {
      t.tag('Acronym', 'one-letter-acronym');
    }
    //roman numerals (weak rn)
    if (isRomanNumeral(t)) {
      t.tag('RomanNumeral', 'is-roman-numeral');
    }

  });
  return ts;
};

var _01Punctuation_step = punctuation_step;

//list of inconsistent parts-of-speech
var conflicts = [
  //top-level pos are all inconsistent
  ['Noun', 'Verb', 'Adjective', 'Adverb', 'Determiner', 'Conjunction', 'Preposition', 'QuestionWord', 'Expression', 'Url', 'PhoneNumber', 'Email', 'Emoji'],
  //exlusive-nouns
  ['Person', 'Organization', 'Value', 'Place', 'Actor', 'Demonym', 'Pronoun'],
  //things that can't be plural
  ['Plural', 'Singular'],
  // ['Plural', 'Pronoun'],
  // ['Plural', 'Person'],
  // ['Plural', 'Organization'],
  // ['Plural', 'Currency'],
  // ['Plural', 'Ordinal'],
  //exlusive-people
  ['MaleName', 'FemaleName'],
  ['FirstName', 'LastName', 'Honorific'],
  //adjectives
  ['Comparative', 'Superlative'],
  //values
  ['Value', 'Verb', 'Adjective'],
  // ['Value', 'Year'],
  ['Ordinal', 'Cardinal'],
  ['TextValue', 'NumericValue'],
  ['NiceNumber', 'TextValue'],
  ['Ordinal', 'Currency'], //$5.50th
  //verbs
  ['PastTense', 'PerfectTense', 'Pluperfect', 'FuturePerfect', 'Copula', 'Modal', 'Participle', 'Infinitive', 'Gerund'],
  //date
  ['Month', 'WeekDay', 'Year', 'Duration'],
  ['Particle', 'Conjunction', 'Adverb', 'Preposition'],
  ['Date', 'Verb', 'Adjective', 'Person'],
  //a/an -> 1
  ['Value', 'Determiner'],
  //roman numerals
  ['RomanNumeral', 'Fraction', 'NiceNumber'],
  ['RomanNumeral', 'Money'],
  //cases
  ['UpperCase', 'TitleCase', 'CamelCase']
];

var nouns = {
  Noun: {},
  // - singular
  Singular: {
    is: 'Noun'
  },

  // -- people
  Person: {
    is: 'Singular'
  },
  FirstName: {
    is: 'Person'
  },
  MaleName: {
    is: 'FirstName'
  },
  FemaleName: {
    is: 'FirstName'
  },
  LastName: {
    is: 'Person'
  },
  Honorific: {
    is: 'Person'
  },
  Place: {
    is: 'Singular'
  },

  // -- places
  Country: {
    is: 'Place'
  },
  City: {
    is: 'Place'
  },
  Address: {
    is: 'Place'
  },
  Organization: {
    is: 'Singular'
  },
  SportsTeam: {
    is: 'Organization'
  },
  Company: {
    is: 'Organization'
  },
  School: {
    is: 'Organization'
  },

  // - plural
  Plural: {
    is: 'Noun'
  },
  Pronoun: {
    is: 'Noun'
  },
  Actor: {
    is: 'Noun'
  },
  Unit: {
    is: 'Noun'
  },
  Demonym: {
    is: 'Noun'
  },
  Possessive: {
    is: 'Noun'
  }
};

var verbs = {
  Verb: {},
  PresentTense: {
    is: 'Verb',
  },
  Infinitive: {
    is: 'PresentTense'
  },
  Gerund: {
    is: 'PresentTense'
  },
  PastTense: {
    is: 'Verb'
  },
  PerfectTense: {
    is: 'Verb'
  },
  FuturePerfect: {
    is: 'Verb'
  },
  Pluperfect: {
    is: 'Verb'
  },
  Copula: {
    is: 'Verb'
  },
  Modal: {
    is: 'Verb'
  },
  Participle: {
    is: 'Verb'
  },
  Particle: {
    is: 'Verb'
  },
  PhrasalVerb: {
    is: 'Verb'
  },
};

var values = {
  Value: {},
  Ordinal: {
    is: 'Value'
  },
  Cardinal: {
    is: 'Value'
  },
  RomanNumeral: {
    is: 'Cardinal'
  },
  Fraction: {
    is: 'Value'
  },
  TextValue: {
    is: 'Value'
  },
  NumericValue: {
    is: 'Value'
  },
  NiceNumber: {
    is: 'Value'
  },
  Money: {
    is: 'Value'
  },
  NumberRange: {
    is: 'Value',
    also: 'Contraction'
  },
};

var dates = {
  Date: {}, //not a noun, but usually is
  Month: {
    is: 'Date',
    also: 'Singular'
  },
  WeekDay: {
    is: 'Date',
    also: 'Noun'
  },
  RelativeDay: {
    is: 'Date'
  },
  Year: {
    is: 'Date'
  },
  Duration: {
    is: 'Date',
    also: 'Noun'
  },
  Time: {
    is: 'Date',
    also: 'Noun'
  },
  Holiday: {
    is: 'Date',
    also: 'Noun'
  },
};

var misc$2 = {

  Adjective: {},
  Comparative: {
    is: 'Adjective'
  },
  Superlative: {
    is: 'Adjective'
  },

  Adverb: {},

  Currency: {},
  //glue
  Determiner: {},
  Conjunction: {},
  Preposition: {},
  QuestionWord: {},
  Expression: {},
  Url: {},
  PhoneNumber: {},
  HashTag: {},
  Emoji: {},
  Email: {},

  //non-exclusive
  Condition: {},
  Auxiliary: {},
  Negative: {},
  Contraction: {},

  TitleCase: {},
  CamelCase: {},
  UpperCase: {},
  Hyphenated: {},
  Acronym: {},
  ClauseEnd: {},
  Quotation: {},

};

//







//used for pretty-printing on the server-side
const colors = {
  Noun: 'blue',
  Value: 'red',
  Verb: 'green',
  Preposition: 'cyan',
  Conjunction: 'cyan',
  Determiner: 'cyan',
  Adjective: 'black',
  Adverb: 'black'
};

//extend tagset with new tags
const addIn = function(obj, tags) {
  Object.keys(obj).forEach((k) => {
    tags[k] = obj[k];
  });
};

//add 'downward' tags (that immediately depend on this one)
const addChildren = function(tags) {
  const keys = Object.keys(tags);
  keys.forEach((k) => {
    tags[k].downward = [];
    //look for tags with this as parent
    for(let i = 0; i < keys.length; i++) {
      if (tags[keys[i]].is && tags[keys[i]].is === k) {
        tags[k].downward.push(keys[i]);
      }
    }
  });
};

//add tags to remove when tagging this one
const addConflicts = function(tags) {
  Object.keys(tags).forEach((k) => {
    tags[k].enemy = {};
    for(let i = 0; i < conflicts.length; i++) {
      let arr = conflicts[i];
      if (arr.indexOf(k) !== -1) {
        arr = arr.filter((a) => a !== k);
        arr.forEach((e) => {
          tags[k].enemy[e] = true;
        });
      }
    }
    tags[k].enemy = Object.keys(tags[k].enemy);
  });
};

const addColors = function(tags) {
  Object.keys(tags).forEach((k) => {
    if (colors[k]) {
      tags[k].color = colors[k];
      return;
    }
    if (tags[k].is && colors[tags[k].is]) {
      tags[k].color = colors[tags[k].is];
      return;
    }
    if (tags[k].is && tags[tags[k].is].color) {
      tags[k].color = tags[tags[k].is].color;
    }
  });
};

const build$2 = () => {
  let tags = {};
  addIn(nouns, tags);
  addIn(verbs, tags);
  addIn(values, tags);
  addIn(dates, tags);
  addIn(misc$2, tags);
  //downstream
  addChildren(tags);
  //add enemies
  addConflicts(tags);
  //for nice-logging
  addColors(tags);
  return tags;
};
var index$8 = build$2();
// console.log(module.exports.Gerund.enemy);

var fns$1 = createCommonjsModule(function (module, exports) {
'use strict';


// https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
const c = {
  reset: '\x1b[0m',
  red : '\x1b[31m',
  green : '\x1b[32m',
  yellow : '\x1b[33m',
  blue : '\x1b[34m',
  magenta : '\x1b[35m',
  cyan : '\x1b[36m',
  black: '\x1b[30m'
};
//dont use colors on client-side
exports.ensureString = (input) => {
  if (typeof input === 'string') {
    return input;
  } else if (typeof input === 'number') {
    return '' + input;
  }
  return '';
};
//coerce any input into a string
exports.ensureObject = (input) => {
  if (typeof input !== 'object') {
    return {};
  }
  if (input === null || input instanceof Array) {
    return {};
  }
  return input;
};

exports.titleCase = (str) => {
  return str.charAt(0).toUpperCase() + str.substr(1);
};

//shallow-clone an object
exports.copy = (o) => {
  let o2 = {};
  o = exports.ensureObject(o);
  Object.keys(o).forEach((k) => {
    o2[k] = o[k];
  });
  return o2;
};
exports.extend = (obj, a) => {
  obj = exports.copy(obj);
  const keys = Object.keys(a);
  for(let i = 0; i < keys.length; i++) {
    obj[keys[i]] = a[keys[i]];
  }
  return obj;
};

//colorization
exports.green = function(str) {
  return c.green + str + c.reset;
};
exports.red = function(str) {
  return c.red + str + c.reset;
};
exports.blue = function(str) {
  return c.blue + str + c.reset;
};
exports.magenta = function(str) {
  return c.magenta + str + c.reset;
};
exports.cyan = function(str) {
  return c.cyan + str + c.reset;
};
exports.yellow = function(str) {
  return c.yellow + str + c.reset;
};
exports.black = function(str) {
  return c.black + str + c.reset;
};
exports.printTag = function(tag) {
  if (index$8[tag]) {
    const color = index$8[tag].color || 'black';
    return exports[color](tag);
  }
  return tag;
};
exports.printTerm = function(t) {
  const tags = Object.keys(t.tags);
  for(let i = 0; i < tags.length; i++) {
    if (index$8[tags[i]]) {
      const color = index$8[tags[i]].color || 'black';
      return exports[color](t.plaintext);
    }
  }
  return c.reset + t.plaintext + c.reset;
};

exports.leftPad = function (str, width, char) {
  char = char || ' ';
  str = str.toString();
  while (str.length < width) {
    str += char;
  }
  return str;
};

exports.isArray = function(arr) {
  return Object.prototype.toString.call(arr) === '[object Array]';
};
});

//notable people with names that aren't caught by the ordinary person-name rules
var male = [
  'messiaen',
  'saddam hussain',
  'virgin mary',
  'van gogh',
  'mitt romney',
  'barack obama',
  'kanye west',
  'mubarek',
  'lebron james',
  'emeril lagasse',
  'rush limbaugh',
  'carson palmer',
  'ray romano',
  'ronaldinho',
  'valentino rossi',
  'rod stewart',
  'kiefer sutherland',
  'denzel washington',
  'dick wolf',
  'tiger woods',
  'adolf hitler',
  'hulk hogan',
  'ashton kutcher',
  'kobe bryant',
  'cardinal wolsey',
  'slobodan milosevic',
];

var female = [
  'jk rowling',
  'oprah winfrey',
  'reese witherspoon',
  'tyra banks',
  'halle berry',
  'paris hilton',
  'scarlett johansson',
];

var notable = {
	male: male,
	female: female
};

//extend to person-names if infront of a name - 'Professor Frink'
var titles = [
  'lord',
  'lady',
  'king',
  'queen',
  'prince',
  'princess',
  'dutchess',
  'president',
  'excellency',
  'professor',
  'chancellor',
  'father',
  'pastor',
  'brother',
  'sister',
  'doctor',
  'captain',
  'commander',
  'general',
  'lieutenant',
  'reverend',
  'rabbi',
  'ayatullah',
  'councillor',
  'secretary',
  'sultan',
  'mayor',
  'congressman',
  'congresswoman',
// 'his honorable',
// 'her honorable',
// 'the honorable',
];

//some most-common iso-codes (most are too ambiguous)
const shortForms = [
  'usd',
  'cad',
  'aud',
  'gbp',
  'krw',
  'inr',
  'hkd',
  'dkk',
  'cny',
  'xaf',
  'xof',
  'eur',
  'jpy',
  //currency symbols
  '€',
  '$',
  '¥',
  '£',
  'лв',
  '₡',
  'kn',
  'kr',
  '¢',
  'Ft',
  'Rp',
  '﷼',
  '₭',
  'ден',
  '₨',
  'zł',
  'lei',
  'руб',
  '฿',
];

//some common, unambiguous currency names
let longForms = [
  'denar',
  'dobra',
  'forint',
  'kwanza',
  'kyat',
  'lempira',
  'pound sterling',
  'riel',
  'yen',
  'zloty',
  //colloquial currency names
  'dollar',
  'cent',
  'penny',
  'dime',
  'dinar',
  'euro',
  'lira',
  'pound',
  'pence',
  'peso',
  'baht',
  'sterling',
  'rouble',
  'shekel',
  'sheqel',
  'yuan',
  'franc',
  'rupee',
  'shilling',
  'krona',
  'dirham',
  'bitcoin'
];
const irregularPlurals = {
  yen: 'yen',
  baht: 'baht',
  riel: 'riel',
  penny: 'pennies',
};

//add plural forms - 'euros'
let l = longForms.length;
for(let i = 0; i < l; i++) {
  if (irregularPlurals[longForms[i]]) {
    longForms.push(irregularPlurals[longForms[i]]);
  } else {
    longForms.push(longForms[i] + 's');
  }
}

var currencies = shortForms.concat(longForms);

const cardinal = {
  ones: {
    // 'a': 1,
    'zero': 0,
    'one': 1,
    'two': 2,
    'three': 3,
    'four': 4,
    'five': 5,
    'six': 6,
    'seven': 7,
    'eight': 8,
    'nine': 9
  },
  teens: {
    'ten': 10,
    'eleven': 11,
    'twelve': 12,
    'thirteen': 13,
    'fourteen': 14,
    'fifteen': 15,
    'sixteen': 16,
    'seventeen': 17,
    'eighteen': 18,
    'nineteen': 19
  },
  tens: {
    'twenty': 20,
    'thirty': 30,
    'forty': 40,
    'fifty': 50,
    'sixty': 60,
    'seventy': 70,
    'eighty': 80,
    'ninety': 90
  },
  multiples: {
    'hundred': 1e2,
    'thousand': 1e3,
    'grand': 1e3,
    'million': 1e6,
    'billion': 1e9,
    'trillion': 1e12,
    'quadrillion': 1e15,
    'quintillion': 1e18,
    'sextillion': 1e21,
    'septillion': 1e24
  }
};

const ordinal = {
  ones: {
    'zeroth': 0,
    'first': 1,
    'second': 2,
    'third': 3,
    'fourth': 4,
    'fifth': 5,
    'sixth': 6,
    'seventh': 7,
    'eighth': 8,
    'ninth': 9
  },
  teens: {
    'tenth': 10,
    'eleventh': 11,
    'twelfth': 12,
    'thirteenth': 13,
    'fourteenth': 14,
    'fifteenth': 15,
    'sixteenth': 16,
    'seventeenth': 17,
    'eighteenth': 18,
    'nineteenth': 19
  },
  tens: {
    'twentieth': 20,
    'thirtieth': 30,
    'fourtieth': 40,
    'fiftieth': 50,
    'sixtieth': 60,
    'seventieth': 70,
    'eightieth': 80,
    'ninetieth': 90
  },
  multiples: {
    'hundredth': 1e2,
    'thousandth': 1e3,
    'millionth': 1e6,
    'billionth': 1e9,
    'trillionth': 1e12,
    'quadrillionth': 1e15,
    'quintillionth': 1e18,
    'sextillionth': 1e21,
    'septillionth': 1e24
  }
};


//used for the units
const prefixes = {
  'yotta': 1,
  'zetta': 1,
  'exa': 1,
  'peta': 1,
  'tera': 1,
  'giga': 1,
  'mega': 1,
  'kilo': 1,
  'hecto': 1,
  'deka': 1,
  'deci': 1,
  'centi': 1,
  'milli': 1,
  'micro': 1,
  'nano': 1,
  'pico': 1,
  'femto': 1,
  'atto': 1,
  'zepto': 1,
  'yocto': 1,

  'square': 1,
  'cubic': 1,
  'quartic': 1
};

var numbers = {
  cardinal: cardinal,
  ordinal: ordinal,
  prefixes: prefixes
};

//create an easy mapping between ordinal-cardinal

let toOrdinal = {};
let toCardinal = {};
Object.keys(numbers.ordinal).forEach((k) => {
  let ordinal = Object.keys(numbers.ordinal[k]);
  let cardinal = Object.keys(numbers.cardinal[k]);
  for (let i = 0; i < ordinal.length; i++) {
    toOrdinal[cardinal[i]] = ordinal[i];
    toCardinal[ordinal[i]] = cardinal[i];
  }
});
var ordinalMap = {
  toOrdinal: toOrdinal,
  toCardinal: toCardinal
};

const units$1 = {
  'Temperature': {
    '°c': 'Celsius',
    '°f': 'Fahrenheit',
    'k': 'Kelvin',
    '°re': 'Reaumur',
    '°n': 'Newton',
    '°ra': 'Rankine'
  },
  'Volume': {
    'm³': 'cubic meter',
    'm3': 'cubic meter',
    'dm³': 'cubic decimeter',
    'dm3': 'cubic decimeter',
    'cm³': 'cubic centimeter',
    'cm3': 'cubic centimeter',
    'l': 'liter',
    'dl': 'deciliter',
    'cl': 'centiliter',
    'ml': 'milliliter',
    'in³': 'cubic inch',
    'in3': 'cubic inch',
    'ft³': 'cubic foot',
    'ft3': 'cubic foot',
    'yd³': 'cubic yard',
    'yd3': 'cubic yard',
    'gal': 'gallon',
    'bbl': 'petroleum barrel',
    'pt': 'pint',
    'qt': 'quart',
    'tbl': 'tablespoon',
    'tsp': 'teaspoon',
    'tbsp': 'tablespoon',
    'cup': 'cup',
    'fl oz': 'fluid ounce'
  },
  'Distance': {
    'km': 'kilometer',
    'm': 'meter',
    'dm': 'decimeter',
    'cm': 'centimeter',
    'mm': 'millimeter',
    'mi': 'mile',
    // 'in': 'inch',
    'ft': 'foot',
    'yd': 'yard'
  },
  'Weight': {
    't': 'tonne',
    'kg': 'kilogram',
    'hg': 'hectogram',
    'g': 'gram',
    'dg': 'decigram',
    'cg': 'centigram',
    'mg': 'milligram',
    'µg': 'microgram',
    'carat': 'carat',
    'grain': 'grain',
    'oz': 'ounce',
    'lb': 'pound',
    'ton': 'tonne'
  },
  'Area': {
    'km²': 'square kilometer',
    'km2': 'square kilometer',
    'm²': 'square meter',
    'm2': 'square meter',
    'dm²': 'square decimeter',
    'dm2': 'square decimeter',
    'cm²': 'square centimeter',
    'cm2': 'square centimeter',
    'mm²': 'square millimeter',
    'mm2': 'square millimeter',
    'ha': 'hectare',
    'mile²': 'square mile',
    'mile2': 'square mile',
    'in²': 'square inch',
    'in2': 'square inch',
    'yd²': 'square yard',
    'yd2': 'square yard',
    'ft²': 'square foot',
    'sq ft': 'square feet',
    'ft2': 'square foot',
    'acre': 'acre'
  },
  'Frequency': {
    'hz': 'hertz'
  },
  'Speed': {
    'km/h': 'kilometer per hour',
    'kmph': 'kilometer per hour',
    'mps': 'meter per second',
    'm/s': 'meter per second',
    'mph': 'mile per hour',
    'mi/h': 'mile per hour',
    'knot': 'knot'
  },
  'Data': {
    'b': 'byte',
    'kb': 'kilobyte',
    'mb': 'megabyte',
    'gb': 'gigabyte',
    'tb': 'terabyte',
    'pt': 'petabyte',
    'eb': 'exabyte',
    'zb': 'zettabyte',
    'yb': 'yottabyte'
  },
  'Energy': {
    'j': 'joule',
    'pa': 'pascal',
    'w': 'watt',
    'n': 'newton',
    'wb': 'weber',
    'h': 'henry',
    'c': 'coulomb',
    'v': 'volt',
    'f': 'farad',
    's': 'siemens',
    'o': 'ohm',
    'lx': 'lux',
    'lm': 'lumen'
  },
  'Time': {
    'year': 'year',
    'week': 'week',
    'day': 'day',
    'h': 'hour',
    'min': 'minute',
    's': 'second',
    'ms': 'millisecond',
    'µs': 'microsecond',
    'nanosecond': 'nanosecond',
    'picosecond': 'picosecond',
    'femtosecond': 'femtosecond',
    'attosecond': 'attosecond'
  }
};

//prepare a list of them, for the lexicon
let words = {};
Object.keys(units$1).forEach((k) => {
  Object.keys(units$1[k]).forEach((shorter) => {
    if (shorter.length > 1) {
      words[shorter] = true;
    }
    let longer = units$1[k][shorter];
    words[longer] = true;
    words[longer + 's'] = true;
  });
});
words = Object.keys(words);

var units_1 = {
  words: words,
  units: units$1
};

//terms that are 'Date' term
let months = [
  'january',
  'february',
  // "march",  //ambig
  'april',
  // "may",   //ambig
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  'jan',
  'feb',
  'mar',
  'apr',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
  'sept',
  'sep'
];

let days = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
  'mon',
  'tues',
  'wed',
  'thurs',
  'fri',
  'sat',
  'sun'
];
//add plural eg.'mondays'
for (let i = 0; i <= 6; i++) {
  days.push(days[i] + 's');
}

let durations = [
  'millisecond',
  // 'second',
  'minute',
  'hour',
  'day',
  'week',
  'month',
  'year',
  'decade'
];
//add their plurals
let len = durations.length;
for (let i = 0; i < len; i++) {
  durations.push(durations[i]);
  durations.push(durations[i] + 's');
}
durations.push('century');
durations.push('centuries');
durations.push('seconds');

let relative = [
  'yesterday',
  'today',
  'tomorrow',
  // 'week',
  'weekend',
  'tonight'
];

var dates$3 = {
  days: days,
  months: months,
  durations: durations,
  relative: relative
};

//these are common word shortenings used in the lexicon and sentence segmentation methods
//there are all nouns,or at the least, belong beside one.
//common abbreviations
let compact = {
  Noun: [
    'arc',
    'al',
    'exp',
    'fy',
    'pd',
    'pl',
    'plz',
    'tce',
    'bl',
    'ma',
    'ba',
    'lit',
    'ex',
    'eg',
    'ie',
    'ca',
    'cca',
    'vs',
    'etc',
    'esp',
    'ft',
    //these are too ambiguous
    'bc',
    'ad',
    'md',
    'corp',
    'col'
  ],
  Organization: [
    'dept',
    'univ',
    'assn',
    'bros',
    'inc',
    'ltd',
    'co',
    //proper nouns with exclamation marks
    'yahoo',
    'joomla',
    'jeopardy'
  ],

  Place: [
    'rd',
    'st',
    'dist',
    'mt',
    'ave',
    'blvd',
    'cl',
    'ct',
    'cres',
    'hwy',
    //states
    'ariz',
    'cal',
    'calif',
    'colo',
    'conn',
    'fla',
    'fl',
    'ga',
    'ida',
    'ia',
    'kan',
    'kans',

    'minn',
    'neb',
    'nebr',
    'okla',
    'penna',
    'penn',
    'pa',
    'dak',
    'tenn',
    'tex',
    'ut',
    'vt',
    'va',
    'wis',
    'wisc',
    'wy',
    'wyo',
    'usafa',
    'alta',
    'ont',
    'que',
    'sask'
  ],

  Date: [
    'jan',
    'feb',
    'mar',
    'apr',
    'jun',
    'jul',
    'aug',
    'sep',
    'sept',
    'oct',
    'nov',
    'dec',
    'circa'
  ],

  //Honorifics
  Honorific: [
    'adj',
    'adm',
    'adv',
    'asst',
    'atty',
    'bldg',
    'brig',
    'capt',
    'cmdr',
    'comdr',
    'cpl',
    'det',
    'dr',
    'esq',
    'gen',
    'gov',
    'hon',
    'jr',
    'llb',
    'lt',
    'maj',
    'messrs',
    'mister',
    'mlle',
    'mme',
    'mr',
    'mrs',
    'ms',
    'mstr',
    'op',
    'ord',
    'phd',
    'prof',
    'pvt',
    'rep',
    'reps',
    'res',
    'rev',
    'sen',
    'sens',
    'sfc',
    'sgt',
    'sir',
    'sr',
    'supt',
    'surg'
  //miss
  //misses
  ]

};

//unpack the compact terms into the misc lexicon..
let abbreviations = {};
const keys = Object.keys(compact);
for (let i = 0; i < keys.length; i++) {
  const arr = compact[keys[i]];
  for (let i2 = 0; i2 < arr.length; i2++) {
    abbreviations[arr[i2]] = keys[i];
  }
}
var abbreviations_1 = abbreviations;

//nouns with irregular plural/singular forms
//used in noun.inflect, and also in the lexicon.
//compressed with '_' to reduce some redundancy.
let main = [
  ['child', '_ren'],
  ['person', 'people'],
  ['leaf', 'leaves'],
  ['database', '_s'],
  ['quiz', '_zes'],
  ['stomach', '_s'],
  ['sex', '_es'],
  ['move', '_s'],
  ['shoe', '_s'],
  ['goose', 'geese'],
  ['phenomenon', 'phenomena'],
  ['barracks', '_'],
  ['deer', '_'],
  ['syllabus', 'syllabi'],
  ['index', 'indices'],
  ['appendix', 'appendices'],
  ['criterion', 'criteria'],
  ['man', 'men'],
  ['rodeo', '_s'],
  ['epoch', '_s'],
  ['zero', '_s'],
  ['avocado', '_s'],
  ['halo', '_s'],
  ['tornado', '_s'],
  ['tuxedo', '_s'],
  ['sombrero', '_s'],
  ['addendum', 'addenda'],
  ['alga', '_e'],
  ['alumna', '_e'],
  ['alumnus', 'alumni'],
  ['bacillus', 'bacilli'],
  ['cactus', 'cacti'],
  ['beau', '_x'],
  ['château', '_x'],
  ['chateau', '_x'],
  ['tableau', '_x'],
  ['corpus', 'corpora'],
  ['curriculum', 'curricula'],
  ['echo', '_es'],
  ['embargo', '_es'],
  ['foot', 'feet'],
  ['genus', 'genera'],
  ['hippopotamus', 'hippopotami'],
  ['larva', '_e'],
  ['libretto', 'libretti'],
  ['loaf', 'loaves'],
  ['matrix', 'matrices'],
  ['memorandum', 'memoranda'],
  ['mosquito', '_es'],
  ['opus', 'opera'],
  ['ovum', 'ova'],
  ['ox', '_en'],
  ['radius', 'radii'],
  ['referendum', 'referenda'],
  ['thief', 'thieves'],
  ['tooth', 'teeth']
];
//decompress it
main = main.map(function(a) {
  a[1] = a[1].replace('_', a[0]);
  return a;
});
//build-out two mappings
const toSingle = main.reduce((h, a) => {
  h[a[1]] = a[0];
  return h;
}, {});
const toPlural = main.reduce((h, a) => {
  h[a[0]] = a[1];
  return h;
}, {});

var irregular_plurals = {
  toSingle: toSingle,
  toPlural: toPlural
};

//shallow-merge an object
var extendObj = (o, o2) => {
  Object.keys(o2).forEach((k) => {
    o[k] = o2[k];
  });
  return o;
};

//uncompress data in the adhoc compressed form {'ly':'kind,quick'}
var uncompress_suffixes = function(list, obj) {
  const keys = Object.keys(obj);
  const l = keys.length;
  for (let i = 0; i < l; i++) {
    const arr = obj[keys[i]].split(',');
    for (let i2 = 0; i2 < arr.length; i2++) {
      list.push(arr[i2] + keys[i]);
    }
  }
  return list;
};

var fns$3 = {
	extendObj: extendObj,
	uncompress_suffixes: uncompress_suffixes
};

let compressed = {
  erate: 'degen,delib,desp,lit,mod',
  icial: 'artif,benef,off,superf',
  ntial: 'esse,influe,pote,substa',
  teful: 'gra,ha,tas,was',
  stant: 'con,di,in,resi',
  hing: 'astonis,das,far-reac,refres,scat,screec,self-loat,soot',
  eful: 'car,grac,peac,sham,us,veng',
  ming: 'alar,cal,glea,unassu,unbeco,upco',
  cial: 'commer,cru,finan,ra,so,spe',
  ure: 'insec,miniat,obsc,premat,sec,s',
  uent: 'congr,fl,freq,subseq',
  rate: 'accu,elabo,i,sepa',
  ific: 'horr,scient,spec,terr',
  rary: 'arbit,contempo,cont,tempo',
  ntic: 'authe,fra,giga,roma',
  nant: 'domi,malig,preg,reso',
  nent: 'emi,immi,perma,promi',
  iant: 'brill,def,g,luxur',
  ging: 'dama,encoura,han,lon',
  iate: 'appropr,immed,inappropr,intermed',
  rect: 'cor,e,incor,indi',
  zing: 'agoni,ama,appeti,free',
  ine: 'div,femin,genu,mascul,prist,rout',
  ute: 'absol,ac,c,m,resol',
  ern: 'east,north,south,st,west',
  tful: 'deligh,doub,fre,righ,though,wis',
  ant: 'abund,arrog,eleg,extravag,exult,hesit,irrelev,miscre,nonchal,obeis,observ,pl,pleas,redund,relev,reluct,signific,vac,verd',
  ing: 'absorb,car,coo,liv,lov,ly,menac,perplex,shock,stand,surpris,tell,unappeal,unconvinc,unend,unsuspect,vex,want',
  ate: 'adequ,delic,fortun,inadequ,inn,intim,legitim,priv,sed,ultim',
};
let arr = [
  'absurd',
  'aggressive',
  'alert',
  'alive',
  'angry',
  'attractive',
  'awesome',
  'beautiful',
  'big',
  'bitter',
  'black',
  'blue',
  'bored',
  'boring',
  'brash',
  'brave',
  'brief',
  'brown',
  'calm',
  'charming',
  'cheap',
  'check',
  'clean',
  'clear',
  'close',
  'cold',
  'cool',
  'cruel',
  'curly',
  'cute',
  'dangerous',
  'dear',
  'dirty',
  'drunk',
  'dry',
  'dull',
  'eager',
  'early',
  'easy',
  'efficient',
  'empty',
  'even',
  'extreme',
  'faint',
  'fair',
  'fanc',
  'feeble',
  'few',
  'fierce',
  'fine',
  'firm',
  'forgetful',
  'formal',
  'frail',
  'free',
  'full',
  'funny',
  'gentle',
  'glad',
  'glib',
  'glad',
  'grand',
  'green',
  'gruesome',
  'handsome',
  'happy',
  'harsh',
  'heavy',
  'high',
  'hollow',
  'hot',
  'hungry',
  'impolite',
  'important',
  'innocent',
  'intellegent',
  'interesting',
  'keen',
  'kind',
  'lame',
  'large',
  'late',
  'lean',
  'little',
  'long',
  'loud',
  'low',
  'lucky',
  'lush',
  'macho',
  'mature',
  'mean',
  'meek',
  'mellow',
  'mundane',
  'narrow',
  'near',
  'neat',
  'new',
  'nice',
  'noisy',
  'normal',
  'odd',
  'old',
  'orange',
  'pale',
  'pink',
  'plain',
  'poor',
  'proud',
  'pure',
  'purple',
  'rapid',
  'rare',
  'raw',
  'rich',
  'rotten',
  'round',
  'rude',
  'safe',
  'scarce',
  'scared',
  'shallow',
  'shrill',
  'simple',
  'slim',
  'slow',
  'small',
  'smooth',
  'solid',
  'soon',
  'sore',
  'sour',
  'square',
  'stale',
  'steep',
  'strange',
  'strict',
  'strong',
  'swift',
  'tall',
  'tame',
  'tart',
  'tender',
  'tense',
  'thin',
  'thirsty',
  'tired',
  'true',
  'vague',
  'vast',
  'vulgar',
  'warm',
  'weird',
  'wet',
  'wild',
  'windy',
  'wise',
  'yellow',
  'young'
];

var superlatives = fns$3.uncompress_suffixes(arr, compressed);
// console.log(JSON.stringify(module.exports.sort(), null, 2));

//adjectives that become verbs with +'en' (short->shorten)

//ones that also become superlative/comparative (short -> shortest)
var verbConverts = [
  'bright',
  'broad',
  'coarse',
  'damp',
  'dark',
  'dead',
  'deaf',
  'deep',
  'fast',
  'fat',
  'flat',
  'fresh',
  'great',
  'hard',
  'light',
  'loose',
  'mad',
  'moist',
  'quick',
  'quiet',
  'red',
  'ripe',
  'rough',
  'sad',
  'sharp',
  'short',
  'sick',
  'smart',
  'soft',
  'stiff',
  'straight',
  'sweet',
  'thick',
  'tight',
  'tough',
  'weak',
  'white',
  'wide',
];

//particples are a bit like past-tense, but used differently
//map the infinitive to its irregular-participle
var participles = {
  'become': 'become',
  'begin': 'begun',
  'bend': 'bent',
  'bet': 'bet',
  'bite': 'bitten',
  'bleed': 'bled',
  'brake': 'broken',
  'bring': 'brought',
  'build': 'built',
  'burn': 'burned',
  'burst': 'burst',
  'buy': 'bought',
  // 'catch': 'caught',
  'choose': 'chosen',
  'cling': 'clung',
  'come': 'come',
  'creep': 'crept',
  'cut': 'cut',
  'deal': 'dealt',
  'dig': 'dug',
  'dive': 'dived',
  // 'do': 'done',
  'draw': 'drawn',
  'dream': 'dreamt',
  'drive': 'driven',
  'eat': 'eaten',
  'fall': 'fallen',
  'feed': 'fed',
  'fight': 'fought',
  'flee': 'fled',
  'fling': 'flung',
  'forget': 'forgotten',
  'forgive': 'forgiven',
  'freeze': 'frozen',
  'got': 'gotten',
  'give': 'given',
  'go': 'gone',
  'grow': 'grown',
  'hang': 'hung',
  'have': 'had',
  'hear': 'heard',
  'hide': 'hidden',
  'hit': 'hit',
  'hold': 'held',
  'hurt': 'hurt',
  'keep': 'kept',
  'kneel': 'knelt',
  'know': 'known',
  'lay': 'laid',
  'lead': 'led',
  'leap': 'leapt',
  'leave': 'left',
  'lend': 'lent',
  'light': 'lit',
  'loose': 'lost',
  'make': 'made',
  'mean': 'meant',
  'meet': 'met',
  'pay': 'paid',
  'prove': 'proven',
  'put': 'put',
  'quit': 'quit',
  'read': 'read',
  'ride': 'ridden',
  'ring': 'rung',
  'rise': 'risen',
  'run': 'run',
  'say': 'said',
  'see': 'seen',
  'seek': 'sought',
  'sell': 'sold',
  'send': 'sent',
  'set': 'set',
  'sew': 'sewn',
  'shake': 'shaken',
  'shave': 'shaved',
  'shine': 'shone',
  'shoot': 'shot',
  'shut': 'shut',
  'seat': 'sat',
  'slay': 'slain',
  'sleep': 'slept',
  'slide': 'slid',
  'sneak': 'snuck',
  'speak': 'spoken',
  'speed': 'sped',
  'spend': 'spent',
  'spill': 'spilled',
  'spin': 'spun',
  'spit': 'spat',
  'split': 'split',
  'spring': 'sprung',
  'stink': 'stunk',
  'strew': 'strewn',
  'sware': 'sworn',
  'sweep': 'swept',
  'thrive': 'thrived',
  // 'throw': 'thrown',
  'undergo': 'undergone',
  'upset': 'upset',
  'weave': 'woven',
  'weep': 'wept',
  'wind': 'wound',
  'wring': 'wrung'
};

let irregular = {
  take: {
    PerfectTense: 'have taken',
    pluPerfectTense: 'had taken',
    FuturePerfect: 'will have taken'
  },
  can: {
    Gerund: '',
    PresentTense: 'can',
    PastTense: 'could',
    FutureTense: 'can',
    PerfectTense: 'could',
    pluPerfectTense: 'could',
    FuturePerfect: 'can',
    Actor: ''
  },
  free: {
    Gerund: 'freeing',
    Actor: ''
  },
  puke: {
    Gerund: 'puking'
  },
  arise: {
    PastTense: 'arose',
    Participle: 'arisen'
  },
  babysit: {
    PastTense: 'babysat',
    Actor: 'babysitter'
  },
  be: { // this is crazy-hard and shouldn't be here
    PastTense: 'was',
    Participle: 'been',
    PresentTense: 'is',
    // FutureTense: 'will be',
    Actor: '',
    Gerund: 'am'
  },
  // will: {
  //   PastTense: 'will',
  // },
  is: {
    PastTense: 'was',
    PresentTense: 'is',
    // FutureTense: 'will be',
    // PerfectTense: 'have been',
    // pluPerfectTense: 'had been',
    // FuturePerfect: 'will have been',
    Actor: '',
    Gerund: 'being'
  },
  beat: {
    Gerund: 'beating',
    Actor: 'beater',
    Participle: 'beaten'
  },
  begin: {
    Gerund: 'beginning',
    PastTense: 'began'
  },
  ban: {
    PastTense: 'banned',
    Gerund: 'banning',
    Actor: ''
  },
  bet: {
    Actor: 'better'
  },
  bite: {
    Gerund: 'biting',
    PastTense: 'bit'
  },
  bleed: {
    PastTense: 'bled'
  },
  breed: {
    PastTense: 'bred'
  },
  bring: {
    PastTense: 'brought'
  },
  broadcast: {
    PastTense: 'broadcast'
  },
  build: {
    PastTense: 'built'
  },
  buy: {
    PastTense: 'bought'
  },
  choose: {
    Gerund: 'choosing',
    PastTense: 'chose'
  },
  cost: {
    PastTense: 'cost'
  },
  deal: {
    PastTense: 'dealt'
  },
  die: {
    PastTense: 'died',
    Gerund: 'dying',
  },
  dig: {
    Gerund: 'digging',
    PastTense: 'dug'
  },
  draw: {
    PastTense: 'drew'
  },
  drink: {
    PastTense: 'drank',
    Participle: 'drunk'
  },
  drive: {
    Gerund: 'driving',
    PastTense: 'drove'
  },
  eat: {
    Gerund: 'eating',
    PastTense: 'ate',
    Actor: 'eater',
    Participle: 'eaten'
  },
  fall: {
    PastTense: 'fell'
  },
  feed: {
    PastTense: 'fed'
  },
  feel: {
    PastTense: 'felt',
    Actor: 'feeler'
  },
  fight: {
    PastTense: 'fought'
  },
  find: {
    PastTense: 'found'
  },
  fly: {
    PastTense: 'flew',
    Participle: 'flown'
  },
  blow: {
    PastTense: 'blew',
    Participle: 'blown'
  },
  forbid: {
    PastTense: 'forbade'
  },
  forget: {
    Gerund: 'forgeting',
    PastTense: 'forgot'
  },
  forgive: {
    Gerund: 'forgiving',
    PastTense: 'forgave'
  },
  freeze: {
    Gerund: 'freezing',
    PastTense: 'froze'
  },
  get: {
    PastTense: 'got'
  },
  give: {
    Gerund: 'giving',
    PastTense: 'gave'
  },
  go: {
    PastTense: 'went',
    PresentTense: 'goes'
  },
  hang: {
    PastTense: 'hung'
  },
  have: {
    Gerund: 'having',
    PastTense: 'had',
    PresentTense: 'has'
  },
  hear: {
    PastTense: 'heard'
  },
  hide: {
    PastTense: 'hid'
  },
  hold: {
    PastTense: 'held'
  },
  hurt: {
    PastTense: 'hurt'
  },
  lay: {
    PastTense: 'laid'
  },
  lead: {
    PastTense: 'led'
  },
  leave: {
    PastTense: 'left'
  },
  lie: {
    Gerund: 'lying',
    PastTense: 'lay'
  },
  light: {
    PastTense: 'lit'
  },
  lose: {
    Gerund: 'losing',
    PastTense: 'lost'
  },
  make: {
    PastTense: 'made'
  },
  mean: {
    PastTense: 'meant'
  },
  meet: {
    Gerund: 'meeting',
    PastTense: 'met',
    Actor: 'meeter'
  },
  pay: {
    PastTense: 'paid'
  },
  read: {
    PastTense: 'read'
  },
  ring: {
    PastTense: 'rang'
  },
  rise: {
    PastTense: 'rose',
    Gerund: 'rising',
    pluPerfectTense: 'had risen',
    FuturePerfect: 'will have risen'
  },
  run: {
    Gerund: 'running',
    PastTense: 'ran'
  },
  say: {
    PastTense: 'said'
  },
  see: {
    PastTense: 'saw'
  },
  sell: {
    PastTense: 'sold'
  },
  shine: {
    PastTense: 'shone'
  },
  shoot: {
    PastTense: 'shot'
  },
  show: {
    PastTense: 'showed'
  },
  sing: {
    PastTense: 'sang',
    Participle: 'sung'
  },
  sink: {
    PastTense: 'sank',
    pluPerfectTense: 'had sunk'
  },
  sit: {
    PastTense: 'sat'
  },
  slide: {
    PastTense: 'slid'
  },
  speak: {
    PastTense: 'spoke',
    PerfectTense: 'have spoken',
    pluPerfectTense: 'had spoken',
    FuturePerfect: 'will have spoken'
  },
  spin: {
    Gerund: 'spinning',
    PastTense: 'spun'
  },
  stand: {
    PastTense: 'stood'
  },
  steal: {
    PastTense: 'stole',
    Actor: 'stealer'
  },
  stick: {
    PastTense: 'stuck'
  },
  sting: {
    PastTense: 'stung'
  },
  stream: {
    Actor: 'streamer'
  },
  strike: {
    Gerund: 'striking',
    PastTense: 'struck'
  },
  swear: {
    PastTense: 'swore'
  },
  swim: {
    PastTense: 'swam',
    Gerund: 'swimming'
  },
  swing: {
    PastTense: 'swung'
  },
  teach: {
    PastTense: 'taught',
    PresentTense: 'teaches'
  },
  tear: {
    PastTense: 'tore'
  },
  tell: {
    PastTense: 'told'
  },
  think: {
    PastTense: 'thought'
  },
  understand: {
    PastTense: 'understood'
  },
  wake: {
    PastTense: 'woke'
  },
  wear: {
    PastTense: 'wore'
  },
  win: {
    Gerund: 'winning',
    PastTense: 'won'
  },
  withdraw: {
    PastTense: 'withdrew'
  },
  write: {
    Gerund: 'writing',
    PastTense: 'wrote',
    Participle: 'written'
  },
  tie: {
    Gerund: 'tying',
    PastTense: 'tied'
  },
  ski: {
    PastTense: 'skiied'
  },
  boil: {
    Actor: 'boiler'
  },
  miss: {
    PresentTense: 'miss'
  },
  act: {
    Actor: 'actor'
  },
  compete: {
    Gerund: 'competing',
    PastTense: 'competed',
    Actor: 'competitor'
  },
  being: {
    Gerund: 'are',
    PastTense: 'were',
    PresentTense: 'are'
  },
  imply: {
    PastTense: 'implied',
    PresentTense: 'implies'
  },
  ice: {
    Gerund: 'icing',
    PastTense: 'iced'
  },
  develop: {
    PastTense: 'developed',
    Actor: 'developer',
    Gerund: 'developing'
  },
  wait: {
    Gerund: 'waiting',
    PastTense: 'waited',
    Actor: 'waiter'
  },
  aim: {
    Actor: 'aimer'
  },
  spill: {
    PastTense: 'spilt'
  },
  drop: {
    Gerund: 'dropping',
    PastTense: 'dropped'
  },
  log: {
    Gerund: 'logging',
    PastTense: 'logged'
  },
  rub: {
    Gerund: 'rubbing',
    PastTense: 'rubbed'
  },
  smash: {
    PresentTense: 'smashes'
  },
  suit: {
    Gerund: 'suiting',
    PastTense: 'suited',
    Actor: 'suiter'
  }
};
//fancy es3 literal support (ftw?)
const literals = [
  ['break', {
    PastTense: 'broke'
  }],
  ['catch', {
    PastTense: 'caught'
  }],
  ['do', {
    PastTense: 'did',
    PresentTense: 'does'
  }],
  ['bind', {
    PastTense: 'bound'
  }],
  ['spread', {
    PastTense: 'spread'
  }],
];
literals.forEach((a) => {
  irregular[a[0]] = a[1];
});

Object.keys(participles).forEach((inf) => {
  if (irregular[inf]) {
    irregular[inf].Participle = participles[inf];
  } else {
    irregular[inf] = {
      Participle: participles[inf]
    };
  }
});
var irregular_verbs = irregular;

//suffix-index adjectives
//  {cial:'cru,spe'} -> 'crucial', 'special'

//suffix-index adjectives
//  {cial:'cru,spe'} -> 'crucial', 'special'
let compressed$1 = {
  prove: ',im,ap,disap',
  serve: ',de,ob,re',
  ress: 'exp,p,prog,st,add,d',
  lect: 'ref,se,neg,col,e',
  sist: 'in,con,per,re,as',
  tain: 'ob,con,main,s,re',
  mble: 'rese,gru,asse,stu',
  ture: 'frac,lec,tor,fea',
  port: 're,sup,ex,im',
  ate: 'rel,oper,indic,cre,h,activ,estim,particip,d,anticip,evalu',
  use: ',ca,over,ref,acc,am,pa',
  ive: 'l,rece,d,arr,str,surv,thr,rel',
  are: 'prep,c,comp,sh,st,decl,d,sc',
  ine: 'exam,imag,determ,comb,l,decl,underm,def',
  nce: 'annou,da,experie,influe,bou,convi,enha',
  ain: 'tr,rem,expl,dr,compl,g,str',
  ent: 'prev,repres,r,res,rel,inv',
  age: 'dam,mess,man,encour,eng,discour',
  rge: 'su,cha,eme,u,me',
  ise: 'ra,exerc,prom,surpr,pra',
  ect: 'susp,dir,exp,def,rej',
  ter: 'en,mat,cen,ca,al',
  end: ',t,dep,ext,att',
  est: 't,sugg,prot,requ,r',
  ock: 'kn,l,sh,bl,unl',
  nge: 'cha,excha,ra,challe,plu',
  ase: 'incre,decre,purch,b,ce',
  ish: 'establ,publ,w,fin,distingu',
  mit: 'per,ad,sub,li',
  ure: 'fig,ens,end,meas',
  der: 'won,consi,mur,wan',
  ave: 's,sh,w,cr',
  ire: 'requ,des,h,ret',
  tch: 'scra,swi,ma,stre',
  ack: 'att,l,p,cr',
  ion: 'ment,quest,funct,envis',
  ump: 'j,l,p,d',
  ide: 'dec,prov,gu,s',
  ush: 'br,cr,p,r',
  eat: 'def,h,tr,ch',
  ash: 'sm,spl,w,fl',
  rry: 'ca,ma,hu,wo',
  ear: 'app,f,b,disapp',
  er: 'answ,rememb,off,suff,cov,discov,diff,gath,deliv,both,empow,with',
  le: 'fi,sett,hand,sca,whist,enab,smi,ming,ru,sprink,pi',
  st: 'exi,foreca,ho,po,twi,tru,li,adju,boa,contra,boo',
  it: 'vis,ed,depos,sp,awa,inhib,cred,benef,prohib,inhab',
  nt: 'wa,hu,pri,poi,cou,accou,confro,warra,pai',
  ch: 'laun,rea,approa,sear,tou,ar,enri,atta',
  ss: 'discu,gue,ki,pa,proce,cro,glo,dismi',
  ll: 'fi,pu,ki,ca,ro,sme,reca,insta',
  rn: 'tu,lea,conce,retu,bu,ea,wa,gove',
  ce: 'redu,produ,divor,noti,for,repla',
  te: 'contribu,uni,tas,vo,no,constitu,ci',
  rt: 'sta,comfo,exe,depa,asse,reso,conve',
  ck: 'su,pi,che,ki,tri,wre',
  ct: 'intera,restri,predi,attra,depi,condu',
  ke: 'sta,li,bra,overta,smo,disli',
  se: 'collap,suppo,clo,rever,po,sen',
  nd: 'mi,surrou,dema,remi,expa,comma',
  ve: 'achie,invol,remo,lo,belie,mo',
  rm: 'fo,perfo,confi,confo,ha',
  or: 'lab,mirr,fav,monit,hon',
  ue: 'arg,contin,val,iss,purs',
  ow: 'all,foll,sn,fl,borr',
  ay: 'pl,st,betr,displ,portr',
  ze: 'recogni,reali,snee,ga,emphasi',
  ip: 'cl,d,gr,sl,sk',
  re: 'igno,sto,interfe,sco',
  ng: 'spri,ba,belo,cli',
  ew: 'scr,vi,revi,ch',
  gh: 'cou,lau,outwei,wei',
  ly: 'app,supp,re,multip',
  ge: 'jud,acknowled,dod,alle',
  en: 'list,happ,threat,strength',
  ee: 'fors,agr,disagr,guarant',
  et: 'budg,regr,mark,targ',
  rd: 'rega,gua,rewa,affo',
  am: 'dre,j,sl,ro',
  ry: 'va,t,c,bu'
};
let arr$1 = [
  'abandon',
  'accept',
  'add',
  'added',
  'adopt',
  'aid',
  'appeal',
  'applaud',
  'archive',
  'ask',
  'assign',
  'associate',
  'assume',
  'attempt',
  'avoid',
  'ban',
  'become',
  'bomb',
  'cancel',
  'claim',
  'claw',
  'come',
  'control',
  'convey',
  'cook',
  'copy',
  'cut',
  'deem',
  'defy',
  'deny',
  'describe',
  'design',
  'destroy',
  'die',
  'divide',
  'do',
  'doubt',
  'drag',
  'drift',
  'drop',
  'echo',
  'embody',
  'enjoy',
  'envy',
  'excel',
  'fall',
  'fail',
  'fix',
  'float',
  'flood',
  'focus',
  'fold',
  'get',
  'goes',
  'grab',
  'grasp',
  'grow',
  'happen',
  'head',
  'help',
  'hold fast',
  'hope',
  'include',
  'instruct',
  'invest',
  'join',
  'keep',
  'know',
  'learn',
  'let',
  'lift',
  'link',
  'load',
  'loan',
  'look',
  'make due',
  'mark',
  'melt',
  'minus',
  'multiply',
  'need',
  'occur',
  'overcome',
  'overlap',
  'overwhelm',
  'owe',
  'pay',
  'plan',
  'plug',
  'plus',
  'pop',
  'pour',
  'proclaim',
  'put',
  'rank',
  'reason',
  'reckon',
  'relax',
  'repair',
  'reply',
  'reveal',
  'revel',
  'risk',
  'rub',
  'ruin',
  'sail',
  'seek',
  'seem',
  'send',
  'set',
  'shout',
  'sleep',
  'sneak',
  'sort',
  'spoil',
  'stem',
  'step',
  'stop',
  'study',
  'take',
  'talk',
  'thank',
  'took',
  'trade',
  'transfer',
  'trap',
  'travel',
  'tune',
  'undergo',
  'undo',
  'uplift',
  'walk',
  'watch',
  'win',
  'wipe',
  'work',
  'yawn',
  'yield'
];

var verbs$3 = fns$3.uncompress_suffixes(arr$1, compressed$1);

var determiners = [
  'this',
  'any',
  'enough',
  'each',
  'whatever',
  'every',
  'these',
  'another',
  'plenty',
  'whichever',
  'neither',
  'an',
  'a',
  'least',
  'own',
  'few',
  'both',
  'those',
  'the',
  'that',
  'various',
  'either',
  'much',
  'some',
  'else',
  //some other languages (what could go wrong?)
  'la',
  'le',
  'les',
  'des',
  'de',
  'du',
  'el'
];

const misc$5 = {
  'here': 'Noun',
  'better': 'Comparative',
  'earlier': 'Superlative',
  'make sure': 'Verb',
  'keep tabs': 'Verb',
  'gonna': 'Verb',
  'cannot': 'Verb',
  'has': 'Verb',
  'sounds': 'PresentTense',
  //special case for took/taken
  'taken': 'PastTense',
  'msg': 'Verb', //slang
  'a few': 'Value', //different than 'few people'
  'years old': 'Unit', //special case
  'not': 'Negative',
  'non': 'Negative',
  'never': 'Negative',
  'no': 'Negative',
  'no doubt': 'Noun',
  'not only': 'Adverb',
  'how\'s': 'QuestionWord' //not conjunction
};

const compact$1 = {
  Organization: [
    '20th century fox',
    '3m',
    '7-eleven',
    'g8',
    'motel 6',
    'vh1',
  ],
  Adjective: [
    'so called', //?
    'on board',
    'vice versa',
    'en route',
    'upside down',
    'up front',
    'in front',
    'in situ',
    'in vitro',
    'ad hoc',
    'de facto',
    'ad infinitum',
    'for keeps',
    'a priori',
    'off guard',
    'spot on',
    'ipso facto',
    'fed up',
    'brand new',
    'old fashioned',
    'bona fide',
    'well off',
    'far off',
    'straight forward',
    'hard up',
    'sui generis',
    'en suite',
    'avant garde',
    'sans serif',
    'gung ho',
    'super duper',
    'bourgeois'
  ],

  Verb: [
    'lengthen',
    'heighten',
    'worsen',
    'lessen',
    'awaken',
    'frighten',
    'threaten',
    'hasten',
    'strengthen',
    'given',
    //misc
    'known',
    'shown',
    'seen',
    'born'
  ],

  Place: [
    'new england',
    'new hampshire',
    'new jersey',
    'new mexico',
    'united states',
    'united kingdom',
    'great britain',
    'great lakes',
    'pacific ocean',
    'atlantic ocean',
    'indian ocean',
    'arctic ocean',
    'antarctic ocean',
    'everglades',
  ],
  //conjunctions
  'Conjunction': [
    'yet',
    'therefore',
    'or',
    'while',
    'nor',
    'whether',
    'though',
    'tho',
    'because',
    'cuz',
    'but',
    'for',
    'and',
    'however',
    'before',
    'although',
    'how',
    'plus',
    'versus',
    'otherwise',
    'as far as',
    'as if',
    'in case',
    'provided that',
    'supposing',
    'no matter',
    'yet',
  // 'not'
  ],
  Time: [
    //date
    'noon',
    'midnight',
    'now',
    'morning',
    'evening',
    'afternoon',
    'night',
    'breakfast time',
    'lunchtime',
    'dinnertime',
    'ago',
    'sometime',
    'eod',
    'oclock',
    'all day',
    'at night'
  ],
  Date: [
    //end of day, end of month
    'eom',
    'standard time',
    'daylight time',
  ],
  'Condition': [
    'if',
    'unless',
    'notwithstanding'
  ],

  'PastTense': [
    'said',
    'had',
    'been',
    'began',
    'came',
    'did',
    'meant',
    'went'
  ],


  'Gerund': [
    'going',
    'being',
    'according',
    'resulting',
    'developing',
    'staining'
  ],

  'Copula': [
    'is',
    'are',
    'was',
    'were',
    'am'
  ],

  //determiners
  'Determiner': determiners,


  //modal verbs
  'Modal': [
    'can',
    'may',
    'could',
    'might',
    'will',
    'ought to',
    'would',
    'must',
    'shall',
    'should',
    'ought',
    'shant',
    'lets', //arguable
  ],

  //Possessive pronouns
  'Possessive': [
    'mine',
    'something',
    'none',
    'anything',
    'anyone',
    'theirs',
    'himself',
    'ours',
    'his',
    'my',
    'their',
    'yours',
    'your',
    'our',
    'its',
    'herself',
    'hers',
    'themselves',
    'myself',
    'her', //this one is check ambiguous
  ],

  //personal pronouns (nouns)
  'Pronoun': [
    'it',
    'they',
    'i',
    'them',
    'you',
    'she',
    'me',
    'he',
    'him',
    'ourselves',
    'us',
    'we',
    'thou',
    'il',
    'elle',
    'yourself',
    '\'em',
    'he\'s',
    'she\'s'
  ],
  //questions are awkward pos. are clarified in question_pass
  'QuestionWord': [
    'where',
    'why',
    'when',
    'who',
    'whom',
    'whose',
    'what',
    'which'
  ],

  //family-terms are people
  Person: [
    'father',
    'mother',
    'mom',
    'dad',
    'mommy',
    'daddy',
    'sister',
    'brother',
    'aunt',
    'uncle',
    'grandfather',
    'grandmother',
    'cousin',
    'stepfather',
    'stepmother',
    'boy',
    'girl',
    'man',
    'woman',
    'guy',
    'dude',
    'bro',
    'gentleman',
    'someone'
  ]
};
//unpack the compact terms into the misc lexicon..
const keys$1 = Object.keys(compact$1);
for (let i = 0; i < keys$1.length; i++) {
  const arr = compact$1[keys$1[i]];
  for (let i2 = 0; i2 < arr.length; i2++) {
    misc$5[arr[i2]] = keys$1[i];
  }
}
var misc_1 = misc$5;

//the data is all variously compressed and sorted
//this is just a helper file for the main file paths..
/*@nocompile*/
var index$10 = {
  'notable_people': notable,
  'titles': titles,

  'currencies': currencies,
  'numbers': numbers,
  'ordinalMap': ordinalMap,
  'units': units_1,
  'dates': dates$3,

  'abbreviations': abbreviations_1,
  'irregular_plurals': irregular_plurals,
  // 'nouns': require('./nouns/nouns'),

  'superlatives': superlatives,
  'verbConverts': verbConverts,

  'irregular_verbs': irregular_verbs,
  'verbs': verbs$3,

  'misc': misc_1,
};

//convert 'cute' to 'cuteness'
const irregulars = {
  clean: 'cleanliness',
  naivety: 'naivety',
  hurt: 'hurt'
};

const transforms = [{
  'reg': /y$/,
  'repl': 'iness'
}, {
  'reg': /le$/,
  'repl': 'ility'
}, {
  'reg': /ial$/,
  'repl': 'y'
}, {
  'reg': /al$/,
  'repl': 'ality'
}, {
  'reg': /ting$/,
  'repl': 'ting'
}, {
  'reg': /ring$/,
  'repl': 'ring'
}, {
  'reg': /bing$/,
  'repl': 'bingness'
}, {
  'reg': /sing$/,
  'repl': 'se'
}, {
  'reg': /ing$/,
  'repl': 'ment'
}, {
  'reg': /ess$/,
  'repl': 'essness'
}, {
  'reg': /ous$/,
  'repl': 'ousness'
}];

const to_noun = function(w) {
  if (!w) {
    return '';
  }
  if (irregulars.hasOwnProperty(w)) {
    return irregulars[w];
  }
  const lastChar = w.charAt(w.length - 1);
  if (lastChar === 'w' || lastChar === 's') {
    return w;
  }
  //has space
  if (w.indexOf(' ') !== -1) {
    return w;
  }
  for (let i = 0; i < transforms.length; i++) {
    if (transforms[i].reg.test(w) === true) {
      return w.replace(transforms[i].reg, transforms[i].repl);
    }
  }
  return w + 'ness';
};

var toNoun = to_noun;
// console.log(to_noun("great"))

//an obj of adjectives that can be converted to superlative + comparative, via the lexicon data


const convertables = {};
index$10.superlatives = index$10.superlatives || [];
index$10.superlatives.forEach((a) => {
  convertables[a] = true;
});
index$10.verbConverts = index$10.verbConverts || [];
index$10.verbConverts.forEach((a) => {
  convertables[a] = true;
});
var convertable = convertables;

const irregulars$1 = {
  'nice': 'nicest',
  'late': 'latest',
  'hard': 'hardest',
  'inner': 'innermost',
  'outer': 'outermost',
  'far': 'furthest',
  'worse': 'worst',
  'bad': 'worst',
  'good': 'best',
  'big': 'biggest'
};

const dont = {
  'overweight': 1,
  'ready': 1
};

const transforms$1 = [{
  'reg': /y$/i,
  'repl': 'iest'
}, {
  'reg': /([aeiou])t$/i,
  'repl': '$1ttest'
}, {
  'reg': /([aeou])de$/i,
  'repl': '$1dest'
}, {
  'reg': /nge$/i,
  'repl': 'ngest'
}];

const matches = [
  /ght$/,
  /nge$/,
  /ough$/,
  /ain$/,
  /uel$/,
  /[au]ll$/,
  /ow$/,
  /oud$/,
  /...p$/
];

const not_matches = [
  /ary$/
];

const generic_transformation = function(s) {
  if (s.charAt(s.length - 1) === 'e') {
    return s + 'st';
  }
  return s + 'est';
};


const to_superlative = function(str) {
  if (irregulars$1.hasOwnProperty(str)) {
    return irregulars$1[str];
  }
  for (let i = 0; i < transforms$1.length; i++) {
    if (transforms$1[i].reg.test(str)) {
      return str.replace(transforms$1[i].reg, transforms$1[i].repl);
    }
  }
  if (convertable.hasOwnProperty(str)) {
    return generic_transformation(str);
  }
  if (dont.hasOwnProperty(str)) {
    return 'most ' + str;
  }
  for (let i = 0; i < not_matches.length; i++) {
    if (not_matches[i].test(str) === true) {
      return 'most ' + str;
    }
  }
  for (let i = 0; i < matches.length; i++) {
    if (matches[i].test(str) === true) {
      if (irregulars$1.hasOwnProperty(str)) {
        return irregulars$1[str];
      }
      return generic_transformation(str);
    }
  }
  return 'most ' + str;
};

var toSuperlative = to_superlative;
// console.log(to_superlative("great"))

const irregulars$2 = {
  'grey': 'greyer',
  'gray': 'grayer',
  'green': 'greener',
  'yellow': 'yellower',
  'red': 'redder',
  'good': 'better',
  'well': 'better',
  'bad': 'worse',
  'sad': 'sadder',
  'big': 'bigger'
};

const dont$1 = {
  'overweight': 1,
  'main': 1,
  'nearby': 1,
  'asleep': 1,
  'weekly': 1,
  'secret': 1,
  'certain': 1
};

const transforms$2 = [{
  reg: /y$/i,
  repl: 'ier'
}, {
  reg: /([aeiou])t$/i,
  repl: '$1tter'
}, {
  reg: /([aeou])de$/i,
  repl: '$1der'
}, {
  reg: /nge$/i,
  repl: 'nger'
}];

const matches$1 = [
  /ght$/,
  /nge$/,
  /ough$/,
  /ain$/,
  /uel$/,
  /[au]ll$/,
  /ow$/,
  /old$/,
  /oud$/,
  /e[ae]p$/
];

const not_matches$1 = [
  /ary$/,
  /ous$/
];

const to_comparative = function(str) {
  if (dont$1.hasOwnProperty(str)) {
    return null;
  }

  if (irregulars$2.hasOwnProperty(str)) {
    return irregulars$2[str];
  }

  for (let i = 0; i < transforms$2.length; i++) {
    if (transforms$2[i].reg.test(str) === true) {
      return str.replace(transforms$2[i].reg, transforms$2[i].repl);
    }
  }

  if (convertable[str] !== undefined) {
    if (/e$/.test(str) === true) {
      return str + 'r';
    }
    return str + 'er';
  }

  for (let i = 0; i < not_matches$1.length; i++) {
    if (not_matches$1[i].test(str) === true) {
      return 'more ' + str;
    }
  }

  for (let i = 0; i < matches$1.length; i++) {
    if (matches$1[i].test(str) === true) {
      return str + 'er';
    }
  }
  return 'more ' + str;
};

// console.log(to_comparative('big'));

var toComparative = to_comparative;

//turn 'quick' into 'quickly'
const adj_to_adv = function(str) {
  const irregulars = {
    'idle': 'idly',
    'public': 'publicly',
    'vague': 'vaguely',
    'day': 'daily',
    'icy': 'icily',
    'single': 'singly',
    'female': 'womanly',
    'male': 'manly',
    'simple': 'simply',
    'whole': 'wholly',
    'special': 'especially',
    'straight': 'straight',
    'wrong': 'wrong',
    'fast': 'fast',
    'hard': 'hard',
    'late': 'late',
    'early': 'early',
    'well': 'well',
    'good': 'well',
    'little': 'little',
    'long': 'long',
    'low': 'low',
    'best': 'best',
    'latter': 'latter',
    'bad': 'badly'
  };

  const dont = {
    'foreign': 1,
    'black': 1,
    'modern': 1,
    'next': 1,
    'difficult': 1,
    'degenerate': 1,
    'young': 1,
    'awake': 1,
    'back': 1,
    'blue': 1,
    'brown': 1,
    'orange': 1,
    'complex': 1,
    'cool': 1,
    'dirty': 1,
    'done': 1,
    'empty': 1,
    'fat': 1,
    'fertile': 1,
    'frozen': 1,
    'gold': 1,
    'grey': 1,
    'gray': 1,
    'green': 1,
    'medium': 1,
    'parallel': 1,
    'outdoor': 1,
    'unknown': 1,
    'undersized': 1,
    'used': 1,
    'welcome': 1,
    'yellow': 1,
    'white': 1,
    'fixed': 1,
    'mixed': 1,
    'super': 1,
    'guilty': 1,
    'tiny': 1,
    'able': 1,
    'unable': 1,
    'same': 1,
    'adult': 1
  };

  const transforms = [{
    reg: /al$/i,
    repl: 'ally'
  }, {
    reg: /ly$/i,
    repl: 'ly'
  }, {
    reg: /(.{3})y$/i,
    repl: '$1ily'
  }, {
    reg: /que$/i,
    repl: 'quely'
  }, {
    reg: /ue$/i,
    repl: 'uly'
  }, {
    reg: /ic$/i,
    repl: 'ically'
  }, {
    reg: /ble$/i,
    repl: 'bly'
  }, {
    reg: /l$/i,
    repl: 'ly'
  }];

  const not_matches = [
    /airs$/,
    /ll$/,
    /ee.$/,
    /ile$/
  ];

  if (dont[str] === 1) {
    return null;
  }
  if (irregulars[str] !== undefined) {
    return irregulars[str];
  }
  if (str.length <= 3) {
    return null;
  }
  for (let i = 0; i < not_matches.length; i++) {
    if (not_matches[i].test(str) === true) {
      return null;
    }
  }
  for (let i = 0; i < transforms.length; i++) {
    if (transforms[i].reg.test(str) === true) {
      return str.replace(transforms[i].reg, transforms[i].repl);
    }
  }
  return str + 'ly';
};
// console.log(adj_to_adv('direct'))

var toAdverb = adj_to_adv;

//turn an adjective like 'soft' into a verb like 'soften'

const irregulars$3 = {
  red: 'redden',
  sad: 'sadden',
  fat: 'fatten'
};

const convertable$2 = index$10.verbConverts.reduce((h, str) => {
  h[str] = true;
  return h;
}, {});


const toVerb = (str) => {
  //don't do words like 'green' -> 'greenen'
  if (!convertable$2[str]) {
    return str;
  }
  //irregulars
  if (irregulars$3[str]) {
    return irregulars$3[str];
  }
  if (/e$/.test(str) === true) {
    return str + 'n';
  }
  return str + 'en';
};
var toVerb_1 = toVerb;

var index$12 = {
  toNoun: toNoun,
  toSuperlative: toSuperlative,
  toComparative: toComparative,
  toAdverb: toAdverb,
  toVerb: toVerb_1
};

//turn a infinitiveVerb, like "walk" into an adjective like "walkable"

const rules$1 = [
  [/y$/, 'i'], //relay - reliable
  [/([aeiou][n])$/, '$1n'], //win - winnable
];

//convert - 'convertible'
//http://grammarist.com/usage/able-ible/
//http://blog.oxforddictionaries.com/2012/10/ibles-and-ables/
const ible_suffixes = {
  collect: true,
  exhaust: true,
  convert: true,
  digest: true,
  discern: true,
  dismiss: true,
  reverse: true,
  access: true,
  collapse: true,
  express: true
};

const irregulars$4 = {
  eat: 'edible',
  hear: 'audible',
  see: 'visible',
  defend: 'defensible',
  write: 'legible',
  move: 'movable',
  divide: 'divisible',
  perceive: 'perceptible'
};

//takes an infitive verb, and returns an adjective form
const toAdjective = function(str) {
  if (irregulars$4[str]) {
    return irregulars$4[str];
  }
  for(let i = 0; i < rules$1.length; i++) {
    if (rules$1[i][0].test(str) === true) {
      str = str.replace(rules$1[i][0], rules$1[i][1]);
    }
  }
  //ible/able
  let adj = str + 'able';
  if (ible_suffixes[str]) {
    adj = str + 'ible';
  }
  return adj;
};

var index$14 = toAdjective;

let irregulars$5 = index$10.irregular_verbs; //weeee!
 //weeee!
const infArr = Object.keys(irregulars$5);
const forms = [
  'Participle',
  'Gerund',
  'PastTense',
  'PresentTense',
  'FuturePerfect',
  'PerfectTense',
  'Actor'
];

const checkIrregulars = function(str) {
  //fast infinitive lookup
  if (irregulars$5[str] !== undefined) {
    let obj = fns$1.copy(irregulars$5[str]);
    obj.Infinitive = str;
    return obj;
  }
  //longer check of known-verb forms
  for(let i = 0; i < infArr.length; i++) {
    for(let o = 0; o < forms.length; o++) {
      let irObj = irregulars$5[infArr[i]];
      if (irObj[forms[o]] === str) {
        let obj = fns$1.copy(irObj);
        obj.Infinitive = infArr[i];
        return obj;
      }
    }
  }
  return {};
};

var irregulars_1 = checkIrregulars;
// console.log(checkIrregulars('bit'));

var rules$2 = [
  {
    reg: /(eave)$/i,
    repl: {
      pr: '$1s',
      pa: '$1d',
      gr: 'eaving',
      ar: '$1r'
    }
  },
  {
    reg: /(ink)$/i,
    repl: {
      pr: '$1s',
      pa: 'unk',
      gr: '$1ing',
      ar: '$1er'
    }
  },
  {
    reg: /(end)$/i,
    repl: {
      pr: '$1s',
      pa: 'ent',
      gr: '$1ing',
      ar: '$1er'
    }
  },
  {
    reg: /(ide)$/i,
    repl: {
      pr: '$1s',
      pa: 'ode',
      gr: 'iding',
      ar: 'ider'
    }
  },
  {
    reg: /(ake)$/i,
    repl: {
      pr: '$1s',
      pa: 'ook',
      gr: 'aking',
      ar: '$1r'
    }
  },
  {
    reg: /(eed)$/i,
    repl: {
      pr: '$1s',
      pa: '$1ed',
      gr: '$1ing',
      ar: '$1er'
    }
  },

  {
    reg: /(e)(ep)$/i,
    repl: {
      pr: '$1$2s',
      pa: '$1pt',
      gr: '$1$2ing',
      ar: '$1$2er'
    }
  }, {
    reg: /(a[tg]|i[zn]|ur|nc|gl|is)e$/i,
    repl: {
      pr: '$1es',
      pa: '$1ed',
      gr: '$1ing',
      prt: '$1en'
    }
  }, {
    reg: /([i|f|rr])y$/i,
    repl: {
      pr: '$1ies',
      pa: '$1ied',
      gr: '$1ying'
    }
  }, {
    reg: /([td]er)$/i,
    repl: {
      pr: '$1s',
      pa: '$1ed',
      gr: '$1ing'
    }
  }, {
    reg: /([bd]l)e$/i,
    repl: {
      pr: '$1es',
      pa: '$1ed',
      gr: '$1ing'
    }
  }, {
    reg: /(ish|tch|ess)$/i,
    repl: {
      pr: '$1es',
      pa: '$1ed',
      gr: '$1ing'
    }
  }, {
    reg: /(ion|end|e[nc]t)$/i,
    repl: {
      pr: '$1s',
      pa: '$1ed',
      gr: '$1ing'
    }
  }, {
    reg: /(om)e$/i,
    repl: {
      pr: '$1es',
      pa: 'ame',
      gr: '$1ing'
    }
  }, {
    reg: /([aeiu])([pt])$/i,
    repl: {
      pr: '$1$2s',
      pa: '$1$2',
      gr: '$1$2$2ing'
    }
  }, {
    reg: /(er)$/i,
    repl: {
      pr: '$1s',
      pa: '$1ed',
      gr: '$1ing'
    }
  }, {
    reg: /(en)$/i,
    repl: {
      pr: '$1s',
      pa: '$1ed',
      gr: '$1ing'
    },
  },
  {
    reg: /(..)(ow)$/i,
    repl: {
      pr: '$1$2s',
      pa: '$1ew',
      gr: '$1$2ing',
      prt: '$1$2n'
    }
  },
  {
    reg: /(..)([cs]h)$/i,
    repl: {
      pr: '$1$2es',
      pa: '$1$2ed',
      gr: '$1$2ing'
    },
  },
  {
    reg: /([^aeiou][ou])(g|d)$/i,
    repl: {
      pr: '$1$2s',
      pa: '$1$2$2ed',
      gr: '$1$2$2ing'
    },
  },
  {
    reg: /([^aeiou][aeiou])(b|t|p|m)$/i,
    repl: {
      pr: '$1$2s',
      pa: '$1$2$2ed',
      gr: '$1$2$2ing'
    },
  },
  {
    reg: /([aeiou]zz)$/i,
    repl: {
      pr: '$1es',
      pa: '$1ed',
      gr: '$1ing'
    }
  }
];

const mapping = {
  pr: 'PresentTense',
  pa: 'PastTense',
  gr: 'Gerund',
  prt: 'Participle',
  ar: 'Actor',
};
const keys$2 = Object.keys(mapping);

//check suffix rules
const suffixPass = function(inf) {
  let found = {};
  for(let i = 0; i < rules$2.length; i++) {
    if (rules$2[i].reg.test(inf) === true) {
      let obj = rules$2[i].repl;
      for(let o = 0; o < keys$2.length; o++) {
        if (obj[keys$2[o]] !== undefined) {
          let key = mapping[keys$2[o]];
          found[key] = inf.replace(rules$2[i].reg, obj[keys$2[o]]);
        }
      }
      return found;
    }
  }
  return found;
};

var suffixes = suffixPass;

//non-specifc, 'hail-mary' transforms from infinitive, into other forms
const hasY = /[bcdfghjklmnpqrstvwxz]y$/;
const generic = {

  Gerund: (o) => {
    const inf = o.Infinitive;
    if (inf.charAt(inf.length - 1) === 'e') {
      return inf.replace(/e$/, 'ing');
    }
    return inf + 'ing';
  },

  PresentTense: (o) => {
    const inf = o.Infinitive;
    if (inf.charAt(inf.length - 1) === 's') {
      return inf + 'es';
    }
    if (hasY.test(inf) === true) {
      return inf.slice(0, -1) + 'ies';
    }
    return inf + 's';
  },

  PastTense: (o) => {
    const inf = o.Infinitive;
    if (inf.charAt(inf.length - 1) === 'e') {
      return inf + 'd';
    }
    if (inf.substr(-2) === 'ed') {
      return inf;
    }
    if (hasY.test(inf) === true) {
      return inf.slice(0, -1) + 'ied';
    }
    return inf + 'ed';
  },

  // FutureTense: (o) => {
  //   return 'will ' + o.Infinitive;
  // },
  //
  // PerfectTense: (o) => {
  //   return 'have ' + (o.Participle || o.PastTense);
  // },
  //
  // Pluperfect: (o) => {
  //   if (o.PastTense) {
  //     return 'had ' + o.PastTense;
  //   }
  //   return null;
  // },
  // FuturePerfect: (o) => {
  //   if (o.PastTense) {
  //     return 'will have ' + o.PastTense;
  //   }
  //   return null;
  // }

};

var generic_1 = generic;

//this method is the same as regular conjugate, but optimised for use in the lexicon during warm-up.
//it's way faster because it knows input is already infinitive

const want = [
  'Gerund',
  'PastTense',
  'PresentTense',
];

const fasterConjugate = (inf) => {
  let all = {
    Infinitive: inf
  };
  const irregObj = irregulars_1(all['Infinitive']);
  if (irregObj !== null) {
    Object.keys(irregObj).forEach((k) => {
      if (irregObj[k] && !all[k]) {
        all[k] = irregObj[k];
      }
    });
  }
  //check suffix rules
  const suffObj = suffixes(inf);
  Object.keys(suffObj).forEach((k) => {
    if (suffObj[k] && !all[k]) {
      all[k] = suffObj[k];
    }
  });
  for(let i = 0; i < want.length; i++) {
    if (all[want[i]] === undefined) {
      all[want[i]] = generic_1[want[i]](all);
    }
  }
  return all;
};
var faster = fasterConjugate;
// console.log(fasterConjugate('walk'));

//a lexicon is a giant object of known words and their assumed pos-tag.
//the way we make it rn is a bit of a mess.





let lexicon$1 = {};
// console.time('lexicon');

const addObj = (o) => {
  fns$3.extendObj(lexicon$1, o);
};
const addArr = (arr, tag) => {
  const l = arr.length;
  for (let i = 0; i < l; i++) {
    lexicon$1[arr[i]] = tag;
  }
};

//let a rip
const units = index$10.units.words.filter((s) => s.length > 1);
addArr(units, 'Unit');
addArr(index$10.dates.durations, 'Duration');

addObj(index$10.abbreviations);
//number-words are well-structured
let obj = index$10.numbers.ordinal;
addArr(Object.keys(obj.ones), 'Ordinal');
addArr(Object.keys(obj.teens), 'Ordinal');
addArr(Object.keys(obj.tens), 'Ordinal');
addArr(Object.keys(obj.multiples), 'Ordinal');
obj = index$10.numbers.cardinal;
addArr(Object.keys(obj.ones), 'Cardinal');
addArr(Object.keys(obj.teens), 'Cardinal');
addArr(Object.keys(obj.tens), 'Cardinal');
addArr(Object.keys(obj.multiples), 'Cardinal');
addArr(Object.keys(index$10.numbers.prefixes), 'Cardinal');
//singular/plural
addArr(Object.keys(index$10.irregular_plurals.toPlural), 'Singular');
addArr(Object.keys(index$10.irregular_plurals.toSingle), 'Plural');

//dates are well-structured
addArr(index$10.dates.days, 'WeekDay');
addArr(index$10.dates.months, 'Month');
addArr(index$10.dates.relative, 'RelativeDay');

//irregular verbs
Object.keys(index$10.irregular_verbs).forEach((inf) => {
  lexicon$1[inf] = 'Infinitive';
  const conj = index$10.irregular_verbs[inf];
  Object.keys(conj).forEach((k2) => {
    if (conj[k2]) {
      lexicon$1[conj[k2]] = k2;
    }
  });
  const o = faster(inf);
  Object.keys(o).forEach((k) => {
    if (o[k] && !lexicon$1[o[k]]) {
      lexicon$1[o[k]] = k;
    }
  });
});

//conjugate verblist
index$10.verbs.forEach((v) => {
  const o = faster(v);
  Object.keys(o).forEach((k) => {
    if (o[k] && !lexicon$1[o[k]]) {
      lexicon$1[o[k]] = k;
    }
  });
  lexicon$1[index$14(v)] = 'Adjective';
});

//conjugate adjectives
index$10.superlatives.forEach((a) => {
  lexicon$1[index$12.toNoun(a)] = 'Noun';
  lexicon$1[index$12.toAdverb(a)] = 'Adverb';
  lexicon$1[index$12.toSuperlative(a)] = 'Superlative';
  lexicon$1[index$12.toComparative(a)] = 'Comparative';
});

//even more expressive adjectives
index$10.verbConverts.forEach((a) => {
  lexicon$1[index$12.toNoun(a)] = 'Noun';
  lexicon$1[index$12.toAdverb(a)] = 'Adverb';
  lexicon$1[index$12.toSuperlative(a)] = 'Superlative';
  lexicon$1[index$12.toComparative(a)] = 'Comparative';

  const v = index$12.toVerb(a);
  lexicon$1[v] = 'Verb';
  //now conjugate it
  const o = faster(v);
  Object.keys(o).forEach((k) => {
    if (o[k] && !lexicon$1[o[k]]) {
      lexicon$1[o[k]] = k;
    }
  });
});


//let a rip.
// addObj(data.firstnames);
addArr(index$10.notable_people.female, 'FemaleName');
addArr(index$10.notable_people.male, 'MaleName');
addArr(index$10.titles, 'Singular');
addArr(index$10.verbConverts, 'Adjective');
addArr(index$10.superlatives, 'Adjective');
addArr(index$10.currencies, 'Currency');
//these ad-hoc manual ones have priority
addObj(index$10.misc);

//for safety (these are sneaky)
delete lexicon$1[''];
delete lexicon$1[' '];
delete lexicon$1[null];
var lexicon_1 = lexicon$1;

// console.log(lexicon['ugh']);

var efrtUnpack = createCommonjsModule(function (module, exports) {
/* efrt trie-compression v0.0.5  github.com/nlp-compromise/efrt  - MIT */
(function(f) {
  {
    module.exports = f();
  }
})(function() {
  var define,
    module,
    exports;
  return (function e(t, n, r) {
    function s(o, u){
      if (!n[o]) {
        if (!t[o]) {
          var a = typeof commonjsRequire == 'function' && commonjsRequire;
          if (!u && a) {
            return a(o, !0);
          }
          if (i) {
            return i(o, !0);
          }
          var f = new Error('Cannot find module \'' + o + '\'');
          throw f.code = 'MODULE_NOT_FOUND', f
        }
        var l = n[o] = {
          exports: {}
        };
        t[o][0].call(l.exports, function(e) {
          var n = t[o][1][e];
          return s(n ? n : e);
        }, l, l.exports, e, t, n, r);
      }
      return n[o].exports;
    }
    var i = typeof commonjsRequire == 'function' && commonjsRequire;
    for(var o = 0; o < r.length; o++) {
      s(r[o]);
    }
    return s;
  })({
    1: [function(_dereq_, module, exports) {
      'use strict';
      const BASE = 36;

      const seq = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const cache = seq.split('').reduce((h, c, i) => {
        h[c] = i;
        return h;
      }, {});

      // 0, 1, 2, ..., A, B, C, ..., 00, 01, ... AA, AB, AC, ..., AAA, AAB, ...
      const toAlphaCode = function(n) {
        if (seq[n] !== undefined) {
          return seq[n];
        }
        let places = 1;
        let range = BASE;
        let s = '';

        for (; n >= range; n -= range, places++, range *= BASE) {
        }
        while (places--) {
          const d = n % BASE;
          s = String.fromCharCode((d < 10 ? 48 : 55) + d) + s;
          n = (n - d) / BASE;
        }
        return s;
      };


      const fromAlphaCode = function(s) {
        if (cache[s] !== undefined) {
          return cache[s];
        }
        let n = 0;
        let places = 1;
        let range = BASE;
        let pow = 1;

        for (; places < s.length; n += range, places++, range *= BASE) {
        }
        for (let i = s.length - 1; i >= 0; i--, pow *= BASE) {
          let d = s.charCodeAt(i) - 48;
          if (d > 10) {
            d -= 7;
          }
          n += d * pow;
        }
        return n;
      };

      module.exports = {
        toAlphaCode: toAlphaCode,
        fromAlphaCode: fromAlphaCode
      };

    }, {}],
    2: [function(_dereq_, module, exports) {
      'use strict';
      const Ptrie = _dereq_('./ptrie');

      const unpack = (str) => {
        return new Ptrie(str);
      };
      module.exports = unpack;

    }, {
      './ptrie': 4
    }],
    3: [function(_dereq_, module, exports) {
      'use strict';

      //are we on the right path with this string?
      const isPrefix = function(str, want) {
        //allow perfect equals
        if (str === want) {
          return true;
        }
        //compare lengths
        let len = str.length;
        if (len >= want.length) {
          return false;
        }
        //quick slice
        if (len === 1) {
          return str === want[0];
        }
        return want.slice(0, len) === str;
      };
      module.exports = isPrefix;
      // console.log(isPrefix('harvar', 'harvard'));

    }, {}],
    4: [function(_dereq_, module, exports) {
      'use strict';
      const encoding = _dereq_('../encoding');
      const isPrefix = _dereq_('./prefix');
      const unravel = _dereq_('./unravel');

      //PackedTrie - Trie traversal of the Trie packed-string representation.
      class PackedTrie {
        constructor(str) {
          this.nodes = str.split(';'); //that's all ;)!
          this.syms = [];
          this.symCount = 0;
          this._cache = null;
          //process symbols, if they have them
          if (str.match(':')) {
            this.initSymbols();
          }
        }

        //the symbols are at the top of the array.
        initSymbols() {
          //... process these lines
          const reSymbol = new RegExp('([0-9A-Z]+):([0-9A-Z]+)');
          for(let i = 0; i < this.nodes.length; i++) {
            const m = reSymbol.exec(this.nodes[i]);
            if (!m) {
              this.symCount = i;
              break;
            }
            this.syms[encoding.fromAlphaCode(m[1])] = encoding.fromAlphaCode(m[2]);
          }
          //remove from main node list
          this.nodes = this.nodes.slice(this.symCount, this.nodes.length);
        }

        // Return largest matching string in the dictionary (or '')
        has(want) {
          //fail-fast
          if (!want) {
            return false;
          }
          //then, try cache-lookup
          if (this._cache) {
            return this._cache[want] || false;
          }
          const crawl = (index, prefix) => {
            let node = this.nodes[index];
            //the '!' means a prefix-alone is a good match
            if (node[0] === '!') {
              //try to match the prefix (the last branch)
              if (prefix === want) {
                return true;
              }
              node = node.slice(1); //ok, we tried. remove it.
            }
            //each possible match on this line is something like 'me,me2,me4'.
            //try each one
            const matches = node.split(/([A-Z0-9,]+)/g);
            for (let i = 0; i < matches.length; i += 2) {
              const str = matches[i];
              const ref = matches[i + 1];
              if (!str) {
                continue;
              }
              const have = prefix + str;
              //we're at the branch's end, so try to match it
              if (ref === ',' || ref === undefined) {
                if (have === want) {
                  return true;
                }
                continue;
              }
              //ok, not a match.
              //well, should we keep going on this branch?
              //if we do, we ignore all the others here.
              if (isPrefix(have, want)) {
                index = this.indexFromRef(ref, index);
                return crawl(index, have);
              }
              //nah, lets try the next branch..
              continue;
            }

            return false;
          };
          return crawl(0, '');
        }

        // References are either absolute (symbol) or relative (1 - based)
        indexFromRef(ref, index) {
          const dnode = encoding.fromAlphaCode(ref);
          if (dnode < this.symCount) {
            return this.syms[dnode];
          }
          return index + dnode + 1 - this.symCount;
        }

        toArray() {
          return Object.keys(this.toObject());
        }
        toObject() {
          if (this._cache) {
            return this._cache;
          }
          return unravel(this);
        }
        cache() {
          this._cache = unravel(this);
          this.nodes = null;
          this.syms = null;
        }

      }

      module.exports = PackedTrie;

    }, {
      '../encoding': 1,
      './prefix': 3,
      './unravel': 5
    }],
    5: [function(_dereq_, module, exports) {
      'use strict';

      //spin-out all words from this trie
      const unRavel = (trie) => {
        let all = {};
        const crawl = function(index, prefix) {
          let node = trie.nodes[index];
          if (node[0] === '!') {
            all[prefix] = true;
            node = node.slice(1); //ok, we tried. remove it.
          }
          let matches = node.split(/([A-Z0-9,]+)/g);
          for (let i = 0; i < matches.length; i += 2) {
            let str = matches[i];
            let ref = matches[i + 1];
            if (!str) {
              continue;
            }

            let have = prefix + str;
            //branch's end
            if (ref === ',' || ref === undefined) {
              all[have] = true;
              continue;
            }
            let newIndex = trie.indexFromRef(ref, index);
            crawl(newIndex, have);
          }
        };
        crawl(0, '');
        return all;
      };
      module.exports = unRavel;

    }, {}]
  }, {}, [2])(2);
});
});

var _adjectives="0:68;1:5A;2:6A;3:4I;4:5K;5:5N;6:62;7:66;a5Yb5Fc51d4Le49f3Vg3Ih35i2Tj2Rk2Ql2Fm27n1Zo1Kp13qu11r0Vs05tYuJvGw8year1za1D;arEeDholeCiBo9r8;o4Hy;man1o8u5P;d5Rzy;ck0despr63ly,ry;!sa3;a4Gek1lco1C;p0y;a9i8ola3W;b6Fol4K;gabo5Hin,nilla,rio5B;g1lt3ZnDpArb4Ms9tter8;!mo6;ed,u2;b1Hp9s8t19;ca3et,tairs;er,i3R;authorFdeDeCfair,ivers2known,like1precedMrAs9ti5w8;iel5ritt5C;ig1Kupervis0;e8u1;cognBgul5Il5I;v58xpect0;cid0r8;!grou53stood;iz0;aCeBiAo9r8;anqu4Jen5i4Doubl0ue;geth4p,rp5H;dy,me1ny;en57st0;boo,l8n,wd3R;ent0;aWca3PeUhTiRkin0FlOmNnobb42oKpIqueam42tCu8ymb58;bAdd4Wp8r3F;er8re0J;!b,i1Z;du0t3;aCeAi0Nr9u8yl3X;p56r5;aightfor4Vip0;ad8reotyp0;fa6y;nda5Frk;a4Si8lend51rig0V;cy,r19;le9mb4phist1Lr8u13vi3J;d4Yry;!mn;el1ug;e9i8y;ck,g09my;ek,nd4;ck,l1n8;ce4Ig3;a5e4iTut,y;c8em1lf3Fni1Fre1Eve4Gxy;o11r38;cr0int1l2Lme,v1Z;aCeAi9o8;bu6o2Csy,y2;ght0Ytzy,v2;a8b0Ucondi3Emo3Epublic37t1S;dy,l,r;b4Hci6gg0nd3S;a8icke6;ck,i4V;aKeIhoHicayu13lac4EoGr9u8;bl4Amp0ny;eDiAo8;!b02f8p4;ou3Su7;c9m8or;a2Le;ey,k1;ci7mi14se4M;li30puli6;ny;r8ti2Y;fe4Cv2J;in1Lr8st;allel0t8;-ti8i2;me;bKffIi1kHnGpFrg0Yth4utEv8;al,er8;!aBn9t,w8;e8roug9;ig8;ht;ll;do0Ger,g1Ysi0E;en,posi2K;g1Wli0D;!ay;b8li0B;eat;e7s8;ce08ole2E;aEeDiBo8ua3M;b3n9rLsy,t8;ab3;descri3Qstop;g8mb3;ht1;arby,cessa1Pighbor1xt;ive,k0;aDeBiAo8ultip3;bi3dern,l5n1Jo8st;dy,t;ld,nX;a8di04re;s1ty;cab2Vd1genta,in,jUkeshift,le,mmo8ny;th;aHeCiAo8;f0Zne1u8ve1w1y2;sy,t1Q;ke1m8ter2ve1;it0;ftBg9th2v8wd;el;al,e8;nda17;!-Z;ngu2Sst,tt4;ap1Di0EnoX;agg0ol1u8;i1ZniFstifi0veni3;cy,de2gno33llImFn8;br0doDiGn4sAt8;a2Wen7ox8;ic2F;a9i8;de;ne;or;men7p8;ar8erfe2Port0rop4;ti2;!eg2;aHeEiCoBu8;ge,m8rt;b3dr8id;um;me1ne6ok0s03ur1;ghfalut1Bl1sp8;an23;a9f03l8;l0UpO;dy,ven1;l9n5rro8;wi0A;f,low0;aIener1WhGid5loFoDr9u8;ard0;aAey,is1o8;o8ss;vy;tis,y;ld,ne,o8;d,fy;b2oI;a8o8;st1;in8u5y;ful;aIeGiElag21oArie9u8;n,rY;nd1;aAol09r8ul;e8m4;gPign;my;erce ,n8t;al,i09;ma3r8;ti3;bl0ke,l7n0Lr,u8vori06;l8x;ty;aEerie,lDnti0ZtheCvBx8;a1Hcess,pe9t8ube1M;ra;ct0rt;eryday,il;re2;dLiX;rBs8;t,yg8;oi8;ng;th1;aLeHiCoArea9u8;e,mb;ry;ne,ub3;le;dact0Officu0Xre,s9v8;er7;cre9eas0gruntl0hone6ord8tress0;er1;et;adpAn7rang0t9vo8;ut;ail0ermin0;an;i1mag0n8pp4;ish;agey,ertaKhIivHlFoAr8udd1;a8isp,owd0;mp0vZz0;loBm9ncre8rZst1vert,ward1zy;te;mon,ple8;te,x;ni2ss2;ev4o8;s0u5;il;eesy,i8;ef,l1;in;aLeIizarTlFoBrAu8;r1sy;ly;isk,okK;gAld,tt9un8;cy;om;us;an9iCo8;nd,o5;d,k;hi9lov0nt,st,tt4yo9;er;nd;ckBd,ld,nkArr9w5;dy;en;ruW;!wards;bRctu2dKfraJgain6hHlEntiquDpCrab,sleep,verBw8;a9k8;waU;re;age;pareUt;at0;coh8l,oof;ol8;ic;ead;st;id;eHuCv8;a9er7;se;nc0;ed;lt;al;erElDoBruAs8;eEtra8;ct;pt;a8ve;rd;aze,e;ra8;nt";

var _adverbs="a06by 04d00eXfShQinPjustOkinda,mMnKoFpDquite,rAs6t3up2very,w1ye0;p,s;ay,ell; to,wards5;h1o0wiN;o,t6ward;en,us;everal,o0uch;!me1on,rt0; of;hVtimes,w05;a1e0;alQ;ndomPthL;ar excellCer0oint blank; Khaps;f3n0;ce0ly;! 0;agYmoS; courFten;ewHo0; longCt withstanding;aybe,eanwhi9ore0;!ovA;! aboR;deed,steS;en0;ce;or1urther0;!moH; 0ev3;examp0good,suF;le;n mas1v0;er;se;amn,e0irect1; 1finite0;ly;ju7trop;far,n0;ow; CbroBd nauseam,gAl5ny2part,side,t 0w3;be5l0mo5wor5;arge,ea4;mo1w0;ay;re;l 1mo0one,ready,so,ways;st;b1t0;hat;ut;ain;ad;lot,posteriori";

var _airports="aCbBcAd9f8h7i6jfk,kul,l4m3ord,p1s0yyz;fo,yd;ek,h0;l,x;co,ia,uc;a0gw,hr;s,x;ax,cn,st;kg,nd;co,ra;en,fw,xb;dg,gk,lt;cn,kk;ms,tl";

var _cities="a2Tb23c1Td1Oe1Nf1Lg1Gh18i16jakar2Ek0Xl0Rm0En0Ao08pXquiWrTsJtAu9v6w3y1z0;agreb,uri1W;ang1Qe0okohama;katerin1Frev31;ars1ellingt1Oin0rocl1;nipeg,terth0V;aw;a1i0;en2Glni2Y;lenc2Tncouv0Gr2F;lan bat0Dtrecht;a6bilisi,e5he4i3o2rondheim,u0;nVr0;in,ku;kyo,ronIulouC;anj22l13miso2Ira29; haJssaloni0X;gucigalpa,hr2Nl av0L;i0llinn,mpe2Angi07rtu;chu21n2LpT;a3e2h1kopje,t0ydney;ockholm,uttga11;angh1Eenzh1W;o0KvZ;int peters0Ul3n0ppo1E; 0ti1A;jo0salv2;se;v0z0Q;adU;eykjavik,i1o0;me,sario,t24;ga,o de janei16;to;a8e6h5i4o2r0ueb1Pyongya1M;a0etor23;gue;rt0zn23; elizabe3o;ls1Frae23;iladelph1Ynom pe07oenix;r0tah tik18;th;lerJr0tr0Z;is;dessa,s0ttawa;a1Glo;a2ew 0is;delTtaip0york;ei;goya,nt0Tpl0T;a5e4i3o1u0;mb0Kni0H;nt0scH;evideo,real;l1Ln01skolc;dellín,lbour0R;drid,l5n3r0;ib1se0;ille;or;chest0dalay,i0Y;er;mo;a4i1o0uxembou1FvAy00;ndZs angel0E;ege,ma0nz,sbYverpo1;!ss0;ol; pla0Husan0E;a5hark4i3laipeda,o1rak0uala lump2;ow;be,pavog0sice;ur;ev,ng8;iv;b3mpa0Jndy,ohsiu0Gra0un02;c0j;hi;ncheLstanb0̇zmir;ul;a5e3o0; chi mi1ms,u0;stH;nh;lsin0rakliF;ki;ifa,m0noi,va09;bu0RiltC;dan3en2hent,iza,othen1raz,ua0;dalaj0Fngzhou,tema05;bu0O;eToa;sk;es,rankfu0;rt;dmont4indhovU;a1ha01oha,u0;blRrb0Eshanbe;e0kar,masc0FugavpiJ;gu,je0;on;a7ebu,h2o0raioJuriti01;lo0nstanJpenhagNrk;gFmbo;enn3i1ristchur0;ch;ang m1c0ttagoL;ago;ai;i0lgary,pe town,rac4;ro;aHeBirminghWogoAr5u0;char3dap3enos air2r0sZ;g0sa;as;es;est;a2isba1usse0;ls;ne;silPtisla0;va;ta;i3lgrade,r0;g1l0n;in;en;ji0rut;ng;ku,n3r0sel;celo1ranquil0;la;na;g1ja lu0;ka;alo0kok;re;aBb9hmedabad,l7m4n2qa1sh0thens,uckland;dod,gabat;ba;k0twerp;ara;m5s0;terd0;am;exandr0maty;ia;idj0u dhabi;an;lbo1rh0;us;rg";

var _countries="0:39;1:2M;a2Xb2Ec22d1Ye1Sf1Mg1Bh19i13j11k0Zl0Um0Gn05om3DpZqat1JrXsKtCu6v4wal3yemTz2;a25imbabwe;es,lis and futu2Y;a2enezue32ietnam;nuatu,tican city;.5gTkraiZnited 3ruXs2zbeE;a,sr;arab emirat0Kkingdom,states2;! of am2Y;k.,s.2; 28a.;a7haBimor-les0Bo6rinidad4u2;nis0rk2valu;ey,me2Ys and caic1U; and 2-2;toba1K;go,kel0Ynga;iw2Wji2nz2S;ki2U;aCcotl1eBi8lov7o5pa2Cri lanka,u4w2yr0;az2ed9itzerl1;il1;d2Rriname;lomon1Wmal0uth 2;afr2JkLsud2P;ak0en0;erra leoEn2;gapo1Xt maart2;en;negKrb0ychellY;int 2moa,n marino,udi arab0;hele25luc0mart20;epublic of ir0Com2Duss0w2;an26;a3eHhilippinTitcairn1Lo2uerto riM;l1rtugE;ki2Cl3nama,pua new0Ura2;gu6;au,esti2;ne;aAe8i6or2;folk1Hth3w2;ay; k2ern mariana1C;or0N;caragua,ger2ue;!ia;p2ther19w zeal1;al;mib0u2;ru;a6exi5icro0Ao2yanm04;ldova,n2roc4zamb9;a3gol0t2;enegro,serrat;co;c9dagascZl6r4urit3yot2;te;an0i15;shall0Wtin2;ique;a3div2i,ta;es;wi,ys0;ao,ed01;a5e4i2uxembourg;b2echtenste11thu1F;er0ya;ban0Hsotho;os,tv0;azakh1Ee2iriba03osovo,uwait,yrgyz1E;eling0Knya;a2erFord1D;ma16p1C;c6nd5r3s2taly,vory coast;le of m1Arael;a2el1;n,q;ia,oJ;el1;aiTon2ungary;dur0Ng kong;aBeAha0Qibralt9re7u2;a5ern4inea2ya0P;!-biss2;au;sey;deloupe,m,tema0Q;e2na0N;ce,nl1;ar;org0rmany;bTmb0;a6i5r2;ance,ench 2;guia0Dpoly2;nes0;ji,nl1;lklandTroeT;ast tim6cu5gypt,l salv5ngl1quatorial3ritr4st2thiop0;on0; guin2;ea;ad2;or;enmark,jibou4ominica3r con2;go;!n B;ti;aAentral african 9h7o4roat0u3yprQzech2; 8ia;ba,racao;c3lo2morPngo-brazzaville,okFsta r03te d'ivoiK;mb0;osD;i2ristmasF;le,na;republic;m2naTpe verde,yman9;bod0ero2;on;aFeChut00o8r4u2;lgar0r2;kina faso,ma,undi;azil,itish 2unei;virgin2; is2;lands;liv0nai4snia and herzegoviGtswaGuvet2; isl1;and;re;l2n7rmuF;ar2gium,ize;us;h3ngladesh,rbad2;os;am3ra2;in;as;fghaFlCmAn5r3ustr2zerbaijH;al0ia;genti2men0uba;na;dorra,g4t2;arct6igua and barbu2;da;o2uil2;la;er2;ica;b2ger0;an0;ia;ni2;st2;an";

var _demonyms="0:17;a0Wb0Mc0Bd09e08f06g03h01iXjUkSlOmKnHomGpCqatari,rAs6t4u3v2wel0Qz1;am0Eimbabwe0;enezuel0ietnam0G;g8krai11;aiwShai,rinida0Hu1;ni0Prkmen;a3cot0Je2ingapoNlovak,oma0Tpa04udQw1y0X;edi0Jiss;negal0Ar07;mo0uT;o5us0Kw1;and0;a2eru0Ghilipp0Po1;li0Drtugu05;kist2lesti0Qna1raguay0;ma0P;ani;amiYi1orweO;caragu0geri1;an,en;a2ex0Mo1;ngo0Erocc0;cedo0Ila1;gasy,y07;a3eb8i1;b1thua0F;e0Dy0;o,t01;azakh,eny0o1uwaiti;re0;a1orda0A;ma0Bp1;anM;celandic,nd3r1sraeli,ta02vo06;a1iS;ni0qi;i0oneU;aiCin1ondur0unM;di;amCe1hanai0reek,uatemal0;or1rm0;gi0;i1ren6;lipino,n3;cuadoVgyp5ngliIstoWthiopi0urope0;a1ominXut3;niG;a8h5o3roa2ub0ze1;ch;ti0;lom1ngol4;bi0;a5i1;le0n1;ese;liforLm1na2;bo1erooK;di0;a9el7o5r2ul1;gaG;aziBi1;ti1;sh;li1sD;vi0;aru1gi0;si0;ngladeshi,sque;f9l6merAngol0r4si0us1;sie,tr1;a1i0;li0;gent1me4;ine;ba2ge1;ri0;ni0;gh0r1;ic0;an";

var _expressions="aZbYdTeRfuck,gQhKlHmGnFoCpAsh9u7voi01w3y0;a1eKu0;ck,p;!a,hoo,y;h1ow,t0;af,f;e0oa;e,w;gh,h0;! huh,-Oh,m;eesh,hh,it;ff,hew,l0sst;ease,z;h1o0w,y;h,o,ps;!h;ah,ope;eh,mm;m1ol0;!s;ao,fao;a3e1i,mm,urr0;ah;e,ll0y;!o;ha0i;!ha;ah,ee,oodbye,rr;e0h,t cetera,ww;k,p;'3a0uh;m0ng;mit,n0;!it;oh;ah,oo,ye; 1h0rgh;!em;la";

var _female="0:81;1:7E;2:7G;3:7Y;4:65;5:7P;6:7T;7:7O;8:7U;9:7C;A:6K;B:7R;C:6X;D:79;a78b6Pc5Ud5Ce4Rf4Jg47h3Zi3Uj38k2Sl21m1An14o12p0Ur0FsYtNursu9vIwGyEza7;olan2vE;etDon5Z;an2enMhi6PilE;a,la,ma;aHeFiE;ctor1o9rgin1vi3B;l4VrE;a,na,oniA;len5Ones7N;aLeJheIi3onHrE;acCiFuE;dy;c1na,s8;i4Vya;l4Nres0;o3GrE;e1Oi,ri;bit8mEn29ra,s8;a7iEmy;!ka;aTel4HhLiKoItHuFyE;b7Tlv1;e,sEzV;an17i;acCel1H;f1nEph1;d7ia,ja,ya;lv1mon0;aHeEi24;e3i9lFrE;i,yl;ia,ly;nFrEu3w3;i,on;a,ia,nEon;a,on;b24i2l5Ymant8nd7raB;aPeLhon2i5oFuE;by,th;bIch4Pn2sFxE;an4W;aFeE;ma2Ut5;!lind;er5yn;bFnE;a,ee;a,eE;cAkaB;chEmo3qu3I;a3HelEi2;!e,le;aHeGhylFriE;scil0Oyamva2;is,lis;arl,t7;ige,mGrvati,tricFulE;a,etDin0;a,e,ia;!e9;f4BlE;ga,iv1;aIelHiForE;a,ma;cEkki,na;ho2No2N;!l;di6Hi36o0Qtas8;aOeKiHonFrignayani,uri2ZyrE;a,na,t2J;a,iE;ca,q3G;ch3SlFrE;an2iam;dred,iA;ag1DgGliFrE;ced63edi36;n2s5Q;an,han;bSdel4e,gdale3li59nRrHtil2uGvFx4yE;a,ra;is;de,re6;cMgKiGl3Fs8tFyanE;!n;a,ha,i3;aFb2Hja,l2Ena,sEtza;a,ol,sa;!nE;!a,e,n0;arEo,r4AueriD;et4Ai5;elLia;dakran5on,ue9;el,le;aXeSiOoKuGyE;d1nE;!a,da,e4Vn1D;ciGelFiEpe;sa;a,la;a,l3Un2;is,la,rEui2Q;aFeEna,ra4;n0t5;!in0;lGndEsa;a,sE;ay,ey,i,y;a,i0Fli0F;aHiGla,nFoEslCt1M;la,na;a,o7;gh,la;!h,n07;don2Hna,ra,tHurFvern0xE;mi;a,eE;l,n;as8is8oE;nEya;ya;aMeJhadija,iGrE;istEy2G;a,en,in0M;mErst6;!beE;rlC;is8lFnd7rE;i,ri;ey,i,lCy;nyakumari,rItFvi5yE;!la;aFe,hEi3Cri3y;ar4er4le6r12;ri3;a,en,iEla;!ma,n;aTeNilKoGuE;anEdi1Fl1st4;a,i5;!anGcel0VdFhan1Rl3Eni,seEva3y37;fi3ph4;i32y;!a,e,n02;!iFlE;!iE;an;anHle3nFri,sE;iAsiA;a,if3LnE;a,if3K;a,e3Cin0nE;a,e3Bin0;cHde,nEsm4vie7;a,eFiE;ce,n0s;!l2At2G;l0EquelE;in0yn;da,mog2Vngrid,rHsEva;abelFiE;do7;!a,e,l0;en0ma;aIeGilE;aEda,laE;ry;ath33i26lenEnriet5;!a,e;nFrE;i21ri21;aBnaB;aMeKiJlHrFwenE;!dolY;acEetch6;e,ie9;adys,enEor1;a,da,na;na,seH;nevieve,orgi0OrE;ald4trude;brielFil,le,yE;le;a,e,le;aKeIlorHrE;ancEe2ie2;es,iE;n0sA;a,en1V;lErn;ic1;tiPy1P;dWile6k5lPmOrMstJtHuGvE;a,elE;yn;gen1la,ni1O;hEta;el;eEh28;lEr;a,e,l0;iEma,nest4;ca,ka,n;ma;a4eIiFl6ma,oiVsa,vE;a,i7;sEzaF;aEe;!beH;anor,nE;!a;iEna;th;aReKiJoE;lHminiqGnPrE;a,e6is,othE;ea,y;ue;ly,or24;anWna;anJbIe,lGnEsir1Z;a,iE;se;a,ia,la,orE;es,is;oraBra;a,na;m1nFphn0rlE;a,en0;a,iE;el08;aYeVhSlOoHrEynth1;isFyE;stal;ti3;lJnsHrEur07;a,inFnE;el1;a,e,n0;tanEuelo;ce,za;e6le6;aEeo;ire,rFudE;etDia;a,i0A;arl0GeFloe,ristE;a,in0;ls0Qryl;cFlE;esDi1D;el1il0Y;itlin,milMndLrIsHtE;ali3hE;er4le6y;in0;a0Usa0U;a,la,meFolE;!e,in0yn;la,n;aViV;e,le;arbVeMiKlKoni5rE;anIen2iEooke;dgFtE;tnC;etE;!te;di;anA;ca;atriLcky,lin2rItFulaBverE;ly;h,tE;e,yE;!e;nEt8;adOiE;ce;ce,z;a7ra;biga0Kd0Egn0Di08lZmVnIrGshlCudrEva;a,ey,i,y;ey,i,y;lEpi5;en0;!a,dNeLgelJiIja,nGtoE;inEn1;etD;!a,eIiE;ka;ka,ta;a,iE;a,ca,n0;!tD;te;je9rE;ea;la;an2bFel1i3y;ia;er;da;ber5exaJiGma,ta,yE;a,sE;a,sa;cFsE;a,ha,on;e,ia;nd7;ra;ta;c8da,le6mFshaB;!h;ee;en;ha;es;a,elGriE;a3en0;na;e,iE;a,n0;a,e;il";

var _firstnames="aJblair,cHdevGguadalupe,jBk9l8m5r2sh0trinity;ay,e0iloh;a,lby;e1o0;bin,sario;ag1g1ne;ar1el,org0;an;ion,lo;ashawn,ee;asAe0;ls9nyatta,rry;a1e0;an,ss2;de,ime,m0n;ie,m0;ie;an,on;as0heyenne;ey,sidy;lexis,ndra,ubr0;ey";

var _holidays="0:1P;1:1Q;a1Fb1Bc12d0Ye0Of0Kg0Hh0Di09june07kwanzaa,l04m00nYoVpRrPsEt8v6w4xm03y2;om 2ule;hasho16kippur;hit2int0Xomens equalit7; 0Ss0T;aGe2ictor1E;r1Bteran0;-1ax 1h6isha bav,rinityNu2; b3rke2;y 1;ish2she2;vat;a0Ye prophets birth1;a6eptember15h4imchat tor0Vt 3u2;kk4mmer U;a9p8s7valentines day ;avu2mini atzeret;ot;int 2mhain;a5p4s3va2;lentine0;tephen0;atrick0;ndrew0;amadan,ememberanc0Yos2;a park0h hashana;a3entecost,reside0Zur2;im,ple heart 1;lm2ssovE; s04;rthodox 2stara;christma0easter2goOhoJn0C;! m07;ational 2ew years09;freedom 1nurse0;a2emorial 1lHoOuharram;bMr2undy thurs1;ch0Hdi gr2tin luther k0B;as;a2itRughnassadh;bour 1g baom2ilat al-qadr;er; 2teenth;soliU;d aJmbolc,n2sra and miraj;augurGd2;ependen2igenous people0;c0Bt0;a3o2;ly satur1;lloween,nukkUrvey mil2;k 1;o3r2;ito de dolores,oundhoW;odW;a4east of 2;our lady of guadalupe,the immaculate concepti2;on;ther0;aster8id 3lectYmancip2piphany;atX;al-3u2;l-f3;ad3f2;itr;ha;! 2;m8s2;un1;ay of the dead,ecemb3i2;a de muertos,eciseis de septiembre,wali;er sol2;stice;anad8h4inco de mayo,o3yber m2;on1;lumbu0mmonwealth 1rpus christi;anuk4inese n3ristmas2;! N;ew year;ah;a 1ian tha2;nksgiving;astillCeltaine,lack4ox2;in2;g 1; fri1;dvent,ll 9pril fools,rmistic8s6u2;stral4tum2;nal2; equinox;ia 1;cens2h wednes1sumption of mary;ion 1;e 1;hallows 6s2;ai2oul0t0;nt0;s 1;day;eve";

var _lastnames="0:2S;1:38;2:36;3:2B;4:2W;5:2Y;a38b2Zc2Ld2Be28f23g1Yh1Ni1Ij1Ck15l0Xm0Ln0Ho0Ep04rXsMtHvFwCxBy8zh6;a6ou,u;ng,o;a6eun2Roshi1Iun;ma6ng;da,guc1Xmo24sh1ZzaQ;iao,u;a7eb0il6o4right,u;li39s2;gn0lk0ng,tanabe;a6ivaldi;ssilj35zqu1;a9h8i2Do7r6sui,urn0;an,ynisI;lst0Nrr2Sth;at1Romps2;kah0Tnaka,ylor;aDchCeBhimizu,iAmi9o8t7u6zabo;ar1lliv27zuD;al21ein0;sa,u4;rn3th;lva,mmo22ngh;mjon3rrano;midt,neid0ulz;ito,n7sa6to;ki;ch1dKtos,z;amBeag1Xi9o7u6;bio,iz,s2L;b6dri1KgHj0Sme22osevelt,sZux;erts,ins2;c6ve0E;ci,hards2;ir1os;aDe9h7ic6ow1Z;as2Ehl0;a6illips;m,n1S;ders5et8r7t6;e0Or3;ez,ry;ers;h20rk0t6vl3;el,te0K;baBg0Blivei01r6;t6w1O;ega,iz;a6eils2guy5ix2owak,ym1D;gy,ka6var1J;ji6muW;ma;aEeCiBo8u6;ll0n6rr0Cssolini,ñ6;oz;lina,oKr6zart;al1Me6r0T;au,no;hhail3ll0;rci0s6y0;si;eWmmad3r6tsu08;in6tin1;!o;aCe8i6op1uo;!n6u;coln,dholm;e,fe7n0Pr6w0I;oy;bv6v6;re;rs5u;aBennedy,imuAle0Ko8u7wo6;k,n;mar,znets3;bay6vacs;asY;ra;hn,rl9to,ur,zl3;aAen9ha4imen1o6u4;h6n0Yu4;an6ns2;ss2;ki0Ds5;cks2nsse0C;glesi9ke8noue,shik7to,vano6;u,v;awa;da;as;aCe9it8o7u6;!a4b0gh0Nynh;a4ffmann,rvat;chcock,l0;mingw7nde6rL;rs2;ay;ns5rrOs7y6;asCes;an3hi6;moH;a8il,o7rub0u6;o,tierr1;m1nzal1;nd6o,rcia;hi;er9is8lor08o7uj6;ita;st0urni0;ch0;nand1;d7insteHsposi6vaL;to;is2wards;aCeBi9omin8u6;bo6rand;is;gu1;az,mitr3;ov;lgado,vi;rw7vi6;es,s;in;aFhBlarkAo6;h5l6op0x;em7li6;ns;an;!e;an8e7iu,o6ristens5u4we;i,ng,u4w,y;!n,on6u4;!g;mpb8rt0st6;ro;er;ell;aBe8ha4lanco,oyko,r6yrne;ooks,yant;ng;ck7ethov5nnett;en;er,ham;ch,h7iley,rn6;es;k,ng;dEl9nd6;ers6rB;en,on,s2;on;eks8iy9on7var1;ez;so;ej6;ev;ams";

var _male="0:A8;1:9I;2:9Z;3:9Q;4:93;5:7V;6:9B;7:9W;8:8K;9:7H;A:9V;a96b8Kc7Sd6Ye6Af5Vg5Gh4Xi4Nj3Rk3Jl33m25n1Wo1Rp1Iqu1Hr0Xs0EtYusm0vVwLxavi3yDzB;aBor0;cha52h1E;ass2i,oDuB;sEuB;ma,to;nEsDusB;oBsC;uf;ef;at0g;aIeHiCoB;lfga05odrow;lBn16;bDfr9IlBs1;a8GiB;am2Qe,s;e6Yur;i,nde7Zsl8;de,lBrr7y6;la5t3;an5ern1iB;cBha0nce2Wrg7Sva0;ente,t4I;aPeKhJimIoErCyB;!l3ro6s1;av6OeBoy;nt,v4E;bDdd,mBny;!as,mBoharu;a93ie,y;i9y;!my,othy;eodo0Nia6Aom9;dErB;en5rB;an5eBy;ll,n5;!dy;ic84req,ts3Myl42;aNcottMeLhIiHoFpenc3tBur1Fylve76zym1;anDeBua6A;f0ph8OrliBve4Hwa69;ng;!islaw,l8;lom1uB;leyma6ta;dn8m1;aCeB;ld1rm0;h02ne,qu0Hun,wn;an,basti0k1Nl3Hrg3Gth;!y;lEmDntBq3Yul;iBos;a5Ono;!m7Ju4;ik,vaB;d3JtoY;aQeMicKoEuCyB;an,ou;b7dBf67ssel5X;ol2Fy;an,bFcky,dEel,geDh0landAm0n5Dosevelt,ry,sCyB;!ce;coe,s;l31r;e43g3n8o8Gri5C;b7Ie88;ar4Xc4Wha6YkB;!ey,y;gCub7x,yBza;ansh,nal4U;g7DiB;na79s;chDfa4l22mCndBpha4ul,y58;al5Iol21;i7Yon;id;ent2int1;aIeEhilDierCol,reB;st1;re;!ip,lip;d7RrDtB;ar,eB;!r;cy,ry;bLt3Iul;liv3m7KrDsCtBum78w7;is,to;ama,c76;i,l3NvB;il4H;athanIeHiDoB;aBel,l0ma0r2G;h,m;cDiCkB;h5Oola;lo;hol9k,ol9;al,d,il,ls1;!i4;aUeSiKoFuByr1;hamDrCstaB;fa,pha;ad,ray;ed,mF;dibo,e,hamDntCrr4EsBussa;es,he;e,y;ad,ed,mB;ad,ed;cFgu4kDlCnBtche5C;a5Yik;an,os,t1;e,olB;aj;ah,hBk8;a4eB;al,l;hBlv2r3P;di,met;ck,hLlKmMnu4rGs1tCuri5xB;!imilianA;eo,hCi9tB;!eo,hew,ia;eBis;us,w;cDio,kAlCsha4WtBv2;i21y;in,on;!el,oIus;colm,ik;amBdi,moud;adB;ou;aMeJiIl2AoEuBy39;c9is,kBth3;aBe;!s;g0nn5HrenDuBwe4K;!iB;e,s;!zo;am,on4;evi,i,la3YoBroy,st3vi,w3C;!nB;!a4X;mCn5r0ZuBwB;ren5;ar,oB;nt;aGeChaled,irBrist40u36y2T;k,ollos;i0Vlv2nBrmit,v2;!dCnBt;e0Ty;a43ri3T;na50rBthem;im,l;aYeRiPoDuB;an,liBni0Nst2;an,o,us;aqu2eKhnJnGrEsB;eChB;!ua;!ph;dBge;an,i;!aB;s,thB;an,on;!ath0n4A;!l,sBy;ph;an,e,mB;!m46;ffFrCsB;s0Vus;a4BemCmai6oBry;me,ni0H;i5Iy;!e01rB;ey,y;cGd7kFmErDsCvi3yB;!d7;on,p3;ed,r1G;al,es;e,ob,ub;kBob;!s1;an,brahJchika,gHk3lija,nuGrEsDtBv0;ai,sB;uki;aac,ha0ma4;a,vinB;!g;k,nngu3X;nacBor;io;im;aKeFina3SoDuByd42;be1RgBmber3GsD;h,o;m3ra5sBwa35;se2;aEctDitDnCrB;be1Mm0;ry;or;th;bIlHmza,ns,o,rCsBya37;an,s0;lEo3CrDuBv8;hi34ki,tB;a,o;is1y;an,ey;!im;ib;aLeIilbe3YlenHord1rDuB;illerBstavo;mo;aDegBov3;!g,orB;io,y;dy,h43nt;!n;ne,oCraB;ld,rdA;ffr8rge;brielDrB;la1IrBy;eZy;!e;aOeLiJlIorr0CrB;anDedB;!d2GeBri1K;ri1J;cCkB;!ie,l2;esco,isB;!co,zek;oyd;d4lB;ip;liCng,rnB;anX;pe,x;bi0di;arWdRfra2it0lNmGnFrCsteb0th0uge6vBym7;an,ereH;gi,iCnBv2w2;estAie;c02k;rique,zo;aGiDmB;aFeB;tt;lCrB;!h0;!io;nu4;be02d1iDliCm3t1v2woB;od;ot1Bs;!as,j34;!d1Xg28mEuCwB;a1Din;arB;do;o0Fu0F;l,nB;est;aSeKieJoDrag0uCwByl0;ay6ight;a6st2;minEnDugCyB;le;!l9;!a1Hn1K;go,icB;!k;go;an,j0lbeHmetriYnFrEsDvCwBxt3;ay6ey;en,in;moZ;ek,ri05;is,nB;is;rt;lKmJnIrDvB;e,iB;!d;iEne08rBw2yl;eBin,yl;lBn;!l;n,us;!e,i4ny;i1Fon;e,l9;as;aXeVhOlFoCraig,urtB;!is;dy,l2nrad,rB;ey,neliBy;us;aEevelaDiByG;fBnt;fo06t1;nd;rDuCyB;!t1;de;en5k;ce;aFeErisCuB;ck;!tB;i0oph3;st3;d,rlBse;es,ie;cBdric,s0M;il;lEmer1rB;ey,lCroBt3;ll;!os,t1;eb,v2;arVePilOlaNobMrCuByr1;ddy,rt1;aGeDi0uCyB;anDce,on;ce,no;nCtB;!t;d0t;dBnd1;!foCl8y;ey;rd;!by;i6ke;al,lF;nDrBshoi;at,naBt;rdA;!iCjam2nB;ie,y;to;ry,t;ar0Pb0Hd0Egu0Chme0Bid7jani,lUmSnLputsiKrCsaBu0Cya0ziz;hi;aHchGi4jun,maEnCon,tBy0;hur,u04;av,oB;ld;an,ndA;el;ie;ta;aq;dFgelAtB;hony,oB;i6nB;!iA;ne;reBy;!a,s,w;ir,mBos;ar;!an,beOeIfFi,lEonDt1vB;aMin;on;so,zo;an,en;onCrB;edA;so;jEksandDssExB;!and3is;er;ar,er;andB;ro;rtA;!o;en;d,t;st2;in;amCoBri0vik;lfo;!a;dDel,rahCuB;!bakr,lfazl;am;allEel,oulaye,ulB;lCrahm0;an;ah,o;ah;av,on";

var _nouns="ad hominPbKcJdGeEfCgBh8kittNlunchDn7othersDp5roomQs3t0us dollarQ;h0icPragedM;ereOing0;!sA;tu0uper bowlMystL;dAffL;a0roblJurpo4;rtJt8;othGumbA;ead startHo0;meGu0;seF;laci6odErand slamE;l oz0riendDundB;!es;conom8ggBnerg8v0xamp7;entA;eath9inn1o0;gg5or8;er7;anar3eil4it3ottage6redit card6;ank3o0reakfast5;d1tt0;le3;ies,y;ing1;em0;!s";

var _organizations="0:42;1:40;a38b2Pc29d21e1Yf1Ug1Mh1Hi1Ej1Ak18l14m0Tn0Go0Dp07qu06rZsStFuBv8w3y2;amaha,m0Youtu2Rw0Y;a4e2orld trade organizati1;lls fargo,st2;fie23inghou18;l2rner br3B;-m13gree30l street journ25m13;an halOeriz1isa,o2;dafo2Gl2;kswagMvo;bs,n3ps,s2;a tod2Qps;es33i2;lev2Wted natio2T; mobi2Jaco beQd bNeBgi fridaAh4im horto2Smz,o2witt2V;shiba,y2;ota,s r Z;e 2in lizzy;b4carpen31daily ma2Vguess w3holli0rolling st1Ns2w3;mashing pumpki2Nuprem0;ho;ea2lack eyed pe3Dyrds;ch bo2tl0;ys;l3s2;co,la m14;efoni09us;a7e5ieme2Fo3pice gir6ta2ubaru;rbucks,to2L;ny,undgard2;en;a2Px pisto2;ls;few24insbu25msu1W;.e.m.,adiohead,b7e4oyal 2yan2V;b2dutch she5;ank;/max,aders dige1Ed 2vl1;bu2c1Thot chili peppe2Ilobst27;ll;c,s;ant2Tizno2D;an6bs,e4fiz23hilip morrCi3r2;emier25octer & gamb1Qudenti14;nk floyd,zza hut;psi26tro2uge0A;br2Ochina,n2O; 3ason1Wda2E;ld navy,pec,range juli3xf2;am;us;aBbAe6fl,h5i4o2sa,wa;kia,tre dame,vart2;is;ke,ntendo,ss0L;l,s;stl4tflix,w2; 2sweek;kids on the block,york0A;e,é;a,c;nd1Rs3t2;ional aca2Co,we0P;a,cZd0N;aBcdonaldAe6i4lb,o2tv,yspace;b1Knsanto,ody blu0t2;ley crue,or0N;crosoft,t2;as,subisP;dica4rcedes3talli2;ca;!-benz;id,re;'s,s;c's milk,tt11z1V;'ore08a4e2g,ittle caesa1H;novo,x2;is,mark; pres6-z-boy;atv,fc,kk,m2od1H;art;iffy lu0Jo4pmorgan2sa;! cha2;se;hnson & johns1y d1O;bm,hop,n2tv;g,te2;l,rpol; & m,asbro,ewlett-packaSi4o2sbc,yundai;me dep2n1G;ot;tac2zbollah;hi;eneral 7hq,l6o3reen d0Gu2;cci,ns n ros0;ldman sachs,o2;dye2g09;ar;axo smith kliYencore;electr0Gm2;oto0S;a4bi,da,edex,i2leetwood mac,oFrito-l08;at,nancial2restoU; tim0;cebook,nnie mae;b04sa,u,xxon2; m2m2;ob0E;aiml09e6isney,o4u2;nkin donuts,po0Uran dur2;an;j,w j2;on0;a,f leppa3ll,peche mode,r spiegYstiny's chi2;ld;rd;aFbc,hCiAnn,o4r2;aigsli6eedence clearwater reviv2;al;ca c6l5m2o09st04;ca3p2;aq;st;dplMgate;ola;a,sco2tigroup;! systems;ev3i2;ck fil-a,na daily;r1y;dbury,pital o2rl's jr;ne;aGbc,eCfAl6mw,ni,o2p;ei4mbardiKston 2;glo2pizza;be;ng;ack & deckGo3ue c2;roX;ckbuster video,omingda2;le; g2g2;oodriN;cht4e ge0n & jer3rkshire hathaw2;ay;ryH;el;nana republ4s2xt6y6;f,kin robbi2;ns;ic;bXcSdidRerosmith,ig,lLmFnheuser-busEol,ppleAr7s4t&t,v3y2;er;is,on;hland2sociated G; o2;il;by5g3m2;co;os; compu3bee2;'s;te2;rs;ch;c,d,erican4t2;!r2;ak; ex2;pre2;ss; 5catel3t2;air;!-luce2;nt;jazeera,qae2;da;as;/dc,a4er,t2;ivisi1;on;demy of scienc0;es;ba,c";

var _sportsTeams="0:1M;1:1T;2:1U;a1Rb1Dc0Zd0Qfc dallas,g0Nhouston 0Mindiana0Ljacksonville jagua0k0Il0Fm02newVoRpKqueens parkJrIsAt5utah jazz,vancouver whitecaps,w3yY;ashington 3est ham0Xh16;natio21redski1wizar12;ampa bay 6e5o3;ronto 3ttenham hotspur;blu1Hrapto0;nnessee tita1xasD;buccanee0ra1G;a7eattle 5heffield0Qporting kansas13t3;. louis 3oke12;c1Srams;mari02s3;eah1IounI;cramento Sn 3;antonio spu0diego 3francisco gi0Bjose earthquak2;char0EpaB;eal salt lake,o04; ran0C;a8h5ittsburgh 4ortland t3;imbe0rail blaze0;pirat2steele0;il3oenix su1;adelphia 3li2;eagl2philNunE;dr2;akland 4klahoma city thunder,r3;i10lando magic;athle0Trai3;de0; 3castle05;england 6orleans 5york 3;city fc,giUje0Lkn02me0Lred bul19y3;anke2;pelica1sain0J;patrio0Irevolut3;ion;aBe9i3ontreal impact;ami 7lwaukee b6nnesota 3;t4u0Rvi3;kings;imberwolv2wi1;re0Cuc0W;dolphi1heat,marli1;mphis grizz3ts;li2;nchester 5r3vN;i3li1;ne0;c00u0H;a4eicesterYos angeles 3;clippe0dodFlaA; galaxy,ke0;ansas city 3nH;chiefs,ro3;ya0M; pace0polis colX;astr0Edynamo,rockeWtexa1;i4olden state warrio0reen bay pac3;ke0;anT;.c.Aallas 7e3i0Cod5;nver 5troit 3;lio1pisto1ti3;ge0;bronc06nuggeO;cowboUmav3;er3;ic06; uX;arCelNh8incinnati 6leveland 5ol3;orado r3umbus crew sc;api5ocki2;brow1cavalie0india1;benga03re3;ds;arlotte horCicago 3;b4cubs,fire,wh3;iteE;ea0ulY;di3olina panthe0;ff3naW; c3;ity;altimore ElAoston 7r3uffalo bilT;av2e5ooklyn 3;ne3;ts;we0;cel4red3; sox;tics;ackburn rove0u3;e ja3;ys;rs;ori3rave1;ol2;rizona Ast8tlanta 3;brav2falco1h4u3;nited;aw9;ns;es;on villa,r3;os;c5di3;amondbac3;ks;ardi3;na3;ls";

var _professions="aLbIcHdEengineKfCgBhAinstructRjournalNlawyKm9nurse,o8p5r3s1t0;echnEherapM;ailPcientLecretary,oldiIu0;pervMrgeon;e0oofG;ceptionIsearE;hotographElumbEoli1r0sychologH;actitionDesideMogrammD;cem8t7;fficBpeH;echanic,inistAus5;airdress9ousekeep9;arden8uard;arm7ire0;fight6m2;eputy,iet0;ici0;an;arpent2lerk;ricklay1ut0;ch0;er;ccoun6d2ge7r0ssis6ttenda7;chitect,t0;ist;minist1v0;is1;rat0;or;ta0;nt";

var _prepositions="'o,-,aLbIcHdGexcept,from,inFmidQnotwithstandiRoDpSqua,sCt7u4v2w0;/o,hereNith0;!in,oR;ersus,i0;a,s-a-vis;n1p0;!on;like,til;h1ill,o0;!wards;an,r0;ough0u;!oH;ans,ince,o that;',f0n1ut;!f;!to;espite,own,u3;hez,irca;ar1e0y;low,sides,tween;ri6;',bo7cross,ft6lo5m3propos,round,s1t0;!op;! long 0;as;id0ong0;!st;ng;er;ut";

var _orgWords="0:2Q;1:20;2:2I;a2Db24c1Ad11e0Uf0Tg0Qh0Kin0Djourn1l07mWnewsVoTpLquartet,rIs7t5u3worke1K;ni3tilG;on,vA;ele3im2Oribun1v;communica1Jgraph,vi1L;av0Hchool,eBo8t4ubcommitt1Ny3;ndic0Pstems;a3ockV;nda22te 3;poli2univ3;ersi27;ci3ns;al club,et3;e,y;cur3rvice0;iti2C;adio,e3;gionRs3;er19ourc29tauraX;artners9e7harmac6izza,lc,o4r3;ess,oduc13;l3st,wer;i2ytechnic;a0Jeutical0;ople's par1Ttrol3;!eum;!hip;bservLffi2il,ptic1r3;chestra,ganiza22;! servi2;a9e7i5o4use3;e,um;bi10tor0;lita1Bnist3;e08ry;dia,mori1rcantile3; exchange;ch1Ogazi5nage06r3;i4ket3;i0Cs;ne;ab6i5oc3;al 3;aIheaH;beration ar1Fmited;or3s;ato0Y;c,dustri1Gs6ter5vest3;me3o08;nt0;nation1sI;titut3u14;!e3;! of technoloIs;e5o3;ld3sp0Itel0;ings;a3ra6;lth a3;uth0T;a4ir09overnJroup,ui3;ld;s,zet0P;acul0Qede12inanci1m,ounda13und;duca12gli0Blectric8n5s4t3veningH;at;ta0L;er4semb01ter3;prise0tainB;gy;!i0J;a9e4i3rilliG;rectora0FviP;part3sign,velop6;e5ment3;! sto3s;re;ment;ily3ta; news;aSentQhNircus,lLo3rew;!ali0LffJlleHm9n4rp3unc7;o0Js;fe6s3taine9;e4ulti3;ng;il;de0Eren2;m5p3;any,rehensiAute3;rs;i5uni3;ca3ty;tions;s3tt6;si08;cti3ge;ve;ee;ini3ub;c,qK;emica4oir,ronic3urch;le;ls;er,r3;al bank,e;fe,is5p3re,thedr1;it1;al;se;an9o7r4u3;ilding socieEreau;ands,ewe4other3;hood,s;ry;a3ys;rd;k,q3;ue;dministIgencFirDrCss7ut3viaJ;h4ori3;te;ori3;ty;oc5u3;ran2;ce;!iat3;es,iB;my;craft,l3ways;in4;e0i3y;es;!s;ra3;ti3;on";

var _uncountables="0:1I;a1Nb1Hc18e11f0Ug0Qh0Ki0Hj0Gk0El09m00nZoYpSrPsCt8vi7w1;a5ea0Ci4o1;o2rld1;! seJ;d,l;ldlife,ne;rmth,t0;neg7ol0C;e3hund0ime,oothpaste,r1una;affTou1;ble,sers,t;a,nnis;aBceWeAh9il8now,o7p4te3u1;g1nshi0Q;ar;am,el;ace2e1;ciPed;!c16;ap,cc0ft0E;k,v0;eep,opp0T;riK;d0Afe0Jl1nd;m0Vt;aQe1i10;c1laxa0Hsearch;ogni0Grea0G;a5e3hys0JlastAo2r1;ess02ogre05;rk,w0;a1pp0trol;ce,nT;p0tiM;il,xygen;ews,oi0G;a7ea5i4o3u1;mps,s1;ic;nJo0C;lk,st;sl1t;es;chi1il,themat04;neF;aught0e3i2u1;ck,g0B;ghtn03quid,teratK;a1isJ;th0;elv1nowled08;in;ewel7usti09;ce,mp1nformaQtself;ati1ortan07;en06;a4ertz,isto3o1;ck1mework,n1spitaliL;ey;ry;ir,lib1ppi9;ut;o2r1um,ymnastL;a7ound;l1ssip;d,f;ahrenhe6i5lour,o2ru6urnit1;ure;od,rgive1wl;ne1;ss;c8sh;it;conomAduca6lectrici5n3quip4thAvery1;body,o1thC;ne;joy1tertain1;ment;ty;tiC;a8elcius,h4iv3loth6o1urrency;al,ffee,n1ttA;duct,fusi9;ics;aos,e1;e2w1;ing;se;ke,sh;a3eef,is2lood,read,utt0;er;on;g1ss;ga1;ge;dvi2irc1rt;raft;ce";

var _phrasals="0:71;1:6P;2:7D;3:73;4:6I;5:7G;6:75;7:6O;8:6B;9:6C;A:5H;B:70;C:6Z;a7Gb62c5Cd59e57f45g3Nh37iron0j33k2Yl2Km2Bn29o27p1Pr1Es09tQuOvacuum 1wGyammerCzD;eroAip EonD;e0k0;by,up;aJeGhFiEorDrit52;d 1k2Q;mp0n49pe0r8s8;eel Bip 7K;aEiD;gh 06rd0;n Br 3C;it 5Jk8lk6rm 0Qsh 73t66v4O;rgeCsD;e 9herA;aRePhNiJoHrFuDype 0N;ckArn D;d2in,o3Fup;ade YiDot0y 32;ckle67p 79;ne66p Ds4C;d2o6Kup;ck FdEe Dgh5Sme0p o0Dre0;aw3ba4d2in,up;e5Jy 1;by,o6U;ink Drow 5U;ba4ov7up;aDe 4Hll4N;m 1r W;ckCke Elk D;ov7u4N;aDba4d2in,o30up;ba4ft7p4Sw3;a0Gc0Fe09h05i02lYmXnWoVpSquare RtJuHwD;earFiD;ngEtch D;aw3ba4o6O; by;ck Dit 1m 1ss0;in,up;aIe0RiHoFrD;aigh1LiD;ke 5Xn2X;p Drm1O;by,in,o6A;r 1tc3H;c2Xmp0nd Dr6Gve6y 1;ba4d2up;d2o66up;ar2Uell0ill4TlErDurC;ingCuc8;a32it 3T;be4Brt0;ap 4Dow B;ash 4Yoke0;eep EiDow 9;c3Mp 1;in,oD;ff,v7;gn Eng2Yt Dz8;d2o5up;in,o5up;aFoDu4E;ot Dut0w 5W;aw3ba4f36o5Q;c2EdeAk4Rve6;e Hll0nd GtD; Dtl42;d2in,o5upD;!on;aw3ba4d2in,o1Xup;o5to;al4Kout0rap4K;il6v8;at0eKiJoGuD;b 4Dle0n Dstl8;aDba4d2in52o3Ft2Zu3D;c1Ww3;ot EuD;g2Jnd6;a1Wf2Qo5;ng 4Np6;aDel6inAnt0;c4Xd D;o2Su0C;aQePiOlMoKrHsyc29uD;ll Ft D;aDba4d2in,o1Gt33up;p38w3;ap37d2in,o5t31up;attleCess EiGoD;p 1;ah1Gon;iDp 52re3Lur44wer 52;nt0;ay3YuD;gAmp 9;ck 52g0leCn 9p3V;el 46ncilA;c3Oir 2Hn0ss FtEy D;ba4o4Q; d2c1X;aw3ba4o11;pDw3J;e3It B;arrow3Serd0oD;d6te3R;aJeHiGoEuD;ddl8ll36;c16p 1uth6ve D;al3Ad2in,o5up;ss0x 1;asur8lt 9ss D;a19up;ke Dn 9r2Zs1Kx0;do,o3Xup;aOeMiHoDuck0;a16c36g 0AoDse0;k Dse34;aft7ba4d2forw2Ain3Vov7uD;nd7p;e GghtFnEsDv1T;ten 4D;e 1k 1; 1e2Y;ar43d2;av1Ht 2YvelD; o3L;p 1sh DtchCugh6y1U;in3Lo5;eEick6nock D;d2o3H;eDyA;l2Hp D;aw3ba4d2fSin,o05to,up;aFoEuD;ic8mpA;ke2St2W;c31zz 1;aPeKiHoEuD;nker2Ts0U;lDneArse2O;d De 1;ba4d2oZup;de Et D;ba4on,up;aw3o5;aDlp0;d Fr Dt 1;fDof;rom;in,oO;cZm 1nDve it;d Dg 27kerF;d2in,o5;aReLive Jloss1VoFrEunD; f0M;in39ow 23; Dof 0U;aEb17it,oDr35t0Ou12;ff,n,v7;bo5ft7hJw3;aw3ba4d2in,oDup,w3;ff,n,ut;a17ek0t D;aEb11d2oDr2Zup;ff,n,ut,v7;cEhDl1Pr2Xt,w3;ead;ross;d aEnD;g 1;bo5;a08e01iRlNoJrFuD;cDel 1;k 1;eEighten DownCy 1;aw3o2L;eDshe1G; 1z8;lFol D;aDwi19;bo5r2I;d 9;aEeDip0;sh0;g 9ke0mDrD;e 2K;gLlJnHrFsEzzD;le0;h 2H;e Dm 1;aw3ba4up;d0isD;h 1;e Dl 11;aw3fI;ht ba4ure0;eInEsD;s 1;cFd D;fDo1X;or;e B;dQl 1;cHll Drm0t0O;apYbFd2in,oEtD;hrough;ff,ut,v7;a4ehi1S;e E;at0dge0nd Dy8;o1Mup;o09rD;ess 9op D;aw3bNin,o15;aShPlean 9oDross But 0T;me FoEuntD; o1M;k 1l6;aJbIforGin,oFtEuD;nd7;ogeth7;ut,v7;th,wD;ard;a4y;pDr19w3;art;eDipA;ck BeD;r 1;lJncel0rGsFtch EveA; in;o16up;h Bt6;ry EvD;e V;aw3o12;l Dm02;aDba4d2o10up;r0Vw3;a0He08l01oSrHuD;bbleFcklTilZlEndlTrn 05tDy 10zz6;t B;k 9; ov7;anMeaKiDush6;ghHng D;aEba4d2forDin,o5up;th;bo5lDr0Lw3;ong;teD;n 1;k D;d2in,o5up;ch0;arKgJil 9n8oGssFttlEunce Dx B;aw3ba4;e 9; ar0B;k Bt 1;e 1;d2up; d2;d 1;aIeed0oDurt0;cFw D;aw3ba4d2o5up;ck;k D;in,oK;ck0nk0st6; oJaGef 1nd D;d2ov7up;er;up;r0t D;d2in,oDup;ff,ut;ff,nD;to;ck Jil0nFrgEsD;h B;ainCe B;g BkC; on;in,o5; o5;aw3d2o5up;ay;cMdIsk Fuction6; oD;ff;arDo5;ouD;nd;d D;d2oDup;ff,n;own;t D;o5up;ut";

//to change these packed files, edit ./data then run `node scripts/pack.js`

// const unpack = require('/home/spencer/nlp/efrt/src/unpack');
const tags = {
  Adjective: _adjectives,
  Adverb: _adverbs,
  Place: _airports,
  City: _cities,
  Country: _countries,
  Demonym: _demonyms,
  Expression: _expressions,
  FemaleName: _female,
  FirstName: _firstnames,
  Holiday: _holidays,
  LastName: _lastnames,
  MaleName: _male,
  Noun: _nouns,
  Organization: _organizations,
  SportsTeam: _sportsTeams,
  Actor: _professions,
  Preposition: _prepositions,
};

const utils = {
  orgWords: _orgWords,
  uncountable: _uncountables,
  phrasals: _phrasals,
};

// console.time('trie-unpack');
//turn these compressed strings into queryable tries (using `nlp-compromise/efrt` library)
const keys$3 = Object.keys(tags);
keys$3.forEach((tag) => {
  tags[tag] = efrtUnpack(tags[tag]);
  tags[tag].cache();
});
Object.keys(utils).forEach((k) => {
  utils[k] = efrtUnpack(utils[k]);
  utils[k].cache();
});
// console.timeEnd('trie-unpack');

const lookup = function(str) {
  //other ones
  if (utils.uncountable.has(str)) {
    return 'Noun';
  }
  if (utils.orgWords.has(str)) {
    return 'Noun';
  }
  for(let i = 0; i < keys$3.length; i++) {
    if (tags[keys$3[i]].has(str)) {
      return keys$3[i];
    }
  }
  return null;
};

//find all multi-word terms
const multiples = function() {
  let all = {};
  [
    'Adverb',
    'City',
    'Country',
    'Expression',
    'Holiday',
    'Noun',
    'Organization',
    'SportsTeam',
  ].forEach((k) => {
    let obj = tags[k]._cache;
    const words = Object.keys(obj);
    for(let i = 0; i < words.length; i++) {
      if (words[i].match(' ')) {
        all[words[i]] = k;
      }
    }
  });
  return all;
};

var index$16 = {
  lookup: lookup,
  utils: utils,
  multiples: multiples,
};

var paths = {
  fns: fns$1,
  lexicon: lexicon_1,
  tries: index$16,
  data: index$10,
  Terms: index$4,
};

const contraction = /^([a-z]+)'([a-z][a-z]?)$/i;
const possessive = /[a-z]s'$/i;

const allowed = {
  're': 1,
  've': 1,
  'll': 1,
  't': 1,
  's': 1,
  'd': 1,
  'm': 1
};
/** interpret a terms' contraction */
const splitContraction = (t) => {
  let parts = t.text.match(contraction);
  if (parts && parts[1] && allowed[parts[2]] === 1) {
    //handle n't
    if (parts[2] === 't' && parts[1].match(/[a-z]n$/)) {
      parts[1] = parts[1].replace(/n$/, '');
      parts[2] = 'n\'t'; //dunno..
    }
    //fix titlecase
    if (t.tags.TitleCase === true) {
      parts[1] = parts[1].replace(/^[a-z]/, (x) => x.toUpperCase());
    }
    return {
      start: parts[1],
      end: parts[2]
    };
  }
  // "flanders' house"
  if (possessive.test(t.text) === true) {
    return {
      start: t.normal.replace(/s'?$/, ''),
      end: ''
    };
  }
  return null;
};
var split = splitContraction;

const lexicon = paths.lexicon;

const check_lexicon = (str, sentence) => {
  //check a user's custom lexicon
  let custom = sentence.lexicon || {};
  if (custom[str]) {
    return custom[str];
  }
  if (lexicon[str]) {
    return lexicon[str];
  }
  let tag = index$16.lookup(str);
  if (tag) {
    return tag;
  }
  return null;
};

const lexicon_pass = function (ts) {
  let found;
  //loop through each term
  for (let i = 0; i < ts.terms.length; i++) {
    let t = ts.terms[i];
    //basic term lookup
    found = check_lexicon(t.normal, ts);
    if (found) {
      t.tag(found, 'lexicon-match');
      continue;
    }
    found = check_lexicon(t.text, ts);
    if (found) {
      t.tag(found, 'lexicon-match-text');
      continue;
    }
    //support contractions (manually)
    let parts = split(t);
    if (parts && parts.start) {
      found = check_lexicon(parts.start.toLowerCase(), ts);
      if (found) {
        t.tag(found, 'contraction-lexicon');
        continue;
      }
    }
    //support silent_term matches
    found = check_lexicon(t.silent_term, ts);
    if (t.silent_term && found) {
      t.tag(found, 'silent_term-lexicon');
      continue;
    }
    //multiple-words / hyphenation
    let words = t.normal.split(/[ -]/);
    if (words.length > 1) {
      found = check_lexicon(words[words.length - 1], ts);
      if (found) {
        t.tag(found, 'multiword-lexicon');
        continue;
      }
    }
  }
  return ts;
};

var _02Lexicon_step = lexicon_pass;

//titlecase is a signal for a noun

const capital_logic = function (s) {
  //(ignore first word)
  for (let i = 1; i < s.terms.length; i++) {
    let t = s.terms[i];
    //has a capital, but isn't too weird.
    if (t.tags.TitleCase && t.isWord()) {
      t.tag('Noun', 'capital-step');
      t.tag('TitleCase', 'capital-step');
    }
  }
  //support first-word of sentence as proper titlecase
  let t = s.terms[0];
  if (t && t.tags.TitleCase) {
    if (t.tags.Person || t.tags.Organization || t.tags.Place) {
      t.tag('TitleCase', 'first-term-capital');
    }
  }
  return s;
};

var _03Capital_step = capital_logic;

//identify urls, hashtags, @mentions, emails
//regs
const email = /^\w+@\w+\.[a-z]{2,3}$/; //not fancy
const hashTag = /^#[a-z0-9_]{2,}$/;
const atMention = /^@\w{2,}$/;
const urlA = /^(https?:\/\/|www\.)\w+\.[a-z]{2,3}/; //with http/www
const urlB = /^[\w\.\/]+\.(com|net|gov|org|ly|edu|info|biz|ru|jp|de|in|uk|br)/; //http://mostpopularwebsites.net/top-level-domain

const web_pass = function(terms) {
  for (let i = 0; i < terms.length; i++) {
    let t = terms.get(i);
    let str = t.text.trim().toLowerCase();
    if (email.test(str) === true) {
      t.tag('Email', 'web_pass');
    }
    if (hashTag.test(str) === true) {
      t.tag('HashTag', 'web_pass');
    }
    if (atMention.test(str) === true) {
      t.tag('AtMention', 'web_pass');
    }
    if (urlA.test(str) === true || urlB.test(str) === true) {
      t.tag('Url', 'web_pass');
    }
  }
  return terms;
};

var _04Web_step = web_pass;

//regex suffix patterns and their most common parts of speech,
//built using wordnet, by spencer kelly.
//this mapping shrinks-down the uglified build
const Adj = 'Adjective';
const Inf = 'Infinitive';
const Pres = 'PresentTense';
const Sing = 'Singular';
const Past = 'PastTense';
const Adverb = 'Adverb';
const Exp = 'Expression';
const Actor = 'Actor';
const Verb = 'Verb';
const Noun = 'Noun';
const Last = 'LastName';
//the order here matters.

//regexes indexed by mandated last-character
var regex_list = {
  a: [
    [/.[aeiou]na$/, Noun],
    [/.[oau][wvl]ska$/, Last], //polish (female)
    [/.[^aeiou]ica$/, Sing],
    [/^([hyj]a)+$/, Exp], //hahah
  ],
  c: [
    [/.[^aeiou]ic$/, Adj],
  ],
  d: [
    [/.[ia]sed$/, Adj],
    [/.[gt]led$/, Adj],
    [/.[aeiou][td]ed$/, Past],
    [/[^aeiou]ard$/, Sing],
    [/[aeiou][^aeiou]id$/, Adj],
    [/[aeiou]c?ked$/, Past], //hooked
    [/.[vrl]id$/, Adj],
  ],
  e: [
    [/.[lnr]ize$/, Inf],
    [/.[^aeiou]ise$/, Inf],
    [/.[aeiou]te$/, Inf],
    [/.[^aeiou][ai]ble$/, Adj],
    [/.[^aeiou]eable$/, Adj],
    [/.[^aeiou]ive$/, Adj],
  ],
  h: [
    [/[0-9](st|nd|rd|r?th)$/, 'Ordinal'], //like 5th
    [/.[^aeiouf]ish$/, Adj],
    [/.v[iy]ch$/, Last], //east-europe
    [/^ug?h+$/, Exp], //uhh
    [/^uh[ -]?oh$/, Exp], //uhoh
  ],
  i: [
    [/.[oau][wvl]ski$/, Last], //polish (male)
  ],
  k: [
    [/^(k)+$/, Exp], //kkkk
  ],
  l: [
    [/.[nrtumcd]al$/, Adj],
    [/.[^aeiou]ial$/, Adj],
    [/.[^aeiou]eal$/, Adj],
    [/.[^aeiou][ei]al$/, Adj],
    [/.[^aeiou]ful$/, Adj],
  ],
  m: [
    [/.[^aeiou]ium$/, Sing],
    [/[^aeiou]ism$/, Sing],
    [/.[^aeiou]ium$/, Sing],
    [/^mmm+$/, Exp], //mmmm
    [/^[hu]m+$/, Exp], //ummmm
    [/^[0-9]+ ?(am|pm)$/, 'Date'],
  ],
  n: [
    [/.[lsrnpb]ian$/, Adj],
    [/[^aeiou]ician$/, Actor],
  ],
  o: [
    [/^no+$/, Exp], //noooo
    [/^(yo)+$/, Exp], //yoyo
    [/^woo+[pt]?$/, Exp], //woo
  ],
  r: [
    [/.[ilk]er$/, 'Comparative'],
    [/[aeiou][pns]er$/, Sing],
    [/[^i]fer$/, Inf],
    [/.[^aeiou][ao]pher$/, Actor]
  ],
  t: [
    [/.[di]est$/, 'Superlative'],
    [/.[icldtgrv]ent$/, Adj],
    [/[aeiou].*ist$/, Adj],
    [/^[a-z]et$/, Verb],
  ],
  s: [
    [/.[rln]ates$/, Pres],
    [/.[^z]ens$/, Verb],
    [/.[lstrn]us$/, Sing],
    [/[aeiou][^aeiou]is$/, Sing],
    [/[a-z]\'s$/, Noun],
    [/^yes+$/, Exp], //yessss
  ],
  v: [
    [/.[^aeiou][ai][kln]ov$/, Last], //east-europe
  ],
  y: [
    [/.[cts]hy$/, Adj],
    [/.[st]ty$/, Adj],
    [/.[gk]y$/, Adj],
    [/.[tnl]ary$/, Adj],
    [/.[oe]ry$/, Sing],
    [/[rdntkbhs]ly$/, Adverb],
    [/[bszmp]{2}y$/, Adj],
    [/.(gg|bb|zz)ly$/, Adj],
    [/.[aeiou]my$/, Adj],
    [/.[^aeiou]ity$/, Sing],
    [/[ea]{2}zy$/, Adj],
    [/.[^aeiou]ity$/, Sing],
  ],
};

//just a foolish lookup of known suffixes
const Adj$1 = 'Adjective';
const Inf$1 = 'Infinitive';
const Pres$1 = 'PresentTense';
const Sing$1 = 'Singular';
const Past$1 = 'PastTense';
const AdVb = 'AdVerb';
const Plrl = 'Plural';
const Actor$1 = 'Actor';
const Vb = 'Verb';
const Noun$1 = 'Noun';
const Last$1 = 'LastName';
const Modal = 'Modal';

var suffix_lookup = [
  null, //0
  null, //1
  { //2-letter
    'ea': Sing$1,
    'ia': Noun$1,
    'ic': Adj$1,
    '\'n': Vb,
    '\'t': Vb,
  },
  { //3-letter
    'que': Adj$1,
    'lar': Adj$1,
    'ike': Adj$1,
    'ffy': Adj$1,
    'rmy': Adj$1,
    'azy': Adj$1,
    'oid': Adj$1,
    'mum': Adj$1,
    'ean': Adj$1,
    'ous': Adj$1,
    'end': Vb,
    'sis': Sing$1,
    'rol': Sing$1,
    'ize': Inf$1,
    'ify': Inf$1,
    'zes': Pres$1,
    'nes': Pres$1,
    'ing': 'Gerund', //likely to be converted to Adj after lexicon pass
    ' so': AdVb,
    '\'ll': Modal,
    '\'re': 'Copula',
  },
  { //4-letter
    'teen': 'Value',
    'tors': Noun$1,
    'ends': Vb,
    'oses': Pres$1,
    'fies': Pres$1,
    'ects': Pres$1,
    'cede': Inf$1,
    'tage': Inf$1,
    'gate': Inf$1,
    'vice': Sing$1,
    'tion': Sing$1,
    'ette': Sing$1,
    'some': Adj$1,
    'llen': Adj$1,
    'ried': Adj$1,
    'gone': Adj$1,
    'made': Adj$1,
    'fore': AdVb,
    'less': AdVb,
    'ices': Plrl,
    'ions': Plrl,
    'ints': Plrl,
    'aped': Past$1,
    'lked': Past$1,
    'ould': Modal,
    'tive': Actor$1,
    'sson': Last$1, //swedish male
    'czyk': Last$1, //polish (male)
    'chuk': Last$1, //east-europe
    'enko': Last$1, //east-europe
    'akis': Last$1, //greek
    'nsen': Last$1, //norway
  },
  { //5-letter
    'fully': AdVb,
    'where': AdVb,
    'wards': AdVb,
    'urned': Past$1,
    'tized': Past$1,
    'ances': Plrl,
    'tures': Plrl,
    'ports': Plrl,
    'ettes': Plrl,
    'ities': Plrl,
    'rough': Adj$1,
    'bound': Adj$1,
    'tieth': 'Ordinal',
    'ishes': Pres$1,
    'tches': Pres$1,
    'nssen': Last$1, //norway
    'marek': Last$1, //polish (male)
  },
  { //6-letter
    'keeper': Actor$1,
    'logist': Actor$1,
    'auskas': Last$1, //lithuania
    'teenth': 'Value',
  },
  { //7-letter
    'sdottir': Last$1, //swedish female
    'opoulos': Last$1, //greek
  }
];

const misc$6 = [
  //slang things
  [/^(lol)+[sz]$/, 'Expression'], //lol
  [/^ma?cd[aeiou]/, 'LastName'], //macdonell - Last patterns https://en.wikipedia.org/wiki/List_of_family_name_affixes
  //starting-ones
  [/^[0-9,\.]+$/, 'Cardinal'], //like 5
  [/^(un|de|re)\\-[a-z]../, 'Verb'],
  [/^[\-\+]?[0-9]+(\.[0-9]+)?$/, 'NumericValue'],
  [/^https?\:?\/\/[a-z0-9]/, 'Url'], //the colon is removed in normalisation
  [/^www\.[a-z0-9]/, 'Url'],
  //ending-ones
  [/([0-9])([a-z]{1,2})$/, 'Cardinal'], //like 5kg
  [/(over|under)[a-z]{2,}$/, 'Adjective'],
  //middle (anywhere)
  [/[a-z]*\\-[a-z]*\\-/, 'Adjective'],
];

//straight-up lookup of known-suffixes
const lookup$1 = function(t) {
  const len = t.normal.length;
  let max = 7;
  if (len <= max) {
    max = len - 1;
  }
  for(let i = max; i > 1; i -= 1) {
    let str = t.normal.substr(len - i, len);
    if (suffix_lookup[i][str] !== undefined) {
      return suffix_lookup[i][str];
    }
  }
  return null;
};

//word-regexes indexed by last-character
const regexFn = function(t) {
  let char = t.normal.charAt(t.normal.length - 1);
  if (regex_list[char] === undefined) {
    return null;
  }
  let arr = regex_list[char];
  for(let o = 0; o < arr.length; o++) {
    if (arr[o][0].test(t.normal) === true) {
      return arr[o][1];
    }
  }
  return null;
};

const suffix_step = function(ts) {
  for(let i = 0; i < ts.terms.length; i++) {
    let t = ts.terms[i];
    //try known suffixes
    let tag = lookup$1(t);
    if (tag !== null && t.canBe(tag) === true) {
      t.tag(tag, 'suffix-lookup');
      continue;
    }
    //apply regexes by final-char
    tag = regexFn(t);
    if (tag !== null && t.canBe(tag) === true) {
      t.tag(tag, 'regex-list');
      continue;
    }
    //apply misc regexes
    for(let o = 0; o < misc$6.length; o++) {
      if (misc$6[o][0].test(t.normal) === true) {
        tag = misc$6[o][1];
        if (t.canBe(tag) === true) {
          t.tag(tag, 'misc-regex');
          continue;
        }
      }
    }
  }
  return ts;
};

var _05Suffix_step = suffix_step;

//markov-like stats about co-occurance, for hints about unknown terms
//basically, a little-bit better than the noun-fallback
//just top n-grams from nlp tags, generated from nlp-corpus

//after this word, here's what happens usually
let afterThisWord$1 = {
  i: 'Verb', //44% //i walk..
  first: 'Noun', //50% //first principles..
  it: 'Verb', //33%
  there: 'Verb', //35%
  // to: 'Verb', //32%
  not: 'Verb', //33%
  because: 'Noun', //31%
  if: 'Noun', //32%
  but: 'Noun', //26%
  who: 'Verb', //40%
  this: 'Noun', //37%
  his: 'Noun', //48%
  when: 'Noun', //33%
  you: 'Verb', //35%
  very: 'Adjective', // 39%
  old: 'Noun', //51%
  never: 'Verb', //42%
  before: 'Noun', //28%
};

//in advance of this word, this is what happens usually
let beforeThisWord$1 = {
  there: 'Verb', //23% // be there
  me: 'Verb', //31% //see me
  man: 'Adjective', // 80% //quiet man
  only: 'Verb', //27% //sees only
  him: 'Verb', //32% //show him
  were: 'Noun', //48% //we were
  what: 'Verb', //25% //know what
  took: 'Noun', //38% //he took
  himself: 'Verb', //31% //see himself
  went: 'Noun', //43% //he went
  who: 'Noun', //47% //person who
  jr: 'Person'
};

//following this POS, this is likely
let afterThisPos$1 = {
  Adjective: 'Noun', //36% //blue dress
  Possessive: 'Noun', //41% //his song
  Determiner: 'Noun', //47%
  Adverb: 'Verb', //20%
  // Person: 'Verb', //40%
  Pronoun: 'Verb', //40%
  Value: 'Noun', //47%
  Ordinal: 'Noun', //53%
  Modal: 'Verb', //35%
  Superlative: 'Noun', //43%
  Demonym: 'Noun', //38%
  Organization: 'Verb', //33%
  Honorific: 'Person', //
// FirstName: 'Person', //
};

//in advance of this POS, this is likely
let beforeThisPos$1 = {
  Copula: 'Noun', //44% //spencer is
  PastTense: 'Noun', //33% //spencer walked
  Conjunction: 'Noun', //36%
  Modal: 'Noun', //38%
  PluperfectTense: 'Noun', //40%
  PerfectTense: 'Verb', //32%
// LastName: 'FirstName', //
};
var neighbours = {
  beforeThisWord: beforeThisWord$1,
  afterThisWord: afterThisWord$1,

  beforeThisPos: beforeThisPos$1,
  afterThisPos: afterThisPos$1
};

const afterThisWord = neighbours.afterThisWord;
const beforeThisWord = neighbours.beforeThisWord;
const beforeThisPos = neighbours.beforeThisPos;
const afterThisPos = neighbours.afterThisPos;

//basically a last-ditch effort before everything falls back to a noun
//for unknown terms, look left + right first, and hit-up the markov-chain for clues
const neighbour_step = function (ts) {
  ts.terms.forEach((t, n) => {
    //is it still unknown?
    let termTags = Object.keys(t.tags);
    if (termTags.length === 0) {
      let lastTerm = ts.terms[n - 1];
      let nextTerm = ts.terms[n + 1];
      //look at last word for clues
      if (lastTerm && afterThisWord[lastTerm.normal]) {
        t.tag(afterThisWord[lastTerm.normal], 'neighbour-after-"' + lastTerm.normal + '"');
        return;
      }
      //look at next word for clues
      if (nextTerm && beforeThisWord[nextTerm.normal]) {
        t.tag(beforeThisWord[nextTerm.normal], 'neighbour-before-"' + nextTerm.normal + '"');
        return;
      }
      //look at the last POS for clues
      let tags = [];
      if (lastTerm) {
        tags = Object.keys(lastTerm.tags);
        for (let i = 0; i < tags.length; i++) {
          if (afterThisPos[tags[i]]) {
            t.tag(afterThisPos[tags[i]], 'neighbour-after-[' + tags[i] + ']');
            return;
          }
        }
      }
      //look at the next POS for clues
      if (nextTerm) {
        tags = Object.keys(nextTerm.tags);
        for (let i = 0; i < tags.length; i++) {
          if (beforeThisPos[tags[i]]) {
            t.tag(beforeThisPos[tags[i]], 'neighbour-before-[' + tags[i] + ']');
            return;
          }
        }
      }
    }
  });

  return ts;
};

var _06Neighbour_step = neighbour_step;

//tag word as noun if we know nothing about it, still.

//tags that dont really count
const nothing = {
  TitleCase: true,
  UpperCase: true,
  CamelCase: true
};
//are the tags basically empty
const gotNothing = function(t) {
  //fail-fast
  if (t.tags.Noun || t.tags.Verb || t.tags.Adjective) {
    return false;
  }
  let tags = Object.keys(t.tags);
  if (tags.length === 0) {
    return true;
  }
  if (tags.filter(tag => !nothing[tag]).length === 0) {
    return true;
  }
  return false;
};

const noun_fallback = function(s) {
  for (let i = 0; i < s.terms.length; i++) {
    let t = s.terms[i];
    //fail-fast
    if (t.tags.Noun || t.tags.Verb) {
      continue;
    }
    //ensure it only has the tag 'Term'
    if (gotNothing(t)) {
      //ensure it's atleast word-looking
      if (t.isWord() === false) {
        continue;
      }
      t.tag('Noun', 'noun-fallback');
    }
  }
  return s;
};

var _07Noun_fallback = noun_fallback;

//ambiguous 'may' and 'march'
const maybeMonth = '(may|march|jan|april|sep)';
const preps = '(in|by|before|for|during|on|until|after|of|within)';
const thisNext = '(last|next|this|previous|current|upcoming|coming)';
const sections = '(start|end|middle|starting|ending|midpoint|beginning)';
const seasons = '(spring|summer|winter|fall|autumn)';

//ensure a year is approximately typical for common years
//please change in one thousand years
const tagYear = (v, reason) => {
  v.list.forEach((ts) => {
    let num = parseInt(ts.terms[0].normal, 10);
    if (num && num > 1000 && num < 3000) {
      ts.terms[0].tag('Year', reason);
    }
  });
};
//same, but for less-confident values
const tagYearSafer = (v, reason) => {
  v.list.forEach((ts) => {
    let num = parseInt(ts.terms[0].normal, 10);
    if (num && num > 1990 && num < 2030) {
      ts.terms[0].tag('Year', reason);
    }
  });
};

//non-destructively tag values & prepositions as dates
const datePass = function (ts) {
  //ambiguous-months
  if (ts.has(maybeMonth)) {
    ts.match(`${maybeMonth} (#Determiner|#Value|#Date)`).term(0).tag('Month', 'correction-may');
    ts.match(`#Date ${maybeMonth}`).term(1).tag('Month', 'correction-may');
    ts.match(`${preps} ${maybeMonth}`).term(1).tag('Month', 'correction-may');
    ts.match(`(next|this|last) ${maybeMonth}`).term(1).tag('Month', 'correction-may'); //maybe not 'this'
  }
  //months:
  if (ts.has('#Month')) {
    //June 5-7th
    ts.match(`#Month #DateRange+`).tag('Date', 'correction-numberRange');
    //5th of March
    ts.match('#Value of? #Month').tag('Date', 'value-of-month');
    //5 March
    ts.match('#Cardinal #Month').tag('Date', 'cardinal-month');
    //march 5 to 7
    ts.match('#Month #Value to #Value').tag('Date', 'value-to-value');
    //march 12th 2018
    ts.match('#Month #Value #Cardinal').tag('Date', 'month-value-cardinal');
  }

  ts.match('in the (night|evening|morning|afternoon|day|daytime)').tag('Time', 'in-the-night');
  ts.match('(#Value|#Time) (am|pm)').tag('Time', 'value-ampm');

  //months:
  if (ts.has('#Value')) {
    //values
    ts.match('#Value #Abbreviation').tag('Value', 'value-abbr');
    ts.match('a #Value').tag('Value', 'a-value');
    ts.match('(minus|negative) #Value').tag('Value', 'minus-value');
    ts.match('#Value grand').tag('Value', 'value-grand');
    // ts.match('#Ordinal (half|quarter)').tag('Value', 'ordinal-half');//not ready
    ts.match('(half|quarter) #Ordinal').tag('Value', 'half-ordinal');
    ts.match('(hundred|thousand|million|billion|trillion) and #Value').tag('Value', 'magnitude-and-value');
    ts.match('#Value point #Value').tag('Value', 'value-point-value');
    //for four days
    ts.match(`${preps}? #Value #Duration`).tag('Date', 'value-duration');
    ts.match('#Date #Value').tag('Date', 'date-value');
    ts.match('#Value #Date').tag('Date', 'value-date');
    //two days before
    ts.match('#Value #Duration #Conjunction').tag('Date', 'val-duration-conjunction');
  }

  //time:
  if (ts.has('#Time')) {
    ts.match('#Cardinal #Time').tag('Time', 'value-time');
    ts.match('(by|before|after|at|@|about) #Time').tag('Time', 'preposition-time');
    //2pm est
    ts.match('#Time (eastern|pacific|central|mountain)').term(1).tag('Time', 'timezone');
    ts.match('#Time (est|pst|gmt)').term(1).tag('Time', 'timezone abbr');
  }

  //seasons
  if (ts.has(seasons)) {
    ts.match(`${preps}? ${thisNext} ${seasons}`).tag('Date', 'thisNext-season');
    ts.match(`the? ${sections} of ${seasons}`).tag('Date', 'section-season');
  }

  //rest-dates
  if (ts.has('#Date')) {
    //june the 5th
    ts.match('#Date the? #Ordinal').tag('Date', 'correction-date');
    //last month
    ts.match(`${thisNext} #Date`).tag('Date', 'thisNext-date');
    //by 5 March
    ts.match('due? (by|before|after|until) #Date').tag('Date', 'by-date');
    //tomorrow before 3
    ts.match('#Date (by|before|after|at|@|about) #Cardinal').not('^#Date').tag('Time', 'date-before-Cardinal');
    //saturday am
    ts.match('#Date (am|pm)').term(1).unTag('Verb').unTag('Copula').tag('Time', 'date-am');
    ts.match('(last|next|this|previous|current|upcoming|coming|the) #Date').tag('Date', 'next-feb');
    ts.match('#Date #Preposition #Date').tag('Date', 'date-prep-date');
    //start of june
    ts.match(`the? ${sections} of #Date`).tag('Date', 'section-of-date');
    //fifth week in 1998
    ts.match('#Ordinal #Duration in #Date').tag('Date', 'duration-in-date');
    //early in june
    ts.match('(early|late) (at|in)? the? #Date').tag('Time', 'early-evening');
  }

  //year/cardinal tagging
  if (ts.has('#Cardinal')) {
    let v = ts.match(`#Date #Value #Cardinal`).lastTerm();
    if (v.found) {
      tagYear(v, 'date-value-year');
    }
    //scoops up a bunch
    v = ts.match(`#Date+ #Cardinal`).lastTerm();
    if (v.found) {
      tagYear(v, 'date-year');
    }
    //feb 8 2018
    v = ts.match(`#Month #Value #Cardinal`).lastTerm();
    if (v.found) {
      tagYear(v, 'month-value-year');
    }
    //feb 8 to 10th 2018
    v = ts.match(`#Month #Value to #Value #Cardinal`).lastTerm();
    if (v.found) {
      tagYear(v, 'month-range-year');
    }
    //in 1998
    v = ts.match(`(in|of|by|during|before|starting|ending|for|year) #Cardinal`).lastTerm();
    if (v.found) {
      tagYear(v, 'in-year');
    }
    //was 1998 and...
    v = ts.match(`#Cardinal !#Plural`).firstTerm();
    if (v.found) {
      tagYearSafer(v, 'year-unsafe');
    }
  }

  return ts;
};

var _08Date_step = datePass;

//

const Auxiliary = {
  'do': true,
  'don\'t': true,
  'does': true,
  'doesn\'t': true,
  'will': true,
  'wont': true,
  'won\'t': true,
  'have': true,
  'haven\'t': true,
  'had': true,
  'hadn\'t': true,
  'not': true,
};

const corrections = function(ts) {
  //set verbs as auxillaries
  for(let i = 0; i < ts.terms.length; i++) {
    let t = ts.terms[i];
    if (Auxiliary[t.normal] || Auxiliary[t.silent_term]) {
      let next = ts.terms[i + 1];
      //if next word is a verb
      if (next && (next.tags.Verb || next.tags.Adverb || next.tags.Negative)) {
        t.tag('Auxiliary', 'corrections-Auxiliary');
        continue;
      }
    }
  }
  return ts;
};

var _09Auxiliary_step = corrections;

// 'not' is sometimes a verb, sometimes an adjective
const negation_step = function(ts) {
  for(let i = 0; i < ts.length; i++) {
    let t = ts.get(i);
    if (t.normal === 'not' || t.silent_term === 'not') {
      //find the next verb/adjective
      for(let o = i + 1; o < ts.length; o++) {
        if (ts.get(o).tags.Verb) {
          t.tag('VerbPhrase', 'negate-verb');
          break;
        }
        if (ts.get(o).tags.Adjective) {
          t.tag('AdjectivePhrase', 'negate-adj');
          break;
        }
      }
    }
  }
  return ts;
};

var _10Negation_step = negation_step;

//rules for turning a verb into infinitive form
let rules$5 = {
  Participle: [
    {
      reg: /own$/i,
      to: 'ow'
    },
    {
      reg: /(.)un([g|k])$/i,
      to: '$1in$2'
    }
  ],
  Actor: [
    {
      reg: /(er)er$/i,
      to: '$1'
    }
  ],
  PresentTense: [
    {
      reg: /(ies)$/i,
      to: 'y'
    }, {
      reg: /(tch|sh)es$/i,
      to: '$1'
    }, {
      reg: /(ss|zz)es$/i,
      to: '$1'
    }, {
      reg: /([tzlshicgrvdnkmu])es$/i,
      to: '$1e'
    }, {
      reg: /(n[dtk]|c[kt]|[eo]n|i[nl]|er|a[ytrl])s$/i,
      to: '$1'
    }, {
      reg: /(ow)s$/i,
      to: '$1'
    }, {
      reg: /(op)s$/i,
      to: '$1'
    }, {
      reg: /([eirs])ts$/i,
      to: '$1t'
    }, {
      reg: /(ll)s$/i,
      to: '$1'
    }, {
      reg: /(el)s$/i,
      to: '$1'
    }, {
      reg: /(ip)es$/i,
      to: '$1e'
    }, {
      reg: /ss$/i,
      to: 'ss'
    }, {
      reg: /s$/i,
      to: ''
    }],
  Gerund: [
    {
      reg: /pping$/i,
      to: 'p'
    }, {
      reg: /lling$/i,
      to: 'll'
    }, {
      reg: /tting$/i,
      to: 't'
    }, {
      reg: /ssing$/i,
      to: 'ss'
    }, {
      reg: /gging$/i,
      to: 'g'
    }, {
      reg: /([^aeiou])ying$/i,
      to: '$1y'
    }, {
      reg: /([^ae]i.)ing$/i,
      to: '$1e'
    }, {
      reg: /(ea.)ing$/i,
      to: '$1'
    }, {
      reg: /(u[rtcb]|[bdtpkg]l|n[cg]|a[gdkvtc]|[ua]s|[dr]g|yz|o[rlsp]|cre)ing$/i,
      to: '$1e'
    }, {
      reg: /(ch|sh)ing$/i,
      to: '$1'
    }, {
      reg: /(..)ing$/i,
      to: '$1'
    }],
  PastTense: [
    {
      reg: /(ued)$/i,
      to: 'ue'
    }, {
      reg: /([aeiou]zz)ed$/i,
      to: '$1'
    }, {
      reg: /(e|i)lled$/i,
      to: '$1ll'
    }, {
      reg: /(sh|ch)ed$/i,
      to: '$1'
    }, {
      reg: /(tl|gl)ed$/i,
      to: '$1e'
    }, {
      reg: /(um?pt?)ed$/i,
      to: '$1'
    }, {
      reg: /(ss)ed$/i,
      to: '$1'
    }, {
      reg: /pped$/i,
      to: 'p'
    }, {
      reg: /tted$/i,
      to: 't'
    }, {
      reg: /gged$/i,
      to: 'g'
    }, {
      reg: /(h|ion|n[dt]|ai.|[cs]t|pp|all|ss|tt|int|ail|ld|en|oo.|er|k|pp|w|ou.|rt|ght|rm)ed$/i,
      to: '$1'
    }, {
      reg: /(.ut)ed$/i,
      to: '$1e'
    }, {
      reg: /(us)ed$/i,
      to: '$1e'
    }, {
      reg: /(..[^aeiouy])ed$/i,
      to: '$1e'
    }, {
      reg: /ied$/i,
      to: 'y'
    }, {
      reg: /(.o)ed$/i,
      to: '$1o'
    }, {
      reg: /(.i)ed$/i,
      to: '$1'
    }, {
      reg: /(a[^aeiou])ed$/i,
      to: '$1'
    }, {
      reg: /([rl])ew$/i,
      to: '$1ow'
    }, {
      reg: /([pl])t$/i,
      to: '$1t'
    }]
};
var rules_1 = rules$5;

//suffix signals for verb tense, generated from test data
const compact$2 = {
  'Gerund': [
    'ing'
  ],
  'Actor': [
    'erer'
  ],
  'Infinitive': [
    'ate',
    'ize',
    'tion',
    'rify',
    'then',
    'ress',
    'ify',
    'age',
    'nce',
    'ect',
    'ise',
    'ine',
    'ish',
    'ace',
    'ash',
    'ure',
    'tch',
    'end',
    'ack',
    'and',
    'ute',
    'ade',
    'ock',
    'ite',
    'ase',
    'ose',
    'use',
    'ive',
    'int',
    'nge',
    'lay',
    'est',
    'ain',
    'ant',
    'ent',
    'eed',
    'er',
    'le',
    'own',
    'unk',
    'ung',
    'en'
  ],
  'PastTense': [
    'ed',
    'lt',
    'nt',
    'pt',
    'ew',
    'ld'
  ],
  'PresentTense': [
    'rks',
    'cks',
    'nks',
    'ngs',
    'mps',
    'tes',
    'zes',
    'ers',
    'les',
    'acks',
    'ends',
    'ands',
    'ocks',
    'lays',
    'eads',
    'lls',
    'els',
    'ils',
    'ows',
    'nds',
    'ays',
    'ams',
    'ars',
    'ops',
    'ffs',
    'als',
    'urs',
    'lds',
    'ews',
    'ips',
    'es',
    'ts',
    'ns',
    's'
  ]
};
const suffix_rules = {};
const keys$4 = Object.keys(compact$2);
const l$1 = keys$4.length;

for (let i = 0; i < l$1; i++) {
  let l2 = compact$2[keys$4[i]].length;
  for (let o = 0; o < l2; o++) {
    suffix_rules[compact$2[keys$4[i]][o]] = keys$4[i];
  }
}
var suffix_rules_1 = suffix_rules;

const goodTypes = {
  Infinitive: true,
  Gerund: true,
  PastTense: true,
  PresentTense: true,
  FutureTense: true,
  PerfectTense: true,
  Pluperfect: true,
  FuturePerfect: true,
  Participle: true
};

const predictForm = function(term, verbose) {
  //do we already know the form?
  const keys = Object.keys(goodTypes);
  for (let i = 0; i < keys.length; i++) {
    if (term.tags[keys[i]]) {
      if (verbose) {
        console.log('predicted ' + keys[i] + ' from pos', path);
      }
      return keys[i];
    }
  }
  //consult our handy suffix rules
  const arr = Object.keys(suffix_rules_1);
  for (let i = 0; i < arr.length; i++) {
    const substr = term.normal.substr(-arr[i].length);
    if (substr === arr[i] && term.normal.length > arr[i].length) {
      return suffix_rules_1[arr[i]];
    }
  }
  return null;
};

var index$20 = predictForm;

//turn any verb into its infinitive form

let irregulars$6 = index$10.irregular_verbs;


//map the irregulars for easy infinitive lookup
// {bought: 'buy'}
const verb_mapping = () => {
  return Object.keys(irregulars$6).reduce((h, k) => {
    Object.keys(irregulars$6[k]).forEach((pos) => {
      h[irregulars$6[k][pos]] = k;
    });
    return h;
  }, {});
};

irregulars$6 = verb_mapping();

const toInfinitive = function(t) {
  if (t.tags.Infinitive) {
    return t.normal;
  }
  //check the irregular verb conjugations
  if (irregulars$6[t.normal]) {
    return irregulars$6[t.normal];
  }
  //check the suffix rules
  let form = index$20(t);
  if (rules_1[form]) {
    for (let i = 0; i < rules_1[form].length; i++) {
      let rule = rules_1[form][i];
      if (t.normal.match(rule.reg)) {
        return t.normal.replace(rule.reg, rule.to);
      }
    }
  }
  return t.normal;
};

var index$18 = toInfinitive;

const phrasals = paths.tries.utils.phrasals;


//words that could be particles
const particles = {
  'aback': true,
  'along': true,
  'apart': true,
  'at': true,
  'away': true,
  'back': true,
  'by': true,
  'do': true,
  'down': true,
  'forth': true,
  'forward': true,
  'in': true,
  'into': true,
  'it': true,
  'off': true,
  'on': true,
  'out': true,
  'over': true,
  'round': true,
  'through': true,
  'together': true,
  'under': true,
  'up': true,
  'upon': true,
  'way': true,
};

//phrasal verbs are compound verbs like 'beef up'
const phrasals_step = function(ts) {
  for(let i = 1; i < ts.length; i++) {
    let t = ts.get(i);
    //is it a particle, like 'up'
    if (particles[t.normal]) {
      //look backwards
      let last = ts.get(i - 1);
      if (last.tags.Verb) {
        let inf = index$18(last);
        if (phrasals.has(inf + ' ' + t.normal)) {
          t.tag('Particle', 'phrasalVerb-particle');
          t.tag('PhrasalVerb', 'phrasalVerb-particle');
          last.tag('PhrasalVerb', 'phrasalVerb-particle');
        }
      }
    }

  }
  return ts;
};

var _12Phrasal_step = phrasals_step;

//-types of comma-use-
// PlaceComma - Hollywood, California
// List       - cool, fun, and great.
// ClauseEnd  - if so, we do.

//like Toronto, Canada
const isPlaceComma = (ts, i) => {
  let t = ts.terms[i];
  let nextTerm = ts.terms[i + 1];
  //'australia, canada' is a list
  if (nextTerm && t.tags.Place && !t.tags.Country && nextTerm.tags.Country) {
    return true;
  }
  return false;
};

//adj, noun, or verb
const mainTag = (t) => {
  if (t.tags.Adjective) {
    return 'Adjective';
  }
  if (t.tags.Noun) {
    return 'Noun';
  }
  if (t.tags.Verb) {
    return 'Verb';
  }
  return null;
};

const tagAsList = (ts, start, end) => {
  for(let i = start; i <= end; i++) {
    ts.terms[i].tags.List = true;
  }
};

//take the first term with a comma, and test to the right.
//the words with a comma must be the same pos.
const isList = (ts, i) => {
  let start = i;
  let tag = mainTag(ts.terms[i]);
  //ensure there's a following comma, and its the same pos
  //then a Conjunction
  let sinceComma = 0;
  let count = 0;
  let hasConjunction = false;
  for(i = i + 1; i < ts.terms.length; i++) {
    let t = ts.terms[i];
    //are we approaching the end
    if (count > 0 && t.tags.Conjunction) {
      hasConjunction = true;
      continue;
    }
    //found one,
    if (t.tags[tag]) {
      //looks good. keep it going
      if (t.tags.Comma) {
        count += 1;
        sinceComma = 0;
        continue;
      }
      if (count > 0 && hasConjunction) { //is this the end of the list?
        tagAsList(ts, start, i);
        return true;
      }
    }
    sinceComma += 1;
    //have we gone too far without a comma?
    if (sinceComma > 5) {
      return false;
    }
  }
  return false;
};

const commaStep = function(ts) {
  //tag the correct punctuation forms
  for(let i = 0; i < ts.terms.length; i++) {
    let t = ts.terms[i];
    let punct = t.endPunctuation();
    if (punct === ',') {
      t.tag('Comma', 'comma-step');
      continue;
    }
    if (punct === ';' || punct === ':') {
      t.tag('ClauseEnd', 'clause-punt');
      continue;
    }
    //support elipses
    if (t.whitespace.after.match(/^\.\./)) {
      t.tag('ClauseEnd', 'clause-elipses');
      continue;
    }
    //support ' - ' clause
    if (ts.terms[i + 1] && ts.terms[i + 1].whitespace.before.match(/ - /)) {
      t.tag('ClauseEnd', 'hypen-clause');
      continue;
    }
  }

  //disambiguate the commas now
  for(let i = 0; i < ts.terms.length; i++) {
    let t = ts.terms[i];
    if (t.tags.Comma) {
      //if we already got it
      if (t.tags.List) {
        continue;
      }
      //like 'Hollywood, California'
      if (isPlaceComma(ts, i)) {
        continue;
      }
      //like 'cold, wet hands'
      if (isList(ts, i)) {
        continue;
      }
      //otherwise, it's a phrasal comma, like 'you must, if you think so'
      t.tags.ClauseEnd = true;
    }
  }
  return ts;
};

var _13Comma_step = commaStep;

//decide if an apostrophe s is a contraction or not
// 'spencer's nice' -> 'spencer is nice'
// 'spencer's house' -> 'spencer's house'
const afterWord = /[a-z]s'$/;
const apostrophe = /[a-z]'s$/;

//these are always contractions
const blacklist = {
  'it\'s': true,
  'that\'s': true
};

//a possessive means "'s" describes ownership, not a contraction, like 'is'
const is_possessive = function(terms, x) {
  let t = terms.get(x);
  //these are always contractions, not possessive
  if (blacklist[t.normal] === true) {
    return false;
  }
  //"spencers'" - this is always possessive - eg "flanders'"
  if (afterWord.test(t.normal) === true) {
    return true;
  }
  //if no apostrophe s, return
  if (apostrophe.test(t.normal) === false) {
    return false;
  }
  //some parts-of-speech can't be possessive
  if (t.tags.Pronoun === true) {
    return false;
  }
  let nextWord = terms.get(x + 1);
  //last word is possessive  - "better than spencer's"
  if (nextWord === undefined) {
    return true;
  }
  //next word is 'house'
  if (nextWord.tags.Noun === true) {
    return true;
  }
  //rocket's red glare
  if (nextWord.tags.Adjective && terms.get(x + 2) && terms.get(x + 2).tags.Noun) {
    return true;
  }
  //next word is an adjective
  if (nextWord.tags.Adjective || nextWord.tags.Verb || nextWord.tags.Adverb) {
    return false;
  }
  return false;
};

//tag each term as possessive, if it should
const possessiveStep = function(terms) {
  for(let i = 0; i < terms.length; i++) {
    if (is_possessive(terms, i)) {
      let t = terms.get(i);
      //if it's not already a noun, co-erce it to one
      if (!t.tags['Noun']) {
        t.tag('Noun', 'possessive_pass');
      }
      t.tag('Possessive', 'possessive_pass');
    }
  }
  return terms;
};
var _14Possessive_step = possessiveStep;

//regs-
const cardinal$1 = /^[0-9]([0-9]+,)*?(\.[0-9])$/;
const hasText = /^[a-z]/;

const value_step = function(ts) {
  for(let i = 0; i < ts.terms.length; i++) {
    let t = ts.terms[i];
    if (t.tags.Value === true) {
      //ordinal/cardinal
      if (t.tags.Ordinal === undefined && t.tags.Cardinal === undefined) {
        if (cardinal$1.test(t.normal) === true) {
          t.tag('Cardinal', 'ordinal-regex');
        } else {
          t.tag('Cardinal', 'cardinal-regex');
        }
      }
      //text/number
      if (t.tags.TextValue === undefined && t.tags.NumericValue === undefined) {
        if (hasText.test(t.normal) === true) {
          t.tag('TextValue', 'TextValue-regex');
        } else {
          t.tag('NumericValue', 'NumericValue-regex');
        }
      }
    }
  }
  return ts;
};

var _15Value_step = value_step;

const acronym_step = function(ts) {
  ts.terms.forEach((t) => {
    if (t.isAcronym()) {
      t.tag('Acronym', 'acronym-step');
    }
  });
  return ts;
};

var _16Acronym_step = acronym_step;

//yep,
//https://github.com/mathiasbynens/emoji-regex/blob/master/index.js
var emoji_regex = /(?:0\u20E3\n1\u20E3|2\u20E3|3\u20E3|4\u20E3|5\u20E3|6\u20E3|7\u20E3|8\u20E3|9\u20E3|#\u20E3|\*\u20E3|\uD83C(?:\uDDE6\uD83C(?:\uDDE8|\uDDE9|\uDDEA|\uDDEB|\uDDEC|\uDDEE|\uDDF1|\uDDF2|\uDDF4|\uDDF6|\uDDF7|\uDDF8|\uDDF9|\uDDFA|\uDDFC|\uDDFD|\uDDFF)|\uDDE7\uD83C(?:\uDDE6|\uDDE7|\uDDE9|\uDDEA|\uDDEB|\uDDEC|\uDDED|\uDDEE|\uDDEF|\uDDF1|\uDDF2|\uDDF3|\uDDF4|\uDDF6|\uDDF7|\uDDF8|\uDDF9|\uDDFB|\uDDFC|\uDDFE|\uDDFF)|\uDDE8\uD83C(?:\uDDE6|\uDDE8|\uDDE9|\uDDEB|\uDDEC|\uDDED|\uDDEE|\uDDF0|\uDDF1|\uDDF2|\uDDF3|\uDDF4|\uDDF5|\uDDF7|\uDDFA|\uDDFB|\uDDFC|\uDDFD|\uDDFE|\uDDFF)|\uDDE9\uD83C(?:\uDDEA|\uDDEC|\uDDEF|\uDDF0|\uDDF2|\uDDF4|\uDDFF)|\uDDEA\uD83C(?:\uDDE6|\uDDE8|\uDDEA|\uDDEC|\uDDED|\uDDF7|\uDDF8|\uDDF9|\uDDFA)|\uDDEB\uD83C(?:\uDDEE|\uDDEF|\uDDF0|\uDDF2|\uDDF4|\uDDF7)|\uDDEC\uD83C(?:\uDDE6|\uDDE7|\uDDE9|\uDDEA|\uDDEB|\uDDEC|\uDDED|\uDDEE|\uDDF1|\uDDF2|\uDDF3|\uDDF5|\uDDF6|\uDDF7|\uDDF8|\uDDF9|\uDDFA|\uDDFC|\uDDFE)|\uDDED\uD83C(?:\uDDF0|\uDDF2|\uDDF3|\uDDF7|\uDDF9|\uDDFA)|\uDDEE\uD83C(?:\uDDE8|\uDDE9|\uDDEA|\uDDF1|\uDDF2|\uDDF3|\uDDF4|\uDDF6|\uDDF7|\uDDF8|\uDDF9)|\uDDEF\uD83C(?:\uDDEA|\uDDF2|\uDDF4|\uDDF5)|\uDDF0\uD83C(?:\uDDEA|\uDDEC|\uDDED|\uDDEE|\uDDF2|\uDDF3|\uDDF5|\uDDF7|\uDDFC|\uDDFE|\uDDFF)|\uDDF1\uD83C(?:\uDDE6|\uDDE7|\uDDE8|\uDDEE|\uDDF0|\uDDF7|\uDDF8|\uDDF9|\uDDFA|\uDDFB|\uDDFE)|\uDDF2\uD83C(?:\uDDE6|\uDDE8|\uDDE9|\uDDEA|\uDDEB|\uDDEC|\uDDED|\uDDF0|\uDDF1|\uDDF2|\uDDF3|\uDDF4|\uDDF5|\uDDF6|\uDDF7|\uDDF8|\uDDF9|\uDDFA|\uDDFB|\uDDFC|\uDDFD|\uDDFE|\uDDFF)|\uDDF3\uD83C(?:\uDDE6|\uDDE8|\uDDEA|\uDDEB|\uDDEC|\uDDEE|\uDDF1|\uDDF4|\uDDF5|\uDDF7|\uDDFA|\uDDFF)|\uDDF4\uD83C\uDDF2|\uDDF5\uD83C(?:\uDDE6|\uDDEA|\uDDEB|\uDDEC|\uDDED|\uDDF0|\uDDF1|\uDDF2|\uDDF3|\uDDF7|\uDDF8|\uDDF9|\uDDFC|\uDDFE)|\uDDF6\uD83C\uDDE6|\uDDF7\uD83C(?:\uDDEA|\uDDF4|\uDDF8|\uDDFA|\uDDFC)|\uDDF8\uD83C(?:\uDDE6|\uDDE7|\uDDE8|\uDDE9|\uDDEA|\uDDEC|\uDDED|\uDDEE|\uDDEF|\uDDF0|\uDDF1|\uDDF2|\uDDF3|\uDDF4|\uDDF7|\uDDF8|\uDDF9|\uDDFB|\uDDFD|\uDDFE|\uDDFF)|\uDDF9\uD83C(?:\uDDE6|\uDDE8|\uDDE9|\uDDEB|\uDDEC|\uDDED|\uDDEF|\uDDF0|\uDDF1|\uDDF2|\uDDF3|\uDDF4|\uDDF7|\uDDF9|\uDDFB|\uDDFC|\uDDFF)|\uDDFA\uD83C(?:\uDDE6|\uDDEC|\uDDF2|\uDDF8|\uDDFE|\uDDFF)|\uDDFB\uD83C(?:\uDDE6|\uDDE8|\uDDEA|\uDDEC|\uDDEE|\uDDF3|\uDDFA)|\uDDFC\uD83C(?:\uDDEB|\uDDF8)|\uDDFD\uD83C\uDDF0|\uDDFE\uD83C(?:\uDDEA|\uDDF9)|\uDDFF\uD83C(?:\uDDE6|\uDDF2|\uDDFC)))|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2648-\u2653\u2660\u2663\u2665\u2666\u2668\u267B\u267F\u2692-\u2694\u2696\u2697\u2699\u269B\u269C\u26A0\u26A1\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD79\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED0\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3]|\uD83E[\uDD10-\uDD18\uDD80-\uDD84\uDDC0]/g;

//just some of the most common emoticons
//faster than
//http://stackoverflow.com/questions/28077049/regex-matching-emoticons
var emoticon_list = {
  ':(': true,
  ':)': true,
  ':P': true,
  ':p': true,
  ':O': true,
  ':3': true,
  ':|': true,
  ':/': true,
  ':\\': true,
  ':$': true,
  ':*': true,
  ':@': true,
  ':-(': true,
  ':-)': true,
  ':-P': true,
  ':-p': true,
  ':-O': true,
  ':-3': true,
  ':-|': true,
  ':-/': true,
  ':-\\': true,
  ':-$': true,
  ':-*': true,
  ':-@': true,
  ':^(': true,
  ':^)': true,
  ':^P': true,
  ':^p': true,
  ':^O': true,
  ':^3': true,
  ':^|': true,
  ':^/': true,
  ':^\\': true,
  ':^$': true,
  ':^*': true,
  ':^@': true,
  '):': true,
  '(:': true,
  '$:': true,
  '*:': true,
  ')-:': true,
  '(-:': true,
  '$-:': true,
  '*-:': true,
  ')^:': true,
  '(^:': true,
  '$^:': true,
  '*^:': true,
  '<3': true,
  '</3': true,
  '<\\3': true
};

//test for forms like ':woman_tone2:‍:ear_of_rice:'
//https://github.com/Kikobeats/emojis-keywords/blob/master/index.js
const isCommaEmoji = (t) => {
  if (t.text.charAt(0) === ':') {
    //end comma can be last or second-last ':haircut_tone3:‍♀️'
    if (t.text.match(/:.?$/) === null) {
      return false;
    }
    //ensure no spaces
    if (t.text.match(' ')) {
      return false;
    }
    //reasonably sized
    if (t.text.length > 35) {
      return false;
    }
    return true;
  }
  return false;
};

//check against emoticon whitelist
const isEmoticon = (t) => {
  //normalize the 'eyes'
  let str = t.text.replace(/^[:;]/, ':');
  return emoticon_list[str] !== undefined;
};

//
const emojiStep = (ts) => {
  for (let i = 0; i < ts.terms.length; i++) {
    let t = ts.terms[i];
    //test for :keyword: emojis
    if (isCommaEmoji(t)) {
      t.tag('Emoji', 'comma-emoji');
    }
    //test for unicode emojis
    if (t.text.match(emoji_regex)) {
      t.tag('Emoji', 'unicode-emoji');
    }
    //test for emoticon ':)' emojis
    if (isEmoticon(t)) {
      t.tag('Emoji', 'emoticon-emoji');
    }
  }
  return ts;
};
var _17Emoji_step = emojiStep;

let titles$2 = paths.data.titles;
titles$2 = titles$2.reduce((h, str) => {
  h[str] = true;
  return h;
}, {});

const person_step = function (ts) {

  //methods requiring a firstname match
  if (ts.has('#FirstName')) {
    // Firstname x (dangerous)
    let tmp = ts.match('#FirstName #Noun').ifNo('^#Possessive').ifNo('#ClauseEnd .');
    tmp.lastTerm().canBe('#LastName').tag('#LastName', 'firstname-noun');
    //ferdinand de almar
    ts.match('#FirstName de #Noun').canBe('#Person').tag('#Person', 'firstname-de-noun');
    //Osama bin Laden
    ts.match('#FirstName (bin|al) #Noun').canBe('#Person').tag('#Person', 'firstname-al-noun');
    //John L. Foo
    ts.match('#FirstName #Acronym #TitleCase').tag('Person', 'firstname-acronym-titlecase');
    //Andrew Lloyd Webber
    ts.match('#FirstName #FirstName #TitleCase').tag('Person', 'firstname-firstname-titlecase');
    //Mr Foo
    ts.match('#Honorific #FirstName? #TitleCase').tag('Person', 'Honorific-TitleCase');
    //John Foo
    ts.match('#FirstName #TitleCase #TitleCase?').match('#Noun+').tag('Person', 'firstname-titlecase');
    //peter the great
    ts.match('#FirstName the #Adjective').tag('Person', 'correction-determiner5');
    //very common-but-ambiguous lastnames
    ts.match('#FirstName (green|white|brown|hall|young|king|hill|cook|gray|price)').tag('#Person', 'firstname-maybe');
    //Joe K. Sombrero
    ts.match('#FirstName #Acronym #Noun').ifNo('#Date').tag('#Person', 'n-acro-noun').lastTerm().tag('#LastName', 'n-acro-noun');
    //john bodego's
    ts.match('#FirstName (#Singular|#Possessive)').ifNo('#Date').tag('#Person', 'first-possessive').lastTerm().tag('#LastName', 'first-possessive');
  }

  //methods requiring a lastname match
  if (ts.has('#LastName')) {
    // x Lastname
    ts.match('#Noun #LastName').firstTerm().canBe('#FirstName').tag('#FirstName', 'noun-lastname');
    //ambiguous-but-common firstnames
    ts.match('(will|may|april|june|said|rob|wade|ray|rusty|drew|miles|jack|chuck|randy|jan|pat|cliff|bill) #LastName').firstTerm().tag('#FirstName', 'maybe-lastname');
    //Jani K. Smith
    ts.match('#TitleCase #Acronym? #LastName').ifNo('#Date').tag('#Person', 'title-acro-noun').lastTerm().tag('#LastName', 'title-acro-noun');
  }

  //methods requiring a titlecase
  if (ts.has('#TitleCase')) {
    ts.match('#Acronym #TitleCase').canBe('#Person').tag('#Person', 'acronym-titlecase');
    //ludwig van beethovan
    ts.match('#TitleCase (van|al|bin) #TitleCase').tag('Person', 'correction-titlecase-van-titlecase');
    ts.match('#TitleCase (de|du) la? #TitleCase').tag('Person', 'correction-titlecase-van-titlecase');
    //Morgan Shlkjsfne
    ts.match('#Person #TitleCase').match('#TitleCase #Noun').tag('Person', 'correction-person-titlecase');
    //pope francis
    ts.match('(lady|queen|sister) #TitleCase').ifNo('#Date').tag('#FemaleName', 'lady-titlecase');
    ts.match('(king|pope|father) #TitleCase').ifNo('#Date').tag('#MaleName', 'correction-poe');
  }

  //j.k Rowling
  ts.match('#Noun van der? #Noun').canBe('#Person').tag('#Person', 'von der noun');
  //king of spain
  ts.match('(king|queen|prince|saint|lady) of? #Noun').canBe('#Person').tag('#Person', 'king-of-noun');
  //mr X
  ts.match('#Honorific #Acronym').tag('Person', 'Honorific-TitleCase');
  //peter II
  ts.match('#Person #Person the? #RomanNumeral').tag('Person', 'correction-roman-numeral');

  //'Professor Fink', 'General McCarthy'
  for(let i = 0; i < ts.terms.length - 1; i++) {
    let t = ts.terms[i];
    if (titles$2[t.normal]) {
      if (ts.terms[i + 1] && ts.terms[i + 1].tags.Person) {
        t.tag('Person', 'title-person');
      }
    }
  }

  //remove single 'mr'
  ts.match('^#Honorific$').unTag('Person', 'single-honorific');
  return ts;
};

var _18Person_step = person_step;

const startQuote = /^["'\u201B\u201C\u2033\u201F\u2018]/;
const endQuote = /.["'\u201D\u2036\u2019]([;:,.])?$/;

const tagSlice = function(ts, start, end) {
  ts.terms.slice(start, end + 1).forEach((t) => {
    t.tag('Quotation', 'quotation_step');
  });
};

//tag a inline quotation as such
const quotation_step = (ts) => {
  for(let i = 0; i < ts.terms.length; i++) {
    let t = ts.terms[i];
    if (startQuote.test(t.text) === true) {
      //look for the ending
      for(let o = 0; o < ts.terms.length; o++) {
        //max-length- don't go-on forever
        if (!ts.terms[i + o] || o > 8) {
          break;
        }
        if (endQuote.test(ts.terms[i + o].text) === true) {
          tagSlice(ts, i, o + i);
          i += o;
          break;
        }
      }
    }
  }
  return ts;
};
var _19Quotation_step = quotation_step;

//orgwords like 'bank' in 'Foo Bank'
let orgWords = paths.tries.utils.orgWords;

//could this word be an organization
const maybeOrg = function(t) {
  //must be a noun
  if (!t.tags.Noun) {
    return false;
  }
  //can't be these things
  if (t.tags.Pronoun || t.tags.Comma || t.tags.Possessive || t.tags.Place) {
    return false;
  }
  //must be one of these
  if (t.tags.TitleCase || t.tags.Organization || t.tags.Acronym) {
    return true;
  }
  return false;
};

const organization_step = (ts) => {
  for(let i = 0; i < ts.terms.length; i++) {
    let t = ts.terms[i];
    if (orgWords.has(t.normal)) {
      //eg. Toronto University
      let lastTerm = ts.terms[i - 1];
      if (lastTerm && maybeOrg(lastTerm)) {
        lastTerm.tag('Organization', 'org-word-1');
        t.tag('Organization', 'org-word-2');
        continue;
      }
      //eg. University of Toronto
      let nextTerm = ts.terms[i + 1];
      if (nextTerm && nextTerm.normal === 'of') {
        if (ts.terms[i + 2] && maybeOrg(ts.terms[i + 2])) {
          t.tag('Organization', 'org-of-word-1');
          nextTerm.tag('Organization', 'org-of-word-2');
          ts.terms[i + 2].tag('Organization', 'org-of-word-3');
          continue;
        }
      }
    }
  }
  return ts;
};
var _20Organization_step = organization_step;

//similar to plural/singularize rules, but not the same
const plural_indicators = [
  /(^v)ies$/i,
  /ises$/i,
  /ives$/i,
  /(antenn|formul|nebul|vertebr|vit)ae$/i,
  /(octop|vir|radi|nucle|fung|cact|stimul)i$/i,
  /(buffal|tomat|tornad)oes$/i,
  /(analy|ba|diagno|parenthe|progno|synop|the)ses$/i,
  /(vert|ind|cort)ices$/i,
  /(matr|append)ices$/i,
  /(x|ch|ss|sh|s|z|o)es$/i,
  /men$/i,
  /news$/i,
  /.tia$/i,
  /(^f)ves$/i,
  /(lr)ves$/i,
  /(^aeiouy|qu)ies$/i,
  /(m|l)ice$/i,
  /(cris|ax|test)es$/i,
  /(alias|status)es$/i,
  /ics$/i
];

//similar to plural/singularize rules, but not the same
const singular_indicators = [
  /(ax|test)is$/i,
  /(octop|vir|radi|nucle|fung|cact|stimul)us$/i,
  /(octop|vir)i$/i,
  /(rl)f$/i,
  /(alias|status)$/i,
  /(bu)s$/i,
  /(al|ad|at|er|et|ed|ad)o$/i,
  /(ti)um$/i,
  /(ti)a$/i,
  /sis$/i,
  /(?:(^f)fe|(lr)f)$/i,
  /hive$/i,
  /(^aeiouy|qu)y$/i,
  /(x|ch|ss|sh|z)$/i,
  /(matr|vert|ind|cort)(ix|ex)$/i,
  /(m|l)ouse$/i,
  /(m|l)ice$/i,
  /(antenn|formul|nebul|vertebr|vit)a$/i,
  /.sis$/i,
  /^(?!talis|.*hu)(.*)man$/i
];
var indicators = {
  singular_indicators: singular_indicators,
  plural_indicators: plural_indicators
};

const irregulars$7 = index$10.irregular_plurals;

const prep = /([a-z]*) (of|in|by|for) [a-z]/;

const knownPlural = {
  i: false,
  he: false,
  she: false,
  we: true,
  they: true,
};

//is it potentially plural?
const noPlural = [
  'Place',
  'Value',
  'Person',
  'Month',
  'WeekDay',
  'RelativeDay',
  'Holiday',
];
//first, try to guess based on existing tags
const couldEvenBePlural = function(t) {
  for (let i = 0; i < noPlural.length; i++) {
    if (t.tags[noPlural[i]]) {
      return false;
    }
  }
  return true;
};

const isPlural = function (t) {
  let str = t.normal;

  //whitelist a few easy ones
  if (knownPlural[str] !== undefined) {
    return knownPlural[str];
  }
  //inspect the existing tags to see if a plural is valid
  if (couldEvenBePlural(t) === false) {
    return false;
  }
  //handle 'mayors of chicago'
  const preposition = str.match(prep);
  if (preposition !== null) {
    str = preposition[1];
  }
  // if it's a known irregular case
  if (irregulars$7.toSingle[str]) {
    return true;
  }
  if (irregulars$7.toPlural[str]) {
    return false;
  }
  //check the suffix-type rules for indications
  for (let i = 0; i < indicators.plural_indicators.length; i++) {
    if (indicators.plural_indicators[i].test(str) === true) {
      return true;
    }
  }
  for (let i = 0; i < indicators.singular_indicators.length; i++) {
    if (indicators.singular_indicators[i].test(str) === true) {
      return false;
    }
  }
  // a fallback 'looks check plural' rule..
  if (/s$/.test(str) === true && /ss$/.test(str) === false && str.length > 3) { //needs some lovin'
    return true;
  }
  return false;
};

var isPlural_1 = isPlural;
// console.log(is_plural('octopus') === false)

const pluralStep = function(ts) {
  for(let i = 0; i < ts.terms.length; i++) {
    let t = ts.terms[i];
    if (t.tags.Noun) {
      //skip existing fast
      if (t.tags.Singular || t.tags.Plural) {
        continue;
      }
      //check if it's plural
      let plural = isPlural_1(t); //can be null if unknown
      if (plural) {
        t.tag('Plural', 'pluralStep');
      } else if (plural === false) {
        // console.log(t.normal, plural);
        t.tag('Singular', 'pluralStep');
      }
    }
  }
  return ts;
};

var _21Plural_step = pluralStep;

//
const lumper = (ts) => {

  //John & Joe's
  ts.match('#Noun (&|n) #Noun').lump().tag('Organization', 'Noun-&-Noun');

  //1 800 PhoneNumber
  ts.match('1 #Value #PhoneNumber').lump().tag('Organization', 'Noun-&-Noun');

  //6 am
  ts.match('#Holiday (day|eve)').lump().tag('Holiday', 'holiday-day');

  //Aircraft designer
  ts.match('#Noun #Actor').lump().tag('Actor', 'thing-doer');

  //timezones
  ts.match('(standard|daylight|summer|eastern|pacific|central|mountain) standard? time').lump().tag('Time', 'timezone');

  //canadian dollar, Brazilian pesos
  ts.match('#Demonym #Currency').lump().tag('Currency', 'demonym-currency');

  //(454) 232-9873
  ts.match('#NumericValue #PhoneNumber').lump().tag('PhoneNumber', '(800) PhoneNumber');
  return ts;
};
var index$22 = lumper;

//index a lexicon by its first-word
// - used for the multiple-word-lumper
const firstWord = (arr) => {
  let all = {};
  arr.forEach((obj) => {
    Object.keys(obj).forEach((str) => {
      let words = str.split(' ');
      if (words.length > 1) {
        let w = words[0];
        all[w] = all[w] || {};
        let rest = words.slice(1).join(' ');
        all[w][rest] = obj[str];
      }
    });
  });
  return all;
};
var firstWord_1 = firstWord;

//check for "united" + "kingdom" in lexicon, and combine + tag it
// const combine = require('./combine');

const lexicon$2 = paths.lexicon;
const tries = paths.tries;

//build default-one
const lexiconFirst = firstWord_1([lexicon$2, tries.multiples()]);

//see if this term is a multi-match
const tryHere = function(ts, i, obj) {
  let n = i + 1;
  //one
  if (obj[ts.slice(n, n + 1).out('root')]) {
    return n + 1;
  }
  //two
  if (obj[ts.slice(n, n + 2).out('root')]) {
    return n + 2;
  }
  //three
  if (obj[ts.slice(n, n + 3).out('root')]) {
    return n + 3;
  }
  return null;
};

//try all terms with this lexicon
const tryAll = function(lexFirst, ts) {
  for(let i = 0; i < ts.terms.length - 1; i++) {
    let obj = lexFirst[ts.terms[i].root];
    if (obj) {
      let n = tryHere(ts, i, obj);
      if (n) {
        let tag = obj[ts.slice(i + 1, n).out('root')];
        let slice = ts.slice(i, n);
        slice.tag(tag, 'lexicon-lump');
        slice.lump();
      }
    }
  }
  return ts;
};

const lexicon_lump = function (ts) {
  //use default lexicon
  ts = tryAll(lexiconFirst, ts);
  //try user's lexicon
  if (ts.lexicon) {
    let uFirst = firstWord_1([ts.lexicon]);
    ts = tryAll(uFirst, ts);
  }
  return ts;
};

var lexicon_lump_1 = lexicon_lump;

let enable = false;

var index$28 = {
  enable: (str) => {
    if (str === undefined) {
      str = true;
    }
    enable = str;
  },
  here: (path) => {
    if (enable === true || enable === path) {
      console.log('  ' + path);
    }
  },
  tell: (str, path) => {
    if (enable === true || enable === path) {
      if (typeof str === 'object') {
        str = JSON.stringify(str);
      }
      str = '    ' + str;
      console.log(str);
    }
  },
  tag: (t, pos, reason) => {
    if (enable === true || enable === 'tagger') {
      let title = t.normal || '[' + t.silent_term + ']';
      title = fns$1.yellow(title);
      title = fns$1.leftPad('\'' + title + '\'', 20);
      title += '  ->   ' + fns$1.printTag(pos);
      title = fns$1.leftPad(title, 54);
      console.log('       ' + title + '(' + fns$1.cyan(reason || '') + ')');
    }
  },
  unTag: (t, pos, reason) => {
    if (enable === true || enable === 'tagger') {
      let title = '-' + t.normal + '-';
      title = fns$1.red(title);
      title = fns$1.leftPad(title, 20);
      title += '  ~*   ' + fns$1.red(pos);
      title = fns$1.leftPad(title, 54);
      console.log('       ' + title + '(' + fns$1.red(reason || '') + ')');
    }
  }
};

var paths$2 = {
  fns: fns$1,
  log: index$28,
  tags: index$8
};

//regs-
const before = /^(\s|-+|\.\.+)+/;
const after = /(\s+|-+|\.\.+)$/;

//seperate the 'meat' from the trailing/leading whitespace.
//works in concert with ./src/result/tokenize.js
const build_whitespace = (str) => {
  let whitespace = {
    before: '',
    after: ''
  };
  //get before punctuation/whitespace
  let m = str.match(before);
  if (m !== null) {
    whitespace.before = m[0];
    str = str.replace(before, '');
  }
  //get after punctuation/whitespace
  m = str.match(after);
  if (m !== null) {
    str = str.replace(after, '');
    whitespace.after = m[0];
  }
  return {
    whitespace: whitespace,
    text: str
  };
};
var whitespace = build_whitespace;

//this is a not-well-thought-out way to reduce our dependence on `object===object` reference stuff
//generates a unique id for this term
//may need to change when the term really-transforms? not sure.
const uid = (str) => {
  let nums = '';
  for(let i = 0; i < 5; i++) {
    nums += parseInt(Math.random() * 9, 10);
  }
  return str + '-' + nums;
};
var makeUID = uid;

//a hugely-ignorant, and widely subjective transliteration of latin, cryllic, greek unicode characters to english ascii.
//approximate visual (not semantic or phonetic) relationship between unicode and ascii characters
//http://en.wikipedia.org/wiki/List_of_Unicode_characters
//https://docs.google.com/spreadsheet/ccc?key=0Ah46z755j7cVdFRDM1A2YVpwa1ZYWlpJM2pQZ003M0E
let compact$3 = {
  '!': '¡',
  '?': '¿Ɂ',
  'a': 'ªÀÁÂÃÄÅàáâãäåĀāĂăĄąǍǎǞǟǠǡǺǻȀȁȂȃȦȧȺΆΑΔΛάαλАДадѦѧӐӑӒӓƛɅæ',
  'b': 'ßþƀƁƂƃƄƅɃΒβϐϦБВЪЬбвъьѢѣҌҍҔҕƥƾ',
  'c': '¢©ÇçĆćĈĉĊċČčƆƇƈȻȼͻͼͽϲϹϽϾϿЄСсєҀҁҪҫ',
  'd': 'ÐĎďĐđƉƊȡƋƌǷ',
  'e': 'ÈÉÊËèéêëĒēĔĕĖėĘęĚěƎƏƐǝȄȅȆȇȨȩɆɇΈΕΞΣέεξϱϵ϶ЀЁЕЭеѐёҼҽҾҿӖӗӘәӚӛӬӭ',
  'f': 'ƑƒϜϝӺӻҒғӶӷſ',
  'g': 'ĜĝĞğĠġĢģƓǤǥǦǧǴǵ',
  'h': 'ĤĥĦħƕǶȞȟΉΗЂЊЋНнђћҢңҤҥҺһӉӊ',
  'I': 'ÌÍÎÏ',
  'i': 'ìíîïĨĩĪīĬĭĮįİıƖƗȈȉȊȋΊΐΪίιϊІЇії',
  'j': 'ĴĵǰȷɈɉϳЈј',
  'k': 'ĶķĸƘƙǨǩΚκЌЖКжкќҚқҜҝҞҟҠҡ',
  'l': 'ĹĺĻļĽľĿŀŁłƚƪǀǏǐȴȽΙӀӏ',
  'm': 'ΜϺϻМмӍӎ',
  'n': 'ÑñŃńŅņŇňŉŊŋƝƞǸǹȠȵΝΠήηϞЍИЙЛПийлпѝҊҋӅӆӢӣӤӥπ',
  'o': 'ÒÓÔÕÖØðòóôõöøŌōŎŏŐőƟƠơǑǒǪǫǬǭǾǿȌȍȎȏȪȫȬȭȮȯȰȱΌΘΟθοσόϕϘϙϬϭϴОФоѲѳӦӧӨөӪӫ¤ƍΏ',
  'p': 'ƤƿΡρϷϸϼРрҎҏÞ',
  'q': 'Ɋɋ',
  'r': 'ŔŕŖŗŘřƦȐȑȒȓɌɍЃГЯгяѓҐґ',
  's': 'ŚśŜŝŞşŠšƧƨȘșȿςϚϛϟϨϩЅѕ',
  't': 'ŢţŤťŦŧƫƬƭƮȚțȶȾΓΤτϮϯТт҂Ҭҭ',
  'u': 'µÙÚÛÜùúûüŨũŪūŬŭŮůŰűŲųƯưƱƲǓǔǕǖǗǘǙǚǛǜȔȕȖȗɄΰμυϋύϑЏЦЧцџҴҵҶҷӋӌӇӈ',
  'v': 'νѴѵѶѷ',
  'w': 'ŴŵƜωώϖϢϣШЩшщѡѿ',
  'x': '×ΧχϗϰХхҲҳӼӽӾӿ',
  'y': 'ÝýÿŶŷŸƳƴȲȳɎɏΎΥΫγψϒϓϔЎУучўѰѱҮүҰұӮӯӰӱӲӳ',
  'z': 'ŹźŻżŽžƩƵƶȤȥɀΖζ'
};
//decompress data into two hashes
let unicode = {};
Object.keys(compact$3).forEach(function (k) {
  compact$3[k].split('').forEach(function (s) {
    unicode[s] = k;
  });
});

const killUnicode = (str) => {
  let chars = str.split('');
  chars.forEach((s, i) => {
    if (unicode[s]) {
      chars[i] = unicode[s];
    }
  });
  return chars.join('');
};
var unicode_1 = killUnicode;
// console.log(fixUnicode('bjŏȒk'));

var normalize$1 = createCommonjsModule(function (module, exports) {
'use strict';


//some basic operations on a string to reduce noise
exports.normalize = function(str) {
  str = str || '';
  str = str.toLowerCase();
  str = str.trim();
  //(very) rough asci transliteration -  bjŏrk -> bjork
  str = unicode_1(str);
  //hashtags, atmentions
  str = str.replace(/^[#@]/, '');
  // coerce single curly quotes
  str = str.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]+/g, '\'');
  // coerce double curly quotes
  str = str.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036"]+/g, '');
  //coerce unicode elipses
  str = str.replace(/\u2026/g, '...');
  //en-dash
  str = str.replace(/\u2013/g, '-');

  //strip leading & trailing grammatical punctuation
  if (/^[:;]/.test(str) === false) {
    str = str.replace(/\.{3,}$/g, '');
    str = str.replace(/['",\.!:;\?\)]$/g, '');
    str = str.replace(/^['"\(]/g, '');
  }
  return str;
};

exports.addNormal = function (term) {
  let str = term._text || '';
  str = exports.normalize(str);
  //compact acronyms
  if (term.isAcronym()) {
    str = str.replace(/\./g, '');
  }
  //nice-numbers
  str = str.replace(/([0-9]),([0-9])/g, '$1$2');
  term.normal = str;
};


// console.log(normalize('Dr. V Cooper'));
});

//
const rootForm = function(term) {
  let str = term.normal || term.silent_term || '';
  //plural
  // if (term.tags.Plural) {
  // str = term.nouns().toSingular().normal || str;
  // }
  str = str.replace(/'s\b/, '');
  str = str.replace(/'\b/, '');
  term.root = str;
};

var root = rootForm;

const addNormal = normalize$1.addNormal;


const addMethods = (Term) => {

  const methods = {
    normalize: function () {
      addNormal(this);
      root(this);
      return this;
    },
  };
  //hook them into result.proto
  Object.keys(methods).forEach((k) => {
    Term.prototype[k] = methods[k];
  });
  return Term;
};

var index$30 = addMethods;

//regs-
const periodAcronym = /([A-Z]\.)+[A-Z]?$/;
const oneLetterAcronym = /^[A-Z]\.$/;
const noPeriodAcronym = /[A-Z]{3}$/;
const hasVowel = /[aeiouy]/i;
const hasLetter = /[a-z]/;
const hasNumber = /[0-9]/;

const addMethods$1 = (Term) => {

  const methods = {
    /** does it appear to be an acronym, like FBI or M.L.B. */
    isAcronym: function () {
      //like N.D.A
      if (periodAcronym.test(this.text) === true) {
        return true;
      }
      //like 'F.'
      if (oneLetterAcronym.test(this.text) === true) {
        return true;
      }
      //like NDA
      if (noPeriodAcronym.test(this.text) === true) {
        return true;
      }
      return false;
    },

    /** check if it is word-like in english */
    isWord: function () {
      let t = this;
      //assume a contraction produces a word-word
      if (t.silent_term) {
        return true;
      }
      //no letters or numbers
      if (/[a-z|A-Z|0-9]/.test(t.text) === false) {
        return false;
      }
      //has letters, but with no vowels
      if (t.normal.length > 1 && hasLetter.test(t.normal) === true && hasVowel.test(t.normal) === false) {
        return false;
      }
      //has numbers but not a 'value'
      if (hasNumber.test(t.normal) === true) {
        //s4e
        if (/[a-z][0-9][a-z]/.test(t.normal) === true) {
          return false;
        }
        //ensure it looks like a 'value' eg '-$4,231.00'
        if (/^([$-])*?([0-9,\.])*?([s\$%])*?$/.test(t.normal) === false) {
          return false;
        }
      }
      return true;
    }
  };
  //hook them into result.proto
  Object.keys(methods).forEach((k) => {
    Term.prototype[k] = methods[k];
  });
  return Term;
};

var isA = addMethods$1;

//turn xml special characters into apersand-encoding.
//i'm not sure this is perfectly safe.
const escapeHtml = (s) => {
  const HTML_CHAR_MAP = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    '\'': '&#39;',
    ' ': '&nbsp;'
  };
  return s.replace(/[<>&"' ]/g, function(ch) {
    return HTML_CHAR_MAP[ch];
  });
};

//remove html elements already in the text
//not tested!
//http://stackoverflow.com/questions/295566/sanitize-rewrite-html-on-the-client-side
const sanitize = (html) => {
  const tagBody = '(?:[^"\'>]|"[^"]*"|\'[^\']*\')*';
  const tagOrComment = new RegExp(
    '<(?:'
    // Comment body.
    + '!--(?:(?:-*[^->])*--+|-?)'
    // Special "raw text" elements whose content should be elided.
    + '|script\\b' + tagBody + '>[\\s\\S]*?</script\\s*'
    + '|style\\b' + tagBody + '>[\\s\\S]*?</style\\s*'
    // Regular name
    + '|/?[a-z]'
    + tagBody
    + ')>',
    'gi');
  let oldHtml;
  do {
    oldHtml = html;
    html = html.replace(tagOrComment, '');
  } while (html !== oldHtml);
  return html.replace(/</g, '&lt;');
};

//turn the term into ~properly~ formatted html
const renderHtml = function(t) {
  let classes = Object.keys(t.tags).filter((tag) => tag !== 'Term');
  classes = classes.map(c => 'nl-' + c);
  classes = classes.join(' ');
  let text = sanitize(t.text);
  text = escapeHtml(text);
  let el = '<span class="' + classes + '">' + text + '</span>';
  return escapeHtml(t.whitespace.before) + el + escapeHtml(t.whitespace.after);
};

var renderHtml_1 = renderHtml;

const fns$7 = paths$2.fns;

const methods$1 = {
  /** a pixel-perfect reproduction of the input, with whitespace preserved */
  text: function(r) {
    return r.whitespace.before + r._text + r.whitespace.after;
  },
  /** a lowercased, punctuation-cleaned, whitespace-trimmed version of the word */
  normal: function(r) {
    return r.normal;
  },
  /** even-more normalized than normal */
  root: function(r) {
    return r.root || r.normal;
  },
  /** the &encoded term in a span element, with POS as classNames */
  html: function(r) {
    return renderHtml_1(r);
  },
  /** a simplified response for Part-of-Speech tagging*/
  tags: function(r) {
    return {
      text: r.text,
      normal: r.normal,
      tags: Object.keys(r.tags)
    };
  },
  /** check-print information for the console */
  debug: function(r) {
    let tags = Object.keys(r.tags).map((tag) => {
      return fns$7.printTag(tag);
    }).join(', ');
    let word = r.text;
    // word = r.whitespace.before + word + r.whitespace.after;
    word = '\'' + fns$7.yellow(word || '-') + '\'';
    // if (r.dirty) {
    // word += fns.red('*');
    // }
    let silent = '';
    if (r.silent_term) {
      silent = '[' + r.silent_term + ']';
    }
    word = fns$7.leftPad(word, 25);
    word += fns$7.leftPad(silent, 5);
    console.log('   ' + word + '   ' + '     - ' + tags);
  }
};

const addMethods$2 = (Term) => {
  //hook them into result.proto
  Term.prototype.out = function(fn) {
    if (!methods$1[fn]) {
      fn = 'text';
    }
    return methods$1[fn](this);
  };
  return Term;
};

var index$32 = addMethods$2;

//set a term as a particular Part-of-speech

const log$1 = paths$2.log;
const tagset$1 = paths$2.tags;

//remove a tag from a term
const unTag = (term, tag, reason) => {
  if (term.tags[tag]) {
    log$1.unTag(term, tag, reason);
    delete term.tags[tag];

    //delete downstream tags too
    if (tagset$1[tag]) {
      let also = tagset$1[tag].downward;
      for(let i = 0; i < also.length; i++) {
        unTag(term, also[i], ' - -   - ');
      }
    }
  }
};

const wrap$1 = (term, tag, reason) => {
  if (!term || !tag) {
    return;
  }
  //support '*' flag - remove all-tags
  if (tag === '*') {
    term.tags = {};
    return;
  }
  //remove this tag
  unTag(term, tag, reason);
  return;
};
var unTag_1 = wrap$1;

//set a term as a particular Part-of-speech

const log = paths$2.log;
const tagset = paths$2.tags;
const fns$8 = paths$2.fns;


const putTag = (term, tag, reason) => {
  tag = tag.replace(/^#/, '');
  //already got this
  if (term.tags[tag] === true) {
    return;
  }
  term.tags[tag] = true;
  log.tag(term, tag, reason);

  //extra logic per-each POS
  if (tagset[tag]) {
    //drop any conflicting tags
    let enemies = tagset[tag].enemy;
    for (let i = 0; i < enemies.length; i++) {
      if (term.tags[enemies[i]] === true) {
        unTag_1(term, enemies[i], reason);
      }
    }
    //apply implicit tags
    if (tagset[tag].is) {
      let doAlso = tagset[tag].is;
      if (term.tags[doAlso] !== true) {
        putTag(term, doAlso, ' --> ' + tag); //recursive
      }
    }
  }
};

//give term this tag
const wrap = function (term, tag, reason) {
  if (!term || !tag) {
    return;
  }
  //handle multiple tags
  if (fns$8.isArray(tag)) {
    tag.forEach((t) => putTag(term, t, reason)); //recursive
    return;
  }
  putTag(term, tag, reason);
  //add 'extra' tag (for some special tags)
  if (tagset[tag] && tagset[tag].also !== undefined) {
    putTag(term, tagset[tag].also, reason);
  }
};

var setTag = wrap;

const tagset$2 = paths$2.tags;

//recursively-check compatibility of this tag and term
const canBe = function(term, tag) {
  //fail-fast
  if (tagset$2[tag] === undefined) {
    return true;
  }
  //loop through tag's contradictory tags
  let enemies = tagset$2[tag].enemy || [];
  for (let i = 0; i < enemies.length; i++) {
    if (term.tags[enemies[i]] === true) {
      return false;
    }
  }
  if (tagset$2[tag].is !== undefined) {
    return canBe(term, tagset$2[tag].is); //recursive
  }
  return true;
};

var canBe_1 = canBe;

const addMethods$3 = (Term) => {

  const methods = {
    /** set the term as this part-of-speech */
    tag: function(tag, reason) {
      setTag(this, tag, reason);
    },
    /** remove this part-of-speech from the term*/
    unTag: function(tag, reason) {
      unTag_1(this, tag, reason);
    },
    /** is this tag compatible with this word */
    canBe: function (tag) {
      tag = tag || '';
      tag = tag.replace(/^#/, '');
      return canBe_1(this, tag);
    }
  };

  //hook them into term.prototype
  Object.keys(methods).forEach((k) => {
    Term.prototype[k] = methods[k];
  });
  return Term;
};

var index$34 = addMethods$3;

const addMethods$4 = (Term) => {

  const methods = {
    toUpperCase: function () {
      this.text = this.text.toUpperCase();
      this.tag('#UpperCase', 'toUpperCase');
      return this;
    },
    toLowerCase: function () {
      this.text = this.text.toLowerCase();
      this.unTag('#TitleCase');
      this.unTag('#UpperCase');
      return this;
    },
    toTitleCase: function () {
      this.text = this.text.replace(/^[a-z]/, (x) => x.toUpperCase());
      this.tag('#TitleCase', 'toTitleCase');
      return this;
    },
    //(camelCase() is handled in `./terms` )

    /** is it titlecased because it deserves it? Like a person's name? */
    needsTitleCase: function() {
      const titleCases = [
        'Person',
        'Place',
        'Organization',
        'Acronym',
        'UpperCase',
        'Currency',
        'RomanNumeral',
        'Month',
        'WeekDay',
        'Holiday',
        'Demonym',
      ];
      for(let i = 0; i < titleCases.length; i++) {
        if (this.tags[titleCases[i]]) {
          return true;
        }
      }
      //specific words that keep their titlecase
      //https://en.wikipedia.org/wiki/Capitonym
      const irregulars = [
        'i',
        'god',
        'allah',
      ];
      for(let i = 0; i < irregulars.length; i++) {
        if (this.normal === irregulars[i]) {
          return true;
        }
      }
      return false;
    }
  };
  //hook them into result.proto
  Object.keys(methods).forEach((k) => {
    Term.prototype[k] = methods[k];
  });
  return Term;
};

var _case = addMethods$4;

const endPunct = /([a-z])([,:;\/.(\.\.\.)\!\?]+)$/i;
const addMethods$5 = (Term) => {

  const methods = {
    /** the punctuation at the end of this term*/
    endPunctuation: function() {
      let m = this.text.match(endPunct);
      if (m) {
        const allowed = {
          ',': 'comma',
          ':': 'colon',
          ';': 'semicolon',
          '.': 'period',
          '...': 'elipses',
          '!': 'exclamation',
          '?': 'question'
        };
        if (allowed[m[2]] !== undefined) {
          return m[2];
        }
      }
      return null;
    },
    setPunctuation: function(punct) {
      this.killPunctuation();
      this.text += punct;
      return this;
    },

    /** check if the term ends with a comma */
    hasComma: function () {
      if (this.endPunctuation() === 'comma') {
        return true;
      }
      return false;
    },

    killPunctuation: function () {
      this.text = this._text.replace(endPunct, '$1');
      return this;
    },
  };
  //hook them into result.proto
  Object.keys(methods).forEach((k) => {
    Term.prototype[k] = methods[k];
  });
  return Term;
};

var punctuation = addMethods$5;

const fns$6 = paths$2.fns;



class Term {
  constructor(str) {
    this._text = fns$6.ensureString(str);
    this.tags = {};
    //seperate whitespace from the text
    let parsed = whitespace(this._text);
    this.whitespace = parsed.whitespace;
    this._text = parsed.text;
    // console.log(this.whitespace, this._text);
    this.parent = null;
    this.silent_term = '';
    //has this term been modified
    this.dirty = false;
    this.normalize();
    //make a unique id for this term
    this.uid = makeUID(this.normal);
  }
  set text(str) {
    str = str || '';
    this._text = str.trim();
    this.dirty = true;
    if (this._text !== str) {
      this.whitespace = whitespace(str);
    }
    this.normalize();
  }
  get text() {
    return this._text;
  }
  get isA() {
    return 'Term';
  }
  /** where in the sentence is it? zero-based. */
  index() {
    let ts = this.parentTerms;
    if (!ts) {
      return null;
    }
    return ts.terms.indexOf(this);
  }
  /** make a copy with no references to the original  */
  clone() {
    let term = new Term(this._text, null);
    term.tags = fns$6.copy(this.tags);
    term.whitespace = fns$6.copy(this.whitespace);
    term.silent_term = this.silent_term;
    return term;
  }
}
index$30(Term);
isA(Term);
index$32(Term);
index$34(Term);
_case(Term);
punctuation(Term);

var index$26 = Term;

const tags$1 = {
  'not': 'Negative',
  'will': 'Verb',
  'would': 'Modal',
  'have': 'Verb',
  'are': 'Copula',
  'is': 'Copula',
  'am': 'Verb',
};
//make sure the newly created term gets the easy tags
const easyTag = (t) => {
  if (tags$1[t.silent_term]) {
    t.tag(tags$1[t.silent_term]);
  }
};


//add a silent term
const fixContraction = (ts, parts, i) => {
  //add the interpretation to the contracted term
  let one = ts.terms[i];
  one.silent_term = parts[0];
  //tag it as a contraction
  one.tag('Contraction', 'tagger-contraction');

  //add a new empty term
  let two = new index$26('');
  two.silent_term = parts[1];
  two.tag('Contraction', 'tagger-contraction');
  ts.insertAt(i + 1, two);
  //ensure new term has no auto-whitspace
  two.whitespace.before = '';
  two.whitespace.after = '';
  easyTag(two);

  //potentially it's three-contracted-terms, like 'dunno'
  if (parts[2]) {
    let three = new index$26('');
    three.silent_term = parts[2];
    // ts.terms.push(three);
    ts.insertAt(i + 2, three);
    three.tag('Contraction', 'tagger-contraction');
    easyTag(three);
  }

  return ts;
};

var fix = fixContraction;

const irregulars$8 = {
  'wanna': ['want', 'to'],
  'gonna': ['going', 'to'],
  'im': ['i', 'am'],
  'alot': ['a', 'lot'],

  'dont': ['do', 'not'],
  'dun': ['do', 'not'],

  'ive': ['i', 'have'],

  'won\'t': ['will', 'not'],
  'wont': ['will', 'not'],

  'can\'t': ['can', 'not'],
  'cant': ['can', 'not'],
  'cannot': ['can', 'not'],

  'aint': ['is', 'not'], //or 'are'
  'ain\'t': ['is', 'not'],
  'shan\'t': ['should', 'not'],
  'imma': ['I', 'will'],

  'where\'d': ['where', 'did'],
  'whered': ['where', 'did'],
  'when\'d': ['when', 'did'],
  'whend': ['when', 'did'],
  'how\'d': ['how', 'did'],
  'howd': ['how', 'did'],
  'what\'d': ['what', 'did'],
  'whatd': ['what', 'did'],
  'let\'s': ['let', 'us'],

  //multiple word contractions
  'dunno': ['do', 'not', 'know'],
  'brb': ['be', 'right', 'back'],
  'gtg': ['got', 'to', 'go'],
  'irl': ['in', 'real', 'life'],
  'tbh': ['to', 'be', 'honest'],
  'imo': ['in', 'my', 'opinion'],
  'til': ['today', 'i', 'learned'],
  'rn': ['right', 'now'],
// 'idk': ['i', 'don\'t', 'know'],
};

//check irregulars
const checkIrregulars$2 = (ts) => {
  let irreg = Object.keys(irregulars$8);
  for(let i = 0; i < irreg.length; i++) {
    for(let t = 0; t < ts.terms.length; t++) {
      if (ts.terms[t].normal === irreg[i]) {
        let fix$$1 = irregulars$8[irreg[i]];
        ts = fix(ts, fix$$1, t);
        break;
      }
    }
  }
  return ts;
};
var _01Irregulars = checkIrregulars$2;

//these are always contractions
const blacklist$1 = {
  'that\'s': true,
};

// "'s" may be a contraction or a possessive
// 'spencer's house' vs 'spencer's good'
const isPossessive = (ts, i) => {
  let t = ts.terms[i];
  let next_t = ts.terms[i + 1];
  //a pronoun can't be possessive - "he's house"
  if (t.tags.Pronoun || t.tags.QuestionWord) {
    return false;
  }
  if (blacklist$1[t.normal]) {
    return false;
  }
  //if end of sentence, it is possessive - "was spencer's"
  if (!next_t) {
    return true;
  }
  //a gerund suggests 'is walking'
  if (next_t.tags.VerbPhrase) {
    return false;
  }
  //spencer's house
  if (next_t.tags.Noun) {
    return true;
  }
  //rocket's red glare
  if (next_t.tags.Adjective && ts.terms[i + 2] && ts.terms[i + 2].tags.Noun) {
    return true;
  }
  //an adjective suggests 'is good'
  if (next_t.tags.Adjective || next_t.tags.Adverb || next_t.tags.Verb) {
    return false;
  }
  return false;
};


//handle ambigous contraction "'s"
const hardOne = (ts) => {
  for(let i = 0; i < ts.terms.length; i++) {
    //skip existing
    if (ts.terms[i].silent_term) {
      continue;
    }
    let parts = split(ts.terms[i]);
    if (parts) {
      //have we found a hard one
      if (parts.end === 's') {
        //spencer's house
        if (isPossessive(ts, i)) {
          ts.terms[i].tag('#Possessive', 'hard-contraction');
          continue;
        }
        //is vs was
        let arr = [parts.start, 'is'];
        ts = fix(ts, arr, i);
        i += 1;
      }
    }
  }
  return ts;
};

var _02HardOne = hardOne;

//the formulaic contraction types:
const easy_ends = {
  'll': 'will',
  // 'd': 'would',
  've': 'have',
  're': 'are',
  'm': 'am',
  'n\'t': 'not'
//these ones are a bit tricksier:
// 't': 'not',
// 's': 'is' //or was
};



//unambiguous contractions, like "'ll"
const easyOnes = (ts) => {
  for(let i = 0; i < ts.terms.length; i++) {
    //skip existing
    if (ts.terms[i].silent_term) {
      continue;
    }
    let parts = split(ts.terms[i]);
    if (parts) {

      //make sure its an easy one
      if (easy_ends[parts.end]) {
        let arr = [
          parts.start,
          easy_ends[parts.end]
        ];
        ts = fix(ts, arr, i);
        i += 1;
      }

      //handle i'd -> 'i would' vs 'i had'
      if (parts.end === 'd') {
        //assume 'would'
        let arr = [
          parts.start,
          'would'
        ];
        //if next verb is past-tense, choose 'had'
        if (ts.terms[i + 1] && ts.terms[i + 1].tags.PastTense) {
          arr[1] = 'had';
        }
        //also support '#Adverb #PastTense'
        if (ts.terms[i + 2] && ts.terms[i + 2].tags.PastTense && ts.terms[i + 1].tags.Adverb) {
          arr[1] = 'had';
        }
        ts = fix(ts, arr, i);
        i += 1;
      }

    }
  }
  return ts;
};
var _03EasyOnes = easyOnes;

const numberRange = (ts) => {
  for(let i = 0; i < ts.terms.length; i++) {
    let t = ts.terms[i];
    //skip existing
    if (t.silent_term) {
      continue;
    }
    //hyphens found in whitespace - '5 - 7'
    if (t.tags.Value && i > 0 && t.whitespace.before === ' - ') {
      let to = new index$26('');
      to.silent_term = 'to';
      ts.insertAt(i, to);
      ts.terms[i - 1].tag('NumberRange');
      ts.terms[i].tag('NumberRange');
      ts.terms[i].whitespace.before = '';
      ts.terms[i].whitespace.after = '';
      ts.terms[i + 1].tag('NumberRange');
      return ts;
    }
    if (t.tags.NumberRange) {
      let arr = t.text.split(/(-)/);
      arr[1] = 'to';
      ts = fix(ts, arr, i);
      ts.terms[i].tag('NumberRange');
      ts.terms[i + 1].tag('NumberRange');
      ts.terms[i + 2].tag('NumberRange');
      i += 2;
    }
  }
  return ts;
};
var _04NumberRange = numberRange;

//find and pull-apart contractions
const interpret = function(ts) {
  //check irregulars
  ts = _01Irregulars(ts);
  //guess-at ambiguous "'s" one
  ts = _02HardOne(ts);
  //check easy ones
  ts = _03EasyOnes(ts);
  //5-7
  ts = _04NumberRange(ts);
  return ts;
};

var index$24 = interpret;

//mostly pos-corections here
const corrections$1 = function (ts) {

  //ambig prepositions/conjunctions
  if (ts.has('so')) {
    //so funny
    ts.match('so #Adjective').match('so').tag('Adverb', 'so-adv');
    //so the
    ts.match('so #Noun').match('so').tag('Conjunction', 'so-conj');
    //do so
    ts.match('do so').match('so').tag('Noun', 'so-noun');
  }

  //Determiner-signals
  if (ts.has('#Determiner')) {
    //the wait to vote
    ts.match('the #Verb #Preposition .').match('#Verb').tag('Noun', 'correction-determiner1');
    //the swim
    ts.match('the #Verb').match('#Verb').tag('Noun', 'correction-determiner2');
    //the nice swim
    ts.match('the #Adjective #Verb').match('#Verb').tag('Noun', 'correction-determiner3');
    //the truly nice swim
    ts.match('the #Adverb #Adjective #Verb').match('#Verb').tag('Noun', 'correction-determiner4');
    //a stream runs
    ts.match('#Determiner #Infinitive #Adverb? #Verb').term(1).tag('Noun', 'correction-determiner5');
    //a sense of
    ts.match('#Determiner #Verb of').term(1).tag('Noun', 'the-verb-of');
    //the threat of force
    ts.match('#Determiner #Noun of #Verb').match('#Verb').tag('Noun', 'noun-of-noun');
  }

  //like
  if (ts.has('like')) {
    ts.match('just like').term(1).tag('Preposition', 'like-preposition');
    //folks like her
    ts.match('#Noun like #Noun').term(1).tag('Preposition', 'noun-like');
    //look like
    ts.match('#Verb like').term(1).tag('Adverb', 'verb-like');
    //exactly like
    ts.match('#Adverb like').term(1).tag('Adverb', 'adverb-like');
  }

  if (ts.has('#Value')) {
    //half a million
    ts.match('half a? #Value').tag('Value', 'half-a-value'); //quarter not ready
    ts.match('#Value and a (half|quarter)').tag('Value', 'value-and-a-half');
    //all values are either ordinal or cardinal
    ts.match('#Value').match('!#Ordinal').tag('#Cardinal', 'not-ordinal');
    //money
    ts.match('#Value+ #Currency').tag('Money', 'value-currency');
    ts.match('#Money and #Money #Currency?').tag('Money', 'money-and-money');
  }

  if (ts.has('#Noun')) {
    //'more' is not always an adverb
    ts.match('more #Noun').tag('Noun', 'more-noun');
    //the word 'second'
    ts.match('second #Noun').term(0).unTag('Unit').tag('Ordinal', 'second-noun');
    //he quickly foo
    ts.match('#Noun #Adverb #Noun').term(2).tag('Verb', 'correction');
    //my buddy
    ts.match('#Possessive #FirstName').term(1).unTag('Person', 'possessive-name');
    //organization
    if (ts.has('#Organization')) {
      ts.match('#Organization of the? #TitleCase').tag('Organization', 'org-of-place');
      ts.match('#Organization #Country').tag('Organization', 'org-country');
      ts.match('(world|global|international|national|#Demonym) #Organization').tag('Organization', 'global-org');
    }
  }

  if (ts.has('#Verb')) {
    //still make
    ts.match('still #Verb').term(0).tag('Adverb', 'still-verb');
    //'u' as pronoun
    ts.match('u #Verb').term(0).tag('Pronoun', 'u-pronoun-1');
    //is no walk
    ts.match('is no #Verb').term(2).tag('Noun', 'is-no-verb');
    //different views than
    ts.match('#Verb than').term(0).tag('Noun', 'correction');
    //her polling
    ts.match('#Possessive #Verb').term(1).tag('Noun', 'correction-possessive');
    //is eager to go
    ts.match('#Copula #Adjective to #Verb').match('#Adjective to').tag('Verb', 'correction');
    //the word 'how'
    ts.match('how (#Copula|#Modal|#PastTense)').term(0).tag('QuestionWord', 'how-question');
    //support a splattering of auxillaries before a verb
    let advb = '(#Adverb|not)+?';
    if (ts.has(advb)) {
      //had walked
      ts.match(`(has|had) ${advb} #PastTense`).not('#Verb$').tag('Auxiliary', 'had-walked');
      //was walking
      ts.match(`#Copula ${advb} #Gerund`).not('#Verb$').tag('Auxiliary', 'copula-walking');
      //been walking
      ts.match(`(be|been) ${advb} #Gerund`).not('#Verb$').tag('Auxiliary', 'be-walking');
      //would walk
      ts.match(`(#Modal|did) ${advb} #Verb`).not('#Verb$').tag('Auxiliary', 'modal-verb');
      //would have had
      ts.match(`#Modal ${advb} have ${advb} had ${advb} #Verb`).not('#Verb$').tag('Auxiliary', 'would-have');
      //would be walking
      ts.match(`(#Modal) ${advb} be ${advb} #Verb`).not('#Verb$').tag('Auxiliary', 'would-be');
      //would been walking
      ts.match(`(#Modal|had|has) ${advb} been ${advb} #Verb`).not('#Verb$').tag('Auxiliary', 'would-be');
    //infinitive verbs suggest plural nouns - 'XYZ walk to the store'
    // r.match(`#Singular+ #Infinitive`).match('#Singular+').tag('Plural', 'infinitive-make-plural');
    }
  }

  if (ts.has('#Adjective')) {
    //still good
    ts.match('still #Adjective').match('still').tag('Adverb', 'still-advb');
    //big dreams, critical thinking
    ts.match('#Adjective #PresentTense').term(1).tag('Noun', 'adj-presentTense');
    //will secure our
    ts.match('will #Adjective').term(1).tag('Verb', 'will-adj');
  }

  //misc:
  //foot/feet
  ts.match('(foot|feet)').tag('Noun', 'foot-noun');
  ts.match('#Value (foot|feet)').term(1).tag('Unit', 'foot-unit');
  //'u' as pronoun
  ts.match('#Conjunction u').term(1).tag('Pronoun', 'u-pronoun-2');
  //FitBit Inc
  ts.match('#TitleCase (ltd|co|inc|dept|assn|bros)').tag('Organization', 'org-abbrv');
  //'a/an' can mean 1
  ts.match('(a|an) (#Duration|#Value)').ifNo('#Plural').term(0).tag('Value', 'a-is-one');
  //swear-words as non-expression POS
  //nsfw
  ts.match('holy (shit|fuck|hell)').tag('Expression', 'swears-expression');
  ts.match('#Determiner (shit|damn|hell)').term(1).tag('Noun', 'swears-noun');
  ts.match('(shit|damn|fuck) (#Determiner|#Possessive|them)').term(0).tag('Verb', 'swears-verb');
  ts.match('#Copula fucked up?').not('#Copula').tag('Adjective', 'swears-adjective');

  return ts;
};

var index$36 = corrections$1;

//
const conditionPass = function(r) {
  //'if it really goes, I will..'
  let m = r.match('#Condition {1,7} #ClauseEnd');
  //make sure it ends on a comma
  if (m.found && m.match('#Comma$')) {
    m.tag('ConditionPhrase');
  }
  //'go a bit further, if it then has a pronoun
  m = r.match('#Condition {1,13} #ClauseEnd #Pronoun');
  if (m.found && m.match('#Comma$')) {
    m.not('#Pronoun$').tag('ConditionPhrase', 'end-pronoun');
  }
  //if it goes then ..
  m = r.match('#Condition {1,7} then');
  if (m.found) {
    m.not('then$').tag('ConditionPhrase', 'cond-then');
  }
  //at the end of a sentence:
  //'..., if it really goes.'
  m = r.match('#Comma #Condition {1,7} .$');
  if (m.found) {
    m.not('^#Comma').tag('ConditionPhrase', 'comma-7-end');
  }
  // '... if so.'
  m = r.match('#Condition {1,4}$');
  if (m.found) {
    m.tag('ConditionPhrase', 'cond-4-end');
  }
  return r;
};

var _00ConditionPass = conditionPass;

// const verbPhrase = require('./01-verbPhrase');
// const nounPhrase = require('./02-nounPhrase');
// const AdjectivePhrase = require('./03-adjectivePhrase');
//
const phraseTag = function (Text) {
  Text = _00ConditionPass(Text);
  // Text = verbPhrase(Text);
  // Text = nounPhrase(Text);
  // Text = AdjectivePhrase(Text);
  return Text;
};

var index$38 = phraseTag;

//the steps and processes of pos-tagging
const step = {
  punctuation_step: _01Punctuation_step,
  lexicon_step: _02Lexicon_step,
  capital_step: _03Capital_step,
  web_step: _04Web_step,
  suffix_step: _05Suffix_step,
  neighbour_step: _06Neighbour_step,
  noun_fallback: _07Noun_fallback,
  date_step: _08Date_step,
  auxiliary_step: _09Auxiliary_step,
  negation_step: _10Negation_step,
  phrasal_step: _12Phrasal_step,
  comma_step: _13Comma_step,
  possessive_step: _14Possessive_step,
  value_step: _15Value_step,
  acronym_step: _16Acronym_step,
  emoji_step: _17Emoji_step,
  person_step: _18Person_step,
  quotation_step: _19Quotation_step,
  organization_step: _20Organization_step,
  plural_step: _21Plural_step,

  lumper : index$22,
  lexicon_lump : lexicon_lump_1,
  contraction: index$24
};



const tagger = function (ts) {
  ts = step.punctuation_step(ts);
  ts = step.emoji_step(ts);
  ts = step.lexicon_step(ts);
  ts = step.lexicon_lump(ts);
  ts = step.web_step(ts);
  ts = step.suffix_step(ts);
  ts = step.neighbour_step(ts);
  ts = step.capital_step(ts);
  ts = step.noun_fallback(ts);
  ts = step.contraction(ts);
  ts = step.date_step(ts); //3ms
  ts = step.auxiliary_step(ts);
  ts = step.negation_step(ts);
  ts = step.phrasal_step(ts);
  ts = step.comma_step(ts);
  ts = step.possessive_step(ts);
  ts = step.value_step(ts);
  ts = step.acronym_step(ts);
  ts = step.person_step(ts); //1ms
  ts = step.quotation_step(ts);
  ts = step.organization_step(ts);
  ts = step.plural_step(ts);
  ts = step.lumper(ts);
  ts = index$36(ts); //2ms
  ts = index$38(ts);
  return ts;
};

var index$6 = tagger;

const hasHyphen = /^([a-z]+)(-)([a-z0-9].*)/i;
const wordlike = /\S/;

const notWord = {
  '-': true,
  '–': true,
  '--': true,
  '...': true,
};

//turn a string into an array of terms (naiive for now, lumped later)
const fromString$1 = function (str) {
  let result = [];
  let arr = [];
  //start with a naiive split
  str = str || '';
  if (typeof str === 'number') {
    str = '' + str;
  }
  const firstSplit = str.split(/(\S+)/);
  for(let i = 0; i < firstSplit.length; i++) {
    const word = firstSplit[i];
    if (hasHyphen.test(word) === true) {
      //support multiple-hyphenated-terms
      const hyphens = word.split('-');
      for(let o = 0; o < hyphens.length; o++) {
        if (o === hyphens.length - 1) {
          arr.push(hyphens[o]);
        } else {
          arr.push(hyphens[o] + '-');
        }
      }
    } else {
      arr.push(word);
    }
  }
  //greedy merge whitespace+arr to the right
  let carry = '';
  for (let i = 0; i < arr.length; i++) {
    //if it's more than a whitespace
    if (wordlike.test(arr[i]) === true && notWord[arr[i]] === undefined) {
      result.push(carry + arr[i]);
      carry = '';
    } else {
      carry += arr[i];
    }
  }
  //handle last one
  if (carry && result.length > 0) {
    result[result.length - 1] += carry; //put it on the end
  }
  return result.map((t) => new index$26(t));
};
var build$3 = fromString$1;

var paths$6 = {
  data: index$10,
  lexicon: index$10,
  fns: fns$1,
  Term: index$26
};

var paths$4 = paths$6;

// parse a search lookup term find the regex-like syntax in this term
const fns$9 = paths$4.fns;

//trim char#0
const noFirst = function(str) {
  return str.substr(1, str.length);
};
const noLast = function(str) {
  return str.substring(0, str.length - 1);
};

//turn 'regex-like' search string into parsed json
const parse_term = function (term) {
  term = term || '';
  term = term.trim();
  let reg = {};
  //order matters here

  //negation ! flag
  if (term.charAt(0) === '!') {
    term = noFirst(term);
    reg.negative = true;
  }
  //leading ^ flag
  if (term.charAt(0) === '^') {
    term = noFirst(term);
    reg.starting = true;
  }
  //trailing $ flag means ending
  if (term.charAt(term.length - 1) === '$') {
    term = noLast(term);
    reg.ending = true;
  }
  //optional flag
  if (term.charAt(term.length - 1) === '?') {
    term = noLast(term);
    reg.optional = true;
  }
  //atleast-one-but-greedy flag
  if (term.charAt(term.length - 1) === '+') {
    term = noLast(term);
    reg.consecutive = true;
  }
  //pos flag
  if (term.charAt(0) === '#') {
    term = noFirst(term);
    reg.tag = fns$9.titleCase(term);
    term = '';
  }
  //one_of options flag
  if (term.charAt(0) === '(' && term.charAt(term.length - 1) === ')') {
    term = noLast(term);
    term = noFirst(term);
    let arr = term.split(/\|/g);
    reg.oneOf = {
      terms: {},
      tagArr: [],
    };
    arr.forEach((str) => {
      //try a tag match
      if (str.charAt(0) === '#') {
        let tag = str.substr(1, str.length);
        tag = fns$9.titleCase(tag);
        reg.oneOf.tagArr.push(tag);
      } else {
        reg.oneOf.terms[str] = true;
      }
    });
    term = '';
  }
  //min/max any '{1,3}'
  if (term.charAt(0) === '{' && term.charAt(term.length - 1) === '}') {
    let m = term.match(/\{([0-9]+), ?([0-9]+)\}/);
    reg.minMax = {
      min: parseInt(m[1], 10),
      max: parseInt(m[2], 10)
    };
    term = '';
  }
  //a period means any one term
  if (term === '.') {
    reg.anyOne = true;
    term = '';
  }
  //a * means anything until sentence end
  if (term === '*') {
    reg.astrix = true;
    term = '';
  }
  if (term !== '') {
    reg.normal = term.toLowerCase();
  }
  return reg;
};

//turn a match string into an array of objects
const parse_all = function (reg) {
  reg = reg || '';
  reg = reg.split(/ +/);
  return reg.map(parse_term);
};
// console.log(parse_all(''));

var syntax = parse_all;

//compare 1 term to one reg
const perfectMatch = (term, reg) => {
  if (!term || !reg) {
    return false;
  }
  //support '.' - any
  if (reg.anyOne === true) {
    return true;
  }
  //pos-match
  if (reg.tag !== undefined) {
    return term.tags[reg.tag];
  }
  //text-match
  if (reg.normal !== undefined) {
    return reg.normal === term.normal || reg.normal === term.silent_term;
  }
  //one-of term-match
  if (reg.oneOf !== undefined) {
    for(let i = 0; i < reg.oneOf.tagArr.length; i++) {
      if (term.tags[reg.oneOf.tagArr[i]] === true) {
        return true;
      }
    }
    return reg.oneOf.terms[term.normal] || reg.oneOf.terms[term.silent_term];
  }
  return false;
};

//wrap above method, to support '!' negation
const isMatch = (term, reg, verbose) => {
  let found = perfectMatch(term, reg, verbose);
  if (reg.negative) {
    found = !!!found;
  }
  return found;
};
var isMatch_1 = isMatch;

// const lumpMatch = require('./lumpMatch');


// match everything until this point - '*'
const greedyUntil = (ts, i, reg) => {
  for (i = i; i < ts.length; i++) {
    if (isMatch_1(ts.terms[i], reg)) {
      return i;
    }
  }
  return null;
};

//keep matching this reg as long as possible
const greedyOf = (ts, i, reg, until) => {
  for (i = i; i < ts.length; i++) {
    let t = ts.terms[i];
    //found next reg ('until')
    if (until && isMatch_1(t, until)) {
      return i;
    }
    //stop here
    if (!isMatch_1(t, reg)) {
      return i;
    }
  }
  return i;
};

//try and match all regs, starting at this term
const startHere = (ts, startAt, regs, verbose) => {
  let term_i = startAt;
  //check each regex-thing
  for (let reg_i = 0; reg_i < regs.length; reg_i++) {
    let term = ts.terms[term_i];
    let reg = regs[reg_i];
    let next_reg = regs[reg_i + 1];

    if (!term) {
      //we didn't need it anyways
      if (reg.optional === true) {
        continue;
      }
      return null;
    }

    //catch '^' errors
    if (reg.starting === true && term_i > 0) {
      return null;
    }

    //catch '$' errors
    if (reg.ending === true && term_i !== ts.length - 1 && !reg.minMax) {
      return null;
    }

    //support '*'
    if (regs[reg_i].astrix === true) {
      //just grab until the end..
      if (!next_reg) {
        return ts.terms.slice(startAt, ts.length);
      }
      let foundAt = greedyUntil(ts, term_i, regs[reg_i + 1]);
      if (!foundAt) {
        return null;
      }
      term_i = foundAt + 1;
      reg_i += 1;
      continue;
    }

    //support '{x,y}'
    if (regs[reg_i].minMax !== undefined) {
      //on last reg?
      if (!next_reg) {
        let len = ts.length;
        let max = regs[reg_i].minMax.max + startAt;
        //if it must go to the end, but can't
        if (regs[reg_i].ending && max < len) {
          return null;
        }
        //dont grab past the end
        if (max < len) {
          len = max;
        }
        return ts.terms.slice(startAt, len);
      }
      //otherwise, match until this next thing
      let foundAt = greedyUntil(ts, term_i, next_reg);
      if (!foundAt) {
        return null;
      }
      //if it's too close/far..
      let minMax = regs[reg_i].minMax;
      if (foundAt < minMax.min || foundAt > minMax.max) {
        return null;
      }
      term_i = foundAt + 1;
      reg_i += 1;
      continue;
    }

    //if optional, check next one
    if (reg.optional === true) {
      let until = regs[reg_i + 1];
      term_i = greedyOf(ts, term_i, reg, until);
      continue;
    }

    //check a perfect match
    if (isMatch_1(term, reg, verbose)) {
      term_i += 1;
      //try to greedy-match '+'
      if (reg.consecutive === true) {
        let until = regs[reg_i + 1];
        term_i = greedyOf(ts, term_i, reg, until);
      }
      continue;
    }

    if (term.silent_term && !term.normal) { //skip over silent contraction terms
      //we will continue on it, but not start on it
      if (reg_i === 0) {
        return null;
      }
      //try the next term, but with this regex again
      term_i += 1;
      reg_i -= 1;
      continue;
    }

    //handle partial-matches of lumped terms
    // let lumpUntil = lumpMatch(term, regs, reg_i);
    // if (lumpUntil) {
    //   reg_i = lumpUntil;
    //   term_i += 1;
    //   continue;
    // }


    //was it optional anways?
    if (reg.optional === true) {
      continue;
    }
    return null;
  }
  return ts.terms.slice(startAt, term_i);
};

var startHere_1 = startHere;

//
//find easy reasons to skip running the full match on this
const fastPass = (ts, regs) => {
  for(let i = 0; i < regs.length; i++) {
    let reg = regs[i];
    let found = false;
    if (reg.optional === true || reg.negative === true) {
      continue;
    }
    //look-for missing term-matches
    if (reg.normal !== undefined) {
      for(let o = 0; o < ts.terms.length; o++) {
        if (ts.terms[o].normal === reg.normal || ts.terms[o].silent_term === reg.normal) {
          found = true;
          break;
        }
      }
      if (found === false) {
        return true;
      }
    }
    //look for missing tags
    if (reg.tag !== undefined) {
      for(let o = 0; o < ts.terms.length; o++) {
        if (ts.terms[o].tags[reg.tag] === true) {
          found = true;
          break;
        }
      }
      if (found === false) {
        return true;
      }
    }
  }
  return false;
};
var fastPass_1 = fastPass;

//
const match = (ts, reg, verbose) => {
  //parse for backwards-compatibility
  if (typeof reg === 'string') {
    reg = syntax(reg);
  }
  if (!reg || reg.length === 0) {
    return [];
  }
  //do a fast-pass for easy negatives
  if (fastPass_1(ts, reg, verbose) === true) {
    return [];
  }
  //ok, start long-match
  let matches = [];
  for (let t = 0; t < ts.terms.length; t++) {
    //don't loop through if '^'
    if (t > 0 && reg[0] && reg[0].starting) {
      break;
    }
    let m = startHere_1(ts, t, reg, verbose);
    if (m) {
      matches.push(m);
      //ok, don't try to match these again.
      let skip = m.length - 1;
      t += skip; //this could use some work
    }
  }
  return matches;
};
var index$42 = match;

const matchMethods = (Terms) => {

  const methods = {

    //support regex-like whitelist-match
    match: function (reg, verbose) {
      //fail-fast #1
      if (this.terms.length === 0) {
        return new index$2([], this.lexicon, this.parent);
      }
      //fail-fast #2
      if (!reg) {
        return new index$2([], this.lexicon, this.parent);
      }
      let matches = index$42(this, reg, verbose);
      matches = matches.map((a) => {
        return new Terms(a, this.lexicon, this.refText, this.refTerms);
      });
      return new index$2(matches, this.lexicon, this.parent);
    },

    /**return first match */
    matchOne: function (str) {
      //fail-fast
      if (this.terms.length === 0) {
        return null;
      }
      let regs = syntax(str);
      for (let t = 0; t < this.terms.length; t++) {
        //don't loop through if '^'
        if (regs[0] && regs[0].starting && t > 0) {
          break;
        }
        let m = startHere_1(this, t, regs);
        if (m) {
          return m;
        }
      }
      return null;
    },

    /**return first match */
    has: function (str) {
      return this.matchOne(str) !== null;
    }

  };

  //hook them into result.proto
  Object.keys(methods).forEach((k) => {
    Terms.prototype[k] = methods[k];
  });
  return Terms;
};

var index$40 = matchMethods;

//these methods are simply term-methods called in a loop

const addMethods$6 = (Terms) => {

  const foreach = [
    ['tag'],
    ['unTag'],
    // ['canBe'],
    ['toUpperCase', 'UpperCase'],
    ['toLowerCase'],
    ['toTitleCase', 'TitleCase'],
  // ['toCamelCase', 'CamelCase'],
  ];

  foreach.forEach((arr) => {
    let k = arr[0];
    let tag = arr[1];
    let myFn = function () {
      let args = arguments;
      this.terms.forEach((t) => {
        t[k].apply(t, args);
      });
      if (tag) {
        this.tag(tag, k);
      }
      return this;
    };
    Terms.prototype[k] = myFn;
  });
  return Terms;
};

var loops = addMethods$6;

//




const addfns = (Terms) => {

  const fns = {
    //blacklist from a {word:true} object
    notObj: function(r, obj) {
      let matches = [];
      let current = [];
      r.terms.forEach((t) => { //TODO: support multi-word blacklists
        //we should blacklist this term
        if (obj.hasOwnProperty(t.normal)) {
          if (current.length) {
            matches.push(current);
          }
          current = [];
        } else {
          current.push(t);
        }
      });
      //add remainder
      if (current.length) {
        matches.push(current);
      }
      matches = matches.map((a) => {
        return new Terms(a, r.lexicon, r.refText, r.refTerms);
      });
      return new index$2(matches, r.lexicon, r.parent);
    },

    //blacklist from a match string
    notString : function(r, want, verbose) {
      let matches = [];
      let regs = syntax(want);
      let terms = [];
      //try the match starting from each term
      for(let i = 0; i < r.terms.length; i++) {
        let bad = startHere_1(r, i, regs, verbose);
        if (bad) {
          //reset matches
          if (terms.length > 0) {
            matches.push(terms);
            terms = [];
          }
          //skip these terms now
          i += bad.length - 1;
          continue;
        }
        terms.push(r.terms[i]);
      }
      //remaining ones
      if (terms.length > 0) {
        matches.push(terms);
      }
      matches = matches.map((a) => {
        return new Terms(a, r.lexicon, r.refText, r.refTerms);
      });
      // return matches
      return new index$2(matches, r.lexicon, r.parent);
    }
  };
  //blacklist from a [word, word] array
  fns.notArray = function(r, arr) {
    let obj = arr.reduce((h, a) => {
      h[a] = true;
      return h;
    }, {});
    return fns.notObj(r, obj);
  };

  /**return everything but these matches*/
  Terms.prototype.not = function(want, verbose) {
    //support [word, word] blacklist
    if (typeof want === 'object') {
      let type = Object.prototype.toString.call(want);
      if (type === '[object Array]') {
        return fns.notArray(this, want, verbose);
      }
      if (type === '[object Object]') {
        return fns.notObj(this, want, verbose);
      }
    }
    if (typeof want === 'string') {
      return fns.notString(this, want, verbose);
    }
    return this;
  };
  return Terms;
};

var not = addfns;

//
const getTerms = (needle) => {
  let arr = [];
  if (needle.isA === 'Terms') {
    arr = needle.terms;
  } else if (needle.isA === 'Text') {
    arr = needle.flatten().list[0].terms;
  } else if (needle.isA === 'Term') {
    arr = [needle];
  }
  return arr;
};

//remove them
var deleteThese = (source, needle) => {
  let arr = getTerms(needle);
  source.terms = source.terms.filter((t) => {
    for (let i = 0; i < arr.length; i++) {
      if (t === arr[i]) {
        return false;
      }
    }
    return true;
  });
  return source;
};

//add them
var insertAt = (terms, i, needle) => {
  needle.dirty = true;
  let arr = getTerms(needle);
  //handle whitespace
  if (i > 0 && arr[0] && !arr[0].whitespace.before) {
    arr[0].whitespace.before = ' ';
  }
  //gnarly splice
  //-( basically  - terms.splice(i+1, 0, arr) )
  Array.prototype.splice.apply(terms, [i, 0].concat(arr));
  return terms;
};

var mutate = {
	deleteThese: deleteThese,
	insertAt: insertAt
};

const addMethod = (Terms) => {

  //hook it into Terms.proto
  Terms.prototype.delete = function (reg) {
    //don't touch parent if empty
    if (!this.found) {
      return this;
    }
    //remove all selected
    if (!reg) {
      this.parentTerms = mutate.deleteThese(this.parentTerms, this);
      return this;
    }
    //only remove a portion of this
    let found = this.match(reg);
    if (found.found) {
      let r = mutate.deleteThese(this, found);
      return r;
    }
    return this.parentTerms;
  };

  return Terms;
};

var _delete = addMethod;

//whitespace
const addSpaceAt = (ts, i) => {
  if (!ts.terms.length || !ts.terms[i]) {
    return ts;
  }
  ts.terms[i].whitespace.before = ' ';
  return ts;
};

const insertMethods = (Terms) => {

  //accept any sorta thing
  const ensureTerms = function(input) {
    if (input.isA === 'Terms') {
      return input;
    }
    if (input.isA === 'Term') {
      return new Terms([input]);
    }
    let ts = Terms.fromString(input);
    ts.tagger();
    return ts;
  };

  const methods = {

    insertBefore: function (input, tag) {
      let original_l = this.terms.length;
      let ts = ensureTerms(input);
      if (tag) {
        ts.tag(tag);
      }
      let index = this.index();
      //pad a space on parent
      addSpaceAt(this.parentTerms, index);
      if (index > 0) {
        addSpaceAt(ts, 0); //if in middle of sentence
      }
      this.parentTerms.terms = mutate.insertAt(this.parentTerms.terms, index, ts);
      //also copy them to current selection
      if (this.terms.length === original_l) {
        this.terms = ts.terms.concat(this.terms);
      }
      return this;
    },

    insertAfter: function (input, tag) {
      let original_l = this.terms.length;
      let ts = ensureTerms(input);
      if (tag) {
        ts.tag(tag);
      }
      let index = this.terms[this.terms.length - 1].index();
      //beginning whitespace to ts
      addSpaceAt(ts, 0);
      this.parentTerms.terms = mutate.insertAt(this.parentTerms.terms, index + 1, ts);
      //also copy them to current selection
      if (this.terms.length === original_l) {
        this.terms = this.terms.concat(ts.terms);
      }
      return this;
    },

    insertAt: function (index, input, tag) {
      if (index < 0) {
        index = 0;
      }
      let original_l = this.terms.length;
      let ts = ensureTerms(input);
      //tag that thing too
      if (tag) {
        ts.tag(tag);
      }
      if (index > 0) {
        addSpaceAt(ts, 0); //if in middle of sentence
      }
      this.parentTerms.terms = mutate.insertAt(this.parentTerms.terms, index, ts);
      //also copy them to current selection
      if (this.terms.length === original_l) {
        //splice the new terms into this (yikes!)
        Array.prototype.splice.apply(this.terms, [index, 0].concat(ts.terms));
      }
      //beginning whitespace to ts
      if (index === 0) {
        this.terms[0].whitespace.before = '';
        ts.terms[ts.terms.length - 1].whitespace.after = ' ';
      }
      return this;
    }

  };

  //hook them into result.proto
  Object.keys(methods).forEach((k) => {
    Terms.prototype[k] = methods[k];
  });
  return Terms;
};

var insert = insertMethods;

const miscMethods = (Terms) => {

  const methods = {
    term: function (n) {
      return this.terms[n];
    },
    first: function () {
      let t = this.terms[0];
      return new Terms([t], this.lexicon, this.refText, this.refTerms);
    },
    last: function () {
      let t = this.terms[this.terms.length - 1];
      return new Terms([t], this.lexicon, this.refText, this.refTerms);
    },
    slice: function (start, end) {
      let terms = this.terms.slice(start, end);
      return new Terms(terms, this.lexicon, this.refText, this.refTerms);
    },
    endPunctuation: function () {
      return this.last().terms[0].endPunctuation();
    },
    index: function() {
      let parent = this.parentTerms;
      let first = this.terms[0];
      if (!parent || !first) {
        return null; //maybe..
      }
      for(let i = 0; i < parent.terms.length; i++) {
        if (first === parent.terms[i]) {
          return i;
        }
      }
      return null;
    },
    termIndex: function() {
      let first = this.terms[0];
      let ref = this.refText || this;
      if (!ref || !first) {
        return null; //maybe..
      }
      // console.log(ref);
      let n = 0;
      for(let i = 0; i < ref.list.length; i++) {
        let ts = ref.list[i];
        for(let o = 0; o < ts.terms.length; o++) {
          if (ts.terms[o] === first) {
            return n;
          }
          n += 1;
        }
      }
      return n;
    },
    //number of characters in this match
    chars: function() {
      return this.terms.reduce((i, t) => {
        i += t.whitespace.before.length;
        i += t.text.length;
        i += t.whitespace.after.length;
        return i;
      }, 0);
    },
    //just .length
    wordCount: function() {
      return this.terms.length;
    },

    //which terms are consistent with this tag
    canBe: function (tag) {
      let terms = this.terms.filter((t) => t.canBe(tag));
      return new Terms(terms, this.lexicon, this.refText, this.refTerms);
    },

    //this has term-order logic, so has to be here
    toCamelCase: function() {
      this.toTitleCase();
      this.terms.forEach((t, i) => {
        if (i !== 0) {
          t.whitespace.before = '';
        }
        t.whitespace.after = '';
      });
      this.tag('#CamelCase', 'toCamelCase');
      return this;
    }
  };

  //hook them into result.proto
  Object.keys(methods).forEach((k) => {
    Terms.prototype[k] = methods[k];
  });
  return Terms;
};

var misc$7 = miscMethods;

const fns$10 = paths$6.fns;

const methods$2 = {
  text: function (ts) {
    return ts.terms.reduce((str, t) => {
      str += t.out('text');
      return str;
    }, '');
  },

  normal: function (ts) {
    let terms = ts.terms.filter((t) => {
      return t.text;
    });
    terms = terms.map((t) => {
      return t.normal; //+ punct;
    });
    return terms.join(' ');
  },

  grid: function(ts) {
    var str = '  ';
    str += ts.terms.reduce((s, t) => {
      s += fns$10.leftPad(t.text, 11);
      return s;
    }, '');
    return str + '\n\n';
  },

  color: function(ts) {
    return ts.terms.reduce((s, t) => {
      s += fns$10.printTerm(t);
      return s;
    }, '');
  },
  /** no punctuation, fancy business **/
  root: function (ts) {
    return ts.terms.filter((t) => t.text).map((t) => t.root).join(' ').toLowerCase();
  },

  html: function (ts) {
    return ts.terms.map((t) => t.render.html()).join(' ');
  },
  debug: function(ts) {
    ts.terms.forEach((t) => {
      t.out('debug');
    });
  }
};
methods$2.plaintext = methods$2.text;
methods$2.normalize = methods$2.normal;
methods$2.normalized = methods$2.normal;
methods$2.colors = methods$2.color;
methods$2.tags = methods$2.terms;


const renderMethods = (Terms) => {
  Terms.prototype.out = function(str) {
    if (methods$2[str]) {
      return methods$2[str](this);
    }
    return methods$2.text(this);
  };
  //check method
  Terms.prototype.debug = function () {
    return methods$2.debug(this);
  };
  return Terms;
};

var out$1 = renderMethods;

const replaceMethods = (Terms) => {
  const methods = {

    /**swap this for that */
    replace: function (str1, str2) {
      //in this form, we 'replaceWith'
      if (str2 === undefined) {
        return this.replaceWith(str1);
      }
      this.match(str1).replaceWith(str2);
      return this;
    },


    /**swap this for that */
    replaceWith: function (str, tag) {
      let toAdd = Terms.fromString(str);
      toAdd.tagger();
      if (tag) {
        toAdd.tag(tag, 'user-given');
      }
      let index = this.index();
      this.parentTerms = mutate.deleteThese(this.parentTerms, this);
      this.parentTerms.terms = mutate.insertAt(this.parentTerms.terms, index, toAdd);
      this.terms = toAdd.terms;
      return this;
    }

  };

  //hook them into result.proto
  Object.keys(methods).forEach((k) => {
    Terms.prototype[k] = methods[k];
  });
  return Terms;
};

var replace = replaceMethods;

var split$3 = createCommonjsModule(function (module, exports) {
'use strict';

//break apart a termlist into (before, match after)
const breakUpHere = (terms, ts) => {
  let firstTerm = ts.terms[0];
  let len = ts.terms.length;
  for (let i = 0; i < terms.length; i++) {
    if (terms[i] === firstTerm) {
      return {
        before: terms.slice(0, i),
        match: terms.slice(i, i + len),
        after: terms.slice(i + len, terms.length),
      };
    }
  }
  return {
    after: terms
  };
};

const splitMethods = (Terms) => {

  const methods = {

    /** at the end of the match, split the terms **/
    splitAfter: function (reg, verbose) {
      let ms = this.match(reg, verbose); //Array[ts]
      let termArr = this.terms;
      let all = [];
      ms.list.forEach((lookFor) => {
        let section = breakUpHere(termArr, lookFor);
        if (section.before && section.match) {
          all.push(section.before.concat(section.match));
        }
        termArr = section.after;
      });
      //add the remaining
      if (termArr.length) {
        all.push(termArr);
      }
      //make them termlists
      all = all.map((ts) => {
        let parent = this.refText; //|| this;
        return new Terms(ts, this.lexicon, parent, this.refTerms);
      });
      return all;
    },

    /** return only before & after  the match**/
    splitOn: function (reg, verbose) {
      let ms = this.match(reg, verbose); //Array[ts]
      let termArr = this.terms;
      let all = [];
      ms.list.forEach((lookFor) => {
        let section = breakUpHere(termArr, lookFor);
        if (section.before) {
          all.push(section.before);
        }
        if (section.match) {
          all.push(section.match);
        }
        termArr = section.after;
      });
      //add the remaining
      if (termArr.length) {
        all.push(termArr);
      }
      //make them termlists
      all = all.filter(a => a && a.length);
      all = all.map((ts) => new Terms(ts, ts.lexicon, ts.refText, this.refTerms));
      return all;
    },

    /** at the start of the match, split the terms**/
    splitBefore: function (reg, verbose) {
      let ms = this.match(reg, verbose); //Array[ts]
      let termArr = this.terms;
      let all = [];
      ms.list.forEach((lookFor) => {
        let section = breakUpHere(termArr, lookFor);
        if (section.before) {
          all.push(section.before);
        }
        if (section.match) {
          all.push(section.match);
        }
        termArr = section.after;
      });
      //add the remaining
      if (termArr.length) {
        all.push(termArr);
      }
      //cleanup-step: merge all (middle) matches with the next one
      for (let i = 0; i < all.length; i++) {
        for (let o = 0; o < ms.length; o++) {
          if (ms.list[o].terms[0] === all[i][0]) {
            if (all[i + 1]) {
              all[i] = all[i].concat(all[i + 1]);
              all[i + 1] = [];
            }
          }
        }
      }
      //make them termlists
      all = all.filter(a => a && a.length);
      all = all.map((ts) => new Terms(ts, ts.lexicon, ts.refText, this.refTerms));
      return all;
    }

  };

  //hook them into result.proto
  Object.keys(methods).forEach((k) => {
    Terms.prototype[k] = methods[k];
  });
  return Terms;
};

module.exports = splitMethods;
exports = splitMethods;
});

const transforms$3 = (Terms) => {

  const methods = {

    clone: function () {
      let terms = this.terms.map((t) => {
        return t.clone();
      });
      return new Terms(terms, this.lexicon, this.refText, null); //, this.refTerms
    },
    hyphenate: function () {
      this.terms.forEach((t, i) => {
        if (i !== this.terms.length - 1) {
          t.whitespace.after = '-';
        }
        if (i !== 0) {
          t.whitespace.before = '';
        }
      });
      return this;
    },
    dehyphenate: function () {
      this.terms.forEach((t) => {
        if (t.whitespace.after === '-') {
          t.whitespace.after = ' ';
        }
      });
      return this;
    }
  };

  //hook them into result.proto
  Object.keys(methods).forEach((k) => {
    Terms.prototype[k] = methods[k];
  });
  return Terms;
};

var transform = transforms$3;

//merge two term objects.. carefully

const makeText = (a, b) => {
  let text = a.whitespace.before + a.text + a.whitespace.after;
  text += b.whitespace.before + b.text + b.whitespace.after;
  return text;
};

const combine = function(s, i) {
  let a = s.terms[i];
  let b = s.terms[i + 1];
  if (!b) {
    return;
  }
  let text = makeText(a, b);
  s.terms[i] = new index$26(text, a.context);
  s.terms[i].normal = a.normal + ' ' + b.normal;
  s.terms[i].parentTerms = s.terms[i + 1].parentTerms;
  s.terms[i + 1] = null;
  s.terms = s.terms.filter((t) => t !== null);
  return;
};

var combine_1 = combine;

//merge-together our current match into one term
const combineThem = function(ts, tags) {
  let len = ts.terms.length;
  for(let i = 0; i < len; i++) {
    combine_1(ts, 0);
  }
  let lumped = ts.terms[0];
  lumped.tags = tags;
  return lumped;
};

const lumpMethods = (Terms) => {

  Terms.prototype.lump = function () {
    //collect the tags up
    let index = this.index();
    let tags = {};
    this.terms.forEach((t) => {
      Object.keys(t.tags).forEach((tag) => tags[tag] = true);
    });
    //just lump the whole-thing together
    if (this.parentTerms === this) {
      let lumped = combineThem(this, tags);
      this.terms = [lumped];
      return this;
    }
    //otherwise lump just part of it. delete/insert.
    this.parentTerms = mutate.deleteThese(this.parentTerms, this);
    //merge-together our current match into one term
    let lumped = combineThem(this, tags);
    //put it back (in the same place)
    this.parentTerms.terms = mutate.insertAt(this.parentTerms.terms, index, lumped);
    return this;
  };

  return Terms;
};

var index$44 = lumpMethods;

class Terms$1 {
  constructor(arr, lexicon, refText, refTerms) {
    this.terms = arr;
    this.lexicon = lexicon;
    this.refText = refText;
    this._refTerms = refTerms;
    this._cacheWords = {};
    this.count = undefined;
    this.get = (n) => {
      return this.terms[n];
    };
  }
  get found() {
    return this.terms.length > 0;
  }
  get length() {
    return this.terms.length;
  }
  get isA() {
    return 'Terms';
  }
  get refTerms() {
    return this._refTerms || this;
  }
  set refTerms(ts) {
    this._refTerms = ts;
    return this;
  }
  set dirty(dirt) {
    this.terms.forEach((t) => {
      t.dirty = dirt;
    });
  }
  tagger() {
    index$6(this);
    return this;
  }
  firstTerm() {
    return this.terms[0];
  }
  lastTerm() {
    return this.terms[this.terms.length - 1];
  }
  get parent() {
    return this.refText || this;
  }
  set parent(r) {
    this.refText = r;
    return this;
  }
  get parentTerms() {
    return this.refTerms || this;
  }
  set parentTerms(r) {
    this.refTerms = r;
    return this;
  }
  all() {
    return this.parent;
  }
  data() {
    return {
      text: this.out('text'),
      normal: this.out('normal'),
    };
  }
  get whitespace() {
    return {
      before: (str) => {
        this.firstTerm().whitespace.before = str;
        return this;
      },
      after: (str) => {
        this.lastTerm().whitespace.after = str;
        return this;
      },
    };
  }

  static fromString(str, lexicon) {
    let termArr = build$3(str);
    let ts = new Terms$1(termArr, lexicon, null);
    //give each term a reference to this ts
    ts.terms.forEach((t) => {
      t.parentTerms = ts;
    });
    return ts;
  }
}
// Terms = require('./methods/lookup')(Terms);
index$40(Terms$1);
loops(Terms$1);
not(Terms$1);
_delete(Terms$1);
insert(Terms$1);
misc$7(Terms$1);
out$1(Terms$1);
replace(Terms$1);
split$3(Terms$1);
transform(Terms$1);
index$44(Terms$1);
var index$4 = Terms$1;

const genericMethods = (Text) => {

  const methods = {

    /**copy data properly so later transformations will have no effect*/
    clone: function () {
      let list = this.list.map((ts) => {
        return ts.clone();
      });
      return new Text(list); //this.lexicon, this.parent
    },

    /** get the nth term of each result*/
    term: function (n) {
      let list = this.list.map((ts) => {
        let arr = [];
        let el = ts.terms[n];
        if (el) {
          arr = [el];
        }
        return new index$4(arr, this.lexicon, this.refText, this.refTerms);
      });
      return new Text(list, this.lexicon, this.parent);
    },
    firstTerm: function () {
      return this.match('^.');
    },
    lastTerm: function () {
      return this.match('.$');
    },

    /** grab a subset of the results*/
    slice: function (start, end) {
      this.list = this.list.slice(start, end);
      return this;
    },

    /** use only the nth result*/
    get: function (n) {
      //return an empty result
      if ((!n && n !== 0) || !this.list[n]) {
        return new Text([], this.lexicon, this.parent);
      }
      let ts = this.list[n];
      return new Text([ts], this.lexicon, this.parent);
    },
    /**use only the first result */
    first: function (n) {
      if (!n && n !== 0) {
        return this.get(0);
      }
      return new Text(this.list.slice(0, n), this.lexicon, this.parent);
    },
    /**use only the last result */
    last: function (n) {
      if (!n && n !== 0) {
        return this.get(this.list.length - 1);
      }
      let end = this.list.length;
      let start = end - n;
      return new Text(this.list.slice(start, end), this.lexicon, this.parent);
    },


    concat: function() {
      //any number of params
      for(let i = 0; i < arguments.length; i++) {
        let p = arguments[i];
        if (typeof p === 'object') {
          //Text()
          if (p.isA === 'Text' && p.list) {
            this.list = this.list.concat(p.list);
          }
          //Terms()
          if (p.isA === 'Terms') {
            this.list.push(p);
          }
        }
      }
      return this;
    },
    /** make it into one sentence/termlist */
    flatten: function () {
      let terms = [];
      this.list.forEach((ts) => {
        terms = terms.concat(ts.terms);
      });
      //dont create an empty ts
      if (!terms.length) {
        return new Text(null, this.lexicon, this.parent);
      }
      let ts = new index$4(terms, this.lexicon, this, null);
      return new Text([ts], this.lexicon, this.parent);
    },

    /** see if these terms can become this tag*/
    canBe: function (tag) {
      this.list.forEach((ts) => {
        ts.terms = ts.terms.filter((t) => {
          return t.canBe(tag, this.tagSet);
        });
      });
      return this;
    },

  };

  Object.keys(methods).forEach((k) => {
    Text.prototype[k] = methods[k];
  });
};

var misc = genericMethods;

//this methods are simply loops around each termList object.
const methods$3 = [
  'toTitleCase',
  'toUpperCase',
  'toLowerCase',
  'toCamelCase',

  'hyphenate',
  'dehyphenate',

  'insertBefore',
  'insertAfter',
  'insertAt',

  'replace',
  'replaceWith',

  'delete',
  'lump',

  'tagger',

  // 'tag',
  'unTag',
];

const addMethods$7 = (Text) => {
  methods$3.forEach((k) => {
    Text.prototype[k] = function () {
      for(let i = 0; i < this.list.length; i++) {
        this.list[i][k].apply(this.list[i], arguments);
      }
      return this;
    };
  });

  //add an extra optimisation for tag method
  Text.prototype.tag = function() {
    //fail-fast optimisation
    if (this.list.length === 0) {
      return this;
    }
    for(let i = 0; i < this.list.length; i++) {
      this.list[i].tag.apply(this.list[i], arguments);
    }
    return this;
  };
};

var loops$2 = addMethods$7;

const splitMethods = (Text) => {

  //support "#Noun word" regex-matches
  const matchReg = function(r, reg, verbose) {
    //parse the 'regex' into some json
    let list = [];
    reg = syntax(reg);
    r.list.forEach((ts) => {
      //an array of arrays
      let matches = ts.match(reg, verbose);
      matches.list.forEach((ms) => {
        list.push(ms);
      });
    });
    let parent = r.parent || r;
    return new Text(list, r.lexicon, parent);
  };

  //support {word:true} whitelist
  const matchObj = function(r, obj) {
    let matches = [];
    r.list.forEach((ts) => {
      ts.terms.forEach((t) => {
        if (obj[t.normal]) {
          matches.push(t);
        }
      });
    });
    matches = matches.map((t) => {
      return new index$4([t], r.lexicon, r, t.parentTerms);
    });
    return new Text(matches, r.lexicon, r.parent);
  };

  //support [word, word] whitelist
  const matchArr = function(r, arr) {
    //its faster this way
    let obj = arr.reduce((h, a) => {
      h[a] = true;
      return h;
    }, {});
    return matchObj(r, obj);
  };

  const methods = {

    /** do a regex-like search through terms and return a subset */
    match: function (reg, verbose) {
      //fail-fast
      if (this.list.length === 0 || reg === undefined || reg === null) {
        let parent = this.parent || this;
        return new Text([], this.lexicon, parent);
      }
      //match "#Noun word" regex
      if (typeof reg === 'string' || typeof reg === 'number') {
        return matchReg(this, reg, verbose);
      }
      //match [word, word] whitelist
      let type = Object.prototype.toString.call(reg);
      if (type === '[object Array]') {
        return matchArr(this, reg);
      }
      //match {word:true} whitelist
      if (type === '[object Object]') {
        return matchObj(this, reg);
      }
      return this;
    },

    not: function(reg, verbose) {
      let list = [];
      this.list.forEach((ts) => {
        let found = ts.not(reg, verbose);
        list = list.concat(found.list);
      });
      let parent = this.parent || this;
      return new Text(list, this.lexicon, parent);
    },

    if: function (reg) {
      let list = [];
      for(let i = 0; i < this.list.length; i++) {
        if (this.list[i].has(reg) === true) {
          list.push(this.list[i]);
        }
      }
      let parent = this.parent || this;
      return new Text(list, this.lexicon, parent);
    },

    ifNo: function (reg) {
      let list = [];
      for(let i = 0; i < this.list.length; i++) {
        if (this.list[i].has(reg) === false) {
          list.push(this.list[i]);
        }
      }
      let parent = this.parent || this;
      return new Text(list, this.lexicon, parent);
    },

    has: function(reg) {
      for(let i = 0; i < this.list.length; i++) {
        if (this.list[i].has(reg) === true) {
          return true;
        }
      }
      return false;
    },
  };
  //alias 'and'
  methods.and = methods.match;

  //hook them into result.proto
  Object.keys(methods).forEach((k) => {
    Text.prototype[k] = methods[k];
  });
  return Text;
};

var index$46 = splitMethods;

//
const topk = function (r, n) {
  //count occurance
  let count = {};
  r.list.forEach((ts) => {
    let str = ts.out('root');
    count[str] = count[str] || 0;
    count[str] += 1;
  });
  //turn into an array
  let all = [];
  Object.keys(count).forEach((k) => {
    all.push({
      normal: k,
      count: count[k],
    });
  });
  //add percentage
  all.forEach((o) => {
    o.percent = parseFloat(((o.count / r.list.length) * 100).toFixed(2));
  });
  //sort by freq
  all = all.sort((a, b) => {
    if (a.count > b.count) {
      return -1;
    }
    return 1;
  });
  if (n) {
    all = all.splice(0, n);
  }
  return all;
};

var topk_1 = topk;

/** say where in the original output string they are found*/

const findOffset = (parent, term) => {
  let sum = 0;
  for(let i = 0; i < parent.list.length; i++) {
    for(let o = 0; o < parent.list[i].terms.length; o++) {
      let t = parent.list[i].terms[o];
      if (t.uid === term.uid) {
        return sum;
      } else {
        sum += t.whitespace.before.length + t._text.length + t.whitespace.after.length;
      }
    }
  }
  return null;
};

//map over all-dem-results
const allOffset = (r) => {
  let parent = r.all();
  return r.list.map((ts) => {
    let words = [];
    for(let i = 0; i < ts.terms.length; i++) {
      words.push(ts.terms[i].normal);
    }
    let nrml = ts.out('normal');
    let txt = ts.out('text');
    let startAt = findOffset(parent, ts.terms[0]);
    let beforeWord = ts.terms[0].whitespace.before;
    let wordStart = startAt + beforeWord.length;
    return {
      text: txt,
      normal: nrml,
      //where we begin
      offset: startAt,
      length: txt.length,
      wordStart: wordStart,
      wordEnd: wordStart + nrml.length,
    // wordLength: words.join(' ').length
    };
  });
};
var offset = allOffset;

//find where in the original text this match is found, by term-counts
const termIndex = (r) => {
  let result = [];
  //find the ones we want
  let want = {};
  r.terms().list.forEach((ts) => {
    want[ts.terms[0].uid] = true;
  });

  //find their counts
  let sum = 0;
  let parent = r.all();
  parent.list.forEach((ts, s) => {
    ts.terms.forEach((t, i) => {
      if (want[t.uid] !== undefined) {
        result.push({
          text: t.text,
          normal: t.normal,
          term: sum,
          sentence: s,
          sentenceTerm: i
        });
      }
      sum += 1;
    });
  });

  return result;
};
var indexes = termIndex;

const methods$4 = {
  text: (r) => {
    return r.list.reduce((str, ts) => {
      str += ts.out('text');
      return str;
    }, '');
  },
  normal: (r) => {
    return r.list.map((ts) => {
      let str = ts.out('normal');
      let last = ts.last();
      if (last) {
        let punct = last.endPunctuation();
        if (punct === '.' || punct === '!' || punct === '?') {
          str += punct;
        }
      }
      return str;
    }).join(' ');
  },
  root: (r) => {
    return r.list.map((ts) => {
      return ts.out('root');
    }).join(' ');
  },
  /** output where in the original output string they are*/
  offsets: (r) => {
    return offset(r);
  },
  /** output the tokenized location of this match*/
  index: (r) => {
    return indexes(r);
  },
  grid: (r) => {
    return r.list.reduce((str, ts) => {
      str += ts.out('grid');
      return str;
    }, '');
  },
  color: (r) => {
    return r.list.reduce((str, ts) => {
      str += ts.out('color');
      return str;
    }, '');
  },
  array: (r) => {
    return r.list.reduce((arr, ts) => {
      arr.push(ts.out('normal'));
      return arr;
    }, []);
  },
  json: (r) => {
    return r.list.reduce((arr, ts) => {
      let terms = ts.terms.map((t) => {
        return {
          text: t.text,
          normal: t.normal,
          tags: t.tag
        };
      });
      arr.push(terms);
      return arr;
    }, []);
  },
  html: (r) => {
    let html = r.list.reduce((str, ts) => {
      let sentence = ts.terms.reduce((sen, t) => {
        sen += '\n    ' + t.out('html');
        return sen;
      }, '');
      return str += '\n  <span>' + sentence + '\n  </span>';
    }, '');
    return '<span> ' + html + '\n</span>';
  },
  terms: (r) => {
    let arr = [];
    r.list.forEach((ts) => {
      ts.terms.forEach((t) => {
        arr.push({
          text: t.text,
          normal: t.normal,
          tags: Object.keys(t.tags)
        });
      });
    });
    return arr;
  },
  debug: (r) => {
    console.log('====');
    r.list.forEach((ts) => {
      console.log('   --');
      ts.debug();
    });
    return r;
  },
  topk: (r) => {
    return topk_1(r);
  }
};
methods$4.plaintext = methods$4.text;
methods$4.normalized = methods$4.normal;
methods$4.colors = methods$4.color;
methods$4.tags = methods$4.terms;
methods$4.offset = methods$4.offsets;
methods$4.idexes = methods$4.index;
methods$4.frequency = methods$4.topk;
methods$4.freq = methods$4.topk;
methods$4.arr = methods$4.array;

const addMethods$8 = (Text) => {
  Text.prototype.out = function(fn) {
    if (methods$4[fn]) {
      return methods$4[fn](this);
    }
    return methods$4.text(this);
  };
  Text.prototype.debug = function() {
    return methods$4.debug(this);
  };
  return Text;
};


var index$48 = addMethods$8;

//perform sort on pre-computed values
const sortEm = function(arr) {
  arr = arr.sort((a, b) => {
    if (a.index > b.index) {
      return 1;
    }
    if (a.index === b.index) {
      return 0;
    }
    return -1;
  });
  //return ts objects
  return arr.map((o) => o.ts);
};

//alphabetical sorting of a termlist array
var alpha = function(r) {
  r.list.sort((a, b) => {
    //#1 performance speedup
    if (a === b) {
      return 0;
    }
    //#2 performance speedup
    if (a.terms[0] && b.terms[0]) {
      if (a.terms[0].root > b.terms[0].root) {
        return 1;
      }
      if (a.terms[0].root < b.terms[0].root) {
        return -1;
      }
    }
    //regular compare
    if (a.out('root') > b.out('root')) {
      return 1;
    }
    return -1;
  });
  return r;
};

//the order they were recieved (chronological~)
var chron = function(r) {
  //pre-compute indexes
  let tmp = r.list.map((ts) => {
    return {
      ts: ts,
      index: ts.termIndex()
    };
  });
  r.list = sortEm(tmp);
  return r;
};

//shortest matches first
var lengthFn = function(r) {
  //pre-compute indexes
  let tmp = r.list.map((ts) => {
    return {
      ts: ts,
      index: ts.chars()
    };
  });
  r.list = sortEm(tmp).reverse();
  return r;
};

//count the number of terms in each match
var wordCount = function(r) {
  //pre-compute indexes
  let tmp = r.list.map((ts) => {
    return {
      ts: ts,
      index: ts.length
    };
  });
  r.list = sortEm(tmp);
  return r;
};

//sort by frequency (like topk)
var freq = function(r) {
  //get counts
  let count = {};
  r.list.forEach((ts) => {
    let str = ts.out('root');
    count[str] = count[str] || 0;
    count[str] += 1;
  });
  //pre-compute indexes
  let tmp = r.list.map((ts) => {
    let num = count[ts.out('root')] || 0;
    return {
      ts: ts,
      index: num * -1 //quick-reverse it
    };
  });
  r.list = sortEm(tmp);
  return r;
};

var methods$5 = {
	alpha: alpha,
	chron: chron,
	lengthFn: lengthFn,
	wordCount: wordCount,
	freq: freq
};

const addMethods$9 = (Text) => {

  const fns = {

    /**reorder result.list alphabetically */
    sort: function (method) {
      //default sort
      method = method || 'alphabetical';
      method = method.toLowerCase();
      if (!method || method === 'alpha' || method === 'alphabetical') {
        return methods$5.alpha(this, Text);
      }
      if (method === 'chron' || method === 'chronological') {
        return methods$5.chron(this, Text);
      }
      if (method === 'length') {
        return methods$5.lengthFn(this, Text);
      }
      if (method === 'freq' || method === 'frequency') {
        return methods$5.freq(this, Text);
      }
      if (method === 'wordcount') {
        return methods$5.wordCount(this, Text);
      }
      return this;
    },

    /**reverse the order of result.list */
    reverse: function () {
      this.list = this.list.reverse();
      return this;
    },

    unique: function () {
      let obj = {};
      this.list = this.list.filter((ts) => {
        let str = ts.out('root');
        if (obj[str]) {
          return false;
        }
        obj[str] = true;
        return true;
      });
      return this;
    }
  };
  //hook them into result.proto
  Object.keys(fns).forEach((k) => {
    Text.prototype[k] = fns[k];
  });
  return Text;
};

var index$50 = addMethods$9;

const splitMethods$1 = (Text) => {

  const methods = {
    /** turn result into two seperate results */
    splitAfter: function(reg, verbose) {
      let list = [];
      this.list.forEach((ts) => {
        ts.splitAfter(reg, verbose).forEach((mts) => {
          list.push(mts);
        });
      });
      this.list = list;
      return this;
    },
    /** turn result into two seperate results */
    splitBefore: function(reg, verbose) {
      let list = [];
      this.list.forEach((ts) => {
        ts.splitBefore(reg, verbose).forEach((mts) => {
          list.push(mts);
        });
      });
      this.list = list;
      return this;
    },
    /** turn result into two seperate results */
    splitOn: function(reg, verbose) {
      let list = [];
      this.list.forEach((ts) => {
        ts.splitOn(reg, verbose).forEach((mts) => {
          list.push(mts);
        });
      });
      this.list = list;
      return this;
    },
  };

  //hook them into result.proto
  Object.keys(methods).forEach((k) => {
    Text.prototype[k] = methods[k];
  });
  return Text;
};

var split$5 = splitMethods$1;

//
const defaults = {
  whitespace: true,
  case: true,
  numbers: true,
  punctuation: true,
  unicode: true,
  contractions: true
};

const methods$7 = {

  /** make only one space between each word */
  whitespace: (r) => {
    r.terms().list.forEach((ts, i) => {
      let t = ts.terms[0];
      if (i > 0) {
        t.whitespace.before = ' ';
      } else if (i === 0) {
        t.whitespace.before = '';
      }
      t.whitespace.after = '';
    });
    return r;
  },

  /** make first-word titlecase, and people, places titlecase */
  case: (r) => {
    r.list.forEach((ts) => {
      ts.terms.forEach((t, i) => {
        if (i === 0 || t.tags.Person || t.tags.Place || t.tags.Organization) {
          ts.toTitleCase();
        } else {
          ts.toLowerCase();
        }
      });
    });
    return r;
  },

  /** turn 'five' to 5, and 'fifth' to 5th*/
  numbers: (r) => {
    return r.values().toNumber();
  },

  /** remove commas, semicolons - but keep sentence-ending punctuation*/
  punctuation: (r) => {
    r.list.forEach((ts) => {
      //first-term punctuation
      ts.terms[0]._text = ts.terms[0]._text.replace(/^¿/, '');
      //middle-terms
      for(let i = 0; i < ts.terms.length - 1; i++) {
        let t = ts.terms[i];
        //remove non-sentence-ending stuff
        t._text = t._text.replace(/[:;,]$/, '');
      }
      //replace !!! with !
      let last = ts.terms[ts.terms.length - 1];
      last._text = last._text.replace(/\.+$/, '.');
      last._text = last._text.replace(/!+$/, '!');
      last._text = last._text.replace(/\?+!?$/, '?'); //support '?!'
    });
    return r;
  },

  contractions: (r) => {
    return r.contractions().expand();
  }
};

const addMethods$10 = (Text) => {
  Text.prototype.normalize = function(obj) {
    obj = obj || defaults;
    //do each type of normalization
    Object.keys(obj).forEach((fn) => {
      if (methods$7[fn] !== undefined) {
        methods$7[fn](this);
      }
    });
    return this;
  };
};
var normalize$3 = addMethods$10;

class Acronyms extends index$2 {
  data() {
    return this.terms().list.map((ts) => {
      let t = ts.terms[0];
      let parsed = t.text.toUpperCase().replace(/\./g).split('');
      return {
        periods: parsed.join('.'),
        normal: parsed.join(''),
        text: t.text
      };
    });
  }
  static find(r, n) {
    r = r.match('#Acronym');
    if (typeof n === 'number') {
      r = r.get(n);
    }
    return r;
  }
}

var index$52 = Acronyms;

class Adjectives extends index$2 {
  data() {
    return this.list.map((ts) => {
      const str = ts.out('normal');
      return {
        comparative: index$12.toComparative(str),
        superlative: index$12.toSuperlative(str),
        adverbForm: index$12.toAdverb(str),
        nounForm: index$12.toNoun(str),
        verbForm: index$12.toVerb(str),
        normal: str,
        text: this.out('text')
      };
    });
  }
  static find(r, n) {
    r = r.match('#Adjective');
    if (typeof n === 'number') {
      r = r.get(n);
    }
    return r;
  }
}

var index$54 = Adjectives;

//turns 'quickly' into 'quick'
const irregulars$10 = {
  'idly': 'idle',
  'sporadically': 'sporadic',
  'basically': 'basic',
  'grammatically': 'grammatical',
  'alphabetically': 'alphabetical',
  'economically': 'economical',
  'conically': 'conical',
  'politically': 'political',
  'vertically': 'vertical',
  'practically': 'practical',
  'theoretically': 'theoretical',
  'critically': 'critical',
  'fantastically': 'fantastic',
  'mystically': 'mystical',
  'pornographically': 'pornographic',
  'fully': 'full',
  'jolly': 'jolly',
  'wholly': 'whole'
};

const transforms$4 = [{
  'reg': /bly$/i,
  'repl': 'ble'
}, {
  'reg': /gically$/i,
  'repl': 'gical'
}, {
  'reg': /([rsdh])ically$/i,
  'repl': '$1ical'
}, {
  'reg': /ically$/i,
  'repl': 'ic'
}, {
  'reg': /uly$/i,
  'repl': 'ue'
}, {
  'reg': /ily$/i,
  'repl': 'y'
}, {
  'reg': /(.{3})ly$/i,
  'repl': '$1'
}];

const toAdjective$2 = function(str) {
  if (irregulars$10.hasOwnProperty(str)) {
    return irregulars$10[str];
  }
  for (let i = 0; i < transforms$4.length; i++) {
    if (transforms$4[i].reg.test(str) === true) {
      return str.replace(transforms$4[i].reg, transforms$4[i].repl);
    }
  }
  return str;
};

// console.log(toAdjective('quickly') === 'quick')
// console.log(toAdjective('marvelously') === 'marvelous')
var toAdjective_1 = toAdjective$2;

class Adverbs extends index$2 {
  data() {
    return this.terms().list.map((ts) => {
      let t = ts.terms[0];
      return {
        adjectiveForm: toAdjective_1(t.normal),
        normal: t.normal,
        text: t.text
      };
    });
  }
  static find(r, n) {
    r = r.match('#Adverb+');
    if (typeof n === 'number') {
      r = r.get(n);
    }
    return r;
  }
}

var index$56 = Adverbs;

class Clauses extends index$2 {
  static find(r, n) {
    r = r.splitAfter('#ClauseEnd');
    if (typeof n === 'number') {
      r = r.get(n);
    }
    return r;
  }
}

var index$58 = Clauses;

var paths$8 = {
  fns: fns$1,
  data: index$10,
  Terms: index$4,
  tags: index$8,
};

//the plumbing to turn two words into a contraction
const combine$2 = (a, b) => {
  b.whitespace.after = a.whitespace.after;
  a.whitespace.after = '';
  b.whitespace.before = '';
  a.silent_term = a.text;
  b.silent_term = b.text;
  b.text = '';
  a.tag('Contraction', 'new-contraction');
  b.tag('Contraction', 'new-contraction');
};

const contract = function(ts) {
  if (ts.expanded === false || ts.match('#Contraction').found) {
    return ts;
  }
  //he is -> he's
  ts.match('(#Noun|#QuestionWord) is').list.forEach((ls) => {
    combine$2(ls.terms[0], ls.terms[1]);
    ls.terms[0].text += '\'s';
    ls.contracted = true;
  });
  //he did -> he'd
  ts.match('#PronNoun did').list.forEach((ls) => {
    combine$2(ls.terms[0], ls.terms[1]);
    ls.terms[0].text += '\'d';
    ls.contracted = true;
  });
  //how do -> how'd
  ts.match('#QuestionWord (did|do)').list.forEach((ls) => {
    combine$2(ls.terms[0], ls.terms[1]);
    ls.terms[0].text += '\'d';
    ls.contracted = true;
  });

  //he would -> he'd
  ts.match('#Noun (could|would)').list.forEach((ls) => {
    combine$2(ls.terms[0], ls.terms[1]);
    ls.terms[0].text += '\'d';
    ls.contracted = true;
  });
  //they are -> they're
  ts.match('(they|we|you) are').list.forEach((ls) => {
    combine$2(ls.terms[0], ls.terms[1]);
    ls.terms[0].text += '\'re';
    ls.contracted = true;
  });
  //i am -> i'm
  ts.match('i am').list.forEach((ls) => {
    combine$2(ls.terms[0], ls.terms[1]);
    ls.terms[0].text += '\'m';
    ls.contracted = true;
  });
  //they will -> they'll
  ts.match('(#Noun|#QuestionWord) will').list.forEach((ls) => {
    combine$2(ls.terms[0], ls.terms[1]);
    ls.terms[0].text += '\'ll';
    ls.contracted = true;
  });
  //they have -> they've
  ts.match('(they|we|you|i) have').list.forEach((ls) => {
    combine$2(ls.terms[0], ls.terms[1]);
    ls.terms[0].text += '\'ve';
    ls.contracted = true;
  });
  //is not -> isn't
  ts.match('(#Copula|#Modal|do) not').list.forEach((ls) => {
    combine$2(ls.terms[0], ls.terms[1]);
    ls.terms[0].text += 'n\'t';
    ls.contracted = true;
  });
  return ts;
};

var contract_1 = contract;

const Terms$2 = paths$8.Terms;


const expand = function(ts) {
  if (ts.contracted === false) {
    return ts;
  }
  ts.terms.forEach((t) => {
    if (t.silent_term) {
      //this term also needs a space now too
      if (!t.text) {
        t.whitespace.before = ' ';
      }
      t._text = t.silent_term;
      t.normalize();
      t.silent_term = null;
      t.unTag('Contraction', 'expanded');
    }
  });
  return ts;
};

var contraction$1 = class ContractionCl extends Terms$2 {
  data() {
    let expanded = expand(this.clone());
    let contracted = contract_1(this.clone());
    return {
      text: this.out('text'),
      normal: this.out('normal'),
      expanded: {
        normal: expanded.out('normal'),
        text: expanded.out('text')
      },
      contracted: {
        normal: contracted.out('normal'),
        text: contracted.out('text')
      },
      isContracted: !!this.contracted
    };
  }
  expand() {
    return expand(this);
  }
  contract() {
    return contract_1(this);
  }
};
// module.exports = ContractionCl;

//find contractable, expanded-contractions
const find = (r) => {
  let remain = r.not('#Contraction');
  let m = remain.match('(#Noun|#QuestionWord) (#Copula|did|do|have|had|could|would|will)');
  m.concat(remain.match('(they|we|you|i) have'));
  m.concat(remain.match('i am'));
  m.concat(remain.match('(#Copula|#Modal|do) not'));
  m.list.forEach((ts) => {
    ts.expanded = true;
  });
  return m;
};
var findPossible = find;

class Contractions extends index$2 {
  data() {
    return this.list.map(ts => ts.data());
  }
  contract() {
    this.list.forEach((ts) => ts.contract());
    return this;
  }
  expand() {
    this.list.forEach((ts) => ts.expand());
    return this;
  }
  contracted() {
    this.list = this.list.filter((ts) => {
      return ts.contracted;
    });
    return this;
  }
  expanded() {
    this.list = this.list.filter((ts) => {
      return !ts.contracted;
    });
    return this;
  }
  static find(r, n) {
    //find currently-contracted
    let found = r.match('#Contraction #Contraction #Contraction?');
    found.list = found.list.map((ts) => {
      let c = new contraction$1(ts.terms, ts.lexicon, ts.refText, ts.refTerms);
      c.contracted = true;
      return c;
    });
    //find currently-expanded
    let expanded = findPossible(r);
    expanded.list.forEach((ts) => {
      let c = new contraction$1(ts.terms, ts.lexicon, ts.refText, ts.refTerms);
      c.contracted = false;
      found.list.push(c);
    });
    found.sort('chronological');
    //get nth element
    if (typeof n === 'number') {
      found = found.get(n);
    }
    return found;
  }
}

var index$60 = Contractions;

const ampm = /([12]?[0-9]) ?(am|pm)/i;
const hourMin = /([12]?[0-9]):([0-9][0-9]) ?(am|pm)?/i;
//
const isHour = (num) => {
  if (num && num > 0 && num < 25) {
    return true;
  }
  return false;
};
const isMinute = (num) => {
  if (num && num > 0 && num < 60) {
    return true;
  }
  return false;
};


const parseTime = (r) => {
  let result = {
    logic: null,
    hour: null,
    minute: null,
    second: null,
    timezone: null
  };

  let logic = r.match('(by|before|for|during|at|until|after) #Time').firstTerm();
  if (logic.found) {
    result.logic = logic.out('normal');
  }

  let time = r.match('#Time');
  time.terms().list.forEach((ts) => {
    let t = ts.terms[0];
    //3pm
    let m = t.text.match(ampm);
    if (m !== null) {
      result.hour = parseInt(m[1], 10);
      if (m[2] === 'pm') {
        result.hour += 12;
      }
      if (isHour(result.hour) === false) {
        result.hour = null;
      }
    }
    //3:15
    m = t.text.match(hourMin);
    if (m !== null) {
      result.hour = parseInt(m[1], 10);
      result.minute = parseInt(m[2], 10);
      if (!isMinute(result.minute)) {
        result.minute = null;
      }
      if (m[3] === 'pm') {
        result.hour += 12;
      }
      if (isHour(result.hour) === false) {
        result.hour = null;
      }
    }
  });
  return result;
};
var parseTime_1 = parseTime;

//follow the javascript scheme
//sunday is 0
var longDays$1 = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
};
var shortDays$1 = {
  'sun': 0,
  'mon': 1,
  'tues': 2,
  'wed': 3,
  'thurs': 4,
  'fri': 5,
  'sat': 6,
};

var data$1 = {
	longDays: longDays$1,
	shortDays: shortDays$1
};

const shortDays = data$1.shortDays;
const longDays = data$1.longDays;

var index$64 = {
  index: function (t) {
    if (t.tags.WeekDay) {
      if (longDays[t.normal] !== undefined) {
        return longDays[t.normal];
      }
      if (shortDays[t.normal] !== undefined) {
        return shortDays[t.normal];
      }
    }
    return null;
  },
  toShortForm: function (t) {
    if (t.tags.WeekDay) {
      if (longDays[t.normal] !== undefined) {
        let shorten = Object.keys(shortDays);
        t.text = shorten[longDays[t.normal]];
      }
    }
    return t;
  },
  toLongForm: function (t) {
    if (t.tags.WeekDay) {
      if (shortDays[t.normal] !== undefined) {
        let longer = Object.keys(longDays);
        t.text = longer[shortDays[t.normal]];
      }
    }
    return t;
  }
};

//follow the javascript scheme
//january is 0
var longMonths$1 = {
  'january': 0,
  'february': 1,
  'march': 2,
  'april': 3,
  'may': 4,
  'june': 5,
  'july': 6,
  'august': 7,
  'september': 8,
  'october': 9,
  'november': 10,
  'december': 11,
};
var shortMonths$1 = {
  'jan': 0,
  'feb': 1,
  'febr': 1,
  'mar': 2,
  'apr': 3,
  'may': 4,
  'jun': 5,
  'jul': 6,
  'aug': 7,
  'sep': 8,
  'sept': 8,
  'oct': 9,
  'nov': 10,
  'dec': 11,
};

var data$4 = {
	longMonths: longMonths$1,
	shortMonths: shortMonths$1
};

const shortMonths = data$4.shortMonths;
const longMonths = data$4.longMonths;

var index$66 = {
  index: function (t) {
    if (t.tags.Month) {
      if (longMonths[t.normal] !== undefined) {
        return longMonths[t.normal];
      }
      if (shortMonths[t.normal] !== undefined) {
        return shortMonths[t.normal];
      }
    }
    return null;
  },
  toShortForm: function (t) {
    if (t.tags.Month !== undefined) {
      if (longMonths[t.normal] !== undefined) {
        let shorten = Object.keys(shortMonths);
        t.text = shorten[longMonths[t.normal]];
      }
    }
    t.dirty = true;
    return t;
  },
  toLongForm: function (t) {
    if (t.tags.Month !== undefined) {
      if (shortMonths[t.normal] !== undefined) {
        let longer = Object.keys(longMonths);
        t.text = longer[shortMonths[t.normal]];
      }
    }
    t.dirty = true;
    return t;
  }

};

//a hugely-conservative and incomplete first-pass for parsing written-dates

//validate a day-of-month
const isDate = (num) => {
  if (num && num < 31 && num > 0) {
    return true;
  }
  return false;
};

//please change this in one thousand years
const isYear = (num) => {
  if (num && num > 1000 && num < 3000) {
    return true;
  }
  return false;
};

//
const parseDate = (r) => {
  let result = {
    month: null,
    date: null,
    weekday: null,
    year: null,
    named: null,
    time: null,
  };
  let m = r.match('(#Holiday|today|tomorrow|yesterday)');
  if (m.found) {
    result.named = m.out('normal');
  }
  m = r.match('#Month');
  if (m.found) {
    result.month = index$66.index(m.list[0].terms[0]);
  }
  m = r.match('#WeekDay');
  if (m.found) {
    result.weekday = index$64.index(m.list[0].terms[0]);
  }
  m = r.match('#Time');
  if (m.found) {
    result.time = parseTime_1(r);
    r.not('#Time'); //unsure
  }
  //january fifth 1992
  m = r.match('#Month #Value #Year');
  if (m.found) {
    let numbers = m.values().numbers();
    if (isDate(numbers[0])) {
      result.date = numbers[0];
    }
    let year = parseInt(r.match('#Year').out('normal'), 10);
    if (isYear(year)) {
      result.year = year;
    }
  }
  if (!m.found) {
    //january fifth,  january 1992
    m = r.match('#Month #Value');
    if (m.found) {
      let numbers = m.values().numbers();
      let num = numbers[0];
      if (isDate(num)) {
        result.date = num;
      }
    }
    //january 1992
    m = r.match('#Month #Year');
    if (m.found) {
      let num = parseInt(r.match('#Year').out('normal'), 10);
      if (isYear(num)) {
        result.year = num;
      }
    }
  }

  //fifth of january
  m = r.match('#Value of #Month');
  if (m.found) {
    let num = m.values().numbers()[0];
    if (isDate(num)) {
      result.date = num;
    }
  }
  return result;
};
var parseDate_1 = parseDate;

const Terms$3 = paths$8.Terms;
// const parsePunt = require('./parsePunt');
// const parseSection = require('./parseSection');
// const parseRelative = require('./parseRelative');


class Date extends Terms$3 {
  constructor(arr, lexicon, refText, refTerms) {
    super(arr, lexicon, refText, refTerms);
    this.month = this.match('#Month');
  }
  data() {
    return {
      text: this.out('text'),
      normal: this.out('normal'),
      date: parseDate_1(this)
    };
  }
}
var date = Date;

class Dates extends index$2 {
  data() {
    return this.list.map((ts) => ts.data());
  }
  toShortForm() {
    this.match('#Month').terms().list.forEach((ts) => {
      let t = ts.terms[0];
      index$66.toShortForm(t);
    });
    this.match('#WeekDay').terms().list.forEach((ts) => {
      let t = ts.terms[0];
      index$64.toShortForm(t);
    });
    return this;
  }
  toLongForm() {
    this.match('#Month').terms().list.forEach((ts) => {
      let t = ts.terms[0];
      index$66.toLongForm(t);
    });
    this.match('#WeekDay').terms().list.forEach((ts) => {
      let t = ts.terms[0];
      index$64.toLongForm(t);
    });
    return this;
  }
  static find(r, n) {
    let dates = r.match('#Date+');
    if (typeof n === 'number') {
      dates = dates.get(n);
    }
    dates.list = dates.list.map((ts) => {
      return new date(ts.terms, ts.lexicon, ts.refText, ts.refTerms);
    });
    return dates;
  }
}

var index$62 = Dates;

class HashTags extends index$2 {
  static find(r, n) {
    r = r.match('#HashTag').terms();
    if (typeof n === 'number') {
      r = r.get(n);
    }
    return r;
  }
}

var index$68 = HashTags;

const uncountables = index$16.utils.uncountable;

//certain words can't be plural, like 'peace'
const hasPlural = function (t) {
  //end quick
  if (!t.tags.Noun) {
    return false;
  }
  if (t.tags.Plural) {
    return true;
  }
  //is it potentially plural?
  const noPlural = [
    'Pronoun',
    'Place',
    'Value',
    'Person',
    'Month',
    'WeekDay',
    'RelativeDay',
    'Holiday',
  ];
  for (let i = 0; i < noPlural.length; i++) {
    if (t.tags[noPlural[i]]) {
      return false;
    }
  }
  //terms known as un-inflectable, like 'peace'
  if (uncountables.has(t.normal)) {
    return false;
  }
  return true;
};

var hasPlural_1 = hasPlural;

//chooses an indefinite aricle 'a/an' for a word
const irregulars$11 = {
  'hour': 'an',
  'heir': 'an',
  'heirloom': 'an',
  'honest': 'an',
  'honour': 'an',
  'honor': 'an',
  'uber': 'an' //german u
};
//pronounced letters of acronyms that get a 'an'
const an_acronyms = {
  a: true,
  e: true,
  f: true,
  h: true,
  i: true,
  l: true,
  m: true,
  n: true,
  o: true,
  r: true,
  s: true,
  x: true
};
//'a' regexes
const a_regexs = [
  /^onc?e/i, //'wu' sound of 'o'
  /^u[bcfhjkqrstn][aeiou]/i, // 'yu' sound for hard 'u'
  /^eul/i
];

const makeArticle = function(t) {
  let str = t.normal;

  //explicit irregular forms
  if (irregulars$11.hasOwnProperty(str)) {
    return irregulars$11[str];
  }
  //spelled-out acronyms
  let firstLetter = str.substr(0, 1);
  if (t.isAcronym() && an_acronyms.hasOwnProperty(firstLetter)) {
    return 'an';
  }
  //'a' regexes
  for (let i = 0; i < a_regexs.length; i++) {
    if (a_regexs[i].test(str)) {
      return 'a';
    }
  }
  //basic vowel-startings
  if (/^[aeiou]/i.test(str)) {
    return 'an';
  }
  return 'a';
};

var makeArticle_1 = makeArticle;

//patterns for turning 'bus' to 'buses'
var pluralRules = [
  [/(ax|test)is$/i, '$1es'],
  [/(octop|vir|radi|nucle|fung|cact|stimul)us$/i, '$1i'],
  [/(octop|vir)i$/i, '$1i'],
  [/(kn|l|w)ife$/i, '$1ives'],
  [/^((?:ca|e|ha|(?:our|them|your)?se|she|wo)l|lea|loa|shea|thie)f$/i, '$1ves'],
  [/^(dwar|handkerchie|hoo|scar|whar)f$/i, '$1ves'],
  [/(alias|status)$/i, '$1es'],
  [/(bu)s$/i, '$1ses'],
  [/(al|ad|at|er|et|ed|ad)o$/i, '$1oes'],
  [/([ti])um$/i, '$1a'],
  [/([ti])a$/i, '$1a'],
  [/sis$/i, 'ses'],
  [/(hive)$/i, '$1s'],
  [/([^aeiouy]|qu)y$/i, '$1ies'],
  [/(x|ch|ss|sh|s|z)$/i, '$1es'],
  [/(matr|vert|ind|cort)(ix|ex)$/i, '$1ices'],
  [/([m|l])ouse$/i, '$1ice'],
  [/([m|l])ice$/i, '$1ice'],
  [/^(ox)$/i, '$1en'],
  [/^(oxen)$/i, '$1'],
  [/(quiz)$/i, '$1zes'],
  [/(antenn|formul|nebul|vertebr|vit)a$/i, '$1ae'],
  [/(sis)$/i, 'ses'],
  [/^(?!talis|.*hu)(.*)man$/i, '$1men'],
  [/(.*)/i, '$1s']
].map(function(a) {
  return {
    reg: a[0],
    repl: a[1]
  };
});

const irregulars$12 = index$10.irregular_plurals.toPlural;


//turn 'shoe' into 'shoes'
const pluralize = function(str) {
  //irregular
  if (irregulars$12[str] !== undefined) {
    return irregulars$12[str];
  }
  //regular rule-based inflector
  for (let i = 0; i < pluralRules.length; i++) {
    if (pluralRules[i].reg.test(str) === true) {
      return str.replace(pluralRules[i].reg, pluralRules[i].repl);
    }
  }
  return null;
};

var pluralize_1 = pluralize;

//patterns for turning 'dwarves' to 'dwarf'
var singleRules = [
  [/([^v])ies$/i, '$1y'],
  [/ises$/i, 'isis'],
  [/(kn|[^o]l|w)ives$/i, '$1ife'],
  [/^((?:ca|e|ha|(?:our|them|your)?se|she|wo)l|lea|loa|shea|thie)ves$/i, '$1f'],
  [/^(dwar|handkerchie|hoo|scar|whar)ves$/i, '$1f'],
  [/(antenn|formul|nebul|vertebr|vit)ae$/i, '$1a'],
  [/(octop|vir|radi|nucle|fung|cact|stimul)(i)$/i, '$1us'],
  [/(buffal|tomat|tornad)(oes)$/i, '$1o'],
  [/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$/i, '$1sis'],
  [/(vert|ind|cort)(ices)$/i, '$1ex'],
  [/(matr|append)(ices)$/i, '$1ix'],
  [/(x|ch|ss|sh|s|z|o)es$/i, '$1'],
  [/men$/i, 'man'],
  [/(n)ews$/i, '$1ews'],
  [/([ti])a$/i, '$1um'],
  [/([^aeiouy]|qu)ies$/i, '$1y'],
  [/(s)eries$/i, '$1eries'],
  [/(m)ovies$/i, '$1ovie'],
  [/([m|l])ice$/i, '$1ouse'],
  [/(cris|ax|test)es$/i, '$1is'],
  [/(alias|status)es$/i, '$1'],
  [/(ss)$/i, '$1'],
  [/(ics)$/i, '$1'],
  [/s$/i, '']
].map(function(a) {
  return {
    reg: a[0],
    repl: a[1]
  };
});

const irregulars$13 = index$10.irregular_plurals.toSingle;


//turn 'shoes' into 'shoe'
const toSingle$1 = function (str) {
  //irregular
  if (irregulars$13[str]) {
    return irregulars$13[str];
  }
  //inflect first word of preposition-phrase
  if (/([a-z]*) (of|in|by|for) [a-z]/.test(str) === true) {
    const first = (str.match(/^([a-z]*) (of|in|by|for) [a-z]/) || [])[1];
    if (first) {
      const better_first = toSingle$1(first); //recursive
      return better_first + str.replace(first, '');
    }
  }

  //regular rule-based inflector
  for (let i = 0; i < singleRules.length; i++) {
    if (singleRules[i].reg.test(str) === true) {
      return str.replace(singleRules[i].reg, singleRules[i].repl);
    }
  }
  return null;
};

// console.log(toSingle('gases') === 'gas')
var singularize = toSingle$1;
// console.log(toSingle('days'))

const Terms$4 = paths$8.Terms;






class Noun$2 extends Terms$4 {
  constructor(arr, lexicon, refText, refTerms) {
    super(arr, lexicon, refText, refTerms);
    this.t = this.terms[0];
  }
  article() {
    let t = this.t;
    return makeArticle_1(t);
  }
  isPlural() {
    let t = this.t;
    return isPlural_1(t);
  }
  hasPlural() {
    let t = this.t;
    return hasPlural_1(t);
  }
  toPlural() {
    let t = this.t;
    if (hasPlural_1(t) && !isPlural_1(t)) {
      t.text = pluralize_1(t.text);
      t.unTag('Plural', 'toPlural');
      t.tag('Singular', 'toPlural');
    }
    return this;
  }
  toSingular() {
    let t = this.t;
    if (isPlural_1(t)) {
      t.text = singularize(t.text);
      t.unTag('Plural', 'toSingular');
      t.tag('Singular', 'toSingular');
    }
    return this;
  }
  data() {
    return {
      article: this.article(),
      singular: this.toSingular().out('normal'),
      plural: this.toPlural().out('normal'),
    };
  }
}
var noun = Noun$2;

class Nouns extends index$2 {
  isPlural() {
    return this.list.map((ts) => ts.isPlural());
  }
  hasPlural() {
    return this.list.map((ts) => ts.hasPlural());
  }
  toPlural() {
    this.list.forEach((ts) => ts.toPlural());
    return this;
  }
  toSingular() {
    this.list.forEach((ts) => ts.toSingular());
    return this;
  }
  data() {
    return this.list.map((ts) => ts.data());
  }
  static find(r, n) {
    r = r.clauses();
    r = r.match('#Noun+');
    r = r.not('#Pronoun');
    r = r.not('(#Month|#WeekDay)'); //allow Durations, Holidays
    if (typeof n === 'number') {
      r = r.get(n);
    }
    r.list = r.list.map((ts) => {
      return new noun(ts.terms, ts.lexicon, ts.refText, ts.refTerms);
    });
    return r;
  }
}
var index$70 = Nouns;

class Organizations extends index$2 {
  static find(r, n) {
    r = r.splitAfter('#Comma');
    r = r.match('#Organization+');
    if (typeof n === 'number') {
      r = r.get(n);
    }
    return r;
  }
}

var index$72 = Organizations;

// make a statistical assumption about the gender of the person based on their given name
// used for pronoun resolution only.
// not intended for classification, or discrimination of people.
const gender = function (firstName) {
  if (!firstName) {
    return null;
  }
  //statistical guesses
  if (/.(i|ee|[a|e]y|a)$/.test(firstName) === true) { //this is almost-always true
    return 'Female';
  }
  if (/[ou]$/.test(firstName) === true) { //if it ends in a 'oh or uh', male
    return 'Male';
  }
  if (/(nn|ll|tt)/.test(firstName) === true) { //if it has double-consonants, female
    return 'Female';
  }
  // name not recognized, or recognized as of indeterminate gender
  return null;
};
var guessGender = gender;

const Terms$5 = paths$8.Terms;


class Person extends Terms$5 {
  data() {
    return {
      text: this.out('text'),
      normal: this.out('normal'),
      firstName: this.firstName.out('normal'),
      middleName: this.middleName.out('normal'),
      lastName: this.lastName.out('normal'),
      genderGuess: this.guessGender(),
      pronoun: this.pronoun(),
      honorifics: this.honorifics.out('array')
    };
  }
  constructor(arr, lexicon, refText, refTerms) {
    super(arr, lexicon, refText, refTerms);
    this.firstName = this.match('#FirstName+');
    this.middleName = this.match('#Acronym+');
    this.honorifics = this.match('#Honorific');
    this.lastName = this.match('#LastName+');
    //assume first-last
    if (!this.firstName.found && this.length > 1) {
      let m = this.not('(#Acronym|#Honorific)');
      this.firstName = m.first();
      this.lastName = m.last();
    }
    return this;
  }
  guessGender() {
    //try known honorifics
    if (this.honorifics.match('(mr|mister|sr|sir|jr)').found) {
      return 'Male';
    }
    if (this.honorifics.match('(mrs|miss|ms|misses|mme|mlle)').found) {
      return 'Female';
    }
    //try known first-names
    if (this.firstName.match('#MaleName').found) {
      return 'Male';
    }
    if (this.firstName.match('#FemaleName').found) {
      return 'Female';
    }
    //look-for regex clues
    let str = this.firstName.out('normal');
    return guessGender(str);
  }
  pronoun() {
    let str = this.firstName.out('normal');
    let g = this.guessGender(str);
    if (g === 'Male') {
      return 'he';
    }
    if (g === 'Female') {
      return 'she';
    }
    return 'they';
  }
  root() {
    let first = this.firstName.out('root');
    let last = this.lastName.out('root');
    if (first && last) {
      return first + ' ' + last;
    }
    return last || first || this.out('root');
  }
}
var person = Person;

//this is used for pronoun and honorifics, and not intented for more-than grammatical use (see #117)

class People extends index$2 {
  data() {
    return this.list.map((ts) => ts.data());
  }
  pronoun() {
    return this.list.map((ts) => ts.pronoun());
  }
  static find(r, n) {
    let people = r.clauses();
    people = people.match('#Person+');
    if (typeof n === 'number') {
      people = people.get(n);
    }
    people.list = people.list.map((ts) => {
      return new person(ts.terms, ts.lexicon, ts.refText, ts.refTerms);
    });
    return people;
  }
}

var index$74 = People;

class PhoneNumbers extends index$2 {
  data() {
    return this.terms().list.map((ts) => {
      let t = ts.terms[0];
      return {
        text: t.text
      };
    });
  }
  static find(r) {
    r = r.splitAfter('#Comma');
    r = r.match('#PhoneNumber+');
    if (typeof n === 'number') {
      r = r.get(n);
    }
    return r;
  }
}

var index$76 = PhoneNumbers;

const Terms$6 = paths$8.Terms;

class Place extends Terms$6 {
  constructor(arr, lexicon, refText, refTerms) {
    super(arr, lexicon, refText, refTerms);
    this.city = this.match('#City');
    this.country = this.match('#Country');
  }
  get isA() {
    return 'Place';
  }
  root() {
    return this.city.out('root');
  }
}
var place = Place;

class Places extends index$2 {
  static find(r, n) {
    r = r.splitAfter('#Comma');
    r = r.match('#Place+');
    if (typeof n === 'number') {
      r = r.get(n);
    }
    r.list = r.list.map((ts) => {
      return new place(ts.terms, ts.lexicon, ts.refText, ts.refTerms);
    });
    return r;
  }
}

var index$78 = Places;

//these terms are nicer ways to negate a sentence
//ie. john always walks -> john always doesn't walk
const logicalNegate = {
  'everyone': 'no one',
  'everybody': 'nobody',
  'someone': 'no one',
  'somebody': 'nobody',
  // everything:"nothing",
  'always': 'never'
};

//different rule for i/we/they/you + infinitive
//that is, 'i walk' -> 'i don\'t walk', not 'I not walk'
const toNegative = (ts) => {
  let lg = ts.match('(everyone|everybody|someone|somebody|always)').first();
  if (lg.found && logicalNegate[lg.out('normal')]) {
    let found = lg.out('normal');
    // ts = ts.replace(found, logicalNegate[found]);
    ts = ts.match(found).replaceWith(logicalNegate[found]).list[0];
    return ts.parentTerms;
  }
  //negate the main verb of the sentence
  let vb = ts.mainVerb();
  if (vb) {
    vb.toNegative();
  }
  return ts;
};
var toNegative_1 = toNegative;

//ie. john never walks -> john always walks
//nobody/noone are ambiguous logically (somebody? / everybody?)
const logical = {
  'never': 'always',
  'nothing': 'everything',
};

const toPositive = (ts) => {
  let m = ts.match('(never|nothing)').first();
  if (m.found) {
    let str = m.out('normal');
    if (logical[str]) {
      ts = ts.match(str).replaceWith(logical[str]).list[0];
      return ts.parentTerms;
    }
  }
  //otherwise just remove 'not'
  ts.delete('#Negative');
  return ts;
};
var toPositive_1 = toPositive;

//turn 'walk' into 'walker'
const irregulars$14 = {
  'tie': 'tier',
  'dream': 'dreamer',
  'sail': 'sailer',
  'run': 'runner',
  'rub': 'rubber',
  'begin': 'beginner',
  'win': 'winner',
  'claim': 'claimant',
  'deal': 'dealer',
  'spin': 'spinner'
};
const dont$2 = {
  'aid': 1,
  'fail': 1,
  'appear': 1,
  'happen': 1,
  'seem': 1,
  'try': 1,
  'say': 1,
  'marry': 1,
  'be': 1,
  'forbid': 1,
  'understand': 1,
  'bet': 1
};
const rules$8 = [{
  'reg': /e$/i,
  'repl': 'er'
}, {
  'reg': /([aeiou])([mlgp])$/i,
  'repl': '$1$2$2er'
}, {
  'reg': /([rlf])y$/i,
  'repl': '$1ier'
}, {
  'reg': /^(.?.[aeiou])t$/i,
  'repl': '$1tter'
}];

const toActor = function(inf) {
  //check blacklist
  if (dont$2[inf]) {
    return null;
  }
  //check irregulars
  if (irregulars$14[inf]) {
    return irregulars$14[inf];
  }
  //try rules
  for (let i = 0; i < rules$8.length; i++) {
    if (rules$8[i].reg.test(inf) === true) {
      return inf.replace(rules$8[i].reg, rules$8[i].repl);
    }
  }
  //yup,
  return inf + 'er';
};

var toActor_1 = toActor;

//too many special cases for is/was/will be
const toBe = (isPlural, isNegative) => {
  let obj = {
    PastTense: 'was',
    PresentTense: 'is',
    FutureTense: 'will be',
    Infinitive: 'is',
    Gerund: 'being',
    Actor: '',
    PerfectTense: 'been',
    Pluperfect: 'been',
  };
  if (isPlural) {
    obj.PastTense = 'were';
    obj.PresentTense = 'are';
    obj.Infinitive = 'are';
  }
  if (isNegative) {
    obj.PastTense += ' not';
    obj.PresentTense += ' not';
    obj.FutureTense = 'will not be';
    obj.Infinitive += ' not';
    obj.PerfectTense = 'not ' + obj.PerfectTense;
    obj.Pluperfect = 'not ' + obj.Pluperfect;
  }
  return obj;
};
var toBe_1 = toBe;

//turn a verb into all it's forms
const conjugate = function(t, verbose) {

  //handle is/was/will-be specially
  if (t.normal === 'is' || t.normal === 'was' || t.normal === 'will') {
    return toBe_1();
  }

  //dont conjugate didn't
  if (t.tags.Contraction) {
    t.text = t.silent_term;
  }
  let all = {
    PastTense: null,
    PresentTense: null,
    Infinitive: null,
    Gerund: null,
    Actor: null,
  };
  //first, get its current form
  let form = index$20(t);
  if (form) {
    all[form] = t.normal;
  }
  if (form !== 'Infinitive') {
    all['Infinitive'] = index$18(t, verbose) || '';
  }
  //check irregular forms
  const irregObj = irregulars_1(all['Infinitive']) || {};
  Object.keys(irregObj).forEach((k) => {
    if (irregObj[k] && !all[k]) {
      all[k] = irregObj[k];
    }
  });
  //ok, send this infinitive to all conjugators
  let inf = all['Infinitive'] || t.normal;

  //check suffix rules
  const suffObj = suffixes(inf);
  Object.keys(suffObj).forEach((k) => {
    if (suffObj[k] && !all[k]) {
      all[k] = suffObj[k];
    }
  });
  //ad-hoc each missing form
  //to Actor
  if (!all.Actor) {
    all.Actor = toActor_1(inf);
  }

  //use fallback, generic transformations
  Object.keys(all).forEach((k) => {
    if (!all[k] && generic_1[k]) {
      all[k] = generic_1[k](all);
    }
  });

  return all;
};

var conjugate_1 = conjugate;

//conjugation using auxillaries+adverbs and stuff
const multiWord = (vb, verbose) => {
  let isNegative = vb.negative.found;
  let isPlural = false;
  //handle 'to be' verb seperately
  if (vb.verb.tags.Copula || (vb.verb.normal === 'be' && vb.auxiliary.match('will').found)) {
    return toBe_1(isPlural, isNegative);
  }

  let obj = conjugate_1(vb.verb, verbose);
  //apply particles
  if (vb.particle.found) {
    Object.keys(obj).forEach((k) => {
      obj[k] = obj[k] + vb.particle.out();
    });
  }
  //apply adverbs
  if (vb.adverbs.found) {
    Object.keys(obj).forEach((k) => {
      obj[k] = obj[k] + vb.adverbs.out();
    });
  }
  //apply negative
  if (isNegative) {
    obj.PastTense = 'did not ' + obj.Infinitive;
    obj.PresentTense = 'does not ' + obj.Infinitive;
  }
  //future Tense is pretty straightforward
  if (!obj.FutureTense) {
    if (isNegative) {
      obj.FutureTense = 'will not ' + obj.Infinitive;
    } else {
      obj.FutureTense = 'will ' + obj.Infinitive;
    }
  }
  return obj;
};
var index$84 = multiWord;

//'walking' - aka progressive
const isContinuous = function(ts) {
  return ts.match('#Gerund').found;
};

//will not walk
const isNegative = function(ts) {
  let negs = ts.match('#Negative').list;
  if (negs.length === 2) {
    return false;
  }
  if (negs.length === 1) {
    return true;
  }
  return false;
};

//been walked by..
const isPassive = function(ts) {
  if (ts.match('is being #PastTense').found) {
    return true;
  }
  if (ts.match('(had|has) been #PastTense').found) {
    return true;
  }
  if (ts.match('will have been #PastTense').found) {
    return true;
  }
  return false;
};

//had walked
const isPerfect = function(ts) {
  if (ts.match('^(had|have) #PastTense')) {
    return true;
  }
  return false;
};

//should walk, could walk
const getModal = function(ts) {
  let modal = ts.match('#Modal');
  if (!modal.found) {
    return null;
  }
  return modal.out('normal');
};

//past/present/future
const getTense = function(ts) {
  //look at the preceding words
  if (ts.auxiliary.found) {
    //'will'
    if (ts.match('will have #PastTense').found) {
      return 'Past';
    }
    if (ts.auxiliary.match('will').found) {
      return 'Future';
    }
    //'was'
    if (ts.auxiliary.match('was').found) {
      return 'Past';
    }
  }
  //look at the main verb tense
  if (ts.verb) {
    const tenses = {
      PastTense: 'Past',
      FutureTense: 'Future',
      FuturePerfect: 'Future',
    };
    let tense = index$20(ts.verb); //yikes
    return tenses[tense] || 'Present';
  }
  return 'Present';
};

// const isImperative = function(ts) {};
// const isConditional = function(ts) {};

// detect signals in Auxiliary verbs
// 'will' -> future, 'have'->perfect, modals, negatives, adverbs
const interpret$1 = (ts) => {
  let isNeg = isNegative(ts);
  // let aux = ts.Auxiliary.clone();
  // aux = aux.not('(#Negative|#Adverb)');
  let obj = {
    negative: isNeg,
    continuous: isContinuous(ts),
    passive: isPassive(ts),
    perfect: isPerfect(ts),
    modal: getModal(ts),
    tense: getTense(ts),
  };
  return obj;
};
var interpret_1 = interpret$1;

//turns a verb negative - may not have enough information to do it properly
// (eg 'did not eat' vs 'does not eat') - needs the noun


const toNegative$1 = (ts) => {
  //would not walk
  let modal = ts.match('#Auxiliary').first(); //.notIf('(is|are|was|will|has|had)').first(); //.first();
  if (modal.found) {
    let index = modal.list[0].index();
    return ts.parentTerms.insertAt(index + 1, 'not', 'Verb');
  }

  //words that pair easily with a 'not' - 'is not'
  let copula = ts.match('(#Copula|will|has|had|do)').first();
  if (copula.found) {
    let index = copula.list[0].index();
    return ts.parentTerms.insertAt(index + 1, 'not', 'Verb');
  }

  let isPlural = ts.isPlural();

  //walked -> did not walk
  let past = ts.match('#PastTense').last();
  if (past.found) {
    let vb = past.list[0];
    let index = vb.index();
    vb.terms[0].text = index$18(vb.terms[0]);
    if (isPlural) {
      return ts.parentTerms.insertAt(index, 'do not', 'Verb');
    }
    return ts.parentTerms.insertAt(index, 'did not', 'Verb');
  }

  //walks -> does not walk
  let pres = ts.match('#PresentTense').first();
  if (pres.found) {
    let vb = pres.list[0];
    let index = vb.index();
    vb.terms[0].text = index$18(vb.terms[0]);
    //some things use 'do not', everything else is 'does not'
    let noun = ts.getNoun();
    if (noun.match('(i|we|they|you)').found) {
      return ts.parentTerms.insertAt(index, 'do not', 'Verb');
    }
    return ts.parentTerms.insertAt(index, 'does not', 'Verb');
  }

  //not walking
  let gerund = ts.match('#Gerund').last();
  if (gerund.found) {
    let index = gerund.list[0].index();
    return ts.parentTerms.insertAt(index, 'not', 'Verb');
  }

  //walk -> do not walk
  let vb = ts.match('#Verb').last();
  if (vb.found) {
    vb = vb.list[0];
    let index = vb.index();
    vb.terms[0].text = index$18(vb.terms[0]);
    if (isPlural) {
      return ts.parentTerms.insertAt(index, 'does not', 'Verb');
    }
    return ts.parentTerms.insertAt(index, 'did not', 'Verb');
  }

  return ts;
};
var toNegative_1$2 = toNegative$1;

//sometimes you can tell if a verb is plural/singular, just by the verb
// i am / we were
//othertimes you need its noun 'we walk' vs 'i walk'
const isPlural$2 = (vb) => {
  if (vb.match('(are|were|does)').found) {
    return true;
  }
  if (vb.match('(is|am|do|was)').found) {
    return false;
  }
  //consider its prior noun
  let noun = vb.getNoun();
  if (noun && noun.found) {
    if (noun.match('#Plural').found) {
      return true;
    }
    if (noun.match('#Singular').found) {
      return false;
    }
  }
  return null;
};
var isPlural_1$2 = isPlural$2;

const Terms$8 = paths$8.Terms;






class Verb$1 extends Terms$8 {
  constructor(arr, lexicon, refText, refTerms) {
    super(arr, lexicon, refText, refTerms);
    this.parse();
  }
  parse() {
    this.negative = this.match('#Negative');
    this.adverbs = this.match('#Adverb');
    let aux = this.clone().not('(#Adverb|#Negative)');
    this.verb = aux.match('#Verb').not('#Particle').last();
    this.particle = aux.match('#Particle').last();
    if (this.verb.found) {
      this.verb = this.verb.list[0].terms[0];
    }
    this.auxiliary = aux.match('#Auxiliary+');
  }
  data(verbose) {
    return {
      text: this.out('text'),
      normal: this.out('normal'),
      parts: {
        negative: this.negative.out('normal'),
        auxiliary: this.auxiliary.out('normal'),
        verb: this.verb.out('normal'),
        adverbs: this.adverbs.out('normal'),
      },
      interpret: interpret_1(this, verbose),
      conjugations: this.conjugate()
    };
  }
  getNoun() {
    if (!this.refTerms) {
      return null;
    }
    let str = '#Adjective? #Noun+ ' + this.out('normal');
    return this.refTerms.match(str).match('#Noun+');
  }
  //which conjugation is this right now?
  conjugation() {
    return interpret_1(this, false).tense;
  }
  //blast-out all forms
  conjugate(verbose) {
    return index$84(this, verbose);
  }

  isPlural() {
    return isPlural_1$2(this);
  }
  /** negation **/
  isNegative() {
    return this.match('#Negative').list.length === 1;
  }
  isPerfect() {
    return this.auxiliary.match('(have|had)').found;
  }
  toNegative() {
    if (this.isNegative()) {
      return this;
    }
    return toNegative_1$2(this);
  }
  toPositive() {
    return this.match('#Negative').delete();
  }

  /** conjugation **/
  toPastTense() {
    let obj = this.conjugate();
    return this.replaceWith(obj.PastTense);
  }
  toPresentTense() {
    let obj = this.conjugate();
    return this.replaceWith(obj.PresentTense);
  }
  toFutureTense() {
    let obj = this.conjugate();
    return this.replaceWith(obj.FutureTense);
  }
  toInfinitive() {
    let obj = this.conjugate();
    //NOT GOOD. please fix
    this.terms[this.terms.length - 1].text = obj.Infinitive;
    return this;
  }

  asAdjective() {
    return index$14(this.verb.out('normal'));
  }

}
var verb = Verb$1;

const hasCapital = /^[A-Z]/;

//sticking words at the start sentence-sensitive
const prepend = (ts, str) => {
  let firstTerm = ts.terms[0];
  ts.insertAt(0, str);
  //handle titlecase of first-word
  if (hasCapital.test(firstTerm.text)) {
    //is it titlecased because it should be?
    if (firstTerm.needsTitleCase() === false) {
      firstTerm.toLowerCase();
    }
    let newTerm = ts.terms[0];
    newTerm.toTitleCase();
  }
  return ts;
};

//sticking words on end sentence-sensitive
const append = (ts, str) => {
  let endTerm = ts.terms[ts.terms.length - 1];
  //move the sentence punctuation to the end
  let punct = endTerm.endPunctuation();
  if (punct) {
    endTerm.killPunctuation();
  }
  ts.insertAt(ts.terms.length, str);
  let newTerm = ts.terms[ts.terms.length - 1];
  if (punct) {
    newTerm.text += punct;
  }
  //move over sentence-ending whitespace too
  if (endTerm.whitespace.after) {
    newTerm.whitespace.after = endTerm.whitespace.after;
    endTerm.whitespace.after = '';
  }
  return ts;
};

var smartInsert = {
  append: append,
  prepend: prepend
};

const Terms$7 = paths$8.Terms;





class Sentence extends Terms$7 {
  constructor(arr, lexicon, refText, refTerms) {
    super(arr, lexicon, refText, refTerms);
  }
  /** inflect the main/first noun*/
  toSingular() {
    let nouns = this.match('#Noun').match('!#Pronoun').firstTerm();
    nouns.things().toSingular();
    return this;
  }
  toPlural() {
    let nouns = this.match('#Noun').match('!#Pronoun').firstTerm();
    nouns.things().toPlural();
    return this;
  }

  /** find the first important verbPhrase. returns a Term object */
  mainVerb() {
    let terms = this.match('(#Adverb|#Auxiliary|#Verb|#Negative|#Particle)+').if('#Verb'); //this should be (much) smarter
    if (terms.found) {
      terms = terms.list[0].terms;
      return new verb(terms, this.lexicon, this.refText, this.refTerms);
    }
    return null;
  }

  /** sentence tense conversion**/
  toPastTense() {
    let verb$$1 = this.mainVerb();
    if (verb$$1) {
      //this is really ugly..
      let start = verb$$1.out('normal');
      verb$$1.toPastTense();
      // console.log(verb.parentTerms.out() + '!');
      let end = verb$$1.out('normal');
      let r = this.parentTerms.replace(start, end);
      return r;
    }
    return this;
  }
  toPresentTense() {
    let verb$$1 = this.mainVerb();
    if (verb$$1) {
      let start = verb$$1.out('normal');
      verb$$1.toPresentTense();
      let end = verb$$1.out('normal');
      return this.parentTerms.replace(start, end);
    }
    return this;
  }
  toFutureTense() {
    let verb$$1 = this.mainVerb();
    if (verb$$1) {
      let start = verb$$1.out('normal');
      verb$$1.toFutureTense();
      let end = verb$$1.out('normal');
      return this.parentTerms.replace(start, end);
    }
    return this;
  }

  /** negation **/
  isNegative() {
    return this.match('#Negative').list.length === 1;
  }
  toNegative() {
    if (this.isNegative()) {
      return this;
    }
    return toNegative_1(this);
  }
  toPositive() {
    if (!this.isNegative()) {
      return this;
    }
    return toPositive_1(this);
  }

  /** smarter insert methods*/
  append(str) {
    return smartInsert.append(this, str);
  }
  prepend(str) {
    return smartInsert.prepend(this, str);
  }

  /** punctuation */
  setPunctuation(punct) {
    let last = this.terms[this.terms.length - 1];
    last.setPunctuation(punct);
  }
  getPunctuation() {
    let last = this.terms[this.terms.length - 1];
    return last.getPunctuation();
  }
  /** look for 'was _ by' patterns */
  isPassive() {
    return this.match('was #Adverb? #PastTense #Adverb? by').found; //haha
  }
}
var sentence = Sentence;

class Sentences extends index$2 {
  constructor(arr, lexicon, reference) {
    super(arr, lexicon, reference);
  }
  /** conjugate the main/first verb*/
  toPastTense() {
    this.list = this.list.map((ts) => {
      ts = ts.toPastTense();
      return new sentence(ts.terms, ts.lexicon, ts.refText, ts.refTerms);
    });
    return this;
  }
  toPresentTense() {
    this.list = this.list.map((ts) => {
      ts = ts.toPresentTense();
      return new sentence(ts.terms, ts.lexicon, ts.refText, ts.refTerms);
    });
    return this;
  }
  toFutureTense() {
    this.list = this.list.map((ts) => {
      ts = ts.toFutureTense();
      return new sentence(ts.terms, ts.lexicon, ts.refText, ts.refTerms);
    });
    return this;
  }
  /** negative/positive */
  toNegative() {
    this.list = this.list.map((ts) => {
      ts = ts.toNegative();
      return new sentence(ts.terms, ts.lexicon, ts.refText, ts.refTerms);
    });
    return this;
  }
  toPositive() {
    this.list = this.list.map((ts) => {
      ts = ts.toPositive();
      return new sentence(ts.terms, ts.lexicon, ts.refText, ts.refTerms);
    });
    return this;
  }

  /** look for 'was _ by' patterns */
  isPassive() {
    this.list = this.list.filter((ts) => {
      return ts.isPassive();
    });
    return this;
  }
  /** add a word to the start */
  prepend(str) {
    this.list = this.list.map((ts) => {
      return ts.prepend(str);
    });
    return this;
  }
  /** add a word to the end */
  append(str) {
    this.list = this.list.map((ts) => {
      return ts.append(str);
    });
    return this;
  }

  /** convert between question/statement/exclamation*/
  toExclamation() {
    this.list.forEach((ts) => {
      ts.setPunctuation('!');
    });
    return this;
  }
  toQuestion() {
    this.list.forEach((ts) => {
      ts.setPunctuation('?');
    });
    return this;
  }
  toStatement() {
    this.list.forEach((ts) => {
      ts.setPunctuation('.');
    });
    return this;
  }
  static find(r, n) {
    r = r.all();
    if (typeof n === 'number') {
      r = r.get(n);
    }
    r.list = r.list.map((ts) => {
      return new sentence(ts.terms, ts.lexicon, ts.refText, ts.refTerms);
    });
    // return new Text(r.list, r.lexicon, r.reference);
    return r;
  }
}

var index$82 = Sentences;

class Questions extends index$82 {
  static find(r, n) {
    r = r.all();
    if (typeof n === 'number') {
      r = r.get(n);
    }
    let list = r.list.filter((ts) => {
      return ts.last().endPunctuation() === '?';
    });
    return new index$82(list, this.lexicon, this.parent);
  }
}

var index$80 = Questions;

class Quotations extends index$2 {
  static find(r, n) {
    r = r.match('#Quotation+');
    if (typeof n === 'number') {
      r = r.get(n);
    }
    return r;
  }
}

var index$86 = Quotations;

class Statements extends index$82 {
  static find(r, n) {
    r = r.all();
    if (typeof n === 'number') {
      r = r.get(n);
    }
    let list = r.list.filter((ts) => {
      return ts.last().endPunctuation() !== '?';
    });
    return new index$82(list, this.lexicon, this.parent);
  }
}

var index$88 = Statements;

const Terms$10 = paths$8.Terms;
const tagSet = paths$8.tags;
const boringTags = {
  Auxiliary: 1,
  Possessive: 1,
  TitleCase: 1,
  ClauseEnd: 1,
  Comma: 1,
  CamelCase: 1,
  UpperCase: 1,
  Hyphenated: 1,
};

class Term$2 extends Terms$10 {
  constructor(arr, lexicon, refText, refTerms) {
    super(arr, lexicon, refText, refTerms);
    this.t = this.terms[0];
  }
  data() {
    let t = this.t;
    return {
      spaceBefore: t.whitespace.before,
      text: t.text,
      spaceAfter: t.whitespace.after,
      normal: t.normal,
      implicit: t.silent_term,
      bestTag: this.bestTag(),
      tags: Object.keys(t.tags),
    };
  }
  bestTag() {
    let tags = Object.keys(this.t.tags);
    tags = tags.sort(); //alphabetical, first
    //then sort by #of parent tags
    tags = tags.sort((a, b) => {
      //bury the tags we dont want
      if (boringTags[b] || !tagSet[a] || !tagSet[b]) {
        return -1;
      }
      if (tagSet[a].downward.length > tagSet[b].downward.length) {
        return -1;
      }
      return 1;
    });
    return tags[0];
  }
}
var term = Term$2;

class Terms$9 extends index$2 {
  data() {
    return this.list.map((ts) => {
      return ts.data();
    });
  }

  static find(r, n) {
    r = r.match('.');
    if (typeof n === 'number') {
      r = r.get(n);
    }
    r.list = r.list.map((ts) => {
      return new term(ts.terms, ts.lexicon, ts.refText, ts.refTerms);
    });
    return r;
  }
}

var index$90 = Terms$9;

class Things extends index$2 {
  static find(r, n) {
    r = r.clauses();
    //find people, places, and organizations
    let yup = r.people();
    yup.concat(r.places());
    yup.concat(r.organizations());
    //return them to normal ordering
    yup.sort('chronological');
    // yup.unique() //? not sure
    if (typeof n === 'number') {
      yup = yup.get(n);
    }
    return yup;
  }
}

var index$92 = Things;

class Urls extends index$2 {
  static find(r, n) {
    r = r.match('#Url');
    if (typeof n === 'number') {
      r = r.get(n);
    }
    return r;
  }
}

var index$94 = Urls;

//parse a string like "4,200.1" into Number 4200.1
const parseNumeric = (str) => {
  //remove ordinal - 'th/rd'
  str = str.replace(/1st$/, '1');
  str = str.replace(/2nd$/, '2');
  str = str.replace(/3rd$/, '3');
  str = str.replace(/([4567890])r?th$/, '$1');
  //remove prefixes
  str = str.replace(/^[$€¥£¢]/, '');
  //remove suffixes
  str = str.replace(/[%$€¥£¢]$/, '');
  //remove commas
  str = str.replace(/,/g, '');
  //split '5kg' from '5'
  str = str.replace(/([0-9])([a-z]{1,2})$/, '$1');
  return parseFloat(str);
};

var parseNumeric_1 = parseNumeric;

//support global multipliers, like 'half-million' by doing 'million' then multiplying by 0.5
const findModifiers = (str) => {
  const mults = [{
    reg: /^(minus|negative)[\s\-]/i,
    mult: -1
  }, {
    reg: /^(a\s)?half[\s\-](of\s)?/i,
    mult: 0.5
  },
  //  {
  //   reg: /^(a\s)?quarter[\s\-]/i,
  //   mult: 0.25
  // }
  ];
  for (let i = 0; i < mults.length; i++) {
    if (mults[i].reg.test(str) === true) {
      return {
        amount: mults[i].mult,
        str: str.replace(mults[i].reg, '')
      };
    }
  }
  return {
    amount: 1,
    str: str
  };
};

var findModifiers_1 = findModifiers;

var paths$10 = paths$8;

const numbers$3 = paths$10.data.numbers;
const fns$11 = paths$10.fns;

//setup number-word data
const ones = fns$11.extend(numbers$3.ordinal.ones, numbers$3.cardinal.ones);
const teens = fns$11.extend(numbers$3.ordinal.teens, numbers$3.cardinal.teens);
const tens = fns$11.extend(numbers$3.ordinal.tens, numbers$3.cardinal.tens);
const multiples$1 = fns$11.extend(numbers$3.ordinal.multiples, numbers$3.cardinal.multiples);
var data$7 = {
  ones: ones,
  teens: teens,
  tens: tens,
  multiples: multiples$1
};

//prevent things like 'fifteen ten', and 'five sixty'
const isValid = (w, has) => {
  if (data$7.ones[w]) {
    if (has.ones || has.teens) {
      return false;
    }
  } else if (data$7.teens[w]) {
    if (has.ones || has.teens || has.tens) {
      return false;
    }
  } else if (data$7.tens[w]) {
    if (has.ones || has.teens || has.tens) {
      return false;
    }
  }
  return true;
};
var validate = isValid;

//concatenate into a string with leading '0.'
const parseDecimals = function(arr) {
  let str = '0.';
  for (let i = 0; i < arr.length; i++) {
    let w = arr[i];
    if (data$7.ones[w] !== undefined) {
      str += data$7.ones[w];
    } else if (data$7.teens[w] !== undefined) {
      str += data$7.teens[w];
    } else if (data$7.tens[w] !== undefined) {
      str += data$7.tens[w];
    } else if (/^[0-9]$/.test(w) === true) {
      str += w;
    } else {
      return 0;
    }
  }
  return parseFloat(str);
};

var parseDecimals_1 = parseDecimals;

const improperFraction = /^([0-9,\. ]+)\/([0-9,\. ]+)$/;

//some numbers we know
const casualForms = {
  // 'a few': 3,
  'a couple': 2,
  'a dozen': 12,
  'two dozen': 24,
  'zero': 0,
};

// a 'section' is something like 'fifty-nine thousand'
// turn a section into something we can add to - like 59000
const section_sum = (obj) => {
  return Object.keys(obj).reduce((sum, k) => {
    sum += obj[k];
    return sum;
  }, 0);
};

const alreadyNumber = (ts) => {
  for(let i = 0; i < ts.terms.length; i++) {
    if (!ts.terms[i].tags.NumericValue) {
      return false;
    }
  }
  return true;
};

//turn a string into a number
const parse = function(ts) {
  let str = ts.out('normal');
  //convert some known-numbers
  if (casualForms[str] !== undefined) {
    return casualForms[str];
  }
  //'a/an' is 1
  if (str === 'a' || str === 'an') {
    return 1;
  }
  //handle a string of mostly numbers
  if (alreadyNumber(ts)) {
    return parseNumeric_1(ts.out('normal'));
  }
  const modifier = findModifiers_1(str);
  str = modifier.str;
  let last_mult = null;
  let has = {};
  let sum = 0;
  let isNegative = false;
  const terms = str.split(/[ -]/);
  for (let i = 0; i < terms.length; i++) {
    let w = terms[i];
    if (!w || w === 'and') {
      continue;
    }
    if (w === '-' || w === 'negative') {
      isNegative = true;
      continue;
    }
    if (w.charAt(0) === '-') {
      isNegative = true;
      w = w.substr(1);
    }
    //decimal mode
    if (w === 'point') {
      sum += section_sum(has);
      sum += parseDecimals_1(terms.slice(i + 1, terms.length));
      sum *= modifier.amount;
      return sum;
    }
    //improper fraction
    const fm = w.match(improperFraction);
    if (fm) {
      const num = parseFloat(fm[1].replace(/[, ]/g, ''));
      const denom = parseFloat(fm[2].replace(/[, ]/g, ''));
      if (denom) {
        sum += (num / denom) || 0;
      }
      continue;
    }
    //prevent mismatched units, like 'seven eleven'
    if (validate(w, has) === false) {
      return null;
    }
    //buildup section, collect 'has' values
    if (/^[0-9\.]+$/.test(w)) {
      has['ones'] = parseFloat(w); //not technically right
    } else if (data$7.ones[w]) {
      has['ones'] = data$7.ones[w];
    } else if (data$7.teens[w]) {
      has['teens'] = data$7.teens[w];
    } else if (data$7.tens[w]) {
      has['tens'] = data$7.tens[w];
    } else if (data$7.multiples[w]) {
      let mult = data$7.multiples[w];
      //something has gone wrong : 'two hundred five hundred'
      if (mult === last_mult) {
        return null;
      }
      //support 'hundred thousand'
      //this one is tricky..
      if (mult === 100 && terms[i + 1] !== undefined) {
        // has['hundreds']=
        const w2 = terms[i + 1];
        if (data$7.multiples[w2]) {
          mult *= data$7.multiples[w2]; //hundredThousand/hundredMillion
          i += 1;
        }
      }
      //natural order of things
      //five thousand, one hundred..
      if (last_mult === null || mult < last_mult) {
        sum += (section_sum(has) || 1) * mult;
        last_mult = mult;
        has = {};
      } else {
        //maybe hundred .. thousand
        sum += section_sum(has);
        last_mult = mult;
        sum = (sum || 1) * mult;
        has = {};
      }
    }
  }
  //dump the remaining has values
  sum += section_sum(has);
  //post-process add modifier
  sum *= modifier.amount;
  sum *= isNegative ? -1 : 1;
  //dont return 0, if it went straight-through
  if (sum === 0) {
    return null;
  }
  return sum;
};

var index$98 = parse;

// turns an integer/float into a textual number, like 'fifty-five'

//turn number into an array of magnitudes, like [[5, million], [2, hundred]]
const breakdown_magnitudes = function(num) {
  let working = num;
  let have = [];
  const sequence = [
    [1000000000, 'million'],
    [100000000, 'hundred million'],
    [1000000, 'million'],
    [100000, 'hundred thousand'],
    [1000, 'thousand'],
    [100, 'hundred'],
    [1, 'one']
  ];
  sequence.forEach((a) => {
    if (num > a[0]) {
      let howmany = Math.floor(working / a[0]);
      working -= howmany * a[0];
      if (howmany) {
        have.push({
          unit: a[1],
          count: howmany
        });
      }
    }
  });
  return have;
};

//turn numbers from 100-0 into their text
const breakdown_hundred = function(num) {
  const tens_mapping = [
    ['ninety', 90],
    ['eighty', 80],
    ['seventy', 70],
    ['sixty', 60],
    ['fifty', 50],
    ['forty', 40],
    ['thirty', 30],
    ['twenty', 20]
  ];
  const ones_mapping = [
    '',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen'
  ];
  let arr = [];
  for (let i = 0; i < tens_mapping.length; i++) {
    if (num >= tens_mapping[i][1]) {
      num -= tens_mapping[i][1];
      arr.push(tens_mapping[i][0]);
    }
  }
  //(hopefully) we should only have 20-0 now
  if (ones_mapping[num]) {
    arr.push(ones_mapping[num]);
  }
  return arr
};

/** print-out 'point eight nine'*/
const handle_decimal = (num) => {
  const names = [
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine'
  ];
  let arr = [];
  //parse it out like a string, because js math is such shit
  let decimal = ('' + num).match(/\.([0-9]+)/);
  if (!decimal || !decimal[0]) {
    return arr
  }
  arr.push('point');
  let decimals = decimal[0].split('');
  for (let i = 0; i < decimals.length; i++) {
    arr.push(names[decimals[i]]);
  }
  return arr
};

/** turns an integer into a textual number */
const to_text = function(num) {
  let arr = [];
  //handle negative numbers
  if (num < 0) {
    arr.push('negative');
    num = Math.abs(num);
  }
  //break-down into units, counts
  let units = breakdown_magnitudes(num);
  //build-up the string from its components
  for (let i = 0; i < units.length; i++) {
    let unit_name = units[i].unit;
    if (unit_name === 'one') {
      unit_name = '';
      //put an 'and' in here
      if (arr.length > 1) {
        arr.push('and');
      }
    }
    arr = arr.concat(breakdown_hundred(units[i].count));
    arr.push(unit_name);
  }
  //also support decimals - 'point eight'
  arr = arr.concat(handle_decimal(num));
  //remove empties
  arr = arr.filter((s) => s);
  if (arr.length === 0) {
    arr[0] = 'zero';
  }
  return arr
};

var index$100 = to_text;

// console.log(to_text(-1000.8));

const niceNumber = function (num) {
  if (!num && num !== 0) {
    return null;
  }
  num = '' + num;
  let x = num.split('.');
  let x1 = x[0];
  let x2 = x.length > 1 ? '.' + x[1] : '';
  let rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }
  return x1 + x2;
};
var toNiceNumber = niceNumber;

//turn a number like 5 into an ordinal like 5th
const numOrdinal = function(ts) {
  let num = index$98(ts);
  if (!num && num !== 0) {
    return null;
  }
  //the teens are all 'th'
  let tens = num % 100;
  if (tens > 10 && tens < 20) {
    return '' + num + 'th';
  }
  //the rest of 'em
  const mapping = {
    0: 'th',
    1: 'st',
    2: 'nd',
    3: 'rd'
  };
  let str = '' + num;
  let last = str.slice(str.length - 1, str.length);
  if (mapping[last]) {
    str += mapping[last];
  } else {
    str += 'th';
  }
  return str;
};

var index$102 = numOrdinal;

const ordinalWord = paths$8.data.ordinalMap.toOrdinal;
//
const textOrdinal = (ts) => {
  let num = index$98(ts);
  let words = index$100(num);
  //convert the last number to an ordinal
  let last = words[words.length - 1];
  words[words.length - 1] = ordinalWord[last] || last;
  return words.join(' ');
};

var index$104 = textOrdinal;

const Terms$11 = paths$8.Terms;






const isOrdinal = (ts) => {
  let t = ts.terms[ts.terms.length - 1];
  if (!t) {
    return false;
  }
  return t.tags.Ordinal === true;
};
const isText = (ts) => {
  for(let i = 0; i < ts.terms.length; i++) {
    if (ts.terms[i].tags.TextValue) {
      return true;
    }
  }
  return false;
};
const isNumber = (ts) => {
  for(let i = 0; i < ts.terms.length; i++) {
    let t = ts.terms[i];
    if (t.tags.TextValue || t.tags.NiceNumber || !t.tags.NumericValue) {
      return false;
    }
  }
  return true;
};

class Value extends Terms$11 {
  constructor(arr, lexicon, refText, refTerms) {
    super(arr, lexicon, refText, refTerms);
    this.val = this.match('#Value+').list[0];
    this.unit = this.match('#Unit$').list[0];
  }
  number() {
    let num = index$98(this.val);
    return num;
  }
  /** five -> '5' */
  toNumber() {
    let val = this.val;
    // this.debug();
    //is already
    if (isNumber(val)) {
      return this;
    }
    //otherwise,
    if (isOrdinal(val)) {
      let num = index$102(val);
      this.replaceWith(num, 'Value');
    } else {
      let num = index$98(val);
      // console.log(num);
      if (num !== null) {
        this.replaceWith('' + num, 'Value');
      }
    }
    return this;
  }
  /**5 -> 'five' */
  toTextValue() {
    let val = this.val;
    //is already
    if (isText(val)) {
      return this;
    }
    //otherwise, parse it
    if (isOrdinal(val)) {
      let str = index$104(val);
      return this.replaceWith(str, 'Value');
    }
    let num = '' + index$98(val);
    let str = index$100(num).join(' ');
    this.replaceWith(str, 'Value');
    return this;
  }

  /**5th -> 5 */
  toCardinal() {
    let val = this.val;
    //already
    if (!isOrdinal(val)) {
      return this;
    }
    //otherwise,
    if (isText(val)) {
      let num = '' + index$98(val);
      let str = index$100(num).join(' ');
      return this.replaceWith(str, 'Value');
    }
    let num = '' + index$98(val);
    return this.replaceWith(num, 'Value');
  }

  /**5 -> 5th */
  toOrdinal() {
    let val = this.val;
    //already
    if (isOrdinal(val)) {
      return this;
    }
    //otherwise,
    if (isText(val)) {
      let str = index$104(val);
      this.replaceWith(str, 'Value');
    } else {
      //number-ordinal
      let str = index$102(val);
      this.replaceWith(str, 'Value');
    }
    return this;
  }

  /**5900 -> 5,900 */
  toNiceNumber() {
    let num = index$98(this);
    let str = toNiceNumber(num);
    this.replaceWith(str, 'Value');
    return this;
  }

  data() {
    let numV = this.clone().toNumber();
    let txtV = this.clone().toTextValue();
    let obj = {
      NumericValue: {
        cardinal: numV.toCardinal().out('text'),
        ordinal: numV.toOrdinal().out('text'),
        nicenumber: this.toNiceNumber().out('text'),
      },
      TextValue : {
        cardinal: txtV.toCardinal().out('text'),
        ordinal: txtV.toOrdinal().out('text'),
      },
      unit: ''
    };
    if (this.unit) {
      obj.unit = this.unit.out('text');
    }
    obj.number = this.number();
    return obj;
  }
}
Value.prototype.clone = function() {
  let terms = this.terms.map((t) => {
    return t.clone();
  });
  return new Value(terms, this.lexicon, this.refText, this.refTerms);
};
var value = Value;

class Values extends index$2 {
  data() {
    return this.list.map((ts) => {
      return ts.data();
    });
  }
  noDates() {
    return this.not('#Date');
  }
  /** five -> 5 */
  numbers() {
    return this.list.map((ts) => {
      return ts.number();
    });
  }
  /** five -> '5' */
  toNumber() {
    this.list = this.list.map((ts) => {
      return ts.toNumber();
    });
    return this;
  }
  /**5 -> 'five' */
  toTextValue() {
    this.list = this.list.map((ts) => {
      return ts.toTextValue();
    });
    return this;
  }
  /**5th -> 5 */
  toCardinal() {
    this.list = this.list.map((ts) => {
      return ts.toCardinal();
    });
    return this;
  }
  /**5 -> 5th */
  toOrdinal() {
    this.list = this.list.map((ts) => {
      return ts.toOrdinal();
    });
    return this;
  }
  /**5900 -> 5,900 */
  toNiceNumber() {
    this.list = this.list.map((ts) => {
      return ts.toNiceNumber();
    });
    return this;
  }
  static find(r, n) {
    r = r.match('#Value+');
    // r = r.match('#Value+ #Unit?');

    //june 21st 1992 is two seperate values
    r.splitOn('#Year');
    // r.debug();
    if (typeof n === 'number') {
      r = r.get(n);
    }
    r.list = r.list.map((ts) => {
      return new value(ts.terms, ts.lexicon, ts.refText, ts.refTerms);
    });
    return r;
  }
}
Values.prototype.clone = function() {
  let list = this.list.map((ts) => {
    return ts.clone();
  });
  return new Values(list, this.lexicon);
};
var index$96 = Values;

class Verbs extends index$2 {
  constructor(arr, lexicon, reference) {
    super(arr, lexicon, reference);
  }
  data() {
    return this.list.map((ts) => {
      return ts.data();
    });
  }
  conjugation(verbose) {
    return this.list.map((ts) => {
      return ts.conjugation(verbose);
    });
  }
  conjugate(verbose) {
    return this.list.map((ts) => {
      return ts.conjugate(verbose);
    });
  }

  /** plural/singular **/
  isPlural() {
    this.list = this.list.filter((ts) => {
      return ts.isPlural();
    });
    return this;
  }
  isSingular() {
    this.list = this.list.filter((ts) => {
      return !ts.isPlural();
    });
    return this;
  }

  /** negation **/
  isNegative() {
    this.list = this.list.filter((ts) => {
      return ts.isNegative();
    });
    return this;
  }
  isPositive() {
    this.list = this.list.filter((ts) => {
      return !ts.isNegative();
    });
    return this;
  }
  toNegative() {
    this.list = this.list.map((ts) => {
      return ts.toNegative();
    });
    return this;
  }
  toPositive() {
    this.list.forEach((ts) => {
      ts.toPositive();
    });
    return this;
  }

  /** tense **/
  toPastTense() {
    this.list.forEach((ts) => {
      ts.toPastTense();
    });
    return this;
  }
  toPresentTense() {
    this.list.forEach((ts) => {
      ts.toPresentTense();
    });
    return this;
  }
  toFutureTense() {
    this.list.forEach((ts) => {
      ts.toFutureTense();
    });
    return this;
  }
  toInfinitive() {
    this.list.forEach((ts) => {
      ts.toInfinitive();
    });
    return this;
  }
  asAdjective() {
    return this.list.map((ts) => ts.asAdjective());
  }

  static find(r, n) {
    r = r.match('(#Adverb|#Auxiliary|#Verb|#Negative|#Particle)+').if('#Verb'); //this should be (much) smarter
    r = r.splitAfter('#Comma');
    if (typeof n === 'number') {
      r = r.get(n);
    }
    r.list = r.list.map((ts) => {
      return new verb(ts.terms, ts.lexicon, ts.refText, ts.refTerms);
    });
    return new index$2(r.list, this.lexicon, this.parent);
  }
}


var index$106 = Verbs;

const Terms$12 = paths$8.Terms;

//this is one-or-more terms together, sorted by frequency
class Gram extends Terms$12 {
  constructor(arr, lexicon, refText, refTerms) {
    super(arr, lexicon, refText, refTerms);
    //string to sort/uniq by
    this.key = this.out('normal');
    //bigram/trigram/etc
    this.size = arr.length;
    //number of occurances
    this.count = 1;
  }
  inc() {
    this.count += 1;
  }
}
var gram = Gram;

//do all grams of one size, on one termList
const getGrams = function(fts, n) {
  let terms = fts.terms;
  if (terms.length < n) {
    return [];
  }
  let arr = [];
  for(let i = 0; i < terms.length - n + 1; i++) {
    let gram$$1 = new gram(terms.slice(i, i + n));
    arr.push(gram$$1);
  }
  return arr;
};

//left-sided grams
const startGram = function(fts, n) {
  let terms = fts.terms;
  if (terms.length < n) {
    return [];
  }
  let arr = [
    new gram(terms.slice(0, n)),
  ];
  return arr;
};

//right-sided grams
const endGram = function(fts, n) {
  let terms = fts.terms;
  if (terms.length < n) {
    return [];
  }
  let arr = [
    new gram(terms.slice(terms.length - n, terms.length))
  ];
  return arr;
};

//ngrams are consecutive terms of a specific size
const buildGrams = function(r, options) {
  options = options || {};
  options.size = options.size || [1, 2, 3];
  if (typeof options.size === 'number') {
    options.size = [options.size];
  }
  let obj = {};
  //collect and count all grams
  options.size.forEach((size) => {
    r.list.forEach((ts) => {
      let grams = [];
      if (options.edge === 'start') {
        grams = startGram(ts, size);
      } else if (options.edge === 'end') {
        grams = endGram(ts, size);
      } else {
        grams = getGrams(ts, size);
      }
      grams.forEach((g) => {
        if (obj[g.key]) {
          obj[g.key].inc();
        } else {
          obj[g.key] = g;
        }
      });
    });
  });

  //flatten to an array
  let arr = Object.keys(obj).map((k) => obj[k]);
  return arr;
};

var getGrams_1 = buildGrams;

class Ngrams extends index$2 {
  data() {
    return this.list.map((ts) => {
      return {
        normal: ts.out('normal'),
        count: ts.count,
        size: ts.size
      };
    });
  }
  unigrams() {
    this.list = this.list.filter((g) => g.size === 1);
    return this;
  }
  bigrams() {
    this.list = this.list.filter((g) => g.size === 2);
    return this;
  }
  trigrams() {
    this.list = this.list.filter((g) => g.size === 3);
    return this;
  }

  //default sort the ngrams
  sort() {
    this.list = this.list.sort((a, b) => {
      if (a.count > b.count) {
        return -1;
      }
      //(tie-braker)
      if (a.count === b.count && (a.size > b.size || a.key.length > b.key.length)) {
        return -1;
      }
      return 1;
    });
    return this;
  }

  static find(r, n, size) {
    let opts = {
      size: [1, 2, 3, 4]
    };
    //only look for bigrams, for example
    if (size) {
      opts.size = [size];
    }
    //fetch them
    let arr = getGrams_1(r, opts);
    r = new Ngrams(arr);
    //default sort
    r.sort();
    //grab top one, or something
    if (typeof n === 'number') {
      r = r.get(n);
    }
    return r;
  }
}

var index$108 = Ngrams;

//like an n-gram, but only the startings of matches
class StartGrams extends index$108 {

  static find(r, n, size) {
    let opts = {
      size: [1, 2, 3, 4],
      edge: 'start'
    };
    //only look for bigrams, for example
    if (size) {
      opts.size = [size];
    }
    //fetch them
    let arr = getGrams_1(r, opts);
    r = new StartGrams(arr);
    //default sort
    r.sort();
    //grab top one, or something
    if (typeof n === 'number') {
      r = r.get(n);
    }
    return r;
  }
}

var startGrams = StartGrams;

//like an n-gram, but only the endings of matches
class EndGrams extends index$108 {

  static find(r, n, size) {
    let opts = {
      size: [1, 2, 3, 4],
      edge: 'end'
    };
    //only look for bigrams, for example
    if (size) {
      opts.size = [size];
    }
    //fetch them
    let arr = getGrams_1(r, opts);
    r = new EndGrams(arr);
    //default sort
    r.sort();
    //grab top one, or something
    if (typeof n === 'number') {
      r = r.get(n);
    }
    return r;
  }
}

var endGrams = EndGrams;

//a Text is an array of termLists
class Text {
  constructor(arr, lexicon, reference, tagSet) {
    this.list = arr || [];
    this.reference = reference;
    this.tagSet = tagSet;
  }
  //getter/setters
  /** did it find anything? */
  get found() {
    return this.list.length > 0;
  }
  /** how many Texts are there?*/
  get length() {
    return this.list.length;
  }
  get isA() {
    return 'Text';
  }
  get parent() {
    return this.reference || this;
  }
  set parent(r) {
    this.reference = r;
    return this;
  }
  all() {
    return this.parent;
  }
  index() {
    return this.list.map((ts) => ts.index());
  }
  wordCount() {
    return this.terms().length;
  }
  data() {
    return this.list.map((ts) => {
      return {
        normal: ts.out('normal'),
        text: ts.out('text')
      };
    });
  }
  debug(opts) {
    return out(this, 'debug', opts);
  }
  get whitespace() {
    return {
      before: (str) => {
        this.list.forEach((ts) => {
          ts.whitespace.before(str);
        });
        return this;
      },
      after: (str) => {
        this.list.forEach((ts) => {
          ts.whitespace.after(str);
        });
        return this;
      }
    };
  }
}

var index$2 = Text;
misc(Text);
loops$2(Text);
index$46(Text);
index$48(Text);
index$50(Text);
split$5(Text);
normalize$3(Text);

const subset = {
  acronyms: index$52,
  adjectives: index$54,
  adverbs: index$56,
  clauses: index$58,
  contractions: index$60,
  dates: index$62,
  hashTags: index$68,
  nouns: index$70,
  organizations: index$72,
  people: index$74,
  phoneNumbers: index$76,
  places: index$78,
  questions: index$80,
  quotations: index$86,
  sentences: index$82,
  statements: index$88,
  terms: index$90,
  topics: index$92,
  urls: index$94,
  values: index$96,
  verbs: index$106,
  ngrams: index$108,
  startGrams: startGrams,
  endGrams: endGrams,
};
//term subsets
Object.keys(subset).forEach((k) => {
  Text.prototype[k] = function (num, arg) {
    let sub = subset[k];
    let m = sub.find(this, num, arg);
    return new subset[k](m.list, this.lexicon, this.parent);
  };
});

const abbreviations$1 = Object.keys(index$10.abbreviations);
//regs-
const abbrev_reg = new RegExp('\\b(' + abbreviations$1.join('|') + ')[.!?] ?$', 'i');
const acronym_reg = new RegExp('[ |\.][A-Z]\.?( *)?$', 'i');
const elipses_reg = new RegExp('\\.\\.+( +)?$');

//start with a regex:
const naiive_split = function (text) {
  let all = [];
  //first, split by newline
  let lines = text.split(/(\n+)/);
  for(let i = 0; i < lines.length; i++) {
    //split by period, question-mark, and exclamation-mark
    let arr = lines[i].split(/(\S.+?[.!?])(?=\s+|$)/g);
    for(let o = 0; o < arr.length; o++) {
      all.push(arr[o]);
    }
  }
  return all;
};

const sentence_parser = function (text) {
  text = text || '';
  text = '' + text;
  let sentences = [];
  //first do a greedy-split..
  let chunks = [];
  //ensure it 'smells like' a sentence
  if (!text || typeof text !== 'string' || /\S/.test(text) === false) {
    return sentences;
  }
  //start somewhere:
  let splits = naiive_split(text);
  //filter-out the grap ones
  for (let i = 0; i < splits.length; i++) {
    let s = splits[i];
    if (s === undefined || s === '') {
      continue;
    }
    //this is meaningful whitespace
    if (/\S/.test(s) === false) {
      //add it to the last one
      if (chunks[chunks.length - 1]) {
        chunks[chunks.length - 1] += s;
        continue;
      } else if (splits[i + 1]) { //add it to the next one
        splits[i + 1] = s + splits[i + 1];
        continue;
      }
    }
    //else, only whitespace, no terms, no sentence
    chunks.push(s);
  }

  //detection of non-sentence chunks:
  //loop through these chunks, and join the non-sentence chunks back together..
  for (let i = 0; i < chunks.length; i++) {
    let c = chunks[i];
    //should this chunk be combined with the next one?
    if (chunks[i + 1] !== undefined && (abbrev_reg.test(c) || acronym_reg.test(c) || elipses_reg.test(c))) {
      chunks[i + 1] = c + (chunks[i + 1] || '');
    } else if (c && c.length > 0) { //this chunk is a proper sentence..
      sentences.push(c);
      chunks[i] = '';
    }
  }
  //if we never got a sentence, return the given text
  if (sentences.length === 0) {
    return [text];
  }
  return sentences;
};

var tokenize = sentence_parser;
// console.log(sentence_parser('john f. kennedy'));

const Terms = paths$8.Terms;
const fns = paths$8.fns;
const normalize = normalize$1.normalize;

//basically really dirty and stupid.
const normalizeLex = function(lex) {
  lex = lex || {};
  return Object.keys(lex).reduce((h, k) => {
    //add natural form
    h[k] = lex[k];
    let normal = normalize(k);
    //remove periods
    //normalize whitesace
    normal = normal.replace(/\s+/, ' ');
    //remove sentence-punctuaion too
    normal = normal.replace(/[.\?\!]/g, '');
    if (k !== normal) {
      //add it too
      h[normal] = lex[k];
    }
    return h;
  }, {});
};

const fromString = (str, lexicon) => {
  let sentences = [];
  //allow pre-tokenized input
  if (fns.isArray(str)) {
    sentences = str;
  } else {
    str = fns.ensureString(str);
    sentences = tokenize(str);
  }
  //make sure lexicon obeys standards
  lexicon = normalizeLex(lexicon);
  let list = sentences.map((s) => Terms.fromString(s, lexicon));

  let r = new index$2(list, lexicon);
  //give each ts a ref to the result
  r.list.forEach((ts) => {
    ts.refText = r;
  });
  return r;
};
var build = fromString;

var author = "Spencer Kelly <spencermountain@gmail.com> (http://spencermounta.in)";
var name = "compromise";
var description = "natural language processing in the browser";
var version = "9.0.0";
var main$1 = "./builds/compromise.js";
var repository = {"type":"git","url":"git://github.com/nlp-compromise/compromise.git"};
var scripts = {"test":"node ./scripts/test.js","browsertest":"node ./scripts/browserTest.js","build":"node ./scripts/build/index.js","demo":"node ./scripts/demo.js","watch":"node ./scripts/watch.js","filesize":"node ./scripts/filesize.js","coverage":"node ./scripts/coverage.js"};
var files = ["builds/","docs/"];
var dependencies = {};
var devDependencies = {"babel-plugin-transform-es3-member-expression-literals":"^6.22.0","babel-plugin-transform-es3-property-literals":"^6.22.0","babel-preset-es2015":"6.9.0","babel-preset-stage-2":"^6.11.0","babelify":"7.3.0","babili":"0.0.11","browserify":"13.0.1","browserify-glob":"^0.2.0","chalk":"^1.1.3","codacy-coverage":"^2.0.0","derequire":"^2.0.3","efrt":"0.0.4","eslint":"^3.1.1","gaze":"^1.1.1","http-server":"0.9.0","nlp-corpus":"latest","nyc":"^8.4.0","rollup":"^0.41.6","rollup-plugin-commonjs":"^8.0.2","rollup-plugin-json":"^2.1.0","rollup-plugin-node-resolve":"^3.0.0","shelljs":"^0.7.2","tap-min":"^1.1.0","tap-spec":"4.1.1","tape":"4.6.0","uglify-js":"2.7.0"};
var license = "MIT";
var _package = {
	author: author,
	name: name,
	description: description,
	version: version,
	main: main$1,
	repository: repository,
	scripts: scripts,
	files: files,
	dependencies: dependencies,
	devDependencies: devDependencies,
	license: license
};

var _package$1 = Object.freeze({
	author: author,
	name: name,
	description: description,
	version: version,
	main: main$1,
	repository: repository,
	scripts: scripts,
	files: files,
	dependencies: dependencies,
	devDependencies: devDependencies,
	license: license,
	default: _package
});

var pkg = ( _package$1 && _package ) || _package$1;

var index = createCommonjsModule(function (module) {
'use strict';




//the main thing
const nlp = function (str, lexicon) {
  let r = build(str, lexicon);
  r.tagger();
  return r;
};

//same as main method, except with no POS-tagging.
nlp.tokenize = function(str) {
  return build(str);
};

//this is handy
nlp.version = pkg.version;

//so handy at times
nlp.lexicon = function() {
  return lexicon_1;
};

//also this is much handy
nlp.verbose = function(str) {
  index$28.enable(str);
};

//and then all-the-exports...
if (typeof self !== 'undefined') {
  self.nlp = nlp; // Web Worker
} else if (typeof window !== 'undefined') {
  window.nlp = nlp; // Browser
} else if (typeof commonjsGlobal !== 'undefined') {
  commonjsGlobal.nlp = nlp; // NodeJS
}
//don't forget amd!
if (typeof undefined === 'function' && undefined.amd) {
  undefined(nlp);
}
//then for some reason, do this too!
{
  module.exports = nlp;
}
});

return index;

}());
