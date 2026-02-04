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
  if (!curr && !prev) return "   ";
  if (!curr || !prev) return "ooo";

  const ratio = curr / prev;

  if   (ratio === 1)  return "   ";

  if   (ratio > 1) {
    if (ratio < 1.01) return "+  ";
    if (ratio < 1.03) return "++ ";
    if (ratio < 1.06) return "+++";

    if (ratio < 1.12) return "^  ";
    if (ratio < 1.24) return "^^ ";
                      return "^^^";
  }
  //    ratio < 1
  if   (ratio > 0.99) return "-  ";
  if   (ratio > 0.98) return "-- ";
  if   (ratio > 0.96) return "---";

  if   (ratio > 0.94) return "v  ";
  if   (ratio > 0.90) return "vv ";
                      return "vvv";
}

function get_grow_fixed(curr, prev) {
  const diff = curr - prev;
  if   (diff === 0)     return "   ";

  const diff_abs = Math.abs(diff);

  if   (diff > 0) {
    if (diff_abs === 1) return "+  ";
    if (diff_abs === 2) return "++ ";
    if (diff_abs === 3) return "+++";

    if (diff_abs <=  5) return "^  ";
    if (diff_abs <= 10) return "^^ ";
                        return "^^^";
  }
  //    diff < 0
  if   (diff_abs === 1) return "-  ";
  if   (diff_abs === 2) return "-- ";
  if   (diff_abs === 3) return "---";

  if   (diff_abs <=  5) return "v  ";
  if   (diff_abs <= 10) return "vv ";
                        return "vvv";
}

const grow_values = {
  "^^^":  18,
  "^^ ":  12,
  "^  ":   6,
  "+++":   3,
  "++ ":   2,
  "+  ":   1,
  "   ":   0,
  "-  ":  -1,
  "-- ":  -2,
  "---":  -3,
  "v  ":  -6,
  "vv ": -12,
  "vvv": -18
};

function get_grow_value(grow) {
  return grow_values[grow] || 0;
}

function get_grow_mood(grow_old, grow_23, grow_7) {
  const v_old = get_grow_value(grow_old);
  const v_23  = get_grow_value(grow_23 );
  const v_7   = get_grow_value(grow_7  );

  if ((v_old >= 0) && (v_23 >= 0) && (v_7 >= 0)) return v_old + v_23 + v_7;
  if ((v_old <= 0) && (v_23 <= 0) && (v_7 <= 0)) return v_old + v_23 + v_7;

  return 0;
}

/* Substantial changes marking */

function get_marks(rel, cnt, mid) {
  if   (cnt <= 0)      return { above: { cnt: 0, val: +Infinity }, below: { cnt: 0, val: -Infinity } };
  const rel_len = rel.length;
  if   (rel_len === 0) return { above: { cnt: 0, val: +Infinity }, below: { cnt: 0, val: -Infinity } };
  if   (rel_len === 1) {
    const val = rel[0];
    if   (val > mid)   return { above: { cnt: 1, val            }, below: { cnt: 0, val: -Infinity } };
    if   (val < mid)   return { above: { cnt: 0, val: +Infinity }, below: { cnt: 1, val            } };
                       return { above: { cnt: 0, val: +Infinity }, below: { cnt: 0, val: -Infinity } };
  }
  if ((cnt + cnt) > rel_len) {
    cnt = Math.floor(rel_len / 2);
  }
  rel.sort((above, below) => above - below); // Ascending

  let above_cnt = cnt;
  let below_cnt = cnt;
  let above_idx = rel_len - cnt;
  let below_idx = cnt     -   1;
  let above_val = rel[above_idx];
  let below_val = rel[below_idx];

  while (above_val <= mid) { // Above value is in below side, or at mid
    below_idx++; // Move below side to right
    below_val = rel[below_idx]; // Update its value
    below_cnt++; // Count it

    above_cnt--; // Use place
    if (!above_cnt) break; // Above side is empty
    above_idx++; // Move above side to right
    above_val = rel[above_idx]; // Update its value
  }
  while (below_val >= mid) { // Below value is in above side, or at mid
    if (above_cnt) { // Above side is not empty
      if (rel[above_idx - 1] > mid) { // And something is present there to add to above side
        above_val = rel[above_idx - 1]; // Update its value
        above_cnt++; // Count it
        above_idx--; // Move above side to left
      }
    }
    below_cnt--; // Use place
    if (!below_cnt) break; // Below side is empty
    below_idx--; // Move below side to left
    below_val = rel[below_idx]; // Update its value
  }
  // Possible array of all mid's is handled in return
  // Because both above_cnt and below_cnt will be zeroes
  return { above: { cnt: above_cnt, val: above_cnt ? above_val : +Infinity },
           below: { cnt: below_cnt, val: below_cnt ? below_val : -Infinity }
  };
}

