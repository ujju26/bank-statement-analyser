const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const csv = require('csv-parser');  // To parse CSV files
const fs = require('fs');  // To read files from the filesystem
const path = require('path');
const transactionsRoutes = require("./routes/transactions");
const summaryRoutes = require("./routes/summary");
const db = require("./db");  // Database connection

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/transactions", transactionsRoutes);
app.use("/api/summary", summaryRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// File upload handling (using multer)
const multer = require("multer");

// Set up multer to handle file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'src/uploads');  // Set the upload directory to src/uploads
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);  // Make the file name unique
    }
});

const upload = multer({ storage: storage });  // Initialize multer with the above settings

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const filePath = path.join(__dirname, 'uploads', req.file.filename);
    console.log('File uploaded to:', filePath);

    const transactions = [];

    if (filePath.endsWith('.csv')) {
        fs.createReadStream(filePath)
            .pipe(csv())  // Automatically detects headers
            .on('data', (row) => {
                transactions.push(row);  // Store row as JSON object
            })
            .on('end', () => {
                console.log('CSV file successfully processed');
                storeTransactions(transactions);
                res.json({ message: 'File uploaded and parsed successfully.', transactions });
            });
    } else if (filePath.endsWith('.json')) {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return res.status(500).send('Error reading JSON file.');
            }
            const transactions = JSON.parse(data);
            storeTransactions(transactions);
            res.json({ message: 'File uploaded and parsed successfully.', transactions });
        });
    } else {
        return res.status(400).send('Unsupported file type. Only CSV and JSON are allowed.');
    }
});

// // Function to store transactions dynamically
// const storeTransactions = (transactions) => {
//     db.run('DELETE FROM transactions', (err) => {
//         if (err) {
//             console.error('Error clearing transactions table:', err);
//             return;
//         }
//         console.log('Transactions table cleared.');

//         transactions.forEach((transaction) => {
//             const transactionData = JSON.stringify(transaction); // Convert row to JSON string

//             db.run(
//                 `INSERT INTO transactions (data) VALUES (?)`,
//                 [transactionData],
//                 (err) => {
//                     if (err) {
//                         console.error('Error inserting transaction into database', err);
//                     } else {
//                         console.log('Transaction inserted successfully.');
//                     }
//                 }
//             );
//         });
//     });
// };


const natural = require("natural");
const { classifyTransaction } = require("./utils/transactionClassifier");

const possibleDescriptionFields = ["description", "transaction_remarks", "transaction remarks","Transaction Remarks", "note", "details", "remarks", "memo"];

const storeTransactions = (transactions) => {
    db.run("DELETE FROM transactions", (err) => {
        if (err) {
            console.error("Error clearing transactions table:", err);
            return;
        }
        console.log("Transactions table cleared.");

        if (transactions.length === 0) {
            console.error("No transactions to store.");
            return;
        }

        console.log("Detected Columns:", Object.keys(transactions[0])); // Debugging column names

        // Identify correct column for transaction description
        const descriptionColumn = Object.keys(transactions[0]).find((key) =>
            possibleDescriptionFields.some(field => key.trim().toLowerCase() === field.toLowerCase())
        );

        if (!descriptionColumn) {
            console.error("No valid transaction description column found. Available columns:", Object.keys(transactions[0]));
        } else {
            console.log("Using column for description:", descriptionColumn);
        }

        transactions.forEach((transaction) => {
            console.log("Processing transaction:", transaction);

            if (!transaction.category && descriptionColumn && transaction[descriptionColumn]) {
                transaction.category = classifyTransaction(transaction[descriptionColumn]);
                console.log(`Transaction: ${transaction[descriptionColumn]} -> Category: ${transaction.category}`);
            } else if (!transaction.category) {
                transaction.category = "Uncategorized";
                console.log("No valid description found, defaulting to Uncategorized.");
            }

            const transactionData = JSON.stringify(transaction);

            db.run(
                `INSERT INTO transactions (data) VALUES (?)`,
                [transactionData],
                (err) => {
                    if (err) {
                        console.error("Error inserting transaction into database", err);
                    } else {
                        console.log("Transaction inserted successfully with category:", transaction.category);
                    }
                }
            );
        });
    });
};

