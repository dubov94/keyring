module.exports = {
	url: function () {
		return `${this.api.launchUrl}/set-up`
	},
	elements: {
		codeInput: 'input[aria-label="Code"]',
    activateButton: '.card__actions > .btn'
	}
}
