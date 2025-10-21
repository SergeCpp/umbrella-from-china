/* Global Variables */

const stat_file_dates = [];   // ["YYYY-MM-DD"]

let   stat_curr_date  = null; //  "YYYY-MM-DD"
let   stat_curr_items = [];

let   stat_prev_date  = null; //  "YYYY-MM-DD"
let   stat_prev_items = [];

let   stat_subjects   = null; // null / Map / undefined

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
      const xml_doc = [...xml.querySelectorAll("doc")];

      // Create subjects lookup map for id: subjects
      stat_subjects = new Map();
      for (const doc of xml_doc) {
        const node_i = doc.querySelector('str[name="identifier"]');
        if  (!node_i) continue;
        const identifier = node_i.textContent;

        const node_s = doc.querySelector('arr[name="subject"], str[name="subject"]');
        const subjects = node_s
          ? node_s.tagName.toLowerCase() === "arr"
            ? Array.from(node_s.querySelectorAll("str"), n => n.textContent.toLowerCase())
            : [node_s.textContent.toLowerCase()]
          : [];
        stat_subjects.set(identifier, subjects);
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
    const subjects = subjects_items.get(identifier);
    if  (!subjects) continue;

    const match_result = subjects_terms.some(term =>
      evaluate_term(term, subjects, (e_value, e_term) => e_value.includes(e_term))
    );
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
  const parts_str = date_str.trim().split('-');
  if   (parts_str.some(part => (part === ""))) return null;

  // Now convert to numbers
  const parts = parts_str.map(Number);
  if   (parts.some(isNaN)) return null;

  // And get range from them
  if (parts.length === 1) { // Year
    const year = parts[0];
    return {
      min: new Date(Date.UTC(year, 01-1, 01, 00, 00, 00, 000)), // Year beg day
      max: new Date(Date.UTC(year, 12-1, 31, 23, 59, 59, 999))  // Year end day
    };
  }
  if (parts.length === 2) { // Year-Month
    const [year, month] = parts;
    if (!is_date_valid(year, month, 1)) return null;
    const e_mday = new Date(year, month, 0).getDate();
    return {
      min: new Date(Date.UTC(year, month - 1, 1,      00, 00, 00, 000)), // Month beg day
      max: new Date(Date.UTC(year, month - 1, e_mday, 23, 59, 59, 999))  // Month end day
    };
  }
  if (parts.length === 3) { // Year-Month-Day
    const [year, month, day] = parts;
    if (!is_date_valid(year, month, day)) return null;
    return {
      min: new Date(Date.UTC(year, month - 1, day, 00, 00, 00, 000)), // Day beg
      max: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))  // Day end
    };
  }
  return null; // Invalid format
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

function input_allowed_views(input) {
  return (input === "") || /^\d{1,10}$/.test(input);
}

function input_allowed_favs(input) {
  return (input === "") || (input === "diff") || /^\d{1,4}$/.test(input);
}

