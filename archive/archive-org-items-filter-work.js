/* Error Messages */

const err_beg = '<div class="text-center text-comment">';
const err_bds = '<details><summary class="text-ellipsis" style="width: fit-content; max-width: 100%; margin: 0 auto;">';
const err_es  = '</summary><p>';
const err_ed  = '</p></details>';
const err_end = '</div>';

const err_chars =
  err_beg +
  err_bds + 'Allowed characters are: a-z, 0-9, =!&lt;&gt;, (), {}, [], _-, period, comma, quote, and space' +
  err_es  +
  'Creators: =5 finds items (two) with exactly five creators<br />' +
  'Creators: Xiao >1 finds items (three) where more than one creator has Xiao in name<br />' +
  'Creators: Xiao] finds Xiao Wu, and not finds Xiaodan<br />' +
  'Creators: Xiao[ finds Xiaodan, and not finds Xiao Wu<br />' +
  'Subjects: Dance >4 finds items (14) where more than four subjects contain Dance<br />' +
  'Title: \' Xiaodan \' finds items (10) with name Xiaodan surrounded by spaces in title<br />' +
  'Title: /-xiaodan- finds items (same 10) with string -xiaodan- in identifier (not in title)<br />' +
  'Description: \'p=2\' finds items (102) with string p=2 in description (no counting)<br />' +
  'Description: {99} finds one item with description length of 99 characters<br />' +
  '{exact}, {min-max}, {-max}, {min-} are allowed' +
  '</p><p>' +
  'Conditionals are: = or ==, ! or !=, &lt;, &lt;=, &gt;, &gt;=<br />' +
  'Allowed counts: 0 to 9999' +
  err_ed +
  err_end;

const err_integer =
  err_beg + 'Allowed numbers are non-negative integers: 123' +
  err_end;

const err_number =
  err_beg + 'Allowed numbers are non-negative: floats (123. / 123.456 / .456) or integers (123)' +
  err_end;

const err_parens =
  err_beg + 'Parentheses must match: ()' +
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
  err_bds + 'Allowed are non-negative numbers, and keys: grow, fall, same, diff. Prefixes: ^ and . (dot)' +
  err_es  +
  'Prefix ^ switches Downloads fields to Old = Downloads &minus; Month. Old is displayed in the table<br />' +
  'Prefix ^ switches Month fields to 23 = Month &minus; Week. 23 is displayed in the table<br />' +
  'Prefix ^ does nothing to Week fields. Week is always 7 days. Week is displayed in the table' +
  '</p><p>' +
  'Integer range is for views count, float range is for views/day ratio, empty field is for no-limit value' +
  '</p><p>' +
  'Aggregate range uses aggregate function in any field (or in both fields) of min/max pair<br />' +
  'Examples: min 10 / 20, min 10 / avg 30, also: max 20 / min 10 (reversed aggregate range)<br />' +
  'Note: min 10 / 20, and 10 / min 20 aggregate ranges both equal min 10 / min 20<br />' +
  'Aggregate item functions are: min, avg, max, add, sub, pos, neg, prev, curr<br />' +
  'Aggregate rank functions are:<br />' +
    'topn/tn, btmn/bn for min; topa/ta, btma/ba for avg; topx/tx, btmx/bx for max;<br />' +
    'topd/td, btmd/bd for add; tops/ts, btms/bs for sub;<br />' +
    'top+/t+, btm+/b+ for pos; top-/t-, btm-/b- for neg;<br />' +
    'topp/tp, btmp/bp for prev; topc/tc, btmc/bc for curr<br />' +
  'Equally ranked items ordered by date archived: min selects newer, max selects older<br />' +
  'Aggregate prefixed by . (dot) means views/day ratio, also use floats with item functions' +
  '</p><p>' +
  'Keys: grow, fall, same, diff (aliases: / \\ = !) switch min/max logic to prev/curr logic<br />' +
  'Key allows number or range min-max after it, and percent sign % can be after that<br />' +
  'Key prefixed by . (dot) means views/day ratio key: ./ or .grow (at 0.001 by default)' +
  '</p><p>' +
  'Number in prev/curr logic (alone, not after key) allows prefix: a, ae, b, be, e, ne' +
  err_ed +
  err_end;
