import {make_logger} from "./util.js";
import express, {Express} from "express";
import * as http from "http";
import {DBObjAPI} from "./api.js";
import path from "path";

const log = make_logger()
const fail = e => log.error(e)

export type UserSettings = {
    name:string,
    pass:string
}
export type SimpleServerSettings = {
    port:number,
    rootdir:string,
    apipath:string,
    staticpath:string,
    staticdir:string,
    users:UserSettings[],
}
export class SimpleDBServer {
    private app: Express;
    private server: http.Server;
    private db: DBObjAPI;
    private settings: SimpleServerSettings;

    constructor(db: DBObjAPI, settings:SimpleServerSettings) {
        this.settings = settings
        this.db = db
        this.app = express()
        this.app.use(settings.staticpath,express.static(settings.staticdir))
        this.app.use(express.json())

        const auth_check = (req,res,next) => {
            // log.info("doing auth",req.headers, req.url,settings.apipath)
            //skip auth for '/get'
            if(req.url.startsWith(`${settings.apipath}/get`)) return next()
            if(!req.headers['db-username']) {
                log.warn("missing db-username")
                return res.json({success:false, message:"bad auth"})
            }
            let username = req.headers['db-username']
            // log.info("got username",username)
            let password = req.headers['db-password']
            // log.info("got password",password)
            let user = this.settings.users.find(u => u.name === username && u.pass === password)
            if(!user) return res.json({success:false, message:"bad auth"})
            // @ts-ignore
            req.user = user
            next()
        }
        this.app.use(auth_check)
        this.app.get(`${settings.apipath}/status`, (req, res) => {
            // log.info("/status called")
            res.json({success:true,message:"auth-good"})
        })
        this.app.get(`${settings.apipath}/get/:id/attachment/:name`,(req,res) => {
            // log.info('doing get attachment', req.params, req.query, req.body)
            db.get_by_id(req.params.id).then(resp => {
                if(resp.data.length < 1) {
                    res.status(404)
                    return res.json({success:false, message:"no such document"})
                }
                let doc = resp.data[0]
                // log.info('the doc is',doc)
                if(doc.data[req.params.name]) {
                    let attachment = doc.data[req.params.name]
                    // log.info("att:",attachment)
                    if(attachment.form === 'local_file_path') {
                        // log.info("sending",attachment)
                        let abs = path.resolve(attachment.data.filepath)
                        return res.sendFile(abs)
                    }
                }
                res.status(404)
                return res.json({success:false, message:"cannot render document"})
            })
        })
        this.app.post(`${settings.apipath}/create`,(req, res)=>{
            // log.info("/create",req.body)
            db.create(req.body).then(s => res.json(s)).catch(fail)
        })
        this.app.post(`${settings.apipath}/search`,(req, res)=>{
            // log.info("/search",req.body)
            db.search(req.body).then(s => res.json(s)).catch(fail)
        })
        this.app.post(`${settings.apipath}/replace`,(req, res)=>{
            // log.info("/replace",req.body)
            db.replace(req.body.old,req.body.replacement).then(s => res.json(s)).catch(fail)
        })
        this.app.post(`${settings.apipath}/archive`,(req, res)=>{
            // log.info("/archive",req.body)
            db.archive(req.body).then(s => res.json(s)).catch(fail)
        })
    }

    async start() {
        this.server = this.app.listen(this.settings.port, () => {
            log.info(`started the server on port ${this.settings.port}`)
        })
    }

    async shutdown() {
        this.server.close(()=>{
            log.info("closed the server")
        })
    }
}
