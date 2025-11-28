/* Global Variables */

const stat_file_dates   = [];     // ["YYYY-MM-DD"]
const stat_file_cache   = {};     // ["YYYY-MM-DD"] = { data: [], usage: counter }

let   sf_cache_hits     = 0;      // Non-negative integer
let   sf_cache_misses   = 0;      // Non-negative integer

let   stat_prev_date    = null;   // "YYYY-MM-DD"
let   stat_prev_items   = null;   // []

let   stat_curr_date    = null;   // "YYYY-MM-DD"
let   stat_curr_items   = null;   // []

const stat_subjects     = {       // Section
  date      : "2025-10-19",       // Subjects is the constant part of the stat
  file      : "data-subjects",    // Template with # for date
  name_data : "subject",          // Name for arr/str data node
  name_error: "Subjects",         // Name for error messages
  text_error: null,               // Error message
  items     : null,               // null / {} / undefined
  du_load   : 0,
  du_parse  : 0
};

const stat_descriptions = {       // Section
  date      : "2025-11-07",       // Descriptions is the constant part of the stat
  file      : "data-descriptions",
  name_data : "description",
  name_error: "Descriptions",
  text_error: null,
  items     : null,
  du_load   : 0,
  du_parse  : 0
};

let du_load  = 0; // Duration of load
let du_parse = 0; // Duration of parse

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
      section.items = {};
      const data_selector = 'arr[name="' + section.name_data + '"], ' +
                            'str[name="' + section.name_data + '"]';
      for (const doc of docs) {
        const node_id = doc.querySelector('str[name="identifier"]');
        if  (!node_id) continue;

        const identifier = node_id.textContent;
        const data = get_node_arr(doc, data_selector, true);
        section.items[identifier] = data;
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
    const values = section_items[identifier];
    if  (!values) continue;

    const match_result = section_terms.some(term => evaluate_term(term, values));
    identifiers[identifier] = match_result;
  }

  // Use cached results
  const results_prev = items_prev.filter(item => identifiers[item.identifier]);
  const results_curr = items_curr.filter(item => identifiers[item.identifier]);

  return { done: true, prev: results_prev, curr: results_curr };
}

/* Controls */

const input_ids =
  [  'collections',      'creators',    'subjects',       'title', 'description',
   'downloads-min', 'downloads-max',   'month-min',   'month-max',    'week-min', 'week-max',
    'archived-min',  'archived-max', 'created-min', 'created-max',    'favs-min', 'favs-max',
       'prev-only',     'curr-only'];

// Initialization

function init_controls() {
  // Add click and Enter/Space/Arrows to tabs
  const tabs = ['a', 'b', 'c', 'd', 'e'];

  tabs.forEach((tab, index) => {
    const button = document.getElementById('tab-' + tab);
    if   (button) {
      button.onclick = () => tab_switch(tab);
      button.onkeyup = function(event) {
        if ((event.key === 'Enter') || (event.key === ' ')) {
          tab_switch(tab);
        }
      };
      button.onkeydown = function(event) {
        if ((event.key === 'Enter') || (event.key === ' ')) {
          event.preventDefault();
        }
        else if ((event.key === 'ArrowLeft') || (event.key === 'ArrowRight')) {
          event.preventDefault();

          const index_new = (event.key === 'ArrowLeft') // else ArrowRight
                          ? ((index - 1 + tabs.length) % tabs.length)
                          : ((index + 1)               % tabs.length);

          const button_new = document.getElementById('tab-' + tabs[index_new]);
          if   (button_new) {
            button_new.focus();
          }
        }
      };
    }
  });

  // Add Enter key to inputs
  input_ids.forEach(id => {
    const input = document.getElementById(id);
    if   (input) {
      input.onkeyup = function(event) {
        if (event.key === 'Enter') {
          process_filter();
        }
      };
    }
  });

  // Add click to button
  const button = document.getElementById('process-filter');
  if   (button) {
    button.onclick = process_filter;
  }
}

/* Tabbed Input */

let   tab_active       = null;
const tab_input_ids    = input_ids;
const tab_input_values = {}; // [tab] = { values }; [""] = { defaults };
const tab_mode         = {   // [tab] = "" / "Filter", for ['c'] = "OR" / "AND" / "NOT" / "XOR"
  a: "",
  b: "",
  c: "OR",
  d: "",
  e: ""
};

// Initialization

function init_tabs() {
  tab_to_values("" );
  tab_activate ('c');
}

// Data

function tab_to_values(tab) {
  if (!tab_input_values[tab]) tab_input_values[tab] = {};

  tab_input_ids.forEach(id => {
    const input = document.getElementById(id);
    if   (input) {
      const value = id.endsWith('-only')
                  ? input.checked
                  : input.value;

      tab_input_values[tab][id] = value;
    }
  });
}

