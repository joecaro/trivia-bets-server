import mysql from 'mysql2'

// This is the URL that you get from the PlanetScale UI
const dbURL = process.env.PLANETSCALE_DB_URL as unknown as string;

const connection = mysql.createConnection(dbURL)

export default connection