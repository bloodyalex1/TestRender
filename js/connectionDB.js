require('dotenv').config();

const mysql = require('mysql');

// Usar process.env para acceder a las credenciales
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

connection.connect((err) => {
  if (err) {
    console.error('Error de conexión: ', err.stack);
    return;
  }
  console.log('¡Conexión exitosa a la base de datos MySQL!');
});
//Conexión a bases de datos en Node.js
const consultaSQL = 'SELECT * FROM tabla';
connection.query(consultaSQL, (err, resultados) => {
  if (err) {
    console.error('Error al ejecutar la consulta: ', err.stack);
    return;
  }
  console.log('Resultados de la consulta: ', resultados);
});