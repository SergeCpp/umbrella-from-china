/* Filter Items */

function evaluate_term(term, values, matcher) {
  switch(term.type) {
    case "AND":
      return term.terms.every(part => 
        evaluate_term(part, values, matcher));

    case "OR":
      return term.terms.some(part => 
        evaluate_term(part, values, matcher));

    case "NOT":
    case "NOTANY":
      //  NOTANY: Exclude if any value matches term.excl
      const any_match = evaluate_term(term.excl, values, matcher);
      return (!term.incl || evaluate_term(term.incl, values, matcher)) && !any_match;

    case "NOTALL":
      //  NOTALL: Exclude if all values matches term.excl
      const all_match = values.every(value => {
        return evaluate_term(term.excl, [value], matcher);
      });
      return (!term.incl || evaluate_term(term.incl, values, matcher)) && !all_match;

    case "TEXT":
      return values.some(value => matcher(value, term.text));

    default:
      return false; // Unknown type
  }
}

function filter_matches(doc, field, terms, matcher) {
  if (!terms || (terms.length === 0)) return true; // No or empty filter = match all

  // Get all values for this field (handles both <arr> and <str>)
  const node = doc.querySelector('arr[name="' + field + '"], str[name="' + field + '"]');
  const values = node
    ? node.tagName.toLowerCase() === "arr"
      ? Array.from(node.querySelectorAll("str")).map(n => n.textContent)
      : [node.textContent]
    : [];

  // Check if any term matches
  return terms.some(term => {
    return evaluate_term(term, values, matcher);
  });
}

function get_doc_text(doc, name) {
  if (!doc.text_cache) doc.text_cache = {};
  let text = doc.text_cache[name];
  if (text !== undefined) return text;

  const node = doc.querySelector('str[name="' + name + '"]');
  text = node ? node.textContent : null;
  doc.text_cache[name] = text;
  return text;
}

function filter_items(
  items, archived_min, archived_max, created_min, created_max,
  collections, creators, title) {
  const filtered_items = items.filter(doc => {
    const identifier_text = get_doc_text(doc, 'identifier');
    const title_text      = get_doc_text(doc, 'title'     );
    const item_size_text  = get_doc_text(doc, 'item_size' );
    const mediatype_text  = get_doc_text(doc, 'mediatype' );
    const date_node       = doc.querySelector("str[name='date']"); // Not cached, not used later
    const publicdate_text = get_doc_text(doc, 'publicdate');
    const downloads_text  = get_doc_text(doc, 'downloads' );
    const month_text      = get_doc_text(doc, 'month'     );
    const week_text       = get_doc_text(doc, 'week'      );

    if ((identifier_text === null) || (title_text      === null) || (item_size_text === null) ||
        (mediatype_text  === null) || (publicdate_text === null) ||
        (downloads_text  === null) || (month_text      === null) || (week_text === null)) {
      return false;
    }

    // Item Size
    const item_size = parseInt(item_size_text, 10);
    if (isNaN(item_size) || (item_size < 0)) return false;

    // Mediatype
    if ((mediatype_text !== "movies") && (mediatype_text !== "audio")) return false;

    // Created
    let date = null;

    if (date_node) {
      date = new Date(date_node.textContent);
      if (isNaN(date.getTime())) return false;
    } else { // No date set for item
      if (mediatype_text === "audio") { // Set default date to audio item
        date = new Date("2012-01-01T00:00:00Z"); // UTC date, earliest for entire stat
      } else {
        return false;
      }
    }

    if ((date < created_min) || (date > created_max)) return false;

    // Archived
    const publicdate = new Date(publicdate_text);
    if (isNaN(publicdate.getTime())) return false;
    if ((publicdate < archived_min) || (publicdate > archived_max)) return false;

    // Views
    const downloads = parseInt(downloads_text, 10);
    const month     = parseInt(month_text,     10);
    const week      = parseInt(week_text,      10);

    if (isNaN(downloads) || isNaN(month) || isNaN(week)) return false;
    if ((downloads < 0) || (month < 0) || (week < 0)) return false;
    if ((downloads < month) || (month < week)) return false;

    // Collections
    const matches_collections = filter_matches(
      doc,
     "collection",
      collections,
      (value, term) => value.toLowerCase().includes(term.toLowerCase())
    );
    if (!matches_collections) return false;

    // Creators
    const matches_creators = filter_matches(
      doc,
     "creator",
      creators,
      (value, term) => value.toLowerCase().includes(term.toLowerCase())
    );
    if (!matches_creators) return false;

    // Title
    const matches_title = filter_matches(
      doc,
     "title",
      title,
      (value, term) => value.toLowerCase().includes(term.toLowerCase())
    );
    if (!matches_title) return false;

    // Item passed filter
    return true;
  });
  return filtered_items;
}

