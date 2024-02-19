import {AbstractWatchService} from "@filesystems/core/file/AbstractWatchService";
import {
    DirectoryStream,
    Files,
    LinkOption,
    Path, Paths, StandardWatchEventKinds,
    WatchEventKind,
    WatchEventModifier,
    WatchKey
} from "@filesystems/core/file";
import {AbstractWatchKey} from "@filesystems/core/file/AbstractWatchKey";
import {FileTime} from "@filesystems/core/file/attribute";
import {ClosedWatchServiceException, DirectoryIteratorException} from "@filesystems/core/file/exception";
import {
    IllegalArgumentException,
    NullPointerException,
    UnsupportedOperationException
} from "@filesystems/core/exception";
import {NotDirectoryException} from "@filesystems/core/file/exception/NotDirectoryException";

const POLLING_INTERVAL = 2_000;

/**
 * Simple WatchService implementation that uses periodic tasks to poll
 * registered directories for changes.  This implementation is for use on
 * operating systems that do not have native file change notification support.
 */
export class PollingWatchService extends AbstractWatchService {

    // map of registrations
    private readonly _registrations = new Map<unknown, PollingWatchKey>;


    init(): void {
        throw new Error("Method not implemented.");
    }

    get registrations(): Map<unknown, PollingWatchKey> {
        return this._registrations;
    }

    async register(path: Path, events: WatchEventKind<unknown>[], modifiers?: WatchEventModifier[]): Promise<WatchKey> {
        // check events - CCE will be thrown if there are invalid elements
        const eventSet = new Set<WatchEventKind<unknown>>();
        for (const event of events) {
            // standard events
            if (event === StandardWatchEventKinds.ENTRY_CREATE ||
                event === StandardWatchEventKinds.ENTRY_MODIFY ||
                event === StandardWatchEventKinds.ENTRY_DELETE) {
                eventSet.add(event);
                continue;
            }

            // OVERFLOW is ignored
            if (event == StandardWatchEventKinds.OVERFLOW) {
                continue;
            }

            // null/unsupported
            if (event == null)
                throw new NullPointerException("An element in event set is 'null'");
            throw new UnsupportedOperationException(event.name());
        }

        if (eventSet.size === 0)
            throw new IllegalArgumentException("No events to register");

        // no modifiers supported at this time
        if (!modifiers) {
            throw new UnsupportedOperationException("Modifier not supported");
        }

        // check if watch service is closed
        if (!this.isOpen())
            throw new ClosedWatchServiceException();

        const attrs = await Files.readAttributesByName(path);
        if (!attrs.isDirectory()) {
            throw new NotDirectoryException(path.toString());
        }

        const fileKey = attrs.fileKey();

        if (!this.isOpen())
            throw new ClosedWatchServiceException();
        let watchKey = this._registrations.get(fileKey);
        if (!watchKey) {
            // new registration
            watchKey = new PollingWatchKey(path, this, fileKey);
            this._registrations.set(fileKey, watchKey);
        } else {
            watchKey.disable();
        }
        watchKey.enable(new Set<WatchEventKind<unknown>>(events));
        return watchKey;
    }


    async implClose(): Promise<void> {
        for (const entry of this._registrations.entries()) {
            const watchKey = entry[1];
            watchKey.disable();
            watchKey.invalidate();
        }
        this._registrations.clear();
    }

}

/**
 * Entry in directory cache to record file last-modified-time and tick-count
 */
class CacheEntry {
    private _lastModified: FileTime;
    private _lastTickCount: number;

    constructor(lastModified: FileTime, lastTickCount: number) {
        this._lastModified = lastModified;
        this._lastTickCount = lastTickCount;
    }

    lastModified(): FileTime {
        return this._lastModified;
    }

    lastTickCount(): number {
        return this._lastTickCount;
    }

    update(lastModified: FileTime, tickCount: number) {
        this._lastModified = lastModified;
        this._lastTickCount = tickCount;
    }
}

/**
 * WatchKey implementation that encapsulates a map of the entries of the
 * entries in the directory. Polling the key causes it to re-scan the
 * directory and queue keys when entries are added, modified, or deleted.
 */
class PollingWatchKey extends AbstractWatchKey {
    private readonly _fileKey: unknown;
    // current event set
    private _events: Set<WatchEventKind<unknown>> = new Set<WatchEventKind<unknown>>();
    // indicates if the key is valid
    private valid: boolean;
    // used to detect files that have been deleted
    private tickCount: number;
    // map of entries in directory
    private entries: Map<string, CacheEntry>;
    private poller?: NodeJS.Timer;

