const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const app = express();
const PORT = 3001;
const dbPath = './bom_data.db';

// Serve static files from the 'public' directory
app.use(express.json()); // for parsing application/json // for parsing application/json
app.use(express.static('public'));


// Function to initialize the database
const initializeDb = () => {
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database', err.message);
        } else {
            console.log('Connected to the SQLite database.');
            // Create tables and insert initial data
            db.serialize(() => {
                // Create tables
                db.run(`
                    CREATE TABLE IF NOT EXISTS products (
                        productId TEXT PRIMARY KEY,
                        productName TEXT,
                        imageUrl TEXT
                    )`);
                
                db.run(`
                    CREATE TABLE IF NOT EXISTS versions (
                        versionId TEXT PRIMARY KEY,
                        productId TEXT,
                        version TEXT,
                        revision TEXT,
                        lastUpdated TEXT,
                        FOREIGN KEY(productId) REFERENCES products(productId)
                    )`);
                
                db.run(`
                    CREATE TABLE IF NOT EXISTS parts (
                        partId TEXT PRIMARY KEY,
                        versionId TEXT,
                        partName TEXT,
                        quantity INTEGER,
                        price REAL,
                        purchaseLink TEXT,
                        FOREIGN KEY(versionId) REFERENCES versions(versionId)
                    )`, () => {
                    // Insert initial data here
                    // Example: db.run("INSERT INTO products (productId, productName, imageUrl) VALUES (?, ?, ?)", ["P001", "Microcontroller Unit", "https://example.com/product_images/mcu.png"]);
                });
            });
        }
    });

    return db;
};

// Check if the database file exists and initialize it if it doesn't
const dbExists = fs.existsSync(dbPath);
let db = dbExists ? new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY) : initializeDb();

app.get('/api/bom', (req, res) => {
    const sql = `
    SELECT p.productName, v.version, v.revision, v.lastUpdated, pt.partName, pt.quantity, pt.price, pt.purchaseLink
    FROM products p
    JOIN versions v ON p.productId = v.productId
    JOIN parts pt ON v.versionId = pt.versionId`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({"error":err.message});
            return;
        }
        res.json({
            "message":"success",
            "data":rows
        })
    });
});

// Create a new BOM entry
app.post('/api/bom', (req, res) => {
    const { productName, version, revision, lastUpdated, partName, quantity, price, purchaseLink } = req.body;
    const insertSql = `INSERT INTO parts (versionId, partName, quantity, price, purchaseLink) VALUES (?, ?, ?, ?, ?)`;
    // Assuming versionId is available or you have a way to retrieve or generate it based on version info
    // This is a simplified example; you'd likely need to handle product and version creation too
    db.run(insertSql, [/* versionId */, partName, quantity, price, purchaseLink], function(err) {
        if (err) {
            return console.error(err.message);
        }
        res.send({ message: 'Entry added', lastID: this.lastID });
    });
});

// Update a BOM entry
app.put('/api/bom/:partId', (req, res) => {
    const { partName, quantity, price, purchaseLink } = req.body;
    const { partId } = req.params;
    const updateSql = `UPDATE parts SET partName = ?, quantity = ?, price = ?, purchaseLink = ? WHERE partId = ?`;
    db.run(updateSql, [partName, quantity, price, purchaseLink, partId], function(err) {
        if (err) {
            return console.error(err.message);
        }
        res.send({ message: 'Entry updated', changes: this.changes });
    });
});

// Delete a BOM entry
app.delete('/api/bom/:partId', (req, res) => {
    const { partId } = req.params;
    const deleteSql = `DELETE FROM parts WHERE partId = ?`;
    db.run(deleteSql, partId, function(err) {
        if (err) {
            return console.error(err.message);
        }
        res.send({ message: 'Entry deleted', changes: this.changes });
    });
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
