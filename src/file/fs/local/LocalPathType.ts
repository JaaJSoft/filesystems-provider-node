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

/* A type that represents the type of local path. */
export enum LocalPathType {
    ABSOLUTE = "ABSOLUTE",                   //  C:\foo
    UNC = "UNC",                        //  \\server\share\foo
    RELATIVE = "RELATIVE",                   //  foo
    DIRECTORY_RELATIVE = "DIRECTORY_RELATIVE",         //  \foo
    DRIVE_RELATIVE = "DRIVE_RELATIVE"              //  C:foo
}