// index: 0..length-1, base: log(length), steep: 1..9, decay: max value (min value: 1)
function get_scale_log(index, base, steep, decay) {
  if (base === 0) return 1; // length === 1 (length === 0 cannot be here)

  const i_norm = Math.log(index + 1) / base; // 0..1
  const o_norm = Math.pow(i_norm, steep);   // 0..1
  const scale  = o_norm * (decay - 1) + 1; // 1..decay

  return scale;
}

// index: 0..length-1, base: 0..1 (of length), steep: 1..9, decay: max value (min value: 1)
// sig_* are precomputed
function get_scale_sig(index, length, base, steep, decay, sig_min, sig_max) {
  if (length === 1) return 1; // length === 0 cannot be here

  const i_norm     = index / (length - 1); // 0..1
//const sig_min    = 1 / (1 + Math.exp((base - 0)      * steep));  // Passed
  const sig_i_norm = 1 / (1 + Math.exp((base - i_norm) * steep));
//const sig_max    = 1 / (1 + Math.exp((base - 1)      * steep));  // Passed
  const o_norm     = (sig_i_norm - sig_min) / (sig_max - sig_min); // 0..1
  const scale      = o_norm * (decay - 1) + 1; // 1..decay

  return scale;
}

/* Stats */

function get_totals(results) {
  const totals = { audio: 0, video: 0, bytes: 0, views: 0, favorites: 0, favorited: 0,
                   max_favorites: 0, max_ratio_old: 0, max_ratio_all: 0 };

  for (let i = 0; i < results.length; i++) {
    const item = results[i];

    if      (item.mediatype === "movies") totals.video++; // Most frequent type
    else if (item.mediatype === "audio" ) totals.audio++;

    totals.bytes += item.item_size;
    totals.views += item.views_all;

    totals.favorites +=  item.favorites;
    totals.favorited += (item.favorites > 0);

    if (totals.max_favorites < item.favorites) {
        totals.max_favorites = item.favorites; }

    if (totals.max_ratio_old < item.ratio_old) {
        totals.max_ratio_old = item.ratio_old; }

    if (totals.max_ratio_all < item.ratio_all) {
        totals.max_ratio_all = item.ratio_all; }
  }

  return totals;
}

/* Formatting */

// bytes: non-negative integer
function format_bytes(bytes) {
  if (bytes < 1024) return bytes + ' B';

  const units = ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'];
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

// number: non-negative integer
function format_number(number) {
  const n_str = number.toString();
  const n_len = n_str.length;
  let   n_ind = (n_len - 1) % 3 + 1;
  let   o_str = n_str.substring(0, n_ind);

  while(n_ind < n_len) { // \u2009 is &thinsp;
    o_str += '\u2009' + n_str.substring(n_ind, n_ind + 3);
    n_ind += 3;
  }

  return o_str;
}

// num: non-negative integer
function format_num_str(num, str) {
  return format_number(num) + ' ' + str + (num === 1 ? "" : 's');
}

const nowrap_beg = '<span class="text-nowrap">';
const nowrap_end = '</span>';
//
function format_nowrap(str) {
  return nowrap_beg + str + nowrap_end;
}

function cap_first(str) {
  return str.at(0).toUpperCase() + str.slice(1);
}

function low_first(str) {
  return str.at(0).toLowerCase() + str.slice(1);
}

/* Sorting */

function sort_results(results, show_by, sort_by) {
  let field_1 = null;
  let field_2 = null;
  let field_3 = null;

  switch (show_by + sort_by) {
    case "old-23-7" + "ratio": field_1 = "ratio_old"; field_2 = "ratio_23"; field_3 = "ratio_7"; break;
    case "old-23-7" + "views": field_1 = "views_old"; field_2 = "views_23"; field_3 = "views_7"; break;
    case "all-30-7" + "ratio": field_1 = "ratio_all"; field_2 = "ratio_30"; field_3 = "ratio_7"; break;
    case "all-30-7" + "views": field_1 = "views_all"; field_2 = "views_30"; field_3 = "views_7"; break;

    default: return; // Unknown parameters
  }

  // Descending by value: max >> min
  //  Ascending by title:   A >> Z
  results.sort((above, below) => above[field_1] !== below[field_1] ? below[field_1] - above[field_1]
                               : above[field_2] !== below[field_2] ? below[field_2] - above[field_2]
                               : above[field_3] !== below[field_3] ? below[field_3] - above[field_3]
                               : above.title.localeCompare(below.title));
}

/* Render */

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
    format_nowrap(cap_first(what) + ' ' +
      '<span ' +
      'role="button" style="cursor: pointer;" tabindex="0" ' +
      'onkeydown="if ((event.key === \'Enter\') || (event.key === \' \')) event.preventDefault();" ' +
      'onkeyup  ="if ((event.key === \'Enter\') || (event.key === \' \')) ' +
                 'date_change_menu(event, \'' + what + '\');" ' +
      'onclick  ="date_change_menu(event, \'' + what + '\')" ' +
      '>' + date + '</span>' + ':')            + '&ensp;' +
    format_nowrap('Min ' + min          + ',') + '&ensp;' +
    format_nowrap('10% ' + percentile10 + ',') + '&ensp;' +
    format_nowrap('25% ' + quartile1    + ',') + '&ensp;' +
    format_nowrap('50% ' + median       + ',') + '&ensp;' +
    format_nowrap('75% ' + quartile3    + ',') + '&ensp;' +
    format_nowrap('90% ' + percentile90 + ',') + '&ensp;' +
    format_nowrap('Max ' + max);

  container.appendChild(stats_text);
}

