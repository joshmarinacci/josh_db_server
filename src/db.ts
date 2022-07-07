import {gen_id, gen_path, getFiles} from "./util.js";
import fs from "fs";
import path from "path";


type Item = {
    id:string,
    created:Date,
    source:string,
    type:string,
    tags:string[],
    supersedes?:string,
    data:any,
}
export class DB {
    private root_dir: string;
    private items: Item[];
    constructor(root_dir:string) {
        this.root_dir = root_dir
        this.items = []
    }

    insert_from_disk(item: Item) {
        this.items.push(item)
    }
    insert_to_disk(item:Item) {

    }

    search_unprocessed():Item[] {
        return this.items.filter(item => {
            if(item.type === 'bookmark') {
                if(item.data.status === 'unprocessed') {
                    return true
                }
            }
            return false
        })
    }

    search_processed() {
        return this.items.filter(item => {
            if (item.type === 'bookmark') {
                if (item.data.status === 'processed') {
                    return true
                }
            }
        })
    }

    async save_processed(obj) {
        let item:Item = {
            id: gen_id('bookmark'),
            created: new Date(),
            source: 'web',
            type: 'bookmark',
            tags: [],
            supersedes: obj.original,
            data: {
                status: 'processed',
                url: obj.url,
                title: obj.title,
                byline: obj.byline,
                excerpt: obj.excerpt,
                siteName: obj.siteName,
            }
        }
        console.log("final obj to store", item)
        let pth = gen_path(item.created)
        let dir_path = path.resolve(path.join(this.root_dir, pth))
        await fs.promises.mkdir(dir_path, {recursive: true})
        let file_path = path.join(dir_path, item.id + '.json')
        await fs.promises.writeFile(file_path, JSON.stringify(item))
        console.info("wrote file", file_path)
        this.items.push(item)
    }

    async save_unprocessed(url) {
        let item:Item = {
            id: gen_id('bookmark'),
            created: new Date(),
            source: 'web',
            type: 'bookmark',
            tags: [],
            data: {
                status: 'unprocessed',
                url: url,
            }
        }
        console.info("item is", item)
        let pth = gen_path(item.created)
        let dir_path = path.resolve(path.join(this.root_dir, pth))
        await fs.promises.mkdir(dir_path, {recursive: true})
        let file_path = path.join(dir_path, item.id + '.json')
        await fs.promises.writeFile(file_path, JSON.stringify(item))
        console.info("wrote file", file_path)
        this.items.push(item)
    }
}
export async function load_db(root) {
    let db = new DB(root)
    await getFiles(root, async (f) => {
        console.log("visiting", f)
        let buf = await fs.promises.readFile(f);
        let item = JSON.parse(buf.toString())
        console.log("item", item.id)
        db.insert_from_disk(item)
    })
    return db
}
