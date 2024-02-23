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
