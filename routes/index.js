const Router = require('express')
const router = new Router()
const modbusRouter = require('./modbusRouter')
const userRouter = require('./userRouter')
const fileRouter = require('./fileRouter')
router.use('/modbus', modbusRouter)
router.use('/user', userRouter)
router.use('/file',fileRouter)

module.exports = router
