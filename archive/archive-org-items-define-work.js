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
  const du_render = time_render();

  const timings   = document.getElementById("timings");
        timings   . innerHTML =
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
    '<span id="' + "time-defer-render"  + '">0.0 (0)</span> ms' );
}

function process_timings_defer() {
  const tdr      =  time_defer_render();
  const tdr_id   = "time-defer-render";

  const tdr_span = document    . getElementById(tdr_id);
        tdr_span . textContent = tdr.duration.toFixed(1) + " (" + tdr.chunks + ')';
}

function process_error(error) {
  const container = document  . getElementById("results");
  const timings   = document  . getElementById("timings");

        container . innerHTML = error;
        timings   . innerHTML = "";
}

// EOF






