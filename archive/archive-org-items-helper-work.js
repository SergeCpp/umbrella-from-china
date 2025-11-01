/* Doc Cache */

function get_doc_arr(doc, name) {
  if (!(doc instanceof Element)) return doc[name + "_arr"] ?? [];

  if (!doc.arr_cache) doc.arr_cache = {};
  let arr = doc.arr_cache[name];
  if (arr !== undefined) return arr;

  const node = doc.querySelector('arr[name="' + name + '"], str[name="' + name + '"]');
  arr = node
    ? node.tagName === "arr"
      ? Array.from(node.querySelectorAll("str"), n => n.textContent.toLowerCase())
      : [node.textContent.toLowerCase()]
    : [];

  doc.arr_cache[name] = arr;
  return arr;
}

function get_doc_str(doc, name) {
  if (!(doc instanceof Element)) return doc[name] ?? null;

  if (!doc.str_cache) doc.str_cache = {};
  let str = doc.str_cache[name];
  if (str !== undefined) return str;

  const node = doc.querySelector('str[name="' + name + '"]');
  str = node ? node.textContent : null;

  doc.str_cache[name] = str;
  return str;
}

/* Filter Items */

function parse_term(term) {
  term = term.trim();

  // Check for AND first (higher precedence)
  if (term.includes(" AND ")) {
    const terms = term.split(" AND ").map(part => parse_term(part));
    return {
      type: "AND",
      terms: terms
    };
  }
  // Check for NOT next
  else if (term.includes("NOT ")) {
    const index = term.indexOf("NOT ");
    const incl  = term.substring(0, index    ); // Left
    const excl  = term.substring(   index + 4); // Right
    return {
      type: "NOT",
      incl: incl ? parse_term(incl) : null,
      excl:        parse_term(excl)
    };
  }
  // Check for NOTANY next
  else if (term.includes("NOTANY ")) {
    const index = term.indexOf("NOTANY ");
    const incl  = term.substring(0, index    ); // Left
    const excl  = term.substring(   index + 7); // Right
    return {
      type: "NOTANY",
      incl: incl ? parse_term(incl) : null,
      excl:        parse_term(excl)
    };
  }
  // Check for NOTALL next
  else if (term.includes("NOTALL ")) {
    const index = term.indexOf("NOTALL ");
    const incl  = term.substring(0, index    ); // Left
    const excl  = term.substring(   index + 7); // Right
    return {
      type: "NOTALL",
      incl: incl ? parse_term(incl) : null,
      excl:        parse_term(excl)
    };
  }
  // Check for OR next
  else if (term.includes(" OR ")) {
    const terms = term.split(" OR ").map(part => parse_term(part));
    return {
      type: "OR",
      terms: terms
    };
  }
  // Plain text term (OR behavior of comma-separated terms)
  else {
    return {
      type: "TEXT", // Quote allows leading/trailing space, also ' ' possible for term
      text: term.replace(/['"]/g, "").toLowerCase()
    };
  }
}

function evaluate_term(term, values) {
  switch(term.type) {
    case "AND":
      return term.terms.every(part => evaluate_term(part, values));

    case "OR":
      return term.terms.some(part => evaluate_term(part, values));

    case "NOT":
    case "NOTANY":
      //  NOTANY: Exclude if any value matches term.excl
      const any_match = evaluate_term(term.excl, values);
      return (!term.incl || evaluate_term(term.incl, values)) && !any_match;

    case "NOTALL":
      //  NOTALL: Exclude if all values matches term.excl
      const all_match = values.every(value => evaluate_term(term.excl, [value]));
      return (!term.incl || evaluate_term(term.incl, values)) && !all_match;

    case "TEXT":
      return values.some(value => value.includes(term.text));

    default:
      return false; // Unknown type
  }
}

function filter_matches(doc, field, terms) {
  if (!terms || (terms.length === 0)) return true; // No or empty filter = match all

  const values = get_doc_arr(doc, field);

  return terms.some(term => evaluate_term(term, values)); // Check if any term matches
}

function filter_date(date, min, max) {
  if (min.base === "year") return (date >= min.min) && (date <= max.max);

  // Month-based
  const date_month = date.getUTCMonth() + 1;
  const date_day   = date.getUTCDate();

  const date_ge_md = () => (date_month > min.month) || ((date_month === min.month) && (date_day >= min.day));
  const date_le_md = () => (date_month < max.month) || ((date_month === max.month) && (date_day <= max.day));

  if (min.day && max.day) {
    if (min.month <= max.month) return date_ge_md() && date_le_md();
    return                             date_ge_md() || date_le_md();
  }
  if (min.day) {
    if (min.month <= max.month) return date_ge_md() && (date_month <= max.month);
    return                             date_ge_md() || (date_month <= max.month);
  }
  if (max.day) {
    if (min.month <= max.month) return (date_month >= min.month) && date_le_md();
    return                             (date_month >= min.month) || date_le_md();
  }
  // Month only
  if (min.month <= max.month) return (date_month >= min.month) && (date_month <= max.month);
  return                             (date_month >= min.month) || (date_month <= max.month);
}

function filter_items(stats_items, stats_date,
  archived_min, archived_max, created_min, created_max,
  collections, creators, title) {
  const filtered_items = [];

  for (let i = 0; i < stats_items.length; i++) {
    const doc = stats_items[i];

    /* Checking and Initial Filters */

    const identifier_str = get_doc_str(doc, 'identifier');
    const title_str      = get_doc_str(doc, 'title'     );
    const item_size_str  = get_doc_str(doc, 'item_size' );
    const mediatype_str  = get_doc_str(doc, 'mediatype' );
    const date_str       = get_doc_str(doc, 'date'      );
    const publicdate_str = get_doc_str(doc, 'publicdate');
    const downloads_str  = get_doc_str(doc, 'downloads' );
    const month_str      = get_doc_str(doc, 'month'     );
    const week_str       = get_doc_str(doc, 'week'      );

    if ((identifier_str === null) || (title_str === null) || (item_size_str  === null) ||
        (mediatype_str  === null)   /*date_str  can null*/|| (publicdate_str === null) ||
        (downloads_str  === null) || (month_str === null) || (week_str       === null)) {
      continue;
    }

    // Item Size
    const item_size = parseInt(item_size_str, 10);
    if (isNaN(item_size) || (item_size < 0)) continue;

    // Mediatype
    if ((mediatype_str !== "movies") && (mediatype_str !== "audio")) continue;

    // Created
    let date = null;

    if (date_str !== null) {
      date = new Date(date_str);
      if (isNaN(date.getTime())) continue;
    } else { // No date set for item
      if (mediatype_str === "audio") { // Set default date to audio item only
        date = new Date("2012-01-01T00:00:00Z"); // UTC date, earliest for entire thematic stat
      } else {
        continue;
      }
    }

    if (!filter_date(date, created_min, created_max)) continue;

    // Archived
    const publicdate = new Date(publicdate_str);
    if (isNaN(publicdate.getTime())) continue;
    if (!filter_date(publicdate, archived_min, archived_max)) continue;

    // Views
    const downloads = parseInt(downloads_str, 10);
    const month     = parseInt(month_str,     10);
    const week      = parseInt(week_str,      10);

    if (isNaN(downloads) || isNaN(month) || isNaN(week)) continue;
    if ((downloads < 0) || (month < 0) || (week < 0)) continue;
    if ((downloads < month) || (month < week)) continue;

    // Collections
    const matches_collections = filter_matches(doc, "collection", collections);
    if  (!matches_collections) continue;

    // Creators
    const matches_creators = filter_matches(doc, "creator", creators);
    if  (!matches_creators) continue;

    // Title
    const matches_title = filter_matches(doc, "title", title);
    if  (!matches_title) continue;

    // Item passed filter

    /* Calculating Stats */

    const calc_date = new Date(stats_date + "T11:59:59.999Z"); // To count a day for published on day before

    const days_all  = Math.round((calc_date - publicdate) / (24 * 60 * 60 * 1000));
    const views_all = downloads;
    const ratio_all = parseFloat((views_all / days_all).toFixed(3));

    const days_old  = days_all - 30; // Always valid
    const views_old = views_all - month;
    const ratio_old = parseFloat((views_old / days_old).toFixed(3));

    const colls_arr = get_doc_arr(doc, 'collection');
    const favorites = colls_arr.filter(c => c.startsWith("fav-")).length;

    filtered_items.push({
      identifier: identifier_str,
      title     : title_str,
      item_size ,
      mediatype : mediatype_str,
      days_all  ,
      views_all ,
      ratio_all ,
      days_old  ,
      views_old ,
      ratio_old ,
      views_30  :              month,
      views_23  :              month - week,
      ratio_23  : parseFloat(((month - week) / 23).toFixed(3)),
      views_7   :                      week,
      ratio_7   : parseFloat(         (week  /  7).toFixed(3)),
      favorites
    });
  }

  return filtered_items;
}

/* Filter Count */

// Whether a > b by at least k.v
// a and b are non-negative integers
// k.v: n means           a >= (b + n)
// k.v: 2 means           a >= (b + 2)
// k.v: 1 means a >  b // a >= (b + 1)
// k.v: 0 means a >= b
// k.v is non-negative integer or percent
function is_grow(a, b, k) {
  if (k.is_percent) return (b !== 0) ? // Or (a > 0) can be returned for !0 percents from 0
        (a >= (b * (1 + k.value / 100))) : (k.value !== 0) ? false : true;
  return a >= (b      + k.value);
}

// Whether a < b by at least k.v
// a and b are non-negative integers
// k.v: n means           a <= (b - n)
// k.v: 2 means           a <= (b - 2)
// k.v: 1 means a <  b // a <= (b - 1)
// k.v: 0 means a <= b
// k.v is non-negative integer or percent
function is_fall(a, b, k) {
  if (k.is_percent) return (b !== 0) ?
        (a <= (b * (1 - k.value / 100))) : (k.value !== 0) ? false : (a === 0);
  return a <= (b      - k.value);
}

// Whether a === b with tolerance k.v
// a and b are non-negative integers
// k.v is non-negative integer or percent
function is_same(a, b, k) {
  if (k.is_percent) return (b !== 0) ?
        (Math.abs(a - b) <= (b * k.value / 100)) : (a === 0);
  return Math.abs(a - b) <=      k.value;
}

// Whether a !== b by more than k.v
// a and b are non-negative integers
// k.v is non-negative integer or percent
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
  prev_str, prev_kv, prev_no, curr_str, curr_kv, curr_no, get_count) {
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

  const cp = parseInt(prev_str, 10); // NaN for key_exp
  const cc = parseInt(curr_str, 10); // NaN for key_exp

  const ncp = isNaN(cp);
  const ncc = isNaN(cc);

  const count_prev = get_count_map(items_prev, is_key_exp(prev_str), cp, prev_no, get_count);
  const count_curr = get_count_map(items_curr, is_key_exp(curr_str), cc, curr_no, get_count);

  const res = {};

  const [outer, inner] = is_key(prev_str)
    ? [count_curr, count_prev]  // Curr may be smaller
    : [count_prev, count_curr]; // Prev may be smaller

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

function filter_count_range(items_prev, items_curr, min_str, max_str, get_count) {
  const min = min_str ? parseInt(min_str, 10) : 0;
  const max = max_str ? parseInt(max_str, 10) : Infinity;

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

/* Filter Views */

// Usage: *_min_str as *_prev_str, *_max_str as *_curr_str
// *_str are: number / "" / keys: grow, fall, same, diff
function filter_views_keys(items_prev, items_curr,
  dl_prev_str, dl_prev_kv, dl_prev_no, dl_curr_str, dl_curr_kv, dl_curr_no, get_dl,
  mo_prev_str, mo_prev_kv, mo_prev_no, mo_curr_str, mo_curr_kv, mo_curr_no, get_mo,
  wk_prev_str, wk_prev_kv, wk_prev_no, wk_curr_str, wk_curr_kv, wk_curr_no) {
  const is_key = (s) => ["grow", "fall", "same", "diff"].includes(s);

  const is_dl_key = is_key(dl_prev_str) || is_key(dl_curr_str);
  const is_mo_key = is_key(mo_prev_str) || is_key(mo_curr_str);
  const is_wk_key = is_key(wk_prev_str) || is_key(wk_curr_str);

  if (!is_dl_key && !is_mo_key && !is_wk_key) return { done: false };

  const dl_res = is_dl_key
? filter_count_keys(
    items_prev,
      items_curr,
        dl_prev_str, dl_prev_kv, dl_prev_no, dl_curr_str, dl_curr_kv, dl_curr_no, get_dl)
: filter_count_range(
    items_prev,
      items_curr,
        dl_prev_str, dl_curr_str, get_dl);

  const mo_res = is_mo_key
? filter_count_keys(
    items_prev,
      items_curr,
        mo_prev_str, mo_prev_kv, mo_prev_no, mo_curr_str, mo_curr_kv, mo_curr_no, get_mo)
: filter_count_range(
    items_prev,
      items_curr,
        mo_prev_str, mo_curr_str, get_mo);

  const wk_res = is_wk_key
? filter_count_keys(
    items_prev,
      items_curr,
        wk_prev_str, wk_prev_kv, wk_prev_no, wk_curr_str, wk_curr_kv, wk_curr_no, item => item.views_7)
: filter_count_range(
    items_prev,
      items_curr,
        wk_prev_str, wk_curr_str, item => item.views_7);

  const all_res = {}; // Intersect all three res
  for (const identifier in dl_res) {
    if (mo_res[identifier] && wk_res[identifier]) {
      all_res[identifier] = true;
    }
  }

  const results_prev = items_prev.filter(item => all_res[item.identifier]);
  const results_curr = items_curr.filter(item => all_res[item.identifier]);

  return { done: true, prev: results_prev, curr: results_curr };
}

// Filtering by views count: from min to max, or by keys logic
// *_str are: number / "" / keys
function filter_views(items_prev, items_curr,
  dl_min_str, dl_min_kv, dl_min_no, dl_max_str, dl_max_kv, dl_max_no, is_dl_old,
  mo_min_str, mo_min_kv, mo_min_no, mo_max_str, mo_max_kv, mo_max_no, is_mo_23,
  wk_min_str, wk_min_kv, wk_min_no, wk_max_str, wk_max_kv, wk_max_no) {
  if (!dl_min_str && !dl_max_str &&
      !mo_min_str && !mo_max_str &&
      !wk_min_str && !wk_max_str) return { done: false };

  const get_dl = is_dl_old ? (item => item.views_old) : (item => item.views_all);
  const get_mo = is_mo_23  ? (item => item.views_23 ) : (item => item.views_30 );

  const views_keys = filter_views_keys(items_prev, items_curr,
    dl_min_str, dl_min_kv, dl_min_no, dl_max_str, dl_max_kv, dl_max_no, get_dl,
    mo_min_str, mo_min_kv, mo_min_no, mo_max_str, mo_max_kv, mo_max_no, get_mo,
    wk_min_str, wk_min_kv, wk_min_no, wk_max_str, wk_max_kv, wk_max_no);

  if (views_keys.done) return views_keys;

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

// Filtering by favorites count: from min to max, or by keys logic
// *_str are: number / "" / keys
function filter_favs(items_prev, items_curr,
  favs_min_str, favs_min_kv, favs_min_no,
  favs_max_str, favs_max_kv, favs_max_no) {
  if (!favs_min_str && !favs_max_str) return { done: false };

  const favs_keys = filter_favs_keys(items_prev, items_curr,
    favs_min_str, favs_min_kv, favs_min_no,
    favs_max_str, favs_max_kv, favs_max_no);

  if (favs_keys.done) return favs_keys;

  const favs_min_cnt = favs_min_str ? parseInt(favs_min_str, 10) : 0;
  const favs_max_cnt = favs_max_str ? parseInt(favs_max_str, 10) : Infinity;

  const pass = (item) => (item.favorites >= favs_min_cnt) && (item.favorites <= favs_max_cnt);

  const results_prev = items_prev.filter(pass);
  const results_curr = items_curr.filter(pass);

  return { done: true, prev: results_prev, curr: results_curr };
}

/* Filter Sets */

function filter_sets(items_prev, items_curr, prev_only, curr_only) {
  if (!prev_only && !curr_only) return { done: false };

  if (prev_only && !curr_only) {
    const map_curr = {};
    for (const item of items_curr) map_curr[item.identifier] = true;
    const results_prev = items_prev.filter(item => map_curr[item.identifier] === undefined);
    return { done: true, prev: results_prev, curr: [] };
  }

  if (!prev_only && curr_only) {
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

/* Controls */

function init_controls() {
  // 1. Add Enter key to all text inputs
  [  'collections',      'creators',    'subjects',       'title', 'prev-only', 'curr-only',
   'downloads-min', 'downloads-max',   'month-min',   'month-max', 'week-min',  'week-max',
    'archived-min',  'archived-max', 'created-min', 'created-max', 'favs-min',  'favs-max']
  .forEach(id => {
    const input = document.getElementById(id);
    if   (input) {
      input.onkeyup = function(event) {
        if (event.key === 'Enter') {
          process_filter();
        }
      };
    }
  });

  // 2. Add click to button
  const button = document.getElementById('process-filter');
  if   (button) {
    button.onclick = process_filter;
  }
}

//






