/* Compose Items */

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

// results_curr_exp is sorted
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
  init_gauges(max_ratio, base_ratio, max_favorites, base_favorites);

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
  // Details
  //
  clr_details_raw();
  //
  for (let index_curr = 0; index_curr < curr_length; index_curr++) {
    const item      = results_curr_exp[index_curr];
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
        add_details_raw_horz(index_curr, horz_impact, horz_factor, horz_change);
      }
    }
    horz_curr_prev.push({ index: index_curr, value: horz_change }); // Needed in array anyway
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
        add_details_raw_vert(index_curr, vert_impact, vert_factor, vert_change);
      }
    }
    vert_all_old.push({ index: index_curr, value: vert_change }); // Needed in array anyway

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
        add_details_raw_rank(index_curr, rank_diff, item.index_prev + 1, index_curr + 1, rank_scale, rank_change);
      }
    }
    rank_up_dn.push({ index: index_curr, value: rank_change }); // Needed in array anyway

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
        add_details_raw_mood(index_curr, grow_mood, mood_scale, _mood);
      }
      _grow._mood = _mood; // Needed in markable item only
    }
    else {
      _grow._old = "   ";
      _grow._23  = "   ";
      _grow._7   = "   ";
    }
    item.grow = _grow;
    mood_pos_neg.push({ index: index_curr, value: _mood }); // Needed in array anyway

    /////////
    // Gauges
    //
    if (!item.no_prev) {
      // Display favorites prev count on the below a gauge
      add_gauge_below_a(index_curr, item_prev.favorites);
    }
    if (!item.is_prev) {
      // Display favorites curr count on the below b gauge
      add_gauge_below_b(index_curr, item.favorites);

      // Display ratios old and all for curr on the above gauges
      add_gauge_above_a(index_curr, item.ratio_old);
      add_gauge_above_b(index_curr, item.ratio_all);
    }
  } // for (index_curr) closing

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

  set_ordinal_arrays(
    horz_curr_prev,
    vert_all_old,
    rank_up_dn,
    mood_pos_neg);

  return {
    horz_marks,
    vert_marks,
    rank_marks,
    mood_marks
  };
}

/* Gauges */

let gauges_max_ratio      = 0;
let gauges_base_ratio     = 0;
let gauges_max_favorites  = 0;
let gauges_base_favorites = 0;

let gauges_raw_above_a    = {};
let gauges_raw_above_b    = {};
let gauges_raw_below_a    = {};
let gauges_raw_below_b    = {};

let gauges_defer_time     = 0;

function init_gauges(max_ratio, base_ratio, max_favorites, base_favorites) {
    gauges_max_ratio      = max_ratio;
    gauges_base_ratio     = base_ratio;
    gauges_max_favorites  = max_favorites;
    gauges_base_favorites = base_favorites;

    gauges_raw_above_a    = {};
    gauges_raw_above_b    = {};
    gauges_raw_below_a    = {};
    gauges_raw_below_b    = {};

    gauges_defer_time     = 0;
}

function add_gauge_above_a(index,   ratio) {
        gauges_raw_above_a[index] = ratio;
}

function add_gauge_above_b(index,   ratio) {
        gauges_raw_above_b[index] = ratio;
}

function add_gauge_below_a(index,   favorites) {
        gauges_raw_below_a[index] = favorites;
}

function add_gauge_below_b(index,  favorites) {
        gauges_raw_below_b[index] = favorites;
}

function defer_gauges_setting() {
  gauges_defer_time = performance.now();
  setTimeout(set_gauges, 200, gauges_defer_time);
}

