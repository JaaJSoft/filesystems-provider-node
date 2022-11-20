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

import {FileSystems, Paths} from "@filesystems/core/file";
import {FileSystemProviders} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "../../../src";
import {IllegalArgumentException, UnsupportedOperationException} from "@filesystems/core/exception";
import os from "os";

beforeAll(() => {
    FileSystemProviders.register(new LocalFileSystemProvider());
});

async function match(name: string, pattern: string, expectoMatch: boolean): Promise<void> {
    const file = await Paths.of(name);
    expect(file.getFileSystem().getPathMatcher("glob:" + pattern).matches(file)).toBe(expectoMatch);
}

async function assertMatch(path: string, pattern: string): Promise<void> {
    await match(path, pattern, true);
}

async function assertNotMatch(path: string, pattern: string): Promise<void> {
    await match(path, pattern, false);
}

async function assertBadPattern(path: string, pattern: string): Promise<void> {
    try {
        expect((await FileSystems.getDefault()).getPathMatcher("glob:" + pattern)).toBeUndefined();
    } catch (e) {
        expect(e).toBeDefined();
    }
}

async function assertRegExMatch(name: string, pattern: string): Promise<void> {
    const file = await Paths.of(name);
    expect(file.getFileSystem().getPathMatcher("regex:" + pattern).matches(file)).toBeTruthy();
}

test("basic", async () => {
    await assertMatch("foo.html", "foo.html");
    await assertNotMatch("foo.html", "foo.htm");
    await assertNotMatch("foo.html", "bar.html");
});

test("match zero or more characters", async () => {
    await assertMatch("foo.html", "f*");
    await assertMatch("foo.html", "*.html");
    await assertMatch("foo.html", "foo.html*");
    await assertMatch("foo.html", "*foo.html");
    await assertMatch("foo.html", "*foo.html*");
    await assertNotMatch("foo.html", "*.htm");
    await assertNotMatch("foo.html", "f.*");
});

test("match one character", async () => {
    await assertMatch("foo.html", "?oo.html");
    await assertMatch("foo.html", "??o.html");
    await assertMatch("foo.html", "???.html");
    await assertMatch("foo.html", "???.htm?");
    await assertNotMatch("foo.html", "foo.???");
});

test("group of subpatterns", async () => {
    await assertMatch("foo.html", "foo{.html,.class}");
    await assertMatch("foo.html", "foo.{class,html}");
    await assertNotMatch("foo.html", "foo{.htm,.class}");
});

test("bracket expressions", async () => {
    await assertMatch("foo.html", "[f]oo.html");
    await assertMatch("foo.html", "[e-g]oo.html");
    await assertMatch("foo.html", "[abcde-g]oo.html");
    await assertMatch("foo.html", "[abcdefx-z]oo.html");
    // await assertMatch("foo.html", "[!a]oo.html");
    // await assertMatch("foo.html", "[!a-e]oo.html");
    await assertMatch("foo-bar", "foo[-a-z]bar");     // match dash
    // await assertMatch("foo.html", "foo[!-]html");     // match !dash
});

test("groups of subpattern with bracket expressions", async () => {
    await assertMatch("foo.html", "[f]oo.{[h]tml,class}");
    await assertMatch("foo.html", "foo.{[a-z]tml,class}");
    // await assertMatch("foo.html", "foo.{[!a-e]tml,.class}");
});

test("assume special characters are allowed in file names", async () => {
    await assertMatch("{foo}.html", "\\{foo*");
    await assertMatch("{foo}.html", "*\\}.html");
    await assertMatch("[foo].html", "\\[foo*");
    await assertMatch("[foo].html", "*\\].html");
});

test("errors", async () => {
    await assertBadPattern("foo.html", "*[a--z]");            // bad range
    await assertBadPattern("foo.html", "*[a--]");             // bad range
    await assertBadPattern("foo.html", "*[a-z");              // missing ]
    await assertBadPattern("foo.html", "*{class,java");       // missing }
    await assertBadPattern("foo.html", "*.{class,{.java}}");  // nested group
    await assertBadPattern("foo.html", "*.html\\");           // nothing to escape
    try {
        (await FileSystems.getDefault()).getPathMatcher(":glob");
        throw new Error("AA");
    } catch (iae) {
        expect(iae instanceof IllegalArgumentException).toBeTruthy();
    }
});

test("platform specific", async () => {
    if (os.platform() === "win32") {
        await assertMatch("C:\\foo", "C:/f*");
        await assertMatch("C:\\FOO", "c:/f*");
        await assertMatch("C:\\foo\\bar\\gus", "C:/**/gus");
        await assertMatch("C:\\foo\\bar\\gus", "C:/**");
    } else {
        await assertMatch("/tmp/foo", "/tmp/*");
        await assertMatch("/tmp/foo/bar", "/tmp/**");

        // some special characters not allowed on Windows
        await assertMatch("myfile?", "myfile\\?");
        await assertMatch("one\\two", "one\\\\two");
        await assertMatch("one*two", "one\\*two");
    }
});

test("regex syntax", async () => {
    await assertRegExMatch("foo.html", ".*\\.html");
    if (os.platform() === "win32") {
        await assertRegExMatch("foo012", "foo\\d+");
        await assertRegExMatch("fo o", "fo\\so");
        await assertRegExMatch("foo", "\\w+");
    }
});

test("unknown syntax", async () => {
    try {
        (await FileSystems.getDefault()).getPathMatcher("grep:foo");
        throw new Error("FAIL");
    } catch (e) {
        expect(e instanceof UnsupportedOperationException).toBeTruthy();
    }
});

test("GLOB_SYNTAX case sensitivity of getPathMatcher: should not throw UOE", async () => {
    expect((await FileSystems.getDefault()).getPathMatcher("glob:java")).toBeDefined();
    expect((await FileSystems.getDefault()).getPathMatcher("Glob:java")).toBeDefined();
    expect((await FileSystems.getDefault()).getPathMatcher("GLOB:java")).toBeDefined();
});

test("REGEX_SYNTAX case sensitivity of getPathMatcher: should not throw UOE", async () => {
    expect((await FileSystems.getDefault()).getPathMatcher("regex:java")).toBeDefined();
    expect((await FileSystems.getDefault()).getPathMatcher("Regex:java")).toBeDefined();
    expect((await FileSystems.getDefault()).getPathMatcher("RegEx:java")).toBeDefined();
    expect((await FileSystems.getDefault()).getPathMatcher("REGEX:java")).toBeDefined();
});
