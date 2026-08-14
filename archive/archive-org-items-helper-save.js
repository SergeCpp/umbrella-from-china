/* Checking and Initial Filtering Items, and Calculating Stats */

function filter_base(stats_items, stats_date,
  archived_min, archived_max, created_min, created_max,
  collections, creators, title, is_title_identifier) {

  const archived_base_is_year  = archived_min.base === "year";
  const  created_base_is_year  =  created_min.base === "year";

  // UTC date, is the earliest for entire thematic stat
  const  created_audio_default = Date.parse("2012-01-01T00:00:00Z");

  // To count one day for an item published on the day before
  const calc_date_ms   = Date.parse(stats_date + "T11:59:59.999Z");

  const filtered_items = [];

//parse: 3.60 ms
//round: 2.00 ms
//const _ts = performance.now();

  for (let i = 0; i < stats_items.length; i++) {
    const doc = stats_items[i];

    /* Checking and Initial Filtering Items */

    // Identifier and Title
    const identifier_str = doc.identifier;
    const      title_str = doc.title;
    if (!identifier_str || !title_str) continue;

    // Mediatype
    const mediatype_str = doc.mediatype;
    if  ((mediatype_str !== "movies") && // Movies is the most frequent type
         (mediatype_str !== "audio" )) continue;

    // Item Size
    const item_size_str = doc.item_size;
    if  (!item_size_str) continue;
    const item_size = parseInt(item_size_str, 10);
    if (isNaN(item_size) || (item_size < 0)) continue;

    // Created
    const date_str = doc.date; // Can be not set for an item
    let   date;

    if (date_str) {
      date = Date.parse(date_str);
      if (isNaN(date)) continue;
    }
    else { // No date is set for an item
      if (mediatype_str !== "audio") continue; // Set default date to audio item only
      date = created_audio_default;
    }

    if (!created_base_is_year) date = new Date(date);
    if (!filter_date(date, created_min, created_max)) continue;

    // Archived
    const publicdate_str = doc.publicdate;
    if  (!publicdate_str)  continue;

    const publicdate_ms  = Date.parse(publicdate_str);
    if (isNaN(publicdate_ms)) continue;

    const publicdate     = archived_base_is_year ? publicdate_ms : new Date(publicdate_ms);
    if (!filter_date(publicdate, archived_min, archived_max)) continue;

    // Views
    const downloads_str = doc.downloads;
    const     month_str = doc.month;
    const      week_str = doc.week;

    if (!downloads_str || !month_str || !week_str) continue;

    const downloads = parseInt(downloads_str, 10);
    const month     = parseInt(    month_str, 10);
    const week      = parseInt(     week_str, 10);

    if (isNaN(downloads) || isNaN(month) || isNaN(week)) continue;
    if ((downloads < 0) || (month < 0) || (week < 0)) continue;
    if ((downloads < month) || (month < week)) continue;

    // Collections
    const matches_collections = filter_matches(doc, "collection", collections);
    if  (!matches_collections) continue;

    // Creators
    const matches_creators = filter_matches(doc, "creator", creators);
    if  (!matches_creators) continue;

    // Title / Identifier
    if (!filter_matches(doc, is_title_identifier ? "identifier" : "title", title)) continue;

    /////////////////////
    // Item passed filter

    /* Calculating Stats */

    let   favorites = 0;
    const colls_arr = doc.collection_arr;
    if (typeof colls_arr === "object") {
      const    colls_len = colls_arr.length;
      for  (let i = 0; i < colls_len; i++) {
        if (colls_arr [i].startsWith("fav-")) favorites++;
      }
    }
    else { // Raw string
      let     pos = 4; // <str>fav-a
      while ((pos = colls_arr.indexOf(">fav-", pos)) !== -1) {
        favorites++;
        pos += 16; // >fav-a</str><str>fav-b
      }
    }

    const  time_all = calc_date_ms - publicdate_ms;
    const  days_all = Math.round(  time_all / (24 * 60 * 60 * 1000));
    const views_all = downloads;
//  const ratio_all = parseFloat((views_all / days_all) . toFixed(3));
    const ratio_all = Math.round((views_all / days_all) * 1000) / 1000;

    const  days_old = days_all - 30;
    if    (days_old < 1) continue; // Item should be at least 31 days of age
    const views_old = views_all - month;
//  const ratio_old = parseFloat((views_old / days_old) . toFixed(3));
    const ratio_old = Math.round((views_old / days_old) * 1000) / 1000;

    const views_30  = month;
//  const ratio_30  = parseFloat((views_30  / 30)       . toFixed(3));
    const ratio_30  = Math.round((views_30  / 30)       * 1000) / 1000;

    const views_23  = month - week;
//  const ratio_23  = parseFloat((views_23  / 23)       . toFixed(3));
    const ratio_23  = Math.round((views_23  / 23)       * 1000) / 1000;

    const views_7   = week;
//  const ratio_7   = parseFloat((views_7   /  7)       . toFixed(3));
    const ratio_7   = Math.round((views_7   /  7)       * 1000) / 1000;

    filtered_items.push({
      identifier: identifier_str,
      title     :      title_str,
      mediatype :  mediatype_str,
      item_size,
      favorites,

       time_all,
       days_all,
      views_all,
      ratio_all,

       days_old,
      views_old,
      ratio_old,

      views_30,
      ratio_30,

      views_23,
      ratio_23,

      views_7,
      ratio_7
    });
  }

//alert((performance.now() - _ts).toFixed(2));

  return filtered_items;
}

/* Filter Count Input Processing */

// Syntax: [/] [input]
function get_title_prefix(title_str) {
  const is_title_prefix = title_str.startsWith('/');

  if (is_title_prefix) title_str = title_str.slice(1).trimStart();

  return [ is_title_prefix, title_str ];
}

// Syntax: [^] [input]
function get_views_prefix(min_str, max_str) {
  const is_min_prefix = min_str.startsWith('^');
  const is_max_prefix = max_str.startsWith('^');

  if (is_min_prefix) min_str = min_str.slice(1).trimStart();
  if (is_max_prefix) max_str = max_str.slice(1).trimStart();

  return [ is_min_prefix || is_max_prefix, min_str, max_str ];
}

