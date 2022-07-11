import {load_db} from "./db.js";
import {json_get, json_post, Logger, make_logger, mkdir} from "./util.js";
import {ServerSettings, start_server} from "./server.js";
import fs from "fs";

const log:Logger = make_logger()

const DB_ROOT = "test_db";
const PORT = 3005
async function setup_tests() {
    await mkdir("test_db")
}
async function test_db() {
    let db = await load_db(DB_ROOT,PORT,false)
    console.assert(db.all().length === 0)

    //    create unprocessed url item. persist to disk
    await db.save_unprocessed("http://www.google.com/")

    //     search for unprocessed url item, confirm it's there.
    console.assert(db.search_unprocessed().length === 1)

    let orig = db.search_unprocessed()[0]

    // confirm there's nothing processed yet
    console.assert(db.search_processed().length === 0)
    //     create processed url item, persist to disk
    await db.save_processed({
        original:orig.id,
        // @ts-ignore
        url:orig.url,
        title:'test title'
    })

    //     search for processed url item, confirm it's there.
    console.assert(db.search_processed().length === 1,'one processed')
    //     search for unprocessed url, confirm it's superseded by the processed one
    let items = db.search_unprocessed()
    console.log("unprocessed items",items)
    console.assert(db.search_unprocessed().length === 0, 'no unprocessed')

    console.log("done with the test")
}

async function rmdir(dir: string) {
    await fs.promises.rmdir(dir, {recursive:true})
}

async function test_server() {
    let settings:ServerSettings = {
        authcode: "testauth"
    }
    log.info("testing the server")
    let db = await load_db(DB_ROOT,PORT,true)
    let server = await start_server(db, PORT, settings) //start the webserver

    try {
        const BASE = `http://localhost:${PORT}/`
        {
            let empty_list = await json_get(`${BASE}bookmarks/processed`)
            log.info(empty_list)
            log.assert(empty_list.status === 'success', 'got process okay')
            log.assert(empty_list.data.length === 0, 'empty list is empty')
        }

        {
            let empty_list = await json_get(`${BASE}bookmarks/queue`)
            log.info(empty_list)
            log.assert(empty_list.status === 'success', 'got process okay')
            log.assert(empty_list.data.length === 0, 'empty list is empty')
        }

        {
            let res = await json_post(`${BASE}submit/bookmark`,{
                authcode:settings.authcode,
                url:"https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html"
            })
            log.info("submit result",res)
            log.assert(res.status === 'success','bookmark submission')

            let queue = await json_get(`${BASE}bookmarks/queue`)
            log.info("now the queue is",queue)
            log.assert(queue.status === 'success', 'got process okay')
            log.assert(queue.data.length === 1, 'queue has one item')
        }
    } catch (e) {
        log.error("testing failed",e)
    }

    server.close(async ()=>{
        console.log("shut down the server")
        await rmdir(DB_ROOT)
        process.exit()
    })
}

Promise.resolve()
    .then(setup_tests)
    // .then(test_db)
    .then(() => console.log("done testing db"))
    .then(test_server)
    .then(() => console.log("done testing webserver"))
    .catch(e => console.error(e))
