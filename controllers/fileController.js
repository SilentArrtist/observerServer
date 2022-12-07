const fs = require('fs-extra');
const Uuid = require('uuid')
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db.db',sqlite3.OPEN_READWRITE,(err)=>
{
    if(err)return console.error(err);
});
let sql;
class FileController {

    async getImages(req, res) {
        sql = `SELECT * FROM images`
        db.all(sql,[],(err,rows)=>{
            if(err) return next(ApiError.internal(err.message)) 
            return res.json({data:rows});
        })
    }

    async uploadImage(req,res){
        try {
            const file = req.files.file
            const name = Uuid.v4()+'.png'
            file.mv("images/"+ name)
            sql = `INSERT INTO images(name) VALUES (?)`;
            db.run(sql,[name],()=>{
                sql = `SELECT * FROM images`
                db.all(sql,[],(err,rows)=>{
                    if(err) return next(ApiError.internal(err.message)) 
                    return res.json({data:rows});
                })
            })  
        } catch (e) {
            return res.status(400).json({message: 'Upload image error'})
        }
    }

    async deleteImage(req,res){
        const {name} = req.body;
        fs.unlinkSync('images'+'/'+name);
        sql = `DELETE FROM images WHERE name = ?`
        db.run(sql,[name],()=>{
            sql = `SELECT * FROM images`
            db.all(sql,[],(err,rows)=>{
                if(err) return next(ApiError.internal(err.message)) 
                return res.json({data:rows});
            })
        })
    }
    async reset(req, res,next) {
        sql = `SELECT * FROM images`
        db.all(sql,[],(err,images)=>{
            if(err) return next(ApiError.internal(err.message)) 
            images.forEach(img => {
                fs.unlinkSync('images'+'/'+img.name);
            });
            const elements = '{"elements":[],"images":[]}'
            sql = `UPDATE save SET elements = ? where id = 1`
            db.run(sql,[elements],(err)=>{
                if(err) return console.error(err.message)
                sql = `DELETE FROM images`
                db.run(sql,[],(err)=>{
                    if(err) return console.error(err.message)
                    const settings = 
                    {
                    "settings":
                    {
                        "mainBackground":"rgb(225, 225, 225)",
                        "colorAccent":"rgb(131,23,134)",
                        "textColor":"rgb(69, 89, 141)"
                    }
                    }
                    sql = `UPDATE settings SET settings = ? where id = 1`
                    db.run(sql,[JSON.stringify(settings)],(err)=>{
                        if(err) return console.error(err.message)
                        return res.json({message:"Reset successfully"});
                    })
                })
                
            })
        })
        
    }
}

module.exports = new FileController()
