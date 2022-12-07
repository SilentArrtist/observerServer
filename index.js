const express = require('express')
const path = require('path')
const cors = require('cors')
const router = require('./routes/index')
const errorHandler = require('./middleware/ErrorHandlingMiddleware')
const fileupload = require("express-fileupload");
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db.db',sqlite3.OPEN_READWRITE,(err)=>
{
    if(err)return console.error(err);
});
const PORT = 4000;
let sql;
// let save = '{"elements":[],"images":[],"imagesNames":["cad34744-775b-4f6e-81f0-d4edd5c0a8fd.png","84d11e4c-0062-4e15-86de-da3cfee7cf8d.png","2d44940a-579d-4dcb-9fed-aec63d290f7a.png","ed398fc2-a5cb-49a4-bc05-e70273d02d7d.png"],"settings":{"mainBackground":"#e6e6e6","topBackground":"#000000","colorAccent":"rgb(131,23,134)","textColor":"rgb(69, 89, 141)"}}'
// sql = `UPDATE save SET elements = ? where id = 1`
// db.run(sql,[save],(err)=>{
//     if(err) return console.error(err.message)
// })

// db.all("select name from sqlite_master where type='table'", function (err, tables) {
//     console.log(tables);
// });
// sql = `SELECT * FROM polling_settings`
// db.all(sql,[],(err,rows)=>{
//     if(err) return console.error(err.message)
//     console.log(rows);
// })
// const settings = JSON.stringify({
//     polling_frequency:2000,
//     polling_timeslot:1000,
//     holding_registers_count:10,
//     input_registers_count:10,
//     coils_count:10,
// })
// sql = `UPDATE polling_settings SET settings = ? where id = 1`
// db.run(sql,[settings],(err)=>{
//     if(err) return console.error(err.message)
// })


const app = express()
app.use(cors())
app.use(fileupload());
app.use(express.json({extended:true}))
app.use('/images',express.static(path.join(__dirname,'images')))
app.use('/api', router)

// Обработка ошибок, последний Middleware
app.use(errorHandler)

const start = async () => {
    try {
        app.listen(PORT, () => {})
    } catch (e) {
        console.log(e)
    }
}

start()
