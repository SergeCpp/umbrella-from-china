/* Deferred Render */

const    defer_render_chunk_sz  = 30; // 16 + 27 x 30 = 826
const    defer_render_chunk_du  = 4;  // ms, max allowed for chunk: 110 ms / 826 * 30 = 3.995 ms
const    defer_render_wait      = 7;  // ms, between chunks

let      defer_render_id        = 0;  // Set in init only

let      defer_render_processed = 0;  // Set in init and step
let      defer_render_chunks    = 0;  //
let      defer_render_duration  = 0;  //

let      defer_render_wrappers  = []; // Set in init and add

function init_defer_render() {
         defer_render_id        = performance.now();
         defer_render_wrappers  = [];
}

function add_defer_render   (wrapper) {
  defer_render_wrappers.push(wrapper);
}

function defer_render() {
  defer_render_processed   =  0;
  defer_render_chunks      =  0;
  defer_render_duration    =  0;

  const chunk_sz_override  =  Math .round(defer_render_chunk_sz / 2) + 1; // Shorter first chunk
  requestAnimationFrame(() => defer_render_step(defer_render_id, chunk_sz_override)); // Fast start
}

function defer_render_step(render_id, chunk_sz_override) {
  if (render_id !== defer_render_id) return;

  const defer_render_total = defer_render_wrappers.length;
  if   (defer_render_processed === defer_render_total) return;

  const time_0   = performance.now();
  let   count    = Math.min(chunk_sz_override || defer_render_chunk_sz, defer_render_total - defer_render_processed);
  let   duration = 0;

  do {
    const wrapper = defer_render_wrappers[defer_render_processed];
    const index   = wrapper.item_index;
    if   (index === undefined) return;

    const [title_container,
            prev_container,
            curr_container,
            grow_container] = create_cells_raw(index, wrapper);

    set_item_title(index, title_container, defer_render_processed);
    set_item_prev (index,  prev_container);
    set_item_curr (index,  curr_container);
    set_item_grow (index,  grow_container);

    defer_render_processed++;
    count--;
    duration = performance.now() - time_0;

    if (duration > defer_render_chunk_du) break;
  }
  while(count);

  defer_render_chunks++;
  defer_render_duration += duration;

  if (defer_render_processed < defer_render_total) {
    setTimeout(defer_render_step, defer_render_wait, defer_render_id);
    return;
  }

  const timing = document.getElementById("timings-render-deferred");
  if   (timing)
        timing.textContent = defer_render_duration.toFixed(1) + " (" + defer_render_chunks + ')';

  setTimeout(render_finished, 0);
}

/* Cells */

let cells_raw_is      = [];
let cells_raw_subst   = {};
let cells_raw_changes = {};
let cells_raw_marks   = {};

function init_cells_raw () {
    cells_raw_is      = [];
    cells_raw_subst   = {};
    cells_raw_changes = {};
    cells_raw_marks   = {};
}

function add_cells_raw_is     (index,     is_prev, no_prev, is_both) {
             cells_raw_is     [index] = { is_prev, no_prev, is_both };
}

function add_cells_raw_subst  (index,     prev_is_subst, curr_is_subst, grow_is_subst) {
             cells_raw_subst  [index] = { prev_is_subst, curr_is_subst, grow_is_subst };
}

function add_cells_raw_changes(index,     shown, rank_change, horz_change, vert_change, mood) {
             cells_raw_changes[index] = { shown, rank_change, horz_change, vert_change, mood };
}

function add_cells_raw_marks  (index,   marks) {
             cells_raw_marks  [index] = marks;
}

