/* Render */

// what: "prev" / "curr"
function render_stats(results, date, what, show_by, sort_by, container) {
  let field = null;

  switch (show_by + sort_by) {
    case "old-23-7" + "ratio": field = "ratio_old"; break;
    case "old-23-7" + "views": field = "views_old"; break;
    case "all-30-7" + "ratio": field = "ratio_all"; break;
    case "all-30-7" + "views": field = "views_all"; break;

    default: return; // Unknown parameters
  }

  let format = null;

  switch (sort_by) {
    case "ratio": format = (value) => value.toFixed(3);     break;
    case "views": format = (value) => format_number(value); break;
  }

  sort_results(results, show_by, sort_by);

  // Show stats: Min, 10%, 25%, 50%, 75%, 90%, Max
  const stats_text = document.createElement("div");
  stats_text.className = "text-center";
  stats_text.style.color = "#696969"; // DimGray, L41

  // Calculate stats from sorted results
  const max = format(results[0                 ]?.[field] || 0);
  const min = format(results[results.length - 1]?.[field] || 0);

  // Simple percentile approximations (array is already sorted)
  const get_percentile = (percent) => {
    const index = Math.floor((100 - percent) / 100 * results.length);
    return format(results[index]?.[field] || 0);
  };

  const percentile10 = get_percentile(10);
  const quartile1    = get_percentile(25);
  const median       = get_percentile(50);
  const quartile3    = get_percentile(75);
  const percentile90 = get_percentile(90);

  stats_text.innerHTML =
    format_nowrap(cap_first(what) + '&thinsp;' +
      '<span ' +
      'class="span-btn" id="span-btn-' + what + '" role="button" tabindex="0" ' +
      'onkeydown="if ((event.key === \'Enter\') || (event.key === \' \')) event.preventDefault();" ' +
      'onkeyup  ="if ((event.key === \'Enter\') || (event.key === \' \')) ' +
                 'date_change_menu(event, \'' + what + '\');" ' +
      'onclick  ="date_change_menu(event, \'' + what + '\')" ' +
      '>' + date + '</span>' + '&thinsp;' + ':') + '&ensp;' +
    format_nowrap('Min ' + min            + ',') + '&ensp;' +
    format_nowrap('10% ' + percentile10   + ',') + '&ensp;' +
    format_nowrap('25% ' + quartile1      + ',') + '&ensp;' +
    format_nowrap('50% ' + median         + ',') + '&ensp;' +
    format_nowrap('75% ' + quartile3      + ',') + '&ensp;' +
    format_nowrap('90% ' + percentile90   + ',') + '&ensp;' +
    format_nowrap('Max ' + max);

  container.appendChild(stats_text);
}

// Diffs

let diffs_text       = null;
let diffs_text_inner = null;

function create_diffs_inner(views_favs_prev, views_favs_curr, shown_cnt, show_by) {
  const show_by_old = (show_by === "old-23-7"); // Else by "all-30-7"

  return "" +
    format_nowrap    ('Differences for ' +
      format_num_str (shown_cnt, 'Item') + ' in:') + ' ' +
    format_nowrap    ('Views: ' +
      format_num_sign(show_by_old
                    ? views_favs_curr.views_old - views_favs_prev.views_old  // \u200a is &hairsp;
                    : views_favs_curr.views_all - views_favs_prev.views_all) + '\u200a/\u200a' +
      format_num_sign(show_by_old
                    ? views_favs_curr.views_23  - views_favs_prev.views_23
                    : views_favs_curr.views_30  - views_favs_prev.views_30 ) + '\u200a/\u200a' +
      format_num_sign(views_favs_curr.views_7   - views_favs_prev.views_7  ) + ',') + ' ' +
    format_nowrap    ('Favs: ' +
      format_num_sign(views_favs_curr.favorites - views_favs_prev.favorites) + '\u200a/\u200a' +
      format_num_sign(views_favs_curr.favorited - views_favs_prev.favorited));
}

function render_diffs(results_prev, results_curr, shown_cnt, show_by, container) {
  diffs_text = document.createElement("div");
  diffs_text.className  = "text-center text-comment";

  const views_favs_prev = get_views_favs(results_prev);
  const views_favs_curr = get_views_favs(results_curr);

  diffs_text_inner      = create_diffs_inner(views_favs_prev, views_favs_curr, shown_cnt, show_by);
  diffs_text.innerHTML  = diffs_text_inner;

  container.appendChild(diffs_text);
}

