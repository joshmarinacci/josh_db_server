import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import assert from "assert";

export type Visitor = (file) => Promise<void>;

export async function getFiles(dir, visitor: Visitor) {
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
            return stats.isDirectory() ? getFiles(f, visitor) : visitor(f);
        }));
}


export function gen_id(bookmark: string) {
    return `${bookmark}_${Math.floor(Math.random() * 10_000_000)}`
}

export function gen_path(d: Date) {
    return `${d.getUTCFullYear()}/${d.getUTCMonth()}/${d.getUTCDate()}/${d.getUTCHours()}/${d.getUTCMinutes()}`
}

export async function json_get(url:string):Promise<any> {
    return fetch(url).then(d => d.json())
}
export async function json_post(url:string,payload:any):Promise<any> {
    console.log("posting to",url)
    console.log("payload",payload)
    return fetch(url,{
        method:'POST',
        headers: {
            'Content-Type':'application/json',
        },
        body:JSON.stringify(payload)
    }).then(r => r.json())
}

export async function read_json_file(file):Promise<any> {
    let raw = await fs.promises.readFile(file)
    return JSON.parse(raw.toString())
    // const settings = JSON.parse(fs.readFileSync("./settings.json").toString())
}

/*
* File exists without throwing an error. Just a boolean. Confirm it is readable, alt writable, alt dir we can read, alt dir we can write from?
* get JSON from URL
* post JSON to URL
* exec script and wait for result or error using throw
* fetch git repo, new clone or else pull for changes. Use default head
* all should throw errors except file exists
* create image, call function, save image to PNG at path, creating dir if needed.
* mkdirs always recursive, never fails
* logger
	* with levels we can control (delegates to the correct console.log. as a global for the current module:  log.info, log.warn, log.error,
	* logger can track indents and outdents. Default tab is 4 spaces
	* can change levels at any time
* get recursive contents of dir with full relative path as a flat array, don’t include dirs by default. Filter by extension. Don’t recurse into hidden dirs by default.
* copy
	* file to new dir, if changed by timestamp
	* file to new dir with new name, if changed by timestamp
* standard LERP and min/max and generate uuid()

 */

export interface Logger {
    info(...args: any[]):void

    error(...args: any[]):void

    warn(...args: any[]):void

    assert(cond: boolean, msg: string): void;
}

class ConsoleLogger implements Logger {
    error(...args: any[]) {
        console.error("ERROR", ...args)
    }

    info(...args: any[]) {
        console.info("INFO", ...args)
    }

    warn(...args: any[]) {
        console.warn("WARN", ...args)
    }

    assert(cond: boolean, msg: string): void {
        assert(cond,msg)
        console.log("ASSERT",msg)
    }

}

export function make_logger(): Logger {
    return new ConsoleLogger()
}


export function mkdir(dir): Promise<string> {
    return fs.promises.mkdir(dir, {recursive: true})
}

export async function file_readable(SETTINGS: string): Promise<boolean> {
    try {
        await fs.promises.stat(SETTINGS)
        return true
    } catch (e) {
        return false
    }
}
