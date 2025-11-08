/* Global Variables */

const stat_file_dates   = [];    // ["YYYY-MM-DD"]
const stat_file_cache   = {};    // ["YYYY-MM-DD"] = { data: NodeList / [], usage: counter }

let   sf_cache_hits     = 0;     // Non-negative integer
let   sf_cache_misses   = 0;     // Non-negative integer

let   stat_curr_date    = null;  // "YYYY-MM-DD"
let   stat_curr_items   = null;  // NodeList / []

let   stat_prev_date    = null;  // "YYYY-MM-DD"
let   stat_prev_items   = null;  // NodeList / []

const stat_subjects     = {      // Section
  date      : "2025-10-19",      // Subjects is the constant part of the stat
  file      : "data-subjects",   // Template with # for date
  name_data : "subject",         // Name for arr/str data node
  name_error: "Subjects",        // Name for error messages
  text_error: null,              // Error message
  items     : null,              // null / {} / undefined
  du_load   : 0,
  du_parse  : 0
};

const stat_descriptions = {      // Section
  date      : "2025-11-07",
  file      : "data-descriptions",
  name_data : "description",
  name_error: "Descriptions",
  text_error: null,
  items     : null,
  du_load   : 0,
  du_parse  : 0
};

let   du_load           = 0;     // Duration of load
let   du_parse          = 0;     // Duration of parse

/* Section: Subjects and Descriptions Processing */

function wait_section(section, section_terms) {
  if (!section_terms || !section_terms.length) return false; // No or empty filter for section

  if (section.items)               return false; // Section is already loaded
  if (section.items === undefined) return false; // Section cannot be  loaded
  if (section.items !== null)      return false; // Error, must be null here

  load_section(section);

  return true; // Wait for section to load
}

function load_section(section) {
  if (section.items !== null) return;
      section.items = undefined;

  const time_0    = performance.now();
  const container = document.getElementById("results");
  const xml_tmplt = container.getAttribute(section.file);
  const xml_regex = /#/;
  const xml_url   = xml_tmplt.replace(xml_regex, section.date);

  fetch(xml_url)
    .then(response => {
      if (!response.ok) {
        section.text_error = section.name_error + " &mdash; XML file not found";
        throw new Error(section.text_error);
      }
      return response.text();
    })
    .then(text => {
      const time_1 = performance.now();
      const parser = new DOMParser();
      const xml    = parser.parseFromString(text, "text/xml");

      if (xml.querySelector("parsererror")) {
        section.text_error = section.name_error + " &mdash; XML file invalid format";
        throw new Error(section.text_error);
      }
      const docs = xml.querySelectorAll("doc");

      // Create data lookup map for id: data
//    section.items = new Map(); // Slower
      section.items =        {}; // Faster
      const data_selector = 'arr[name="' + section.name_data + '"], ' +
                            'str[name="' + section.name_data + '"]';
      for (const doc of docs) {
        const node_i = doc.querySelector('str[name="identifier"]');
        if  (!node_i) continue;
        const identifier = node_i.textContent;

        const node_d = doc.querySelector(data_selector);
        const data   = node_d
          ? node_d.tagName === "arr"
            ? Array.from(node_d.querySelectorAll("str"), n => n.textContent.toLowerCase())
            : [node_d.textContent.toLowerCase()]
          : [];
//      section.items.set(identifier,   data); // Slower
        section.items    [identifier] = data;  // Faster
      }
      const time_2 = performance.now();

      section.du_load  = (time_1 - time_0);
      section.du_parse = (time_2 - time_1);
    })
    .catch(() => {
      section.items = undefined;
    })
    .finally(() => {
      process_filter();
    });
}

function filter_section(items_prev, items_curr, section_items, section_terms) {
  if (!section_terms || !section_terms.length) return { done: false };
  if (!section_items) return { error: true };

  const identifiers = {}; // Collect all identifiers
  for (const item of items_prev) identifiers[item.identifier] = null;
  for (const item of items_curr) identifiers[item.identifier] = null;

  // Cache match results for items
  for (const identifier in identifiers) {
//  const values = section_items.get(identifier); // Slower
    const values = section_items    [identifier]; // Faster
    if  (!values) continue;

    const match_result = section_terms.some(term => evaluate_term(term, values));
    identifiers[identifier] = match_result;
  }

  // Use cached results
  const results_prev = items_prev.filter(item => identifiers[item.identifier]);
  const results_curr = items_curr.filter(item => identifiers[item.identifier]);

  return { done: true, prev: results_prev, curr: results_curr };
}

/* Filter */

function input_clean_parse(input) {
  return input
    .replace(/  +/g, ' ')
    .split  (',')
    .map    (term => term.trim())
    .filter (term => term) // Non-empty only
    .map    (parse_term);
}

