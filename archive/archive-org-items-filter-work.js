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
  'Examples: min 10 / 20, min 10 / avg 30, also: max 20 / min 10 (reversed aggregate range)<br />' +
  'Note: min 10 / 20, and 10 / min 20 aggregate ranges both are mean min 10 / min 20<br />' +
  'Aggregate item functions are: min, avg, max, add, sub, pos, neg, prev, curr<br />' +
  'Aggregate rank functions are:<br />' +
    'topn/tn, btmn/bn for min; topa/ta, btma/ba for avg; topx/tx, btmx/bx for max;<br />' +
    'topd/td, btmd/bd for add; tops/ts, btms/bs for sub;<br />' +
    'top+/t+, btm+/b+ for pos; top-/t-, btm-/b- for neg;<br />' +
    'topp/tp, btmp/bp for prev; topc/tc, btmc/bc for curr' +
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

/* Filter by Date */

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

function get_date_range(date_str) {
  if (!date_str) return null;

  // Catch empty parts like "2022-", "2022--", "2022-08-", "2022--08"
  const parts_str = date_str.split('-').map(part => part.trim());
  if   (parts_str.some(part => !/^\d{1,4}$/.test(part))) return null;

  const first_str = parts_str[0];
  const first_len = first_str.length;

  const parts = parts_str.map(Number); // Ok with check above

  if (first_len === 4) { // Year-based format
    const base = "year";

    if (parts.length === 1) { // Year
      const year = parts[0];
      if (!is_date_valid(year, 1, 1)) return null;
      return {
        base,
        min: new Date(Date.UTC(year, 01-1, 01, 00, 00, 00, 000)), // Year beg
        max: new Date(Date.UTC(year, 12-1, 31, 23, 59, 59, 999))  // Year end
      };
    }
    if (parts.length === 2) { // Year-Month
      const [year, month] = parts;
      if (!is_date_valid(year, month, 1)) return null;
      const e_mday = new Date(Date.UTC(year, month, 0)).getUTCDate();
      return {
        base,
        min: new Date(Date.UTC(year, month - 1, 1,      00, 00, 00, 000)), // Month beg
        max: new Date(Date.UTC(year, month - 1, e_mday, 23, 59, 59, 999))  // Month end
      };
    }
    if (parts.length === 3) { // Year-Month-Day
      const [year, month, day] = parts;
      if (!is_date_valid(year, month, day)) return null;
      return {
        base,
        min: new Date(Date.UTC(year, month - 1, day, 00, 00, 00, 000)), // Day beg
        max: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))  // Day end
      };
    }
    return null; // Invalid format
  }

  // Month-based format

  const base = "month";

  if (first_len === 3) {
    if (first_str === "520") return { base, month: 5, day: 20 }; // Happy 520 Day!
    return null;
  }

  const month = parts[0];
  if  ((month < 1) || (month > 12)) return null;

  if (parts.length === 1) return { base, month };

  if (parts.length === 2) {
    const day = parts[1];
    if (!is_date_valid(2024, month, day)) return null; // Allow 29 days for February
    return { base, month, day };
  }
  return null; // Invalid format
}

function is_date_valid(year, month, day) {
  // Create date and check if it "corrects" the input
  const  date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && 
         date.getUTCMonth() === (month - 1) && 
         date.getUTCDate() === day;
}

/* Filter by Query */

function filter_matches(doc, field, terms) {
  if (!terms || !terms.length) return true; // No or empty filter = match all

  const values = doc[field + "_arr"];

  return terms.some(term => evaluate_term(term, values)); // Check if any term matches
}

