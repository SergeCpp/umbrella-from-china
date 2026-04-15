/* Parsing XML */

function get_node_raw(doc, name, is_selector = false) {
  const node = doc.querySelector(is_selector ? name :
                                 ('arr[name="' + name + '"], ' +
                                  'str[name="' + name + '"]'));
  if  (!node) return '<emp></emp>';
  if   (node.tagName === "arr")
    return node.innerHTML;

  return node.textContent;
}

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

    const collection_arr = get_node_raw(doc, "collection");
    const    creator_arr = get_node_raw(doc, "creator"   );

    let   date       = doc.querySelector('str[name="date"]'      )?.textContent;
    const downloads  = doc.querySelector('str[name="downloads"]' )?.textContent;
    const identifier = doc.querySelector('str[name="identifier"]')?.textContent;
//        indexdate
    const item_size  = doc.querySelector('str[name="item_size"]' )?.textContent;
    const mediatype  = doc.querySelector('str[name="mediatype"]' )?.textContent;
    const month      = doc.querySelector('str[name="month"]'     )?.textContent;
    const publicdate = doc.querySelector('str[name="publicdate"]')?.textContent;
//        reviewdate
    const title      = doc.querySelector('str[name="title"]'     )?.textContent;
    const week       = doc.querySelector('str[name="week"]'      )?.textContent;

    if (date === undefined) date = ""; // For audio items (6) and collections (6)

    stats.push({
      collection_arr,
         creator_arr,

      date      ,
      downloads ,
      identifier,
      item_size ,
      mediatype ,
      month     ,
      publicdate,
      title     ,
      week
    });
  }

  return stats;
}

// barr_collection  <arr name="collection">
// barr_creator     <arr name="creator">
//
// bstr_date        <str name="date">
// bstr_downloads   <str name="downloads">
// bstr_identifier  <str name="identifier">
//      indexdate
// bstr_item_size   <str name="item_size">
// bstr_mediatype   <str name="mediatype">
// bstr_month       <str name="month">
// bstr_publicdate  <str name="publicdate">
//      reviewdate
// bstr_title       <str name="title">
// bstr_week        <str name="week">

// barr_subject     <arr name="subject">

// bstr_description <str name="description">

// Subj: Text: 52.1 ms / 10; DOM: 84.6 ms / 1
// Desc: Text: 53.8 ms / 10; DOM: 47.1 ms / 1
function parse_sect_text_10(text, name) { // Rename: text_10 <-> text
  let du_min = Infinity;

  for (let warm = 0; warm < 10; warm++) parse_sect_text_1(text, name);

  for (let loop = 0; loop < 10; loop++) {
    const start = performance.now();
    for (let i = 0; i < 10; i++) parse_sect_text_1(text, name);
    const du_10 = performance.now() - start;
    if   (du_10 < du_min) du_min = du_10;
  }

  const start  = performance.now();
  const parser = new DOMParser();
  const xml    = parser.parseFromString(text, "text/xml");
  if   (xml.querySelector("parsererror")) throw new Error("Invalid XML format");

  const docs   = xml.querySelectorAll("doc");
  const it_dom = {};
  const data_selector = 'arr[name="' + name + '"], ' +
                        'str[name="' + name + '"]';
  for (const doc of docs) {
    const node_id = doc.querySelector('str[name="identifier"]');
    if  (!node_id) continue;

    const identifier = node_id.textContent;
    const data = get_node_arr(doc, data_selector, true);

    // For two collections
    if ((data[0] === undefined) && (name === "description")) data[0] = "";

    it_dom[identifier] = data;
  }

  const du_dom = performance.now() - start;

  alert("Text: " + du_min.toFixed(1) + " ms / 10" + '\n' +
        "DOM: "  + du_dom.toFixed(1) + " ms / 1");

  const items = parse_sect_text_1(text, name);
  const str   =  JSON.stringify  (items);
  if   (str  === JSON.stringify  (it_dom)) {
//  alert("ok sect " + name + ": " + str.length);
  }
  else {
    alert("no sect " + name);
  }

  return items;
}

