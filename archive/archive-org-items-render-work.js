/* Display */

//    07-21  07-23  07-31  08-07 > 07-21
//    07-27  07-31  08-07  08-14 > 08-14
//
// ^^^    0      2     19      0 >    25
// ^^     1      8     37      3 >    40
// ^      5     24     49      3 >    82
// +++   11     58     91     12 >    94
// ++    58    142    164     85 >   133
// +     64     88    112     85 >    53
//
// -    293    175    129    256 >    69
// --   150    130     72    144 >   115
// ---   65     26     10     55 >    95
// v     28     26     12     34 >    20
// vv     0      2      0      0 >    14
// vvv    0      0      0      0 >     6

function get_grow_ratio(curr, prev) {
  if (!curr && !prev) { return "   "; }
  if (!curr || !prev) { return "o  "; }

  const ratio = curr / prev;

  if   (ratio === 1)  { return "   "; }

  if   (ratio > 1) {
    if (ratio < 1.01) { return "+  "; }
    if (ratio < 1.03) { return "++ "; }
    if (ratio < 1.06) { return "+++"; }

    if (ratio < 1.12) { return "^  "; }
    if (ratio < 1.24) { return "^^ "; }
                        return "^^^"; }
  //    ratio < 1
  if   (ratio > 0.99) { return "-  "; }
  if   (ratio > 0.98) { return "-- "; }
  if   (ratio > 0.96) { return "---"; }

  if   (ratio > 0.94) { return "v  "; }
  if   (ratio > 0.90) { return "vv "; }
                        return "vvv";
}

function get_grow_fixed(curr, prev) {
  const diff = curr - prev;
  if   (diff === 0)     { return "   "; }

  const diff_abs = Math.abs(diff);

  if   (diff > 0) {
    if (diff_abs === 1) { return "+  "; }
    if (diff_abs === 2) { return "++ "; }
    if (diff_abs === 3) { return "+++"; }

    if (diff_abs <=  5) { return "^  "; }
    if (diff_abs <= 10) { return "^^ "; }
                          return "^^^"; }
  //    diff < 0
  if   (diff_abs === 1) { return "-  "; }
  if   (diff_abs === 2) { return "-- "; }
  if   (diff_abs === 3) { return "---"; }

  if   (diff_abs <=  5) { return "v  "; }
  if   (diff_abs <= 10) { return "vv "; }
                          return "vvv";
}

function get_totals(results) {
  const totals = { audio: 0, video: 0, bytes: 0, views: 0, favorites: 0, favorited: 0,
                   max_favorites: 0, max_ratio_old: 0, max_ratio_all: 0
  };
  results.forEach(item => {
    if (item.mediatype === "audio" ) totals.audio++;
    if (item.mediatype === "movies") totals.video++;

    totals.bytes += item.item_size;
    totals.views += item.views_all;

    totals.favorites +=  item.favorites;
    totals.favorited += (item.favorites != 0);

    if (totals.max_favorites < item.favorites) {
        totals.max_favorites = item.favorites; }

    if (totals.max_ratio_old < item.ratio_old) {
        totals.max_ratio_old = item.ratio_old; }

    if (totals.max_ratio_all < item.ratio_all) {
        totals.max_ratio_all = item.ratio_all; }
  });
  return totals;
}

function format_bytes(bytes) {
  const units = ['KiB', 'MiB', 'GiB'];
  let   value = bytes;
  let   index = -1;

  while (value >= 1024) {
         value /= 1024;
         index++;
  }
  let fract = (value <   9.9995) ? 3 :
              (value <  99.995 ) ? 2 :
              (value < 999.95  ) ? 1 : 0;

  return value.toFixed(fract) + ' ' + units[index];
}

function sort_results(results) {
  results.sort((a, b) => { // Descending for views
    if (a.ratio_old !== b.ratio_old) { return b.ratio_old - a.ratio_old; }
    if (a.ratio_23  !== b.ratio_23 ) { return b.ratio_23  - a.ratio_23;  }
    if (a.ratio_7   !== b.ratio_7  ) { return b.ratio_7   - a.ratio_7;   }
    return a.title.localeCompare(b.title); // Ascending for titles: A >> Z
  });
}

