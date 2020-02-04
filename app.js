const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const morgan = require('morgan')
const uploadChunksMiddleware = require('./middlewares/upload-chunks')
const fs = require('fs')

const fileBasePath = 'uploads/'
const chunkBasePath = '~uploads/'
const app = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(morgan('dev'))

app.set('views', path.resolve('./views'))
app.set('view engine', 'ejs')

app.get('/', (req, res) => {
  res.render('index')
})

app.post('/upload_chunks', uploadChunksMiddleware, (req, res) => {
  const chunkTmpDir = `${chunkBasePath}${req.body.hash}/`

  if (!fs.existsSync(chunkTmpDir)) {
    fs.mkdirSync(chunkTmpDir)
  }

  fs.renameSync(req.file.path, `${chunkTmpDir}${req.body.hash}-${req.body.index}`)
  res.send(req.file)
})

app.post('/merge_chunks', (req, res) => {
  const total = req.body.total
  const hash = req.body.hash
  const saveDir = `${fileBasePath}${new Date().getFullYear()}${new Date().getMonth() + 1}${new Date().getDate()}/`
  const savePath = `${saveDir}${Date.now()}${hash}.${req.body.ext}`
  const chunkDir = `${chunkBasePath}/${hash}/`

  try {
    if (!fs.existsSync(fileBasePath)) {
      fs.mkdirSync(fileBasePath)
    }

    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir)
    }

    fs.writeFileSync(savePath, '')

    const chunks = fs.readdirSync(`${chunkBasePath}/${hash}`)

    if (chunks.length !== total || chunks.length === 0) {
      return res.send({
        success: false,
        message: '圖片分割數量不吻合'
      })
    }
    
    for (let i = 0; i < total; i++) {
      fs.appendFileSync(savePath, fs.readFileSync(`${chunkDir}${hash}-${i}`))
      fs.unlinkSync(`${chunkDir}${hash}-${i}`)
    }

    fs.rmdirSync(chunkDir)

    res.json({
      success: true,
      message: '圖片上傳成功', 
      data: { 
        path: savePath.split(fileBasePath)[savePath.split(fileBasePath).length - 1] 
      } 
    })
  } catch (err) {
    res.json({
      success: false,
      message: '上傳過程發生異常' 
    })
  }
})

app.get('/uploads/:dir/:path', (req, res) => {
  const url = path.resolve(__dirname, `${fileBasePath}/${req.params.dir}/${req.params.path}`)
  res.type('png').sendFile(url)
})

// 查詢當前已存在之分割檔，用以支援續傳。目前前端尚未實作。
app.get('/file/:hash/status', (req, res) => {
  const chunkTmpDir = `${chunkBasePath}${req.params.hash}/`

  try {
    const currentIndex = fs.readdirSync(chunkTmpDir)
    currentIndex.forEach((file, index) => {
      currentIndex[index] = parseInt(file.split('-')[1])
    })

    res.json({
      success: true,
      currentIndex: currentIndex
    })
  } catch (_err) {
    res.json({
      success: false,
      message: '檔案已上傳完成或者尚未上傳任何分割檔' 
    })
  }
})

app.listen(3000, function () {
  console.log('Server is running on port 3000')
})
