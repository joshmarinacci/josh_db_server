import {DiskDB} from "./disk_db.js";
import {SimpleDBServer, SimpleServerSettings} from "./simple_server.js";
import {file_readable, read_json_file} from "josh_node_util";


async function start() {
    const SETTINGS = "./settings.json"
    if (! await file_readable(SETTINGS)) return console.error(`file "${SETTINGS} not found!"`)
    const settings = await read_json_file(SETTINGS) as SimpleServerSettings
    console.info("settings are",settings)
    let db = new DiskDB(settings.rootdir,false)
    let db_api = await db.connect()
    let server = new SimpleDBServer(db_api, settings)
    await server.start()
    console.log("loaded the DB", db)
}
Promise.resolve()
    .then(start)
    .then(()=>console.log("started server"))
    .catch(e => console.error(e))