function render_stats(results, date, what, container) {
  sort_results(results);

  // Show stats: Min, 10%, 25%, 50%, 75%, 90%, Max
  const stats_text = document.createElement("div");
  stats_text.className = "text-center";
  stats_text.style.color = "#696969"; // DimGray, L41

  // Calculate stats from sorted results
  const max = results[0                 ]?.ratio_old || 0;
  const min = results[results.length - 1]?.ratio_old || 0;

  // Simple percentile approximations (array is already sorted)
  const get_percentile = (percent) => {
    const index = Math.floor((100 - percent) / 100 * results.length);
    return results[index]?.ratio_old || 0;
  };

  const percentile10 = get_percentile(10);
  const quartile1    = get_percentile(25);
  const median       = get_percentile(50);
  const quartile3    = get_percentile(75);
  const percentile90 = get_percentile(90);

  stats_text.innerHTML =
    '<span ' +
       'role="button" style="cursor:pointer;" tabindex="0" ' +
       'onkeydown="if ((event.key === \'Enter\') || (event.key === \' \')) { event.preventDefault(); }" ' +
       'onkeyup  ="if ((event.key === \'Enter\') || (event.key === \' \')) { ' +
                  'date_change_menu(event, \'' + what + '\'); }" ' +
       'onclick  ="date_change_menu(event, \'' + what + '\')" ' +
       '>' + date + '</span>'        + ' : ' +
    'Min ' + min         .toFixed(3) + ' / ' +
    '10% ' + percentile10.toFixed(3) + ' / ' +
    '25% ' + quartile1   .toFixed(3) + ' / ' +
    '50% ' + median      .toFixed(3) + ' / ' +
    '75% ' + quartile3   .toFixed(3) + ' / ' +
    '90% ' + percentile90.toFixed(3) + ' / ' +
    'Max ' + max         .toFixed(3);

  container.appendChild(stats_text);
}

