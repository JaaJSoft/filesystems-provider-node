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

import {AbstractWatchService} from "@filesystems/core/file/AbstractWatchService";
import {FileChangeInfo, watch} from "fs/promises";
import {Path, WatchEventKind, WatchEventModifier, WatchKey} from "@filesystems/core/file";

interface Watcher {
    events: AsyncIterable<FileChangeInfo<string>>
    eventTypes: WatchEventKind<unknown>[]
    modifiers?: WatchEventModifier[]
    abort: AbortController
}

export class LocalWatchService extends AbstractWatchService {

    private readonly watchers: Watcher[] = [];

    public constructor() {
        super();
    }

    public register(path: Path, events: WatchEventKind<unknown>[], modifiers?: WatchEventModifier[]): void {
        const abort = new AbortController();
        const watcher: Watcher = {
            events: watch(path.toString(), {signal: abort.signal}),
            abort,
            eventTypes: events,
            modifiers
        };
        this.watchers.push(watcher);
    }

    public async implClose(): Promise<void> {
        for (const watcher of this.watchers) {
            watcher.abort.abort();
        }
    }

    public async take(): Promise<WatchKey> {
        return Promise.resolve(undefined);
    }


}
