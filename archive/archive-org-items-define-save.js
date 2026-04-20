/* Controls */

const input_ids =
  [  'collections',      'creators',    'subjects',       'title', 'description',
   'downloads-min', 'downloads-max',   'month-min',   'month-max',    'week-min', 'week-max',
    'archived-min',  'archived-max', 'created-min', 'created-max',    'favs-min', 'favs-max',
       'only-prev',     'only-curr'];

// Initialization

function init_controls() {
  // Add Enter to inputs
  input_ids.forEach(id => {
    const input = document.getElementById(id);
    if  (!input) return;

    input.oninput = () => tab_input_changed(input);

    input.onkeyup = (event) => {
      const key = event.key;
      if (key === 'Enter') {
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
        button.click();
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

const tab_filter_modes = ["OR", "AND", "DIFF", "MULTI", "NONE", "ONE", "TWO", "THREE", "FOUR"];
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
        tab_click(tab, event.shiftKey, event.ctrlKey); // button.click() not passes *Key modifiers
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
      const next = ((key === 'ArrowLeft' ) && event.ctrlKey) ?           0 :
                   ((key === 'ArrowRight') && event.ctrlKey) ?   all   - 1 :
                    (key === 'ArrowLeft' )                   ? ((index - 1 + all) % all)
                                                             : ((index + 1)       % all); // ArrowRight

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

    const value = input.type === 'checkbox' ? input.checked : input.value;

    tab_input_values[tab][id] = value;
  });
}

function tab_to_inputs(tab) {
  tab_input_ids.forEach(id => {
    const input = document.getElementById(id);
    if  (!input) return;

    if (input.type === 'checkbox')
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
  const value   = input.type === 'checkbox' ? input.checked : input.value;
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

    case "DIFF" :
    case "MULTI":
      if (marks.length === 1) return [];

      for (const mark of marks) {
        for (const item of mark) combined_ids[item.identifier] = (combined_ids[item.identifier] || 0) + 1;
      }
      break;
  }

  switch (mode) {
    case "AND":
    case "OR" :
      return items.filter(item =>  combined_ids[item.identifier]);

    case "NONE":
      return items.filter(item => !combined_ids[item.identifier]);

    case "DIFF":
      return items.filter(item =>  combined_ids[item.identifier] &&
                                  (combined_ids[item.identifier] < marks.length));

    case "MULTI":
      return items.filter(item =>  combined_ids[item.identifier] &&
                                  (combined_ids[item.identifier] > 1));
  }

  return []; // Unknown mode
}

// Array of marks is not empty
function filter_by_marks(prev, curr, marks, mode) {
  switch (mode) {
    case "OR"   :
    case "AND"  :
    case "DIFF" :
    case "MULTI":
    case "NONE" : {
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

  // Correction for overmarked and undermarked items performed solely because of whole-item-based marking
  // Whereas filtering is side-based (cell-based)
  // See details of item marking in render_results

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
    if (group_curr_ids[id] === group_prev_ids[id]) { // The only case of undermarking (to match overmarking)
      results_prev.push(side_prev[id]);
      results_curr.push(item);
    }
  }

  return { prev: results_prev, curr: results_curr };
}

/* Filter */

let      process_du_filter = 0; // ms

function time_filter() {
  return process_du_filter;
}

function process_filter() {
  try {

  const time_0          = performance.now();

  const main_prev_date  =  date_main("prev");
  const main_prev_items = items_main("prev");

  const main_curr_date  =  date_main("curr");
  const main_curr_items = items_main("curr");

  // Filtering
  const  inputs_filter = tab_filter_inputs();
  const results_filter = filter_route(main_prev_items, main_prev_date,
                                      main_curr_items, main_curr_date,
    get_section("subjects"), get_section("descriptions"),
    inputs_filter.values);

  if (results_filter.error) {
    process_error(results_filter.error);
    return;
  }
  if (results_filter.wait) {
    return;
  }
  if (!results_filter.done) {
    process_error(error_compose("Unexpected filtering error"));
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

      const base_prev = get_stat_subset(main_prev_items, ids_prev);
      const base_curr = get_stat_subset(main_curr_items, ids_curr);

      marking_base = { prev: base_prev, curr: base_curr };
    }

    const marks = filter_route(marking_base.prev, main_prev_date,
                               marking_base.curr, main_curr_date,
      get_section("subjects"), get_section("descriptions"),
      inputs.values);

    if (marks.error) {
      process_error(marks.error);
      return;
    }
    if (marks.wait) {
      return;
    }
    if (!marks.done) {
      process_error(error_compose("Unexpected marking error"));
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
  process_du_filter = performance.now() - time_0;

  // Render
  setTimeout(render_results, 0,
    results_filter_prev, main_prev_date,
    results_filter_curr, main_curr_date, results_mark);

  } catch (err) {
    process_error(error_compose("Error: " + err.message));
  }
}

function process_timings() {
  const tdr_id = "time-defer-render";
  const tdr    =  time_defer_render();
  if   (tdr) {
    const tdr_span = document.getElementById(tdr_id);
    if   (tdr_span)
          tdr_span.textContent = tdr.duration.toFixed(1) + " (" + tdr.chunks + ')';

    return;
  }

  const   timings   = document.getElementById("timings");
  const   du_render = time_render();

  timings.innerHTML =
    //
    format_nowrap('Cache: '  +
       cache_main('size'  )                             +   ' / ' +
       cache_main('hits'  )                             +   ' / ' +
       cache_main('misses')                             +    ',') + '&ensp;' +
    //
    format_nowrap('Load: '   +
        time_main('load'  )                 .toFixed(1) +   ' / ' +
     time_section('subjects',     'load' )  .toFixed(1) +   ' / ' +
     time_section('descriptions', 'load' )  .toFixed(1) + ' ms,') + '&ensp;' +
    //
    format_nowrap('Parse: '  +
        time_main('parse' )                 .toFixed(1) +   ' / ' +
     time_section('subjects',     'parse')  .toFixed(1) +   ' / ' +
     time_section('descriptions', 'parse')  .toFixed(1) + ' ms,') + '&ensp;' +
    //
    format_nowrap('Filter: ' + time_filter().toFixed(1) + ' ms,') + '&ensp;' +
    //
    format_nowrap('Render: ' + du_render.pre.toFixed(1) +   ' / ' +
                               du_render.dom.toFixed(1) +   ' / ' +
      '<span id="' + tdr_id  + '">0.0 (0)</span>'       + ' ms' );
}

function process_error(error) {
  const container = document.getElementById("results");
  const timings   = document.getElementById("timings");

  container.innerHTML = error;
  timings  .innerHTML = "";
}

/* Date Change */

// what: "prev" / "curr"
function date_change_menu(event, what) {
  const menu_old  = document.getElementById('date-change-menu');
  if   (menu_old) { menu_old.remove_ex(); }

  const m_dates = dates_main();
  const i_date  = m_dates.indexOf(date_main(what));
  const i_min   = 0;
  const i_max   = m_dates.length - 1;
  const h_view  = 3;
  let   i_beg   = i_date - h_view;
  let   i_end   = i_date + h_view;

  if (i_beg < i_min) {
      i_end = Math.min(i_end + (i_min - i_beg), i_max);
      i_beg = i_min; }

  if (i_end > i_max) {
      i_beg = Math.max(i_beg - (i_end - i_max), i_min);
      i_end = i_max; }

  const  btn_other  = document.getElementById('span-btn-' + (what === "prev" ? "curr" : "prev"));
  const menu_caller = event.currentTarget;
  const menu        = document.createElement('div');
  menu.className    =             'menu';
  menu.id           = 'date-change-menu';
  menu.setAttribute  ('role',     'menu');

  menu.remove_ex = () => {
    document.removeEventListener('click', menu.outside_click);
    menu.remove();
    if ( btn_other  && document.body.contains( btn_other )) {  btn_other .style.pointerEvents = 'auto'; }
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
    const key = event.key;
    if (key === 'Escape') {
      menu.remove_ex();
    }
  };

  const init_opt = (opt, date) => {
    opt.className    = 'menu-opt';
    opt.setAttribute  ('role', 'menuitem');
    opt.tabIndex     = 0;
    opt.textContent  = date;

    opt.onclick = () => {
      menu.remove_ex();
      save_focus('span-btn-' + what);
      requestAnimationFrame(() => setTimeout(load_stat, 0, date, what)); // RAF handles cache hit (menu closing)
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

      const menu = opt.parentElement;
      const opts = Array.from(menu.children);
      const all  = opts.length;
      const curr = opts.indexOf(opt);
      let   next;

      if        ((key === 'ArrowUp'  ) && event.ctrlKey) {
        next =         0;
      } else if ((key === 'ArrowDown') && event.ctrlKey) {
        next =  all  - 1;
      } else if ((key === 'ArrowUp') || (key === 'ArrowLeft') || ((key === 'Tab') && event.shiftKey)) {
        next = (curr - 1 + all) % all;
      } else { // ArrowDown or ArrowRight or Tab
        next = (curr + 1)       % all;
      }
      opts[next].focus();
    };
  };

  for (let i = i_beg; i <= i_end; i++) {
    const date = m_dates[i];
    const opt  = document.createElement('div');
    init_opt(opt, date);
    menu.appendChild(opt);
  }

  menu.style.visibility = 'hidden';
  document.body.appendChild(menu);

  const b_rect = menu_caller.getBoundingClientRect();
  const m_rect = menu       .getBoundingClientRect();

  const b_mid  = b_rect.left + b_rect.width / 2;
  const m_half =               m_rect.width / 2;
  const m_left = b_mid - m_half + window.scrollX;

  let   m_top  = b_rect.top     + window.scrollY - 2 - m_rect.height;
  if   (m_top  <                  window.scrollY)     {
        m_top  = b_rect.bottom  + window.scrollY + 2; }

  menu.style.left       = m_left + 'px';
  menu.style.top        = m_top  + 'px';
  menu.style.visibility = 'visible';
  menu.children [i_date - i_beg] .focus();

  if (btn_other) {
    const b_rect = btn_other.getBoundingClientRect();
    const m_rect = menu     .getBoundingClientRect();

    const is_overlap = (m_rect.bottom >= b_rect.top   ) &&
                       (m_rect.top    <= b_rect.bottom);

    if   (is_overlap) { btn_other.style.pointerEvents = 'none'; }
  }
}

// EOF






