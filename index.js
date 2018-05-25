#!/usr/bin/env node

const fs = require('fs')
const getMtgJson = require('mtg-json')
const mkdirp = require('mkdirp')
const path = require('path')
const repl = require('repl')
const titleCase = require('title-case')

const cardsDirectory = path.resolve(__dirname, './tmp')
const cardsJSON = path.resolve(cardsDirectory, './AllCards.json')
let cards = null
let deck = {}

const parser = require('yargs')
  .command('download', 'download an up-to-date list of mtg cards', () => {}, async (argv) => {
    mkdirp.sync(cardsDirectory)
    console.info(`downloading card db to ${cardsJSON}\n`)
    cards = await getMtgJson('cards', cardsDirectory)
    argv.cb(null, 'download complete')
  })
  .command('search <terms...>', 'search for a card', () => {}, (argv) => {
    if (!loadCards()) {
      return argv.cb(null, 'no cards found, run download')
    }

    const result = Object.keys(cards).filter((key) => {
      const card = cards[key]
      return card.name.toLowerCase().indexOf(argv.terms.join(' ')) !== -1
    })

    if (result.length === 0) {
      return argv.cb(null, 'no results found')
    } else {
      result.forEach((key) => {
        const card = cards[key]
        console.info(`${key}\t\t${card.manaCost || ''}\n${card.type}\n\n${card.text}`)
        console.info('-------\n')
      })
      return argv.cb(null, '☝️ results')
    }
  })
  .command('add <name...>', 'add a card to your deck', () => {}, (argv) => {
    if (!loadCards()) {
      return argv.cb(null, 'no cards found, run download')
    }
    const name = titleCase(argv.name.join(' '))

    if (!cards[name]) {
      return argv.cb(null, 'no card by that name exists')
    } else if (deck[name] && deck[name].count === 4 && deck[name].type.indexOf('Basic Land') === -1) {
      return argv.cb(null, 'you can only have 4 of a non-basic-land card')
    } else if (deck[name]) {
      deck[name].count++
      return argv.cb(null, `${name} x ${deck[name].count}`)
    } else {
      deck[name] = {
        count: 1,
        type: cards[name].type
      }
      return argv.cb(null, `${name} x 1`)
    }
  })
  .command('remove <name...>', 'remove a card from your deck', () => {}, (argv) => {
    const name = titleCase(argv.name.join(' '))

    if (!deck[name]) {
      return argv.cb(null, 'no card in deck by that name')
    } else if (deck[name] && deck[name].count === 1) {
      delete deck[name]
      return argv.cb(null, `${name} removed from deck`)
    } else if (deck[name]) {
      deck[name].count--
      return argv.cb(null, `${name} x ${deck[name].count}`)
    }
  })
  .command('print', 'print your deck', () => {}, (argv) => {
    if (!deck) {
      return argv.cb(null, `you have no cards in deck, run add`)
    } else {
      Object.keys(deck).forEach((name) => {
        console.info(`${name} x ${deck[name].count}`)
      })
      console.info('-----\n')
      return argv.cb(null, `☝️ your deck`)
    }
  })
  .command('save <path>', 'save your deck', () => {}, (argv) => {
    try {
      fs.writeFileSync(argv.path, JSON.stringify(deck, null, 2), 'utf8')
      return argv.cb(null, `deck saved to ${argv.path}`)
    } catch (err) {
      return argv.cb(null, err.message)
    }
  })
  .command('load <path>', 'load a deck', () => {}, (argv) => {
    try {
      deck = JSON.parse(fs.readFileSync(argv.path, 'utf8'))
      return argv.cb(null, 'deck loaded')
    } catch (err) {
      return argv.cb(null, err.message)
    }
  })
  .command('exit', 'exit deck building app', () => {}, (argv) => {
    console.info('goodbye 👋')
    process.exit(0)
  })
  .help()
  .strict(true)
  .demandCommand(1)

function loadCards () {
  try {
    cards = require(cardsJSON)
    return cards
  } catch (err) {
    return null
  }
}

function mtgdeck (cmd, context, filename, callback) {
  parser.parse(cmd, {cb: callback}, (_err, argv, stdout) => {
    if (stdout) {
      console.info(`${stdout}\n`)
      return callback(null, '☝️')
    }
  })
}

console.info('welcome to Ben\'s Magic: The Gathering deck building app\n')
console.info('run "help" to get started')
repl.start({prompt: '> ', eval: mtgdeck})
