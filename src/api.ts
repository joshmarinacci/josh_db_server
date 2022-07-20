export type Status = {
    success:boolean
    message?:string
    data:DBObj[]
}

export type DBID = string

export type DBObj = {
    id:DBID
    replaces?:DBID
    type:string
    tags:string[],
    created_date:Date,
    data:any
    archived:boolean,
    archived_date?:Date,
}

export interface DBObjAPI {
    create(data:object):Promise<Status>
    replace(old:DBObj, replacement:object):Promise<Status>
    archive(obj:DBObj):Promise<Status>
    get_by_id(id:DBID):Promise<Status>
    search(query:any):Promise<Status>
}

class DBConnection {
    async connect_userpass(user:string, password:string, url:URL):Promise<DBObjAPI> {
        throw new Error("not implemented yet")
    }
}