function update_diffs(shown_cnt, show_by) {
  const views_favs    = get_views_favs_shown();
  const updated_inner = create_diffs_inner(views_favs.prev, views_favs.curr, shown_cnt, show_by);

  if (diffs_text_inner   !== updated_inner) {
      diffs_text.innerHTML = updated_inner;
      diffs_text_inner     = updated_inner;
  }
}

/* Compose */

//
// Header
//

function compose_header(title_is, title_is_set,
                         show_by,  show_by_set,
                         sort_by,  sort_by_set,
                         mood_by,  mood_by_set,
  container) {

  const header_wrapper = document.createElement("div");
  header_wrapper.className = "header-wrapper";
  const header_inner = document.createElement("div");
  header_inner.className = "header-inner";

  const header_title_wrapper = document.createElement("div");
  const add_title_class = (title_is === "title") ? "bg-fall" : "bg-dn";
  header_title_wrapper.className = "header-title-wrapper" + ' ' + add_title_class;
  header_title_wrapper.id = "header-title-wrapper";
  const header_title_inner = document.createElement("div");
  header_title_inner.className = "header-title-inner subtitle text-ellipsis";
  header_title_inner.textContent = "Internet Archive Item";
  header_title_wrapper.appendChild(header_title_inner);
  //
  header_title_wrapper.setAttribute("role", "button");
  header_title_wrapper.tabIndex = 0;
  //
  header_title_wrapper.onclick = () => {
    title_is_set(title_is === "title" ? "identifier" : "title");
    save_focus("header-title-wrapper");
    process_filter();
  };

  const header_stat_prev_wrapper = document.createElement("div");
  const add_stat_prev_class = (show_by === "old-23-7") ? "bg-grow" : "bg-up";
  header_stat_prev_wrapper.className = "header-stat-wrapper" + ' ' + add_stat_prev_class;
  header_stat_prev_wrapper.id = "header-stat-prev-wrapper";
  const header_stat_prev_inner = document.createElement("div");
  header_stat_prev_inner.className = "header-stat-inner subtitle";
  header_stat_prev_inner.textContent = "Prev";
  header_stat_prev_wrapper.appendChild(header_stat_prev_inner);
  //
  header_stat_prev_wrapper.setAttribute("role", "button");
  header_stat_prev_wrapper.tabIndex = 0;
  //
  header_stat_prev_wrapper.onclick = () => {
    show_by_set(show_by === "old-23-7" ? "all-30-7" : "old-23-7");
    save_focus("header-stat-prev-wrapper");
    process_filter();
  };

  const header_stat_curr_wrapper = document.createElement("div");
  const add_stat_curr_class = (sort_by === "ratio") ? "bg-fall" : "bg-dn";
  header_stat_curr_wrapper.className = "header-stat-wrapper" + ' ' + add_stat_curr_class;
  header_stat_curr_wrapper.id = "header-stat-curr-wrapper";
  const header_stat_curr_inner = document.createElement("div");
  header_stat_curr_inner.className = "header-stat-inner subtitle";
  header_stat_curr_inner.textContent = "Curr";
  header_stat_curr_wrapper.appendChild(header_stat_curr_inner);
  //
  header_stat_curr_wrapper.setAttribute("role", "button");
  header_stat_curr_wrapper.tabIndex = 0;
  //
  header_stat_curr_wrapper.onclick = () => {
    sort_by_set(sort_by === "ratio" ? "views" : "ratio");
    save_focus("header-stat-curr-wrapper");
    process_filter();
  };

  const header_stat_grow_wrapper = document.createElement("div");
  const add_stat_grow_class = (mood_by === "same-signs") ? "bg-grow" : "bg-up";
  header_stat_grow_wrapper.className = "header-grow-wrapper" + ' ' + add_stat_grow_class;
  header_stat_grow_wrapper.id = "header-stat-grow-wrapper";
  const header_stat_grow_inner = document.createElement("div");
  header_stat_grow_inner.className = "header-grow-inner subtitle";
  header_stat_grow_inner.innerHTML = "&plus;&hairsp;&minus;";
  header_stat_grow_wrapper.appendChild(header_stat_grow_inner);
  //
  header_stat_grow_wrapper.setAttribute("role", "button");
  header_stat_grow_wrapper.tabIndex = 0;
  //
  header_stat_grow_wrapper.onclick = () => {
    mood_by_set(mood_by === "same-signs" ? "diff-signs" : "same-signs");
    save_focus("header-stat-grow-wrapper");
    process_filter();
  };

  set_chain_arrows_line    ([header_title_wrapper,
                             header_stat_prev_wrapper,
                             header_stat_curr_wrapper,
                             header_stat_grow_wrapper], "horz");

  header_inner  .appendChild(header_title_wrapper    );
  header_inner  .appendChild(header_stat_prev_wrapper);
  header_inner  .appendChild(header_stat_curr_wrapper);
  header_inner  .appendChild(header_stat_grow_wrapper);
  //
  header_wrapper.appendChild(header_inner  );
  container     .appendChild(header_wrapper);
}

