import path from "path";
import {promises as fs} from "fs"
import {
    DBID,
    DBObj,
    DBObjAPI,
    gen_id, gen_path,
    make_logger,
    Status
} from "josh_util";
import {getFiles, mkdir, rmdir} from "josh_node_util";
import {Attachment} from "./db";

const log = make_logger("DISK_DB")

export class DiskDB implements DBObjAPI {
    data: DBObj[]
    private rootdir: string;
    private delete_on_shutdown:boolean

    constructor(rootdir: string, delete_on_shutdown:boolean) {
        this.rootdir = rootdir
        this.data = []
        this.delete_on_shutdown = delete_on_shutdown
    }

    get_attachment(id: string, attachment: string):Promise<any> {
        throw new Error("Method not implemented.");
    }

    async connect() {
        await mkdir(this.rootdir)
        await getFiles(this.rootdir, async (f) => {
            log.info("reading", f)
            let buf = await fs.readFile(f);
            let item = JSON.parse(buf.toString())
            this.insert_from_disk(item)
        })

        let items = this.data.slice()
        items.forEach(it => {
            if(it.replaces) {
                log.info(`replacing ${it.replaces} with ${it.id} `)
                this.data = this.data.filter(d => d.id !== it.replaces)
            }
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
        if(!('type' in obj)) return { success:false, data:[], message:"missing 'type' property"}
        if(!('data' in obj)) return { success:false, data:[], message:"missing 'data' property"}
        let item: DBObj = {
            // @ts-ignore
            data: obj.data,
            id: gen_id("disk-db"),
            tags: [],
            // @ts-ignore
            type: obj.type,
            created_date: new Date(),
            archived: false,
            // @ts-ignore
            attachments: obj.attachments,
        }
        await this._validate(item)
        //convert attachments to files on disk
        // console.log("item is",item)
        await this._save_attachments(item)


        await this._save(item)
        console.log("final item is",JSON.stringify(item,null, '   '))
        return {
            success: true,
            data: [item]
        }
    }
    create_with_attachments(data:object, attachments:Map<string,File>):Promise<Status> {
        log.info("inside CREATe_WITH_ATTS")
        // @ts-ignore
        if(!data.attachments) data.attachments = {}
        for(let k in attachments) {
            log.info("copying",k,attachments.get(k))
            // @ts-ignore
            data.attachments[k] = attachments.get(k)
        }
        return this.create(data)
    }

    async get_by_id(id: DBID): Promise<Status> {
        log.info("doing get by id for",id)
        return {
            success:true,
            data:this.data.filter(o => o.id == id)
        }
    }

    async replace(old: DBObj, replacement: object): Promise<Status> {
        let new_rep: DBObj = {
            id: gen_id("disk-db"),
            type: old.type,
            // @ts-ignore
            tags: replacement.tags || old.tags,
            replaces: old.id,
            created_date: new Date(),
            // @ts-ignore
            data: replacement.data,
            archived: false,
            // @ts-ignore
            attachments: replacement.attachments,
        }
        //save attachments
        await this._validate(new_rep)
        await this._save_attachments(new_rep)
        //save the new
        await this._save(new_rep)
        // get rid of the old
        this.data = this.data.filter(o => o.id !== old.id)
        log.info(`replaced ${old.id} with ${new_rep.id}`)
        return {
            success: true,
            data: [new_rep]
        }
    }
    replace_with_attachments(old_data:DBObj, data:object, attachments:Map<string,File>):Promise<Status> {
        throw new Error("not implemented")
    }

    async search(query: any): Promise<Status> {
        if(!query) return { success: false, message:"no query", data: [] }
        log.info("searching for", query)

        if('type' in query) {
            log.info("doing a type query")
            let results = this.data.filter(it => it.type === query.type)
            return {
                success: true,
                data: results
            }
        }

        if (query.data) {
            let q_data = query.data
            log.info("query.data",q_data)
            let res = this.data.filter(it => {
                if(!it.data) return false
                let passed = true
                if(it.archived) passed = false
                for (let [k, v] of Object.entries(q_data)) {
                    if (it.data[k] === v) {
                        // log.info("passed")
                    } else {
                        // log.info("didnt pass")
                        passed = false
                    }
                }
                return passed
            })
            return {
                success: true,
                data: res
            }
        }
        return {
            success: false,
            data: []
        }
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
        if(item.created_date) item.created_date = new Date(item.created_date)
        this.data.push(item)
    }

    private async _save_attachments(item: DBObj) {
        // log.info("saving attachments from",item)
        for(let key in item.attachments) {
            // log.info("key is",key)
            let att = item.attachments[key]
            // log.info("att",att)
            let new_att:Attachment = {
                type: "attachment",
                form: "local_file_path",
                mime_type: att.mimetype,
                data: {
                    filepath:att.path
                },
            }
            item.attachments[key] = new_att
        }
    }

    private async _validate(item: DBObj) {
        if(!item.attachments) item.attachments = {}
        if(!item.tags) item.tags = []
        if(!item.data) item.data = {}
    }
}
