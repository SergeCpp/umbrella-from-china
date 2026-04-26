/* Controls */

const input_ids =
  [  'collections',      'creators',    'subjects',       'title', 'description',
   'downloads-min', 'downloads-max',   'month-min',   'month-max',    'week-min', 'week-max',
    'archived-min',  'archived-max', 'created-min', 'created-max',    'favs-min', 'favs-max',
       'only-prev',     'only-curr'];

// Initialization

function init_controls() {
  // Add Enter to inputs
  input_ids.forEach(id => {
    const input = document.getElementById(id);
    if  (!input) return;

    input.oninput = () => tab_input_changed(input);

    input.onkeyup = (event) => {
      const key = event.key;
      if (key === 'Enter') {
        process_filter();
      }
    };
  });

  // Add click and Enter/Space to button
  const button = document.getElementById('process-filter');
  if   (button) {
    button.onclick = process_filter;

    button.onkeyup = (event) => {
      const key = event.key;
      if ((key === 'Enter') || (key === ' ')) {
        button.click();
      }
    };

    button.onkeydown = (event) => {
      const key = event.key;
      if ((key === 'Enter') || (key === ' ')) {
        event.preventDefault();
      }
    };
  }
}

/* Tabbed Input */

const tab_names        = ['a', 'b', 'c', 'd', 'e'];
let   tab_active       = null;

const tab_input_ids    = input_ids;
const tab_input_values = {}; // [tab] = { values }; [""] = { defaults };

const tab_filter_modes = ["OR", "AND", "DIFF", "MULTI", "NONE", "ONE", "TWO", "THREE", "FOUR"];
const tab_mode         = {   // [tab] = "" / "Filter"; ['c'] see tab_filter_modes
  a: "",
  b: "",
  c: "OR",
  d: "",
  e: ""
};

const tab_change_marked       = {}; // [tab] = true / false
const tab_input_change_marked = {}; // [id]  = tab  / false

// Initialization

function init_tabs() {
  tab_input_values[""] = {};
  tab_to_values   ("");

  for (const tab of tab_names) {
    tab_input_values[tab] = {};

    for (const id in tab_input_values[""]) {
      tab_input_values[tab][id] = tab_input_values[""][id];
    }

    tab_change_marked[tab] = false;
  }

  for (const id in tab_input_values[""]) {
    tab_input_change_marked[id] = false;
  }

  tab_activate('c');

  // Add click and Enter/Space/Arrows to tabs
  tab_names.forEach((tab, index) => {
    const button = document.getElementById('tab-' + tab);
    if  (!button) return;

    button.onclick = (event) => tab_click(tab, event.shiftKey, event.ctrlKey);

    button.onkeyup = (event) => {
      const key = event.key;
      if ((key === 'Enter') || (key === ' ')) {
        tab_click(tab, event.shiftKey, event.ctrlKey); // button.click() not passes *Key modifiers
      }
    };

    button.onkeydown = (event) => {
      const key = event.key;
      if ((key === 'Enter') || (key === ' ')) {
        event.preventDefault();
        return;
      }

      if ((key !== 'ArrowLeft') && (key !== 'ArrowRight')) return;
      event.preventDefault();

      const all  = tab_names.length;
      const next = ((key === 'ArrowLeft' ) && event.ctrlKey) ?           0 :
                   ((key === 'ArrowRight') && event.ctrlKey) ?   all   - 1 :
                    (key === 'ArrowLeft' )                   ? ((index - 1 + all) % all)
                                                             : ((index + 1)       % all); // ArrowRight

      const button_next = document.getElementById('tab-' + tab_names[next]);
      if   (button_next) {
        button_next.focus();
      }
    };
  });
}

// Data

function tab_to_values(tab) {
  tab_input_ids.forEach(id => {
    const input = document.getElementById(id);
    if  (!input) return;

    const value = input.type === 'checkbox' ? input.checked : input.value;

    tab_input_values[tab][id] = value;
  });
}

function tab_to_inputs(tab) {
  tab_input_ids.forEach(id => {
    const input = document.getElementById(id);
    if  (!input) return;

    if (input.type === 'checkbox')
      input.checked = tab_input_values[tab][id];
    else
      input.value   = tab_input_values[tab][id];
  });
}

function tab_is_changed(tab) {
  for (const id in tab_input_values[""]) {
    if (tab_input_values[tab][id] !== tab_input_values[""][id]) return true;
  }

  return false;
}

// Changed Inputs Marking

function tab_input_changed(input) {
  const id      = input.id;
  const value   = input.type === 'checkbox' ? input.checked : input.value;
  const changed = value !== tab_input_values[""][id];

  tab_input_mark(tab_active, input, id, changed);

  if (changed)
    tab_mark  (tab_active, true);
  else
    tab_update(tab_active); // Need to check whole tab
}

