javascript:fetch('//docs.josh.earth/api/create', {
    method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json', 'db-username': 'josh', 'db-password': 'pass' },
    body: JSON.stringify({ type:'bookmark', data: { status:'unprocessed', url: document.location.href }})        }).then(resp => resp.json())            .then(res => console.log('yay', res))            .catch(e => console.error('error', e))



javascript:var opts = {            method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json', 'db-username': 'josh', 'db-password': 'pass' },            body: JSON.stringify({ type:'bookmark', data: { status:'unprocessed', url: document.location.href }})        };        console.log("opts")        fetch('//docs.josh.earth/api/create',opts)            .then(resp => resp.json())            .then(res => console.log('yay', res))            .catch(e => console.error('error', e))