function tab_to_inputs(tab) {
  if (!tab_input_values[tab]) { tab_to_inputs(""); return; }

  tab_input_ids.forEach(id => {
    const input = document.getElementById(id);
    if   (input) {
      if (id.endsWith('-only'))
        input.checked = tab_input_values[tab][id];
      else
        input.value   = tab_input_values[tab][id];
    }
  });
}

function tab_is_changed(tab) {
  if (!tab_input_values[tab]) return false;

  for (const id in tab_input_values[""]) {
    if (tab_input_values[tab][id] !== tab_input_values[""][id]) return true;
  }

  return false;
}

// Mode

function tab_mark_filters_count() {
  return ['a', 'b', 'd', 'e'].filter(tab => tab_mode[tab] === "Filter").length;
}

function tab_set_text(tab, text) {
  const button = document.getElementById('tab-' + tab);
  if  (!button) return;

  const text_cur = button.textContent;
  if   (text_cur === text) return;

  button.textContent = text;
}

function tab_set_center() {
  let tab_text = "Filter";
  if (tab_mark_filters_count()) tab_text += ' ' + tab_mode['c'];
  tab_set_text('c', tab_text);
}

function tab_toggle(tab) {
  if(tab === 'c') {
    if (!tab_mark_filters_count()) return;

    tab_mode[tab] = (tab_mode[tab] ===  "OR") ? "AND"
                  : (tab_mode[tab] === "AND") ? "NOT"
                  : (tab_mode[tab] === "NOT") ? "XOR"
                  : (tab_mode[tab] === "XOR") ?  "OR"
                  : "OR"; // Mode was unknown
  }
  else {
    tab_mode[tab]  = (tab_mode[tab] !== "Filter") ?        "Filter" :     "";
    const tab_text = (tab_mode[tab] === "Filter") ? "Mark x Filter" : "Mark";
    tab_set_text(tab, tab_text);
  }
  tab_set_center();
}

// Presentation

function tab_activate(tab_to) {
  if (tab_to === tab_active) {
    tab_toggle(tab_to);
    return;
  }

  const button_to = document.getElementById('tab-' + tab_to);
  if   (button_to) {
    button_to.classList.add('active');
  }

  const tab_from   = tab_active;
        tab_active = tab_to;
  if  (!tab_from) return;

  const button_from = document.getElementById('tab-' + tab_from);
  if   (button_from) {
    button_from.classList.remove('active');
  }
}

function tab_mark(tab, changed) {
  const button = document.getElementById('tab-' + tab);
  if   (button) {
    if (changed)
      button.classList.add   ('changed');
    else
      button.classList.remove('changed');
  }
}

// Transition

function tab_update(tab_new) {
  tab_to_values(tab_active);
  tab_mark     (tab_active, tab_is_changed(tab_active));

  if (tab_new !== tab_active) tab_to_inputs(tab_new);
}

function tab_switch(tab) {
  tab_update  (tab);
  tab_activate(tab);
}

// Interface

function tab_get(tab) {
  if (tab === tab_active) tab_update(tab);

  return tab_is_changed(tab)
         ? { changed: true,  values: tab_input_values[tab] }
         : { changed: false, values: tab_input_values["" ] };
}

function tab_filter_inputs() {
  return tab_get('c');
}

function tab_filter_mode() {
  return tab_mode['c'];
}

function tab_marks() {
  return ['a', 'b', 'd', 'e'];
}

function tab_mark_is_filter(tab) {
  return tab_mode[tab] === "Filter";
}

/* Stat Subset */

function get_stat_subset(stat, subset_ids) {
  const stat_subset = [];

  for (let i = 0; i < stat.length; i++) {
    const stat_doc = stat[i];
    const stat_id  = stat_doc.identifier;

    if (subset_ids[stat_id]) {
      stat_subset.push(stat_doc);
    }
  }

  return stat_subset;
}

/* Filtering by Mark Filters */