// Syntax: [non-negative float | non-negative integer]
// Return: [ok, is_float, ratio]
function get_ratio(str) {
  if (!str) return [ false, false, null ];

  if (str.includes('.')) {
    if ((/^\d{1,6}\.\d{1,3}$/.test(str)) ||
        (       /^\.\d{1,3}$/.test(str)) ||
        (/^\d{1,6}\.$/       .test(str))) return [ true, true,  parseFloat(str)     ];
  }
  else {
    if  (/^\d{1,6}$/         .test(str))  return [ true, false, parseInt  (str, 10) ];
  }

  return [ false, false, null ];
}

// Syntax: [non-negative float | non-negative integer]
// Return: [ok, min_ratio, max_ratio]
//          ok if at least one float
function get_ratios(min_str, max_str) {
  if (!min_str && !max_str) return [ false, null, null ];

  const [min_ok, is_min_float, min_ratio] = get_ratio(min_str);
  const [max_ok, is_max_float, max_ratio] = get_ratio(max_str);

  if (!min_str) return [ max_ok && is_max_float, null,      max_ratio ];
  if (!max_str) return [ min_ok && is_min_float, min_ratio, null      ];

  return [ (min_ok && max_ok) && (is_min_float || is_max_float), min_ratio, max_ratio ];
}

// str: (grow or / | fall or \ | same or = | diff or !) [non-negative number [- non-negative number] [%]]
// need_ratio: if true then number can be float or integer, else number must be integer only
function get_key(str, need_ratio = false) {
  let slc  = 0;
  let name = null;

  let    s = str;

  if (need_ratio) {
    if (!s.startsWith('.')) return [ str, null ]; // Not a ratio key
    s  = s.slice(1).trimStart();
  }

  const s1 = s.slice(0, 1);
  const s4 = s.slice(0, 4);

  if      (s4 === "grow") { slc = 4; name = "grow"; }
  else if (s1 === '/'   ) { slc = 1; name = "grow"; }
  else if (s4 === "fall") { slc = 4; name = "fall"; }
  else if (s1 === '\\'  ) { slc = 1; name = "fall"; }
  else if (s4 === "same") { slc = 4; name = "same"; }
  else if (s1 === '='   ) { slc = 1; name = "same"; }
  else if (s4 === "diff") { slc = 4; name = "diff"; }
  else if (s1 === '!'   ) { slc = 1; name = "diff"; }
  else return [ str, null ]; // Unknown key

  s = s.slice(slc).trimStart();
  if (s === "") { // Defaults
    const   min = need_ratio ? 0.001 : 1;
    switch (name) {
      case "grow":
      case "fall": return [ name, { min, max: Infinity, is_percent: false } ];

      case "same":
      case "diff": return [ name, { tolerance: 0,       is_percent: false } ];

      default    : return [ str,  null ]; // Unknown key
    }
  }

  const is_percent = s.endsWith('%');
  if   (is_percent) {
    s = s.slice(0, -1).trimEnd();
    if (s === "") return [ str, null ]; // For % must be a value
  }

  switch (name) { // Values
    case "grow":
    case "fall": {
      const limits = s.split('-');
      if   (limits.length > 2) return [ str, null ]; // Must be no more than two limits

      const min_str = limits[0].trimEnd();
      let   min;

      if (need_ratio) {
        const [min_ok, is_min_float, min_ratio] = get_ratio(min_str);
        if   (!min_ok) return [ str, null ]; // Not a valid number
        min  = min_ratio;
      }
      else {
        if   (!/^\d{1,8}$/.test(min_str)) return [ str, null ]; // Not a valid number
        min  = parseInt(min_str, 10);
      }

      let max = Infinity;

      if (limits.length === 2) {
        const max_str = limits[1].trimStart();

        if (need_ratio) {
          const [max_ok, is_max_float, max_ratio] = get_ratio(max_str);
          if   (!max_ok) return [ str, null ]; // Not a valid number
          max  = max_ratio;
        }
        else {
          if   (!/^\d{1,8}$/.test(max_str)) return [ str, null ]; // Not a valid number
          max  = parseInt(max_str, 10);
        }
      }

      return [ name, { min, max, is_percent } ];
    }
    case "same":
    case "diff": {
      let tol;

      if (need_ratio) {
        const [tol_ok, is_tol_float, tol_ratio] = get_ratio(s);
        if   (!tol_ok) return [ str, null ]; // Not a valid number
        tol  = tol_ratio;
      }
      else {
        if   (!/^\d{1,8}$/.test(s)) return [ str, null ]; // Not a valid number
        tol  = parseInt(s, 10);
      }

      return [ name, { tolerance: tol, is_percent } ];
    }
    default:
      return [ str,  null ]; // Unknown key
  }

  return [ str, null ]; // Some error. Normally never goes here
}

//  str: [[ae for >= | a for > | be for <= | b for < | e for == | ne for !=] non-negative number]
//  key_other: key name from other paired field (max for min, min for max)
// need_ratio: if true then number can be float or integer, else number must be integer only
function get_num(str, key_other, need_ratio = false) {
  if (!str) return [ "", null ]; // Any number on this side

  let   sl = 0;
  let   op = null;

  const s1 = str.slice(0, 1);
  const s2 = str.slice(0, 2);

  if      (s2 === "ae") { sl = 2; op = "ae"; }
  else if (s1 === 'a' ) { sl = 1; op = 'a' ; }
  else if (s2 === "be") { sl = 2; op = "be"; }
  else if (s1 === 'b' ) { sl = 1; op = 'b' ; }
  else if (s1 ===  'e') { sl = 1; op =  'e'; }
  else if (s2 === "ne") { sl = 2; op = "ne"; }

  let s = sl ? str.slice(sl).trimStart() : str;
//let num;

  if (need_ratio) {
    const [num_ok, is_num_float, num_ratio] = get_ratio(s);
    if   (!num_ok) return [ str, null ];
//  num  = num_ratio;
  }
  else {
    if   (!/^\d{1,8}$/.test(s)) return [ str, null ];
//  num  = parseInt(s, 10);
  }

  if (!op) { // Defaults
    if      (key_other === "grow") op = "be"; // This side must be <= num to check other for grow from num
    else if (key_other === "fall") op = "ae"; // This side must be >= num to check other for fall from num
    else if (key_other === "same") op =  'e'; // This side must be == num to check other for same to   num
    else if (key_other === "diff") op =  'e'; // This side must be == num to check other for diff from num
    else return [ str, null ];
  }

  return [ s, op ];
}

