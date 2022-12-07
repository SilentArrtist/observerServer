const ApiError = require('../error/ApiError');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const KEY = "bnfuhteiwdjvo42jio5efnke"
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db.db',sqlite3.OPEN_READWRITE,()=>{});
let sql;

const generateJwt = (id, login, role) => {
    return jwt.sign(
        {id, login, role},
        KEY,
        {expiresIn: '24h'}
    )
}

class UserController {
    async registration(req, res, next) {
        const {login, password, role} = req.body
        if (!login || !password) {
            return next(ApiError.badRequest('Incorrect login or password'))
        }
        sql = `SELECT * FROM users WHERE login = ?`
        db.all(sql,[login],async (err,row)=>{
            if(err) return err.message
            else{
                if(row.length===0){
                    const hashPassword = await bcrypt.hash(password, 5)
                    sql = `INSERT INTO users(login,password,role) VALUES (?,?,?)`;
                    const user =  db.run(sql,[login,hashPassword,role?role:"OPERATOR"],(err)=>{
                        if(err) return console.error(err.message)
                        return {login:login,role:role}
                    })
                    sql = `SELECT * FROM users`
                        db.all(sql,[],(err,rows)=>{
                            if(err) return next(ApiError.internal(err.message)) 
                            return res.json({data:rows});
                    })
                }
                else{
                    return next(ApiError.badRequest('User with this login already exists'))
                }
            }
        }) 
    }

    async deleteUser(req, res, next) {
        const {login} = req.body
        sql = `SELECT * FROM users WHERE login = ?`
        db.all(sql,[login],async (err,row)=>{
            if(err) return err.message
            else{
                if(row.length!==0){
                    const id = row[0].id;
                    sql = `DELETE FROM users WHERE id = ?`
                    db.run(sql,[id],(err)=>{
                        if(err) return next(ApiError.internal(err))
                        sql = `SELECT * FROM users`
                        db.all(sql,[],(err,rows)=>{
                            if(err) return next(ApiError.internal(err.message)) 
                            return res.json({data:rows});
                        })
                    })
                }
            }
        })
    }

    async getAllUsers(req, res,next) {
        sql = `SELECT * FROM users`
        db.all(sql,[],(err,rows)=>{
            if(err) return next(ApiError.internal(err.message)) 
            return res.json({data:rows});
        })
    }

    async login(req, res, next) {
        const {login, password} = req.body
        sql = `SELECT * FROM users WHERE login = ?`
        db.all(sql,[login],async (err,row)=>{
            if(err) return err.message
            else{
                if(row.length!==0){
                    const user = row[0];
                    let comparePassword = bcrypt.compareSync(password, user.password)
                    if (!comparePassword) {
                        return next(ApiError.internal('Wrong password'))
                    }
                    const token = generateJwt(user.id,user.login, user.role)
                    return res.json({token})
                }
                else{
                    return next(ApiError.internal('User not found'))
                }
            }
        }) 
    }

    async check(req, res) {
        const token = generateJwt(req.user.id,req.user.login, req.user.role)
        return res.json({token})
    }
}


module.exports = new UserController()
