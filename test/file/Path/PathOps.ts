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


import {Path} from "@filesystems/core/file";

describe("PathOps", () => {
    let path: Path;

    function fail(): void {
        throw new Error("PathOps failed");
    }

    function checkPath(): void {
        if (!path) {
            throw new Error("path is null or undefined");
        }
    }

    function check(result: any, expected: string) {

    }

    expect();
});
