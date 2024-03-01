/*
 * FileSystems - FileSystem abstraction for JavaScript
 * Copyright (C) 2024 JaaJSoft
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

import {LocalPathType} from "./LocalPathType";
import * as jsurl from "url";
import fs from "fs";
import {
    FileSystem,
    LinkOption,
    Path,
    WatchEventKind,
    WatchEventModifier,
    WatchKey,
    WatchService
} from "@filesystems/core/file";
import {InvalidPathException, ProviderMismatchException} from "@filesystems/core/file/exception";
import {Objects} from "@filesystems/core/utils";
import * as pathFs from "path";
import {IllegalArgumentException} from "@filesystems/core/exception";
import os from "os";
import {PollingWatchService} from "../PollingWatchService";

/* `LocalPath` is a class that represents a path on the local file system. */
export class LocalPath extends Path {

    // root component (may be empty)
    private readonly root: string;
    private readonly path: string;
    private readonly type: LocalPathType;
    private readonly fileSystem: FileSystem;
    // offsets into name components (computed lazily)
    private offsets: number[] | undefined;

    public constructor(fileSystem: FileSystem, type: LocalPathType, root: string, path: string) {
        super();
        this.fileSystem = fileSystem;
        this.type = type;
        this.root = root;
        this.path = path;
    }

    /**
     * It takes a path and returns a LocalPath object
     * @param {FileSystem} fileSystem - The file system that the path is on.
     * @param {string} path - The path to parse.
     * @returns A new LocalPath object.
     */
    public static parse(fileSystem: FileSystem, path: string): LocalPath {
        const parse = pathFs.parse(path);
        return LocalPath.pathFromJsPath(parse, fileSystem, LocalPathType.RELATIVE);
    }

    public static toLocalPath(path: Path): LocalPath {
        Objects.requireNonNullUndefined(path);
        if (!(path instanceof LocalPath)) {
            throw new ProviderMismatchException();
        }
        return path;
    }

    /**
     * > It returns the file name of the path
     * @returns The file name of the path.
     */
    public getFileName(): Path | null {
        const len = this.path.length;
        // represents empty path
        if (len == 0)
            return this;
        // represents root component only
        if (this.root.length == len)
            return null;
        let off = this.path.lastIndexOf(this.fileSystem.getSeparator());
        if (off < this.root.length)
            off = this.root.length;
        else
            off++;
        return new LocalPath(this.getFileSystem(), LocalPathType.RELATIVE, "", this.path.substring(off));
    }

    /* It returns the file system that the path is on. */
    public getFileSystem(): FileSystem {
        return this.fileSystem;
    }

    public getName(index: number): Path {
        this.offsets = this.initOffsets();
        if (index < 0 || index >= this.offsets.length)
            throw new IllegalArgumentException();
        return new LocalPath(this.getFileSystem(), LocalPathType.RELATIVE, "", this.elementAsString(index));
    }

    public getNameCount(): number {
        this.offsets = this.initOffsets();
        return this.offsets.length;
    }

    /**
     * It returns the parent path of the current path.
     * @returns The parent of the path.
     */
    public getParent(): Path | null {
        // represents root component only
        if (this.root.length == this.path.length)
            return null;
        const off = this.path.lastIndexOf(this.fileSystem.getSeparator());
        if (off < this.root.length)
            return this.getRoot();
        else
            return new LocalPath(
                this.getFileSystem(),
                this.type,
                this.root,
                this.path.substring(0, off),
            );
    }

    public getRoot(): Path | null {
        if (this.root.length === 0)
            return null;
        return new LocalPath(this.getFileSystem(), this.type, this.root, this.root);
    }

    public getType(): LocalPathType {
        return this.type;
    }

    public isAbsolute(): boolean {
        return this.type === LocalPathType.ABSOLUTE || this.type === LocalPathType.UNC;
    }

    private isEmpty(): boolean {
        return this.path.length == 0;
    }

    public normalize(): Path {
        let norm = pathFs.normalize(this.toString());
        if (norm.endsWith(norm + ".") || norm.endsWith(":.") || (norm.length === 1 && norm === ".")) {
            norm = norm.substring(0, norm.length - 1);
        }
        return LocalPath.parse(this.fileSystem, norm);
    }

    public relativize(other: Path): Path {
        const child: LocalPath = LocalPath.toLocalPath(other);
        if (this.equals(child)) {
            return this.emptyPath();
        }
        if (this.type != child.type) {
            throw new IllegalArgumentException("'other' is different type of Path");
        }
        // can only relativize paths if root component matches
        if (this.root.toUpperCase() !== child.root.toUpperCase()) {
            throw new IllegalArgumentException("'other' has different root");
        }
        // this path is the empty path
        if (this.isEmpty()) {
            return child;
        }

        let s: string;
        try {
            s = pathFs.relative(this.toString(), other.toString());
        } catch (e) {
            throw new IllegalArgumentException();
        }
        return LocalPath.parse(this.fileSystem, s);

    }