function process_filter() {
  const time_0    = performance.now();
  const container = document.getElementById("results");
  const timings   = document.getElementById("timings");
        timings.textContent = "";

  const err_beg  = '<div class="text-center text-comment">';
  const err_end  = '</div>';

  const err_date =
    err_beg + 'Valid dates are: YYYY / YYYY-MM / YYYY-MM-DD' +
    err_end;
  const err_date_range =
    err_beg + 'Min date of range must be before or at max date of range' +
    err_end;
  const err_chars =
    err_beg + 'Allowed characters are: a-z, 0-9, underscore, dash, period, comma, quote, and space' +
    err_end;
  const err_views =
    err_beg + 'Allowed are non-negative numbers only' +
    err_end;
  const err_views_range =
    err_beg + 'Min views count must be less than or equal to max views count' +
    err_end;
  const err_favs =
    err_beg + 'Allowed are numbers: 0 to 9999, ' + "and 'diff'" +
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

  const archived_min = archived_min_range.min;
  const archived_max = archived_max_range.max;

  if (archived_min > archived_max) {
    container.innerHTML = err_date_range;
    return;
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

  const created_min = created_min_range.min;
  const created_max = created_max_range.max;

  if (created_min > created_max) {
    container.innerHTML = err_date_range;
    return;
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
  const downloads_min_str = document.getElementById("downloads-min").value.trim();
  const downloads_max_str = document.getElementById("downloads-max").value.trim();
  const month_min_str     = document.getElementById("month-min"    ).value.trim();
  const month_max_str     = document.getElementById("month-max"    ).value.trim();
  const week_min_str      = document.getElementById("week-min"     ).value.trim();
  const week_max_str      = document.getElementById("week-max"     ).value.trim();

  if (!input_allowed_views(downloads_min_str) || !input_allowed_views(downloads_max_str) ||
      !input_allowed_views(month_min_str    ) || !input_allowed_views(month_max_str    ) ||
      !input_allowed_views(week_min_str     ) || !input_allowed_views(week_max_str     )) {
    container.innerHTML = err_views;
    return;
  }

  const is_downloads_not_cnt = (downloads_min_str === "") || (downloads_max_str === "");
  const is_month_not_cnt     = (month_min_str     === "") || (month_max_str     === "");
  const is_week_not_cnt      = (week_min_str      === "") || (week_max_str      === "");

  if (!is_downloads_not_cnt) {
    const downloads_min_cnt = parseInt(downloads_min_str, 10);
    const downloads_max_cnt = parseInt(downloads_max_str, 10);

    if (downloads_min_cnt > downloads_max_cnt) {
      container.innerHTML = err_views_range;
      return;
    }
  }

  if (!is_month_not_cnt) {
    const month_min_cnt = parseInt(month_min_str, 10);
    const month_max_cnt = parseInt(month_max_str, 10);

    if (month_min_cnt > month_max_cnt) {
      container.innerHTML = err_views_range;
      return;
    }
  }

  if (!is_week_not_cnt) {
    const week_min_cnt = parseInt(week_min_str, 10);
    const week_max_cnt = parseInt(week_max_str, 10);

    if (week_min_cnt > week_max_cnt) {
      container.innerHTML = err_views_range;
      return;
    }
  }

  // Favs
  const favs_min_str = document.getElementById("favs-min").value.trim().toLowerCase();
  const favs_max_str = document.getElementById("favs-max").value.trim().toLowerCase();

  if (!input_allowed_favs(favs_min_str) || !input_allowed_favs(favs_max_str)) {
    container.innerHTML = err_favs;
    return;
  }

  const is_min_diff_exp = (favs_min_str === "diff") || (favs_min_str === "");
  const is_max_diff_exp = (favs_max_str === "diff") || (favs_max_str === "");

  if (!is_min_diff_exp && !is_max_diff_exp) {
    const favs_min_cnt = parseInt(favs_min_str, 10);
    const favs_max_cnt = parseInt(favs_max_str, 10);

    if (favs_min_cnt > favs_max_cnt) {
      container.innerHTML = err_favs_range;
      return;
    }
  }

  // Subjects Check
  if (wait_subjects(stat_subjects, subjects)) return; // Wait for stat_subjects to load

  // Process
  const filtered_curr_items = filter_items(
    stat_curr_items, archived_min, archived_max, created_min, created_max,
    collections, creators, title);
  const filtered_prev_items = filter_items(
    stat_prev_items, archived_min, archived_max, created_min, created_max,
    collections, creators, title);

  const time_1       = performance.now();
  let   results_curr = calculate_stats(filtered_curr_items, stat_curr_date);
  let   results_prev = calculate_stats(filtered_prev_items, stat_prev_date);
  const time_2       = performance.now();

  const filtered_views = filter_views(results_prev, results_curr,
    downloads_min_str, downloads_max_str, month_min_str, month_max_str, week_min_str, week_max_str);
  if (filtered_views.done) {
    results_curr = filtered_views.curr;
    results_prev = filtered_views.prev;
  }

  const filtered_favs = filter_favs(results_prev, results_curr, favs_min_str, favs_max_str);
  if   (filtered_favs.done) {
    results_curr = filtered_favs.curr;
    results_prev = filtered_favs.prev;
  }

  const filtered_subjects = filter_subjects(results_prev, results_curr, stat_subjects, subjects);
  if   (filtered_subjects.done) {
    results_curr = filtered_subjects.curr;
    results_prev = filtered_subjects.prev;
  }
  else if (filtered_subjects.error) {
    container.innerHTML = err_subjects;
    return;
  }
  const time_3 = performance.now();

  if (!render_results(results_curr, stat_curr_date, results_prev, stat_prev_date)) {
    return;
  }
  const time_4 = performance.now();

  // Timings
  const du_filter = (time_1 - time_0) + (time_3 - time_2);
  const du_calc   =  time_2 - time_1;
  const du_render =  time_4 - time_3;

  timings.textContent = 'Load '   + du_load  .toFixed(1) + ' ms / ' +
                        'Parse '  + du_parse .toFixed(1) + ' ms / ' +
                        'Filter ' + du_filter.toFixed(1) + ' ms / ' +
                        'Calc '   + du_calc  .toFixed(1) + ' ms / ' +
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
      menu.remove_ex();
      load_stat(date, what);
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

function load_stat_file(date) {
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
      const time_2 = performance.now();

      du_load  += (time_1 - time_0);
      du_parse += (time_2 - time_1);

      if (xml.querySelector("parsererror")) { throw new Error(date + " &mdash; Invalid XML format"); }
      return [...xml.querySelectorAll("doc")];
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






