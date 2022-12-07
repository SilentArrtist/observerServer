const Router = require('express')
const router = new Router()
const userController = require('../controllers/userController')
const authMiddleware = require('../middleware/authMiddleware')
router.post('/registration', userController.registration)
router.post('/login', userController.login)
router.post('/delete', userController.deleteUser)
router.get('/get',userController.getAllUsers)
router.get('/auth',authMiddleware, userController.check)

module.exports = router
