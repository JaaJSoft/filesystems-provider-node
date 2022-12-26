import {FileTypeDetector} from "@filesystems/core/file/spi";
import {Path} from "@filesystems/core/file";

export class SimpleFileTypeDetector extends FileTypeDetector {

    constructor() {
        super();
    }

    probeContentType(path: Path): string | null {
        const name = path.toString();
        return name.endsWith(".grape") ? "grape/unknown" : null;
    }

}
