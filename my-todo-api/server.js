const express = require('express')
const app = express()
const port = 3000

app.get('/tareas', (req, res) => {
    res.send('Hello World!')
  })
  
  app.listen(port, () => {
    console.log(`Mi servidor se está ejecutando`)
  })