import * as jsPath from "path";
import {FileSystemProvider} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "./LocalFileSystemProvider";
import {UnsupportedOperationException} from "@filesystems/core/exception";
import {FileStore, FileSystem, Path, PathMatcher} from "@filesystems/core/file";
import {Objects} from "@filesystems/core/utils";
import {LocalPath} from "./LocalPath";
import {AttributeViewName, UserPrincipalLookupService} from "@filesystems/core/file/attribute";

export class LocalFileSystem extends FileSystem {
    private readonly fileSystem: FileSystemProvider;
    private readonly defaultDirectory: string;
    private readonly defaultRoot: string;

    public constructor(provider: LocalFileSystemProvider, dir: string) {
        super();
        this.fileSystem = provider;
        const parsedPath: jsPath.ParsedPath = jsPath.parse(dir);
        this.defaultDirectory = parsedPath.dir;
        this.defaultRoot = parsedPath.root;
    }

    public close() {
        throw new UnsupportedOperationException();
    }

    public getFileStores(): Iterable<FileStore> {
        throw new Error("Method not implemented.");
    }

    public getPath(first: string, more?: string[]): Path {
        Objects.requireNonNullUndefined(first);
        let path: string = "";
        if (!more || more.length === 0) {
            path = first;
        } else {
            for (const segment of more) {
                if (segment.length !== 0) {
                    if (path.length > 0)
                        path += this.getSeparator();
                    path += segment;
                }
            }
        }
        return LocalPath.parse(this, path);
    }

    public getPathMatcher(syntaxAndPattern: string): PathMatcher { // TODO
        throw new Error("Method not implemented.");
    }

    public getRootDirectories(): Iterable<Path> { // TODO find a better way
        const path = this.getPath("/");
        if (path) {
            return [path];
        }
        return [];
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
        return this.fileSystem;
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
}
