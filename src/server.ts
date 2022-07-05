/*

First version of url capture db. Blog with before and after notes. Also .md in the repo. Use my existing blog to post it.

- [ ] Service writes each message to disk in a fixed naming dir structure
[x] Submit a URL to be analyzed
[x] Passcode for temporary auth
- [ ] Bookmarklet.
[x] If get instead of post render a form
[ ] Source
[x] Creation time
- [ ] Type
- [ ] Process request
- [ ] Array of namespaced tags
- [ ] Page to show the latest 10 bookmarks
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

async function save_url(obj) {
    console.log("saving the url",obj)
    let item = {
        id:gen_id('bookmark'),
        created:new Date(),
        source:'web',
        type:'bookmark',
        tags:[],
        data:{
            status:'unprocessed',
            url:obj.url,
        }
    }
    console.log("item is",item)
    let pth = gen_path(item.created)
    let dir_path = path.resolve(path.join(DB_ROOT,pth))
    await fs.promises.mkdir(dir_path, {recursive: true})
    let file_path = path.join(dir_path,item.id+'.json')
    await fs.promises.writeFile(file_path,JSON.stringify(item))
    console.log("wrote file",file_path)
    return "all good"
}

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
    console.log("submitted",req.params,req.query,req.body)
    if(req.body.authcode !== settings.authcode) return fail(res,'bad auth code')
    if(!req.body.url) return fail(res,'missing url')
    if(!req.body.url.toLowerCase().startsWith('http')) return fail(res,'bad url')
    save_url(req.body.url)
        .then((msg:string)=>res.json({status:'success',message:msg}))
        .catch((e:Error) => res.json({status:'error',message:e.toString()}))
})
app.get('/',(req,res) => {
    res.send('hello world\n')
})
console.log("this is the servesr")

app.listen(PORT,() => {
    console.log(`sdtarted the server on port ${PORT}`)
})