function set_gauges(defer_time) {
  if (defer_time !== gauges_defer_time) return;

  const container = document.getElementById("results");
  let   wrapper   = container.querySelector(".item-wrapper");
  if  (!wrapper)  { defer_gauges_setting(); return; } // No items yet

  const get_percentage = (value, max, base) =>
    (value <=   0) ?   '0%' :
    (value >= max) ? '100%' : (Math.log(value + 1) * base).toFixed(3) + '%';

  do {
    const index = wrapper.item_index;
    if   (index === undefined) break;

    const inner = wrapper.firstElementChild;
    const title = inner  .firstElementChild;

    const ga_a  = title.firstElementChild;
    const ga_a_ratio = gauges_raw_above_a[index];
    if   (ga_a_ratio !== undefined) {
      const width = get_percentage(ga_a_ratio, gauges_max_ratio, gauges_base_ratio);
      if   (width !== '0%') ga_a.style.width = width;
    }

    const ga_b = ga_a.nextElementSibling;
    const ga_b_ratio = gauges_raw_above_b[index];
    if   (ga_b_ratio !== undefined) {
      const width = get_percentage(ga_b_ratio, gauges_max_ratio, gauges_base_ratio);
      if   (width !== '0%') ga_b.style.width = width;
    }

    const gb_a = ga_b.nextElementSibling.nextElementSibling;
    const gb_a_favorites = gauges_raw_below_a[index];
    if   (gb_a_favorites !== undefined) {
      const width = get_percentage(gb_a_favorites, gauges_max_favorites, gauges_base_favorites);
      if   (width !== '0%') gb_a.style.width = width;
    }

    const gb_b = gb_a.nextElementSibling;
    const gb_b_favorites = gauges_raw_below_b[index];
    if   (gb_b_favorites !== undefined) {
      const width = get_percentage(gb_b_favorites, gauges_max_favorites, gauges_base_favorites);
      if   (width !== '0%') gb_b.style.width = width;
    }

    wrapper = wrapper.nextElementSibling;
  }
  while (wrapper);
}

/* Ordinals */

// Of curr_length anyway
let ord_horz_curr_prev = [];
let ord_vert_all_old   = [];
let ord_rank_up_dn     = [];
let ord_mood_pos_neg   = [];

let ordinals_horz      = {};
let ordinals_vert      = {};
let ordinals_rank      = {};
let ordinals_mood      = {};

let ordinals_are_ready = false;

function set_ordinal_arrays(
    ord_horz,
    ord_vert,
    ord_rank,
    ord_mood) {
    ord_horz_curr_prev = ord_horz;
    ord_vert_all_old   = ord_vert;
    ord_rank_up_dn     = ord_rank;
    ord_mood_pos_neg   = ord_mood;

    ordinals_horz      = {};
    ordinals_vert      = {};
    ordinals_rank      = {};
    ordinals_mood      = {};

    ordinals_are_ready = false;
}

function set_ordinal_values() {
  set_marked_ordinals("horz", ord_horz_curr_prev);
  set_marked_ordinals("vert", ord_vert_all_old  );
  set_marked_ordinals("rank", ord_rank_up_dn    );
  set_marked_ordinals("mood", ord_mood_pos_neg  );

  ordinals_are_ready = true;
}

function get_ordinal_value(name, index) {
  switch (name) {
    case "horz": return ordinals_horz[index];
    case "vert": return ordinals_vert[index];
    case "rank": return ordinals_rank[index];
    case "mood": return ordinals_mood[index];
  }

  return null;
}

function ensure_ordinals_are_ready() {
  if (ordinals_are_ready) return;

  set_ordinal_values();
}

function set_details_ordinal(name, index, ordinal) {
  switch (name) {
    case "horz": ordinals_horz[index] = ordinal; return;
    case "vert": ordinals_vert[index] = ordinal; return;
    case "rank": ordinals_rank[index] = ordinal; return;
    case "mood": ordinals_mood[index] = ordinal; return;
  }
}

function set_marked_ordinals(name, marked) {
  const len = marked.length;

  for (let idx = 1; idx <= len; idx++) {
    const elem = marked[len - idx]; // From end to beg
    if   (elem.value <= 0) break;

    const ordinal = format_num_ord(+idx, "sign");
    set_details_ordinal(name, elem.index, ordinal);
  }

  for (let idx = 1; idx <= len; idx++) {
    const elem = marked[idx - 1]; // From beg to end
    if   (elem.value >= 0) break;

    const ordinal = format_num_ord(-idx, "sign");
    set_details_ordinal(name, elem.index, ordinal);
  }
}

/* Item Details */

let details_raw_horz  = {};
let details_raw_vert  = {};
let details_raw_rank  = {};
let details_raw_mood  = {};

let details_are_ready = false;

function clr_details_raw() {
    details_raw_horz  = {};
    details_raw_vert  = {};
    details_raw_rank  = {};
    details_raw_mood  = {};

    details_are_ready = false;
}

function add_details_raw_horz(index,     impact, factor, change) {
             details_raw_horz[index] = { impact, factor, change };
}

function add_details_raw_vert(index,     impact, factor, change) {
             details_raw_vert[index] = { impact, factor, change };
}

function add_details_raw_rank(index,     diff, from, to, divisor, change) {
             details_raw_rank[index] = { diff, from, to, divisor, change };
}

function add_details_raw_mood(index,     mood, divisor, scaled) {
             details_raw_mood[index] = { mood, divisor, scaled };
}

