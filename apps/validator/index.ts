import { randomUUIDv7 } from "bun";
import type { OutGoingMessage, ValidateOutGoingMessage, SignUpOutGoingMessage } from "common/types"
import  { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl"
import nacl_util from "tweetnacl-util"
import bs58 from "bs58";

const CALLBACKS: {[callbackId: string]: (data: SignUpOutGoingMessage) => void} = {}

let validatorId: string | null = null

async function getPublicIp(): Promise<string> {
    try {
        const res = await fetch ("https://api.ipify.org?format=json")
        const data: any = await res.json();
        console.log(data.ip);
        return data.ip;
    } catch (error) {
        return "unknow"
    }
}

async function main () {
    const keypair = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY!))
    );
    const ws = new WebSocket("ws://localhost:8081");
    ws.onmessage = async (event) => {
        const data: OutGoingMessage = JSON.parse(event.data);
        if(data.type === "signup") {
            CALLBACKS[data.data.callbackId]?.(data.data)
            delete CALLBACKS[data.data.callbackId];
        }else if(data.type === "validate") {
            await validateHandler(ws, data.data, keypair);
        }
    }

    ws.onopen = async () => {
        const callbackId = randomUUIDv7();
        CALLBACKS[callbackId] = (data: SignUpOutGoingMessage) => {
            validatorId = data.validatorId
        }
        const ip = await getPublicIp();
        const signedMessage = await signMessage(`Signed message for ${callbackId}, ${keypair.publicKey}`, keypair);

        ws.send(JSON.stringify({
            type: 'signup',
            data: {
                callbackId,
                ip,
                publicKey: keypair.publicKey,
                signedMessage  
            }
        }))
    }
}

async function validateHandler(ws: WebSocket, {url, callbackId, websiteId }: ValidateOutGoingMessage, keypair: Keypair) {
    console.log(`Validating ${url}`);
    const startTime = Date.now();
    const signature = await signMessage(`Replying to ${callbackId}`, keypair)        

    try {
        const response = await fetch (url); 
        const endTime = Date.now();
        const latency = endTime - startTime;
        const status = response.status;
        console.log(url);
        console.log(status);
        ws.send(JSON.stringify({
            type: "validate",
            data: {
                callbackId,
                status: status === 200 ? "Good" : "Bad",
                latency,
                websiteId,
                validatorId,
                signedMessage: signature
            }
        }))
    } catch (error) {
        ws.send(JSON.stringify({
            type: "validate",
            data: {
                callbackId,
                status: "Bad",
                latency: 1000,
                websiteId,
                validatorId,
                signedMessage: signature
            }
        })) 
        console.log(error);
    }

}

async function signMessage(message: string, keypair: Keypair) {
    const messageBytes = nacl_util.decodeUTF8(message);
    const signature = nacl.sign.detached(messageBytes, keypair.secretKey);

    return JSON.stringify(Array.from(signature));
}

main();

setInterval(async () => {

}, 1000)