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

import {AbstractFileSystemProvider} from "@filesystems/core/file/fs/abstract";
import {LocalFileSystem} from "./LocalFileSystem";
import {
    AccessMode,
    CopyOption,
    DirectoryStream,
    FileStore,
    FileSystem,
    followLinks,
    LinkOption,
    OpenOption,
    Path,
} from "@filesystems/core/file";
import * as jsurl from "url";
import fs from "fs";
import fsAsync from "fs/promises";
import {FileSystemProviders} from "@filesystems/core/file/spi";
import {IllegalArgumentException, UnsupportedOperationException} from "@filesystems/core/exception";
import {AccessDeniedException, FileSystemAlreadyExistsException} from "@filesystems/core/file/exception";
import os from "os";
import {
    AttributeViewName,
    BasicFileAttributes,
    BasicFileAttributeView,
    FileAttribute,
    FileAttributeView,
} from "@filesystems/core/file/attribute";
import {LocalDirectoryStream} from "./LocalDirectoryStream";
import {LocalPath} from "./LocalPath";
import {LocalBasicFileAttributesView, LocalFileOwnerAttributeView} from "./view";
import {LocalPosixFileAttributeView} from "./view/LocalPosixFileAttributeView";
import {ReadableStream, TextDecoderStream, TextEncoderStream, WritableStream} from "stream/web";
import {mapCopyOptionsToFlags, mapOpenOptionsToFlags} from "./Helper";
import {LocalFileStore} from "./LocalFileStore";

/* It's a FileSystemProvider that provides a LocalFileSystem */
export class LocalFileSystemProvider extends AbstractFileSystemProvider {
    private readonly theFileSystem: LocalFileSystem;

    public constructor() {
        super();
        this.theFileSystem = new LocalFileSystem(this, os.homedir());
    }

    public getTheFileSystem(): LocalFileSystem {
        return this.theFileSystem;
    }

    public async getFileSystem(url: URL): Promise<FileSystem> {
        this.checkURL(url);
        return this.theFileSystem;
    }

    public async getPath(url: URL): Promise<Path> {
        return this.theFileSystem.getPath(jsurl.fileURLToPath(url));
    }

    public getScheme(): string {
        return "file";
    }

    private checkURL(url: URL): void {
        const scheme = FileSystemProviders.cleanScheme(url.protocol);
        if (scheme !== this.getScheme().toUpperCase()) {
            throw new IllegalArgumentException("URI does not match this provider");
        }
        const path = url.pathname;
        if (path == null) {
            throw new IllegalArgumentException("Path component is undefined");
        }
        if (path !== "/") {
            throw new IllegalArgumentException("Path component should be '/'");
        }
    }

    public async newFileSystemFromUrl(url: URL, env: Map<string, unknown>): Promise<FileSystem> {
        this.checkURL(url);
        throw new FileSystemAlreadyExistsException();
    }

    private static readonly BUFFER_SIZE: number = 8192;

    public override newTextDecoder(charsets: string): TextDecoderStream {
        return new TextDecoderStream(charsets);
    }

    public override newTextEncoder(): TextEncoderStream {
        return new TextEncoderStream();
    }

    private static start(path: Path, controller: WritableStreamDefaultController, options?: OpenOption[] | undefined): number {
        let fd = -1;
        try {
            fd = fs.openSync(path.toString(), mapOpenOptionsToFlags(options)); // TODO options
        } catch (e) {
            controller.error(e);
        }
        return fd;
    }

    private static close(fd: number): void {
        fs.closeSync(fd);
    }

    protected newInputStreamImpl(path: Path, options?: OpenOption[]): ReadableStream<Uint8Array> {
        let fd = -1;
        return new ReadableStream<Uint8Array>({
            start: controller => {
                // @ts-expect-error jeej
                fd = LocalFileSystemProvider.start(path, controller, options);
            },
            pull: controller => {
                try {
                    const buffer: Uint8Array = new Uint8Array(LocalFileSystemProvider.BUFFER_SIZE);
                    const bytesRead: number = fs.readSync(fd, buffer, 0, LocalFileSystemProvider.BUFFER_SIZE, null);
                    if (bytesRead > 0) {
                        controller.enqueue(buffer.slice(0, bytesRead));
                    } else {
                        controller.close();
                    }
                } catch (e) {
                    controller.error(e);
                }
            },
            cancel: _ => LocalFileSystemProvider.close(fd),
        });
    }

    protected newOutputStreamImpl(path: Path, options?: OpenOption[]): WritableStream<Uint8Array> {
        let fd = -1;
        return new WritableStream<Uint8Array>({
            start: controller => {
                // @ts-expect-error jeej
                fd = LocalFileSystemProvider.start(path, controller, options);
            },
            write: (chunk, controller) => {
                try {
                    fs.writeSync(fd, chunk);
                } catch (e) {
                    controller.error(e);
                }
            },
            close: () => LocalFileSystemProvider.close(fd),
            abort: reason => {
                LocalFileSystemProvider.close(fd);
                // TODO search if there is another thing to do
            },
        });
    }

