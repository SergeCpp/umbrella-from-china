/* Parsing XML */

function get_node_arr(doc, name, is_selector = false) {
  const node = doc.querySelector(is_selector ? name :
                                 ('arr[name="' + name + '"], ' +
                                  'str[name="' + name + '"]'));
  if  (!node) return [];
  if   (node.tagName === "arr")
    return Array.from(node.querySelectorAll("str"), n => n.textContent.toLowerCase());

  return [node.textContent.toLowerCase()];
}

function conv_stat_docs(docs) {
  const stats = [];

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];

    const identifier = doc.querySelector('str[name="identifier"]')?.textContent;
    const title      = doc.querySelector('str[name="title"]'     )?.textContent;
    const item_size  = doc.querySelector('str[name="item_size"]' )?.textContent;
    const mediatype  = doc.querySelector('str[name="mediatype"]' )?.textContent;
    let   date       = doc.querySelector('str[name="date"]'      )?.textContent;
    const publicdate = doc.querySelector('str[name="publicdate"]')?.textContent;
    const downloads  = doc.querySelector('str[name="downloads"]' )?.textContent;
    const month      = doc.querySelector('str[name="month"]'     )?.textContent;
    const week       = doc.querySelector('str[name="week"]'      )?.textContent;

    if (date === undefined) date = ""; // For audio items (6) and collections (6)

    const collection_arr = get_node_arr(doc, "collection");
    const    creator_arr = get_node_arr(doc, "creator"   );

// Lowercased as array for filtering
//
//  const      title_arr = [title     .toLowerCase()];
//  const identifier_arr = [identifier.toLowerCase()];

    stats.push({
      identifier,
      title     ,
      item_size ,
      mediatype ,
      date      ,
      publicdate,
      downloads ,
      month     ,
      week      ,
      collection_arr,
         creator_arr
//         title_arr
//    identifier_arr
    });
  }

  return stats;
}

// bstr_date        = '"date">'; // <str name="date">
// bstr_description = 'ption">'; // <str name="description">
// bstr_downloads   = 'loads">'; // <str name="downloads">
// bstr_identifier  = 'ifier">'; // <str name="identifier">
// bstr_item_size   = '_size">'; // <str name="item_size">
// bstr_mediatype   = 'atype">'; // <str name="mediatype">
// bstr_month       = 'month">'; // <str name="month">
// bstr_publicdate  = 'cdate">'; // <str name="publicdate">
// bstr_title       = 'title">'; // <str name="title">
// bstr_week        = '"week">'; // <str name="week">

// barr_collection  = 'ction">'; // <arr name="collection">
// barr_creator     = 'eator">'; // <arr name="creator">
// barr_subject     = 'bject">'; // <arr name="subject">

// Subj du_min: 76.1 ms
// Desc du_min: 62.1 ms
function parse_sect_text_10(text, name) { // Rename: text_10 <-> text
  let du_min = Infinity;

  for (let warm = 0; warm < 10; warm++) parse_sect_text_1(text, name);

  for (let loop = 0; loop < 20; loop++) {
    const start = performance.now();
    for (let i = 0; i < 10; i++) parse_sect_text_1(text, name);
    const du_10 = performance.now() - start;
    if   (du_10 < du_min) du_min = du_10;
  }

  alert(du_min.toFixed(1));

  const items  = parse_sect_text_1(text, name);
  const parser = new DOMParser();
  const xml    = parser.parseFromString(text, "text/xml");
  if   (xml.querySelector("parsererror")) throw new Error("Invalid XML format");

  const docs   = xml.querySelectorAll("doc");
  const items_ = {};
  const data_selector = 'arr[name="' + name + '"], ' +
                        'str[name="' + name + '"]';
  for (const doc of docs) {
    const node_id = doc.querySelector('str[name="identifier"]');
    if  (!node_id) continue;

    const identifier = node_id.textContent;
    const data = get_node_arr(doc, data_selector, true);

    // For two collections
    if ((data[0] === undefined) && (name === "description")) data[0] = "";

    items_[identifier] = data;
  }

  const str  =  JSON.stringify(items);
  if   (str === JSON.stringify(items_)) {
//  alert("ok sect " + name + ": " + str.length);
  }
  else {
    alert("no sect " + name);
  }

  return items;
}

