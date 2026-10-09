/* Filter by Date */

function filter_date(date, min, max) {
  if (min.base === "year") return (date >= min.min_ms) && (date <= max.max_ms);

  // Month-based
  const  date_month  = date.getUTCMonth() + 1;
  const  date_day    = date.getUTCDate ();

  const  date_ge_md  = min.day    ? (date_month >  min.month) || ((date_month === min.month) && (date_day >= min.day))
                                  :  date_month >= min.month;
  const  date_le_md  = max.day    ? (date_month <  max.month) || ((date_month === max.month) && (date_day <= max.day))
                                  :  date_month <= max.month;
  const   min_le_max = min.day
                       &&
                       max.day    ?  (min.month <  max.month) ||  ((min.month === max.month) &&  (min.day <= max.day))
                                  :   min.month <= max.month;

  return  min_le_max ? date_ge_md && date_le_md // Same year
                     : date_ge_md || date_le_md;
}

function get_date_range(date_str) {
  if   (!date_str) return null;

  // Catch empty parts like "2022-", "2022--", "2022-08-", "2022--08"
  const parts_str = date_str.split('-').map(part => part.trim());
  if   (parts_str.some(part => !/^\d{1,4}$/.test(part))) return null;

  const first_str = parts_str[0];
  const first_len = first_str.length;

  const parts     = parts_str.map(Number); // Ok with check above
  const parts_len = parts.length;

  if (first_len === 4) { // Year-based format
    const base = "year";

    if (parts_len === 1) { // Year
      const year = parts[0];
      if (!is_date_valid(year, 1, 1)) return null;

      return {
        base,
        min_ms: Date.UTC(year,     1 - 1,  1,      0,  0,  0,   0), // Beg of year
        max_ms: Date.UTC(year,    12 - 1, 31,     23, 59, 59, 999)  // End of year
      };
    }

    if (parts_len === 2) { // Year-month
      const [year, month] = parts;
      if (!is_date_valid(year, month, 1)) return null;
      const e_mday = new Date(Date.UTC(year, month, 0)).getUTCDate();

      return {
        base,
        min_ms: Date.UTC(year, month - 1, 1,       0,  0,  0,   0), // Beg of month
        max_ms: Date.UTC(year, month - 1, e_mday, 23, 59, 59, 999)  // End of month
      };
    }

    if (parts_len === 3) { // Year-month-day
      const [year, month, day] = parts;
      if (!is_date_valid(year, month, day)) return null;

      return {
        base,
        min_ms: Date.UTC(year, month - 1, day,     0,  0,  0,   0), // Beg of day
        max_ms: Date.UTC(year, month - 1, day,    23, 59, 59, 999)  // End of day
      };
    }

    return null; // Invalid format
  }

  // Month-based format

  const base = "month";

  if (first_len === 3) {
    if (parts_len === 1) {
      if (first_str === "520") return { base, month: 5, day: 20 }; // Happy 520 Day!
    }

    return null;
  }

  const month = parts[0];
  if  ((month < 1) || (month > 12)) return null;

  if (parts_len === 1) return { base, month };

  if (parts_len === 2) {
    const day = parts[1];
    if (!is_date_valid(2024, month, day)) return null; // Allow 29 days for February

    return { base, month, day };
  }

  return null; // Invalid format
}

// Construct date and check if it corrects the input
function  is_date_valid               (year, month,     day) {
  const      date = new Date(Date.UTC (year, month - 1, day));
  return     date.getUTCFullYear() === year
          && date.getUTCMonth   () ===      (month - 1)
          && date.getUTCDate    () ===                  day;
}

/* Filter by Query */

function filter_matches(doc, field, terms) {
  if (!terms || !terms.length) return true; // No or empty filter = match all

  const values = doc[field + "_arr"];

  return terms.some(term => evaluate_term(term, values)); // Check if any term matches
}

