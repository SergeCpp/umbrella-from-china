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
  // Add Enter to inputs
  input_ids.forEach(id => {
    const input = document.getElementById(id);
    if  (!input) return;

    input.oninput = () => tab_input_changed(input);

    input.onkeyup = (event) => {
      if (event.key === 'Enter') {
        process_filter();
      }
    };
  });

  // Add click and Enter/Space to button
  const button = document.getElementById('process-filter');
  if   (button) {
    button.onclick = process_filter;

    button.onkeyup = (event) => {
      const key = event.key;
      if ((key === 'Enter') || (key === ' ')) {
        process_filter();
      }
    };

    button.onkeydown = (event) => {
      const key = event.key;
      if ((key === 'Enter') || (key === ' ')) {
        event.preventDefault();
      }
    };
  }
}

/* Tabbed Input */

const tab_names        = ['a', 'b', 'c', 'd', 'e'];
let   tab_active       = null;

const tab_input_ids    = input_ids;
const tab_input_values = {}; // [tab] = { values }; [""] = { defaults };

const tab_filter_modes = ["OR", "AND", "NONE", "ONE", "TWO", "THREE", "FOUR"];
const tab_mode         = {   // [tab] = "" / "Filter"; ['c'] see tab_filter_modes
  a: "",
  b: "",
  c: "OR",
  d: "",
  e: ""
};

const tab_change_marked       = {}; // [tab] = true / false
const tab_input_change_marked = {}; // [id]  = tab  / false

// Initialization

function init_tabs() {
  tab_input_values[""] = {};
  tab_to_values   ("");

  for (const tab of tab_names) {
    tab_input_values[tab] = {};

    for (const id in tab_input_values[""]) {
      tab_input_values[tab][id] = tab_input_values[""][id];
    }

    tab_change_marked[tab] = false;
  }

  for (const id in tab_input_values[""]) {
    tab_input_change_marked[id] = false;
  }

  tab_activate('c');

  // Add click and Enter/Space/Arrows to tabs
  tab_names.forEach((tab, index) => {
    const button = document.getElementById('tab-' + tab);
    if  (!button) return;

    button.onclick = (event) => tab_click(tab, event.shiftKey, event.ctrlKey);

    button.onkeyup = (event) => {
      const key = event.key;
      if ((key === 'Enter') || (key === ' ')) {
        tab_click(tab, event.shiftKey, event.ctrlKey);
      }
    };

    button.onkeydown = (event) => {
      const key = event.key;
      if ((key === 'Enter') || (key === ' ')) {
        event.preventDefault();
        return;
      }

      if ((key !== 'ArrowLeft') && (key !== 'ArrowRight')) return;
      event.preventDefault();

      const all  = tab_names.length;
      const next = (key === 'ArrowLeft') // else ArrowRight
                 ? ((index - 1 + all) % all)
                 : ((index + 1)       % all);

      const button_next = document.getElementById('tab-' + tab_names[next]);
      if   (button_next) {
        button_next.focus();
      }
    };
  });
}

// Data

function tab_to_values(tab) {
  tab_input_ids.forEach(id => {
    const input = document.getElementById(id);
    if  (!input) return;

    const value = id.endsWith('-only') ? input.checked : input.value;

    tab_input_values[tab][id] = value;
  });
}

function tab_to_inputs(tab) {
  tab_input_ids.forEach(id => {
    const input = document.getElementById(id);
    if  (!input) return;

    if (id.endsWith('-only'))
      input.checked = tab_input_values[tab][id];
    else
      input.value   = tab_input_values[tab][id];
  });
}

function tab_is_changed(tab) {
  for (const id in tab_input_values[""]) {
    if (tab_input_values[tab][id] !== tab_input_values[""][id]) return true;
  }

  return false;
}

// Changed Inputs Marking

function tab_input_changed(input) {
  const id      = input.id;
  const value   = id.endsWith('-only') ? input.checked : input.value;
  const changed = value !== tab_input_values[""][id];

  tab_input_mark(tab_active, input, id, changed);

  if (changed)
    tab_mark  (tab_active, true);
  else
    tab_update(tab_active); // Need to check whole tab
}

function tab_input_mark(tab, input, id, changed) {
  const marked = tab_input_change_marked[id];

  if (changed) {
    if (marked === tab) return;

    if (marked) { // Other tab. Normally never goes here
      input.classList.remove('tab-' + marked);
      input.classList.add   ('tab-' + tab);
      tab_input_change_marked[id]   = tab;
      return;
    }
  } else { // Not changed
    if (!marked) return;
  }

  if (changed)
    input.classList.add   ('changed', 'tab-' + tab);
  else
    input.classList.remove('changed', 'tab-' + tab);

  tab_input_change_marked[id] = changed ? tab : false;
}

