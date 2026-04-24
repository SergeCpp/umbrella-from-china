/* Render Marks-Related Checkboxes */

function render_marks_chks(

   chk_nomark,
       nomark_items,
  show_nomark,
  show_nomark_set,

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
  show_plain_nomark_set,

   chk_subst_marked,
       subst_marked,
  show_subst_marked,
  show_subst_marked_set,

  chks_chain, container) {

  const marks_div = document.createElement("div");
  marks_div.className = "text-center text-comment";

  /////////////
  // Not marked
  if (chk_nomark) {
    const nomark_span = document.createElement("span");
    nomark_span.className = "text-nowrap";

    const nomark_label = document.createElement("label");
    nomark_label.htmlFor = "show-nomark";
    nomark_label.style.cursor = "pointer";
    nomark_label.textContent = "Not marked: " + format_num_str(nomark_items, "Item");

    const nomark_chk = document.createElement("input");
    chks_chain.push(nomark_chk);
    nomark_chk.checked = show_nomark;
    nomark_chk.className = "in-chk";
    nomark_chk.id = "show-nomark";
    nomark_chk.type = "checkbox";

    nomark_chk.oninput = () => { show_nomark_set(nomark_chk.checked); };

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

  /////////
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

  ////////////////////
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

  ////////////////////
  // Marked on 2 marks
  if (chk_marked_on_2) {
    const marked_on_div = document.createElement("div");
    marked_on_div.className = "text-center text-comment";

    const marked_on_2s = Object.keys(marked_on_2).sort();

    const on_last = marked_on_2s.length - 1;
    for (let n = 0; n <= on_last; n++) {
      const group = marked_on_2s[n];
      const m1    = group[0];
      const m2    = group[1];
      const cnt   = marked_on_2[group];

      const on_span = document.createElement("span");
      on_span.className = "text-nowrap";

      const on_label = document.createElement("label");
      on_label.htmlFor = "show-marked-on-2-" + group;
      on_label.style.cursor = "pointer";

      const m1_span = document.createElement("span");
      m1_span.className = "item-mark-" + m1 + "-text";
      m1_span.textContent = "Mark";
      on_label.appendChild(m1_span);

      on_label.appendChild(document.createTextNode(' '));

      const m2_span = document.createElement("span");
      m2_span.className = "item-mark-" + m2 + "-text";
      m2_span.textContent = "Mark";
      on_label.appendChild(m2_span);

      on_label.appendChild(document.createTextNode(": " + format_num_str(cnt, "Item")));

      const on_chk = document.createElement("input");
      chks_chain.push(on_chk);
      if (show_marked_on_2[group] === undefined) show_marked_on_2[group] = true; // Initialize
      on_chk.checked = show_marked_on_2[group];
      on_chk.className = "in-chk";
      on_chk.id = "show-marked-on-2-" + group;
      on_chk.type = "checkbox";

      on_chk.oninput = () => { show_marked_on_2[group] = on_chk.checked; };

      on_chk.onkeyup = (event) => {
        if (event.key === 'Enter') {
          save_focus("show-marked-on-2-" + group);
          process_filter();
        }
      };

      on_span      .appendChild(on_label);
      on_span      .appendChild(on_chk  );
      marked_on_div.appendChild(on_span );
      if (n < on_last) marked_on_div.appendChild(document.createTextNode(' '));
    }

    container.appendChild(marked_on_div);
  }

  ////////////////////
  // Marked on 3 marks
  if (chk_marked_on_3) {
    const marked_on_div = document.createElement("div");
    marked_on_div.className = "text-center text-comment";

    const marked_on_3s = Object.keys(marked_on_3).sort();

    const on_last = marked_on_3s.length - 1;
    for (let n = 0; n <= on_last; n++) {
      const group = marked_on_3s[n];
      const m1    = group[0];
      const m2    = group[1];
      const m3    = group[2];
      const cnt   = marked_on_3[group];

      const on_span = document.createElement("span");
      on_span.className = "text-nowrap";

      const on_label = document.createElement("label");
      on_label.htmlFor = "show-marked-on-3-" + group;
      on_label.style.cursor = "pointer";

      const m1_span = document.createElement("span");
      m1_span.className = "item-mark-" + m1 + "-text";
      m1_span.textContent = "Mark";
      on_label.appendChild(m1_span);

      on_label.appendChild(document.createTextNode(' '));

      const m2_span = document.createElement("span");
      m2_span.className = "item-mark-" + m2 + "-text";
      m2_span.textContent = "Mark";
      on_label.appendChild(m2_span);

      on_label.appendChild(document.createTextNode(' '));

      const m3_span = document.createElement("span");
      m3_span.className = "item-mark-" + m3 + "-text";
      m3_span.textContent = "Mark";
      on_label.appendChild(m3_span);

      on_label.appendChild(document.createTextNode(": " + format_num_str(cnt, "Item")));

      const on_chk = document.createElement("input");
      chks_chain.push(on_chk);
      if (show_marked_on_3[group] === undefined) show_marked_on_3[group] = true; // Initialize
      on_chk.checked = show_marked_on_3[group];
      on_chk.className = "in-chk";
      on_chk.id = "show-marked-on-3-" + group;
      on_chk.type = "checkbox";

      on_chk.oninput = () => { show_marked_on_3[group] = on_chk.checked; };

      on_chk.onkeyup = (event) => {
        if (event.key === 'Enter') {
          save_focus("show-marked-on-3-" + group);
          process_filter();
        }
      };

      on_span      .appendChild(on_label);
      on_span      .appendChild(on_chk  );
      marked_on_div.appendChild(on_span );
      if (n < on_last) marked_on_div.appendChild(document.createTextNode(' '));
    }

    container.appendChild(marked_on_div);
  }

  ///////////////
  // Line for two
  if (chk_plain_nomark || chk_subst_marked) {
    const for_two_div = document.createElement("div");
    for_two_div.className = "text-center text-comment";

    ///////////////
    // Plain nomark
    if (chk_plain_nomark) {
      const plain_nomark_span = document.createElement("span");
      plain_nomark_span.className = "text-nowrap";

      const plain_nomark_label = document.createElement("label");
      plain_nomark_label.htmlFor = "show-plain-nomark";
      plain_nomark_label.style.cursor = "pointer";
      plain_nomark_label.textContent = "Plain not marked: " + format_num_str(plain_nomark, "Item");

      const plain_nomark_chk = document.createElement("input");
      chks_chain.push(plain_nomark_chk);
      plain_nomark_chk.checked = show_plain_nomark;
      plain_nomark_chk.className = "in-chk";
      plain_nomark_chk.id = "show-plain-nomark";
      plain_nomark_chk.type = "checkbox";

      plain_nomark_chk.oninput = () => { show_plain_nomark_set(plain_nomark_chk.checked); };

      plain_nomark_chk.onkeyup = (event) => {
        if (event.key === 'Enter') {
          save_focus("show-plain-nomark");
          process_filter();
        }
      };

      plain_nomark_span.appendChild(plain_nomark_label);
      plain_nomark_span.appendChild(plain_nomark_chk  );
      for_two_div      .appendChild(plain_nomark_span );
    }

    if (chk_plain_nomark && chk_subst_marked) {
      for_two_div.appendChild(document.createTextNode(' '));
    }

    ///////////////
    // Subst marked
    if (chk_subst_marked) {
      const subst_marked_span = document.createElement("span");
      subst_marked_span.className = "text-nowrap";

      const subst_marked_label = document.createElement("label");
      subst_marked_label.htmlFor = "show-subst-marked";
      subst_marked_label.style.cursor = "pointer";
      subst_marked_label.textContent = "Substantial marked: " + format_num_str(subst_marked, "Item");

      const subst_marked_chk = document.createElement("input");
      chks_chain.push(subst_marked_chk);
      subst_marked_chk.checked = show_subst_marked;
      subst_marked_chk.className = "in-chk";
      subst_marked_chk.id = "show-subst-marked";
      subst_marked_chk.type = "checkbox";

      subst_marked_chk.oninput = () => { show_subst_marked_set(subst_marked_chk.checked); };

      subst_marked_chk.onkeyup = (event) => {
        if (event.key === 'Enter') {
          save_focus("show-subst-marked");
          process_filter();
        }
      };

      subst_marked_span.appendChild(subst_marked_label);
      subst_marked_span.appendChild(subst_marked_chk  );
      for_two_div      .appendChild(subst_marked_span );
    }

    container.appendChild(for_two_div);
  }
}

// EOF






