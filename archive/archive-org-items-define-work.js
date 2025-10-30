/* Global Variables */

const stat_file_dates = [];   // ["YYYY-MM-DD"]
const stat_file_cache = {};   // ["YYYY-MM-DD"] = []

let   stat_curr_date  = null; //  "YYYY-MM-DD"
let   stat_curr_items = null; // Array / NodeList

let   stat_prev_date  = null; //  "YYYY-MM-DD"
let   stat_prev_items = null; // Array / NodeList

let   stat_subjects   = null; // null / {} / undefined

let   du_load         = 0;    // Duration of load
let   du_parse        = 0;    // Duration of parse

/* Subjects Processing */

function wait_subjects(subjects_items, subjects_terms) {
  if (!subjects_terms || (subjects_terms.length === 0)) return false; // No or empty filter for subjects

  if (subjects_items)               return false; // Subjects already   loaded
  if (subjects_items === undefined) return false; // Subjects cannot be loaded
  if (subjects_items !== null)      return false; // Error, must be null here

  load_subjects();

  return true; // Wait for subjects to load
}

function load_subjects() {
  if (stat_subjects !== null) return;
  stat_subjects = undefined;

  const time_0    = performance.now();
  const container = document.getElementById("results");
  const xml_tmplt = container.getAttribute("data-subjects");
  const xml_regex = /#/;
  const xml_url   = xml_tmplt.replace(xml_regex, "2025-10-19");

  fetch(xml_url)
    .then(response => {
      if (!response.ok) { throw new Error("Subjects XML file not found"); }
      return response.text();
    })
    .then(text => {
      const time_1 = performance.now();
      const parser = new DOMParser();
      const xml    = parser.parseFromString(text, "text/xml");

      if (xml.querySelector("parsererror")) { throw new Error("Subjects XML file invalid format"); }
      const docs = xml.querySelectorAll("doc");

      // Create subjects lookup map for id: subjects
//    stat_subjects = new Map(); // Slower
      stat_subjects =        {}; // Faster
      for (const doc of docs) {
        const node_i = doc.querySelector('str[name="identifier"]');
        if  (!node_i) continue;
        const identifier = node_i.textContent;

        const node_s = doc.querySelector('arr[name="subject"], str[name="subject"]');
        const subjects = node_s
          ? node_s.tagName === "arr"
            ? Array.from(node_s.querySelectorAll("str"), n => n.textContent.toLowerCase())
            : [node_s.textContent.toLowerCase()]
          : [];
//      stat_subjects.set(identifier,   subjects); // Slower
        stat_subjects    [identifier] = subjects;  // Faster
      }
      const time_2 = performance.now();

      // Reset to new values
      du_load  = (time_1 - time_0);
      du_parse = (time_2 - time_1);
    })
    .catch(() => {
      stat_subjects = undefined;
    })
    .finally(() => {
      process_filter();
    });
}

function filter_subjects(items_prev, items_curr, subjects_items, subjects_terms) {
  if (!subjects_terms || (subjects_terms.length === 0)) return { done: false };
  if (!subjects_items) return { error: true };

  const identifiers = {}; // Collect all identifiers
  for (const item of items_prev) identifiers[item.identifier] = null;
  for (const item of items_curr) identifiers[item.identifier] = null;

  // Cache match results for items
  for (const identifier in identifiers) {
//  const subjects = subjects_items.get(identifier); // Slower
    const subjects = subjects_items    [identifier]; // Faster
    if  (!subjects) continue;

    const match_result = subjects_terms.some(term => evaluate_term(term, subjects));
    identifiers[identifier] = match_result;
  }

  // Use cached results
  const results_prev = items_prev.filter(item => identifiers[item.identifier]);
  const results_curr = items_curr.filter(item => identifiers[item.identifier]);

  return { done: true, prev: results_prev, curr: results_curr };
}

/* Filter */

