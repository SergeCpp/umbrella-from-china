/* Focus State */

let saved_focus_id = null;

function save_focus(id) {
  saved_focus_id = id;
}

function restore_focus() {
  if (!saved_focus_id) return;

  const elem = document.getElementById(saved_focus_id);
  if   (elem) elem.focus();

  saved_focus_id = null;
}

/* Chain Arrows : China Rose */

function set_elem_keyup(elem) {
  elem.onkeyup = (event) => {
    if ((event.key === 'Enter') || (event.key === ' ')) elem.click();
  };
}

function set_elem_arrows_line(elem, elem_prev, elem_next, direction) {
  const [ key_prev,    key_next   ] = direction === "horz"
      ? ['ArrowLeft', 'ArrowRight'] : direction === "vert"
      ? ['ArrowUp',   'ArrowDown' ] : [];

  elem.onkeydown = (event) => {
    if ((event.key === 'Enter') || (event.key === ' ')) { event.preventDefault(); return; }

    switch (event.key) {
      case   key_prev:
        if (elem_prev !== elem) { event.preventDefault(); elem_prev.focus(); }
        return;

      case   key_next:
        if (elem_next !== elem) { event.preventDefault(); elem_next.focus(); }
        return;
    }

    if (direction === "vert") {
      switch (event.key) {
        case 'ArrowLeft':
          if (elem.elem_left)  { event.preventDefault(); elem.elem_left .focus(); }
          return;

        case 'ArrowRight':
          if (elem.elem_right) { event.preventDefault(); elem.elem_right.focus(); }
          return;
      }
    }
  };
}

function set_chain_arrows_line(chain, direction) {
  const count = chain.length;

  for (let index = 0; index < count; index++) {
    const elem = chain[index];

    set_elem_keyup      (elem);
    set_elem_arrows_line(elem, chain[(index - 1  + count)
                                                 % count],
                               chain[(index + 1) % count], direction);
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

function get_grow_mood(grow_old, grow_23, grow_7, mood_by) {
  const v_old = get_grow_value(grow_old);
  const v_23  = get_grow_value(grow_23 );
  const v_7   = get_grow_value(grow_7  );

  const mood  = v_old + v_23 + v_7;

  if (mood_by === "diff-signs") return mood;

  // "same-signs"
  if ((v_old >= 0) && (v_23 >= 0) && (v_7 >= 0)) return mood;
  if ((v_old <= 0) && (v_23 <= 0) && (v_7 <= 0)) return mood;

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
           below: { cnt: below_cnt, val: below_cnt ? below_val : -Infinity } };
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

// num: positive or negative integer, or zero
function format_num_sign(num) {
  const  n_pre = num > 0 ? '+'
               : num < 0 ? '\u2212' : ""; // \u2212 is &minus;

  return n_pre + format_number(Math.abs(num));
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

// EOF






