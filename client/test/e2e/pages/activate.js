module.exports = {
	url: function () {
		return `${this.api.launchUrl}/activate`
	},
	elements: {
		codeInput: 'input[aria-label="Code"]',
    activateButton: '.card__actions > .btn'
	}
}
