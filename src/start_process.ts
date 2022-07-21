import {run_processor} from "./process.js";
import {SimpleServerSettings} from "./simple_server.js";
import {DBObjAPI, file_readable, read_json_file, RPCClient, sleep} from "josh_util";

const go = true

async function start() {
    while(go) {
        console.log("scanning")
        const SETTINGS = "./settings.json"
        if (! await file_readable(SETTINGS)) return console.error(`file "${SETTINGS} not found!"`)
        const settings = await read_json_file(SETTINGS) as SimpleServerSettings
        let rpc = new RPCClient()
        let api: DBObjAPI = await rpc.connect(
            `http://localhost:${settings.port}${settings.apipath}`,
            {type:'userpass',username:"josh",password:'pass'}
        )
        await run_processor(settings, api)
        console.log("sleeping for 10 seconds")
        await sleep(10)
    }
}
Promise.resolve()
    .then(start)
    // .then(test_screenshots)
    .then(()=>console.info("all done"))
    .catch((e)=>console.error(e))
