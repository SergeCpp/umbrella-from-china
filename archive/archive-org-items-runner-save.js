/* Startup Sequence */

init_tabs    ();
init_controls();
init_render  ();
init_dates   ()
  .then(() => setTimeout(load_stats, 0));

// EOF