    public resolve(other: Path): Path {
        return LocalPath.parse(this.fileSystem, pathFs.resolve(this.toString(), other.toString()));
    }

    public startsWith(obj: Path): boolean {
        let other: LocalPath | undefined;
        try {
            other = LocalPath.toLocalPath(obj);
        } catch (e) {
            if (e instanceof ProviderMismatchException) {
                return false;
            } else {
                throw e;
            }
        }
        if (!other) {
            return false;
        }

        // if this path has a root component the given path's root must match
        if (this.root.toUpperCase() !== other.root.toUpperCase()) {
            return false;
        }

        // empty path starts with itself
        if (other.isEmpty()) {
            return this.isEmpty();
        }
        if (this.equals(other)) {
            return true;
        }
        // roots match so compare elements
        const thisCount = this.getNameCount();
        let otherCount = other.getNameCount();
        if (otherCount <= thisCount) {
            while (--otherCount >= 0) {
                const thisElement = this.elementAsString(otherCount);
                const otherElement = other.elementAsString(otherCount);
                if (thisElement.toUpperCase() !== otherElement.toUpperCase()) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    public endWith(obj: Path): boolean {
        let other: LocalPath | undefined;
        try {
            other = LocalPath.toLocalPath(obj);
        } catch (e) {
            if (e instanceof ProviderMismatchException) {
                return false;
            }
        }
        if (!other) {
            return false;
        }
        // other path is longer
        if (other.path.length > this.path.length) {
            return false;
        }

        // empty path ends in itself
        if (other.isEmpty()) {
            return this.isEmpty();
        }

        const thisCount = this.getNameCount();
        let otherCount = other.getNameCount();

        // given path has more elements that this path
        if (otherCount > thisCount) {
            return false;
        }

        // compare roots
        if (other.root.length > 0) {
            if (otherCount < thisCount)
                return false;
            if (this.root.toUpperCase() !== other.root.toUpperCase())
                return false;
        }

        // match last 'otherCount' elements
        const off = thisCount - otherCount;
        while (--otherCount >= 0) {
            const thisElement = this.elementAsString(off + otherCount);
            const otherElement = other.elementAsString(otherCount);
            if (thisElement.toUpperCase() !== otherElement.toUpperCase())
                return false;
        }
        return true;
    }

    public subpath(beginIndex: number, endIndex: number): Path {
        this.offsets = this.initOffsets();
        if (beginIndex < 0)
            throw new IllegalArgumentException();
        if (beginIndex >= this.offsets.length)
            throw new IllegalArgumentException();
        if (endIndex > this.offsets.length)
            throw new IllegalArgumentException();
        if (beginIndex >= endIndex)
            throw new IllegalArgumentException();
        let path = "";
        for (let i = beginIndex; i < endIndex; i++) {
            path += this.elementAsString(i);
            if (i != (endIndex - 1))
                path += this.getFileSystem().getSeparator();
        }
        return new LocalPath(this.getFileSystem(), LocalPathType.RELATIVE, "", path);
    }

    public toAbsolutePath(): Path {
        if (this.isAbsolute()) {
            return this;
        }
        const resolvedPath = pathFs.resolve(this.path);
        const absolutePath = pathFs.parse(resolvedPath);
        return LocalPath.pathFromJsPath(absolutePath, this.getFileSystem(), LocalPathType.ABSOLUTE);
    }

    public toRealPath(options?: LinkOption[]): Path {
        // TODO handle options
        if (options) {
            console.warn("LinkOptions are ignored");
        }
        const realpath = fs.realpathSync(this.path);
        const realPathParsed = pathFs.parse(realpath);
        return LocalPath.pathFromJsPath(realPathParsed, this.getFileSystem(), LocalPathType.ABSOLUTE);
    }

    public toURL(): URL {
        const path: string = this.toAbsolutePath().toString();
        return jsurl.pathToFileURL(path);
    }

    public register(watcher: WatchService, events: WatchEventKind<unknown>[], modifier?: WatchEventModifier[] | undefined): Promise<WatchKey> {
        if (!(watcher instanceof PollingWatchService))
            throw new ProviderMismatchException();

        return watcher.register(this, events, modifier);
    }

    public toString(): string {
        return this.path;
    }

    public compareTo(other: Path): number {
        const s1: string = this.path;
        const s2: string = (other as LocalPath).path;
        const n1 = s1.length;
        const n2 = s2.length;
        const min = Math.min(n1, n2);
        for (let i = 0; i < min; i++) {
            let c1: string = s1.charAt(i);
            let c2: string = s2.charAt(i);
            if (c1 != c2) {
                c1 = c1.toUpperCase();
                c2 = c2.toUpperCase();
                if (c1 != c2) {
                    return c1.charCodeAt(0) - c2.charCodeAt(0);
                }
            }
        }
        return n1 - n2;
    }

    public equals(other: Path): boolean {
        if (other && (other instanceof LocalPath)) {
            return this.compareTo(other) === 0;
        }
        return false;
    }

    private static cleanSeparator(path: string): string {
        const p = path.replaceAll("\\", "/").replace(/([^:]\/)\/+/g, "$1");
        if (os.platform() === "win32") {
            return p.replaceAll("/", "\\").replaceAll(":\\\\", ":\\");
        } else if (p.startsWith("/")) {
            return p.replaceAll("//", "/");
        }
        return p;
    }

    private static pathFromJsPath(path: pathFs.ParsedPath, fileSystem: FileSystem, pathType: LocalPathType) {// TODO refactor
        const separator: string = fileSystem.getSeparator();
        const dir: string = this.cleanSeparator(path.dir);
        const base: string = path.base;
        let root: string = this.cleanSeparator(path.root);
        let newPath = dir.endsWith(separator) || base.length === 0 || dir.length === 0 || dir.toUpperCase() === root.toUpperCase() ? dir + base : dir + separator + base;
        if (root.toUpperCase() !== newPath.toUpperCase() && newPath.endsWith(separator)) {
            newPath = newPath.substring(0, newPath.length - 1);
        } else if (root.toUpperCase() === newPath.toUpperCase() && root.length > 2 && !newPath.endsWith(separator)) {
            newPath += separator;
            if (!root.endsWith(separator)) {
                root += separator;
            }
        }

        if (newPath.startsWith("\\\\")) {
            pathType = LocalPathType.UNC;
        } else if (newPath.startsWith("/") || (newPath.length >= 3 && newPath.charAt(1) === ":" && newPath.charAt(2) === separator)) {
            pathType = LocalPathType.ABSOLUTE;
        } else if ((newPath.length >= 2 && newPath.charAt(1) === ":" && newPath.charAt(2) !== separator)) {
            pathType = LocalPathType.DRIVE_RELATIVE;
        }
        this.checkPathCharacters(newPath.substring(root.length));
        return new LocalPath(fileSystem, pathType, root, newPath); // TODO set type
    }

    private static checkPathCharacters(path: string): void {
        for (const pathElement of path) {
            if (LocalPath.isInvalidPathChar(pathElement)) {
                throw new InvalidPathException(path, "invalid char : " + pathElement);
            }
        }
    }

    // generate offset array
    private initOffsets(): number[] {
        if (!this.offsets) {
            const list = [];
            if (this.isEmpty()) {
                // empty path considered to have one name element
                list.push(0);
            } else {
                const separator: string = this.fileSystem.getSeparator();
                let start = this.root.length;
                let off = this.root.length;
                while (off < this.path.length) {
                    if (this.path.charAt(off) !== separator) {
                        off++;
                    } else {
                        list.push(start);
                        start = ++off;
                    }
                }
                if (start != off)
                    list.push(start);
            }
            if (!this.offsets)
                this.offsets = list;

        }
        return this.offsets;
    }

    private elementAsString(i: number): string {
        this.offsets = this.initOffsets();
        if (i === (this.offsets.length - 1))
            return this.path.substring(this.offsets[i]);
        return this.path.substring(this.offsets[i], this.offsets[i + 1] - 1);
    }

    public valueOf(): unknown { // TODO
        return this.path.valueOf();
    }

    private emptyPath(): LocalPath {
        return new LocalPath(this.getFileSystem(), LocalPathType.RELATIVE, "", "");
    }

    /**
     * It returns true if the path contains a dot or dot dot
     * @returns A boolean value.
     */
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    private hasDotOrDotDot(): boolean {
        const n = this.getNameCount();
        for (let i = 0; i < n; i++) {
            const name = this.elementAsString(i);
            if (name.length == 1 && name.charAt(0) === ".") {
                return true;
            }
            if (name.length == 2
                && name.charAt(0) === "."
                && name.charAt(1) === "."
            ) {
                return true;
            }
        }
        return false;
    }

    private static readonly reservedChars = "<>:\"|?*";

    private static isInvalidPathChar(ch: string): boolean {
        if (os.platform() === "win32") {
            return ch < "\u0020" || LocalPath.reservedChars.indexOf(ch) != -1;
        }
        return false;
    }

}
