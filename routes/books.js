const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Book = require('../models/books');
const Author = require('../models/author');
const uploadPath = path.join('public', Book.coverImageBasePath);
const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
const upload = multer({
  dest: uploadPath,
  fileFilter: (req, file, callback) => {
    callback(null, imageMimeTypes.includes(file.mimetype));
  },
});
const router = express.Router();

router.get('/', async (req, res) => {
  let query = Book.find();
  if (req.query.title !== null && req.query.title !== '') {
    query = query.regex('title', new RegExp(req.query.title, 'i'));
  }
  if (req.query.publishedBefore !== null && req.query.publishedBefore !== '') {
    query = query.lte('publishDate', req.query.publishedBefore);
  }
  if (req.query.publishedAfter !== null && req.query.publishedAfter !== '') {
    query = query.gte('publishDate', req.query.publishedAfter);
  }
  try {
    const books = await query.exec();
    res.render('books/index', {
      books: books,
      searchOptions: req.query,
    });
  } catch {
    res.redirect('/');
  }
});

router.get('/new', async (req, res) => {
  renderNewPage(res, new Book());
});

router.post('/', upload.single('cover'), async (req, res) => {
  // 1. Proveravamo šta tačno stiže iz forme
  console.log('--- NOVI POKUŠAJ KREIRANJA KNJIGE ---');
  console.log('Tekstualni podaci (req.body):', req.body);
  console.log('Slika (req.file):', req.file);

  const fileName = req.file != null ? req.file.filename : null;
  const book = new Book({
    title: req.body.title,
    author: req.body.author,
    publishDate: new Date(req.body.publishDate),
    pageCount: req.body.pageCount,
    coverImageName: fileName,
    description: req.body.description,
  });

  try {
    const newBook = await book.save();
    console.log('Knjiga uspešno sačuvana:', newBook.title);
    res.redirect('books');
  } catch (err) {
    // 2. Proveravamo zašto baza odbija da sačuva
    console.error('!!! Mongoose je odbio da sačuva knjigu !!!');
    console.error(err);

    if (book.coverImageName != null) {
      removeBookCover(book.coverImageName);
    }
    renderNewPage(res, book, true);
  }
});

function removeBookCover(fileName) {
  fs.unlink(path.join(uploadPath, fileName), (err) => {
    if (err) console.error(err);
  });
}

async function renderNewPage(res, book, hasError = false) {
  try {
    const authors = await Author.find({});
    const params = {
      authors: authors,
      book: book,
    };
    if (hasError) params.errorMessage = 'Error creating book';
    res.render('books/new', params);
  } catch {
    res.redirect('/books');
  }
}

module.exports = router;