function parse_sect_text(text, name) { // Rename: text <-> text_1
  switch (name) {
    case 'subject'    : return parse_sect_subj(text);
    case 'description': return parse_sect_desc(text);
  }
}

// Is 'subject' array
function parse_sect_subj(text) {
  const subjs = {};
  let   pos   = text.indexOf('<d', 700) + 1; // XML header and <

  do {
    pos += 32;// doc> + \n + 4 spaces + <str name="identifier">
    const end = text.indexOf('<', pos);
    const identifier = text.slice(pos, end);

    pos = end + 22; // </str> + \n + 4 spaces + <arr name="
    const ptr = [0]; // Initial not needed
    subjs[identifier] = get_stat_arr(text, pos, 0x73, 9, ptr); // subject">

    pos = ptr[0] - 3; // - 22 + 19: </arr> + \n + 2 spaces + </doc> + \n + 2 spaces + <
  }
  while (text.charCodeAt(pos) === 0x64); // At 'd' of <doc>

  return subjs;
}

// Is 'description' string
function parse_sect_desc(text) {
  const descs = {};
  let   pos   = text.indexOf('<d', 700) + 1; // XML header and <

  do {
    pos += 20; // doc> + \n + 4 spaces + <str name="
    const ptr = [pos]; // Initial needed for case of absent description
    const description = get_desc_str(text, pos, ptr);

    pos = ptr[0] + 12; // After identifier">
    const end = text.indexOf('<', pos);
    const identifier  = text.slice(pos, end);
    descs[identifier] = [description.toLowerCase()]; // Lowercased as array for filtering

    pos = end + 19; // </str> + \n + 2 spaces + </doc> + \n + 2 spaces + <
  }
  while (text.charCodeAt(pos) === 0x64); // At 'd' of <doc>

  return descs;
}

// Text: 10.7 ms / 10
// DOM : 70.4 ms / 1
function parse_stat_text_10(text) { // Rename: text_10 <-> text
  let du_min = Infinity;

  for (let warm = 0; warm < 10; warm++) parse_stat_text_1(text);

  for (let loop = 0; loop < 10; loop++) {
    const start = performance.now();
    for (let i = 0; i < 10; i++) parse_stat_text_1(text);
    const du_10 = performance.now() - start;
    if   (du_10 < du_min) du_min = du_10;
  }

  const start  = performance.now();
  const parser = new DOMParser();
  const xml    = parser.parseFromString(text, "text/xml");
  if   (xml.querySelector("parsererror")) throw new Error("Invalid XML format");

  const docs   = xml.querySelectorAll("doc");
  const st_dom = conv_stat_docs(docs);
  const du_dom = performance.now() - start;

  alert("Text: " + du_min.toFixed(1) + " ms / 10" + '\n' +
        "DOM: "  + du_dom.toFixed(1) + " ms / 1");

  const stats  = parse_stat_text_1(text);
  const str    =  JSON.stringify  (stats);
  if   (str   === JSON.stringify  (st_dom)) {
//  alert("ok stat: " + str.length);
  }
  else {
    alert("no stat");
  }

  return stats;
}

