import express from "express";
import { authMiddleware } from "./middleware";
import { prismaClient } from "db/client";

const app = express();

app.post('/api/v1/website', authMiddleware, async (req, res) => {
    const userId = req.userId;
    
})

app.get('/api/v1/website/status', authMiddleware, (req, res) => {

})

app.get('/api/v1/websites', authMiddleware, (req, res) => {

})

app.delete('api/v1/website/', authMiddleware, (req, res) => {

})

app.listen(3000);