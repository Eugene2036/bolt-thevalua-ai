const cloudinary = require('cloudinary').v2;
const path = require('path');
const axios = require('axios');
const fs = require("fs");
// const mysql = require("mysql");
const mysql = require('mysql2/promise');
const crypto = require("crypto");
const { exit } = require("process");
require('dotenv').config();

// Configure your Cloudinary account details
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const currentDate = new Date();
const year = currentDate.getFullYear();
const month = String(currentDate.getMonth() + 1).padStart(2, "0");
const day = String(currentDate.getDate()).padStart(2, "0");
const hour = String(currentDate.getHours()).padStart(2, "0");
const minute = String(currentDate.getMinutes()).padStart(2, "0");
const second = String(currentDate.getSeconds()).padStart(2, "0");
const formattedCurrentDateTime = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

function getRandomInteger(min, max) {
  // Ensure min and max are integers and min is less than max
  if (min > max) {
    throw new Error("Minimum value must be less than maximum value.");
  }
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function validateAndSetToZero(value) {
  return value == null ? 0 : value;
}


function dateConverter(dateTime) {
  // let dateTime = 1728479922154;
  let dateObject = new Date(dateTime);
  let formattedDate = `${dateObject.getFullYear()}-${(dateObject.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${dateObject.getDate().toString().padStart(2, "0")}`;
  // console.log(formattedDate); // Outputs: "2022-08-29"
  return formattedDate;
}

// VALIDATE ALL NUMERIC VALUES SUPPLIED AS NULL
function getValue(input) {
  return input ?? 0;
}

// Create a connection pool
const pool = mysql.createPool({
  connectionLimit: 10000, // adjust the limit as necessary
  host: process.env.JAWSDB_HOST,
  user: process.env.JAWSDB_USER,
  password: process.env.JAWSDB_PASSWORD,
  database: process.env.JAWSDB_DATABASE,
  port: process.env.JAWSDB_PORT
});

// HEROKU USER
const userId = process.env.API_USERID
const companyId = process.env.API_COMPANYID
let globalPlotID;


// BULK UPDATE INSERT FORM DATA
async function bulkUpdateOrInsertData(dataArray) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        return reject(err);
      }

      connection.beginTransaction((err) => {
        if (err) {
          connection.release();
          return reject(err);
        }

        let promises = [];
        dataArray.forEach((item) => {
          globalPlotID = crypto.randomBytes(25).toString("hex").slice(0, 25);

          const sql = `INSERT INTO Plot (id,globalId,companyId,plotNumber,propertyLocation,plotExtent,numParkingBays,numOfStructures,inspectionDate,userId,updatedAt,createdAt,propertyId,valuer,plotDesc,address,zoning,classification,\`usage\`,valuationType,council,paving,Perimeter,SwimmingPool,Boundary) 
            VALUES ("${item.globalId}","${item.globalId}","${companyId}","${item.plotNumber}","${item.Location}",${getValue(item.plotExtent)},${getValue(item.numParkingBays, 11,)},${getValue(item.No_of_Structures, 11,)},"${formattedCurrentDateTime}","${userId}","${formattedCurrentDateTime}","${formattedCurrentDateTime}","${getRandomInteger(1, 9999,)}","${null}","${item.plotDesc}","${item.propertyLocation}","${item.Land_Use}","${item.classification}","${item.Land_Use}","${item.valuationType}",1,"${item.Paving}","${getValue(item.Perimeter)}","${item.SwimmingPool}","${item.Boundary}")  
            ON DUPLICATE KEY UPDATE 
            plotNumber = "${item.plotNumber}", 
            propertyLocation = "${item.Location}", 
            plotExtent = ${getValue(item.plotExtent)}, 
            plotDesc = "${item.plotDesc}", 
            numParkingBays = ${getValue(item.numParkingBays, 11)}, 
            numOfStructures = ${getValue(item.No_of_Structures, 11)}, 
            inspectionDate = "${dateConverter(item.inspectionDate)}", 
            classification = "${item.classification}", 
            \`usage\` = "${item.Land_Use}", 
            valuationType = "${item.valuationType}", 
            council = 1, 
            paving = "${item.Paving}", 
            zoning = "${item.Land_Use}", 
            globalId = "${item.globalId}", 
            userId = "${userId}", 
            plotDesc = "${item.plotDesc}",
            Perimeter = "${getValue(item.Perimeter)}",
            SwimmingPool = "${item.SwimmingPool}",
            Boundary = "${item.Boundary}" ;`;

          const values = [
            item.globalId,
            item.plotNumber,
            item.propertyLocation,
            getValue(item.plotExtent),
            getValue(item.numParkingBays),
            getValue(item.No_of_Structures),
            dateConverter(item.inspectionDate),
            userId,
            formattedCurrentDateTime,
            formattedCurrentDateTime,
            getRandomInteger(1, 9999),
            "",
            item.plotDesc,
            item.Location,
            item.Land_Use,
            item.classification,
            item.valuationType,
            1,
            item.Paving,
          ];

          promises.push(
            new Promise((resolve, reject) => {
              // CREATE NEW PLOT RECORD
              connection.query(sql, values, (err, results) => {
                if (err) {
                  return reject(err);
                }
                resolve(results);
              });
            }),
          );

          promises.push(
            new Promise((resolve, reject) => {
              // CREATE NEW PLOT RECORD
              connection.query(sql, values, (err, results) => {
                if (err) {
                  return reject(err);
                }
                resolve(results);
              });
            }),
          );

        });

        Promise.all(promises)
          .then((results) => {
            connection.commit((err) => {
              if (err) {
                return connection.rollback(() => {
                  reject(err);
                });
              }
              resolve(results);
            });
          })
          .catch((err) => {
            connection.rollback(() => {
              reject(err);
            });
          })
          .finally(() => {
            connection.release();
          });
      });
    });
  });
}

