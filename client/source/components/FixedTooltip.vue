<template>
  <div style="position: relative;">
    <div class="tooltip__content" :style="tooltipStyle">
      <div :style="arrowStyle"></div>
      <slot name="label"></slot>
    </div>
    <slot></slot>
  </div>
</template>

<script>
  const ARROW_SIZE = 5
  const ARROW_COLOR = '#616161'

  export default {
    props: {
      'top': {
        type: Boolean,
        default: false
      },
      'right': {
        type: Boolean,
        default: false
      },
      'bottom': {
        type: Boolean,
        default: false
      },
      'left': {
        type: Boolean,
        default: false
      },
      'nudge-x': {
        type: Number,
        default: 0
      },
      'nudge-y': {
        type: Number,
        default: 0
      }
    },
    computed: {
      tooltipStyle () {
        return {
          'position': 'absolute',
          'white-space': 'nowrap',
          'top': this.generateTooltipOffsetValue(
            this.bottom, this.left, this.nudgeY),
          'right': this.generateTooltipOffsetValue(
            this.left, this.top, this.nudgeX),
          'bottom': this.generateTooltipOffsetValue(
            this.top, this.right, this.nudgeY),
          'left': this.generateTooltipOffsetValue(
            this.right, this.bottom, this.nudgeX),
          'transform': this.generateCenteringAdjustment()
        }
      },
      arrowSizeWithUnit () {
        return `${ARROW_SIZE}px`
      },
      arrowStyle () {
        return {
          'height': this.arrowSizeWithUnit,
          'width': this.arrowSizeWithUnit,
          'position': 'absolute',
          'top': this.generateArrowOffset(this.top, this.left),
          'right': this.generateArrowOffset(this.right, this.top),
          'bottom': this.generateArrowOffset(this.bottom, this.right),
          'left': this.generateArrowOffset(this.left, this.bottom),
          'transform': this.generateCenteringAdjustment(),
          'border-top': this.generateArrowBorder(
            this.top, this.right || this.left),
          'border-right': this.generateArrowBorder(
            this.right, this.top || this.bottom),
          'border-bottom': this.generateArrowBorder(
            this.bottom, this.right || this.left),
          'border-left': this.generateArrowBorder(
            this.left, this.top || this.bottom)
        }
      }
    },
    methods: {
      generateTooltipOffsetValue (isMainAxis, isCrossAxis, nudge) {
        if (isMainAxis) {
          return `calc(100% + ${this.arrowSizeWithUnit} + ${nudge}px)`
        } else if (isCrossAxis) {
          return `calc(50% + ${nudge}px)`
        }
        return undefined
      },
      generateCenteringAdjustment () {
        if (this.top) {
          return 'translateX(50%)'
        } else if (this.right) {
          return 'translateY(50%)'
        } else if (this.bottom) {
          return 'translateX(-50%)'
        } else if (this.left) {
          return 'translateY(-50%)'
        }
        return undefined
      },
      generateArrowOffset (isMainAxis, isCrossAxis) {
        if (isMainAxis) {
          return '100%'
        } else if (isCrossAxis) {
          return '50%'
        }
        return undefined
      },
      generateArrowBorder (isMainAxis, isCrossAxis) {
        if (isMainAxis) {
          return `${this.arrowSizeWithUnit} solid ${ARROW_COLOR}`
        } else if (isCrossAxis) {
          return `${this.arrowSizeWithUnit} solid transparent`
        }
        return undefined
      }
    }
  }
</script>
