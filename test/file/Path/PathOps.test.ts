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


import {FileSystem, FileSystems, Path, Paths} from "@filesystems/core/file";
import {Objects} from "@filesystems/core/utils";
import os from "os";
import {FileSystemProviders} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "../../../src";
import {IllegalArgumentException} from "@filesystems/core/exception";

FileSystemProviders.register(new LocalFileSystemProvider());

class PathOps {
    private path: Path | undefined | null;
    private exc: unknown | undefined | null;
    private fs: FileSystem | undefined;

    public static async init(first: string, more?: string[]): Promise<PathOps> {
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

    check(result: Path | null | undefined, expected: string | null) {
        if (Objects.isNullUndefined(result)) {
            if (Objects.isNullUndefined(expected)) {
                return;
            }
        } else {
            expect(Objects.isNullUndefined(expected)).toBeFalsy();
            expect(Objects.isNullUndefined(result)).toBeFalsy();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            expect(result.toString() === expected.toString());
        }

    }

    root(expected: string | null): PathOps {
        const p = this.checkPath();
        this.check(p.getRoot(), expected);
        return this;
    }

    hasRoot(): PathOps {
        const p: Path = this.checkPath();
        expect(Objects.nonNullUndefined(p.getRoot())).toBeTruthy();
        return this;
    }

    parent(expected: string | null): PathOps {
        const p: Path = this.checkPath();
        const parentPath: Path | null = p.getParent();
        this.check(parentPath, expected);
        return this;
    }

    name(expected: string | null): PathOps {
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
        try {
            await p.relativize(that);
            throw new Error();
        } catch (e) {
            expect(e instanceof IllegalArgumentException).toBeTruthy();
        }
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


test("construction", async () => {
    if (os.platform() == "win32") {
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
    } else {
        (await PathOps.test("/"))
            .string("/");
        (await PathOps.test("/", [""]))
            .string("/");
        (await PathOps.test("/", ["foo"]))
            .string("/foo");
        (await PathOps.test("/", ["/foo"]))
            .string("/foo");
        (await PathOps.test("/", ["foo/"]))
            .string("/foo");
        (await PathOps.test("foo", ["bar", "gus"]))
            .string("foo/bar/gus");
        (await PathOps.test(""))
            .string("");
        (await PathOps.test("", ["/"]))
            .string("/");
        (await PathOps.test("", ["foo", "", "bar", "", "/gus"]))
            .string("foo/bar/gus");
    }

});

test("all components present", async () => {
    if (os.platform() == "win32") {

        (await PathOps.test("C:\\a\\b\\c"))
            .root("C:\\")
            .parent("C:\\a\\b")
            .name("c");
        (await PathOps.test("C:a\\b\\c"))
            .root("C:")
            .parent("C:a\\b")
            .name("c");
        (await PathOps.test("\\\\server\\share\\a"))
            .root("\\\\server\\share\\")
            .parent("\\\\server\\share\\")
            .name("a");
    }
});

test("root component only", async () => {
    if (os.platform() == "win32") {
        (await PathOps.test("C:\\"))
            .root("C:\\")
            .parent(null)
            .name(null);
        (await PathOps.test("C:"))
            .root("C:")
            .parent(null)
            .name(null);
        (await PathOps.test("\\\\server\\share\\"))
            .root("\\\\server\\share\\")
            .parent(null)
            .name(null);
    }
});

test("no root component", async () => {
    if (os.platform() == "win32") {
        (await PathOps.test("a\\b"))
            .root(null)
            .parent("a")
            .name("b");
    }
});

test("name component only", async () => {
    if (os.platform() == "win32") {
        (await PathOps.test("foo"))
            .root(null)
            .parent(null)
            .name("foo");
        (await PathOps.test(""))
            .root(null)
            .parent(null)
            .name("");
    }
});

test("startsWith", async () => {
    if (os.platform() == "win32") {
        (await PathOps.test("C:\\"))
            .starts("C:\\")
            .starts("c:\\")
            .notStarts("C")
            .notStarts("C:")
            .notStarts("");
        (await PathOps.test("C:"))
            .starts("C:")
            .starts("c:")
            .notStarts("C")
            .notStarts("");
        (await PathOps.test("\\"))
            .starts("\\");
        (await PathOps.test("C:\\foo\\bar"))
            .starts("C:\\")
            .starts("C:\\foo")
            .starts("C:\\FOO")
            .starts("C:\\foo\\bar")
            .starts("C:\\Foo\\Bar")
            .notStarts("C:")
            .notStarts("C")
            .notStarts("C:foo")
            .notStarts("");
        (await PathOps.test("\\foo\\bar"))
            .starts("\\")
            .starts("\\foo")
            .starts("\\foO")
            .starts("\\foo\\bar")
            .starts("\\fOo\\BaR")
            .notStarts("foo")
            .notStarts("foo\\bar")
            .notStarts("");
        (await PathOps.test("foo\\bar"))
            .starts("foo")
            .starts("foo\\bar")
            .notStarts("\\")
            .notStarts("");
        (await PathOps.test("\\\\server\\share"))
            .starts("\\\\server\\share")
            .starts("\\\\server\\share\\")
            .notStarts("\\")
            .notStarts("");
        (await PathOps.test(""))
            .starts("")
            .notStarts("\\");
    }
});

test("endWith", async () => {
    if (os.platform() === "win32") {
        (await PathOps.test("C:\\"))
            .ends("C:\\")
            .ends("c:\\")
            .notEnds("\\")
            .notEnds("");
        (await PathOps.test("C:"))
            .ends("C:")
            .ends("c:")
            .notEnds("");
        (await PathOps.test("\\"))
            .ends("\\")
            .notEnds("");
        (await PathOps.test("C:\\foo\\bar"))
            .ends("bar")
            .ends("BAR")
            .ends("foo\\bar")
            .ends("Foo\\Bar")
            .ends("C:\\foo\\bar")
            .ends("c:\\foO\\baR")
            .notEnds("r")
            .notEnds("\\foo\\bar")
            .notEnds("");
        (await PathOps.test("\\foo\\bar"))
            .ends("bar")
            .ends("BaR")
            .ends("foo\\bar")
            .ends("foO\\baR")
            .ends("\\foo\\bar")
            .ends("\\Foo\\Bar")
            .notEnds("oo\\bar")
            .notEnds("");
        (await PathOps.test("foo\\bar"))
            .ends("bar")
            .ends("BAR")
            .ends("foo\\bar")
            .ends("Foo\\Bar")
            .notEnds("ar")
            .notEnds("");
        (await PathOps.test("\\\\server\\share"))
            .ends("\\\\server\\share")
            .ends("\\\\server\\share\\")
            .notEnds("shared")
            .notEnds("\\")
            .notEnds("");
        (await PathOps.test(""))
            .ends("")
            .notEnds("\\");
    }
});

test("elements", async () => {
    if (os.platform() === "win32") {
        (await PathOps.test("C:\\a\\b\\c"))
            .element(0, "a")
            .element(1, "b")
            .element(2, "c");
        (await PathOps.test("foo.bar\\gus.alice"))
            .element(0, "foo.bar")
            .element(1, "gus.alice");
        (await PathOps.test(""))
            .element(0, "");
    }
});

test("subpath", async () => {
    if (os.platform() === "win32") {
        (await PathOps.test("C:\\foo"))
            .subpath(0, 1, "foo");
        (await PathOps.test("C:foo"))
            .subpath(0, 1, "foo");
        (await PathOps.test("foo"))
            .subpath(0, 1, "foo");
        (await PathOps.test("C:\\foo\\bar\\gus"))
            .subpath(0, 1, "foo")
            .subpath(0, 2, "foo\\bar")
            .subpath(0, 3, "foo\\bar\\gus")
            .subpath(1, 2, "bar")
            .subpath(1, 3, "bar\\gus")
            .subpath(2, 3, "gus");
        (await PathOps.test("\\\\server\\share\\foo"))
            .subpath(0, 1, "foo");
        (await PathOps.test(""))
            .subpath(0, 1, "");
    }
});

test("isAbsolute", async () => {
    if (os.platform() === "win32") {
        (await PathOps.test("foo")).notAbsolute();
        (await PathOps.test("C:")).notAbsolute();
        (await PathOps.test("C:\\")).absolute();
        (await PathOps.test("C:\\abc")).absolute();
        (await PathOps.test("\\\\server\\share\\")).absolute();
        (await PathOps.test("")).notAbsolute();
        const cwd: Path = (await Paths.of("")).toAbsolutePath();
        (await PathOps.testPath(cwd)).absolute();
    }
});

test("toAbsolutePath", async () => {
    const cwd: Path = (await Paths.of("")).toAbsolutePath();
    if (os.platform() === "win32") {
        (await PathOps.test(""))
            .makeAbsolute()
            .absolute()
            .hasRoot()
            .string(cwd.toString());
        (await PathOps.test("."))
            .makeAbsolute()
            .absolute()
            .hasRoot()
            .string(cwd.toString() + "\\.");
        (await PathOps.test("foo"))
            .makeAbsolute()
            .absolute()
            .hasRoot()
            .string(cwd.toString() + "\\foo");

        const r: Path | null = cwd.getRoot();
        const rootAsString = r ? r.toString() : "";
        if (rootAsString.length == 3
            && rootAsString.charAt(1) === ":"
            && rootAsString.charAt(2) === "\\"
        ) {
            const root = await Paths.of(rootAsString.substring(0, 2));

            // C:
            (await PathOps.testPath(root))
                .makeAbsolute()
                .absolute()
                .hasRoot()
                .string(cwd.toString());

            // C:.
            (await PathOps.test(root + "."))
                .makeAbsolute()
                .absolute()
                .hasRoot()
                .string(cwd.toString() + "\\.");

            // C:foo
            (await PathOps.test(root + "foo"))
                .makeAbsolute()
                .absolute()
                .hasRoot()
                .string(cwd.toString() + "\\foo");
        }
    }
});

test("resolve", async () => {
    if (os.platform() === "win32") {
        await (await (await (await (await (await (await PathOps.test("C:\\"))
            .resolve("foo", "C:\\foo"))
            .resolve("D:\\bar", "D:\\bar"))
            .resolve("\\\\server\\share\\bar", "\\\\server\\share\\bar"))
            .resolve("C:foo", "C:\\foo"))
            .resolve("D:foo", "D:foo"))
            .resolve("", "C:\\");
        await (await (await (await (await (await (await PathOps.test("\\"))
            .resolve("foo", "\\foo"))
            .resolve("D:bar", "D:bar"))
            .resolve("C:\\bar", "C:\\bar"))
            .resolve("\\\\server\\share\\bar", "\\\\server\\share\\bar"))
            .resolve("\\foo", "\\foo"))
            .resolve("", "\\");
        await (await (await (await (await (await (await PathOps.test("\\foo"))
            .resolve("bar", "\\foo\\bar"))
            .resolve("D:bar", "D:bar"))
            .resolve("C:\\bar", "C:\\bar"))
            .resolve("\\\\server\\share\\bar", "\\\\server\\share\\bar"))
            .resolve("\\bar", "\\bar"))
            .resolve("", "\\foo");
        await (await (await (await (await (await (await PathOps.test("foo"))
            .resolve("bar", "foo\\bar"))
            .resolve("D:\\bar", "D:\\bar"))
            .resolve("\\\\server\\share\\bar", "\\\\server\\share\\bar"))
            .resolve("C:bar", "C:bar"))
            .resolve("D:foo", "D:foo"))
            .resolve("", "foo");
        await (await (await PathOps.test("C:"))
            .resolve("foo", "C:foo"))
            .resolve("", "C:");
        await (await (await (await (await (await (await PathOps.test("\\\\server\\share\\foo"))
            .resolve("bar", "\\\\server\\share\\foo\\bar"))
            .resolve("\\bar", "\\\\server\\share\\bar"))
            .resolve("D:\\bar", "D:\\bar"))
            .resolve("\\\\other\\share\\bar", "\\\\other\\share\\bar"))
            .resolve("D:bar", "D:bar"))
            .resolve("", "\\\\server\\share\\foo");
        await (await (await (await (await (await PathOps.test(""))
            .resolve("", ""))
            .resolve("foo", "foo"))
            .resolve("C:\\", "C:\\"))
            .resolve("C:foo", "C:foo"))
            .resolve("\\\\server\\share\\bar", "\\\\server\\share\\bar");

        // resolveSibling
        await (await (await (await (await (await (await PathOps.test("foo"))
            .resolveSibling("bar", "bar"))
            .resolveSibling("D:\\bar", "D:\\bar"))
            .resolveSibling("\\\\server\\share\\bar", "\\\\server\\share\\bar"))
            .resolveSibling("C:bar", "C:bar"))
            .resolveSibling("D:foo", "D:foo"))
            .resolveSibling("", "");
        await (await (await (await (await (await (await PathOps.test("foo\\bar"))
            .resolveSibling("gus", "foo\\gus"))
            .resolveSibling("D:\\bar", "D:\\bar"))
            .resolveSibling("\\\\server\\share\\bar", "\\\\server\\share\\bar"))
            .resolveSibling("C:bar", "C:bar"))
            .resolveSibling("D:foo", "D:foo"))
            .resolveSibling("", "foo");
        await (await (await (await (await (await (await PathOps.test("C:\\foo"))
            .resolveSibling("gus", "C:\\gus"))
            .resolveSibling("D:\\bar", "D:\\bar"))
            .resolveSibling("\\\\server\\share\\bar", "\\\\server\\share\\bar"))
            .resolveSibling("C:bar", "C:\\bar"))
            .resolveSibling("D:foo", "D:foo"))
            .resolveSibling("", "C:\\");
        await (await (await (await (await (await (await PathOps.test("C:\\foo\\bar"))
            .resolveSibling("gus", "C:\\foo\\gus"))
            .resolveSibling("D:\\bar", "D:\\bar"))
            .resolveSibling("\\\\server\\share\\bar", "\\\\server\\share\\bar"))
            .resolveSibling("C:bar", "C:\\foo\\bar"))
            .resolveSibling("D:foo", "D:foo"))
            .resolveSibling("", "C:\\foo");
        await (await (await (await (await (await (await PathOps.test("\\\\server\\share\\foo"))
            .resolveSibling("bar", "\\\\server\\share\\bar"))
            .resolveSibling("\\bar", "\\\\server\\share\\bar"))
            .resolveSibling("D:\\bar", "D:\\bar"))
            .resolveSibling("\\\\other\\share\\bar", "\\\\other\\share\\bar"))
            .resolveSibling("D:bar", "D:bar"))
            .resolveSibling("", "\\\\server\\share\\");
        await (await (await (await PathOps.test(""))
            .resolveSibling("", ""))
            .resolveSibling("foo", "foo"))
            .resolveSibling("C:\\", "C:\\");
    }
});

test("relativize",
    async () => {
        if (os.platform() === "win32") {
            await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:\\a"))
                .relativize("C:\\a", ""))
                .relativize("C:\\", ".."))
                .relativize("C:\\.", ".."))
                .relativize("C:\\..", ".."))
                .relativize("C:\\..\\..", ".."))
                .relativize("C:\\a\\b", "b"))
                .relativize("C:\\a\\b\\c", "b\\c"))
                .relativize("C:\\a\\.", ""))        // "." also valid
                .relativize("C:\\a\\..", ".."))
                .relativize("C:\\x", "..\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail("\\"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail("..");
            (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:\\a\\b"))
                .relativize("C:\\a\\b", ""))
                .relativize("C:\\a", ".."))
                .relativize("C:\\", "..\\.."))
                .relativize("C:\\.", "..\\.."))
                .relativize("C:\\..", "..\\.."))
                .relativize("C:\\..\\..", "..\\.."))
                .relativize("C:\\a\\b\\c", "c"))
                .relativize("C:\\a\\.", ".."))
                .relativize("C:\\a\\..", "..\\.."))
                .relativize("C:\\x", "..\\..\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail("\\"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail(".."));
            (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:\\a\\b\\c"))
                .relativize("C:\\a\\b\\c", ""))
                .relativize("C:\\a\\b", ".."))
                .relativize("C:\\a", "..\\.."))
                .relativize("C:\\", "..\\..\\.."))
                .relativize("C:\\.", "..\\..\\.."))
                .relativize("C:\\..", "..\\..\\.."))
                .relativize("C:\\..\\..", "..\\..\\.."))
                .relativize("C:\\..\\..\\..", "..\\..\\.."))
                .relativize("C:\\..\\..\\..\\..", "..\\..\\.."))
                .relativize("C:\\a\\b\\c\\d", "d"))
                .relativize("C:\\a\\b\\c\\d\\e", "d\\e"))
                .relativize("C:\\a\\b\\c\\.", ""))        // "." also valid
                .relativize("C:\\a\\b\\c\\..", ".."))
                .relativize("C:\\a\\x", "..\\..\\x"))
                .relativize("C:\\x", "..\\..\\..\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail("\\"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail(".."));
            (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:\\..\\a"))
                .relativize("C:\\a", ""))
                .relativize("C:\\", ".."))
                .relativize("C:\\.", ".."))
                .relativize("C:\\..", ".."))
                .relativize("C:\\..\\..", ".."))
                .relativize("C:\\a\\b", "b"))
                .relativize("C:\\a\\b\\c", "b\\c"))
                .relativize("C:\\a\\.", ""))        // "." also valid
                .relativize("C:\\a\\..", ".."))
                .relativize("C:\\x", "..\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail("\\"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail(".."));
            (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:\\..\\a\\b"))
                .relativize("C:\\a\\b", ""))
                .relativize("C:\\a", ".."))
                .relativize("C:\\", "..\\.."))
                .relativize("C:\\.", "..\\.."))
                .relativize("C:\\..", "..\\.."))
                .relativize("C:\\..\\..", "..\\.."))
                .relativize("C:\\..\\..\\..", "..\\.."))
                .relativize("C:\\..\\..\\..\\..", "..\\.."))
                .relativize("C:\\a\\b\\c", "c"))
                .relativize("C:\\a\\b\\.", ""))        // "." also valid
                .relativize("C:\\a\\b\\..", ".."))
                .relativize("C:\\a\\x", "..\\x"))
                .relativize("C:\\x", "..\\..\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail("\\"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail(".."));
            (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:\\..\\..\\a\\b"))
                .relativize("C:\\a\\b", ""))
                .relativize("C:\\a", ".."))
                .relativize("C:\\", "..\\.."))
                .relativize("C:\\.", "..\\.."))
                .relativize("C:\\..", "..\\.."))
                .relativize("C:\\..\\..", "..\\.."))
                .relativize("C:\\..\\..\\..", "..\\.."))
                .relativize("C:\\..\\..\\..\\..", "..\\.."))
                .relativize("C:\\a\\b\\c", "c"))
                .relativize("C:\\a\\b\\.", ""))        // "." also valid
                .relativize("C:\\a\\b\\..", ".."))
                .relativize("C:\\a\\x", "..\\x"))
                .relativize("C:\\x", "..\\..\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail("\\"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail(".."));
            await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:\\..\\a\\b\\c"))
                .relativize("C:\\a\\b\\c", ""))
                .relativize("C:\\a\\b", ".."))
                .relativize("C:\\a", "..\\.."))
                .relativize("C:\\", "..\\..\\.."))
                .relativize("C:\\.", "..\\..\\.."))
                .relativize("C:\\..", "..\\..\\.."))
                .relativize("C:\\..\\..", "..\\..\\.."))
                .relativize("C:\\..\\..\\..", "..\\..\\.."))
                .relativize("C:\\..\\..\\..\\..", "..\\..\\.."))
                .relativize("C:\\a\\b\\c\\d", "d"))
                .relativize("C:\\a\\b\\c\\d\\e", "d\\e"))
                .relativize("C:\\a\\b\\c\\.", ""))// "." also valid
                .relativize("C:\\a\\b\\c\\..", ".."))
                .relativize("C:\\a\\x", "..\\..\\x"))
                .relativize("C:\\x", "..\\..\\..\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail("\\"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail("..");
            (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:\\..\\..\\a\\b\\c"))
                .relativize("C:\\a\\b\\c", ""))
                .relativize("C:\\a\\b", ".."))
                .relativize("C:\\a", "..\\.."))
                .relativize("C:\\", "..\\..\\.."))
                .relativize("C:\\.", "..\\..\\.."))
                .relativize("C:\\..", "..\\..\\.."))
                .relativize("C:\\..\\..", "..\\..\\.."))
                .relativize("C:\\..\\..\\..", "..\\..\\.."))
                .relativize("C:\\..\\..\\..\\..", "..\\..\\.."))
                .relativize("C:\\a\\b\\c\\d", "d"))
                .relativize("C:\\a\\b\\c\\d\\e", "d\\e"))
                .relativize("C:\\a\\b\\c\\.", ""))        // "." also valid
                .relativize("C:\\a\\b\\c\\..", ".."))
                .relativize("C:\\a\\x", "..\\..\\x"))
                .relativize("C:\\x", "..\\..\\..\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail("\\"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail(".."));
            (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:\\..\\..\\..\\a\\b\\c"))
                .relativize("C:\\a\\b\\c", ""))
                .relativize("C:\\a\\b", ".."))
                .relativize("C:\\a", "..\\.."))
                .relativize("C:\\", "..\\..\\.."))
                .relativize("C:\\.", "..\\..\\.."))
                .relativize("C:\\..", "..\\..\\.."))
                .relativize("C:\\..\\..", "..\\..\\.."))
                .relativize("C:\\..\\..\\..", "..\\..\\.."))
                .relativize("C:\\..\\..\\..\\..", "..\\..\\.."))
                .relativize("C:\\a\\b\\c\\d", "d"))
                .relativize("C:\\a\\b\\c\\d\\e", "d\\e"))
                .relativize("C:\\a\\b\\c\\.", ""))        // "." also valid
                .relativize("C:\\a\\b\\c\\..", ".."))
                .relativize("C:\\a\\x", "..\\..\\x"))
                .relativize("C:\\x", "..\\..\\..\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail("\\"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail(".."));
            (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:\\.\\a"))
                .relativize("C:\\a", ""))
                .relativize("C:\\", ".."))
                .relativize("C:\\.", ".."))
                .relativize("C:\\..", ".."))
                .relativize("C:\\..\\..", ".."))
                .relativize("C:\\a\\b", "b"))
                .relativize("C:\\a\\b\\c", "b\\c"))
                .relativize("C:\\a\\.", ""))        // "." also valid
                .relativize("C:\\a\\..", ".."))
                .relativize("C:\\x", "..\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail("\\"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail(".."));
            await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:\\a\\.."))
                .relativize("C:\\a", "a"))
                .relativize("C:\\", ""))          // "." is also valid
                .relativize("C:\\.", ""))
                .relativize("C:\\..", ""))
                .relativize("C:\\..\\..", ""))
                .relativize("C:\\a\\.", "a"))
                .relativize("C:\\a\\..", ""))
                .relativize("C:\\x", "x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail("\\"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail("..");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:a"))
                .relativize("C:a", ""))
                .relativize("C:", ".."))
                .relativize("C:.", ".."))
                .relativize("C:..", "..\\.."))
                .relativize("C:..\\..", "..\\..\\.."))
                .relativize("C:.\\..", "..\\.."))
                .relativize("C:a\\b", "b"))
                .relativize("C:a\\b\\c", "b\\c"))
                .relativize("C:..\\x", "..\\..\\x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("x"))
                .relativizeFail("\\"))
                .relativizeFail("\\x");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:a\\b"))
                .relativize("C:a\\b", ""))
                .relativize("C:a", ".."))
                .relativize("C:", "..\\.."))
                .relativize("C:.", "..\\.."))
                .relativize("C:..", "..\\..\\.."))
                .relativize("C:..\\..", "..\\..\\..\\.."))
                .relativize("C:.\\..", "..\\..\\.."))
                .relativize("C:a\\b\\c", "c"))
                .relativize("C:..\\x", "..\\..\\..\\x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("x"))
                .relativizeFail("\\"))
                .relativizeFail("\\x");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:a\\b\\c"))
                .relativize("C:a\\b\\c", ""))
                .relativize("C:a\\b", ".."))
                .relativize("C:a", "..\\.."))
                .relativize("C:", "..\\..\\.."))
                .relativize("C:.", "..\\..\\.."))
                .relativize("C:..", "..\\..\\..\\.."))
                .relativize("C:..\\..", "..\\..\\..\\..\\.."))
                .relativize("C:.\\..", "..\\..\\..\\.."))
                .relativize("C:a\\b\\c\\d", "d"))
                .relativize("C:a\\b\\c\\d\\e", "d\\e"))
                .relativize("C:a\\x", "..\\..\\x"))
                .relativize("C:..\\x", "..\\..\\..\\..\\x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("x"))
                .relativizeFail("\\"))
                .relativizeFail("\\x");
            await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:"))
                .relativize("C:a", "a"))
                .relativize("C:a\\b\\c", "a\\b\\c"))
                .relativize("C:", ""))
                .relativize("C:.", ""))              // "" also valid
                .relativize("C:..", ".."))
                .relativize("C:..\\..", "..\\.."))
                .relativize("C:.\\..", ".."))
                .relativizeFail("C:\\x"))
                .relativizeFail("\\"))
                .relativizeFail("\\x");
            await (await (await (await (await (await (await (await (await (await PathOps.test("C:.."))
                .relativize("C:..\\a", "a"))
                .relativize("C:..", ""))
                .relativize("C:.\\..", ""))
                .relativizeFail("C:\\x"))
                .relativizeFail("\\"))
                .relativizeFail("\\x"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail("x");
            await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:..\\a"))
                .relativize("C:..\\a\\b", "b"))
                .relativize("C:..\\a", ""))
                .relativize("C:..", ".."))
                .relativize("C:.\\..", ".."))
                .relativizeFail("C:\\x"))
                .relativizeFail("\\"))
                .relativizeFail("\\x"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail("x");
            await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:..\\a\\b"))
                .relativize("C:..\\a\\b\\c", "c"))
                .relativize("C:..\\a\\b", ""))
                .relativize("C:..\\a", ".."))
                .relativize("C:..", "..\\.."))
                .relativize("C:.\\..", "..\\.."))
                .relativizeFail("C:\\x"))
                .relativizeFail("\\"))
                .relativizeFail("\\x"))
                .relativizeFail(""))
                .relativizeFail("x");
            await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:a\\.."))
                .relativize("C:b", "b"))
                .relativize("C:", ""))
                .relativize("C:.", "")) // "." also valid
                .relativize("C:..", ".."))
                .relativize("C:a\\..\\b", "b"))
                .relativize("C:a\\..", ""))
                .relativize("C:..\\b", "..\\b"))
                .relativize("C:b\\..", ""))
                .relativizeFail("C:\\x"))
                .relativizeFail("\\"))
                .relativizeFail("\\x"))
                .relativizeFail("x");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("C:a\\..\\b"))
                .relativize("C:a\\..\\b", ""))
                .relativize("C:a\\..", ".."))
                .relativize("C:", ".."))
                .relativize("C:.", ".."))
                .relativize("C:..", "..\\.."))
                .relativize("C:b", ""))
                .relativize("C:c", "..\\c"))
                .relativize("C:..\\c", "..\\..\\c"))
                .relativize("C:a\\..\\b\\c", "c"))
                .relativizeFail("C:\\x"))
                .relativizeFail("\\"))
                .relativizeFail("\\x"))
                .relativizeFail("x");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("\\a"))
                .relativize("\\a", ""))
                .relativize("\\", ".."))
                .relativize("\\.", ".."))
                .relativize("\\..", ".."))
                .relativize("\\..\\..", ".."))
                .relativize("\\a\\b", "b"))
                .relativize("\\a\\b\\c", "b\\c"))
                .relativize("\\a\\.", "")) // "." also valid
                .relativize("\\a\\..", ".."))
                .relativize("\\x", "..\\x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail("..");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("\\a\\b"))
                .relativize("\\a\\b", ""))
                .relativize("\\a", ".."))
                .relativize("\\", "..\\.."))
                .relativize("\\.", "..\\.."))
                .relativize("\\..", "..\\.."))
                .relativize("\\..\\..", "..\\.."))
                .relativize("\\a\\b\\c", "c"))
                .relativize("\\a\\.", ".."))
                .relativize("\\a\\..", "..\\.."))
                .relativize("\\x", "..\\..\\x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail("..");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("\\a\\b\\c"))
                .relativize("\\a\\b\\c", ""))
                .relativize("\\a\\b", ".."))
                .relativize("\\a", "..\\.."))
                .relativize("\\", "..\\..\\.."))
                .relativize("\\.", "..\\..\\.."))
                .relativize("\\..", "..\\..\\.."))
                .relativize("\\..\\..", "..\\..\\.."))
                .relativize("\\..\\..\\..", "..\\..\\.."))
                .relativize("\\..\\..\\..\\..", "..\\..\\.."))
                .relativize("\\a\\b\\c\\d", "d"))
                .relativize("\\a\\b\\c\\d\\e", "d\\e"))
                .relativize("\\a\\b\\c\\.", ""))        // "." also valid
                .relativize("\\a\\b\\c\\..", ".."))
                .relativize("\\a\\x", "..\\..\\x"))
                .relativize("\\x", "..\\..\\..\\x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail("..");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("\\..\\a\\b"))
                .relativize("\\a\\b", ""))
                .relativize("\\a", ".."))
                .relativize("\\", "..\\.."))
                .relativize("\\.", "..\\.."))
                .relativize("\\..", "..\\.."))
                .relativize("\\..\\..", "..\\.."))
                .relativize("\\..\\..\\..", "..\\.."))
                .relativize("\\..\\..\\..\\..", "..\\.."))
                .relativize("\\a\\b\\c", "c"))
                .relativize("\\a\\b\\.", "")) // "." also valid
                .relativize("\\a\\b\\..", ".."))
                .relativize("\\a\\x", "..\\x"))
                .relativize("\\x", "..\\..\\x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail("..");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("\\..\\..\\a\\b"))
                .relativize("\\a\\b", ""))
                .relativize("\\a", ".."))
                .relativize("\\", "..\\.."))
                .relativize("\\.", "..\\.."))
                .relativize("\\..", "..\\.."))
                .relativize("\\..\\..", "..\\.."))
                .relativize("\\..\\..\\..", "..\\.."))
                .relativize("\\..\\..\\..\\..", "..\\.."))
                .relativize("\\a\\b\\c", "c"))
                .relativize("\\a\\b\\.", "")) // "." also valid
                .relativize("\\a\\b\\..", ".."))
                .relativize("\\a\\x", "..\\x"))
                .relativize("\\x", "..\\..\\x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail("..");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("\\..\\a\\b\\c"))
                .relativize("\\a\\b\\c", ""))
                .relativize("\\a\\b", ".."))
                .relativize("\\a", "..\\.."))
                .relativize("\\", "..\\..\\.."))
                .relativize("\\.", "..\\..\\.."))
                .relativize("\\..", "..\\..\\.."))
                .relativize("\\..\\..", "..\\..\\.."))
                .relativize("\\..\\..\\..", "..\\..\\.."))
                .relativize("\\..\\..\\..\\..", "..\\..\\.."))
                .relativize("\\a\\b\\c\\d", "d"))
                .relativize("\\a\\b\\c\\d\\e", "d\\e"))
                .relativize("\\a\\b\\c\\.", ""))        // "." also valid
                .relativize("\\a\\b\\c\\..", ".."))
                .relativize("\\a\\x", "..\\..\\x"))
                .relativize("\\x", "..\\..\\..\\x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail("..");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("\\..\\..\\a\\b\\c"))
                .relativize("\\a\\b\\c", ""))
                .relativize("\\a\\b", ".."))
                .relativize("\\a", "..\\.."))
                .relativize("\\", "..\\..\\.."))
                .relativize("\\.", "..\\..\\.."))
                .relativize("\\..", "..\\..\\.."))
                .relativize("\\..\\..", "..\\..\\.."))
                .relativize("\\..\\..\\..", "..\\..\\.."))
                .relativize("\\..\\..\\..\\..", "..\\..\\.."))
                .relativize("\\a\\b\\c\\d", "d"))
                .relativize("\\a\\b\\c\\d\\e", "d\\e"))
                .relativize("\\a\\b\\c\\.", ""))        // "." also valid
                .relativize("\\a\\b\\c\\..", ".."))
                .relativize("\\a\\x", "..\\..\\x"))
                .relativize("\\x", "..\\..\\..\\x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail("..");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("\\..\\..\\..\\a\\b\\c"))
                .relativize("\\a\\b\\c", ""))
                .relativize("\\a\\b", ".."))
                .relativize("\\a", "..\\.."))
                .relativize("\\", "..\\..\\.."))
                .relativize("\\.", "..\\..\\.."))
                .relativize("\\..", "..\\..\\.."))
                .relativize("\\..\\..", "..\\..\\.."))
                .relativize("\\..\\..\\..", "..\\..\\.."))
                .relativize("\\..\\..\\..\\..", "..\\..\\.."))
                .relativize("\\a\\b\\c\\d", "d"))
                .relativize("\\a\\b\\c\\d\\e", "d\\e"))
                .relativize("\\a\\b\\c\\.", ""))        // "." also valid
                .relativize("\\a\\b\\c\\..", ".."))
                .relativize("\\a\\x", "..\\..\\x"))
                .relativize("\\x", "..\\..\\..\\x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail("..");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("\\.\\a"))
                .relativize("\\a", ""))
                .relativize("\\", ".."))
                .relativize("\\.", ".."))
                .relativize("\\..", ".."))
                .relativize("\\..\\..", ".."))
                .relativize("\\a\\b", "b"))
                .relativize("\\a\\b\\c", "b\\c"))
                .relativize("\\a\\.", ""))        // "." also valid
                .relativize("\\a\\..", ".."))
                .relativize("\\x", "..\\x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail("..");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("\\..\\a"))
                .relativize("\\a", ""))
                .relativize("\\", ".."))
                .relativize("\\.", ".."))
                .relativize("\\..", ".."))
                .relativize("\\..\\..", ".."))
                .relativize("\\a\\b", "b"))
                .relativize("\\a\\b\\c", "b\\c"))
                .relativize("\\a\\.", "")) // "." also valid
                .relativize("\\a\\..", ".."))
                .relativize("\\x", "..\\x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail("..");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("\\a\\.."))
                .relativize("\\a", "a"))
                .relativize("\\", ""))          // "." is also valid
                .relativize("\\.", ""))
                .relativize("\\..", ""))
                .relativize("\\..\\..", ""))
                .relativize("\\a\\.", "a"))
                .relativize("\\a\\..", ""))
                .relativize("\\x", "x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail("..");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("\\"))
                .relativize("\\a", "a"))
                .relativize("\\", "")) // "." is also valid
                .relativize("\\.", ""))
                .relativize("\\..", ""))
                .relativize("\\..\\..", ""))
                .relativize("\\a\\.", "a"))
                .relativize("\\a\\..", ""))
                .relativize("\\x", "x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("x"))
                .relativizeFail(""))
                .relativizeFail("."))
                .relativizeFail("..");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("a"))
                .relativize("a", ""))
                .relativize("", ".."))
                .relativize(".", ".."))
                .relativize("..", "..\\.."))
                .relativize("..\\..", "..\\..\\.."))
                .relativize(".\\..", "..\\.."))
                .relativize("a\\b", "b"))
                .relativize("a\\b\\c", "b\\c"))
                .relativize("..\\x", "..\\..\\x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("\\"))
                .relativizeFail("\\x");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("a\\b"))
                .relativize("a\\b", ""))
                .relativize("a", ".."))
                .relativize("", "..\\.."))
                .relativize(".", "..\\.."))
                .relativize("..", "..\\..\\.."))
                .relativize("..\\..", "..\\..\\..\\.."))
                .relativize(".\\..", "..\\..\\.."))
                .relativize("a\\b\\c", "c"))
                .relativize("..\\x", "..\\..\\..\\x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("\\"))
                .relativizeFail("\\x");
            await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("a\\b\\c"))
                .relativize("a\\b\\c", ""))
                .relativize("a\\b", ".."))
                .relativize("a", "..\\.."))
                .relativize("", "..\\..\\.."))
                .relativize(".", "..\\..\\.."))
                .relativize("..", "..\\..\\..\\.."))
                .relativize("..\\..", "..\\..\\..\\..\\.."))
                .relativize(".\\..", "..\\..\\..\\.."))
                .relativize("a\\b\\c\\d", "d"))
                .relativize("a\\b\\c\\d\\e", "d\\e"))
                .relativize("a\\x", "..\\..\\x"))
                .relativize("..\\x", "..\\..\\..\\..\\x"))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("\\"))
                .relativizeFail("\\x");
            await (await (await (await (await (await (await (await (await (await PathOps.test(""))
                .relativize("a", "a"))
                .relativize("a\\b\\c", "a\\b\\c"))
                .relativize("", ""))
                .relativize(".", "."))
                .relativize("..", ".."))
                .relativize("..\\..", "..\\.."))
                .relativize(".\\..", ".\\.."))     // ".." also valid
                .relativizeFail("\\"))
                .relativizeFail("\\x");
            await (await (await (await (await (await (await (await (await PathOps.test(".."))
                .relativize("..\\a", "a"))
                .relativize("..", ""))
                .relativize(".\\..", ""))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("\\"))
                .relativizeFail("\\x"));
            // .relativizeFail("")) // TODO FIX #59
            // .relativizeFail("."))
            // .relativizeFail("x");
            await (await (await (await (await (await (await (await (await PathOps.test("..\\a"))
                .relativize("..\\a\\b", "b"))
                .relativize("..\\a", ""))
                .relativize("..", ".."))
                .relativize(".\\..", ".."))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("\\"))
                .relativizeFail("\\x");
            // .relativizeFail("")) // TODO FIX #59
            // .relativizeFail("."))
            // .relativizeFail("x");
            (await (await (await (await (await (await (await (await (await (await PathOps.test("..\\a\\b"))
                .relativize("..\\a\\b\\c", "c"))
                .relativize("..\\a\\b", ""))
                .relativize("..\\a", ".."))
                .relativize("..", "..\\.."))
                .relativize(".\\..", "..\\.."))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("\\"))
                .relativizeFail("\\x"));
            // .relativizeFail("")) // TODO FIX #59
            // .relativizeFail("x");
            await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("a\\.."))
                .relativize("b", "b"))
                .relativize("", ""))
                .relativize(".", "")) // "." also valid
                .relativize("..", ".."))
                .relativize("a\\..\\b", "b"))
                .relativize("a\\..", ""))
                .relativize("..\\b", "..\\b"))
                .relativize("b\\..", ""))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("\\"))
                .relativizeFail("\\x");
            (await (await (await (await (await (await (await (await (await (await (await (await (await (await PathOps.test("a\\..\\b"))
                .relativize("a\\..\\b", ""))
                .relativize("a\\..", ".."))
                .relativize("", ".."))
                .relativize(".", ".."))
                .relativize("..", "..\\.."))
                .relativize("b", ""))
                .relativize("c", "..\\c"))
                .relativize("..\\c", "..\\..\\c"))
                .relativize("a\\..\\b\\c", "c"))
                .relativizeFail("C:\\x"))
                .relativizeFail("C:x"))
                .relativizeFail("\\"))
                .relativizeFail("\\x"));

        }
    },
);