//
// Items
//

// Stat data sizes and templates
const views_length = 6; // 123456
const  days_length = 5; // 12345
const ratio_length = 7; // 123.567

const  stat_length = views_length + 2 + days_length + 2 + ratio_length; // Used in CSS as 22ch
const  stat_empty  = "".padStart(stat_length);

const  stat_sl     = " /";
const  stat_30     = " /   30 =";
const  stat_23     = " /   23 =";
const  stat_7      = " /    7 =";
const  stat_eq     =        " =";

function compose_items(results_curr_exp, curr_exp_totals, map_prev, show_by, mood_by) {
  const show_by_old = (show_by === "old-23-7"); // Else by "all-30-7"

  ////////////////////////
  // Log scaling of gauges
  //
  const max_ratio      = Math.max(curr_exp_totals.max_ratio_old, curr_exp_totals.max_ratio_all);
  const max_favorites  = curr_exp_totals.max_favorites;
  //
  const base_ratio     = (max_ratio     <= 0) ? 0 : 100 / Math.log(max_ratio     + 1);
  const base_favorites = (max_favorites <= 0) ? 0 : 100 / Math.log(max_favorites + 1);
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
  const curr_length    = results_curr_exp.length;
//const curr_log_base  = Math.log(curr_length); // For length === 1 is checked below, 0 was checked above
  //
  // Substantial changes marking: horizontal impact of old      from prev to     curr
  // Substantial changes marking: vertical   impact of 23 and 7 into all  within curr
  //
  const horz_decay     = 20;  // For scale from top: 1 to bottom: 1/20
//const horz_log_steep = 1;   // No steep here, just log
  const horz_sig_base  = 0.1;
  const horz_sig_steep = 2;
  const horz_sig_min   = 1 / (1 + Math.exp((horz_sig_base - 0) * horz_sig_steep));
  const horz_sig_max   = 1 / (1 + Math.exp((horz_sig_base - 1) * horz_sig_steep));
  const horz_curr_prev = [];  // Of curr_length anyway
  //
  const vert_decay     = 20;  // Scale divisor: 1 to 20
//const vert_log_steep = 1;   // No steep here, just log
  const vert_sig_base  = 0.1;
  const vert_sig_steep = 2;
  const vert_sig_min   = 1 / (1 + Math.exp((vert_sig_base - 0) * vert_sig_steep));
  const vert_sig_max   = 1 / (1 + Math.exp((vert_sig_base - 1) * vert_sig_steep));
  const vert_all_old   = [];  // Of curr_length anyway
  //
  // Mark rank changes
  // Mark mood changes
  //
  const rank_decay     = 160; // Scale divisor: 1 to 160
//const rank_log_steep = 3;   // To more than log prioritize top items
  const rank_sig_base  = 0.2;
  const rank_sig_steep = 8;
  const rank_sig_min   = 1 / (1 + Math.exp((rank_sig_base - 0) * rank_sig_steep));
  const rank_sig_max   = 1 / (1 + Math.exp((rank_sig_base - 1) * rank_sig_steep));
  const rank_up_dn     = [];  // Of curr_length anyway
  //
  const mood_decay     = 30;  // Scale divisor: 1 to 30
//const mood_log_steep = 2;   // To more than log prioritize top items
  const mood_sig_base  = 0.1;
  const mood_sig_steep = 3;
  const mood_sig_min   = 1 / (1 + Math.exp((mood_sig_base - 0) * mood_sig_steep));
  const mood_sig_max   = 1 / (1 + Math.exp((mood_sig_base - 1) * mood_sig_steep));
  const mood_pos_neg   = [];  // Of curr_length anyway
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
    if (!item.no_prev) {
      if (show_by_old) {
        _prev._old = item_prev.views_old.toString().padStart(views_length) + stat_sl +
                     item_prev. days_old.toString().padStart( days_length) + stat_eq +
                     item_prev.ratio_old.toFixed(3).padStart(ratio_length);
        _prev._23  = item_prev.views_23 .toString().padStart(views_length) + stat_23 +
                     item_prev.ratio_23 .toFixed(3).padStart(ratio_length);
        _prev._7   = item_prev.views_7  .toString().padStart(views_length) + stat_7  +
                     item_prev.ratio_7  .toFixed(3).padStart(ratio_length);
      }
      else {
        _prev._old = item_prev.views_all.toString().padStart(views_length) + stat_sl +
                     item_prev. days_all.toString().padStart( days_length) + stat_eq +
                     item_prev.ratio_all.toFixed(3).padStart(ratio_length);
        _prev._23  = item_prev.views_30 .toString().padStart(views_length) + stat_30 +
                     item_prev.ratio_30 .toFixed(3).padStart(ratio_length);
        _prev._7   = item_prev.views_7  .toString().padStart(views_length) + stat_7  +
                     item_prev.ratio_7  .toFixed(3).padStart(ratio_length);
      }
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
      if (show_by_old) {
        _curr._old = item.views_old.toString().padStart(views_length) + stat_sl +
                     item. days_old.toString().padStart( days_length) + stat_eq +
                     item.ratio_old.toFixed(3).padStart(ratio_length);
        _curr._23  = item.views_23 .toString().padStart(views_length) + stat_23 +
                     item.ratio_23 .toFixed(3).padStart(ratio_length);
        _curr._7   = item.views_7  .toString().padStart(views_length) + stat_7  +
                     item.ratio_7  .toFixed(3).padStart(ratio_length);
      }
      else {
        _curr._old = item.views_all.toString().padStart(views_length) + stat_sl +
                     item. days_all.toString().padStart( days_length) + stat_eq +
                     item.ratio_all.toFixed(3).padStart(ratio_length);
        _curr._23  = item.views_30 .toString().padStart(views_length) + stat_30 +
                     item.ratio_30 .toFixed(3).padStart(ratio_length);
        _curr._7   = item.views_7  .toString().padStart(views_length) + stat_7  +
                     item.ratio_7  .toFixed(3).padStart(ratio_length);
      }
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
    if (item.is_both) { // Item is markable
      let horz_impact = 0;
      if (show_by_old) {
        horz_impact = (item.ratio_old && item_prev.ratio_old)
            ? Math.log(item.ratio_old /  item_prev.ratio_old)
            : 0;
      }
      else {
        horz_impact = (item.ratio_all && item_prev.ratio_all)
            ? Math.log(item.ratio_all /  item_prev.ratio_all)
            : 0;
      }
      if (horz_impact) {
//      const horz_scale  = get_scale_log(index_curr, curr_log_base, horz_log_steep, horz_decay);
        const horz_scale  = get_scale_sig(index_curr, curr_length,
          horz_sig_base, horz_sig_steep, horz_decay, horz_sig_min, horz_sig_max);
        const horz_factor = horz_decay / horz_scale; // More suitable for log(close-to-one) result
        horz_change = horz_impact * horz_factor;
        item.horz_change  = horz_change; // Needed in markable item only, and if not 0 only
        item.horz_details =
          format_nowrap("Horizontal impact: " + format_num_sign(horz_impact.toFixed(6)) + ',') + ' ' +
          format_nowrap("Scale multiplier: "  + format_number  (horz_factor.toFixed(6)) + ',') + ' ' +
          format_nowrap("Scaled: "            + format_num_sign(horz_change.toFixed(6)));
      }
    }
    horz_curr_prev.push({ item, value:horz_change }); // Needed in array anyway
    //
    // Vert change
    //
    let vert_change = 0;
    if (!item.is_prev) { // Item is markable
      const vert_impact =
                  (item.ratio_all && item.ratio_old) // The same change for both show_by values
        ? Math.log(item.ratio_all /  item.ratio_old) // "30 / old" not suits here because of
        : 0;                                         // Possible zeroes in ratio_30 values
      if (vert_impact) {
//      const vert_scale  = get_scale_log(index_curr, curr_log_base, vert_log_steep, vert_decay);
        const vert_scale  = get_scale_sig(index_curr, curr_length,
          vert_sig_base, vert_sig_steep, vert_decay, vert_sig_min, vert_sig_max);
        const vert_factor = vert_decay / vert_scale; // More suitable for log(close-to-one) result
        vert_change = vert_impact * vert_factor;
        item.vert_change  = vert_change; // Needed in markable item only, and if not 0 only
        item.vert_details =
          format_nowrap("Vertical impact: "  + format_num_sign(vert_impact.toFixed(6)) + ',') + ' ' +
          format_nowrap("Scale multiplier: " + format_number  (vert_factor.toFixed(6)) + ',') + ' ' +
          format_nowrap("Scaled: "           + format_num_sign(vert_change.toFixed(6)));
      }
    }
    vert_all_old.push({ item, value:vert_change }); // Needed in array anyway

    //////////////////////////////
    // Rank change, 0 is no change
    //
    let   rank_change = 0;
    const rank_diff = item.index_prev - index_curr; // No abs
    if   (rank_diff) { // Also if length === 1 then index_prev === index_curr
      if (item.is_both) { // Item is markable
//      const rank_scale  = get_scale_log(index_curr, curr_log_base, rank_log_steep, rank_decay);
        const rank_scale  = get_scale_sig(index_curr, curr_length,
          rank_sig_base, rank_sig_steep, rank_decay, rank_sig_min, rank_sig_max);
        rank_change       = rank_diff / rank_scale;
        item.rank_change  = rank_change; // Needed in markable item only, and if rank_diff is not 0 only
        item.rank_details =
          format_nowrap("Rank change: "   + format_num_sign(rank_diff)              + ','  + ' ' +
                        "from "           + format_number  (item.index_prev + 1)           + ' ' +
                        "to "             + format_number  (     index_curr + 1)    + ',') + ' ' +
          format_nowrap("Scale divisor: " + format_number  (rank_scale .toFixed(6)) + ',') + ' ' +
          format_nowrap("Scaled: "        + format_num_sign(rank_change.toFixed(6)));
      }
    }
    rank_up_dn.push({ item, value:rank_change }); // Needed in array anyway

    //////////////////////////////
    // Grow and Mood, 0 is no Mood
    //
    let   _mood = 0;
    const _grow = {}; // _old, _23, _7 [, _mood]
    //
    if (item.is_both) { // Item is markable
      const grow_old = show_by_old
                     ? get_grow_ratio(item_prev.ratio_old, item.ratio_old)
                     : get_grow_ratio(item_prev.ratio_all, item.ratio_all);
      const grow_23  = show_by_old
                     ? get_grow_fixed(item_prev.views_23,  item.views_23 )
                     : get_grow_fixed(item_prev.views_30,  item.views_30 );
      const grow_7   = get_grow_fixed(item_prev.views_7,   item.views_7  );

      _grow._old = grow_old;
      _grow._23  = grow_23;
      _grow._7   = grow_7;

      const grow_mood = get_grow_mood(grow_old, grow_23, grow_7, mood_by);
      if   (grow_mood) {
//      const mood_scale = get_scale_log(index_curr, curr_log_base, mood_log_steep, mood_decay);
        const mood_scale = get_scale_sig(index_curr, curr_length,
          mood_sig_base, mood_sig_steep, mood_decay, mood_sig_min, mood_sig_max);
        _mood = grow_mood / mood_scale;
        item.mood_details =
          format_nowrap("Mood: "          + format_num_sign( grow_mood)             + ',') + ' ' +
          format_nowrap("Scale divisor: " + format_number  ( mood_scale.toFixed(6)) + ',') + ' ' +
          format_nowrap("Scaled: "        + format_num_sign(_mood      .toFixed(6)));
      }
      _grow._mood = _mood; // Needed in markable item only
    }
    else {
      _grow._old = "   ";
      _grow._23  = "   ";
      _grow._7   = "   ";
    }
    item.grow = _grow;
    mood_pos_neg.push({ item, value:_mood }); // Needed in array anyway

    /////////
    // Gauges
    //
    const _gauges = {};
    let   _gauges_set = false;
    if (!item.no_prev) {
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
  const horz_marks_cnt = Math.floor(Math.pow(horz_curr_prev .length, 0.551) / 1.841);
  const horz_marks     =  get_marks         (horz_curr_prev, horz_marks_cnt, 0);
//const mark_grow_old  = horz_marks.above.val;
//const mark_fall_old  = horz_marks.below.val;

  // 1:0, 3:0, 4:1, 10:1, 20:2, 30:3, 50:3, 75:4, 100:5, 125:6, 150:6, 200: 7, 300: 9, 500:11, 800:14, 826:14
  const vert_marks_cnt = Math.floor(Math.pow(vert_all_old   .length, 0.482) / 1.699);
  const vert_marks     =  get_marks         (vert_all_old,   vert_marks_cnt, 0);
//const mark_grow_23_7 = vert_marks.above.val;
//const mark_fall_23_7 = vert_marks.below.val;

  // 1:0, 3:0, 4:1, 10:1, 20:2, 30:3, 50:4, 75:5, 100:6, 125:7, 150:8, 200:10, 300:12, 500:16, 800:21, 826:21
  const rank_marks_cnt = Math.floor(Math.pow(rank_up_dn     .length, 0.551) / 1.841);
  const rank_marks     =  get_marks         (rank_up_dn,     rank_marks_cnt, 0);
//const mark_rank_up   = rank_marks.above.val;
//const mark_rank_dn   = rank_marks.below.val;

  // 1:1, 3:1, 4:1, 10:2, 20:2, 30:3, 50:4, 75:4, 100:5, 125:5, 150:6, 200: 7, 300: 8, 500:10, 800:12, 826:12
  const mood_marks_cnt = Math.ceil (Math.pow(mood_pos_neg   .length, 0.487) / 2.195);
  const mood_marks     =  get_marks         (mood_pos_neg,   mood_marks_cnt, 0);
//const mark_mood_pos  = mood_marks.above.val;
//const mark_mood_neg  = mood_marks.below.val;

  set_marked_ordinals(
    horz_curr_prev,
    horz_marks,
    (item)          => item.horz_details,
    (item, details) => item.horz_details = details);

  set_marked_ordinals(
    vert_all_old,
    vert_marks,
    (item)          => item.vert_details,
    (item, details) => item.vert_details = details);

  set_marked_ordinals(
    rank_up_dn,
    rank_marks,
    (item)          => item.rank_details,
    (item, details) => item.rank_details = details);

  set_marked_ordinals(
    mood_pos_neg,
    mood_marks,
    (item)          => item.mood_details,
    (item, details) => item.mood_details = details);

  return {
    horz_marks,
    vert_marks,
    rank_marks,
    mood_marks
  };
}

function set_details_ordinal(item, details_get, details_set, ordinal) {
  const   term = "</span>";
  let  details = details_get(item);
  if (!details.endsWith(term)) return;

  details = details.slice(0, -term.length) + ordinal + term;
  details_set(item, details);
}

function set_marked_ordinals(marked, marks, details_get, details_set) {
  const len = marked.length;
  const { above, below } = marks;

  if (above.cnt) {
    for (let i = 0; i < above.cnt; i++) {
      const item = marked[len - 1 - i].item; // From end to beg
      const ordinal = ", " + format_num_ord(i + 1);

      set_details_ordinal(item, details_get, details_set, ordinal);
    }
  }

  if (below.cnt) {
    for (let i = 0; i < below.cnt; i++) {
      const item = marked[i].item; // From beg to end
      const ordinal = ", " + format_num_ord(-(i + 1));

      set_details_ordinal(item, details_get, details_set, ordinal);
    }
  }
}

/* Item details */

let details_div_inners = {};

function clr_details_div_inners() { details_div_inners = {}; }

function item_details(index, wrapper, inner, details_a, details_b) {
  const details = details_a && details_b ? details_a + '\n' + details_b
                : details_a              ? details_a
                :              details_b ?                    details_b : "No details";

  let details_div = wrapper.querySelector(".item-details");
  if (details_div) {
    if (details_div_inners[index] !== details) {
        details_div.innerHTML       = details;
        details_div_inners[index]   = details;
        details_div.classList.remove("collapse");
    }
    else {
      if (details_div.classList.toggle("collapse")) return; // Collapsed
    }
  }
  else {
    details_div = document.createElement("div");
    details_div.className     = "item-details text-right text-comment";
    details_div.innerHTML     = details;
    details_div_inners[index] = details;
    inner.after(details_div);
  }

  details_div.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// EOF






