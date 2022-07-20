import {DBID, DBObj, DBObjAPI, Status} from "./api.js";
import {gen_id, gen_path, getFiles, make_logger, mkdir, rmdir} from "./util.js";
import path from "path";
import {promises as fs} from "fs"

const log = make_logger("DISK_DB")

export type AuthSettings = {
    type: "userpass" | "oauth"
    username: string
    password: string
}

export class DiskDB implements DBObjAPI {
    data: DBObj[]
    private rootdir: string;
    private delete_on_shutdown:boolean

    constructor(rootdir: string, delete_on_shutdown:boolean) {
        this.rootdir = rootdir
        this.data = []
        this.delete_on_shutdown = delete_on_shutdown
    }

    async connect() {
        await mkdir(this.rootdir)
        await getFiles(this.rootdir, async (f) => {
            log.info("reading", f)
            let buf = await fs.readFile(f);
            let item = JSON.parse(buf.toString())
            log.info("loaded", item.id)
            this.insert_from_disk(item)
        })

        return Promise.resolve(this)
    }

    async archive(obj: DBObj): Promise<Status> {
        //mark as archived
        let ret = await this.get_by_id(obj.id)
        let item = ret.data[0]
        item.archived = true
        item.archived_date = new Date()
        //save back to disk
        await this._save(item)
        //return status
        return {
            success:true,
            data:[],
        }
    }

    async create(obj: object): Promise<Status> {
        let item: DBObj = {
            // @ts-ignore
            data: obj.data,
            id: gen_id("disk-db"),
            tags: [],
            // @ts-ignore
            type: obj.type,
            created_date:new Date(),
            archived:false
        }
        await this._save(item)
        return {
            success: true,
            data: [item]
        }
    }

    async get_by_id(id: DBID): Promise<Status> {
        let results = this.data.filter(o => o.id == id)
        return {
          success:true,
            data:results
        }
    }

    async replace(old: DBObj, replacement: object): Promise<Status> {
        let new_rep: DBObj = {
            id: gen_id("disk-db"),
            type: old.type,
            tags: [],
            replaces: old.id,
            created_date:new Date(),
            // @ts-ignore
            data: replacement.data,
            archived:false,
        }
        log.info("replacement is", new_rep)
        await this._save(new_rep)
        // get rid of the old
        this.data = this.data.filter(o => o.id !== old.id)
        return Promise.resolve({
            success: true,
            data: [new_rep]
        })
    }

    search(query: any): Promise<Status> {
        log.info("searching for", query)
        if (query && query.data) {
            let q_data = query.data
            // log.info("searching for",q_data)
            let res = this.data.filter(it => {
                // log.info("it is",it.data)
                let passed = true
                if(it.archived) passed = false
                for (let [k, v] of Object.entries(q_data)) {
                    // log.info("key",k,'==',v)
                    if (it.data[k] === v) {
                        // log.info("passed")
                    } else {
                        // log.info("didnt pass")
                        passed = false
                    }
                }
                return passed
            })
            log.info("final results are",res)
            return Promise.resolve({
                success: true,
                data: res
            })
        }
        return Promise.resolve({
            success: false,
            data: []
        })

    }

    async shutdown() {
        if(this.delete_on_shutdown) {
            await rmdir(this.rootdir)
            log.info("nuked dir", this.rootdir)
        }
    }

    private async _save(item: DBObj):Promise<DBObj> {
        let pth = gen_path(item.created_date)
        let fdir = path.join(this.rootdir,pth)
        await mkdir(fdir)
        let fpath = path.join(fdir,item.id+".json")
        log.info("writing to the path",fpath)
        await fs.writeFile(fpath,JSON.stringify(item))
        log.info("wrote to it")
        this.data.push(item)
        log.info("pushed it")
        return item
    }

    private insert_from_disk(item: DBObj) {
        this.data.push(item)
    }
}
