import {DBID, DBObj, DBObjAPI, Status} from "./api.js";
import {AuthSettings} from "./disk_db.js";
import {json_get, json_post, make_logger} from "./util.js";
import {default as fetch} from "node-fetch"

const log = make_logger("rpc_proxy")
export class RPCClient implements DBObjAPI {
    private base: string;

    async connect(base: string, auth: AuthSettings): Promise<DBObjAPI> {
        this.base = base
        let json = await json_get(base+'/status')
        log.info("response from status is",json)
        return Promise.resolve(this)
    }
    async create(data: object): Promise<Status> {
        let json = await json_post(this.base+'/create',data)
        log.info("received back",json)
        return json as Status
    }
    async search(query: any): Promise<Status> {
        let json = await json_post(this.base+'/search',query)
        log.info("received back",json)
        return json as Status
    }
    async replace(old: DBObj, replacement: object): Promise<Status> {
        let json = await json_post(this.base+'/replace',{
            old:old,
            replacement:replacement
        })
        log.info("received back",json)
        return json as Status
    }
    async archive(obj: DBObj): Promise<Status> {
        let json = await json_post(this.base+'/archive',obj)
        log.info("received back",json)
        return json as Status
    }
    get_by_id(id: DBID): Promise<Status> {
        throw new Error("unimplemented")
    }
    async shutdown() {

    }
}