function set_details_for_items() {
  const indices = {};

  for (const index in details_raw_horz) indices[index] = null;
  for (const index in details_raw_vert) indices[index] = null;
  for (const index in details_raw_rank) indices[index] = null;
  for (const index in details_raw_mood) indices[index] = null;

  for (const index in indices) {
    const horz_raw     = details_raw_horz[index];
    const horz_ordinal = get_ordinal_value("horz", index);
    const horz_details = horz_raw
        ? format_nowrap("Horizontal impact: " + format_num_sign(horz_raw.impact .toFixed(6)) + ',') + ' ' +
          format_nowrap("Scale multiplier: "  + format_number  (horz_raw.factor .toFixed(6)) + ',') + ' ' +
          format_nowrap("Scaled: "            + format_num_sign(horz_raw.change .toFixed(6)) +
                        (horz_ordinal  ? ", " + horz_ordinal : ""))
        : null;

    const vert_raw     = details_raw_vert[index];
    const vert_ordinal = get_ordinal_value("vert", index);
    const vert_details = vert_raw
        ? format_nowrap("Vertical impact: "   + format_num_sign(vert_raw.impact .toFixed(6)) + ',') + ' ' +
          format_nowrap("Scale multiplier: "  + format_number  (vert_raw.factor .toFixed(6)) + ',') + ' ' +
          format_nowrap("Scaled: "            + format_num_sign(vert_raw.change .toFixed(6)) +
                        (vert_ordinal  ? ", " + vert_ordinal : ""))
        : null;

    const rank_raw     = details_raw_rank[index];
    const rank_ordinal = get_ordinal_value("rank", index);
    const rank_details = rank_raw
        ? format_nowrap("Rank change: "       + format_num_sign(rank_raw.diff) + ','  + ' ' +
                        "from "               + format_number  (rank_raw.from) + ' '  +
                        "to "                 + format_number  (rank_raw.to  ) + ',') + ' ' +
          format_nowrap("Scale divisor: "     + format_number  (rank_raw.divisor.toFixed(6)) + ',') + ' ' +
          format_nowrap("Scaled: "            + format_num_sign(rank_raw.change .toFixed(6)) +
                        (rank_ordinal  ? ", " + rank_ordinal : ""))
        : null;

    const mood_raw     = details_raw_mood[index];
    const mood_ordinal = get_ordinal_value("mood", index);
    const mood_details = mood_raw
        ? format_nowrap("Mood: "              + format_num_sign(mood_raw.mood)               + ',') + ' ' +
          format_nowrap("Scale divisor: "     + format_number  (mood_raw.divisor.toFixed(6)) + ',') + ' ' +
          format_nowrap("Scaled: "            + format_num_sign(mood_raw.scaled .toFixed(6)) +
                        (mood_ordinal  ? ", " + mood_ordinal : ""))
        : null;

    const hv_details = horz_details || vert_details ? { horz: horz_details, vert: vert_details } : null;

    add_details_for_item(index, rank_details, hv_details, mood_details);
  }

  details_are_ready = true;
}

function ensure_details_are_ready() {
  if (details_are_ready) return;

  set_details_for_items();
}

let details_for_items  = {};
let details_div_inners = {};

function clr_details_for_items () { details_for_items  = {}; }
function clr_details_div_inners() { details_div_inners = {}; }

function add_details_for_item(index, rank_details, hv_details, mood_details) {
  if (!rank_details && !hv_details && !mood_details) return;

  const details = {};

  if (rank_details) details.rank = rank_details;
  if (  hv_details) details.hv   =   hv_details;
  if (mood_details) details.mood = mood_details;

  details_for_items[index] = details;
}

function find_container(event, handler, title = false) {
  const classes =
    (title ? ".item-title-container, " : "") + ".item-stat-container, .item-grow-container";

  const container = event.target.closest(classes);
  if  (!container || container.is_empty || container[handler]) return null;

  const inner   = container.parentElement;
  if  (!inner   || !inner  .className.includes("inner"  )) return null;

  const wrapper = inner    .parentElement;
  if  (!wrapper || !wrapper.className.includes("wrapper")) return null;

  return container;
}

function find_linkage(event) {
  const  linkage = event.target;
  if   (!linkage.className.includes("item-linkage")) return null;

  return linkage;
}

// Results Events

function results_click(event) {
  const container  = find_container(event, "onclick");
  if   (container) { item_click(container,  event); return; }

  const linkage    = find_linkage(event);
  if   (linkage)   { linkage_click(linkage, event); return; }
}

