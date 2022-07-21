import {DBID, DBObj, DBObjAPI, gen_id, make_logger, Status} from "josh_util";

const log = make_logger("IN_MEMORY_DB")

export class InMemoryDB implements DBObjAPI {
    private data: DBObj[];

    constructor() {
        this.data = []
    }

    connect(): Promise<DBObjAPI> {
        return Promise.resolve(this)
    }

    archive(obj: DBObj): Promise<Status> {
        this.data = this.data.filter(o => o.id !== obj.id)
        return Promise.resolve({
            success: true,
            data: []
        })
    }

    create(obj: object): Promise<Status> {
        let item: DBObj = {
            // @ts-ignore
            data: obj.data,
            id: gen_id("in-memory"),
            tags: [],
            created_date:new Date(),
            // @ts-ignore
            type: obj.type,
            archived:false
        }
        this.data.push(item)
        return Promise.resolve({
            success: true,
            data: [item]
        })
    }

    get_by_id(id: DBID): Promise<Status> {
        throw new Error("not implemented")
    }

    replace(old: DBObj, replacement: object): Promise<Status> {
        log.info("old is", old)
        log.info("new is", replacement)

        let new_rep: DBObj = {
            id: gen_id("in-memory"),
            type: old.type,
            tags: [],
            replaces: old.id,
            created_date:new Date(),
            // @ts-ignore
            data: replacement.data,
            archived:false
        }
        log.info("replacement is", new_rep)

        // insert the new
        this.data.push(new_rep)
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
            // log.info("final results are",res)
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

    shutdown() {
        console.log("pretending to shut down")
    }

    get_attachment(id: DBID, attachment: string):Promise<any> {
        throw new Error("not implemented")
    }
}
