const modbus = require("jsmodbus");
const net = require('net')
const socket = new net.Socket()
const client = new modbus.client.TCP(socket)
const ApiError = require('../error/ApiError');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db.db',sqlite3.OPEN_READWRITE,(err)=>
{
    if(err)return console.error(err);
});
let sql;

let isConnected = false;
let isPollingStart = false;

let isHoldingRegisterExist = false;
let isInputRegisterExist = false;
let isCoilsExist = false;

let isHoldingRegistersUpdate = false;
let isCoilsUpdate = false;

let holdingRegistersToWriteArray = [];
let coilsToWriteArray = [];

let polling_timeslot = 1000;
let holding_registers_count = 10;
let input_registers_count = 10;
let coils_count = 10;

let connectionInterval;


updatePollingValues();
socket.on('connect', ()=>{
    console.log("YEAP");
    client.readHoldingRegisters(0, 1)
        .then(function (r) {isHoldingRegisterExist = true})
        .catch((e)=>{isHoldingRegisterExist = false})
    client.readInputRegisters(0, 1)
        .then(function (r) {isInputRegisterExist = true})
        .catch((e)=>{isInputRegisterExist = false})
    client.readCoils(0, 1)
        .then(function (r) {isCoilsExist = true})
        .catch((e)=>{isCoilsExist = false})

    connectionInterval = setInterval(() => {
        isConnected = true;
        if(isHoldingRegistersUpdate&&isCoilsExist){
            client.writeMultipleRegisters(0, holdingRegistersToWriteArray)
            .then(function (resp) {
                return;
            }).catch(function (e) {
                console.error(require('util').inspect(arguments, {depth: null}))
                return;
            }).finally(()=>{isHoldingRegistersUpdate = false})
        }
        if(isCoilsUpdate&&isCoilsExist){
            client.writeMultipleCoils(0, coilsToWriteArray)
            .then(function (resp) {
                return;
            }).catch(function (e) {
                console.error(require('util').inspect(arguments, {depth: null}))
                return;
            }).finally(()=>{isCoilsUpdate = false})
        }

        if(isHoldingRegisterExist){
            client.readHoldingRegisters(0, holding_registers_count)
            .then(function (resp) {
                const data = JSON.stringify(resp.response._body.valuesAsArray);
                sql = `UPDATE devices SET holdingRegisters = ? where id = 1`
                db.run(sql,[data],()=>{})
            }).catch((err)=>{
                isPollingStart = false;
                clearInterval(connectionInterval);
            })
        }
        if(isInputRegisterExist){
            client.readInputRegisters(0, input_registers_count)
            .then(function (resp) {
                const data = JSON.stringify(resp.response._body.valuesAsArray);
                sql = `UPDATE devices SET inputRegisters = ? where id = 1`
                db.run(sql,[data],()=>{})
            }).catch((err)=>{
                isPollingStart = false;
                clearInterval(connectionInterval);
            })
        }
        if(isCoilsExist){
            client.readCoils(0, coils_count)
            .then(function (resp) {
                const data = JSON.stringify(resp.response._body.valuesAsArray);
                sql = `UPDATE devices SET coils = ? where id = 1`
                db.run(sql,[data],()=>{})
            }).catch((err)=>{
                isPollingStart = false;
                clearInterval(connectionInterval);
            })
        }
        sql = `UPDATE devices SET status = ? where id = 1`
        db.run(sql,[true],()=>{})
    }, polling_timeslot);
}).on('error', (err)=>{
    isPollingStart=false;
    clearInterval(connectionInterval);
})

function startPolling(){
    if(isPollingStart){return;}
    sql = `SELECT * FROM devices`
    db.all(sql,[],(err,row)=>{
        if(row.length!==0){
                isPollingStart = true;
                const device = row[0].ip;
                const ipAndPort = device.split(":");
                socket.connect(ipAndPort[1],ipAndPort[0],()=>{})
        }
    })
}

function updatePollingValues(){
    sql = `SELECT * FROM polling_settings WHERE id = 1`
        db.all(sql,[],async (err,row)=>{
            const settings = JSON.parse(row[0].settings);
            polling_timeslot = settings.polling_timeslot;
            holding_registers_count = settings.holding_registers_count;
            input_registers_count = settings.input_registers_count;
            coils_count = settings.coils_count;
    })
}