function results_keyup(event) {
  const container  = find_container(event, "onkeyup");
  if   (container) { item_keyup(container,  event); return; }

  const linkage    = find_linkage(event);
  if   (linkage)   { linkage_keyup(linkage, event); return; }
}

function results_keydown(event) {
  const container  = find_container(event, "onkeydown", "title");
  if   (container) { item_keydown(container,  event); return; }

  const linkage    = find_linkage(event);
  if   (linkage)   { linkage_keydown(linkage, event); return; }
}

// Item Events

function item_click(container, event) {
  item_details(container);
}

function item_keyup(container, event) {
  const key = event.key;
  if ((key === 'Enter') || (key === ' ')) {
    item_click(container, event);
  }
}

function item_keydown(container, event) {
  const key      = event.key;
  const is_title = (elem) => elem.className.includes("title");

  if ((key === 'Enter') || (key === ' ')) {
    if (is_title(container)) return;

    event.preventDefault();
    return;
  }

  item_arrows(container, event);
}

function item_arrows(container, event) {
  const key      = event.key;
  const is_left  = key === 'ArrowLeft';
  const is_right = key === 'ArrowRight';
  const is_up    = key === 'ArrowUp';
  const is_down  = key === 'ArrowDown';
  if  (!is_left && !is_right && !is_up && !is_down) return;

  const is_item  = (elem) => elem && elem.className.includes("item" );
  const is_title = (elem) => elem && elem.className.includes("title");

  const inner    = container.parentElement;
  const wrapper  = inner    .parentElement;
  const results  = wrapper  .parentElement;

  const in_chlds = Array.from(inner.children);
  const ix_cell  = in_chlds.indexOf(container);

  const go_cell  = (cell) => {
    if (!cell || (cell === container)) return;
    event.preventDefault();
    if (is_title(cell)) cell.querySelector("a").focus(); else cell.focus();
  };

  const wr_cell  = (wrap) => {
    if (!is_item(wrap)) return null;

    const innr = wrap.firstElementChild;
    if  (!innr) return null;

    const  cell = innr.children[ix_cell];
    return cell;
  };

  const is_empty = (wrap) => { // If not plain then not empty
    const   cell = wr_cell(wrap);
    return !cell || cell.is_empty;
  };

  const is_plain = (wrap) => { // If empty then plain
    const   cell = wr_cell(wrap);
    return !cell || !cell.is_subst;
  };

  if (event.altKey) {
    event.preventDefault(); // Prewent browser actions
  }

  if (is_left || is_right) {
    let container_go = null;
    let len = in_chlds.length;
    let ix;

    if (event.ctrlKey) { // To beg/end
      ix = is_left ? 0 : len - 1;

      while (in_chlds[ix].is_empty) { // Will be found ok, at least title at [0] (always not empty)
        ix = is_left ? ix + 1 : ix - 1;
      }
    }
    else { // To prev/next not empty or to end/beg if not found (circulate)
      ix = ix_cell;

      do {
        ix = ((is_left ? ix - 1 : ix + 1) + len) % len;
      }
      while (in_chlds[ix].is_empty); // Will be found ok, at least title at [0] (always not empty)
    }

    container_go = in_chlds[ix];
    go_cell(container_go);
    return;
  }

  const wr_forw  = (wrap) => is_up ? wrap.previousElementSibling : wrap.    nextElementSibling;
  const wr_back  = (wrap) => is_up ? wrap.    nextElementSibling : wrap.previousElementSibling;

  const fw_elem  = ()     => is_up ? results.firstElementChild   : results. lastElementChild;
  const bk_elem  = ()     => is_up ? results. lastElementChild   : results.firstElementChild;

  const fw_term  = ()     => {
    let wr = fw_elem();

    while (is_empty(wr)) { // Will be found ok, at least wrapper
      wr = wr_back(wr);
    }

    return wr;
  };

  const bk_term  = ()     => {
    let wr = bk_elem();

    while (is_empty(wr)) { // Will be found ok, at least wrapper
      wr = wr_forw(wr);
    }

    return wr;
  };

  let wrapper_go = null;

  if (event.altKey && event.ctrlKey) { // To beg/end not plain or to beg/end if not found
    wrapper_go = fw_term();
    let  wr_go = wrapper_go;

    while (is_item(wr_go)) {
      if (!is_plain(wr_go)) { wrapper_go = wr_go; break; }
      wr_go = wr_back(wr_go);
    }
  }
  else if (event.altKey) { // To prev/next not plain or to beg/end if not found (stop at)
    let wr_ne = null; // Last not empty encountered
    let wr_go = wrapper; // Currently checking

    do {
      if (!is_empty(wr_go))        wr_ne = wr_go;
      wr_go = wr_forw(wr_go);
      if (!is_plain(wr_go)) { wrapper_go = wr_go; break; }
    }
    while (is_item(wr_go));

    if (!wrapper_go) wrapper_go = wr_ne;
  }
  else if (event.ctrlKey) { // To beg/end
    wrapper_go = fw_term();
  }
  else if (event.shiftKey) { // Details-related
    event.preventDefault();

    if (is_down) { // Open details and go to first linkage
      item_details(container, "ensure-open", false,
        (ix_cell === 1 ? "rank" :
         ix_cell === 2 ? "horz" :
         ix_cell === 3 ? "mood" : "") + "-prev");
    }

    return;
  }
  else { // To prev/next not empty or to end/beg if not found (circulate)
    let wr_go = wrapper;

    do {
      wr_go = wr_forw(wr_go);
      if (!is_empty(wr_go)) { wrapper_go = wr_go; break; }
    }
    while (is_item(wr_go));

    if (!wrapper_go) { // Not found, circulate
         wrapper_go = bk_term(); // Here found ok, at least wrapper
    }
  }

  go_cell(wr_cell(wrapper_go));
}

