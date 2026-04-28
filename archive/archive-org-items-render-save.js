/* How to show and sort items */

let  title_is           = "title";      // "title"      / "identifier"
let   show_by           = "old-23-7";   // "old-23-7"   / "all-30-7"
let   sort_by           = "ratio";      // "ratio"      / "views"
let   mood_by           = "same-signs"; // "same-signs" / "diff-signs"

let  subst_scaled       = true; function inp_scale (chk) { subst_scaled = chk.checked; }

/* Which items to show */

let   chks_chain        = []; // Checkboxes chain (for arrows setting)

let   show_prev         = true; function inp_prev  (chk) { show_prev    = chk.checked; }
let   show_curr         = true; function inp_curr  (chk) { show_curr    = chk.checked; }
let   show_both         = true; function inp_both  (chk) { show_both    = chk.checked; }

let   show_plain        = true; function inp_plain (chk) { show_plain   = chk.checked; }

const show_noplain      = {}; // [noplain] = true / false
const hide_noplain      = {}; // [noplain] = false / true

let   show_nomark       = true;
let   show_plain_nomark = true;
let   show_subst_marked = true;

const show_mark         = {}; // [mark]  = true / false
const hide_mark         = {}; // [mark]  = false / true

const show_marked_by    = {}; // [num]   = undefined (means true) / true / false
const show_marked_on_2  = {}; // [group] = undefined (means true) / true / false
const show_marked_on_3  = {}; // [group] = undefined (means true) / true / false

function inp_show_hide(chk, accent) {
  if (show_noplain[accent]) {
      show_noplain[accent] = false;
      hide_noplain[accent] = true;

    chk.classList.remove(accent);
    chk.checked = true;
    return;
  }

  if (hide_noplain[accent]) {
      hide_noplain[accent] = false;

    chk.classList.add(accent);
    return;
  }

  show_noplain[accent] = true;
}

const list_noplain = ['rank-up', 'horz-grow', 'vert-grow', 'mood-pos',
                      'rank-dn', 'horz-fall', 'vert-fall', 'mood-neg'];

function get_filtering_noplain() {
  for (const noplain of list_noplain) {
    if (!show_noplain[noplain]) return true;
    if ( hide_noplain[noplain]) return true;
  }

  return false;
}

function init_render() {
  for (const noplain of list_noplain) {
    show_noplain[noplain] = true;
    hide_noplain[noplain] = false;
  }

  for (const mark of tab_marks()) {
    show_mark[mark] = true;
    hide_mark[mark] = false;
  }
}

/* Render */

let      page_just_loaded  = true;
const    process_du_render = { pre: 0, dom: 0 }; // ms

function time_render() {
  return process_du_render;
}