    public async createFile(path: Path, attrs?: Array<FileAttribute<unknown>>): Promise<void> {
        await fsAsync.writeFile(path.toString(), "");
        if (attrs != null) {
            for (const value of attrs) {
                await this.setAttribute(path, value.name(), value.value());
            }
        }
    }

    public async createDirectory(dir: Path, attrs?: Array<FileAttribute<unknown>>): Promise<void> {
        await fsAsync.mkdir(dir.toString());
        if (attrs != null) {
            for (const value of attrs) {
                await this.setAttribute(dir, value.name(), value.value());
            }
        }
    }

    public async newDirectoryStream(dir: Path, acceptFilter: (path?: Path) => boolean = () => true): Promise<DirectoryStream<Path>> {
        await this.checkAccess(dir, [AccessMode.READ]);
        return new LocalDirectoryStream(dir, acceptFilter);
    }

    public async getFileStore(path: Path): Promise<FileStore> {
        const fileSystem: FileSystem = path.getFileSystem();
        const fileStoresPromise: Promise<Iterable<FileStore>> = fileSystem.getFileStores();
        const absolutePath: Path = path.toAbsolutePath();
        let mountPointPathFound: Path | null = null;
        let fileStoreFound: FileStore | null = null;
        const fileStores: Iterable<LocalFileStore> = (await fileStoresPromise) as Iterable<LocalFileStore>;
        for (const currentFileStore of fileStores) {
            for (const mountPointPath of currentFileStore.mountPoints()) {
                if (absolutePath.startsWith(mountPointPath)) {
                    if (!mountPointPathFound || mountPointPath.startsWith(mountPointPathFound)) {
                        fileStoreFound = currentFileStore;
                        mountPointPathFound = mountPointPath;
                    }
                }
            }
        }
        if (!fileStoreFound) {
            throw new IllegalArgumentException("Path does not have a FileStore");
        }
        return fileStoreFound;
    }

    public async checkAccess(obj: Path, modes?: AccessMode[]): Promise<void> { // TODO finish this
        const accessModesTocheck: AccessMode[] = [];
        if (modes != null) {
            accessModesTocheck.push(...modes);
        } else {
            accessModesTocheck.push(AccessMode.READ);
        }
        const path = obj.toString();
        try {
            await Promise.all(accessModesTocheck.map(async mode => {
                switch (mode) {
                    case AccessMode.READ:
                        return fsAsync.access(path, fs.constants.R_OK);
                    case AccessMode.WRITE:
                        return fsAsync.access(path, fs.constants.W_OK);
                    case AccessMode.EXECUTE:
                        return fsAsync.access(path, fs.constants.X_OK);
                }
            }));
        } catch (err) {
            throw new AccessDeniedException(path);
        }
    }

    public async copy(source: Path, target: Path, options?: CopyOption[]): Promise<void> {
        await fsAsync.copyFile(source.toString(), target.toString(), mapCopyOptionsToFlags(options));
    }

    public async move(source: Path, target: Path, options?: CopyOption[]): Promise<void> {
        try {
            await this.copy(source, target, options);
            await this.delete(source);
        } catch (e) {
            await this.deleteIfExists(target);
        }
    }

    public async isHidden(obj: Path): Promise<boolean> {
        await this.checkAccess(obj);
        const name = obj.getFileName();
        if (name == null) {
            return false;
        }
        return await name.startsWithStr(".");
    }

    public async isSameFile(obj1: Path, obj2: Path): Promise<boolean> {
        if (obj1.equals(obj2)) {
            return true;
        }
        if (!(obj1 instanceof LocalPath) || !(obj2 instanceof LocalPath)) {
            return false;
        }
        await Promise.all([this.checkAccess(obj1), this.checkAccess(obj2)]);

        const [attrs1, attrs2] = await Promise.all([
            this.readAttributesByName(obj1),
            this.readAttributesByName(obj2),
        ]);

        return attrs1.fileKey() === attrs2.fileKey();
    }

    public async delete(path: Path): Promise<void> {
        await this.checkAccess(path, [AccessMode.WRITE]);
        await fsAsync.rm(path.toString(), {});
    }

    public async readAttributesByName(path: Path, name?: AttributeViewName, options?: LinkOption[]): Promise<BasicFileAttributes> {
        switch (name) {
            case "basic":
            case "posix":
                return await (this.getFileAttributeView(path, name, options) as BasicFileAttributeView).readAttributes();
            default:
                throw new UnsupportedOperationException();
        }
    }

    public getFileAttributeView(path: Path, name?: AttributeViewName, options?: LinkOption[]): FileAttributeView {
        const follow: boolean = followLinks(options);
        switch (name) {
            case "basic":
                return new LocalBasicFileAttributesView(path as LocalPath, follow);
            case "owner":
                return new LocalFileOwnerAttributeView(path as LocalPath, follow);
            case "posix":
                return new LocalPosixFileAttributeView(path as LocalPath, follow);
            default:
                throw new UnsupportedOperationException();
        }
    }
}