/* Compose */

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

function compose_items(results_curr_exp, curr_exp_totals, map_prev, show_by) {
  const show_by_old = (show_by === "old-23-7"); // Else by "all-30-7"

  ////////////////////////
  // Log scaling of gauges
  //
  const max_ratio      = Math.max(curr_exp_totals.max_ratio_old, curr_exp_totals.max_ratio_all);
  const max_favorites  = curr_exp_totals.max_favorites;
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
      if (show_by_old) {
        horz_change = (item.ratio_old && item_prev.ratio_old)
            ? Math.log(item.ratio_old /  item_prev.ratio_old)
            : 0;
      }
      else {
        horz_change = (item.ratio_all && item_prev.ratio_all)
            ? Math.log(item.ratio_all /  item_prev.ratio_all)
            : 0;
      }
      if (horz_change) {
//      const horz_scale = get_scale_log(index_curr, curr_log_base, horz_log_steep, horz_decay);
        const horz_scale = get_scale_sig(index_curr, curr_length,
          horz_sig_base, horz_sig_steep, horz_decay, horz_sig_min, horz_sig_max);
        horz_change *= (horz_decay / horz_scale); // More suitable for log(close-to-one) result
        item.horz_change = horz_change; // Needed in markable item only, and if not 0 only
      }
    }
    horz_curr_prev.push(horz_change); // Needed in array anyway
    //
    // Vert change
    //
    let vert_change = 0;
    if (!item.is_prev) { // Item is markable
      vert_change = (item.ratio_all && item.ratio_old) // The same change for both show_by values
          ? Math.log(item.ratio_all /  item.ratio_old) // "30 / old" not suits here because of
          : 0;                                         // possible zeroes in ratio_30 values
      if (vert_change) {
//      const vert_scale = get_scale_log(index_curr, curr_log_base, vert_log_steep, vert_decay);
        const vert_scale = get_scale_sig(index_curr, curr_length,
          vert_sig_base, vert_sig_steep, vert_decay, vert_sig_min, vert_sig_max);
        vert_change *= (vert_decay / vert_scale); // More suitable for log(close-to-one) result
        item.vert_change = vert_change; // Needed in markable item only, and if not 0 only
      }
    }
    vert_all_old.push(vert_change); // Needed in array anyway

    //////////////////////////////
    // Rank change, 0 is no change
    //
    let   rank_change = 0;
    const rank_diff = item.index_prev - index_curr; // No abs
    if   (rank_diff) { // Also if length === 1 then index_prev === index_curr
      if (item.is_both) { // Item is markable
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
    if (item.is_both) { // Item is markable
      const grow_old = show_by_old
                     ? get_grow_ratio(item.ratio_old, item_prev.ratio_old)
                     : get_grow_ratio(item.ratio_all, item_prev.ratio_all);
      const grow_23  = show_by_old
                     ? get_grow_fixed(item.views_23 , item_prev.views_23 )
                     : get_grow_fixed(item.views_30 , item_prev.views_30 );
      const grow_7   = get_grow_fixed(item.views_7  , item_prev.views_7  );

      _grow._old = grow_old;
      _grow._23  = grow_23;
      _grow._7   = grow_7;

      const grow_mood = get_grow_mood(grow_old, grow_23, grow_7);
      if   (grow_mood) {
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

  return {
    horz_marks,
    vert_marks,
    rank_marks,
    mood_marks
  };
}

// EOF






