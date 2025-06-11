require('dotenv').config(); // Load environment variables from .env file

module.exports = {
    apps: [
        {
            name: 'thevalua-dev', // Name of your application
            script: 'npm', // Use npm to run the script
            // args: 'run dev', // The command you usually run locally
            args: 'start', // Replace 'dev:serve' with 'start'
            cwd: '/home/thevalb9c4y6/public_html/dev', // Path to your project
            node_args: '--max-old-space-size=4096', // Allocate 4GB of memory
            watch: true, // Enable watch mode
            env: {
                NODE_ENV: process.env.NODE_ENV || 'production', // Use environment variable or default to 'development'
                // NODE_ENV: process.env.NODE_ENV || 'development', // Use environment variable or default to 'development'
                ORIGIN: process.env.ORIGIN || 'http://localhost:3003', // Use environment variable or default
                PORT: process.env.PORT || 3003, // Use environment variable or default
                API_COMPANYID: process.env.API_COMPANYID,
                API_USERID: process.env.API_USERID,
                CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
                CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
                CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
                CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET, // Corrected key name
                DATABASE_URL: process.env.DATABASE_URL,
                ESRI_CLIENT_ID: process.env.ESRI_CLIENT_ID,
                ESRI_CLIENT_SECRET: process.env.ESRI_CLIENT_SECRET,
                ESRI_FILE_PATH: process.env.ESRI_FILE_PATH,
                ESRI_OUT_FIELDS: process.env.ESRI_OUT_FIELDS,
                ESRI_REDIRECT_URL: process.env.ESRI_REDIRECT_URL,
                ESRI_STRUCTURE_PATH: process.env.ESRI_STRUCTURE_PATH,
                ESRI_TOKEN_URL: process.env.ESRI_TOKEN_URL,
                JAWSDB_DATABASE: process.env.JAWSDB_DATABASE,
                JAWSDB_HOST: process.env.JAWSDB_HOST,
                JAWSDB_PASSWORD: process.env.JAWSDB_PASSWORD,
                JAWSDB_PORT: process.env.JAWSDB_PORT,
                JAWSDB_USER: process.env.JAWSDB_USER,
                LOOPS_API_KEY: process.env.LOOPS_API_KEY,
                LOOPS_HOST: process.env.LOOPS_HOST,
                SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
                SESSION_SECRET: process.env.SESSION_SECRET,
                YOUR_GOOGLE_MAPS_API_KEY: process.env.YOUR_GOOGLE_MAPS_API_KEY,
                WEB_URL: process.env.WEB_URL,
            },
        },
    ],
};
