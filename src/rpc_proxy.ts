import {DBID, DBObj, DBObjAPI, Status} from "./api.js";
import {make_logger} from "./util.js";
import {default as fetch} from "node-fetch"

export type AuthSettings = {
    type: "userpass" | "oauth"
    username: string
    password: string
}

const log = make_logger("rpc_proxy")
export class RPCClient implements DBObjAPI {
    private base: string;
    private auth: AuthSettings;

    async connect(base: string, auth: AuthSettings): Promise<DBObjAPI> {
        this.base = base
        this.auth = auth
        let json = await this.json_get(base+'/status')
        log.info("response from status is",json)
        return this
    }
    create(data: object): Promise<Status> {
        return this.json_post(this.base+'/create',data)
    }
    search(query: any): Promise<Status> {
        return this.json_post(this.base+'/search',query)
    }
    replace(old: DBObj, replacement: object): Promise<Status> {
        return this.json_post(this.base+'/replace',{
            old:old,
            replacement:replacement
        })
    }
    archive(obj: DBObj): Promise<Status> {
        return this.json_post(this.base + '/archive', obj)
    }
    get_by_id(id: DBID): Promise<Status> {
        throw new Error("unimplemented")
    }
    async shutdown() {
    }

    private async json_get(url: string) {
        // log.info(`json_get "${url}"`)
        let res = await fetch(url,{
            method:'GET',
            headers:{
                'Content-Type':'application/json',
                'db-username':this.auth.username,
                'db-password':this.auth.password,
            }
        })
        return await res.json() as Status
    }

    private async json_post(url: string, payload: object):Promise<Status> {
        let res = await fetch(url,{
            method:'POST',
            headers:{
                'Content-Type':'application/json',
                'db-username':this.auth.username,
                'db-password':this.auth.password,
            },
            body:JSON.stringify(payload),
        })
        return await res.json() as Status
    }

    async get_attachment(id:DBID, name: string):Promise<any> {
        let url = `${this.base}/get/${id}/attachment/${name}`
        log.info("getting url",url)
        let res = await fetch(url,{
            headers:{
                'db-username':this.auth.username,
                'db-password':this.auth.password,
            }
        }).then(d => d.blob())
        return res
    }
}
