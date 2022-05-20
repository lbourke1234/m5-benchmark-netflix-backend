import PdfPrinter from 'pdfmake'
import fs from 'fs-extra'
import { pipeline } from 'stream'
import { promisify } from 'util'
import { getPDFsPath } from './fs-tools.js'

export const getPDFReadableStream = (movie) => {
  const fonts = {
    Roboto: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold'
    }
  }

  const printer = new PdfPrinter(fonts)

  const docDefinition = {
    content: [
      {
        text: movie.title,
        style: 'header'
      },
      'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Confectum ponit legam, perferendis nomine miserum, animi. Moveat nesciunt triari naturam.\n\n',
      {
        text: movie.category,
        style: 'subheader'
      }
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true
      },
      subheader: {
        fontSize: 15,
        bold: true
      },
      small: {
        fontSize: 8
      },
      defaultStyle: {
        font: 'Helvetica'
      }
    }
  }

  const pdfReadableStream = printer.createPdfKitDocument(docDefinition)

  pdfReadableStream.end()

  return pdfReadableStream
}

export const generatePDFAsync = async (movie) => {
  const asyncPipeline = promisify(pipeline)

  const pdfReadableStream = getPDFReadableStream(movie)

  const path = getPDFsPath('test.pdf')

  await asyncPipeline(pdfReadableStream, fs.createWriteStream(path))
  return path
}