function evaluate_term(term, values) {
  switch (term.type) {
    case "AND":
      return term.terms.every(part => evaluate_term(part, values));

    case "OR":
      return term.terms.some (part => evaluate_term(part, values));

    case "XOR": {
      //  XOR : Include if one match only
      let cnt_match = 0;
      for (const part of term.terms) {
        if (evaluate_term(part, values)) {
          cnt_match++;
          if (cnt_match > 1) return false;
        }
      }
      return cnt_match === 1;
    }
    case "NOT"   :
    case "NOTANY": {
      //  NOTANY : Exclude if any value matches term.excl
      const any_match = evaluate_term(term.excl, values);
      return (!term.incl || evaluate_term(term.incl, values)) && !any_match;
    }
    case "NOTALL": {
      //  NOTALL : Exclude if all values matches term.excl
      const all_match = values.every(value => evaluate_term(term.excl, [value]));
      return (!term.incl || evaluate_term(term.incl, values)) && !all_match;
    }
    case "COUNT": {
      let cnt_match = 0;
      for (const value of values) {
        if (evaluate_term(term.test, [value])) {
          cnt_match++;
          switch (term.cnd) {
            case '=' :
            case '==': if (cnt_match >  term.cnt) return false; break;
            case '!' :
            case '!=': if (cnt_match >  term.cnt) return true;  break;

            case '<' : if (cnt_match >= term.cnt) return false; break;
            case '<=': if (cnt_match >  term.cnt) return false; break;
            case '>' : if (cnt_match >  term.cnt) return true;  break;
            case '>=': if (cnt_match >= term.cnt) return true;  break;
          }
        }
      }
      switch (term.cnd) {
        case '=' :
        case '==': return cnt_match === term.cnt;
        case '!' :
        case '!=': return cnt_match !== term.cnt;

        case '<' : return cnt_match <   term.cnt;
        case '<=': return cnt_match <=  term.cnt;
        case '>' : return cnt_match >   term.cnt;
        case '>=': return cnt_match >=  term.cnt;

        default  : return false; // Unknown conditional
      }
    }
    case "CHARS_NUM":
      return values.some(value => (value.length >= term.min) && (value.length <= term.max));

    case "B_TEXT_B":
      return values.some(value => is_b_text_b_in_value(term.bpre, term.text, term.bsuf, value));

    case "TEXT":
      return values.some(value => value.includes(term.text));

    default:
      return false; // Unknown type of term
  }
}

function is_b_text_b_in_value(bpre, text, bsuf, value) {
  const vlen = value.length;
  const tlen = text .length;
  if  (!tlen)  return false; // Not a valid query. Must not be empty

  for (let index = 0; (index + tlen) <= vlen; index++) {
           index = value.indexOf(text, index);
    if    (index === -1) return false;

    if (bpre) {
      const ipre =   index  -  1;
      const vpre = ((ipre === -1)   || !is_alnum(value[ipre])) ? "no_alnum" : "alnum";
      if   (vpre !== bpre) continue;
    }

    if (bsuf) {
      const isuf =   index  + tlen;
      const vsuf = ((isuf === vlen) || !is_alnum(value[isuf])) ? "no_alnum" : "alnum";
      if   (vsuf !== bsuf) continue;
    }

    return true;
  }

  return false;
}

function paren_depth(term, index) {
  if (index < 0) return 0;

  let depth = 0;

  for (let i = 0; i < term.length; i++) {
    if (i === index) return depth;

    if (term[i] === '(') { depth++; continue; }
    if (term[i] === ')')   depth--;
  }

  return depth; // For index beyond term
}

function is_digit(char) {
  if (!char) return false;

  const code = char.charCodeAt(0);

  if ((code >= 0x30) && (code <= 0x39)) return true;

  return false;
}

function is_alnum(char) {
  if (!char) return false;

  const code = char.charCodeAt(0);

  if ((code >= 0x30) && (code <= 0x39)) return true;
  if ((code >= 0x41) && (code <= 0x5a)) return true;
  if ((code >= 0x61) && (code <= 0x7a)) return true;

  return false;
}

function is_alpha(char) {
  if (!char) return false;

  const code = char.charCodeAt(0);

  if ((code >= 0x41) && (code <= 0x5a)) return true;
  if ((code >= 0x61) && (code <= 0x7a)) return true;

  return false;
}

