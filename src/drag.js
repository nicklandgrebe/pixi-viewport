const exists = require('exists')

const Plugin = require('./plugin')
module.exports = class Drag extends Plugin
{
    /**
     * enable one-finger touch to drag
     * @param {Viewport} parent
     * @param {object} [options]
     * @param {boolean} [options.wheel=true] use wheel to scroll in y direction (unless wheel plugin is active)
     * @param {number} [options.wheelScroll=1] number of pixels to scroll with each wheel spin
     * @param {boolean} [options.reverse] reverse the direction of the wheel scroll
     * @param {boolean|string} [options.clampWheel] (true, x, or y) clamp wheel (to avoid weird bounce with mouse wheel)
     * @param {string} [options.underflow=center] (top/bottom/center and left/right/center, or center) where to place world if too small for screen
     */
    constructor(parent, options)
    {
        options = options || {}
        super(parent)
        this.moved = false
        this.wheelActive = exists(options.wheel) ? options.wheel : true
        this.wheelScroll = options.wheelScroll || 1
        this.reverse = options.reverse ? 1 : -1
        this.clampWheel = options.clampWheel
        this.parseUnderflow(options.underflow || 'center')
    }

    parseUnderflow(clamp)
    {
        clamp = clamp.toLowerCase()
        if (clamp === 'center')
        {
            this.underflowX = 0
            this.underflowY = 0
        }
        else
        {
            this.underflowX = (clamp.indexOf('left') !== -1) ? -1 : (clamp.indexOf('right') !== -1) ? 1 : 0
            this.underflowY = (clamp.indexOf('top') !== -1) ? -1 : (clamp.indexOf('bottom') !== -1) ? 1 : 0
        }
    }

    down(e)
    {
        if (this.paused)
        {
            return
        }

        if (this.parent.countDownPointers() <= 1)
        {
            this.last = { x: e.data.global.x, y: e.data.global.y }
            return true
        }
    }

    get active()
    {
        return this.last ? true : false
    }

    move(e)
    {
        if (this.paused)
        {
            return
        }

        const x = e.data.global.x
        const y = e.data.global.y
        if (this.last)
        {
            const count = this.parent.countDownPointers()
            if (count === 1 || (count > 1 && !this.parent.plugins['pinch']))
            {
                const distX = x - this.last.x
                const distY = y - this.last.y
                if (this.moved || (this.parent.checkThreshold(distX) || this.parent.checkThreshold(distY)))
                {
                    this.parent.x += distX
                    this.parent.y += distY
                    this.last = { x, y }
                    if (!this.moved)
                    {
                        this.parent.emit('drag-start', { screen: this.last, world: this.parent.toWorld(this.last), viewport: this.parent})
                    }
                    this.moved = true
                    this.parent.dirty = true
                }
            }
            else
            {
                this.moved = false
            }
        }
    }

    up()
    {
        if (this.last && this.moved)
        {
            this.parent.emit('drag-end', {screen: this.last, world: this.parent.toWorld(this.last), viewport: this.parent})
            this.moved = false
        }
        this.last = null
    }

    wheel(dx, dy)
    {
        if (this.paused)
        {
            return
        }

        if (this.wheelActive)
        {
            const wheel = this.parent.plugins['wheel']
            if (!wheel)
            {
                this.parent.x += dx * this.wheelScroll * this.reverse
                this.parent.y += dy * this.wheelScroll * this.reverse
                if (this.clampWheel)
                {
                    this.clamp()
                }
                this.parent.emit('wheel-scroll', this.parent)
                this.parent.dirty = true
                return true
            }
        }
    }

    resume()
    {
        this.last = null
        this.paused = false
    }

    clamp()
    {
        const oob = this.parent.OOB()
        const point = oob.cornerPoint
        const decelerate = this.parent.plugins['decelerate'] || {}
        if (this.clampWheel !== 'y')
        {
            if (this.parent.screenWorldWidth < this.parent.screenWidth)
            {
                switch (this.underflowX)
                {
                    case -1:
                        this.parent.x = 0
                        break
                    case 1:
                        this.parent.x = (this.parent.screenWidth - this.parent.screenWorldWidth)
                        break
                    default:
                        this.parent.x = (this.parent.screenWidth - this.parent.screenWorldWidth) / 2
                }
            }
            else
            {
                if (oob.left)
                {
                    this.parent.x = 0
                    decelerate.x = 0
                }
                else if (oob.right)
                {
                    this.parent.x = -point.x
                    decelerate.x = 0
                }
            }
        }
        if (this.clampWheel !== 'x')
        {
            if (this.parent.screenWorldHeight < this.parent.screenHeight)
            {
                switch (this.underflowY)
                {
                    case -1:
                        this.parent.y = 0
                        break
                    case 1:
                        this.parent.y = (this.parent.screenHeight - this.parent.screenWorldHeight)
                        break
                    default:
                        this.parent.y = (this.parent.screenHeight - this.parent.screenWorldHeight) / 2
                }
            }
            else
            {
                if (oob.top)
                {
                    this.parent.y = 0
                    decelerate.y = 0
                }
                else if (oob.bottom)
                {
                    this.parent.y = -point.y
                    decelerate.y = 0
                }
            }
        }
    }
}