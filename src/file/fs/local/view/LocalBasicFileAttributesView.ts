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

    public readAttributes(): BasicFileAttributes {
        try {
            const stats = getPathStats(this.path, this.followsLinks);
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

            public fileKey(): Object {
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

    public setTimes(lastModifiedTime?: FileTime, lastAccessTime?: FileTime, createTime?: FileTime): void {
        this.path.getFileSystem().provider().checkAccess(this.path, [AccessMode.WRITE]);
        if (createTime) {
            console.warn("Node provider : not possible to update creationTime");
        }
        const fileAttributes: BasicFileAttributes = this.readAttributes();
        fs.lutimesSync(
            this.path.toString(),
            lastAccessTime ? floatToInt(lastAccessTime.toSeconds()) : floatToInt(fileAttributes.lastAccessTime().toSeconds()),
            lastModifiedTime ? floatToInt(lastModifiedTime.toSeconds()) : floatToInt(fileAttributes.lastModifiedTime().toSeconds()),
        );
    }

}
