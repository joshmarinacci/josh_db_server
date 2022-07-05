/*

First version of url capture db. Blog with before and after notes. Also .md in the repo. Use my existing blog to post it.

- [ ] Service writes each message to disk in a fixed naming dir structure
- [ ] Submit a raw note or todo
- [ ] Submit a URL to be analyzed
- [ ] Passcode for temporary auth
- [ ] Bookmarklet.
- [ ] If get instead of post render a form
- [ ] Source
- [ ] Creation time
- [ ] Type
- [ ] Process request
- [ ] Array of namespaced tags
- [ ] Page to show the latest 10 bookmarks
- [ ] All code should be as simple and clear as possible.
- [ ] Code for only 60 minutes

 */

import express from "express"

const app = express()
const PORT = 3000
app.get('/submit/bookmark',(req,res)=>{
    res.sendFile("form.html",{root:'resources'})
})
app.post('/submit/bookmark',(req,res)=>{

})
app.get('/',(req,res) => {
    res.send('hello world\n')
})
console.log("this is the servesr")

app.listen(PORT,() => {
    console.log(`sdtarted the server on port ${PORT}`)
})