function parse_find_op(term, op, index) {
  const tlen = term.length;
  const olen = op  .length;
  if  (!olen)  return -1;

  while ((index + olen) <= tlen) {
          index = term.indexOf(op, index);
    if   (index === -1) return -1;

    const inext = index + olen;

    if  ((index > 0)    && is_alnum(term[index - 1])) { index = inext; continue; }
    if  ((inext < tlen) && is_alnum(term[inext    ])) { index = inext; continue; }

    return index;
  }

  return -1;
}

function parse_node_split(term, op) {
  const parts = [];
  let   part  = 0;
  let   start = 0;

  do {
    const index = parse_find_op(term, op, start);
    if   (index === -1) break;

    if (!paren_depth(term, index)) {
      parts.push(term.substring(part, index));
      part = index + op.length;
    }

    start = index + op.length;
  }
  while ((start + op.length) <= term.length);

  if (!parts.length) return null;

  parts.push(term.substring(part));

  return {
    type : op,
    terms: parts.map(part => parse_term(part))
  };
}

function parse_node_sides(term, op) {
  let op_ix = 0;
  let found = false;

  do {
    op_ix = parse_find_op(term, op, op_ix);
    if (op_ix === -1) return null;

    if (!paren_depth(term, op_ix)) {
      found = true;
      break;
    }

    op_ix += op.length;
  }
  while ((op_ix + op.length) <= term.length);

  if (!found) return null;

  const ex_ix = op_ix + op.length;
  const incl  = term.substring(0, op_ix).trimEnd(); // Left
  const excl  = term.substring(   ex_ix); // Right
  return {
    type: op,
    incl: incl ? parse_term(incl) : null,
    excl:        parse_term(excl)
  };
}

function parse_term(term) {
  term = term.trim();

  if (term.startsWith('(') && term.endsWith(')')) {
    let depth = 1;

    for (let i = 1; i < (term.length - 1); i++) {
      if (term[i] === '(') { depth++; continue; }
      if (term[i] === ')') { depth--; if (!depth) break; }
    }

    if (depth === 1) return parse_term(term.slice(1, -1));
  }

  let node = null;

  // Check for AND first (higher precedence)
  node = parse_node_split(term, "AND");
  if (node) return node;

  // Check for NOT next
  node = parse_node_sides(term, "NOT");
  if (node) return node;

  // Check for NOTANY next
  node = parse_node_sides(term, "NOTANY");
  if (node) return node;

  // Check for NOTALL next
  node = parse_node_sides(term, "NOTALL");
  if (node) return node;

  // Check for XOR next
  node = parse_node_split(term, "XOR");
  if (node) return node;

  // Check for OR next
  node = parse_node_split(term, "OR");
  if (node) return node;

  // Check for COUNT next
  const cnd_ones = ['=' , '!' , '<' , '>' ];
  const cnd_twos = ['==', '!=', '<=', '>='];
  let   cnd_one  = null;
  let   cnd_idx  = -1;

  for (let i = term.length - 1; i >= 0; i--) {
    if (cnd_ones.includes(term[i]) && !paren_depth(term, i)) {
      cnd_one = term[i];
      cnd_idx = i;
      break;
    }
  }

  if (cnd_one) {
    let cnd_two = null;

    if ((cnd_one === '=') && (cnd_idx > 0)) {
      const str_two = term.substring(cnd_idx - 1, cnd_idx + 1);
      if (cnd_twos.includes(str_two)) {
        cnd_two = str_two;
        cnd_idx--;
      }
    }

    const cnd     = cnd_two ? cnd_two : cnd_one;
    const nxt_idx = cnd_idx + cnd.length;
    const test    = term.substring(0, cnd_idx); // Term to test for
    const cnt_str = term.substring(   nxt_idx).trimStart(); // Count of occurrences for it

    if (/^\d{1,4}$/.test(cnt_str)) { // Reasonable limit to count
      let cnt = parseInt(cnt_str, 10);
      if (!isNaN(cnt) && (cnt >= 0)) { // Only valid count to use
        return {
          type: "COUNT",
          test: parse_term(test),
          cnd,
          cnt
        };
      }
    }
  }

  // Check for CHARS_NUM next
  node = parse_chars_num(term);
  if (node) return node;

  // Check for B_TEXT_B next
  node = parse_b_text_b(term);
  if (node) return node;

  // TEXT
  // Plain text term (OR behavior of comma-separated terms)
  return {
    type: "TEXT",
    text: term2text(term)
  };
}