// What to do with changed inputs: mark / unmark
function tab_inputs_mark(tab, mark) {
  for (const id in tab_input_values[""]) {
    if (tab_input_values[tab][id] === tab_input_values[""][id]) continue;

    const input = document.getElementById(id);
    if   (input) {
      tab_input_mark(tab, input, id, mark);
    }
  }
}

function tab_inputs_lo(tab) {
  tab_inputs_mark(tab, false);
}

function tab_inputs_hi(tab) {
  tab_inputs_mark(tab, true);
}

// Mode

function tab_mark_filters_count() {
  return tab_marks().filter(tab => tab_mark_is_filter(tab)).length;
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

function tab_toggle(tab, shift) {
  if(tab === 'c') {
    if (!tab_mark_filters_count()) return;

    const all  = tab_filter_modes.length;
    const curr = tab_filter_modes.indexOf(tab_mode[tab]);
    const next = shift
               ? ((curr - 1 + all) % all)
               : ((curr + 1)       % all);

    tab_mode[tab]  =  tab_filter_modes[next];
  } else {
    tab_mode[tab]  = (tab_mode[tab] !== "Filter") ?        "Filter" :     "";
    const tab_text = (tab_mode[tab] === "Filter") ? "Mark x Filter" : "Mark";
    tab_set_text(tab, tab_text);
  }
  tab_set_center();
}

// Presentation

function tab_activate(tab_to, shift = false) {
  if (tab_to === tab_active) {
    tab_toggle(tab_to, shift);
    return;
  }

  const tab_from = tab_active;
  if   (tab_from) {
    const button_from = document.getElementById('tab-' + tab_from);
    if   (button_from) {
      button_from.classList.remove('active');
    }
  }

  const button_to = document.getElementById('tab-' + tab_to);
  if   (button_to) {
    button_to.classList.add('active');
  }

  tab_active = tab_to;

  if (shift) tab_toggle(tab_to, shift);
}

function tab_mark(tab, changed) {
  if (tab_change_marked[tab] === changed) return;

  const button = document.getElementById('tab-' + tab);
  if  (!button) return;

  if (changed)
    button.classList.add   ('changed');
  else
    button.classList.remove('changed');

  tab_change_marked[tab] = changed;
}

// Transition

function tab_update(tab_new) {
  tab_to_values(tab_active);
  tab_mark     (tab_active, tab_is_changed(tab_active));

  if (tab_new !== tab_active) {
    tab_inputs_lo(tab_active);
    tab_to_inputs(tab_new);
    tab_inputs_hi(tab_new);
  }
}

function tab_switch(tab, shift) {
  tab_update  (tab);
  tab_activate(tab, shift);
}

// Click Handler

function tab_click(tab, shift, ctrl) {
  if (ctrl)
    tab_toggle(tab, shift);
  else
    tab_switch(tab, shift);
}

// Interface

function tab_get(tab) {
  if (tab === tab_active) tab_update(tab);

  return { changed: tab_is_changed(tab), values: tab_input_values[tab] };
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
function filter_by_marks_side(items, marks, mode) {
  const combined_ids = {};

  switch (mode) {
    case "AND": {
      const mark_cnt = marks.length; // 1..
      const mark_ids = [null];
      for (let i = 1; i < mark_cnt; i++) {
        const mark = marks[i];
        const ids = {};
        for (const item of mark) ids[item.identifier] = true;
        mark_ids.push(ids);
      }

      for (const item of marks[0]) {
        const id = item.identifier;
        let in_all = true;
        for (let i = 1; i < mark_cnt; i++) {
          if (!mark_ids[i][id]) {
            in_all = false;
            break;
          }
        }
        if (in_all) combined_ids[id] = true;
      }
      break;
    }
    case "OR"  :
    case "NONE":
      for (const mark of marks) {
        for (const item of mark) combined_ids[item.identifier] = true;
      }
      break;
  }

  switch (mode) {
    case "AND":
    case "OR" :
      return items.filter(item => combined_ids[item.identifier]);

    case "NONE":
      return items.filter(item => !combined_ids[item.identifier]);
  }

  return []; // Unknown mode
}

// Array of marks is not empty
function filter_by_marks(prev, curr, marks, mode) {
  switch (mode) {
    case "OR"  :
    case "AND" :
    case "NONE": {
      const results_prev = filter_by_marks_side(prev, marks.map(mark => mark.prev), mode);
      const results_curr = filter_by_marks_side(curr, marks.map(mark => mark.curr), mode);

      return { prev: results_prev, curr: results_curr };
    }
  }

  const mark_cnt = marks.length; // 1..
  const mode_cnt = { "ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4 }[mode];
  if  (!mode_cnt || (mode_cnt > mark_cnt)) return { prev: [], curr: [] }; // Unknown mode or insufficient marks

  // Map of marks each identifier marked by (in both prev/curr sides)
  const mark_both_arr = {};
  for (let i = 0; i < mark_cnt; i++) {
    for (const item of marks[i].prev) {
      const id = item.identifier;
      if (!mark_both_arr[id]) mark_both_arr[id] = [];
      mark_both_arr[id].push(i);
    }

    for (const item of marks[i].curr) {
      const id = item.identifier;
      if (mark_both_arr[id] && mark_both_arr[id].includes(i)) continue; // Avoid duplication of mark
      if (!mark_both_arr[id]) mark_both_arr[id] = [];
      mark_both_arr[id].push(i);
    }
  }

  // Maps of mark counts for each identifier marked (in prev/curr sides separately)
  const group_prev_ids = {};
  const group_curr_ids = {};

  for (const mark of marks) {
    for (const item of mark.prev) group_prev_ids[item.identifier] = (group_prev_ids[item.identifier] || 0) + 1;
    for (const item of mark.curr) group_curr_ids[item.identifier] = (group_curr_ids[item.identifier] || 0) + 1;
  }

  // Side filtering
  let results_prev = prev.filter(item => group_prev_ids[item.identifier] === mode_cnt);
  let results_curr = curr.filter(item => group_curr_ids[item.identifier] === mode_cnt);

  // Remove overmarked items that passed filter (differently marked cells of prev/curr sides)
  // If prev: a and curr: b then both: a, b (overmark for ONE)
  if (mark_cnt > mode_cnt) { // The only case overmarking can occur
    const passed_prev = {};
    for (const item of results_prev) passed_prev[item.identifier] = true;

    let overmarked = null;
    for (const item of results_curr) {
      const id = item.identifier;
      if (!passed_prev[id]) continue;
      if (!mark_both_arr[id]) continue;

      if (mark_both_arr[id].length > mode_cnt) {
        if (!overmarked) overmarked = {};
        overmarked[id] = true;
      }
    }

    if (overmarked) {
      results_prev = results_prev.filter(item => !overmarked[item.identifier]);
      results_curr = results_curr.filter(item => !overmarked[item.identifier]);
    }
  }

  // Add undermarked items that not passed filter (differently marked cells of prev/curr sides)
  // If prev: a and curr: b then both: a, b (undermark for TWO)
  const side_prev = {};
  for (const item of prev) {
    const id = item.identifier;
    if (!mark_both_arr[id] || !group_prev_ids[id]) continue;
    if ((mark_both_arr[id].length === mode_cnt) && (group_prev_ids[id] < mode_cnt)) {
      side_prev[id] = item;
    }
  }

  for (const item of curr) {
    const id = item.identifier;
    if (!side_prev[id]) continue;
    if (group_curr_ids[id] === group_prev_ids[id]) { // The only case of undermarking
      results_prev.push(side_prev[id]);
      results_curr.push(item);
    }
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
    const filtered_by_marks = filter_by_marks(results_filter_prev, results_filter_curr,
      filters_mark, tab_filter_mode());
    results_filter_prev = filtered_by_marks.prev;
    results_filter_curr = filtered_by_marks.curr;
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

  const menu_caller   = document.activeElement;
  const menu          = document.createElement('div');
  menu.className      = 'menu';
  menu.id             = 'date-change-menu';
  menu.setAttribute    ('role', 'menu');
  menu.style.position = 'absolute';
  menu.style.left     = (rect.left + window.scrollX - 2) + 'px';
  menu.style.top      =  menu_top                        + 'px';

  menu.remove_ex = () => {
    document.removeEventListener('click', menu.outside_click);
    menu.remove();
    if (menu_caller && document.body.contains(menu_caller)) { menu_caller.focus(); }
  };

  menu.outside_click = (event) => {
    if (!menu.contains(event.target)) { menu.remove_ex(); }
  };

  // Defer adding until all currently pending event handlers (menu creation click) have finished
  setTimeout(() => {
    if (menu && document.body.contains(menu)) { document.addEventListener('click', menu.outside_click); }
  }, 0);

  menu.onkeydown = (event) => {
    if (event.key === 'Escape') { menu.remove_ex(); }
  };

  const init_opt = (opt, date) => {
    opt.className    = 'menu-opt';
    opt.setAttribute  ('role', 'menuitem');
    opt.tabIndex     = 0;
    opt.textContent  = date;

    opt.onclick = () => {
      menu.remove_ex();
      requestAnimationFrame(() => setTimeout(load_stat, 0, date, what));
    };

    opt.onkeyup = (event) => {
      const key = event.key;
      if ((key === 'Enter') || (key === ' ')) {
        opt.click();
      }
    };

    opt.onkeydown = (event) => {
      const key = event.key;
      if ((key === 'Enter') || (key === ' ')) {
        event.preventDefault();
        return;
      }

      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab'].includes(key)) return;
      event.preventDefault();

      const menu = event.currentTarget.parentElement;
      const opts = Array.from(menu.children);
      const all  = opts.length;
      const curr = opts.indexOf(event.currentTarget);
      let   next;

      if ((key === 'ArrowUp') || (key === 'ArrowLeft') || ((key === 'Tab') && event.shiftKey)) {
        next = (curr - 1 + all) % all;
      } else { // ArrowDown or ArrowRight or Tab
        next = (curr + 1)       % all;
      }
      opts[next].focus();
    };
  };

  for (let i = i_beg; i <= i_end; i++) {
    const date = stat_file_dates[i];
    const opt  = document.createElement('div');
    init_opt(opt, date);
    menu.appendChild(opt);
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
      if (!response.ok) throw new Error("Dates file not found");
      return response.text();
    })
    .then(text => {
      const date_lines     = text.trim().split('\n');
      const date_lines_cnt = date_lines.length;
      if  ((date_lines_cnt === 1) && (date_lines[0] === "")) throw new Error("Dates file is empty");

      const date_regex = /^[0-9]{4}\-[0-9]{2}\-[0-9]{2}$/;

      for (let line_num = 0; line_num < date_lines_cnt; line_num++) {
        const date = date_lines[line_num].trim();
        if  (!date) break; // Stop dates file processing
        if  (!date_regex.test(date)) continue; // Skip no-date line

        stat_file_dates.push(date);
      }

      const dates_cnt = stat_file_dates.length;
      if  (!dates_cnt) throw new Error("Dates file &mdash; No correct dates found");

      if   (dates_cnt === 1) { // Prev === Curr is allowed
        stat_prev_date = stat_file_dates[0];
        stat_curr_date = stat_file_dates[0];
      }
      else {
        stat_file_dates.sort();

        stat_prev_date = stat_file_dates[dates_cnt - 2];
        stat_curr_date = stat_file_dates[dates_cnt - 1];
      }
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
    sf_cache_hits++;
    cached.usage++;
    return Promise.resolve(cached.data);
  }
  sf_cache_misses++;

  const time_0    = performance.now();
  const container = document.getElementById("results");
  const xml_tmplt = container.getAttribute("data-stats");
  const xml_regex = /#/;
  const xml_url   = xml_tmplt.replace(xml_regex, date);

  return fetch(xml_url)
    .then(response => {
      if (!response.ok) throw new Error(date + " &mdash; XML file not found");
      return response.text();
    })
    .then(text => {
      const time_1 = performance.now();
      const parser = new DOMParser();
      const xml    = parser.parseFromString(text, "text/xml");

      if (xml.querySelector("parsererror")) throw new Error(date + " &mdash; Invalid XML format");
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

  if (stat_prev_date === stat_curr_date) {
    load_stat_file(stat_prev_date)
      .then(loaded_items => {
        stat_prev_items = loaded_items;
        stat_curr_items = loaded_items;

        process_filter();
      })
      .catch(err => {
        container.innerHTML = error_compose("Error: " + err.message);
      });
  } else { // Different dates to load
    Promise.all([
      load_stat_file(stat_prev_date),
      load_stat_file(stat_curr_date)
    ])
    .then(([loaded_prev_items, loaded_curr_items]) => {
      stat_prev_items = loaded_prev_items;
      stat_curr_items = loaded_curr_items;

      process_filter();
    })
    .catch(err => {
      container.innerHTML = error_compose("Error: " + err.message);
    });
  }
}

// EOF