// Syntax  : [[agg] non-negative integer]
//
// agg is  : agg_item | agg_rank
//
// agg_item: (min | avg | max) | (add | sub) | (pos | neg) | (prev | curr)
//
// agg_rank: topn/tn | btmn/bn | topa/ta | btma/ba | topx/tx | btmx/bx
//           topd/td | btmd/bd | tops/ts | btms/bs
//           top+/t+ | btm+/b+ | top-/t- | btm-/b-
//           topp/tp | btmp/bp | topc/tc | btmc/bc
//
function get_agg(str) {
  if (!str) return [ "", null ]; // Any number on this side

  let  sl  = 0;
  let  agg = null;

  const s2 = str.slice(0, 2);
  const s3 = str.slice(0, 3);
  const s4 = str.slice(0, 4);

  if      (s3 === "min" ) { sl = 3; agg = "min" ; }
  else if (s3 === "avg" ) { sl = 3; agg = "avg" ; }
  else if (s3 === "max" ) { sl = 3; agg = "max" ; }
  else if (s3 === "add" ) { sl = 3; agg = "add" ; }
  else if (s3 === "sub" ) { sl = 3; agg = "sub" ; }
  else if (s3 === "pos" ) { sl = 3; agg = "pos" ; }
  else if (s3 === "neg" ) { sl = 3; agg = "neg" ; }
  else if (s4 === "prev") { sl = 4; agg = "prev"; }
  else if (s4 === "curr") { sl = 4; agg = "curr"; }
  //
  else if (s4 === "topn") { sl = 4; agg = "topn"; } // min
  else if (s2 === "tn"  ) { sl = 2; agg = "topn"; }
  else if (s4 === "btmn") { sl = 4; agg = "btmn"; }
  else if (s2 === "bn"  ) { sl = 2; agg = "btmn"; }
  //
  else if (s4 === "topa") { sl = 4; agg = "topa"; } // avg
  else if (s2 === "ta"  ) { sl = 2; agg = "topa"; }
  else if (s4 === "btma") { sl = 4; agg = "btma"; }
  else if (s2 === "ba"  ) { sl = 2; agg = "btma"; }
  //
  else if (s4 === "topx") { sl = 4; agg = "topx"; } // max
  else if (s2 === "tx"  ) { sl = 2; agg = "topx"; }
  else if (s4 === "btmx") { sl = 4; agg = "btmx"; }
  else if (s2 === "bx"  ) { sl = 2; agg = "btmx"; }
  //
  else if (s4 === "topd") { sl = 4; agg = "topd"; } // add
  else if (s2 === "td"  ) { sl = 2; agg = "topd"; }
  else if (s4 === "btmd") { sl = 4; agg = "btmd"; }
  else if (s2 === "bd"  ) { sl = 2; agg = "btmd"; }
  //
  else if (s4 === "tops") { sl = 4; agg = "tops"; } // sub
  else if (s2 === "ts"  ) { sl = 2; agg = "tops"; }
  else if (s4 === "btms") { sl = 4; agg = "btms"; }
  else if (s2 === "bs"  ) { sl = 2; agg = "btms"; }
  //
  else if (s4 === "top+") { sl = 4; agg = "top+"; } // pos
  else if (s2 === "t+"  ) { sl = 2; agg = "top+"; }
  else if (s4 === "btm+") { sl = 4; agg = "btm+"; }
  else if (s2 === "b+"  ) { sl = 2; agg = "btm+"; }
  //
  else if (s4 === "top-") { sl = 4; agg = "top-"; } // neg
  else if (s2 === "t-"  ) { sl = 2; agg = "top-"; }
  else if (s4 === "btm-") { sl = 4; agg = "btm-"; }
  else if (s2 === "b-"  ) { sl = 2; agg = "btm-"; }
  //
  else if (s4 === "topp") { sl = 4; agg = "topp"; } // prev
  else if (s2 === "tp"  ) { sl = 2; agg = "topp"; }
  else if (s4 === "btmp") { sl = 4; agg = "btmp"; }
  else if (s2 === "bp"  ) { sl = 2; agg = "btmp"; }
  //
  else if (s4 === "topc") { sl = 4; agg = "topc"; } // curr
  else if (s2 === "tc"  ) { sl = 2; agg = "topc"; }
  else if (s4 === "btmc") { sl = 4; agg = "btmc"; }
  else if (s2 === "bc"  ) { sl = 2; agg = "btmc"; }

  let s = sl ? str.slice(sl).trimStart() : str;
  if (!/^\d{1,8}$/.test(s))    return [ str, null ];
  const num = parseInt(s, 10);
  if (isNaN(num) || (num < 0)) return [ str, null ];

  return [ s, agg ];
}

/* Filter Count */

// Whether a > b by at least k.min to no more than k.max
// a and b are non-negative integers
//
// k.min: n means           a >= (b + n)
// k.min: 2 means           a >= (b + 2)
// k.min: 1 means a >  b // a >= (b + 1)
// k.min: 0 means a >= b // a >= (b + 0)
// k.min is non-negative integer or percent
//
// k.max: x means           a <= (b + x)
// k.max is non-negative integer or percent
//
function is_grow(a, b, k) {
  if (k.is_percent) {
    if (b === 0) return (k.min === 0) ? true : false; // Or (a > 0) can be returned for !0 percents from 0

    return (((a + 0.000_001) >= (b * (1 + k.min / 100))) &&
            ((a - 0.000_001) <= (b * (1 + k.max / 100))));
  }

  return ((a + 0.000_001) >= (b + k.min)) &&
         ((a - 0.000_001) <= (b + k.max));
}

