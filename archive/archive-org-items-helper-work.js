/* Doc Cache */

function get_doc_arr(doc, name) {
  if (!doc.arr_cache) doc.arr_cache = {};
  let arr = doc.arr_cache[name];
  if (arr !== undefined) return arr;

  // Get all values for this field, handles both <arr> and <str>
  const node = doc.querySelector('arr[name="' + name + '"], str[name="' + name + '"]');
  arr = node
    ? node.tagName.toLowerCase() === "arr"
      ? Array.from(node.querySelectorAll("str"), n => n.textContent.toLowerCase())
      : [node.textContent.toLowerCase()]
    : [];

  doc.arr_cache[name] = arr;
  return arr;
}

function get_doc_str(doc, name) {
  if (!doc.str_cache) doc.str_cache = {};
  let str = doc.str_cache[name];
  if (str !== undefined) return str;

  const node = doc.querySelector('str[name="' + name + '"]');
  str = node ? node.textContent : null;

  doc.str_cache[name] = str;
  return str;
}

/* Filter Items */

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

function filter_items(
  items, archived_min, archived_max, created_min, created_max,
  collections, creators, title) {
  const filtered_items = items.filter(doc => {
    const identifier_str = get_doc_str(doc, 'identifier');
    const title_str      = get_doc_str(doc, 'title'     );
    const item_size_str  = get_doc_str(doc, 'item_size' );
    const mediatype_str  = get_doc_str(doc, 'mediatype' );
    const date_str       = get_doc_str(doc, 'date'      );
    const publicdate_str = get_doc_str(doc, 'publicdate');
    const downloads_str  = get_doc_str(doc, 'downloads' );
    const month_str      = get_doc_str(doc, 'month'     );
    const week_str       = get_doc_str(doc, 'week'      );

    if ((identifier_str === null) || (title_str      === null) || (item_size_str === null) ||
        (mediatype_str  === null) || (publicdate_str === null) ||
        (downloads_str  === null) || (month_str      === null) || (week_str === null)) {
      return false;
    }

    // Item Size
    const item_size = parseInt(item_size_str, 10);
    if (isNaN(item_size) || (item_size < 0)) return false;

    // Mediatype
    if ((mediatype_str !== "movies") && (mediatype_str !== "audio")) return false;

    // Created
    let date = null;

    if (date_str !== null) {
      date = new Date(date_str);
      if (isNaN(date.getTime())) return false;
    } else { // No date set for item
      if (mediatype_str === "audio") { // Set default date to audio item only
        date = new Date("2012-01-01T00:00:00Z"); // UTC date, earliest for entire thematic stat
      } else {
        return false;
      }
    }

    if (filter_date(date, created_min, created_max) === false) return false;

    // Archived
    const publicdate = new Date(publicdate_str);
    if (isNaN(publicdate.getTime())) return false;
    if (filter_date(publicdate, archived_min, archived_max) === false) return false;

    // Views
    const downloads = parseInt(downloads_str, 10);
    const month     = parseInt(month_str,     10);
    const week      = parseInt(week_str,      10);

    if (isNaN(downloads) || isNaN(month) || isNaN(week)) return false;
    if ((downloads < 0) || (month < 0) || (week < 0)) return false;
    if ((downloads < month) || (month < week)) return false;

    // Collections
    const matches_collections = filter_matches(doc, "collection", collections);
    if  (!matches_collections) return false;

    // Creators
    const matches_creators = filter_matches(doc, "creator", creators);
    if  (!matches_creators) return false;

    // Title
    const matches_title = filter_matches(doc, "title", title);
    if  (!matches_title) return false;

    // Item passed filter
    return true;
  });
  return filtered_items;
}

/* Calculate Stats */

function calculate_stats(stats_items, stats_date) {
  const stats = stats_items.map(doc => {
    const identifier  =          get_doc_str(doc, 'identifier');
    const title       =          get_doc_str(doc, 'title'     );
    const item_size   = parseInt(get_doc_str(doc, 'item_size' ), 10);
    const mediatype   =          get_doc_str(doc, 'mediatype' );
    const publicdate  = new Date(get_doc_str(doc, 'publicdate'));
    const downloads   = parseInt(get_doc_str(doc, 'downloads' ), 10);
    const month       = parseInt(get_doc_str(doc, 'month'     ), 10);
    const week        = parseInt(get_doc_str(doc, 'week'      ), 10);

    const calc_date   = new Date(stats_date + "T11:59:59.999Z"); // To count a day for published on day before

    const days_all    = Math.round((calc_date - publicdate) / (24 * 60 * 60 * 1000));
    const views_all   = downloads;
    const ratio_all   = parseFloat((views_all / days_all).toFixed(3));

    const days_old    = days_all - 30; // Always valid
    const views_old   = views_all - month;
    const ratio_old   = parseFloat((views_old / days_old).toFixed(3));

    const collections = get_doc_arr(doc, 'collection');
    const favorites   = collections.filter(c => c.startsWith("fav-")).length;

    return {
      identifier,
      title     ,
      item_size ,
      mediatype ,
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
    };
  });
  return stats;
}

