/* Global Variables */

// Common

let   timer_tick_interval   = 2000;  // milliseconds

// Collections

const coll_keys             = [];    // "", '2', '3'
const coll_data             = {};    // [coll_key] = {
                                     //  present,
                                     //  buttons,
                                     //
                                     //  player_songs,
                                     //  song_states,
                                     //
                                     //  duration,
                                     //  du_magic,
                                     //  song_begins,
                                     //  song_order
                                     // };

//    present               = false; // true if initialized
//    buttons               = false; // true if present

//    player_songs          = {};    // [pl]       = song_id; pl = 'v' / 'a' / 'b'
//    song_states           = {};    // [song_id]  = state: "played" / "paused", can be 0..3 states

//    duration              = null;  //  seconds
//    du_magic              = null;  //  helper
//    song_begins           = {};    // [song_id]  = seconds
//    song_order            = [];    // [song_num] = song_id, song_num: 0..

// Item

let   item_present          = false; // possibly item_count in future
let   item_type_name        = null;  // "Song" (default), "Dance", etc.
let   item_song_list_file   = null;  // url
let   item_song_root        = null;  // url

let   item_player_load_time = 0;     //  milliseconds
let   item_player_running   = false; //  true if started
let   item_song_to_start    = null;  //  song_id to start at next timer tick
const item_song_states      = {};    // [song_id]        = state: "played" / "paused", can be 0..1 states
const item_song_file_names  = {};    // [song_id]        = song_file_name
const item_file_name_songs  = {};    // [song_file_name] = song_id

/* Player Control */

function scroll_to_view(player) {
  if(player && (player.tagName.toLowerCase() === 'video')) {
     player.scrollIntoView({ behavior: 'smooth', block: 'start' }); // better overall than 'center'
  }
}

function goto_song(song_id, pl) {
  if(pl === undefined) // Item Player
  {
    const player = document.getElementById('item-song-player');
    if  (!player) return;

    if  (!song_id) return;
    const song_file_name = item_song_file_names[song_id];
    if  (!song_file_name) return;

    const player_src_cur = player.currentSrc;
    const player_src_new = item_song_root + song_file_name;

    /*
    alert('[' + player_src_cur      + ']\n' +
          '[' + player_src_new      + ']\n' +
          '[' + player.paused       + ']\n' +
          '[' + player.networkState + ']\n' +
          '[' + player.readyState   + ']');
    */

    // 1.10 A quick introduction to HTML
    // HTML user agents (e.g., web browsers)
    //
    // 4.8.11.2 Location of the media resource
    // If a src attribute of a media element is set or changed,
    // the user agent must invoke the media element's media element load algorithm.

    if(player_src_cur !== player_src_new)  // start a new src
    {
       player.src       = player_src_new;  // invokes player.load()
       item_player_load_time = Date.now();
       item_song_to_start    = song_id;    // defer to next timer tick
    }
    else // src is already set
    {
      if(player.paused) {
        if((player.networkState === HTMLMediaElement.NETWORK_IDLE) ||  // 1
           (player.networkState === HTMLMediaElement.NETWORK_LOADING)) // 2
        {
          scroll_to_view(player);
          player.play();
          item_player_running = true;
        }
      } else { // played
        player.pause();
        item_player_running = false;
      }
    }
  }
  else // Collections Players
  {
    const coll_match = song_id.match(/^coll(.*?)-\d+$/); // song_id format: coll?-#
    if  (!coll_match) return;

    const coll_key   = coll_match[1];
    const coll_name  ="coll" + coll_key;
    const play_base  = coll_name + '-song-player-';

    if(pl === '?') { // find available: 'a' / 'b' / 'v'
      const pa = document.getElementById(play_base + 'a');
      const pb = document.getElementById(play_base + 'b');
      const pv = document.getElementById(play_base + 'v');

      if     (pa && (pa.networkState !== HTMLMediaElement.NETWORK_NO_SOURCE /* 3 */)) { pl = 'a'; }
      else if(pb && (pb.networkState !== HTMLMediaElement.NETWORK_NO_SOURCE /* 3 */)) { pl = 'b'; }
      else if(pv && (pv.networkState !== HTMLMediaElement.NETWORK_NO_SOURCE /* 3 */)) { pl = 'v'; }
    }

    const player = document.getElementById(play_base + pl);
    if  (!player) return;

    /*
    alert('[' + player.paused       + ']\n' +
          '[' + player.networkState + ']\n' +
          '[' + player.readyState   + ']');
    */

    const song_id_curr = get_song_id_curr(player, "coll", coll_key);

    if   (song_id_curr === song_id) // player is already on song_id
    {
      if  (player.paused) {
        if(player.duration || (player.networkState === HTMLMediaElement.NETWORK_IDLE)) { // 1
           scroll_to_view(player);
           player.play();
        }
      } else { // played
           player.pause();
      }
    }
    else // start another song_id
    {
      if(player.duration || (player.networkState === HTMLMediaElement.NETWORK_IDLE)) { // 1
         player.currentTime = coll_data[coll_key].song_begins[song_id];
         scroll_to_view(player);
         player.play();
      }
    }
  }
}

