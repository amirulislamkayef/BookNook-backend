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

//middleware
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ msg: "Unauthorized!" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).send({ msg: "Unauthorized!" });
    }

    const JWKS = createRemoteJWKSet(
        new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
    );

    try {
        const { payload } = await jwtVerify(token, JWKS);
        next();
    } catch (error) {
        return res.status(500).send({ msg: "Server Error!" });
    }
};


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
    try {
        const data = req.body
        const { _id, email } = data

        const bookId = new ObjectId(_id)
        const alreadyBorrowed = await BorrowCollection.findOne({
            email: email,
            bookId: bookId
        })
        if (alreadyBorrowed) {
            return res.status(409).send({
                message: "You have already borrowed this book"
            })
        }
        const updateBook = await bookCollection.updateOne(
            {
                _id: bookId,
                totalCopies: { $gt: 0 }
            },
            {
                $inc: { totalCopies: -1 }
            }
        )
        if (updateBook.modifiedCount === 0) {
            return res.status(400).send({
                message: "No copies available"
            })
        }

        const borrowData = {
            ...data,
            bookId: bookId
        }
        const result = await BorrowCollection.insertOne(borrowData)
        res.status(201).send({
            success: true,
            message: "Book borrowed successfully",
            result
        })
    } catch (error) {
        res.status(500).send({
            message: "Something went wrong",
            error: error.message
        })
    }
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

// Return Book API
app.delete('/return/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body;

        const borrow = await BorrowCollection.findOne({
            _id: id,
            email: email
        });

        if (!borrow) {
            return res.status(404).send({
                message: "Borrow record not found"
            });
        }
        const updateBook = await bookCollection.updateOne(
            { _id: borrow.bookId },
            { $inc: { totalCopies: 1 } }
        );

        if (updateBook.matchedCount === 0) {
            return res.status(404).send({
                message: "Book not found"
            });
        }
        const deleteBorrow = await BorrowCollection.deleteOne({
            _id: id,
            email: email
        });

        res.send({
            success: true,
            message: "Book returned successfully"
        });

    } catch (error) {
        console.log("Return Error:", error);

        res.status(500).send({
            message: error.message
        });
    }
});

//delete book api
app.delete('/delete-book/:id', async (req, res) => {
    const { id } = req.params;
    const result = await bookCollection.deleteOne({
        _id: new ObjectId(id)
    });
    res.send(result);
});

//edit book api
app.patch('/update-book/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const result = await bookCollection.updateOne(
        { _id: new ObjectId(id) },
        {
            $set: data
        }
    );
    res.send(result);
});

// http://localhost:8000/my-books/
app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`server is running onn port ${port}`)
})
