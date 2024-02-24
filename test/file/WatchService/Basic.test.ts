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

import {FileSystems, Path, WatchEventKind, WatchKey, WatchService} from "@filesystems/core/file";
import {FileSystemProviders} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "../../../src";
import {WatchEvent} from "@filesystems/core/file/WatchEvent";

function checkKey(key: WatchKey, dir: Path) {
    expect(key.isValid()).toBeTruthy();
    expect(key.watchable()).toEqual(dir);
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

beforeAll(() => {
    FileSystemProviders.register(new LocalFileSystemProvider());
});

test("Simple test of each of the standard events", async () => {
    const fs = await FileSystems.getDefault();
    const path = fs.getPath("foo");

    let watchService: WatchService | undefined;
    try {
        watchService = fs.newWatchService();
        // --- ENTRY_CREATE ---

        // register for event

    } finally {
        if (watchService)
            await watchService.close();
    }
});
