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

import {LocalPath} from "../LocalPath";
import fs from "fs";
import {getPathStats} from "../Helper";
import {AbstractBasicFileAttributeView} from "@filesystems/core/file/fs/abstract";
import {
    AttributeViewName,
    BasicFileAttributes,
    BasicFileAttributeView,
    FileTime,
} from "@filesystems/core/file/attribute";
import {IOException} from "@filesystems/core/exception";
import {AccessMode} from "@filesystems/core/file";
import {floatToInt} from "@filesystems/core/utils";
import fsAsync from "fs/promises";

export class LocalBasicFileAttributesView extends AbstractBasicFileAttributeView implements BasicFileAttributeView {
    private readonly path: LocalPath;
    private readonly followsLinks: boolean;

    constructor(path: LocalPath, followsLinks: boolean) {
        super();
        this.path = path;
        this.followsLinks = followsLinks;
    }

    public name(): AttributeViewName {
        return "basic";
    }

    public async readAttributes(): Promise<BasicFileAttributes> {
        try {
            const stats = await getPathStats(this.path, this.followsLinks);
            return this.buildAttributes(stats);
        } catch (e) {
            throw new IOException((e as Error).message);
        }
    }

    public buildAttributes(stats: fs.Stats): BasicFileAttributes {
        return new class implements BasicFileAttributes {
            public creationTime(): FileTime {
                return FileTime.fromMillis(Number(stats.birthtimeMs));
            }

            public fileKey(): unknown {
                return stats.dev + stats.ino;
            }

            public isDirectory(): boolean {
                return stats.isDirectory();
            }

            public isOther(): boolean {
                return !this.isDirectory() && !this.isRegularFile() && !this.isSymbolicLink();
            }

            public isRegularFile(): boolean {
                return stats.isFile();
            }

            public isSymbolicLink(): boolean {
                return stats.isSymbolicLink();
            }

            public lastAccessTime(): FileTime {
                return FileTime.fromMillis(Number(stats.atimeMs));
            }

            public lastModifiedTime(): FileTime {
                return FileTime.fromMillis(Number(stats.mtimeMs));
            }

            public size(): bigint {
                return BigInt(stats.size);
            }
        };
    }

    public async setTimes(lastModifiedTime?: FileTime, lastAccessTime?: FileTime, createTime?: FileTime): Promise<void> {
        await this.path.getFileSystem().provider().checkAccess(this.path, [AccessMode.WRITE]);
        if (createTime) {
            console.warn("Node provider : not possible to update creationTime");
        }
        const fileAttributes: BasicFileAttributes = await this.readAttributes();
        await fsAsync.lutimes(
            this.path.toString(),
            lastAccessTime ? floatToInt(lastAccessTime.toSeconds()) : floatToInt(fileAttributes.lastAccessTime().toSeconds()),
            lastModifiedTime ? floatToInt(lastModifiedTime.toSeconds()) : floatToInt(fileAttributes.lastModifiedTime().toSeconds()),
        );
    }

}