class ModbusController {
    async addDevice(req, res, next) {
        const {ip} = req.body
        sql = `SELECT * FROM devices WHERE ip = ?`
        db.all(sql,[ip],async (err,row)=>{
            if(row.length!==0){
                return next(ApiError.badRequest('Device with this IP has already been added'))
            }
            else{
                sql = `INSERT INTO devices(ip,holdingRegisters,inputRegisters,coils,status) VALUES (?,?,?,?,?)`;
                db.run(sql,[ip,`[]`,`[]`,`[]`,false],()=>{
                    return res.json({message:"Added successfully"});
                })
            }
        })
    }

    async deleteDevice(req, res, next) {
        const {ip} = req.body
        sql = `SELECT * FROM devices WHERE ip = ?`
        db.all(sql,[ip],async (err,row)=>{
            if(row.length===0){
                return next(ApiError.badRequest('No device with that IP'))
            }
            else{
                const id = row[0].id;
                sql = `DELETE FROM devices WHERE id = ?`
                db.run(sql,[id],()=>{
                    return res.json({message:`deleted successfully`})
                })
            }
        })
    }

    async getData(req, res) {
        startPolling();
        isConnected = false;
        setTimeout(() => {
            if(!isConnected){
                sql = `UPDATE devices SET status = ? where id = 1`
                db.run(sql,[false],()=>{})

                sql = `UPDATE devices SET holdingRegisters = ? where id = 1`
                db.run(sql,["[]"],(err)=>{
                    if(err) return console.error(err.message)
                })
                sql = `UPDATE devices SET inputRegisters = ? where id = 1`
                db.run(sql,["[]"],(err)=>{
                    if(err) return console.error(err.message)
                })
                sql = `SELECT * FROM devices`
                db.all(sql,[],(err,rows)=>{
                    if(err) return console.error(err.message)
                    return res.json({data:rows});
                })
            }
            else{
                sql = `SELECT * FROM devices`
                db.all(sql,[],(err,rows)=>{
                    if(err) return console.error(err.message)
                    return res.json({data:rows});
                })
            }
        }, polling_timeslot);  
    }

    async changeValue(req, res,next) {
        const {tagName,tagIndex,tagValue} = req.body
        sql = `SELECT * FROM devices`
        db.all(sql,[],(err,rows)=>{
            if(err) return console.error(err.message)
            if(rows.length!==0){
                if(rows[0].status!==false)
                {
                    if(tagName === "holdingRegisters")
                    {
                        holdingRegistersToWriteArray = JSON.parse(rows[0].holdingRegisters);
                        holdingRegistersToWriteArray[tagIndex] = tagValue;
                        isHoldingRegistersUpdate = true;
                        return;
                    }
                    else if(tagName === "coils")
                    {
                        colisToWriteArray = JSON.parse(rows[0].coils);
                        colisToWriteArray[tagIndex] = tagValue;
                        isCoilsUpdate = true;
                        return;
                    }
                    return;
                }
            }
        })
        
    }

    async getSave(req, res) {
        sql = `SELECT * FROM save`
        db.all(sql,[],(err,elements)=>{
            if(err) return err.message;
            sql = `SELECT * FROM settings`
            db.all(sql,[],(err,settings)=>{
                if(err) return err.message;
                return res.json({data:{elements,settings}});
            })
        })
    }

    async setSave(req, res,next) {
        const {elements,settings} = req.body;
        sql = `UPDATE save SET elements = ? where id = 1`
        db.run(sql,[elements],(err)=>{
            if(err) return console.error(err.message)
            sql = `UPDATE settings SET settings = ? where id = 1`
            db.run(sql,[settings],(err)=>{
                if(err) return console.error(err.message)
                return res.json({message:"Saved successfully"});
            })
        })
    }
    
    async getPollingSettings(req, res) {
        sql = `SELECT * FROM polling_settings`
        db.all(sql,[],(err,settings)=>{
            if(err) return err.message;
            return res.json({data:settings});
        })
    }

    async setPollingSettings(req, res,next) {
        const {settings} = req.body;
        sql = `UPDATE polling_settings SET settings = ? where id = 1`
        db.run(sql,[settings],(err)=>{
            if(err) return console.error(err.message)
            updatePollingValues();
            return res.json({message:"Saved successfully"});
        })
    }
}

module.exports = new ModbusController()