function parse_sect_text(text, name) { // Rename: text <-> text_1
  const is_desc = (name === 'description'); // Is string, else is 'subject' array
  const items   = {};
  let   pos     = 700; // XML header

  do {
    pos = text.indexOf('<doc>', pos) + 26; // <doc> + \n + 4 spaces + <str name="ident
    if (pos < 26) break;                   //                                    descr

    const end = text.indexOf('</doc>', pos);
    if   (end === -1) break;

    if (is_desc) {
      const ptr = [pos];
      const description = get_desc_str(text, pos,    end,  ptr     );
      const identifier  = get_stat_str(text, ptr[0], end, 'ifier">');

      items[identifier] = [description.toLowerCase()]; // Lowercased as array for filtering
    }
    else {
      const identifier  = get_stat_str(text, pos,    end, 'ifier">');

      items[identifier] = get_stat_arr(text, pos,    end, 'bject">');
    }

    pos = end + 6;
  }
  while (true);

  return items;
}

// du_min: 89.0 ms / 82.9 ms
function parse_stat_text_10(text) { // Rename: text_10 <-> text
  let du_min = Infinity;

  for (let warm = 0; warm < 10; warm++) parse_stat_text_1(text);

  for (let loop = 0; loop < 20; loop++) {
    const start = performance.now();
    for (let i = 0; i < 10; i++) parse_stat_text_1(text);
    const du_10 = performance.now() - start;
    if   (du_10 < du_min) du_min = du_10;
  }

  alert(du_min.toFixed(1));

  const stats  = parse_stat_text_1(text);
  const parser = new DOMParser();
  const xml    = parser.parseFromString(text, "text/xml");
  if   (xml.querySelector("parsererror")) throw new Error("Invalid XML format");

  const docs   = xml.querySelectorAll("doc");
  const stats_ = conv_stat_docs(docs);

  const str    =  JSON.stringify(stats);
  if   (str   === JSON.stringify(stats_)) {
//  alert("ok stat: " + str.length);
  }
  else {
    alert("no stat");
  }

  return stats;
}

function parse_stat_text(text) { // Rename: text <-> text_1
  const stats = [];
  let   pos   = 700; // XML header

  do {
    pos = text.indexOf('<doc>', pos) + 20; // <doc> + \n + 4 spaces + <arr name=
    if (pos < 20) break;

    const end = text.indexOf('</doc>', pos);
    if   (end === -1) break;

    const identifier = get_stat_str(text, pos, end, 'ifier">');
    const title      = get_stat_str(text, pos, end, 'title">');

    stats.push({
      identifier     ,
      title          ,
      item_size      : get_stat_str(text, pos, end, '_size">'),
      mediatype      : get_stat_str(text, pos, end, 'atype">'),
      date           : get_stat_str(text, pos, end, '"date">'),
      publicdate     : get_stat_str(text, pos, end, 'cdate">'),
      downloads      : get_stat_str(text, pos, end, 'loads">'),
      month          : get_stat_str(text, pos, end, 'month">'),
      week           : get_stat_str(text, pos, end, '"week">'),

      collection_arr : get_stat_arr(text, pos, end, 'ction">'),
         creator_arr : get_stat_arr(text, pos, end, 'eator">')

// Lowercased as array for filtering
//
//         title_arr : [title     .toLowerCase()]
//    identifier_arr : [identifier.toLowerCase()]
    });

    pos = end + 6;
  }
  while (true);

  return stats;
}

