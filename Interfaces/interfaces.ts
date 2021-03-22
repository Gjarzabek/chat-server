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
}