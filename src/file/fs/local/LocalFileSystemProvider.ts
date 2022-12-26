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
    Files,
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
import {mapCopyOptionsToFlags, mapOpenOptionsToFlags} from "./Helper";
import {LocalFileStore} from "./LocalFileStore";
import tmp from "tmp";
import {FileSystemProviders} from "@filesystems/core/file/spi";

/* It's a FileSystemProvider that provides a LocalFileSystem */
export class LocalFileSystemProvider extends AbstractFileSystemProvider {

    private readonly theFileSystem: LocalFileSystem;

    public constructor() {
        super();
        this.theFileSystem = new LocalFileSystem(this, os.homedir());
    }

    /**
     * It returns the file system
     * @returns The file system.
     */
    public getTheFileSystem(): LocalFileSystem {
        return this.theFileSystem;
    }

    /**
     * This function returns a promise that resolves to the file system.
     * @param {URL} url - The URL of the file system to be retrieved.
     * @returns The file system.
     */
    public async getFileSystem(url: URL): Promise<FileSystem> {
        this.checkURL(url);
        return this.theFileSystem;
    }

    /**
     * It converts a URL to a path
     * @param {URL} url - URL - the URL to convert to a Path
     * @returns A Path object.
     */
    public async getPath(url: URL): Promise<Path> {
        let urlCleaned: string;
        try {
            urlCleaned = jsurl.fileURLToPath(url);
        } catch (e) {
            throw new IllegalArgumentException(e ? e.toString() : "error while cleaning URL");
        }
        return this.theFileSystem.getPath(urlCleaned);
    }

    /**
     * It returns the scheme of the URL.
     * @returns The scheme of the URI.
     */
    public getScheme(): string {
        return "file";
    }

    /**
     * If the scheme is not the same as the scheme of the provider, throw an exception.
     * @param {URL} url - The URL to check.
     */
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

    /**
     * If the URL is invalid, throw an exception.
     * @param {URL} url - The URL of the file system to be created.
     * @param env - Map<string, unknown>
     */
    public async newFileSystemFromUrl(url: URL, env: Map<string, unknown>): Promise<FileSystem> {
        this.checkURL(url);
        throw new FileSystemAlreadyExistsException();
    }

    private static readonly BUFFER_SIZE: number = 8192;

    /**
     * It opens a file and returns the file descriptor
     * @param {Path} path - Path - the path to the file to be written to
     * @param {WritableStreamDefaultController} controller - WritableStreamDefaultController
     * @param {OpenOption[] | undefined} [options] - OpenOption[] | undefined
     * @returns The file descriptor.
     */
    private static start(path: Path, controller: WritableStreamDefaultController, options?: OpenOption[] | undefined): number {
        let fd = -1;
        try {
            fd = fs.openSync(path.toString(), mapOpenOptionsToFlags(options)); // TODO options
        } catch (e) {
            controller.error(e);
        }
        return fd;
    }

    /**
     * This function closes a file descriptor.
     * @param {number} fd - The file descriptor returned by fs.open()
     */
    private static close(fd: number): void {
        fs.closeSync(fd);
    }

    /**
     * It creates a new readable stream that reads from the file at the given path
     * @param {Path} path - The path to the file to open.
     * @param {OpenOption[]} [options] - OpenOption[]
     * @returns A ReadableStream<Uint8Array>
     */
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