// CREATE LAND RATE
async function addLandRate(dataArray) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        return reject(err);
      }

      connection.beginTransaction((err) => {
        if (err) {
          connection.release();
          return reject(err);
        }

        let promises = [];
        dataArray.forEach((item) => {
          globalPlotID = crypto.randomBytes(25).toString("hex").slice(0, 25);

          const sql = `INSERT INTO StoredValue (id,updatedAt,identifier,value,plotId)  
            VALUES ("${item.globalId}", "${formattedCurrentDateTime}", 'Land Rate', "${validateAndSetToZero(item.Land_Rate)}", "${item.globalId}")  
            ON DUPLICATE KEY UPDATE 
            updatedAt = "${formattedCurrentDateTime}", 
            value = "${validateAndSetToZero(item.Land_Rate)}",
            plotId = "${item.globalId}" ;`;

          const values = [item.globalId, formattedCurrentDateTime, 'Land Rate', item.Land_Rate, item.globalId];

          promises.push(
            new Promise((resolve, reject) => {
              // CREATE NEW PLOT RECORD
              connection.query(sql, values, (err, results) => {
                if (err) {
                  return reject(err);
                }
                resolve(results);
              });
            }),
          );

          promises.push(
            new Promise((resolve, reject) => {
              // CREATE NEW PLOT RECORD
              connection.query(sql, values, (err, results) => {
                if (err) {
                  return reject(err);
                }
                resolve(results);
              });
            }),
          );

        });

        Promise.all(promises)
          .then((results) => {
            connection.commit((err) => {
              if (err) {
                return connection.rollback(() => {
                  reject(err);
                });
              }
              resolve(results);
            });
          })
          .catch((err) => {
            connection.rollback(() => {
              reject(err);
            });
          })
          .finally(() => {
            connection.release();
          });
      });
    });
  });
}

