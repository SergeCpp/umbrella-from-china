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

    if (date === undefined) date = ""; // Audio items (6) and collections (6)

    const collection_arr = get_node_arr(doc, "collection");
    const    creator_arr = get_node_arr(doc, "creator"   );
    const      title_arr = title      ? [title     .toLowerCase()] : []; // Lowercased as array for filtering
    const identifier_arr = identifier ? [identifier.toLowerCase()] : []; // Lowercased as array for filtering

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
         creator_arr,
           title_arr,
      identifier_arr
    });
  }

  return stats;
}

const bstr_date        = '"date">'; // <str name="date">
const bstr_description = 'ption">'; // <str name="description">
const bstr_downloads   = 'loads">'; // <str name="downloads">
const bstr_identifier  = 'ifier">'; // <str name="identifier">
const bstr_item_size   = '_size">'; // <str name="item_size">
const bstr_mediatype   = 'atype">'; // <str name="mediatype">
const bstr_month       = 'month">'; // <str name="month">
const bstr_publicdate  = 'cdate">'; // <str name="publicdate">
const bstr_title       = 'title">'; // <str name="title">
const bstr_week        = '"week">'; // <str name="week">

const barr_collection  = 'ction">'; // <arr name="collection">
const barr_creator     = 'eator">'; // <arr name="creator">
const barr_subject     = 'bject">'; // <arr name="subject">

function parse_sect_text(text, name) {
  const is_desc = name === 'description'; // Is string, else is 'subject' array
  const items   = {};
  let   pos     = 0;

  do {
    pos = text.indexOf('<doc>', pos) + 5;
    if (pos < 5) break;

    const end = text.indexOf('</doc>', pos);
    if   (end === -1) break;

    const identifier = get_stat_str(text, pos, end, bstr_identifier);

    if (is_desc) {
      const description = get_stat_str_decode(text, pos, end, bstr_description);

      items[identifier] = description ? [description.toLowerCase()] : []; // Lowercased as array for filtering
    }
    else {
      items[identifier] = get_stat_arr(text, pos, end, barr_subject);
    }

    pos = end + 6;
  }
  while (true);

  return items;
}

// Minimal time: 213.3 ms, 198.5 ms
function parse_stat_text_10(text) {
  for (let i = 0; i < 9; i++ ) parse_stat_text_1(text);
  return                       parse_stat_text_1(text);
}

function parse_stat_text(text) {
  const stats = [];
  let   pos   = 0;

  do {
    pos = text.indexOf('<doc>', pos) + 5;
    if (pos < 5) break;

    const end = text.indexOf('</doc>', pos);
    if   (end === -1) break;

    const identifier = get_stat_str(text, pos, end, bstr_identifier);
    const title      = get_stat_str(text, pos, end, bstr_title     );

    stats.push({
      identifier     ,
      title          ,
      item_size      : get_stat_str(text, pos, end, bstr_item_size ),
      mediatype      : get_stat_str(text, pos, end, bstr_mediatype ),
      date           : get_stat_str(text, pos, end, bstr_date      ),
      publicdate     : get_stat_str(text, pos, end, bstr_publicdate),
      downloads      : get_stat_str(text, pos, end, bstr_downloads ),
      month          : get_stat_str(text, pos, end, bstr_month     ),
      week           : get_stat_str(text, pos, end, bstr_week      ),

      collection_arr : get_stat_arr(text, pos, end, barr_collection),
         creator_arr : get_stat_arr(text, pos, end, barr_creator   ),

           title_arr : title      ? [title     .toLowerCase()] : [], // Lowercased as array for filtering
      identifier_arr : identifier ? [identifier.toLowerCase()] : []  // Lowercased as array for filtering
    });

    pos = end + 6;
  }
  while (true);

  return stats;
}

const decode_amp_reg = /&(quot|amp|gt|lt);/g;
const decode_amp_map = {
  '&quot;': '"', // 350 occurrences in 'description' (amps only there)
  '&amp;' : '&', //  79
  '&gt;'  : '>', //  39
  '&lt;'  : '<'  //   6
};

function get_stat_str_decode(text, beg, end, bstr) {
  const str = get_stat_str  (text, beg, end, bstr);
  if  (!str.includes('&')) return str;

  return str.replace(decode_amp_reg, (m) => decode_amp_map[m]);
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
    // It is <str> found at arr_pos
    return [text.slice(arr_pos, text.indexOf('</', arr_pos)).toLowerCase()]; // XML considered correct
  }

  const arr = [];

  arr_pos -= 6; // </str>
  do {
    const b = text.indexOf('<s', arr_pos + 6) + 5; // Considered present in XML always after arr_pos
    if   (b >= arr_end) break; // So this condition is enough

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
/*
      const parser = new DOMParser();
      const xml    = parser.parseFromString(text, "text/xml");

      if (xml.querySelector("parsererror")) {
        section.text_error = section.name_error + " &mdash; XML file invalid format";
        throw new Error(section.text_error);
      }
      const docs = xml.querySelectorAll("doc");

      // Create data lookup map for id: data
      const section_items = {};
      const data_selector = 'arr[name="' + section.name_data + '"], ' +
                            'str[name="' + section.name_data + '"]';
      for (const doc of docs) {
        const node_id = doc.querySelector('str[name="identifier"]');
        if  (!node_id) continue;

        const identifier = node_id.textContent;
        const data = get_node_arr(doc, data_selector, true);
        section_items[identifier] = data;
      }
*/
      const time_1  = performance.now();
      section.items = parse_sect_text(text, section.name_data);
      const time_2  = performance.now();
/*
      const str_n   = JSON.stringify(section_items);
      if   (str_n === JSON.stringify(section.items)) {
//      alert("ok sect: " + str_n.length);
      }
      else {
        alert("no sect");
      }
*/

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
/*
      const parser = new DOMParser();
      const xml    = parser.parseFromString(text, "text/xml");
      if   (xml.querySelector("parsererror")) throw new Error(date + " &mdash; Invalid XML format");

      const docs   = xml.querySelectorAll("doc");
      const stats_ = conv_stat_docs(docs);
*/
      const time_1 = performance.now();
      const stats  = parse_stat_text(text);
      const time_2 = performance.now();
/*
      const str_n  =  JSON.stringify(stats);
      if   (str_n === JSON.stringify(stats_)) {
//      alert("ok stat: " + str_n.length);
      }
      else {
        alert("no stat");
      }
*/

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






