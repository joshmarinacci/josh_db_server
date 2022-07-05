/*

First version of url capture db. Blog with before and after notes. Also .md in the repo. Use my existing blog to post it.

- [ ] Service writes each message to disk in a fixed naming dir structure
[x] Submit a URL to be analyzed
[x] Passcode for temporary auth
- [ ] Bookmarklet.
[x] If get instead of post render a form
[x] Source
[x] Creation time
- [x] Type
- [ ] Process request
- [ ] Array of namespaced tags
- [x] Page to show the latest 10 bookmarks
- [ ] All code should be as simple and clear as possible.
- [ ] Code for only 60 minutes
 */

import express from "express"
import * as fs from "fs";
import path from "path";

const DB_ROOT = "./DB";
const PORT = 3000

const settings = JSON.parse(fs.readFileSync("./settings.json").toString())
console.info("settings are",settings)

const app = express()
app.use(express.json())

app.get('/submit/bookmark',(req,res)=>{
    res.sendFile("form.html",{root:'resources'})
})

function fail(res,msg) {
    res.json({status:'error',message:msg})
}
function gen_id(bookmark: string) {
    return `${bookmark}_${Math.floor(Math.random()*10_000_000)}`
}
function gen_path(d: Date) {
    return `${d.getUTCFullYear()}/${d.getUTCMonth()}/${d.getUTCDate()}/${d.getUTCHours()}/${d.getUTCMinutes()}`
}

async function save_url(url) {
    let item = {
        id:gen_id('bookmark'),
        created:new Date(),
        source:'web',
        type:'bookmark',
        tags:[],
        data:{
            status:'unprocessed',
            url:url,
        }
    }
    console.info("item is",item)
    let pth = gen_path(item.created)
    let dir_path = path.resolve(path.join(DB_ROOT,pth))
    await fs.promises.mkdir(dir_path, {recursive: true})
    let file_path = path.join(dir_path,item.id+'.json')
    await fs.promises.writeFile(file_path,JSON.stringify(item))
    console.info("wrote file",file_path)
    return "all good"
}

type Visitor = (file) => Promise<void>;

async function getFiles(dir, visitor:Visitor) {
    // Get this directory's contents
    const files = await fs.promises.readdir(dir);
    // Wait on all the files of the directory
    return Promise.all(files
        // Prepend the directory this file belongs to
        .map(f => path.join(dir, f))
        // Iterate the files and see if we need to recurse by type
        .map(async f => {
            // See what type of file this is
            const stats = await fs.promises.stat(f);
            // Recurse if it is a directory, otherwise return the filepath
            return stats.isDirectory() ? getFiles(f,visitor) : visitor(f);
        }));
}

async function search_queued() {
    console.log("searching queued")
    let results = []
    await getFiles(DB_ROOT,async (f) => {
        console.log("visiting",f)
        let buf = await fs.promises.readFile(f);
        let item = JSON.parse(buf.toString())
        console.log("item",item)
        if(item.type === 'bookmark') results.push(item)
    })
    console.log("final results",results)
    return results
}
// search_queued().then((data)=>{
//     console.log("the data is",data)
//     process.exit(0)
// })
// save_url({url:"http://josh.earth/"})
//     .then((msg)=>{
//         console.log("msg",msg)
//         if(true) {
//             process.exit(0)
//         }
//
//     })
//     .catch(e => console.error('errored',e))

app.post('/submit/bookmark',(req,res)=>{
    if(req.body.authcode !== settings.authcode) return fail(res,'bad auth code')
    if(!req.body.url) return fail(res,'missing url')
    if(!req.body.url.toLowerCase().startsWith('http')) return fail(res,'bad url')
    save_url(req.body.url)
        .then((msg:string)=>res.json({status:'success',message:msg}))
        .catch((e:Error) => res.json({status:'error',message:e.toString()}))
})
app.get('/',(req,res) => {
    res.send('There is nothing here\n')
})
app.get('/bookmarks/queue',(req,res)=>{
    search_queued()
        .then((data:any[]) => res.json({status:'success',data:data}))
        .catch((e:Error) => res.json({status:'error',message:e.toString()}))
})
app.get('/bookmarks/',(req,res)=>{
    res.sendFile("bookmarks.html",{root:'resources'})
})

app.listen(PORT,() => {
    console.info(`started the server on port ${PORT}`)
})
