/* Constants */

const views_length = 6; // 123456
const  days_length = 5; // 12345
const ratio_length = 7; // 123.567

const  stat_length = views_length + 2 + days_length + 2 + ratio_length; // Used in CSS as 22ch
const  stat_empty  = "".padStart(stat_length);

/* Render */

function render_results(results_prev, date_prev, results_curr, date_curr, results_mark) {
  const time_0    = performance.now();
  const container = document.getElementById("results");
        container.innerHTML = "";

  if (!results_prev.length && !results_curr.length) {
    container.innerHTML = error_compose("No items matched the filters");
    return false;
  }

  ///////
  // Sets
  //
  let only_curr = 0;
  let only_prev = 0;
  let only_both = 0;

  // Lookup helper for create curr expanded results array
  // Create curr expanded results array
  const results_curr_ids = {};
  const results_curr_exp = [];
  for (const item of results_curr) {
    results_curr_ids[item.identifier] = true;
    results_curr_exp.push({ ...item,
      is_prev    : false,
      no_prev    : null,
      prev       : null,
      curr       : null,
      index_prev : null,
      horz_change: 0,
      vert_change: 0,
      rank_change: 0,
      grow       : null,
      gauges     : null,
      marks      : null });
  }

  // Add items from  results_prev that absent in results_curr
  // Create a map of results_prev by identifier
  const map_prev = {};
  for (const item of results_prev) {
    if (!results_curr_ids[item.identifier]) {
      only_prev++;
      results_curr_exp.push({ ...item,
        is_prev    : true,
        no_prev    : null,
        prev       : null,
        curr       : null,
        index_prev : null,
        horz_change: 0,
        vert_change: 0,
        rank_change: 0,
        grow       : null,
        gauges     : null,
        marks      : null });
    }
    map_prev[item.identifier] = item;
  }

  // Create prev expanded results array
  // Add items from results_curr that absent in results_prev
  const results_prev_exp = [...results_prev]; // Make copy
  for (const item of results_curr) {
    if (!map_prev[item.identifier]) {
      only_curr++;
      results_prev_exp.push({ ...item });
    }
  }

  // Sets
  only_both = results_curr_exp.length - only_curr - only_prev;

  // Sort expanded arrays for rank changes calculations
  sort_results(results_curr_exp);
  sort_results(results_prev_exp);

  // Create a map of curr expanded results by identifier
  // Set no_prev actual values in curr expanded results
  const map_curr_exp = {};
  for (const item of results_curr_exp) {
    map_curr_exp[item.identifier] = item;
    item.no_prev = !map_prev[item.identifier];
  }

  // Traverse prev expanded and set index_prev in curr expanded
  for (let index = 0; index < results_prev_exp.length; index++) {
    const item = results_prev_exp[index];
    map_curr_exp[item.identifier].index_prev = index;
  }

  ////////
  // Marks
  //
  let mark_counts = null;

  if (results_mark) {
    for (const rm of results_mark) {
      const mark = rm.mark;
      const prev = rm.prev;
      const curr = rm.curr;

      const rm_ids = {}; // Collect all identifiers
      for (const item of prev) rm_ids[item.identifier] = null;
      for (const item of curr) rm_ids[item.identifier] = null;

      let count = 0;
      for (const id in rm_ids) {
        const item = map_curr_exp[id];
        if  (!item) continue;

        if (!item.marks) item.marks = [];
        item.marks.push(mark);
        count++;
      }

      if (!mark_counts) mark_counts = [];
      mark_counts.push({ mark, count });
    }
  }

  ///////////////////////////////////////////////
  // Total counts displaying for expanded results
  //
  const curr_exp_totals  = get_totals(results_curr_exp);
  const curr_exp_total   = curr_exp_totals.audio + curr_exp_totals.video;
  const totals_div       = document.createElement("div");
  totals_div.className   ="subtitle text-center text-normal";
  totals_div.textContent =
            format_num_str(curr_exp_total,            'Item')  +
    ' ('  + format_number (curr_exp_totals.audio) +  ' Audio'  +
    ' / ' + format_number (curr_exp_totals.video) +  ' Video)' +
    ' '   + format_bytes  (curr_exp_totals.bytes) +
    ' / ' + format_num_str(curr_exp_totals.views,     'View')  +
    ' / ' + format_num_str(curr_exp_totals.favorites, 'Fav' )  +
    ' ('  + format_num_str(curr_exp_totals.favorited, 'Item')  + ')';
  container.appendChild(totals_div);

  // Both stats displaying
  render_stats(results_prev, date_prev, "prev", container); // Also sorts results_prev
  render_stats(results_curr, date_curr, "curr", container); // Also sorts results_curr

  // Sets displaying
  const sets_div = document.createElement("div");
  sets_div.className = "text-center text-comment";

  if ((only_curr === 0) && (only_prev === 0)) {
    sets_div.textContent = 'All Items are present in both ' + date_prev + ' and ' + date_curr;
  } else {
    sets_div.textContent = only_prev + ' in ' + date_prev + ' only, ' +
                           only_curr + ' in ' + date_curr + ' only, ' +
                           only_both + ' in ' +     'both'+      '. ' +
                           'Checkboxes above to select';
  }
  container.appendChild(sets_div);

  // Marks displaying
  if (mark_counts) {
    const marks_div = document.createElement("div");
    marks_div.className = "text-center text-comment";
    marks_div.appendChild(document.createTextNode('Marked: '));

    const mark_last = mark_counts.length - 1;
    for (let m = 0; m <= mark_last; m++) {
      const mark_span = document.createElement("span");
      mark_span.className = "item-mark-" + mark_counts[m].mark + "-text";
      mark_span.textContent = format_num_str(mark_counts[m].count, 'Item');
      marks_div.appendChild(mark_span);
      if (m < mark_last) marks_div.appendChild(document.createTextNode(' / '));
    }
    container.appendChild(marks_div);
  }

  // Spacing
  container.lastElementChild.style.marginBottom = "1em"; // Add space before item list

  ////////////////////////
  // Log scaling of gauges
  //
  const max_ratio     = Math.max(curr_exp_totals.max_ratio_old, curr_exp_totals.max_ratio_all);
  const max_favorites = curr_exp_totals.max_favorites;
  //
  const base_ratio     = 100 / Math.log(max_ratio     + 1);
  const base_favorites = 100 / Math.log(max_favorites + 1);
  //
  function get_percentage(value, max, base) {
    return (value <=   0) ?   '0%' :
           (value >= max) ? '100%' : (Math.log(value + 1) * base).toFixed(3) + '%';
  }

  ///////////////////////////////
  // Compose prev, curr, and grow
  //
  // For log/sig scaling of marks
  //
  const curr_length   = results_curr_exp.length;
  const curr_log_base = Math.log(curr_length); // For length === 1 is checked below, 0 was checked above
  //
  // Substantial changes marking: horizontal impact of old      from prev to     curr
  // Substantial changes marking: vertical   impact of 23 and 7 into all  within curr
  //
  const horz_decay     = 10; // For scale from top: 1 to bottom: 1/10
  const horz_log_steep = 1;  // No steep here, just log
  const horz_sig_base  = 0.1;
  const horz_sig_steep = 2;
  const horz_sig_min   = 1 / (1 + Math.exp((horz_sig_base - 0) * horz_sig_steep));
  const horz_sig_max   = 1 / (1 + Math.exp((horz_sig_base - 1) * horz_sig_steep));
  const horz_curr_prev = []; // Of curr_length anyway
  //
  const vert_decay     = 10; // Scale divisor: 1 to 10
  const vert_log_steep = 1;  // No steep here, just log
  const vert_sig_base  = 0.1;
  const vert_sig_steep = 2;
  const vert_sig_min   = 1 / (1 + Math.exp((vert_sig_base - 0) * vert_sig_steep));
  const vert_sig_max   = 1 / (1 + Math.exp((vert_sig_base - 1) * vert_sig_steep));
  const vert_all_old   = []; // Of curr_length anyway
  //
  // Mark rank changes
  // Mark mood changes
  //
  const rank_decay     = 30; // Scale divisor: 1 to 30
  const rank_log_steep = 3;  // To more than log prioritize top items
  const rank_sig_base  = 0.1;
  const rank_sig_steep = 5;
  const rank_sig_min   = 1 / (1 + Math.exp((rank_sig_base - 0) * rank_sig_steep));
  const rank_sig_max   = 1 / (1 + Math.exp((rank_sig_base - 1) * rank_sig_steep));
  const rank_up_dn     = []; // Of curr_length anyway
  //
  const mood_decay     = 10; // Scale divisor: 1 to 10
  const mood_log_steep = 2;  // To more than log prioritize top items
  const mood_sig_base  = 0.1;
  const mood_sig_steep = 3;
  const mood_sig_min   = 1 / (1 + Math.exp((mood_sig_base - 0) * mood_sig_steep));
  const mood_sig_max   = 1 / (1 + Math.exp((mood_sig_base - 1) * mood_sig_steep));
  const mood_pos_neg   = []; // Of curr_length anyway
  //
  // Gauges
  //
  for (let index_curr = 0; index_curr < curr_length; index_curr++) {
    const item = results_curr_exp[index_curr];
    const item_prev = map_prev[item.identifier];

    ///////
    // Prev
    //
    const _prev = {}; // _old, _23, _7
    if (item_prev) {
      _prev._old = item_prev.views_old.toString().padStart(views_length) + " /"        +
                   item_prev.days_old .toString().padStart( days_length) +        " =" +
                   item_prev.ratio_old.toFixed(3).padStart(ratio_length);
      _prev._23  = item_prev.views_23 .toString().padStart(views_length) + " /   23 =" +
                   item_prev.ratio_23 .toFixed(3).padStart(ratio_length);
      _prev._7   = item_prev.views_7  .toString().padStart(views_length) + " /    7 =" +
                   item_prev.ratio_7  .toFixed(3).padStart(ratio_length);
    }
    else {
      _prev._old = stat_empty;
      _prev._23  = stat_empty;
      _prev._7   = stat_empty;
    }
    item.prev = _prev;

    ///////
    // Curr
    //
    const _curr = {}; // _old, _23, _7
    if (!item.is_prev) {
      _curr._old = item.views_old.toString().padStart(views_length) + " /"        +
                   item.days_old .toString().padStart( days_length) +        " =" +
                   item.ratio_old.toFixed(3).padStart(ratio_length);
      _curr._23  = item.views_23 .toString().padStart(views_length) + " /   23 =" +
                   item.ratio_23 .toFixed(3).padStart(ratio_length);
      _curr._7   = item.views_7  .toString().padStart(views_length) + " /    7 =" +
                   item.ratio_7  .toFixed(3).padStart(ratio_length);
    }
    else {
      _curr._old = stat_empty;
      _curr._23  = stat_empty;
      _curr._7   = stat_empty;
    }
    item.curr = _curr;

    ////////////////////////////////////////////////////
    // Horz and Vert substantial changes, 0 is no change
    //
    let horz_change = 0;
    if (item_prev && !item.is_prev) { // Item is markable
      horz_change = (item.ratio_old && item_prev.ratio_old)
          ? Math.log(item.ratio_old /  item_prev.ratio_old)
          : 0;
      if (horz_change !== 0) {
//      const horz_scale = get_scale_log(index_curr, curr_log_base, horz_log_steep, horz_decay);
        const horz_scale = get_scale_sig(index_curr, curr_length,
          horz_sig_base, horz_sig_steep, horz_decay, horz_sig_min, horz_sig_max);
        horz_change /= horz_scale;
        item.horz_change = horz_change; // Needed in markable item only, and if not 0 only
      }
    }
    horz_curr_prev.push(horz_change); // Needed in array anyway
    //
    let vert_change = 0;
    if (!item.is_prev) { // Item is markable
      vert_change = (item.ratio_all && item.ratio_old)
          ? Math.log(item.ratio_all /  item.ratio_old)
          : 0;
      if (vert_change !== 0) {
//      const vert_scale = get_scale_log(index_curr, curr_log_base, vert_log_steep, vert_decay);
        const vert_scale = get_scale_sig(index_curr, curr_length,
          vert_sig_base, vert_sig_steep, vert_decay, vert_sig_min, vert_sig_max);
        vert_change /= vert_scale;
        item.vert_change = vert_change; // Needed in markable item only, and if not 0 only
      }
    }
    vert_all_old.push(vert_change); // Needed in array anyway

    //////////////////////////////
    // Rank change, 0 is no change
    //
    let   rank_change = 0;
    const rank_diff = item.index_prev - index_curr; // No abs
    if   (rank_diff !== 0) { // Also if length === 1 then index_prev === index_curr
      if (!item.is_prev && !item.no_prev) { // Item is markable
//      const rank_scale = get_scale_log(index_curr, curr_log_base, rank_log_steep, rank_decay);
        const rank_scale = get_scale_sig(index_curr, curr_length,
          rank_sig_base, rank_sig_steep, rank_decay, rank_sig_min, rank_sig_max);
        rank_change      = rank_diff / rank_scale;
        item.rank_change = rank_change; // Needed in markable item only, and if rank_diff is not 0 only
      }
    }
    rank_up_dn.push(rank_change); // Needed in array anyway

    //////////////////////////////
    // Grow and Mood, 0 is no Mood
    //
    let   _mood = 0;
    const _grow = {}; // _old, _23, _7 [, _mood]
    //
    if (!item.no_prev && !item.is_prev) { // Item is markable
      const grow_old = get_grow_ratio(item.ratio_old, item_prev.ratio_old);
      const grow_23  = get_grow_fixed(item.views_23 , item_prev.views_23 );
      const grow_7   = get_grow_fixed(item.views_7  , item_prev.views_7  );

      _grow._old = grow_old;
      _grow._23  = grow_23;
      _grow._7   = grow_7;

      const grow_mood = get_grow_mood(grow_old, grow_23, grow_7);
      if   (grow_mood !== 0) {
//      const mood_scale = get_scale_log(index_curr, curr_log_base, mood_log_steep, mood_decay);
        const mood_scale = get_scale_sig(index_curr, curr_length,
          mood_sig_base, mood_sig_steep, mood_decay, mood_sig_min, mood_sig_max);
        _mood = grow_mood / mood_scale;
      }
      _grow._mood = _mood; // Needed in markable item only
    }
    else {
      _grow._old = "   ";
      _grow._23  = "   ";
      _grow._7   = "   ";
    }
    item.grow = _grow;
    mood_pos_neg.push(_mood); // Needed in array anyway

    /////////
    // Gauges
    //
    const _gauges = {};
    let   _gauges_set = false;
    if (item_prev) {
      _gauges.below_a_w = get_percentage(item_prev.favorites, max_favorites, base_favorites);
      _gauges_set = true;
    }
    if (!item.is_prev) {
      _gauges.below_b_w = get_percentage(item.favorites, max_favorites, base_favorites);

      _gauges.above_a_w = get_percentage(item.ratio_old, max_ratio, base_ratio);
      _gauges.above_b_w = get_percentage(item.ratio_all, max_ratio, base_ratio);
      _gauges_set = true;
    }
    if (_gauges_set) {
      item.gauges = _gauges;
    }
  }

  // 1:0, 3:0, 4:1, 10:1, 20:2, 30:3, 50:4, 75:5, 100:6, 125:7, 150:8, 200:10, 300:12, 500:16, 800:21, 826:21
  const horz_marks_cnt = Math.floor(Math.pow(horz_curr_prev.length, 0.551) / 1.841);
  const horz_marks     = get_marks(horz_curr_prev, horz_marks_cnt, 0);
  const mark_grow_old  = horz_marks.above;
  const mark_fall_old  = horz_marks.below;

  // 1:0, 3:0, 4:1, 10:1, 20:2, 30:3, 50:3, 75:4, 100:5, 125:6, 150:6, 200:7, 300:9, 500:11, 800:14, 826:14
  const vert_marks_cnt = Math.floor(Math.pow(vert_all_old.length, 0.482) / 1.699);
  const vert_marks     = get_marks(vert_all_old, vert_marks_cnt, 0);
  const mark_grow_23_7 = vert_marks.above;
  const mark_fall_23_7 = vert_marks.below;

  // 1:0, 3:0, 4:1, 10:1, 20:2, 30:3, 50:4, 75:5, 100:6, 125:7, 150:8, 200:10, 300:12, 500:16, 800:21, 826:21
  const rank_marks_cnt = Math.floor(Math.pow(rank_up_dn.length, 0.551) / 1.841);
  const rank_marks     = get_marks(rank_up_dn, rank_marks_cnt, 0);
  const mark_rank_up   = rank_marks.above;
  const mark_rank_dn   = rank_marks.below;

  // 1:1, 3:1, 4:1, 10:2, 20:2, 30:3, 50:4, 75:4, 100:5, 125:5, 150:6, 200:7, 300:8, 500:10, 800:12, 826:12
  const mood_marks_cnt = Math.ceil(Math.pow(mood_pos_neg.length, 0.487) / 2.195);
  const mood_marks     = get_marks(mood_pos_neg, mood_marks_cnt, 0);
  const mark_mood_pos  = mood_marks.above;
  const mark_mood_neg  = mood_marks.below;

  /////////////////////////////////////
  // Show item list with flex alignment
  //
  const time_1 = performance.now();
  //
  // Header
  //
  const header_wrapper = document.createElement("div");
  header_wrapper.className = "header-wrapper";
  //
  const header_inner = document.createElement("div");
  header_inner.className = "header-inner";
  //
  const header_title_wrapper = document.createElement("div");
  header_title_wrapper.className = "header-title-wrapper bg-fall";
  const header_title_inner = document.createElement("div");
  header_title_inner.className = "header-title-inner subtitle text-ellipsis";
  header_title_inner.textContent = "Internet Archive Item";
  header_title_wrapper.appendChild(header_title_inner);
  //
  const header_stat_prev_wrapper = document.createElement("div");
  header_stat_prev_wrapper.className = "header-stat-wrapper bg-grow";
  const header_stat_prev_inner = document.createElement("div");
  header_stat_prev_inner.className = "header-stat-inner subtitle";
  header_stat_prev_inner.textContent = "Prev";
  header_stat_prev_wrapper.appendChild(header_stat_prev_inner);
  //
  const header_stat_curr_wrapper = document.createElement("div");
  header_stat_curr_wrapper.className = "header-stat-wrapper bg-fall";
  const header_stat_curr_inner = document.createElement("div");
  header_stat_curr_inner.className = "header-stat-inner subtitle";
  header_stat_curr_inner.textContent = "Curr";
  header_stat_curr_wrapper.appendChild(header_stat_curr_inner);
  //
  const header_stat_grow_wrapper = document.createElement("div");
  header_stat_grow_wrapper.className = "header-grow-wrapper bg-grow";
  const header_stat_grow_inner = document.createElement("div");
  header_stat_grow_inner.className = "header-grow-inner subtitle";
  header_stat_grow_inner.innerHTML = "&plus;&minus;";
  header_stat_grow_wrapper.appendChild(header_stat_grow_inner);
  //
  header_inner.appendChild(header_title_wrapper    );
  header_inner.appendChild(header_stat_prev_wrapper);
  header_inner.appendChild(header_stat_curr_wrapper);
  header_inner.appendChild(header_stat_grow_wrapper);
  //
  header_wrapper.appendChild(header_inner  );
  container     .appendChild(header_wrapper);
  //
  for (let index = 0; index < results_curr_exp.length; index++) {
    const item = results_curr_exp[index];
    const item_prev = map_prev[item.identifier];

    // 1. Outer wrapper, for border/divider and spacing
    const item_wrapper = document.createElement("div");
    item_wrapper.className = "item-wrapper";

    // 2. Inner flex container
    const item_inner = document.createElement("div");
    item_inner.className = "item-inner";

    ///////////
    // 3. Title
    const item_title_container = document.createElement("div");
    item_title_container.className = "item-title-container";

    // Above gauges
    const item_gauge_above_a = document.createElement("div");
    item_gauge_above_a.className = "item-gauge-above-a";

    const item_gauge_above_b = document.createElement("div");
    item_gauge_above_b.className = "item-gauge-above-b";

    // Display ratios old and all for curr on the above gauges
    if (!item.is_prev) {
      item_gauge_above_a.style.width = item.gauges.above_a_w;
      item_gauge_above_b.style.width = item.gauges.above_b_w;
    }

    // Link button
    const item_title = document.createElement("div");
    item_title.className = "item-title";

    const item_link = document.createElement("a");
    item_link.className = "text-ellipsis";
    item_link.textContent = (index + 1) + ". " + item.title;
    item_link.href = "https://archive.org/details/" + item.identifier;
    item_link.target = "_blank";
    item_link.rel = "noopener"; // Safe for _blank
    item_title.appendChild(item_link);

    // Below gauges
    const item_gauge_below_a = document.createElement("div");
    item_gauge_below_a.className = "item-gauge-below-a";

    const item_gauge_below_b = document.createElement("div");
    item_gauge_below_b.className = "item-gauge-below-b";

    // Display favorites prev and curr counts on the below gauges
    if (item_prev) {
      item_gauge_below_a.style.width = item.gauges.below_a_w;
    }

    if (!item.is_prev) {
      item_gauge_below_b.style.width = item.gauges.below_b_w;
    }

    // 3. Title: assemble the hierarchy
    item_title_container.appendChild(item_gauge_above_a);
    item_title_container.appendChild(item_gauge_above_b);
    item_title_container.appendChild(item_title        );
    item_title_container.appendChild(item_gauge_below_a);
    item_title_container.appendChild(item_gauge_below_b);

    /////////////////////////////////////
    // 4.1. Prev stat container (stacked)
    const stat_prev_container = document.createElement("div");
    stat_prev_container.className = "item-stat-container"; // flex: 0 0 22ch;

    // 4.2. Prev: old stat line
    const stat_prev_old = document.createElement("div");
    stat_prev_old.className = "item-stat-prev-old";
    stat_prev_old.textContent = item.prev._old;

    // 4.3. Prev: 23-day stat line
    const stat_prev_23 = document.createElement("div");
    stat_prev_23.className = "item-stat-prev-23";
    stat_prev_23.textContent = item.prev._23;

    // 4.4. Prev: 7-day stat line
    const stat_prev_7 = document.createElement("div");
    stat_prev_7.className = "item-stat-prev-7";
    stat_prev_7.textContent = item.prev._7;

    // Rank changes marking
    if (item_prev && !item.is_prev) {
      if      (item.rank_change >= mark_rank_up) { // index < item.index_prev
        stat_prev_old.classList.add("item-mark-up");
        stat_prev_23 .classList.add("item-mark-up");
        stat_prev_7  .classList.add("item-mark-up");
      }
      else if (item.rank_change <= mark_rank_dn) { // index > item.index_prev
        stat_prev_old.classList.add("item-mark-dn");
        stat_prev_23 .classList.add("item-mark-dn");
        stat_prev_7  .classList.add("item-mark-dn");
      }
    }

    // 4.5. Prev: assemble the hierarchy
    stat_prev_container.appendChild(stat_prev_old);
    stat_prev_container.appendChild(stat_prev_23 );
    stat_prev_container.appendChild(stat_prev_7  );

    /////////////////////////////////////
    // 5.1. Curr stat container (stacked)
    const stat_curr_container = document.createElement("div");
    stat_curr_container.className = "item-stat-container"; // flex: 0 0 22ch;

    // 5.2. Curr: old stat line
    const stat_curr_old = document.createElement("div");
    stat_curr_old.className = "item-stat-curr-old";
    stat_curr_old.textContent = item.curr._old;

    // 5.3. Curr: 23-day stat line
    const stat_curr_23 = document.createElement("div");
    stat_curr_23.className = "item-stat-curr-23";
    stat_curr_23.textContent = item.curr._23;

    // 5.4. Curr: 7-day stat line
    const stat_curr_7 = document.createElement("div");
    stat_curr_7.className = "item-stat-curr-7";
    stat_curr_7.textContent = item.curr._7;

    // Substantial changes marking: horizontal impact of old from prev to curr
    if (item_prev && !item.is_prev) {
      if      (item.horz_change >= mark_grow_old) {
        stat_curr_old.classList.add("item-mark-grow");
      }
      else if (item.horz_change <= mark_fall_old) {
        stat_curr_old.classList.add("item-mark-fall");
      }
    }

    // Substantial changes marking: vertical impact of 23 and 7 into all within curr
    if (!item.is_prev) {
      if      (item.vert_change >= mark_grow_23_7) {
        stat_curr_23.classList.add("item-mark-grow");
        stat_curr_7 .classList.add("item-mark-grow");
      }
      else if (item.vert_change <= mark_fall_23_7) {
        stat_curr_23.classList.add("item-mark-fall");
        stat_curr_7 .classList.add("item-mark-fall");
      }
    }

    // 5.5. Curr: assemble the hierarchy
    stat_curr_container.appendChild(stat_curr_old);
    stat_curr_container.appendChild(stat_curr_23 );
    stat_curr_container.appendChild(stat_curr_7  );

    ////////////////////////////////
    // 6.1. Grow container (stacked)
    const stat_grow_container = document.createElement("div");
    stat_grow_container.className = "item-grow-container"; // flex: 0 0 3ch;

    // 6.2. Grow: old
    const stat_grow_old = document.createElement("div");
    stat_grow_old.className = "item-grow-old";
    stat_grow_old.textContent = item.grow._old;

    // 6.3. Grow: 23
    const stat_grow_23 = document.createElement("div");
    stat_grow_23.className = "item-grow-23";
    stat_grow_23.textContent = item.grow._23;

    // 6.4. Grow: 7
    const stat_grow_7 = document.createElement("div");
    stat_grow_7.className = "item-grow-7";
    stat_grow_7.textContent = item.grow._7;

    // Grow mood marking: positive and negative
    if (item_prev && !item.is_prev) {
      if      (item.grow._mood >= mark_mood_pos) {
        stat_grow_old.classList.add("item-mark-grow");
        stat_grow_23 .classList.add("item-mark-grow");
        stat_grow_7  .classList.add("item-mark-grow");
      }
      else if (item.grow._mood <= mark_mood_neg) {
        stat_grow_old.classList.add("item-mark-fall");
        stat_grow_23 .classList.add("item-mark-fall");
        stat_grow_7  .classList.add("item-mark-fall");
      }
    }

    // 6.5. Grow: assemble the hierarchy
    stat_grow_container.appendChild(stat_grow_old);
    stat_grow_container.appendChild(stat_grow_23 );
    stat_grow_container.appendChild(stat_grow_7  );

    ///////////////////
    // 7. Add all parts
    item_inner.appendChild(item_title_container);
    item_inner.appendChild(stat_prev_container );
    item_inner.appendChild(stat_curr_container );
    item_inner.appendChild(stat_grow_container );

    ////////////
    // 8.1. Wrap
    item_wrapper.appendChild(item_inner);

    // 8.2. Add mark indicators (if any)
    if (item.marks) {
      const mark_last = item.marks.length - 1;
      for (let m = 0; m <= mark_last; m++) {
        const mark_div = document.createElement("div");
        mark_div.className = "item-mark-" + item.marks[m];
        if (m < mark_last) mark_div.style.borderBottom = "3px solid white";
        item_wrapper.appendChild(mark_div);
      }
      item_wrapper.style.borderBottom = "none"; // Mark will be the border
    }

    // 8.3. Add item to the page
    container.appendChild(item_wrapper);
  }

  return { pre: time_1 - time_0, dom: performance.now() - time_1 };
}

// EOF