function create_cells_raw(index, wrapper) {
  const raw_is    = cells_raw_is[index];
  if  (!raw_is)     return;

  const is_prev   = raw_is.is_prev;
  const no_prev   = raw_is.no_prev;
  const is_both   = raw_is.is_both;

  const raw_subst = cells_raw_subst[index];

  // Inner flex container
  const inner     = document.createElement("div");
  inner.className = "item-inner";

  // Cell 1. Title, see set_item_title
  const title_container     = document.createElement("div");
  title_container.className = "item-title-container";

  // Cell 2. Prev container (stacked), see set_item_prev
  const prev_container = document.createElement("div"); // flex: 0 0 22ch;

  if (!no_prev) {
    prev_container.className = "item-stat-container";
    prev_container.tabIndex  = -1;
  }
  else {
    prev_container.className = "item-stat-container is-empty";
    prev_container.is_empty  = true;
  }

  if (raw_subst?.prev_is_subst) prev_container.is_subst = true;

  // Cell 3. Curr container (stacked), see set_item_curr
  const curr_container = document.createElement("div"); // flex: 0 0 22ch;

  if (!is_prev) {
    curr_container.className = "item-stat-container";
    curr_container.tabIndex  = -1;
  }
  else {
    curr_container.className = "item-stat-container is-empty";
    curr_container.is_empty  = true;
  }

  if (raw_subst?.curr_is_subst) curr_container.is_subst = true;

  // Cell 4. Grow container (stacked), see set_item_grow
  const grow_container = document.createElement("div"); // flex: 0 0 3ch;

  if (is_both) {
    grow_container.className = "item-grow-container";
    grow_container.tabIndex  = -1;
  }
  else {
    grow_container.className = "item-grow-container is-empty";
    grow_container.is_empty  = true;
  }

  if (raw_subst?.grow_is_subst) grow_container.is_subst = true;

  //
  inner  .appendChild(title_container);
  inner  .appendChild( prev_container);
  inner  .appendChild( curr_container);
  inner  .appendChild( grow_container);

  wrapper.appendChild(inner);
  wrapper.classList.remove("item-wrapper-init"); // Was added for initial rendering only

  //
  const raw_marks = cells_raw_marks[index];

  if   (raw_marks) {
    const marks_num = raw_marks.length;
    const mark_last = marks_num - 1;

    for (let m = 0; m < marks_num; m++) {
      const mark_div     = document.createElement("div");
      mark_div.className = "item-mark-" + raw_marks[m];
      if (m < mark_last) mark_div.style.borderBottom = "3px solid white";
      wrapper.appendChild(mark_div);
    }

    wrapper.classList.remove("item-wrapper-init-" + marks_num + "-marks");
//  wrapper.style.borderBottom = "none"; // Last mark replaces wrapper border (set in render_results_dom)
  }

  //
  const raw_changes = cells_raw_changes[index];

  if   (raw_changes) {
    add_linkage_for_items(index,
                 raw_changes.shown,
      is_both && raw_changes.rank_change,  is_both && prev_container,
      is_both && raw_changes.horz_change,  is_both && curr_container,
     !is_prev && raw_changes.vert_change, !is_prev && curr_container,
      is_both && raw_changes.mood,         is_both && grow_container);
  }

  //
  return [title_container,
           prev_container,
           curr_container,
           grow_container];
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

  const item_gauge_above_a = document.createElement("div");
  item_gauge_above_a.className = "item-gauge-above-a";

  const item_gauge_above_b = document.createElement("div");
  item_gauge_above_b.className = "item-gauge-above-b";

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

  const item_gauge_below_a = document.createElement("div");
  item_gauge_below_a.className = "item-gauge-below-a";

  const item_gauge_below_b = document.createElement("div");
  item_gauge_below_b.className = "item-gauge-below-b";

  set_item_gauges(index, item_gauge_above_a, item_gauge_above_b, item_gauge_below_a, item_gauge_below_b);

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
let prev_raw_rank_is = {};

function init_prev_raw(show_by_old) {
    prev_raw_23_30   = show_by_old ? "23" : "30";

    prev_raw_data    = {};
    prev_raw_rank_is = {};
}

function add_prev_raw(index,
    views_old_all, days_old_all, ratio_old_all,
    views_23_30,                 ratio_23_30,
    views_7,                     ratio_7) { prev_raw_data[index] = {

    views_old_all, days_old_all, ratio_old_all,
    views_23_30,                 ratio_23_30,
    views_7,                     ratio_7 };
}

function add_prev_raw_rank_is(index,   rank_is) {
             prev_raw_rank_is[index] = rank_is;
}

function set_item_prev(index, container) {
  const raw = prev_raw_data[index];
  if  (!raw)  return;

  // Rank substantial changes marking: up and dn
  const rank_is = prev_raw_rank_is[index];
  const rank_is_class = rank_is > 0 ? " item-mark-up"
                      : rank_is < 0 ? " item-mark-dn" : "";

  const stat_prev_old       = document.createElement("div");
  stat_prev_old.className   = "item-stat-prev-old" + rank_is_class;

  const stat_prev_23        = document.createElement("div");
  stat_prev_23 .className   = "item-stat-prev-23"  + rank_is_class;

  const stat_prev_7         = document.createElement("div");
  stat_prev_7  .className   = "item-stat-prev-7"   + rank_is_class;

  stat_prev_old.textContent = raw.views_old_all.toString().padStart(6) + " /" +
                              raw. days_old_all.toString().padStart(5) + " =" +
                              raw.ratio_old_all.toFixed(3).padStart(7);
  stat_prev_23 .textContent = raw.views_23_30  .toString().padStart(6) + " /   " + prev_raw_23_30 + " =" +
                              raw.ratio_23_30  .toFixed(3).padStart(7);
  stat_prev_7  .textContent = raw.views_7      .toString().padStart(6) + " /    7 =" +
                              raw.ratio_7      .toFixed(3).padStart(7);

  container.appendChild(stat_prev_old);
  container.appendChild(stat_prev_23 );
  container.appendChild(stat_prev_7  );
}

/* Curr */

let curr_raw_23_30   = null;

let curr_raw_data    = {};
let curr_raw_horz_is = {};
let curr_raw_vert_is = {};

function init_curr_raw(show_by_old) {
    curr_raw_23_30   = show_by_old ? "23" : "30";

    curr_raw_data    = {};
    curr_raw_horz_is = {};
    curr_raw_vert_is = {};
}

function add_curr_raw(index,
    views_old_all, days_old_all, ratio_old_all,
    views_23_30,                 ratio_23_30,
    views_7,                     ratio_7) { curr_raw_data[index] = {

    views_old_all, days_old_all, ratio_old_all,
    views_23_30,                 ratio_23_30,
    views_7,                     ratio_7 };
}

function add_curr_raw_horz_is(index,   horz_is) {
             curr_raw_horz_is[index] = horz_is;
}

function add_curr_raw_vert_is(index,   vert_is) {
             curr_raw_vert_is[index] = vert_is;
}

function set_item_curr(index, container) {
  const raw = curr_raw_data[index];
  if  (!raw)  return;

  // Substantial changes marking: horizontal impact of old      from prev to     curr
  // Substantial changes marking: vertical   impact of 23 and 7 into all  within curr
  //
  const horz_is = curr_raw_horz_is[index];
  const horz_is_class = horz_is > 0 ? " item-mark-grow"
                      : horz_is < 0 ? " item-mark-fall" : "";
  //
  const vert_is = curr_raw_vert_is[index];
  const vert_is_class = vert_is > 0 ? " item-mark-grow"
                      : vert_is < 0 ? " item-mark-fall" : "";

  const stat_curr_old       = document.createElement("div");
  stat_curr_old.className   = "item-stat-curr-old" + horz_is_class;

  const stat_curr_23        = document.createElement("div");
  stat_curr_23 .className   = "item-stat-curr-23"  + vert_is_class;

  const stat_curr_7         = document.createElement("div");
  stat_curr_7  .className   = "item-stat-curr-7"   + vert_is_class;

  stat_curr_old.textContent = raw.views_old_all.toString().padStart(6) + " /" +
                              raw. days_old_all.toString().padStart(5) + " =" +
                              raw.ratio_old_all.toFixed(3).padStart(7);
  stat_curr_23 .textContent = raw.views_23_30  .toString().padStart(6) + " /   " + curr_raw_23_30 + " =" +
                              raw.ratio_23_30  .toFixed(3).padStart(7);
  stat_curr_7  .textContent = raw.views_7      .toString().padStart(6) + " /    7 =" +
                              raw.ratio_7      .toFixed(3).padStart(7);

  container.appendChild(stat_curr_old);
  container.appendChild(stat_curr_23 );
  container.appendChild(stat_curr_7  );
}

/* Grow */

let grow_raw_data    = {};
let grow_raw_mood_is = {};

function init_grow_raw() {
    grow_raw_data    = {};
    grow_raw_mood_is = {};
}

function add_grow_raw(index,     grow_old, grow_23, grow_7) {
        grow_raw_data[index] = { grow_old, grow_23, grow_7 };
}

function add_grow_raw_mood_is(index,   mood_is) {
             grow_raw_mood_is[index] = mood_is;
}

function set_item_grow(index, container) {
  const raw = grow_raw_data[index];
  if  (!raw)  return;

  // Grow mood substantial changes marking: positive and negative
  const mood_is = grow_raw_mood_is[index];
  const mood_is_class = mood_is > 0 ? " item-mark-grow"
                      : mood_is < 0 ? " item-mark-fall" : "";

  const stat_grow_old       = document.createElement("div");
  stat_grow_old.className   = "item-grow-old" + mood_is_class;

  const stat_grow_23        = document.createElement("div");
  stat_grow_23 .className   = "item-grow-23"  + mood_is_class;

  const stat_grow_7         = document.createElement("div");
  stat_grow_7  .className   = "item-grow-7"   + mood_is_class;

  stat_grow_old.textContent = raw.grow_old;
  stat_grow_23 .textContent = raw.grow_23;
  stat_grow_7  .textContent = raw.grow_7;

  container.appendChild(stat_grow_old);
  container.appendChild(stat_grow_23 );
  container.appendChild(stat_grow_7  );
}

//






