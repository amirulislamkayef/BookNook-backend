import express from 'express'
import { MongoClient } from 'mongodb';
import 'dotenv/config'
import cors from 'cors'
import { ObjectId } from 'mongodb';

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
const BorrowCollection = db.collection('BorrowBooks')


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

//details page api
app.get('/book/:id', async (req, res) => {
    const { id } = req.params
    const result = await bookCollection.findOne({ _id: new ObjectId(id) })
    res.send(result)
})

//new arrivals books
app.get('/newbooks', async (req, res) => {
    const result = await bookCollection
        .find()
        .sort({ _id: -1 })
        .limit(10)
        .toArray();

    res.send(result);
});

//borrow api
app.post('/borrow', async (req, res) => {
    const data = req.body
    const result = await BorrowCollection.insertOne(data)
    res.send(result)
})

//get borrow 
app.get('/my-borrows/:email', async (req, res) => {
    const { email } = req.params
    const result = await BorrowCollection.find({ email: email }).toArray()
    res.send(result)
})

//get my books
app.get("/my-books/:email", async (req, res) => {
    const email = req.params.email;
    const query = { userEmail: email };
    const result = await bookCollection.find(query).toArray();
    res.send(result);
});

// http://localhost:8000/my-books/
app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`server is running onn port ${port}`)
})
