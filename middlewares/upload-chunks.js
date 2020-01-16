const multer = require('multer')
const chunksBasePath = '~uploads/'
const storage = multer.diskStorage({
  destination: chunksBasePath,
})

const baseUpload = multer({ storage })
const upload = baseUpload.single('file')

const uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      res.json({
        success: false,
        message: err.toString() 
      })
    } else {
      next()
    }
  })
}

module.exports = uploadMiddleware
