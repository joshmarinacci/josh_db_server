import {InMemoryDB} from "../memory_db.js";
import {DiskDB} from "../disk_db.js";
import {SimpleDBServer, SimpleServerSettings} from "../simple_server.js";
import {run_processor} from "../process.js";
import {DBObj, DBObjAPI, make_logger, RPCClient, Status} from "josh_util";
import {FormData, File, } from "formdata-node"
import fetch from "node-fetch"
import fs from "fs";
import {fileFromPath} from "formdata-node/file-from-path";


const log = make_logger("TEST_API")


async function inmemory_test() {
    let db = new InMemoryDB()

    let api: DBObjAPI = await db.connect()
    await run_bookmark_test(api)
    db.shutdown()
}

async function run_bookmark_test(api: DBObjAPI) {
    log.info("running the test")
    // create a bookmark
    let data = {
        type: 'bookmark',
        data: {
            status: 'unprocessed',
            url: 'https://vr.josh.earth/',
        }
    }
    {
        let ret = await api.create(data)
        log.assert(ret.success, "created_date okay")
    }


    {
        //search for unprocessed bookmarks
        let ret = await api.search({data:{status:'unprocessed'}})
        log.assert(ret.success,'search was successful')
        log.assert(ret.data.length===1,'found one item')
        //get the bookmark
        let raw_bookmark = ret.data[0]
        //add some metadata
        raw_bookmark.data.status = 'processed'
        raw_bookmark.data.title = 'a cool title here'
        //replace it with a new one with metadata. can pass the same one to create a revision
        let ret2 = await api.replace(raw_bookmark,raw_bookmark)
        log.assert(ret2.success,'replace was successful')

        //confirm zero unprocessed
        let ret3 = await api.search({data:{status:'unprocessed'}})
        log.assert(ret3.success && ret3.data.length === 0,'zero unprocessed')
        //confirm one processed
        let ret4 = await api.search({data:{status:'processed'}})
        log.assert(ret4.success && ret4.data.length === 1,'one processed')
        //confirm old and new are different
        // log.info("the new one is",ret4.data[0])
        log.assert(raw_bookmark.id !== ret4.data[0].id,'they are different')
    }

    {
        //archive the new one
        let ret1 = await api.search({data:{status:'processed'}})
        log.assert(ret1.success && ret1.data.length === 1,'one processed still')
        let ret2 = await api.archive(ret1.data[0])
        log.assert(ret2.success,'archived it')
        //search for everything not archived. should be zero.
        let ret3 = await api.search({data:{status:'processed'}})
        log.assert(ret3.success && ret3.data.length === 0,'zero processed still')
    }

}

async function disk_test() {
    let db = new DiskDB("./test-db-disk",true)
    let api: DBObjAPI = await db.connect()
    try {
        await run_bookmark_test(api)
    } catch (e) {
        log.error(e)
    }
    await db.shutdown()
}

async function rpc_test() {
    let settings:SimpleServerSettings = {
        port:8008,
        rootdir:'crazy_db',
        apipath:"/api",
        staticpath:"static/",
        staticdir:"static-dir/",
        users: [{
            name:"josh",
            pass:"pass"
        }]
    }
    let db = new DiskDB(settings.rootdir,true)
    let db_api = await db.connect()
    let server = new SimpleDBServer(db_api, settings)
    await server.start()
    let rpc = new RPCClient()
    let api: DBObjAPI = await rpc.connect(
        `http://localhost:${settings.port}${settings.apipath}`,
        {type:'userpass',username:"josh",password:'pass'}
    )
    try {
        await run_bookmark_test(api)
    } catch (e) {
        log.error(e)
    }
    await rpc.shutdown()
    await server.shutdown()
    await db.shutdown()
}