function input_allowed_chars(input) {
  return !/[^a-zA-Z0-9._\-'" ,]/.test(input);
}

function input_allowed_keys(input) {
  return ["grow", "fall", "same", "diff"].includes(input);
}

function input_allowed_views(input) {
  return (input === "") || input_allowed_keys(input) || /^\d{1,8}$/.test(input);
}

function input_allowed_favs(input) {
  return (input === "") || input_allowed_keys(input) || /^\d{1,4}$/.test(input);
}

const err_beg = '<div class="text-center text-comment">';
const err_bds = '<details><summary class="text-ellipsis" style="width: fit-content; margin: 0 auto;">';
const err_es  = '</summary><p>';
const err_ed  = '</p></details>';
const err_end = '</div>';

const err_chars =
  err_beg + 'Allowed characters are: a-z, 0-9, underscore, dash, period, comma, quote, and space' +
  err_end;

const err_date =
  err_beg + 'Valid dates are: YYYY-MM-DD / YYYY-MM / YYYY / MM-DD / MM' +
  err_end;
const err_date_base =
  err_beg + 'Range must be equally based: year first or month first' +
  err_end;
const err_date_range =
  err_beg + 'Min date of range must be before or at max date of range' +
  err_end;

const err_views =
  err_beg +
  err_bds + 'Allowed are non-negative numbers, and keys: grow, fall, same, diff. Prefix: ^' +
  err_es  +
  'Prefix ^ switches Downloads fields to Old = Downloads &minus; Month. Old is displayed in the table<br />' +
  'Prefix ^ switches Month fields to 23 = Month &minus; Week. 23 is displayed in the table<br />' +
  'Prefix ^ does nothing to Week fields. Week is always 7 days. Week is displayed in the table' +
  '</p><p>' +
  'Range min/max values can be numbers, with empty field as no-limit value<br />' +
  'Aggregate range uses aggregate function in any field (or in both fields) of min/max pair<br />' +
  'Examples: min 10 / 20, min 10 / avg 30, also: max 20 / min 10 ("reversed" aggregate range)<br />' +
  'Note: min 10 / 20, and 10 / min 20 aggregate ranges both are mean min 10 / min 20<br />' +
  'Aggregate functions are: min, avg, max, add, sub, prev, curr' +
  '</p><p>' +
  'Keys: grow, fall, same, diff (aliases: / \\ = !) switch min/max logic to prev/curr logic<br />' +
  'Key allows number after it, and percent sign % can be after number' +
  '</p><p>' +
  'Number in prev/curr logic (alone, not after key) allows prefix: a, ae, b, be, e, ne' +
  err_ed  +
  err_end;
const err_views_range =
  err_beg + 'Min views count must be less than or equal to max views count' +
  err_end;

const err_favs =
  err_beg +
  err_bds + 'Allowed are numbers: 0 to 9999, and keys: grow, fall, same, diff' +
  err_es  +
  'Keys have aliases: / \\ = ! that allow number after them<br />' +
  'For / and \\ number is distance, for = and ! number is tolerance<br />' +
  'Defaults: / is /1, \\ is \\1, = is =0, ! is !0' +
  '</p><p>' +
  'Number alone (not after key) allows prefix: a, ae, b, be, e, ne<br />' +
  'Meaning: above, above or equal, below, below or equal, equal, not equal' +
  '</p><p>' +
  'Examples: /3, \\2, =1, !1, a1, be2, e3' +
  err_ed  +
  err_end;
const err_favs_range =
  err_beg + 'Min favorites count must be less than or equal to max favorites count' +
  err_end;

const err_keys_agg =
  err_beg + 'Aggregate functions are not allowed with keys' +
  err_end;
const err_keys_no =
  err_beg + 'Number prefixes are allowed only with keys' +
  err_end;

const err_xml = ' &mdash; XML file cannot be loaded or loading error occurred';
const err_subjects =
  err_beg + 'Subjects' +
  err_xml +
  err_end;
const err_descriptions =
  err_beg + 'Descriptions' +
  err_xml +
  err_end;

function process_filter() {
  const time_0    = performance.now();
  const container = document.getElementById("results");
  const timings   = document.getElementById("timings");
        timings.textContent = "";
  try {

  // Archived Range
  const archived_min_str = document.getElementById("archived-min").value.trim();
  const archived_max_str = document.getElementById("archived-max").value.trim();

  const archived_min_range = get_date_range(archived_min_str);
  const archived_max_range = get_date_range(archived_max_str);

  if (!archived_min_range || !archived_max_range) {
    container.innerHTML = err_date;
    return;
  }

  if (archived_min_range.base !== archived_max_range.base) {
    container.innerHTML = err_date_base;
    return;
  }

  if (archived_min_range.base === "year") {
    const archived_min = archived_min_range.min;
    const archived_max = archived_max_range.max;

    if (archived_min > archived_max) {
      container.innerHTML = err_date_range;
      return;
    }
  }

  // Created Range
  const created_min_str = document.getElementById("created-min").value.trim();
  const created_max_str = document.getElementById("created-max").value.trim();

  const created_min_range = get_date_range(created_min_str);
  const created_max_range = get_date_range(created_max_str);

  if (!created_min_range || !created_max_range) {
    container.innerHTML = err_date;
    return;
  }

  if (created_min_range.base !== created_max_range.base) {
    container.innerHTML = err_date_base;
    return;
  }

  if (created_min_range.base === "year") {
    const created_min = created_min_range.min;
    const created_max = created_max_range.max;

    if (created_min > created_max) {
      container.innerHTML = err_date_range;
      return;
    }
  }

  // Collections, Creators, Subjects, Title and Description
  const collections_str = document.getElementById("collections").value;
  const creators_str    = document.getElementById("creators"   ).value;
  const subjects_str    = document.getElementById("subjects"   ).value;
  const title_str       = document.getElementById("title"      ).value;
  const description_str = document.getElementById("description").value;

  if (!input_allowed_chars(collections_str) ||
      !input_allowed_chars(creators_str   ) ||
      !input_allowed_chars(subjects_str   ) ||
      !input_allowed_chars(title_str      ) ||
      !input_allowed_chars(description_str)) {
    container.innerHTML = err_chars;
    return;
  }

  const collections = input_clean_parse(collections_str);
  const creators    = input_clean_parse(creators_str   );
  const subjects    = input_clean_parse(subjects_str   );
  const title       = input_clean_parse(title_str      );
  const description = input_clean_parse(description_str);

  // Views
  let dl_min_str = document.getElementById("downloads-min").value.trim().toLowerCase();
  let dl_max_str = document.getElementById("downloads-max").value.trim().toLowerCase();
  let mo_min_str = document.getElementById("month-min"    ).value.trim().toLowerCase();
  let mo_max_str = document.getElementById("month-max"    ).value.trim().toLowerCase();
  let wk_min_str = document.getElementById("week-min"     ).value.trim().toLowerCase();
  let wk_max_str = document.getElementById("week-max"     ).value.trim().toLowerCase();

  let dl_min_str_t = null;
  let dl_max_str_t = null;
  let mo_min_str_t = null;
  let mo_max_str_t = null;
  let wk_min_str_t = null;
  let wk_max_str_t = null;

  // Views: field prefixes
  let is_dl_old = false; // Use old instead dl, old = dl without last month
  let is_mo_23  = false; // Use 23 days instead month, 23 days = month withoul last week
  let is_wk_7   = false; // This flag will not be used, week === 7 days

  [is_dl_old, dl_min_str, dl_max_str] = get_views_prefix(dl_min_str, dl_max_str);
  [is_mo_23,  mo_min_str, mo_max_str] = get_views_prefix(mo_min_str, mo_max_str);
  [is_wk_7,   wk_min_str, wk_max_str] = get_views_prefix(wk_min_str, wk_max_str);

  // Views: keys
  let dl_min_kv = null;
  let dl_max_kv = null;
  let mo_min_kv = null;
  let mo_max_kv = null;
  let wk_min_kv = null;
  let wk_max_kv = null;

  [dl_min_str, dl_min_kv] = get_key(dl_min_str);
  [dl_max_str, dl_max_kv] = get_key(dl_max_str);
  [mo_min_str, mo_min_kv] = get_key(mo_min_str);
  [mo_max_str, mo_max_kv] = get_key(mo_max_str);
  [wk_min_str, wk_min_kv] = get_key(wk_min_str);
  [wk_max_str, wk_max_kv] = get_key(wk_max_str);

  // Views: number prefixes
  let dl_min_no = null;
  let dl_max_no = null;
  let mo_min_no = null;
  let mo_max_no = null;
  let wk_min_no = null;
  let wk_max_no = null;

  let dl_min_no_t = null;
  let dl_max_no_t = null;
  let mo_min_no_t = null;
  let mo_max_no_t = null;
  let wk_min_no_t = null;
  let wk_max_no_t = null;

  [dl_min_str_t, dl_min_no_t] = get_num(dl_min_str, dl_max_str);
  [dl_max_str_t, dl_max_no_t] = get_num(dl_max_str, dl_min_str);
  [mo_min_str_t, mo_min_no_t] = get_num(mo_min_str, mo_max_str);
  [mo_max_str_t, mo_max_no_t] = get_num(mo_max_str, mo_min_str);
  [wk_min_str_t, wk_min_no_t] = get_num(wk_min_str, wk_max_str);
  [wk_max_str_t, wk_max_no_t] = get_num(wk_max_str, wk_min_str);

  if (input_allowed_keys(dl_min_str)) [dl_max_str, dl_max_no] = [dl_max_str_t, dl_max_no_t];
  if (input_allowed_keys(dl_max_str)) [dl_min_str, dl_min_no] = [dl_min_str_t, dl_min_no_t];
  if (input_allowed_keys(mo_min_str)) [mo_max_str, mo_max_no] = [mo_max_str_t, mo_max_no_t];
  if (input_allowed_keys(mo_max_str)) [mo_min_str, mo_min_no] = [mo_min_str_t, mo_min_no_t];
  if (input_allowed_keys(wk_min_str)) [wk_max_str, wk_max_no] = [wk_max_str_t, wk_max_no_t];
  if (input_allowed_keys(wk_max_str)) [wk_min_str, wk_min_no] = [wk_min_str_t, wk_min_no_t];

  if ((!input_allowed_keys(dl_min_str_t) && dl_max_no_t) ||
      (!input_allowed_keys(dl_max_str_t) && dl_min_no_t) ||
      (!input_allowed_keys(mo_min_str_t) && mo_max_no_t) ||
      (!input_allowed_keys(mo_max_str_t) && mo_min_no_t) ||
      (!input_allowed_keys(wk_min_str_t) && wk_max_no_t) ||
      (!input_allowed_keys(wk_max_str_t) && wk_min_no_t)) {
    container.innerHTML = err_keys_no;
    return;
  }

  // Views: aggregate functions
  let dl_min_agg = null;
  let dl_max_agg = null;
  let mo_min_agg = null;
  let mo_max_agg = null;
  let wk_min_agg = null;
  let wk_max_agg = null;

  let dl_min_agg_t = null;
  let dl_max_agg_t = null;
  let mo_min_agg_t = null;
  let mo_max_agg_t = null;
  let wk_min_agg_t = null;
  let wk_max_agg_t = null;

  [dl_min_str_t, dl_min_agg_t] = get_agg(dl_min_str);
  [dl_max_str_t, dl_max_agg_t] = get_agg(dl_max_str);
  [mo_min_str_t, mo_min_agg_t] = get_agg(mo_min_str);
  [mo_max_str_t, mo_max_agg_t] = get_agg(mo_max_str);
  [wk_min_str_t, wk_min_agg_t] = get_agg(wk_min_str);
  [wk_max_str_t, wk_max_agg_t] = get_agg(wk_max_str);

  if (!input_allowed_keys(dl_min_str) && !input_allowed_keys(dl_max_str)) {
    [dl_min_str, dl_min_agg] = [dl_min_str_t, dl_min_agg_t];
    [dl_max_str, dl_max_agg] = [dl_max_str_t, dl_max_agg_t];
  }

  if (!input_allowed_keys(mo_min_str) && !input_allowed_keys(mo_max_str)) {
    [mo_min_str, mo_min_agg] = [mo_min_str_t, mo_min_agg_t];
    [mo_max_str, mo_max_agg] = [mo_max_str_t, mo_max_agg_t];
  }

  if (!input_allowed_keys(wk_min_str) && !input_allowed_keys(wk_max_str)) {
    [wk_min_str, wk_min_agg] = [wk_min_str_t, wk_min_agg_t];
    [wk_max_str, wk_max_agg] = [wk_max_str_t, wk_max_agg_t];
  }

  if ((input_allowed_keys(dl_min_str_t) && dl_max_agg_t) ||
      (input_allowed_keys(dl_max_str_t) && dl_min_agg_t) ||
      (input_allowed_keys(mo_min_str_t) && mo_max_agg_t) ||
      (input_allowed_keys(mo_max_str_t) && mo_min_agg_t) ||
      (input_allowed_keys(wk_min_str_t) && wk_max_agg_t) ||
      (input_allowed_keys(wk_max_str_t) && wk_min_agg_t)) {
    container.innerHTML = err_keys_agg;
    return;
  }

  // Views: chars
  if (!input_allowed_views(dl_min_str) || !input_allowed_views(dl_max_str) ||
      !input_allowed_views(mo_min_str) || !input_allowed_views(mo_max_str) ||
      !input_allowed_views(wk_min_str) || !input_allowed_views(wk_max_str)) {
    container.innerHTML = err_views;
    return;
  }

  // Views: values
  if (!dl_min_agg && !dl_max_agg) { // For agg min > max is allowed
    const dl_min_cnt = parseInt(dl_min_str, 10);
    const dl_max_cnt = parseInt(dl_max_str, 10);

    if (!isNaN(dl_min_cnt) && !isNaN(dl_max_cnt)) {
      if (dl_min_cnt > dl_max_cnt) {
        container.innerHTML = err_views_range;
        return;
      }
    }
  }

  if (!mo_min_agg && !mo_max_agg) { // For agg min > max is allowed
    const mo_min_cnt = parseInt(mo_min_str, 10);
    const mo_max_cnt = parseInt(mo_max_str, 10);

    if (!isNaN(mo_min_cnt) && !isNaN(mo_max_cnt)) {
      if (mo_min_cnt > mo_max_cnt) {
        container.innerHTML = err_views_range;
        return;
      }
    }
  }

  if (!wk_min_agg && !wk_max_agg) { // For agg min > max is allowed
    const wk_min_cnt = parseInt(wk_min_str, 10);
    const wk_max_cnt = parseInt(wk_max_str, 10);

    if (!isNaN(wk_min_cnt) && !isNaN(wk_max_cnt)) {
      if (wk_min_cnt > wk_max_cnt) {
        container.innerHTML = err_views_range;
        return;
      }
    }
  }

  // Favs
  let favs_min_str = document.getElementById("favs-min").value.trim().toLowerCase();
  let favs_max_str = document.getElementById("favs-max").value.trim().toLowerCase();

  let favs_min_str_t = null;
  let favs_max_str_t = null;

  // Favs: keys
  let favs_min_kv = null;
  let favs_max_kv = null;

  [favs_min_str, favs_min_kv] = get_key(favs_min_str);
  [favs_max_str, favs_max_kv] = get_key(favs_max_str);

  // Favs: number prefixes
  let favs_min_no = null;
  let favs_max_no = null;

  let favs_min_no_t = null;
  let favs_max_no_t = null;

  [favs_min_str_t, favs_min_no_t] = get_num(favs_min_str, favs_max_str);
  [favs_max_str_t, favs_max_no_t] = get_num(favs_max_str, favs_min_str);

  if (input_allowed_keys(favs_min_str)) [favs_max_str, favs_max_no] = [favs_max_str_t, favs_max_no_t];
  if (input_allowed_keys(favs_max_str)) [favs_min_str, favs_min_no] = [favs_min_str_t, favs_min_no_t];

  if ((!input_allowed_keys(favs_min_str_t) && favs_max_no_t) ||
      (!input_allowed_keys(favs_max_str_t) && favs_min_no_t)) {
    container.innerHTML = err_keys_no;
    return;
  }

  // Favs: aggregate functions
  let favs_min_agg = null;
  let favs_max_agg = null;

  let favs_min_agg_t = null;
  let favs_max_agg_t = null;

  [favs_min_str_t, favs_min_agg_t] = get_agg(favs_min_str);
  [favs_max_str_t, favs_max_agg_t] = get_agg(favs_max_str);

  if (!input_allowed_keys(favs_min_str) && !input_allowed_keys(favs_max_str)) {
    [favs_min_str, favs_min_agg] = [favs_min_str_t, favs_min_agg_t];
    [favs_max_str, favs_max_agg] = [favs_max_str_t, favs_max_agg_t];
  }

  if ((input_allowed_keys(favs_min_str_t) && favs_max_agg_t) ||
      (input_allowed_keys(favs_max_str_t) && favs_min_agg_t)) {
    container.innerHTML = err_keys_agg;
    return;
  }

  // Favs: chars
  if (!input_allowed_favs(favs_min_str) || !input_allowed_favs(favs_max_str)) {
    container.innerHTML = err_favs;
    return;
  }

  // Favs: values
  if (!favs_min_agg && !favs_max_agg) { // For agg min > max is allowed
    const favs_min_cnt = parseInt(favs_min_str, 10);
    const favs_max_cnt = parseInt(favs_max_str, 10);

    if (!isNaN(favs_min_cnt) && !isNaN(favs_max_cnt)) {
      if (favs_min_cnt > favs_max_cnt) {
        container.innerHTML = err_favs_range;
        return;
      }
    }
  }

  // Subjects Check
  if (wait_section(stat_subjects, subjects)) return; // Wait for stat_subjects.items to load

  // Descriptions Check
  if (wait_section(stat_descriptions, description)) return; // Wait for stat_descriptions.items to load

  // Checking and Initial Filters, and Calculating Stats
  let results_curr = filter_items(stat_curr_items, stat_curr_date,
    archived_min_range, archived_max_range, created_min_range, created_max_range,
    collections, creators, title);
  let results_prev = filter_items(stat_prev_items, stat_prev_date,
    archived_min_range, archived_max_range, created_min_range, created_max_range,
    collections, creators, title);

  // Views
  const filtered_views = filter_views(results_prev, results_curr,
    dl_min_str, dl_min_kv, dl_min_no, dl_min_agg,
    dl_max_str, dl_max_kv, dl_max_no, dl_max_agg, is_dl_old,
    mo_min_str, mo_min_kv, mo_min_no, mo_min_agg,
    mo_max_str, mo_max_kv, mo_max_no, mo_max_agg, is_mo_23,
    wk_min_str, wk_min_kv, wk_min_no, wk_min_agg,
    wk_max_str, wk_max_kv, wk_max_no, wk_max_agg);
  if (filtered_views.done) {
    results_curr = filtered_views.curr;
    results_prev = filtered_views.prev;
  }

  // Favs
  const filtered_favs = filter_favs(results_prev, results_curr,
    favs_min_str, favs_min_kv, favs_min_no, favs_min_agg,
    favs_max_str, favs_max_kv, favs_max_no, favs_max_agg);
  if (filtered_favs.done) {
    results_curr = filtered_favs.curr;
    results_prev = filtered_favs.prev;
  }

  // Subjects
  const filtered_subjects = filter_section(results_prev, results_curr, stat_subjects.items, subjects);
  if   (filtered_subjects.done) {
    results_curr = filtered_subjects.curr;
    results_prev = filtered_subjects.prev;
  }
  else if (filtered_subjects.error) {
    container.innerHTML =            stat_subjects.text_error
                        ? (err_beg + stat_subjects.text_error + err_end)
                        :  err_subjects; // Generic
    return;
  }

  // Descriptions
  const filtered_descriptions = filter_section(results_prev, results_curr, stat_descriptions.items, description);
  if   (filtered_descriptions.done) {
    results_curr = filtered_descriptions.curr;
    results_prev = filtered_descriptions.prev;
  }
  else if (filtered_descriptions.error) {
    container.innerHTML =            stat_descriptions.text_error
                        ? (err_beg + stat_descriptions.text_error + err_end)
                        :  err_descriptions; // Generic
    return;
  }

  // Sets. Must be the last filter
  const prev_only = document.getElementById("prev-only").checked;
  const curr_only = document.getElementById("curr-only").checked;

  const filtered_sets = filter_sets(results_prev, results_curr, prev_only, curr_only);
  if   (filtered_sets.done) {
    results_curr = filtered_sets.curr;
    results_prev = filtered_sets.prev;
  }

  // Filtering Duration
  const du_filter = performance.now() - time_0;

  // Render
  const du_render = render_results(results_curr, stat_curr_date, results_prev, stat_prev_date);
  if  (!du_render) {
    return;
  }

  // Cache
  const sf_cache_size = Object.keys(stat_file_cache).length;

  // Performance
  timings.textContent = 'Cache: ' + sf_cache_size   + ' / ' +
                                    sf_cache_hits   + ' / ' +
                                    sf_cache_misses +  ', ' +

                        'Load: '  + du_load      .toFixed(1) +   ' / ' +
                  stat_subjects    .du_load      .toFixed(1) +   ' / ' +
                  stat_descriptions.du_load      .toFixed(1) + ' ms, ' +
                        'Parse '  + du_parse     .toFixed(1) +   ' / ' +
                  stat_subjects    .du_parse     .toFixed(1) +   ' / ' +
                  stat_descriptions.du_parse     .toFixed(1) + ' ms, ' +
                        'Filter ' + du_filter    .toFixed(1) + ' ms, ' +
                        'Render ' + du_render.pre.toFixed(1) +   ' / ' +
                                    du_render.dom.toFixed(1) + ' ms';
  } catch (err) {
    container.innerHTML = '<div class="text-center text-comment">Error: ' + err.message + '</div>';
  }
}

/* Date Change */

// Uses global: stat_file_dates
function date_change_menu(event, what) {
  const menu_old = document.getElementById('date-change-menu');
  if   (menu_old) { menu_old.remove_ex(); }

  const i_date = stat_file_dates.indexOf(what === "curr" ? stat_curr_date : stat_prev_date);
  const i_min  = 0;
  const i_max  = stat_file_dates.length - 1;
  const h_view = 3;
  let   i_beg  = i_date - h_view;
  let   i_end  = i_date + h_view;

  if (i_beg < i_min) {
      i_end = Math.min(i_end + (i_min - i_beg), i_max);
      i_beg = i_min; }

  if (i_end > i_max) {
      i_beg = Math.max(i_beg - (i_end - i_max), i_min);
      i_end = i_max; }

  const d_count  = i_end - i_beg + 1;
  const rect     = event.target.getBoundingClientRect();
  let   menu_top = rect.top    + window.scrollY - (11 + 32 * d_count);
  if   (menu_top <               window.scrollY)     {
        menu_top = rect.bottom + window.scrollY + 2; }

  const menu_caller = document.activeElement;
  const menu        = document.createElement('div');
  menu.id                    = 'date-change-menu';
  menu.style.position        = 'absolute';
  menu.style.left            = (rect.left + window.scrollX - 2) + 'px';
  menu.style.top             =  menu_top                        + 'px';
  menu.style.backgroundColor = '#fafafa'; // Gray98
  menu.style.color           = '#696969'; // DimGray, L41
  menu.style.border          = '#ebebeb solid 3px'; // Gray92
  menu.style.borderRadius    = '6px';
  menu.style.boxShadow       = '3px 3px 6px rgb(0 0 0 / 0.3)';
  menu.setAttribute           ('role', 'menu');

  menu.remove_ex = function() {
    document.removeEventListener('click', menu.outside_click);
    menu.remove();
    if (menu_caller && document.body.contains(menu_caller)) { menu_caller.focus(); }
  };

  menu.outside_click = (e) => {
    if (!menu.contains(e.target)) { menu.remove_ex(); }
  };

  // Defer adding until all currently pending event handlers (menu creation click) have finished
  setTimeout(() => {
    if (menu && document.body.contains(menu)) { document.addEventListener('click', menu.outside_click); }
  }, 0);

  menu.onkeydown = (e) => {
    if (e.key === 'Escape') { menu.remove_ex(); }
  };

  const init_opt = (opt, text) => {
    opt.style.borderRadius = '6px';
    opt.style.padding      = '4px 8px';
    opt.style.cursor       = 'pointer';
    opt.style.textAlign    = 'center';
    opt.textContent        =  text;
    opt.tabIndex           =  0;
    opt.setAttribute        ('role', 'menuitem');

    opt.onmouseover = () => {
      opt.style.backgroundColor = '#f2f2f2'; // Gray95
      opt.style.color = '#4a4a4a'; // Gray29
    };
    opt.onmouseout = () => {
      opt.style.backgroundColor = ""; // From menu
      opt.style.color = ""; // From menu
    };

    opt.onkeydown = (e) => {
      const k = e.key;
      if ((k === 'Enter') || (k === ' ')) {
        e.preventDefault();
      } else {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab'].includes(k)) return;
        e.preventDefault();

        const menu = e.currentTarget.parentElement;
        const opts = Array.from(menu.children);
        const curr = opts.indexOf(e.currentTarget);
        let   next;

        if ((k === 'ArrowUp') || (k === 'ArrowLeft') || ((k === 'Tab') && e.shiftKey)) {
          next = (curr - 1 + opts.length) % opts.length;
        } else { // ArrowDown or ArrowRight or Tab
          next = (curr + 1)               % opts.length;
        }
        opts[next].focus();
      }
    };
    opt.onkeyup = (e) => {
      const k = e.key;
      if ((k === 'Enter') || (k === ' ')) {
        opt.click();
      }
    };
  };

  for (let i = i_beg; i <= i_end; i++) {
    const date     = stat_file_dates[i];
    const date_opt = document.createElement('div');
    init_opt(date_opt, date);

    date_opt.onclick = function() {
      menu.remove_ex();
//    load_stat(date, what); // Menu closing delay when cache is used
//    setTimeout(load_stat, 5, date, what); // Mostly solved
//    requestIdleCallback(() => load_stat(date, what), { timeout: 5 }); // Almost solved
      requestAnimationFrame(() => setTimeout(load_stat, 0, date, what)); // Solved
    };
    menu.appendChild(date_opt);
  }

  document.body.appendChild(menu);
  menu.children[i_date - i_beg].focus();
}

/* Dates */

// Uses global: stat_file_dates
function init_dates() {
  const container = document.getElementById("results");
  const dates_url = container.getAttribute("data-dates");

  return fetch(dates_url)
    .then(response => {
      if (!response.ok) { throw new Error("Dates file not found"); }
      return response.text();
    })
    .then(text => {
      const dates_lines     = text.trim().split("\n");
      const dates_lines_cnt = dates_lines.length;

      for (let line_num = 0; line_num < dates_lines_cnt; line_num++) {
        stat_file_dates[line_num] = dates_lines[line_num].trim();
      }
      stat_file_dates.sort();

      stat_curr_date = stat_file_dates[stat_file_dates.length - 1];
      stat_prev_date = stat_file_dates[stat_file_dates.length - 2];
    })
    .catch(err => {
      container.innerHTML = '<div class="text-center text-comment">Error: ' + err.message + '</div>';
      throw err;
    });
}

/* Main */

function get_stat_arr(doc, name) {
  const node = doc.querySelector('arr[name="' + name + '"], str[name="' + name + '"]');
  const arr  = node
    ? node.tagName === "arr"
      ? Array.from(node.querySelectorAll("str"), n => n.textContent.toLowerCase())
      : [node.textContent.toLowerCase()]
    : [];

  return arr;
}

function conv_stat_docs(docs) {
  const stats = [];

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];

    const identifier = doc.querySelector('str[name="identifier"]')?.textContent;
    const title      = doc.querySelector('str[name="title"]'     )?.textContent;
    const item_size  = doc.querySelector('str[name="item_size"]' )?.textContent;
    const mediatype  = doc.querySelector('str[name="mediatype"]' )?.textContent;
    const date       = doc.querySelector('str[name="date"]'      )?.textContent;
    const publicdate = doc.querySelector('str[name="publicdate"]')?.textContent;
    const downloads  = doc.querySelector('str[name="downloads"]' )?.textContent;
    const month      = doc.querySelector('str[name="month"]'     )?.textContent;
    const week       = doc.querySelector('str[name="week"]'      )?.textContent;

    const collection_arr = get_stat_arr(doc, "collection");
    const creator_arr    = get_stat_arr(doc, "creator"   );
    const title_arr      = title ? [title.toLowerCase()] : []; // Doubled as array for filtering

    stats.push({
      identifier,
      title     ,
      item_size ,
      mediatype ,
      date      ,
      publicdate,
      downloads ,
      month     ,
      week      ,
      collection_arr,
      creator_arr,
      title_arr
    });
  }

  return stats;
}