// Array of marks is not empty
function filter_by_marks(prev, curr, marks) {
  const mode = tab_filter_mode();

  // Deduplicate
  const marked_ids = [];

  for (const mark of marks) {
    const ids = {}; // Collect all identifiers
    for (const item of mark.prev) ids[item.identifier] = true; // Need true for Combine by AND
    for (const item of mark.curr) ids[item.identifier] = true; // Need true for Combine by AND
    marked_ids.push(ids);
  }

  // Combine
  const combined_ids = {};

  switch(mode) {
    case "AND":
      const first = marked_ids[0];
      for (const id in first) {
        let in_all = true;
        for (let i = 1; i < marked_ids.length; i++) {
          if (!marked_ids[i][id]) { // Used true that set above
            in_all = false;
            break;
          }
        }
        if (in_all) combined_ids[id] = true;
      }
      break;

    case "XOR":
      // Count how many times each identifier appears across marked_ids
      const count = {};
      for (const ids of marked_ids) {
        for (const id in ids) {
          count[id] = count[id] ? count[id] + 1 : 1;
        }
      }
      // Include only those that appear in one mark (ids) only
      for (const id in count) {
        if (count[id] === 1) {
          combined_ids[id] = true;
        }
      }
      break;

    case  "OR":
    case "NOT":
      for (const ids of marked_ids) {
        for (const id in ids) combined_ids[id] = true;
      }
      break;
  }

  // Filter
  let results_prev = [];
  let results_curr = [];

  switch(mode) {
    case "AND":
    case "XOR":
    case  "OR":
      results_prev = prev.filter(item => combined_ids[item.identifier]);
      results_curr = curr.filter(item => combined_ids[item.identifier]);
      break;

    case "NOT":
      results_prev = prev.filter(item => !combined_ids[item.identifier]);
      results_curr = curr.filter(item => !combined_ids[item.identifier]);
      break;
  }

  return { prev: results_prev, curr: results_curr };
}

/* Filter */

function process_filter() {
  const time_0    = performance.now();
  const container = document.getElementById("results");
  const timings   = document.getElementById("timings");
        timings.textContent = "";
  try {

  // Filtering
  const  inputs_filter = tab_filter_inputs();
  const results_filter = filter_route(stat_prev_items, stat_prev_date,
                                      stat_curr_items, stat_curr_date,
    stat_subjects, stat_descriptions,
    inputs_filter.values);

  if (results_filter.error) {
    container.innerHTML = results_filter.error;
    return;
  }
  if (results_filter.wait) {
    return;
  }
  if (!results_filter.done) {
    container.innerHTML = error_compose("Unexpected filtering error");
    return;
  }

  let { prev: results_filter_prev, curr: results_filter_curr } = results_filter;

  // Marking
  let marking_base = null;
  let results_mark = null;
  let filters_mark = null;

  for (const tab of tab_marks()) {
    const inputs = tab_get(tab);
    if  (!inputs.changed) continue;

    if (!marking_base) {
      const ids_prev = {};
      const ids_curr = {};

      for (const item of results_filter_prev) ids_prev[item.identifier] = true;
      for (const item of results_filter_curr) ids_curr[item.identifier] = true;

      const base_prev = get_stat_subset(stat_prev_items, ids_prev);
      const base_curr = get_stat_subset(stat_curr_items, ids_curr);

      marking_base = { prev: base_prev, curr: base_curr };
    }

    const marks = filter_route(marking_base.prev, stat_prev_date,
                               marking_base.curr, stat_curr_date,
      stat_subjects, stat_descriptions,
      inputs.values);

    if (marks.error) {
      container.innerHTML = marks.error;
      return;
    }
    if (marks.wait) {
      return;
    }
    if (!marks.done) {
      container.innerHTML = error_compose("Unexpected marking error");
      return;
    }

    if (!results_mark) results_mark = [];
    results_mark.push({ mark: tab, prev: marks.prev, curr: marks.curr });

    if (tab_mark_is_filter(tab)) {
      if (!filters_mark) filters_mark = [];
      filters_mark.push({ prev: marks.prev, curr: marks.curr });
    }
  }

  // Filtering by Mark Filters
  if (filters_mark) {
    const by_marks = filter_by_marks(results_filter_prev, results_filter_curr, filters_mark);
    results_filter_prev = by_marks.prev;
    results_filter_curr = by_marks.curr;
  }

  // Filtering and Marking Duration
  const du_filter = performance.now() - time_0;

  // Render
  const du_render = render_results(results_filter_prev, stat_prev_date,
                                   results_filter_curr, stat_curr_date, results_mark);
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
    container.innerHTML = error_compose("Error: " + err.message);
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
      container.innerHTML = error_compose("Error: " + err.message);
      throw err;
    });
}

/* Main */

function get_node_arr(doc, name, is_selector = false) {
  const node = doc.querySelector(is_selector ? name :
                                 ('arr[name="' + name + '"], ' +
                                  'str[name="' + name + '"]'));
  if  (!node) return [];
  if   (node.tagName === "arr")
    return Array.from(node.querySelectorAll("str"), n => n.textContent.toLowerCase());

  return [node.textContent.toLowerCase()];
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

    const collection_arr = get_node_arr(doc, "collection");
    const    creator_arr = get_node_arr(doc, "creator"   );
    const      title_arr = title ? [title.toLowerCase()] : []; // Lowercased as array for filtering

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
      const stats  = conv_stat_docs(docs);
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

      stat_file_cache[date] = { data: stats, usage: 1 };
      return stats;
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
      document.getElementById("results").innerHTML = error_compose("Error: " + err.message);
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
    container.innerHTML = error_compose("Error: " + err.message);
  });
}

// EOF