function ensure_title_can_filter(filter_terms, is_title_identifier) {
  if (!filter_terms || !filter_terms.length) return;

  const field_str = is_title_identifier ? "identifier" : "title";
  const field_arr = field_str + "_arr";

  const main_prev_items = items_main("prev");
  const main_curr_items = items_main("curr");

  if (main_prev_items[0][field_arr]) return;

  // Lowercased as array for filtering
  //
  for (const item of main_prev_items) item[field_arr] = [item[field_str].toLowerCase()];
  for (const item of main_curr_items) item[field_arr] = [item[field_str].toLowerCase()];
}

const decode_amp_reg = /&(quot|amp|gt|lt);/g;
const decode_amp_map = {
  '&quot;': '"', // 350 occurrences in 'description' (amps only there)
  '&amp;' : '&', //  79
  '&gt;'  : '>', //  39
  '&lt;'  : '<'  //   6
};

// beg: after "descr / "ident
function get_desc_str(text, beg, end, ptr) {
  if (text.charCodeAt(beg + 1) !== 0x70) return ""; // Not 'p', so not "description"
  const str_pos = beg + 8; // After iption">

  const str_end = text.indexOf('</', str_pos); // XML considered correct
  ptr[0] = str_end + 27; // </str> + \n + 4 spaces + <str name="ident

  const  str = text.slice(str_pos, str_end);
  return str.includes('&') ? str.replace(decode_amp_reg, (m) => decode_amp_map[m]) : str;
}

function get_stat_ptr(text, beg, end, bstr, ptr) {
  const str_pos = text.indexOf(bstr, beg) + 7;
  if  ((str_pos >= end) || (str_pos < 7)) return ""; // More frequent condition first

  const str_end = text.indexOf('</', str_pos); // XML considered correct
  ptr[0] = str_end + 21; // </str> + \n + 4 spaces + <str name= (<arr name=)

  return text.slice(str_pos, str_end);
}

function get_stat_str(text, beg, end, bstr) {
  const str_pos = text.indexOf(bstr, beg) + 7;
  if  ((str_pos >= end) || (str_pos < 7)) return ""; // More frequent condition first

  return text.slice(str_pos, text.indexOf('</', str_pos)); // XML considered correct
}

function get_stat_arr(text, beg, end, barr) {
  let  arr_pos = text.indexOf(barr, beg) + 7;
  if ((arr_pos >= end) || (arr_pos < 7)) return []; // More frequent condition first

  const arr_end = text.indexOf('</a', arr_pos); // XML considered correct

  if  ((arr_end >= end) || (arr_end === -1)) { // More frequent condition first
    // Found <str> at arr_pos
    return [text.slice(arr_pos, text.indexOf('</', arr_pos)).toLowerCase()]; // XML considered correct
  }

  const arr = [];

  arr_pos -= 6; // </str>
  do {
    if ((arr_pos + 6) === arr_end) break;
    const b = arr_pos + 11; // After <str>

    arr_pos = text.indexOf('</', b); // XML considered correct, and <str> is found at b
    arr.push(text.slice(b, arr_pos).toLowerCase());
  }
  while (true);

  return arr;
}

/* Section: Subjects and Descriptions Processing */

const stat_subjects     = {       // Section
  date      : "2025-10-19",       // Subjects is the constant part of the stat
  file      : "data-subjects",    // Template with # for date
  name_data : "subject",          // Name for arr/str data node
  name_error: "Subjects",         // Name for error messages
  text_error: null,               // Error message
  items     : null,               // null / {} / undefined
  du_load   : 0,
  du_parse  : 0
};

const stat_descriptions = {       // Section
  date      : "2025-11-07",       // Descriptions is the constant part of the stat
  file      : "data-descriptions",
  name_data : "description",
  name_error: "Descriptions",
  text_error: null,
  items     : null,
  du_load   : 0,
  du_parse  : 0
};

function wait_section(section, section_terms) {
  if (!section_terms || !section_terms.length) return false; // No or empty filter for section

  if (section.items)               return false; // Section is already loaded
  if (section.items === undefined) return false; // Section cannot be  loaded
  if (section.items !== null)      return false; // Error, must be null here

  load_section(section);

  return true; // Wait for section to load
}