test("normalize", async () => {
    if (os.platform() === "win32") {
        (await PathOps.test("C:\\"))
            .normalize("C:\\");
        (await PathOps.test("C:\\."))
            .normalize("C:\\");
        (await PathOps.test("C:\\.."))
            .normalize("C:\\");
        (await PathOps.test("\\\\server\\share"))
            .normalize("\\\\server\\share\\");
        (await PathOps.test("\\\\server\\share\\."))
            .normalize("\\\\server\\share\\");
        (await PathOps.test("\\\\server\\share\\.."))
            .normalize("\\\\server\\share\\");
        (await PathOps.test("C:"))
            .normalize("C:");
        (await PathOps.test("C:."))
            .normalize("C:");
        (await PathOps.test("C:.."))
            .normalize("C:..");
        (await PathOps.test("\\"))
            .normalize("\\");
        (await PathOps.test("\\."))
            .normalize("\\");
        (await PathOps.test("\\.."))
            .normalize("\\");
        (await PathOps.test("foo"))
            .normalize("foo");
        (await PathOps.test("foo\\."))
            .normalize("foo");
        (await PathOps.test("foo\\.."))
            .normalize("");
        (await PathOps.test("C:\\foo"))
            .normalize("C:\\foo");
        (await PathOps.test("C:\\foo\\."))
            .normalize("C:\\foo");
        (await PathOps.test("C:\\.\\foo"))
            .normalize("C:\\foo");
        (await PathOps.test("C:\\foo\\.."))
            .normalize("C:\\");
        (await PathOps.test("C:\\..\\foo"))
            .normalize("C:\\foo");
        (await PathOps.test("\\\\server\\share\\foo"))
            .normalize("\\\\server\\share\\foo");
        (await PathOps.test("\\\\server\\share\\foo\\."))
            .normalize("\\\\server\\share\\foo");
        (await PathOps.test("\\\\server\\share\\.\\foo"))
            .normalize("\\\\server\\share\\foo");
        (await PathOps.test("\\\\server\\share\\foo\\.."))
            .normalize("\\\\server\\share\\");
        (await PathOps.test("\\\\server\\share\\..\\foo"))
            .normalize("\\\\server\\share\\foo");
        (await PathOps.test("C:foo"))
            .normalize("C:foo");
        (await PathOps.test("C:foo\\."))
            .normalize("C:foo");
        (await PathOps.test("C:.\\foo"))
            .normalize("C:foo");
        (await PathOps.test("C:foo\\.."))
            .normalize("C:");
        (await PathOps.test("C:..\\foo"))
            .normalize("C:..\\foo");
        (await PathOps.test("\\foo"))
            .normalize("\\foo");
        (await PathOps.test("\\foo\\."))
            .normalize("\\foo");
        (await PathOps.test("\\.\\foo"))
            .normalize("\\foo");
        (await PathOps.test("\\foo\\.."))
            .normalize("\\");
        (await PathOps.test("\\..\\foo"))
            .normalize("\\foo");
        (await PathOps.test("."))
            .normalize("");
        (await PathOps.test(".."))
            .normalize("..");
        (await PathOps.test("\\..\\.."))
            .normalize("\\");
        (await PathOps.test("..\\..\\foo"))
            .normalize("..\\..\\foo");
        (await PathOps.test("foo\\bar\\.."))
            .normalize("foo");
        (await PathOps.test("foo\\bar\\.\\.."))
            .normalize("foo");
        (await PathOps.test("foo\\bar\\gus\\..\\.."))
            .normalize("foo");
        (await PathOps.test(".\\foo\\.\\bar\\.\\gus\\..\\.\\.."))
            .normalize("foo");
        (await PathOps.test(""))
            .normalize("");
    }
});