const err_views_range =
  err_beg + 'Min views count must be less than or equal to max views count' +
  err_end;

const err_ratios_range =
  err_beg + 'Min ratio must be less than or equal to max ratio' +
  err_end;

const err_favs =
  err_beg +
  err_bds + 'Allowed are numbers: 0 to 9999, and keys: grow, fall, same, diff' +
  err_es  +
  'Keys have aliases: / \\ = ! and allow number or range min-max after them<br />' +
  'For / and \\ number is distance, for = and ! number is tolerance<br />' +
  'Defaults: / is /1, \\ is \\1, = is =0, ! is !0' +
  '</p><p>' +
  'Number alone (not after key) allows prefix: a, ae, b, be, e, ne<br />' +
  'Meaning: above, above or equal, below, below or equal, equal, not equal' +
  '</p><p>' +
  'Examples: /3, \\2, =1, !1, a1, be2, e3' +
  err_ed +
  err_end;
const err_favs_range =
  err_beg + 'Min favorites count must be less than or equal to max favorites count' +
  err_end;

const err_key_range =
  err_beg + 'Min key value must be less than or equal to max key value' +
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
    .replace(/\) ?\(/g, ')AND(') // Normalize ()() to ()AND()
    .split  (',')
    .map    (term => term.trim())
    .filter (term => term) // Non-empty only
    .map    (term => parse_term(term));
}

function input_parens_match(input) {
  if (!input) return true; // Empty input is valid

  const chunks = input.split(',');

  for (const chunk of chunks) {
    const term = chunk.trim();
    if  (!term) continue; // Skip empty chunk (is valid)

    let depth = 0;

    for (let i = 0; i < term.length; i++) {
      if (term[i] === '(') { depth++; continue; }
      if (term[i] === ')') { depth--; if (depth < 0) return false; } // Closing paren without an opening
    }

    if (depth) return false; // Unclosed opening paren
  }

  return true;
}

