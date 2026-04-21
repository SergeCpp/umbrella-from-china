/* Focus State */

let saved_focus_id = null;

function save_focus (id) {
    saved_focus_id = id;
}

function restore_focus() {
  if (!saved_focus_id) return;

  const elem = document.getElementById(saved_focus_id);
  if   (elem) elem.focus({ preventScroll: true });

  saved_focus_id = null;
}

/* Chain Arrows : China Rose */

function set_elem_keyup(elem) {
  elem.onkeyup = (event) => {
    const key = event.key;
    if ((key === 'Enter') || (key === ' ')) {
      elem.click();
    }
  };
}

function set_elem_keydown_line(elem, elem_prev, elem_next, elem_beg, elem_end, direction) {
  const [ key_prev,    key_next   ] = direction === "horz"
      ? ['ArrowLeft', 'ArrowRight'] : direction === "vert"
      ? ['ArrowUp',   'ArrowDown' ] : [];

  elem.onkeydown = (event) => {
    const key = event.key;
    if ((key === 'Enter') || (key === ' ')) {
      event.preventDefault();
      return;
    }

    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return;

    let elem_go = null;

    switch (key) {
      case key_prev: elem_go = event.ctrlKey ? elem_beg : elem_prev; break;
      case key_next: elem_go = event.ctrlKey ? elem_end : elem_next; break;
    }

    if (elem_go && (elem_go !== elem)) {
      event.preventDefault();
      elem_go.focus();
    }
  };
}

function set_chain_keys_line(chain, direction) {
  const count = chain.length;

  for (let index = 0; index < count; index++) {
    const elem = chain[index];

    set_elem_keyup       (elem);
    set_elem_keydown_line(elem, chain[(index - 1  + count)
                                                  % count],
                                chain[(index + 1) % count],
                                chain[         0],
                                chain[ count - 1],
                                direction);
  }
}

