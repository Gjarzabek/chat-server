import {ConnectedUser} from './interfaces'

export class UserMap {

    private onlineUsers: Map<string, ConnectedUser>;

    constructor() {
        this.onlineUsers = new Map<string, ConnectedUser>();
    }

    public addUser(userInfo: any, userSocket: any) : void {
        this.onlineUsers.set(userInfo.id, {
            id: userInfo.id,
            nick: userInfo.nick,
            connection: userSocket
        });
    }

}