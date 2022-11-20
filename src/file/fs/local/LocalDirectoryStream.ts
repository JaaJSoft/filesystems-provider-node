/*
 * FileSystems - FileSystem abstraction for JavaScript
 * Copyright (C) 2022 JaaJSoft
 *
 * this program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as fs from "fs";
import {LocalPath} from "./LocalPath";
import {DirectoryStream, Path} from "@filesystems/core/file";
import {IOException} from "@filesystems/core/exception";
import {DirectoryIteratorException} from "@filesystems/core/file/exception";

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
        return files.map(value => LocalPath.parse(fileSystem, value.name)).filter(value => {
            try {
                return acceptFilter(value);
            } catch (e) {
                if (e instanceof IOException) {
                    throw new DirectoryIteratorException(e);
                }
                throw e;
            }
        });
    }

    public [Symbol.asyncIterator](): AsyncIterator<Path> {
        const pathIterator: IterableIterator<Path> = this.readDir(this.dir, this.acceptFilter)[Symbol.iterator]();
        return new class implements AsyncIterator<Path> {
            public async next(...args: [] | [undefined]): Promise<IteratorResult<Path>> {
                return pathIterator.next(...args);
            }
        };
    }

    public close(): void {
        // nothing to close because the stream is not lazy
    }

}
