import express from "express";
import { authMiddleware } from "./middleware";
import { prismaClient } from "db/client";
import cors from "cors";
import { config } from "dotenv";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import pkg from "bs58"
import { PRIVATE_KEY } from "./privateKey";
config();
const {decode} = pkg
const app = express();
app.use(express.json())
app.use(cors())
const TOTAL_DECIMALS = 1000000000
app.post('/api/v1/website', authMiddleware, async (req, res) => {
    const userId = req.userId!;
    const { url } = req.body


    const data = await prismaClient.website.create({
        data: {
            userId,
            url 
        }
    })
    
    res.json({
        id: data.id
    })
})

app.get('/api/v1/website/status', authMiddleware, async (req, res) => {
    const websiteId = req.query.body as unknown as string;
    const userId = req.userId;

    const data = await prismaClient.website.findFirst({
        where: {
            id: websiteId,
            userId,
            disabled: false
        }, include: {
            ticks: true,
        }
    })

    res.json(data)
})

app.get('/api/v1/websites', authMiddleware, async (req, res) => {
    const userId = req.userId;

    const websites = await prismaClient.website.findMany({
        where: {
            userId,
            disabled: false
        }, include: {
            ticks: true
        }
    })

    res.json({
        websites
    })
})

app.delete('/api/v1/website/', authMiddleware, async (req, res) => {
    const { id: websiteId } = req.body;
    const userId = req.userId;

    await prismaClient.website.update({
        where: {
            id: websiteId,
            userId,

        }, data: {
            disabled: true
        }
    })
    res.json({
        message: "Deleted website success"
    })
})

app.post('/api/v1/payout/:validatorId', authMiddleware, async (req, res) => {
    const userId = req.params.validatorId!;

    try {
        const lockresult = await prismaClient.$transaction(async txn => {
            const valdiator = await txn.validator.findFirst({
                where: {
                    id: userId
                }
            })

            if(!valdiator) {
                throw new Error('User not found')
            }

            if(!valdiator.publicKey) {
                throw new Error('Public key not found')
            }

            if(valdiator.pendingPayouts <= 0) {
                throw new Error("No pending payouts");
            }

            if(!txn) {
                return;
            }

            const existingPayout = await txn.payout.findFirst({
                where: {
                    validatorId: userId,
                    status: "Processing"
                }
            })

            if(existingPayout) {
                throw new Error('Payment processign')
            }

            const amountTopay = valdiator.pendingPayouts;

            await txn.validator.update({
                where: {
                    id: userId
                }, data: {
                    lockedAmount: {
                        increment: amountTopay
                    },
                    pendingPayouts: {
                        decrement: amountTopay
                    }
                }
            });


            const payout = await txn.payout.create({
                data: {
                    validatorId: userId,
                    amount: amountTopay,
                    status: "Processing",
                    signature: ""
                }
            })

            return {
                address: valdiator.publicKey,
                amountTopay,
                payoutId: payout.id
            }
        })

        if(!PRIVATE_KEY) {
            await prismaClient.validator.update({
                where: {
                    id: userId
                }, data: {
                    pendingPayouts: {
                        increment: lockresult?.amountTopay
                    }, lockedAmount: {
                        decrement: lockresult?.amountTopay
                    }
                }
            })
            await prismaClient.payout.update({
                where: {
                    id: lockresult?.payoutId
                }, data: {
                    status: "Failed",
                }
            })

            return res.status(500).json({
                message: "Server Error transaction failed"
            })
       } 

       const keyPair = Keypair.fromSecretKey(decode(PRIVATE_KEY));

       const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: new PublicKey("D2iVeJ14J6xJjS2pwqtqC3yqQbmp3VJ1B1pTz54sPfpi"),
            toPubkey: new PublicKey(lockresult?.address!),
            lamports: 1000000000 * lockresult?.amountTopay! / TOTAL_DECIMALS
        })
       )
       const connection = new Connection(process.env.RPC_URL ?? "")
       let signature = ""
       
       try {
        signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [keyPair]
        )
        console.log(signature);
        
       } catch (error) {
            console.error("Blockchain transaction failed ", error)
            await prismaClient.validator.update({
                where: {
                    id: userId
                }, data: {
                    pendingPayouts: {
                        increment: lockresult?.amountTopay
                    },
                    lockedAmount: {
                        decrement: lockresult?.amountTopay
                    }
                }
            })
            await prismaClient.payout.update({
                where: {
                    id: lockresult?.payoutId
                }, data: {
                    status: "Failed",
                }
            })

            return res.status(500).json({
                message: "Transaction failed"
            })
       }

       await prismaClient.payout.update({
            where: {
                id: lockresult?.payoutId
            }, data: {
                status: "Sucess"
            }
       })

       await prismaClient.validator.update({
            where: {
                id: userId
            }, data: {
                lockedAmount: {
                    decrement: lockresult?.amountTopay
                }
            }
       })

       return res.status(200).json({
            message: "Payout successfull",
            signature: "signature",
            amount: lockresult?.amountTopay
       })
    } catch (error: any) {
        console.error("Payout error:", error);
        
        if (error.message === "User not found") {
            return res.status(403).json({ message: "User not found" })
        }
        if (error.message === "Worker address not found") {
            return res.status(400).json({ message: "Worker address not found" })
        }
        if (error.message === "No pending amount to payout") {
            return res.status(400).json({ message: "No pending amount to payout" })
        }
        if (error.message === "Payout already in progress") {
            return res.status(409).json({ message: "Payout already in progress" })
        }
        
        return res.status(500).json({
            message: "Payout processing failed"
        })
    }
})

app.get('/api/v1/balance/:validatorId', authMiddleware, async (req, res) => {
    const userId = req.params.validatorId;
    console.log(userId);
    
    const validatorDb = await prismaClient.validator.findFirst({
        where: {
            id: userId
        }
    })

    const balance = validatorDb?.pendingPayouts

    return res.status(200).json({
        message: "The available balance of the user is",
        balance
    })
})

app.listen(8080, () => {
    console.log("SERVER RUNING AT PORT 8080");
    
});