function parse_stat_text(text) { // Rename: text <-> text_1
  const stats = [];
  let   pos   = text.indexOf('<d', 700) + 1; // XML header and <

  do {
    pos += 20;// doc> + \n + 4 spaces + <arr name="

    const ptr = [pos]; // Initial needed for case of absent collection

    stats.push({
      collection_arr : get_stat_raw(text, pos,    0x63,   12, ptr), // collection">
         creator_arr : get_stat_raw(text, ptr[0], 0x63,    9, ptr), // creator">

      date           : get_stat_str(text, ptr[0], 0x6461,  6, ptr), // date">
      downloads      : get_stat_str(text, ptr[0], 0x646f, 11, ptr), // downloads">
      identifier     : get_stat_str(text, ptr[0], 0x6964, 12, ptr), // identifier">
//    indexdate      : get_stat_str(text, ptr[0], 0x696e, 11, ptr), // indexdate">
      item_size      : get_stat_str(text, ptr[0], 0x6974, 11, ptr), // item_size">
      mediatype      : get_stat_str(text, ptr[0], 0x6d65, 11, ptr), // mediatype">
      month          : get_stat_str(text, ptr[0], 0x6d6f,  7, ptr), // month">
      publicdate     : get_stat_str(text, ptr[0], 0x7075, 12, ptr), // publicdate">
//    reviewdate     : get_stat_str(text, ptr[0], 0x7265, 12, ptr), // reviewdate">
      title          : get_stat_str(text, ptr[0], 0x7469,  7, ptr), // title">
      week           : get_stat_str(text, ptr[0], 0x7765,  6, ptr)  // week">
    });

    pos = ptr[0] - 3; // - 22 + 19: </arr> + \n + 2 spaces + </doc> + \n + 2 spaces + <
  }
  while (text.charCodeAt(pos) === 0x64); // At 'd' of <doc>

  return stats;
}

// Lowercased as array for filtering
function conv_raw_str_to_arr(field, to_lowercase) {
  if (field === "<emp></emp>") return [];

  if (to_lowercase) field = field.toLowerCase();

  if (!field.startsWith("<str>") && !field.endsWith("</str>")) return [field];

  return field.slice(5, -6).split("</str><str>");
}

// Lowercased as array for filtering
function ensure_field_can_filter(field_name, filter_terms) {
  if (!filter_terms || !filter_terms.length) return;

  const field_arr    =  field_name  +  "_arr";
  const to_lowercase = (field_name === "creator");

  const main_prev_items = items_main("prev");
  const main_curr_items = items_main("curr");

  if (typeof main_prev_items[0][field_arr] !== "object")
    for (const item of main_prev_items)
      item[field_arr] = conv_raw_str_to_arr(item[field_arr], to_lowercase);

  if (typeof main_curr_items[0][field_arr] !== "object")
    for (const item of main_curr_items)
      item[field_arr] = conv_raw_str_to_arr(item[field_arr], to_lowercase);
}

// Lowercased as array for filtering
function ensure_title_can_filter(filter_terms, is_title_identifier) {
  if (!filter_terms || !filter_terms.length) return;

  const field_str = is_title_identifier ? "identifier" : "title";
  const field_arr = field_str + "_arr";

  const main_prev_items = items_main("prev");
  const main_curr_items = items_main("curr");

  if (!main_prev_items[0][field_arr])
    for (const item of main_prev_items)
      item[field_arr] = [item[field_str].toLowerCase()];

  if (!main_curr_items[0][field_arr])
    for (const item of main_curr_items)
      item[field_arr] = [item[field_str].toLowerCase()];
}

// beg: after " of "desc... / "id...
function get_desc_str(text, beg, ptr) {
  if (text.charCodeAt(beg) !== 0x64) return ""; // Not 'd', so not "description"
  const str_pos = beg + 13; // After description">

  const str_end = text.indexOf('<', str_pos); // XML considered correct
  ptr[0] = str_end + 22; // </str> + \n + 4 spaces + <str name="

  const  str = text.slice(str_pos, str_end);
  return str.includes('&') // Replace chain here faster than callback method
       ? str.replace (/&quot;/g, '"') // 350 occurrences in 'description' (474 '&' only there)
            .replace (/&amp;/g,  '&') //  79 in two collections (39 + 39) and one video
            .replace (/&gt;/g,   '>') //  39 mainly in one collection
            .replace (/&lt;/g,   '<') //   6
       : str;
}

