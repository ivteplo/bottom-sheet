//
// Copyright (c) 2022-2024 Ivan Teplov
// Licensed under the Apache license 2.0
//

/** @jsx createElement */

import { isFocused, touchPosition, getCSSVariableValue, mapNumber, createElement, elementContains } from "./helpers.js"
import { styleSheet } from "./styleSheet.js"

/**
 * HTML Custom Element for creating sheets
 *
 * @example <caption>Define the element in the registry and use it in your HTML</caption>
 * customElements.define("ui-sheet", SheetElement)
 *
 * // in HTML:
 * <ui-sheet>
 *   <p>Hello World!</p>
 * </ui-sheet>
 *
 * @example <caption>Sheet open by default</caption>
 * <ui-sheet open>
 *   <p>Hello World!</p>
 * </ui-sheet>
 *
 * @example <caption>Execute certain actions when the sheet opens or closes</caption>
 * const sheet = document.querySelector("...")
 *
 * sheet.addEventListener("open", event => {
 *   console.log("The sheet is now shown")
 * })
 *
 * sheet.addEventListener("close", event => {
 *   console.log("The sheet is now closed")
 * })
 *
 * @example <caption>Open the sheet programmatically</caption>
 * const sheet = document.querySelector("...")
 *
 * sheet.showModal()
 * // is the same as:
 * sheet.show()
 */
export class SheetElement extends HTMLElement {
  /**
   * Inner wrapper
   * @type {HTMLDivElement}
   */
  #sheet

  /**
   * Gray area on the top of the sheet to resize the sheet
   * @type {HTMLElement}
   */
  #draggableArea

  #scaleDownTo