function tab_input_mark(tab, input, id, changed) {
  const marked = tab_input_change_marked[id];

  if (changed) {
    if (marked === tab) return;

    if (marked) { // Other tab. Normally never goes here
      input.classList.remove('tab-' + marked);
      input.classList.add   ('tab-' + tab);
      tab_input_change_marked[id]   = tab;
      return;
    }
  } else { // Not changed
    if (!marked) return;
  }

  if (changed)
    input.classList.add   ('changed', 'tab-' + tab);
  else
    input.classList.remove('changed', 'tab-' + tab);

  tab_input_change_marked[id] = changed ? tab : false;
}

// What to do with changed inputs: mark / unmark
function tab_inputs_mark(tab, mark) {
  for (const id in tab_input_values[""]) {
    if (tab_input_values[tab][id] === tab_input_values[""][id]) continue;

    const input = document.getElementById(id);
    if   (input) {
      tab_input_mark(tab, input, id, mark);
    }
  }
}

function tab_inputs_lo(tab) {
  tab_inputs_mark(tab, false);
}

function tab_inputs_hi(tab) {
  tab_inputs_mark(tab, true);
}

// Mode

function tab_mark_filters_count() {
  return tab_marks().filter(tab => tab_mark_is_filter(tab)).length;
}

function tab_set_text(tab, text) {
  const button = document.getElementById('tab-' + tab);
  if  (!button) return;

  const text_cur = button.textContent;
  if   (text_cur === text) return;

  button.textContent = text;
}

function tab_set_center() {
  let tab_text = "Filter";
  if (tab_mark_filters_count()) tab_text += ' ' + tab_mode['c'];
  tab_set_text('c', tab_text);
}

function tab_toggle(tab, shift) {
  if(tab === 'c') {
    if (!tab_mark_filters_count()) return;

    const all  = tab_filter_modes.length;
    const curr = tab_filter_modes.indexOf(tab_mode[tab]);
    const next = shift
               ? ((curr - 1 + all) % all)
               : ((curr + 1)       % all);

    tab_mode[tab]  =  tab_filter_modes[next];
  } else {
    tab_mode[tab]  = (tab_mode[tab] !== "Filter") ?        "Filter" :     "";
    const tab_text = (tab_mode[tab] === "Filter") ? "Mark x Filter" : "Mark";
    tab_set_text(tab, tab_text);
  }
  tab_set_center();
}

// Presentation

function tab_activate(tab_to, shift = false) {
  if (tab_to === tab_active) {
    tab_toggle(tab_to, shift);
    return;
  }

  const tab_from = tab_active;
  if   (tab_from) {
    const button_from = document.getElementById('tab-' + tab_from);
    if   (button_from) {
      button_from.classList.remove('active');
    }
  }

  const button_to = document.getElementById('tab-' + tab_to);
  if   (button_to) {
    button_to.classList.add('active');
  }

  tab_active = tab_to;

  if (shift) tab_toggle(tab_to, shift);
}

function tab_mark(tab, changed) {
  if (tab_change_marked[tab] === changed) return;

  const button = document.getElementById('tab-' + tab);
  if  (!button) return;

  if (changed)
    button.classList.add   ('changed');
  else
    button.classList.remove('changed');

  tab_change_marked[tab] = changed;
}

// Transition

function tab_update(tab_new) {
  tab_to_values(tab_active);
  tab_mark     (tab_active, tab_is_changed(tab_active));

  if (tab_new !== tab_active) {
    tab_inputs_lo(tab_active);
    tab_to_inputs(tab_new);
    tab_inputs_hi(tab_new);
  }
}

function tab_switch(tab, shift) {
  tab_update  (tab);
  tab_activate(tab, shift);
}

// Click Handler

function tab_click(tab, shift, ctrl) {
  if (ctrl)
    tab_toggle(tab, shift);
  else
    tab_switch(tab, shift);
}

// Interface

function tab_get(tab) {
  if (tab === tab_active) tab_update(tab);

  return { changed: tab_is_changed(tab), values: tab_input_values[tab] };
}

function tab_filter_inputs() {
  return tab_get('c');
}

function tab_filter_mode() {
  return tab_mode['c'];
}

function tab_marks() {
  return ['a', 'b', 'd', 'e'];
}

function tab_mark_is_filter(tab) {
  return tab_mode[tab] === "Filter";
}

/* Date Change */