test("UNC corner cases", async () => {
    if (os.platform() === "win32") {
        (await PathOps.test("\\\\server\\share\\"))
            .root("\\\\server\\share\\")
            .parent(null)
            .name(null);
        // (await PathOps.test("\\\\server")) // TODO FIX UNC corner case
        //     .invalid();
        // (await PathOps.test("\\\\server\\"))
        //     .invalid();
        (await PathOps.test("\\\\server\\share"))
            .root("\\\\server\\share\\")
            .parent(null)
            .name(null);
    }
});

test("invalid", async () => {
    if (os.platform() === "win32") {
        // (await PathOps.test(":\\foo"))
        //     .invalid();
        // (await PathOps.test("C::"))
        //     .invalid();
        // (await PathOps.test("C:\\?"))         // invalid character
        //     .invalid();
        // (await PathOps.test("C:\\*"))         // invalid character
        //     .invalid();
        // (await PathOps.test("C:\\abc\u0001\\foo"))
        //     .invalid();
        // (await PathOps.test("C:\\\u0019\\foo"))
        //     .invalid();
        // (await PathOps.test("\\\\server\u0019\\share"))
        //     .invalid();
        // (await PathOps.test("\\\\server\\share\u0019"))
        //     .invalid();
        // (await PathOps.test("foo\u0000\bar"))
        //     .invalid();
        // (await PathOps.test("C:\\foo "))                // trailing space
        //     .invalid();
        // (await PathOps.test("C:\\foo \\bar"))
        //     .invalid();
    }
});

test("normalization at construction time (remove redundant and replace slashes)", async () => {
    if (os.platform() === "win32") {
        (await PathOps.test("C:/a/b/c"))
            .string("C:\\a\\b\\c")
            .root("C:\\")
            .parent("C:\\a\\b");
        (await PathOps.test("C://a//b//c"))
            .string("C:\\a\\b\\c")
            .root("C:\\")
            .parent("C:\\a\\b");
    }
});

test("hashcode/valueof", async () => {
    if (os.platform() === "win32") {
        //TODO
    }
});
