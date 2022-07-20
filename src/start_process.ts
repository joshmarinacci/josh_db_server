import {run_processor} from "./process.js";
import {file_readable, read_json_file, sleep} from "./util.js";
import {SimpleServerSettings} from "./simple_server.js";

const go = true

async function start() {
    while(go) {
        console.log("scanning")
        const SETTINGS = "./settings.json"
        if (! await file_readable(SETTINGS)) {
            return console.error(`file "${SETTINGS} not found!"`)
        }
        const settings = await read_json_file(SETTINGS) as SimpleServerSettings
        // await run_processor(settings, api)
        console.log("sleeping for 10 seconds")
        await sleep(10)
    }
}
Promise.resolve()
    .then(start)
    // .then(test_screenshots)
    .then(()=>console.info("all done"))
    .catch((e)=>console.error(e))