// Whether a < b by at least k.min to no more than k.max
// a and b are non-negative integers
//
// k.min: n means           a <= (b - n)
// k.min: 2 means           a <= (b - 2)
// k.min: 1 means a <  b // a <= (b - 1)
// k.min: 0 means a <= b // a <= (b - 0)
// k.min is non-negative integer or percent
//
// k.max: x means           a >= (b - x)
// k.max is non-negative integer or percent
//
function is_fall(a, b, k) {
  if (k.is_percent) {
    if (b === 0) return (k.min === 0) ? (a === 0) : false;

    return (((a - 0.000_001) <= (b * (1 - k.min / 100))) &&
            ((a + 0.000_001) >= (b * (1 - k.max / 100))));
  }

  return ((a - 0.000_001) <= (b - k.min)) &&
         ((a + 0.000_001) >= (b - k.max));
}

// Whether a === b with k.tolerance
// a and b are non-negative integers
// k.tolerance is non-negative integer or percent
//
function is_same(a, b, k) {
  if (k.is_percent) return (b !== 0) ?
        (Math.abs(a - b) <= ((b * k.tolerance / 100) + 0.000_001)) : (a === 0);
  return Math.abs(a - b) <= (     k.tolerance        + 0.000_001);
}

// Whether a !== b by more than k.tolerance
// a and b are non-negative integers
// k.tolerance is non-negative integer or percent
//
function  is_diff(a, b, k) {
  return !is_same(a, b, k);
}

const op_fn = {
  ae: (a, b) => a >=  b,
  a : (a, b) => a >   b,
  be: (a, b) => a <=  b,
  b : (a, b) => a <   b,
   e: (a, b) => a === b,
  ne: (a, b) => a !== b
};

function is_op(a, b, op) {
  const  fn = op_fn[op];
  return fn ? fn(a, b) : false;
}

function get_count_map(items, is_key_exp, count, count_op, get_count) {
  const count_map = {};

  if (is_key_exp) { // Key or "": Include all count values
    for (const item of items) {
      count_map[item.identifier] = get_count(item);
    }
  } else { // Number: Include only other-related values; other is key, cannot be ""
    for (const item of items) {
      const item_count = get_count(item);
      if (is_op(item_count, count, count_op)) {
        count_map[item.identifier] = item_count;
      }
    }
  }

  return count_map;
}

// Usage: At least one of *_str must be a key
function filter_count_keys(items_prev, items_curr,
  prev_str, prev_kv, prev_no, curr_str, curr_kv, curr_no, get_count, ratios = false) {

  /*
  alert(
    "prev_str: " + (prev_str === undefined ? "undefined" : prev_str === null ? "null" : ('"' + prev_str + '"')) + ' ' +
    "curr_str: " + (curr_str === undefined ? "undefined" : curr_str === null ? "null" : ('"' + curr_str + '"')));
  */

  const is_key     = (s) => ["grow", "fall", "same", "diff"    ].includes(s);
  const is_key_exp = (s) => ["grow", "fall", "same", "diff", ""].includes(s);

  const is_prev_grow = (prev_str === "grow");
  const is_curr_grow = (curr_str === "grow");
  const is_prev_fall = (prev_str === "fall");
  const is_curr_fall = (curr_str === "fall");
  const is_prev_same = (prev_str === "same");
  const is_curr_same = (curr_str === "same");
  const is_prev_diff = (prev_str === "diff");
  const is_curr_diff = (curr_str === "diff");

  const cp = ratios ? parseFloat(prev_str) : parseInt(prev_str, 10); // NaN for key_exp
  const cc = ratios ? parseFloat(curr_str) : parseInt(curr_str, 10); // NaN for key_exp

  const ncp = isNaN(cp);
  const ncc = isNaN(cc);

  const count_prev = get_count_map(items_prev, is_key_exp(prev_str), cp, prev_no, get_count);
  const count_curr = get_count_map(items_curr, is_key_exp(curr_str), cc, curr_no, get_count);

  const res = {};

  const [outer,      inner     ] = is_key(prev_str)
      ? [count_curr, count_prev]   // Curr may be smaller
      : [count_prev, count_curr];  // Prev may be smaller

  for (const identifier in outer) {
    if (inner[identifier] === undefined) continue;

    const icp = count_prev[identifier];
    const icc = count_curr[identifier];

    const gcp = !ncp ? Math.max(cp, icp) : 0;
    const gcc = !ncc ? Math.max(cc, icc) : 0;

    const fcp = !ncp ? Math.min(cp, icp) : 0;
    const fcc = !ncc ? Math.min(cc, icc) : 0;

    let pass_prev = true;
    let pass_curr = true;

    if      (is_prev_grow) pass_prev = ncc
                                     ? is_grow(icp, icc, prev_kv)
                                     : is_grow(icp, gcc, prev_kv);
    else if (is_prev_fall) pass_prev = ncc
                                     ? is_fall(icp, icc, prev_kv)
                                     : is_fall(icp, fcc, prev_kv);
    else if (is_prev_same) pass_prev = is_same(icp, icc, prev_kv);
    else if (is_prev_diff) pass_prev = is_diff(icp, icc, prev_kv);

    if      (is_curr_grow) pass_curr = ncp
                                     ? is_grow(icc, icp, curr_kv)
                                     : is_grow(icc, gcp, curr_kv);
    else if (is_curr_fall) pass_curr = ncp
                                     ? is_fall(icc, icp, curr_kv)
                                     : is_fall(icc, fcp, curr_kv);
    else if (is_curr_same) pass_curr = is_same(icc, icp, curr_kv);
    else if (is_curr_diff) pass_curr = is_diff(icc, icp, curr_kv);

    if (pass_prev && pass_curr) {
      res[identifier] = true;
    }
  }

  return res;
}

