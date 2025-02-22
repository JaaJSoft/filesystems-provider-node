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
    StandardOpenOption,
    StandardWatchEventKinds,
    WatchEventKind,
    WatchKey,
    WatchService
} from "@filesystems/core/file";
import {FileSystemProviders} from "@filesystems/core/file/spi";
import {LocalFileSystemProvider} from "../../../src";
import {WatchEvent} from "@filesystems/core/file/WatchEvent";
import {createTemporaryDirectory} from "../TestUtil";
import {ChronoUnit, Instant} from "@js-joda/core";
import {IllegalArgumentException, UnsupportedOperationException} from "@filesystems/core/exception";
import {ClosedWatchServiceException} from "@filesystems/core/file/exception";

const TIMEOUT_20_SECONDS = 20 * 1000;

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
    expect((expectedContext as Path).equals(event.context() as Path)).toBeTruthy();
}

async function takeExpectedKey(watcher: WatchService, expected: WatchKey) {
    const key = await watcher.take();
    expect(key).toBe(expected);
}

async function wait1Sec() {
    return new Promise((r) => setTimeout(r, 2000));
}

async function closeWatcher(watcher: WatchService | undefined) {
    if (watcher) {
        await watcher.close();
    }
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
        await wait1Sec();

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
        expect(myKey.reset()).toBeTruthy();

        // --- ENTRY_DELETE ---
        const deleteKey = await dir.register(watcher, [StandardWatchEventKinds.ENTRY_DELETE]);
        expect(deleteKey).toBe(myKey);
        checkKey(deleteKey, dir);
        await wait1Sec();

        await Files.delete(file);
        await takeExpectedKey(watcher, myKey);
        checkExpectedEvent(
            myKey.pollEvents(),
            StandardWatchEventKinds.ENTRY_DELETE,
            path
        );
        expect(myKey.reset()).toBeTruthy();

        // create the file for the next test
        await Files.createFile(file);

        // --- ENTRY_MODIFY ---
        const modifyKey = await dir.register(watcher, [StandardWatchEventKinds.ENTRY_MODIFY]);
        expect(modifyKey).toBe(myKey);
        checkKey(deleteKey, dir);
        await wait1Sec();

        await Files.writeString(file, "I am a small file", [StandardOpenOption.APPEND]);

        // remove key and check that we got the ENTRY_MODIFY event
        await takeExpectedKey(watcher, myKey);
        checkExpectedEvent(
            myKey.pollEvents(),
            StandardWatchEventKinds.ENTRY_MODIFY,
            path
        );

        // done
        await Files.delete(file);
    } finally {
        await closeWatcher(watcher);
    }
}, TIMEOUT_20_SECONDS); // 20 seconds

test("Check that a cancelled key will never be queued", async () => {
    const fs = await FileSystems.getDefault();
    let watcher: WatchService | undefined;
    try {
        watcher = fs.newWatchService();
        // register for event
        const myKey = await dir.register(watcher, [StandardWatchEventKinds.ENTRY_CREATE]);
        checkKey(myKey, dir);
        await wait1Sec();
        myKey.cancel();

        const file = dir.resolveFromString("mars");
        await Files.createFile(file);
        const key = await watcher.poll(3000, ChronoUnit.MILLIS);
        expect(key).toBeNull();

        await Files.delete(file);

    } finally {
        await closeWatcher(watcher);
    }
}, TIMEOUT_20_SECONDS); // 20 seconds

test("Check that deleting a registered directory causes the key to be cancelled and queued.", async () => {
    const fs = await FileSystems.getDefault();
    const subDir = await Files.createDirectory(dir.resolveFromString("bar"));
    let watcher: WatchService | undefined;
    try {
        watcher = fs.newWatchService();
        // register for event
        const myKey = await subDir.register(watcher, [StandardWatchEventKinds.ENTRY_CREATE]);
        await wait1Sec();
        await Files.delete(subDir);
        await takeExpectedKey(watcher, myKey);
        expect(myKey.reset()).toBeFalsy();
        expect(myKey.isValid()).toBeFalsy();
    } finally {
        await closeWatcher(watcher);
    }
}, TIMEOUT_20_SECONDS);

test("Simple test to check exceptions and other cases", async () => {
    const fs = await FileSystems.getDefault();
    let watcher: WatchService | undefined;
    try {
        watcher = fs.newWatchService();
        // Poll tests
        let key = await watcher.poll();
        expect(key).toBeNull();
        const start = Instant.now().toEpochMilli();
        key = await watcher.poll(3000, ChronoUnit.MILLIS);
        const waited = Instant.now().toEpochMilli() - start;
        expect(key).toBeNull();
        expect(waited).toBeGreaterThan(2900);

        // IllegalArgumentException
        try {
            await dir.register(watcher, []);
            throw new Error("IllegalArgumentException not thrown");
        } catch (e) {
            expect(e instanceof IllegalArgumentException).toBeTruthy();
        }

        // OVERFLOW is ignored so this is equivalent to the empty set
        try {
            await dir.register(watcher, [StandardWatchEventKinds.OVERFLOW]);
            throw new Error("IllegalArgumentException not thrown");
        } catch (e) {
            expect(e instanceof IllegalArgumentException).toBeTruthy();
        }

        // OVERFLOW is ignored even if specified multiple times
        try {
            await dir.register(watcher, [StandardWatchEventKinds.OVERFLOW, StandardWatchEventKinds.OVERFLOW]);
            throw new Error("IllegalArgumentException not thrown");
        } catch (e) {
            expect(e instanceof IllegalArgumentException).toBeTruthy();
        }

        // UnsupportedOperationException
        try {
            await dir.register(watcher, [new class implements WatchEventKind<unknown> {
                name(): string {
                    return "custom";
                }

                type(): string {
                    return "custom";
                }
            }]);
            throw new Error("UnsupportedOperationException not thrown");
        } catch (e) {
            expect(e instanceof UnsupportedOperationException).toBeTruthy();
        }

        try {
            await dir.register(watcher, [StandardWatchEventKinds.ENTRY_CREATE, new class implements WatchEventKind<unknown> {
                name(): string {
                    return "custom";
                }

                type(): string {
                    return "custom";
                }
            }]);
            throw new Error("UnsupportedOperationException not thrown");
        } catch (e) {
            expect(e instanceof UnsupportedOperationException).toBeTruthy();
        }

    } finally {
        await closeWatcher(watcher);
    }

    // -- ClosedWatchServiceException --
    try {
        await watcher.poll();
        throw new Error("ClosedWatchServiceException not thrown");
    } catch (e) {
        expect(e instanceof ClosedWatchServiceException).toBeTruthy();
    }

    // assume that poll throws exception immediately
    const start = Instant.now().toEpochMilli();
    try {
        await watcher.poll(10000, ChronoUnit.MILLIS);
        throw new Error("ClosedWatchServiceException not thrown");
    } catch (e) {
        expect(e instanceof ClosedWatchServiceException).toBeTruthy();
        const waited = Instant.now().toEpochMilli() - start;
        expect(waited).toBeLessThan(5000);
    }

    try {
        await watcher.take();
        throw new Error("ClosedWatchServiceException not thrown");
    } catch (e) {
        expect(e instanceof ClosedWatchServiceException).toBeTruthy();
    }

    try {
        await dir.register(watcher, [StandardWatchEventKinds.ENTRY_CREATE]);
        throw new Error("ClosedWatchServiceException not thrown");
    } catch (e) {
        expect(e instanceof ClosedWatchServiceException).toBeTruthy();
    }


}, TIMEOUT_20_SECONDS);