// beg: after <str name="
function get_stat_str(text, beg, b01, blen, ptr) {
  let t01 = (text.charCodeAt(beg) << 8) | text.charCodeAt(beg + 1);

  while (t01 < b01) {
    // To next string element
    beg =  text.indexOf('<', beg) + 22; // </str> + \n + 4 spaces + <str name="
    t01 = (text.charCodeAt(beg) << 8) | text.charCodeAt(beg + 1);
  }

  if (t01 > b01) return ""; // Do not touch ptr

  let str_pos = beg + blen; // To string beginning

  const str_end = text.indexOf('<', str_pos); // XML considered correct
  ptr[0] = str_end + 22; // </str> + \n + 4 spaces + <str name="

  return text.slice(str_pos, str_end);
}

// beg: after <arr name="
function get_stat_raw(text, beg, b, blen, ptr) {
  if (text.charCodeAt(beg) !== b) return '<emp></emp>'; // Do not touch ptr

  let arr_pos = beg + blen; // To array/string beginning

  // 10: arr name="
  if (text.charCodeAt(beg - 10) !== 0x61) { // Not 'a', so not <arr
    // Found <str> at arr_pos
    const str_end = text.indexOf('<', arr_pos); // XML considered correct
    ptr[0] = str_end + 22; // </str> + \n + 4 spaces + <arr name=" (<str name=")

    return text.slice(arr_pos, str_end); // Return raw string
  }

  // 25: <str>a</str><str>b</str><
  // No empty arrays in the XML
  // No one-string arrays
  // No empty strings
  const arr_end = text.indexOf('/a', arr_pos + 25) - 1; // XML considered correct
  ptr[0] = arr_end + 22; // </arr> + \n + 4 spaces + <arr name=" (<str name=")

  return text.slice(arr_pos, arr_end); // Return raw string
}

// beg: after <arr name="
function get_stat_arr(text, beg, b, blen, ptr) {
  if (text.charCodeAt(beg) !== b) return []; // Do not touch ptr

  let arr_pos = beg + blen; // To array/string beginning

  // 10: arr name="
  if (text.charCodeAt(beg - 10) !== 0x61) { // Not 'a', so not <arr
    // Found <str> at arr_pos
    const str_end = text.indexOf('<', arr_pos); // XML considered correct
    ptr[0] = str_end + 22; // </str> + \n + 4 spaces + <arr name=" (<str name=")

    return [text.slice(arr_pos, str_end).toLowerCase()];
  }

  const arr = [];

  arr_pos += 5; // After </str><str>
  do { // No empty arrays in the XML
    const str_beg = arr_pos; // String beginning

    arr_pos = text.indexOf('<', str_beg); // XML considered correct, and <str> is found at b
    arr.push(text.slice(str_beg, arr_pos).toLowerCase());
    arr_pos += 11; // After </str><str> or at '>' of </arr>
  }
  while (text.charCodeAt(arr_pos) !== 0x3e); // Not '>' of </arr>

  ptr[0] = arr_pos + 17; // > + \n + 4 spaces + <arr name=" (<str name=")

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
      setTimeout(process_filter, 0);
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
      process_error(error_compose("Error: " + err.message));
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

      setTimeout(process_filter, 0);
    })
    .catch(err => {
      process_error(error_compose("Error: " + err.message));
    });
}

function load_stats() {
  const container = document.getElementById("results");
        container . innerHTML = '<div class="text-center text-comment">Loading...</div>';

  if (stat_prev_date === stat_curr_date) {
    load_stat_file(stat_prev_date)
      .then(loaded_items => {
        stat_prev_items = loaded_items;
        stat_curr_items = loaded_items;

        setTimeout(process_filter, 0);
      })
      .catch(err => {
        process_error(error_compose("Error: " + err.message));
      });
  } else { // Different dates to load
    Promise.all([
      load_stat_file(stat_prev_date),
      load_stat_file(stat_curr_date)
    ])
    .then(([loaded_prev_items, loaded_curr_items]) => {
      stat_prev_items = loaded_prev_items;
      stat_curr_items = loaded_curr_items;

      setTimeout(process_filter, 0);
    })
    .catch(err => {
      process_error(error_compose("Error: " + err.message));
    });
  }
}

// EOF