const agg_fn = {
  min  : (prev, curr) => Math.min(prev,  curr),
  avg  : (prev, curr) =>         (prev + curr) / 2,
  max  : (prev, curr) => Math.max(prev,  curr),

  add  : (prev, curr) =>          prev + curr,
  sub  : (prev, curr) => Math.abs(prev - curr),

  pos  : (prev, curr) => Math.max(curr - prev, 0),
  neg  : (prev, curr) => Math.max(prev - curr, 0),

  prev : (prev, curr) => prev,
  curr : (prev, curr) => curr,

  topn : "min",
  btmn : "min",
  topa : "avg",
  btma : "avg",
  topx : "max",
  btmx : "max",

  topd : "add",
  btmd : "add",
  tops : "sub",
  btms : "sub",

 "top+": "pos",
 "btm+": "pos",
 "top-": "neg",
 "btm-": "neg",

  topp : "prev",
  btmp : "prev",
  topc : "curr",
  btmc : "curr"
};

function agg_value(prev, curr, agg) {
  let fn = agg_fn[agg];

  if (typeof fn === "string") {
    fn =   agg_fn[fn];
    agg_fn[agg] = fn;
  }

  return fn ? fn(prev, curr) : 0;
}

// n is 1-based
function agg_nth(count_prev, count_curr, n, agg, time) {
  const values = [];

  for (const identifier in count_prev) {
    if (count_curr[identifier] === undefined) continue;

    const icp = count_prev[identifier];
    const icc = count_curr[identifier];

    values.push([agg_value(icp, icc, agg), time[identifier]]);
  }

  const values_len = values.length;
  if  (!values_len) return [0, null];

  values.sort((above, below) =>
    (above[0] - below[0]) || // Lower count to start of array
    (below[1] - above[1]));  // Older item  to start of array

  if (n < 1)          n = 1;
  if (n > values_len) n = values_len;

  const agg_prefix = agg.slice(0, 3);

  if (agg_prefix === "top") return values[values_len - n];
  if (agg_prefix === "btm") return values[n          - 1];

  return [0, null];
}

// Usage: At least one of *_agg must be of: see get_agg
// If one of *_agg is not set, then this side uses agg of other side
function filter_count_range_agg(items_prev, items_curr,
  min_str, min_agg, max_str, max_agg, get_count) {
  let min_count = min_str ? parseInt(min_str, 10) : 0;
  let max_count = max_str ? parseInt(max_str, 10) : Infinity;

  if (!min_agg) min_agg = max_agg;
  if (!max_agg) max_agg = min_agg;

  const count_prev = {};
  const count_curr = {};

  for (const item of items_prev) count_prev[item.identifier] = get_count(item);
  for (const item of items_curr) count_curr[item.identifier] = get_count(item);

  // Ranking
  const min_agg_prefix = min_agg.slice(0, 3);
  const max_agg_prefix = max_agg.slice(0, 3);

  const is_nth = (s) => ["top", "btm"].includes(s);

  const is_nth_min = is_nth(min_agg_prefix);
  const is_nth_max = is_nth(max_agg_prefix);

  const time = {};

  if (is_nth_min || is_nth_max) { // Use prev.time_all for tie-breaking logic in agg_nth
    for (const item of items_prev) time[item.identifier] = item.time_all;
  }

  let min_time = null;
  let max_time = null;

  if (is_nth_min) { // Use min_count as n
    const n = min_str ? min_count : (min_agg_prefix === "btm") ? 0 : Infinity;
    [min_count, min_time] = agg_nth(count_prev, count_curr, n, min_agg, time);
  }
  if (is_nth_max) { // Use max_count as n
    const n = max_str ? max_count : (max_agg_prefix === "top") ? 0 : Infinity;
    [max_count, max_time] = agg_nth(count_prev, count_curr, n, max_agg, time);
  }

  // Filtering
  const res = {};

  for (const identifier in count_prev) {
    if (count_curr[identifier] === undefined) continue;

    const icp = count_prev[identifier];
    const icc = count_curr[identifier];

    const ic_agg_min = agg_value(icp, icc, min_agg);
    const ic_agg_max = agg_value(icp, icc, max_agg);

    if ((ic_agg_min >= min_count) && (ic_agg_max <= max_count)) {
      if ((ic_agg_min === min_count) && min_time && (time[identifier] > min_time)) continue; // Older than min_time
      if ((ic_agg_max === max_count) && max_time && (time[identifier] < max_time)) continue; // Newer than max_time

      res[identifier] = true;
    }
  }

  return res;
}

function filter_count_range_val(items_prev, items_curr,
  min_str, max_str, get_count,
  ratios = false, is_ratios = false, min_ratio = null, max_ratio = null) {

  let min;
  let max;

  if (ratios) {
    min = (is_ratios && (min_ratio !== null)) ? min_ratio : 0;
    max = (is_ratios && (max_ratio !== null)) ? max_ratio : Infinity;
  }
  else {
    min = min_str ? parseInt(min_str, 10) : 0;
    max = max_str ? parseInt(max_str, 10) : Infinity;
  }

  if ((min === 0) && (max === Infinity)) return null; // Full range shortcut

  const count_prev = {};
  const count_curr = {};

  for (const item of items_prev) count_prev[item.identifier] = get_count(item);
  for (const item of items_curr) count_curr[item.identifier] = get_count(item);

  const res = {};

  for (const identifier in count_prev) {
    if (count_curr[identifier] === undefined) continue;

    const icp = count_prev[identifier];
    const icc = count_curr[identifier];

    if (((icp >= min) && (icp <= max)) && ((icc >= min) && (icc <= max))) {
      res[identifier] = true;
    }
  }

  return res;
}

// Usage: At least one of *_res must be not null
function res_intersection(dl_res, mo_res, wk_res) {

  /*
  alert(
    "dl_res: " + (dl_res === null ? "null" : Object.keys(dl_res).length) + '\n' +
    "mo_res: " + (mo_res === null ? "null" : Object.keys(mo_res).length) + '\n' +
    "wk_res: " + (wk_res === null ? "null" : Object.keys(wk_res).length));
  */

  let res_1;
  let res_2;
  let res_3;

  if        (dl_res) {
    res_1 =  dl_res;
    if      (mo_res) { res_2 = mo_res; res_3 = wk_res; }
    else if (wk_res) { res_2 = wk_res; res_3 = null;   }
    else
      return dl_res;
  }
  else if   (mo_res) {
    res_1 =  mo_res;
    if      (wk_res) { res_2 = wk_res; res_3 = null;   }
    else
      return mo_res;
  }
  else
      return wk_res;

  const res = {};

  if   (res_3) {
    for  (const identifier  in res_1) {
      if (res_2[identifier] && res_3[identifier]) {
          res  [identifier] =  true;
      }
    }
  }
  else {
    for  (const identifier  in res_1) {
      if (res_2[identifier]) {
          res  [identifier] =  true;
      }
    }
  }

  return res;
}