function parse_chars_num(term) {
  if (!term.startsWith('{') || !term.endsWith('}')) return null;

  const limits = term.slice(1, -1).split('-');
  if   (limits.length > 2) return null; // Must be no more than two limits

  let   min     = 0;
  const min_str = limits[0].trim();

  if   (min_str) {
    if (!/^\d{1,6}$/.test(min_str)) return null; // Not a valid number

    min = parseInt(min_str, 10);
  }

  let max = min;

  if (limits.length === 2) {
    max = 999999; // Reasonable limit
    const max_str = limits[1].trim();

    if   (max_str) {
      if (!/^\d{1,6}$/.test(max_str)) return null; // Not a valid number

      max = parseInt(max_str, 10);
      if (min > max) return null; // Not a correct range
    }
  }

  return {
    type: "CHARS_NUM",
    min,
    max
  };
}

function parse_b_text_b(term) {
  if (term.length < 2) return null;

  const is_pre_opn = term.startsWith(']'); // Open   boundary: same is_alnum before
  const is_pre_cls = term.startsWith('['); // Closed boundary: diff is_alnum before

  const is_suf_opn = term.endsWith  ('['); // Open   (see above)
  const is_suf_cls = term.endsWith  (']'); // Closed (see above)

  if (!is_pre_opn && !is_pre_cls && !is_suf_opn && !is_suf_cls) return null;

  if (is_pre_opn || is_pre_cls) term = term.slice(1);
  if (is_suf_opn || is_suf_cls) term = term.slice(0, -1);

  term = term2text(term); // To see actual chars not hidden by quotes
  if (!term.length) return null;

  const is_pre_alnum = is_alnum(term.at( 0));
  const is_suf_alnum = is_alnum(term.at(-1));

  const bpre = is_pre_opn ? (is_pre_alnum ?    "alnum" : "no_alnum") :
               is_pre_cls ? (is_pre_alnum ? "no_alnum" :    "alnum") :
               null;
  const bsuf = is_suf_opn ? (is_suf_alnum ?    "alnum" : "no_alnum") :
               is_suf_cls ? (is_suf_alnum ? "no_alnum" :    "alnum") :
               null;
  return {
    type: "B_TEXT_B",
    bpre,
    text: term,
    bsuf
  };
}