  /** Just methods with 'this' binded */
  #eventListeners = {
    onDragMove: this.#onDragMove.bind(this),
    onDragStart: this.#onDragStart.bind(this),
    onDragEnd: this.#onDragEnd.bind(this),
    onKeyUp: this.#onKeyUp.bind(this),
    onCloseButtonClick: this.#onCloseButtonClick.bind(this),
    onClick: this.#onClick.bind(this)
  }

  /**
   * Options for behavior customization
   *
   * @example <caption>Make the sheet <i>not</i> close on background click</caption>
   * <ui-sheet ignore-background-click>
   *   ...
   * </ui-sheet>
   *
   * @example <caption>Make the sheet <i>not</i> close when pressing Escape</caption>
   * <ui-sheet ignore-escape-key>
   *   ...
   * </ui-sheet>
   */
  options = {
    closeOnBackgroundClick: true,
    closeOnEscapeKey: true
  }

  constructor() {
    super()

    this.role = "dialog"

    Object.defineProperties(this.options, {
      closeOnBackgroundClick: {
        get: () =>
          !this.hasAttribute("ignore-background-click"),
        set: value => Boolean(value)
          ? this.removeAttribute("ignore-background-click")
          : this.setAttribute("ignore-background-click", true)
      },
      closeOnEscapeKey: {
        get: () =>
          !this.hasAttribute("ignore-escape-key"),
        set: value => Boolean(value)
          ? this.removeAttribute("ignore-escape-key")
          : this.setAttribute("ignore-escape-key", true)
      }
    })

    const shadowRoot = this.attachShadow({
      mode: "open"
    })

    shadowRoot.adoptedStyleSheets = [styleSheet]

    shadowRoot.append(
      <div class="sheet-contents" reference={sheet => this.#sheet = sheet}>
        <header class="sheet-controls">
          <div
            class="sheet-draggable-area"
            reference={area => this.#draggableArea = area}
            onMouseDown={this.#eventListeners.onDragStart}
            onTouchStart={this.#eventListeners.onDragStart}
          >
            <div class="sheet-draggable-thumb"></div>
          </div>

          <button
            type="button"
            aria-controls={this?.id ?? ""}
            class="sheet-close-button"
            onClick={this.#eventListeners.onCloseButtonClick}
            title="Close the sheet"
          >
            &times;
          </button>
        </header>
        <main class="sheet-body">
          <slot />
        </main>
      </div>
    )

    this.addEventListener("click", this.#onClick)
  }

  /**
   * Open the sheet
   */
  showModal() {
    this.setAttribute("open", true)
    this.dispatchEvent(new CustomEvent("open"))
  }

  /**
   * Open the sheet
   */
  show() {
    this.showModal()
  }

  /**
   * Collapse the sheet
   */
  close() {
    this.removeAttribute("open")
    this.dispatchEvent(new CustomEvent("close"))
  }

  /**
   * Check if the sheet is open
   * @returns {boolean}
   */
  get open() {
    return this.hasAttribute("open")
  }

  /**
   * An alternative way to open or close the sheet
   * @param {boolean} value
   * @returns {boolean}
   * @example
   * sheet.open = true  // the same as executing sheet.show()
   * sheet.open = false // the same as executing sheet.close()
   */
  set open(value) {
    if (value === false || value === undefined) {
      this.close()
      return false
    } else {
      this.show()
      return true
    }
  }

  /**
   * Hide the sheet when clicking at the background
   * @param {PointerEvent} event
   * @returns {void}
   */
  #onClick(event) {
    const path = event.composedPath()

    if (!path.find(item => item === this.#sheet) && this.options.closeOnBackgroundClick) {
      this.close()
    }
  }

  /**
   * Hide the sheet when clicking at the 'close' button
   * @returns {void}
   */
  #onCloseButtonClick() {
    this.close()
  }

  /**
   * Hide the sheet when pressing Escape if the target element is not an input field
   * @param {KeyboardEvent} event
   * @returns {void}
   */
  #onKeyUp(event) {
    const isSheetElementFocused =
      elementContains(event.target, this) && isFocused(event.target)

    if (event.key === "Escape" && !isSheetElementFocused && this.options.closeOnEscapeKey) {
      this.close()
    }
  }

  #dragPosition

  /**
   * Function that changes sheet's size and location during the dragging process
   * @param {number} distanceToTheBottomInPercents - percents relative to the height of the sheet
   */
  #dragSheet(distanceToTheBottomInPercents) {
    const translateY = 100 - distanceToTheBottomInPercents
    const scale = mapNumber(distanceToTheBottomInPercents, [0, 100], [this.#scaleDownTo, 1])

    this.#sheet.style.transform = `translateY(${translateY}%) scale(${scale})`
    this.#sheet.style.transition = "none"
  }

  /**
   * Gets called when the user starts grabbing the 'sheet thumb'
   * @param {MouseEvent|TouchEvent} event
   * @returns {void}
   */
  #onDragStart(event) {
    this.#dragPosition = touchPosition(event).pageY
    this.#sheet.classList.add("is-resized")
    this.#draggableArea.style.cursor = document.body.style.cursor = "grabbing"

    this.#scaleDownTo = +getCSSVariableValue(this.#sheet, "--scale-down-to")
  }

  /**
   * Distance from the cursor to the bottom of the sheet in percents (relative to the sheet height)
   */
  #getDistanceToTheBottomInPercents(y) {
    const deltaY = this.#dragPosition - y
    const distanceToTheBottomInPercents = 100 + deltaY / this.#sheet.clientHeight * 100
    return Math.max(0, Math.min(100, distanceToTheBottomInPercents))
  }

  /**
   * Gets called when the user is moving the 'sheet thumb'.
   * Updates the height of the sheet
   * @param {MouseEvent|TouchEvent} event
   * @returns {void}
   */
  #onDragMove(event) {
    if (this.#dragPosition === undefined) return

    this.#dragSheet(this.#getDistanceToTheBottomInPercents(touchPosition(event).pageY))
  }

  /**
   * Get called when the user stops grabbing the sheet
   * @param {MouseEvent|TouchEvent} event
   * @returns {void}
   */
  #onDragEnd(event) {
    if (this.#dragPosition === undefined) return

    const distanceToTheBottomInPercents =
      this.#getDistanceToTheBottomInPercents(touchPosition(event).pageY)

    if (distanceToTheBottomInPercents < 75) {
      this.close()
    }

    this.#draggableArea.style.cursor = document.body.style.cursor = ""
    this.#dragPosition = undefined

    this.#sheet.classList.remove("is-resized")

    this.#sheet.style.transform = ""
    this.#sheet.style.transition = ""
  }

  /**
   * Attaches event listeners to the window when the sheet is mounted
   * @ignore
   */
  connectedCallback() {
    window.addEventListener("keyup", this.#eventListeners.onKeyUp)

    window.addEventListener("mousemove", this.#eventListeners.onDragMove)
    window.addEventListener("touchmove", this.#eventListeners.onDragMove)

    window.addEventListener("mouseup", this.#eventListeners.onDragEnd)
    window.addEventListener("touchend", this.#eventListeners.onDragEnd)
  }

  /**
   * Removes all the event listeners when the sheet is no longer mounted
   * @ignore
   */
  disconnectedCallback() {
    window.removeEventListener("keyup", this.#eventListeners.onKeyUp)

    window.removeEventListener("mousemove", this.#eventListeners.onDragMove)
    window.removeEventListener("touchmove", this.#eventListeners.onDragMove)

    window.removeEventListener("mouseup", this.#eventListeners.onDragEnd)
    window.removeEventListener("touchend", this.#eventListeners.onDragEnd)
  }
}

export default SheetElement