function load_stat_file(date) {
  const cached = stat_file_cache[date];
  if   (cached) {
    sf_cache_hits++;       cached.usage++;
    return Promise.resolve(cached.data);
  }
  sf_cache_misses++;

// return new Promise(resolve => setTimeout(resolve, 5, cached)); // For menu closing (solved there)

  const time_0    = performance.now();
  const container = document.getElementById("results");
  const xml_tmplt = container.getAttribute("data-stats");
  const xml_regex = /#/;
  const xml_url   = xml_tmplt.replace(xml_regex, date);

  return fetch(xml_url)
    .then(response => {
      if (!response.ok) { throw new Error(date + " &mdash; XML file not found"); }
      return response.text();
    })
    .then(text => {
      const time_1 = performance.now();
      const parser = new DOMParser();
      const xml    = parser.parseFromString(text, "text/xml");

      if (xml.querySelector("parsererror")) { throw new Error(date + " &mdash; Invalid XML format"); }
      const docs   = xml.querySelectorAll("doc");
//    const stats  = conv_stat_docs(docs);
      const time_2 = performance.now();

      // Accumulate
      du_load  += (time_1 - time_0);
      du_parse += (time_2 - time_1);

      const cache_dates = Object.keys(stat_file_cache);
      if   (cache_dates.length >= 7) {
        let min_usage = Infinity;
        let min_entry = null;
        for (const cd of cache_dates) {
          if ((cd === stat_curr_date) || (cd === stat_prev_date)) continue;
          const usage = stat_file_cache[cd].usage;
          if (min_usage > usage) {
              min_usage = usage;
              min_entry = cd;
          }
        }
        if (min_entry) delete stat_file_cache[min_entry];
      }

      stat_file_cache[date] = { data: docs,  usage: 1 };
      return docs;
//    stat_file_cache[date] = { data: stats, usage: 1 };
//    return stats;
    });
}