// BULK INSERT UPDATE STRUCTURE DATA
async function bulkUpdateOrInsertStructureData(dataArray) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        return reject(err);
      }

      connection.beginTransaction((err) => {
        if (err) {
          connection.release();
          return reject(err);
        }

        let promises = [];
        dataArray.forEach((item) => {
          // globalPlotID = crypto.randomBytes(25).toString("hex").slice(0, 25);

          const sql = `INSERT INTO StoredStructureData (\`objectid\`, updatedAt, \`globalid\`, parentglobalid, MeasuredArea, RoomStructure, StructureType, OfficeNo, ToiletsNo, StoreroomNo, Aircon, DevStatus, Bathrooms, GarageType, Kitchen, Wardrobe, Wall, WallFinish, FloorConstruction, Roof, Services, Rental, HouseType, RoofModel, Ceiling1, InteriorWallFinish, Property_Type) 
            VALUES ("${item.globalid}","${formattedCurrentDateTime}","${item.globalid}","${item.parentglobalid}","${getValue(item.MeasuredArea)}","${item.RoomStructure}","${item.StructureType}","${getValue(item.OfficeNo)}","${getValue(item.ToiletsNo)}","${getValue(item.StoreroomNo)}","${getValue(item.Aircon)}","${item.DevStatus}","${getValue(item.Bathrooms)}","${item.GarageType}","${item.Kitchen}","${item.Wardrobe}","${item.Wall}","${item.WallFinish}","${item.FloorConstruction}","${item.Roof}","${item.Services}",${getValue(item.Rental)},"${item.HouseType}","${item.RoofModel}","${item.Ceiling1}","${item.InteriorWallFinish}","${item.Property_Type}")  
            ON DUPLICATE KEY UPDATE updatedAt="${formattedCurrentDateTime}",\`globalid\`="${item.globalid}",parentglobalid="${item.parentglobalid}",MeasuredArea="${getValue(item.MeasuredArea)}",RoomStructure="${item.RoomStructure}",StructureType="${item.StructureType}",OfficeNo="${getValue(item.OfficeNo)}",ToiletsNo="${getValue(item.ToiletsNo)}",StoreroomNo="${getValue(item.StoreroomNo)}",Aircon="${getValue(item.Aircon)}",DevStatus="${item.DevStatus}",Bathrooms="${getValue(item.Bathrooms)}",GarageType="${item.GarageType}",Kitchen="${item.Kitchen}",Wardrobe="${item.Wardrobe}",Wall="${item.Wall}",WallFinish="${item.WallFinish}",FloorConstruction="${item.FloorConstruction}",Roof="${item.Roof}",Services="${item.Services}",Rental=${getValue(item.Rental)},HouseType="${item.HouseType}",RoofModel="${item.RoofModel}",Ceiling1="${item.Ceiling1}",InteriorWallFinish="${item.InteriorWallFinish}",Property_Type="${item.Property_Type}" ;`;
          const values = [
            item.globalid,
            formattedCurrentDateTime,
            item.globalid,
            item.parentglobalid,
            getValue(item.MeasuredArea),
            item.RoomStructure,
            getValue(item.OfficeNo),
            getValue(item.ToiletsNo),
            getValue(item.StoreroomNo),
            getValue(item.Aircon),
            item.DevStatus,
            getValue(item.Bathrooms),
            item.GarageType,
            item.Kitchen,
            item.Wardrobe,
            item.Wall,
            item.WallFinish,
            item.FloorConstruction,
            item.Roof,
            item.Services,
            getValue(item.Rental),
            item.HouseType,
            item.RoofModel,
            item.Ceiling1,
            item.InteriorWallFinish,
            item.Property_Type
          ];


          promises.push(
            new Promise((resolve, reject) => {
              // CREATE NEW STRUCTURE RECORD
              connection.query(sql, values, (err, results) => {
                if (err) {
                  return reject(err);
                }
                resolve(results);
              });
            }),
          );
        });

        Promise.all(promises)
          .then((results) => {
            connection.commit((err) => {
              if (err) {
                return connection.rollback(() => {
                  reject(err);
                });
              }
              resolve(results);
            });
          })
          .catch((err) => {
            connection.rollback(() => {
              reject(err);
            });
          })
          .finally(() => {
            connection.release();
          }
          );
      });
    });
  });
}




