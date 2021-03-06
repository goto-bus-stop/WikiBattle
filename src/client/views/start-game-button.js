const render = require('crel')
const { on, off } = require('dom-event')
const bus = require('../bus')

module.exports = function startGameButton (isPrivate) {
  return new StartGameButton(isPrivate).el
}

class StartGameButton {
  constructor (isPrivate) {
    this.onClick = this.onClick.bind(this)

    this.isPrivate = isPrivate

    this.el = render('button', '» Go!')
    on(this.el, 'click', this.onClick)
  }

  disable () {
    this.el.disabled = true
    off(this.el, 'click', this.onClick)
  }

  onClick () {
    bus.emit('connect', this.isPrivate)
    this.disable()
  }
}