function item_details(container, ensure_open = false, jump_to_item = false, linkage_go = null) {
  ensure_ordinals_are_ready();
   ensure_details_are_ready();
  ensure_linkages_are_ready();

  const inner   = container.parentElement;
  const wrapper = inner    .parentElement;

  const index   = wrapper  .item_index;
  if   (index === undefined) return;

  const stat_class = container.firstElementChild.className;

  const stat_type  = stat_class.includes("prev") ? "rank"
                   : stat_class.includes("curr") ? "hv"
                   : stat_class.includes("grow") ? "mood"
                   : null;
  if  (!stat_type) return;

  let  details = details_for_items[index];
  if  (details)  details = details[stat_type];
  if (!details)  details = stat_type === "rank" ? "No rank change"
                         : stat_type === "mood" ? "No mood"
                                                : "No details";
  if (typeof details === "object") {
    const ih_details = details.horz;
    const iv_details = details.vert;

    details = ih_details && iv_details ? ih_details + '\n' + iv_details
            : ih_details               ? ih_details        : iv_details;
  }

  let details_div = wrapper.querySelector(".item-details");
  if (details_div) {
    if   (details_div_inners[index] !== details) {
          details_div.innerHTML       = details;
          details_div_inners[index]   = details;
          details_div.classList.remove("collapse");
    }
    else if (ensure_open) {
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

  if (jump_to_item) container.focus(); // Jump to item

  details_div.scrollIntoView({ behavior: "smooth", block: "nearest" });

  if (!linkage_go) return;

  // No scroll below, not interfere with scroll above

  const link_dir = linkage_go.slice(-4);

  const linkage  = details_div.querySelector('.' + linkage_go);
  if   (linkage) { linkage.focus({ preventScroll: true }); return; }

  let linkage2_go = null;
  switch (link_dir) {
    case "prev": linkage2_go = linkage_go.slice(0, -4) + "next"; break
    case "next": linkage2_go = linkage_go.slice(0, -4) + "prev"; break
    case "pr10": linkage2_go = linkage_go.slice(0, -4) + "prev"; break
    case "nx10": linkage2_go = linkage_go.slice(0, -4) + "next"; break
  }
  if (!linkage2_go) return;

  const linkage2  = details_div.querySelector('.' + linkage2_go);
  if   (linkage2) { linkage2.focus({ preventScroll: true }); return; }

  let linkage3_go = null;
  switch (link_dir) {
    case "pr10": linkage3_go = linkage_go.slice(0, -4) + "nx10"; break
    case "nx10": linkage3_go = linkage_go.slice(0, -4) + "pr10"; break
  }
  if (!linkage3_go) return;

  const linkage3  = details_div.querySelector('.' + linkage3_go);
  if   (linkage3) { linkage3.focus({ preventScroll: true }); return; }
}

function add_details_linkage(name, index, linkage_arr, linkage_idx) {
  const stat_type  = name === "rank" ? "rank"
                   : name === "horz" ? "hv"
                   : name === "vert" ? "hv"
                   : name === "mood" ? "mood"
                   : null;
  if  (!stat_type) return;

  const details = details_for_items[index];
  if  (!details) return;
  if  (!details[stat_type]) return;

  const sh_ord = (shown, ordinal, direction) => shown
    ? '<span class="item-linkage ' + name + '-' + direction + '" role="button" tabindex="-1">' +
      '#' + shown + (ordinal ? ' is ' + ordinal : "") + '</span>'
    : null;
                // \u2002 is &ensp;
  const to_prev = "\u2002<<\u2002";
  const to_next = "\u2002>>\u2002";

  const make_linkage = (type, span_prev, span_next) =>
    span_prev && span_next ? format_nowrap(span_prev + to_prev + type + to_next + span_next) :
    span_prev              ? format_nowrap(span_prev + to_prev + type                      ) :
                 span_next ? format_nowrap(                      type + to_next + span_next) :
    null;

  const prev = linkage_arr[linkage_idx - 1];
  const next = linkage_arr[linkage_idx + 1];

  const sh_ord_prev  = sh_ord(prev?.shown, prev?.ordinal, "prev");
  const sh_ord_next  = sh_ord(next?.shown, next?.ordinal, "next");

  const near_linkage = make_linkage("Near", sh_ord_prev, sh_ord_next);

  const pr10 = linkage_arr[linkage_idx - 10];
  const nx10 = linkage_arr[linkage_idx + 10];

  const sh_ord_pr10  = sh_ord(pr10?.shown, pr10?.ordinal, "pr10");
  const sh_ord_nx10  = sh_ord(nx10?.shown, nx10?.ordinal, "nx10");

  const dist_linkage = make_linkage("Dist", sh_ord_pr10, sh_ord_nx10);

  const linkage = near_linkage && dist_linkage ? near_linkage + '\n' + dist_linkage
                : near_linkage                 ? near_linkage        : dist_linkage;

  if (!linkage) return;

  switch (name) {
    case "horz":
    case "vert":
      if (typeof details[stat_type] !== "object") return;

      details[stat_type][name] += '\n' + linkage; return;

    default:
      details[stat_type]       += '\n' + linkage; return;
  }
}

/* Item Linkage */

let rank_linkage       = [];
let horz_linkage       = [];
let vert_linkage       = [];
let mood_linkage       = [];

let linkages_are_ready = false;

function clr_linkage_for_items() {
    rank_linkage       = [];
    horz_linkage       = [];
    vert_linkage       = [];
    mood_linkage       = [];

    linkages_are_ready = false;
}

function add_linkage_for_items(index, shown,
  rank_change, rank_container,
  horz_change, horz_container,
  vert_change, vert_container,
  mood,        mood_container) {
  if (rank_change)
      rank_linkage.push({ index, shown, value: rank_change, container: rank_container, ordinal: null });

  if (horz_change)
      horz_linkage.push({ index, shown, value: horz_change, container: horz_container, ordinal: null });

  if (vert_change)
      vert_linkage.push({ index, shown, value: vert_change, container: vert_container, ordinal: null });

  if (mood)
      mood_linkage.push({ index, shown, value: mood,        container: mood_container, ordinal: null });
}

function set_linkage_for_items() {
  rank_linkage.sort((above, below) => below.value - above.value); // Descending
  horz_linkage.sort((above, below) => below.value - above.value); // Descending
  vert_linkage.sort((above, below) => below.value - above.value); // Descending
  mood_linkage.sort((above, below) => below.value - above.value); // Descending

  // Get Ordinal
  for (let i = 0; i < rank_linkage.length; i++)
    rank_linkage[i].ordinal = get_ordinal_value("rank", rank_linkage[i].index);

  for (let i = 0; i < horz_linkage.length; i++)
    horz_linkage[i].ordinal = get_ordinal_value("horz", horz_linkage[i].index);

  for (let i = 0; i < vert_linkage.length; i++)
    vert_linkage[i].ordinal = get_ordinal_value("vert", vert_linkage[i].index);

  for (let i = 0; i < mood_linkage.length; i++)
    mood_linkage[i].ordinal = get_ordinal_value("mood", mood_linkage[i].index);

  // Add Linkage
  for (let i = 0; i < rank_linkage.length; i++)
    add_details_linkage("rank", rank_linkage[i].index, rank_linkage, i);

  for (let i = 0; i < horz_linkage.length; i++)
    add_details_linkage("horz", horz_linkage[i].index, horz_linkage, i);

  for (let i = 0; i < vert_linkage.length; i++)
    add_details_linkage("vert", vert_linkage[i].index, vert_linkage, i);

  for (let i = 0; i < mood_linkage.length; i++)
    add_details_linkage("mood", mood_linkage[i].index, mood_linkage, i);

  linkages_are_ready = true;
}

function ensure_linkages_are_ready() {
  if (linkages_are_ready) return;

  set_linkage_for_items();
}

// Linkage Events

function linkage_click(linkage, event) {
  item_linkage(linkage);
}

function linkage_keyup(linkage, event) {
  const key = event.key;
  if ((key === 'Enter') || (key === ' ')) {
    linkage_click(linkage, event);
  }
}

function linkage_keydown(linkage, event) {
  const key = event.key;
  if ((key === 'Enter') || (key === ' ')) {
    event.preventDefault();
    return;
  }

  linkage_arrows(linkage, event);
}

function linkage_arrows(linkage, event) {
  const key      = event.key;
  const is_left  = key === 'ArrowLeft';
  const is_right = key === 'ArrowRight';
  const is_up    = key === 'ArrowUp';
  const is_down  = key === 'ArrowDown';
  if  (!is_left && !is_right && !is_up && !is_down) return;

  const nowrap   = linkage.parentElement;
  const details  = nowrap .parentElement;
  const wrapper  = details.parentElement;

  // Class name format: item-linkage nnnn-dddd
  const name_dir = linkage.className.slice(-9);
  const name     = name_dir.slice(0, 4);
  const dir      = name_dir.slice(  -4);

  if (event.shiftKey) {
    event.preventDefault();

    if (is_up) {
      const index   = wrapper.item_index;
      if   (index === undefined) return;

      let linkage_arr = null;
      switch (name) {
        case "rank": linkage_arr = rank_linkage; break;
        case "horz": linkage_arr = horz_linkage; break;
        case "vert": linkage_arr = vert_linkage; break;
        case "mood": linkage_arr = mood_linkage; break;
      }
      if (!linkage_arr) return;

      const index_from = linkage_arr.findIndex(lnk => lnk.index === index);
      if   (index_from === -1) return;

      const container_go = linkage_arr[index_from].container;
      if  (!container_go) return;

      container_go.focus();
    }

    return;
  }

  let linkage_go = null;
  switch (name) {
    case "rank": linkage_go = linkage_go_4(name, dir, key, details); break;
    case "horz": linkage_go = linkage_go_8(name, dir, key, details); break;
    case "vert": linkage_go = linkage_go_8(name, dir, key, details); break;
    case "mood": linkage_go = linkage_go_4(name, dir, key, details); break;
  }
  if (!linkage_go) return;

  event.preventDefault();
  linkage_go.focus();
}

function linkage_go_4(name, dir, key, details) {
  const prev_go = details.querySelector('.' + name + '-' + "prev");
  const next_go = details.querySelector('.' + name + '-' + "next");
  const pr10_go = details.querySelector('.' + name + '-' + "pr10");
  const nx10_go = details.querySelector('.' + name + '-' + "nx10");

  switch (dir   +  key) {
    case "prev" + 'ArrowLeft' :
    case "prev" + 'ArrowRight': return next_go || nx10_go || pr10_go;
    case "prev" + 'ArrowUp'   :
    case "prev" + 'ArrowDown' : return pr10_go || nx10_go;

    case "next" + 'ArrowLeft' :
    case "next" + 'ArrowRight': return prev_go || pr10_go || nx10_go;
    case "next" + 'ArrowUp'   :
    case "next" + 'ArrowDown' : return nx10_go || pr10_go;

    case "pr10" + 'ArrowLeft' :
    case "pr10" + 'ArrowRight': return nx10_go || next_go || prev_go;
    case "pr10" + 'ArrowUp'   :
    case "pr10" + 'ArrowDown' : return prev_go || next_go;

    case "nx10" + 'ArrowLeft' :
    case "nx10" + 'ArrowRight': return pr10_go || prev_go || next_go;
    case "nx10" + 'ArrowUp'   :
    case "nx10" + 'ArrowDown' : return next_go || prev_go;
  }

  return null;
}

function linkage_go_8(name, dir, key, details) {
  const horz_prev_go = details.querySelector(".horz-prev");
  const horz_next_go = details.querySelector(".horz-next");
  const horz_pr10_go = details.querySelector(".horz-pr10");
  const horz_nx10_go = details.querySelector(".horz-nx10");

  const vert_prev_go = details.querySelector(".vert-prev");
  const vert_next_go = details.querySelector(".vert-next");
  const vert_pr10_go = details.querySelector(".vert-pr10");
  const vert_nx10_go = details.querySelector(".vert-nx10");

  const linkage_go   = [ [horz_prev_go, horz_next_go],
                         [horz_pr10_go, horz_nx10_go],
                         [vert_prev_go, vert_next_go],
                         [vert_pr10_go, vert_nx10_go] ];
  let curr_h = -1;
  switch (dir) {
    case "prev":
    case "pr10": curr_h = 0; break;
    case "next":
    case "nx10": curr_h = 1; break;
  }
  if (curr_h === -1) return null;

  let curr_v = -1;
  switch (name  +  dir) {
    case "horz" + "prev":
    case "horz" + "next": curr_v = 0; break;
    case "horz" + "pr10":
    case "horz" + "nx10": curr_v = 1; break;
    case "vert" + "prev":
    case "vert" + "next": curr_v = 2; break;
    case "vert" + "pr10":
    case "vert" + "nx10": curr_v = 3; break;
  }
  if (curr_v === -1) return null;

  switch (key) {
    case 'ArrowLeft' :
    case 'ArrowRight': {
      const h = curr_h ^ 1;

      let  go = null;
      switch (curr_v) {
        case 0: go = linkage_go[0][h] || linkage_go[1][h] || linkage_go[2][h] || linkage_go[3][h]; break;
        case 1: go = linkage_go[1][h] || linkage_go[0][h] || linkage_go[2][h] || linkage_go[3][h]; break;
        case 2: go = linkage_go[2][h] || linkage_go[3][h] || linkage_go[1][h] || linkage_go[0][h]; break;
        case 3: go = linkage_go[3][h] || linkage_go[2][h] || linkage_go[1][h] || linkage_go[0][h]; break;
      }
      if (go) return go;
    }
  }
  switch (key) {
    case 'ArrowLeft' : {
      const h = curr_h;

      let  go = null;
      switch (curr_v) {
        case 0: go = linkage_go[3][h] || linkage_go[2][h] || linkage_go[1][h]; break;
        case 1: go = linkage_go[0][h] || linkage_go[3][h] || linkage_go[2][h]; break;
        case 2: go = linkage_go[1][h] || linkage_go[0][h] || linkage_go[3][h]; break;
        case 3: go = linkage_go[2][h] || linkage_go[1][h] || linkage_go[0][h]; break;
      }
      return go;
    }
    case 'ArrowRight': {
      const h = curr_h;

      let  go = null;
      switch (curr_v) {
        case 0: go = linkage_go[1][h] || linkage_go[2][h] || linkage_go[3][h]; break;
        case 1: go = linkage_go[2][h] || linkage_go[3][h] || linkage_go[0][h]; break;
        case 2: go = linkage_go[3][h] || linkage_go[0][h] || linkage_go[1][h]; break;
        case 3: go = linkage_go[0][h] || linkage_go[1][h] || linkage_go[2][h]; break;
      }
      return go;
    }
  }

  let move = 0;
  switch (key) {
    case 'ArrowUp'  : move = -1; break;
    case 'ArrowDown': move = +1; break;
  }
  if (!move) return null;

  for (let v = 1; v < 4; v++) {
    const go = linkage_go[(curr_v + (v * move) + 4) % 4];

    if (go[curr_h    ]) return go[curr_h    ];
    if (go[curr_h ^ 1]) return go[curr_h ^ 1];
  }

  return null;
}

function item_linkage(linkage) {
  const nowrap   = linkage.parentElement;
  const details  = nowrap .parentElement;
  const wrapper  = details.parentElement;

  const index    = wrapper.item_index;
  if   (index  === undefined) return;

  // Class name format: item-linkage nnnn-dddd
  const name_dir = linkage.className.slice(-9);
  const name     = name_dir.slice(0, 4);
  const dir      = name_dir.slice(  -4);

  let linkage_arr = null;
  switch (name) {
    case "rank": linkage_arr = rank_linkage; break;
    case "horz": linkage_arr = horz_linkage; break;
    case "vert": linkage_arr = vert_linkage; break;
    case "mood": linkage_arr = mood_linkage; break;
  }
  if (!linkage_arr) return;

  const index_from = linkage_arr.findIndex(lnk => lnk.index === index);
  if   (index_from === -1) return;

  let container_go = null;
  switch (dir) {
    case "prev": container_go = linkage_arr[index_from - 1 ].container; break;
    case "next": container_go = linkage_arr[index_from + 1 ].container; break;
    case "pr10": container_go = linkage_arr[index_from - 10].container; break;
    case "nx10": container_go = linkage_arr[index_from + 10].container; break;
  }
  if (!container_go) return;

  item_details(container_go, "ensure-open", "jump-to-item", name_dir);
}

// EOF