function load_section(section) {
  if (section.items !== null) return;
      section.items = undefined;

  const time_0    = performance.now();
  const container = document.getElementById("results");
  const xml_tmplt = container.getAttribute(section.file);
  const xml_regex = /#/;
  const xml_url   = xml_tmplt.replace(xml_regex, section.date);

  fetch(xml_url)
    .then(response => {
      if (!response.ok) {
        section.text_error = section.name_error + " &mdash; XML file not found";
        throw new Error(section.text_error);
      }
      return response.text();
    })
    .then(text => {
      const time_1  = performance.now();
      section.items = parse_sect_text(text, section.name_data);
      const time_2  = performance.now();

      section.du_load  = (time_1 - time_0); // Anew
      section.du_parse = (time_2 - time_1); //
    })
    .catch(() => {
      section.items = undefined;
    })
    .finally(() => {
      process_filter();
    });
}

function get_section(name) {
  switch (name) {
    case "subjects"    : return stat_subjects;
    case "descriptions": return stat_descriptions;
  }
}

function time_section(name, metric) {
  switch (name + metric) {
    case "subjects"     + "load" : return stat_subjects    .du_load;
    case "subjects"     + "parse": return stat_subjects    .du_parse;
    case "descriptions" + "load" : return stat_descriptions.du_load;
    case "descriptions" + "parse": return stat_descriptions.du_parse;
  }
}

function filter_section(items_prev, items_curr, section_items, section_terms) {
  if (!section_terms || !section_terms.length) return { done: false };
  if (!section_items) return { error: true };

  const identifiers = {}; // Collect all identifiers
  for (const item of items_prev) identifiers[item.identifier] = null;
  for (const item of items_curr) identifiers[item.identifier] = null;

  // Cache match results for items
  for (const identifier in identifiers) {
    const values = section_items[identifier];
    if  (!values) continue;

    const match_result = section_terms.some(term => evaluate_term(term, values));
    identifiers[identifier] = match_result;
  }

  // Use cached results
  const results_prev = items_prev.filter(item => identifiers[item.identifier]);
  const results_curr = items_curr.filter(item => identifiers[item.identifier]);

  return { done: true, prev: results_prev, curr: results_curr };
}

/* Stat */

const stat_file_dates = [];   // ["YYYY-MM-DD"]
const stat_file_cache = {};   // ["YYYY-MM-DD"] = { data: [], usage: counter }

let   stat_prev_date  = null; //  "YYYY-MM-DD"
let   stat_prev_items = null; // []

let   stat_curr_date  = null; //  "YYYY-MM-DD"
let   stat_curr_items = null; // []

let   sf_cache_hits   = 0;    // Non-negative integer
let   sf_cache_misses = 0;    // Non-negative integer

let   sf_du_load      = 0;    // Duration of load
let   sf_du_parse     = 0;    // Duration of parse

function dates_main() {
  return stat_file_dates;
}

function date_main(what) {
  switch (what) {
    case "prev": return stat_prev_date;
    case "curr": return stat_curr_date;
  }
}

function items_main(what) {
  switch (what) {
    case "prev": return stat_prev_items;
    case "curr": return stat_curr_items;
  }
}

function cache_main(metric) {
  switch (metric) {
    case "size"  : return Object.keys(stat_file_cache).length;
    case "hits"  : return sf_cache_hits;
    case "misses": return sf_cache_misses;
  }
}

function time_main(metric) {
  switch (metric) {
    case "load" : return sf_du_load;
    case "parse": return sf_du_parse;
  }
}

/* Dates */