async function persistence_test() {
    let settings:SimpleServerSettings = {
        port: 8008,
        rootdir: "persistence",
        apipath:"/api",
        staticpath:"static/",
        staticdir:"static-dir/",
        users: [{
            name:"josh",
            pass:"pass"
        }]
    }

    let db = new DiskDB(settings.rootdir,false)
    let db_api = await db.connect()
    let server = new SimpleDBServer(db_api, settings)
    await server.start()
    let rpc = new RPCClient()
    let api: DBObjAPI = await rpc.connect(
        `http://localhost:${settings.port}${settings.apipath}`,
        {type:'userpass',username:"josh",password:'pass'}
    )
    try {
        //make an object
        let data = {
            type: 'bookmark',
            data: {
                status: 'unprocessed',
                url: 'https://vr.josh.earth/',
            }
        }
        {
            let ret = await api.create(data)
            log.assert(ret.success, "created_date okay")
        }

        //restart everything
        await db.shutdown()
        await server.shutdown()
        log.info("shutdown the database and server")
        db = new DiskDB(settings.rootdir,true)
        db_api = await db.connect()
        server = new SimpleDBServer(db_api, settings)
        await server.start()
        log.info("restarted everything")
        {
            //see if the object is still there?
            let ret = await api.search({data:{status:'unprocessed'}})
            log.assert(ret.success,'search was successful')
            log.assert(ret.data.length===1,'found one item')
        }
    } catch (e) {
        log.error(e)
    }
    await rpc.shutdown()
    await server.shutdown()
    await db.shutdown()

}

async function processing_test() {
    let settings:SimpleServerSettings = {
        apipath:"/api",
        staticpath:"static/",
        staticdir:"static-dir/",
        port: 8008,
        rootdir: "processing_db",
        users: [{
            name:"josh",
            pass:"pass"
        }]
    }

    let db = new DiskDB(settings.rootdir,true)
    let db_api = await db.connect()
    let server = new SimpleDBServer(db_api, settings)
    await server.start()
    let rpc = new RPCClient()
    let api: DBObjAPI = await rpc.connect(
        `http://localhost:${settings.port}${settings.apipath}`,
        {type:'userpass',username:settings.users[0].name,password:settings.users[0].pass}
    )
    try {
        {
            //submit a bookmark
            let data = {
                type: 'bookmark',
                data: {
                    status: 'unprocessed',
                    url: 'https://vr.josh.earth/',
                }
            }
            let ret = await api.create(data)
            log.assert(ret.success, "created_date okay")
        }
        {
            //confirm there is one unprocessed
            let ret = await api.search({data:{status:'unprocessed'}})
            log.assert(ret.success,'search was successful')
            log.assert(ret.data.length===1,'found one item')
        }
        {
            // process it
            await run_processor(settings, api)
        }
        {
            //confirm zero unprocessed
            let ret = await api.search({data: {status: 'unprocessed'}})
            log.assert(ret.data.length === 0, 'zero unprocessed')
        }
        {
            //confirm one processed
            let ret = await api.search({data:{status:'processed'}})
            log.assert(ret.data.length===1,'one processed')
            log.info("the final processed item is",ret.data[0])

            //fetch the thumbnail attachment
            let rsp = await api.get_attachment(ret.data[0].id,"thumb") as Blob
            log.info("got attachment",rsp, rsp.type, rsp.size)
            log.assert(rsp.type === 'image/png',"got an image!")

        }

    } catch (e) {
        log.error(e)
    }
    await rpc.shutdown()
    await server.shutdown()
    await db.shutdown()
}

async function create_with_attachments(settings:SimpleServerSettings, data:object, attachments:object) {
    let url = `http://localhost:${settings.port}${settings.apipath}/create_with_attachment`

    let form_data = new FormData()
    form_data.append('data',JSON.stringify(data))
    let atts = Object.keys(attachments)
    for(let i=0; i<atts.length; i++) {
        let k = atts[i]
        let filename = attachments[k]
        log.info("attachment",k, filename)
        // let data = await fs.promises.readFile(filename)
        // log.info('data length is',data.length)
        // let file =new File(data, filename,{type:'image/jpeg'})
        // log.info("the file size is",file.size)
        let ffp = await fileFromPath(filename,{type:'image/jpeg'})
        log.info("ffp is",ffp.size, ffp.type)
        form_data.set(k, ffp)
    }
    log.info("posting",form_data.get('thumb'))
    let res = await fetch(url,{
        method:'POST',
        headers:{
            'db-username': settings.users[0].name,
            'db-password': settings.users[0].pass,
        },
        body:form_data as any,
    })
    return await res.json() as Status
}

