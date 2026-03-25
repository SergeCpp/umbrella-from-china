const doc_beg_seq =  '<doc>';
const doc_beg_len = doc_beg_seq.length;
const doc_end_seq = '</doc>';
const doc_end_len = doc_end_seq.length;

function parse_sect_text(text, name) {
  const is_desc = name === 'description';
  const items   = {};
  let   pos     = 0;

  do {
    const beg = text.indexOf(doc_beg_seq, pos);
    if   (beg === -1) break;

    const end = text.indexOf(doc_end_seq, beg + doc_beg_len);
    if   (end === -1) break;

    const identifier = get_stat_str(text, beg, end, 'identifier');

    if (is_desc) {
      const desc = get_stat_str(text, beg, end, name, 'decode');

      items[identifier] = desc ? [desc.toLowerCase()] : []; // Lowercased as array for filtering
    }
    else {
      items[identifier] = get_stat_arr(text, beg, end, name);
    }

    pos = end + doc_end_len;
  }
  while (true);

  return items;
}

function parse_stat_text(text) {
  const stats = [];
  let   pos   = 0;

  do {
    const beg = text.indexOf(doc_beg_seq, pos);
    if   (beg === -1) break;

    const end = text.indexOf(doc_end_seq, beg + doc_beg_len);
    if   (end === -1) break;

    const identifier = get_stat_str(text, beg, end, 'identifier');
    const title      = get_stat_str(text, beg, end, 'title'     );

    stats.push({
      identifier     ,
      title          ,
      item_size      : get_stat_str(text, beg, end, 'item_size' ),
      mediatype      : get_stat_str(text, beg, end, 'mediatype' ),
      date           : get_stat_str(text, beg, end, 'date'      ),
      publicdate     : get_stat_str(text, beg, end, 'publicdate'),
      downloads      : get_stat_str(text, beg, end, 'downloads' ),
      month          : get_stat_str(text, beg, end, 'month'     ),
      week           : get_stat_str(text, beg, end, 'week'      ),

      collection_arr : get_stat_arr(text, beg, end, 'collection'),
         creator_arr : get_stat_arr(text, beg, end, 'creator'   ),

           title_arr : title      ? [title     .toLowerCase()] : [], // Lowercased as array for filtering
      identifier_arr : identifier ? [identifier.toLowerCase()] : []  // Lowercased as array for filtering
    });

    pos = end + doc_end_len;
  }
  while (true);

  return stats;
}

function decode_amp_str(str) {
  if (!str.includes('&')) return str;

  return str.replace(/&quot;/g, '"')
            .replace(/&amp;/g,  '&')
            .replace(/&lt;/g,   '<')
            .replace(/&gt;/g,   '>');
}

function get_stat_str(text, beg, end, name, decode = false) {
  const beg_seq = '<str name="' + name + '">';
  const beg_idx = text.indexOf(beg_seq, beg);
  if  ((beg_idx === -1) || (beg_idx >= end)) return undefined;

  const str_beg = beg_idx + beg_seq.length;
  const str_end = text.indexOf('</str>', str_beg);
  if  ((str_end === -1) || (str_end >= end)) return undefined;

  const str = text.slice(str_beg, str_end);

  return decode ? decode_amp_str(str) : str;
}

const str_beg_seq =  '<str>';
const str_beg_len = str_beg_seq.length;
const str_end_seq = '</str>';
const str_end_len = str_end_seq.length;

function get_stat_arr(text, beg, end, name) {
  const beg_seq = '<arr name="' + name + '">';
  const beg_idx = text.indexOf(beg_seq, beg);

  if  ((beg_idx !== -1) && (beg_idx < end)) {
    const arr_beg = beg_idx + beg_seq.length;
    const arr_end = text.indexOf('</arr>', arr_beg);
    if  ((arr_end === -1) || (arr_end >= end)) return [];

    const arr = [];
    let   pos = arr_beg;

    do {
      const b = text.indexOf(str_beg_seq, pos);
      if  ((b === -1) || (b >= arr_end)) break;

      const a = b + str_beg_len;
      const e = text.indexOf(str_end_seq, a);
      if  ((e === -1) || (e >= arr_end)) break;

      arr.push(text.slice(a, e).toLowerCase());
      pos = e + str_end_len;
    }
    while (true);

    return arr;
  }

  const  str = get_stat_str(text, beg, end, name);
  return str ? [str.toLowerCase()] : [];
}

// EOF