// what: "prev" / "curr"
function date_change_menu(event, what) {
  const menu_old  = document.getElementById('date-change-menu');
  if   (menu_old) { menu_old.remove_ex(); }

  const m_dates = dates_main();
  const i_date  = m_dates.indexOf(date_main(what));
  const i_min   = 0;
  const i_max   = m_dates.length - 1;
  const h_view  = 3; // Half view
  let   i_beg   = i_date - h_view;
  let   i_end   = i_date + h_view;

  if (i_beg < i_min) {
      i_end = Math.min(i_end + (i_min - i_beg), i_max);
      i_beg = i_min; }

  if (i_end > i_max) {
      i_beg = Math.max(i_beg - (i_end - i_max), i_min);
      i_end = i_max; }

  let   a_beg  =         i_beg; // Above beg
  let   b_end  = i_max - i_end; // Below end

  const m_size = i_end - i_beg + 1; // Normally 7 but can be less

  const  btn_other  = document.getElementById('span-btn-' + (what === "prev" ? "curr" : "prev"));
  const menu_caller = event.currentTarget;
  const menu        = document.createElement('div');
  menu.className    =             'menu';
  menu.id           = 'date-change-menu';
  menu.setAttribute  ('role',     'menu');

  menu.remove_ex = () => {
    document.removeEventListener('click', menu.outside_click);
    menu.remove();
    if ( btn_other  && document.body.contains( btn_other )) {  btn_other .style.pointerEvents = 'auto'; }
    if (menu_caller && document.body.contains(menu_caller)) { menu_caller.focus(); }
  };

  menu.outside_click = (event) => {
    if (!menu.contains(event.target)) { menu.remove_ex(); }
  };

  // Defer adding until all currently pending event handlers (menu creation click) have finished
  setTimeout(() => {
    if (menu && document.body.contains(menu)) { document.addEventListener('click', menu.outside_click); }
  }, 0);

  menu.onkeydown = (event) => {
    const key = event.key;
    if (key === 'Escape') {
      menu.remove_ex();
    }
  };

  const init_opt = (opt, date) => {
    opt.className    = 'menu-opt';
    opt.setAttribute  ('role', 'menuitem');
    opt.tabIndex     = 0;
    opt.textContent  = date;

    opt.onclick = () => {
      menu.remove_ex();
      save_focus('span-btn-' + what);
      requestAnimationFrame(() => // RAF handles menu closing on cache hit
        setTimeout(load_stat, 0, opt.textContent, what));
    };

    opt.onkeyup = (event) => {
      const key = event.key;
      if ((key === 'Enter') || (key === ' ')) {
        opt.click();
      }
    };

    opt.onkeydown = (event) => {
      const key = event.key;
      if ((key === 'Enter') || (key === ' ')) {
        event.preventDefault();
        return;
      }

      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab'].includes(key)) return;
      event.preventDefault();

      const menu = opt.parentElement;
      const opts = Array.from(menu.children);
      const all  = opts.length;
      const curr = opts.indexOf(opt);
      let   next;

      if        ((key === 'ArrowUp'  ) && event.ctrlKey) {
        next =         0;
      } else if ((key === 'ArrowDown') && event.ctrlKey) {
        next =  all  - 1;
      } else if ((key === 'ArrowUp'  ) || ((key === 'Tab') && event.shiftKey)) {
        next = (curr - 1 + all) % all;
      } else if ((key === 'ArrowDown') ||  (key === 'Tab')) {
        next = (curr + 1)       % all;
      }
      else if (key === 'ArrowLeft') {

        const m_shift = Math.min(m_size, a_beg);

        i_beg -= m_shift;
        i_end -= m_shift;
        a_beg -= m_shift;
        b_end += m_shift;

        for (let i = i_beg; i <= i_end; i++) {
          opts[i - i_beg].textContent = m_dates[i];
        }

        const i_shift = Math.min(m_size - m_shift, curr);
        next = curr - i_shift;
      }
      else if (key === 'ArrowRight') {

        const m_shift = Math.min(m_size, b_end);

        i_beg += m_shift;
        i_end += m_shift;
        a_beg += m_shift;
        b_end -= m_shift;

        for (let i = i_beg; i <= i_end; i++) {
          opts[i - i_beg].textContent = m_dates[i];
        }

        const i_shift = Math.min(m_size - m_shift, m_size - 1 - curr);
        next = curr + i_shift;
      }
      else { // Other key. Normally never goes here
        return;
      }

      opts[next].focus();
    };
  };

  for (let i = i_beg; i <= i_end; i++) {
    const date = m_dates[i];
    const opt  = document.createElement('div');
    init_opt(opt, date);
    menu.appendChild(opt);
  }

  menu.style.visibility = 'hidden';
  document.body.appendChild(menu);

  const b_rect = menu_caller.getBoundingClientRect();
  const m_rect = menu       .getBoundingClientRect();

  const b_mid  = b_rect.left + b_rect.width / 2;
  const m_half =               m_rect.width / 2;
  const m_left = b_mid - m_half + window.scrollX;

  let   m_top  = b_rect.top     + window.scrollY - 2 - m_rect.height;
  if   (m_top  <                  window.scrollY)     {
        m_top  = b_rect.bottom  + window.scrollY + 2; }

  menu.style.left       = m_left + 'px';
  menu.style.top        = m_top  + 'px';
  menu.style.visibility = 'visible';
  menu.children [i_date - i_beg] .focus();

  if (btn_other) {
    const b_rect = btn_other.getBoundingClientRect();
    const m_rect = menu     .getBoundingClientRect();

    const is_overlap = (m_rect.bottom >= b_rect.top   ) &&
                       (m_rect.top    <= b_rect.bottom);

    if   (is_overlap) { btn_other.style.pointerEvents = 'none'; }
  }
}

// EOF






