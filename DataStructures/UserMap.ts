import {ConnectedUser} from '../Interfaces/interfaces';

export default class UserMap {

    private onlineUsers: Map<string, ConnectedUser>;

    constructor() {
        this.onlineUsers = new Map<string, ConnectedUser>();
    }

    public addUser(userId: any, userSocket: any) : void {
        this.onlineUsers.set(userId, userSocket);
    }

}