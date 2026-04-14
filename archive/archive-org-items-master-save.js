/* Deferred Render */

const    defer_render_chunk_sz  = 51;   // 17 + 15 x 51 + 44 = 826
const    defer_render_chunk_du  =  7;   // ms, max allowed duration for chunk
const    defer_render_wait      = 14;   // ms, between chunks

let      defer_render_shown     = 0;    // These set only in defer_render
let      defer_render_time      = 0;    //

let      defer_render_processed = 0;    // These set also in defer_render_step
let      defer_render_duration  = 0;    //
let      defer_render_wrapper   = null; //

function defer_render            (shown) {
         defer_render_shown     = shown;
         defer_render_time      = performance.now();

         defer_render_processed = 0;
         defer_render_duration  = 0;
         defer_render_wrapper   = null;

  if (!shown) return;

  const chunk_override = Math.max(Math.round(defer_render_chunk_sz / 3), 1); // Short first chunk
  requestAnimationFrame(() => defer_render_step(defer_render_time, chunk_override)); // Fast start
}

function defer_render_pass(defer_factor = 1) {
  setTimeout(defer_render_step, defer_render_wait * defer_factor, defer_render_time);
}

function defer_render_step(defer_time, chunk_override) {
  if (defer_time             !== defer_render_time ) return;
  if (defer_render_processed === defer_render_shown) return;

  const time_0  = performance.now();
  let   wrapper = null;

  if (!defer_render_processed) {
    const container = document.getElementById("results");
          wrapper   = container.querySelector(".item-wrapper");
    if  (!wrapper)  { defer_render_pass(10); return; } // No items yet
  }
  else {
          wrapper   = defer_render_wrapper;
  }

  let count    = Math.min(chunk_override || defer_render_chunk_sz, defer_render_shown - defer_render_processed);
  let duration = 0;

  do {
    const index = wrapper.item_index;
    if   (index === undefined) return;

    const inner           = wrapper        .firstElementChild;
    if  (!inner)            return;

    const title_container = inner          .firstElementChild;
    if  (!title_container)  return;
    const  prev_container = title_container. nextElementSibling;
    if   (!prev_container)  return;
    const  curr_container =  prev_container. nextElementSibling;
    if   (!curr_container)  return;
    const  grow_container =  curr_container. nextElementSibling;
    if   (!grow_container)  return;

    set_item_title(index, title_container, defer_render_processed);
    set_item_prev (index,  prev_container);
    set_item_curr (index,  curr_container);
    set_item_grow (index,  grow_container);

    defer_render_processed++;
    count--;
    duration = performance.now() - time_0;

    if (defer_render_processed === defer_render_shown) { wrapper = null; break; }

    wrapper = wrapper.nextElementSibling;
    if (!wrapper) return;

    if (duration > defer_render_chunk_du) break;
  }
  while(count);

  defer_render_wrapper   = wrapper;
  defer_render_duration += duration;

  if (defer_render_processed < defer_render_shown) { defer_render_pass(); return; }

  const timing = document.getElementById("timings-render-by-timer");
  if   (timing)
        timing.textContent = defer_render_duration.toFixed(1);
}

/* Title */

let title_raw_title_is_title = true;

let title_raw_identifier     = {}; // Separate flat objects are some faster than { a, b } inside one object
let title_raw_title          = {}; //

function init_title_raw       (title_is_title) {
    title_raw_title_is_title = title_is_title;

    title_raw_identifier     = {};
    title_raw_title          = {};
}

function add_title_raw  (index,   identifier, title) {
    title_raw_identifier[index] = identifier;

  if (title_raw_title_is_title)
      title_raw_title   [index] =             title;
}

