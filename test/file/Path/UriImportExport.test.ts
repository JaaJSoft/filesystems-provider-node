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

/**
 * Test Path -> URI -> Path
 */
import {Paths} from "@filesystems/core/file";
import {IllegalArgumentException} from "@filesystems/core/exception";
import os from "os";
import {FileSystemProviders} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "../../../src";

FileSystemProviders.register(new LocalFileSystemProvider());

async function testPath(s: string): Promise<void> {
    const path = await Paths.of(s);
    const uri = path.toURL();
    const result = await Paths.ofURL(uri);
    expect(result.equals(path.toAbsolutePath())).toBeTruthy();
}

/**
 * Test Path -> (expected) URI -> Path
 */
async function testPathURL(s: string, expectedURL: string): Promise<void> {
    const path = await Paths.of(s);
    const uri = path.toURL();
    expect(uri.toString()).toEqual(expectedURL);
    const result = await Paths.ofURL(uri);
    expect(result.equals(path.toAbsolutePath())).toBeTruthy();
}

/**
 * Test URI -> Path -> URI
 */
async function testURL(s: string): Promise<void> {
    const url = new URL(s);
    const path = await Paths.ofURL(url);
    const result: URL = path.toURL();
    expect(result).toEqual(url);
}

async function testBadUri(s: string): Promise<void> {
    const url = new URL(s);
    try {
        await Paths.ofURL(url);
        throw new Error("fail");
    } catch (e) {
        expect(e instanceof IllegalArgumentException).toBeTruthy();
    }
}

test("testPath", async () => {
    if (os.platform() === "win32") {
        await testPath("C:\\doesnotexist");
        await testPath("C:doesnotexist");
        await testPath("\\\\server.nowhere.oracle.com\\share\\");
        await testPathURL("\\\\fe80--203-baff-fe5a-749ds1.ipv6-literal.net\\share\\missing", "file://fe80--203-baff-fe5a-749ds1.ipv6-literal.net/share/missing");
        // await testPathURL("\\\\fe80--203-baff-fe5a-749ds1.ipv6-literal.net\\share\\missing", "file://[fe80::203:baff:fe5a:749d%1]/share/missing"); ??
    } else {
        await testPath("doesnotexist");
        await testPath("/doesnotexist");
        await testPath("/does not exist");
        await testURL("file:///");
        await testURL("file:///foo/bar/doesnotexist");
        await testURL("file:/foo/bar/doesnotexist");

        // file:///foo/bar/\u0440\u0443\u0441\u0441\u043A\u0438\u0439 (Russian)
        await testURL("file:///foo/bar/%D1%80%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9");
    }
});

test("invalid", async () => {
    if (os.platform() === "win32") {
        await testBadUri("file:foo");
        await testBadUri("file:/foo?q");
        await testBadUri("file:/foo#f");
    } else {
        // await testBadUri("file:foo"); // TODO try to fix
        // await testBadUri("file:/foo?q");
        // await testBadUri("file:/foo#f");
        // await testBadUri("file:foo");
        // await testBadUri("file://server/foo");
        // await testBadUri("file:///foo%00");
    }
});
