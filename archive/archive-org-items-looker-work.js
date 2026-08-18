/* Controls */

const input_ids =
  [  'collections',      'creators',    'subjects',       'title', 'description',
   'downloads-min', 'downloads-max',   'month-min',   'month-max',    'week-min', 'week-max',
    'archived-min',  'archived-max', 'created-min', 'created-max',    'favs-min', 'favs-max',
       'only-prev',     'only-curr'];

// Initialization

function init_controls() {
  input_ids.forEach(id => {
    const input = document.getElementById(id);
    if  (!input)  return;

    input.oninput = () => tab_input_changed(input);

    input.onkeyup = event => {
      if (event.key === 'Enter') process_filter();
    };

    if (tab_input_info_el(id)) {
      input.onblur = () => tab_input_info(input);
    }
  });

  const button = document.getElementById('process-filter');
  if   (button) {
    button.onclick = process_filter;

    button.onkeyup = event => {
      const key = event.key;
      if ((key === 'Enter') || (key === ' ')) {
        button.click();
      }
    };

    button.onkeydown = event => {
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
    tab_input_values [tab] = {};
    tab_to_initial   (tab);
    tab_change_marked[tab] = false;
  }

  for (const id in tab_input_values[""]) {
    tab_input_change_marked[id] = false;
  }

  tab_infos_init();
  tab_activate  ('c');

  tab_names.forEach((tab, index) => {
    const button = document.getElementById('tab-' + tab);
    if  (!button)  return;

    button.onclick = event => tab_click(tab, event.shiftKey, event.ctrlKey, event.altKey);

    button.onkeyup = event => {
      const key = event.key;
      if ((key === 'Enter') || (key === ' ')) {
        tab_click(tab, event.shiftKey, event.ctrlKey, event.altKey); // button.click() not passes *Key modifiers
      }
    };

    button.onkeydown = event => {
      const key = event.key;
      if ((key === 'Enter') || (key === ' ')) {
        event.preventDefault();
        return;
      }

      if ((key !== 'ArrowLeft') && (key !== 'ArrowRight')) return;
      event.preventDefault();

      const size = tab_names.length;
      const next = ((key === 'ArrowLeft' ) && event.ctrlKey) ?   0         :
                   ((key === 'ArrowRight') && event.ctrlKey) ?   size  - 1 :
                    (key === 'ArrowLeft' )                   ? ((index - 1 + size) % size)
                                                             : ((index + 1)        % size); // ArrowRight

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

    if (input.type === 'checkbox') {
      input.checked =   tab_input_values[tab][id];
    }
    else {
      const value   =   tab_input_values[tab][id];
      input.value   =             value;

      tab_input_adjust(input, id, value);
    }
  });
}

function tab_to_initial(tab) {
  for (const id in tab_input_values[""]) {
         tab_input_values[tab][id]  =  tab_input_values[""][id];
  }
}

function tab_is_changed(tab) {
  for (const id in tab_input_values[""]) {
    if  (tab_input_values[tab][id] !== tab_input_values[""][id]) return true;
  }

  return false;
}

// Clear

function tab_clear(tab, shift) {
  if (shift) {
    for (const tab of tab_names)
      tab_clear(tab, false);

    return;
  }

  if (tab === tab_active) {
    tab_to_values (tab);
    tab_inputs_lo (tab);

    tab_to_initial(tab);
    tab_to_inputs (tab);
  } else {
    tab_to_initial(tab);
  }

  tab_infos_clr(tab);
  tab_mark     (tab, false);
}

// Changed Inputs Marking

function tab_input_changed(input) {
  const id      = input.id;
  const value   = input.type === 'checkbox' ? input.checked : input.value;
  const changed = value !== tab_input_values[""][id];

  tab_input_mark  (tab_active, input, id, changed);
  tab_input_adjust(            input, id, value  ); // Need for not changed also

  if (changed) {
      tab_mark    (tab_active, true);
  }
  else {
      tab_update  (tab_active); // Need to check whole tab
  }
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

// Input Size Adjust

const    tab_input_adjustables     = [];
const    tab_input_adjustables_lim = {};

function tab_input_adjustables_init() {
  tab_input_ids.forEach(id => {
    const input = document.getElementById(id);
    if  (!input) return;

    if   (input.hasAttribute('adjustable')) {
      tab_input_adjustables.push(id);
      tab_input_adjustables_lim [id] = { min: input.size, max: input.maxLength };
    }
  });
}

function tab_input_adjust(input, id, value) {
  if   (!tab_input_adjustables.length) tab_input_adjustables_init();

  if   (!tab_input_adjustables.includes(id)) return;

  const { min, max } = tab_input_adjustables_lim[id];

  const len  = value .length;
  const size = len <= min ? min
             : len >= max ? max
             : len;

  if (input.size !== size) {
      input.size =   size;
  }
}

// Input Info

const    tab_infos = {}; // [tab] = { [id] = { value, info } };

function tab_infos_init() {
  for (const tab of tab_names) {
    tab_infos[tab] = {};

    for (const id in tab_input_values[""]) {
      if (tab_input_info_el(id)) {
        tab_infos[tab][id] = { value: tab_input_values[""][id], info: "" };
      }
    }
  }
}

function tab_infos_clr(tab) {
  const infos = tab_infos[tab];

  for (const id in infos) {
    infos[id].value = "";
    infos[id].info  = "";

    if (tab === tab_active) {
      const info_el = tab_input_info_el(id);
      if   (info_el)  info_el.value = "";
    }
  }
}

function tab_infos_set(tab) {
  const infos = tab_infos[tab];

  for (const id in infos) {
    const info_el = tab_input_info_el(id);
    if   (info_el)  info_el.value = infos[id].info;
  }
}

function tab_input_info_el(id) {
  return document.getElementById('info-' + id);
}

function tab_input_info(input) {
  const id      = input.id;
  const value   = input.value;
  const vi      = tab_infos[tab_active][id];
  const info_el = tab_input_info_el(id);
  if  (!info_el)  return;

  if (!value) {
    vi.value      = "";
    vi.info       = "";
    info_el.value = "";
    return;
  }

  if (vi.value === value) return;

  const  values = { ...tab_input_values[""], [id]: value };

  vi.value      = value;
  vi.info       = get_filter_info(values);

  info_el.value = vi.info;
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

    const size = tab_filter_modes.length;
    const curr = tab_filter_modes.indexOf(tab_mode[tab]);
    const next = shift
               ? ((curr - 1 + size) % size)
               : ((curr + 1)        % size);

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
    tab_infos_set(tab_new);
  }
}

function tab_switch(tab, shift) {
  tab_update  (tab);
  tab_activate(tab, shift);
}

// Click Handler

function tab_click(tab, shift, ctrl, alt) {
  if (alt)
    tab_clear (tab, shift);
  else if (ctrl)
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
// half_view: above and below the central option of menu
function date_change_menu(what, half_view = 3) {
  const menu_old = document.getElementById('date-change-menu');
  if   (menu_old)  menu_old.remove_ex('skip-focus');

  const m_dates = dates_main();
  const i_date  = m_dates.indexOf(date_main(what));
  const i_min   = 0;
  const i_max   = m_dates.length - 1;
  let   i_beg   = i_date - half_view;
  let   i_end   = i_date + half_view;

  if (i_beg < i_min) {
      i_end = Math.min(i_end + (i_min - i_beg), i_max);
      i_beg = i_min; }

  if (i_end > i_max) {
      i_beg = Math.max(i_beg - (i_end - i_max), i_min);
      i_end = i_max; }

  let a_beg =         i_beg; // Above beg
  let b_end = i_max - i_end; // Below end

  const btn_other  = document.getElementById('span-btn-' + (what === "prev" ? "curr" : "prev"));
  const btn_caller = document.getElementById('span-btn-' +  what);
  const menu       = document.createElement ('div');
  menu.className   =             'menu';
  menu.id          = 'date-change-menu';
  menu.setAttribute ('role',     'menu');

  menu.remove_ex   = skip_focus => {
    document.removeEventListener('click', menu.outside_click);
    menu.remove();

    if   (btn_other && document.body.contains(btn_other)) btn_other.style.pointerEvents = 'auto';
    if  (skip_focus)   return;

    // Page can be reloaded here, so need to find the caller button
    const btn_caller = document.getElementById('span-btn-' + what);
    if   (btn_caller)  btn_caller.focus();
  };

  menu.outside_click = event => {
    if (!menu.contains(event.target)) menu.remove_ex('skip-focus');
  };

  // Defer adding until all currently pending event handlers (menu creation click) have finished
  setTimeout(() => {
    if (menu && document.body.contains(menu)) document.addEventListener('click', menu.outside_click);
  }, 0);

  menu.onkeydown = event => {
    if (event.key === 'Escape') menu.remove_ex();
  };

  const menu_shift = (shift, opts) => {
    if (!shift) return;

    i_beg += shift;
    i_end += shift;
    a_beg += shift;
    b_end -= shift;

    for (let i = i_beg; i <= i_end; i++) {
      opts[i - i_beg].textContent = m_dates[i];
    }
  };

  const init_opt = (opt, date) => {
    opt.className    = 'menu-opt';
    opt.setAttribute  ('role', 'menuitem');
    opt.tabIndex     = 0;
    opt.textContent  = date;

    opt.onclick = () => {
      menu.remove_ex();

      const focus_id = 'span-btn-' + what; // To save in load_stat if needed
      requestAnimationFrame(() => // RAF handles menu closing on cache hit
        setTimeout(load_stat, 0, opt.textContent, what, focus_id));
    };

    opt.onkeyup = event => {
      const key = event.key;
      if ((key === 'Enter') || (key === ' ')) {
        opt.click();
      }
    };

    opt.onkeydown = event => {
      const key = event.key;
      if ((key === 'Enter') || (key === ' ')) {
        event.preventDefault();
        return;
      }

      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab'].includes(key)) return;
      event.preventDefault();

      const menu = opt.parentElement;
      const opts = Array.from(menu.children);
      const size = opts.length;
      const curr = opts.indexOf(opt);
      let   next = -1;

      if        ((key === 'ArrowUp'   ) && event.ctrlKey) {
        next =  0;
      } else if ((key === 'ArrowDown' ) && event.ctrlKey) {
        next =  size - 1;
      } else if ((key === 'ArrowUp'   ) || ((key === 'Tab') && event.shiftKey)) {
        next = (curr - 1 + size) % size;
      } else if ((key === 'ArrowDown' ) ||  (key === 'Tab')) {
        next = (curr + 1)        % size;
      }
      else if   ((key === 'ArrowLeft' ) && event.ctrlKey) {

        const m_shift = -a_beg;
        menu_shift(m_shift, opts);

        next = 0;
      }
      else if   ((key === 'ArrowRight') && event.ctrlKey) {

        const m_shift = +b_end;
        menu_shift(m_shift, opts);

        next = size - 1;
      }
      else if    (key === 'ArrowLeft' ) {

        const m_shift = -Math.min(size - 1, a_beg); // -1 to show one opt from prev page
        menu_shift(m_shift, opts);

        next = m_shift ? curr : 0;
      }
      else if    (key === 'ArrowRight') {

        const m_shift = +Math.min(size - 1, b_end); // -1 to show one opt from prev page
        menu_shift(m_shift, opts);

        next = m_shift ? curr : size - 1;
      }
      else { // Other key. Normally never goes here
        return;
      }

      if (next !== -1) opts[next].focus();
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

  const b_rect = btn_caller.getBoundingClientRect();
  const m_rect = menu      .getBoundingClientRect();

  const b_mid  = b_rect.left    + b_rect.width  / 2;
  const m_half =                  m_rect.width  / 2;
  const m_left = window.scrollX + b_mid - m_half;

  let   m_top  = window.scrollY + b_rect.top    - 2 - m_rect.height;
  if   (m_top  < window.scrollY) { // Does not fit above the caller button
        m_top  = window.scrollY + b_rect.bottom + 2;

    if (m_top  > window.innerHeight - m_rect.height + window.scrollY) // Does not fit below the caller button
        m_top  = window.innerHeight - m_rect.height + window.scrollY;

    if (m_top  < window.scrollY) { // Does not fit in the window
      if (half_view > 1) {
        date_change_menu(what, half_view - 1); // Re-enter with menu shrinked
        return;
      }
    }
  }

  menu.style.left       = m_left + 'px';
  menu.style.top        = m_top  + 'px';
  menu.style.visibility = 'visible';
  menu.children [i_date - i_beg] .focus();

  if (btn_other) {
    const b_rect = btn_other.getBoundingClientRect();
    const m_rect = menu     .getBoundingClientRect();

    const is_overlap = (m_rect.bottom >= b_rect.top   ) &&
                       (m_rect.top    <= b_rect.bottom);

    if   (is_overlap) btn_other.style.pointerEvents = 'none';
  }
}

// EOF