function set_item_title(index, container, shown_idx) {
  const  identifier = title_raw_identifier[index];
  if   (!identifier)  return;
  const title       = title_raw_title_is_title ? title_raw_title[index] : null;

  // Above gauges
  const item_gauge_above_a = document.createElement("div");
  item_gauge_above_a.className = "item-gauge-above-a";

  const item_gauge_above_b = document.createElement("div");
  item_gauge_above_b.className = "item-gauge-above-b";

  // Link button
  const item_title = document.createElement("div");
  item_title.className = "item-title";

  const item_link = document.createElement("a");
  item_link.className = "text-ellipsis";
  item_link.href = "https://archive.org/details/" + identifier;
  item_link.rel = "noopener"; // Safe for _blank
  item_link.tabIndex = 0; // To show focus outline when set by focus() (else not shown)
  item_link.target = "_blank";
  item_link.textContent = (shown_idx === index ? "" : (shown_idx + 1) + " / ") + (index + 1) + ". " +
    (title_raw_title_is_title ? title : identifier);
  item_title.appendChild(item_link);

  // Below gauges
  const item_gauge_below_a = document.createElement("div");
  item_gauge_below_a.className = "item-gauge-below-a";

  const item_gauge_below_b = document.createElement("div");
  item_gauge_below_b.className = "item-gauge-below-b";

  // Calculate and set width for gauges
  set_item_gauges(index, item_gauge_above_a, item_gauge_above_b, item_gauge_below_a, item_gauge_below_b);

  // Assemble the hierarchy
  container.appendChild(item_gauge_above_a);
  container.appendChild(item_gauge_above_b);
  container.appendChild(item_title        );
  container.appendChild(item_gauge_below_a);
  container.appendChild(item_gauge_below_b);
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

function init_gauges_raw   (max_ratio, base_ratio, max_favorites, base_favorites) {
    gauges_max_ratio      = max_ratio;
    gauges_base_ratio     = base_ratio;
    gauges_max_favorites  = max_favorites;
    gauges_base_favorites = base_favorites;

    gauges_raw_above_a    = {};
    gauges_raw_above_b    = {};
    gauges_raw_below_a    = {};
    gauges_raw_below_b    = {};
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

function add_gauge_below_b(index,   favorites) {
        gauges_raw_below_b[index] = favorites;
}

const get_gauge_percentage = (value, max, base) =>
  (value <=   0) ?   '0%' :
  (value >= max) ? '100%' : (Math.log(value + 1) * base).toFixed(3) + '%';

function set_item_gauges(index, gauge_above_a, gauge_above_b, gauge_below_a, gauge_below_b) {
  if  (!gauge_above_a) return;
  const gauge_above_a_ratio   = gauges_raw_above_a[index];
  if   (gauge_above_a_ratio !== undefined) {
    const width = get_gauge_percentage(gauge_above_a_ratio, gauges_max_ratio, gauges_base_ratio);
    if   (width !== '0%') gauge_above_a.style.width = width;
  }

  if  (!gauge_above_b) return;
  const gauge_above_b_ratio   = gauges_raw_above_b[index];
  if   (gauge_above_b_ratio !== undefined) {
    const width = get_gauge_percentage(gauge_above_b_ratio, gauges_max_ratio, gauges_base_ratio);
    if   (width !== '0%') gauge_above_b.style.width = width;
  }

  if  (!gauge_below_a) return;
  const gauge_below_a_favorites   = gauges_raw_below_a[index];
  if   (gauge_below_a_favorites !== undefined) {
    const width = get_gauge_percentage(gauge_below_a_favorites, gauges_max_favorites, gauges_base_favorites);
    if   (width !== '0%') gauge_below_a.style.width = width;
  }

  if  (!gauge_below_b) return;
  const gauge_below_b_favorites   = gauges_raw_below_b[index];
  if   (gauge_below_b_favorites !== undefined) {
    const width = get_gauge_percentage(gauge_below_b_favorites, gauges_max_favorites, gauges_base_favorites);
    if   (width !== '0%') gauge_below_b.style.width = width;
  }
}

/* Prev */

let prev_raw_23_30   = null;

let prev_raw_data    = {};

function init_prev_raw(show_by_old) {
    prev_raw_23_30   = show_by_old ? "23" : "30";

    prev_raw_data    = {};
}

function add_prev_raw(index,
    views_old_all, days_old_all, ratio_old_all,
    views_23_30,                 ratio_23_30,
    views_7,                     ratio_7) { prev_raw_data[index] = {

    views_old_all, days_old_all, ratio_old_all,
    views_23_30,                 ratio_23_30,
    views_7,                     ratio_7 };
}

function set_item_prev(index, container) {
  const  raw = prev_raw_data[index];
  if   (!raw)  return;

  const _old = raw.views_old_all.toString().padStart(6) + " /" +
               raw. days_old_all.toString().padStart(5) + " =" +
               raw.ratio_old_all.toFixed(3).padStart(7);
  const _23  = raw.views_23_30  .toString().padStart(6) + " /   " + prev_raw_23_30 + " =" +
               raw.ratio_23_30  .toFixed(3).padStart(7);
  const _7   = raw.views_7      .toString().padStart(6) + " /    7 =" +
               raw.ratio_7      .toFixed(3).padStart(7);

  const e_old  = container.firstElementChild;
  if  (!e_old)   return;
  const e_23   = e_old    . nextElementSibling;
  if  (!e_23)    return;
  const e_7    = e_23     . nextElementSibling;
  if  (!e_7)     return;

  e_old.textContent = _old;
  e_23 .textContent = _23;
  e_7  .textContent = _7;
}

/* Curr */

let curr_raw_23_30   = null;

let curr_raw_data    = {};

function init_curr_raw(show_by_old) {
    curr_raw_23_30   = show_by_old ? "23" : "30";

    curr_raw_data    = {};
}

function add_curr_raw(index,
    views_old_all, days_old_all, ratio_old_all,
    views_23_30,                 ratio_23_30,
    views_7,                     ratio_7) { curr_raw_data[index] = {

    views_old_all, days_old_all, ratio_old_all,
    views_23_30,                 ratio_23_30,
    views_7,                     ratio_7 };
}

function set_item_curr(index, container) {
  const  raw = curr_raw_data[index];
  if   (!raw)  return;

  const _old = raw.views_old_all.toString().padStart(6) + " /" +
               raw. days_old_all.toString().padStart(5) + " =" +
               raw.ratio_old_all.toFixed(3).padStart(7);
  const _23  = raw.views_23_30  .toString().padStart(6) + " /   " + curr_raw_23_30 + " =" +
               raw.ratio_23_30  .toFixed(3).padStart(7);
  const _7   = raw.views_7      .toString().padStart(6) + " /    7 =" +
               raw.ratio_7      .toFixed(3).padStart(7);

  const e_old  = container.firstElementChild;
  if  (!e_old)   return;
  const e_23   = e_old    . nextElementSibling;
  if  (!e_23)    return;
  const e_7    = e_23     . nextElementSibling;
  if  (!e_7)     return;

  e_old.textContent = _old;
  e_23 .textContent = _23;
  e_7  .textContent = _7;
}

/* Grow */

let grow_raw_data = {};

function init_grow_raw() {
    grow_raw_data = {};
}

function add_grow_raw(index,     grow_old, grow_23, grow_7) {
        grow_raw_data[index] = { grow_old, grow_23, grow_7 };
}

function set_item_grow(index, grow_container) {
  const raw = grow_raw_data[index];
  if  (!raw)  return;

  const grow_old  = grow_container.firstElementChild;
  if  (!grow_old)   return;
  const grow_23   = grow_old      . nextElementSibling;
  if  (!grow_23)    return;
  const grow_7    = grow_23       . nextElementSibling;
  if  (!grow_7)     return;

                    //  123
  if (raw.grow_old !== "   ") grow_old.textContent = raw.grow_old;
  if (raw.grow_23  !== "   ") grow_23 .textContent = raw.grow_23;
  if (raw.grow_7   !== "   ") grow_7  .textContent = raw.grow_7;
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
        ix_cell === 1 ?  "rank-prev"  :
        ix_cell === 2 ? ["horz-prev",
                         "vert-prev"] :
        ix_cell === 3 ?  "mood-prev"  : "");
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

  focus_linkage(details_div, linkage_go);
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
  const    prev_go = details.querySelector('.' + name + '-' + "prev");
  const    next_go = details.querySelector('.' + name + '-' + "next");
  const    pr10_go = details.querySelector('.' + name + '-' + "pr10");
  const    nx10_go = details.querySelector('.' + name + '-' + "nx10");

  const linkage_go = [ [next_go ? prev_go : null, next_go ? next_go : prev_go],
                       [nx10_go ? pr10_go : null, nx10_go ? nx10_go : pr10_go] ];
  let h = -1;
  switch (dir) {
    case "prev": h = next_go ? 0 : 1; break;
    case "pr10": h = nx10_go ? 0 : 1; break;
    case "next": h =               1; break;
    case "nx10": h =               1; break;
  }
  if (h === -1) return null;

  let v = -1;
  switch (dir) {
    case "prev":
    case "next": v = 0; break;
    case "pr10":
    case "nx10": v = 1; break;
  }
  if (v === -1) return null;

  switch (h +  key) {
    case  0 + 'ArrowLeft' :
    case  0 + 'ArrowRight':
      switch (v) {
        case  0: return linkage_go[0][1] || linkage_go[1][1] || linkage_go[1][0];
        case  1: return linkage_go[1][1] || linkage_go[0][1] || linkage_go[0][0];
      }

    case  1 + 'ArrowLeft' :
    case  1 + 'ArrowRight':
      switch (v) {
        case  0: return linkage_go[0][0] || linkage_go[1][0] || linkage_go[1][1];
        case  1: return linkage_go[1][0] || linkage_go[0][0] || linkage_go[0][1];
      }
  }

  switch (v +  key) {
    case  0 + 'ArrowUp'  :
    case  0 + 'ArrowDown':
      switch (h) {
        case  0: return linkage_go[1][0] || linkage_go[1][1] || linkage_go[0][1];
        case  1: return linkage_go[1][1] || linkage_go[1][0] || linkage_go[0][0];
      }

    case  1 + 'ArrowUp'  :
    case  1 + 'ArrowDown':
      switch (h) {
        case  0: return linkage_go[0][0] || linkage_go[0][1] || linkage_go[1][1];
        case  1: return linkage_go[0][1] || linkage_go[0][0] || linkage_go[1][0];
      }
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

  const   linkage_go = [ [horz_next_go ? horz_prev_go : null, horz_next_go ? horz_next_go : horz_prev_go],
                         [horz_nx10_go ? horz_pr10_go : null, horz_nx10_go ? horz_nx10_go : horz_pr10_go],
                         [vert_next_go ? vert_prev_go : null, vert_next_go ? vert_next_go : vert_prev_go],
                         [vert_nx10_go ? vert_pr10_go : null, vert_nx10_go ? vert_nx10_go : vert_pr10_go] ];
  let h = -1;
  switch (name  +  dir) {
    case "horz" + "prev": h = horz_next_go ? 0 : 1; break;
    case "horz" + "pr10": h = horz_nx10_go ? 0 : 1; break;
    case "horz" + "next": h =                    1; break;
    case "horz" + "nx10": h =                    1; break;
    case "vert" + "prev": h = vert_next_go ? 0 : 1; break;
    case "vert" + "pr10": h = vert_nx10_go ? 0 : 1; break;
    case "vert" + "next": h =                    1; break;
    case "vert" + "nx10": h =                    1; break;
  }
  if (h === -1) return null;

  let v = -1;
  switch (name  +  dir) {
    case "horz" + "prev":
    case "horz" + "next": v = 0; break;
    case "horz" + "pr10":
    case "horz" + "nx10": v = 1; break;
    case "vert" + "prev":
    case "vert" + "next": v = 2; break;
    case "vert" + "pr10":
    case "vert" + "nx10": v = 3; break;
  }
  if (v === -1) return null;

  switch (key) {
    case 'ArrowLeft' :
    case 'ArrowRight': {
      const s = h ^ 1;
      let  go = null;
      switch (v) {
        case  0: go = linkage_go[0][s] || linkage_go[1][s] || linkage_go[2][s] || linkage_go[3][s]; break;
        case  1: go = linkage_go[1][s] || linkage_go[0][s] || linkage_go[2][s] || linkage_go[3][s]; break;
        case  2: go = linkage_go[2][s] || linkage_go[3][s] || linkage_go[1][s] || linkage_go[0][s]; break;
        case  3: go = linkage_go[3][s] || linkage_go[2][s] || linkage_go[1][s] || linkage_go[0][s]; break;
      }
      if (go) return go;
    }
  }
  switch (key) {
    case 'ArrowLeft' :
      switch (v) {
        case  0: return linkage_go[3][h] || linkage_go[2][h] || linkage_go[1][h];
        case  1: return linkage_go[0][h] || linkage_go[3][h] || linkage_go[2][h];
        case  2: return linkage_go[1][h] || linkage_go[0][h] || linkage_go[3][h];
        case  3: return linkage_go[2][h] || linkage_go[1][h] || linkage_go[0][h];
      }

    case 'ArrowRight':
      switch (v) {
        case  0: return linkage_go[1][h] || linkage_go[2][h] || linkage_go[3][h];
        case  1: return linkage_go[2][h] || linkage_go[3][h] || linkage_go[0][h];
        case  2: return linkage_go[3][h] || linkage_go[0][h] || linkage_go[1][h];
        case  3: return linkage_go[0][h] || linkage_go[1][h] || linkage_go[2][h];
      }
  }

  let move = 0;
  switch (key) {
    case 'ArrowUp'  : move = -1; break;
    case 'ArrowDown': move = +1; break;
  }
  if (!move) return null;

  for (let i = 1; i < 4; i++) {
    const go = linkage_go[(v + (i * move) + 4) % 4];

    if (go[h    ]) return go[h    ];
    if (go[h ^ 1]) return go[h ^ 1];
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

function focus_linkage(details_div, linkage_go) {
  if (!details_div || !linkage_go) return false;

  if (typeof linkage_go === "object")
    return focus_linkage(details_div, linkage_go[0]) ||
           focus_linkage(details_div, linkage_go[1]);

  // No scroll downstream, do not interfere with scroll upstream

  const link_name = linkage_go.slice(0, 4);
  const link_dir  = linkage_go.slice(  -4);

  const linkage   = details_div.querySelector('.' + linkage_go);
  if   (linkage)  { linkage.focus({ preventScroll: true }); return true; }

  let linkage2_go = null;
  switch (link_dir) {
    case "prev": linkage2_go = link_name + "-next"; break
    case "next": linkage2_go = link_name + "-prev"; break
    case "pr10": linkage2_go = link_name + "-prev"; break
    case "nx10": linkage2_go = link_name + "-next"; break
  }
  if (!linkage2_go) return false;

  const linkage2  = details_div.querySelector('.' + linkage2_go);
  if   (linkage2) { linkage2.focus({ preventScroll: true }); return true; }

  let linkage3_go = null;
  switch (link_dir) {
    case "pr10": linkage3_go = link_name + "-nx10"; break
    case "nx10": linkage3_go = link_name + "-pr10"; break
  }
  if (!linkage3_go) return false;

  const linkage3  = details_div.querySelector('.' + linkage3_go);
  if   (linkage3) { linkage3.focus({ preventScroll: true }); return true; }

  return false;
}

// EOF