// index: in chain
// chain: in book read order (left to right, down, left to right, etc.)
// coord: matches chain
function set_elem_arrows_plane(index, chain, coord) {
  const count  = chain.length;

  const elem   = chain[index];
  const elem_x = coord[index].x;
  const elem_y = coord[index].y;

  let to_left  = null;
  let to_right = null;
  let to_up    = null;
  let to_down  = null;

  const tolerance_x = 3;
  const tolerance_y = 6;

  // Left
  if (index > 0)
    if ((coord[index - 1].x < elem_x) && (Math.abs(coord[index - 1].y - elem_y) <= tolerance_y))
      to_left = chain[index - 1]; // On the same row (no tolerance_x usage here)

  if (!to_left) { // Else check both prev and next rows
    let prev_i = -1;
    let next_i = -1;

    // Prev row ends at index - 1 (because to_left not found on the same row)
    for (let i = index - 1; i >= 0; i--) { // Find first to left from elem
      if ((elem_x - coord[i].x) > tolerance_x) {
        prev_i = i;
        break;
      }
    }

    for (let i = index + 1; i < count; i++) { // Next row find and check
      if ((elem_x - coord[i].x) <= tolerance_x) continue;

      // Next suitable row found (can be after immediate next row)
      next_i = i; // First candidate

      for (let j = i; j < count; j++) {
        if ((elem_x - coord[j].x) <= tolerance_x) break; // Succession of "lefts" ended
        if ((coord[j].y - coord[next_i].y) > tolerance_y) break; // It is row after found

        next_i = j; // Each further "left" is closer to elem
      }

      break; // Next row processed
    }

    if ((prev_i !== -1) && (next_i !== -1)) { // To more right of found or to closer vertically to elem
      to_left = ( coord[prev_i].x           -           coord[next_i].x ) > tolerance_x
              ?   chain[prev_i]
              : ( coord[next_i].x           -           coord[prev_i].x ) > tolerance_x
              ?   chain[next_i]
              : ((coord[next_i].y - elem_y) - (elem_y - coord[prev_i].y)) > tolerance_y
              ?   chain[prev_i]             :           chain[next_i];
    }
    else if (prev_i !== -1) to_left = chain[prev_i];
    else if (next_i !== -1) to_left = chain[next_i];
  }

  // Right
  if (index < (count - 1))
    if ((coord[index + 1].x > elem_x) && (Math.abs(coord[index + 1].y - elem_y) <= tolerance_y))
      to_right = chain[index + 1]; // On the same row (no tolerance_x usage here)

  if (!to_right) { // Else check both prev and next rows
    let prev_i = -1;
    let next_i = -1;

    // Next row begins at index + 1 (because to_right not found on the same row)
    for (let i = index + 1; i < count; i++) { // Find first to right from elem
      if ((coord[i].x - elem_x) > tolerance_x) {
        next_i = i;
        break;
      }
    }

    for (let i = index - 1; i >= 0; i--) { // Prev row find and check
      if ((coord[i].x - elem_x) <= tolerance_x) continue;

      // Prev suitable row found (can be before immediate prev row)
      prev_i = i; // First candidate

      for (let j = i; j >= 0; j--) {
        if ((coord[j].x - elem_x) <= tolerance_x) break; // Succession of "rights" ended
        if ((coord[prev_i].y - coord[j].y) > tolerance_y) break; // It is row before found

        prev_i = j; // Each further "right" is closer to elem
      }

      break; // Prev row processed
    }

    if ((prev_i !== -1) && (next_i !== -1)) { // To more left of found or to closer vertically to elem
      to_right = ( coord[next_i].x           -           coord[prev_i].x ) > tolerance_x
               ?   chain[prev_i]
               : ( coord[prev_i].x           -           coord[next_i].x ) > tolerance_x
               ?   chain[next_i]
               : ((coord[next_i].y - elem_y) - (elem_y - coord[prev_i].y)) > tolerance_y
               ?   chain[prev_i]             :           chain[next_i];
    }
    else if (prev_i !== -1) to_right = chain[prev_i];
    else if (next_i !== -1) to_right = chain[next_i];
  }

  // Up
  for (let i = index - 1; i >= 0; i--) {
    if (coord[i].y < (elem_y - tolerance_y)) { // Prev row found
      let up_i = i; // First candidate

      for (let j = i - 1; j >= 0; j--) {
        if ((coord[up_i].y - coord[j].y) > tolerance_y) break; // It is row before prev

        // No tolerance_x usage here
        if (Math.abs(coord[j].x - elem_x) < Math.abs(coord[up_i].x - elem_x)) {
          up_i = j;
        }
      }

      to_up = chain[up_i];
      break; // Prev row processed
    }
  }

  // Down
  for (let i = index + 1; i < count; i++) {
    if (coord[i].y > (elem_y + tolerance_y)) { // Next row found
      let down_i = i; // First candidate

      for (let j = i + 1; j < count; j++) {
        if ((coord[j].y - coord[down_i].y) > tolerance_y) break; // It is row after next

        // No tolerance_x usage here
        if (Math.abs(coord[j].x - elem_x) < Math.abs(coord[down_i].x - elem_x)) {
          down_i = j;
        }
      }

      to_down = chain[down_i];
      break; // Next row processed
    }
  }

  elem.onkeydown = (event) => {
    const key = event.key;
    const to  = key === 'ArrowLeft'  ? to_left
              : key === 'ArrowRight' ? to_right
              : key === 'ArrowUp'    ? to_up
              : key === 'ArrowDown'  ? to_down
                                     : null;
    if (to) {
      event.preventDefault();
      to.focus();
    }
  };
}

function set_chain_arrows_plane(chain) {
  const count = chain.length;
  const coord = [];

  for (let index = 0; index < count; index++) {
    let elem = chain[index];

    if (typeof elem === "string") {
      elem = document.getElementById(elem);
      chain[index] = elem;
    }

    const rect = elem.getBoundingClientRect();
    coord.push({ x: rect.left, y: rect.top });
  }

  for (let index = 0; index < count; index++) {
    set_elem_arrows_plane(index, chain, coord);
  }
}

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

function get_grow_ratio(prev, curr) {
  if (!prev && !curr) return "   "; // Nothing at all
  if (!prev || !curr) return curr
                           ? "***"  // Grow from zero
                           : "ooo"; // Fall to   zero

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
  if   (ratio > 0.99) return '\u2212\u0020\u0020'; // \u2212 is &minus;
  if   (ratio > 0.98) return '\u2212\u2212\u0020';
  if   (ratio > 0.96) return '\u2212\u2212\u2212';

  if   (ratio > 0.94) return "v  ";
  if   (ratio > 0.90) return "vv ";
                      return "vvv";
}

function get_grow_fixed(prev, curr) {
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
  if   (diff_abs === 1) return '\u2212\u0020\u0020'; // \u2212 is &minus;
  if   (diff_abs === 2) return '\u2212\u2212\u0020';
  if   (diff_abs === 3) return '\u2212\u2212\u2212';

  if   (diff_abs <=  5) return "v  ";
  if   (diff_abs <= 10) return "vv ";
                        return "vvv";
}

const grow_values = {
               "***": 999,

               "^^^":  18,
               "^^ ":  12,
               "^  ":   6,

               "+++":   3,
               "++ ":   2,
               "+  ":   1,

               "   ":   0,

'\u2212\u0020\u0020':  -1, // \u2212 is &minus;
'\u2212\u2212\u0020':  -2,
'\u2212\u2212\u2212':  -3,

               "v  ":  -6,
               "vv ": -12,
               "vvv": -18,

               "ooo":-999
};

