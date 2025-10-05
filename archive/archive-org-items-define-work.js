/* Global Variables */

const stat_file_dates = [];   // ["YYYY-MM-DD"]

let   stat_curr_date  = null; //  "YYYY-MM-DD"
let   stat_curr_items = [];

let   stat_prev_date  = null; //  "YYYY-MM-DD"
let   stat_prev_items = [];

let   du_load         = 0;    // Duration of load
let   du_parse        = 0;    // Duration of parse

/* Items */

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
  if (!terms)              return true; // No    filter = match all
  if  (terms.length === 0) return true; // Empty filter = match all

  // Get all values for this field (handles both <arr> and <str>)
  const node = doc.querySelector('arr[name="' + field + '"], str[name="' + field + '"]');
  let values = [];

  if (node) {
    if (node.tagName.toLowerCase() === "arr") {
      values = Array.from(node.querySelectorAll("str")).map(n => n.textContent);
    } else {
      values = [node.textContent];
    }
  }

  // Check if any term matches
  return terms.some(term => {
    return evaluate_term(term, values, matcher);
  });
}

function filter_items(items, archived_min, archived_max, created_min, created_max, collections, creators) {
  const filtered_items = items.filter(doc => {
    const identifier_node = doc.querySelector("str[name='identifier']");
    const title_node      = doc.querySelector("str[name='title']"     );
    const item_size_node  = doc.querySelector("str[name='item_size']" );
    const mediatype_node  = doc.querySelector("str[name='mediatype']" );
    const date_node       = doc.querySelector("str[name='date']"      );
    const publicdate_node = doc.querySelector("str[name='publicdate']");
    const downloads_node  = doc.querySelector("str[name='downloads']" );
    const month_node      = doc.querySelector("str[name='month']"     );
    const week_node       = doc.querySelector("str[name='week']"      );

    if (!identifier_node || !title_node || !item_size_node || !mediatype_node ||
        !publicdate_node ||
        !downloads_node  || !month_node || !week_node) {
      return false;
    }

    // Mediatype
    const mediatype = mediatype_node.textContent;
    if ((mediatype !== "movies") && (mediatype !== "audio")) return false;

    // Created
    let date = null;

    if (date_node) {
      date = new Date(date_node.textContent);
      if (isNaN(date.getTime())) return false;
    } else { // No date set for item
      if (mediatype === "audio") { // Set default date to audio item
        date = new Date("2012-01-01T00:00:00Z"); // UTC date, earliest for entire stat
      } else {
        return false;
      }
    }

    if ((date < created_min) || (date > created_max)) return false;

    // Archived
    const publicdate = new Date(publicdate_node.textContent);
    if (isNaN(publicdate.getTime())) return false;
    if ((publicdate < archived_min) || (publicdate > archived_max)) return false;

    // Views
    const downloads = parseInt(downloads_node.textContent, 10);
    const month     = parseInt(month_node    .textContent, 10);
    const week      = parseInt(week_node     .textContent, 10);

    if (isNaN(downloads) || isNaN(month) || isNaN(week)) return false;
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

    // Item passed filter
    return true;
  });
  return filtered_items;
}

function calculate_stats(filtered_items, stats_date) {
  const results = filtered_items.map(doc => {
    const identifier =          doc.querySelector("str[name='identifier']").textContent;
    const title      =          doc.querySelector("str[name='title']"     ).textContent;
    const item_size  = parseInt(doc.querySelector("str[name='item_size']" ).textContent, 10);
    const mediatype  =          doc.querySelector("str[name='mediatype']" ).textContent;
    const publicdate = new Date(doc.querySelector("str[name='publicdate']").textContent);
    const downloads  = parseInt(doc.querySelector("str[name='downloads']" ).textContent, 10);
    const month      = parseInt(doc.querySelector("str[name='month']"     ).textContent, 10);
    const week       = parseInt(doc.querySelector("str[name='week']"      ).textContent, 10);

    const calc_date  = new Date(stats_date + "T11:59:59.999Z"); // To count a day for published on day before

    const days_all   = Math.round((calc_date - publicdate) / (24 * 60 * 60 * 1000));
    const views_all  = downloads;
    const ratio_all  = parseFloat((views_all / days_all).toFixed(3));

    const days_old   = days_all - 30; // Always valid
    const views_old  = views_all - month;
    const ratio_old  = parseFloat((views_old / days_old).toFixed(3));

    // Get collections and count favorites
    const collection_node = doc.querySelector("arr[name='collection']");
    let   favorites       = 0;
    
    if (collection_node) {
      if (collection_node.tagName.toLowerCase() === "arr") {
        // Handle array of collections
        const collections = Array.from(collection_node.querySelectorAll("str")).map(n => n.textContent);
        favorites = collections.filter(c => c.toLowerCase().startsWith("fav-")).length;
      } else {
        // Handle single collection
        const collection = collection_node.textContent;
        favorites = collection.toLowerCase().startsWith("fav-") ? 1 : 0;
      }
    }

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
      views_23  :              month - week,
      ratio_23  : parseFloat(((month - week) / 23).toFixed(3)),
      views_7   :                      week,
      ratio_7   : parseFloat(         (week  /  7).toFixed(3)),
      favorites
    };
  });
  return results;
}

/* Controls */

