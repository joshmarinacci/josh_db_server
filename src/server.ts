import express from "express"
import {DB} from "./db.js";
import {Server} from "http";
import path from "path";
import {make_logger} from "josh_util";

const log = make_logger()
export type ServerSettings = {
    port:number,
    authcode:string
}

export async function start_server(db: DB, PORT: number, settings: ServerSettings):Promise<Server> {
    const app = express()
    app.use(express.json())

    function fail(res, msg) {
        res.json({status: 'error', message: msg})
    }

    app.get('/submit/bookmark', (req, res) => res.sendFile("form.html", {root: 'resources'}))
    app.get(`/bookmark/:id/attachment/:name`,(req,res) => {
        log.info("requested attachment",req.body, req.params)
        if(!req.params || !req.params.id || !req.params.name) return fail(res, 'missing parameters')
        db.get_attachment(req.params.id,req.params.name)
            .then((att) => res.sendFile(path.resolve(att.data.filepath)))
            .catch((e:Error) => res.json({status:'error', message: e.toString()}))
    });
    app.post('/submit/bookmark', (req, res) => {
        if (req.body.authcode !== settings.authcode) return fail(res, 'bad auth code')
        if (!req.body.url) return fail(res, 'missing url')
        if (!req.body.url.toLowerCase().startsWith('http')) return fail(res, 'bad url')
        db.save_unprocessed(req.body.url)
            .then(() => res.json({status: 'success', message: "all good"}))
            .catch((e: Error) => res.json({status: 'error', message: e.toString()}))
    })
    app.post('/submit/processed-bookmark', (req, res) => {
        if (req.body.authcode !== settings.authcode) return fail(res, 'bad auth code')
        db.save_processed(req.body)
            .then(() => res.json({status: 'success', message: "all good"}))
            .catch((e: Error) => res.json({status: 'error', message: e.toString()}))
    })
    app.get('/', (req, res) => res.send('There is nothing here\n'))
    app.get('/bookmarks/queue', (req, res) => {
        db.search_unprocessed()
            .then((data: any[]) => res.json({status: 'success', data: data}))
            .catch((e: Error) => res.json({status: 'error', message: e.toString()}))
    })
    app.get('/bookmarks/processed', (req, res) => {
        db.search_processed()
            .then((data: any[]) => res.json({status: 'success', data: data}))
            .catch((e: Error) => res.json({status: 'error', message: e.toString()}))
    })
    app.get('/bookmarks/', (req, res) => res.sendFile("bookmarks.html", {root: 'resources'}))

    return app.listen(PORT, () => {
        console.info(`started the server on port ${PORT}`)
    })
}
