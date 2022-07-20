import {DBObjAPI} from "../api";
import {make_logger} from "../util.js";
import {InMemoryDB} from "../memory_db.js";
import {DiskDB} from "../disk_db.js";
import {RPCClient} from "../rpc_proxy.js";
import {SimpleDBServer, SimpleServerSettings} from "../simple_server.js";
import {run_processor} from "../process.js";


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
        "http://localhost:8008",
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
        "http://localhost:8008",
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
        `http://localhost:${settings.port}`,
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
            // log.info("the final processed item is",ret)
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
    .then(inmemory_test)
    .then(disk_test)
    .then(rpc_test)
    .then(persistence_test)
    .then(processing_test)
    .then(()=>console.log("done"))
    .catch(e => console.error(e))
