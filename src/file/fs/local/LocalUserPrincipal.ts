import {UserPrincipal} from "@filesystems/core/file/attribute";
import {Principal} from "@filesystems/core";


export class LocalUserPrincipal implements UserPrincipal {
    private readonly accountName: string | null;
    private readonly uid: number;

    constructor(uid: number, accountName: string | null) {
        this.accountName = accountName;
        this.uid = uid;
    }

    public equals(other: Principal): boolean {
        if (!(other instanceof LocalUserPrincipal)) {
            return false;
        }
        return this.getUid() === other.getUid();
    }

    public getName(): string {
        return this.accountName ? this.accountName : this.uid.toString();
    }


    public getUid(): number {
        return this.uid;
    }
}
