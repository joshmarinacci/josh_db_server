import express, {Express} from "express";
import cors from "cors"
import * as http from "http";
import path from "path";
import {DBObjAPI, make_logger} from "josh_util";
import multer from "multer"

const log = make_logger("server")
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
        function debug(req,res,next) {
            log.info("url",req.url)
            log.info("method",req.method)
            log.info("original url", req.originalUrl, "base url", req.baseUrl)
            log.info('headers',req.headers)
            log.info('body',req.body)
            next()
        }
        this.app.use(debug)

        this.app.use(settings.staticpath,express.static(settings.staticdir))
        this.app.use(express.json())
        this.app.use(cors())
        const upload = multer({dest:'uploads/'})

        // this.app.options(`${settings.apipath}/create`, cors()) // enable pre-flight request for POST request
        // var corsOptionsDelegate = function (req, callback) {
        //     console.log("cors request", req)
        //     callback(req)
            // var corsOptions;
            // if (allowlist.indexOf(req.header('Origin')) !== -1) {
            //     corsOptions = { origin: true } // reflect (enable) the requested origin in the CORS response
            // } else {
            //     corsOptions = { origin: false } // disable CORS for this request
            // }
            // callback(null, corsOptions) // callback expects two parameters: error and options
        // }

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
        // this.app.use(auth_check)
        this.app.post(`${settings.apipath}/create`, (req, res)=>{
            log.info("/create with")
            // let data = JSON.parse(req.body.data)
            db.create(req.body)
                .then(s => res.json(s))
                .catch((e)=>{
                    console.log("error",e)
                    return res.json({success:false, message:e.toString()})
                })
        })
        this.app.get(`${settings.apipath}/status`, (req, res) => {
            // log.info("/status called")
            res.json({success:true,message:"auth-good"})
        })
        this.app.get(`${settings.apipath}/get/:id/data`,(req,res)=>{
            db.get_by_id(req.params.id).then(resp => res.json(resp))
        })
        this.app.get(`${settings.apipath}/get/:id/attachment/:name`,(req,res) => {
            log.info('doing get attachment', req.params, req.query, req.body)
            db.get_by_id(req.params.id).then(resp => {
                if(resp.data.length < 1) {
                    res.status(404)
                    return res.json({success:false, message:"no such document"})
                }
                let doc = resp.data[0]
                log.info('the doc is',doc)
                if(doc.attachments[req.params.name]) {
                    let attachment = doc.attachments[req.params.name]
                    log.info("att:",attachment)
                    if(attachment.form === 'local_file_path') {
                        // log.info("sending",attachment)
                        let abs = path.resolve(attachment.data.filepath)
                        res.type(attachment.mime_type)
                        return res.sendFile(abs)
                    }
                }
                res.status(404)
                return res.json({success:false, message:"cannot render document"})
            })
        })
        this.app.post(`${settings.apipath}/create_with_attachment`, upload.any(), (req, res)=>{
            log.info("/create with attachment. keys",Object.keys(req.body))
            if(req.body.data) {
                req.body.data = JSON.parse(req.body.data)
            }
            let data = req.body.data
            let atts = {}
            // @ts-ignore
            log.info("files is",req.files)
            // @ts-ignore
            req.files.forEach(file => {
                atts[file.fieldname] = file
            })
            data.attachments = atts
            // @ts-ignore
            db.create(data).then(s => res.json(s)).catch(fail)
        })
        this.app.post(`${settings.apipath}/search`,(req, res)=>{
            // log.info("/search",req.body)
            db.search(req.body).then(s => res.json(s)).catch(fail)
        })
        this.app.post(`${settings.apipath}/replace_with_attachment`, upload.any(), (req, res)=>{
            log.info("/replace with attachment. keys",Object.keys(req.body))
            log.info("body",req.body)
            if(req.body.old) req.body.old = JSON.parse(req.body.old)
            if(req.body.replacement) req.body.replacement = JSON.parse(req.body.replacement)
            let atts = {}
            // @ts-ignore
            log.info("files is",req.files)
            // @ts-ignore
            req.files.forEach(file => {
                atts[file.fieldname] = file
            })
            req.body.replacement.attachments = atts
            // @ts-ignore
            db.replace(req.body.old,req.body.replacement).then(s => res.json(s)).catch(fail)
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
