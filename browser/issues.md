1. Something weird with promises means that errors in `itsame`
   function don't have stack traces in logs. This happened
   when I switched to `privateFromStorage` API (necessary
   since storage is callback-based) and I can't seem to fix it.

