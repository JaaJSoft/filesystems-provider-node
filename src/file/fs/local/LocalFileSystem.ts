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

import * as jsPath from "path";
import {FileSystemProvider} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "./LocalFileSystemProvider";
import {IllegalArgumentException, UnsupportedOperationException} from "@filesystems/core/exception";
import {FileStore, FileSystem, Path, PathMatcher, WatchService} from "@filesystems/core/file";
import {Objects} from "@filesystems/core/utils";
import {LocalPath} from "./LocalPath";
import {AttributeViewName, UserPrincipalLookupService} from "@filesystems/core/file/attribute";
import {list} from "drivelist";
import {LocalFileStore} from "./LocalFileStore";
import micromatch from "micromatch";
import os from "os";
import { PollingWatchService } from "@filesystems/core/file/watch";

export class LocalFileSystem extends FileSystem {

    private readonly fsProvider: FileSystemProvider;
    private readonly defaultDirectory: string;
    private readonly defaultRoot: string;

    public constructor(provider: LocalFileSystemProvider, dir: string) {
        super();
        this.fsProvider = provider;
        const parsedPath: jsPath.ParsedPath = jsPath.parse(dir);
        this.defaultDirectory = parsedPath.dir;
        this.defaultRoot = parsedPath.root;
    }

    public async close(): Promise<void> {
        throw new UnsupportedOperationException();
    }

    public async getFileStores(): Promise<Iterable<FileStore>> {
        const drives = await list();
        return drives.map(value => LocalFileStore.create(this, value));
    }

    public getPath(first: string, more?: string[]): Path {
        Objects.requireNonNullUndefined(first);
        let path = "";
        if ((more == null) || more.length === 0) {
            path = first;
        } else {
            path = first;
            for (const segment of more) {
                if (segment.length !== 0) {
                    if (path.length > 0 && !segment.startsWith(this.getSeparator())) {
                        path += this.getSeparator();
                    }
                    path += segment;
                }
            }
        }
        return LocalPath.parse(this, path);
    }

    private static readonly GLOB_SYNTAX = "GLOB";
    private static readonly REGEX_SYNTAX = "REGEX";

    public getPathMatcher(syntaxAndPattern: string): PathMatcher { // TODO
        const pos = syntaxAndPattern.indexOf(":");
        if (pos <= 0 || pos == syntaxAndPattern.length)
            throw new IllegalArgumentException();
        const syntax = syntaxAndPattern.substring(0, pos);
        const input = syntaxAndPattern.substring(pos + 1);
        if (syntax.toUpperCase() === LocalFileSystem.GLOB_SYNTAX) {
            return new class implements PathMatcher {
                private readonly matcher: (str: string) => boolean;

                constructor() {
                    this.matcher = micromatch.matcher(input, {nocase: os.platform() === "win32"});
                }

                public matches(path: Path | null): boolean {
                    if (!path) {
                        return false;
                    }
                    return this.matcher(path.toString());
                }
            };
        } else if (syntax.toUpperCase() === LocalFileSystem.REGEX_SYNTAX) {
            return new class implements PathMatcher {
                private readonly matcher: RegExp;

                constructor() {
                    this.matcher = new RegExp(input);
                }

                public matches(path: Path | null): boolean {
                    if (!path) {
                        return false;
                    }
                    return this.matcher.test(path.toString());
                }
            };
        } else {
            throw new UnsupportedOperationException("Syntax '" + syntax + "' not recognized");
        }
    }

    public async getRootDirectories(): Promise<Iterable<Path>> {
        return new Set<Path>([...(await this.getFileStores())]
            .flatMap(fileStore => (fileStore as LocalFileStore).mountPoints()));
    }

    public getSeparator(): string {
        return jsPath.sep;
    }

    public getUserPrincipalLookupService(): UserPrincipalLookupService {
        throw new UnsupportedOperationException();
    }

    public isOpen(): boolean {
        return true;
    }

    public isReadOnly(): boolean {
        return false;
    }

    public provider(): FileSystemProvider {
        return this.fsProvider;
    }

    private static readonly supportedFileAttributeViews: Set<AttributeViewName> = new Set<AttributeViewName>(["basic", "posix", "owner"]);

    public supportedFileAttributeViews(): Set<AttributeViewName> {
        return LocalFileSystem.supportedFileAttributeViews;
    }

    public getDefaultDirectory(): string {
        return this.defaultDirectory;
    }

    public getDefaultRoot(): string {
        return this.defaultRoot;
    }

    public newWatchService(): WatchService {
        const watchService = new PollingWatchService(); // TODO replace with os watcher
        watchService.init();
        return watchService;
    }
}
