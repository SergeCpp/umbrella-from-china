/* Global Variables */

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

/* Error Messaging */

function error_compose(title, description = null) {
  if (!title) title = "Error";

  if (description) return err_beg + err_bds + title + err_es + description + err_ed + err_end;

  return err_beg + title + err_end;
}

/* Filter Input Check */

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

/* Filter Route */

function filter_route(base_prev_items, base_prev_date,
                      base_curr_items, base_curr_date,
  sect_subjects, sect_descriptions) {

  // Archived Range
  const archived_min_str = document.getElementById("archived-min").value.trim();
  const archived_max_str = document.getElementById("archived-max").value.trim();

  const archived_min_range = get_date_range(archived_min_str);
  const archived_max_range = get_date_range(archived_max_str);

  if (!archived_min_range || !archived_max_range) {
    return { error: err_date };
  }

  if (archived_min_range.base !== archived_max_range.base) {
    return { error: err_date_base };
  }

  if (archived_min_range.base === "year") {
    const archived_min = archived_min_range.min;
    const archived_max = archived_max_range.max;

    if (archived_min > archived_max) {
      return { error: err_date_range };
    }
  }

  // Created Range
  const created_min_str = document.getElementById("created-min").value.trim();
  const created_max_str = document.getElementById("created-max").value.trim();

  const created_min_range = get_date_range(created_min_str);
  const created_max_range = get_date_range(created_max_str);

  if (!created_min_range || !created_max_range) {
    return { error: err_date };
  }

  if (created_min_range.base !== created_max_range.base) {
    return { error: err_date_base };
  }

  if (created_min_range.base === "year") {
    const created_min = created_min_range.min;
    const created_max = created_max_range.max;

    if (created_min > created_max) {
      return { error: err_date_range };
    }
  }

  // Collections, Creators, Subjects, Title and Description
  const collections_str = document.getElementById("collections").value;
  const    creators_str = document.getElementById("creators"   ).value;
  const    subjects_str = document.getElementById("subjects"   ).value;
  const       title_str = document.getElementById("title"      ).value;
  const description_str = document.getElementById("description").value;

  if (!input_allowed_chars(collections_str) ||
      !input_allowed_chars(   creators_str) ||
      !input_allowed_chars(   subjects_str) ||
      !input_allowed_chars(      title_str) ||
      !input_allowed_chars(description_str)) {
    return { error: err_chars };
  }

  const collections = input_clean_parse(collections_str);
  const creators    = input_clean_parse(   creators_str);
  const subjects    = input_clean_parse(   subjects_str);
  const title       = input_clean_parse(      title_str);
  const description = input_clean_parse(description_str);

  // Views
  let dl_min_str = document.getElementById("downloads-min").value.trim().toLowerCase();
  let dl_max_str = document.getElementById("downloads-max").value.trim().toLowerCase();
  let mo_min_str = document.getElementById(    "month-min").value.trim().toLowerCase();
  let mo_max_str = document.getElementById(    "month-max").value.trim().toLowerCase();
  let wk_min_str = document.getElementById(     "week-min").value.trim().toLowerCase();
  let wk_max_str = document.getElementById(     "week-max").value.trim().toLowerCase();

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
    return { error: err_keys_no };
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
    return { error: err_keys_agg };
  }

  // Views: chars
  if (!input_allowed_views(dl_min_str) || !input_allowed_views(dl_max_str) ||
      !input_allowed_views(mo_min_str) || !input_allowed_views(mo_max_str) ||
      !input_allowed_views(wk_min_str) || !input_allowed_views(wk_max_str)) {
    return { error: err_views };
  }

  // Views: values
  if (!dl_min_agg && !dl_max_agg) { // For agg min > max is allowed
    const dl_min_cnt = parseInt(dl_min_str, 10);
    const dl_max_cnt = parseInt(dl_max_str, 10);

    if (!isNaN(dl_min_cnt) && !isNaN(dl_max_cnt)) {
      if (dl_min_cnt > dl_max_cnt) {
        return { error: err_views_range };
      }
    }
  }

  if (!mo_min_agg && !mo_max_agg) { // For agg min > max is allowed
    const mo_min_cnt = parseInt(mo_min_str, 10);
    const mo_max_cnt = parseInt(mo_max_str, 10);

    if (!isNaN(mo_min_cnt) && !isNaN(mo_max_cnt)) {
      if (mo_min_cnt > mo_max_cnt) {
        return { error: err_views_range };
      }
    }
  }

  if (!wk_min_agg && !wk_max_agg) { // For agg min > max is allowed
    const wk_min_cnt = parseInt(wk_min_str, 10);
    const wk_max_cnt = parseInt(wk_max_str, 10);

    if (!isNaN(wk_min_cnt) && !isNaN(wk_max_cnt)) {
      if (wk_min_cnt > wk_max_cnt) {
        return { error: err_views_range };
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
    return { error: err_keys_no };
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
    return { error: err_keys_agg };
  }

  // Favs: chars
  if (!input_allowed_favs(favs_min_str) || !input_allowed_favs(favs_max_str)) {
    return { error: err_favs };
  }

  // Favs: values
  if (!favs_min_agg && !favs_max_agg) { // For agg min > max is allowed
    const favs_min_cnt = parseInt(favs_min_str, 10);
    const favs_max_cnt = parseInt(favs_max_str, 10);

    if (!isNaN(favs_min_cnt) && !isNaN(favs_max_cnt)) {
      if (favs_min_cnt > favs_max_cnt) {
        return { error: err_favs_range };
      }
    }
  }

  // Subjects Check: Wait for sect_subjects.items to load
  if (wait_section(sect_subjects, subjects)) return { wait: true };

  // Descriptions Check: Wait for sect_descriptions.items to load
  if (wait_section(sect_descriptions, description)) return { wait: true };

  // Checking and Initial Filtering Items, and Calculating Stats
  let results_prev = filter_base(base_prev_items, base_prev_date,
    archived_min_range, archived_max_range, created_min_range, created_max_range,
    collections, creators, title);
  let results_curr = filter_base(base_curr_items, base_curr_date,
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
    results_prev = filtered_views.prev;
    results_curr = filtered_views.curr;
  }

  // Favs
  const filtered_favs = filter_favs(results_prev, results_curr,
    favs_min_str, favs_min_kv, favs_min_no, favs_min_agg,
    favs_max_str, favs_max_kv, favs_max_no, favs_max_agg);
  if (filtered_favs.done) {
    results_prev = filtered_favs.prev;
    results_curr = filtered_favs.curr;
  }

  // Subjects
  const filtered_subjects = filter_section(results_prev, results_curr, sect_subjects.items, subjects);
  if   (filtered_subjects.done) {
    results_prev = filtered_subjects.prev;
    results_curr = filtered_subjects.curr;
  }
  else if (filtered_subjects.error) {
    const error =            sect_subjects.text_error
                ? (err_beg + sect_subjects.text_error + err_end)
                :  err_subjects; // Generic
    return { error };
  }

  // Descriptions
  const filtered_descriptions = filter_section(results_prev, results_curr, sect_descriptions.items, description);
  if   (filtered_descriptions.done) {
    results_prev = filtered_descriptions.prev;
    results_curr = filtered_descriptions.curr;
  }
  else if (filtered_descriptions.error) {
    const error =            sect_descriptions.text_error
                ? (err_beg + sect_descriptions.text_error + err_end)
                :  err_descriptions; // Generic
    return { error };
  }

  // Sets. Must be the last filter
  const prev_only = document.getElementById("prev-only").checked;
  const curr_only = document.getElementById("curr-only").checked;

  const filtered_sets = filter_sets(results_prev, results_curr, prev_only, curr_only);
  if   (filtered_sets.done) {
    results_prev = filtered_sets.prev;
    results_curr = filtered_sets.curr;
  }

  return { done: true, prev: results_prev, curr: results_curr };
}

// EOF






