import {start_processor} from "./process.js";
import {sleep} from "./util.js";

const go = true

async function start() {
    while(go) {
        console.log("scanning")
        await start_processor()
        console.log("sleeping for 10 seconds")
        await sleep(10)
    }
}
Promise.resolve()
    .then(start)
    // .then(test_screenshots)
    .then(()=>console.info("all done"))
    .catch((e)=>console.error(e))