/* Input Handlers */

function kb_arrows(e) {
  const k = e.key;
  if(!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(k)) return;

  e.preventDefault();

  const focused = e.target;
  if  (!focused) return;

  const song = focused.closest('span.song-line[id]');
  if  (!song) return;

  const buttons = song.querySelectorAll('span[role="button"]');
  if  (!buttons.length) // song is button
  {
    if(k === "ArrowUp" || k === "ArrowDown")
    {
      const new_song = k === "ArrowUp"
                     ? song.previousElementSibling
                     : k === "ArrowDown"
                     ? song.nextElementSibling
                     : null;
      if(new_song) {
         new_song.focus();
      }
    }
    return;
  }

  // buttons inside song

  const cur_button = Array.from(buttons).indexOf(focused);
  if   (cur_button === -1) return;

  if(k === "ArrowLeft" || k === "ArrowRight")
  {
    const new_button = k === "ArrowLeft"
                     ? Math.max(0,                  cur_button - 1)
                     : k === "ArrowRight"
                     ? Math.min(buttons.length - 1, cur_button + 1)
                     : cur_button;

    if(new_button !== cur_button) {
       buttons[new_button].focus();
    }
    return;
  }

  if(k === "ArrowUp" || k === "ArrowDown")
  {
    const new_song = k === "ArrowUp"
                   ? song.previousElementSibling
                   : k === "ArrowDown"
                   ? song.nextElementSibling
                   : null;
    if(new_song)
    {
      const new_buttons = new_song.querySelectorAll('span[role="button"]');

      if(new_buttons.length && new_buttons[cur_button]) {
         new_buttons[cur_button].focus();
      }
    }
  }
}

function mou(e, pl) { const song = e.target.closest('span.song-line[id]');
                                          if(song)                       { goto_song(song.id, pl); } }
function kbu(e, pl) { const k    = e.key; if(k === 'Enter' || k === ' ') { mou      (e,       pl); } }
function kbd(e)     { const k    = e.key; if(k === 'Enter' || k === ' ') { e.preventDefault();     }
                                          else                           { kb_arrows(e);           } }

/* Initialization */

