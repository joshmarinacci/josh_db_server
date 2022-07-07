/*

First version of url capture db. Blog with before and after notes. Also .md in the repo. Use my existing blog to post it.

- [ ] Service writes each message to disk in a fixed naming dir structure
[x] Submit a URL to be analyzed
[x] Passcode for temporary auth
- [ ] Bookmarklet.
[x] If get instead of post render a form
[x] Source
[x] Creation time
- [x] Type
- [ ] Process request
- [ ] Array of namespaced tags
- [x] Page to show the latest 10 bookmarks
- [ ] All code should be as simple and clear as possible.
- [ ] Code for only 60 minutes
 */

import express from "express"
import * as fs from "fs";
import path from "path";
import {gen_id, getFiles} from "./util.js";
import {DB, load_db} from "./db.js";

const DB_ROOT = "./DB";
const PORT = 3000

const settings = JSON.parse(fs.readFileSync("./settings.json").toString())
console.info("settings are",settings)
async function start_server(db: DB) {
    const app = express()
    app.use(express.json())
    app.get('/submit/bookmark', (req, res) => {
        res.sendFile("form.html", {root: 'resources'})
    })

    function fail(res, msg) {
        res.json({status: 'error', message: msg})
    }

    async function save_url(url) {
        db.save_unprocessed(url)
        return "all good"
    }

    async function save_processed_url(obj) {
        db.save_processed(obj)
        return "all good"
    }

    async function search_queued() {
        return db.search_unprocessed()
    }

    async function search_processed() {
        return db.search_processed()
    }

    app.post('/submit/bookmark', (req, res) => {
        if (req.body.authcode !== settings.authcode) return fail(res, 'bad auth code')
        if (!req.body.url) return fail(res, 'missing url')
        if (!req.body.url.toLowerCase().startsWith('http')) return fail(res, 'bad url')
        save_url(req.body.url)
            .then((msg: string) => res.json({status: 'success', message: msg}))
            .catch((e: Error) => res.json({status: 'error', message: e.toString()}))
    })
    app.post('/submit/processed-bookmark', (req, res) => {
        if (req.body.authcode !== settings.authcode) return fail(res, 'bad auth code')
        save_processed_url(req.body)
            .then((msg: string) => res.json({status: 'success', message: msg}))
            .catch((e: Error) => res.json({status: 'error', message: e.toString()}))
    })
    app.get('/', (req, res) => {
        res.send('There is nothing here\n')
    })
    app.get('/bookmarks/queue', (req, res) => {
        search_queued()
            .then((data: any[]) => res.json({status: 'success', data: data}))
            .catch((e: Error) => res.json({status: 'error', message: e.toString()}))
    })
    app.get('/bookmarks/processed', (req, res) => {
        search_processed()
            .then((data: any[]) => res.json({status: 'success', data: data}))
            .catch((e: Error) => res.json({status: 'error', message: e.toString()}))
    })
    app.get('/bookmarks/', (req, res) => {
        res.sendFile("bookmarks.html", {root: 'resources'})
    })

    app.listen(PORT, () => {
        console.info(`started the server on port ${PORT}`)
    })
}

load_db(DB_ROOT)
    .then((db)=> {
    console.log("loaded the DB", db)
    return start_server(db)
})
