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


import {FileSystem, FileSystems, Path} from "@filesystems/core/file";
import {Objects} from "@filesystems/core/utils";
import os from "os";
import {FileSystemProviders} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "../../../src";
import {IllegalArgumentException} from "@filesystems/core/exception";


class PathOps {
    private path: Path | undefined | null;
    private exc: unknown | undefined | null;
    private fs: FileSystem | undefined;

    public static async init(first: string, more?: string[]): Promise<PathOps> {
        console.log();
        FileSystemProviders.register(new LocalFileSystemProvider());
        const pathOps = new PathOps();
        pathOps.fs = await FileSystems.getDefault();
        try {
            pathOps.path = (await FileSystems.getDefault()).getPath(first, more);
            console.log("%s -> %s", first, pathOps.path.toString());
        } catch (e) {
            pathOps.exc = e;
            console.log("%s -> %s", first, e);
        }
        return pathOps;
    }

    checkPath(): Path {
        expect(Objects.nonNullUndefined(this.path)).toBeTruthy();
        return this.path as Path;
    }

    checkFs(): FileSystem {
        expect(Objects.nonNullUndefined(this.fs)).toBeTruthy();
        return this.fs as FileSystem;
    }

    check(result: Path | null | undefined, expected: string) {
        if (Objects.isNullUndefined(result)) {
            if (Objects.isNullUndefined(expected)) {
                return;
            }
        } else {
            expect(Objects.nonNullUndefined(expected)).toBeTruthy();
            expect(Objects.nonNullUndefined(result)).toBeTruthy();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            expect(result.toString() === expected.toString());
        }

    }

    root(expected: string): PathOps {
        const p = this.checkPath();
        this.check(p.getRoot(), expected);
        return this;
    }

    hasRoot(): PathOps {
        const p: Path = this.checkPath();
        expect(Objects.nonNullUndefined(p.getRoot())).toBeTruthy();
        return this;
    }

    parent(expected: string): PathOps {
        const p: Path = this.checkPath();
        this.check(p.getParent(), expected);
        return this;
    }

    name(expected: string): PathOps {
        const p: Path = this.checkPath();
        this.check(p.getFileName(), expected);
        return this;
    }

    element(index: number, expected: string): PathOps {
        const p: Path = this.checkPath();
        this.check(p.getName(index), expected);
        return this;
    }

    subpath(startIndex: number, endIndex: number, expected: string): PathOps {
        const p: Path = this.checkPath();
        this.check(p.subpath(startIndex, endIndex), expected);
        return this;
    }

    starts(prefix: string): PathOps {
        const p: Path = this.checkPath();
        const fileSystem: FileSystem = this.checkFs();
        const s: Path = fileSystem.getPath(prefix);
        expect(p.startsWith(s)).toBeTruthy();
        return this;
    }

    notStarts(prefix: string): PathOps {
        const p: Path = this.checkPath();
        const fileSystem: FileSystem = this.checkFs();
        const s: Path = fileSystem.getPath(prefix);
        expect(p.startsWith(s)).toBeFalsy();
        return this;
    }

    ends(suffix: string): PathOps {
        const p: Path = this.checkPath();
        const fileSystem: FileSystem = this.checkFs();
        const s: Path = fileSystem.getPath(suffix);
        expect(p.endWith(s)).toBeTruthy();
        return this;
    }

    notEnds(suffix: string): PathOps {
        const p: Path = this.checkPath();
        const fileSystem: FileSystem = this.checkFs();
        const s: Path = fileSystem.getPath(suffix);
        expect(p.endWith(s)).toBeFalsy();
        return this;
    }

    makeAbsolute(): PathOps {
        const p: Path = this.checkPath();
        this.path = p.toAbsolutePath();
        return this;
    }

    absolute(): PathOps {
        const p: Path = this.checkPath();
        expect(p.isAbsolute()).toBeTruthy();
        return this;
    }

    notAbsolute(): PathOps {
        const p: Path = this.checkPath();
        expect(p.isAbsolute()).toBeFalsy();
        return this;
    }

    async resolve(other: string, expected: string): Promise<PathOps> {
        const p: Path = this.checkPath();
        this.check(await p.resolveFromString(other), expected);
        return this;
    }

    async resolveSibling(other: string, expected: string): Promise<PathOps> {
        const p: Path = this.checkPath();
        this.check(await p.resolveSiblingFromString(other), expected);
        return this;
    }

    async relativize(other: string, expected: string): Promise<PathOps> {
        const p: Path = this.checkPath();
        const fileSystem: FileSystem = this.checkFs();
        const that: Path = fileSystem.getPath(other);
        this.check(await p.relativize(that), expected);
        return this;
    }

    async relativizeFail(other: string): Promise<PathOps> {
        const p: Path = this.checkPath();
        const fileSystem: FileSystem = this.checkFs();
        const that: Path = fileSystem.getPath(other);
        expect(await p.relativize(that)).toThrow(IllegalArgumentException);
        return this;
    }

    normalize(expected: string): PathOps {
        const p: Path = this.checkPath();
        this.check(p.normalize(), expected);
        return this;
    }

    string(expected: string): PathOps {
        const p: Path = this.checkPath();
        this.check(p, expected);
        return this;
    }

    invalid(): PathOps {
        expect(this.exc).toBeDefined();
        fail();
        return this;
    }

    static async test(first: string, more?: string[]): Promise<PathOps> {
        return await PathOps.init(first, more);
    }

    static async testPath(path: Path): Promise<PathOps> {
        return await PathOps.init(path.toString());
    }
}

describe("windows", () => {
    if (os.platform() == "win32") {
        test("construction", async () => {
            // construction
            (await PathOps.test("C:\\"))
                .string("C:\\");
            (await PathOps.test("C:\\", [""]))
                .string("C:\\");
            (await PathOps.test("C:\\", ["foo"]))
                .string("C:\\foo");
            (await PathOps.test("C:\\", ["\\foo"]))
                .string("C:\\foo");
            (await PathOps.test("C:\\", ["foo\\"]))
                .string("C:\\foo");
            (await PathOps.test("foo", ["bar", "gus"]))
                .string("foo\\bar\\gus");
            (await PathOps.test(""))
                .string("");
            (await PathOps.test("", ["C:\\"]))
                .string("C:\\");
            (await PathOps.test("", ["foo", "", "bar", "", "\\gus"]))
                .string("foo\\bar\\gus");
        });
    }
});
