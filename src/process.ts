/*
[x] get the title of the page
[ ] get the thumbnail image, if any
[ ] get the last updated date
[ ] find RSS feed
[x] generate a screenshot using a phantom browser
[x] at first, just fetch all to be processed
[x] then submit finished one as status:processed and superceeds:prev_id
[ ] then fetch all where superseded ones are stripped out for bookmarks list, only show processed ones
[ ] fetch all where not superseded ones are the only ones included. so we only get ones that need to be processed
[ ] maintain some sort of in-memory index that is generated at start before going live?

get some test URLS

google
https://google.com/

my blog
https://joshondesign.com/

a pollen count tweet
https://twitter.com/joshmarinacci/status/1541076881293750273

an economist article:
https://www.economist.com/business/2022/07/07/private-equity-may-be-heading-for-a-fall

a github project for an open source realtime backend
https://github.com/pocketbase/pocketbase

an ars technical article
https://arstechnica.com/gadgets/2022/07/first-risc-v-laptop-expected-to-ship-in-september/

*/
import {Readability} from "@mozilla/readability"
import {JSDOM} from "jsdom"
import fetch from "node-fetch"
import puppeteer from "puppeteer"
import {file_readable, Logger, make_logger, mkdir, read_json_file} from "./util.js";
import {ServerSettings} from "./server";

const SCREENSHOT_DIR = "images"
const TEST_URLS = [
    "https://google.com/",
    "https://joshondesign.com/",
    "https://twitter.com/joshmarinacci/status/1541076881293750273",
    "https://www.economist.com/business/2022/07/07/private-equity-may-be-heading-for-a-fall",
    "https://github.com/pocketbase/pocketbase",
    "https://arstechnica.com/gadgets/2022/07/first-risc-v-laptop-expected-to-ship-in-september/",
]

const log:Logger = make_logger()
type Settings = {
    authcode:string,
}
let settings:Settings|null = null

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
    await page.goto(url);
    await page.pdf({ path: `images/page_${file_name}.pdf.pdf`, format: 'letter' });
    await page.screenshot({path: `images/page_${file_name}.thumb.png`})
    // await page.screenshot({path: `images/page_${u}.png`, fullPage:true});
    await browser.close();
    log.info("scanned",url)
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

function get_next() {
    return fetch('http://localhost:3000/bookmarks/queue').then(d => d.json()).then((d:any) => {
        console.log("got the doc back",d)
        if(d && d.data && d.data.length > 0) {
            console.log(d.data.map(i => i.data.url))
            console.log("first element",d.data[0])
            return d.data[0]
        }
    })
}
function process(item) {
    console.log("processing",item)
    return JSDOM.fromURL(item.data.url).then(dom => {
        // console.log("dom is", dom.window.document)
        let reader = new Readability(dom.window.document)
        let article = reader.parse()
        console.log("url", item.data.url)
        // console.log("article",article)
        console.log("title", article.title)
        console.log("byline", article.byline)
        console.log("excerpt", article.excerpt)
        console.log("site name", article.siteName)
        console.log("content", article.content.substring(0, 1000))
        return {
            original:item.id,
            url:item.data.url,
            title:article.title,
            byline:article.byline,
            excerpt:article.excerpt,
            siteName:article.siteName,
            success:true,
        }
    }).catch(e => {
        console.error(e)
        return {
            original:item.id,
            url:item.data.url,
            success:false,
            message:e?e.toString():'unknown error',
        }
    })
}

type ProcessorSettings = {
    authcode:string
}
function submit(it, settings:ProcessorSettings) {
    it.authcode = settings.authcode
    console.log("sending back item",it)
    return fetch('http://localhost:3000/submit/processed-bookmark',{
        method:'POST',
        headers: {
            'Content-Type':'application/json',
        },
        body:JSON.stringify(it)
    }).then(r => r.json())
}

export async function start_processor() {
    const SETTINGS = "./settings.json"
    if (! await file_readable(SETTINGS)) {
        return console.error(`file "${SETTINGS} not found!"`)
    }
    const settings = await read_json_file(SETTINGS) as ServerSettings
    console.info("settings are",settings)
    await mkdir(SCREENSHOT_DIR)

    let item = await get_next()
    log.info('next doc',item)
    if(item) {
        let data = await process(item)
        log.info("data is", data)
        await submit(data,settings)
    } else {
        log.info("nothing to process")
    }
    log.info("done")
}