function load_song_list() {
  const song_list = document.getElementById("item-song-list");
  if  (!song_list) return;

  song_list.innerHTML = '<span class="text-comment">' + item_type_name + ' list loading...</span>';

  fetch(item_song_list_file)
    .then(response => {
      if (!response.ok) { throw new Error(item_type_name + " list not found"); }
      return response.text();
    })
    .then(text => {
      const song_list_lines     = text.trim().split('\n');
      const song_list_lines_cnt = song_list_lines.length;
      if  ((song_list_lines_cnt === 1) && (song_list_lines[0] === "")) {
        throw new Error(item_type_name + " list is empty");
      }

      const lps                 = 3; // lines per song
      const song_list_songs_cnt = Math.floor(song_list_lines_cnt / lps);
      if   (song_list_songs_cnt > 999) {
        throw new Error(item_type_name + " list is too long");
      }

      const song_id_len    = song_list_songs_cnt <=  9 ? 1
                           : song_list_songs_cnt <= 99 ? 2 : 3;
      const length_regex   = /^[0-9]{2,4}\.[0-9]{2}$/;
      let   total_seconds  = 0;
      let   song_list_html = "";
      song_list.innerHTML  = "";

      for(let line_num = 0; line_num < (song_list_songs_cnt * lps); line_num += lps) {
        const song_title       = song_list_lines[line_num    ].trim()
                                .replace(/  +/g, ' ').replace(/_/g, "").replace(/ ?< ?> ?/, "<>");
        const song_file_name   = song_list_lines[line_num + 1].trim()
                                .replace(/  +/g, ' ');
        const song_seconds_str = song_list_lines[line_num + 2].trim();
        const song_seconds     = parseFloat(song_seconds_str);
        const song_num         = String(Math.floor(line_num / lps) + 1).padStart(song_id_len, '0');
        const song_id          = "item-" + song_num;

        if(!song_title || !song_file_name) {
          break; // stop song list processing
        }

        if(!song_seconds_str) {
          throw new Error(item_type_name + ' ' + song_num + " &mdash; Length is not set");
        }
        if(!length_regex.test(song_seconds_str) || isNaN(song_seconds)) {
          throw new Error(item_type_name + ' ' + song_num + " &mdash; Length format is incorrect");
        }

        const h = Math.floor( total_seconds / 3600      );
        const m = Math.floor((total_seconds % 3600) / 60);
        const s = Math.round( total_seconds         % 60); // to the nearest whole second
        const song_hms = String(h).padStart(2, '0') + ':' +
                         String(m).padStart(2, '0') + ':' +
                         String(s).padStart(2, '0');

        const [title_left, title_right] = song_title.split("<>", 2);

        let song_line_html = '<span class="song-line ';
        song_line_html += title_right ? 'line-flex' : 'text-ellipsis';
        song_line_html += '" ' +
         'data-item ' +
         'id="' + song_id + '" ' +
         'role="button" style="cursor:pointer;" tabindex="0" ' +
         'onkeydown="kbd(event)" ' +
         'onkeyup  ="kbu(event)" ' +
         'onclick  ="mou(event)">';
        song_line_html += title_right ? '<span class="line-left text-ellipsis">' : "";
        song_line_html += song_hms + ' ' + song_num + ' ' + title_left;
        song_line_html += title_right ? '</span>' : "";
        song_line_html += title_right ? '<span class="line-right">' + title_right + '</span>' : "";
        song_line_html += '</span>';               // not needed \n at end for flex         in line-flex
        song_line_html += title_right ? "" : '\n'; //     needed \n at end for inline-block in song-line

        song_list_html += song_line_html;

        const song_file_name_conv = song_file_name.replace(/ /g, "%20");
        if(item_file_name_songs[song_file_name_conv]) { // already present
          throw new Error(item_type_name + ' ' + song_num + " &mdash; Duplicate file name");
        }
        item_song_file_names[song_id] = song_file_name_conv;
        item_file_name_songs[song_file_name_conv] = song_id;

        total_seconds += song_seconds;
      }
      song_list.innerHTML = song_list_html;

      if(song_list.children.length === 0) {
         song_list.innerHTML =
           '<span class="text-comment">No correct ' + item_type_name.toLowerCase() + ' entries found</span>';
      }
    })
    .catch(err => {
      song_list.innerHTML = '<span class="text-comment">Error: ' + err.message + '</span>';
    });
}

function set_song_list_lines(coll_key) {
  const coll_name = "coll" + coll_key;
  const song_list = document.getElementById(coll_name + "-song-list");
  if  (!song_list) return;

  const button_attr = coll_data[coll_key].buttons // if no buttons then song is button
                    ? ""
                    : ' role="button" style="cursor:pointer;" tabindex="0"' +
                      ' onkeydown="kbd(event)"' +
                      ' onkeyup  ="kbu(event, \'?\')"' +
                      ' onclick  ="mou(event, \'?\')"';

  const song_lines_cur = song_list.innerHTML.split('\n');
  const song_lines_new = song_lines_cur.map(song_line => {
    const song_id_match = song_line.match(/ (\d+)\./);
    if   (song_id_match) {
      const song_id = coll_name + "-" + song_id_match[1];
      return '<span class="song-line text-ellipsis"' +
                  ' data-' + coll_name +
                  ' id="'  + song_id   + '"' + button_attr + '>' + song_line + '</span>';
    }
    return song_line;
  });
  song_list.innerHTML = song_lines_new.join('\n');
}

