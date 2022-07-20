import {make_logger} from "./util.js";
import express, {Express} from "express";
import * as http from "http";
import {DBObjAPI} from "./api.js";

const log = make_logger()
const fail = e => log.error(e)

export type UserSettings = {
    name:string,
    pass:string
}
export type SimpleServerSettings = {
    users:UserSettings[],
}
export class SimpleDBServer {
    private app: Express;
    private server: http.Server;
    private port: number;
    private db: DBObjAPI;
    private settings: SimpleServerSettings;

    constructor(port: number, db: DBObjAPI, settings:SimpleServerSettings) {
        this.settings = settings
        this.db = db
        this.port = port
        this.app = express()
        this.app.use(express.json())
        this.app.use((req,res,next)=>{
            log.info("doing auth",req.headers)
            if(!req.headers['db-username']) {
                log.warn("missing db-username")
                return res.json({success:false, message:"bad auth"})
            }
            let username = req.headers['db-username']
            log.info("got username",username)
            let password = req.headers['db-password']
            log.info("got password",password)
            let user = this.settings.users.find(u => u.name === username && u.pass === password)
            if(!user) return res.json({success:false, message:"bad auth"})
            // @ts-ignore
            req.user = user
            next()
        })
        this.app.get('/status', (req, res) => {
            log.info("/status called")
            res.json({success:true,message:"auth-good"})
        })
        this.app.post('/create',(req,res)=>{
            log.info("/create",req.body)
            db.create(req.body).then(s => res.json(s)).catch(fail)
        })
        this.app.post('/search',(req,res)=>{
            log.info("/search",req.body)
            db.search(req.body).then(s => res.json(s)).catch(fail)
        })
        this.app.post('/replace',(req,res)=>{
            log.info("/replace",req.body)
            db.replace(req.body.old,req.body.replacement).then(s => res.json(s)).catch(fail)
        })
        this.app.post('/archive',(req,res)=>{
            log.info("/archive",req.body)
            db.archive(req.body).then(s => res.json(s)).catch(fail)
        })
    }

    async start() {
        this.server = this.app.listen(this.port, () => {
            log.info(`started the server on port ${this.port}`)
        })
    }

    async shutdown() {
        this.server.close(()=>{
            log.info("closed the server")
        })
    }
}
