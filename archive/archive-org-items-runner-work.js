/* Startup Sequence */

init_tabs    ();
init_controls();
init_render  ();
init_dates   ()
  .then(load_stats);

// EOF