function render_results(results_prev, date_prev, results_curr, date_curr, results_mark) {
  try {

  const time_0 = performance.now();

  if (!results_prev.length && !results_curr.length) {
    process_error(error_compose("No items matched the filters"));
    return;
  }

  ///////
  // Sets
  //
  let only_prev = 0;
  let only_curr = 0;
  let only_both = 0;

  // Lookup helper for create curr expanded results array
  // Create curr expanded results array
  const results_curr_ids = {};
  const results_curr_exp = [];
  for (const item of results_curr) {
    results_curr_ids[item.identifier] = true;
    results_curr_exp.push({ ...item,
      is_prev      : false,
      no_prev      : null,
      is_both      : null,
      index_prev   : null,
      horz_change  : 0,
      vert_change  : 0,
      rank_change  : 0,
      mood         : 0,
      marks        : null,
      is_rank_up   : null,
      is_rank_dn   : null,
      is_horz_grow : null,
      is_horz_fall : null,
      is_vert_grow : null,
      is_vert_fall : null,
      is_mood_pos  : null,
      is_mood_neg  : null,
      is_plain     : null });
  }

  // Add items from  results_prev that absent in results_curr
  // Create a map of results_prev by identifier
  const map_prev = {};
  for (const item of results_prev) {
    if (!results_curr_ids[item.identifier]) {
      only_prev++;
      results_curr_exp.push({ ...item,
        is_prev      : true,
        no_prev      : null,
        is_both      : null,
        index_prev   : null,
        horz_change  : 0,
        vert_change  : 0,
        rank_change  : 0,
        mood         : 0,
        marks        : null,
        is_rank_up   : null,
        is_rank_dn   : null,
        is_horz_grow : null,
        is_horz_fall : null,
        is_vert_grow : null,
        is_vert_fall : null,
        is_mood_pos  : null,
        is_mood_neg  : null,
        is_plain     : null });
    }
    map_prev[item.identifier] = item;
  }

  // Create prev expanded results array
  // Add items from results_curr that absent in results_prev
  const results_prev_exp = [...results_prev]; // Make copy
  for (const item of results_curr) {
    if (!map_prev[item.identifier]) {
      only_curr++;
      results_prev_exp.push({ ...item });
    }
  }

  // For use below
  const prev_length = results_prev_exp.length;
  const curr_length = results_curr_exp.length;

  // Sets
  only_both = curr_length - only_curr - only_prev;

  // Sort expanded arrays for show in list (curr) and rank changes calculations (both)
  sort_results(results_curr_exp, show_by, sort_by);
  sort_results(results_prev_exp, show_by, sort_by);

  // Create a map of curr expanded results by identifier
  // Set no_prev actual values in curr expanded results
  // Set is_both actual values in curr expanded results
  const map_curr_exp = {};
  for (const item of results_curr_exp) {
    map_curr_exp[item.identifier] = item;
    item.no_prev = !map_prev[item.identifier];
    item.is_both = !item.no_prev && !item.is_prev;
  }

  // Traverse prev expanded and set index_prev in curr expanded
  for (let index = 0; index < prev_length; index++) {
    const item = results_prev_exp[index];
    map_curr_exp[item.identifier].index_prev = index;
  }

  ////////
  // Marks
  //
  let mark_counts     = null;
  let marks_count     = 0;    // === mark_counts.length
  let marks_populated = 0;    // Marks that have items marked by this mark
  let marks_zero      = 0;    // Mark present, but no items marked by this mark
  let marked_by       = null;
  let marked_on_2     = null;
  let marked_on_3     = null;
  let marked_items    = 0;
  let nomark_items    = curr_length;

  if (results_mark) {
    for (const rm of results_mark) {
      let mark_count = 0;

      for (const mark_item of rm.prev) {
        const id   = mark_item.identifier;
        const item = map_curr_exp[id];
        if  (!item || item.no_prev) continue;

        if  (!item.marks) { item.marks = []; marked_items++; }
        item.marks.push(rm.mark);
        mark_count++;
      }

      for (const mark_item of rm.curr) {
        const id   = mark_item.identifier;
        const item = map_curr_exp[id];
        if  (!item || item.is_prev) continue;

        if   (item.marks && item.marks.includes(rm.mark)) continue; // Avoid duplication of mark

        if  (!item.marks) { item.marks = []; marked_items++; }
        item.marks.push(rm.mark);
        mark_count++;
      }

      if (!mark_counts) mark_counts = [];
      mark_counts.push({ mark: rm.mark, count: mark_count });
      marks_count++;
      marks_zero += !mark_count; // No items marked by this mark
    }

    marks_populated = marks_count - marks_zero;
    nomark_items   -= marked_items;

    // Gather "Marked by # marks" and "Marked on 2/3" counts
    for (const item of results_curr_exp) {
      const marks = item.marks;
      if  (!marks) continue;
      if  (!marked_by) marked_by = {};

      const     num  = marks.length;
      marked_by[num] = (marked_by[num] || 0) + 1;

      switch (num) {
        case 2: {
          const group = marks[0] + marks[1];
          if  (!marked_on_2) marked_on_2 = {};
          marked_on_2[group] = (marked_on_2[group] || 0) + 1;
          break;
        }
        case 3: {
          const group = marks[0] + marks[1] + marks[2];
          if  (!marked_on_3) marked_on_3 = {};
          marked_on_3[group] = (marked_on_3[group] || 0) + 1;
          break;
        }
      }
    }
  }

  ////////////////////////////////////////////////
  // Total counts calculating for expanded results
  //
  const curr_exp_totals = get_totals(results_curr_exp);
  const curr_exp_total  =  curr_exp_totals.audio +   curr_exp_totals.video;
  const curr_exp_media  =  curr_exp_totals.audio && !curr_exp_totals.video ? 'Audio ' :
                          !curr_exp_totals.audio &&  curr_exp_totals.video ? 'Video ' : "";

  /////////////////////////////////////////////////////////////////////////
  // Compose items and calculate parameters for substantial changes marking
  //
  const {
    horz_marks,
    vert_marks,
    rank_marks,
    mood_marks
  } = compose_items(results_curr_exp, curr_exp_totals, map_prev, title_is, show_by, mood_by, subst_scaled);

  const mark_val_grow_old  = horz_marks.above.val;
  const mark_val_fall_old  = horz_marks.below.val;
  const mark_tim_grow_old  = horz_marks.above.tim;
  const mark_tim_fall_old  = horz_marks.below.tim;

  const mark_val_grow_23_7 = vert_marks.above.val;
  const mark_val_fall_23_7 = vert_marks.below.val;
  const mark_tim_grow_23_7 = vert_marks.above.tim;
  const mark_tim_fall_23_7 = vert_marks.below.tim;

  const mark_val_rank_up   = rank_marks.above.val;
  const mark_val_rank_dn   = rank_marks.below.val;
  const mark_tim_rank_up   = rank_marks.above.tim;
  const mark_tim_rank_dn   = rank_marks.below.tim;

  const mark_val_mood_pos  = mood_marks.above.val;
  const mark_val_mood_neg  = mood_marks.below.val;
  const mark_tim_mood_pos  = mood_marks.above.tim;
  const mark_tim_mood_neg  = mood_marks.below.tim;

  // Set substantial changes flags for items
  // Count substantially changed and plain items, also subst marked and plain nomarked items
  let subst_items  = 0;
  let plain_nomark = 0;
  let subst_marked = 0;

  for (const item of results_curr_exp) {
    const is_prev  = item.is_prev;
    const is_both  = item.is_both;

    const time_all = item.time_all;

    //
    const is_rank_up   =  is_both && // item.index_prev > index
      ( (item.rank_change  >  mark_val_rank_up)   ||
       ((item.rank_change === mark_val_rank_up)   && (time_all <= mark_tim_rank_up)));

    const is_rank_dn   =  is_both && // item.index_prev < index
      ( (item.rank_change  <  mark_val_rank_dn)   ||
       ((item.rank_change === mark_val_rank_dn)   && (time_all >= mark_tim_rank_dn)));

    //
    const is_horz_grow =  is_both &&
      ( (item.horz_change  >  mark_val_grow_old)  ||
       ((item.horz_change === mark_val_grow_old)  && (time_all <= mark_tim_grow_old)));

    const is_horz_fall =  is_both &&
      ( (item.horz_change  <  mark_val_fall_old)  ||
       ((item.horz_change === mark_val_fall_old)  && (time_all >= mark_tim_fall_old)));

    //
    const is_vert_grow = !is_prev &&
      ( (item.vert_change  >  mark_val_grow_23_7) ||
       ((item.vert_change === mark_val_grow_23_7) && (time_all <= mark_tim_grow_23_7)));

    const is_vert_fall = !is_prev &&
      ( (item.vert_change  <  mark_val_fall_23_7) ||
       ((item.vert_change === mark_val_fall_23_7) && (time_all >= mark_tim_fall_23_7)));

    //
    const is_mood_pos  =  is_both &&
      ( (item.mood         >  mark_val_mood_pos)  ||
       ((item.mood        === mark_val_mood_pos)  && (time_all <= mark_tim_mood_pos)));

    const is_mood_neg  =  is_both &&
      ( (item.mood         <  mark_val_mood_neg)  ||
       ((item.mood        === mark_val_mood_neg)  && (time_all >= mark_tim_mood_neg)));

    //
    const is_subst     =  is_rank_up || is_horz_grow || is_vert_grow || is_mood_pos ||
                          is_rank_dn || is_horz_fall || is_vert_fall || is_mood_neg;

    item.is_rank_up    =  is_rank_up;
    item.is_rank_dn    =  is_rank_dn;

    item.is_horz_grow  =  is_horz_grow;
    item.is_horz_fall  =  is_horz_fall;

    item.is_vert_grow  =  is_vert_grow;
    item.is_vert_fall  =  is_vert_fall;

    item.is_mood_pos   =  is_mood_pos;
    item.is_mood_neg   =  is_mood_neg;

    item.is_plain      = !is_subst;
    subst_items       +=  is_subst;

    plain_nomark      += !is_subst && (item.marks === null);
    subst_marked      +=  is_subst && (item.marks !== null);
  }

  const plain_items     = curr_length - subst_items;

  process_du_render.pre = performance.now() - time_0;

  setTimeout(render_results_dom, 0,
    results_prev, date_prev, results_curr, date_curr, results_curr_exp, curr_length, map_prev,
    curr_exp_totals, curr_exp_total, curr_exp_media,
    only_prev, only_curr, only_both, plain_items, subst_items,
    horz_marks, vert_marks, rank_marks, mood_marks,
    marks_count, marks_populated, mark_counts, marked_by, marked_on_2, marked_on_3,
    marked_items, nomark_items, plain_nomark, subst_marked);

  } catch (err) {
    process_error(error_compose("Error: " + err.message));
  }
}