function is_date_valid(year, month, day) {
  // Create date and check if it "corrects" the input
  const  date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && 
         date.getUTCMonth() === (month - 1) && 
         date.getUTCDate() === day;
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

function get_views_prefix(min_str, max_str) {
  const is_min_prefix = min_str.startsWith('^');
  const is_max_prefix = max_str.startsWith('^');

  if (is_min_prefix) min_str = min_str.slice(1).trimStart();
  if (is_max_prefix) max_str = max_str.slice(1).trimStart();

  return [ is_min_prefix || is_max_prefix, min_str, max_str ];
}

// Syntax: grow or / | fall or \ | same or = | diff or ! [integer [%] ]
function get_key(str) {
  let sl    = 0;
  let name  = null;
  let value = null;

  if      (str.startsWith("grow")) { sl = 4; name = "grow"; value = 1; }
  else if (str.startsWith('/'   )) { sl = 1; name = "grow"; value = 1; }
  else if (str.startsWith("fall")) { sl = 4; name = "fall"; value = 1; }
  else if (str.startsWith('\\'  )) { sl = 1; name = "fall"; value = 1; }
  else if (str.startsWith("same")) { sl = 4; name = "same"; value = 0; }
  else if (str.startsWith('='   )) { sl = 1; name = "same"; value = 0; }
  else if (str.startsWith("diff")) { sl = 4; name = "diff"; value = 0; }
  else if (str.startsWith('!'   )) { sl = 1; name = "diff"; value = 0; }
  else return [ str, null ];

  let   s = str.slice(sl).trimStart();
  const p = s.endsWith('%');

  if (p) {
    s = s.slice(0, -1).trimEnd();
    if (s === "") return [ str, null ]; // For % must be a value
  }

  if (s !== "") {
    if (!/^\d{1,8}$/.test(s)) return [ str, null ];
    const v = parseInt(s, 10);
    if (isNaN(v) || (v < 0))  return [ str, null ];
    value = v;
  }

  return [ name, { value, is_percent: p } ];
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

function process_filter() {
  const time_0    = performance.now();
  const container = document.getElementById("results");
  const timings   = document.getElementById("timings");
        timings.textContent = "";

  const err_beg  = '<div class="text-center text-comment">';
  const err_bds  = '<details><summary class="text-ellipsis" style="width: fit-content; margin: 0 auto;">';
  const err_es   = '</summary><p>';
  const err_ed   = '</p></details>';
  const err_end  = '</div>';

  const err_date =
    err_beg + 'Valid dates are: YYYY-MM-DD / YYYY-MM / YYYY / MM-DD / MM' +
    err_end;
  const err_date_base =
    err_beg + 'Range must be equally based: year first or month first' +
    err_end;
  const err_date_range =
    err_beg + 'Min date of range must be before or at max date of range' +
    err_end;
  const err_chars =
    err_beg + 'Allowed characters are: a-z, 0-9, underscore, dash, period, comma, quote, and space' +
    err_end;
  const err_views =
    err_beg +
    err_bds + 'Allowed are non-negative numbers, and words: grow, fall, same, diff. Prefix: ^' +
    err_es  +
    'Prefix ^ switches Downloads fields to Old = Downloads &minus; Month. Old is displayed in the table<br />' +
    'Prefix ^ switches Month fields to 23 = Month &minus; Week. 23 is displayed in the table<br />' +
    'Prefix ^ does nothing to Week fields. Week is always 7 days. Week is displayed in the table' +
    '</p><p>' +
    'Words: grow, fall, same, diff (aliases: / \\ = !) switch min/max logic to prev/curr logic<br />' +
    'Word allows number after it, and percent sign % can be after number' +
    err_ed  +
    err_end;
  const err_views_range =
    err_beg + 'Min views count must be less than or equal to max views count' +
    err_end;
  const err_favs =
    err_beg + 'Allowed are numbers: 0 to 9999, and words: grow, fall, same, diff' +
    err_end;
  const err_favs_range =
    err_beg + 'Min favorites count must be less than or equal to max favorites count' +
    err_end;
  const err_subjects =
    err_beg + 'Subjects XML file cannot be loaded or loading error occurred' +
    err_end;

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

  // Collections, Creators, Subjects, and Title
  const collections_str = document.getElementById("collections").value;
  const creators_str    = document.getElementById("creators"   ).value;
  const subjects_str    = document.getElementById("subjects"   ).value;
  const title_str       = document.getElementById("title"      ).value;

  if (!input_allowed_chars(collections_str) ||
      !input_allowed_chars(creators_str   ) ||
      !input_allowed_chars(subjects_str   ) ||
      !input_allowed_chars(title_str      )) {
    container.innerHTML = err_chars;
    return;
  }

  const collections = input_clean_parse(collections_str);
  const creators    = input_clean_parse(creators_str   );
  const subjects    = input_clean_parse(subjects_str   );
  const title       = input_clean_parse(title_str      );

  // Views
  let dl_min_str = document.getElementById("downloads-min").value.trim().toLowerCase();
  let dl_max_str = document.getElementById("downloads-max").value.trim().toLowerCase();
  let mo_min_str = document.getElementById("month-min"    ).value.trim().toLowerCase();
  let mo_max_str = document.getElementById("month-max"    ).value.trim().toLowerCase();
  let wk_min_str = document.getElementById("week-min"     ).value.trim().toLowerCase();
  let wk_max_str = document.getElementById("week-max"     ).value.trim().toLowerCase();

  let is_dl_old  = false; // Use old instead dl, old = dl without last month
  let is_mo_23   = false; // Use 23 days instead month, 23 days = month withoul last week
  let is_wk_7    = false; // This flag will not be used, week === 7 days

  [is_dl_old, dl_min_str, dl_max_str] = get_views_prefix(dl_min_str, dl_max_str);
  [is_mo_23,  mo_min_str, mo_max_str] = get_views_prefix(mo_min_str, mo_max_str);
  [is_wk_7,   wk_min_str, wk_max_str] = get_views_prefix(wk_min_str, wk_max_str);

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

  if (!input_allowed_views(dl_min_str) || !input_allowed_views(dl_max_str) ||
      !input_allowed_views(mo_min_str) || !input_allowed_views(mo_max_str) ||
      !input_allowed_views(wk_min_str) || !input_allowed_views(wk_max_str)) {
    container.innerHTML = err_views;
    return;
  }

  const dl_min_cnt = parseInt(dl_min_str, 10);
  const dl_max_cnt = parseInt(dl_max_str, 10);

  if (!isNaN(dl_min_cnt) && !isNaN(dl_max_cnt)) {
    if (dl_min_cnt > dl_max_cnt) {
      container.innerHTML = err_views_range;
      return;
    }
  }

  const mo_min_cnt = parseInt(mo_min_str, 10);
  const mo_max_cnt = parseInt(mo_max_str, 10);

  if (!isNaN(mo_min_cnt) && !isNaN(mo_max_cnt)) {
    if (mo_min_cnt > mo_max_cnt) {
      container.innerHTML = err_views_range;
      return;
    }
  }

  const wk_min_cnt = parseInt(wk_min_str, 10);
  const wk_max_cnt = parseInt(wk_max_str, 10);

  if (!isNaN(wk_min_cnt) && !isNaN(wk_max_cnt)) {
    if (wk_min_cnt > wk_max_cnt) {
      container.innerHTML = err_views_range;
      return;
    }
  }

  // Favs
  let favs_min_str = document.getElementById("favs-min").value.trim().toLowerCase();
  let favs_max_str = document.getElementById("favs-max").value.trim().toLowerCase();

  let favs_min_kv  = null;
  let favs_max_kv  = null;

  [favs_min_str, favs_min_kv] = get_key(favs_min_str);
  [favs_max_str, favs_max_kv] = get_key(favs_max_str);

  if (!input_allowed_favs(favs_min_str) || !input_allowed_favs(favs_max_str)) {
    container.innerHTML = err_favs;
    return;
  }

  const favs_min_cnt = parseInt(favs_min_str, 10);
  const favs_max_cnt = parseInt(favs_max_str, 10);

  if (!isNaN(favs_min_cnt) && !isNaN(favs_max_cnt)) {
    if (favs_min_cnt > favs_max_cnt) {
      container.innerHTML = err_favs_range;
      return;
    }
  }

  // Subjects Check
  if (wait_subjects(stat_subjects, subjects)) return; // Wait for stat_subjects to load

  // Checking and Initial Filters, and Calculating Stats
  let results_curr = filter_items(stat_curr_items, stat_curr_date,
    archived_min_range, archived_max_range, created_min_range, created_max_range,
    collections, creators, title);
  let results_prev = filter_items(stat_prev_items, stat_prev_date,
    archived_min_range, archived_max_range, created_min_range, created_max_range,
    collections, creators, title);

  // Views
  const filtered_views = filter_views(results_prev, results_curr,
    dl_min_str, dl_min_kv, dl_max_str, dl_max_kv, is_dl_old,
    mo_min_str, mo_min_kv, mo_max_str, mo_max_kv, is_mo_23,
    wk_min_str, wk_min_kv, wk_max_str, wk_max_kv);
  if (filtered_views.done) {
    results_curr = filtered_views.curr;
    results_prev = filtered_views.prev;
  }

  // Favs
  const filtered_favs = filter_favs(results_prev, results_curr,
    favs_min_str, favs_min_kv, favs_max_str, favs_max_kv);
  if   (filtered_favs.done) {
    results_curr = filtered_favs.curr;
    results_prev = filtered_favs.prev;
  }

  // Subjects
  const filtered_subjects = filter_subjects(results_prev, results_curr, stat_subjects, subjects);
  if   (filtered_subjects.done) {
    results_curr = filtered_subjects.curr;
    results_prev = filtered_subjects.prev;
  }
  else if (filtered_subjects.error) {
    container.innerHTML = err_subjects;
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
  const time_1 = performance.now();

  // Render
  if (!render_results(results_curr, stat_curr_date, results_prev, stat_prev_date)) {
    return;
  }
  const time_2 = performance.now();

  // Timings
  const du_filter = time_1 - time_0;
  const du_render = time_2 - time_1;

  timings.textContent = 'Load '   + du_load  .toFixed(1) + ' ms / ' +
                        'Parse '  + du_parse .toFixed(1) + ' ms / ' +
                        'Filter ' + du_filter.toFixed(1) + ' ms / ' +
                        'Render ' + du_render.toFixed(1) + ' ms';
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
  let   menu_top = rect.top    + window.scrollY - (9 + 32 * d_count);
  if   (menu_top <               window.scrollY)     {
        menu_top = rect.bottom + window.scrollY + 2; }

  const menu_caller = document.activeElement;
  const menu        = document.createElement('div');
  menu.id                    = 'date-change-menu';
  menu.style.position        = 'absolute';
  menu.style.left            = (rect.left + window.scrollX) + 'px';
  menu.style.top             =  menu_top                    + 'px';
  menu.style.backgroundColor = '#fafafa'; // Gray98
  menu.style.color           = '#696969'; // DimGray, L41
  menu.style.border          = '#ebebeb solid 2px'; // Gray92
  menu.style.borderRadius    = '4px';
  menu.style.boxShadow       = '2px 2px 4px rgb(0 0 0 / 0.2)';
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
    opt.style.borderRadius = '4px';
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
//    setTimeout(load_stat, 5, date, what);
      requestIdleCallback(() => load_stat(date, what), { timeout: 5 });
      menu.remove_ex();
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
  if   (cached) return new Promise(resolve => setTimeout(resolve, 5, cached));

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

      const cache_dates = Object.keys      (stat_file_cache);
      if   (cache_dates.length >= 7) delete stat_file_cache[cache_dates[0]];

      stat_file_cache[date] = docs;
      return docs;
//    stat_file_cache[date] = stats;
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