    constructor(dir: Path, watcher: AbstractWatchService, fileKey: unknown) {
        super(dir, watcher);
        this._fileKey = fileKey;
        this.valid = true;
        this.tickCount = 0;
        this.entries = new Map<string, CacheEntry>();
    }

    public async init() {
        // get the initial entries in the directory
        const stream: DirectoryStream<Path> = await Files.newDirectoryStream(this.watchable());
        try {
            for await (const entry of stream) {
                // don't follow links
                const lastModified = await Files.getLastModifiedTime(entry, [LinkOption.NOFOLLOW_LINKS]);
                this.entries.set((entry.getFileName() as Path).toString(), new CacheEntry(lastModified, this.tickCount));
            }
        } catch (e) {
            if (e instanceof DirectoryIteratorException)
                throw e.getCause();
        } finally {
            stream.close();
        }
    }

    fileKey(): unknown {
        return this._fileKey;
    }

    isValid(): boolean {
        return this.valid;
    }

    invalidate(): void {
        this.valid = false;
    }

    enable(events: Set<WatchEventKind<unknown>>) {
        this._events = events;
        this.poller = setInterval(() => this.poll(), POLLING_INTERVAL);
    }

    disable() {
        clearInterval(this.poller);
    }


    cancel() {
        this.valid = false;
        (this.watcher() as unknown as PollingWatchService).registrations.delete(this.fileKey());
        this.disable();
    }

    async poll() {
        if (!this.valid) {
            return;
        }
        // update tick
        this.tickCount++;

        let stream: DirectoryStream<Path> | null = null;
        try {
            stream = await Files.newDirectoryStream(this.watchable());
        } catch (x) {
            // directory is no longer accessible so cancel key
            this.cancel();
            this.signal();
            return;
        }
        try {
            for await (const entry of stream) {
                let lastModified: FileTime;
                try {
                    lastModified = await Files.getLastModifiedTime(entry, [LinkOption.NOFOLLOW_LINKS]);
                } catch (e) {
                    // unable to get attributes of entry. If file has just
                    // been deleted then we'll report it as deleted on the
                    // next poll
                    continue;
                }

                const e = this.entries.get((entry.getFileName() as Path).toString());
                if (!e) {
                    this.entries.set((entry.getFileName() as Path).toString(), new CacheEntry(lastModified, this.tickCount));

                    if (this._events.has(StandardWatchEventKinds.ENTRY_CREATE)) {
                        this.signalEvent(StandardWatchEventKinds.ENTRY_CREATE, entry.getFileName());
                        continue;
                    } else {
                        // if ENTRY_CREATE is not enabled and ENTRY_MODIFY is
                        // enabled then queue event to avoid missing out on
                        // modifications to the file immediately after it is
                        // created.
                        if (this._events.has(StandardWatchEventKinds.ENTRY_MODIFY)) {
                            this.signalEvent(StandardWatchEventKinds.ENTRY_MODIFY, entry.getFileName());
                        }
                    }
                    continue;
                }
                // check if file has changed
                if (!e.lastModified().toInstant().equals(lastModified.toInstant())) {
                    if (this._events.has(StandardWatchEventKinds.ENTRY_MODIFY)) {
                        this.signalEvent(
                            StandardWatchEventKinds.ENTRY_MODIFY,
                            entry.getFileName()
                        );
                    }
                }
                // entry in cache so update poll time
                e.update(lastModified, this.tickCount);
            }
        } catch (e) {
            if (e instanceof DirectoryIteratorException) {
                // ignore for now; if the directory is no longer accessible
                // then the key will be cancelled on the next poll
            } else {
                throw e;
            }
        } finally {
            stream.close();
        }
        // iterate over cache to detect entries that have been deleted
        for (const i of this.entries.entries()) {
            const entry = i[1];
            if (entry.lastTickCount() !== this.tickCount) {
                const name = await Paths.of(i[0]);
                // remove from map and queue delete event (if enabled)
                this.entries.delete(i[0]);
                if (this._events.has(StandardWatchEventKinds.ENTRY_DELETE)) {
                    this.signalEvent(StandardWatchEventKinds.ENTRY_DELETE, name);
                }
            }
        }
    }
}