async function replace_with_attachments(settings:SimpleServerSettings, old_data:object, data:object, attachments:object) {
    let url = `http://localhost:${settings.port}${settings.apipath}/replace_with_attachment`

    let form_data = new FormData()
    log.info("stryihngifying ",old_data)
    form_data.append('old',JSON.stringify(old_data))
    log.info("stryihngifying ",data)
    form_data.append('replacement',JSON.stringify(data))
    let atts = Object.keys(attachments)
    for(let i=0; i<atts.length; i++) {
        let k = atts[i]
        let filename = attachments[k]
        // log.info("attachment",k, filename)
        // let data = await fs.promises.readFile(filename)
        // log.info('data length is',data.length)
        // let file =new File(data, filename,{type:'image/jpeg'})
        // log.info("the file size is",file.size)
        let ffp = await fileFromPath(filename,{type:'image/jpeg'})
        // log.info("ffp is",ffp.size, ffp.type)
        form_data.set(k, ffp)
    }
    log.info("posting",form_data.get('thumb'))
    let res = await fetch(url,{
        method:'POST',
        headers:{
            'db-username': settings.users[0].name,
            'db-password': settings.users[0].pass,
        },
        body:form_data as any,
    })
    return await res.json() as Status
}

async function multipart_test() {
    let settings:SimpleServerSettings = {
        apipath:"/api",
        staticpath:"static/",
        staticdir:"static-dir/",
        port: 8008,
        rootdir: "processing_db",
        users: [{
            name:"josh",
            pass:"pass"
        }]
    }

    let db = new DiskDB(settings.rootdir,true)
    let db_api = await db.connect()
    let server = new SimpleDBServer(db_api, settings)
    await server.start()
    let rpc = new RPCClient()
    let api: DBObjAPI = await rpc.connect(
        `http://localhost:${settings.port}${settings.apipath}`,
        {type:'userpass',username:settings.users[0].name,password:settings.users[0].pass}
    )
    try {
        // verify there are no entries
        //create object using multi-part with JSON + thumbnail
        let attachment_filepath = 'src/test/thumb.jpg'
        let target_id = null
        {
            let obj = {
                type: 'bookmark',
                data: {
                    status: 'unprocessed',
                    url: 'https://vr.josh.earth/',
                }
            }
            // viz-ed sends to server with a new form of create call with multi-part
            // JSON and thumbnail are separate parameters (doc and thumb)
            log.info("doing create")
            let result = await create_with_attachments(settings, obj, {'thumb': attachment_filepath})
            log.info("status is", result)
            log.assert(result.success, "result was good")
            target_id = result.data[0].id
        }
        // server saves thumb to disk at random path, creates object,
        // adds attachment with local file type, returns status
        // viz-ed receives status, adds docserver metadata
        // component containing doc-id.
        {
            log.info("doing get by id")
            let status = await api.get_by_id(target_id)
            log.assert(status.data.length === 1, ' got back a single item')
            let dbobj: DBObj = status.data[0]
            log.info(dbobj.id === target_id, 'correct id')
            log.info("object is",dbobj)
            let thumb: Blob = await api.get_attachment(target_id, 'thumb')
            log.info("blob is",thumb, thumb.size)
            log.assert(thumb.type === 'image/jpeg', 'the thumb is correct')
            let buf = await fs.promises.readFile(attachment_filepath);
            log.info("buf is",buf.length)
            log.assert(thumb.size === buf.length, 'the blog size is correct')
        }

        {
            log.info("============= doing a replacement")
            let status = await api.get_by_id(target_id)
            log.info("old status",status)
            let old_obj:DBObj = status.data[0]
            let attachment_filepath2 = 'src/test/thumb2.jpg'
            let new_obj  = {
                type: 'bookmark',
                data: {
                    status: 'processed',
                    url: 'https://apps.josh.earth/',
                }
            }
            let new_atts = {
                'thumb':attachment_filepath2,
            }

            let result = await replace_with_attachments(settings, old_obj,new_obj, new_atts)
            log.assert(result.success===true,"replace worked okay");
            log.info("result is",result, result.data[0])
            let thumb: Blob = await api.get_attachment(result.data[0].id, 'thumb')
            log.info("blob is",thumb, thumb.size)
            log.assert(thumb.type === 'image/jpeg', 'the thumb is correct')
            let buf = await fs.promises.readFile(attachment_filepath2);
            log.info("buf is",buf.length)
            log.assert(thumb.size === buf.length, 'the blob size is correct')
        }

    } catch (e) {
        log.error(e)
    }
    await rpc.shutdown()
    await server.shutdown()
    await db.shutdown()
}
console.log("running")
Promise.resolve(null)
    // .then(inmemory_test)
    // .then(disk_test)
    // .then(rpc_test)
    // .then(persistence_test)
    // .then(processing_test)
    .then(multipart_test)
    .then(()=>console.log("done"))
    .catch(e => console.error(e))