/* Filter Views */

// Usage: *_min_str as *_prev_str, *_max_str as *_curr_str
// *_str are: number / "" / keys: grow, fall, same, diff
// *_agg are: see get_agg, and null is allowed for one of *_agg
function filter_views_keys_agg(items_prev, items_curr,
  dl_prev_str, dl_prev_kv, dl_prev_no, dl_prev_agg,
  dl_curr_str, dl_curr_kv, dl_curr_no, dl_curr_agg, get_dl,
  mo_prev_str, mo_prev_kv, mo_prev_no, mo_prev_agg,
  mo_curr_str, mo_curr_kv, mo_curr_no, mo_curr_agg, get_mo,
  wk_prev_str, wk_prev_kv, wk_prev_no, wk_prev_agg,
  wk_curr_str, wk_curr_kv, wk_curr_no, wk_curr_agg) {
  const is_key = (s) => ["grow", "fall", "same", "diff"].includes(s);

  const is_dl_key = is_key(dl_prev_str) || is_key(dl_curr_str);
  const is_mo_key = is_key(mo_prev_str) || is_key(mo_curr_str);
  const is_wk_key = is_key(wk_prev_str) || is_key(wk_curr_str);

  const is_dl_agg = dl_prev_agg || dl_curr_agg;
  const is_mo_agg = mo_prev_agg || mo_curr_agg;
  const is_wk_agg = wk_prev_agg || wk_curr_agg;

  if (!is_dl_key && !is_mo_key && !is_wk_key  &&
      !is_dl_agg && !is_mo_agg && !is_wk_agg) return { done: false };

  const dl_res
= is_dl_key
? filter_count_keys(
    items_prev,
      items_curr,
        dl_prev_str, dl_prev_kv, dl_prev_no, dl_curr_str, dl_curr_kv, dl_curr_no, get_dl)
: is_dl_agg
? filter_count_range_agg(
    items_prev,
      items_curr,
        dl_prev_str, dl_prev_agg, dl_curr_str, dl_curr_agg, get_dl)
: filter_count_range_val(
    items_prev,
      items_curr,
        dl_prev_str, dl_curr_str, get_dl);

  const mo_res
= is_mo_key
? filter_count_keys(
    items_prev,
      items_curr,
        mo_prev_str, mo_prev_kv, mo_prev_no, mo_curr_str, mo_curr_kv, mo_curr_no, get_mo)
: is_mo_agg
? filter_count_range_agg(
    items_prev,
      items_curr,
        mo_prev_str, mo_prev_agg, mo_curr_str, mo_curr_agg, get_mo)
: filter_count_range_val(
    items_prev,
      items_curr,
        mo_prev_str, mo_curr_str, get_mo);

  const wk_res
= is_wk_key
? filter_count_keys(
    items_prev,
      items_curr,
        wk_prev_str, wk_prev_kv, wk_prev_no, wk_curr_str, wk_curr_kv, wk_curr_no, item => item.views_7)
: is_wk_agg
? filter_count_range_agg(
    items_prev,
      items_curr,
        wk_prev_str, wk_prev_agg, wk_curr_str, wk_curr_agg, item => item.views_7)
: filter_count_range_val(
    items_prev,
      items_curr,
        wk_prev_str, wk_curr_str, item => item.views_7);

  const all_res = res_intersection(dl_res, mo_res, wk_res);

  const results_prev = items_prev.filter(item => all_res[item.identifier]);
  const results_curr = items_curr.filter(item => all_res[item.identifier]);

  return { done: true, prev: results_prev, curr: results_curr };
}

// Filtering by views count: from min to max, or by keys logic, or by agg range
// *_str are: number / "" / keys
function filter_views(items_prev, items_curr,
  dl_min_str, dl_min_kv, dl_min_no, dl_min_agg,
  dl_max_str, dl_max_kv, dl_max_no, dl_max_agg, is_dl_old,
  mo_min_str, mo_min_kv, mo_min_no, mo_min_agg,
  mo_max_str, mo_max_kv, mo_max_no, mo_max_agg, is_mo_23,
  wk_min_str, wk_min_kv, wk_min_no, wk_min_agg,
  wk_max_str, wk_max_kv, wk_max_no, wk_max_agg) {
  if (!dl_min_str && !dl_max_str &&
      !mo_min_str && !mo_max_str &&
      !wk_min_str && !wk_max_str) return { done: false };

  const get_dl = is_dl_old ? (item => item.views_old) : (item => item.views_all);
  const get_mo = is_mo_23  ? (item => item.views_23 ) : (item => item.views_30 );

  const views_keys_agg = filter_views_keys_agg(items_prev, items_curr,
    dl_min_str, dl_min_kv, dl_min_no, dl_min_agg,
    dl_max_str, dl_max_kv, dl_max_no, dl_max_agg, get_dl,
    mo_min_str, mo_min_kv, mo_min_no, mo_min_agg,
    mo_max_str, mo_max_kv, mo_max_no, mo_max_agg, get_mo,
    wk_min_str, wk_min_kv, wk_min_no, wk_min_agg,
    wk_max_str, wk_max_kv, wk_max_no, wk_max_agg);

  if (views_keys_agg.done) return views_keys_agg;

  // Range Val for prev and for curr independently

  const dl_min_cnt = dl_min_str ? parseInt(dl_min_str, 10) : 0;
  const dl_max_cnt = dl_max_str ? parseInt(dl_max_str, 10) : Infinity;

  const mo_min_cnt = mo_min_str ? parseInt(mo_min_str, 10) : 0;
  const mo_max_cnt = mo_max_str ? parseInt(mo_max_str, 10) : Infinity;

  const wk_min_cnt = wk_min_str ? parseInt(wk_min_str, 10) : 0;
  const wk_max_cnt = wk_max_str ? parseInt(wk_max_str, 10) : Infinity;

  const pass = (item) => {
    const dl_views = get_dl(item);
    const mo_views = get_mo(item);
    const wk_views = item.views_7;

    return ((dl_views >= dl_min_cnt) && (dl_views <= dl_max_cnt)) &&
           ((mo_views >= mo_min_cnt) && (mo_views <= mo_max_cnt)) &&
           ((wk_views >= wk_min_cnt) && (wk_views <= wk_max_cnt));
  };

  const results_prev = items_prev.filter(pass);
  const results_curr = items_curr.filter(pass);

  return { done: true, prev: results_prev, curr: results_curr };
}