function render_results(results_curr, results_prev, favs_min_str, favs_max_str) {
  const container = document.getElementById("results");
        container.innerHTML = "";

  // Filtering by favorites count
  if (favs_min_str || favs_max_str) {
    const favs_min = favs_min_str ? parseInt(favs_min_str, 10) : 0;
    const favs_max = favs_max_str ? parseInt(favs_max_str, 10) : Infinity;

    results_curr = results_curr.filter(item => {
      return (item.favorites >= favs_min) && (item.favorites <= favs_max);
    });

    results_prev = results_prev.filter(item => {
      return (item.favorites >= favs_min) && (item.favorites <= favs_max);
    });
  }

  // Checking for no results
  if ((results_curr.length === 0) && (results_prev.length === 0)) {
    container.innerHTML =
      '<div class="text-center text-comment">No items matched the filters</div>';
    return false;
  }

  // Lookup helper
  const results_curr_ids = {};
  results_curr.forEach(item => {
    results_curr_ids[item.identifier] = true;
  });

  // Create expanded results array
  const results_curr_exp = results_curr.map(item => ({ ...item, is_exp: false }));

  // Add items from results_prev that aren't in results_curr
  results_prev.forEach(item => {
    if (!results_curr_ids[item.identifier]) {
      results_curr_exp.push({ ...item, is_exp: true });
    }
  });

  // Build a map of prev results by identifier
  const map_prev = {};
  results_prev.forEach(item => {
    map_prev[item.identifier] = item;
  });

  // Total counts displaying (for expanded results)
  const curr_exp_totals  = get_totals(results_curr_exp);
  const curr_exp_total   = curr_exp_totals.audio + curr_exp_totals.video;
  const counts_div       = document.createElement("div");
  counts_div.className   = "subtitle text-center text-normal";
  counts_div.textContent = 'Total ' + curr_exp_total            + ' '        +
                           '('      + curr_exp_totals.audio     + ' Audio '  +
                           '/ '     + curr_exp_totals.video     + ' Video) ' +
                         format_bytes(curr_exp_totals.bytes)    + ' '        +
                           '/ '     + curr_exp_totals.views     + ' Views '  +
                           '/ '     + curr_exp_totals.favorites + ' Favs '   +
                           '('      + curr_exp_totals.favorited + ' Items)';
  container.appendChild(counts_div);

  // Both stats displaying
  render_stats(results_prev, stat_prev_date, "prev", container); // Also sorts results_prev
  render_stats(results_curr, stat_curr_date, "curr", container); // Also sorts results_curr

  container.lastElementChild.style.marginBottom = "1em"; // Add space before item list

  sort_results(results_curr_exp);

  // Substantial changes marking: horizontal impact of old from prev to curr
  const horz_curr_prev = [];

  results_curr_exp.forEach(item => {
    const item_prev = map_prev[item.identifier];
    if  (!item_prev) return;

    horz_curr_prev.push(item.ratio_old / item_prev.ratio_old);
  });
  horz_curr_prev.sort((a, b) => a - b);

  // 3:0, 4:1, 10:1, 20:3, 50:5, 100:7, 200:11, 500:16, 800:21, 826:21
  const horz_mark_cnt = Math.round(Math.floor(Math.sqrt(horz_curr_prev.length * 0.33)) * 1.33);
  let   mark_grow_old = Infinity;
  let   mark_fall_old = 0;

  if (horz_mark_cnt > 0) {
      mark_grow_old = horz_curr_prev[horz_curr_prev.length - horz_mark_cnt];
      mark_fall_old = horz_curr_prev[horz_mark_cnt - 1];
  }
  if (mark_grow_old <= 1) { // Off side and add their places to other side
      mark_grow_old = Infinity;
      mark_fall_old = horz_curr_prev[horz_mark_cnt * 2 - 1];
  }
  if (mark_fall_old >= 1) { // Off side and add their places to other side
      mark_fall_old = 0;
      mark_grow_old = horz_curr_prev[horz_curr_prev.length - horz_mark_cnt * 2];
  }

  // Substantial changes marking: vertical impact of 23 and 7 into all within curr
  const vert_all_old   = results_curr_exp.map(item => item.ratio_all / item.ratio_old).sort((a, b) => a - b);
  // 3:0, 4:1, 10:1, 20:2, 50:3, 100:5, 200:7, 500:11, 800:14, 826:14
  const vert_mark_cnt  = Math.floor(Math.sqrt(vert_all_old.length * 0.25));
  let   mark_grow_23_7 = Infinity;
  let   mark_fall_23_7 = 0;

  if (vert_mark_cnt > 0) {
      mark_grow_23_7 = vert_all_old[vert_all_old.length - vert_mark_cnt];
      mark_fall_23_7 = vert_all_old[vert_mark_cnt - 1];
  }
  if (mark_grow_23_7 <= 1) { // Off side and add their places to other side
      mark_grow_23_7 = Infinity;
      mark_fall_23_7 = vert_all_old[vert_mark_cnt * 2 - 1];
  }
  if (mark_fall_23_7 >= 1) { // Off side and add their places to other side
      mark_fall_23_7 = 0;
      mark_grow_23_7 = vert_all_old[vert_all_old.length - vert_mark_cnt * 2];
  }

  // Log scaling
  const max_ratio     = Math.max(curr_exp_totals.max_ratio_old, curr_exp_totals.max_ratio_all);
  const max_favorites = curr_exp_totals.max_favorites;

  const base_ratio     = 100 / Math.log(max_ratio     + 1);
  const base_favorites = 100 / Math.log(max_favorites + 1);

  function get_percentage(value, max, base) {
    return (value <=   0) ?   0 :
           (value >= max) ? 100 : Math.log(value + 1) * base;
  }

  // Show item list with flex alignment
  results_curr_exp.forEach((item, index) => {
    // 0. Get matching prev item
    const item_prev = map_prev[item.identifier];

    // 1. Outer wrapper, for border/divider and spacing
    const item_wrapper = document.createElement("div");
    item_wrapper.className = "item-wrapper";

    // 2. Inner flex container
    const item_inner = document.createElement("div");
    item_inner.className = "item-inner";

    // 3. Title
    const item_title_container = document.createElement("div");
    item_title_container.className = "item-title-container";

    // Above gauges
    const item_gauge_above_a = document.createElement("div");
    item_gauge_above_a.className = "item-gauge-above-a";

    const item_gauge_above_b = document.createElement("div");
    item_gauge_above_b.className = "item-gauge-above-b";

    // Display ratios old and all on the above gauges
    const percentage_a_a = get_percentage(item.ratio_old, max_ratio, base_ratio);
    item_gauge_above_a.style.width = percentage_a_a + "%";

    const percentage_a_b = get_percentage(item.ratio_all, max_ratio, base_ratio);
    item_gauge_above_b.style.width = percentage_a_b + "%";

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
      const percentage_b_a = get_percentage(item_prev.favorites, max_favorites, base_favorites);
      item_gauge_below_a.style.width = percentage_b_a + "%";
    }

    if (!item.is_exp) {
      const percentage_b_b = get_percentage(item.favorites, max_favorites, base_favorites);
      item_gauge_below_b.style.width = percentage_b_b + "%";
    }

    // 3. Title: assemble the hierarchy
    item_title_container.appendChild(item_gauge_above_a);
    item_title_container.appendChild(item_gauge_above_b);
    item_title_container.appendChild(item_title        );
    item_title_container.appendChild(item_gauge_below_a);
    item_title_container.appendChild(item_gauge_below_b);

    // 4.1. Prev stat container (stacked)
    const stat_prev_container = document.createElement("div");
    stat_prev_container.className = "item-stat-container"; // flex: 0 0 22ch;

    // 4.2. Prev: old stat line
    const stat_prev_old = document.createElement("div");
    stat_prev_old.className   ="item-stat-old";
    stat_prev_old.textContent = item_prev
                              ? item_prev.views_old.toString().padStart( 6) + " /" +
                                item_prev.days_old .toString().padStart( 5) + " =" +
                                item_prev.ratio_old.toFixed(3).padStart( 7)
                              :                             "".padStart(22);

    // 4.3. Prev: 23-day stat line
    const stat_prev_23 = document.createElement("div");
    stat_prev_23.className   ="item-stat-23";
    stat_prev_23.textContent = item_prev
                             ? item_prev.views_23.toString().padStart( 6) + " /   23 =" +
                               item_prev.ratio_23.toFixed(3).padStart( 7)
                             :                            "".padStart(22);

    // 4.4. Prev: 7-day stat line
    const stat_prev_7 = document.createElement("div");
    stat_prev_7.className   ="item-stat-7";
    stat_prev_7.textContent = item_prev
                            ? item_prev.views_7.toString().padStart( 6) + " /    7 =" +
                              item_prev.ratio_7.toFixed(3).padStart( 7)
                            :                           "".padStart(22);

    // 4.5. Prev: assemble the hierarchy
    stat_prev_container.appendChild(stat_prev_old);
    stat_prev_container.appendChild(stat_prev_23 );
    stat_prev_container.appendChild(stat_prev_7  );

    // 5.1. Curr stat container (stacked)
    const stat_curr_container = document.createElement("div");
    stat_curr_container.className = "item-stat-container"; // flex: 0 0 22ch;

    // 5.2. Curr: old stat line
    const stat_curr_old = document.createElement("div");
    stat_curr_old.className   ="item-stat-old";
    stat_curr_old.textContent = item.is_exp
                              ?                        "".padStart(22)
                              : item.views_old.toString().padStart( 6) + " /" +
                                item.days_old .toString().padStart( 5) + " =" +
                                item.ratio_old.toFixed(3).padStart( 7);

    // 5.3. Curr: 23-day stat line
    const stat_curr_23 = document.createElement("div");
    stat_curr_23.className   ="item-stat-23";
    stat_curr_23.textContent = item.is_exp
                             ?                       "".padStart(22)
                             : item.views_23.toString().padStart( 6) + " /   23 =" +
                               item.ratio_23.toFixed(3).padStart( 7);

    // 5.4. Curr: 7-day stat line
    const stat_curr_7 = document.createElement("div");
    stat_curr_7.className   ="item-stat-7";
    stat_curr_7.textContent = item.is_exp
                            ?                      "".padStart(22)
                            : item.views_7.toString().padStart( 6) + " /    7 =" +
                              item.ratio_7.toFixed(3).padStart( 7);

    // 5.5. Curr: assemble the hierarchy
    stat_curr_container.appendChild(stat_curr_old);
    stat_curr_container.appendChild(stat_curr_23 );
    stat_curr_container.appendChild(stat_curr_7  );

    // 6.1. Grow container (stacked)
    const stat_grow_container = document.createElement("div");
    stat_grow_container.className = "item-grow-container"; // flex: 0 0 3ch;

    // 6.2. Grow: old
    const stat_grow_old = document.createElement("div");
    stat_grow_old.className ="item-grow-old";

    const grow_old = item_prev ? get_grow_ratio(item.ratio_old, item_prev.ratio_old) : "   ";
    stat_grow_old.textContent = grow_old;

    // Substantial changes marking: horizontal impact of old from prev to curr
    if (item_prev) {
      if ((item.ratio_old / item_prev.ratio_old) >= mark_grow_old) {
        stat_curr_old.classList.add("item-mark-grow");
        stat_grow_old.classList.add("item-mark-grow");
      }

      if ((item.ratio_old / item_prev.ratio_old) <= mark_fall_old) {
        stat_curr_old.classList.add("item-mark-fall");
        stat_grow_old.classList.add("item-mark-fall");
      }
    }

    // 6.3. Grow: 23
    const stat_grow_23 = document.createElement("div");
    stat_grow_23.className ="item-grow-23";

    const grow_23 = item_prev ? get_grow_fixed(item.views_23, item_prev.views_23) : "   ";
    stat_grow_23.textContent = grow_23;

    // 6.4. Grow: 7
    const stat_grow_7 = document.createElement("div");
    stat_grow_7.className ="item-grow-7";

    const grow_7 = item_prev ? get_grow_fixed(item.views_7, item_prev.views_7) : "   ";
    stat_grow_7.textContent = grow_7;

    // Substantial changes marking: vertical impact of 23 and 7 into all within curr
    if ((item.ratio_all / item.ratio_old) >= mark_grow_23_7) {
      stat_curr_23.classList.add("item-mark-grow");
      stat_curr_7 .classList.add("item-mark-grow");
      stat_grow_23.classList.add("item-mark-grow");
      stat_grow_7 .classList.add("item-mark-grow");
    }

    if ((item.ratio_all / item.ratio_old) <= mark_fall_23_7) {
      stat_curr_23.classList.add("item-mark-fall");
      stat_curr_7 .classList.add("item-mark-fall");
      stat_grow_23.classList.add("item-mark-fall");
      stat_grow_7 .classList.add("item-mark-fall");
    }

    // 6.5. Grow: assemble the hierarchy
    stat_grow_container.appendChild(stat_grow_old);
    stat_grow_container.appendChild(stat_grow_23 );
    stat_grow_container.appendChild(stat_grow_7  );

    // 7. Add all parts
    item_inner.appendChild(item_title_container);
    item_inner.appendChild(stat_prev_container );
    item_inner.appendChild(stat_curr_container );
    item_inner.appendChild(stat_grow_container );

    // 8. Wrap and add item to the page
    item_wrapper.appendChild(item_inner  );
    container   .appendChild(item_wrapper);
  });
  return true;
}

// EOF






