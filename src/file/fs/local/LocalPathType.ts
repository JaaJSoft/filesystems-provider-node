/* A type that represents the type of local path. */
export enum LocalPathType {
    ABSOLUTE = "ABSOLUTE",                   //  C:\foo
    UNC = "UNC",                        //  \\server\share\foo
    RELATIVE = "RELATIVE",                   //  foo
    DIRECTORY_RELATIVE = "DIRECTORY_RELATIVE",         //  \foo
    DRIVE_RELATIVE = "DRIVE_RELATIVE"              //  C:foo
}