/* Filter Views */

function get_views_map(items, is_key_exp, views_cnt, get_views, is_other_grow, is_other_fall) {
  const views_map = {};

  if (is_key_exp) { // Include all views
    for (const item of items) {
      views_map[item.identifier] = get_views(item);
    }
  } else { // Include only cnt-related views
    if (is_other_grow) {
      for (const item of items) {
        if (get_views(item) <= views_cnt) {
          views_map[item.identifier] = get_views(item);
        }
      }
    } else if (is_other_fall) {
      for (const item of items) {
        if (get_views(item) >= views_cnt) {
          views_map[item.identifier] = get_views(item);
        }
      }
    } else { // Other keys
      for (const item of items) {
        if (get_views(item) === views_cnt) {
          views_map[item.identifier] = get_views(item);
        }
      }
    }
  }

  return views_map;
}

function filter_views_span_keys(items_prev, items_curr, prev_str, curr_str, get_views) {
  const is_key_exp = (s) => ["grow", "fall", "same", "diff", ""].includes(s);

  const is_prev_grow = (prev_str === "grow");
  const is_curr_grow = (curr_str === "grow");
  const is_prev_fall = (prev_str === "fall");
  const is_curr_fall = (curr_str === "fall");
  const is_prev_same = (prev_str === "same");
  const is_curr_same = (curr_str === "same");
  const is_prev_diff = (prev_str === "diff");
  const is_curr_diff = (curr_str === "diff");

  const vp = parseInt(prev_str, 10); // NaN for key_exp
  const vc = parseInt(curr_str, 10); // NaN for key_exp

  const views_prev = get_views_map(items_prev, is_key_exp(prev_str), vp, get_views, is_curr_grow, is_curr_fall);
  const views_curr = get_views_map(items_curr, is_key_exp(curr_str), vc, get_views, is_prev_grow, is_prev_fall);

  const res = {};

  for (const identifier in views_prev) {
    if (views_curr[identifier] === undefined) continue;

    const ivp = views_prev[identifier];
    const ivc = views_curr[identifier];

    let pass_prev = true;
    let pass_curr = true;

    if      (is_prev_grow) pass_prev = isNaN(vc) ? (ivp >   ivc) : (ivp > vc);
    else if (is_prev_fall) pass_prev = isNaN(vc) ? (ivp <   ivc) : (ivp < vc);
    else if (is_prev_same) pass_prev =             (ivp === ivc);
    else if (is_prev_diff) pass_prev =             (ivp !== ivc);

    if      (is_curr_grow) pass_curr = isNaN(vp) ? (ivc >   ivp) : (ivc > vp);
    else if (is_curr_fall) pass_curr = isNaN(vp) ? (ivc <   ivp) : (ivc < vp);
    else if (is_curr_same) pass_curr =             (ivc === ivp);
    else if (is_curr_diff) pass_curr =             (ivc !== ivp);

    if (pass_prev && pass_curr) {
      res[identifier] = true;
    }
  }

  return res;
}

function filter_views_span_range(items_prev, items_curr, min_str, max_str, get_views) {
  const min = min_str ? parseInt(min_str, 10) : 0;
  const max = max_str ? parseInt(max_str, 10) : Infinity;

  const views_prev = {};
  const views_curr = {};

  for (const item of items_prev) views_prev[item.identifier] = get_views(item);
  for (const item of items_curr) views_curr[item.identifier] = get_views(item);

  const res = {};

  for (const identifier in views_prev) {
    if (views_curr[identifier] === undefined) continue;

    const ivp = views_prev[identifier];
    const ivc = views_curr[identifier];

    if (((ivp >= min) && (ivp <= max)) && ((ivc >= min) && (ivc <= max))) {
      res[identifier] = true;
    }
  }

  return res;
}

