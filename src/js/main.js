(function () {

    'use strict';

    var nasaInsightWeather = (function () {

        'use strict';

        var API_KEY = 'DEMO_KEY';
        var API_URL = 'https://api.nasa.gov/insight_weather/?api_key=' + API_KEY + '&feedtype=json&ver=1.0';

        var extractSolData = function (sol) {
            return {
                avgTemp: sol.AT.av,
                maxTemp: sol.AT.mx,
                minTemp: sol.AT.mn,
                earthDate: sol.First_UTC,
                season: sol.Season,
            };
        };

        var extractAllSols = function (data) {

            // Keys to sol objects 
            // -- reverse to place most recent in front
            var solKeys = data.sol_keys.reverse();

            // Set up the sol data to use 
            return solKeys.map(function (solDay) {

                var solData = extractSolData(data[solDay])

                return Object.assign({ day: solDay }, solData);
            });
        };

        return {
            API_URL,
            extractAllSols
        };


    })();

    var storage = (function () {

        'use strict';

        var storageKey = 'mars_data';
        /* 43200000 = 12h */
        var apiTimeout = 43200000;

        var storeSolData = function (data) {

            try {
                localStorage.setItem(storageKey, JSON.stringify(data));
            } catch (error) {
                // Silent error
                return;
            }

        };

        var getSolData = function () {
            var data = localStorage.getItem(storageKey);

            return JSON.parse(data);
        };


        var getSols = function () {

            try {
                return getSolData().sols;
            } catch (error) {
                throw new Error('No sol data stored.');
            }
        };

        var isRecentlyUpdated = function () {

            try {
                var timestamp = getSolData().timestamp;
            } catch (error) {
                return false;
            }

            return (Date.now() - timestamp < apiTimeout);
        };


        return {
            storeSolData,
            getSols,
            isRecentlyUpdated,
        };

    })();

    var temperature = (function () {

        'use strict';

        var celsiusButton = document.querySelector('#celsius');


        var celsiusToFahrenheit = function (celsius) {
            return Math.round(9 / 5 * celsius + 32);
        };

        var fahrenheitToCelsius = function (fahrenheit) {
            return Math.round(5 / 9 * (fahrenheit - 32));
        };

        var isCelsius = function () {
            return celsiusButton.checked;
        };

        var displayTemp = function (number) {
            if (!isCelsius()) {
                return celsiusToFahrenheit(number);
            }
            return Math.round(number);
        };

        var updateTemperatures = function (conversionFunction) {
            /* Not a live Node list, therefore select them here */
            var solTemperatures = document.querySelectorAll('[data-sol-temp]');

            solTemperatures.forEach(function (solTemp) {
                solTemp.innerText = conversionFunction(solTemp.textContent * 1);
            });

        };

        var toggleUnit = function (event) {

            if (!event.target.closest('[data-temp-unit]')) {
                return;
            }

            if (isCelsius()) {
                updateTemperatures(fahrenheitToCelsius);
            } else {
                updateTemperatures(celsiusToFahrenheit);
            }
        };

        document.addEventListener('change', toggleUnit, false);

        return {
            displayTemp
        };

    })();

    var appView = (function () {

        'use strict';

        var heroHeader = document.querySelector('[data-hero-header]');
        var mainElement = document.querySelector('[data-main]');
        var previousSolsContainer = document.querySelector('[data-previous-sols-container]');
        var previousSols = document.querySelector('[data-previous-sols]');
        var solTemplate = document.querySelector('[data-sol-template]');

        var showMain = function () {
            mainElement.classList.add('show');
        };

        var displayDate = function (dateString) {
            return new Date(dateString)
                .toLocaleDateString(
                    'en-GB', {
                    day: 'numeric',
                    month: 'long'
                });
        };

        var setText = function (selector, value, element) {
            element = element ? element : document;

            element.querySelector(selector).innerText = value;
        };

        var displaySol = function (sol, element) {

            setText('[data-sol-day]', sol.day, element);
            setText('[data-sol-earth-date]', displayDate(sol.earthDate), element);
            setText('[data-sol-temp="avg"]', temperature.displayTemp(sol.avgTemp), element);
            setText('[data-sol-temp="high"]', temperature.displayTemp(sol.maxTemp), element);
            setText('[data-sol-temp="low"]', temperature.displayTemp(sol.minTemp), element);

        };

        var displayMainSol = function (sol) {
            displaySol(sol);
            setText('[data-sol-season]', sol.season);
        };

        var displayPreviousSols = function (sols) {

            sols.forEach(function (sol) {
                var previousSol = solTemplate.content.cloneNode(true);

                displaySol(sol, previousSol);

                previousSols.appendChild(previousSol);
            });
        };

        var displayAllSols = function (sols) {

            if (!sols) {
                try {
                    sols = storage.getSols();
                } catch (error) {
                    throw error;
                }
            }

            displayMainSol(sols[0]);
            displayPreviousSols(sols);
        };

        var displayNoSolsFound = function () {

            var message1 = 'Sorry, could not find any sols at the moment.';
            var message2 = 'Please try again later.';

            // Empty content
            heroHeader.outerHTML = '';
            previousSolsContainer.outerHTML = '';

            var noSolsFoundElement = '<div class="container vertical-padding">' +
                '<p>' + message1 + '</p>' +
                '<p>' + message2 + '</p>' +
                '</div>';

            // Display message
            mainElement.innerHTML = noSolsFoundElement;
        };

        return {
            displayAllSols,
            displayNoSolsFound,
            showMain,
        };

    })();

    var loader = (function () {

        'use strict';

        var loader = document.querySelector('[data-loader]');
        var spinner = document.querySelector('[data-spinner]');

        // Show loader when loading data takes a bit too long
        var loaderTimeout;
        var timeoutMs = 500;

        var hideLoader = function () {
            loader.classList.add('hide');
            loader.style.display = 'none';
        };

        var showLoader = function () {
            loader.style.display = 'block';
        };

        var stopSpinner = function () {
            spinner.style.WebkitAnimationPlayState = 'paused';
            spinner.style.animationPlayState = 'paused';
        };

        var start = function () {
            // Start loader when loading data takes a bit too long
            loaderTimeout = setTimeout(function () {
                showLoader();
            }, timeoutMs);
        };

        var stop = function () {
            clearTimeout(loaderTimeout);
            hideLoader();
            stopSpinner();
        };

        return {
            start,
            stop,
        };

    })();

    var displayAndStoreSols = function (data) {

        // Set up the sol data 
        var sols = nasaInsightWeather.extractAllSols(data);

        // Display sols in app
        appView.displayAllSols(sols);

        // Store the sol data
        storage.storeSolData({
            timestamp: Date.now(),
            sols
        });

    };


    var getDataFromApi = function () {

        return new Promise(function (resolve, reject) {

            fetch(nasaInsightWeather.API_URL)
                .then(function (res) {
                    if (!res.ok) {
                        reject(new Error('Nasa API response not ok.'));
                    }
                    return res.json();
                })
                .then(function (data) {
                    resolve(displayAndStoreSols(data));
                })
                .catch(function (error) {
                    reject(error);
                });
        })
    };

    var initializeSols = function () {

        return new Promise(function (resolve, reject) {

            try {
                // Check last api call
                if (storage.isRecentlyUpdated()) {
                    // Display stored sols
                    resolve(appView.displayAllSols());

                } else {
                    // Call api
                    resolve(getDataFromApi());
                }

            } catch (error) {
                reject(error);
            }
        });
    };

    /* Initialize */
    (function () {

        // Start loader when loading data takes a bit too long
        loader.start();

        initializeSols()
            .catch(function (error) {
                // Neither stored sols nor api went through
                console.error(error);

                // Display message that no sols were found
                appView.displayNoSolsFound();

            }).then(function () {

                // Stop loader
                loader.stop();

                // Make main visible
                appView.showMain();
            });

    })();

})();
