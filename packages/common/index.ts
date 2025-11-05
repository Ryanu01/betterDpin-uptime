export interface SignUpInCommingMessage{
    ip: string,
    publicKey: string,
    signedMessage: string,
    callbackId: string
}

export interface ValidateIncommingMessage {
    callbackId: string,
    signedMessage: string,
    status: "Good" | "Bad",
    latency: number,
    websiteId: string,
    validatorId: string
}

export interface SignUpOutGoingMessage {
    validatorId: string,
    callbackId: string
}

export interface ValidateOutGoingMessage {
    url: string,
    callbackId: string,
    websiteId: string
}

export type IncommingMessage = {
    type: "signup"
    data: SignUpInCommingMessage 
} | {
    type: "validate"
    data: ValidateIncommingMessage
}

export type OutGoingMessage = {
    type: "signup"
    data: SignUpOutGoingMessage
} | {
    type: "validate"
    data: ValidateOutGoingMessage
}