function load_stat(date, what) {
  if (!stat_file_dates.includes(date)) return;

  if (what === "curr") {
    if (stat_curr_date === date) return;
  } else { //  "prev"
    if (stat_prev_date === date) return;
  }

  // Reset
  du_load  = 0;
  du_parse = 0;

  load_stat_file(date)
    .then(loaded_items => {
      if (what === "curr") {
        stat_curr_items = loaded_items;
        stat_curr_date  = date;
      } else { //  "prev"
        stat_prev_items = loaded_items;
        stat_prev_date  = date;
      }
      process_filter();
    })
    .catch(err => {
      document.getElementById("results").innerHTML =
        '<div class="text-center text-comment">Error: ' + err.message + '</div>';
    });
}

function load_stats() {
  const container = document.getElementById("results");
        container.innerHTML = '<div class="text-center text-comment">Loading...</div>';

  Promise.all([
    load_stat_file(stat_curr_date),
    load_stat_file(stat_prev_date)
  ])
  .then(([loaded_curr_items, loaded_prev_items]) => {
    stat_curr_items = loaded_curr_items;
    stat_prev_items = loaded_prev_items;

    process_filter();
  })
  .catch(err => {
    container.innerHTML = '<div class="text-center text-comment">Error: ' + err.message + '</div>';
  });
}

// EOF