/* Calculate Stats */

function calculate_stats(stats_items, stats_date) {
  const stats = stats_items.map(doc => {
    const identifier =          get_doc_text(doc, 'identifier');
    const title      =          get_doc_text(doc, 'title'     );
    const item_size  = parseInt(get_doc_text(doc, 'item_size' ), 10);
    const mediatype  =          get_doc_text(doc, 'mediatype' );
    const publicdate = new Date(get_doc_text(doc, 'publicdate'));
    const downloads  = parseInt(get_doc_text(doc, 'downloads' ), 10);
    const month      = parseInt(get_doc_text(doc, 'month'     ), 10);
    const week       = parseInt(get_doc_text(doc, 'week'      ), 10);

    const calc_date  = new Date(stats_date + "T11:59:59.999Z"); // To count a day for published on day before

    const days_all   = Math.round((calc_date - publicdate) / (24 * 60 * 60 * 1000));
    const views_all  = downloads;
    const ratio_all  = parseFloat((views_all / days_all).toFixed(3));

    const days_old   = days_all - 30; // Always valid
    const views_old  = views_all - month;
    const ratio_old  = parseFloat((views_old / days_old).toFixed(3));

    // Get collections and count favorites
    const collection_node = doc.querySelector("arr[name='collection'], str[name='collection']");
    const collections = collection_node
      ? collection_node.tagName.toLowerCase() === "arr"
        ? Array.from(collection_node.querySelectorAll("str")).map(n => n.textContent)
        : [collection_node.textContent]
      : [];
    const favorites = collections.filter(c => c.toLowerCase().startsWith("fav-")).length;

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

// Filtering by views count: from min to max
// *_str are: number / ""
function filter_views(items_prev, items_curr,
  downloads_min_str, downloads_max_str, month_min_str, month_max_str, week_min_str, week_max_str) {
  if (!downloads_min_str && !downloads_max_str &&
      !month_min_str     && !month_max_str     &&
      !week_min_str      && !week_max_str) return { done: false };

  const downloads_min_cnt = downloads_min_str ? parseInt(downloads_min_str, 10) : 0;
  const downloads_max_cnt = downloads_max_str ? parseInt(downloads_max_str, 10) : Infinity;

  const month_min_cnt = month_min_str ? parseInt(month_min_str, 10) : 0;
  const month_max_cnt = month_max_str ? parseInt(month_max_str, 10) : Infinity;

  const week_min_cnt = week_min_str ? parseInt(week_min_str, 10) : 0;
  const week_max_cnt = week_max_str ? parseInt(week_max_str, 10) : Infinity;

  const results_prev = items_prev.filter(item => {
    return ((item.views_all >= downloads_min_cnt) && (item.views_all <= downloads_max_cnt)) &&
           ((item.views_30  >= month_min_cnt    ) && (item.views_30  <= month_max_cnt    )) &&
           ((item.views_7   >= week_min_cnt     ) && (item.views_7   <= week_max_cnt     ));
  });

  const results_curr = items_curr.filter(item => {
    return ((item.views_all >= downloads_min_cnt) && (item.views_all <= downloads_max_cnt)) &&
           ((item.views_30  >= month_min_cnt    ) && (item.views_30  <= month_max_cnt    )) &&
           ((item.views_7   >= week_min_cnt     ) && (item.views_7   <= week_max_cnt     ));
  });

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