function init_controls() {
  // 1. Add Enter key to all date inputs
  ["collections",  "creators",
   "archived-min", "archived-max", "created-min", "created-max", "favs-min", "favs-max"]
  .forEach(id => {
    const input = document.getElementById(id);
    if   (input) {
      input.onkeyup = function(event) {
        if (event.key === "Enter") {
          process_filter();
        }
      };
    }
  });

  // 2. Add click to button
  const button = document.getElementById("process-filter");
  if   (button) {
    button.onclick = process_filter;
  }
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

  // And process them
  if (parts.length === 1) { // Year
    const year = parts[0];
    return {
      min: new Date(Date.UTC(year, 01-1, 01, 00, 00, 00, 000)), // Year beg day
      max: new Date(Date.UTC(year, 12-1, 31, 23, 59, 59, 999))  // Year end day
    }
  }
  if (parts.length === 2) { // Year-Month
    const [year, month] = parts;
    if (!is_date_valid(year, month, 1)) return null;
    const e_mday = new Date(year, month, 0).getDate();
    return {
      min: new Date(Date.UTC(year, month - 1, 1,      00, 00, 00, 000)), // Month beg day
      max: new Date(Date.UTC(year, month - 1, e_mday, 23, 59, 59, 999))  // Month end day
    }
  }
  if (parts.length === 3) { // Year-Month-Day
    const [year, month, day] = parts;
    if (!is_date_valid(year, month, day)) return null;
    return {
      min: new Date(Date.UTC(year, month - 1, day, 00, 00, 00, 000)), // Day beg
      max: new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))  // Day end
    }
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
      type: "TEXT",
      text: term.replace(/['"]/g, "") // Quote allows leading/trailing space, also ' ' possible for term
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

function input_allowed_favs(input) {
  return !/[^0-9]/.test(input);
}

function process_filter() {
  const time_0    = performance.now();
  const container = document.getElementById("results");
  const timings   = document.getElementById("timings");
        timings.textContent = "";

  const err_beg   = '<div class="text-center text-comment">';
  const err_end   = '</div>';

  const err_date =
    err_beg + 'Valid dates are: YYYY / YYYY-MM / YYYY-MM-DD' +
    err_end;
  const err_date_range =
    err_beg + 'Start date must be before end date' +
    err_end;
  const err_chars =
    err_beg + 'Allowed characters are: a-z, 0-9, underscore, dash, period, comma, quote, and space' +
    err_end;
  const err_favs =
    err_beg + 'Allowed are digits only: 0-9' +
    err_end;
  const err_favs_range =
    err_beg + 'Min favorites count must be less than or equal to max favorites count' +
    err_end;

  // Archived range
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

  // Created range
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

  // Collections and Creators
  const collections_str = document.getElementById("collections").value;
  const creators_str    = document.getElementById("creators"   ).value;

  if (!input_allowed_chars(collections_str) || !input_allowed_chars(creators_str)) {
    container.innerHTML = err_chars;
    return;
  }

  const collections = input_clean_parse(collections_str);
  const creators    = input_clean_parse(creators_str   );

  // Favs
  const favs_min_str = document.getElementById("favs-min").value.trim();
  const favs_max_str = document.getElementById("favs-max").value.trim();

  if (!input_allowed_favs(favs_min_str) || !input_allowed_favs(favs_max_str)) {
    container.innerHTML = err_favs;
    return;
  }

  if (favs_min_str && favs_max_str) {
    const favs_min = parseInt(favs_min_str, 10);
    const favs_max = parseInt(favs_max_str, 10);

    if (favs_min > favs_max) {
      container.innerHTML = err_favs_range;
      return;
    }
  }

  // Process
  const filtered_curr_items = filter_items(
    stat_curr_items, archived_min, archived_max, created_min, created_max, collections, creators);
  const filtered_prev_items = filter_items(
    stat_prev_items, archived_min, archived_max, created_min, created_max, collections, creators);

  const time_1       = performance.now();
  const results_curr = calculate_stats(filtered_curr_items, stat_curr_date);
  const results_prev = calculate_stats(filtered_prev_items, stat_prev_date);
  const time_2       = performance.now();

  if (!render_results(
    results_curr, stat_curr_date, results_prev, stat_prev_date, favs_min_str, favs_max_str)) {
    return;
  }

  // Timings
  const time_3        = performance.now();
  timings.textContent = 'Load '   + du_load          .toFixed(1) + ' ms / ' +
                        'Parse '  + du_parse         .toFixed(1) + ' ms / ' +
                        'Filter ' + (time_1 - time_0).toFixed(1) + ' ms / ' +
                        'Calc '   + (time_2 - time_1).toFixed(1) + ' ms / ' +
                        'Render ' + (time_3 - time_2).toFixed(1) + ' ms';
}

/* Date Change */

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
  }

  menu.outside_click = (e) => {
    if (!menu.contains(e.target)) { menu.remove_ex(); }
  }

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
      reload_stat(date, what);
    };
    menu.appendChild(date_opt);
  }

  document.body.appendChild(menu);
  menu.children[i_date - i_beg].focus();
}

/* Dates */

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
      document.getElementById("results").innerHTML =
        '<div class="text-center text-comment">Error: ' + err.message + '</div>';
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

function reload_stat(date, what) {
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

function process_stats() {
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






