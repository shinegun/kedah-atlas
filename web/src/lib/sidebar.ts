/** localStorage key for the collapsed desktop sidebar ("1" = icon rail). */
export const RAIL_KEY = "atlas-sidebar-rail";

/** Runs in <head> before first paint so a collapsed sidebar doesn't flash open. */
export const RAIL_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(RAIL_KEY)})==="1")document.documentElement.dataset.sidebar="rail"}catch(e){}`;
