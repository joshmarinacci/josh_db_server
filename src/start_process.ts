import {start_processor} from "./process.js";

Promise.resolve()
    .then(start_processor)
    // .then(test_screenshots)
    .then(()=>console.info("all done"))
    .catch((e)=>console.error(e))