// Usage: *_min_str as *_prev_str, *_max_str as *_curr_str
// *_str are: number / "" / keys: grow, fall, same, diff
function filter_views_keys(items_prev, items_curr,
  dl_prev_str, dl_curr_str, get_dl, mo_prev_str, mo_curr_str, get_mo, wk_prev_str, wk_curr_str) {
  const is_key = (s) => ["grow", "fall", "same", "diff"].includes(s);

  const is_dl_key = is_key(dl_prev_str) || is_key(dl_curr_str);
  const is_mo_key = is_key(mo_prev_str) || is_key(mo_curr_str);
  const is_wk_key = is_key(wk_prev_str) || is_key(wk_curr_str);

  if (!is_dl_key && !is_mo_key && !is_wk_key) return { done: false };

  const dl_res = is_dl_key
    ? filter_views_span_keys (items_prev, items_curr, dl_prev_str, dl_curr_str, get_dl)
    : filter_views_span_range(items_prev, items_curr, dl_prev_str, dl_curr_str, get_dl);

  const mo_res = is_mo_key
    ? filter_views_span_keys (items_prev, items_curr, mo_prev_str, mo_curr_str, get_mo)
    : filter_views_span_range(items_prev, items_curr, mo_prev_str, mo_curr_str, get_mo);

  const wk_res = is_wk_key
    ? filter_views_span_keys (items_prev, items_curr, wk_prev_str, wk_curr_str, item => item.views_7)
    : filter_views_span_range(items_prev, items_curr, wk_prev_str, wk_curr_str, item => item.views_7);

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
  dl_min_str, dl_max_str, is_dl_old, mo_min_str, mo_max_str, is_mo_23, wk_min_str, wk_max_str) {
  if (!dl_min_str && !dl_max_str &&
      !mo_min_str && !mo_max_str &&
      !wk_min_str && !wk_max_str) return { done: false };

  const get_dl = is_dl_old ? (item => item.views_old) : (item => item.views_all);
  const get_mo = is_mo_23  ? (item => item.views_23 ) : (item => item.views_30 );

  const views_keys = filter_views_keys(items_prev, items_curr,
    dl_min_str, dl_max_str, get_dl, mo_min_str, mo_max_str, get_mo, wk_min_str, wk_max_str);

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

// Get favs_map: { identifier: item }
// favs_str is: "" / "diff" if is_diff_exp true, or number if is_diff_exp false
function get_favs_map(items, is_diff_exp, favs_str) {
  const favs_map = {};

  if (is_diff_exp) { // Include all items
    for (const item of items) {
      favs_map[item.identifier] = item;
    }
  } else { // Include only items with favorites === cnt
    const favs_cnt = parseInt(favs_str, 10);
    for (const item of items) {
      if (item.favorites === favs_cnt) {
        favs_map[item.identifier] = item;
      }
    }
  }

  return favs_map;
}

// Usage: favs_min_str as favs_prev_str, favs_max_str as favs_curr_str
// *_str are: number / "" / "diff"
function filter_favs_diff(items_prev, items_curr, favs_prev_str, favs_curr_str) {
  const is_prev_diff = (favs_prev_str === "diff");
  const is_curr_diff = (favs_curr_str === "diff");

  if (!is_prev_diff && !is_curr_diff) return { done: false };

  const is_prev_diff_exp = is_prev_diff || (favs_prev_str === "");
  const is_curr_diff_exp = is_curr_diff || (favs_curr_str === "");

  const favs_prev = get_favs_map(items_prev, is_prev_diff_exp, favs_prev_str);
  const favs_curr = get_favs_map(items_curr, is_curr_diff_exp, favs_curr_str);

  // Find common items in both favs_prev and favs_curr, and apply diff logic
  const results_prev = [];
  const results_curr = [];

  const [outer, inner] = is_prev_diff
    ? [favs_curr, favs_prev]  // Curr may be smaller
    : [favs_prev, favs_curr]; // Prev may be smaller

  for (const identifier in outer) {
    if (inner[identifier]) {
      const item_prev = favs_prev[identifier];
      const item_curr = favs_curr[identifier];

      if (item_prev.favorites !== item_curr.favorites) {
        results_prev.push(item_prev);
        results_curr.push(item_curr);
      }
    }
  }
  return { done: true, prev: results_prev, curr: results_curr };
}

// Filtering by favorites count: from min to max, or by diff logic
// *_str are: number / "" / "diff"
function filter_favs(items_prev, items_curr, favs_min_str, favs_max_str) {
  if (!favs_min_str && !favs_max_str) return { done: false };

  const favs_diff = filter_favs_diff(items_prev, items_curr, favs_min_str, favs_max_str);

  if (favs_diff.done) return favs_diff;

  const favs_min_cnt = favs_min_str ? parseInt(favs_min_str, 10) : 0;
  const favs_max_cnt = favs_max_str ? parseInt(favs_max_str, 10) : Infinity;

  const results_prev = items_prev.filter(item => {
    return (item.favorites >= favs_min_cnt) && (item.favorites <= favs_max_cnt);
  });

  const results_curr = items_curr.filter(item => {
    return (item.favorites >= favs_min_cnt) && (item.favorites <= favs_max_cnt);
  });

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
  [  'collections',      'creators',    'subjects',       'title',
   'downloads-min', 'downloads-max',   'month-min',   'month-max', 'week-min', 'week-max',
    'archived-min',  'archived-max', 'created-min', 'created-max', 'favs-min', 'favs-max']
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






