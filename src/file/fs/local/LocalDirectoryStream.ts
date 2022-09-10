import * as fs from "fs";
import {LocalPath} from "./LocalPath";
import {DirectoryStream, Path} from "@filesystems/core/file";

export class LocalDirectoryStream implements DirectoryStream<Path> {
    private readonly dir: Path;
    private readonly acceptFilter: (path: Path) => boolean;

    constructor(dir: Path, acceptFilter: (path: Path) => boolean) {
        this.dir = dir;
        this.acceptFilter = acceptFilter;
    }

    private readDir(dir: Path, acceptFilter: (path: Path) => boolean): Path[] {
        const files = fs.readdirSync(dir.toString(), {withFileTypes: true, encoding: "utf-8"});
        const fileSystem = dir.getFileSystem();
        return files.map(value => LocalPath.parse(fileSystem, value.name)).filter(acceptFilter);
    }

    public [Symbol.asyncIterator](): AsyncIterator<Path> {
        const pathIterator: IterableIterator<Path> = this.readDir(this.dir, this.acceptFilter)[Symbol.iterator]();
        return new class implements AsyncIterator<Path> {
            public next(...args: [] | [undefined]): Promise<IteratorResult<Path, any>> {
                return Promise.resolve(pathIterator.next(...args));
            }
        };
    }

    public close(): void {
        // nothing to close because the stream is not lazy
    }

}