function term2text(term) {
  // Quote allows leading/trailing space, also ' ' possible for term
  return term.replace(/['"]/g, "").toLowerCase();
}

/* Checking and Initial Filtering Items, and Calculating Stats */

function filter_base(stats_items, stats_date,

  archived_min, archived_max, created_min, created_max,
  collections, creators, title, is_title_identifier) {

  const archived_base_is_year  = archived_min.base === "year";
  const  created_base_is_year  =  created_min.base === "year";

  // UTC date, is the earliest for entire thematic stat
  const  created_audio_default = Date.parse("2012-01-01T00:00:00Z");

  // To count one day for an item published on the day before
  const calc_date_ms   = Date.parse(stats_date + "T11:59:59.999Z");

  const stats_length   = stats_items.length;
  const filtered_items = [];

//parse: 3.60 ms
//round: 2.00 ms
//const _ts = performance.now();

  for (let index = 0; index < stats_length; index++) {
    const doc = stats_items[index];

    /* Checking and Initial Filtering Items */

    // Identifier and Title
    const identifier_str = doc.identifier;
    const      title_str = doc.title;
    if (!identifier_str || !title_str) continue;

    // Mediatype
    const mediatype_str = doc.mediatype;
    if  ((mediatype_str !== "movies") && // Movies is the most frequent type
         (mediatype_str !== "audio" )) continue;

    // Item Size
    const item_size_str = doc.item_size;
    if  (!item_size_str) continue;
    const item_size = parseInt(item_size_str, 10);
    if (isNaN(item_size) || (item_size < 0)) continue;

    // Created
    const date_str = doc.date; // Can be not set for an item
    let   date;

    if (date_str) {
      date = Date.parse(date_str);
      if (isNaN(date)) continue;
    }
    else { // No date is set for an item
      if (mediatype_str !== "audio") continue; // Set default date to audio item only
      date = created_audio_default;
    }

    if (!created_base_is_year) date = new Date(date);
    if (!filter_date(date, created_min, created_max)) continue;

    // Archived
    const publicdate_str = doc.publicdate;
    if  (!publicdate_str)  continue;

    const publicdate_ms  = Date.parse(publicdate_str);
    if (isNaN(publicdate_ms)) continue;

    const publicdate     = archived_base_is_year ? publicdate_ms : new Date(publicdate_ms);
    if (!filter_date(publicdate, archived_min, archived_max)) continue;

    // Views
    const downloads_str = doc.downloads;
    const     month_str = doc.month;
    const      week_str = doc.week;

    if (!downloads_str || !month_str || !week_str) continue;

    const downloads = parseInt(downloads_str, 10);
    const month     = parseInt(    month_str, 10);
    const week      = parseInt(     week_str, 10);

    if (isNaN(downloads) || isNaN(month) || isNaN(week)) continue;
    if ((downloads < 0) || (month < 0) || (week < 0)) continue;
    if ((downloads < month) || (month < week)) continue;

    // Collections
    const matches_collections = filter_matches(doc, "collection", collections);
    if  (!matches_collections) continue;

    // Creators
    const matches_creators = filter_matches(doc, "creator", creators);
    if  (!matches_creators) continue;

    // Title / Identifier
    if (!filter_matches(doc, is_title_identifier ? "identifier" : "title", title)) continue;

    /////////////////////
    // Item passed filter

    /* Calculating Stats */

    let   favorites = 0;
    const colls_arr = doc.collection_arr;
    if (typeof colls_arr === "object") {
      const    colls_len = colls_arr.length;
      for  (let i = 0; i < colls_len; i++) {
        if (colls_arr [i].startsWith("fav-")) favorites++;
      }
    }
    else { // Raw string
      let     pos = 4; // <str>fav-a
      while ((pos = colls_arr.indexOf(">fav-", pos)) !== -1) {
        favorites++;
        pos += 16; // >fav-a</str><str>fav-b
      }
    }

    const  time_all = calc_date_ms - publicdate_ms;
    const  days_all = Math.round(  time_all / (24 * 60 * 60 * 1000));
    const views_all = downloads;
//  const ratio_all = parseFloat((views_all / days_all) . toFixed(3));
    const ratio_all = Math.round((views_all / days_all) * 1000) / 1000;

    const  days_old = days_all - 30;
    if    (days_old < 1) continue; // Item should be at least 31 days of age
    const views_old = views_all - month;
//  const ratio_old = parseFloat((views_old / days_old) . toFixed(3));
    const ratio_old = Math.round((views_old / days_old) * 1000) / 1000;

    const views_30  = month;
//  const ratio_30  = parseFloat((views_30  / 30)       . toFixed(3));
    const ratio_30  = Math.round((views_30  / 30)       * 1000) / 1000;

    const views_23  = month - week;
//  const ratio_23  = parseFloat((views_23  / 23)       . toFixed(3));
    const ratio_23  = Math.round((views_23  / 23)       * 1000) / 1000;

    const views_7   = week;
//  const ratio_7   = parseFloat((views_7   /  7)       . toFixed(3));
    const ratio_7   = Math.round((views_7   /  7)       * 1000) / 1000;

    filtered_items.push({
      identifier: identifier_str,
      title     :      title_str,
      mediatype :  mediatype_str,
      item_size,
      favorites,

       time_all,
       days_all,
      views_all,
      ratio_all,

       days_old,
      views_old,
      ratio_old,

      views_30,
      ratio_30,

      views_23,
      ratio_23,

      views_7,
      ratio_7
    });
  }

//alert((performance.now() - _ts).toFixed(2));

  return filtered_items;
}

// EOF






