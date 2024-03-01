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

import {
    Files,
    FileSystems,
    Path,
    StandardWatchEventKinds,
    WatchEventKind,
    WatchKey,
    WatchService
} from "@filesystems/core/file";
import {FileSystemProviders} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "../../../src";
import {WatchEvent} from "@filesystems/core/file/WatchEvent";
import {createTemporaryDirectory} from "../TestUtil";

function checkKey(key: WatchKey, dir: Path) {
    expect(key.isValid()).toBeTruthy();
    expect((key.watchable() as Path).toString()).toEqual(dir.toString());
}

function checkExpectedEvent(
    events: Iterable<WatchEvent<unknown>>,
    expectedKind: WatchEventKind<unknown>,
    expectedContext: unknown
) {
    const event = events[Symbol.iterator]().next().value as WatchEvent<unknown>;
    expect(event.kind()).toStrictEqual(expectedKind);
    expect(expectedContext).toStrictEqual(event.context());
}

async function takeExpectedKey(watcher: WatchService, expected: WatchKey) {
    const key = await watcher.poll();
    expect(key).toBe(expected);
}

let dir: Path;
beforeAll(async () => {
    FileSystemProviders.register(new LocalFileSystemProvider());
    dir = await createTemporaryDirectory();
});

test("Simple test of each of the standard events", async () => {
    const fs = await FileSystems.getDefault();
    const path = fs.getPath("foo");

    let watcher: WatchService | undefined;
    try {
        watcher = fs.newWatchService();
        // --- ENTRY_CREATE ---

        // register for event
        const myKey = await dir.register(watcher, [StandardWatchEventKinds.ENTRY_CREATE]);
        checkKey(myKey, dir);
        // create file

        const file = dir.resolveFromString("foo");
        await Files.createFile(file);

        // remove key and check that we got the ENTRY_CREATE event
        await takeExpectedKey(watcher, myKey);
        checkExpectedEvent(
            myKey.pollEvents(),
            StandardWatchEventKinds.ENTRY_CREATE,
            path
        );
    } finally {
        if (watcher)
            await watcher.close();
    }
});
