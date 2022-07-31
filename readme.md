
checkout the code and cd into the main dir


create a file called settings.json like this:

```json
{
	"port": 8765,
	"rootdir": "DB",
	"apipath": "/api",
	"staticpath": "/static",
	"staticdir": "./resources",
	"users": [
		{
			"name":"user1",
			"pass":"pass1"
		},
		{
			"name": "user2",
			"pass": "pass2"
		}
	]
}

```

```shell
npm install
npm run build
npm run start-server 
```


javascript:fetch('//docs.josh.earth/api/create', { method: 'POST', mode: 'no-cors', headers: {                'Content-Type': 'application/json','db-username': 'josh','db-password': 'pass'},
body: JSON.stringify({ 
type:'bookmark', 
data: { status:'unprocessed', url: document.location.href }
})
}).then(resp => resp.json())            .then(res => console.log('yay', res))            .catch(e => console.error('error', e))
