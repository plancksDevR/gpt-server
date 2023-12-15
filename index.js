const PORT = process.env.PORT || 8000
const express = require('express')
const cors = require('cors')
const { OpenAI } = require("openai")
const { createServer } = require('http')
const path = require('path')


require('dotenv').config()
const app = express()
const server = createServer(app)
const io = require("socket.io")(server, {
    cors: {
      origin: process.env.FRONTEND_URL, //|| 'http://localhost:3000'
      methods: ["GET", "POST"],
      credentials: true
    }
  })

app.use(cors({ origin: process.env.FRONTEND_URL })) // || 'http://localhost:3000'
console.log("Frontend URL:", process.env.FRONTEND_URL);


const API_KEY = process.env.API_KEY

const openai = new OpenAI({
    apiKey: API_KEY
})



let chatLog = [
    { role: 'system', content: 'You are a helpful assistant.' },
]

io.on('connection', (socket) => {
    console.log("A user connected!")

    socket.on('userInput', async (updatedChatBeforeAPI) => {
        try {
            const chatFeed = updatedChatBeforeAPI.map(({ role, content }) => ({ role, content }))

            let chatFeedNew = [...chatLog, ...chatFeed];
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: chatFeedNew,
                max_tokens: 1000,
                stream: true,
            })

            for await (const part of response) {
                const stream = part.choices?.[0]?.delta.content
                
                if (stream) {
                  socket.emit('serverUpdate', stream)
                }
            }

            socket.emit('serverUpdate', '[DONE]')
        } catch (err) {
            console.error(err)
            socket.emit('serverError', 'Internal Server Error')
        }
    })

    socket.on('disconnect', () => {
        console.log('User disconnected')
    })
})





server.listen(PORT, () => console.log('Your server is running on PORT ' + PORT))