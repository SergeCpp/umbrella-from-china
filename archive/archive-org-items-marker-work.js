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
  if ((v_old <  0) && (v_23 <  0) && (v_7 <  0)) return v_old + v_23 + v_7;

  return 0;
}

/* Substantial changes marking */

function get_marks(rel, cnt, mid) {
  if   (cnt <= 0)      return { above: +Infinity, below: -Infinity };
  const rel_len = rel.length;
  if   (rel_len === 0) return { above: +Infinity, below: -Infinity };
  if   (rel_len === 1) {
    const val = rel[0];
    if   (val > mid)   return { above:  val,      below: -Infinity };
    if   (val < mid)   return { above: +Infinity, below:  val      };
                       return { above: +Infinity, below: -Infinity };
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
    if (above_cnt === 0) break; // Above side is empty
    above_idx++; // Move above side to right
    above_val = rel[above_idx]; // Update its value
  }
  while (below_val >= mid) { // Below value is in above side, or at mid
    if (above_cnt > 0) { // Above side not empty
      if (rel[above_idx - 1] > mid) { // And something is present there to add to above side
        above_val = rel[above_idx - 1]; // Update its value
        above_cnt++; // Count it
        above_idx--; // Move above side to left
      }
    }
    below_cnt--; // Use place
    if (below_cnt === 0) break; // Below side is empty
    below_idx--; // Move below side to left
    below_val = rel[below_idx]; // Update its value
  }
  return { above: above_cnt > 0 ? above_val : +Infinity, // Possible array of all mid's is handled here
           below: below_cnt > 0 ? below_val : -Infinity  // Because both above_cnt and below_cnt will be 0
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

function sort_results(results) {
  results.sort((a, b) => { // Descending for ratios
    if (a.ratio_old !== b.ratio_old) { return b.ratio_old - a.ratio_old; }
    if (a.ratio_23  !== b.ratio_23 ) { return b.ratio_23  - a.ratio_23;  }
    if (a.ratio_7   !== b.ratio_7  ) { return b.ratio_7   - a.ratio_7;   }
    return a.title.localeCompare(b.title); // Ascending for titles: A >> Z
  });
}

/* Render */

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
    format_nowrap(cap_first(what) + ' :') + ' ' +
    format_nowrap('<span ' +
      'role="button" style="cursor:pointer;" tabindex="0" ' +
      'onkeydown="if ((event.key === \'Enter\') || (event.key === \' \')) event.preventDefault();" ' +
      'onkeyup  ="if ((event.key === \'Enter\') || (event.key === \' \')) ' +
                 'date_change_menu(event, \'' + what + '\');" ' +
      'onclick  ="date_change_menu(event, \'' + what + '\')" ' +
      '>' + date + '</span>' + ' :') + ' ' +
    format_nowrap('Min ' + min         .toFixed(3) + ' /') + ' ' +
    format_nowrap('10% ' + percentile10.toFixed(3) + ' /') + ' ' +
    format_nowrap('25% ' + quartile1   .toFixed(3) + ' /') + ' ' +
    format_nowrap('50% ' + median      .toFixed(3) + ' /') + ' ' +
    format_nowrap('75% ' + quartile3   .toFixed(3) + ' /') + ' ' +
    format_nowrap('90% ' + percentile90.toFixed(3) + ' /') + ' ' +
    format_nowrap('Max ' + max         .toFixed(3));

  container.appendChild(stats_text);
}

// EOF






