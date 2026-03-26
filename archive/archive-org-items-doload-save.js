/* Parsing XML */

const bstr_date        = '<str name="date">';
const bstr_description = '<str name="description">';
const bstr_downloads   = '<str name="downloads">';
const bstr_identifier  = '<str name="identifier">';
const bstr_item_size   = '<str name="item_size">';
const bstr_mediatype   = '<str name="mediatype">';
const bstr_month       = '<str name="month">';
const bstr_publicdate  = '<str name="publicdate">';
const bstr_title       = '<str name="title">';
const bstr_week        = '<str name="week">';

const barr_collection  = '<arr name="collection">';
const barr_creator     = '<arr name="creator">';
const barr_subject     = '<arr name="subject">';

function parse_sect_text(text, name) {
  const is_desc = name === 'description'; // Is string, else is 'subject' array
  const items   = {};
  let   pos     = 0;

  do {
    const beg = text.indexOf( '<doc>', pos);
    if   (beg === -1) break;

    const end = text.indexOf('</doc>', beg + 5);
    if   (end === -1) break;

    const identifier = get_stat_str(text, beg, end, bstr_identifier);

    if (is_desc) {
      const description = get_stat_str(text, beg, end, bstr_description, 'decode');

      items[identifier] = description ? [description.toLowerCase()] : []; // Lowercased as array for filtering
    }
    else {
      items[identifier] = get_stat_arr(text, beg, end, barr_subject);
    }

    pos = end + 6;
  }
  while (true);

  return items;
}

function parse_stat_text(text) {
  const stats = [];
  let   pos   = 0;

  do {
    const beg = text.indexOf( '<doc>', pos);
    if   (beg === -1) break;

    const end = text.indexOf('</doc>', beg + 5);
    if   (end === -1) break;

    const identifier = get_stat_str(text, beg, end, bstr_identifier);
    const title      = get_stat_str(text, beg, end, bstr_title     );

    stats.push({
      identifier     ,
      title          ,
      item_size      : get_stat_str(text, beg, end, bstr_item_size ),
      mediatype      : get_stat_str(text, beg, end, bstr_mediatype ),
      date           : get_stat_str(text, beg, end, bstr_date      ),
      publicdate     : get_stat_str(text, beg, end, bstr_publicdate),
      downloads      : get_stat_str(text, beg, end, bstr_downloads ),
      month          : get_stat_str(text, beg, end, bstr_month     ),
      week           : get_stat_str(text, beg, end, bstr_week      ),

      collection_arr : get_stat_arr(text, beg, end, barr_collection),
         creator_arr : get_stat_arr(text, beg, end, barr_creator   ),

           title_arr : title      ? [title     .toLowerCase()] : [], // Lowercased as array for filtering
      identifier_arr : identifier ? [identifier.toLowerCase()] : []  // Lowercased as array for filtering
    });

    pos = end + 6;
  }
  while (true);

  return stats;
}

const decode_amp_map = {
  '&quot;': '"', // 350 occurrences in 'description' (amps only there)
  '&amp;' : '&', //  79
  '&gt;'  : '>', //  39
  '&lt;'  : '<'  //   6
};

function get_stat_str(text, beg, end, bstr, decode = false) {
  const beg_idx = text.indexOf(bstr, beg);
  if  ((beg_idx === -1) || (beg_idx >= end)) return undefined;

  const str_beg = beg_idx + bstr.length;
  const str_end = text.indexOf('</str>', str_beg);
  if  ((str_end === -1) || (str_end >= end)) return undefined;

  const str = text.slice(str_beg, str_end);

  return decode ? str.replace(/&(quot|amp|gt|lt);/g, (m) => decode_amp_map[m]) : str;
}

function get_stat_arr(text, beg, end, barr) {
  const beg_idx = text.indexOf(barr, beg);

  if  ((beg_idx !== -1) && (beg_idx < end)) {
    const arr_beg = beg_idx + barr.length;
    const arr_end = text.indexOf('</arr>', arr_beg);
    if  ((arr_end === -1) || (arr_end >= end)) return [];

    const arr = [];
    let   pos = arr_beg;

    do {
      const b = text.indexOf('<str>', pos);
      if  ((b === -1) || (b >= arr_end)) break;

      const a = b + 5;
      const e = text.indexOf('</str>', a);
      if  ((e === -1) || (e >= arr_end)) break;

      arr.push(text.slice(a, e).toLowerCase());
      pos = e + 6;
    }
    while (true);

    return arr;
  }

  const  str = get_stat_str(text, beg, end, '<str' + barr.slice(4));
  return str ? [str.toLowerCase()] : [];
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

// EOF






