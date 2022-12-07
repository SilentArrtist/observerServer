const Router = require('express')
const router = new Router()
const modbusController = require('../controllers/modbusController')

router.post('/create', modbusController.addDevice)
router.post('/delete', modbusController.deleteDevice)
router.post('/change/value', modbusController.changeValue)
router.post('/set/save', modbusController.setSave)
router.post('/set/pollingSettings', modbusController.setPollingSettings)
router.get('/get/save', modbusController.getSave)
router.get('/get/pollingSettings', modbusController.getPollingSettings)
router.get('/get/data', modbusController.getData)
module.exports = router
