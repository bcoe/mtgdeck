#!/usr/bin/env node

const chalk = require('chalk')
const fs = require('fs')
const getMtgJson = require('mtg-json')
const mkdirp = require('mkdirp')
const path = require('path')
const repl = require('repl')
const titleCase = require('title-case')

const cardsDirectory = path.resolve(__dirname, './tmp')
const cardsJSON = path.resolve(cardsDirectory, './AllCards.json')
const userHome = require('user-home')
const defaultDeckLocation = path.resolve(userHome, './deck.json')
const defaultMessage = 'type: <command> [options]'
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
      return argv.cb(null, defaultMessage)
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
      return argv.cb(null, defaultMessage)
    }
  })
  .command('save [path]', 'save your deck', (yargs) => {
    yargs.positional('path', {
      describe: 'where should your deck be saved?',
      default: defaultDeckLocation
    })
  }, (argv) => {
    try {
      fs.writeFileSync(argv.path, JSON.stringify(deck, null, 2), 'utf8')
      return argv.cb(null, `deck saved to ${argv.path}`)
    } catch (err) {
      return argv.cb(null, err.message)
    }
  })
  .command('load [path]', 'load a deck', (yargs) => {
    yargs.positional('path', {
      describe: 'where should your deck be loaded from?',
      default: defaultDeckLocation
    })
  }, (argv) => {
    try {
      deck = JSON.parse(fs.readFileSync(argv.path, 'utf8'))
      console.info('deck loaded')
      return argv.cb(null, defaultMessage)
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
parser.$0 = ''

function mtgdeck (cmd, context, filename, callback) {
  parser.parse(cmd, {cb: callback}, (_err, argv, stdout) => {
    if (stdout) {
      console.info(`${stdout}\n`)
      return callback(null, 'type: <command> [options]')
    }
  })
}

console.info(`${chalk.blue('welcome to Ben\'s')} ${chalk.yellow('Magic')} The Gathering ${chalk.blue('deck building app')}\n`)
console.info(`run "${chalk.green('help')}" to get started`)
repl.start({prompt: '> ', eval: mtgdeck})
