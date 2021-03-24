interface MsgPayload {
    event: string
}

export interface msgType {
    method: string,
    payload?: MsgPayload
    info?: string
}

export interface Alert {
    topic: string,
    info: string,
    fromId: string,
    toId: string
    id: string
    new: boolean
}

export interface FriendInfo {
    name: string,
    status: string,
    desc: string,
    icon: string,
    joinTime: string
}
