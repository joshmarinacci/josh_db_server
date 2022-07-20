import {DBObjAPI} from "../api";
import {make_logger} from "../util.js";
import {InMemoryDB} from "../memory_db.js";
import {DiskDB} from "../disk_db.js";
import {RPCClient} from "../rpc_proxy.js";
import {SimpleDBServer} from "../simple_server.js";


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
    let db = new DiskDB("./test-db-disk")
    let api: DBObjAPI = await db.connect({type:'userpass',username:"josh",password:'somepassword'})
    try {
        await run_bookmark_test(api)
    } catch (e) {
        log.error(e)
    }
    await db.shutdown()
}


async function rpc_test() {
    let db = new InMemoryDB()
    let db_api = await db.connect()
    let server = new SimpleDBServer(8008, db_api)
    await server.start()
    let rpc = new RPCClient()
    let api: DBObjAPI = await rpc.connect(
        "http://localhost:8008",
        {type:'userpass',username:"josh",password:'somepassword'}
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

console.log("running")
Promise.resolve(null)
    // .then(inmemory_test)
    // .then(disk_test)
    .then(rpc_test)
    .then(()=>console.log("done"))
    .catch(e => console.error(e))