// CREATE BOUNDARY GRC DATA
async function createBoundaryGRC(connection) {
  const ImprovementsQuery = `
        INSERT INTO Grc (id, updatedAt, plotId, identifier,unit,size,bull) 
        VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE size = ?, identifier = ? ;
    `;

  try {
    const [rows] = await connection.query(`SELECT * FROM Plot WHERE (Boundary != 'None') || (Boundary != 'null')`);

    if (rows.length > 0) {

      for (const row of rows) {

        try {

          const [results] = await connection.execute(ImprovementsQuery, ['Boundary' + row.id, formattedCurrentDateTime, row.id, row.Boundary, 'Unit', 1, 0, 1, row.Boundary]);
          console.log('Insert Boundary operation successful:', results);
        } catch (error) {
          console.error('Error executing query:', error);
        }

      }
    } else {
      console.log('No matching values found in tableB.');
    }
  } catch (error) {
    console.error('An error occurred while updating:', error.message);
  } finally {
    // FINALLY CLOSE THE CONNECTION TO MYSQL
    await connection.end();
  }
}

async function esriCreateGRCboundary() {
  const connection = await mysql.createConnection({
    host: process.env.JAWSDB_HOST,
    user: process.env.JAWSDB_USER,
    password: process.env.JAWSDB_PASSWORD,
    database: process.env.JAWSDB_DATABASE,
    port: process.env.JAWSDB_PORT
  });

  try {
    await createBoundaryGRC(connection);
  } catch (error) {
    console.error("Error during execution:", error);
  } finally {
    await connection.end();
  }
}


