const cloudinary = require('cloudinary').v2;
const path = require('path');
const axios = require('axios');
const fs = require("fs");
// const mysql = require("mysql");
const mysql = require('mysql2/promise');
const crypto = require("crypto");
const { exit } = require("process");
require('dotenv').config();

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

          const sql = `INSERT INTO InspectionsData (globalId,inspectionDate,plotNumber,plotExtent,classification,propertyType,location,suburb,
            plotDesc,status,numParkingBays,numOfStructures,swimmingPool,paving,boundary,garageType,longitude,latitude,capitalValue,improvementsValue,landValue,perimeter) 
            VALUES ("${item.globalId}","${dateConverter(item.inspectionDate)}","${item.PLOT_NO}",${getValue(item.AREAa)},${item.category},${item.propertyType},"Gaborone",${item.neighbourhood},
            ${item.dev},${item.Status},"${getValue(item.no_parking, 11)}","${getValue(item.NumberOfStructures, 11)}","${item.Pool}","${item.Paving}","${item.boundary}","${item.parkingType}","${item.geometry.x}","${item.geometry.y}","${getValue(item.plotperimeter)}","${item.Land_Use}")  
            ON DUPLICATE KEY UPDATE 
            inspectionDate = "${dateConverter(item.inspectionDate)}", 
            plotNumber = "${item.PLOT_NO}", 
            plotExtent = ${getValue(item.AREAa)}, 
            classification = "${item.category}", 
            propertyType = "${item.propertyType}", 
            location = "Gaborone",
            suburb = "${item.neighbourhood}",
            plotDesc = "${item.dev}", 
            status = "${item.Status}",

            numParkingBays = ${getValue(item.no_parking, 11)}, 
            numOfStructures = ${getValue(item.NumberOfStructures, 11)}, 

            swimmingPool = "${item.Pool}", 
            paving = "${item.Paving}", 
            boundary = "${item.boundary}", 
            garageType = "${item.parkingType}", 

            longitude = "${item.geometry.x}", 
            latitude = "${item.geometry.y}", 

            capitalValue = "${getValue(item.MarketValue)}",
            improvementsValue = "${getValue(item.ImpValue)}",
            landValue = "${getValue(item.LandValue)}",

            perimeter = "${getValue(item.plotperimeter)}" ;`;

          const values = [
            item.globalId,
            dateConverter(item.inspectionDate),
            item.PLOT_NO,
            getValue(item.AREAa),
            item.category,
            item.propertyType,
            "Gaborone",
            item.neighbourhood,
            item.dev,
            item.Status,
            getValue(item.no_parking, 11),
            getValue(item.NumberOfStructures, 11),
            item.Pool,
            item.Paving,
            item.boundary,
            item.parkingType,
            item.geometry.x,
            item.geometry.y,
            getValue(item.MarketValue),
            getValue(item.ImpValue),
            getValue(item.LandValue),
            getValue(item.plotperimeter),
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



const esriBulkUpdateInsert = async () => {

  const filePath = process.env.ESRI_VALUATIONS_DATA;

  try {
    let jsonData;
    try {
      // READ FORM DATA JSON FILE
      const data = fs.readFileSync(filePath, "utf8");
      jsonData = JSON.parse(data).map(({ attributes, ...rest }) => ({
        ...attributes,
        ...rest,
      }));

    } catch (err) {
      console.error(err);
      throw new Error("Failed to parse JSON data");
    }

    console.log(jsonData);
    // console.log(jsonStructureData);

    await bulkUpdateOrInsertData(jsonData)
      .then(() => console.log("Bulk Form operation completed!"))
      .catch((err) => console.error("Bulk Form operation error: ", err));

  } catch (error) {
    console.error(error);
  } finally {

    exit;
  }
}

esriBulkUpdateInsert();