/* Filter Ratios */

function filter_ratios_keys(items_prev, items_curr,

  is_dl_ratios,         dl_prev_ratio,    dl_curr_ratio,   get_dl,
     dl_prev_ratio_key, dl_prev_ratio_kv, dl_prev_ratio_str,   dl_prev_ratio_no,
     dl_curr_ratio_key, dl_curr_ratio_kv, dl_curr_ratio_str,   dl_curr_ratio_no,

  is_mo_ratios,         mo_prev_ratio,    mo_curr_ratio,   get_mo,
     mo_prev_ratio_key, mo_prev_ratio_kv, mo_prev_ratio_str,   mo_prev_ratio_no,
     mo_curr_ratio_key, mo_curr_ratio_kv, mo_curr_ratio_str,   mo_curr_ratio_no,

  is_wk_ratios,         wk_prev_ratio,    wk_curr_ratio,
     wk_prev_ratio_key, wk_prev_ratio_kv, wk_prev_ratio_str,   wk_prev_ratio_no,
     wk_curr_ratio_key, wk_curr_ratio_kv, wk_curr_ratio_str,   wk_curr_ratio_no) {

  const is_dl_key = dl_prev_ratio_key || dl_curr_ratio_key;
  const is_mo_key = mo_prev_ratio_key || mo_curr_ratio_key;
  const is_wk_key = wk_prev_ratio_key || wk_curr_ratio_key;

  if  (!is_dl_key && !is_mo_key && !is_wk_key) return { done: false };

  const dl_res
   = is_dl_key
   ? filter_count_keys(
       items_prev,
         items_curr,
           dl_prev_ratio_key || dl_prev_ratio_str, dl_prev_ratio_kv, dl_prev_ratio_no,
           dl_curr_ratio_key || dl_curr_ratio_str, dl_curr_ratio_kv, dl_curr_ratio_no,
       get_dl,    "ratios")
   : filter_count_range_val(
       items_prev,
         items_curr,
           null, null, get_dl,
             "ratios",  is_dl_ratios, dl_prev_ratio, dl_curr_ratio);

  const mo_res
   = is_mo_key
   ? filter_count_keys(
       items_prev,
         items_curr,
           mo_prev_ratio_key || mo_prev_ratio_str, mo_prev_ratio_kv, mo_prev_ratio_no,
           mo_curr_ratio_key || mo_curr_ratio_str, mo_curr_ratio_kv, mo_curr_ratio_no,
       get_mo,    "ratios")
   : filter_count_range_val(
       items_prev,
         items_curr,
           null, null, get_mo,
             "ratios",  is_mo_ratios, mo_prev_ratio, mo_curr_ratio);

  const wk_res
   = is_wk_key
   ? filter_count_keys(
       items_prev,
         items_curr,
           wk_prev_ratio_key || wk_prev_ratio_str, wk_prev_ratio_kv, wk_prev_ratio_no,
           wk_curr_ratio_key || wk_curr_ratio_str, wk_curr_ratio_kv, wk_curr_ratio_no,
           item => item.ratio_7, "ratios")
   : filter_count_range_val(
       items_prev,
         items_curr,
           null, null,  item => item.ratio_7,
             "ratios",  is_wk_ratios, wk_prev_ratio, wk_curr_ratio);

  const all_res = res_intersection(dl_res, mo_res, wk_res);

  const results_prev = items_prev.filter(item => all_res[item.identifier]);
  const results_curr = items_curr.filter(item => all_res[item.identifier]);

  return { done: true, prev: results_prev, curr: results_curr };
}

// Filtering by ratios: from min to max, or by keys logic
function filter_ratios(items_prev, items_curr,

  is_dl_ratios,        dl_min_ratio,    dl_max_ratio,   is_dl_old,
     dl_min_ratio_key, dl_min_ratio_kv, dl_min_ratio_str,  dl_min_ratio_no,
     dl_max_ratio_key, dl_max_ratio_kv, dl_max_ratio_str,  dl_max_ratio_no,

  is_mo_ratios,        mo_min_ratio,    mo_max_ratio,   is_mo_23,
     mo_min_ratio_key, mo_min_ratio_kv, mo_min_ratio_str,  mo_min_ratio_no,
     mo_max_ratio_key, mo_max_ratio_kv, mo_max_ratio_str,  mo_max_ratio_no,

  is_wk_ratios,        wk_min_ratio,    wk_max_ratio,
     wk_min_ratio_key, wk_min_ratio_kv, wk_min_ratio_str,  wk_min_ratio_no,
     wk_max_ratio_key, wk_max_ratio_kv, wk_max_ratio_str,  wk_max_ratio_no) {

  if (!is_dl_ratios     && !is_mo_ratios     && !is_wk_ratios      &&

      !dl_min_ratio_key && !mo_min_ratio_key && !wk_min_ratio_key  &&
      !dl_max_ratio_key && !mo_max_ratio_key && !wk_max_ratio_key) return { done: false };

  const get_dl = is_dl_old ? (item => item.ratio_old) : (item => item.ratio_all);
  const get_mo = is_mo_23  ? (item => item.ratio_23 ) : (item => item.ratio_30 );

  const ratios_keys = filter_ratios_keys(items_prev, items_curr,

  is_dl_ratios,        dl_min_ratio,    dl_max_ratio,   get_dl,
     dl_min_ratio_key, dl_min_ratio_kv, dl_min_ratio_str,   dl_min_ratio_no,
     dl_max_ratio_key, dl_max_ratio_kv, dl_max_ratio_str,   dl_max_ratio_no,

  is_mo_ratios,        mo_min_ratio,    mo_max_ratio,   get_mo,
     mo_min_ratio_key, mo_min_ratio_kv, mo_min_ratio_str,   mo_min_ratio_no,
     mo_max_ratio_key, mo_max_ratio_kv, mo_max_ratio_str,   mo_max_ratio_no,

  is_wk_ratios,        wk_min_ratio,    wk_max_ratio,
     wk_min_ratio_key, wk_min_ratio_kv, wk_min_ratio_str,   wk_min_ratio_no,
     wk_max_ratio_key, wk_max_ratio_kv, wk_max_ratio_str,   wk_max_ratio_no);

  if (ratios_keys.done) return ratios_keys;

  // Range ratios for prev and for curr independently

  if (!is_dl_ratios || (dl_min_ratio === null)) dl_min_ratio = 0;
  if (!is_dl_ratios || (dl_max_ratio === null)) dl_max_ratio = Infinity;

  if (!is_mo_ratios || (mo_min_ratio === null)) mo_min_ratio = 0;
  if (!is_mo_ratios || (mo_max_ratio === null)) mo_max_ratio = Infinity;

  if (!is_wk_ratios || (wk_min_ratio === null)) wk_min_ratio = 0;
  if (!is_wk_ratios || (wk_max_ratio === null)) wk_max_ratio = Infinity;

  const pass = (item) => {
    const dl_ratio = get_dl(item);
    const mo_ratio = get_mo(item);
    const wk_ratio = item.ratio_7;

    return ((dl_ratio >= dl_min_ratio) && (dl_ratio <= dl_max_ratio)) &&
           ((mo_ratio >= mo_min_ratio) && (mo_ratio <= mo_max_ratio)) &&
           ((wk_ratio >= wk_min_ratio) && (wk_ratio <= wk_max_ratio));
  };

  const results_prev = items_prev.filter(pass);
  const results_curr = items_curr.filter(pass);

  return { done: true, prev: results_prev, curr: results_curr };
}