    /**
     * It creates a new writable stream that writes to a file
     * @param {Path} path - The path to the file to open.
     * @param {OpenOption[]} [options] - OpenOption[]
     * @returns A WritableStream<Uint8Array>
     */
    protected newOutputStreamImpl(path: Path, options?: OpenOption[]): WritableStream<Uint8Array> {
        let fd = -1;
        return new WritableStream<Uint8Array>({
            start: controller => {
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

    private async setAttributes(path: Path, attrs: FileAttribute<unknown>[] | undefined) {
        if (attrs) {
            for (const value of attrs) {
                await this.setAttribute(path, value.name(), value.value());
            }
        }
    }

    /**
     * "Create a file at the given path, and if there are any attributes, set them."

     * @param {Path} path - The path to the file to create.
     * @param [attrs] - Array<FileAttribute<unknown>>
     */
    public async createFile(path: Path, attrs?: Array<FileAttribute<unknown>>): Promise<void> {
        await fsAsync.writeFile(path.toString(), "");
        await this.setAttributes(path, attrs);
    }

    /**
     * Create a directory at the given path, and set the given attributes on it.
     * @param {Path} dir - Path - The directory to create
     * @param [attrs] - An array of FileAttribute objects.
     */
    public async createDirectory(dir: Path, attrs?: Array<FileAttribute<unknown>>): Promise<void> {
        if (await Files.notExists(dir)) {
            await fsAsync.mkdir(dir.toString());
            await this.setAttributes(dir, attrs);
        }

    }

    async createSymbolicLink(link: Path, target: Path, attrs?: FileAttribute<unknown>[]): Promise<void> {
        await fsAsync.symlink(target.toString(), link.toString(), await Files.isDirectory(target) ? "dir" : "file");
        await this.setAttributes(link, attrs);
    }


    async createLink(link: Path, existing: Path): Promise<void> {
        await fsAsync.link(existing.toString(), link.toString());
    }

    async readSymbolicLink(link: Path): Promise<Path> {
        return LocalPath.parse(this.getTheFileSystem(), await fsAsync.readlink(link.toString()));
    }

    /**
     * This function returns a new directory stream for the given directory.
     *
     * @param {Path} dir - Path - The path to the directory to open
     * @param acceptFilter - (path?: Path) => boolean = () => true
     * @returns A new LocalDirectoryStream object.
     */
    public async newDirectoryStream(dir: Path, acceptFilter: (path?: Path) => boolean = () => true): Promise<DirectoryStream<Path>> {
        await this.checkAccess(dir, [AccessMode.READ]);
        return new LocalDirectoryStream(dir, acceptFilter);
    }

    /**
     * Get the FileStore for a given Path.
     *
     * @param {Path} path - The path to the file or directory.
     * @returns A FileStore object.
     */
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

    /**
     * It checks if the user has the specified access modes to the specified path
     * @param {Path} obj - Path - The path to check access for
     * @param {AccessMode[]} [modes] - An array of AccessMode enums. If this is null, then the default is to check for read
     * access.
     */
    public async checkAccess(obj: Path, modes?: AccessMode[]): Promise<void> { // TODO finish this
        const accessModesTocheck: AccessMode[] = [];
        if (modes && modes.length !== 0) {
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
        return name.startsWithStr(".");
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
        if (await Files.isDirectory(path)) {
            await fsAsync.rmdir(path.toURL(), {});
        } else if (await Files.isSymbolicLink(path)) {
            await fsAsync.unlink(path.toString());
        } else {
            await fsAsync.rm(path.toURL(), {});
        }
    }

    public async readAttributesByName(path: Path, name?: AttributeViewName, options?: LinkOption[]): Promise<BasicFileAttributes> {
        switch (name) {
            case undefined:
            case "basic":
            case "posix":
                return (this.getFileAttributeView(path, name, options) as BasicFileAttributeView).readAttributes();
            default:
                throw new UnsupportedOperationException();
        }
    }

    public getFileAttributeView(path: Path, name?: AttributeViewName, options?: LinkOption[]): FileAttributeView {
        const follow: boolean = followLinks(options);
        switch (name) {
            case undefined:
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

    public async createTempFile(path?: Path | undefined, prefix?: string | undefined, suffix?: string | undefined, attrs?: FileAttribute<unknown>[] | undefined): Promise<Path> {
        let tmpdir: Path;
        const fileSystem: FileSystem = this.theFileSystem;
        if (path) {
            tmpdir = path.toAbsolutePath();
        } else {
            tmpdir = LocalPath.parse(fileSystem, os.tmpdir());
        }
        await this.checkAccess(tmpdir, [AccessMode.WRITE]);
        await this.createDirectory(tmpdir);
        const tmpFileName: string = tmp.tmpNameSync({prefix, postfix: suffix, tmpdir: tmpdir.toString()});
        const localPath: Path = LocalPath.parse(fileSystem, tmpFileName);
        await this.checkAccess(tmpdir, [AccessMode.WRITE]);
        await this.createFile(localPath, attrs);
        return localPath;
    }

    public async createTempDirectory(path?: Path | undefined, prefix?: string | undefined, attrs?: FileAttribute<unknown>[] | undefined): Promise<Path> {
        let tmpdir: Path;
        const sep = this.theFileSystem.getSeparator();
        if (path) {
            tmpdir = path.toAbsolutePath();
        } else {
            tmpdir = LocalPath.parse(this.theFileSystem, os.tmpdir());
        }
        await this.checkAccess(tmpdir, [AccessMode.WRITE]);
        const newTmpDir: string = await fsAsync.mkdtemp(tmpdir.toString() + sep + prefix ?? "");
        return LocalPath.parse(this.theFileSystem, newTmpDir);
    }
}