function set_song_list_buttons(coll_key) {
  if(           coll_key !== ""  ) return; // not implemented for others
  if(!coll_data[coll_key].buttons) return;

  const coll_name    = "coll" + coll_key;
  let   were_buttons = false;

  document.querySelectorAll('span.song-line[data-' + coll_name + ']').forEach(song => {
  //const song_id   = song.id;
    const song_line = song.innerHTML;
    if(song_line.includes(" video audio audio ")) {
       were_buttons   = true;
       song.innerHTML = song_line.replace(" video audio audio ", // also remove spaces
'<span class="player-button" role="button" tabindex="0" ' +
  'onkeydown="kbd(event)" ' +
  'onkeyup  ="kbu(event, \'v\')" ' +
  'onclick  ="mou(event, \'v\')">' +
  'video</span>' +
'<span class="player-button" role="button" tabindex="0" ' +
  'onkeydown="kbd(event)" ' +
  'onkeyup  ="kbu(event, \'a\')" ' +
  'onclick  ="mou(event, \'a\')">' +
  'audio</span>' +
'<span class="player-button" role="button" tabindex="0" ' +
  'onkeydown="kbd(event)" ' +
  'onkeyup  ="kbu(event, \'b\')" ' +
  'onclick  ="mou(event, \'b\')">' +
  'audio</span>');
    }
  });
  coll_data[coll_key].buttons = were_buttons;
}

function set_song_begins(coll_key) {
  const coll_name = "coll" + coll_key;
  document.querySelectorAll('span.song-line[data-' + coll_name + ']').forEach(song => {
    const song_id   = song.id;
    const [h, m, s] = song.textContent.substring(0, 8).split(':').map(Number);
    coll_data[coll_key].song_begins    [song_id] = (h * 60 + m) * 60 + s;
    coll_data[coll_key].song_order.push(song_id);
  });
}

function init_coll(coll_key) {
  const coll_name = "coll" + coll_key;

  const coll_list = document.getElementById(coll_name + "-song-list");
  if  (!coll_list) return;

  coll_keys.push(coll_key);
  coll_data     [coll_key] = {
    present: false,
    buttons: false,

    player_songs: {},
    song_states : {},

    duration: null,
    du_magic: null,
    song_begins: {},
    song_order : []
  };

  const buttons  =            coll_list.hasAttribute("data-buttons");

  const duration = parseFloat(coll_list.getAttribute("data-duration"));
  const du_magic = parseFloat(coll_list.getAttribute("data-du-magic"));

  if(isNaN(duration) || (duration < 60 ) || (duration > (24 * 60 * 60))) return;
  if(isNaN(du_magic) || (du_magic < 0.5) || (du_magic > 1.5           )) return;

  coll_data[coll_key].buttons  = buttons;

  coll_data[coll_key].duration = duration;
  coll_data[coll_key].du_magic = du_magic;

  set_song_list_lines  (coll_key);
  set_song_list_buttons(coll_key);
  set_song_begins      (coll_key);

  coll_data[coll_key].present  = true;
}

function init() {
  document.querySelectorAll('pre[id]').forEach(coll_list => {
    const coll_match = coll_list.id.match(/^coll(.*?)-song-list$/);
    if   (coll_match) {
      init_coll(coll_match[1]);
    }
  });

  const item_list = document.getElementById("item-song-list");
  if   (item_list) {
    const type_name     = item_list.getAttribute("data-name");
    item_type_name      = type_name ? type_name : "Song";

    item_song_list_file = item_list.getAttribute("data-file");
    item_song_root      = item_list.getAttribute("data-root");

    load_song_list();

    item_present = true;
  }
}

/* Songs x Times */

function is_time_in_song(time, song_id, coll_key) {
  const song_time = coll_data[coll_key].song_begins[song_id];
  if   (song_time === undefined) return false;

  const song_id_next   = get_song_id_next(song_id, "coll", coll_key);
  let   song_time_next = coll_data[coll_key].song_begins[song_id_next];
  if   (song_time_next === undefined) { song_time_next = Infinity; }

  const  time_in_song = ((time >= song_time) && (time < song_time_next));
  return time_in_song;
}

