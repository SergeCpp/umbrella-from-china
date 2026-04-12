/* How to show and sort items */

let  title_is           = "title";      // "title"      / "identifier"
let   show_by           = "old-23-7";   // "old-23-7"   / "all-30-7"
let   sort_by           = "ratio";      // "ratio"      / "views"
let   mood_by           = "same-signs"; // "same-signs" / "diff-signs"

/* Which items to show */

let   show_prev         = true; function inp_prev  (chk) { show_prev  = chk.checked; }
let   show_curr         = true; function inp_curr  (chk) { show_curr  = chk.checked; }
let   show_both         = true; function inp_both  (chk) { show_both  = chk.checked; }

let   show_plain        = true; function inp_plain (chk) { show_plain = chk.checked; }

const show_noplain      = {}; // [noplain] = true / false
const hide_noplain      = {}; // [noplain] = false / true

let   show_nomark       = true;
let   show_plain_nomark = true;

const show_mark         = {}; // [mark] = true / false
const hide_mark         = {}; // [mark] = false / true

const show_marked_by    = {}; // [num] = undefined (means true) / true / false

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

const    process_du_render = { pre: 0, dom: 0 }; // ms

function time_render() {
  return process_du_render;
}

function render_results(results_prev, date_prev, results_curr, date_curr, results_mark) {
  try {

  const time_0    = performance.now();
  const container = document.getElementById("results");
        container . innerHTML = "";

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
      grow         : null,
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
        grow         : null,
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
  sort_results(results_curr_exp, title_is, show_by, sort_by);
  sort_results(results_prev_exp, title_is, show_by, sort_by);

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
  let marks_count     = 0; // === mark_counts.length
  let marks_populated = 0; // Marks that have items marked by this mark
  let marks_zero      = 0; // Mark present, but no items marked by this mark
  let marked_by       = null;
  let marked_items    = 0;
  let nomarked_items  = curr_length;

  if (results_mark) {
    for (const rm of results_mark) {
      let mark_count = 0;

      for (const mark_item of rm.prev) {
        const id = mark_item.identifier;
        const item = map_curr_exp[id];
        if (!item || item.no_prev) continue;

        if (!item.marks) { item.marks = []; marked_items++; }
        item.marks.push(rm.mark);
        mark_count++;
      }

      for (const mark_item of rm.curr) {
        const id = mark_item.identifier;
        const item = map_curr_exp[id];
        if (!item || item.is_prev) continue;

        if (item.marks && item.marks.includes(rm.mark)) continue; // Avoid duplication of mark

        if (!item.marks) { item.marks = []; marked_items++; }
        item.marks.push(rm.mark);
        mark_count++;
      }

      if (!mark_counts) mark_counts = [];
      mark_counts.push({ mark: rm.mark, count: mark_count });
      marks_count++;
      marks_zero += !mark_count; // No items marked by this mark
    }

    marks_populated = marks_count - marks_zero;
    nomarked_items -= marked_items;

    // Gather "Marked by # marks" counts
    for (const item of results_curr_exp) {
      if (!item.marks) continue;
      if (!marked_by) marked_by = {};

      const num = item.marks.length;
      marked_by[num] = (marked_by[num] || 0) + 1;
    }
  }

  ///////////////////////////////////////////////
  // Total counts displaying for expanded results
  //
  const curr_exp_totals = get_totals(results_curr_exp);
  const curr_exp_total  =  curr_exp_totals.audio +   curr_exp_totals.video;
  const curr_exp_media  =  curr_exp_totals.audio && !curr_exp_totals.video ? 'Audio ' :
                          !curr_exp_totals.audio &&  curr_exp_totals.video ? 'Video ' : "";

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
  render_stats(results_prev, date_prev, "prev", title_is, show_by, sort_by, container);
  render_stats(results_curr, date_curr, "curr", title_is, show_by, sort_by, container);

  ///////////////////
  // Diffs displaying
  //
  render_diffs(results_prev, results_curr, curr_length, show_by, container);

  /////////////////////////////////////////////////////////////////////////
  // Compose items and calculate parameters for substantial changes marking
  //
  const {
    horz_marks,
    vert_marks,
    rank_marks,
    mood_marks
  } = compose_items(results_curr_exp, curr_exp_totals, map_prev, show_by, mood_by);

  const mark_grow_old  = horz_marks.above.val;
  const mark_fall_old  = horz_marks.below.val;

  const mark_grow_23_7 = vert_marks.above.val;
  const mark_fall_23_7 = vert_marks.below.val;

  const mark_rank_up   = rank_marks.above.val;
  const mark_rank_dn   = rank_marks.below.val;

  const mark_mood_pos  = mood_marks.above.val;
  const mark_mood_neg  = mood_marks.below.val;

  // Set substantial changes flags for items
  // Count substantially changed and plain items, also plain nomarked items
  let subst_items    = 0;
  let plain_nomarked = 0;

  for (const item of results_curr_exp) {
    const is_rank_up   =  item.is_both && (item.rank_change >= mark_rank_up); // item.index_prev > index
    const is_rank_dn   =  item.is_both && (item.rank_change <= mark_rank_dn); // item.index_prev < index

    const is_horz_grow =  item.is_both && (item.horz_change >= mark_grow_old);
    const is_horz_fall =  item.is_both && (item.horz_change <= mark_fall_old);

    const is_vert_grow = !item.is_prev && (item.vert_change >= mark_grow_23_7);
    const is_vert_fall = !item.is_prev && (item.vert_change <= mark_fall_23_7);

    const is_mood_pos  =  item.is_both && (item.grow._mood  >= mark_mood_pos);
    const is_mood_neg  =  item.is_both && (item.grow._mood  <= mark_mood_neg);

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
    plain_nomarked    += !is_subst && !item.marks;
  }

  const plain_items = curr_length - subst_items;

  ////////////////////////////////////////
  // Checkboxes chain (for arrows setting)
  //
  const chks_chain = [];

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
      s_h_chk_html('show-mood-neg',    'mood-neg' ));
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
  const chk_nomark       =  marks_count && nomarked_items;
  const chk_marked_by    = (marks_populated > 1);
  const chk_plain_nomark =  marks_count && plain_nomarked;

  if (marks_count) {
    const marks_div = document.createElement("div");
    marks_div.className = "text-center text-comment";

    // Not marked
    if (chk_nomark) {
      const nomark_span = document.createElement("span");
      nomark_span.className = "text-nowrap";

      const nomark_label = document.createElement("label");
      nomark_label.htmlFor = "show-nomark";
      nomark_label.style.cursor = "pointer";
      nomark_label.textContent = "Not marked: " + format_num_str(nomarked_items, "Item");

      const nomark_chk = document.createElement("input");
      chks_chain.push(nomark_chk);
      nomark_chk.checked = show_nomark;
      nomark_chk.className = "in-chk";
      nomark_chk.id = "show-nomark";
      nomark_chk.type = "checkbox";

      nomark_chk.oninput = () => { show_nomark = nomark_chk.checked; };

      nomark_chk.onkeyup = (event) => {
        if (event.key === 'Enter') {
          save_focus("show-nomark");
          process_filter();
        }
      };

      nomark_span.appendChild(nomark_label);
      nomark_span.appendChild(nomark_chk  );
      marks_div  .appendChild(nomark_span );
      marks_div  .appendChild(document.createTextNode(' '));
    }

    // Marked
    const marked_span = document.createElement("span");
    marked_span.className = "text-nowrap";
    marked_span.appendChild(document.createTextNode("Marked:"));

    if (marks_populated > 1) {
      marked_span.appendChild(document.createTextNode(' ' + format_num_str(marked_items, "Item") + ':'));
    }

    marks_div.appendChild(marked_span);
    marks_div.appendChild(document.createTextNode(' '));

    const mark_last = marks_count - 1;
    for (let m = 0; m <= mark_last; m++) {
      const m_mark  = mark_counts[m].mark;
      const m_count = mark_counts[m].count;

      const nowrap_span = document.createElement("span");
      nowrap_span.className = "text-nowrap";

      const mark_span = document.createElement("span");
      mark_span.className = "item-mark-" + m_mark + "-text";
      mark_span.textContent = format_num_str(m_count, "Item");

      if (m_count) {
        const mark_label = document.createElement("label");
        mark_label.htmlFor = "show-mark-" + m_mark;
        mark_label.style.cursor = "pointer";

        const mark_chk_show = document.createElement("input");
        chks_chain.push(mark_chk_show);
        mark_chk_show.checked = show_mark[m_mark];
        mark_chk_show.className = "in-chk" + ' ' + "show-mark-" + m_mark;
        mark_chk_show.id = "show-mark-" + m_mark;
        mark_chk_show.type = "checkbox";

        mark_chk_show.oninput = () => {
          show_mark[m_mark] = mark_chk_show.checked;

          if (mark_chk_show.checked) {
              mark_chk_hide.checked = false;
              hide_mark[m_mark]     = false;
          }
        };

        mark_chk_show.onkeyup = (event) => {
          if (event.key === 'Enter') {
            save_focus("show-mark-" + m_mark);
            process_filter();
          }
        };

        const mark_chk_hide = document.createElement("input");
        chks_chain.push(mark_chk_hide);
        mark_chk_hide.checked = hide_mark[m_mark];
        mark_chk_hide.className = "in-chk";
        mark_chk_hide.id = "hide-mark-" + m_mark;
        mark_chk_hide.type = "checkbox";

        mark_chk_hide.oninput = () => {
          hide_mark[m_mark] = mark_chk_hide.checked;

          if (mark_chk_hide.checked) {
              mark_chk_show.checked = false;
              show_mark[m_mark]     = false;
          }
        };

        mark_chk_hide.onkeyup = (event) => {
          if (event.key === 'Enter') {
            save_focus("hide-mark-" + m_mark);
            process_filter();
          }
        };

        mark_label .appendChild(mark_span    );
        nowrap_span.appendChild(mark_label   );
        nowrap_span.appendChild(mark_chk_show);
        nowrap_span.appendChild(mark_chk_hide);
      }
      else { // Marked 0 items by this mark
        nowrap_span.appendChild(mark_span);
        if (m < mark_last) nowrap_span.appendChild(document.createTextNode(','));
      }

      marks_div.appendChild(nowrap_span);
      if (m < mark_last) marks_div.appendChild(document.createTextNode(' '));
    }
    container.appendChild(marks_div);

    // Marked by # marks
    if (chk_marked_by) {
      const marked_by_div = document.createElement("div");
      marked_by_div.className = "text-center text-comment";

      const marked_by_span = document.createElement("span");
      marked_by_span.className = "text-nowrap";
      marked_by_span.textContent = "Marked by:";
      marked_by_div.appendChild(marked_by_span);
      marked_by_div.appendChild(document.createTextNode(' '));

      const marked_by_nums = Object.keys(marked_by).map(Number).sort((a, b) => a - b);

      const num_last = marked_by_nums.length - 1;
      for (let n = 0; n <= num_last; n++) {
        const num   = marked_by_nums[n];
        const items = marked_by[num];

        const by_span = document.createElement("span");
        by_span.className = "text-nowrap";

        const by_label = document.createElement("label");
        by_label.htmlFor = "show-marked-by-" + num;
        by_label.style.cursor = "pointer";
        by_label.textContent = format_num_str(num, "Mark") + ": " + format_num_str(items, "Item");

        const by_chk = document.createElement("input");
        chks_chain.push(by_chk);
        if (show_marked_by[num] === undefined) show_marked_by[num] = true; // Initialize
        by_chk.checked = show_marked_by[num];
        by_chk.className = "in-chk";
        by_chk.id = "show-marked-by-" + num;
        by_chk.type = "checkbox";

        by_chk.oninput = () => { show_marked_by[num] = by_chk.checked; };

        by_chk.onkeyup = (event) => {
          if (event.key === 'Enter') {
            save_focus("show-marked-by-" + num);
            process_filter();
          }
        };

        by_span      .appendChild(by_label);
        by_span      .appendChild(by_chk  );
        marked_by_div.appendChild(by_span );
        if (n < num_last) marked_by_div.appendChild(document.createTextNode(' '));
      }
      container.appendChild(marked_by_div);
    }

    // Plain nomarked
    if (chk_plain_nomark) {
      const plain_nomark_div = document.createElement("div");
      plain_nomark_div.className = "text-center text-comment";

      const plain_nomark_span = document.createElement("span");
      plain_nomark_span.className = "text-nowrap";

      const plain_nomark_label = document.createElement("label");
      plain_nomark_label.htmlFor = "show-plain-nomark";
      plain_nomark_label.style.cursor = "pointer";
      plain_nomark_label.textContent = "Plain and not marked: " + format_num_str(plain_nomarked, "Item");

      const plain_nomark_chk = document.createElement("input");
      chks_chain.push(plain_nomark_chk);
      plain_nomark_chk.checked = show_plain_nomark;
      plain_nomark_chk.className = "in-chk";
      plain_nomark_chk.id = "show-plain-nomark";
      plain_nomark_chk.type = "checkbox";

      plain_nomark_chk.oninput = () => { show_plain_nomark = plain_nomark_chk.checked; };

      plain_nomark_chk.onkeyup = (event) => {
        if (event.key === 'Enter') {
          save_focus("show-plain-nomark");
          process_filter();
        }
      };

      plain_nomark_span.appendChild(plain_nomark_label);
      plain_nomark_span.appendChild(plain_nomark_chk  );
      plain_nomark_div .appendChild(plain_nomark_span );
      container        .appendChild(plain_nomark_div  );
    }
  } // if (marks_count) closing

  // Set arrows for checkboxes
  set_chain_arrows_plane(chks_chain);

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

    if (mark_counts) {
      for (const mc of mark_counts) {
        if (!show_mark[mc.mark]) return true;
        if ( hide_mark[mc.mark]) return true;
      }
    }

    if (chk_nomark       && !show_nomark      ) return true;
    if (chk_plain_nomark && !show_plain_nomark) return true;

    if (!show_plain) return true;
    if (get_filtering_noplain()) return true;

    return false;
  };
  const is_filtering = get_filtering();

  /////////////////////////////////////
  // Show item list with flex alignment
  //
  const time_1 = performance.now();
  //
  compose_header(title_is, title_is_new => title_is = title_is_new,
                  show_by,  show_by_new =>  show_by =  show_by_new,
                  sort_by,  sort_by_new =>  sort_by =  sort_by_new,
                  mood_by,  mood_by_new =>  mood_by =  mood_by_new,
    container);
  //
  const title_is_title = (title_is === "title"); // Else is "identifier"
  let   shown_cnt      = 0;
  //
  if (is_filtering) clr_views_favs_shown();
  //
  clr_details_for_items ();
  clr_details_div_inners();
  clr_linkage_for_items ();
  //
  for (let index = 0; index < curr_length; index++) {
    const item = results_curr_exp[index];

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

        let to_show_mark = false;
        let to_hide_mark = false;

        for (let m = 0; m < marks_num; m++) {
          const m_mark = item.marks[m];

          if (show_mark[m_mark])   to_show_mark = true;
          if (hide_mark[m_mark]) { to_hide_mark = true; break; }
        }

        if (!to_show_mark) continue;
        if ( to_hide_mark) continue;
      }
      else { // Item not marked
        if (chk_nomark       && !show_nomark) continue;
        if (chk_plain_nomark && !show_plain_nomark && is_plain) continue;
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

    // 1. Outer wrapper, for border/divider and spacing
    const item_wrapper = document.createElement("div");
    item_wrapper.className = "item-wrapper";
    item_wrapper.item_index = index;

    // 2. Inner flex container
    const item_inner = document.createElement("div");
    item_inner.className = "item-inner";

    ///////////
    // 3. Title
    const item_title_container = document.createElement("div");
    item_title_container.className = "item-title-container";

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
    item_link.href = "https://archive.org/details/" + item.identifier;
    item_link.rel = "noopener"; // Safe for _blank
    item_link.tabIndex = 0; // To show focus outline when set by focus() (else not shown)
    item_link.target = "_blank";
    item_link.textContent = (shown_cnt === index ? "" : (shown_cnt + 1) + " / ") + (index + 1) + ". " +
      (title_is_title ? item.title : item.identifier);
    item_title.appendChild(item_link);

    // Below gauges
    const item_gauge_below_a = document.createElement("div");
    item_gauge_below_a.className = "item-gauge-below-a";

    const item_gauge_below_b = document.createElement("div");
    item_gauge_below_b.className = "item-gauge-below-b";

    // 3. Title: assemble the hierarchy
    item_title_container.appendChild(item_gauge_above_a);
    item_title_container.appendChild(item_gauge_above_b);
    item_title_container.appendChild(item_title        );
    item_title_container.appendChild(item_gauge_below_a);
    item_title_container.appendChild(item_gauge_below_b);

    /////////////////////////////////////
    // 4.1. Prev stat container (stacked)
    const stat_prev_container = document.createElement("div"); // flex: 0 0 22ch;

    if (!no_prev) {
      stat_prev_container.className = "item-stat-container";
      stat_prev_container.tabIndex = -1;
    }
    else {
      stat_prev_container.className = "item-stat-container is-empty";
      stat_prev_container.is_empty = true;
    }

    // Rank substantial changes marking: up and dn
    const add_rank_class = is_rank_up ? " item-mark-up"
                         : is_rank_dn ? " item-mark-dn" : "";

    if   (add_rank_class) {
      stat_prev_container.is_subst = true;
    }

    // 4.2. Prev: old stat line
    const stat_prev_old = document.createElement("div");
    stat_prev_old.className = "item-stat-prev-old" + add_rank_class;
                              // 123456789 123456789 12
    stat_prev_old.textContent = "                      "; // 22ch

    // 4.3. Prev: 23-day stat line
    const stat_prev_23 = document.createElement("div");
    stat_prev_23.className = "item-stat-prev-23" + add_rank_class;
    stat_prev_23.textContent = "                      "; // 22ch

    // 4.4. Prev: 7-day stat line
    const stat_prev_7 = document.createElement("div");
    stat_prev_7.className = "item-stat-prev-7" + add_rank_class;
    stat_prev_7.textContent = "                      "; // 22ch

    // 4.5. Prev: assemble the hierarchy
    stat_prev_container.appendChild(stat_prev_old);
    stat_prev_container.appendChild(stat_prev_23 );
    stat_prev_container.appendChild(stat_prev_7  );

    /////////////////////////////////////
    // 5.1. Curr stat container (stacked)
    const stat_curr_container = document.createElement("div"); // flex: 0 0 22ch;

    if (!is_prev) {
      stat_curr_container.className = "item-stat-container";
      stat_curr_container.tabIndex = -1;
    }
    else {
      stat_curr_container.className = "item-stat-container is-empty";
      stat_curr_container.is_empty = true;
    }

    // Substantial changes marking: horizontal impact of old from prev to curr
    const add_horz_class = is_horz_grow ? " item-mark-grow"
                         : is_horz_fall ? " item-mark-fall" : "";

    // Substantial changes marking: vertical impact of 23 and 7 into all within curr
    const add_vert_class = is_vert_grow ? " item-mark-grow"
                         : is_vert_fall ? " item-mark-fall" : "";

    const add_hv_class = add_horz_class || add_vert_class;

    if   (add_hv_class) {
      stat_curr_container.is_subst = true;
    }

    // 5.2. Curr: old stat line
    const stat_curr_old = document.createElement("div");
    stat_curr_old.className = "item-stat-curr-old" + add_horz_class;
                              // 123456789 123456789 12
    stat_curr_old.textContent = "                      "; // 22ch

    // 5.3. Curr: 23-day stat line
    const stat_curr_23 = document.createElement("div");
    stat_curr_23.className = "item-stat-curr-23" + add_vert_class;
    stat_curr_23.textContent = "                      "; // 22ch

    // 5.4. Curr: 7-day stat line
    const stat_curr_7 = document.createElement("div");
    stat_curr_7.className = "item-stat-curr-7" + add_vert_class;
    stat_curr_7.textContent = "                      "; // 22ch

    // 5.5. Curr: assemble the hierarchy
    stat_curr_container.appendChild(stat_curr_old);
    stat_curr_container.appendChild(stat_curr_23 );
    stat_curr_container.appendChild(stat_curr_7  );

    ////////////////////////////////
    // 6.1. Grow container (stacked)
    const stat_grow_container = document.createElement("div"); // flex: 0 0 3ch;

    if (is_both) {
      stat_grow_container.className = "item-grow-container";
      stat_grow_container.tabIndex = -1;
    }
    else {
      stat_grow_container.className = "item-grow-container is-empty";
      stat_grow_container.is_empty = true;
    }

    // Grow mood substantial changes marking: positive and negative
    const add_mood_class = is_mood_pos ? " item-mark-grow"
                         : is_mood_neg ? " item-mark-fall" : "";

    if   (add_mood_class) {
      stat_grow_container.is_subst = true;
    }

    // 6.2. Grow: old
    const stat_grow_old = document.createElement("div");
    stat_grow_old.className = "item-grow-old" + add_mood_class;
                              // 123
    stat_grow_old.textContent = "   "; // 3ch

    // 6.3. Grow: 23
    const stat_grow_23 = document.createElement("div");
    stat_grow_23.className = "item-grow-23" + add_mood_class;
    stat_grow_23.textContent = "   "; // 3ch

    // 6.4. Grow: 7
    const stat_grow_7 = document.createElement("div");
    stat_grow_7.className = "item-grow-7" + add_mood_class;
    stat_grow_7.textContent = "   "; // 3ch

    // 6.5. Grow: assemble the hierarchy
    stat_grow_container.appendChild(stat_grow_old);
    stat_grow_container.appendChild(stat_grow_23 );
    stat_grow_container.appendChild(stat_grow_7  );

    ///////////////////
    // 7. Add all parts
    item_inner.appendChild(item_title_container);
    item_inner.appendChild(stat_prev_container );
    item_inner.appendChild(stat_curr_container );
    item_inner.appendChild(stat_grow_container );

    ////////////
    // 8.1. Wrap
    item_wrapper.appendChild(item_inner);

    // 8.2. Add mark indicators (if any)
    if (item.marks) {
      const mark_last = item.marks.length - 1;
      for (let m = 0; m <= mark_last; m++) {
        const m_mark = item.marks[m];

        const mark_div = document.createElement("div");
        mark_div.className = "item-mark-" + m_mark;
        if (m < mark_last) mark_div.style.borderBottom = "3px solid white";
        item_wrapper.appendChild(mark_div);
      }
      item_wrapper.style.borderBottom = "none"; // Mark will be the border
    }

    // 8.3. Add item to the page
    container.appendChild(item_wrapper);
    shown_cnt++;

    // 8.4. Count vievs and favorites for shown items
    if (is_filtering) {
      add_views_favs_shown(
        no_prev ? null : is_prev ? item : map_prev[item.identifier],
        is_prev ? null : item);
    }

    // 8.5. Add linkage for item
    add_linkage_for_items(index, shown_cnt,
      is_both && item.rank_change,  is_both && stat_prev_container,
      is_both && item.horz_change,  is_both && stat_curr_container,
     !is_prev && item.vert_change, !is_prev && stat_curr_container,
      is_both && item.grow._mood,   is_both && stat_grow_container);
  } // for (index) closing

  if (shown_cnt !== curr_length) update_diffs(shown_cnt, show_by);

  container.onclick   = (event) => results_click  (event);
  container.onkeyup   = (event) => results_keyup  (event);
  container.onkeydown = (event) => results_keydown(event);

  restore_focus();

  defer_render(shown_cnt);

  process_du_render.pre = time_1            - time_0;
  process_du_render.dom = performance.now() - time_1;

  process_timings();

  } catch (err) {
    process_error(error_compose("Error: " + err.message));
  }
}

// EOF






