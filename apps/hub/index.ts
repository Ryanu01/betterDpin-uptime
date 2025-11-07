import { randomUUIDv7, type ServerWebSocket } from "bun";
import type {IncommingMessage, SignUpInCommingMessage } from "common/types";
import { PublicKey, ValidatorInfo } from "@solana/web3.js";
import nacl from "tweetnacl"
import {prismaClient} from "db/client"
import nacl_util from "tweetnacl-util"

const availableValidators: {validatorId: string, socket: ServerWebSocket<unknown>, publicKey: string}[] = [];

const CALLBACKS : {
    [callbackId: string] : (data: IncommingMessage) => void
} = {}

const COST_PER_VALIDATION = 100;

async function getLocation (ip: string) {
    if (ip === "unknown") return null;
    const res = await fetch (`https://ipapi.co/${ip}/json/`);
    return await res.json()
}

Bun.serve({
    fetch(req, server) {
        if(server.upgrade(req)) {
            return;
        }
        return new Response("Upgrade Failed", {status: 500});
    },
    port: 8081,
    websocket: {
        async message(ws: ServerWebSocket<unknown>, message: string) {
            const data: IncommingMessage = JSON.parse(message);

            if(data.type === "signup") {
                const verified = await verfiyMessage(
                    `Signed message for ${data.data.callbackId}, ${data.data.publicKey}`,
                    data.data.publicKey,
                    data.data.signedMessage
                );

                if(verified) {
                    await signupHandler(ws, data.data);
                } 
            } else if(data.type === "validate") {
                CALLBACKS[data.data.callbackId]!(data);
                delete CALLBACKS[data.data.callbackId];
            }
        },
        async close(ws: ServerWebSocket<unknown>) {
            availableValidators.splice(availableValidators.findIndex(v => v.socket === ws), 1)
        }
    }
})


async function signupHandler(ws: ServerWebSocket<unknown>, { ip, publicKey, signedMessage, callbackId}: SignUpInCommingMessage) {
    const validatorDb = await prismaClient.validator.findFirst({
        where: {
            publicKey,
        }
    })

    if(validatorDb) {
        ws.send(JSON.stringify({
            type: 'signup',
            data: {
                validatorId: validatorDb.id,
                callbackId
            }
        }));

        availableValidators.push({
            validatorId: validatorDb.id,
            socket: ws,
            publicKey: validatorDb.publicKey
        });
        return 
    }
    const geo: any = await getLocation(ip);
    console.log(geo.city);
    
    // get the og ip and location via some api
    const validator = await prismaClient.validator.create({
        data: {
            ip,
            publicKey,
            location: geo.city
        }
    })
    console.log("The ip of the validator is: ", validator.ip);
    
    ws.send(JSON.stringify({
        type: 'signup',
        data: {
            validatorId: validator.id,
            callbackId
        }
    }))

    availableValidators.push({
        validatorId: validator.id,
        socket: ws,
        publicKey: validator.publicKey
    })
}

async function verfiyMessage(message: string, publicKey: string, signature: string) {
    const messageBytes = nacl_util.decodeUTF8(message);
    const result = nacl.sign.detached.verify(
        messageBytes, 
        new Uint8Array(JSON.parse(signature)),
        new PublicKey(publicKey).toBytes(),
    )

    return result;
}

setInterval(async () => {
    const websitesToMonitor = await prismaClient.website.findMany({
        where: {
            disabled: false
        }
    })

    for (const websites of websitesToMonitor) {
        availableValidators.forEach(validator => {
            const callbackId = randomUUIDv7();
            console.log(`Sending validate to ${validator.validatorId} ${websites.url}`);
            validator.socket.send(JSON.stringify({
                type: 'validate',
                data: {
                    url: websites.url,
                    callbackId
                }
            }));

            CALLBACKS[callbackId] = async (data: IncommingMessage) => {
                if(data.type === "validate") {
                    const { validatorId, status, latency, signedMessage } = data.data;
                    const verified = await verfiyMessage(
                        `Replying to ${callbackId}`,
                        validator.publicKey,
                        signedMessage
                    )
                    if(!verified) {
                        return;
                    }
                    await prismaClient.$transaction(async (tx) => {
                        await tx.websiteTick.create({
                            data: {
                                websiteId: websites.id,
                                validatorId,
                                status,
                                latency,
                                createdAt: new Date()
                            },
                        });

                        await tx.validator.update({
                            where: {
                                id: validatorId
                            },
                            data: {
                                pendingPayouts: {
                                    increment: COST_PER_VALIDATION
                                }
                            }
                        })
                    })
                }
            }
        })
    }
}, 60 * 1000)