function get_grow_value(grow) {
  return grow_values[grow] || 0;
}

function get_grow_mood(grow_old, grow_23, grow_7, mood_by_same) {
  const v_old = get_grow_value(grow_old);
  const v_23  = get_grow_value(grow_23 );
  const v_7   = get_grow_value(grow_7  );

  const mood  = v_old + v_23 + v_7;

  if (!mood_by_same) return mood; // By "diff-signs"

  // By "same-signs"
  if ((v_old >= 0) && (v_23 >= 0) && (v_7 >= 0)) return mood;
  if ((v_old <= 0) && (v_23 <= 0) && (v_7 <= 0)) return mood;

  return 0;
}

/* Substantial changes marking */

function get_marks(rel, cnt, mid) {
  if   (cnt <= 0)      return { above: { cnt: 0, val: +Infinity, tim: null },
                                below: { cnt: 0, val: -Infinity, tim: null } };
  const rel_len = rel.length;
  if   (rel_len === 0) return { above: { cnt: 0, val: +Infinity, tim: null },
                                below: { cnt: 0, val: -Infinity, tim: null } };
  if   (rel_len === 1) {
    const val = rel[0].value;
    const tim = rel[0].time;

    if   (val > mid)   return { above: { cnt: 1, val,            tim       },
                                below: { cnt: 0, val: -Infinity, tim: null } };
    if   (val < mid)   return { above: { cnt: 0, val: +Infinity, tim: null },
                                below: { cnt: 1, val,            tim       } };
                       return { above: { cnt: 0, val: +Infinity, tim: null },
                                below: { cnt: 0, val: -Infinity, tim: null } };
  }
  if ((cnt + cnt) > rel_len) {
    cnt = Math.floor(rel_len / 2);
  }

  rel.sort((above, below) =>
    (above.value - below.value) || // Lower value to start of array
    (below.time  - above.time ));  // Older item  to start of array

  let above_cnt = cnt;
  let below_cnt = cnt;
  let above_idx = rel_len - cnt;
  let below_idx = cnt     -   1;
  let above_val = rel[above_idx].value;
  let below_val = rel[below_idx].value;
  let above_tim = rel[above_idx].time;
  let below_tim = rel[below_idx].time;

  while (above_val <= mid) { // Above value is in below side, or at mid
    below_idx++; // Move below side to right
    below_val = rel[below_idx].value; // Update its value
    below_tim = rel[below_idx].time;  //        and time
    below_cnt++; // Count it

    above_cnt--; // Use place
    if (!above_cnt) break; // Above side is empty
    above_idx++; // Move above side to right
    above_val = rel[above_idx].value; // Update its value
    above_tim = rel[above_idx].time;  //        and time
  }

  while (below_val >= mid) { // Below value is in above side, or at mid
    if (above_cnt) { // Above side is not empty
      if (rel[above_idx - 1].value > mid) { // And something is present there to add to above side
        above_val = rel[above_idx - 1].value; // Update its value
        above_tim = rel[above_idx - 1].time;  //        and time
        above_cnt++; // Count it
        above_idx--; // Move above side to left
      }
    }

    below_cnt--; // Use place
    if (!below_cnt) break; // Below side is empty
    below_idx--; // Move below side to left
    below_val = rel[below_idx].value; // Update its value
    below_tim = rel[below_idx].time;  //        and time
  }

  // Possible array of all mid's is handled in return
  // Because both above_cnt and below_cnt will be zeroes
  return { above: { cnt: above_cnt,
                    val: above_cnt ? above_val : +Infinity,
                    tim: above_cnt ? above_tim :  null },
           below: { cnt: below_cnt,
                    val: below_cnt ? below_val : -Infinity,
                    tim: below_cnt ? below_tim :  null } };
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

// Views and Favorites

const views_favs_empty = { views_all: 0, views_old: 0, views_30: 0, views_23: 0, views_7: 0,
                           favorites: 0, favorited: 0 };

function add_views_favs(item, views_favs) {
  if (!item) return;

  views_favs.views_all += item.views_all;
  views_favs.views_old += item.views_old;
  views_favs.views_30  += item.views_30;
  views_favs.views_23  += item.views_23;
  views_favs.views_7   += item.views_7;

  views_favs.favorites +=  item.favorites;
  views_favs.favorited += (item.favorites > 0);
}

function get_views_favs(results) {
  const views_favs = { ...views_favs_empty };

  for (const item of results) add_views_favs(item, views_favs);

  return views_favs;
}

const views_favs_shown = {};

function clr_views_favs_shown() {
  views_favs_shown.prev = { ...views_favs_empty };
  views_favs_shown.curr = { ...views_favs_empty };
}

function add_views_favs_shown(item_prev, item_curr) {
  add_views_favs(item_prev, views_favs_shown.prev);
  add_views_favs(item_curr, views_favs_shown.curr);
}

function get_views_favs_shown() {
  return views_favs_shown;
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

// number: non-negative
function format_number(number) {
  const [i_str, f_str] = number.toString().split('.');

  const i_len =  i_str.length;
  let   i_ind = (i_len - 1) % 3 + 1;
  let  oi_str =  i_str.substring(0, i_ind);

  while(i_ind < i_len) { // \u2009 is &thinsp;
    oi_str += '\u2009' + i_str.substring(i_ind, i_ind + 3);
     i_ind += 3;
  }

  let of_str = "";
  if  (f_str) {
    const f_len = f_str.length;
    let   f_ind = 3;
         of_str = f_str.substring(0, f_ind);

    while (f_ind < f_len) { // \u2009 is &thinsp;
      of_str += '\u2009' + f_str.substring(f_ind, f_ind + 3);
       f_ind += 3;
    }
  }

  return of_str ? oi_str + '.' + of_str : oi_str;
}

// num: positive or negative, or zero
function format_num_sign(num) {
  const pre = num > 0 ? '+'
            : num < 0 ? '\u2212' : ""; // \u2212 is &minus;

  if (typeof num === "string") {
    if (num.startsWith('-')) num = num.slice(1); // Handles "-0"
    return pre + format_number(num);
  }

  return pre + format_number(Math.abs(num));
}

// num: non-negative
function format_num_str(num, str) { // "==" to handle strings
  return format_number (num) + ' ' + str + (num == 1 ? "" : 's');
}

// ord: non-negative integer, or zero
function get_ord_suf(ord) {
  if (ord < 1) return "th";

  const mod100 = ord % 100;
  if ((mod100 >= 11) && (mod100 <= 13)) return "th";

  switch (ord % 10) {
    case 1 : return "st";
    case 2 : return "nd";
    case 3 : return "rd";

    default: return "th";
  }
}

// num: positive or negative integer, or zero
function format_num_ord(num, sign = false) {
  return (sign ? format_num_sign(num) : format_number(num)) + get_ord_suf(Math.abs(num));
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

function sort_results(results, title_is, show_by, sort_by) {
  const title_is_title = (title_is === "title"); // Else is "identifier"

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
  results.sort((above, below) =>
    (below[field_1] - above[field_1]) ||
    (below[field_2] - above[field_2]) ||
    (below[field_3] - above[field_3]) ||
    (title_is_title
     ? above.title     .localeCompare(below.title     )
     : above.identifier.localeCompare(below.identifier)));
}

/* Stats */

// what: "prev" / "curr"
function render_stats(results, date, what, title_is, show_by, sort_by, container) {
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

  sort_results(results, title_is, show_by, sort_by);

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

/* Diffs */

let diffs_text       = null;
let diffs_text_inner = null;

function create_diffs_inner(views_favs_prev, views_favs_curr, total_cnt, shown_cnt, show_by) {
  const show_by_old = (show_by === "old-23-7"); // Else by "all-30-7"

  const hidden_cnt  =  total_cnt         -  shown_cnt;
  const hidden_str  = hidden_cnt ?  ' (' + hidden_cnt + ' hidden)' : "";

  return "" +
    format_nowrap    ('Differences for ' +
      format_num_str (shown_cnt, 'Item') + hidden_str + ' in:') + ' ' +
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

function render_diffs(results_prev, results_curr, total_cnt, show_by, container) {
  diffs_text = document.createElement("div");
  diffs_text.className  = "text-center text-comment";

  const views_favs_prev = get_views_favs(results_prev);
  const views_favs_curr = get_views_favs(results_curr);

  diffs_text_inner      = create_diffs_inner(views_favs_prev, views_favs_curr, total_cnt, total_cnt, show_by);
  diffs_text.innerHTML  = diffs_text_inner;

  container.appendChild(diffs_text);
}

function update_diffs(total_cnt, shown_cnt, show_by) {
  const views_favs      = get_views_favs_shown();
  const updated_inner   = create_diffs_inner(views_favs.prev, views_favs.curr, total_cnt, shown_cnt, show_by);

  if (diffs_text_inner   !== updated_inner) {
      diffs_text.innerHTML = updated_inner;
      diffs_text_inner     = updated_inner;
  }
}

// EOF






