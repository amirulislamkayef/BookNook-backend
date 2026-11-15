import express from 'express'
import { MongoClient } from 'mongodb';
import 'dotenv/config'
import cors from 'cors'

const app = express()
const port = 8000

app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}
const mongoClient = await connectToMongoDB()

const db = mongoClient.db('booknook')
const bookCollection = db.collection('books')

//add books api
app.post('/add-book', async (req, res) => {
    const data = req.body
    const result = await bookCollection.insertOne(data)
    res.send(result)
})

//get books api
app.get('/books', async (req, res) => {
    const result = await bookCollection.find().toArray()
    res.send(result)
})

// http://localhost:8000/books
app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`server is running onn port ${port}`)
})
