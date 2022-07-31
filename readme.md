
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


run the local processor with
```shell
npm run run-processor
```
