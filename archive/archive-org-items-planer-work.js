/* Compose Header */

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

  set_chain_keys_line      ([header_title_wrapper,
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

/* Compose Items */

// results_curr_exp is sorted
function compose_items(results_curr_exp, curr_exp_totals, map_prev, title_is, show_by, mood_by) {
  const title_is_title = (title_is === "title"     ); // Else is "identifier"
  const show_by_old    = (show_by  === "old-23-7"  ); // Else by "all-30-7"
  const mood_by_same   = (mood_by  === "same-signs"); // Else by "diff-signs"

  ////////////////////////
  // Log scaling of gauges
  //
  const max_ratio      = Math.max(curr_exp_totals.max_ratio_old, curr_exp_totals.max_ratio_all);
  const max_favorites  = curr_exp_totals.max_favorites;
  //
  const base_ratio     = (max_ratio     <= 0) ? 0 : 100 / Math.log(max_ratio     + 1);
  const base_favorites = (max_favorites <= 0) ? 0 : 100 / Math.log(max_favorites + 1);
  //
  init_gauges_raw(max_ratio, base_ratio, max_favorites, base_favorites);

  //////////////////////////////////////
  // Compose title, prev, curr, and grow
  //
  init_title_raw(title_is_title);
  init_prev_raw (show_by_old);
  init_curr_raw (show_by_old);
  init_grow_raw ();
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
  // Mark mood
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

    ////////
    // Title
    //
    if (title_is_title) {
      add_title_raw(index_curr, item.identifier, item.title);
    }
    else {
      add_title_raw(index_curr, item.identifier);
    }

    ///////
    // Prev
    //
    if (!item.no_prev) {
      if (show_by_old) {
        add_prev_raw(index_curr, item_prev.views_old, item_prev.days_old, item_prev.ratio_old,
                                 item_prev.views_23,                      item_prev.ratio_23,
                                 item_prev.views_7,                       item_prev.ratio_7);
      }
      else {
        add_prev_raw(index_curr, item_prev.views_all, item_prev.days_all, item_prev.ratio_all,
                                 item_prev.views_30,                      item_prev.ratio_30,
                                 item_prev.views_7,                       item_prev.ratio_7);
      }
    }

    ///////
    // Curr
    //
    if (!item.is_prev) {
      if (show_by_old) {
        add_curr_raw(index_curr, item.views_old, item.days_old, item.ratio_old,
                                 item.views_23,                 item.ratio_23,
                                 item.views_7,                  item.ratio_7);
      }
      else {
        add_curr_raw(index_curr, item.views_all, item.days_all, item.ratio_all,
                                 item.views_30,                 item.ratio_30,
                                 item.views_7,                  item.ratio_7);
      }
    }

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
    horz_curr_prev.push({ index: index_curr, value: horz_change, time: item.time_all }); // Needed in array anyway
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
    vert_all_old.push({ index: index_curr, value: vert_change, time: item.time_all }); // Needed in array anyway

    //////////////////////////////
    // Rank change, 0 is no change
    //
    let   rank_change = 0;
    const rank_diff   = item.index_prev - index_curr; // No abs
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
    rank_up_dn.push({ index: index_curr, value: rank_change, time: item.time_all }); // Needed in array anyway

    //////////////////////////////
    // Grow and Mood, 0 is no Mood
    //
    let mood = 0;
    if (item.is_both) { // Item is markable
      const grow_old = show_by_old
                     ? get_grow_ratio(item_prev.ratio_old, item.ratio_old)
                     : get_grow_ratio(item_prev.ratio_all, item.ratio_all);
      const grow_23  = show_by_old
                     ? get_grow_fixed(item_prev.views_23,  item.views_23 )
                     : get_grow_fixed(item_prev.views_30,  item.views_30 );
      const grow_7   = get_grow_fixed(item_prev.views_7,   item.views_7  );

      add_grow_raw(index_curr, grow_old, grow_23, grow_7);

      const grow_mood = get_grow_mood(grow_old, grow_23, grow_7, mood_by_same);
      if   (grow_mood) {
//      const mood_scale = get_scale_log(index_curr, curr_log_base, mood_log_steep, mood_decay);
        const mood_scale = get_scale_sig(index_curr, curr_length,
          mood_sig_base, mood_sig_steep, mood_decay, mood_sig_min, mood_sig_max);
        mood = grow_mood / mood_scale;
        item.mood = mood; // Needed in markable item only, and if grow_mood is not 0 only
        add_details_raw_mood(index_curr, grow_mood, mood_scale, mood);
      }
    }
    mood_pos_neg.push({ index: index_curr, value: mood, time: item.time_all }); // Needed in array anyway

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

// EOF






