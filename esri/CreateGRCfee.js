require('dotenv').config();
const mysql = require('mysql2/promise');

const currentDate = new Date();
const year = currentDate.getFullYear();
const month = String(currentDate.getMonth() + 1).padStart(2, "0");
const day = String(currentDate.getDate()).padStart(2, "0");
const hour = String(currentDate.getHours()).padStart(2, "0");
const minute = String(currentDate.getMinutes()).padStart(2, "0");
const second = String(currentDate.getSeconds()).padStart(2, "0");
const formattedCurrentDateTime = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

const crypto = require('crypto');

function generateAlphanumericId(length = 25) {
    return crypto.randomBytes(length)
        .toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, length);
}


async function createGRCfeesData(connection) {

    // CREATE GRC DEVELOPMENTS DATA
    // const query = `
    //     INSERT INTO GrcFee (id, updatedAt, plotId, identifier, perc) 
    //     VALUES (?, ?, ?, ?, ?);
    // `;
    const query = `INSERT INTO GrcFee (id, updatedAt, plotId, identifier, perc)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        updatedAt = VALUES(updatedAt),
        plotId = VALUES(plotId),
        identifier = VALUES(identifier),
        perc = VALUES(perc);`

    try {
        const [rows] = await connection.query('SELECT * FROM Plot');

        if (rows.length > 0) {

            for (const row of rows) {

                try {
                    const [resultsProfessional] = await connection.execute(query, ['Professional' + row.id, formattedCurrentDateTime, row.id, 'Professional', 10.00]);
                    const [resultsContigencies] = await connection.execute(query, ['Contigencies' + row.id, formattedCurrentDateTime, row.id, 'Contigencies', 1.00]);
                    const [resultsStatutory] = await connection.execute(query, ['Statutory' + row.id, formattedCurrentDateTime, row.id, 'Statutory', 1.00]);
                    console.log('Insert GRC Fees Data successful:', resultsProfessional + resultsContigencies + resultsStatutory);
                } catch (error) {
                    if (error.code === 'ER_DUP_ENTRY') {

                        // // // Prepare and execute the query
                        // const [resultsProfessional] = await connection.execute(`SELECT plotId, Identifier, perc FROM GrcFee WHERE plotId = ? AND Identifier = 'Professional'`, [row.id]);
                        // const [resultsContigencies] = await connection.execute(`SELECT plotId, Identifier, perc FROM GrcFee WHERE plotId = ? AND Identifier = 'Contigencies'`, [row.id]);
                        // const [resultsStatutory] = await connection.execute(`SELECT plotId, Identifier, perc FROM GrcFee WHERE plotId = ? AND Identifier = 'Statutory'`, [row.id]);

                        // // Now you can access the selected values in variables
                        // const percProfessional = resultsProfessional[0].perc;
                        // const percContigencies = resultsContigencies[0].perc;
                        // const percStatutory = resultsStatutory[0].perc;

                        // const queryUpdate = `INSERT INTO GrcFee (id, updatedAt, plotId, identifier, perc)
                        //     VALUES (?, ?, ?, ?, ?)
                        //     ON DUPLICATE KEY UPDATE
                        //     updatedAt = VALUES(updatedAt),
                        //     plotId = VALUES(plotId),
                        //     identifier = VALUES(identifier),
                        //     perc = VALUES(perc);`;

                        // // console.log(`GRC Values: Global ID=${parentglobalid}, Structure Type=${structureType}, Measured Area=${measuredArea}`);

                        // const [resultsProfessional1] = await connection.execute(queryUpdate, ['Professional', percProfessional]);
                        // const [resultsContigencies1] = await connection.execute(queryUpdate, ['Contigencies', percContigencies]);
                        // const [resultsStatutory1] = await connection.execute(queryUpdate, ['Statutory', percStatutory]);
                        // console.log('Update operation successful: ', resultsProfessional1 + resultsContigencies1 + resultsStatutory1);
                    } else {
                        console.error('Error executing query:', error);
                    }
                }

            }
        } else {
            console.log('No matching values found in tableB.');
        }
    } catch (error) {
        console.error('An error occurred while updating:', error.message);
    } finally {
        await connection.end();
    }
}

async function CreateGRCfee() {
    const connection = await mysql.createConnection({
        host: process.env.JAWSDB_HOST,
        user: process.env.JAWSDB_USER,
        password: process.env.JAWSDB_PASSWORD,
        database: process.env.JAWSDB_DATABASE,
        port: process.env.JAWSDB_PORT
    });

    try {
        await createGRCfeesData(connection);
    } catch (error) {
        console.error("Error during execution:", error);
    } finally {
        await connection.end();
    }
}

CreateGRCfee().catch(console.error);