function init_dates() {
  const container = document.getElementById("results");
  const dates_url = container.getAttribute("data-dates");

  return fetch(dates_url)
    .then(response => {
      if (!response.ok) throw new Error("Dates file not found");
      return response.text();
    })
    .then(text => {
      const date_lines     = text.trim().split('\n');
      const date_lines_cnt = date_lines.length;
      if  ((date_lines_cnt === 1) && (date_lines[0] === "")) throw new Error("Dates file is empty");

      const date_regex = /^[0-9]{4}\-[0-9]{2}\-[0-9]{2}$/;

      for (let line_num = 0; line_num < date_lines_cnt; line_num++) {
        const date = date_lines[line_num].trim();
        if  (!date) break; // Stop dates file processing
        if  (!date_regex.test(date)) continue; // Skip no-date line

        stat_file_dates.push(date);
      }

      const dates_cnt = stat_file_dates.length;
      if  (!dates_cnt) throw new Error("Dates file &mdash; No correct dates found");

      if   (dates_cnt === 1) { // Prev === Curr is allowed
        stat_prev_date = stat_file_dates[0];
        stat_curr_date = stat_file_dates[0];
      }
      else {
        stat_file_dates.sort();

        stat_prev_date = stat_file_dates[dates_cnt - 2];
        stat_curr_date = stat_file_dates[dates_cnt - 1];
      }
    })
    .catch(err => {
      container.innerHTML = error_compose("Error: " + err.message);
      throw err;
    });
}

/* Main */

function load_stat_file(date) {
  const cached = stat_file_cache[date];
  if   (cached) {
    sf_cache_hits++;
    cached.usage++;
    return Promise.resolve(cached.data);
  }
  sf_cache_misses++;

  const time_0    = performance.now();
  const container = document.getElementById("results");
  const xml_tmplt = container.getAttribute("data-stats");
  const xml_regex = /#/;
  const xml_url   = xml_tmplt.replace(xml_regex, date);

  return fetch(xml_url)
    .then(response => {
      if (!response.ok) throw new Error(date + " &mdash; XML file not found");
      return response.text();
    })
    .then(text => {
      const time_1 = performance.now();
      const stats  = parse_stat_text(text);
      const time_2 = performance.now();

      sf_du_load  += (time_1 - time_0); // Accumulate
      sf_du_parse += (time_2 - time_1); //

      const cache_dates = Object.keys(stat_file_cache);
      if   (cache_dates.length >= 7) {
        let min_usage = Infinity;
        let min_entry = null;
        for (const cd of cache_dates) {
          if ((cd === stat_prev_date) || (cd === stat_curr_date)) continue;
          const usage = stat_file_cache[cd].usage;
          if (min_usage > usage) {
              min_usage = usage;
              min_entry = cd;
          }
        }
        if (min_entry) delete stat_file_cache[min_entry];
      }

      stat_file_cache[date] = { data: stats, usage: 1 };
      return stats;
    });
}

function load_stat(date, what) {
  if (!stat_file_dates.includes(date)) return;

  if (what === "curr") {
    if (stat_curr_date === date) return;
  } else { //  "prev"
    if (stat_prev_date === date) return;
  }

  sf_du_load  = 0; // Clear
  sf_du_parse = 0; //

  load_stat_file(date)
    .then(loaded_items => {
      if (what === "curr") {
        stat_curr_items = loaded_items;
        stat_curr_date  = date;
      } else { //  "prev"
        stat_prev_items = loaded_items;
        stat_prev_date  = date;
      }
      process_filter();
    })
    .catch(err => {
      document.getElementById("results").innerHTML = error_compose("Error: " + err.message);
    });
}

function load_stats() {
  const container = document.getElementById("results");
        container.innerHTML = '<div class="text-center text-comment">Loading...</div>';

  if (stat_prev_date === stat_curr_date) {
    load_stat_file(stat_prev_date)
      .then(loaded_items => {
        stat_prev_items = loaded_items;
        stat_curr_items = loaded_items;

        process_filter();
      })
      .catch(err => {
        container.innerHTML = error_compose("Error: " + err.message);
      });
  } else { // Different dates to load
    Promise.all([
      load_stat_file(stat_prev_date),
      load_stat_file(stat_curr_date)
    ])
    .then(([loaded_prev_items, loaded_curr_items]) => {
      stat_prev_items = loaded_prev_items;
      stat_curr_items = loaded_curr_items;

      process_filter();
    })
    .catch(err => {
      container.innerHTML = error_compose("Error: " + err.message);
    });
  }
}

// EOF






