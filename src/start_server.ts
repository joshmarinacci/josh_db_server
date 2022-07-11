import {load_db} from "./db.js";
import {ServerSettings, start_server} from "./server.js";
import {file_readable, read_json_file} from "./util.js";

const DB_ROOT = "./DB";
const PORT = 3000

async function start() {
    const SETTINGS = "./settings.json"
    if (! await file_readable(SETTINGS)) {
        return console.error(`file "${SETTINGS} not found!"`)
    }
    const settings = await read_json_file(SETTINGS) as ServerSettings
    console.info("settings are",settings)

    let db = await load_db(DB_ROOT,PORT,true)
    console.log("loaded the DB", db)
    // const settings = JSON.parse(fs.readFileSync("./settings.json").toString())
    return start_server(db,PORT,settings)
}
Promise.resolve()
    .then(start)
    .then(()=>console.log("started server"))
    .catch(e => console.error(e))