/* Filter Favs */

// Usage: favs_min_str as favs_prev_str, favs_max_str as favs_curr_str
// *_str are: number / "" / keys: grow, fall, same, diff
function filter_favs_keys(items_prev, items_curr,
  favs_prev_str, favs_prev_kv, favs_prev_no,
  favs_curr_str, favs_curr_kv, favs_curr_no) {
  const is_key = (s) => ["grow", "fall", "same", "diff"].includes(s);

  if (!is_key(favs_prev_str) && !is_key(favs_curr_str)) return { done: false };

  const favs_res = filter_count_keys(items_prev, items_curr,
    favs_prev_str, favs_prev_kv, favs_prev_no,
    favs_curr_str, favs_curr_kv, favs_curr_no, item => item.favorites);

  const results_prev = items_prev.filter(item => favs_res[item.identifier]);
  const results_curr = items_curr.filter(item => favs_res[item.identifier]);

  return { done: true, prev: results_prev, curr: results_curr };
}

// *_str are: number / ""
// *_agg are: see get_agg, and null is allowed for one of *_agg
function filter_favs_agg(items_prev, items_curr,
  favs_min_str, favs_min_agg,
  favs_max_str, favs_max_agg) {

  if (!favs_min_agg && !favs_max_agg) return { done: false };

  const favs_res = filter_count_range_agg(items_prev, items_curr,
    favs_min_str, favs_min_agg,
    favs_max_str, favs_max_agg, item => item.favorites);

  const results_prev = items_prev.filter(item => favs_res[item.identifier]);
  const results_curr = items_curr.filter(item => favs_res[item.identifier]);

  return { done: true, prev: results_prev, curr: results_curr };
}

// Filtering by favorites count: from min to max, or by keys logic, or by agg range
// *_str are: number / "" / keys
function filter_favs(items_prev, items_curr,
  favs_min_str, favs_min_kv, favs_min_no, favs_min_agg,
  favs_max_str, favs_max_kv, favs_max_no, favs_max_agg) {
  if (!favs_min_str && !favs_max_str) return { done: false };

  const favs_keys = filter_favs_keys(items_prev, items_curr,
    favs_min_str, favs_min_kv, favs_min_no,
    favs_max_str, favs_max_kv, favs_max_no);

  if (favs_keys.done) return favs_keys;

  const favs_agg = filter_favs_agg(items_prev, items_curr,
    favs_min_str, favs_min_agg,
    favs_max_str, favs_max_agg);

  if (favs_agg.done) return favs_agg;

  // Range Val for prev and for curr independently

  const favs_min_cnt = favs_min_str ? parseInt(favs_min_str, 10) : 0;
  const favs_max_cnt = favs_max_str ? parseInt(favs_max_str, 10) : Infinity;

  const pass = (item) => (item.favorites >= favs_min_cnt) && (item.favorites <= favs_max_cnt);

  const results_prev = items_prev.filter(pass);
  const results_curr = items_curr.filter(pass);

  return { done: true, prev: results_prev, curr: results_curr };
}

/* Filter Sets */

function filter_sets(items_prev, items_curr, only_prev, only_curr) {
  if (!only_prev && !only_curr) return { done: false };

  if (only_prev && !only_curr) {
    const map_curr = {};
    for (const item of items_curr) map_curr[item.identifier] = true;
    const results_prev = items_prev.filter(item => map_curr[item.identifier] === undefined);
    return { done: true, prev: results_prev, curr: [] };
  }

  if (!only_prev && only_curr) {
    const map_prev = {};
    for (const item of items_prev) map_prev[item.identifier] = true;
    const results_curr = items_curr.filter(item => map_prev[item.identifier] === undefined);
    return { done: true, prev: [], curr: results_curr };
  }

  // Common items only

  const map_prev = {};
  const map_curr = {};

  for (const item of items_prev) map_prev[item.identifier] = true;
  for (const item of items_curr) map_curr[item.identifier] = true;

  const results_prev = items_prev.filter(item => map_curr[item.identifier] === true);
  const results_curr = items_curr.filter(item => map_prev[item.identifier] === true);

  return { done: true, prev: results_prev, curr: results_curr };
}

// EOF