function render_results_dom(
    results_prev, date_prev, results_curr, date_curr, results_curr_exp, curr_length, map_prev,
    curr_exp_totals, curr_exp_total, curr_exp_media,
    only_prev, only_curr, only_both, plain_items, subst_items,
    horz_marks, vert_marks, rank_marks, mood_marks,
    marks_count, marks_populated, mark_counts, marked_by, marked_on_2, marked_on_3,
    marked_items, nomark_items, plain_nomark, subst_marked) {

  try {

  const time_0    = performance.now();

  const container = document  . getElementById("results");
        container . innerHTML = "";

  ///////////////////////////////////////////////
  // Total counts displaying for expanded results
  //
  const totals_div      = document.createElement("div");
  totals_div.className  ="subtitle text-center text-normal";
  totals_div.innerHTML  =
    format_nowrap(format_num_str(curr_exp_total,
                                 curr_exp_media          +  'Item') + ':') + ' '  +

                                (curr_exp_media ? "" :
    format_nowrap(format_number (curr_exp_totals.audio)  + ' Audio' +    ' and '  +
                  format_number (curr_exp_totals.video)  + ' Video' + ',') + ' ') +

    format_nowrap(format_bytes  (curr_exp_totals.bytes)             + ',') + ' '  +
    format_nowrap(format_num_str(curr_exp_totals.views,     'View') + ',') + ' '  +
    format_nowrap(format_num_str(curr_exp_totals.favorites, 'Fav' ) +     ' on '  +
                  format_num_str(curr_exp_totals.favorited, 'Item'));
  container.appendChild(totals_div);

  ///////////////////////////////////////////////////////////////////
  // Both stats displaying (also sorts results_prev and results_curr)
  //
  render_stats(results_prev, date_prev, "prev", show_by, sort_by, container);
  render_stats(results_curr, date_curr, "curr", show_by, sort_by, container);

  ///////////////////
  // Diffs displaying
  //
  render_diffs(results_prev, results_curr, curr_length, show_by, container);

  ////////////////////////////////////////
  // Checkboxes chain (for arrows setting)
  //
  chks_chain = [];

  //////////////////////
  // Which items to show
  //
  const pre_chk_html = (id) => {
    return '<label for="' + id + '" style="cursor: pointer;">';
  };

  const set_chk_html = (id, accent, show, hide, input) => {
    chks_chain.push(id);
    return '<input id="' + id + '" ' +
      'class="in-chk' + (accent && !hide ? ' ' + accent : "") + '" ' +
      'type="checkbox" ' + (show || hide ? 'checked ' : "") +
      'oninput="' + input + '(this, \'' + accent + '\')" ' +
      'onkeyup="if (event.key === \'Enter\') { save_focus(\'' + id + '\'); process_filter(); }">';
  };

  const s_h_chk_html = (id, accent) => {
    return set_chk_html(id, accent, show_noplain[accent],
                                    hide_noplain[accent], 'inp_show_hide');
  };

  const suf_chk_html = (id, checked, input) => {
    return '</label>' + set_chk_html(id, "", checked, false, input);
  };

  // Sets displaying
  // Which items to show
  const sets_div = document.createElement("div");
  sets_div.className = "text-center text-comment";

  const chk_prev = only_prev && (only_curr || only_both);
  const chk_curr = only_curr && (only_prev || only_both);
  const chk_both = only_both && (only_prev || only_curr);

  if (only_prev || only_curr) {
    const pre_prev = chk_prev ? pre_chk_html('show-prev') : "";
    const pre_curr = chk_curr ? pre_chk_html('show-curr') : "";
    const pre_both = chk_both ? pre_chk_html('show-both') : "";

    const suf_prev = chk_prev ? suf_chk_html('show-prev', show_prev, 'inp_prev') : ',';
    const suf_curr = chk_curr ? suf_chk_html('show-curr', show_curr, 'inp_curr') : ',';
    const suf_both = chk_both ? suf_chk_html('show-both', show_both, 'inp_both') : "";

    // Span wrappers around checkboxes are needed also for text not to become too small
    sets_div.innerHTML =
      format_nowrap(pre_prev + format_num_str(only_prev, "Item") + ' in Prev only' + suf_prev) + ' ' +
      format_nowrap(pre_curr + format_num_str(only_curr, "Item") + ' in Curr only' + suf_curr) + ' ' +
      format_nowrap(pre_both + format_num_str(only_both, "Item") + ' in both'      + suf_both);
  }
  else { // No items in prev/curr only
    sets_div.innerHTML =
      format_nowrap((only_both === 1 ? 'Item is' : 'All Items are') + ' present') + ' ' +
      format_nowrap('in both Prev and Curr');
  }
  container.appendChild(sets_div);

  // Which items to show
  const subst_chk_div = document.createElement("div");
  subst_chk_div.className = "text-center text-comment";

  // For spans and checkboxes see above
  subst_chk_div.innerHTML =
    format_nowrap(
      pre_chk_html('show-plain')     + 'Plain: ' + format_num_str(plain_items, "Item") +
      suf_chk_html('show-plain',   show_plain, 'inp_plain'))        + ' ' +
    format_nowrap(                     'Substantially changed in:') + ' ' +
    format_nowrap(
      pre_chk_html('show-rank-up')   + 'Rank' + '</label>' +
      s_h_chk_html('show-rank-up',     'rank-up'  )  +
      s_h_chk_html('show-rank-dn',     'rank-dn'  )) + ' ' +
    format_nowrap(
      pre_chk_html('show-horz-grow') + 'Horz' + '</label>' +
      s_h_chk_html('show-horz-grow',   'horz-grow')  +
      s_h_chk_html('show-horz-fall',   'horz-fall')) + ' ' +
    format_nowrap(
      pre_chk_html('show-vert-grow') + 'Vert' + '</label>' +
      s_h_chk_html('show-vert-grow',   'vert-grow')  +
      s_h_chk_html('show-vert-fall',   'vert-fall')) + ' ' +
    format_nowrap(
      pre_chk_html('show-mood-pos')  + 'Mood' + '</label>' +
      s_h_chk_html('show-mood-pos',    'mood-pos' )  +
      s_h_chk_html('show-mood-neg',    'mood-neg' )) + ' ' +
    format_nowrap(
      pre_chk_html('subst-scaled')   + 'Scaled' +
      suf_chk_html('subst-scaled', subst_scaled, 'inp_scale'));
  container.appendChild(subst_chk_div);

  // Substantial changes counts
  const subst_cnt_div = document.createElement("div");
  subst_cnt_div.className = "text-center text-comment";

  const subst_cnt_span = document.createElement("span");
  subst_cnt_span.className = "text-nowrap";
  subst_cnt_span.textContent = "Substantial: " + format_num_str(subst_items, "Item") + " in:";
  subst_cnt_div.appendChild(subst_cnt_span);
  subst_cnt_div.appendChild(document.createTextNode(' '));

  const subst_cnt_rank = document.createElement("span");
  subst_cnt_rank.className = "text-nowrap";                    // \u200a is &hairsp;
  subst_cnt_rank.textContent = "Rank: " + rank_marks.above.cnt + '\u200a/\u200a' + rank_marks.below.cnt + ',';
  subst_cnt_div.appendChild(subst_cnt_rank);
  subst_cnt_div.appendChild(document.createTextNode(' '));

  const subst_cnt_horz = document.createElement("span");
  subst_cnt_horz.className = "text-nowrap";
  subst_cnt_horz.textContent = "Horz: " + horz_marks.above.cnt + '\u200a/\u200a' + horz_marks.below.cnt + ',';
  subst_cnt_div.appendChild(subst_cnt_horz);
  subst_cnt_div.appendChild(document.createTextNode(' '));

  const subst_cnt_vert = document.createElement("span");
  subst_cnt_vert.className = "text-nowrap";
  subst_cnt_vert.textContent = "Vert: " + vert_marks.above.cnt + '\u200a/\u200a' + vert_marks.below.cnt + ',';
  subst_cnt_div.appendChild(subst_cnt_vert);
  subst_cnt_div.appendChild(document.createTextNode(' '));

  const subst_cnt_mood = document.createElement("span");
  subst_cnt_mood.className = "text-nowrap";
  subst_cnt_mood.textContent = "Mood: " + mood_marks.above.cnt + '\u200a/\u200a' + mood_marks.below.cnt;
  subst_cnt_div.appendChild(subst_cnt_mood);

  container.appendChild(subst_cnt_div);

  // Marks displaying
  const chk_nomark       =  marks_count && nomark_items;
  const chk_marked_by    = (marks_populated > 1);

  const     marked_on_2n =  marked_on_2 ? Object.keys(marked_on_2).length : 0;
  const     marked_on_3n =  marked_on_3 ? Object.keys(marked_on_3).length : 0;

  const chk_marked_on_2  = (marked_on_2n > 1) || (marked_on_2n && marked_on_3n);
  const chk_marked_on_3  = (marked_on_3n > 1) || (marked_on_3n && marked_on_2n);

  const chk_plain_nomark =  marks_count && plain_nomark;
  const chk_subst_marked =  marks_count && subst_marked;

  if (marks_count) {

    render_marks_chks(

       chk_nomark,
           nomark_items,
      show_nomark,
      show_nomark_new => show_nomark = show_nomark_new,

           marks_populated,
           marked_items,
           marks_count,
           mark_counts,
      show_mark,
      hide_mark,

       chk_marked_by,
           marked_by,
      show_marked_by,

       chk_marked_on_2,
           marked_on_2,
      show_marked_on_2,

       chk_marked_on_3,
           marked_on_3,
      show_marked_on_3,

       chk_plain_nomark,
           plain_nomark,
      show_plain_nomark,
      show_plain_nomark_new => show_plain_nomark = show_plain_nomark_new,

       chk_subst_marked,
           subst_marked,
      show_subst_marked,
      show_subst_marked_new => show_subst_marked = show_subst_marked_new,

      chks_chain, container);
  }

  // Add space before item list
  container.lastElementChild.style.marginBottom = "1em";

  // Whether internal filtering (by checkboxes) is active
  const get_filtering = () => {
    if (chk_prev && !show_prev) return true;
    if (chk_curr && !show_curr) return true;
    if (chk_both && !show_both) return true;

    if (chk_marked_by)
      for (const marks_num in marked_by)
        if (!show_marked_by[marks_num]) return true;

    if (chk_marked_on_2)
      for (const group in marked_on_2)
        if (!show_marked_on_2[group]) return true;

    if (chk_marked_on_3)
      for (const group in marked_on_3)
        if (!show_marked_on_3[group]) return true;

    if (mark_counts) {
      for (const mc of mark_counts) {
        if (!show_mark[mc.mark]) return true;
        if ( hide_mark[mc.mark]) return true;
      }
    }

    if (chk_nomark       && !show_nomark      ) return true;
    if (chk_plain_nomark && !show_plain_nomark) return true;
    if (chk_subst_marked && !show_subst_marked) return true;

    if (!show_plain) return true;
    if (get_filtering_noplain()) return true;

    return false;
  };
  const is_filtering = get_filtering();

  /////////////////////////////////////
  // Show item list with flex alignment
  //
  compose_header(title_is, title_is_new => title_is = title_is_new,
                  show_by,  show_by_new =>  show_by =  show_by_new,
                  sort_by,  sort_by_new =>  sort_by =  sort_by_new,
                  mood_by,  mood_by_new =>  mood_by =  mood_by_new,
    container);
  //
  let shown_cnt = 0;
  //
  if (is_filtering) clr_views_favs_shown();
  //
  clr_details_for_items ();
  clr_details_div_inners();
  clr_linkage_for_items ();
  //
  init_defer_render();
  init_cells_raw   ();
  //
  for (let index = 0; index < curr_length; index++) {
    const item    = results_curr_exp[index];

    const is_prev = item.is_prev;
    const no_prev = item.no_prev;
    const is_both = item.is_both;

    // Which items to show
    if (is_filtering) {
      if (is_prev && chk_prev && !show_prev) continue;
      if (no_prev && chk_curr && !show_curr) continue;
      if (is_both && chk_both && !show_both) continue;
    }

    // Whether item is plain (not marked as substantially changed)
    const is_plain = item.is_plain;

    // Which items to show
    if (is_filtering) {
      if (item.marks) {
        const marks_num  = item.marks.length;

        if (chk_marked_by && !show_marked_by[marks_num]) continue;

        if (chk_marked_on_2 && (marks_num === 2)) {
          const group = item.marks[0] + item.marks[1];
          if  (!show_marked_on_2[group]) continue;
        }

        if (chk_marked_on_3 && (marks_num === 3)) {
          const group = item.marks[0] + item.marks[1] + item.marks[2];
          if  (!show_marked_on_3[group]) continue;
        }

        let to_show_mark = false;
        let to_hide_mark = false;

        for (let m = 0; m < marks_num; m++) {
          const m_mark = item.marks[m];

          if (show_mark[m_mark])   to_show_mark = true;
          if (hide_mark[m_mark]) { to_hide_mark = true; break; }
        }

        if (!to_show_mark) continue;
        if ( to_hide_mark) continue;

        if (chk_subst_marked && !show_subst_marked && !is_plain) continue;
      }
      else { // Item not marked
        if (chk_plain_nomark && !show_plain_nomark &&  is_plain) continue;
        if (chk_nomark       && !show_nomark) continue;
      }
    }

    // Substantial changes marking
    const is_rank_up   = item.is_rank_up;
    const is_rank_dn   = item.is_rank_dn;

    const is_horz_grow = item.is_horz_grow;
    const is_horz_fall = item.is_horz_fall;

    const is_vert_grow = item.is_vert_grow;
    const is_vert_fall = item.is_vert_fall;

    const is_mood_pos  = item.is_mood_pos;
    const is_mood_neg  = item.is_mood_neg;

    // Which items to show
    if (is_filtering) {
      if (is_plain) {
        if (!show_plain) continue;
      }
      else {
        if (!(is_rank_up   && show_noplain['rank-up'  ]) &&
            !(is_rank_dn   && show_noplain['rank-dn'  ]) &&
            !(is_horz_grow && show_noplain['horz-grow']) &&
            !(is_horz_fall && show_noplain['horz-fall']) &&
            !(is_vert_grow && show_noplain['vert-grow']) &&
            !(is_vert_fall && show_noplain['vert-fall']) &&
            !(is_mood_pos  && show_noplain['mood-pos' ]) &&
            !(is_mood_neg  && show_noplain['mood-neg' ])) continue;

        if ( (is_rank_up   && hide_noplain['rank-up'  ]) ||
             (is_rank_dn   && hide_noplain['rank-dn'  ]) ||
             (is_horz_grow && hide_noplain['horz-grow']) ||
             (is_horz_fall && hide_noplain['horz-fall']) ||
             (is_vert_grow && hide_noplain['vert-grow']) ||
             (is_vert_fall && hide_noplain['vert-fall']) ||
             (is_mood_pos  && hide_noplain['mood-pos' ]) ||
             (is_mood_neg  && hide_noplain['mood-neg' ])) continue;
      }
    }

    // Outer wrapper, for border/divider and spacing
    const item_wrapper      = document.createElement("div");
    item_wrapper.className  = "item-wrapper item-wrapper-init";
    item_wrapper.item_index = index;

    add_defer_render(item_wrapper);
    add_cells_raw_is(index, is_prev, no_prev, is_both);

    // Rank substantial changes marking: up and dn
    //
    let prev_is_subst = false;
    //
    if (is_rank_up) { add_prev_raw_rank_is(index, +1); prev_is_subst = true; }
    if (is_rank_dn) { add_prev_raw_rank_is(index, -1); prev_is_subst = true; }

    // Substantial changes marking: horizontal impact of old      from prev to     curr
    // Substantial changes marking: vertical   impact of 23 and 7 into all  within curr
    //
    let curr_is_subst = false;
    //
    if (is_horz_grow) { add_curr_raw_horz_is(index, +1); curr_is_subst = true; }
    if (is_horz_fall) { add_curr_raw_horz_is(index, -1); curr_is_subst = true; }
    //
    if (is_vert_grow) { add_curr_raw_vert_is(index, +1); curr_is_subst = true; }
    if (is_vert_fall) { add_curr_raw_vert_is(index, -1); curr_is_subst = true; }

    // Grow mood substantial changes marking: positive and negative
    //
    let grow_is_subst = false;
    //
    if (is_mood_pos) { add_grow_raw_mood_is(index, +1); grow_is_subst = true; }
    if (is_mood_neg) { add_grow_raw_mood_is(index, -1); grow_is_subst = true; }

    if                          (prev_is_subst || curr_is_subst || grow_is_subst) {
      add_cells_raw_subst(index, prev_is_subst,   curr_is_subst,   grow_is_subst)
    }

    if (item.marks) {
      item_wrapper.classList.add("item-wrapper-init-" + item.marks.length + "-marks");
      item_wrapper.style.borderBottom = "none"; // Last mark replaces wrapper border (see create_cells_raw)

      add_cells_raw_marks(index, item.marks);
    }

    // Add item to the page
    container.appendChild(item_wrapper);
    shown_cnt++;

    // Count vievs and favorites for shown items
    if (is_filtering) {
      add_views_favs_shown(
        no_prev ? null : is_prev ? item : map_prev[item.identifier],
        is_prev ? null : item);
    }

    if (is_both || !is_prev) { // Explicitly two conditions used
      add_cells_raw_changes(index, shown_cnt, item.time_all,
        item.rank_change, item.horz_change, item.vert_change, item.mood);
    }
  } // for (index) closing

  if (shown_cnt !== curr_length) update_diffs(curr_length, shown_cnt, show_by);

  container.onclick   = (event) => results_click  (event);
  container.onkeyup   = (event) => results_keyup  (event);
  container.onkeydown = (event) => results_keydown(event);

  restore_focus();

  defer_render();

  process_du_render.dom = performance.now() - time_0;
  process_timings();

  if (page_just_loaded) {
      page_just_loaded = false;
      document.querySelector("footer").classList.remove("collapse");
  }

  } catch (err) {
    process_error(error_compose("Error: " + err.message));
  }
}

function render_finished() {
  set_chain_arrows_plane(chks_chain);

  process_timings_defer();
}

// EOF






