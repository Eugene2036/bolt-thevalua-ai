require('dotenv').config();
const xlsx = require('xlsx');
const mysql = require('mysql2/promise');

const currentDate = new Date();
const year = currentDate.getFullYear();
const month = String(currentDate.getMonth() + 1).padStart(2, "0");
const day = String(currentDate.getDate()).padStart(2, "0");
const hour = String(currentDate.getHours()).padStart(2, "0");
const minute = String(currentDate.getMinutes()).padStart(2, "0");
const second = String(currentDate.getSeconds()).padStart(2, "0");
const formattedCurrentDateTime = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

function generateRandomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 25; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        result += chars[randomIndex];
    }
    return result;
}

function safeToString(value) {
    // Check if the value is not undefined and not null
    if (value !== undefined && value !== null) {
        return value.toString();
    } else {
        // Handle the error case appropriately
        console.error('Warning: Attempted to call toString on undefined or null');
        return ''; // or some default string value
    }
}

function useFunctionAsString(func) {
    if (typeof func !== 'function') {
        throw new Error('Expected a function');
    }

    // Convert the function to a string
    const funcString = func.toString();

    // Now funcString can be used as a non-functional parameter
    console.log('Function as string:', funcString);
    
    // Example usage in a context
    // bindParameter(funcString); // Assume bindParameter expects a string
    return funcString;
}

function convertStringToDate(dateString) {
    // Split the date string by the '/' character to get day, month, and year
    const [day, month, year] = dateString.split('/').map(Number);
    
    // Create a new Date object using the parts.
    // Note: In JavaScript, months are 0-indexed, so you must subtract 1 from the month.
    const date = new Date(year, month - 1, day);
    
    return date;
}

function safeBindParameter(value) {
    return value === undefined ? null : value;
}

async function importExcelToMySQL(filePath) {
    // MySQL connection configuration
    const connection = await mysql.createConnection({
        host: process.env.JAWSDB_HOST,
        user: process.env.JAWSDB_USER,
        password: process.env.JAWSDB_PASSWORD,
        database: process.env.JAWSDB_DATABASE,
        port: process.env.JAWSDB_PORT
    });

    const Today = new Date();

    try {
        // Read Excel file
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];  // Assuming you need the first sheet
        const sheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON format
        const data = xlsx.utils.sheet_to_json(sheet);
        console.log(data);
        // Iterate over the rows and insert into the database
        for (const row of data) {
            let recordID = generateRandomId();
            // Modify the SQL query to match your table's schema and row's structure
            await connection.execute(
                `INSERT INTO ComparablePlot (id, updatedAt, plotNumber, plotExtent, propertyType, location, suburb, price, transactionDate, titleDeed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [recordID, Today, (row.PlotNumber), (row.plotExtent), (row.propertyType), (row.location), (row.suburb), (row.price), convertStringToDate(row.transactionDate), (row.titleDeed)]
            );
        }

        console.log('Comparables Data imported successfully!');
    } catch (error) {
        console.error('Error importing data:', error);
    } finally {
        await connection.end();
    }
}

importExcelToMySQL('../app/comps2018.xlsx')
       .catch(err => console.error('Failed to import data:', err));