function input_allowed_chars(input) {
  return !/[^a-zA-Z0-9._\-'" =!<>(){}\[\],]/.test(input);
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

function filter_route(

  base_prev_items, base_prev_date,
  base_curr_items, base_curr_date,

  sect_subjects,
  sect_descriptions,

  input_values,

  no_wait = false) {

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
    const archived_min = archived_min_range.min_ms;
    const archived_max = archived_max_range.max_ms;

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
    const created_min = created_min_range.min_ms;
    const created_max = created_max_range.max_ms;

    if (created_min > created_max) {
      return { error: err_date_range };
    }
  }

  // Collections, Creators, Subjects, Title and Description
  const collections_str = input_values["collections"];
  const    creators_str = input_values["creators"   ];
  const    subjects_str = input_values["subjects"   ];
  let         title_str = input_values["title"      ].trim();
  const description_str = input_values["description"];

  // Title: field prefix
  let is_title_identifier = false; // Use identifier instead title
  [is_title_identifier, title_str] = get_title_prefix(title_str);

  if (!input_allowed_chars(collections_str) ||
      !input_allowed_chars(   creators_str) ||
      !input_allowed_chars(   subjects_str) ||
      !input_allowed_chars(      title_str) ||
      !input_allowed_chars(description_str)) {
    return { error: err_chars };
  }

  if (!input_parens_match(collections_str) ||
      !input_parens_match(   creators_str) ||
      !input_parens_match(   subjects_str) ||
      !input_parens_match(      title_str) ||
      !input_parens_match(description_str)) {
    return { error: err_parens };
  }

  const collections = input_clean_parse(collections_str);
  const creators    = input_clean_parse(   creators_str);
  const subjects    = input_clean_parse(   subjects_str);
  const title       = input_clean_parse(      title_str);
  const description = input_clean_parse(description_str);

  // Collections and Creators: ensure filtering fields available
  ensure_field_can_filter("collection", collections);
  ensure_field_can_filter("creator",    creators   );

  // Title: ensure filtering field available
  ensure_title_can_filter(title, is_title_identifier);

  /////////////////
  // Views / Ratios
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

  /////////////////////////////////
  // Views / Ratios: field prefixes
  let is_dl_old = false; // Use old instead dl, old = dl without last month
  let is_mo_23  = false; // Use 23 days instead month, 23 days = month withoul last week
  let is_wk_7   = false; // This flag is not used, week === 7 days

  [is_dl_old, dl_min_str, dl_max_str] = get_views_prefix(dl_min_str, dl_max_str);
  [is_mo_23,  mo_min_str, mo_max_str] = get_views_prefix(mo_min_str, mo_max_str);
  [is_wk_7,   wk_min_str, wk_max_str] = get_views_prefix(wk_min_str, wk_max_str);

  ///////////////
  // Ratios: keys
  const kv_range_error = kv => kv && (kv.min !== undefined) && (kv.max !== undefined) && (kv.min > kv.max);

  let [dl_min_ratio_key, dl_min_ratio_kv] = get_key(dl_min_str, "need-ratio");
  let [dl_max_ratio_key, dl_max_ratio_kv] = get_key(dl_max_str, "need-ratio");
  let [mo_min_ratio_key, mo_min_ratio_kv] = get_key(mo_min_str, "need-ratio");
  let [mo_max_ratio_key, mo_max_ratio_kv] = get_key(mo_max_str, "need-ratio");
  let [wk_min_ratio_key, wk_min_ratio_kv] = get_key(wk_min_str, "need-ratio");
  let [wk_max_ratio_key, wk_max_ratio_kv] = get_key(wk_max_str, "need-ratio");

  if (dl_min_ratio_kv) dl_min_str = ""; else dl_min_ratio_key = null;
  if (dl_max_ratio_kv) dl_max_str = ""; else dl_max_ratio_key = null;
  if (mo_min_ratio_kv) mo_min_str = ""; else mo_min_ratio_key = null;
  if (mo_max_ratio_kv) mo_max_str = ""; else mo_max_ratio_key = null;
  if (wk_min_ratio_kv) wk_min_str = ""; else wk_min_ratio_key = null;
  if (wk_max_ratio_kv) wk_max_str = ""; else wk_max_ratio_key = null;

  if (kv_range_error(dl_min_ratio_kv) || kv_range_error(dl_max_ratio_kv) ||
      kv_range_error(mo_min_ratio_kv) || kv_range_error(mo_max_ratio_kv) ||
      kv_range_error(wk_min_ratio_kv) || kv_range_error(wk_max_ratio_kv)) {
    return { error: err_key_range };
  }

  // Ratios: number prefixes
  let dl_min_ratio_str = "";
  let dl_max_ratio_str = "";
  let mo_min_ratio_str = "";
  let mo_max_ratio_str = "";
  let wk_min_ratio_str = "";
  let wk_max_ratio_str = "";

  let dl_min_ratio_no = null;
  let dl_max_ratio_no = null;
  let mo_min_ratio_no = null;
  let mo_max_ratio_no = null;
  let wk_min_ratio_no = null;
  let wk_max_ratio_no = null;

  const [dl_min_ratio_str_t, dl_min_ratio_no_t] = get_num(dl_min_str, dl_max_ratio_key, "need-ratio");
  const [dl_max_ratio_str_t, dl_max_ratio_no_t] = get_num(dl_max_str, dl_min_ratio_key, "need-ratio");
  const [mo_min_ratio_str_t, mo_min_ratio_no_t] = get_num(mo_min_str, mo_max_ratio_key, "need-ratio");
  const [mo_max_ratio_str_t, mo_max_ratio_no_t] = get_num(mo_max_str, mo_min_ratio_key, "need-ratio");
  const [wk_min_ratio_str_t, wk_min_ratio_no_t] = get_num(wk_min_str, wk_max_ratio_key, "need-ratio");
  const [wk_max_ratio_str_t, wk_max_ratio_no_t] = get_num(wk_max_str, wk_min_ratio_key, "need-ratio");

  if (dl_max_ratio_key && dl_min_ratio_no_t) {
      dl_min_ratio_no  =  dl_min_ratio_no_t;
      dl_min_ratio_str =  dl_min_ratio_str_t;
      dl_min_str       =  "";
  }

  if (dl_min_ratio_key && dl_max_ratio_no_t) {
      dl_max_ratio_no  =  dl_max_ratio_no_t;
      dl_max_ratio_str =  dl_max_ratio_str_t;
      dl_max_str       =  "";
  }

  if (mo_max_ratio_key && mo_min_ratio_no_t) {
      mo_min_ratio_no  =  mo_min_ratio_no_t;
      mo_min_ratio_str =  mo_min_ratio_str_t;
      mo_min_str       =  "";
  }

  if (mo_min_ratio_key && mo_max_ratio_no_t) {
      mo_max_ratio_no  =  mo_max_ratio_no_t;
      mo_max_ratio_str =  mo_max_ratio_str_t;
      mo_max_str       =  "";
  }

  if (wk_max_ratio_key && wk_min_ratio_no_t) {
      wk_min_ratio_no  =  wk_min_ratio_no_t;
      wk_min_ratio_str =  wk_min_ratio_str_t;
      wk_min_str       =  "";
  }

  if (wk_min_ratio_key && wk_max_ratio_no_t) {
      wk_max_ratio_no  =  wk_max_ratio_no_t;
      wk_max_ratio_str =  wk_max_ratio_str_t;
      wk_max_str       =  "";
  }

  if ((!dl_min_ratio_key && dl_max_ratio_no_t && dl_max_ratio_str_t.includes('.')) ||
      (!dl_max_ratio_key && dl_min_ratio_no_t && dl_min_ratio_str_t.includes('.')) ||
      (!mo_min_ratio_key && mo_max_ratio_no_t && mo_max_ratio_str_t.includes('.')) ||
      (!mo_max_ratio_key && mo_min_ratio_no_t && mo_min_ratio_str_t.includes('.')) ||
      (!wk_min_ratio_key && wk_max_ratio_no_t && wk_max_ratio_str_t.includes('.')) ||
      (!wk_max_ratio_key && wk_min_ratio_no_t && wk_min_ratio_str_t.includes('.'))) {
    return { error: err_keys_no };
  }

  // Ratios: aggregate functions
  let dl_min_ratio_agg = null;
  let dl_max_ratio_agg = null;
  let mo_min_ratio_agg = null;
  let mo_max_ratio_agg = null;
  let wk_min_ratio_agg = null;
  let wk_max_ratio_agg = null;

  let dl_min_ratio_agg_t = null;
  let dl_max_ratio_agg_t = null;
  let mo_min_ratio_agg_t = null;
  let mo_max_ratio_agg_t = null;
  let wk_min_ratio_agg_t = null;
  let wk_max_ratio_agg_t = null;

  let dl_min_ratio_agg_num = undefined;
  let dl_max_ratio_agg_num = undefined;
  let mo_min_ratio_agg_num = undefined;
  let mo_max_ratio_agg_num = undefined;
  let wk_min_ratio_agg_num = undefined;
  let wk_max_ratio_agg_num = undefined;

  let dl_min_ratio_agg_num_t = undefined;
  let dl_max_ratio_agg_num_t = undefined;
  let mo_min_ratio_agg_num_t = undefined;
  let mo_max_ratio_agg_num_t = undefined;
  let wk_min_ratio_agg_num_t = undefined;
  let wk_max_ratio_agg_num_t = undefined;

  [dl_min_str_t, dl_min_ratio_agg_t, dl_min_ratio_agg_num_t] = get_agg(dl_min_str, "need-ratio");
  [dl_max_str_t, dl_max_ratio_agg_t, dl_max_ratio_agg_num_t] = get_agg(dl_max_str, "need-ratio");
  [mo_min_str_t, mo_min_ratio_agg_t, mo_min_ratio_agg_num_t] = get_agg(mo_min_str, "need-ratio");
  [mo_max_str_t, mo_max_ratio_agg_t, mo_max_ratio_agg_num_t] = get_agg(mo_max_str, "need-ratio");
  [wk_min_str_t, wk_min_ratio_agg_t, wk_min_ratio_agg_num_t] = get_agg(wk_min_str, "need-ratio");
  [wk_max_str_t, wk_max_ratio_agg_t, wk_max_ratio_agg_num_t] = get_agg(wk_max_str, "need-ratio");

  if (!dl_min_ratio_key                      && !dl_max_ratio_key    &&
      (dl_min_ratio_agg_t                    ||  dl_max_ratio_agg_t) &&
      (dl_min_ratio_agg_num_t !== undefined) && (dl_max_ratio_agg_num_t !== undefined)) {

    dl_min_ratio_agg     = dl_min_ratio_agg_t;
    dl_max_ratio_agg     = dl_max_ratio_agg_t;

    dl_min_ratio_agg_num = dl_min_ratio_agg_num_t;
    dl_max_ratio_agg_num = dl_max_ratio_agg_num_t;

    dl_min_str           = "";
    dl_max_str           = "";
  }

  if (!mo_min_ratio_key                      && !mo_max_ratio_key    &&
      (mo_min_ratio_agg_t                    ||  mo_max_ratio_agg_t) &&
      (mo_min_ratio_agg_num_t !== undefined) && (mo_max_ratio_agg_num_t !== undefined)) {

    mo_min_ratio_agg     = mo_min_ratio_agg_t;
    mo_max_ratio_agg     = mo_max_ratio_agg_t;

    mo_min_ratio_agg_num = mo_min_ratio_agg_num_t;
    mo_max_ratio_agg_num = mo_max_ratio_agg_num_t;

    mo_min_str           = "";
    mo_max_str           = "";
  }

  if (!wk_min_ratio_key                      && !wk_max_ratio_key    &&
      (wk_min_ratio_agg_t                    ||  wk_max_ratio_agg_t) &&
      (wk_min_ratio_agg_num_t !== undefined) && (wk_max_ratio_agg_num_t !== undefined)) {

    wk_min_ratio_agg     = wk_min_ratio_agg_t;
    wk_max_ratio_agg     = wk_max_ratio_agg_t;

    wk_min_ratio_agg_num = wk_min_ratio_agg_num_t;
    wk_max_ratio_agg_num = wk_max_ratio_agg_num_t;

    wk_min_str           = "";
    wk_max_str           = "";
  }

  if ((dl_min_ratio_key && dl_max_ratio_agg_t) ||
      (dl_max_ratio_key && dl_min_ratio_agg_t) ||
      (mo_min_ratio_key && mo_max_ratio_agg_t) ||
      (mo_max_ratio_key && mo_min_ratio_agg_t) ||
      (wk_min_ratio_key && wk_max_ratio_agg_t) ||
      (wk_max_ratio_key && wk_min_ratio_agg_t)) {
    return { error: err_keys_agg };
  }

  if (( (dl_min_ratio_agg_t                    ||  dl_max_ratio_agg_t) &&
       ((dl_min_ratio_agg_num_t === undefined) || (dl_max_ratio_agg_num_t === undefined))) ||
      ( (mo_min_ratio_agg_t                    ||  mo_max_ratio_agg_t) &&
       ((mo_min_ratio_agg_num_t === undefined) || (mo_max_ratio_agg_num_t === undefined))) ||
      ( (wk_min_ratio_agg_t                    ||  wk_max_ratio_agg_t) &&
       ((wk_min_ratio_agg_num_t === undefined) || (wk_max_ratio_agg_num_t === undefined))) ) {
    return { error: err_number };
  }

  // Ratios: values
  const [is_dl_ratios, dl_min_ratio, dl_max_ratio] = get_ratios(dl_min_str, dl_max_str);
  const [is_mo_ratios, mo_min_ratio, mo_max_ratio] = get_ratios(mo_min_str, mo_max_str);
  const [is_wk_ratios, wk_min_ratio, wk_max_ratio] = get_ratios(wk_min_str, wk_max_str);

  if (is_dl_ratios) {
    dl_min_str = ""; // Clear fields used by Ratios
    dl_max_str = ""; //

    if ((dl_min_ratio !== null) && (dl_max_ratio !== null)) {
      if (dl_min_ratio > dl_max_ratio) {
        return { error: err_ratios_range };
      }
    }
  }

  if (is_mo_ratios) {
    mo_min_str = ""; // Clear fields used by Ratios
    mo_max_str = ""; //

    if ((mo_min_ratio !== null) && (mo_max_ratio !== null)) {
      if (mo_min_ratio > mo_max_ratio) {
        return { error: err_ratios_range };
      }
    }
  }

  if (is_wk_ratios) {
    wk_min_str = ""; // Clear fields used by Ratios
    wk_max_str = ""; //

    if ((wk_min_ratio !== null) && (wk_max_ratio !== null)) {
      if (wk_min_ratio > wk_max_ratio) {
        return { error: err_ratios_range };
      }
    }
  }

  //////////////
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

  if (kv_range_error(dl_min_kv) || kv_range_error(dl_max_kv) ||
      kv_range_error(mo_min_kv) || kv_range_error(mo_max_kv) ||
      kv_range_error(wk_min_kv) || kv_range_error(wk_max_kv)) {
    return { error: err_key_range };
  }

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

  let dl_min_agg_num = undefined;
  let dl_max_agg_num = undefined;
  let mo_min_agg_num = undefined;
  let mo_max_agg_num = undefined;
  let wk_min_agg_num = undefined;
  let wk_max_agg_num = undefined;

  let dl_min_agg_num_t = undefined;
  let dl_max_agg_num_t = undefined;
  let mo_min_agg_num_t = undefined;
  let mo_max_agg_num_t = undefined;
  let wk_min_agg_num_t = undefined;
  let wk_max_agg_num_t = undefined;

  [dl_min_str_t, dl_min_agg_t, dl_min_agg_num_t] = get_agg(dl_min_str);
  [dl_max_str_t, dl_max_agg_t, dl_max_agg_num_t] = get_agg(dl_max_str);
  [mo_min_str_t, mo_min_agg_t, mo_min_agg_num_t] = get_agg(mo_min_str);
  [mo_max_str_t, mo_max_agg_t, mo_max_agg_num_t] = get_agg(mo_max_str);
  [wk_min_str_t, wk_min_agg_t, wk_min_agg_num_t] = get_agg(wk_min_str);
  [wk_max_str_t, wk_max_agg_t, wk_max_agg_num_t] = get_agg(wk_max_str);

  if (!input_allowed_keys(dl_min_str)  && !input_allowed_keys(dl_max_str) &&
      (dl_min_agg_t                    ||  dl_max_agg_t)                  &&
      (dl_min_agg_num_t !== undefined) && (dl_max_agg_num_t !== undefined)) {

    dl_min_str     = dl_min_str_t;
    dl_max_str     = dl_max_str_t;

    dl_min_agg     = dl_min_agg_t;
    dl_max_agg     = dl_max_agg_t;

    dl_min_agg_num = dl_min_agg_num_t;
    dl_max_agg_num = dl_max_agg_num_t;
  }

  if (!input_allowed_keys(mo_min_str)  && !input_allowed_keys(mo_max_str) &&
      (mo_min_agg_t                    ||  mo_max_agg_t)                  &&
      (mo_min_agg_num_t !== undefined) && (mo_max_agg_num_t !== undefined)) {

    mo_min_str     = mo_min_str_t;
    mo_max_str     = mo_max_str_t;

    mo_min_agg     = mo_min_agg_t;
    mo_max_agg     = mo_max_agg_t;

    mo_min_agg_num = mo_min_agg_num_t;
    mo_max_agg_num = mo_max_agg_num_t;
  }

  if (!input_allowed_keys(wk_min_str)  && !input_allowed_keys(wk_max_str) &&
      (wk_min_agg_t                    ||  wk_max_agg_t)                  &&
      (wk_min_agg_num_t !== undefined) && (wk_max_agg_num_t !== undefined)) {

    wk_min_str     = wk_min_str_t;
    wk_max_str     = wk_max_str_t;

    wk_min_agg     = wk_min_agg_t;
    wk_max_agg     = wk_max_agg_t;

    wk_min_agg_num = wk_min_agg_num_t;
    wk_max_agg_num = wk_max_agg_num_t;
  }

  if ((input_allowed_keys(dl_min_str_t) && dl_max_agg_t) ||
      (input_allowed_keys(dl_max_str_t) && dl_min_agg_t) ||
      (input_allowed_keys(mo_min_str_t) && mo_max_agg_t) ||
      (input_allowed_keys(mo_max_str_t) && mo_min_agg_t) ||
      (input_allowed_keys(wk_min_str_t) && wk_max_agg_t) ||
      (input_allowed_keys(wk_max_str_t) && wk_min_agg_t)) {
    return { error: err_keys_agg };
  }

  if (( (dl_min_agg_t                    ||  dl_max_agg_t) &&
       ((dl_min_agg_num_t === undefined) || (dl_max_agg_num_t === undefined))) ||
      ( (mo_min_agg_t                    ||  mo_max_agg_t) &&
       ((mo_min_agg_num_t === undefined) || (mo_max_agg_num_t === undefined))) ||
      ( (wk_min_agg_t                    ||  wk_max_agg_t) &&
       ((wk_min_agg_num_t === undefined) || (wk_max_agg_num_t === undefined))) ) {
    return { error: err_integer };
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

  ///////
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

  if (kv_range_error(favs_min_kv) || kv_range_error(favs_max_kv)) {
    return { error: err_key_range };
  }

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

  let favs_min_agg_num = undefined;
  let favs_max_agg_num = undefined;

  let favs_min_agg_num_t = undefined;
  let favs_max_agg_num_t = undefined;

  [favs_min_str_t, favs_min_agg_t, favs_min_agg_num_t] = get_agg(favs_min_str);
  [favs_max_str_t, favs_max_agg_t, favs_max_agg_num_t] = get_agg(favs_max_str);

  if (!input_allowed_keys(favs_min_str)  && !input_allowed_keys(favs_max_str) &&
      (favs_min_agg_t                    ||  favs_max_agg_t)                  &&
      (favs_min_agg_num_t !== undefined) && (favs_max_agg_num_t !== undefined)) {

    favs_min_str     = favs_min_str_t;
    favs_max_str     = favs_max_str_t;

    favs_min_agg     = favs_min_agg_t;
    favs_max_agg     = favs_max_agg_t;

    favs_min_agg_num = favs_min_agg_num_t;
    favs_max_agg_num = favs_max_agg_num_t;
  }

  if ((input_allowed_keys(favs_min_str_t) && favs_max_agg_t) ||
      (input_allowed_keys(favs_max_str_t) && favs_min_agg_t)) {
    return { error: err_keys_agg };
  }

  if ( (favs_min_agg_t                    ||  favs_max_agg_t) &&
      ((favs_min_agg_num_t === undefined) || (favs_max_agg_num_t === undefined)) ) {
    return { error: err_integer };
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

  ///////////
  // Sections
  //
  // After last input_values check
  // Before first filter
  //
  if (!no_wait) {
    // Subjects Check: Wait for sect_subjects.items to load
    if (wait_section(sect_subjects, subjects)) return { wait: true };

    // Descriptions Check: Wait for sect_descriptions.items to load
    if (wait_section(sect_descriptions, description)) return { wait: true };
  }

  /////////////////////////////////////////////////////////////////
  // 1. Checking and Initial Filtering Items, and Calculating Stats

  let results_prev = filter_base(base_prev_items, base_prev_date,
    archived_min_range, archived_max_range, created_min_range, created_max_range,
    collections, creators, title, is_title_identifier);

  let results_curr = filter_base(base_curr_items, base_curr_date,
    archived_min_range, archived_max_range, created_min_range, created_max_range,
    collections, creators, title, is_title_identifier);

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

    dl_min_str, dl_min_kv, dl_min_no, dl_min_agg, dl_min_agg_num,
    dl_max_str, dl_max_kv, dl_max_no, dl_max_agg, dl_max_agg_num, is_dl_old,

    mo_min_str, mo_min_kv, mo_min_no, mo_min_agg, mo_min_agg_num,
    mo_max_str, mo_max_kv, mo_max_no, mo_max_agg, mo_max_agg_num, is_mo_23,

    wk_min_str, wk_min_kv, wk_min_no, wk_min_agg, wk_min_agg_num,
    wk_max_str, wk_max_kv, wk_max_no, wk_max_agg, wk_max_agg_num);

  if (filtered_views.done) {
    results_prev = filtered_views.prev;
    results_curr = filtered_views.curr;
  }

  // 5. Ratios
  const filtered_ratios = filter_ratios(results_prev, results_curr,

    is_dl_ratios,        dl_min_ratio,    dl_max_ratio,   is_dl_old,
       dl_min_ratio_key, dl_min_ratio_kv, dl_min_ratio_str,  dl_min_ratio_no,
       dl_max_ratio_key, dl_max_ratio_kv, dl_max_ratio_str,  dl_max_ratio_no,
       dl_min_ratio_agg, dl_min_ratio_agg_num,
       dl_max_ratio_agg, dl_max_ratio_agg_num,

    is_mo_ratios,        mo_min_ratio,    mo_max_ratio,   is_mo_23,
       mo_min_ratio_key, mo_min_ratio_kv, mo_min_ratio_str,  mo_min_ratio_no,
       mo_max_ratio_key, mo_max_ratio_kv, mo_max_ratio_str,  mo_max_ratio_no,
       mo_min_ratio_agg, mo_min_ratio_agg_num,
       mo_max_ratio_agg, mo_max_ratio_agg_num,

    is_wk_ratios,        wk_min_ratio,    wk_max_ratio,
       wk_min_ratio_key, wk_min_ratio_kv, wk_min_ratio_str,  wk_min_ratio_no,
       wk_max_ratio_key, wk_max_ratio_kv, wk_max_ratio_str,  wk_max_ratio_no,
       wk_min_ratio_agg, wk_min_ratio_agg_num,
       wk_max_ratio_agg, wk_max_ratio_agg_num);

  if (filtered_ratios.done) {
    results_prev = filtered_ratios.prev;
    results_curr = filtered_ratios.curr;
  }

  // 6. Favs
  const filtered_favs = filter_favs(results_prev, results_curr,

    favs_min_str, favs_min_kv, favs_min_no, favs_min_agg, favs_min_agg_num,
    favs_max_str, favs_max_kv, favs_max_no, favs_max_agg, favs_max_agg_num);

  if (filtered_favs.done) {
    results_prev = filtered_favs.prev;
    results_curr = filtered_favs.curr;
  }

  // 7. Sets. Must be the last filter
  const only_prev = input_values["only-prev"];
  const only_curr = input_values["only-curr"];

  const filtered_sets = filter_sets(results_prev, results_curr, only_prev, only_curr);

  if   (filtered_sets.done) {
    results_prev = filtered_sets.prev;
    results_curr = filtered_sets.curr;
  }

  // Filter Route Done
  return { done: true, prev: results_prev, curr: results_curr };
}

// EOF






