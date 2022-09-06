import {GroupPrincipal} from "@filesystems/core/file/attribute";
import {Principal} from "@filesystems/core";


export class LocalGroupPrincipal implements GroupPrincipal {
    private readonly groupName: string | null;
    private readonly gid: number;

    constructor(uid: number, groupName: string | null) {
        this.groupName = groupName;
        this.gid = uid;
    }

    public equals(other: Principal): boolean {
        if (!(other instanceof LocalGroupPrincipal)) {
            return false;
        }
        return this.getGid() === other.getGid();
    }

    public getName(): string {
        return this.groupName ? this.groupName : this.gid.toString();
    }


    public getGid(): number {
        return this.gid;
    }

}
