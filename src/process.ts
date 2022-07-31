import {DBObj, DBObjAPI, make_logger, RPCClient, Status} from "josh_util";
import {FormData,File } from "formdata-node"
import {fileFromPath} from "formdata-node/file-from-path";

import {Readability} from "@mozilla/readability"
import {JSDOM} from "jsdom"
import puppeteer from "puppeteer"
import {SimpleServerSettings} from "./simple_server.js";
import {Attachment} from "./db.js";
import {mkdir} from "josh_node_util";

const SCREENSHOT_DIR = "images"
const TEST_URLS = [
    "https://google.com/",
    "https://joshondesign.com/",
    "https://twitter.com/joshmarinacci/status/1541076881293750273",
    "https://www.economist.com/business/2022/07/07/private-equity-may-be-heading-for-a-fall",
    "https://github.com/pocketbase/pocketbase",
    "https://arstechnica.com/gadgets/2022/07/first-risc-v-laptop-expected-to-ship-in-september/",
]

const log = make_logger()
function test() {
    Promise.all(TEST_URLS.map(url => {
        return JSDOM.fromURL(url).then(dom => {
            // console.log("dom is", dom.window.document)
            let reader = new Readability(dom.window.document)
            let article = reader.parse()
            console.log("url", url)
            // console.log("article",article)
            console.log("title", article.title)
            console.log("byline", article.byline)
            console.log("excerpt", article.excerpt)
            console.log("site name", article.siteName)
            console.log("content", article.content.substring(0, 1000))
        }).catch(e => console.error(e))
    })).then(() => {
        console.log("fully done")
    })
}

async function generate_screenshot(url) {
    log.info("scanning",url)
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
        width: 800,
        height: 600,
        deviceScaleFactor:2,
    })
    let pat = /\ |\:|\/|\./ig;
    let file_name = url.replace(pat,"_")
    const pdf:Attachment = {
        type: "attachment",
        form: "local_file_path",
        mime_type: "image/pdf",
        data: {
            filepath: `images/page_${file_name}.pdf.pdf`,
        }
    }
    await page.goto(url);
    await page.pdf({ path: pdf.data.filepath, format: 'letter' });
    const thumb:Attachment = {
        type: "attachment",
        form: "local_file_path",
        mime_type: "image/png",
        data: {
            filepath: `images/page_${file_name}.thumb.png`
        }
    }

    await page.screenshot({path: thumb.data.filepath })
    // await page.screenshot({path: `images/page_${u}.png`, fullPage:true});
    await browser.close();
    log.info("scanned",url)
    return {
        pdf:pdf,
        thumb:thumb,
    }
}
async function test_screenshots() {
    log.info("testing urls")
    for(let url of TEST_URLS) {
        try {
            await generate_screenshot(url)
        } catch (e) {
            log.error("failed",url,e)
        }
    }
}

async function get_next(settings: SimpleServerSettings, api: DBObjAPI):Promise<DBObj[]> {
    let ret = await api.search({data: {status: 'unprocessed'}})
    return ret.data
}
async function process(item:DBObj):Promise<[object,Map<string,File>]> {
    try {
        log.info("processing", item)
        let dom = await JSDOM.fromURL(item.data.url)
        let reader = new Readability(dom.window.document)
        let article = reader.parse()
        let scan = await generate_screenshot(item.data.url)
        let atts = new Map<string,File>()
        atts.set('pdf', await fileFromPath(scan.pdf.data.filepath,{type:scan.pdf.mime_type}))
        atts.set('thumb',await fileFromPath(scan.thumb.data.filepath,{type:scan.thumb.mime_type}))
        // new_atts.set('thumb',await fileFromPath(attachment_filepath2, {type:'image/jpeg'}))

        return [{
            original: item.id,
            success: true,
            data: {
                status:'processed',
                url: item.data.url,
                title: article.title,
                byline: article.byline,
                excerpt: article.excerpt,
                siteName: article.siteName,
            }
        },atts]
    } catch (e) {
        log.error(e)
        return [{
            original:item.id,
            url:item.data.url,
            success:false,
            message:e?e.toString():'unknown error',
        }, new Map<string,File>]
    }
}

export async function run_processor(settings: SimpleServerSettings, api: DBObjAPI) {
    await mkdir(SCREENSHOT_DIR)

    let ret = await api.search({data: {status: 'unprocessed'}})
    log.info('next docs',ret.data)
    if(ret.data.length > 0) {
        let old = ret.data[0]
        let [new_one,atts] = await process(old)
        // @ts-ignore
        await api.replace_with_attachments(old,new_one,atts)
    } else {
        log.info("nothing to process")
    }
}


