const Router = require('express')
const router = new Router()
const fileController = require('../controllers/fileController')

router.post('/addImg',fileController.uploadImage);
router.get('/getImages',fileController.getImages);
router.post('/deleteImg',fileController.deleteImage);
router.get('/reset',fileController.reset);

module.exports = router