function evaluate_term(term, values) {
  switch (term.type) {
    case "AND":
      return term.terms.every(part => evaluate_term(part, values));

    case "OR":
      return term.terms.some(part => evaluate_term(part, values));

    case "XOR": {
      //  XOR : Include if one match only
      let cnt_match = 0;
      for (const part of term.terms) {
        if (evaluate_term(part, values)) {
          cnt_match++;
          if (cnt_match > 1) return false;
        }
      }
      return cnt_match === 1;
    }
    case "NOT"   :
    case "NOTANY": {
      //  NOTANY : Exclude if any value matches term.excl
      const any_match = evaluate_term(term.excl, values);
      return (!term.incl || evaluate_term(term.incl, values)) && !any_match;
    }
    case "NOTALL": {
      //  NOTALL : Exclude if all values matches term.excl
      const all_match = values.every(value => evaluate_term(term.excl, [value]));
      return (!term.incl || evaluate_term(term.incl, values)) && !all_match;
    }
    case "TEXT":
      return values.some(value => value.includes(term.text));

    default:
      return false; // Unknown type of term
  }
}

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
  // Check for XOR next
  else if (term.includes(" XOR ")) {
    const terms = term.split(" XOR ").map(part => parse_term(part));
    return {
      type: "XOR",
      terms: terms
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
  sect_subjects, sect_descriptions,
  input_values) {

  // Archived Range
  const archived_min_str = input_values["archived-min"].trim();
  const archived_max_str = input_values["archived-max"].trim();

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
  const created_min_str = input_values["created-min"].trim();
  const created_max_str = input_values["created-max"].trim();

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
  const collections_str = input_values["collections"];
  const    creators_str = input_values["creators"   ];
  const    subjects_str = input_values["subjects"   ];
  const       title_str = input_values["title"      ];
  const description_str = input_values["description"];

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
  let dl_min_str = input_values["downloads-min"].trim().toLowerCase();
  let dl_max_str = input_values["downloads-max"].trim().toLowerCase();
  let mo_min_str = input_values[    "month-min"].trim().toLowerCase();
  let mo_max_str = input_values[    "month-max"].trim().toLowerCase();
  let wk_min_str = input_values[     "week-min"].trim().toLowerCase();
  let wk_max_str = input_values[     "week-max"].trim().toLowerCase();

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
  let favs_min_str = input_values["favs-min"].trim().toLowerCase();
  let favs_max_str = input_values["favs-max"].trim().toLowerCase();

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

  /////////////////////////////////////////////////////////////////
  // 1. Checking and Initial Filtering Items, and Calculating Stats
  let results_prev = filter_base(base_prev_items, base_prev_date,
    archived_min_range, archived_max_range, created_min_range, created_max_range,
    collections, creators, title);
  let results_curr = filter_base(base_curr_items, base_curr_date,
    archived_min_range, archived_max_range, created_min_range, created_max_range,
    collections, creators, title);

  // 2. Subjects
  const filtered_subjects = filter_section(results_prev, results_curr,
    sect_subjects.items, subjects);
  if (filtered_subjects.done) {
    results_prev = filtered_subjects.prev;
    results_curr = filtered_subjects.curr;
  }
  else if (filtered_subjects.error) {
    const error =            sect_subjects.text_error
                ? (err_beg + sect_subjects.text_error + err_end)
                :  err_subjects; // Generic
    return { error };
  }

  // 3. Description
  const filtered_descriptions = filter_section(results_prev, results_curr,
    sect_descriptions.items, description);
  if (filtered_descriptions.done) {
    results_prev = filtered_descriptions.prev;
    results_curr = filtered_descriptions.curr;
  }
  else if (filtered_descriptions.error) {
    const error =            sect_descriptions.text_error
                ? (err_beg + sect_descriptions.text_error + err_end)
                :  err_descriptions; // Generic
    return { error };
  }

  // 4. Views
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

  // 5. Favs
  const filtered_favs = filter_favs(results_prev, results_curr,
    favs_min_str, favs_min_kv, favs_min_no, favs_min_agg,
    favs_max_str, favs_max_kv, favs_max_no, favs_max_agg);
  if (filtered_favs.done) {
    results_prev = filtered_favs.prev;
    results_curr = filtered_favs.curr;
  }

  // 6. Sets. Must be the last filter
  const prev_only = input_values["prev-only"];
  const curr_only = input_values["curr-only"];

  const filtered_sets = filter_sets(results_prev, results_curr, prev_only, curr_only);
  if   (filtered_sets.done) {
    results_prev = filtered_sets.prev;
    results_curr = filtered_sets.curr;
  }

  return { done: true, prev: results_prev, curr: results_curr };
}

// EOF






