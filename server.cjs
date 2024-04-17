const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

const htmlFilePath = path.join(__dirname, 'index.html');
const uploadDir = '/tmp/uploads';
const outputFilePath = '/tmp/output.mp4';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

app.get('/', (req, res) => {
  res.sendFile(htmlFilePath);
});

app.post('/upload', upload.single('file'), (req, res) => {
  const { file, body } = req;
  const filePath = file.path;
  const message = body.message;

  const tempVideoPath = path.join(uploadDir, 'temp.mp4');
  fs.copyFileSync(filePath, tempVideoPath);

  ffmpeg(tempVideoPath)
    .outputOptions('-metadata', 'comment=' + message)
    .output(outputFilePath)
    .on('end', () => {
      res.download(outputFilePath, 'output.mp4', (err) => {
        if (err) {
          console.error('Ошибка при отправке файла:', err);
          res.status(500).send('Произошла ошибка при отправке файла.');
        }

        fs.unlink(filePath, (err) => {
          if (err) {
            console.error('Ошибка при удалении файла:', err);
          } else {
            console.log('Файл успешно удален:', filePath);
          }
        });

        fs.unlink(tempVideoPath, (err) => {
          if (err) {
            console.error('Ошибка при удалении файла:', err);
          } else {
            console.log('Файл успешно удален:', tempVideoPath);
          }
        });

        fs.unlink(outputFilePath, (err) => {
          if (err) {
            console.error('Ошибка при удалении файла:', err);
          } else {
            console.log('Файл успешно удален:', outputFilePath);
          }
        });

      });
    })
    .on('error', (error) => {
      console.error('Ошибка при обработке файла:', error);
      res.status(500).send('Произошла ошибка при обработке файла.');
    })
    .run();
});

app.post('/', upload.single('encryptedFile'), (req, res) => {
  const { file } = req;
  const filePath = file.path;

  const tempVideoPath = path.join(uploadDir, 'temp.mp4');
  fs.copyFileSync(filePath, tempVideoPath);

  ffmpeg.ffprobe(tempVideoPath, (err, metadata) => {
    if (err) {
      console.error('Ошибка при получении метаданных:', err);
      res.status(500).send('Произошла ошибка при получении метаданных файла.');
      return;
    }

    const comment = metadata.format.tags.comment;
    console.log('Извлеченное сообщение:', comment);

    // Удаление файлов
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Ошибка при удалении файла:', err);
      } else {
        console.log('Файл успешно удален:', filePath);
      }
    });

    fs.unlink(tempVideoPath, (err) => {
      if (err) {
        console.error('Ошибка при удалении файла:', err);
      } else {
        console.log('Файл успешно удален:', tempVideoPath);
      }
    });

    // Отправка на главную страницу
    res.send(`${comment}`);

  });
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});