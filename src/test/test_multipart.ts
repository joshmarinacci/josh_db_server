/*
Post JSON with encoded attachments and mime types. DB will convert them to attachment refs on disk with the right file extension as well as serving them up as urls embedded in the object
 */

//post json blob + n files from disk. can we just use filepaths instead for now?
import {ServerSettings, start_server} from "../server.js";
import {Attachment, AttachmentForm, load_db, Uuid, ValueType, MimeType} from "../db.js";
import fetch, {Response} from "node-fetch"
import fs from "fs";
import pipe_to from "promisified-pipe"
import {json_get, json_post, make_logger, mkdir, rmdir, sleep} from "josh_util";

class LocalFilePathAttachment implements Attachment {
    type: ValueType;
    form: AttachmentForm
    mime_type: MimeType
    data: any
    constructor(path:string, mime_type:MimeType) {
        this.type = "attachment"
        this.form = "local_file_path"
        this.mime_type = mime_type
        this.data = {
            filepath:path,
        }
    }
}

type GenericObject = {
    id:Uuid,
    created:Date,
    type:string,
    tags:string[]
    supersedes:Uuid,
    data:any,
}

/*
let obj:GenericObject = {
    id: "id1",
    created_date: new Date(),
    type: "bookmark",
    supersedes: "id2",
    tags: [],
    data: {
        favicon: {
            type:"attachment",
            form:"local_file_path",
            mime_type:"image/png"
        },
        pdf: {
            type:"attachment",
            form:"local_file_path"
        },
        thumbnail: {
            type:"attachment",
            form:"local_file_path"
        },
    },
}

obj.data.favicon = new LocalFilePathAttachment("../images/foo/favicon.png", "image/png" as unknown as MimeType)
obj.data.pdf = new LocalFilePathAttachment("../images/foo/document.pdf","image/pdf" as unknown as MimeType)
obj.data.thumbnail = new LocalFilePathAttachment("../images/foo/thumbnail.png","image/png" as unknown as MimeType)

*/

const log = make_logger()

async function do_test() {
    // start a test server with a test database
    const DB_ROOT = "test_db";

    await mkdir("test_db")
    let settings:ServerSettings = {
        authcode: "testauth",
        port: 3005,
    }
    log.info("testing the server")
    let db = await load_db(DB_ROOT,settings.port,true)
    let server = await start_server(db, settings.port, settings) //start the webserver

    try {
        const BASE = `http://localhost:${settings.port}/`
        // confirm it is empty
        {
            let queue = await json_get(`${BASE}bookmarks/queue`)
            log.info(queue)
            log.assert(queue.status === 'success', 'got process okay')
            log.assert(queue.data.length === 0, 'queue is empty')
        }
        // submit a url
        {
            let res = await json_post(`${BASE}submit/bookmark`, {
                authcode: settings.authcode,
                url: "https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html"
            })
            log.info("submit result", res)
            log.assert(res.status === 'success', 'bookmark submission')
            await sleep(1)
        }
        // confirm it has one in the queue
        {
            let queue = await json_get(`${BASE}bookmarks/queue`)
            log.info(queue)
            log.assert(queue.status === 'success', 'got process okay')
            await sleep(1)
            log.assert(queue.data.length === 1, 'queue has one')
        }
        // process a single url
        {
            log.info("==========")
            // await run_processor(settings)
            // confirm the queue is empty
            let queue = await json_get(`${BASE}bookmarks/queue`)
            log.info("queue",queue)
            log.assert(queue.status === 'success', 'got process okay')
            log.assert(queue.data.length === 0, 'queue is empty')
            // confirm the processed has one
            await sleep(0.5)
            let processed = await json_get(`${BASE}bookmarks/processed`)
            log.info("processed",processed)
            log.assert(processed.status === 'success', 'got process okay')
            log.assert(processed.data.length === 1, 'processed has one')

            // confirm the document matches what we expect
            let item = processed.data[0]
            log.info("Item is",item)
            log.assert(item.data.pdf !== null, "has the pdf")
            log.assert(item.data.pdf.type === 'attachment', "has the pdf")

            // fetch the attachment
            let url = `${BASE}bookmark/${item.id}/attachment/pdf`
            let response:Response = await fetch(url,{ method:'GET' })
            log.info("TEST", "the response is done")
            log.assert(response.status === 200,'got a valid file back')
            // log.info("response is",response)
            log.info("body used?",response.bodyUsed)
            log.info("headers",response.headers)
            await pipe_to(response.body, fs.createWriteStream('temp.pdf'))
            log.info("piped to disk")
        }

    } catch (e) {
        log.error(e)
    }
    server.close(async ()=>{
        console.log("shut down the server")
        await rmdir(DB_ROOT)
        process.exit()
    })

}

Promise.resolve()
    .then(do_test)
    .then(() => console.log("done testing attachments"))
    .catch(e => console.error(e))


