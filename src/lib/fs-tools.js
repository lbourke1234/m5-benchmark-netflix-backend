import fs from 'fs-extra'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { readJSON, writeJSON, writeFile, createReadStream } = fs

export const mediaJSONPath = join(process.cwd(), './src/data/media.json')
const reviewsJSONPath = join(process.cwd(), './src/data/reviews.json')

export const getMediaList = () => readJSON(mediaJSONPath)
export const writeMediaList = (mediaArray) =>
  writeJSON(mediaJSONPath, mediaArray)

export const getReviewsList = () => readJSON(reviewsJSONPath)
export const writeReviewsList = (reviewsArray) =>
  writeJSON(reviewsJSONPath, reviewsArray)

export const getPDFsPath = (filename) =>
  join(process.cwd(), './src/data/pdf', filename)
