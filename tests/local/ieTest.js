var screenshotPath = 'tests_output/screenshots/ie/';

/* Each key will become a test case */
module.exports = {
    '@tags': ['local', 'ie'],

    'IE test case': function (browser) {
        browser
            .url('http://bs-local.com:8083')
            .waitForElementVisible('body')
            .saveScreenshot(screenshotPath + 'init.png')

        browser
            .expect.element('#polyfill').to.have.attribute('src').which.contains('polyfill');
        browser
            .expect.element('.temp-avg').text.to.match(/\d+°/);

        browser
            .saveScreenshot(screenshotPath + 'weather-data.png')
            .end();
    },
};