function is_time_in_song_test() {
  const coll_key  = ""; // "", '2', '3'
  const songs     = coll_data[coll_key].song_order.length;
  const magic     = 0.945; // cs:1.001 cs2:1.010 cs3:1.009 rr:1.004 ly:0.945
  const divisor   = coll_data[coll_key].duration * magic;
  const test_beg  = 0;
  const test_end  = coll_data[coll_key].duration + 60;
  const test_tick = 0.001;
  let   tests     = 0;
  let   ok_0      = 0;
  let   ok_1m     = 0;
  let   ok_1p     = 0;
  let   ok_2m     = 0;
  let   ok_2p     = 0;
  let   ok_3m     = 0;
  let   ok_3p     = 0;
  let   no        = 0;

  for(let t = test_beg; t < test_end; t += test_tick) {
    let song_num = Math.floor((t * songs) / divisor);
    if (song_num > (songs - 1)) {
        song_num = (songs - 1); } // if beyond

    if     (is_time_in_song(t, coll_data[coll_key].song_order[song_num    ], coll_key)) { ok_0++;  }
    else if(is_time_in_song(t, coll_data[coll_key].song_order[song_num - 1], coll_key)) { ok_1m++; }
    else if(is_time_in_song(t, coll_data[coll_key].song_order[song_num + 1], coll_key)) { ok_1p++; }
    else if(is_time_in_song(t, coll_data[coll_key].song_order[song_num - 2], coll_key)) { ok_2m++; }
    else if(is_time_in_song(t, coll_data[coll_key].song_order[song_num + 2], coll_key)) { ok_2p++; }
    else if(is_time_in_song(t, coll_data[coll_key].song_order[song_num - 3], coll_key)) { ok_3m++; }
    else if(is_time_in_song(t, coll_data[coll_key].song_order[song_num + 3], coll_key)) { ok_3p++; }
    else { no++; }

    tests++;
  }
  alert(tests + ' tests: ' +
    ok_3m + ' <3< ' + ok_2m + ' <2< ' + ok_1m + ' <1< ' +
    ok_0  + ' >1> ' + ok_1p + ' >2> ' + ok_2p + ' >3> ' + ok_3p + ' and ' + no + ' no');
}

function get_song_id_next(song_id, player_type, coll_key) {
  if(!song_id) return null;

  if(player_type === "coll") {
    const song_id_num = coll_data[coll_key].song_order.indexOf(song_id);
    if   (song_id_num === -1) return null;

    const song_id_num_next = song_id_num + 1;
    if   (song_id_num_next < coll_data[coll_key].song_order.length) {
      return                 coll_data[coll_key].song_order[song_id_num_next];
    }
    return null;
  }
  if(player_type === "item") {
    const song_id_num      = song_id.substring(   5); // song_id format: item-#
    const song_id_num_next = String(parseInt(song_id_num) + 1).padStart(song_id_num.length, '0');
    const song_id_next     = song_id.substring(0, 5) + song_id_num_next;
    if   (item_song_file_names[song_id_next]) {
      return song_id_next;
    }
    return null;
  }
  return null;
}

function get_song_id_curr(player, player_type, coll_key) {
  if(!player) return null;

  if(player_type === "coll") {
    const player_time = player.currentTime;
    const songs    = coll_data[coll_key].song_order.length;
    const divisor  = coll_data[coll_key].duration * coll_data[coll_key].du_magic; // for magic see above
    let   song_num = Math.floor((player_time * songs) / divisor);
    if   (song_num > (songs - 1)) {
          song_num = (songs - 1); } // if beyond

    if(is_time_in_song(player_time, coll_data[coll_key].song_order[song_num], coll_key)) {
      return                        coll_data[coll_key].song_order[song_num];
    }

    // off == 1..2 is usually enough, see above

    for(let off = 1; ((song_num - off) >= 0) || ((song_num + off) <= (songs - 1)); off++) {
      const lower  = song_num - off;
      if   (lower >= 0) {
        if (is_time_in_song(player_time, coll_data[coll_key].song_order[lower], coll_key)) {
          return                         coll_data[coll_key].song_order[lower];
        }
      }

      const upper  = song_num + off;
      if   (upper <= (songs - 1)) {
        if (is_time_in_song(player_time, coll_data[coll_key].song_order[upper], coll_key)) {
          return                         coll_data[coll_key].song_order[upper];
        }
      }
    }
    return null;
  }
  if(player_type === "item") {
    const  player_src     = player.currentSrc;
    const  song_file_name = player_src.substring(item_song_root.length);
    if   (!song_file_name) return null;

    const  song_id = item_file_name_songs[song_file_name];
    return song_id;
  }
  return null;
}