// CREATE GRC CAR PORT DATA
async function createCarPortGRC(connection) {
  const ImprovementsQuery = `
        INSERT INTO Grc (id, updatedAt, plotId, identifier,unit,size,bull) 
        VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE size = ?, identifier = ?;
    `;

  // CREATE PARKING BAYS
  try {
    const [rows] = await connection.query('SELECT * FROM Plot WHERE (numParkingBays > 0)');

    if (rows.length > 0) {

      for (const row of rows) {

        try {

          const [results] = await connection.execute(ImprovementsQuery, ['CarPort' + row.id, formattedCurrentDateTime, row.id, 'Car Port', 'Unit', row.numParkingBays, 0, row.numParkingBays, 'Car Port']);
          console.log('Insert Car Port operation successful:', results);
        } catch (error) {
          console.error('Error executing query:', error);
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

async function esriCreateGRCcarPort() {
  const connection = await mysql.createConnection({
    host: process.env.JAWSDB_HOST,
    user: process.env.JAWSDB_USER,
    password: process.env.JAWSDB_PASSWORD,
    database: process.env.JAWSDB_DATABASE,
    port: process.env.JAWSDB_PORT
  });

  try {
    await createCarPortGRC(connection);
  } catch (error) {
    console.error("Error during execution:", error);
  } finally {
    await connection.end();
  }
}



// CREATE GRC DATA
async function createGRCdata(connection) {

  const query = `INSERT INTO Grc (id, updatedAt, plotId, identifier, unit, size, bull) 
        SELECT globalid, updatedAt, parentglobalid, StructureType, 'SQM', MeasuredArea, 1 
        FROM StoredStructureData 
        WHERE parentglobalid = ? 
        ON DUPLICATE KEY UPDATE 
            updatedAt = VALUES(updatedAt), 
            plotId = VALUES(plotId), 
            identifier = VALUES(identifier), 
            unit = VALUES(unit), 
            bull = VALUES(bull), 
            size = IF(Grc.size = 0.00, VALUES(size), Grc.size);`;

  try {
    const [rows] = await connection.query('SELECT * FROM Plot');

    if (rows.length > 0) {

      for (const row of rows) {

        try {

          const [results] = await connection.execute(query, [row.id, row.id]);
          console.log('Insert GRC Record successful:', results);
          let newMeasuredArea = row.MeasuredArea;
          let newPlotId = row.id;
        } catch (error) {
          if (error.code === 'ER_DUP_ENTRY') {
            // Do nothing if the record already exists
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

async function esriCreateGRCdata() {
  const connection = await mysql.createConnection({
    host: process.env.JAWSDB_HOST,
    user: process.env.JAWSDB_USER,
    password: process.env.JAWSDB_PASSWORD,
    database: process.env.JAWSDB_DATABASE,
    port: process.env.JAWSDB_PORT
  });

  try {
    await createGRCdata(connection);
  } catch (error) {
    console.error("Error during execution:", error);
  } finally {
    await connection.end();
  }
}



// CREATE GRC PAVING DATA

async function createPavingGRC(connection) {
  const ImprovementsQuery = `
        INSERT INTO Grc (id, updatedAt, plotId, identifier,unit,size,bull) 
        VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE size = ?, identifier = ?;
    `;

  // CREATE PAVING DATA
  try {
    const [rows] = await connection.query(`SELECT * FROM Plot WHERE (paving = 'Yes')`);

    if (rows.length > 0) {

      for (const row of rows) {

        try {

          const [results] = await connection.execute(ImprovementsQuery, ['Paving' + row.id, formattedCurrentDateTime, row.id, 'Paving', 'Unit', 1, 0, 1, 'Paving']);
          console.log('Insert Paving operation successful:', results);
        } catch (error) {
          console.error('Error executing query:', error);
        }

      }
    } else {
      console.log('No matching values found in tableB.');
    }
  } catch (error) {
    console.error('An error occurred while updating:', error.message);
  } finally {
    // FINALLY CLOSE THE CONNECTION TO MYSQL
    await connection.end();
  }
}


async function esriCreateGRCpaving() {
  const connection = await mysql.createConnection({
    host: process.env.JAWSDB_HOST,
    user: process.env.JAWSDB_USER,
    password: process.env.JAWSDB_PASSWORD,
    database: process.env.JAWSDB_DATABASE,
    port: process.env.JAWSDB_PORT
  });

  try {
    await createPavingGRC(connection);
  } catch (error) {
    console.error("Error during execution:", error);
  } finally {
    await connection.end();
  }
}



// CREATE GRC SWIMMING POOL DATA
async function createSwimmingPoolGRC(connection) {
  const ImprovementsQuery = `
        INSERT INTO Grc (id, updatedAt, plotId, identifier,unit,size,bull) 
        VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE size = ?, identifier = ?;
    `;

  // CREATE SWIMMING POOL DATA
  try {
    const [rows] = await connection.query(`SELECT * FROM Plot WHERE (SwimmingPool = 'Yes')`);

    if (rows.length > 0) {

      for (const row of rows) {

        try {

          const [results] = await connection.execute(ImprovementsQuery, ['Pool' + row.id, formattedCurrentDateTime, row.id, 'Swimming Pool', 'Unit', 1, 0, 1, 'Swimming Pool']);
          console.log('Insert Swimming Pool operation successful:', results);
        } catch (error) {
          console.error('Error executing query:', error);
        }

      }
    } else {
      console.log('No matching values found in tableB.');
    }
  } catch (error) {
    console.error('An error occurred while updating:', error.message);
  } finally {
    // FINALLY CLOSE THE CONNECTION TO MYSQL
    await connection.end();
  }
}



async function esriCreateGRCSwimmingPool() {
  const connection = await mysql.createConnection({
    host: process.env.JAWSDB_HOST,
    user: process.env.JAWSDB_USER,
    password: process.env.JAWSDB_PASSWORD,
    database: process.env.JAWSDB_DATABASE,
    port: process.env.JAWSDB_PORT
  });

  try {
    await createSwimmingPoolGRC(connection);
  } catch (error) {
    console.error("Error during execution:", error);
  } finally {
    await connection.end();
  }
}

// UPDATE CONSTRUCTION PROPERTY IDs
async function createConnectionWithTimeout() {
  const connection = await mysql.createConnection({
    connectionLimit: 50000, // adjust the limit as necessary
    host: process.env.JAWSDB_HOST,
    user: process.env.JAWSDB_USER,
    password: process.env.JAWSDB_PASSWORD,
    database: process.env.JAWSDB_DATABASE,
    port: process.env.JAWSDB_PORT,
  });

  // Set the lock wait timeout for the current session
  await connection.query('SET SESSION innodb_lock_wait_timeout = 9999999'); // Set to desired timeout in seconds

  return connection;
}
// BEGIN UPDATE CONSTRUCTION PROPERTY IDs
async function updateConstructionPropIdInBatches(batchSize = 1000) {
  // Create a connection to the database
  const connection = await createConnectionWithTimeout();

  try {
    // Fetch all IDs from the Grc table
    const [rows] = await connection.query('SELECT id FROM Grc');
    const ids = rows.map(row => row.id);

    // Define batch size
    const batchSize = 100;

    // Update rows in batches of 1000
    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);

      // Begin transaction
      await connection.beginTransaction();

      try {
        // Update each batch
        await connection.query(
          'UPDATE Grc SET constructionPropId = id WHERE id IN (?) AND constructionPropId IS NULL',
          // 'UPDATE Grc SET constructionPropId = id WHERE constructionPropId IS NULL',
          [batchIds]
        );

        // Commit transaction
        await connection.commit();
        console.log(`Batch ${i / batchSize + 1} updated successfully.`);
      } catch (error) {
        console.error('Error with batch update, rolling back transaction:', error);
        await connection.rollback();
      }
    }
  } catch (error) {
    console.error('Failed to execute batch updates:', error);
  } finally {
    await connection.end();
  }
}




const esriBulkUpdateInsert = async () => {

  const filePath = process.env.ESRI_FILE_PATH;
  const filePathStructure = process.env.ESRI_STRUCTURE_PATH;

  try {
    let jsonData;
    let jsonStructureData;
    try {
      // READ FORM DATA JSON FILE
      const data = fs.readFileSync(filePath, "utf8");
      jsonData = JSON.parse(data).map(({ attributes, ...rest }) => ({
        ...attributes,
        ...rest,
      }));

      // READ STRUCTURE DATA JSON FILE
      const dataStructure = fs.readFileSync(filePathStructure, 'utf8');
      jsonStructureData = JSON.parse(dataStructure).map(({ attributes, ...rest }) => ({
        ...attributes,
        ...rest
      }));

    } catch (err) {
      console.error(err);
    }

    console.log(jsonStructureData);
    // console.log(jsonStructureData);

    await bulkUpdateOrInsertData(jsonData)
      .then(() => console.log("Bulk Form operation completed!"))
      .catch((err) => console.error("Bulk Form operation error: ", err));

    await bulkUpdateOrInsertStructureData(jsonStructureData)
      .then(() => console.log('Bulk Structure operation completed!'))
      .catch(err => console.error('Bulk Structure operation error: ', err));

    await addLandRate(jsonData)
      .then(() => console.log("Land Rate operation completed!"))
      .catch((err) => console.error("Land Rate operation error: ", err));

    await esriCreateGRCdata()
      .then(() => console.log("GRC Data operation completed!"))
      .catch((err) => console.error("GRC Data operation error: ", err));

    await esriCreateGRCboundary()
      .then(() => console.log("GRC Boundary operation completed!"))
      .catch((err) => console.error("GRC Boundary operation error: ", err));

    await esriCreateGRCcarPort()
      .then(() => console.log("Car Port GRC operation completed!"))
      .catch((err) => console.error("Car Port GRC operation error: ", err));

    await esriCreateGRCpaving()
      .then(() => console.log("Paving GRC operation completed!"))
      .catch((err) => console.error("Paving GRC operation error: ", err));

    await esriCreateGRCSwimmingPool()
      .then(() => console.log("Swimming Pool operation completed!"))
      .catch((err) => console.error("Swimming Pool operation error: ", err));

    // perform the final property update procedure
    await updateConstructionPropIdInBatches()
      .then(() => console.log("Swimming Pool operation completed!"))
      .catch((err) => console.error("Swimming Pool operation error: ", err));

  } catch (error) {
    console.error(error);
  } finally {

    exit;
  }
}

esriBulkUpdateInsert();




