import express from 'express'
import {
  getMediaList,
  mediaJSONPath,
  writeMediaList,
  getReviewsList,
  writeReviewsList,
  getPDFsPath
} from '../../lib/fs-tools.js'
import uniqid from 'uniqid'
import createError from 'http-errors'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { pipeline } from 'stream'
import { getPDFReadableStream } from '../../lib/pdf-tools.js'
import { promisify } from 'util'
import fs from 'fs-extra'
import fetch from 'node-fetch'

const mediaRouter = express.Router()

mediaRouter.post('/', async (req, res, next) => {
  const mediaList = await getMediaList()
  const newMediaItem = {
    imdbID: uniqid(),
    ...req.body
  }
  mediaList.push(newMediaItem)
  await writeMediaList(mediaList)
  res.status(201).send({ id: newMediaItem.imdbID })
})

mediaRouter.get('/', async (req, res, next) => {
  try {
    const mediaList = await getMediaList()

    if (req.query && req.query.s) {
      const foundMovie = mediaList.find(
        (movie) => movie.Title.toLowerCase() === req.query.s.toLowerCase()
      )
      if (foundMovie) {
        const reviewsList = await getReviewsList()
        const foundReviews = reviewsList.filter(
          (review) => review.elementId === foundMovie.imdbID
        )
        res.send({ movie: foundMovie, reviews: foundReviews })
        return
      } else if (!foundMovie) {
        const response = await fetch(
          `http://www.omdbapi.com/?s=${req.query.s}&apikey=6e593066`
        )

        const body = await response.json()
        const movie = body.Search[0]
        console.log(movie)

        if (movie) {
          const newMediaItem = {
            Title: movie.Title,
            Year: movie.Year,
            imdbID: movie.imdbID,
            Type: movie.Type,
            Poster: movie.Poster
          }
          mediaList.push(newMediaItem)
          await writeMediaList(mediaList)
          res.status(201).send(newMediaItem)
          return
        } else {
          next(createError(404, `movie with name: ${req.query.s} not found!`))
        }

        res.send(movie)
        return
      } else {
        next(createError(404, `Movie ${req.query.Title} not found!`))
      }
    }
    const reviewsList = await getReviewsList()
    res.send({ movies: mediaList, reviews: reviewsList })
  } catch (error) {
    next(error)
  }
})

mediaRouter.get('/:imdbID', async (req, res, next) => {
  try {
    const mediaList = await getMediaList()
    const foundMediaItem = mediaList.find(
      (item) => item.imdbID === req.params.imdbID
    )
    if (foundMediaItem) {
      const reviewsList = await getReviewsList()
      const foundReviews = reviewsList.filter(
        (review) => review.elementId === req.params.imdbID
      )
      if (foundReviews) {
        res.send({ movie: foundMediaItem, reviews: foundReviews })
        return
      }
      res.send(foundMediaItem)
    } else {
      next(
        createError(404, `Media item with id: ${req.params.imdbID} not found!`)
      )
    }
  } catch (error) {
    next(error)
  }
})

mediaRouter.put('/:imdbID', async (req, res, next) => {
  try {
    const mediaList = await getMediaList()
    const index = mediaList.findIndex(
      (item) => item.imdbID === req.params.imdbID
    )
    if (index !== -1) {
      const oldMediaItem = mediaList[index]
      const updatedMediaItem = {
        imdbID: uniqid(),
        ...oldMediaItem,
        ...req.body
      }
      mediaList[index] = updatedMediaItem
      await writeMediaList(mediaList)
      res.send(updatedMediaItem)
    } else {
      next(
        createError(404, `Movie item with id: ${req.params.imdbID} not found!`)
      )
    }
  } catch (error) {
    next(error)
  }
})

mediaRouter.delete('/:imdbID', async (req, res, next) => {
  const mediaList = await getMediaList()
  const remainingMediaList = mediaList.filter(
    (media) => media.imdbID !== req.params.imdbID
  )
  if (remainingMediaList.length !== mediaList.length) {
    await writeMediaList(remainingMediaList)
    res.send({ message: 'Movie Deleted Successfully!' })
  } else {
    next(
      createError(404, `Media item with id: ${req.params.imdbID} not found!`)
    )
  }
})

const cloudinaryUploader = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'benchmark'
    }
  })
}).single('poster')

mediaRouter.post(
  '/:imdbID/poster',
  cloudinaryUploader,
  async (req, res, next) => {
    try {
      console.log('FILE: ', req.file)
      const mediaList = await getMediaList()
      const index = mediaList.findIndex(
        (item) => item.imdbID === req.params.imdbID
      )
      if (index !== -1) {
        const oldMediaItem = mediaList[index]
        const updatedMediaItem = {
          ...oldMediaItem,
          Poster: req.file.path
        }
        mediaList[index] = updatedMediaItem
        await writeMediaList(mediaList)
        res.send(updatedMediaItem)
      } else {
        next(
          createError(
            404,
            `Movie item with id: ${req.params.imdbID} not found!`
          )
        )
      }

      res.send()
    } catch (error) {
      next(error)
    }
  }
)
mediaRouter.post('/:imdbID/reviews', async (req, res, next) => {
  try {
    const mediaList = await getMediaList()
    const foundMediaItem = mediaList.find(
      (media) => media.imdbID === req.params.imdbID
    )
    if (foundMediaItem) {
      const reviewsList = await getReviewsList()
      const newReview = {
        _id: uniqid(),
        ...req.body,
        elementId: foundMediaItem.imdbID,
        createdAt: new Date()
      }
      reviewsList.push(newReview)
      await writeReviewsList(reviewsList)
      res.send(newReview)
    } else {
      next(
        createError(404, `Media item with id: ${req.params.imdbID} not found!`)
      )
    }
  } catch (error) {
    next(error)
  }
})

mediaRouter.delete('/:reviewId/reviews', async (req, res, next) => {
  try {
    const reviewsList = await getReviewsList()
    const remainingReviews = reviewsList.filter(
      (review) => review._id !== req.params.reviewId
    )
    if (remainingReviews.length !== reviewsList.length) {
      writeReviewsList(remainingReviews)
      res.send({ message: 'Deleted Successfully' })
    } else {
      next(
        createError(404, `Review with id: ${req.params.reviewId} not found!`)
      )
    }
  } catch (error) {
    next(error)
  }
})

mediaRouter.get('/:imdbId/pdf', async (req, res, next) => {
  try {
    const mediaList = await getMediaList()
    const foundMediaItem = mediaList.find(
      (item) => item.imdbID === req.params.imdbId
    )
    if (foundMediaItem) {
      const asyncPipeline = promisify(pipeline)

      const pdfReadableStream = getPDFReadableStream(foundMediaItem)

      const path = getPDFsPath('test.pdf')

      await asyncPipeline(pdfReadableStream, fs.createWriteStream(path))
      res.send()
    } else {
      next(createError(404, `Movie with id: ${req.params.imdbId} not found!`))
    }
  } catch (error) {
    next(error)
  }
})

export default mediaRouter