/* State Marking Logic */

function cap_first(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function low_first(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function set_player_state(pl, song_id, state) {
  const           coll_key = ""; // not implemented for others
  if  (!coll_data[coll_key].buttons) return;

  const song = document.getElementById(song_id);
  if  (!song) return;

  const buttons = song.querySelectorAll('span[role="button"]');
  if  (!buttons.length) return;

  const button_index = { 'v': 0, 'a': 1, 'b': 2 }[pl]; // map 'v'/'a'/'b' to 0/1/2
  if   (button_index === undefined) return;

  const button = buttons[button_index];
  if  (!button) return;

  const text_cur = button.textContent;
  const text_new = state === "cap"
                 ? cap_first(text_cur)
                 : state === "low"
                 ? low_first(text_cur)
                 :           text_cur;

  if(text_cur !== text_new) {
    button.textContent = text_new;
  }
}

function set_song_state(song_id, state) {
  const song = document.getElementById(song_id);
  if  (!song) return;
  if       (state ===     "played") {
    song.classList.add   ("played");
    song.classList.remove("paused");
  } else if(state ===     "paused") {
    song.classList.add   ("paused");
    song.classList.remove("played");
  }
}

function clr_song_state(song_id, state) {
  const song = document.getElementById(song_id);
  if  (!song) return;
  if       (state ===     "played") {
    song.classList.remove("played");
  } else if(state ===     "paused") {
    song.classList.remove("paused");
  }
}

/* State Transition Logic */

function traverse_player_states(player_songs, player_songs_curr) {
  for(const pl in player_songs) // traverse stored player song_ids
  {
    if(!player_songs_curr[pl]) // stored player is not currently available
    {
      set_player_state(pl, player_songs[pl], "low"); // clear its state

      delete player_songs[pl]; // delete not available player
    }
    else // stored player is set on some current song_id
    {
      if(player_songs    [pl] !== player_songs_curr[pl]) // player's current song_id changed
      {
         set_player_state(pl,     player_songs     [pl], "low"); // clear old
         set_player_state(pl,     player_songs_curr[pl], "cap"); // mark  new

         player_songs    [pl]   = player_songs_curr[pl]; // store changed song_id
      }
      else // the same song_id, already marked, do nothing
      {
      }
      delete player_songs_curr[pl]; // delete processed current song_id
    }
  }

  for(const pl in player_songs_curr) // traverse remaining (new) current players
  {
    player_songs    [pl] = player_songs_curr[pl]; // store player's new song_id
    set_player_state(pl,   player_songs_curr[pl], "cap"); // mark it

    delete player_songs_curr[pl]; // deletion not needed, just for clarity
  }
}

function traverse_song_states(song_states, song_states_curr) {
  for(const song_id in song_states) // traverse stored song states
  {
    if(!song_states_curr[song_id]) // stored song_id not in any current player
    {
      clr_song_state(song_id, song_states[song_id]); // clear it

      delete song_states[song_id]; // delete not needed stored state
    }
    else // stored song_id present in some current player
    {
      if(song_states   [song_id] !== song_states_curr[song_id])  // current state changed
      {
         set_song_state(song_id,     song_states_curr[song_id]); // mark it
         song_states   [song_id]   = song_states_curr[song_id];  // store new state
      }
      else // the same state, already marked, do nothing
      {
      }
      delete song_states_curr[song_id]; // delete processed current state
    }
  }

  for(const song_id in song_states_curr) // traverse remaining (new) current states
  {
    song_states   [song_id] = song_states_curr[song_id];  // store new state
    set_song_state(song_id,   song_states_curr[song_id]); // mark it

    delete song_states_curr[song_id]; // deletion not needed, just for clarity
  }
}

/* Collections */

function update_player_song_states(coll_key) {
  const coll_name ="coll" + coll_key;
  const play_base = coll_name + '-song-player-';
  const players   = ['v', 'a', 'b'].map(pl => document.getElementById(play_base + pl));
  const coll_player_songs_curr = {};
  const coll_song_states_curr  = {};

  players.forEach(player => {
    if(!player) return;

    const song_id = get_song_id_curr(player, "coll", coll_key);
    if  (!song_id) return;

    coll_player_songs_curr[player.id.slice(-1)] = song_id; // ['v' / 'a' / 'b']

    const state = player.paused ? "paused" : "played";

    if(!coll_song_states_curr[song_id] || state === "played") {
        coll_song_states_curr[song_id]  = state;
    }
  });
  traverse_player_states(coll_data[coll_key].player_songs, coll_player_songs_curr);
  traverse_song_states  (coll_data[coll_key].song_states,  coll_song_states_curr );
}

/* Item */

function update_song_states() {
  const player = document.getElementById('item-song-player');
  const item_song_states_curr = {};

  if(player) {
    const song_id = get_song_id_curr(player, "item");
    if   (song_id) {
      item_song_states_curr[song_id] = player.paused ? "paused" : "played";
    }
  }
  traverse_song_states(item_song_states, item_song_states_curr);
}

function update_song_cover() {
  const cover = document.getElementById('item-song-cover');
  if  (!cover) return;

  const player = document.getElementById('item-song-player');
  if  (!player) return;

  const song_id = get_song_id_curr(player, "item");
  if  (!song_id) return;

  const song_id_num = song_id.substring(5); // song_id format: item-#

  const cover_tmplt = cover.getAttribute("data-cover");
  const cover_regex = /#/;
  if  (!cover_regex.test(cover_tmplt)) return;

  const cover_url_base = cover_tmplt.replace(cover_regex, song_id_num);
  const cover_url_avif = cover_url_base + ".avif";
  const cover_url_jpg  = cover_url_base + ".jpg";

  const cover_a = cover.querySelector('a');
  if   (cover_a && (cover_a.href !== cover_url_jpg)) {
                    cover_a.href   = cover_url_jpg;
  }

  const cover_source = cover.querySelector('source[type="image/avif"]');
  if   (cover_source && (cover_source.srcset !== cover_url_avif)) {
                         cover_source.srcset   = cover_url_avif;
  }

  const cover_img = cover.querySelector('img');
  if   (cover_img && (cover_img.src !== cover_url_jpg)) {
                      cover_img.src   = cover_url_jpg;
  }
}

function player_transitions() {
  if(item_song_to_start) {
     const song_id = item_song_to_start;
     item_song_to_start = null;
     goto_song(song_id);
     return;
  }

  const player = document.getElementById('item-song-player');
  if  (!player) return;
                            // HTMLMediaElement.NETWORK_NO_SOURCE /* 3 */
  if (player.paused) {      // HTMLMediaElement.NETWORK_LOADING   /* 2 */
    if(player.networkState === HTMLMediaElement.NETWORK_IDLE) {   /* 1 */
       item_player_running   = false;
    }
  } else { // played
    item_player_running = true;
  }

  const song_id = get_song_id_curr(player, "item");
  if  (!song_id) return;
  if  ( item_song_states[song_id] !== "paused") return;

  if( player.ended ||
     (player.paused
      && (player.networkState === HTMLMediaElement.NETWORK_NO_SOURCE)
      && item_player_running)) {
    const       song_id_next = get_song_id_next(song_id, "item");
    if         (song_id_next) {
      goto_song(song_id_next);
    }
  }
}

/* Timer */

function timer_logic_coll(coll_key) {
  if(coll_data[coll_key].present) {
    update_player_song_states(coll_key);
  }
}

function timer_logic_sing() {
  const player = document.getElementById('sing-song-player');
  if  (!player) return;
  if  (!player.ended) return;

  player.load(); // to show the poster image of the video element
}

function timer_logic() {
  for(let k = 0; k < coll_keys.length; k++) { // Collections
    timer_logic_coll(coll_keys[k]);
  }

  if(item_present) { // Item
    player_transitions();
    update_song_states();
    update_song_cover();
  }

  timer_logic_sing(); // Single
}

function timer_tick() {
  if((Date.now() - item_player_load_time) > timer_tick_interval) {
    timer_logic();
  }
  timer_defer();
}

function timer_defer() {
  setTimeout(timer_tick, timer_tick_interval);
}

/* Testing */

function test() {
  /*
  is_time_in_song_test();
  */
}

// EOF






