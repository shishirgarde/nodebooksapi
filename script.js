const express = require('express');
const { CosmosClient } = require('@azure/cosmos');
const Joi = require('joi'); // Used for validation
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// 🔹 Replace with Azure Cosmos DB connection details (Use env variables)
const COSMOS_DB_ENDPOINT = '';
const COSMOS_DB_KEY = '';
const DATABASE_ID = '';
const CONTAINER_ID = '';

// Initialize Cosmos DB client
const client = new CosmosClient({ endpoint: COSMOS_DB_ENDPOINT, key: COSMOS_DB_KEY });
const database = client.database(DATABASE_ID);
const container = database.container(CONTAINER_ID);

// READ: Welcome Message
app.get('/', (req, res) => {
    res.send('Welcome to the Books API powered by Azure Cosmos DB!');
});

// READ: Get all books
app.get('/api/books', async (req, res) => {
    try {
        const { resources: books } = await container.items.readAll().fetchAll();
        res.send(books);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// READ: Get a book by ID
app.get('/api/books/:id', async (req, res) => {
    try {
        const { resource: book } = await container.item(req.params.id, req.params.id).read();
        if (!book) {
            return res.status(404).send('Book not found');
        }
        res.send(book);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// CREATE: Add a new book
app.post('/api/books', async (req, res) => {
    const { error } = validateBook(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const book = {
        id: `${Date.now()}`, // Unique ID
        title: req.body.title
    };

    try {
        await container.items.create(book);
        res.send(book);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// UPDATE: Update a book
app.put('/api/books/:id', async (req, res) => {
    const { error } = validateBook(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const { resource: book } = await container.item(req.params.id, req.params.id).read();
        if (!book) return res.status(404).send('Book not found');

        book.title = req.body.title;
        await container.item(req.params.id, req.params.id).replace(book);

        res.send(book);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// DELETE: Remove a book
app.delete('/api/books/:id', async (req, res) => {
    try {
        const { resource: book } = await container.item(req.params.id, req.params.id).read();
        if (!book) return res.status(404).send('Book not found');

        await container.item(req.params.id, req.params.id).delete();
        res.send(book);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// READ: Get a book by title
app.get('/api/books/title/:title', async (req, res) => {
    try {
        const querySpec = {
            query: "SELECT * FROM c WHERE c.title = @title",
            parameters: [{ name: "@title", value: req.params.title }]
        };

        const { resources: books } = await container.items.query(querySpec).fetchAll();
        
        if (books.length === 0) {
            return res.status(404).send('Book not found');
        }

        res.send(books[0]); // Return the first matching book
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Validate book input
function validateBook(book) {
    const schema = Joi.object({
        title: Joi.string().min(3).required()
    });
    return schema.validate(book);
}

// Start server
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on port ${port}...`));
